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

### Changed

- `README.md`: documenta la nueva estructura de carpetas, el esquema de base de datos y los pasos de puesta en marcha del backend.
- `index.html` separado en tres archivos: `index.html` (solo markup), `css/styles.css` (estilos) y `js/app.js` (lógica y state en memoria). Sin cambios de comportamiento — verificado sirviendo el sitio localmente.
- `js/app.js`: el frontend ya no fabrica datos de ejemplo en memoria — arranca pidiendo sesión, semanas y librería a la API, y cada acción (marcar, editar, agregar/borrar, copiar semana, librería) escribe contra los endpoints reales en vez de mutar solo el estado local.
- Servidor de desarrollo local pasa de `python -m http.server` a `php -S` (la app ya depende de `api/`).

### Fixed

- `js/api.js`: un `401` en cualquier endpoint pisaba el mensaje real del servidor con un genérico "No autenticado." — ahora `login.php` devuelve su propio mensaje ("Usuario o contraseña incorrectos.") y el aviso de sesión expirada es un efecto aparte, no reemplaza el mensaje.
- `js/app.js`: IDs de ejercicio comparados como string vs number en varios lugares (`findExercise`, `expandedIds`, borrado) — los ejercicios vienen de la API con `id` numérico pero el DOM siempre entrega `dataset.id` como string; sin normalizar, el chevron de "semana pasada" nunca abría y algunas comparaciones de ID fallaban silenciosamente.
- `README.md`: documentado que `Get-Content -Raw | mysql` en PowerShell corrompe acentos al importar `schema.sql` (detectado porque corrompió el seed de `day_templates` en el ambiente local) — se documenta la alternativa correcta.
