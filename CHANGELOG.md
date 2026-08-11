# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/). Este proyecto todavía no tiene versiones etiquetadas (pre-release, solo frontend).

## [Unreleased]

### Added

- Esquema de MySQL (`api/db/schema.sql`): tablas `users`, `weeks`, `day_templates`, `exercises`, `exercise_library`.
- Script CLI `api/db/create_user.php` para crear/actualizar el usuario único de la app.
- Backend PHP con PDO: `api/config.php` (conexión + sesión), `api/auth.php` (helpers compartidos).
- Endpoints de autenticación por sesión: `api/login.php`, `api/logout.php`, `api/session.php`.
- Endpoints CRUD: `api/weeks.php` (listar, detalle, crear, copiar semana anterior, eliminar), `api/exercises.php` (crear, actualizar, eliminar), `api/library.php` (listar, agregar, eliminar).
- `.htaccess`: fuerza HTTPS y bloquea acceso directo a `config.local.php` y archivos `.sql`.
- `api/config.local.php.example` como plantilla de credenciales (el real queda gitignored).
- `index.html` inicial: frontend completo de la PWA con datos de ejemplo en memoria (sin backend todavía).
  - Header con racha actual / mejor racha (3+ ejercicios marcados, consecutivos, cruzando semanas).
  - Riel de semanas (más reciente primero) con creación de semana nueva restringida a lunes.
  - 5 tabs de día (Lun–Vie) que se marcan como cumplidos en verde.
  - Panel de día con ejercicios editables (nombre, kg, reps, series), nota por ejercicio, comparación contra la semana anterior (chevron expandible), alta/baja de ejercicios y copiado de rutina de la semana previa.
  - Librería de ejercicios con autocompletado, en la pestaña de Ajustes.
  - Swipe entre días y confirmaciones antes de eliminar ejercicios o semanas.
  - Identidad visual: acero oscuro + acento óxido, tipografías Big Shoulders Display / Inter / JetBrains Mono, iconos SVG inline.
  - Placeholders sin implementar para las vistas de Historial y Progreso.
- Control de versiones local con git.
- `README.md` y `CHANGELOG.md`.
- `js/api.js`: cliente fetch mínimo (`apiGet/apiPost/apiPut/apiDelete`), maneja `401` centralizadamente.
- Pantalla de login (`#view-login`) que protege toda la app (`#app-shell`); botón de cerrar sesión en Ajustes.
- `api/db/import_weeks_json.php`: script CLI reutilizable para importar semanas históricas desde JSON (`{monday_date, days:{lun..vie:[{name,kg,reps,series,note,done}]}}`), con modo vista previa por defecto y `--commit` para escribir. Usado para poblar 31 semanas (5 ene–3 ago 2026) desde el historial en Google Sheets del usuario, exportado a xlsx y parseado con un script Python ad-hoc (no versionado) que detectó automáticamente, por bloque de día, si la hoja tenía columna de checkbox — el formato de la hoja original fue cambiando semana a semana.
- PWA real: `manifest.json` (rutas relativas, instalable en Android/desktop/iOS), `sw.js` (cachea el app shell estático; nunca `api/`, sin sincronización offline de datos), íconos propios `icons/icon-192.png` / `icon-512.png` (mancuerna en `--accent` sobre `--bg`, generados con Pillow). Registro del service worker en `js/app.js`, tags de manifest/íconos/meta iOS en `index.html`.
- Vista y tab **Calendario**: grid mensual lunes–domingo, navegable (mes actual por defecto), calculado enteramente del lado del cliente a partir de `state.weeks` ya cargado (sin llamadas nuevas a la API). Línea de color por día lun–vie perteneciente a una semana registrada: rojo (0 ejercicios marcados), amarillo (1–5), verde (6+); fines de semana y días futuros quedan sin línea.
- Vista y tab **Perfil**: por ahora solo aloja el botón de cerrar sesión (se removió de Ajustes).
- Sesión persistente de 30 días (`api/config.php`): cookie + `session.gc_maxlifetime` a 2,592,000 segundos, en vez de cookie de sesión que expiraba al cerrar el navegador.
- Vista y tab **Historial**: tarjeta por semana (más reciente primero) con 5 indicadores de día y total de ejercicios marcados/total; riel de meses arriba (reutiliza `.week-rail`/`.week-pill` de "Hoy") como filtro, con "Todas" por defecto. Tocar un día específico de la tarjeta selecciona esa semana y ese día y navega a "Hoy" (nuevo helper `switchToView()`, extraído del handler de nav para reutilizarlo desde el click de la tarjeta); tocar el resto de la tarjeta cae en lunes. Todo calculado del lado del cliente desde `state.weeks` ya cargado, sin llamadas nuevas a la API.
- Vista y tab **Progreso**: buscador de ejercicio (`#prog-search`, mismo datalist `exercise-library-list` que ya usa el nombre de ejercicio en el panel del día) y gráfica de línea en SVG hecho a mano (kg en el tiempo), con puntos espaciados por orden de aparición (no proporcional a la fecha calendario, para no dejar huecos raros por semanas sin ese ejercicio). `collectExerciseHistory()` solo cuenta ocurrencias con `done:true` y `kg` parseable (`parseFloat`, tolera formatos como `"40(8)"` → 40; descarta lo no numérico en vez de mostrar un cero falso). Chips de último/mejor/cambio (reutiliza `.summary-strip`/`.sum-chip`); tocar un punto muestra fecha, reps y series en `#prog-detail`.
- `api/import.php`: importa una lista de semanas desde JSON (mismo formato que `import_weeks_json.php`, ahora también accesible vía HTTP autenticado). Valida la forma completa del payload antes de escribir nada (todo o nada); por semana, si ya existe la reemplaza por completo (borra sus ejercicios y mete los del archivo), si no existe la crea. Semanas no incluidas en el archivo quedan intactas.
- Exportar / importar datos en Perfil: exportar arma el JSON directo desde `state` (ya cargado, sin pedir nada nuevo a la API) y lo descarga; importar lee un archivo, muestra un `confirm()` con cuántas semanas se reemplazarían/crearían, y lo manda a `api/import.php`.
- Sábado y domingo en el riel de días: crece de 5 a 7 tabs (Lun–Dom); Lun–Vie siguen llenando el ancho visible y Sáb/Dom quedan revelados con scroll horizontal (`.day-rack` pasa a `overflow-x:auto`, mismo patrón que `.week-rail`). Tabla `day_templates` extendida con filas por defecto para `sab` ("Recuperación") y `dom` ("Descanso").
- Funcionalidad **"Migrar día"**: mueve el set completo de ejercicios (mismo grupo muscular, notas y estado marcado) de un día a otro dentro de la misma semana, para reflejar cuándo se entrenó realmente (ej. un día entre semana que se recuperó el sábado). Nueva tabla `week_day_overrides` (`week_id`, `day_key`, `group_name`, `notes`, `migrated_from`) que le da a un día migrado su propio grupo/notas por semana, en vez de depender del valor fijo por día de `day_templates` — sin fila, el día sigue usando el default de siempre. Nuevo endpoint `api/migrate_day.php`, y `fetch_week_detail()` (ahora en `api/week_helpers.php`, compartido con `weeks.php`) resuelve `group_name`/`notes`/`migrated_from` con `LEFT JOIN` a `week_day_overrides`. UI: botón "Migrar día" en el panel del día, con un `<select>` inline de días destino.
- "Migrar día" v2 — **corrimiento en cadena**: el destino puede ser cualquier día posterior de la misma semana (no solo uno vacío). Si ya tiene contenido, ese contenido se recorre un día más adelante, y así en cadena hasta encontrar un hueco (ej. migrar martes→miércoles cuando miércoles ya tiene su propia rutina empuja miércoles→jueves, jueves→viernes, viernes→sábado). Se bloquea (409) solo si algún día de la cadena ya tiene ejercicios marcados como hechos (nunca se recorre por encima de un entrenamiento ya registrado), o si no queda ningún día vacío hasta el domingo. La respuesta del endpoint agrega `shifted` (cuántos días de más se recorrieron) para que el toast lo distinga de un movimiento simple. El picker de destino ahora lista todos los días posteriores, marcando cuáles "ya tienen rutina, se recorren".

### Changed

- Progreso migra de SVG hecho a mano a [Chart.js](https://www.chartjs.org/) 4.4.0 (CDN), a pedido del usuario — mismo enfoque que su proyecto anterior. `type:'line'`, relleno de área, colores tomados de las variables CSS del tema. Sin leyenda (solo hay una serie por gráfica, a diferencia del proyecto anterior con 3 métricas). El tooltip nativo de Chart.js reemplaza el `#prog-detail`/click-en-punto hecho a mano.
- `day_key` (`day_templates`, `exercises`) pasa de ENUM de 5 valores (Lun–Vie) a 7 (Lun–Dom) — requiere correr un `ALTER TABLE` sobre bases ya existentes (ver README, "Pendiente de correr en producción"; ya corrido en local).
- Racha (`buildChronoDays()`): domingo nunca cuenta (gimnasio cerrado); sábado solo entra a la cuenta si tiene algún ejercicio esa semana; un día Lun–Vie que quedó vacío por una migración (directa o por corrimiento en cadena) se excluye en vez de contar como fallido — se detecta juntando todos los `migratedFrom` de la semana en un `Set` y comparando contra cada día vacío, en vez de solo mirar si sábado apunta directo a ese día (necesario desde que "Migrar día" soporta cadenas de varios días, no solo un salto directo a sábado).
- Calendario (`computeDayTier()`): sábado ahora se colorea con la misma lógica rojo/amarillo/verde que Lun–Vie, pero solo si tiene algún ejercicio esa semana (un sábado libre queda sin línea, no rojo). Domingo sigue siempre sin línea.
- Racha (`computeStreaks()`): el corte pasa de ser día por día a ser semanal — una semana (lun–sáb) necesita al menos 5 días cumplidos (`WEEK_STREAK_MIN_DAYS`) para no romper la racha; si los alcanza, sus días cumplidos suman normal a la cuenta (que sigue expresándose en días, no en semanas), si no, la racha se corta ahí. La semana en curso nunca se juzga "rota" hasta que termine, mismo criterio que antes aplicaba solo al día de hoy.
- Historial: la fila de indicadores por semana crece de 5 a 6 días (agrega sábado, domingo se excluye por estar siempre cerrado).
- `api/exercises.php` / `api/import.php`: `DAY_KEYS` extendido a 7 valores; en `import.php`, `sab`/`dom` quedan como opcionales (los backups viejos no los tienen) mientras que Lun–Vie siguen siendo obligatorios.
- `api/weeks.php`: `is_monday()`/`find_week_id()`/`fetch_week_detail()` se mueven a un nuevo `api/week_helpers.php` compartido, para reutilizarlos en `api/migrate_day.php` sin duplicar la lógica de JOIN con `week_day_overrides`.

- `README.md`: documenta la nueva estructura de carpetas, el esquema de base de datos y los pasos de puesta en marcha del backend.
- `index.html` separado en tres archivos: `index.html` (solo markup), `css/styles.css` (estilos) y `js/app.js` (lógica y state en memoria). Sin cambios de comportamiento — verificado sirviendo el sitio localmente.
- `js/app.js`: el frontend ya no fabrica datos de ejemplo en memoria — arranca pidiendo sesión, semanas y librería a la API, y cada acción (marcar, editar, agregar/borrar, copiar semana, librería) escribe contra los endpoints reales en vez de mutar solo el estado local.
- Servidor de desarrollo local pasa de `python -m http.server` a `php -S` (la app ya depende de `api/`).
- `js/app.js`: `computeStreaks()` ya no cuenta el día de hoy como "corte" de racha solo por no estar marcado todavía — la racha actual se congela en el valor de ayer y solo baja a 0 cuando un día ya pasado (no hoy) se queda sin marcar.
- Resumen del día (`.summary-strip`) pasa de 4 a 3 tarjetas: se quita "Racha actual" (queda solo el badge del header); grid ajustado a 3 columnas.
- Anillo de progreso del panel del día ahora cambia de color según cuántos ejercicios están marcados: rojo (`--danger`) con 2 o menos, amarillo (`--pending`) con 3 a 5, verde (`--ok`) con 6 o más.
- Iconos: se reemplazó el sprite SVG inline (`<symbol>`/`<use>`) por Font Awesome 6 Free vía CDN, en `index.html` y en todo el HTML generado dinámicamente en `js/app.js`. `.icon` en `css/styles.css` pasa de `width/height` (SVG) a `font-size` (icon font).
- Botón de cerrar sesión se mueve de Ajustes a la nueva vista Perfil.
- Nav inferior pasa de 4 a 6 secciones: Hoy, Historial, Progreso, Calendario, Perfil, Ajustes.
- Despliegue: `tu-dominio.com/bitacora` (subcarpeta) en vez del subdominio dedicado planeado originalmente — sin impacto en código gracias a que todas las rutas ya eran relativas.

### Fixed

- `sw.js`: `CACHE_NAME` a `v3` (subió a `v2` en la tanda anterior, y volvió a pasar lo mismo desarrollando Historial — cada cambio a `index.html`/`css/`/`js/` necesita este bump o el navegador sigue sirviendo el shell viejo desde caché), a `v4` en la tanda de Historial/Progreso, y a `v5` en esta (Chart.js/export-import).
- Datos: 11 filas de "Prone leg curl acostado" tenían `kg="40(8)"` — el `(8)` era la cuenta de placas porque esa máquina no tenía etiqueta de peso, no parte del valor. Corregido en local (`kg="40"`, nota explicando el porqué); pendiente correr el mismo `UPDATE` en producción — ver README, sección Despliegue.
- `js/app.js`: en Historial, una semana que cruza dos meses (ej. 27 abr–3 may) solo contaba para el filtro del mes del lunes — ahora `weekMonths()` calcula ambos meses cuando el lunes y el domingo caen en meses distintos, y la tarjeta aparece en los dos filtros.
- `js/app.js`: al tocar una tarjeta de Historial, la navegación a "Hoy" nunca cambiaba `state.activeDay`, así que siempre caía en el día activo por defecto (el de hoy) sin importar qué se tocara. Ahora cada punto L/M/X/J/V es clicable individualmente y selecciona ese día exacto.
- `js/api.js`: un `401` en cualquier endpoint pisaba el mensaje real del servidor con un genérico "No autenticado." — ahora `login.php` devuelve su propio mensaje ("Usuario o contraseña incorrectos.") y el aviso de sesión expirada es un efecto aparte, no reemplaza el mensaje.
- `js/app.js`: IDs de ejercicio comparados como string vs number en varios lugares (`findExercise`, `expandedIds`, borrado) — los ejercicios vienen de la API con `id` numérico pero el DOM siempre entrega `dataset.id` como string; sin normalizar, el chevron de "semana pasada" nunca abría y algunas comparaciones de ID fallaban silenciosamente.
- `README.md`: documentado que `Get-Content -Raw | mysql` en PowerShell corrompe acentos al importar `schema.sql` (detectado porque corrompió el seed de `day_templates` en el ambiente local) — se documenta la alternativa correcta.
- `js/app.js`: el calendario pintaba de rojo días futuros dentro de una semana ya creada (ej. si hoy es martes, miércoles/jueves/viernes de esa misma semana salían en rojo como si ya hubieran "fallado"). `computeDayTier()` ahora ignora fechas posteriores a hoy, igual que ya hacía `buildChronoDays()` para la racha.
- `sw.js`: durante el desarrollo de esta tanda de cambios, el service worker siguió sirviendo `js/app.js` cacheado (versión vieja) después de editarlo, ocultando el fix de arriba hasta darse cuenta y subir `CACHE_NAME` — ver la nota en el README sobre bumpear la versión del cache en cada deploy que toque el shell.
- `sw.js`: `CACHE_NAME` a `v6` (sábado/domingo + Migrar día) — mismo motivo que arriba, se repitió una vez más al desarrollar esta tanda.
- `js/app.js`: primera versión de `computeDayTier()` para sábado pintaba en rojo cualquier sábado pasado sin ejercicios, como si fuera un día "fallado" — pero sábado no es obligatorio como Lun–Vie. Corregido para dejarlo sin línea cuando no tiene ningún ejercicio esa semana (detectado probando en navegador antes de dar la funcionalidad por terminada).
