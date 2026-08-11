# Bitácora de Hierro

PWA de registro de gimnasio. Reemplaza una hoja de cálculo semanal (una pestaña por semana, 5 tablas por día — Lunes a Viernes — con ejercicio, peso, reps, series y checkbox de cumplido).

Un solo usuario. Sin frameworks de frontend. Pensada para desplegarse como archivos sueltos en hosting compartido.

## Stack

- **Frontend**: HTML/CSS/JS vanilla, sin framework — dependencias externas solo vía CDN (Google Fonts, Font Awesome, [Chart.js](https://www.chartjs.org/) 4.4.0 para la gráfica de Progreso).
- **Backend**: PHP + MySQL (PDO, sin framework).
- **Auth**: login usuario/contraseña con sesión PHP — sin API keys expuestas ni OAuth.
- **Hosting**: Hostgator, subcarpeta del dominio principal — `tu-dominio.com/bitacora`.

## Estado actual

**En producción**: `https://tu-dominio.com/bitacora/`.

El frontend (`index.html` + `css/styles.css` + `js/app.js` + `js/api.js`) está **conectado a la API real**: requiere sesión (pantalla de login, persistente 30 días) y todo lo que se ve — semanas, ejercicios, librería — se lee y se escribe contra MySQL a través de `api/`. Ya no hay datos de ejemplo en memoria.

### Estructura del proyecto

```
/
├── index.html                     Markup: pantalla de login + #app-shell con el resto
├── manifest.json                  Manifest de la PWA (rutas relativas, funciona en cualquier subcarpeta)
├── sw.js                          Service worker: cachea el app shell, nunca api/
├── icons/
│   ├── icon-192.png                Ícono de la PWA (mancuerna --accent sobre --bg)
│   └── icon-512.png
├── css/
│   └── styles.css                 Todos los estilos, incluyendo login/logout
├── js/
│   ├── api.js                     Cliente fetch (apiGet/Post/Put/Delete), maneja 401
│   └── app.js                     UI, estado local (caché de lo cargado de la API), bootstrap de sesión y registro del service worker
├── .htaccess                      Fuerza HTTPS, bloquea config.local.php y *.sql
├── api/
│   ├── config.php                 Conexión PDO + arranque de sesión
│   ├── config.local.php.example   Plantilla de credenciales — copiar a config.local.php en el servidor
│   ├── auth.php                   Helpers: require_login(), respond_ok()/respond_error(), read_json_body()
│   ├── login.php                  POST { username, password } → inicia sesión
│   ├── logout.php                 POST → destruye sesión
│   ├── session.php                GET → { authenticated }
│   ├── weeks.php                  GET/POST/DELETE semanas (incluye copiar semana anterior)
│   ├── week_helpers.php           Helpers compartidos: is_monday(), find_week_id(), fetch_week_detail() (usados por weeks.php y migrate_day.php)
│   ├── exercises.php              POST/PUT/DELETE ejercicios de un día
│   ├── library.php                GET/POST/DELETE librería de ejercicios
│   ├── import.php                 POST: importa semanas desde JSON (reemplaza las que ya existan, deja intactas las demás)
│   ├── migrate_day.php            POST: migra el set completo de ejercicios de un día a otro dentro de la misma semana
│   └── db/
│       ├── schema.sql             DDL completo + seed de day_templates
│       └── create_user.php        Script CLI para crear el usuario único (nunca vía HTTP)
```

### Esquema de base de datos

Seis tablas (`api/db/schema.sql`): `users` (una fila, credenciales del único usuario), `weeks` (una fila por semana, identificada por el lunes en formato ISO), `day_templates` (grupo muscular y notas **por defecto** de cada uno de los 7 días — Lun–Dom —, sembrados desde la rutina base; sábado/domingo llevan un valor genérico ya que no tienen rutina fija), `exercises` (filas editables por semana+día; `kg`/`reps`/`series` son texto libre para permitir formatos no numéricos), `exercise_library` (nombres para autocompletar) y `week_day_overrides` (group_name/notes específicos de una semana puntual — solo existe una fila cuando ese día recibió contenido migrado de otro día vía "Migrar día"; sin fila, el día usa el valor por defecto de `day_templates`).

### Puesta en marcha del backend (una sola vez por entorno)

1. Crear la base de datos en cPanel (MySQL Databases) y un usuario con permisos sobre ella.
2. Importar `api/db/schema.sql` (phpMyAdmin, o `mysql -u user -p nombre_bd < api/db/schema.sql`). **En Windows/PowerShell no uses `Get-Content -Raw | mysql`** — PowerShell 5.1 lee el archivo con la codepage del sistema en vez de UTF-8 y corrompe los acentos (`Tríceps` → `Tr??ceps`); si necesitas hacerlo desde PowerShell, usa `Get-Content -Raw -Encoding UTF8 | mysql ...` o mejor `cmd /c "mysql -u user -p nombre_bd < api/db/schema.sql"`.
3. Copiar `api/config.local.php.example` a `api/config.local.php` y completar host/nombre/usuario/contraseña de la BD. Este archivo está en `.gitignore`, nunca se sube a git.
4. Crear el usuario de la app por SSH/Terminal/Cron: `php api/db/create_user.php <usuario> <contraseña>`. **Sin acceso a shell** (caso típico en Hostgator sin plan con SSH): genera el hash localmente con `php -r "echo password_hash('tu-contraseña', PASSWORD_DEFAULT), PHP_EOL;"` y pégalo directo por phpMyAdmin → SQL: `INSERT INTO users (username, password_hash) VALUES ('usuario', 'el-hash-generado');`. El hash es portable entre máquinas/PHP, no hay problema de compatibilidad.

### Funcionalidad implementada

- **Header**: racha actual y mejor racha, en días (3+ ejercicios marcados = día cumplido). El corte ya no es día por día: una semana (lun–sáb, domingo nunca cuenta) necesita **al menos 5 días cumplidos** para no romper la racha — si los alcanza, todos sus días cumplidos suman normal; si no, la racha se corta ahí aunque algún día suelto sí haya llegado a 3 ejercicios. La semana en curso nunca se juzga como "rota" hasta que termine.
- **Riel de semanas**: semanas ordenadas de más reciente a más antigua, con botón "Nueva semana" (date picker restringido a lunes — ajusta automáticamente si se elige otro día).
- **7 tabs de día** (Lun–Dom): Lun–Vie llenan el ancho visible; Sáb/Dom quedan revelados solo al hacer scroll horizontal del riel. Se pintan en verde cuando el día está "cumplido" (3+ ejercicios marcados). Un día que recibió contenido migrado de otro muestra un pequeño ícono con el día de origen.
- **Panel del día**:
  - Ejercicios editables inline: nombre (con autocompletado contra la librería), kg, reps, series.
  - Nota libre por ejercicio (ej. "incluye barra", "×2 la mancuerna").
  - Chevron expandible que compara kg/reps/series contra la semana anterior (flechas subir/bajar/igual).
  - Agregar y eliminar ejercicios (con confirmación al borrar).
  - "Copiar semana pasada" cuando el día está vacío.
  - "Migrar día": mueve el set completo de ejercicios (mismo grupo muscular, notas y estado marcado) de un día a otro **dentro de la misma semana** — pensado para cuando un entrenamiento entre semana se recupera el sábado. Solo ofrece como destino los días de esa semana que estén vacíos (0 ejercicios); si el destino ya tiene contenido, el backend lo bloquea (nunca hace merge ni sobreescribe). El grupo muscular/notas del día de origen viajan con el contenido migrado, y el día de origen queda libre (vuelve a su valor por defecto).
  - Anillo de progreso (ejercicios marcados / total) y tira de resumen (series de hoy, ejercicios, racha actual, mejor racha).
- **Librería de ejercicios** (tab Ajustes): lista reutilizable para autocompletar nombres al agregar ejercicios; se alimenta sola con lo que se escribe en cualquier día, y se puede buscar/eliminar manualmente.
- **Swipe horizontal** entre días dentro del panel.
- **Confirmaciones** (`confirm()`) antes de borrar ejercicios o semanas.
- **Calendario**: vista de mes (lunes a domingo), navegable con flechas, por defecto en el mes actual. Cada día lun–vie que pertenece a una semana ya creada pinta una línea de color según ejercicios marcados ese día: rojo (0), amarillo (1–5), verde (6+). Sábado se colorea igual, pero solo si tiene algún ejercicio esa semana (un sábado libre no es un día "fallado", así que se deja sin línea en vez de rojo). Domingo nunca lleva línea — el gimnasio no abre. Días futuros tampoco (no cuentan como "fallados" antes de pasar). Tocar un día que pertenece a una semana ya creada navega a "Hoy" con ese día exacto seleccionado, para verlo o editarlo — días sin semana no hacen nada.
- **Perfil**: botón de cerrar sesión (antes vivía en Ajustes), exportar/importar datos (ver abajo), y **Hitos y constancia** — estadísticas calculadas del lado del cliente desde `state.weeks` (mismo criterio de "día cumplido" que la racha, 3+ ejercicios): hasta 3 tramos de mayor constancia (semanas consecutivas con 3+ días/semana) y hasta 3 de menor constancia (2+ semanas seguidas con 0-1 días), más una lista de hitos (primer entrenamiento, mejor racha con fechas, mes con más entrenamientos, hueco más largo sin entrenar, año más productivo). No depende de ningún historial externo — crece solo con lo que ya está en la app, así que con pocos meses de datos es normal que aparezca poco.
- **Sesión persistente**: cookie de 30 días — no hay que iniciar sesión cada vez que se abre la app.
- **Historial**: una tarjeta por semana (más reciente primero), con 6 indicadores de día — Lun–Sáb, sin domingo — (verde si ese día quedó "cumplido") y el total de ejercicios marcados/total de la semana. Riel de meses arriba para filtrar (mismo estilo que el riel de semanas de "Hoy"), con "Todas" como opción por defecto — una semana que cruza dos meses (ej. 27 abr–3 may) aparece en ambos filtros. Tocar un día específico de la tarjeta te manda a "Hoy" con ese día exacto seleccionado; tocar el resto de la tarjeta cae en lunes.
- **Progreso**: buscador de ejercicio (mismo autocompletado contra la librería que ya se usa en el panel del día) y gráfica de línea con Chart.js (carga en kg en el tiempo, relleno de área, tooltip nativo con fecha/reps/series al tocar un punto — sin leyenda, porque solo hay una serie por gráfica). Solo cuenta apariciones marcadas como hechas (`done`), nunca las que solo estaban en la rutina sin marcar; valores de `kg` no numéricos se descartan en vez de graficarse como cero. Chips de último peso, mejor peso y cambio desde el primer registro.
- **Exportar / importar datos** (tab Perfil): exportar arma un JSON con todas las semanas/ejercicios ya cargados en memoria (sin pedir nada nuevo a la API) y lo descarga. Importar lee un archivo con esa misma forma y lo manda a `api/import.php`: valida todo antes de escribir (todo o nada, transacción), y por cada semana del archivo — si ya existe en tu base (mismo lunes), reemplaza sus ejercicios por completo; si no existe, la crea. Las semanas que no vienen en el archivo quedan intactas. Antes de enviar, un `confirm()` te dice cuántas semanas se van a reemplazar y cuántas son nuevas.

### Identidad visual

- Paleta: acero oscuro (`#14171B`, `#1B1F26`) con acento óxido/rojo (`#D9481F`).
- Tipografía: Big Shoulders Display (títulos), Inter (cuerpo), JetBrains Mono (valores numéricos).
- Iconos: Font Awesome 6 Free vía CDN.
- Layout mobile-first, `max-width: 520px`.

### PWA

`manifest.json` + `sw.js` ya están activos: la app es instalable (Android/desktop vía Chrome/Edge, iOS vía "Agregar a inicio" en Safari). El service worker solo cachea el *app shell* estático (HTML/CSS/JS/íconos) para que cargue rápido e instale — **no cachea nada bajo `api/`**, así que no hay edición de datos offline; sin conexión, la app carga pero no puede leer ni guardar ejercicios. `start_url`/`scope` del manifest y el registro del service worker usan rutas relativas a propósito, para que funcionen igual en `localhost:8000`, en un subdominio o en una subcarpeta como `/bitacora`, sin tocar código.

**Importante en cada deploy que toque `index.html`/`css/`/`js/`**: sube también `sw.js` con `CACHE_NAME` incrementado (`bitacora-shell-v2`, `v3`, ... actualmente `v6`). Si no, los navegadores que ya instalaron la PWA van a seguir sirviendo el shell viejo desde caché indefinidamente — pasó varias veces durante el desarrollo local de este proyecto.

## Pendiente

Nada del alcance original queda sin implementar. Ideas para más adelante, sin comprometerse: comparar dos ejercicios a la vez en Progreso, un dashboard con mini-gráficas de todos los ejercicios, y gráficas de reps/series como líneas independientes (hoy solo se ve al tocar un punto).

## Desarrollo local

No requiere build, pero sí un servidor con PHP (la app ya llama a `api/`, no sirve con un servidor puramente estático):

```bash
php -S localhost:8000
```

Necesita `api/config.local.php` ya configurado apuntando a una base de datos con el esquema importado — ver "Puesta en marcha del backend" arriba.

## Despliegue

Destino: `tu-dominio.com/bitacora`, vía FTP/SFTP. Como todas las rutas del proyecto son relativas, no hace falta tocar ni una línea de código por vivir en una subcarpeta en vez de un subdominio.

1. **Base de datos**: en cPanel → MySQL Databases, crear la base y un usuario con permisos sobre ella (igual que en local, con `bitacora_app` como referencia de nombre).
2. **Subir archivos**: todo el árbol del repo tal como está en git a la carpeta `/bitacora` del hosting, **excepto** lo que ya está en `.gitignore` (`api/config.local.php`, `.claude/`) y sobre todo **la carpeta `.git/`** — nunca se sube, ni por accidente al arrastrar la carpeta completa del proyecto (expone todo el historial del repo). Si FileZilla se desconecta a medias subiendo/borrando algo, siempre reconectar y confirmar el listado remoto antes de seguir.
3. **Importar el esquema**: `api/db/schema.sql` vía phpMyAdmin (Importar → seleccionar el archivo). Evita hacerlo desde PowerShell con `Get-Content -Raw | mysql` — ver la nota de encoding más abajo.
4. **Config local de producción**: crear `api/config.local.php` directo en el servidor (editor de archivos de cPanel, o edítalo local y súbelo por FTP aparte — nunca por git) a partir de `api/config.local.php.example`, con las credenciales reales de la base. Si alguna vez se rota la contraseña de la BD, hay que actualizar este archivo en el servidor también — el sitio da 500 ("no se pudo conectar a la base de datos") hasta que coincidan.
5. **Usuario de la app**: ver el paso 4 de "Puesta en marcha del backend" arriba (SSH/Terminal/Cron, o el `INSERT` vía phpMyAdmin si no hay acceso a shell).
6. **Verificar**: entrar a `https://tu-dominio.com/bitacora/`, confirmar que carga por HTTPS, que el login funciona, y que el manifest/service worker se registran (DevTools → Application → Manifest / Service Workers, o una auditoría Lighthouse → PWA).

`.htaccess` no necesita ajustes para la subcarpeta: la regla de HTTPS usa `%{HTTP_HOST}%{REQUEST_URI}` (no una ruta fija) y el bloqueo de `config.local.php`/`*.sql` es por nombre de archivo.

### Pendiente de correr en producción

Estos cambios ya se hicieron en local pero todavía no en el servidor — correr una sola vez, vía phpMyAdmin → SQL, sobre la base de producción:

```sql
UPDATE exercises SET kg = '40', note = '8 placas — la máquina no tenía etiqueta de peso'
WHERE name = 'Prone leg curl acostado' AND kg = '40(8)';
```

```sql
ALTER TABLE day_templates
  MODIFY day_key ENUM('lun','mar','mie','jue','vie','sab','dom') NOT NULL;

INSERT INTO day_templates (day_key, group_name, notes, sort_order) VALUES
  ('sab', 'Recuperación', 'Día para recuperar un entrenamiento migrado de otro día.', 5),
  ('dom', 'Descanso', 'El gimnasio no abre los domingos.', 6);

ALTER TABLE exercises
  MODIFY day_key ENUM('lun','mar','mie','jue','vie','sab','dom') NOT NULL;

CREATE TABLE week_day_overrides (
  week_id       INT UNSIGNED NOT NULL,
  day_key       ENUM('lun','mar','mie','jue','vie','sab','dom') NOT NULL,
  group_name    VARCHAR(80) NOT NULL,
  notes         TEXT NULL,
  migrated_from ENUM('lun','mar','mie','jue','vie','sab','dom') NULL,
  PRIMARY KEY (week_id, day_key),
  CONSTRAINT fk_week_day_overrides_week
    FOREIGN KEY (week_id) REFERENCES weeks(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

(sábado/domingo + "Migrar día" — necesario antes de subir el `js/app.js`/`api/` de esta tanda, o los endpoints van a fallar contra el ENUM viejo de 5 días.)
