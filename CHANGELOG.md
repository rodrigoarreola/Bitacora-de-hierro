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
- Vista y tab **Historial**: tarjeta por semana (más reciente primero) con 5 indicadores de día y total de ejercicios marcados/total; riel de meses arriba (reutiliza `.week-rail`/`.week-pill` de "Hoy") como filtro, con "Todas" por defecto. Tocar una tarjeta selecciona esa semana y navega a "Hoy" (nuevo helper `switchToView()`, extraído del handler de nav para reutilizarlo desde el click de la tarjeta). Todo calculado del lado del cliente desde `state.weeks` ya cargado, sin llamadas nuevas a la API.

### Changed

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

- `sw.js`: `CACHE_NAME` a `v3` (subió a `v2` en la tanda anterior, y volvió a pasar lo mismo desarrollando Historial — cada cambio a `index.html`/`css/`/`js/` necesita este bump o el navegador sigue sirviendo el shell viejo desde caché).
- `js/api.js`: un `401` en cualquier endpoint pisaba el mensaje real del servidor con un genérico "No autenticado." — ahora `login.php` devuelve su propio mensaje ("Usuario o contraseña incorrectos.") y el aviso de sesión expirada es un efecto aparte, no reemplaza el mensaje.
- `js/app.js`: IDs de ejercicio comparados como string vs number en varios lugares (`findExercise`, `expandedIds`, borrado) — los ejercicios vienen de la API con `id` numérico pero el DOM siempre entrega `dataset.id` como string; sin normalizar, el chevron de "semana pasada" nunca abría y algunas comparaciones de ID fallaban silenciosamente.
- `README.md`: documentado que `Get-Content -Raw | mysql` en PowerShell corrompe acentos al importar `schema.sql` (detectado porque corrompió el seed de `day_templates` en el ambiente local) — se documenta la alternativa correcta.
- `js/app.js`: el calendario pintaba de rojo días futuros dentro de una semana ya creada (ej. si hoy es martes, miércoles/jueves/viernes de esa misma semana salían en rojo como si ya hubieran "fallado"). `computeDayTier()` ahora ignora fechas posteriores a hoy, igual que ya hacía `buildChronoDays()` para la racha.
- `sw.js`: durante el desarrollo de esta tanda de cambios, el service worker siguió sirviendo `js/app.js` cacheado (versión vieja) después de editarlo, ocultando el fix de arriba hasta darse cuenta y subir `CACHE_NAME` — ver la nota en el README sobre bumpear la versión del cache en cada deploy que toque el shell.
