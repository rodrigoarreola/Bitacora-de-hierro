# Bitácora de Hierro

PWA de registro de gimnasio. Reemplaza una hoja de cálculo semanal (una pestaña por semana, 5 tablas por día — Lunes a Viernes — con ejercicio, peso, reps, series y checkbox de cumplido).

Un solo usuario. Sin frameworks de frontend. Pensada para desplegarse como archivos sueltos en hosting compartido.

## Stack

- **Frontend**: HTML/CSS/JS vanilla, sin framework — dependencias externas solo vía CDN, que el service worker guarda en un caché propio para que la app abra completa sin conexión (Google Fonts, Font Awesome, [Chart.js](https://www.chartjs.org/) 4.4.0 para la gráfica de Progreso, [html2canvas](https://html2canvas.hertzen.com/) 1.4.1 para "Compartir"). Edición offline vía IndexedDB (`js/offline-queue.js`), sin librería externa.
- **Backend**: PHP + MySQL (PDO, sin framework).
- **Auth**: login usuario/contraseña con sesión PHP — sin API keys expuestas ni OAuth.
- **Hosting**: Hostgator, subcarpeta del dominio principal — `tu-dominio.com/bitacora`.

## Estado actual

**En producción**: `https://tu-dominio.com/bitacora/`.

El frontend (`index.html` + `css/` + `js/app.js` + `js/api.js`) está **conectado a la API real**: requiere sesión (pantalla de login, persistente 30 días) y todo lo que se ve — semanas, ejercicios, librería — se lee y se escribe contra MySQL a través de `api/`. Ya no hay datos de ejemplo en memoria.

### Estructura del proyecto

```
/
├── index.html                     Markup: pantalla de login + #app-shell con el resto
├── manifest.json                  Manifest de la PWA (rutas relativas, funciona en cualquier subcarpeta)
├── sw.js                          Service worker: cachea el app shell, nunca api/ — CACHE_NAME se recalcula solo (ver .githooks/)
├── docs/
│   ├── SCREENS.md                 Inventario de pantallas: rutas, datos y estados
│   ├── UI-ESTRUCTURA.md           Qué contiene cada pantalla (base para rediseñar la UI)
│   ├── ESTRUCTURA.md              Mapa de código: qué hace cada archivo y función
│   ├── AUDITORIA.md               Auditoría de organización (foto del 2026-09-21)
│   └── adr/                       Decisiones de arquitectura, una por archivo (ver adr/README.md)
├── scripts/
│   ├── bump-sw-cache.php          Recalcula CACHE_NAME de sw.js según hash del app shell — lo corre .githooks/pre-commit, no hace falta a mano
│   └── build-changelog.php        Genera js/changelog-data.js desde los bloques "### En la app:" de CHANGELOG.md — también lo corre el hook
├── .githooks/
│   └── pre-commit                 Corre build-changelog.php y bump-sw-cache.php en cada commit — activar con `git config core.hooksPath .githooks`
├── icons/
│   ├── icon-192.png                Ícono de la PWA (mancuerna --accent sobre --bg)
│   └── icon-512.png
├── css/
│   ├── tokens.css                 Design tokens: colores (y con transparencia), radios, tamaños de texto, espaciado
│   ├── components.css             Componentes base: .card (+ --compact/--raised/--dashed) y .btn (+ --primary/--ghost/--danger/--block/--sm/--icon)
│   ├── base.css                   Reset, tipografía, header, toast, barra inferior, banner offline y utilidades
│   └── views/                     Un archivo por pantalla: hoy, ajustes, login, perfil, calendario, historial, progreso
├── js/
│   ├── offline-queue.js           Cola de mutaciones pendientes en IndexedDB (edición offline)
│   ├── snapshot.js                Copia local de los datos (IndexedDB) para abrir la app sin conexión
│   ├── changelog-data.js          GENERADO desde CHANGELOG.md (Perfil → Changelog) — no editar a mano
│   ├── api.js                     Cliente fetch (apiGet/Post/Put/Delete), maneja 401 y encola mutaciones sin conexión
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
│   ├── migrate_day.php            POST: migra el set completo de ejercicios de un día a otro dentro de la misma semana (en cadena si el destino ya tiene contenido)
│   ├── settings.php               GET/PUT reglas editables (Ajustes) — mínimos de racha/Hitos
│   ├── backups.php                GET: lista y descarga los backups generados por backup_export.php (Perfil → Backups)
│   └── db/
│       ├── schema.sql             DDL completo + seed de day_templates
│       ├── create_user.php        Script CLI para crear el usuario único (nunca vía HTTP)
│       ├── backup_export.php      Script CLI: backup semanal a JSON (ver "Backup automático (cron)" en Despliegue)
│       └── backups/               Backups generados por backup_export.php — .htaccess propio, gitignored
```

### Esquema de base de datos

Ocho tablas (`api/db/schema.sql`): `users` (una fila, credenciales del único usuario), `weeks` (una fila por semana, identificada por el lunes en formato ISO; incluye `note`, texto libre para la nota de la semana completa), `day_templates` (grupo muscular y notas **por defecto** de cada uno de los 7 días — Lun–Dom —, sembrados desde la rutina base; sábado/domingo llevan un valor genérico ya que no tienen rutina fija), `exercises` (filas editables por semana+día; `kg`/`reps`/`series` son texto libre para permitir formatos no numéricos; `updated_at` se actualiza solo en cada cambio y es la base del last-write-wins de la edición offline), `exercise_library` (nombres para autocompletar), `week_day_overrides` (group_name/notes específicos de una semana puntual — solo existe una fila cuando ese día recibió contenido migrado de otro día vía "Migrar día"; sin fila, el día usa el valor por defecto de `day_templates`), `week_day_sessions` (hora de inicio/fin y duración de un día puntual — sin fila, ese día no tiene horario registrado) y `app_settings` (reglas editables desde Ajustes — `setting_key`/`setting_value`; sin fila para una clave, se usa el default definido en `api/settings.php`).

### Puesta en marcha del backend (una sola vez por entorno)

1. Crear la base de datos en cPanel (MySQL Databases) y un usuario con permisos sobre ella.
2. Importar `api/db/schema.sql` (phpMyAdmin, o `mysql -u user -p nombre_bd < api/db/schema.sql`). **En Windows/PowerShell no uses `Get-Content -Raw | mysql`** — PowerShell 5.1 lee el archivo con la codepage del sistema en vez de UTF-8 y corrompe los acentos (`Tríceps` → `Tr??ceps`); si necesitas hacerlo desde PowerShell, usa `Get-Content -Raw -Encoding UTF8 | mysql ...` o mejor `cmd /c "mysql -u user -p nombre_bd < api/db/schema.sql"`.
3. Copiar `api/config.local.php.example` a `api/config.local.php` y completar host/nombre/usuario/contraseña de la BD. Este archivo está en `.gitignore`, nunca se sube a git.
4. Crear el usuario de la app por SSH/Terminal/Cron: `php api/db/create_user.php <usuario> <contraseña>`. **Sin acceso a shell** (caso típico en Hostgator sin plan con SSH): genera el hash localmente con `php -r "echo password_hash('tu-contraseña', PASSWORD_DEFAULT), PHP_EOL;"` y pégalo directo por phpMyAdmin → SQL: `INSERT INTO users (username, password_hash) VALUES ('usuario', 'el-hash-generado');`. El hash es portable entre máquinas/PHP, no hay problema de compatibilidad.

### Funcionalidad implementada

- **Estados de carga**: la primera vez que se piden los datos, el shell muestra esqueletos (`.skeleton`, con `prefers-reduced-motion` respetado) y `aria-busy`; si la carga falla, pantalla de Arranque con Reintentar; la lista de backups muestra "Cargando…" y Reintentar; sin Chart.js, Progreso y Horarios avisan con Recargar en vez de romperse.
- **Navegación**: barra inferior de 5 destinos (Hoy, Historial, Progreso, Calendario, Perfil) y **Ajustes** como ícono de engranaje en el header. Cada vista tiene URL por hash (`#/hoy`, `#/historial`, `#/progreso`, `#/calendario`, `#/perfil`, `#/ajustes`): el botón atrás recorre las vistas visitadas, un enlace directo abre esa vista y recargar te deja en la misma.
- **Header**: racha actual y mejor racha, en días (día "cumplido" = ejercicios marcados ≥ una regla editable en Ajustes, 3 por defecto). El corte ya no es día por día: una semana (lun–sáb, domingo nunca cuenta) necesita **al menos N días cumplidos** (otra regla editable, 5 por defecto) para no romper la racha — si los alcanza, todos sus días cumplidos suman normal; si no, la racha se corta ahí aunque algún día suelto sí haya llegado al mínimo. La semana en curso nunca se juzga como "rota" hasta que termine.
- **Riel de semanas**: semanas ordenadas de más reciente a más antigua, con botón "Nueva semana" (date picker restringido a lunes — ajusta automáticamente si se elige otro día).
- **7 tabs de día** (Lun–Dom): Lun–Vie llenan el ancho real del riel en cualquier celular (`calc()` en vez de un ancho fijo); Sáb/Dom quedan revelados solo al hacer scroll horizontal. Se pintan en verde cuando el día está "cumplido". Un día que recibió contenido migrado de otro muestra un pequeño ícono con el día de origen.
- **Panel del día**:
  - Ejercicios editables inline: nombre (con autocompletado contra la librería), kg, reps, series.
  - Nota libre por ejercicio (ej. "incluye barra", "×2 la mancuerna").
  - Chevron expandible que compara kg/reps/series contra la semana anterior (flechas subir/bajar/igual), más una línea de **progresión sugerida** (kg de la semana pasada + 2.5 kg fijo) cuando esa semana quedó marcada como hecha y su kg es numérico — solo referencia visual, nunca precarga el input.
  - Agregar y eliminar ejercicios (con confirmación al borrar).
  - **PR automático**: si el kg marcado supera el mejor kg histórico registrado para ese mismo ejercicio, aparece un toast de récord (no cuenta la primera vez que se registra un ejercicio nuevo).
  - "Copiar semana pasada" cuando el día está vacío.
  - "Migrar día": mueve el set completo de ejercicios (mismo grupo muscular, notas y estado marcado) de un día a otro **posterior dentro de la misma semana** — pensado para cuando un entrenamiento entre semana se recupera más adelante. El destino puede ser cualquier día posterior, tenga o no contenido: si ya tiene, ese contenido se recorre un día más adelante y así en cadena hasta encontrar un hueco (ej. migrar martes→miércoles cuando miércoles ya tiene rutina empuja miércoles→jueves, jueves→viernes...). Se bloquea solo si algún día de la cadena ya tiene ejercicios marcados como hechos, o si no queda ningún hueco hasta el domingo. Se muestra debajo de "+ Agregar ejercicio".
  - Botón "Compartir" (ícono) que captura el panel del día como imagen PNG (html2canvas) y usa `navigator.share()` en celular o cae a descarga normal.
  - Botón de calendario junto al anterior: clona el bloque de arriba de "Hoy" (header con racha, riel de semanas, riel de días, tira de resumen y comparación semanal) y lo copia al portapapeles como PNG. "Patrón Strava": una sola card redondeada al 50% de opacidad (no transparente del todo, tampoco sólida) en vez de fondo completamente transparente — pensada para pegarse sobre cualquier fondo al compartir en redes (una foto, no solo un chat oscuro). El título, el subtítulo, el label "racha actual" y el nombre/grupo muscular de cada day-tab van en blanco, y el número de racha siempre en verde (sin card propia detrás, se perdían con los tonos apagados de la app en vivo); los días completados llevan el mismo verde pero al 30%. El riel de semanas y el de días solo muestran ítems completos —nunca uno cortado a la mitad— y ambos ocupan el ancho real de la card exportada (520px) en vez de quedar encogidos al ancho más angosto del celular de origen: el de días reparte ese ancho entre los tabs que entran, y el de semanas suma tantos pills como quepan. Si el navegador no soporta copiar imágenes, cae a descarga normal.
  - Anillo de progreso (ejercicios marcados / total) y tira de resumen de 4 columnas (series de hoy, ejercicios, mejor racha, volumen del día en kg×reps×series).
  - Card "Iniciar/Finalizar entrenamiento": botón de ícono play/stop en rojo (no texto) + hora de inicio/fin + duración calculada, los 4 en una sola fila sin partirse aunque el celular sea angosto. Si el día cargado en "Hoy" es literalmente hoy (fecha real, no el día de la semana), la card se reubica entre el riel de días y la tira de resumen; para cualquier otro día se queda donde siempre vivió, justo antes de la nota de la semana.
  - Al final del bloque: **nota libre de la semana** (textarea, se guarda sola al salir del campo) y un **conversor kg / lbs** suelto (dos inputs enlazados, no se guarda en ningún lado).
- **Ajustes**: **Reglas** editables — mínimos de ejercicios/día para "cumplido", días/semana para no romper la racha, semana fuerte y semanas mínimas para mostrar un período en Hitos. Se guardan en `app_settings` vía `api/settings.php` y afectan el cálculo real de inmediato (racha, riel de días, Historial, Hitos), sin recargar la página. **Librería de ejercicios**: lista reutilizable para autocompletar nombres al agregar ejercicios; se alimenta sola con lo que se escribe en cualquier día, y se puede buscar/eliminar manualmente.
- **Swipe horizontal** entre días dentro del panel, y entre meses en el Calendario.
- **Diálogos** propios (`confirmDialog()`, bottom sheet con foco, Escape y `role="alertdialog"`) antes de eliminar una semana, quitar un ejercicio de la librería o importar datos, y `promptDialog()` (el mismo diálogo con un campo de texto) para la nota de un ejercicio: ya no se usa ningún diálogo nativo del navegador.
- **Calendario**: vista de mes (lunes a domingo), navegable con flechas o swipe, por defecto en el mes actual (botón "Volver a hoy" cuando te alejás). Cada día lun–vie que pertenece a una semana ya creada pinta una línea de color según ejercicios marcados ese día: rojo (0), amarillo (1–5), verde (6+). Sábado se colorea igual, pero solo si tiene algún ejercicio esa semana (un sábado libre no es un día "fallado", así que se deja sin línea en vez de rojo). Domingo nunca lleva línea — el gimnasio no abre. Días futuros tampoco (no cuentan como "fallados" antes de pasar). Tocar un día que pertenece a una semana ya creada navega a "Hoy" con ese día exacto seleccionado, para verlo o editarlo — días sin semana no hacen nada. Debajo, una card de **heatmap anual**: riel de años como filtro (derivado de las semanas reales que hay en `state.order`, ya no una lista fija — el histórico 2022–2025 importado de Garmin aparece solo si hay datos ese año) y un grid vertical de 7 columnas (Lun–Dom) × 52/53 filas, una fila por semana, con cuadros verdes en los días cumplidos (mismo criterio que la racha) — sin niveles rojo/amarillo todavía.
- **Perfil**, de arriba a abajo: **Hitos y constancia** — estadísticas calculadas del lado del cliente desde `state.weeks` (mismo criterio de "día cumplido" que la racha, y con `fullWeekRange()` tratando cualquier semana sin fila en la base como una semana de 0 días, para que meses enteros sin registrar no queden invisibles): hasta 3 tramos de mayor constancia (semanas consecutivas seguidas, sin huecos, con ícono de trofeo dorado / medalla plata / medalla bronce según el lugar; formato de fecha en dos líneas — "Marzo a Junio 2026" arriba, "Lunes 23 al Viernes 05" abajo) y hasta 3 de menor constancia (medidos en días reales entre un entrenamiento y el siguiente, no en semanas — mismo cálculo que "Hueco más largo sin entrenar" quedándose con los 3 huecos más grandes), más una lista de hitos (primer entrenamiento, mejor racha con fechas y año, mes con más entrenamientos, hueco más largo sin entrenar con fechas y año, año más productivo). Incluye histórico 2022–2025 importado desde Garmin Connect como relleno de bajo esfuerzo (filas sintéticas `Garmin: <CATEGORÍA>`, sin peso ni detalle por ejercicio, grupo "Entrenamiento funcional") — ver el CHANGELOG para el detalle de cómo se generó. **Horarios de entrenamiento** — debajo de Hitos, sin botón propio en el menú inferior: filtro por año (solo los años con alguna sesión con horario registrado) y por mes (Ene–Dic, combinable con el de año), chips de tiempo total/promedio/sesión más larga/hora más frecuente, gráfica de duración por sesión (mismo estilo que Progreso, puntos visibles solo con año y mes filtrados a la vez) y barras de distribución por hora de inicio. Exportar/importar datos (el nombre del archivo exportado incluye hora además de fecha). Botón de cerrar sesión. **Changelog** — colapsado por defecto (solo "Changelog / Versión actual: X.X.X" + chevron); al abrirlo, versión actual + historial de versiones como acordeones (`<details>`/`<summary>` nativos, sin JS de toggle), resumen de cara al usuario del `CHANGELOG.md` técnico (`APP_VERSIONS` en `js/app.js`).
- **Sesión persistente**: cookie de 30 días — no hay que iniciar sesión cada vez que se abre la app.
- **Protección contra fuerza bruta en login**: 5 intentos fallidos seguidos bloquean la cuenta 15 minutos (`failed_attempts`/`locked_until` en `users`). Sin tracking de IP a propósito — hay una sola cuenta posible de todos modos.
- **Historial**: una tarjeta por semana (más reciente primero), con 6 indicadores de día — Lun–Sáb, sin domingo — (verde si ese día quedó "cumplido"), el total de ejercicios marcados/total de la semana y un botón "Compartir" que captura la tarjeta como imagen PNG. Riel de meses arriba para filtrar (mismo estilo que el riel de semanas de "Hoy"), con "Todas" como opción por defecto — una semana que cruza dos meses (ej. 27 abr–3 may) aparece en ambos filtros. Tocar un día específico de la tarjeta te manda a "Hoy" con ese día exacto seleccionado; tocar el resto de la tarjeta cae en lunes. Al final, un panel de **balance por grupo muscular**: una barra por grupo con cuántos días "cumplidos" tuvo, en el mismo período que ya filtra el riel de meses.
- **Edición offline** (alcance acotado): si se pierde la conexión al editar un ejercicio ya existente (marcar hecho, cambiar nombre/kg/reps/series/nota, borrar) o la nota de una semana, el cambio se guarda en una cola local (IndexedDB) y se reintenta solo al reconectar. Conflictos se resuelven con last-write-wins por timestamp (`exercises.updated_at`). Un banner arriba de la app avisa "Sin conexión" y cuántos cambios están pendientes. Quedan fuera de la cola (siguen fallando sin conexión, como antes): crear semana, agregar ejercicio, migrar día, copiar semana pasada, importar datos y la librería de ejercicios.
- **Progreso**: buscador de ejercicio (mismo autocompletado contra la librería que ya se usa en el panel del día) y gráfica de línea con Chart.js (carga en kg en el tiempo, relleno de área, tooltip nativo con fecha/reps/series al tocar un punto — sin leyenda, porque solo hay una serie por gráfica). Solo cuenta apariciones marcadas como hechas (`done`), nunca las que solo estaban en la rutina sin marcar; valores de `kg` no numéricos se descartan en vez de graficarse como cero. Chips de último peso, mejor peso y cambio desde el primer registro.
- **Exportar / importar datos** (tab Perfil): exportar arma un JSON con todas las semanas/ejercicios ya cargados en memoria (sin pedir nada nuevo a la API) y lo descarga. Importar lee un archivo con esa misma forma y lo manda a `api/import.php`: valida todo antes de escribir (todo o nada, transacción), y por cada semana del archivo — si ya existe en tu base (mismo lunes), reemplaza sus ejercicios por completo; si no existe, la crea. Las semanas que no vienen en el archivo quedan intactas. Antes de enviar, un `confirm()` te dice cuántas semanas se van a reemplazar y cuántas son nuevas.
- **Backups automáticos** (tab Perfil): lista los volcados que genera el cron del servidor (`api/db/backup_export.php`, ver "Backup automático (cron)" en Despliegue) vía `api/backups.php`, con fecha y tamaño, cada uno descargable con un click — antes solo se podían bajar por FTP.

### Identidad visual

- Paleta: acero oscuro (`#14171B`, `#1B1F26`) con acento óxido/rojo (`#D9481F`).
- Tipografía: Big Shoulders Display (títulos), Inter (cuerpo), JetBrains Mono (valores numéricos).
- Iconos: Font Awesome 6 Free vía CDN.
- Layout mobile-first, `max-width: 520px`.

### PWA

**Manifest:** declara `id`, `categories` y tres `shortcuts` (Progreso, Historial y Calendario: al mantener presionado el ícono de la app instalada abren esa pantalla por su URL de hash). Los íconos se declaran dos veces, como `any` y como `maskable` (el mismo PNG: el fondo llena todo el cuadro y la mancuerna queda dentro de la zona segura). No hay `screenshots`: requieren imágenes reales de la app. El manifest y los íconos entran al hash del shell, así que cambiarlos invalida el caché.

**Librerías de CDN sin conexión:** Chart.js, el plugin de zoom, html2canvas, Font Awesome y las tipografías de Google Fonts van a `bitacora-libs-v1`, un caché aparte del shell que no cambia con cada versión (sus URLs ya llevan la versión). Se guardan al instalar el service worker —lee las URLs del propio `index.html`— y, de los CSS, solo las fuentes que la app usa (Font Awesome `solid` y los subconjuntos `latin`/`latin-ext`). Requiere una primera visita con conexión. Si se agrega otra librería o se cambia de versión, basta con actualizar la URL en `index.html`; si se usa otro estilo de Font Awesome (regular/brands) o otro alfabeto, hay que ampliar `fontUrlsToWarm()` en `sw.js`. Ver [ADR 0007](docs/adr/0007-cache-de-librerias-cdn.md).

`manifest.json` + `sw.js` ya están activos: la app es instalable (Android/desktop vía Chrome/Edge, iOS vía "Agregar a inicio" en Safari). El service worker cachea el *app shell* estático (HTML/CSS/JS/íconos) y **nunca intercepta `api/`**. La edición sin conexión la resuelven la cola de `js/offline-queue.js` (cambios pendientes) y la copia local de `js/snapshot.js` (últimos datos cargados, para abrir la app sin red). `start_url`/`scope` del manifest y el registro del service worker usan rutas relativas a propósito, para que funcionen igual en `localhost:8000`, en un subdominio o en una subcarpeta como `/bitacora`, sin tocar código.

**Estrategia de caché:** todo el shell (incluido `index.html`) sale de un único caché versionado, así nunca se mezcla un HTML nuevo con un JS viejo. Una versión nueva se instala en segundo plano y **espera**: la app muestra "Hay una versión nueva de la app — Actualizar" y, al aceptar, se activa y se recarga. El navegador busca un `sw.js` nuevo al navegar y también cada vez que la app vuelve a primer plano. Consecuencia en desarrollo: como el shell sale del caché, un cambio en `index.html`/`css`/`js` no se ve hasta que cambie `CACHE_NAME` (al commitear) y se acepte la actualización — en DevTools → Application → Service Workers, marca *Update on reload* o *Bypass for network*, o ejecuta `php scripts/bump-sw-cache.php`.

`CACHE_NAME` de `sw.js` se recalcula solo: un git hook (`.githooks/pre-commit` → `scripts/bump-sw-cache.php`) hashea el contenido de `index.html`, todo `css/` (tokens, components, base y views/), `js/changelog-data.js`, `js/app.js`/`js/api.js`/`js/offline-queue.js`/`js/snapshot.js` en cada commit y reescribe `CACHE_NAME` (`bitacora-shell-<hash10>`) solo si alguno cambió — ya no hace falta acordarse de bumpearlo a mano, que era la causa de que varias veces durante el desarrollo local de este proyecto un navegador con la PWA instalada siguiera sirviendo el shell viejo desde caché. **Activar el hook una sola vez por clon del repo**: `git config core.hooksPath .githooks`.

## Pendiente

Nada del alcance original queda sin implementar. Ideas para más adelante, sin comprometerse: comparar dos ejercicios a la vez en Progreso, un dashboard con mini-gráficas de todos los ejercicios, y gráficas de reps/series como líneas independientes (hoy solo se ve al tocar un punto).

## Desarrollo local

No requiere build, pero sí un servidor con PHP (la app ya llama a `api/`, no sirve con un servidor puramente estático):

```bash
php -S localhost:8000
```

Necesita `api/config.local.php` ya configurado apuntando a una base de datos con el esquema importado — ver "Puesta en marcha del backend" arriba.

Para no tener que loguearse cada vez en local, agregar `define('DEV_AUTOLOGIN', true);` a `api/config.local.php` — salta el login automáticamente con el único usuario que existe. Solo tiene efecto corriendo con `php -S` desde `localhost`/`127.0.0.1` (chequeo de `PHP_SAPI` + IP en `api/config.php`); no hay forma de que esto se active en producción, y el archivo nunca se sube a git.

## Proceso de cambios

- **Commits:** [Conventional Commits](https://www.conventionalcommits.org/es/v1.0.0/) — `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`… con el resumen en español y en imperativo (ej. `fix: contar el domingo en racha`). Solo aplica hacia adelante; el historial anterior no se reescribe.
- **Versiones:** semver, una entrada por versión en `CHANGELOG.md` (formato Keep a Changelog) y un tag `vX.Y.Z` en el commit que la publica (`git tag -a vX.Y.Z -m "Versión X.Y.Z"`).
- **Changelog de la app:** la versión más reciente de `CHANGELOG.md` **debe** llevar un bloque `### En la app: <título>` con los cambios en lenguaje llano (`- …`). De ahí sale `js/changelog-data.js`, que el hook regenera en cada commit; si falta el bloque, el commit se aborta. Ver [ADR 0006](docs/adr/0006-changelog-fuente-unica.md).
- **Archivos nuevos del shell** (HTML/CSS/JS que la app carga): agregarlos a `SHELL_ASSETS` en `sw.js` y a la lista de `scripts/bump-sw-cache.php`. Si se olvida alguno, el hook aborta el commit con un mensaje que dice cuál falta.
- **CSS:** un estilo nuevo va en el archivo de su pantalla (`css/views/`); lo que usan varias pantallas, en `css/components.css`; los valores (colores, radios, tamaños, espaciado), como tokens en `css/tokens.css`.
- **Decisiones de arquitectura:** un archivo por decisión en `docs/adr/`.

## Despliegue

Destino: `tu-dominio.com/bitacora`, vía FTP/SFTP. Como todas las rutas del proyecto son relativas, no hace falta tocar ni una línea de código por vivir en una subcarpeta en vez de un subdominio.

1. **Base de datos**: en cPanel → MySQL Databases, crear la base y un usuario con permisos sobre ella (igual que en local, con `bitacora_app` como referencia de nombre).
2. **Subir archivos**: todo el árbol del repo tal como está en git a la carpeta `/bitacora` del hosting, **excepto** lo que ya está en `.gitignore` (`api/config.local.php`, `.claude/`) y sobre todo **la carpeta `.git/`** — nunca se sube, ni por accidente al arrastrar la carpeta completa del proyecto (expone todo el historial del repo). Si FileZilla se desconecta a medias subiendo/borrando algo, siempre reconectar y confirmar el listado remoto antes de seguir.

   Alternativa a FileZilla: `scripts/deploy-ftp.ps1` sube por SFTP solo lo que cambió desde el último deploy (usando `curl`, que ya trae soporte SFTP). Copiar `scripts/deploy.local.json.example` a `scripts/deploy.local.json` (gitignorado — nunca se sube) con los mismos datos que en FileZilla, correr una vez con `-Full` (sube todo el árbol versionado) y de ahí en más sin parámetros. `-DryRun` muestra qué se subiría sin conectarse. Para subir el zip de "Armar el paquete de producción" en su lugar, seguir usando FileZilla o el cliente SFTP que prefieras.
3. **Importar el esquema**: `api/db/schema.sql` vía phpMyAdmin (Importar → seleccionar el archivo). Evita hacerlo desde PowerShell con `Get-Content -Raw | mysql` — ver la nota de encoding más abajo.
4. **Config local de producción**: crear `api/config.local.php` directo en el servidor (editor de archivos de cPanel, o edítalo local y súbelo por FTP aparte — nunca por git) a partir de `api/config.local.php.example`, con las credenciales reales de la base. Si alguna vez se rota la contraseña de la BD, hay que actualizar este archivo en el servidor también — el sitio da 500 ("no se pudo conectar a la base de datos") hasta que coincidan.
5. **Usuario de la app**: ver el paso 4 de "Puesta en marcha del backend" arriba (SSH/Terminal/Cron, o el `INSERT` vía phpMyAdmin si no hay acceso a shell).
6. **Verificar**: entrar a `https://tu-dominio.com/bitacora/`, confirmar que carga por HTTPS, que el login funciona, y que el manifest/service worker se registran (DevTools → Application → Manifest / Service Workers, o una auditoría Lighthouse → PWA).

`.htaccess` no necesita ajustes para la subcarpeta: la regla de HTTPS usa `%{HTTP_HOST}%{REQUEST_URI}` (no una ruta fija) y el bloqueo de `config.local.php`/`*.sql` es por nombre de archivo.

### Armar el paquete de producción

Cada versión se empaqueta desde su **tag** (no desde el directorio de trabajo, para que no se cuele nada sin commitear) en `producción/bitacora-vX.Y.Z-AAAA-MM-DD/` más su `.zip` (la carpeta `producción/` está en `.gitignore`):

```bash
VER=X.Y.Z; DEST="producción/bitacora-v$VER-$(date +%F)"
mkdir -p "$DEST"
git -c core.autocrlf=false -c core.eol=lf archive --format=tar "v$VER" | tar -x -C "$DEST"
rm -rf "$DEST"/{.githooks,.gitignore,docs,scripts,README.md,CHANGELOG.md}   # no hacen falta en el servidor
python -c "import zipfile,os,sys; d=sys.argv[1]; z=zipfile.ZipFile(d+'.zip','w',zipfile.ZIP_DEFLATED); [z.write(os.path.join(r,f), os.path.relpath(os.path.join(r,f),d)) for r,_,fs in os.walk(d) for f in fs]" "$DEST"
```

- **`-c core.autocrlf=false` es obligatorio en Windows**: con `core.autocrlf=true`, `git archive` convierte todo a CRLF y el paquete deja de coincidir byte a byte con lo commiteado.
- El `.zip` queda con los archivos en la raíz (sin la carpeta contenedora) y con `/` como separador, listo para descomprimir en `/bitacora` desde cPanel.
- **No incluye** `api/config.local.php` (nunca está en git; el del servidor se conserva) ni `api/db/backups/` ni `api/media_cache/` (ignorados).

**Antes de subirlo**, comprobar: que `git status` esté limpio y el tag apunte a `HEAD`; sintaxis (`node --check js/*.js sw.js`, `php -l` a cada `.php`); `php scripts/bump-sw-cache.php` y `php scripts/build-changelog.php` sin cambios; que todo lo de `SHELL_ASSETS` y lo que carga `index.html` exista en el paquete; que cada archivo del paquete sea idéntico a `git show vX.Y.Z:<archivo>`; que no haya `config.local.php`, `DEV_AUTOLOGIN` activo ni contraseñas; y que las revisiones de esquema SQL pendientes (abajo) ya estén corridas si el cambio las requiere.

### Backup automático (cron)

`api/db/backup_export.php` vuelca todas las semanas a un JSON (mismo formato que exportar desde Perfil) en `api/db/backups/`, protegida por su propio `.htaccess` (`Require all denied` — no es accesible por navegador; el script además se niega a correr fuera de CLI). Guarda solo los últimos 14 backups, borra el resto solo.

No requiere acceso SSH — cPanel → **Cron Jobs** funciona por sí solo (es un panel distinto a Terminal/SSH, disponible en la mayoría de los planes de Hostgator):

1. cPanel → Cron Jobs → Add New Cron Job.
2. Frecuencia sugerida: semanal (ej. "Once Per Week" — domingos 3:00 AM).
3. Comando: `php /home/<usuario_cpanel>/<ruta_a_bitacora>/api/db/backup_export.php` (ajustar la ruta real del hosting; se puede confirmar con `pwd` en Terminal si hay acceso, o preguntándole a soporte de Hostgator la ruta absoluta de la cuenta).
4. Los backups quedan disponibles para descargar desde la app (Perfil → "Backups automáticos") vía `api/backups.php`, sin necesitar FTP.

### Pendiente de correr en producción

Estos cambios ya se hicieron en local pero todavía no en el servidor — no hay certeza de cuáles ya se corrieron en producción en algún deploy anterior, así que el bloque de abajo es **idempotente**: cada `ALTER` se salta solo si la columna ya existe (chequeo contra `information_schema.COLUMNS` + SQL dinámico — funciona igual en MySQL y MariaDB, a diferencia de `ADD COLUMN IF NOT EXISTS`, que no está disponible en todas las versiones). Correr entero, de una sola vez, vía phpMyAdmin → SQL, sobre la base de producción:

```sql
-- app_settings: reglas editables desde Ajustes (api/settings.php).
-- CREATE TABLE IF NOT EXISTS ya es idempotente por sí solo.
CREATE TABLE IF NOT EXISTS app_settings (
  setting_key   VARCHAR(60)  NOT NULL PRIMARY KEY,
  setting_value VARCHAR(255) NOT NULL,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- weeks.note: nota libre de la semana, editable desde "Hoy" (api/weeks.php).
SET @exists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'weeks' AND COLUMN_NAME = 'note'
);
SET @sql = IF(@exists = 0,
  'ALTER TABLE weeks ADD COLUMN note TEXT NULL AFTER monday_date',
  'SELECT "weeks.note ya existe, se omite"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- exercises.updated_at: last-write-wins de la edición offline (api/exercises.php).
SET @exists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'exercises' AND COLUMN_NAME = 'updated_at'
);
SET @sql = IF(@exists = 0,
  'ALTER TABLE exercises ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at',
  'SELECT "exercises.updated_at ya existe, se omite"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- users.failed_attempts / users.locked_until: fuerza bruta en login (api/login.php).
SET @exists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'failed_attempts'
);
SET @sql = IF(@exists = 0,
  'ALTER TABLE users ADD COLUMN failed_attempts TINYINT UNSIGNED NOT NULL DEFAULT 0',
  'SELECT "users.failed_attempts ya existe, se omite"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @exists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'locked_until'
);
SET @sql = IF(@exists = 0,
  'ALTER TABLE users ADD COLUMN locked_until DATETIME NULL',
  'SELECT "users.locked_until ya existe, se omite"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- week_day_sessions: hora de inicio/fin y duración por día (botón
-- "Iniciar/Finalizar entrenamiento" en api/weeks.php).
-- CREATE TABLE IF NOT EXISTS ya es idempotente por sí solo.
CREATE TABLE IF NOT EXISTS week_day_sessions (
  week_id      INT UNSIGNED NOT NULL,
  day_key      ENUM('lun','mar','mie','jue','vie','sab','dom') NOT NULL,
  start_time   TIME NULL,
  end_time     TIME NULL,
  duration_min SMALLINT UNSIGNED NULL,
  PRIMARY KEY (week_id, day_key),
  CONSTRAINT fk_week_day_sessions_week
    FOREIGN KEY (week_id) REFERENCES weeks(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

Cada bloque devuelve un mensaje (`SELECT "..."`) cuando se salta, así que se puede ver en el resultado de phpMyAdmin exactamente cuáles se aplicaron y cuáles ya estaban. `DEFAULT`/`NULL` en las columnas nuevas dejan las filas existentes sin backfill manual — mismo criterio que ya tenían las versiones no defensivas de estos `ALTER`.
