# Estructura del proyecto

Mapa de referencia rápida: qué hace cada archivo y dónde vive cada
funcionalidad, para poder pedir cambios puntuales sin que tenga que
explorar el repo primero (ver tips de prompting al final).

**Los números de línea son aproximados** (versión actual: `1.14.0`,
commit `158d19d`) — cambian con cada edición. Sirven para ubicarse rápido,
no como referencia exacta; si hace falta precisión, decime el nombre de
la función y listo, la busco por nombre en un Grep.

No hace falta mantener este archivo actualizado a mano en cada commit —
pedímelo de nuevo cuando lo notes desactualizado y lo regenero.

## Stack en una línea

Frontend vanilla JS/CSS/HTML (sin build, sin framework) + backend PHP/PDO
+ MySQL. Sin capa de build: cada archivo se sirve tal cual. Un solo
usuario, auth por sesión PHP.

## Árbol

```
/
├── index.html                  Todo el markup de la app (una sola página, vistas por CSS)
├── manifest.json                Manifest PWA
├── sw.js                        Service worker (cachea el shell, nunca api/)
├── .htaccess                    HTTPS forzado + bloqueo de config.local.php/*.sql
├── .gitignore
├── README.md                    Documentación de referencia (deploy, esquema, funcionalidad)
├── CHANGELOG.md                 Historial técnico detallado, por qué de cada cambio
├── PLAN-8-FEATURES.md           Documento de trabajo de una tanda puntual (no es doc viva del proyecto)
├── icons/                       Íconos de la PWA
├── css/
│   └── styles.css               Todos los estilos (535 líneas, sin preprocesador)
├── js/
│   ├── api.js                   Cliente fetch + cola offline (86 líneas)
│   ├── offline-queue.js         Wrapper de IndexedDB para la cola offline (79 líneas)
│   └── app.js                   Toda la UI y el estado (1891 líneas, un solo IIFE)
└── api/
    ├── config.php                Conexión PDO + arranque de sesión
    ├── config.local.php.example  Plantilla de credenciales de BD
    ├── config.local.php          Credenciales reales (gitignored)
    ├── auth.php                  Helpers: respond_ok/respond_error/read_json_body/require_login
    ├── week_helpers.php          Helpers de semana compartidos (is_monday, find_week_id, fetch_week_detail)
    ├── login.php                 POST — login
    ├── logout.php                POST — logout
    ├── session.php                GET — estado de sesión
    ├── weeks.php                  GET/POST/PUT/DELETE — semanas
    ├── exercises.php              POST/PUT/DELETE — ejercicios
    ├── migrate_day.php            POST — mover contenido de un día a otro
    ├── library.php                 GET/POST/DELETE — librería de nombres
    ├── settings.php                GET/PUT — reglas de negocio editables
    ├── import.php                  POST — importar semanas desde JSON
    └── db/
        ├── schema.sql                DDL completo
        ├── create_user.php           CLI — crear/actualizar el usuario único
        ├── import_weeks_json.php     CLI — importador histórico (uso puntual, ya usado)
        ├── backup_export.php         CLI — backup semanal a JSON (pensado para cron)
        └── backups/                  Backups generados — .htaccess propio, gitignored
```

## Frontend

### `index.html`
Markup estático de toda la app: pantalla de login + `#app-shell` con
header, 6 vistas (`#view-hoy`, `#view-historial`, `#view-progreso`,
`#view-calendario`, `#view-perfil`, `#view-ajustes`), nav inferior y
banner offline. No tiene lógica — todo el comportamiento vive en
`js/app.js` vía `id`/`data-*` que el JS engancha.

### `css/styles.css`
Un solo archivo, sin nesting ni variables SCSS (solo custom properties
CSS en `:root`). Bloques marcados con comentarios `/* ---------- Nombre
---------- */` — para pedir un cambio de estilo, referenciá el bloque:

| Bloque | Línea | Para qué |
|---|---|---|
| Header | 27 | Racha actual, marca |
| Week rail | 43 | Riel de semanas ("Hoy") |
| Day tabs | 76 | Riel de días (Lun–Dom) |
| Day panel | 105 | Panel del día: filas de ejercicio, migrar día, progress ring |
| Nota de la semana | 252 | Textarea de nota semanal |
| Summary strip | 262 | Tira de 4 chips (series/ejercicios/racha/volumen) |
| Reglas (Ajustes) | 276 | Panel de reglas editables |
| Librería de ejercicios | 288 | Panel de librería (Ajustes) |
| Bottom nav | 318 | Nav inferior fija |
| Banner de edición offline | 334 | Banner "sin conexión" |
| Login / Logout | 345, 370 | Pantalla de login, botón de logout |
| Perfil: datos / hitos / changelog | 378, 389, 412 | Exportar/importar, Hitos y constancia, Changelog |
| Calendario / heatmap anual | 433, 475 | Grid mensual y heatmap de 365 días |
| Balance por grupo muscular | 491 | Barras en Historial |
| Historial | 501 | Tarjetas por semana |
| Progreso | 524 | Buscador + gráfica Chart.js |

### `js/api.js`
Cliente fetch mínimo: `Api.get/post/put/del(path, body, opts)`. Maneja
401 centralizado (`Api.onUnauthorized`) y encola automáticamente en
`OfflineQueue` los `PUT`/`DELETE` a `exercises.php` y `PUT` a
`weeks.php` cuando `fetch()` falla por red (offline real). Expone
`Api.replayMutation()` para reproducir una mutación encolada, agregando
`client_time` en los `PUT` a `exercises.php` (usado por el guard de
last-write-wins del backend).

### `js/offline-queue.js`
Wrapper de IndexedDB (`bitacora-offline` / store `pending_mutations`),
sin dependencias. `OfflineQueue.add/getAll/remove/count/flush`. `flush()`
recibe una función de replay inyectada (evita import circular con
`api.js`) y devuelve `{synced, dropped, stale, pending}`.

### `js/app.js`
Un solo IIFE con todo el estado y la UI. Sin módulos — todo vive en el
mismo scope, así que cualquier función se puede referenciar por nombre.
Agrupado por sección (con el mismo comentario `// ====` que separa cada
bloque en el archivo real):

**Configuración y reglas**
- `RULES` (línea ~26 según versión) — reglas editables desde Ajustes (mín. día cumplido, racha, Hitos), respaldadas por `api/settings.php`.
- `PROGRESSION_INCREMENT_KG` — constante fija (2.5kg), no editable, usada por la sugerencia de progresión.
- `APP_VERSIONS` / `CURRENT_VERSION` — changelog de cara al usuario (Perfil).
- `EXERCISE_LIBRARY` — caché de la librería de ejercicios.

**Librería de ejercicios** (Ajustes): `addToLibrary` (114), `removeFromLibrary` (128), `renderLibraryDatalist` (138), `renderLibraryView` (148).

**Reglas** (Ajustes): `renderRulesPanel` (167), `saveRules` (174).

**Helpers de fecha**: `toISO`/`fromISO` (206-207), `mondayOfWeek` (209), `nearestMonday` (217), `dayDate` (227), `fmtShortDate`/`fmtLongDate`/`fmtFullDate` (232-237), `weekLabel` (241), `diasLabel` (249), `escapeHtml` (251).

**Estado** (`state.weeks`/`state.order`/`state.activeWeek`/`state.activeDay`): `currentWeek`/`currentDay`/`findExercise` (271-273), `getPrevWeekKey` (274), `findExerciseInPrevWeek` (280), `applyWeekDetail` (292), `comparisonHtml` (301).

**Racha**: `buildChronoDays` (333), `computeStreakDetail` (367), `computeStreaks` (401).

**Hitos** (Perfil): `periodRangeLabel` (418), `findRuns` (422), `computeMilestones` (461).

**Render de "Hoy"**: `renderAll` (517), `renderWeekNote` (529), `renderWeekPills`/`selectWeek`/`deleteWeek` (538-587), `renderDayRack` (588), `exerciseRowHtml` (617 — incluye la comparación contra semana pasada y la progresión sugerida), `renderDayPanel` (668), `migrateDay` (764), `updateStreakBadge` (780), `renderMilestones` (798), `renderChangelog` (868), `updateSummaryStrip` (891), `computeDayVolume` (911).

**Acciones sobre ejercicios**: `toggleExercise` (925 — incluye la detección de PR), `deleteExercise` (950), `addExercise` (964), `copyPreviousWeek` (977), `toggleDetail`/`enterNameEdit` (991-997), `bestPriorKgForExercise` (1554).

**Navegación / Toast**: `switchToView` (1152), `showToast` (1166).

**Calendario**: `computeDayTier` (1221), `renderCalendar` (1239), `renderHeatmap` (1329, heatmap anual de 365 días).

**Historial**: `weekMonths` (1380), `computeGroupBalance`/`renderGroupBalance` (1391-1410, balance por grupo muscular), `renderHistorial` (1427).

**Progreso**: `cssVar` (1525), `shareElementAsImage` (1533, compartir día/semana como imagen), `collectExerciseHistory` (1570), `renderProgreso` (1586, gráfica Chart.js).

**Perfil — exportar/importar**: `buildExportPayload` (1685).

**Sesión y arranque**: `showLogin`/`showApp` (1774-1778), `loadAppData` (1785), `refreshOfflineBanner`/`syncOfflineQueue` (1818-1830, edición offline), registro del service worker, `bootstrap()` al final del archivo.

## Backend (`api/`)

Todos los endpoints siguen el mismo patrón: `require config.php` (PDO +
sesión) → `require auth.php` → `require_login()` → switch por
`$_SERVER['REQUEST_METHOD']` → `respond_ok($data)` / `respond_error($msg,
$status)`.

| Archivo | Métodos | Qué hace |
|---|---|---|
| `config.php` | — | Conexión PDO + arranque de sesión (30 días). Lee `config.local.php`. |
| `auth.php` | — | Helpers compartidos: `respond_ok`, `respond_error`, `read_json_body`, `require_login`. |
| `week_helpers.php` | — | `is_monday`, `find_week_id`, `fetch_week_detail` (arma el detalle completo de una semana: días, ejercicios, overrides, nota). Compartido por `weeks.php` y `migrate_day.php`. |
| `login.php` | POST | Login por usuario/contraseña, inicia sesión. |
| `logout.php` | POST | Destruye la sesión. |
| `session.php` | GET | `{authenticated: bool}`. |
| `weeks.php` | GET/POST/PUT/DELETE | Listar semanas, detalle de una, crear (o copiar semana anterior con `?action=copy-previous`), **PUT: actualizar `note`**, eliminar. |
| `exercises.php` | POST/PUT/DELETE | Crear/editar/borrar un ejercicio. El PUT tiene el guard de last-write-wins (`client_time` vs `updated_at`) para la edición offline. |
| `migrate_day.php` | POST | Mueve el set completo de un día a otro dentro de la semana, con corrimiento en cadena si el destino ya tiene contenido. |
| `library.php` | GET/POST/DELETE | Librería de nombres para autocompletar. |
| `settings.php` | GET/PUT | Reglas de negocio editables (`RULES` del frontend) — valida rango por regla, todo entero. |
| `import.php` | POST | Importa una lista de semanas desde JSON (todo o nada, reemplaza semanas existentes por `monday_date`). |
| `db/schema.sql` | — | DDL completo: `users`, `day_templates`, `weeks`, `exercises`, `exercise_library`, `week_day_overrides`, `app_settings`. |
| `db/create_user.php` | CLI | Crea/actualiza el usuario único. Nunca vía HTTP. |
| `db/backup_export.php` | CLI | Vuelca todas las semanas a JSON en `db/backups/`, rota los últimos 14. Pensado para cron. |
| `db/import_weeks_json.php` | CLI | Importador histórico usado una vez para poblar datos desde Google Sheets/Garmin — ya cumplió su propósito, queda como referencia. |

### Tablas (`schema.sql`)

- **`users`** — una fila, credenciales del único usuario.
- **`weeks`** — una fila por semana (`monday_date` único), + `note` (nota libre de la semana).
- **`day_templates`** — grupo muscular/notas por defecto de cada uno de los 7 días (estático, 7 filas).
- **`exercises`** — filas editables por semana+día. `kg`/`reps`/`series`/`note` son texto libre. `done`, `sort_order`, `created_at`, `updated_at` (este último para el guard de edición offline).
- **`exercise_library`** — nombres para autocompletar.
- **`week_day_overrides`** — group_name/notes/migrated_from específicos de una semana puntual (solo cuando un día recibió contenido migrado).
- **`app_settings`** — `setting_key`/`setting_value`, respaldo de `RULES`.

## Cómo usar esto para pedir cambios puntuales

En vez de "cambiá cómo se calcula la racha", ahora podés decir:

> En `js/app.js`, en `computeStreaks()` (línea ~401), cambiá X por Y.

O para el backend:

> En `api/exercises.php`, el branch `PUT`, agregá validación de Z.

Si el cambio es de estilo:

> En `css/styles.css`, bloque "Day panel" (línea ~105), la clase `.ex-row`...

Si no sabés el nombre exacto de la función pero sí la funcionalidad,
buscala en las tablas de arriba por lo que hace — igual me ahorra la
exploración inicial.
