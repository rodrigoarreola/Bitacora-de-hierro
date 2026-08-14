# Estructura del proyecto

Mapa de referencia rápida: qué hace cada archivo y dónde vive cada
funcionalidad, para poder pedir cambios puntuales sin que tenga que
explorar el repo primero (ver tips de prompting al final).

**Los números de línea son aproximados** (versión actual: `1.41.0`) —
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
│   └── styles.css               Todos los estilos (708 líneas, sin preprocesador)
├── js/
│   ├── api.js                   Cliente fetch + cola offline (86 líneas)
│   ├── offline-queue.js         Wrapper de IndexedDB para la cola offline (79 líneas)
│   └── app.js                   Toda la UI y el estado (3049 líneas, un solo IIFE)
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
| Export de resumen semanal | 295 | Contenedor fuera de pantalla para "Copiar resumen de la semana" — solo `width`/`padding`, las cards clonadas heredan su estilo del header/riel/tira/recap real |
| Sesión del día | 305 | Card "Iniciar/Finalizar entrenamiento" + hora inicio/fin/duración |
| Conversor kg / lbs | 324 | Dos inputs enlazados |
| Eliminar semana | 341 | Botón al final de "Hoy", doble confirmación |
| Summary strip | 348 | Tira de 4 chips (series/ejercicios/racha/volumen) |
| Reglas (Ajustes) | 369 | Panel de reglas editables |
| Librería de ejercicios | 387 | Panel de librería (Ajustes) |
| Bottom nav | 417 | Nav inferior fija |
| Banner de edición offline | 433 | Banner "sin conexión" |
| Login / Logout | 444, 469 | Pantalla de login, botón de logout |
| Perfil: datos / backups / hitos / horarios / changelog | 477, 488, 501, 525, 547 | Exportar/importar, backups automáticos, Hitos y constancia, Horarios de entrenamiento (filtros + chips + chart + barras de hora), Changelog |
| Calendario / heatmap anual | 568, 610 | Grid mensual y heatmap de 365 días (celdas clickeables; etiquetas de mes con borde/radio en columna fija de 16px) |
| Balance por grupo muscular | 643 | Barras en Historial |
| Historial | 653 | Tarjetas por semana |
| Progreso | 676 | Buscador + gráfica Chart.js (con zoom/pan) |

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
- `APP_VERSIONS` / `CURRENT_VERSION` (47/211) — changelog de cara al usuario (Perfil), `CURRENT_VERSION = APP_VERSIONS[0].version`.
- `EXERCISE_LIBRARY` (217) — caché de la librería de ejercicios.

**Librería de ejercicios** (Ajustes): `addToLibrary`, `removeFromLibrary`, `renderLibraryDatalist`, `renderLibraryView` (219-253 aprox.).

**Reglas** (Ajustes): `renderRulesPanel` (272), `saveRules` (279 aprox.).

**Helpers de fecha**: `toISO`/`fromISO` (311-312), `mondayOfWeek` (314), `nearestMonday` (322), `dayDate` (332), `fmtShortDate`/`fmtShortDateRange`/`fmtLongDate`/`fmtFullDate` (337-350 aprox.), `weekLabel` (354), `diasLabel` (362), `escapeHtml` (364).

**Estado** (`state.weeks`/`state.order`/`state.activeWeek`/`state.activeDay`): `currentWeek`/`currentDay`/`findExercise` (386-388 aprox.), `getPrevWeekKey` (389), `findExerciseInPrevWeek` (395 aprox.), `applyWeekDetail` (407 — acá se traduce `start_time`/`end_time`/`duration_min` de la API a `startTime`/`endTime`/`durationMin` del estado), `comparisonHtml` (426).

**Racha**: `buildChronoDays` (458), `fullWeekRange` (490), `computeStreakDetail` (516), `computeStreaks` (550).

**Hitos** (Perfil): `periodMonthYearLabel`/`periodDayLabel` (570-583 aprox.), `findRuns` (591), `computeMilestones` (630 — ya no incluye estadísticas de tiempo, se separaron a su propio panel).

**Horarios de entrenamiento** (Perfil, panel nuevo debajo de Hitos, sin botón propio en el `bottom-nav`): `collectTimeEntries` (706 — junta todas las sesiones con `duration_min` registrado, sin filtrar), `computeTimeStats` (721 — recibe el set ya filtrado por año/mes y devuelve total/promedio/más larga/más corta/hora frecuente/`hourBuckets`), `fmtHourLabel` (744), estado `timeStatsYear`/`timeStatsMonth`/`timeChart` (757-759), `renderTimeStats` (761 — arma los rieles de filtro año/mes, los chips, la gráfica Chart.js de línea con puntos —mismo estilo que Progreso, puntos ocultos y línea fina salvo que año **y** mes estén ambos filtrados— y las barras de distribución por hora), listener delegado sobre `#time-stats-host` (878).

**Render de "Hoy"**: `renderAll` (895), `renderWeekNote` (907), `renderWeekPills`/`selectWeek` (916-943 aprox.), `goToDate` (957 — navega a una fecha puntual desde Calendario/Historial/heatmap, centrando el riel de semanas), `deleteWeek` (973 — acepta `{doubleConfirm}`), `renderDayRack` (989), `exerciseRowHtml` (1018 — incluye la comparación contra semana pasada, la progresión sugerida y el drag handle), `renderDayPanel` (1078), `fmtDurationLabel`/`computeDurationMin`/`nowHHMM` (1180-1195), `renderDaySession`/`saveDaySession`/`handleDaySessionTimeChange` (1200-1242 — card "Iniciar/Finalizar entrenamiento"), `migrateDay` (1257), `renderStreakBadges`/`updateStreakBadge` (1276-1288), `renderMilestones` (1308), `renderChangelog` (1384), `updateSummaryStrip` (1407), `computeDayVolume`/`computeWeekVolume`/`computeWeekAdherence` (1428-1449), `renderWeeklyRecap` (1455).

**Acciones sobre ejercicios**: `toggleExercise` (1509 — incluye la detección de PR), `finalizePendingDelete`/`undoPendingDelete`/`deleteExercise` (1538-1557), `addExercise` (1582), `copyPreviousWeek` (1595), `toggleDetail`/`enterNameEdit` (1609-1615).

**Reordenar ejercicios arrastrando**: `pointerdown`/`pointermove` sobre `.ex-drag-handle` (1746/1769, técnica de placeholder), `finishExerciseDrag` (1785 — persiste el nuevo orden vía `POST exercises.php?action=reorder`).

**Navegación / Toast**: `switchToView` (1875), `goToProgress` (1886), `showToast`/`hideToast` (1911-1929).

**Nueva semana**: handler de `#new-week-date` (1937), `maxNewWeekKey` (1944 — tope de 1 semana en el futuro).

**Calendario**: `computeDayTier` (1997), `renderCalendar` (2015), `availableHeatmapYears` (2099), `renderHeatmap` (2107 — heatmap anual de 365 días. Cada semana ocupa 3 "fine-rows" de grid — mitad arriba / mitad abajo / separador fijo de 3px — en vez de una fila + `gap` uniforme, para que el label de un mes pueda arrancar/terminar exacto en la línea del medio de la semana que comparte con el mes vecino, sin dejar hueco ni usar `position:absolute`/medición en JS. `seamRow[mes]` guarda en qué fila aparece por primera vez cada mes; celdas clickeables vía `goToDate`).

**Historial**: `weekMonths` (2217), `computeGroupBalance`/`renderGroupBalance` (2228-2247 aprox., balance por grupo muscular), `renderHistorial` (2264).

**Progreso**: `cssVar` (2372), `shareElementAsImage` (2380 — compartir día/tarjeta de Historial como imagen). Export del resumen semanal (botón de calendario junto a "Compartir día"): `cloneForShare`/`cloneRailForShare` (2402/2415 — clonan un nodo real quitando `id`s para evitar duplicados; la versión "rail" además fija ancho/`overflow:hidden` y replica el `scrollLeft` del elemento real para recortar igual que en pantalla), `buildDashboardShareContainer` (2428 — arma el header+riel de semanas+riel de días+resumen+recap; saca el `<input type="date">` de "+ Nueva semana" del clon porque pierde su estilo `opacity:0` al perder el `id`), `copyElementAsImage` (2456 — genera el PNG con `html2canvas(..., {backgroundColor:null})` y lo copia al portapapeles vía `ClipboardItem`, con descarga como fallback), `shareDashboardAsImage` (2480). Después: `bestPriorKgForExercise` (2500), `collectExerciseHistory` (2516), `renderProgreso` (2556 — gráfica Chart.js con zoom/pan vía chartjs-plugin-zoom).

**Perfil — exportar/importar**: `buildExportPayload` (2797 — emite `days.<clave>` como `{exercises, start_time?, end_time?, duration_min?}`).

**Backups automáticos**: `loadBackupsList` (2889).

**Sesión y arranque**: `showLogin`/`showApp` (2929-2933), `loadAppData` (2940), `refreshOfflineBanner`/`syncOfflineQueue` (2976-2988, edición offline), registro del service worker (3028), `bootstrap()` (3035) al final del archivo.

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

En vez de "cambiá cómo se calcula la racha", ahora podés decir:

> En `js/app.js`, en `computeStreaks()` (línea ~544), cambiá X por Y.

O para el backend:

> En `api/exercises.php`, el branch `PUT`, agregá validación de Z.

Si el cambio es de estilo:

> En `css/styles.css`, bloque "Day panel" (línea ~116), la clase `.ex-row`...

Si no sabés el nombre exacto de la función pero sí la funcionalidad,
buscala en las tablas de arriba por lo que hace — igual me ahorra la
exploración inicial.
