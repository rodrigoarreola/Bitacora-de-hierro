# Estructura del proyecto

Mapa de referencia rápida: qué hace cada archivo y dónde vive cada
funcionalidad, para poder pedir cambios puntuales sin que tenga que
explorar el repo primero (ver tips de prompting al final).

**Los números de línea son aproximados** (medidos en la versión `1.45.0`,
anteriores al routing por hash, los tokens CSS y `js/changelog-data.js`) —
cambian con cada edición. Sirven para ubicarse rápido, no como
referencia exacta; si hace falta precisión, dime el nombre de la
función y listo, la busco por nombre en un Grep.

No hace falta mantener este archivo actualizado a mano en cada commit —
pídemelo de nuevo cuando lo notes desactualizado y lo regenero.

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
│   ├── tokens.css               Design tokens (colores, radios, tamaños de texto, espaciado)
│   ├── components.css           .card, .btn y componentes compartidos entre pantallas
│   ├── base.css                 Reset, header, toast, barra inferior, banner offline
│   └── views/                   hoy, ajustes, login, perfil, calendario, historial, progreso
├── js/
│   ├── api.js                   Cliente fetch + cola offline (86 líneas)
│   ├── offline-queue.js         Wrapper de IndexedDB para la cola offline (79 líneas)
│   └── app.js                   Toda la UI y el estado (3174 líneas, un solo IIFE)
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
`#view-calendario`, `#view-perfil`, `#view-ajustes`), nav inferior (5
destinos; Ajustes es el ícono de engranaje del header) y
banner offline. No tiene lógica — todo el comportamiento vive en
`js/app.js` vía `id`/`data-*` que el JS engancha.

### `css/`
Sin preprocesador ni nesting; solo custom properties. Se cargan en este orden
(el orden es la cascada — ver `index.html`): `tokens.css`, `components.css`,
`base.css` y `views/*.css`. Un selector vive en un solo archivo. Para pedir un
cambio de estilo, indica el archivo y la clase:

| Archivo | Contiene |
|---|---|
| `tokens.css` | Colores (y con transparencia), radios, tamaños de texto, espaciado |
| `components.css` | `.card` y `.btn` con sus variantes; riel de píldoras (`.week-rail`/`.week-pill`); chips de resumen (`.sum-chip`); encabezado de panel (`.lib-panel`/`.lib-head`/`.lib-title`/`.lib-sub`); campo de búsqueda (`.prog-search`) |
| `base.css` | Reset, `body`, header (racha, engranaje de Ajustes), toast, barra inferior, banner offline, `.hidden` |
| `views/hoy.css` | Riel de días, panel del día y filas de ejercicio (drag, migrar, progress ring), nota de la semana, sesión del día, conversor, comparación semanal, imagen de "Compartir" (`.dashboard-share`) y el panel de info de ejercicio |
| `views/ajustes.css` | Reglas, fuente de nombres, librería de ejercicios |
| `views/login.css` | Login y pantalla de arranque |
| `views/perfil.css` | Datos, backups, Hitos, Horarios de entrenamiento, changelog (`<details>` colapsado) |
| `views/calendario.css` | Calendario mensual y heatmap anual |
| `views/historial.css` | Tarjetas por semana y balance por grupo muscular |
| `views/progreso.css` | Gráfica Chart.js, comparación, mini-dashboard de sparklines |

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
- `APP_VERSIONS` / `CURRENT_VERSION` (47/231) — changelog de cara al usuario (Perfil), `CURRENT_VERSION = APP_VERSIONS[0].version`.
- `EXERCISE_LIBRARY` (237) — caché de la librería de ejercicios.

**Librería de ejercicios** (Ajustes): `addToLibrary`, `removeFromLibrary`, `renderLibraryDatalist`, `renderLibraryView` (239-273 aprox.).

**Reglas** (Ajustes): `renderRulesPanel` (292), `saveRules` (299 aprox.).

**Helpers de fecha**: `toISO`/`fromISO` (331-332), `mondayOfWeek` (334), `nearestMonday` (342), `dayDate` (352), `fmtShortDate`/`fmtShortDateRange`/`fmtLongDate`/`fmtFullDate` (357-370 aprox.), `weekLabel` (374), `diasLabel` (382), `escapeHtml` (384).

**Estado** (`state.weeks`/`state.order`/`state.activeWeek`/`state.activeDay`): `currentWeek`/`currentDay`/`findExercise` (406-408 aprox.), `getPrevWeekKey` (409), `findExerciseInPrevWeek` (415 aprox.), `applyWeekDetail` (427 — acá se traduce `start_time`/`end_time`/`duration_min` de la API a `startTime`/`endTime`/`durationMin` del estado), `comparisonHtml` (446).

**Racha**: `buildChronoDays` (478), `fullWeekRange` (510), `computeStreakDetail` (536), `computeStreaks` (570).

**Hitos** (Perfil): `periodMonthYearLabel`/`periodDayLabel` (590-603 aprox.), `findRuns` (611), `computeMilestones` (650 — ya no incluye estadísticas de tiempo, se separaron a su propio panel).

**Horarios de entrenamiento** (Perfil, panel nuevo debajo de Hitos, sin botón propio en el `bottom-nav`): `collectTimeEntries` (726 — junta todas las sesiones con `duration_min` registrado, sin filtrar), `computeTimeStats` (741 — recibe el set ya filtrado por año/mes y devuelve total/promedio/más larga/más corta/hora frecuente/`hourBuckets`), `fmtHourLabel` (764), estado `timeStatsYear`/`timeStatsMonth`/`timeChart` (777-779), `renderTimeStats` (781 — arma los rieles de filtro año/mes, los chips, la gráfica Chart.js de línea con puntos —mismo estilo que Progreso, puntos ocultos y línea fina salvo que año **y** mes estén ambos filtrados— y las barras de distribución por hora), listener delegado sobre `#time-stats-host` (898).

**Render de "Hoy"**: `renderAll` (915), `renderWeekNote` (927), `renderWeekPills`/`selectWeek` (936-963 aprox.), `goToDate` (977 — navega a una fecha puntual desde Calendario/Historial/heatmap, centrando el riel de semanas), `deleteWeek` (993 — acepta `{doubleConfirm}`), `renderDayRack` (1009), `exerciseRowHtml` (1038 — incluye la comparación contra semana pasada, la progresión sugerida y el drag handle), `renderDayPanel` (1098), `fmtDurationLabel`/`computeDurationMin`/`nowHHMM` (1200-1215), `placeDaySessionPanel` (1225 — mueve la card "Iniciar/Finalizar entrenamiento" entre el riel de días y la tira de resumen si el día cargado es literalmente hoy —fecha real, no el día de la semana activo—, o la deja antes de `#week-note-panel` para cualquier otro día; se recalcula en cada `renderDaySession()`), `renderDaySession`/`saveDaySession`/`handleDaySessionTimeChange` (1235-1281), `migrateDay` (1296), `renderStreakBadges`/`updateStreakBadge` (1315-1327), `renderMilestones` (1347), `renderChangelog` (1423 — arma cada `<details>` en dos filas: versión+fecha+chevron arriba, título suelto debajo, para que la fecha no quede descolgada con títulos de 2 líneas), `updateSummaryStrip` (1446), `computeDayVolume`/`computeWeekVolume`/`computeWeekAdherence` (1467-1488), `renderWeeklyRecap` (1494).

**Acciones sobre ejercicios**: `toggleExercise` (1548 — incluye la detección de PR), `finalizePendingDelete`/`undoPendingDelete`/`deleteExercise` (1577-1596), `addExercise` (1621), `copyPreviousWeek` (1634), `toggleDetail`/`enterNameEdit` (1648-1654).

**Reordenar ejercicios arrastrando**: `pointerdown`/`pointermove` sobre `.ex-drag-handle` (1785/1808, técnica de placeholder), `finishExerciseDrag` (1824 — persiste el nuevo orden vía `POST exercises.php?action=reorder`).

**Navegación / Toast**: routing por hash — `routeFromHash`, `showView` (solo muestra), `switchToView` (muestra + `pushState`), `applyInitialRoute` (se llama desde `showApp`), listener `hashchange`; `goToProgress`, `goToProgress` (1925), `showToast`/`hideToast` (1950-1968).

**Nueva semana**: handler de `#new-week-date` (1976), `maxNewWeekKey` (1983 — tope de 1 semana en el futuro).

**Calendario**: `computeDayTier` (2036), `renderCalendar` (2054), `availableHeatmapYears` (2138), `renderHeatmap` (2146 — heatmap anual de 365 días. Cada semana ocupa 3 "fine-rows" de grid — mitad arriba / mitad abajo / separador fijo de 3px — en vez de una fila + `gap` uniforme, para que el label de un mes pueda arrancar/terminar exacto en la línea del medio de la semana que comparte con el mes vecino, sin dejar hueco ni usar `position:absolute`/medición en JS. `seamRow[mes]` guarda en qué fila aparece por primera vez cada mes; celdas clickeables vía `goToDate`).

**Historial**: `weekMonths` (2256), `computeGroupBalance`/`renderGroupBalance` (2267-2286 aprox., balance por grupo muscular), `renderHistorial` (2303).

**Progreso**: `cssVar` (2411), `shareElementAsImage` (2419 — compartir día/tarjeta de Historial como imagen). Export del resumen semanal (botón de calendario junto a "Compartir día", "patrón Strava" — card redondeada al 50%, ver bloque CSS del mismo nombre): `cloneForShare` (2441 — clona un nodo real quitando `id`s), `pairedFlexItems` (2459 — empareja los ítems reales del flex de un riel con sus clones por posición, mirando `display:contents` solo en el nodo vivo — un clon todavía fuera del DOM no siempre lo resuelve bien), `SHARE_CONTENT_WIDTH` (2480 — ancho de contenido de `.dashboard-share`: 520px de card menos su padding horizontal, hay que mantenerlo sincronizado a mano si esos valores cambian en el CSS), `cloneRailForShare` (2491 — selecciona qué ítems sobreviven y ensancha el clon al ancho real de la card en vez del `clientWidth` angosto del celular de origen; `.day-rack` (`{stretch:true}`) sigue decidiendo el conjunto vía `getBoundingClientRect()` contra el propio riel —ninguno de los dos riels tiene `position:relative`, así que `offsetLeft` quedaba medido contra el offsetParent real y no contra el riel— y pisa el `flex` fijo de `.day-tab` para repartir el 100% entre los que sobreviven; `.week-rail` sí cambia la selección, sumando anchos reales de pill + gap contra `SHARE_CONTENT_WIDTH` en vez de contra el ancho angosto del celular), `buildDashboardShareContainer` (2557 — arma el header+riel de semanas+riel de días+resumen+recap; saca el `<input type="date">` de "+ Nueva semana" del clon porque pierde su estilo `opacity:0` al perder el `id`), `copyElementAsImage` (2585 — genera el PNG con `html2canvas(..., {backgroundColor:null})` — solo para que las esquinas redondeadas de la card queden transparentes — y lo copia al portapapeles vía `ClipboardItem`, con descarga como fallback), `shareDashboardAsImage` (2609). Después: `bestPriorKgForExercise` (2625), `collectExerciseHistory` (2641), `renderProgreso` (2681 — gráfica Chart.js con zoom/pan vía chartjs-plugin-zoom).

**Perfil — exportar/importar**: `buildExportPayload` (2922 — emite `days.<clave>` como `{exercises, start_time?, end_time?, duration_min?}`).

**Backups automáticos**: `loadBackupsList` (3014).

**Sesión y arranque**: `showLogin`/`showApp` (3054-3058), `loadAppData` (3065), `refreshOfflineBanner`/`syncOfflineQueue` (3101-3113, edición offline), registro del service worker (3153), `bootstrap()` (3160) al final del archivo.

## Backend (`api/`)

Único cambio de esta versión: `config.php` gana un bloque opcional de
bypass de login para desarrollo local (`DEV_AUTOLOGIN`, ver tabla abajo) —
el resto de los endpoints no cambió.

Todos los endpoints siguen el mismo patrón: `require config.php` (PDO +
sesión) → `require auth.php` → `require_login()` → switch por
`$_SERVER['REQUEST_METHOD']` → `respond_ok($data)` / `respond_error($msg,
$status)`.

| Archivo | Métodos | Qué hace |
|---|---|---|
| `config.php` | — | Conexión PDO (`ATTR_EMULATE_PREPARES => false`, ojo con nombres de placeholder repetidos en una misma query) + arranque de sesión (30 días). Lee `config.local.php`. Al final, bypass opcional de login para desarrollo local: si `PHP_SAPI === 'cli-server'` (el embebido de `php -S`, nunca lo que corre producción) + la constante `DEV_AUTOLOGIN` definida `true` en `config.local.php` + `REMOTE_ADDR` en `127.0.0.1`/`::1`, auto-loguea al único usuario que existe. |
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
- **`week_day_sessions`** — `start_time`/`end_time`/`duration_min` de un día puntual (botón "Iniciar/Finalizar entrenamiento", o backfill desde Garmin). Sin fila = sin horario registrado. Fuente de datos de "Horarios de entrenamiento" en Perfil.

## Cómo usar esto para pedir cambios puntuales

En vez de "cambia cómo se calcula la racha", ahora puedes decir:

> En `js/app.js`, en `computeStreaks()` (línea ~544), cambia X por Y.

O para el backend:

> En `api/exercises.php`, el branch `PUT`, agrega validación de Z.

Si el cambio es de estilo:

> En `css/views/hoy.css`, la clase `.ex-row`...

Si no sabes el nombre exacto de la función pero sí la funcionalidad,
buscala en las tablas de arriba por lo que hace — igual me ahorra la
exploración inicial.
