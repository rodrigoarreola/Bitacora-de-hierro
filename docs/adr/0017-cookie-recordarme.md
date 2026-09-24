# 0017. Cookie "recordarme" independiente del archivo de sesión de PHP

- **Estado:** Aceptada
- **Fecha:** 2026-09-22

## Contexto
El usuario reportó que, ya logueado, la sesión se cerraba sola a las pocas
horas — a pesar de que `api/config.php` configura la cookie de sesión con
30 días de vida (`SESSION_LIFETIME`, `session_set_cookie_params()`).

El diagnóstico: esa cookie sí dura 30 días **del lado del navegador**, pero
PHP guarda los datos de sesión (`$_SESSION['user_id']`) en **archivos** en
el servidor (`session.save_handler = files`, el default), y quién limpia
esos archivos casi nunca es el propio script — en hosting compartido
(Hostgator, donde vive esta app) suele ser un **cron aparte** que lee el
`session.gc_maxlifetime` del `php.ini` global del servidor, no el valor que
`ini_set('session.gc_maxlifetime', ...)` fija en caliente por request.
`ini_set()` en ese punto solo afecta la limpieza *probabilística* que el
propio proceso PHP podría disparar al llamar `session_start()`
(`session.gc_probability`/`gc_divisor`), no un barrido externo. Si a eso se
suma que `session.lazy_write` (activo por defecto desde PHP 7) evita
reescribir el archivo cuando `$_SESSION` no cambió en la request —el caso
común, la mayoría de los endpoints solo *leen* `$_SESSION['user_id']`—, el
`mtime` del archivo tampoco se refresca con el uso, así que el cron lo ve
"viejo" aunque se haya seguido usando la app con normalidad. Resultado: la
cookie del navegador sigue siendo válida, pero el archivo que le
correspondía ya no existe → `$_SESSION` vacío → la app pide login de
nuevo, típicamente a las pocas horas.

## Decisión
Segunda cookie, `remember_token`, con un token propio (no relacionado con
`PHPSESSID`) que la app controla de punta a punta:

- **Al loguear** (`api/login.php`): genera `bin2hex(random_bytes(32))`
  (256 bits), guarda su hash SHA-256 (nunca el token en sí) y una fecha de
  expiración (`NOW() + 30 días`) en dos columnas nuevas de `users`
  (`remember_token_hash`, `remember_token_expires`), y manda la cookie con
  el token en claro (`HttpOnly`, `Secure` en HTTPS, `SameSite=Lax`, mismos
  30 días).
- **En cada request** (`api/config.php`, justo después de `session_start()`):
  si `$_SESSION['user_id']` viene vacío pero llega la cookie
  `remember_token`, se hashea y se busca en `users`. Si coincide y no
  expiró, reestablece `$_SESSION['user_id']` sola — sin pedir login — y
  extiende `remember_token_expires` otros 30 días (ventana deslizante:
  mientras se siga usando la app, nunca vence). Si no coincide o expiró,
  borra la cookie.
- **El valor del token no se rota en cada uso** — a propósito. Esta app
  dispara varias requests en paralelo al cargar (`Promise.all()` en
  `loadAppData()`): rotar en cada una arriesgaría que la primera respuesta
  invalide el hash contra el que las demás, ya en vuelo, están por
  comparar. Al mantener el valor fijo entre logins (solo se extiende la
  fecha de expiración, nunca el hash), todas las requests en paralelo
  comparan siempre contra el mismo valor — sin condición de carrera,
  verificado con 5 requests simultáneas de prueba.
- **Al desloguear** (`api/logout.php`): invalida el token en la BD
  (`remember_token_hash`/`expires` a `NULL`), no solo borra la cookie del
  navegador — si no, seguiría reautenticando solo en cualquier otro
  dispositivo donde hubiera quedado esa cookie.
- **Esquema**: `users.remember_token_hash VARCHAR(64) NULL` +
  `remember_token_expires DATETIME NULL`, agregadas a `api/db/schema.sql`
  (para instalaciones nuevas) y como bloque idempotente en el
  "Pendiente de correr en producción" de DEPLOY.local.md (para la base ya viva).
- **Las tres piezas nuevas de SQL** (en `login.php`, `logout.php` y el
  respaldo de `config.php`) van envueltas en `try { } catch (PDOException)`,
  sin re-lanzar. El código de este cambio y el `ALTER TABLE` en producción
  no tienen por qué llegar en el mismo instante — si el deploy sube el
  código antes de correr la migración, esas tres piezas simplemente no
  hacen nada (columna inexistente = excepción atrapada) y el login/logout
  por sesión de toda la vida sigue funcionando exactamente igual que antes.
  Sin este resguardo, cualquier intento de login rompería con un 500 hasta
  correr el `ALTER TABLE` — verificado quitando las columnas a propósito en
  local: login/session/logout responden 200 igual, sin la parte de
  "recordarme".

## Alternativas descartadas
- **Sesiones de PHP guardadas en MySQL** (`session_set_save_handler()`
  completo, con `open/read/write/gc` propios): ataca la causa raíz de raíz
  (el archivo ya no sería un archivo), pero es bastante más código nuevo
  y agrega una escritura a BD en *cada* request (hoy son puros archivos,
  sin tocar la BD para nada de sesión). El cookie "recordarme" resuelve el
  síntoma real (quedarse deslogueado) con un cambio mucho más chico, y solo
  toca la BD cuando de verdad hace falta (la sesión de PHP ya se perdió) —
  el camino rápido y frecuente (sesión viva) sigue sin ningún costo extra.
- **Rotar el token en cada uso** (patrón clásico de "remember me" de un
  solo uso): más resistente a que un valor de cookie filtrado (ej. de un
  backup viejo del dispositivo) siga sirviendo para siempre, pero introduce
  la condición de carrera con `Promise.all()` descrita arriba. Se prefirió
  la ventana deslizante sin rotación — el token sigue siendo de alta
  entropía (256 bits) y se invalida por completo al desloguear, que ya
  cubre el caso de uso real de esta app de un solo usuario.

## Consecuencias
- La sesión ya no depende de que el hosting conserve el archivo de sesión
  de PHP el tiempo que la app pide — cualquier momento en que eso falle, la
  siguiente request lo repara sola, de forma transparente (nuevo
  `PHPSESSID`, mismo usuario).
- Camino rápido (sesión de PHP viva) sin cambios: cero consultas extra a
  BD. Camino de respaldo (sesión perdida) agrega un `SELECT` + un `UPDATE`
  por request hasta que vuelve a haber una sesión de PHP viva — negligible
  para una app de un solo usuario.
- Verificado con `curl` end-to-end (temporalmente sin `DEV_AUTOLOGIN`,
  contra un usuario de prueba): login emite ambas cookies y guarda
  hash+expiración; una request sin `PHPSESSID` pero con `remember_token`
  válido reautentica y extiende la expiración sin cambiar el hash; 5
  requests en paralelo sin `PHPSESSID` responden todas `authenticated:true`
  (sin condición de carrera); un token inexistente/expirado responde
  `authenticated:false` y borra la cookie; logout invalida el token en BD
  y limpia la cookie; el token viejo ya no reautentica después del logout.
- **Pendiente:** hoy no existe endpoint para cambiar la contraseña desde la
  app (`password_hash` solo se fija vía `api/db/create_user.php`, un script
  CLI) — el día que exista uno, tiene que invalidar `remember_token_hash`/
  `expires` igual que `api/logout.php`. Si no, cambiar la contraseña porque
  se sospecha un acceso no autorizado no serviría de nada: el
  `remember_token` viejo seguiría reautenticando solo, sin pedir la
  contraseña nueva ni ninguna otra, precisamente porque este cookie fue
  pensado para saltarse el login por completo.
