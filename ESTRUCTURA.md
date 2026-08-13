# Estructura del proyecto

Mapa de referencia rápida: qué hace cada archivo y dónde vive cada
funcionalidad, para poder pedir cambios puntuales sin que tenga que
explorar el repo primero (ver tips de prompting al final).

**Los números de línea son aproximados** (versión actual: `1.38.0`) —
cambian con cada edición. Sirven para ubicarse rápido, no como
referencia exacta; si hace falta precisión, decime el nombre de la
función y listo, la busco por nombre en un Grep.

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
├── .githooks/
│   └── pre-commit                Corre scripts/bump-sw-cache.php en cada commit
├── README.md                    Documentación de referencia (deploy, esquema, funcionalidad)
├── CHANGELOG.md                 Historial técnico detallado, por qué de cada cambio
├── icons/                       Íconos de la PWA
├── scripts/
│   └── bump-sw-cache.php        Recalcula CACHE_NAME de sw.js según hash del app shell
├── css/
│   └── styles.css               Todos los estilos (696 líneas, sin preprocesador)
├── js/
│   ├── api.js                   Cliente fetch + cola offline (86 líneas)
│   ├── offline-queue.js         Wrapper de IndexedDB para la cola offline (79 líneas)
│   └── app.js                   Toda la UI y el estado (2831 líneas, un solo IIFE)
└── api/
    ├── config.php                Conexión PDO + arranque de sesión
    ├── config.local.php.example  Plantilla de credenciales de BD
    ├── config.local.php          Credenciales reales (gitignored)
    ├── auth.php                  Helpers: respond_ok/respond_error/read_json_body/require_login
    ├── week_helpers.php          Helpers de semana compartidos (is_monday, find_week_id, fetch_week_detail, fetch_all_weeks_detail)
    ├── login.php                  POST — login
    ├── logout.php                 POST — logout
    ├── session.php                GET — estado de sesión
    ├── weeks.php                  GET/POST/PUT/DELETE — semanas (incluye sesión de horario por día)
    ├── exercises.php              POST/PUT/DELETE — ejercicios (incluye ?action=reorder)
    ├── migrate_day.php            POST — mover contenido de un día a otro
    ├── library.php                 GET/POST/DELETE — librería de nombres
    ├── settings.php                GET/PUT — reglas de negocio editables
    ├── import.php                  POST — importar semanas desde JSON
    ├── backups.php                 GET — listar/descargar backups automáticos
    └── db/
        ├── schema.sql                DDL completo (8 tablas)
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
| Week rail | 46 | Riel de semanas ("Hoy") |
| Day tabs | 87 | Riel de días (Lun–Dom) |
| Day panel | 116 | Panel del día: filas de ejercicio, drag handle, migrar día, progress ring |
| Nota de la semana | 285 | Textarea de nota semanal |
| Export de semana completa | 295 | Contenedor fuera de pantalla para "Compartir semana completa" |
| Sesión del día | 321 | Card "Iniciar/Finalizar entrenamiento" + hora inicio/fin/duración |
| Conversor kg / lbs | 340 | Dos inputs enlazados |
| Eliminar semana | 357 | Botón al final de "Hoy", doble confirmación |
| Summary strip | 364 | Tira de 4 chips (series/ejercicios/racha/volumen) |
| Reglas (Ajustes) | 385 | Panel de reglas editables |
| Librería de ejercicios | 403 | Panel de librería (Ajustes) |
| Bottom nav | 433 | Nav inferior fija |
| Banner de edición offline | 449 | Banner "sin conexión" |
| Login / Logout | 460, 485 | Pantalla de login, botón de logout |
| Perfil: datos / backups / hitos / changelog | 493, 504, 517, 541 | Exportar/importar, backups automáticos, Hitos y constancia, Changelog |
| Calendario / heatmap anual | 562, 604 | Grid mensual y heatmap de 365 días (con etiquetas de mes y celdas clickeables) |
| Balance por grupo muscular | 631 | Barras en Historial |
| Historial | 641 | Tarjetas por semana |
| Progreso | 664 | Buscador + gráfica Chart.js (con zoom/pan) |

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
- `DAY_ORDER` (línea 5) — orden fijo de días (`lun`..`dom`).
- `RULES` (26) — reglas editables desde Ajustes (mín. día cumplido, racha, Hitos, semana en curso), respaldadas por `api/settings.php`.
- `APP_VERSIONS` / `CURRENT_VERSION` (47/193 aprox.) — changelog de cara al usuario (Perfil), `CURRENT_VERSION = APP_VERSIONS[0].version`.
- `EXERCISE_LIBRARY` (201) — caché de la librería de ejercicios.

**Librería de ejercicios** (Ajustes): `addToLibrary` (203), `removeFromLibrary` (217), `renderLibraryDatalist` (227), `renderLibraryView` (237).

**Reglas** (Ajustes): `renderRulesPanel` (256), `saveRules` (263).

**Helpers de fecha**: `toISO`/`fromISO` (295-296), `mondayOfWeek` (298), `nearestMonday` (306), `dayDate` (316), `fmtShortDate`/`fmtShortDateRange`/`fmtLongDate`/`fmtFullDate` (321-337), `weekLabel` (338), `diasLabel` (346), `escapeHtml` (348).

**Estado** (`state.weeks`/`state.order`/`state.activeWeek`/`state.activeDay`): `currentWeek`/`currentDay`/`findExercise` (370-372), `getPrevWeekKey` (373), `findExerciseInPrevWeek` (379), `applyWeekDetail` (391 — acá se traduce `start_time`/`end_time`/`duration_min` de la API a `startTime`/`endTime`/`durationMin` del estado), `comparisonHtml` (410).

**Racha**: `buildChronoDays` (442), `fullWeekRange` (474), `computeStreakDetail` (500), `computeStreaks` (534).

**Hitos** (Perfil): `periodMonthYearLabel`/`periodDayLabel` (554-567), `findRuns` (575), `computeMilestones` (614), `computeTimeStats` (691 — estadísticas de tiempo: total entrenado, promedio, sesión más larga/corta, hora más frecuente), `fmtHourLabel` (720).

**Render de "Hoy"**: `renderAll` (729), `renderWeekNote` (741), `renderWeekPills`/`selectWeek` (750-777), `goToDate` (791 — navega a una fecha puntual desde Calendario/Historial/heatmap, centrando el riel de semanas), `deleteWeek` (807 — acepta `{doubleConfirm}`), `renderDayRack` (823), `exerciseRowHtml` (852 — incluye la comparación contra semana pasada, la progresión sugerida y el drag handle), `renderDayPanel` (912), `fmtDurationLabel`/`computeDurationMin`/`nowHHMM` (1014-1029), `renderDaySession`/`saveDaySession`/`handleDaySessionTimeChange` (1034-1076 — card "Iniciar/Finalizar entrenamiento"), `migrateDay` (1091), `renderStreakBadges`/`updateStreakBadge` (1110-1122), `renderMilestones` (1141), `renderChangelog` (1229), `updateSummaryStrip` (1252), `computeDayVolume`/`computeWeekVolume`/`computeWeekAdherence` (1273-1294), `renderWeeklyRecap` (1300).

**Acciones sobre ejercicios**: `toggleExercise` (1354 — incluye la detección de PR), `finalizePendingDelete`/`undoPendingDelete`/`deleteExercise` (1383-1402), `addExercise` (1427), `copyPreviousWeek` (1440), `toggleDetail`/`enterNameEdit` (1454-1460).

**Reordenar ejercicios arrastrando**: `pointerdown`/`pointermove` sobre `.ex-drag-handle` (~1590-1628, técnica de placeholder), `finishExerciseDrag` (1630 — persiste el nuevo orden vía `POST exercises.php?action=reorder`).

**Navegación / Toast**: `switchToView` (1720), `goToProgress` (1731), `showToast`/`hideToast` (1756-1774).

**Nueva semana**: `maxNewWeekKey` (1789 — tope de 1 semana en el futuro), handler de `#new-week-date` (~1800).

**Calendario**: `computeDayTier` (1842), `renderCalendar` (1860), `availableHeatmapYears` (1944), `renderHeatmap` (1952 — heatmap anual de 365 días, con etiquetas de mes verticales y celdas clickeables vía `goToDate`).

**Historial**: `weekMonths` (2038), `computeGroupBalance`/`renderGroupBalance` (2049-2068, balance por grupo muscular), `renderHistorial` (2085).

**Progreso**: `cssVar` (2193), `shareElementAsImage` (2201 — compartir día/semana/semana-completa como imagen), `weekShareRowHtml`/`buildWeekShareContainer`/`shareWeekAsImage` (2223-2264 — export de semana completa), `bestPriorKgForExercise` (2282), `collectExerciseHistory` (2298), `renderProgreso` (2338 — gráfica Chart.js con zoom/pan vía chartjs-plugin-zoom).

**Perfil — exportar/importar**: `buildExportPayload` (2579 — emite `days.<clave>` como `{exercises, start_time?, end_time?, duration_min?}`).

**Backups automáticos**: `loadBackupsList` (2671).

**Sesión y arranque**: `showLogin`/`showApp` (2711-2715), `loadAppData` (2722), `refreshOfflineBanner`/`syncOfflineQueue` (2758-2770, edición offline), registro del service worker (2810), `bootstrap()` (2817) al final del archivo.

## Backend (`api/`)

Todos los endpoints siguen el mismo patrón: `require config.php` (PDO +
sesión) → `require auth.php` → `require_login()` → switch por
`$_SERVER['REQUEST_METHOD']` → `respond_ok($data)` / `respond_error($msg,
$status)`.

| Archivo | Métodos | Qué hace |
|---|---|---|
| `config.php` | — | Conexión PDO (`ATTR_EMULATE_PREPARES => false`, ojo con nombres de placeholder repetidos en una misma query) + arranque de sesión (30 días). Lee `config.local.php`. |
| `auth.php` | — | Helpers compartidos: `respond_ok`, `respond_error`, `read_json_body`, `require_login`. |
| `week_helpers.php` | — | `is_monday`, `find_week_id`, `fetch_week_detail` (detalle completo de una semana: días, ejercicios, overrides, sesión de horario, nota), `fetch_all_weeks_detail` (todas las semanas en 5 queries, usado por el bootstrap). Compartido por `weeks.php` y `migrate_day.php`. |
| `login.php` | POST | Login por usuario/contraseña, inicia sesión. Bloqueo tras 5 intentos fallidos (`users.failed_attempts`/`locked_until`). |
| `logout.php` | POST | Destruye la sesión. |
| `session.php` | GET | `{authenticated: bool}`. |
| `weeks.php` | GET/POST/PUT/DELETE | Listar semanas, detalle de una, crear (tope de 1 semana en el futuro; o copiar semana anterior con `?action=copy-previous`), **PUT: `note` y/o `day_key`+`start_time`/`end_time`/`duration_min`** (upsert/delete en `week_day_sessions`), eliminar. |
| `exercises.php` | POST/PUT/DELETE | Crear/editar/borrar un ejercicio. `POST ?action=reorder` — reordena `sort_order` de un día completo (valida que el set de IDs coincida antes de escribir). El PUT normal tiene el guard de last-write-wins (`client_time` vs `updated_at`) para la edición offline. |
| `migrate_day.php` | POST | Mueve el set completo de un día a otro dentro de la semana, con corrimiento en cadena si el destino ya tiene contenido. |
| `library.php` | GET/POST/DELETE | Librería de nombres para autocompletar. |
| `settings.php` | GET/PUT | Reglas de negocio editables (`RULES` del frontend) — valida rango por regla, todo entero. |
| `import.php` | POST | Importa una lista de semanas desde JSON (todo o nada, reemplaza semanas existentes por `monday_date`). Acepta día como lista plana (legacy) u objeto `{exercises, start_time?, end_time?, duration_min?}` (formato actual). |
| `backups.php` | GET | Lista y descarga los backups generados por `db/backup_export.php`. |
| `db/schema.sql` | — | DDL completo: `users`, `day_templates`, `weeks`, `exercises`, `exercise_library`, `week_day_overrides`, `app_settings`, `week_day_sessions`. |
| `db/create_user.php` | CLI | Crea/actualiza el usuario único. Nunca vía HTTP. |
| `db/backup_export.php` | CLI | Vuelca todas las semanas a JSON en `db/backups/` (formato actual, con horario por día), rota los últimos 14. Pensado para cron. |
| `db/import_weeks_json.php` | CLI | Importador histórico usado una vez para poblar datos desde Google Sheets/Garmin — ya cumplió su propósito, queda como referencia. |

### Tablas (`schema.sql`)

- **`users`** — una fila, credenciales del único usuario, + `failed_attempts`/`locked_until` (fuerza bruta).
- **`weeks`** — una fila por semana (`monday_date` único), + `note` (nota libre de la semana).
- **`day_templates`** — grupo muscular/notas por defecto de cada uno de los 7 días (estático, 7 filas).
- **`exercises`** — filas editables por semana+día. `kg`/`reps`/`series`/`note` son texto libre. `done`, `sort_order`, `created_at`, `updated_at` (last-write-wins de la edición offline).
- **`exercise_library`** — nombres para autocompletar.
- **`week_day_overrides`** — group_name/notes/migrated_from específicos de una semana puntual (solo cuando un día recibió contenido migrado).
- **`app_settings`** — `setting_key`/`setting_value`, respaldo de `RULES`.
- **`week_day_sessions`** — `start_time`/`end_time`/`duration_min` de un día puntual (botón "Iniciar/Finalizar entrenamiento", o backfill desde Garmin). Sin fila = sin horario registrado.

## Cómo usar esto para pedir cambios puntuales

En vez de "cambiá cómo se calcula la racha", ahora podés decir:

> En `js/app.js`, en `computeStreaks()` (línea ~534), cambiá X por Y.

O para el backend:

> En `api/exercises.php`, el branch `PUT`, agregá validación de Z.

Si el cambio es de estilo:

> En `css/styles.css`, bloque "Day panel" (línea ~116), la clase `.ex-row`...

Si no sabés el nombre exacto de la función pero sí la funcionalidad,
buscala en las tablas de arriba por lo que hace — igual me ahorra la
exploración inicial.
