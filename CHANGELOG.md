# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/), con versionado semántico. Cada versión lleva un bloque `### En la app: <título>` con el resumen en lenguaje llano que se ve en la app (Perfil → Changelog): `scripts/build-changelog.php` genera `js/changelog-data.js` a partir de esos bloques en cada commit (ver [ADR 0006](docs/adr/0006-changelog-fuente-unica.md)). Hay tags de git `vX.Y.Z` desde la 1.46.1; las versiones anteriores no tienen tag.

## [1.65.0] - 2026-09-23 — Nombres estándar de ejercicios

### En la app: tus ejercicios tienen nombre estándar, y su historial ya no está partido

- Los 46 nombres de tu historial pasan a 40 nombres estándar del catálogo de ejercicios, revisados uno por uno con fotos de tus máquinas.
- Variantes del mismo ejercicio se juntan en uno solo (los tres curl femoral sentado, los dos acostado, Chin ups + Chin up con máquina…), así Progreso, "semana pasada" y tus récords ven todo el historial junto.
- Se corrigieron varios que apuntaban a otro ejercicio, así que el ícono del ojo y la Guía del día ahora muestran el correcto (Pájaros en máquina era en realidad elevación lateral, entre otros).
- Cada registro recuerda cómo lo llamabas antes; se conserva en tus backups.

### Added

- **`api/db/migrations/2026-09-23-renombrar-ejercicios.sql`**: `exercises.original_name` + 43 renombres (5 fusiones) + limpieza de la librería. Idempotente, en una transacción.
- **ADR 0019** e instrucciones en el README.

### Changed

- **`data/exercise-name-mapping.json`** reconstruido con los IDs aprobados (`confidence: "confirmada"`), con llaves para el nombre nuevo y el viejo.
- **`js/split-catalog.js`**: los `sugerido` usan los nombres nuevos; el hueco "Deltoides posterior" sugiere la apertura invertida y "Glúteo" (Pierna hipertrofia) la extensión de cadera en máquina.
- `original_name` en `fetch_week_detail()`/`fetch_all_weeks_detail()`, `fetch_exercise()`, el export de Perfil, `api/db/backup_export.php` e `api/import.php` (opcional; con `original_name_ready()` el código funciona aunque la columna aún no exista).

### Verificado (local, después de un backup)

- 1,213 filas antes y después; 46 → 40 nombres; 1,122 filas con `original_name`. Correrla dos veces da lo mismo.
- La semana del 21 de sep encuentra sus ejercicios en la del 14 con los nombres nuevos; Guía del día 5/5; sin errores en consola.

## [1.64.0] - 2026-09-22 — Splits y Guía del día

### En la app: elige tu split y cada día te dice qué ejercicios le tocan

- Nuevo panel "Split" en Ajustes: Bro Split (el tuyo de siempre), Full Body, Torso/Pierna, PHUL, Torso/Pierna + PPL, Push/Pull/Legs ×2 o Personalizado (nombre y guía por día). Aplica a las semanas nuevas; con una casilla, también a la semana en curso. Las semanas pasadas conservan sus nombres.
- Antes de guardar, la vista previa del panel Split muestra qué ejercicios trae cada día (músculo, series × reps y el ejercicio que se sugeriría), y se actualiza al cambiar de preset o de guía.
- Cada día con guía muestra su "Guía": los músculos que le tocan, series × reps de referencia (solo guía, no se escriben en tus campos) y ✓ en los que ya cubriste.
- Toca un ejercicio sugerido para agregarlo (solo el nombre); en un día vacío, "Llenar con la guía" agrega todos. Las sugerencias salen de lo que más haces para ese músculo.

### Added

- **`js/split-catalog.js`**: `DAY_PLANS` (12 plantillas de día como huecos músculo + tipo + series × reps + sugerido) y `SPLITS` (6 presets).
- **`api/split.php`**: `GET`/`PUT` del split vigente (`day_templates`), con `apply_to_week` opcional.
- **`api/db/schema.sql`**: `day_templates.template_key`, tabla `week_day_groups` (grupo/notas/plantilla congelados por semana, con backfill) y `week_day_overrides.template_key` (un día migrado se lleva su guía).
- **`data/exercise-name-mapping.json`**: campo `target` (músculo del dataset) en cada entrada, para saber qué hueco cubre un ejercicio sin bajar el dataset completo.
- **ADR 0018** y bloque idempotente nuevo en el README (`Pendiente de correr en producción`).

### Changed

- **`api/week_helpers.php`**: `fetch_week_detail()`/`fetch_all_weeks_detail()` leen override > grupo congelado > split vigente y devuelven `template_key`; nuevas `split_schema_ready()` (el código funciona igual si la migración aún no se corrió) y `materialize_week_groups()`.
- **`api/weeks.php`** congela los grupos al crear una semana; **`api/migrate_day.php`** copia grupo y plantilla efectivos del día de origen.
- Export (Perfil y `api/db/backup_export.php`) incluye `groups` por semana y `template_key` en overrides; **`api/import.php`** los acepta (opcionales — backups viejos toman el split vigente).
- El nombre del grupo en el panel del día y el riel se escapa, ahora que es editable.

### Verificado (local)

- Cambiar a Torso/Pierna deja la semana del 14 sep con sus grupos Bro; una semana nueva sale con Torso/Pierna.
- "Llenar con la guía" en un día de Pierna vacío agrega 6 ejercicios con kg/reps/series vacíos y la guía queda 6/6.
- Import con `groups`, migrar lunes → sábado (se lleva `pecho_triceps`) y sin errores en consola.

## [1.63.0] - 2026-09-22 — Cookie "recordarme": la sesión ya no se cierra sola

### En la app: ya no debería pedirte login a las pocas horas

- La sesión se cerraba sola después de un rato porque el hosting borra el archivo de sesión de PHP por su cuenta (con su propio reloj, más corto que los 30 días que la app pedía), aunque la cookie del navegador siguiera siendo válida. Ahora hay una segunda cookie que la reestablece sola, sin pedirte volver a loguearte.

### Changed

- **`api/config.php`**: nuevas `set_remember_cookie()`/`clear_remember_cookie()`; respaldo justo después de `session_start()` — si `$_SESSION['user_id']` viene vacío pero llega la cookie `remember_token`, la reestablece sola y extiende su expiración (sin rotar el valor del token, para no chocar con las requests en paralelo de `loadAppData()`).
- **`api/login.php`**: emite el token "recordarme" (hash guardado, nunca el valor en sí) en cada login exitoso.
- **`api/logout.php`**: invalida el token en la base de datos (no solo borra la cookie del navegador).
- **`api/db/schema.sql`**: nuevas `users.remember_token_hash` / `remember_token_expires`.
- Las tres piezas de SQL nuevas (`login.php`, `logout.php`, el respaldo de `config.php`) van en `try/catch(PDOException)`, sin re-lanzar — si el código llega antes que el `ALTER TABLE` en producción, el login/logout por sesión sigue funcionando igual, solo sin la parte de "recordarme" hasta correr la migración.

### Added

- **ADR 0017** con el diagnóstico completo y la decisión.
- Bloque idempotente en el README (`Pendiente de correr en producción`) para aplicar las columnas nuevas a la base ya viva.

### Verificado (curl, sin `DEV_AUTOLOGIN`)

- Login emite ambas cookies y guarda hash + expiración en `users`.
- Una request sin `PHPSESSID` pero con `remember_token` válido reautentica sola y extiende la expiración sin cambiar el hash.
- 5 requests en paralelo sin `PHPSESSID` responden todas `authenticated:true` — sin condición de carrera.
- Token inexistente/expirado → `authenticated:false` y borra la cookie.
- Logout invalida el token en BD y limpia la cookie; ese token viejo ya no reautentica.
- Con las columnas `remember_token_*` quitadas a propósito (simulando un deploy sin la migración todavía corrida): login, verificación de sesión y logout responden 200 igual, sin fallar.

### Pendiente de correr en producción

- El `ALTER TABLE users` de `remember_token_hash`/`remember_token_expires` (bloque idempotente en el README) — sin correrlo, el login sigue funcionando igual (la sesión de PHP no depende de estas columnas), pero el respaldo "recordarme" no tiene dónde guardar el token hasta que se aplique.

## [1.62.0] - 2026-09-22 — Ajustes pierde la caja en el header

### En la app: el ícono de Ajustes se aligera

- El engranaje de Ajustes (arriba a la derecha) pierde el fondo y el borde que lo hacían ver como una caja del mismo peso que el logo — ahora es un ícono suelto, un poco más grande para no perder presencia. El logo/Perfil (izquierda) no cambia: sigue funcionando como el "avatar" de la app.

### Changed

- **`css/base.css`**: `.head-settings` sin `background`/`border` (antes heredados de `.btn`), ícono de 13 a 18px. Mismo tamaño de toque (30px, de `.btn--icon`) y mismo resaltado en naranja cuando Ajustes es la vista activa (ahora solo por color, sin borde).

### Added

- Nota de seguimiento en **ADR 0005** (la decisión original de "Ajustes como ícono del header").

### Verificado (Navegador integrado)

- Sin fondo ni borde visibles en el ícono de Ajustes; tap-target sigue en 30px.
- Estado activo (dentro de Ajustes) se resalta en naranja, sin caja.
- Sin errores de consola.

## [1.61.0] - 2026-09-22 — Resumen primero, una medalla grande, mejoras de teclado

### En la app: Resumen abre primero, una sola medalla y mejor teclado

- Resumen pasa a ser la primera pestaña, también visualmente (antes "Hoy" seguía apareciendo a la izquierda aunque Resumen abriera solo).
- La card de racha ahora muestra una sola medalla — la más alta que ya ganaste — bien grande, a la altura del número de racha. Debajo, "Mejor racha" ahora te dice también cuánto te falta para la siguiente medalla.
- En Hoy, el conversor kg/lbs abre el teclado numérico de una vez al tocarlo, sin necesitar un segundo toque sobre el campo.
- Al tocar un valor de kg/rep/ser para editarlo, el cursor se va directo al final — pensado para agregar o corregir el último dígito rápido.

### Changed

- **`index.html`**: orden de `.seg-tabs`/paneles de Semana invertido (Resumen primero); nuevo `#streak-next-badge` debajo de "Mejor racha".
- **`js/app.js`**: `renderStreakBadges()` muestra solo el tier más alto ganado (antes apilaba bronce+plata+oro); nueva `renderNextBadgeProgress()` y `STREAK_BADGE_TIERS` compartido entre ambas; `openConverterSheet()` hace `focus()`+`select()` sobre `#conv-kg`; nuevo listener `focusin` delegado en `dayPanelHost` que pone el cursor al final de kg/rep/ser vía `setSelectionRange()` diferido (`setTimeout(...,0)`, para ganarle al posicionamiento nativo del toque).
- **`css/views/hoy.css`**: `#streak-badges .streak-hero-badge-ico` a 48px (antes 26px, con selector más específico para no depender del orden de los `<link>` frente a `.milestone-ico` de progreso.css); nuevo `.streak-hero-next` (oculto vía `:empty` cuando no hay siguiente medalla).

### Added

- **ADR 0016** con la decisión completa. ADR 0015 recibe una nota de seguimiento sobre el orden visual de pestañas.

### Verificado (Navegador integrado)

- Resumen es la primera pestaña, visible y activa al abrir.
- Una sola medalla (plata a 40 días), 48px = mismo alto que "40 días" + "racha actual".
- "Faltan 60 días para la medalla de oro (100 días)." se ve correctamente debajo de "Mejor racha".
- El conversor enfoca y selecciona `#conv-kg` al abrir.
- Un toque real (no solo `.focus()` por JS) en el borde izquierdo de un valor de kg dejó el cursor al final.
- Sin ids duplicados ni errores de consola.

## [1.60.0] - 2026-09-22 — La vista Hoy pasa a llamarse Semana; Resumen abre por default

### En la app: ahora es "Semana", y abre en Resumen

- La vista de la barra inferior deja de llamarse "Hoy" y pasa a llamarse "Semana" — encaja mejor con lo que muestra (racha, comparación semanal, riel de semanas: información de la semana activa, no solo del día de hoy).
- La pestaña "Registro" pasa a llamarse "Hoy": es literalmente donde ves y anotas el entrenamiento del día.
- Ahora abre directo en Resumen (antes abría en Registro/Hoy).

### Changed

- **`index.html`**: texto del botón de la barra inferior (`Hoy` → `Semana`); pestaña `data-hoy-tab="registro"` (`Registro` → `Hoy`); la pestaña Resumen pasa a llevar `.seg-tab active`/`aria-selected="true"` y su panel arranca sin `hidden` (viceversa para Hoy).
- **`js/app.js`**: `let hoyTab` inicia en `'resumen'` en vez de `'registro'`. Comentarios que usaban "Registro"/"Hoy" como nombres visibles se actualizaron; los identificadores internos (`#/hoy`, `#view-hoy`, `hoyTab`, `data-hoy-tab="registro"`) no cambiaron — a propósito, ver ADR 0015.
- **`css/views/hoy.css`**: comentarios de cabecera y de sección actualizados al nuevo naming (sin cambios de reglas ni de selectores).
- Sin cambios de comportamiento más allá de cuál pestaña abre por default: los atajos que fuerzan la pestaña Hoy (`goToDate()`, tocar un día del riel en Resumen) siguen funcionando igual.

### Added

- **ADR 0015** con la decisión completa (incluye las 4 combinaciones de naming consideradas). ADR 0012 y ADR 0014 reciben una nota de seguimiento.

### Verificado (Navegador integrado)

- La app abre en Semana → Resumen; tocar la pestaña "Hoy" muestra el día activo con sus ejercicios.
- Tocar un día del riel en Resumen salta a Hoy con ese día cargado; tocar una semana se queda en Resumen.
- "SEMANA" en la barra inferior no desborda ni se corta.
- Sin ids duplicados ni errores de consola.

## [1.59.0] - 2026-09-22 — Registro solo con el día activo; semanas y días a Resumen

### En la app: Registro más simple, Resumen con todo lo de nivel semana

- Registro ahora solo tiene información del día activo: un selector compacto (‹ Martes · 15 sep ›) reemplaza al riel de 7 días, que se muda a Resumen junto con el riel de semanas — ahí es donde tiene sentido comparar días y semanas entre sí.
- El cronómetro de sesión (Iniciar/Finalizar entrenamiento) vuelve a estar arriba de la tabla de ejercicios, como en versiones anteriores.
- El conversor kg/lbs se muda a Registro (donde más se usa, a media sesión) pero colapsado: un ícono junto al selector de día lo despliega solo cuando hace falta.
- La cabecera de la card del día fusiona los chips de Series y Volumen con el nombre del grupo muscular; se quita el chip "Ejercicios" (redundante con el anillo de progreso).
- "Compartir resumen semanal" sale de la cabecera del día (no comparte nada de ese día en particular) y se muda a la card de racha, en Resumen.
- En cada fila de ejercicio, el ícono de info (ojo) y el de eliminar (papelera) dejan de estar siempre visibles: se movieron al detalle que despliega el chevron, junto a "Ver progreso". La fila pasa de 9 a 7 controles.
- "Eliminar esta semana" baja de peso visual: de botón rojo de ancho completo a enlace ghost (ya pedía doble confirmación, eso no cambió).

### Changed

- **`index.html`**: `#view-hoy` se reordena — `#week-rail` y `#day-rack` pasan de vivir fuera de las pestañas a ser contenido exclusivo de `#hoy-tab-resumen`; `#day-session-panel` sube arriba de `#day-panel-host` dentro de `#hoy-tab-registro`; nuevo `.day-switch-row` (flechas + fecha + ícono del conversor) al inicio de Registro; el conversor deja de ser una card fija en Resumen y pasa a un overlay (`#converter-overlay`, mismo patrón `.sheet-overlay`/`.sheet` que el resto de los diálogos); `#share-dashboard-btn` se muda al markup estático de `#streak-hero-card`; `#delete-week-btn` cambia de `btn btn--danger btn--block` a `btn btn--ghost`.
- **`js/app.js`**: nueva `stepActiveDay(delta)` (extraída de la lógica de swipe, ahora compartida con las flechas del selector) y `renderDaySwitcher()`; `renderDayRack()` cambia a pestaña Registro al tocar un día (el riel de semanas no cambia de pestaña); `renderDayPanel()` arma la cabecera fusionada con `updateDayStats()` (Series/Volumen, no destructivo para no perder foco al escribir); `updateSummaryStrip()` se retira, sus 6 call sites simples pasan a `renderWeeklyRecap()` directo; `exerciseRowHtml()` mueve el ojo y la papelera al bloque de detalle (`.ex-detail-actions`), con `data-id` en `.ex-detail` para que el borrado delegado siga encontrando el ejercicio; nuevas `openConverterSheet()`/`closeConverterSheet()` calcadas de `openExerciseInfo()`/`closeExerciseInfo()`.
- **`css/views/hoy.css`**: grid de `.col-heads`/`.ex-row` de 8 a 7 columnas; nuevas `.day-switch-row`, `.streak-hero-top-right`, `.ex-detail-actions`, `.ex-progress-btn--danger`; se retiran `.ex-name-row`, `.ex-info-btn`, `.ex-del`, `.ex-detail-head-left`, `.ex-detail-empty-row`, `.converter-panel` (todas reemplazadas o ya no usadas).

### Fixed

- **`.ex-detail-empty`** ("Sin datos de la semana pasada para este ejercicio") no tenía `grid-column:1/-1` tras perder su wrapper `.ex-detail-empty-row` — el texto se veía comprimido en la primera columna (22px), una palabra por línea.
- El `input` de kg/rep/ser no actualizaba Series/Volumen en vivo: un `if` sin llaves dejaba `updateDayStats()` condicionado a `field === 'series' && ex.done`, cuando debía correr en cada tecleo de cualquiera de los tres campos.
- **`.is-loading .streak .n`** (esqueleto de carga) apuntaba a una clase que ya no existe desde la 1.57.0 (`.streak-hero-n`) — la racha se veía como "0 días" real en vez de gris durante la carga.

### Added

- **ADR 0014** con la decisión completa de este reordenamiento.

### Fuera de alcance

- Notas por día (en vez de por semana): requiere columna nueva en `exercises` o una tabla nueva — queda pendiente para otra ronda.

### Verificado (Navegador integrado)

- Selector de día: flechas cambian de día y coinciden con el swipe existente (mismo `stepActiveDay()`); día vacío muestra el estado "Todavía no hay ejercicios" con "Copiar semana pasada".
- Riel de días en Resumen: tocar un día carga Registro con ese día y sus ejercicios.
- Riel de semanas en Resumen: tocar una semana se queda en Resumen y refresca riel de días, racha y comparación.
- Cabecera del día: "9 series · 4,980 kg" fusionado con el anillo, sin chip "Ejercicios" ni botón de compartir resumen.
- Conversor: el ícono abre el sheet, 20 kg → 44.09 lbs, tocar el fondo lo cierra.
- Escribir en kg/rep/ser actualiza Series/Volumen en vivo sin perder el foco del input.
- Fila de ejercicio: 7 controles visibles; el chevron despliega Ver progreso / Ver info / Eliminar, con Eliminar en rojo.
- "Eliminar esta semana" se ve como ghost link y sigue pidiendo confirmación.
- "Compartir resumen semanal" desde la card de racha genera la imagen sin duplicar el ícono de compartir.
- Sin ids duplicados ni errores de consola nuevos.

## [1.58.0] - 2026-09-22 — Perfil se muda al header, barra de 4 destinos

### En la app: Perfil ahora se abre tocando el logo

- El logo "Bitácora" de arriba a la izquierda ahora te lleva a Perfil, igual que el ícono de Ajustes (arriba a la derecha) te lleva ahí. Perfil sale de la barra inferior, que queda con 4 botones: Hoy, Historial, Progreso, Calendario.
- El subtítulo "Registro de entrenamiento" vuelve a verse en una sola línea, y el texto de la barra inferior se ve un poco más grande — con menos elementos en el header y la barra, sobraba espacio.

### Changed

- **`.brand`** (logo + título + subtítulo, header) pasa de `<div>` a `<a href="#/perfil" data-view="perfil">`. Se resalta el ícono con un borde de acento cuando estás en Perfil (`.brand.active .brand-mark`). Sin cambios de JS: `showView()`/`switchToView()` ya operan de forma genérica sobre `[data-view]` (ADR 0001), así que agregar el atributo al enlace fue suficiente.
- **Barra inferior de 5 → 4 destinos**: se quita el botón "Perfil".
- **Texto de la barra inferior vuelve a la escala de tokens** (`--fs-xs`, 10px en vez de 9.5px "fuera de escala"): con 4 botones en vez de 5, "Calendario" ya no desborda.
- README y `docs/UI-ESTRUCTURA.md`/`docs/SCREENS.md` actualizados; ADR 0005 recibe una nota de seguimiento (la limitación de espacio que describía ya no aplica).

### Added

- **ADR 0013** con la decisión completa.

### Verificado (Navegador integrado)

- 4 botones en la barra; el logo navega a `#/perfil`, se resalta (`aria-current="page"`) y ningún botón de la barra queda activo al mismo tiempo.
- Header: 42px de alto, subtítulo en una sola línea (antes 2, desde la 1.50.0).
- "Calendario" a 10px: 67px de texto dentro de un botón de 94px, sin desborde (`overflowX` en `false`).
- Ajustes sigue funcionando igual (hash, vista, resaltado).
- Compartir resumen semanal: la imagen sigue sin incluir el engranaje, con el logo ahora como `<a>` sin romper el clon (`cloneForShare()`), y con la card de racha (ADR 0012) presente.
- Sin ids duplicados ni errores de consola.

## [1.57.0] - 2026-09-22 — Hoy se parte en pestañas, y la racha se muda a una card

### En la app: Hoy en dos pestañas, y tu racha con su propia card

- Hoy ahora tiene dos pestañas: Registro (riel de días, tus ejercicios y el temporizador de sesión — lo de todos los días) y Resumen (comparación semanal, nota de la semana, conversor kg/lbs y eliminar la semana — lo ocasional).
- Tu racha ya no vive arriba del todo en cada pantalla: ahora tiene su propia tarjeta al abrir Resumen, con el número más grande, tus medallas y tu mejor racha.
- La tira de chips de Registro pasa de 4 a 3 (ya no incluye "Mejor racha", que se mudó a la tarjeta de racha).

### Added

- **`hoyTab`** (`js/app.js`, estado en memoria como `progTab`): decide la pestaña activa de Hoy; `renderHoyTabs()`. Ninguna de las dos pestañas tiene gráfica, así que cambiar de pestaña no necesita volver a renderizar nada.
- **`#streak-hero-card`** (`.streak-hero`, `css/views/hoy.css`): número de racha grande, medallas a la derecha, "Mejor racha" debajo de una línea — primera card de la pestaña Resumen.
- **ADR 0012** con la decisión completa.

### Changed

- **Hoy se reorganiza en 2 pestañas** (`.seg-tabs`): Registro (riel de días, tira de 3 chips, panel del día, sesión) y Resumen (card de racha, comparación semanal, nota de la semana, conversor, eliminar semana). El riel de semanas queda fuera de las pestañas, arriba de las dos.
- **La racha sale del header por completo** — antes visible en las 6 pantallas, ahora solo en Hoy → Resumen. El header baja de 56 a 42px de alto.
- **`goToDate()`** (abrir un día desde Historial o Calendario) fuerza `hoyTab = 'registro'`, para no aterrizar en una pestaña sin ejercicios.
- **`placeDaySessionPanel()` se elimina**: la card de sesión ya no se reubica según si el día activo es hoy de verdad; vive siempre después del panel del día, dentro de Registro, para cualquier día.
- **`buildDashboardShareContainer()`** clona también la card de racha, para no perderla de la imagen de "Compartir resumen semanal" (antes se incluía gratis con el header). Funciona sin importar qué pestaña de Hoy esté activa.
- README y `docs/UI-ESTRUCTURA.md`/`docs/SCREENS.md` actualizados.

### Verificado (Navegador integrado)

- Pestañas cambian de contenido y `aria-selected` correctamente; sin ids duplicados (`#streak-badge`/`#streak-badges` existen una sola vez).
- Header: 42px de alto (antes 56px), sin rastro de `.streak`.
- Sesión del día: visible y fija en Registro, dentro de `#hoy-tab-registro`, probado en un día que no es hoy.
- `goToDate()` desde una tarjeta de Historial: aterriza en Registro aunque se venía de Resumen.
- Compartir resumen: la imagen generada incluye la card de racha con el valor correcto (interceptando `html2canvas`, sin llamarlo de verdad).
- Capturas de pantalla de Registro y Resumen, consistentes con el resto de la app.

### Límites conocidos

- El subtítulo del header ("Registro de entrenamiento") sigue partido a 2 líneas — se hizo así en la 1.50.0 para dejarle lugar al engranaje, y con la racha afuera probablemente ya no hace falta. Queda para el siguiente paso (mover Perfil al header).

## [1.56.0] - 2026-09-22 — Hitos y Horarios se mudan a Progreso (pestañas)

### En la app: Constancia y Horarios ahora viven en Progreso

- Progreso tiene 3 pestañas nuevas: Ejercicios (como antes), Constancia y Horarios. Estas dos últimas se movieron desde Perfil, porque son estadísticas de tu entrenamiento, no datos de tu cuenta.
- Perfil queda más simple: solo Tus datos, Backups automáticos, Cerrar sesión y Changelog.

### Added

- **`.seg-tabs`/`.seg-tab`** (`css/components.css`): pestañas segmentadas para elegir el modo de una pantalla (pocas opciones fijas, una activa a la vez) — distinto del riel de píldoras (`.week-rail`/`.week-pill`, que filtra listas con scroll). Con `role="tablist"`/`role="tab"`/`aria-selected`.
- **`progTab`** (`js/app.js`): estado en memoria (como `historialMonth`) que decide la pestaña activa de Progreso; `renderProgTabs()`/`setProgTab()`.
- **ADR 0011** con la decisión completa.

### Changed

- **Hitos y constancia y Horarios de entrenamiento se mueven de `#view-perfil` a `#view-progreso`** (nuevas pestañas "Constancia" y "Horarios"), con todo su CSS (`perfil.css` → `progreso.css`: `.milestones-panel`, `.milestone-*`, `.time-stats-panel`, `.time-chart-*`, `.hour-*`). `renderMilestones()`/`renderTimeStats()` no cambian: se siguen llamando siempre desde `updateStreakBadge()`, sin importar la pestaña activa.
- **`setProgTab()` vuelve a dibujar la gráfica de Horarios** al mostrar esa pestaña — Chart.js mide el canvas al crearlo y un contenedor `display:none` mide 0×0 (mismo motivo por el que `switchToView()` va antes de `renderProgreso()` en `goToProgress()`).
- **`goToProgress()`** (el atajo "Ver progreso" de un ejercicio) fuerza `progTab = 'ejercicios'`, por si se venía de Constancia u Horarios.
- README y `docs/UI-ESTRUCTURA.md`/`docs/SCREENS.md` actualizados; de paso, corregida una mención vieja a `confirm()` en README (ya es `confirmDialog()` desde la 1.53.0).

### Verificado (Navegador integrado)

- Las 3 pestañas cambian de contenido y estado activo/`aria-selected` correctamente.
- Horarios: el canvas mide su ancho real (279px) al mostrarse, no 0.
- Perfil: exactamente 4 títulos (Tus datos, Backups automáticos, Changelog + el botón de cerrar sesión), sin rastro de Hitos/Horarios en su markup.
- Capturas de pantalla de Constancia y Horarios con datos reales, consistentes con el resto de la app.

## [1.55.3] - 2026-09-22 — La versión del caché coincide con la versión de la app

### En la app: Sin cambios visibles (identificación interna más clara)

- No cambia nada de lo que ves ni de cómo funciona: es solo para quien mire el caché de la app en las herramientas del navegador — ahora dice la misma versión que ves en Perfil → Changelog.

### Fixed

- **Bug real encontrado al hacer este cambio:** en el commit de ayer (1.55.2), la entrada quedó ordenada después de la 1.55.1 en vez de antes, así que "Versión actual" en Perfil → Changelog mostraba 1.55.1 en vez de la 1.55.2 real. Corregido el orden.

### Changed

- **`CACHE_NAME` incluye la versión semver actual** además del hash de contenido: `bitacora-shell-v1.55.3-<hash>` en vez de `bitacora-shell-<hash>`. La versión sale de la cabecera más reciente de `CHANGELOG.md` (la misma que exige `build-changelog.php`, que corre antes en el hook), así que siempre coincide con lo que se ve en Perfil → Changelog. El hash sigue siendo lo que decide si el caché cambia; la versión es para que el nombre se lea en DevTools → Application → Cache Storage, no un mecanismo aparte.
- `scripts/bump-sw-cache.php` aborta si `CHANGELOG.md` no tiene ninguna cabecera de versión (`## [x.y.z] - fecha`).

### Verificado

- Con el orden corregido, `CURRENT_VERSION` (`js/changelog-data.js`) y el nuevo `CACHE_NAME` muestran la misma versión (1.55.3).
- Idempotencia: correr el script dos veces seguidas sin cambios no vuelve a tocar `sw.js`.
- Guarda: `CHANGELOG.md` sin ninguna cabecera de versión hace fallar el script (código 1); con una cabecera corrupta pero otra válida más abajo, usa esa (comportamiento esperado, no un fallo).
- El hook completo (`build-changelog.php` → `bump-sw-cache.php`) corre de punta a punta sin errores.

## [1.55.2] - 2026-09-21 — Script de despliegue por SFTP

### En la app: Sin cambios visibles (herramienta de despliegue)

- No cambia nada de la app: se agrega un script para subir los archivos al servidor sin usar FileZilla a mano.

### Added

- **`scripts/deploy-ftp.ps1`**: sube por SFTP (vía `curl`, que ya trae soporte SFTP) solo los archivos que cambiaron desde el último despliegue, comparando contra la marca guardada en `scripts/.last-deploy-commit`. `-Full` sube todo el árbol versionado en git (necesario la primera vez), `-DryRun` muestra qué se subiría sin conectarse, `-Since <commit>` usa un commit puntual como base. Crea los directorios remotos que falten y borra en el servidor los archivos que ya no están en el repo.
- **`scripts/deploy.local.json.example`**: plantilla de las credenciales SFTP (host, usuario, contraseña, ruta remota, y opcionalmente la huella SHA-256 del servidor). Se copia a `scripts/deploy.local.json`, que **no se sube a git**.
- **`.gitignore`**: `scripts/deploy.local.json` (credenciales) y `scripts/.last-deploy-commit` (estado local del último despliegue).
- **README → "Despliegue"**: nota sobre el script como alternativa a subir archivos con FileZilla a mano.

### Verificado

- `scripts/deploy.local.json.example` no contiene credenciales reales (solo el placeholder `cambia-esto`); no hay ningún `scripts/deploy.local.json` real en el árbol de trabajo ni en el commit.
- El script es PowerShell válido (`Get-Content` lo lee sin errores de sintaxis).

## [1.55.1] - 2026-09-21 — Hash del caché independiente de los saltos de línea

### En la app: Sin cambios visibles (preparación para producción)

- No cambia nada de lo que ves ni de cómo funciona: es un ajuste interno para que las actualizaciones de la app se detecten igual desde cualquier computadora.

### Fixed

- **`CACHE_NAME` dependía de los saltos de línea de cada máquina.** `scripts/bump-sw-cache.php` hasheaba los bytes del directorio de trabajo, y con `core.autocrlf=true` (Windows) esos archivos pueden tener CRLF mientras que un clon en Linux o un `git archive` los tiene en LF: el mismo contenido daba hashes distintos (`d9fffcf696` con dos CSS en CRLF frente a `20a1e956af` con todo en LF). Ahora los archivos de texto se normalizan a LF antes de hashear; los binarios (íconos) se hashean tal cual. Detectado al verificar el paquete de producción contra el tag.

### Added

- **README → "Armar el paquete de producción"**: cómo generar la carpeta y el `.zip` desde un tag, qué se deja fuera y la lista de verificaciones previas. Incluye la trampa de `git archive` con `core.autocrlf=true` (convierte a CRLF; hay que pasarle `-c core.autocrlf=false`).

## [1.55.0] - 2026-09-21 — La nota del ejercicio con un diálogo propio

### En la app: Editar la nota de un ejercicio dentro de la app

- Al tocar "+ nota" (o el texto de una nota) ahora se abre un cuadro de la app, con el nombre del ejercicio, un campo para escribir y el botón Guardar. Enter también guarda, Escape o tocar afuera cancelan, y dejarlo vacío quita la nota. Ya no se usa ningún cuadro del navegador.
- La nota queda limitada a 200 caracteres, que es lo que acepta la base de datos (antes se podía escribir más y no había aviso).

### Added

- **`promptDialog({ title, message, value, placeholder, maxLength, confirmLabel, cancelLabel })`** (`js/app.js`): promesa con el texto (vacío incluido, para poder borrar) o `null` si se cancela, igual que `prompt()`. Comparte con `confirmDialog()` el nuevo `openDialog()` y el mismo bottom sheet `#confirm-overlay`, que gana un `<input class="prog-search confirm-input">` opcional (`aria-labelledby` al título, `maxlength`). Foco en el campo con el texto seleccionado, Enter guarda, Tab recorre campo → Cancelar → acción, Escape o el fondo cancelan aunque haya texto escrito.

### Changed

- **La nota de un ejercicio** (`data-action="edit-note"`) usa `promptDialog()` con `maxLength: 200` (`exercises.note` es `VARCHAR(200)`) y muestra el nombre del ejercicio; si ya tenía nota, el mensaje avisa que dejarla vacía la quita.
- `closeConfirm()` resuelve según el tipo de diálogo (booleano en confirmación, texto o `null` en el de texto). `confirmDialog()` no cambia su API.
- **Ya no queda ningún `confirm()`, `prompt()` ni `alert()` nativo.** ADR 0008 actualizado (ahora cubre ambos).

### Verificado (Navegador integrado)

- Abrir: título, nombre del ejercicio como mensaje, campo visible y enfocado, `placeholder`, `maxLength` 200, `role="alertdialog"`, botón de acción sin rojo.
- Tab: campo → Cancelar → acción → campo; Shift+Tab en sentido contrario. Escape y tocar el fondo cancelan con texto escrito y la nota no cambia.
- Guardar con Enter: la nota aparece con su estilo y **llega al servidor** (comprobado contra `api/weeks.php`). Reabrir precarga el texto seleccionado y avisa cómo quitarla; con el campo vacío la nota se borra en pantalla y en el servidor. Probado sobre una nota real y devuelta a su valor original (vacía).
- `confirmDialog()` intacto tras usar el de texto: sin campo, foco en Cancelar, botón de acción en rojo, 78 semanas antes y después.

### Límites conocidos

- **Teclado virtual sin probar** (requiere un teléfono): un bottom sheet anclado abajo puede quedar tapado por el teclado en algunos navegadores móviles. Si pasa, la salida es anclar este diálogo arriba cuando tiene campo de texto (ADR 0008).
- El diálogo de importar sigue sin probarse con un archivo real.

## [1.54.0] - 2026-09-21 — Estados de carga

### En la app: La app muestra que está cargando, y avisa si algo falla

- Al abrir la app o iniciar sesión, en vez de ver pantallas vacías con ceros mientras llegan tus datos, ves marcadores grises con un suave brillo donde van a aparecer; y mientras tanto no se puede crear ni borrar semanas por error.
- Si tus datos no se pueden cargar, ahora te lo dice con un botón "Reintentar" (antes, después de iniciar sesión, te quedabas viendo la app en blanco sin ningún mensaje).
- Si las gráficas no se pueden cargar (por ejemplo, la primera vez sin internet), Progreso y Horarios lo avisan con un botón "Recargar" en vez de fallar. La lista de backups también muestra "Cargando…" y "Reintentar".

### Added

- **Esqueletos de carga** (`renderSkeletons()`, `setAppLoading()`): en la primera carga de datos (`dataLoadedOnce`) se rellenan los huecos de Hoy (pastillas de semana, riel de días, panel del día), Historial, Progreso, Calendario, Perfil (Hitos y Horarios) y Ajustes (librería), y `#app-shell` queda con la clase `is-loading` y `aria-busy="true"` hasta que `applyAppData()` pinta encima. Estilos en `css/components.css` (`.skeleton`, `.skeleton-line`, `.skeleton-row`, `.skeleton-card`…), con el brillo animado y `@media (prefers-reduced-motion: reduce)` que lo deja quieto. Token nuevo `--shimmer`.
- **`chartsAvailable()` y `chartUnavailableHtml()`**: si Chart.js no llegó a cargar, Progreso muestra "Gráfica no disponible" con Recargar y Horarios sustituye solo la gráfica (los chips y las barras de hora siguen). Antes lanzaba un `ReferenceError`.
- **Backups**: "Cargando…" la primera vez (sin parpadeo en las siguientes) y `Reintentar` si falla (`data-action="retry-backups"`).
- **ADR 0009** con la decisión y las alternativas.

### Changed

- **Mientras `is-loading`**: "Nueva semana" queda atenuada y sin clic, "Eliminar esta semana" se oculta, y la racha y los chips de resumen muestran un bloque gris en vez de "0".
- **Login**: el botón dice "Entrando…" mientras espera. Si la sesión se inicia pero la carga de datos falla, el error va a la pantalla de Arranque con Reintentar. Antes `showApp()` y `loadAppData()` compartían el `try` del login y el mensaje se escribía en `#login-error`, ya oculto.
- `loadAppData()` marca la primera carga y limpia el estado de carga en un `finally`; las recargas posteriores (sincronizar al volver la red) no usan esqueletos.

### Verificado (Navegador integrado, con un retraso/500 temporal en `api/weeks.php`, ya revertido)

- Con la carga retrasada: 91 esqueletos repartidos por las 9 zonas, `is-loading` y `aria-busy="true"`, "Nueva semana" sin clic, "Eliminar" oculto, sin el texto engañoso "Todavía no has creado ninguna semana". Al llegar los datos: 0 esqueletos, `aria-busy="false"`, 78 semanas.
- Servidor en 500 sin copia local: pantalla de Arranque con "No se pudieron cargar tus datos" y Reintentar; al quitar el fallo y pulsarlo, carga completa.
- Login (POST simulado para no tocar la sesión): "Entrando…" y botón deshabilitado; con la carga fallando, pantalla de Arranque con Reintentar, botón restaurado y sin texto en el login oculto; Reintentar recupera.
- Chart.js ausente (borrado a propósito): Progreso muestra el aviso con Recargar; Horarios conserva 4 chips y 15 barras de hora.
- Backups con error simulado: aviso + Reintentar; al reintentar se limpia.

### Límites conocidos

- No se comprobó el `prefers-reduced-motion` en pantalla (el panel no permite emular esa preferencia); la regla está en el CSS.
- Los estados **vacíos** (Calendario sin semanas, librería vacía) no cambian.
- Los esqueletos son marcado de `renderSkeletons()`: una vista nueva que cargue datos debe agregar el suyo.

## [1.53.0] - 2026-09-21 — Diálogo de confirmación propio y manifest ampliado

### En la app: Confirmaciones dentro de la app y atajos en el ícono

- Al eliminar una semana, quitar un ejercicio de la librería o importar datos, ahora ves un aviso propio de la app, con el detalle de lo que vas a hacer (por ejemplo, qué semana se elimina) y un botón rojo cuando la acción borra datos. Puedes cancelar con el botón, tocando afuera o con Escape.
- Si instalas la app, al mantener presionado su ícono aparecen atajos a Progreso, Historial y Calendario.

### Added

- **`confirmDialog({ title, message, confirmLabel, cancelLabel, danger })`** (`js/app.js`): promesa con `true`/`false`, así se usa como `confirm()` pero con `await`. Bottom sheet `#confirm-overlay` con `role="alertdialog"` y `aria-modal`; el foco cae en Cancelar (Enter no borra nada por accidente) y vuelve al elemento que lo abrió; Tab/Shift+Tab se quedan dentro; Escape o tocar el fondo cancelan; abrir otro cancela el anterior. Ver [ADR 0008](docs/adr/0008-dialogo-de-confirmacion.md).
- **`.btn--danger-solid`** (`css/components.css`): botón de acción en rojo relleno.
- **Manifest**: `id`, `categories` (`fitness`, `health`) y tres `shortcuts` (Progreso, Historial, Calendario) que abren esa pantalla por su URL de hash.

### Changed

- **Los 4 `confirm()` nativos pasan a `confirmDialog()`**: eliminar semana (`deleteWeek()`; desde el botón grande de Hoy siguen siendo dos diálogos seguidos, ahora con el rango de la semana en el mensaje), quitar de la librería e importar datos (en rojo solo si reemplaza semanas existentes).
- **`.sheet-overlay` / `.sheet` pasan a `css/components.css`** como componente reutilizable, extraídos del panel de info de ejercicio (que conserva sus clases `ex-info-*` como ganchos). Verificado idéntico: hash de los estilos calculados de ~3.700 elementos en 3 estados, 0 diferencias.
- **Íconos del manifest declarados por separado como `any` y `maskable`** (antes `"any maskable"` juntos, que Chrome desaconseja). Es el mismo PNG: el fondo llena todo el cuadro y la mancuerna queda a un 31 % del centro, dentro de la zona segura de 40 %, así que no hicieron falta archivos nuevos.
- **`scripts/bump-sw-cache.php`**: `manifest.json` y los íconos entran al hash del shell; antes un cambio solo en el manifest no invalidaba el caché.

### Verificado (Navegador integrado)

- Diálogo: foco en Cancelar, `role`/`aria-modal`, Tab y Shift+Tab dentro, Escape y fondo cancelan y devuelven el foco, tocar dentro de la card no cierra, la doble confirmación encadena el segundo diálogo y cancelarlo no borra la semana (78 semanas antes y después).
- Camino de confirmar: agregué una entrada de librería de prueba, el diálogo pidió confirmación, al aceptar se quitó (54 entradas antes y después).
- Manifest: JSON válido, se sirve y se cachea igual, atajos dentro del `scope`, sin avisos en consola.

### Límites conocidos

- El diálogo de **importar** no se probó con un archivo real.
- La nota de un ejercicio aún usa el `prompt()` del navegador.
- Sin `screenshots` en el manifest: requieren imágenes reales de la app.

## [1.52.0] - 2026-09-21 — Librerías de CDN sin conexión

### En la app: Íconos, gráficas y tipografías también sin internet

- Después de abrir la app una vez con conexión, ahora también se ven sin internet los íconos, las gráficas de Progreso, las tipografías y la opción de compartir como imagen; antes, sin conexión, faltaban.

### Added

- **Caché de librerías en el service worker** (`sw.js`): `bitacora-libs-v1`, separado del shell, con caché primero para `cdnjs.cloudflare.com`, `fonts.googleapis.com` y `fonts.gstatic.com`. Guarda Chart.js 4.4.0, chartjs-plugin-zoom 2.0.1, html2canvas 1.4.1, Font Awesome 6.5.1 (`all.min.css` y `fa-solid-900.woff2`) y Google Fonts (CSS + 6 archivos `woff2`): 12 archivos, ~910 KB.
- **Precarga en `install`** (`warmLibs()`): en la primera visita la página carga antes de que el SW la controle, así que se guardan al instalar. Las URLs se leen del propio `index.html` (sin lista duplicada en `sw.js`); de los CSS solo se toman las fuentes que la app usa (`fontUrlsToWarm()`: Font Awesome `solid` y los subconjuntos `latin` y `latin-ext`, ~236 KB en vez de ~1 MB). Es de mejor esfuerzo: si falla, no impide instalar y las librerías se guardan al pedirlas.
- **ADR 0007** con la decisión, las alternativas (vendorizar las librerías al repo, descartado) y las consecuencias.

### Changed

- **`activate` solo borra los `bitacora-shell-*` viejos**: antes borraba todo caché distinto del actual, lo que se habría llevado `bitacora-libs-v1` en cada versión.
- Las peticiones a los CDN se hacen en **modo CORS** (`credentials:'omit'`): una respuesta opaca cuesta ~7 MB de cuota en Chrome por archivo aunque pese 40 KB. Si un CDN no enviara `Access-Control-Allow-Origin`, se cae a la petición original.

### Verificado (Navegador integrado)

- Instalación desde cero con conexión: `bitacora-libs-v1` queda con los 12 archivos, todos de tipo `cors`.
- Con el SW controlando la página, las 9 peticiones externas de una carga (Google Fonts CSS, Font Awesome CSS y fuente, Chart.js, zoom, html2canvas y 3 fuentes) las resolvió el service worker con 0 bytes de red; `Chart` y `html2canvas` cargados y las 8 familias/pesos de fuente en estado `loaded`.
- Actualización del shell (simulada cambiando `CACHE_NAME`): el shell viejo se borra y `bitacora-libs-v1` conserva sus 12 entradas.
- No se pudo cortar la red de los CDN a propósito (el panel no permite desconectar solo internet): "0 bytes de red y atendido por el SW" es la prueba de que salen del caché.

### Límites conocidos

- La primera visita debe ser con conexión. La app sigue dependiendo de los CDN para esa visita y para versiones nuevas de una librería.
- `bitacora-libs-v1` no se limpia solo al cambiar una librería de versión; para vaciarlo, renombrarlo (`-v2`) en `sw.js`.
- Otro estilo de Font Awesome (regular/brands) u otros alfabetos requieren ampliar `fontUrlsToWarm()`.
- El dataset de ejercicios y los GIFs siguen sin guardarse offline.

## [1.51.0] - 2026-09-21 — Espaciado a la escala (impares al par siguiente)

### En la app: Botones y separaciones más parejos

- Botones y campos quedan unos 2 píxeles más altos, así son más fáciles de tocar, y las separaciones entre elementos siguen ahora una misma escala.
- Las pantallas crecen unos pocos píxeles (entre 3 y 36 según la pantalla); todo lo demás se ve igual.

### Changed

- **45 valores impares de `margin`/`padding`/`gap` pasan al par siguiente y a su token**: 3→4 px (13), 5→6 px (8), 7→8 px (8), 9→10 px (6), 11→12 px (10). Con esto todo el espaciado de la interfaz sale de la escala `--sp-*`; solo quedan literales los >24 px de pantallas sueltas (login, estados vacíos: 22/26/28/40 px) y las excepciones de abajo.
- **Excepciones, comentadas en el CSS**: el padding de `.sum-chip` (11/9 px) — con 4 chips en 375 px, 12/10 px deja 62 px útiles y "40 días" se parte en dos líneas (el chip pasaba de 66 a 88 px de alto) — y `.heatmap-grid { column-gap: 3px }`, que iguala el separador fijo de 3 px entre semanas.

### Efecto en el diseño (375 px, comparado con la versión anterior)

- **Botones y campos +2 px de alto** (39→41 px: `.btn`, `.perfil-btn`, `.logout-btn`, `.btn-delete-week`, "Volver a hoy", píldoras de semana, buscadores).
- **Barra inferior +3 px** (52→55 px) y **header +1 px**.
- **Alto total de cada vista**: Hoy +12, Perfil +36 (muchas filas de Hitos +1 px), Ajustes +7, Calendario +5, Historial +5, Progreso +3. Sin desbordes horizontales; las filas de ejercicio conservan sus 2 líneas de nombre.

## [1.50.3] - 2026-09-21 — Espaciado con tokens

### En la app: Sin cambios visibles (orden interno)

- La app se ve y funciona igual: por dentro, las separaciones entre elementos ahora salen de una escala común en vez de números sueltos.

### Changed

- **Escala de espaciado completa en `css/tokens.css`**, en unidades de 4 px como Tailwind (`--sp-1` = 4 px, `--sp-2` = 8 px…) y con pasos de 2 px porque la interfaz ya los usaba: `--sp-0-5` (2), `--sp-1` (4), `--sp-1-5` (6), `--sp-2` (8), `--sp-2-5` (10), `--sp-3` (12), `--sp-3-5` (14), `--sp-4` (16), `--sp-4-5` (18), `--sp-5` (20), `--sp-6` (24). `--pad-card` y `--pad-card-sm` ahora se apoyan en ella.
- **216 valores de `margin`, `padding` y `gap` pasan de px sueltos a tokens** en `base.css`, `components.css` y las 7 vistas. Se saltan las declaraciones con `calc()`/`env()` (padding del `body`, márgenes del sheet de info) y `.heatmap-grid { column-gap: 3px }`, que iguala el separador fijo de 3 px entre semanas.
- **Siguen literales**: los impares (3, 5, 7, 9, 11 px) y los >24 px de pantallas sueltas (login, estados vacíos). Los impares se ajustan en la versión siguiente porque sí mueven el diseño 1 px.

### Verificado

- Hash de todas las propiedades computadas de cada elemento del DOM (unos 3.700) en 3 estados, antes y después: **0 diferencias**.
- Nota del método: `getComputedStyle` de Chrome enumera también las variables CSS (66), así que añadir tokens al `:root` cambia el hash de todos los elementos. El hash ahora ignora las propiedades `--*`; el valor real que usan los elementos sí cuenta.

## [1.50.2] - 2026-09-21 — CSS por vistas

### En la app: Sin cambios visibles (orden interno)

- La app se ve y funciona igual: por dentro, los estilos se separaron en un archivo por pantalla para que sea más fácil mantenerlos.

### Changed

- **`css/styles.css` (749 líneas) se parte en 9 archivos**, sin cambiar ninguna regla: `css/base.css` (reset, header, toast, barra inferior, banner offline, `.hidden`), `css/views/{hoy,ajustes,login,perfil,calendario,historial,progreso}.css`, y lo que comparten varias pantallas pasa a `css/components.css` (riel de píldoras `.week-rail`/`.week-pill`, chips `.sum-chip`, encabezado de panel `.lib-*`, campo `.prog-search`). El panel de info de ejercicio va en `views/hoy.css`, que es desde donde se abre. `index.html` los carga en orden de cascada: tokens → components → base → views.
- **`sw.js` y `scripts/bump-sw-cache.php`**: las listas del app shell pasan de `css/styles.css` a los 8 archivos nuevos.

### Added

- **Guarda en `scripts/bump-sw-cache.php`**: si `index.html` carga un CSS/JS local que no está en `$shellFiles` (hash) o en `SHELL_ASSETS` de `sw.js` (precache), el commit se aborta y el mensaje dice cuál falta. Con 11 hojas de estilo era fácil olvidar una.

### Verificado

- **Reglas idénticas**: las 389 reglas de los archivos nuevos son exactamente las de `styles.css` (comparadas por selector y declaraciones), y ningún selector aparece en más de un archivo, así que el orden de carga no altera la cascada.
- **Estilos calculados idénticos**: hash de todas las propiedades computadas de cada elemento del DOM (unos 3.700) en 3 estados — vista por defecto, día con detalle y "Migrar día" abiertos, y panel de info de ejercicio abierto — antes y después del corte: 0 diferencias (con una corrida de control previa, también 0, para descartar ruido del método).

## [1.50.1] - 2026-09-21 — Deuda del handoff: changelog de fuente única, `docs/` y ADR

### En la app: Sin cambios visibles (orden interno)

- No cambia cómo funciona la app: por dentro se reorganizó cómo se arma este historial de versiones y la documentación.
- Corregido: dos textos que estaban escritos en otro español ("Elegí… mirá", "Bajalos acá") ahora dicen "Elige… mira" y "Bájalos aquí".

### Added

- **`scripts/build-changelog.php`**: genera `js/changelog-data.js` (`window.APP_VERSIONS`) desde los bloques `### En la app: …` de este archivo. Lo corre `.githooks/pre-commit` antes de `bump-sw-cache.php`; si la versión más reciente no tiene bloque, aborta el commit. `js/changelog-data.js` entra al app shell (`index.html`, `SHELL_ASSETS` de `sw.js`, lista de `bump-sw-cache.php`).
- **`docs/`**: `SCREENS.md` (inventario de pantallas con rutas, datos y estados), `adr/` (6 decisiones: routing por hash, copia local, caché versionado, tokens/componentes, Ajustes en el header, changelog de fuente única) y los documentos que estaban sueltos (`ESTRUCTURA.md`, `UI-ESTRUCTURA.md`, `AUDITORIA.md`).
- **README → "Proceso de cambios"**: Conventional Commits, tags `vX.Y.Z`, el bloque "En la app" y el alta de archivos nuevos del shell.
- **Tags de git** `v1.46.1` … `v1.50.1` (locales), uno por versión desde que hay un commit que la publica.

### Changed

- **`APP_VERSIONS` sale de `js/app.js`** (−221 líneas): ahora es `window.APP_VERSIONS`, generado. Las 52 versiones existentes se traspasaron a bloques `### En la app:` de este archivo y el resultado se verificó idéntico, entrada por entrada, a la lista original.
- Comentario obsoleto de `js/app.js` (citaba `PLAN-8-FEATURES.md`, ya eliminado) apunta ahora a la 1.14.0 de este changelog.
- `docs/ESTRUCTURA.md` (antes en la raíz): aclarado que sus números de línea son de la 1.45.0 y pasado a tuteo.

## [1.50.0] - 2026-09-21 — Hash routing y Ajustes en el header (barra de 5 destinos)

### En la app: Cada pantalla con su enlace, y Ajustes en el header

- Ajustes ahora es un ícono de engranaje arriba a la derecha, junto a tu racha. La barra inferior queda con 5 destinos: Hoy, Historial, Progreso, Calendario y Perfil.
- Cada pantalla tiene su propia dirección (#/hoy, #/perfil…): el botón atrás te regresa a la pantalla anterior, y si recargas o abres un enlace directo te quedas en la misma pantalla.
- El subtítulo "Registro de entrenamiento" del header ahora ocupa dos líneas para dejar lugar al engranaje.

### Added

- **Routing por hash** (`#/hoy`, `#/historial`, `#/progreso`, `#/calendario`, `#/perfil`, `#/ajustes`): cada vista tiene URL propia. `showView()` solo muestra la vista; `switchToView()` la muestra y registra la entrada con `history.pushState` (no dispara `hashchange`, sin bucles) — sigue siendo síncrona, así `goToDate()`, `goToProgress()` y el resto de atajos funcionan sin cambios (y el gráfico de Progreso se dibuja con la vista ya visible). Un listener `hashchange` atiende atrás/adelante y hashes editados a mano; `applyInitialRoute()` (llamada desde `showApp()`) abre la vista del hash al cargar y, sin hash válido, fija `#/hoy` con `replaceState`. Cerrar sesión vuelve a `#/hoy`.
- **`aria-current="page"`** en el destino activo (barra y engranaje).

### Changed

- **Ajustes sale de la barra inferior** (6 → 5 destinos) y pasa a un ícono de engranaje (`<a class="btn btn--icon head-settings" href="#/ajustes">`) en el header, a la derecha de la racha; se resalta cuando estás en esa vista. El ícono no aparece en la imagen de "Compartir resumen semanal".
- **Perfil pide la lista de backups al mostrarse** desde cualquier camino (barra, atrás, enlace directo, tras importar), no solo al tocar su botón.
- El texto de la racha no se parte (`white-space:nowrap`); para dejar lugar al engranaje el subtítulo "Registro de entrenamiento" envuelve a 2 líneas y el header pasa de 40 a 56 px de alto a 375 px.

### Verificado (Navegador integrado, 375 px)

- Hash inicial `#/hoy`; cada destino de la barra cambia el hash y suma una entrada al historial; atrás/adelante recorren las vistas; enlace directo con recarga (`#/ajustes`) abre esa vista con el engranaje resaltado y ningún botón de la barra activo.
- Atajos: tarjeta de Historial → Hoy (semana correcta), día del Calendario → Hoy, "Ver progreso" → Progreso con el ejercicio cargado y el gráfico visible.

## [1.49.0] - 2026-09-21 — Design tokens y componentes base (`.card`, `.btn`)

### En la app: Estilos unificados

- Tarjetas, botones y tamaños de texto ahora salen de un mismo sistema de estilos, así los botones y paneles se ven consistentes en toda la app.
- Algunos textos pequeños se ven medio punto más grandes y unas esquinas cambian 1-2 px de redondeo; el resto se ve igual.

### Added

- **`css/tokens.css`**: el `:root` de colores movido desde `styles.css` más escalas nuevas — radios (`--r-xs/sm/md/lg/xl/full`: 4/8/10/12/16/50%), tamaños de texto de interfaz (`--fs-xxs…xl`: 9/10/11/12/13/15 px), espaciado (`--sp-1…6`, `--pad-card`, `--pad-card-sm`) y los colores con transparencia que estaban sueltos como `rgba(...)` (`--accent-soft`, `--ok-faint`, `--scrim`, `--bg-glass`, etc.), más `--white` y `--on-ok`. Los `rgba` son literales, no `color-mix()`, porque html2canvas 1.4.1 (Compartir) no lo entiende.
- **`css/components.css`**: `.card` (`--compact` radio 12, `--raised` fondo `--surface-2`, `--dashed`) y `.btn` (`--primary`, `--ghost`, `--danger`, `--block`, `--sm`, `--icon`).

### Changed

- **14 variantes de tarjeta copiadas → `.card`**: `day-panel`, `lib-panel`, `perfil-panel`, `milestones-panel`, `heatmap-panel`, `cal-panel`, `changelog-panel`, `login-card`, `prog-chart-card`, `recap-card`, `week-note-panel`, `day-session-panel`, `converter-panel`, `hist-card`, `prog-spark-card`, `sum-chip`, `time-chart-card`, `placeholder`. Cada clase de vista conserva solo lo propio (padding, margen, overflow).
- **Botones → `.btn`**: copiar semana, agregar ejercicio, migrar (confirmar/cancelar), eliminar semana, exportar/importar/guardar reglas, cerrar sesión, "Volver a hoy", compartir, navegación del calendario, cerrar info de ejercicio, alternar reps, agregar a la librería y entrar. `.day-session-toggle`, `.week-pill`, `.add-week`, la barra inferior y `.ex-progress-btn` no se tocan (son otros patrones).
- **Radios y tamaños de texto colapsados a la escala**: 9→10 px y 14→12 px de radio; 8/8.5/9→9, 9.5/10→10, 10.5/11→11, 11.5/12→12, 12.5/13/13.5→13, 14/14.5/15→15 px de texto. Los títulos en fuente display siguen con su tamaño propio.
- Sin `rgba(...)` ni hex sueltos en `styles.css` (los `rgba` del bloque pasaron a tokens).

### Diferencias visibles (verificadas a 375 px comparando estilos calculados y alturas antes/después)

- Botones migrados: borde de 1 px y padding unificados (los que antes no tenían borde crecen 2 px); "Volver a hoy" pasa de 11 a 12 px de texto.
- Texto de 0.5 px más grande en varias etiquetas; las vistas crecen 3–47 px de alto en total (Progreso y Perfil las que más, por más líneas en párrafos).
- Excepciones a la escala, con comentario en el CSS: `.sum-chip .k/.v` (8.5/14.5 px) y los botones de la barra inferior (9.5 px) — con 4 chips o 6 botones en 375 px, el tamaño de la escala parte "MEJOR RACHA"/"40 días" en dos líneas o hace desbordar "CALENDARIO".

### Pendiente de este paso

- Partir `styles.css` en `css/views/*.css` (Hoy, Historial, Progreso, Calendario, Perfil, Ajustes). No se hizo aquí: el paso 4 reescribe el HTML de las vistas y conviene partir el CSS junto con eso.
- El espaciado (`--sp-*`) solo se aplicó a los valores repetidos de 16 px y a los paddings de tarjeta; el resto de márgenes y gaps siguen en px.

## [1.48.0] - 2026-09-21 — Caché versionado y aviso de versión nueva

### En la app: Aviso de versión nueva

- Cuando hay una versión nueva de la app, aparece un aviso "Hay una versión nueva — Actualizar" y se aplica cuando tú quieras, sin que la pantalla cambie a la mitad de lo que estás haciendo.
- Corregido: tras una actualización podía mezclarse una pantalla nueva con código viejo hasta recargar un par de veces. Ahora toda la app se sirve de la misma versión.
- La app también busca actualizaciones cada vez que vuelves a ella, aunque la tengas instalada y abierta por días.

### Fixed

- **HTML nuevo con JS/CSS viejo tras un deploy**: la navegación iba a la red primero pero `css/js` salían del caché primero, así que se podía mostrar un `index.html` nuevo con un `app.js` viejo hasta la recarga siguiente (visto en vivo al agregar `#boot-screen`). Ahora todo el shell, `index.html` incluido, sale del mismo caché versionado.

### Added

- **Aviso "Hay una versión nueva de la app — Actualizar"** (`updatefound` / `registration.waiting`, reutiliza `showToast` con acción). Al aceptar se manda `SKIP_WAITING` al SW y la página se recarga en `controllerchange`. Solo se recarga si ya había un SW controlando la página, así la primera instalación no recarga de más.
- **Búsqueda de actualizaciones al volver a primer plano** (`visibilitychange` → `registration.update()`), para PWAs instaladas que pasan días abiertas sin navegar; si ya hay una versión esperando, se vuelve a ofrecer.

### Changed

- **`sw.js`**: se quita el `skipWaiting()` automático del `install` (la versión nueva espera hasta que se acepte); se mantiene `clients.claim()` para que la primera instalación tome el control de la página. El precache usa `Request(url, {cache:'reload'})` para no guardar archivos viejos de la caché HTTP. La navegación sale de `caches.match('index.html')`.
- Corregido el comentario de `sw.js` que decía que la app no tenía sincronización offline.

### Nota para desarrollo

- Como `index.html` ya no va a la red primero, en local un cambio no se ve hasta que cambie `CACHE_NAME` (al commitear) y se acepte la actualización, o hasta usar *Update on reload* / *Bypass for network* en DevTools, o correr `php scripts/bump-sw-cache.php`. Detalle en el README.

## [1.47.0] - 2026-09-21 — Arranque en frío sin conexión

### En la app: Abrir la app sin conexión

- Si abres la app sin internet, ya no te manda al inicio de sesión: abre con tus últimos datos guardados y un aviso "Sin conexión". Al volver la red se actualiza sola.
- Si no hay datos guardados y no hay conexión, ves una pantalla con "Reintentar" en vez del login.
- Pantalla de carga al arrancar, en vez de quedar en blanco mientras se verifica tu sesión.
- Al cerrar sesión (o si tu sesión vence) se borran los datos guardados en el dispositivo.

### Added

- **`js/snapshot.js` (`window.Snapshot`)**: copia local (IndexedDB `bitacora-snapshot`) de `{ bulk, library, settings }`, guardada tras cada `loadAppData()` exitoso. `save()`/`load()`/`clear()`, todo en try/catch; `load()` devuelve `null` si la copia falta o está incompleta.
- **Pantalla de arranque (`#boot-screen`)**: "Cargando…" mientras `bootstrap()` verifica la sesión; ante un fallo muestra el motivo y un botón "Reintentar".
- **`Error.offline`** en `js/api.js` para distinguir "sin red" de un error real del servidor.

### Changed

- **`bootstrap()` ya no manda al Login ante un error de red.** Solo va al Login si `session.php` confirma `authenticated:false` (y ahí borra la copia). Sin red y con copia, abre la app con esos datos y el banner "Sin conexión — mostrando tus últimos datos guardados"; sin copia (o ante un 5xx), pantalla de reintento.
- **`loadAppData()` separado en traer + `applyAppData()`**, para poder pintar tanto lo de la API como la copia local. `syncOfflineQueue()` recarga los datos al volver la red si se abrió con la copia.
- **Sesión perdida (401) o logout borran la copia local** — los datos no quedan en el dispositivo sin sesión.

### Limitaciones conocidas

- Las ediciones hechas offline (en la cola) no se reflejan en la copia local: si se cierra y reabre la app sin red, se ven los datos previos hasta sincronizar.
- Font Awesome, Chart.js, html2canvas y las tipografías siguen viniendo de CDN sin cachear, así que sin red en frío faltan íconos y gráficas.

## [1.46.1] - 2026-09-21 — El domingo cuenta en racha, Historial y comparación semanal

### En la app: El domingo cuenta en racha, Historial y comparación semanal

- Un día recuperado en domingo ahora suma a la racha (y a los 5 días mínimos de la semana). Un domingo sin ejercicios no cuenta ni corta la racha, igual que el sábado.
- El domingo también se incluye en la comparación semanal, el balance por grupo muscular, el calendario y el heatmap. En Historial, el punto "D" aparece siempre.

### Fixed

- **Un día recuperado en domingo no sumaba a la racha**: `buildChronoDays()` descartaba siempre el domingo (`if(dk === 'dom') return;`). Ahora sábado y domingo son días "bonus": solo entran a la lista si tienen ejercicios (vacío = neutral), y un domingo cumplido suma a la racha y a los `week_streak_min_days` de la semana.

### Changed

- **Domingo incluido en el resto de las vistas**: comparación semanal (`renderWeeklyRecap()`, semana cerrada lun-dom; si hoy es domingo se mide completa), balance por grupo muscular (`computeGroupBalance()`), y calendario/heatmap (`computeDayTier()` resuelve el domingo con `|| 'dom'`; vacío queda sin línea, no en rojo). En Historial el punto "D" se muestra siempre y los totales de la semana incluyen el domingo.

## [1.46.0] - 2026-08-14 — GIFs e info de ejercicios (dataset externo)

### En la app: GIFs e info de ejercicios (dataset externo)

- Nuevo ícono de ojo junto al nombre de un ejercicio (cuando hay coincidencia con el dataset externo hasaneyldrm/exercises-dataset): abre un panel con el GIF de demostración, categoría/equipo/músculo objetivo y las instrucciones paso a paso, todo en español.
- En Ajustes, "Fuente de nombres de ejercicios": elegir entre tu librería personalizada de siempre o el dataset completo (1.324 ejercicios) para autocompletar al agregar un ejercicio. El ícono de ojo aparece igual con cualquiera de las dos.
- Los GIFs se traen bajo demanda y quedan cacheados en el servidor — la primera vez tardan un toque, después son instantáneos incluso sin conexión al origen.

### Added

- **Dataset externo `data/exercises-dataset.json`** (1.324 ejercicios, generado por `scripts/build-exercises-dataset.php` a partir de [hasaneyldrm/exercises-dataset](https://github.com/hasaneyldrm/exercises-dataset), MIT): por entrada, `id`, `name`/`name_es`, `category`, `body_part`, `equipment`, `target`, `muscle_group`, `secondary_muscles`, `image`/`gif_url` (paths relativos al repo origen), `attribution`, `instructions_es`/`instruction_steps_es`. `name_es` sale de `scripts/lib/translate-exercise-name.php`, un traductor EN→ES por plantillas (diccionario de equipo/modificador/frase de movimiento + recomposición "{movimiento} {modificadores} con {equipo}") — si después de sacar equipo/movimiento/modificadores queda texto en inglés sin mapear, la traducción se descarta entera (nunca se mezclan idiomas) y `name_es` queda `null`; el frontend cae a `name` en ese caso. Cobertura real: ~24% de las 1.324 con traducción limpia.
- **`data/exercise-name-mapping.json`**: coincidencias curadas a mano entre los nombres reales del usuario (backup `bitacora-backup-2026-08-14-180301.json`, 43 nombres únicos sin contar los 11 placeholders legacy `Garmin: X`) y los ids del dataset — 41 mapeados, 2 sin match confiable (`Hip trust en maquina`, `Patada de glúteo en maquina`: el dataset no tiene un ejercicio de máquina equivalente, forzarlo habría mostrado el GIF incorrecto) que quedan afuera a propósito. Lookup por nombre normalizado (minúsculas, sin acentos) — no hay fuzzy matching en el cliente.
- **`api/exercise_media.php`**: proxy con caché en disco (`api/media_cache/{gifs,images}/{id}.{ext}`, gitignoreado, `.htaccess` deny-all como `api/db/backups/`) para los GIFs/imágenes del dataset (no vendorizamos las ~128MB del dataset completo). Primera vez: trae de `raw.githubusercontent.com` (extensión curl si está compilada, si no `file_get_contents` con el wrapper `https`) y cachea; después sirve directo del disco con `Cache-Control` largo. Si el origen no responde y tampoco hay caché, 502 — el frontend muestra "GIF no disponible" en vez de una imagen rota.
- **Ícono de ojo (`.ex-info-btn`, `fa-eye`) junto al nombre de cada ejercicio** en `exerciseRowHtml()` — solo se renderiza si `findDatasetMatch(ex.name)` encuentra coincidencia en el mapping. Abre `#exercise-info-overlay` (bottom sheet, primer overlay/modal del proyecto — no había ninguno reutilizable) con GIF, categoría/equipo/músculo objetivo + secundarios (diccionarios `CATEGORY_LABELS_ES`/`EQUIP_LABELS_ES`/`MUSCLE_LABELS_ES`, ~10-30 valores fijos cada uno, traducción siempre limpia a diferencia del nombre) e instrucciones paso a paso en español, más la atribución obligatoria por la licencia de los medios ("© Gym visual, gymvisual.com" — los datos/código del dataset son MIT pero las imágenes/GIFs son de Gym visual, reutilizables con atribución). `EXERCISE_DATASET` completo (~1.9MB) se carga lazy (`loadExerciseDataset()`) recién cuando hace falta; `NAME_MAPPING` (chico) se carga siempre al boot.
- **Ajustes → "Fuente de nombres de ejercicios"**: radio "Personalizada (la mía)" / "Dataset (1.324 ejercicios, con GIF)" que decide qué lista alimenta el `<datalist>` de autocompletar (`renderLibraryDatalist()`, ahora async y bifurcada por `EXERCISE_SOURCE`). Es una preferencia del dispositivo, no una regla de negocio — se guarda en `localStorage` (`bitacora.exerciseSource`), no pasa por `api/settings.php` (que solo valida enteros por rango). Default `'custom'`, no cambia el comportamiento de nadie que no toque el toggle.

## [1.45.0] - 2026-08-14 — Timer del día como íconos, y changelog colapsado en Perfil

### En la app: Timer del día como íconos, y changelog colapsado en Perfil

- La card "Iniciar/Finalizar entrenamiento" ahora es un ícono de play/stop en rojo, en vez de un botón de texto — entra en la misma fila que Hora inicio/Hora fin/Duración incluso en un celular angosto.
- Si el día cargado en "Hoy" es literalmente hoy, esa card se mueve arriba, entre el riel de días y las 4 cards de resumen — cualquier otro día la deja donde siempre vivió.
- Changelog en Perfil colapsado por defecto: ahora solo se ve "Changelog / Versión actual: X.X.X", y se despliega la lista completa al tocarlo.
- Corregido: la fecha de cada versión del changelog quedaba descolgada cuando el título ocupaba 2 líneas — ahora versión/fecha/chevron siempre van en su propia fila, con el título suelto debajo.

### Changed

- **Card "Iniciar/Finalizar entrenamiento" (`#day-session-panel`, "Hoy")**: el botón de texto ("Iniciar entrenamiento"/"Finalizar entrenamiento", fondo verde/rojo) se reemplaza por un botón cuadrado de 40px con ícono `fa-play`/`fa-stop` en rojo (`var(--danger)`), con un tinte de fondo rojo sutil (`rgba(226,87,76,0.12)`) mientras el entrenamiento está en curso. `.day-session-row` pasa de `flex-wrap:wrap` (el botón de texto, `flex:1 1 140px`, forzaba 2 filas casi siempre) a una sola fila sin wrap — el ícono angosto (`flex:0 0 auto`) más los 3 campos a `flex:1 1 0`/`min-width:0` entran los 4 elementos incluso en un celular de 375px de ancho.
- **Reubicación condicional según la fecha real**: nueva `placeDaySessionPanel(panel, isToday)` en `renderDaySession()` — compara `dayDate(state.activeWeek, state.activeDay)` contra `new Date()` (no el día de la semana activo, la fecha real) vía `toISO()`. Si coincide, mueve la card con `insertBefore` a justo antes de `.summary-strip` (entre el riel de días y la tira de 4 cards); si no, la deja donde siempre vivió, justo antes de `#week-note-panel`. Se recalcula en cada render, así que cambiar de día en "Hoy" mueve la card en vivo. Verificado forzando el día activo a hoy y a otro día, en ambos sentidos.

### Fixed

- **Changelog en Perfil sin colapsar de entrada**: `.changelog-panel` (un `<div>` fijo) pasa a `<details>` — antes se veían las ~30 versiones apiladas apenas se entraba a Perfil; ahora solo "Changelog / Versión actual: X.X.X" + chevron, y la lista completa (cada versión sigue siendo su propio `<details>` plegable) aparece recién al tocarlo.
- **Fecha de cada entrada del changelog descolgada con títulos largos**: `.changelog-entry summary` era una sola fila (`justify-content:space-between`) con la fecha y el chevron centrados verticalmente contra un bloque de versión+título apilados — con un título de 2 líneas, la fecha quedaba flotando a la mitad en vez de alineada arriba. Reestructurado a dos filas: `.changelog-entry-top` (versión + fecha + chevron, siempre una sola línea) arriba, `.changelog-entry-title` suelto debajo — así nada se desalinea sea cual sea el largo del título. Verificado capturando las ~30 entradas reales del changelog.

## [1.44.0] - 2026-08-14 — Resumen semanal: card al 50%, días en blanco y rieles a todo el ancho

### En la app: Resumen semanal: card al 50%, días en blanco y rieles a todo el ancho

- La card del resumen semanal sube de 30% a 50% de opacidad — a 30% se notaba demasiado el fondo.
- Nombre del día y grupo muscular en las cards de Lun-Dom ahora van en blanco (se perdían con el verde de fondo cuando el día estaba completado).
- Corregido: en celulares más angostos que la imagen exportada, el riel de semanas y el de días quedaban encogidos con un hueco vacío a la derecha en vez de ocupar todo el ancho de la card.

### Changed

- **Opacidad de `.dashboard-share` sube de 30% a 50%** (`rgba(20,23,27,0.5)`) — probado en real, 30% dejaba pasar demasiado el fondo.
- **Texto de `.day-tab` forzado a blanco dentro del export** (`.dashboard-share .day-tab .dname`, `.dashboard-share .day-tab .muted-tag`): nombre del día y grupo muscular usaban los tonos apagados de la app en vivo (`--text-dim`/`--text-faint`), que sobre el fondo verde semitransparente de un día completado quedaban casi ilegibles.

### Fixed

- **`cloneRailForShare()` fijaba el ancho del clon al `clientWidth` EN VIVO del riel real** (`el.clientWidth + 'px'`) en vez del ancho de la card exportada (520px, fijo) — en un celular más angosto que esa card (la mayoría), el riel clonado quedaba encogido a ese ancho angosto adentro de una card más ancha, dejando un hueco vacío a la derecha en vez de llegar hasta el borde (reportado con capturas reales tomadas desde el celular). Nueva constante `SHARE_CONTENT_WIDTH` (520 − padding horizontal de `.dashboard-share`) como referencia del ancho real disponible.
- **Día (`.day-rack`, `stretch:true`)**: el conjunto de tabs a mostrar se sigue decidiendo igual que antes (los que ya se ven en el riel real, vía `getBoundingClientRect()`) — sin cambios ahí, porque `.day-tab` es porcentual (`calc((100% - 24px)/5)`) y ese ancho en vivo no sirve para saber cuántos entrarían en un contenedor de otro tamaño. Lo que cambia es que el clon ahora se ensancha a `width:100%` (el ancho real de la card) en vez del `clientWidth` angosto del celular, así que esos mismos tabs reparten el ancho correcto.
- **Semana (`.week-rail`)**: acá sí cambia la selección — los pills tienen ancho propio por su texto (`flex-shrink:0`, no escalan con el contenedor), así que se recalculó cuántos entran sumando sus anchos reales (con gap) contra `SHARE_CONTENT_WIDTH` en vez de contra el `clientWidth` angosto del celular de origen — entran más semanas si el export tiene más lugar que la pantalla real.

## [1.43.0] - 2026-08-14 — Resumen semanal: card al 30%, texto legible y rieles sin cortes

### En la app: Resumen semanal: card al 30%, texto legible y rieles sin cortes

- La card del resumen semanal pasa de sólida a 30% de opacidad — se sigue notando un poco el fondo detrás.
- Título, subtítulo y el label "racha actual" ahora van en blanco; el número de racha siempre en verde. Los días completados llevan su verde también al 30%.
- El riel de semanas ya no corta un pill a la mitad — solo muestra los que entran completos.
- El riel de días reparte el 100% del ancho entre los tabs que entran, sea cual sea la cantidad (antes asumía siempre 5 y podía perder un tab si el cálculo daba justo en el borde).

### Changed

- **`.dashboard-share` pasa de sólida a `rgba(20,23,27,0.3)`** (30% de opacidad, mismo tono que `--bg`/#14171B) — probado en real: sólida al 100% tapaba demasiado la foto de fondo al compartir en redes; a medias se sigue leyendo la card y se nota el fondo.
- **Contraste de los elementos sin card propia** (`.dashboard-share h1`, `.dashboard-share .sub`, `.dashboard-share .streak .l`, `.dashboard-share .streak .n`): con la card semitransparente, los tonos apagados de la app en vivo (`--text-dim`, `--text-faint`, y el gris del número de racha cuando no es "complete") perdían contraste. Se fuerzan a blanco (título/subtítulo/label) y verde fijo (`--ok`, siempre, tenga o no la clase `.complete`) solo dentro del export — la app en vivo no cambia. `.day-tab.completed` también sube de 10% a 30% de opacidad en el verde de fondo, mismo criterio que la card exterior.
- **`cloneRailForShare()` reescrito**: antes recortaba con `overflow:hidden` + replicar el `scrollLeft` del riel real, lo que dejaba el último pill/tab cortado a la mitad. Ahora se queda solo con los ítems completamente visibles en el riel real (mismo scroll que ya tiene en pantalla) y descarta el resto — nunca un ítem a medias. Nueva función auxiliar `pairedFlexItems()` resuelve los ítems reales del flex recorriendo el nodo VIVO y el clon en paralelo por posición: `#week-rail` mete los pills adentro de un `#week-pills{display:contents}`, y `getComputedStyle` sobre un clon todavía fuera del DOM no siempre resuelve `display:contents` bien — de ahí el primer intento (`flexItems()` mirando el clon directamente) fallara con "Cannot read properties of undefined" al perder la cuenta de cuántos ítems había.
- **Bug encontrado y corregido en la misma reescritura**: la primera versión medía cada ítem con `offsetLeft`/`offsetWidth`, pero ni `.week-rail` ni `.day-rack` tienen `position:relative` — `offsetLeft` quedaba medido contra el offsetParent real (algún ancestro más arriba), no contra el riel, con un sesgo fijo para todos los ítems. En vivo esto hizo perder el tab "VIE" del riel de días (5º de 5, calculado 14px "de más" por el sesgo). Reemplazado por `getBoundingClientRect()` de cada ítem contra el propio riel, que da coordenadas de viewport reales sin ese problema.
- **`.day-rack` reparte 100% del ancho dinámicamente** (`{ stretch: true }` en `cloneRailForShare`, pisa el `flex:0 0 calc((100% - 24px) / 5)` fijo de `.day-tab` con `flex:1 1 0` inline en cada tab que sobrevive al recorte) — antes asumía siempre exactamente 5 tabs; ahora sea cual sea la cantidad que entre (probado con 5 normal y con 5 después de scrollear a sáb/dom), llenan el 100% del riel sin dejar espacio muerto.

## [1.42.0] - 2026-08-14 — Resumen semanal: card sólida ("patrón Strava") en vez de fondo transparente

### En la app: Resumen semanal: card sólida en vez de fondo transparente

- El PNG que se copia al portapapeles ("Copiar resumen de la semana") ahora es una sola card sólida y redondeada, no un fondo transparente — se veía mal sobre una foto real al compartir en redes, porque el título y los labels sueltos quedaban sin nada detrás.

### Changed

- **`.dashboard-share` pasa a ser una card sólida y redondeada** (`background:var(--bg)`, `border:1px solid var(--line)`, `border-radius:22px`) en vez de fondo transparente. Motivo: probado en real compartiendo a redes sociales, el fondo transparente solo se ve bien sobre una superficie oscura y uniforme (un chat) — sobre una foto real, todo lo que no fuera una card interna (título "BITÁCORA", "Registro de entrenamiento", labels de los day-tabs, el borde de "+ Nueva semana") no tenía fondo propio y quedaba prácticamente ilegible.
- **Se probó `box-shadow` primero** (card flotando con sombra difusa, un wrap exterior transparente con padding para que la sombra tuviera espacio) pero se descartó: comprobado leyendo el PNG resultante píxel a píxel, html2canvas 1.4.1 no renderiza `box-shadow` en absoluto — el corte entre la card y el resto queda en alpha 0 sin ningún degradé, no hay sombra que mostrar. Un borde de 1px sí se renderiza bien (mismo mecanismo que ya usan `.sum-chip`/`.recap-card`), así que reemplaza a la sombra como señal de "esto es una card flotante".
- `copyElementAsImage()` sigue con `backgroundColor: null` en `html2canvas`, pero ahora solo para que las esquinas redondeadas de la card queden transparentes (si no, html2canvas rellena todo el rectángulo del elemento y las esquinas se ven cuadradas) — ya no para dejar transparente todo el fondo.

## [1.41.0] - 2026-08-14 — Compartir semana: resumen del dashboard, copiado al portapapeles

### En la app: Compartir semana: resumen del dashboard, copiado al portapapeles

- El botón de calendario junto a "Compartir día" ahora captura el mismo bloque que se ve arriba de "Hoy" (racha, riel de semanas, riel de días, resumen y comparación semanal) en vez de una tabla larga con los 7 días.
- La imagen sale en PNG con fondo transparente — solo las cards (pills, tabs, chips, la card de comparación) llevan color sólido.
- Ya no descarga de entrada: la imagen se copia directo al portapapeles, y solo cae a descarga si el navegador no soporta copiar imágenes.
- Corregido: "+ Nueva semana" salía con una caja blanca de más en la imagen (el date picker invisible perdía su estilo al clonar el DOM).

### Changed

- **"Compartir semana completa" reemplazado por "Copiar resumen de la semana"** (mismo ícono de calendario junto a "Compartir día", `data-action="share-dashboard"` en `js/app.js`): antes armaba un contenedor sintético con los 7 días en tablas de ejercicios (`weekShareRowHtml`/`buildWeekShareContainer`); ahora clona el bloque real que se ve arriba de "Hoy" — `header.app-head`, `#week-rail`, `#day-rack`, `.summary-strip` y `#weekly-recap-host` (si tiene datos) — vía `cloneForShare()`/`cloneRailForShare()`/`buildDashboardShareContainer()`. Clonar el DOM real en vez de reconstruir HTML a mano evita que el export se desalinee de lo que la app ya renderiza. Los dos riels horizontales (`week-rail`, `day-rack`) fijan `width`/`overflow:hidden` y replican el `scrollLeft` del elemento real para que el clon recorte exactamente lo mismo que ya se ve en pantalla — el recorte se aplica recién después de insertar el clon en el DOM, porque `scrollLeft` no "pega" antes de eso.
- **Fondo transparente**: `html2canvas(..., { backgroundColor: null })` en vez de `cssVar('--bg')` — como ninguno de los contenedores intermedios (`.app-head`, `.week-rail`, `.day-rack`, `.summary-strip`) tiene fondo propio en `css/styles.css` (solo lo tienen las cards — `.week-pill`, `.day-tab`, `.sum-chip`, `.recap-card`), el PNG resultante queda transparente en todo lo que no sea una card, sin tocar una sola regla de CSS para lograrlo.
- **Copiar al portapapeles en vez de descargar de entrada**: nueva `copyElementAsImage()` usa `navigator.clipboard.write([new ClipboardItem({'image/png': blob})])`; si el navegador no soporta `ClipboardItem` o el usuario niega el permiso, cae al mismo patrón de `<a download>` que ya usaba `shareElementAsImage()` (el compartir de día e Historial no cambia, sigue usando `navigator.share()`/descarga).
- CSS: el bloque `.week-share-*` (7 reglas, pensadas para la tabla de 7 días) se reemplaza por una sola regla `.dashboard-share` (ancho/padding del contenedor) — los nodos clonados conservan sus clases originales, así que heredan todo su estilo de las reglas que ya existían para el header/riel/tira/recap real.

### Fixed

- **"+ Nueva semana" salía con una caja blanca de más en la imagen exportada**: el `<input type="date">` de `#new-week-date` es invisible en la app real gracias a `#new-week-date{opacity:0}` — un selector por `id`. `cloneForShare()` quita los `id` de todo lo que clona (para no dejar ids duplicados dando vueltas mientras el clon vive fuera de pantalla), así que esa regla dejaba de aplicar al clon y el input aparecía con su estilo nativo del navegador. Al no tener ningún valor en una imagen estática (es un control interactivo para elegir fecha), `buildDashboardShareContainer()` ahora lo saca del todo del clon del riel de semanas (`weekRailClone.querySelector('input[type="date"]')?.remove()`) en vez de intentar preservarle el estilo.

### Added (solo desarrollo local)

- **`DEV_AUTOLOGIN`** (constante opcional en `api/config.local.php`, gitignored): salta la pantalla de login en local. Gateado por tres condiciones a la vez en `api/config.php` — `PHP_SAPI === 'cli-server'` (el servidor embebido de `php -S`, nunca lo que corre producción), la constante definida `true`, y `REMOTE_ADDR` en `127.0.0.1`/`::1` — así que no hay forma de que se active accidentalmente fuera de una sesión de `php -S localhost:...`. Auto-loguea al único usuario que existe (`SELECT id FROM users LIMIT 1`), sin tocar `api/login.php` ni el flujo de sesión real.

## [1.40.0] - 2026-08-13 — Horarios de entrenamiento en Perfil

### En la app: Horarios de entrenamiento en Perfil

- Nuevo panel "Horarios de entrenamiento" en Perfil, debajo de Hitos y constancia — sin agregar botón al menú inferior.
- Filtro por año (Todo / años con sesiones registradas) y por mes (Todos / Ene-Dic, combinables entre sí).
- Gráfica de duración por sesión (mismo estilo de línea con puntos que Progreso, con zoom/pan) — con año y mes filtrados a la vez se ven los puntos; si alguno queda en "Todo", la línea se adelgaza y los puntos se ocultan para no saturar la vista.
- Distribución de horas de inicio más frecuentes, como barras horizontales.

### Added

- **Panel "Horarios de entrenamiento"** (Perfil, `#time-stats-host`/`renderTimeStats()` en `js/app.js`): vive debajo de "Hitos y constancia" a propósito — no se agregó botón al `bottom-nav`, que ya tenía sus 6 fijos. Reemplaza los 5 renglones de texto suelto que antes vivían al final de la lista de Hitos (`computeTimeStats()` ya no se llama desde `computeMilestones()`, ahora es standalone).
- **Filtros de año/mes**, independientes entre sí (`timeStatsYear`/`timeStatsMonth`, `null` = "Todo"/"Todos"): el de año lista solo los años que tienen alguna sesión con horario registrado (`collectTimeEntries()`), no todos los años con semanas creadas. El de mes es acumulativo entre años cuando el año está en "Todo" (ej. "Todo" + "Julio" junta todos los julios de cualquier año) — mismo patrón de riel (`.week-rail`/`.week-pill`) que ya usa el heatmap para su filtro de año, delegando el click una sola vez sobre `#time-stats-host` porque `renderTimeStats()` reconstruye el innerHTML en cada render.
- **Gráfica de duración por sesión**: mismo estilo de línea con puntos que Progreso (`prog-canvas`) — tension suave, zoom/pan con `chartjs-plugin-zoom`, doble click resetea. A diferencia de Progreso, los puntos y el grosor de línea son condicionales: con año **y** mes filtrados a la vez (`detailed`) se ven puntos y línea normal; si cualquiera de los dos queda en "Todo"/"Todos" el set puede tener cientos de sesiones, así que la línea se adelgaza (`borderWidth`) y los puntos se ocultan (`pointRadius:0`, quedan solo al hacer hover) para que se lea como tendencia y no como un enjambre de dots.
- **Distribución de horas de inicio** (`computeTimeStats()` ahora recibe el set ya filtrado en vez de recorrer todo `state.weeks`, y devuelve `hourBuckets`): barras horizontales reusando el mismo patrón visual que "Balance por grupo muscular" en Historial (`.balance-row` → `.hour-row`), la hora más frecuente resaltada con `--accent`.

### Nota de diseño

Se probaron y descartaron dos alternativas antes de esta versión: (1) colorear cada punto de la gráfica de duración según su hora de inicio (degradé `--info`→`--accent`) para fusionar ambos gráficos en uno solo — funcionaba pero perdía el ranking numérico por hora; (2) una segunda línea en eje `y1` para la hora de inicio (mismo patrón que el toggle de reps en Progreso) — technically correcto pero el usuario no quedó convencido visualmente. Se volvió a la versión con panel de barras separado.

## [1.39.0] - 2026-08-13 — Heatmap: etiquetas de mes alineadas al corte real

### En la app: Heatmap: etiquetas de mes alineadas al corte real

- Las etiquetas de mes del heatmap anual ahora tienen borde y esquinas redondeadas, igual que las celdas de días.
- La fila donde cambia el mes ya no queda entera de un lado — se reparte 50/50 entre el mes que termina y el que empieza, sin dejar un hueco sin bordear entre los dos.

### Changed

- **Etiquetas de mes del heatmap anual** (`renderHeatmap()`, `js/app.js`): borde de 1px y `border-radius:2px` — mismo lenguaje visual que `.heat-cell`. Pasó por tres iteraciones antes de esta versión final: (1) una fila combinada mostrando los dos meses en una sola caja — rechazada, "no crear una nueva combinando dos meses"; (2) cada fila asignada por mayoría de días a un solo mes, sin partir — dejaba un hueco de una fila entera sin bordear entre un mes y el siguiente (ninguno de los dos la reclamaba); (3) intento de recorte con `position:absolute` + `getBoundingClientRect()` — frágil de verdad, no cosmético: se rompía si `renderHeatmap()` corría con la vista todavía oculta (`display:none` devuelve rects en 0) y además corromper la medición de un label al pasar a absoluto a los anteriores en el mismo loop.
- **Solución final, sin medir nada en JS**: el grid usa 3 "fine-rows" por semana real (mitad de arriba / mitad de abajo / separador fijo de 3px) en vez de una fila + gap uniforme. Cada `.heat-cell` ocupa sus 2 mitades (`grid-row: N / span 2`), saltándose el separador. Cada mes arranca/termina en la línea del medio de su fila de transición con el vecino (`seamRow[mes]` en `renderHeatmap()`) — esa misma línea es a la vez el fin de un mes y el arranque del siguiente, así que los bordes coinciden exacto y el separador de 3px queda reservado solo para semanas realmente distintas, nunca entre las dos mitades de una fila compartida.

## [1.38.0] - 2026-08-13 — Reordenar ejercicios, exportar semana, zoom en Progreso y más

### En la app: Reordenar ejercicios, exportar semana, zoom en Progreso y más

- Reordenar ejercicios arrastrando dentro de un día (handle dedicado, mouse y touch).
- Nuevo botón "Compartir semana completa" junto al de compartir día, con los 7 días en una sola imagen.
- Zoom y pan en el gráfico de Progreso (rueda, pellizco o arrastre) — doble click/tap para volver al zoom original.
- El heatmap anual ahora tiene etiquetas de mes al costado y sus celdas son clickeables (te llevan directo a ese día).
- Ir a un día desde Calendario o Historial ahora centra el riel de semanas en la semana correcta.
- "Nueva semana" ya no deja crear más de una semana hacia el futuro.
- Botón "Eliminar esta semana" al final de "Hoy", con doble confirmación antes de borrar.

### Added

- **Reordenar ejercicios arrastrando** (`.ex-drag-handle` en cada fila): Pointer Events (mouse+touch en un solo código), técnica de placeholder — la fila arrastrada pasa a `position:fixed` y sigue al puntero, un div vacío del mismo alto ocupa su lugar en el flujo y se mueve entre los demás según qué punto medio cruza el puntero. Al soltar, persiste vía `POST api/exercises.php?action=reorder` (`{monday_date, day_key, order:[ids...]}`), que valida que el set de IDs recibido coincida exactamente con los ejercicios de ese día antes de tocar `sort_order`.
- **"Compartir semana completa"** (botón junto a "Compartir día"): arma un contenedor fuera de pantalla con los 7 días (nombre/kg/rep/ser, sin inputs ni botones — nada editable tiene sentido en una imagen) y lo captura con el mismo `shareElementAsImage()`/html2canvas que ya usan día e Historial. Sin librería nueva (nada de jsPDF): una imagen larga cubre el pedido.
- **Zoom/pan en el gráfico de Progreso**: `chartjs-plugin-zoom` vía CDN (mismo criterio que Chart.js/html2canvas), rueda/pellizco/arrastre en el eje X, doble click o doble tap resetea. Plugin opt-in por gráfico — no afecta las sparklines del mini-dashboard.
- **Heatmap anual**: celdas clickeables (mismo `goToDate()` que ahora comparten Calendario, Historial y el heatmap — también corrige que el riel de semanas quedara sin centrar la semana correcta al navegar desde esos dos) y etiquetas de mes verticales al costado (columna extra en el mismo grid, `grid-row: span N` agrupando filas seguidas del mismo mes).
- **"Nueva semana" limitada a 1 semana en el futuro**: validado en el date picker (client) y en `api/weeks.php` `POST` (server, espejado por si se pega el POST directo).
- **Botón "Eliminar esta semana"** al final de "Hoy", con doble confirmación (`deleteWeek(key, {doubleConfirm:true})`) — la X chica del riel de semanas se queda con su confirmación simple de siempre.

## [1.37.0] - 2026-08-13 — Hora de inicio, fin y duración por día

### En la app: Hora de inicio, fin y duración por día

- Nueva card "Iniciar/Finalizar entrenamiento" debajo del panel del día: un botón guarda la hora actual al arrancar y al terminar, y calcula la duración solo.
- Hora de inicio y fin también se pueden corregir a mano — útil para cargar un horario importado de Garmin.
- Exportar/Importar datos ahora incluye estos horarios por día (compatible con backups viejos, que no los tenían).

### Added

- **Tabla `week_day_sessions`** (`api/db/schema.sql`): hora de inicio/fin y duración de un día puntual, una fila por semana+día, sin fila = sin horario registrado. `duration_min` es independiente de `end_time - start_time` a propósito — puede venir de un backfill de Garmin con su propio cálculo, o editarse a mano sin tocar las horas.
- **Card "Iniciar/Finalizar entrenamiento"** (`#day-session-panel`, debajo del panel del día): un botón cuyo label se deriva del estado (`start_time` sin `end_time` → "Finalizar", cualquier otro caso → "Iniciar") guarda la hora actual en cada tap vía `api/weeks.php` `PUT` (mismo endpoint que ya usaba la nota semanal, extendido con `day_key`/`start_time`/`end_time`/`duration_min`). Los inputs de hora inicio/fin quedan editables a mano (autoguardan al perder foco, recalculando duración) para corregir o cargar un horario importado de Garmin; duración es de solo lectura, formateada "Xh Ym".
- **`api/import.php`** acepta ahora dos formas por día: la lista plana de siempre (backups viejos) u un objeto `{exercises, start_time?, end_time?, duration_min?}` — se distinguen por la presencia de la clave `exercises`. `api/db/backup_export.php` y `buildExportPayload()` (`js/app.js`) ya exportan la forma nueva.

### Pendiente

- El bloque `CREATE TABLE IF NOT EXISTS week_day_sessions` queda en el README, sección "Pendiente de correr en producción", a la espera del próximo deploy manual vía phpMyAdmin.
- `migrate_day.php` no mueve horarios al migrar un día a propósito — mover ejercicios a otro día no implica que se haya entrenado a esa hora.

## [1.36.0] - 2026-08-13 — Badge de racha a un costado, recap hasta hoy, reps solo sin comparar

### En la app: Badge de racha a un costado, recap hasta hoy, reps solo sin comparar

- El badge de racha se mueve al costado del número, en vez de arriba.
- El recap semanal ahora compara "hasta hoy" contra la semana pasada, no la semana completa contra una a medio andar.
- La línea de reps en Progreso ya no aparece al comparar dos ejercicios.

### Changed

- **Badge de racha**: pasa de arriba del número a un costado izquierdo, verticalmente centrado junto a "N días" + "racha actual" (`.streak` de columna a fila) — a pedido del usuario viendo una captura, quedaba muy separado del texto apilado arriba.
- **Recap semanal** (`renderWeeklyRecap()`): cuando la semana activa es la semana en curso, la comparación contra la semana pasada se recorta al mismo día de la semana que hoy (ej. si hoy es miércoles, ambas semanas se miden lun-mié) en vez de comparar una semana a medio andar contra una ya cerrada completa — eso hacía que la semana actual siempre se viera "peor" aunque fuera solo cuestión de tiempo. Domingo recorta a sábado (semana ya cerrada, el gimnasio no abre ese día). Una semana pasada ya terminada se sigue comparando completa (lun-sáb), porque ahí no hay nada a medio registrar. El título de la card indica el corte cuando aplica (ej. "Esta semana vs. la pasada (hasta Miércoles)").
- **Línea de reps en Progreso**: ya no se agrega cuando hay un segundo ejercicio en comparación — mostrar reps de un ejercicio junto al kg de otro no tenía lectura clara. El toggle de reps se deshabilita visualmente mientras haya una comparación activa.

### Pendiente

- **Comparar 2 ejercicios con peso y repeticiones**: hoy la línea de reps y el modo comparar son mutuamente excluyentes (ver arriba) — falta diseñar cómo mostrar ambas métricas de dos ejercicios a la vez sin saturar el gráfico (¿reps de los dos en el mismo eje `y1`? ¿solo del primario? ¿un toggle por ejercicio?).

## [1.35.0] - 2026-08-12 — Progreso: comparar ejercicios, línea de reps, mini-dashboard

### En la app: Progreso: comparar ejercicios, línea de reps, mini-dashboard

- Nuevo buscador "Comparar con…" en Progreso para ver dos ejercicios superpuestos en el mismo gráfico.
- Toggle para agregar una línea de repeticiones (azul) al gráfico de un ejercicio.
- Cuando no hay ningún ejercicio buscado, ahora se ve un mini-dashboard con la tendencia de todos los ejercicios de tu librería que tienen historial.

### Added

- **Comparar dos ejercicios a la vez** en Progreso: segundo buscador opcional ("Comparar con…") que superpone una segunda línea (verde, `--ok`) sobre el mismo gráfico. Dos ejercicios rara vez se entrenaron los mismos días, así que el eje X se arma con la unión de fechas de ambos históricos (`buildUnifiedIsoDates()`, ordenada por ISO — `YYYY-MM-DD` ordena igual como string que como fecha) y cada dataset se alinea contra ese eje con `null` en los huecos (`alignField()`/`alignPoints()`); `spanGaps:true` conecta la línea saltando esos huecos en vez de cortarla. La leyenda de Chart.js, oculta hasta ahora por haber una sola serie, se activa sola cuando hay más de un dataset.
- **Línea de repeticiones** (azul, nuevo token `--info`) en el mismo gráfico, activable con un toggle nuevo junto al buscador — vive en un eje derecho propio (`y1`, sin grid propia para no ensuciar el gráfico) ya que las reps y los kg no comparten escala. El toggle es pegajoso entre búsquedas (se mantiene activado al cambiar de ejercicio) a pedido del usuario; se resetea junto con la comparación solo al saltar a Progreso desde el botón "Ver progreso" de otro ejercicio (`goToProgress()`).
- **Mini-dashboard**: cuando no hay ningún ejercicio buscado, en vez del placeholder vacío de siempre se muestra un grid de sparklines (una por ejercicio de la librería que tiene al menos un registro marcado como hecho — intersección librería∩historial, no unión), ordenadas por entrenado-más-reciente-primero, con un ícono de tendencia (sube/baja/plano) y el último kg registrado. Tocar una tarjeta carga ese ejercicio en el detalle de siempre.

`renderProgreso()` pasa de una única función a un dispatcher (`renderProgDetail()` / `renderProgDashboard()`) que primero destruye **todas** las instancias de Chart.js vivas — la única de detalle (`progChart`) y las N del mini-dashboard (`progSparkCharts`, un arreglo nuevo) — antes de decidir qué modo dibujar, para no filtrar canvases al alternar entre ambos. Con un solo ejercicio y sin reps activadas, el tooltip sale con el texto idéntico al de antes (sin prefijo de nombre) — la lógica de comparación/reps es aditiva, no cambia el caso por defecto.

## [1.34.0] - 2026-08-12 — Recap semanal en "Hoy"

### En la app: Recap semanal en "Hoy"

- Nueva card que compara el volumen y la adherencia de esta semana contra la semana pasada.

### Added

- **Recap semanal**: card nueva debajo de la tira de resumen de "Hoy" que compara volumen (kg×reps×series, `computeWeekVolume()` — suma `computeDayVolume()` de lun a sáb sin tocar esa función) y adherencia (días cumplidos sobre días con contenido, `computeWeekAdherence()`) de la semana activa contra la semana calendario inmediatamente anterior. Solo se muestra cuando esa semana anterior existe y es realmente adyacente — el lunes cae exactamente 7 días antes, no solo la entrada previa en `state.order` (que puede saltar un hueco de meses sin ninguna semana creada, típico del histórico importado de Garmin) — si no, la card se oculta en vez de comparar contra una semana que no es realmente "la pasada".

## [1.33.0] - 2026-08-12 — Buscar por ejercicio en Historial

### En la app: Buscar por ejercicio en Historial

- Nuevo buscador en Historial para filtrar las semanas por nombre de ejercicio, combinable con el filtro de mes.

### Added

- **Buscador de ejercicio** en Historial (reutiliza la clase `.prog-search`, mismo look que el de Progreso): filtra las tarjetas de semana por nombre, combinado en AND con el filtro de mes ya existente. El panel de balance por grupo muscular hereda el filtro combinado automáticamente, sin tocarlo, porque ya consumía el mismo arreglo `keys` que ahora sale filtrado también por búsqueda. Mensaje de "sin resultados" diferenciado según si el vacío es por el mes elegido o por la búsqueda.

## [1.32.0] - 2026-08-12 — Badges de racha (7/30/100 días)

### En la app: Badges de racha (7/30/100 días)

- Nuevos íconos de bronce/plata/oro junto a la racha actual del header al llegar a 7, 30 y 100 días.

### Added

- **Badges de racha** junto al número de racha actual del header: bronce a partir de 7 días, plata desde 30, oro desde 100 — reutiliza los mismos íconos/colores (`fa-medal`/`fa-trophy`, `.milestone-ico.gold/.silver/.bronze`) que ya usa el medallero de "Tus periodos de mayor constancia" en Hitos. A pedido del usuario, se muestran **todos** los tiers alcanzados a la vez (ej. a los 120 días se ven bronce+plata+oro juntos), no solo el más alto — distinto del medallero de Hitos, que sí es exclusivo por ranking. `computeStreakDetail()`/`computeStreaks()` no se tocan; `renderStreakBadges()` es puramente de presentación sobre el `current` ya calculado.

## [1.31.0] - 2026-08-12 — Snackbar "Deshacer" al borrar un ejercicio

### En la app: Deshacer al borrar un ejercicio

- Borrar un ejercicio ya no pide confirmación — se borra al toque y aparece un botón "Deshacer" por 5 segundos antes de confirmarlo de verdad.

### Added

- **Deshacer borrado de ejercicio**: `deleteExercise()` deja de mostrar un `confirm()` bloqueante — el ejercicio desaparece de la UI de inmediato y la llamada real al servidor se difiere 5 segundos, ventana durante la cual un toast con botón "Deshacer" permite restaurarlo en su posición original sin haber tocado la base todavía. Si se deja pasar el tiempo sin tocar nada, se confirma solo contra el mismo `Api.del(...)` de siempre — la cola offline (`js/offline-queue.js`) lo sigue cubriendo igual si no hay red en ese momento. Alcance acotado a `deleteExercise` — `deleteWeek` y el borrado de la librería de ejercicios se quedan con `confirm()`, por ser borrados de mayor impacto.
- `showToast(msg, opts)` gana un segundo parámetro opcional (`actionLabel`/`onAction`/`duration`), retrocompatible con los ~15 sitios existentes que la llaman con un string plano.

### Changed

- Solo se permite **un borrado pendiente de undo a la vez**: si se borra un segundo ejercicio mientras el primero todavía espera su ventana de 5s, ese primero se confirma de inmediato en vez de encolarse o perderse en silencio. `deleteWeek()` y `applyWeekDetail()` (esta última compartida por "Migrar día", crear semana e importar — reemplaza `state.weeks[key]` por completo) asientan cualquier undo pendiente antes de reemplazar/eliminar el objeto de semana del que ese borrado podría depender, para no resucitar un ejercicio en un día ya reemplazado o huérfano.

## [1.30.0] - 2026-08-12 — Carga inicial en una sola petición

### En la app: Carga inicial en una sola petición

- La app arrancaba pidiendo cada semana en una petición HTTP aparte, todas al mismo tiempo — en cuentas con muchas semanas eso disparaba decenas de peticiones simultáneas. Ahora se traen todas juntas en un solo pedido.

### Fixed

- **Bug real encontrado en producción**: `loadAppData()` pedía cada semana con una petición HTTP separada (`Promise.all(state.order.map(key => Api.get(...)))`) — con las semanas suficientes de una cuenta real, eso disparaba decenas de peticiones simultáneas al loguearse. En el hosting compartido de producción eso agotó el cupo de procesos PHP y/o el lock del archivo de sesión, produciendo una mezcla de `504 Gateway Timeout` y `401 Unauthorized` (una sesión recién creada dejando de reconocerse en medio de la ráfaga) — el usuario podía loguearse pero no veía sus datos, y a veces la sesión se caía sola. No pasaba en local (73 semanas alcanzaban para notarlo recién en producción, con probablemente más semanas y menos cupo de procesos que en desarrollo).
- **Nueva `fetch_all_weeks_detail()`** (`api/week_helpers.php`): arma el detalle de **todas** las semanas en 4 queries totales (semanas+notas, day_templates, todos los overrides, todos los ejercicios — agrupados en PHP por `week_id`) en vez de las 3 queries por semana que hacía `fetch_week_detail()` repetida N veces. `api/weeks.php` sin `?date` ahora devuelve `{ order: [...], weeks: { [monday_date]: detalle } }` (antes devolvía solo la lista de fechas) — el frontend pasa de N+1 peticiones a **una sola** para toda la carga inicial. `fetch_week_detail()` (para una semana puntual) no se tocó, se sigue usando en crear/copiar/actualizar-nota semana.

## [1.29.0] - 2026-08-12 — Más espacio entre "Ver progreso" y "Semana pasada"

### En la app: Más espacio entre "Ver progreso" y "Semana pasada"

- El label "Semana pasada:" del detalle expandido deja de quedar pegado al botón "Ver progreso" — ahora se reparte el espacio disponible entre los dos.

### Changed

- `.ex-detail-head-left` pasa de `gap:10px` a `justify-content:space-between` — el botón "Ver progreso" y el label "Semana pasada:" quedaban muy pegados entre sí (a pedido del usuario viendo una captura); ahora se reparten el ancho disponible de las columnas 1-2 del grid en vez de agruparse al principio.

## [1.28.0] - 2026-08-12 — Label "Semana pasada" en dos líneas

### En la app: Label "Semana pasada" en dos líneas

- El label "Semana pasada:" del detalle expandido pasa a "Semana / pasada:" en dos líneas, para ocupar menos ancho junto al botón "Ver progreso".

### Changed

- `.ex-detail-label` ("Semana pasada:") pasa a ocupar dos líneas (`Semana<br>pasada:`) en vez de una sola forzada con `white-space:nowrap` — libera ancho horizontal junto al botón "Ver progreso" dentro de `.ex-detail-head-left` (columnas 1-2 del grid alineado con `.ex-row`, ver 1.27.0).

## [1.27.0] - 2026-08-12 — Detalle de un ejercicio alineado con la fila

### En la app: Detalle de un ejercicio alineado con la fila

- Los valores de "semana pasada" (Kg/Rep/Ser) ahora quedan exactamente debajo de las columnas Kg/Rep/Ser de la fila del ejercicio, en vez de con su propio espaciado suelto.

### Changed

- `.ex-detail` pasa de un `flex` con su propio espaciado a usar el mismo `grid-template-columns` que `.ex-row` (`22px 1fr 38px 30px 30px 18px 18px`, mismo `gap` y mismo padding horizontal de 12px) — así el grid de "semana pasada" (Kg/Rep/Ser) queda exactamente debajo de las columnas Kg/Rep/Ser de la fila del ejercicio arriba, en vez de con un espaciado (`gap:18px`) que no correspondía a los anchos reales de esas columnas. `.ex-detail-head-left` (botón "Ver progreso" + label "Semana pasada:") ocupa las columnas 1-2 (check + nombre) de esa misma fila del grid; `.ex-detail-suggestion` sigue como fila aparte, ahora expandida a todo el ancho (`grid-column:1/-1`). Verificado con `getBoundingClientRect()` que los tres pares de columnas (kg, rep, ser) coinciden en píxeles exactos entre la fila y el detalle.

## [1.26.0] - 2026-08-12 — Heatmap anual sin rojo

### En la app: Heatmap anual sin rojo

- El heatmap anual deja de pintar rojo — un día sin pintar ya se lee como "no cumplido", sin necesitar un color de más entre 365 celdas.

### Changed

- El heatmap anual deja de pintar `tier-red` — se saca el downgrade condicional de 1.24.0 (que solo lo sacaba para días sin datos) y pasa a ser incondicional: ningún día se pinta rojo ahí, a pedido explícito del usuario viendo una captura del heatmap real. `dayHasExercises()` (usada solo para ese downgrade condicional) queda sin uso y se elimina junto con `.heat-cell.tier-red` en CSS. Calendario (vista de mes) no se toca — sigue mostrando "Sin actividad" en rojo, que es donde ese estado sí se pidió mantener.

## [1.25.0] - 2026-08-12 — Detalle de un ejercicio: todo en una fila

### En la app: Detalle de un ejercicio: todo en una fila

- "Ver progreso", "Semana pasada:" y los valores Kg/Rep/Ser vuelven a quedar en una sola fila (como pidió el usuario viendo una captura) en vez de apilados verticalmente.

### Changed

- El apilado vertical de 1.24.0 (botón, label, grid cada uno en su propia línea) no era lo que se pidió — el usuario lo aclaró con una captura: quería los tres en una sola fila, con el grid alineado a la derecha, como estaba de hecho más cerca del diseño original. Reestructurado con dos contenedores flex anidados: `.ex-detail-head` (fila completa, `justify-content:space-between`) con `.ex-detail-head-left` (botón + label, agrupados con poco espacio entre sí) a la izquierda y `.ex-detail-grid` a la derecha. Mismo cambio en la rama "sin datos de la semana pasada" (mensaje + botón en la misma fila). Verificado con capturas de pantalla que coincide con lo pedido, y que Calendario (que comparte `computeDayTier()` con el heatmap) no se vio afectado por el ajuste del heatmap de la versión anterior.

## [1.24.0] - 2026-08-12 — Ajustes al heatmap y al detalle de un ejercicio

### En la app: Ajustes al heatmap y al detalle de un ejercicio

- El heatmap anual ya no pinta rojo un día sin ningún ejercicio registrado — el rojo queda solo para cuando sí hubo ejercicios pero ninguno se marcó.
- En el detalle expandido de un ejercicio, "Ver progreso" pasa a estar primero, arriba del label "Semana pasada:".

### Changed

- **Heatmap anual**: `computeDayTier()` (compartido con Calendario) trata "0 ejercicios registrados" y "ejercicios registrados pero ninguno marcado" igual — ambos devuelven `tier-red`, porque en la vista de mes un día lun-vie vacío sí cuenta como "debía entrenar y no lo hizo". El heatmap necesita distinguirlos: un día realmente sin datos no debería pintarse igual que un día fallado. Nuevo helper `dayHasExercises(date)` y un downgrade puntual en `renderHeatmap()` (`tier-red` → sin pintar cuando ese día no tiene ningún ejercicio registrado) — sin tocar `computeDayTier()` ni la vista de mes, que se queda con su comportamiento de siempre. Verificado que 20 celdas que antes salían rojas (sin datos) ahora quedan sin pintar, mientras Calendario (mismo período) sigue mostrando esos mismos días en rojo sin cambios.
- **Detalle expandido de un ejercicio**: el botón "Ver progreso" pasa a ir primero (antes del label), seguido de "Semana pasada:" (con dos puntos, antes sin) y recién después el grid de comparación — se quita el contenedor `.ex-detail-head` que los ponía lado a lado.

## [1.23.0] - 2026-08-12 — Protección contra fuerza bruta en login

### En la app: Protección contra fuerza bruta en login

- 5 intentos fallidos seguidos bloquean el login 15 minutos — antes no había ningún límite.

### Added

- **Bloqueo tras intentos fallidos** en `api/login.php`: 5 intentos con contraseña incorrecta bloquean la cuenta 15 minutos (`LOGIN_MAX_ATTEMPTS`/`LOGIN_LOCKOUT_MINUTES`, constantes en el propio archivo). Nuevas columnas `users.failed_attempts`/`users.locked_until` (`ALTER TABLE`, ver README → "Pendiente de correr en producción"). Sin tracking de IP a propósito — hay una sola cuenta posible de todos modos (`api/config.php` ya documenta que la app prioriza simplicidad por ser de un solo usuario), así que un contador por cuenta cubre el riesgo real de la app estando expuesta públicamente. `is_locked` se calcula en la misma consulta con el `NOW()` de MySQL (`locked_until IS NOT NULL AND locked_until > NOW()`) en vez de comparar después contra un timestamp re-parseado por PHP — el mismo desfase de zona horaria PHP-vs-MySQL que ya causó un bug real en el last-write-wins de la edición offline (1.14.0) aplicaría igual acá si se comparara del lado de PHP. Login con usuario inexistente sigue respondiendo el mismo mensaje/status que contraseña incorrecta, sin tocar la base (no hay fila que actualizar), para no revelar si la cuenta existe. Usa status `429` en vez de `401` a propósito, para no disparar el flujo de "sesión expirada" que `js/api.js` ya engancha específicamente a 401.

  **Bug real encontrado y corregido durante la verificación**: la condición del `UPDATE` comparaba `failed_attempts + 1 >= :max` dentro del mismo `CASE` que ya reasigna `failed_attempts = failed_attempts + 1` — pero MySQL evalúa las asignaciones de un `SET` de izquierda a derecha, así que para cuando el `CASE` lee `failed_attempts` ya ve el valor **nuevo** (post-incremento), no el viejo. Sumarle 1 de nuevo disparaba el bloqueo un intento antes de lo esperado (al 4to intento en vez del 5to) — encontrado corriendo el flujo real de 5 intentos fallidos seguidos contra la BD local y viendo que el bloqueo llegaba antes de tiempo. Corregido comparando `failed_attempts >= :max` directo, ya que esa referencia dentro del `CASE` ya es el valor post-incremento. Verificado de nuevo con el flujo completo (intentos 1-5 en 401, 6to en 429) y confirmado que un reset manual de `failed_attempts`/`locked_until` (mismo `UPDATE` que corre login.php en el branch de éxito) desbloquea la cuenta de inmediato. Estado de la cuenta real revertido a `failed_attempts=0, locked_until=NULL` al terminar.

## [1.22.0] - 2026-08-12 — Backups descargables desde Perfil

### En la app: Backups descargables desde Perfil

- Nuevo panel en Perfil que lista los backups automáticos del servidor con fecha y tamaño, cada uno descargable con un click — antes había que bajarlos por FTP.

### Added

- **Pantalla de backups** en Perfil: nuevo endpoint `api/backups.php` (autenticado, `require_login()` igual que el resto de la API) con dos acciones — sin parámetros (o `?action=list`) lista los backups de `api/db/backups/` (`glob('backup-*.json')`, orden descendente por nombre, que ya es cronológico) devolviendo fecha y tamaño vía el `respond_ok()` de siempre; `?action=download&file=<nombre>` sirve el archivo crudo con `Content-Disposition: attachment`, saltándose el sobre `{ok,data}` porque acá el cliente necesita el JSON tal cual, no envuelto — por eso la descarga va por un `<a href>` normal en vez de por `Api.get()` (que siempre espera `{ok,data}`). El nombre de archivo se valida contra el mismo patrón exacto que genera `backup_export.php` antes de tocar el filesystem, para no abrir una ruta de path traversal siendo el único dato que manda el cliente en este endpoint — verificado que `../../config.local.php` y nombres con caracteres extra devuelven 422 en vez de leer nada. El `.htaccess` (`Require all denied`) de `api/db/backups/` sigue intacto — este endpoint vive fuera de esa carpeta y lee los archivos del lado del servidor, no depende de acceso directo por navegador a esa ruta. Verificado también que list y download devuelven 401 sin sesión. Cierra el hueco que ya documentaba el README ("bajarlos requiere FTP, no hay pantalla en la app para eso todavía").

## [1.21.0] - 2026-08-12 — Botón "Ver progreso" en el detalle de un ejercicio

### En la app: Botón Ver progreso en el detalle de un ejercicio

- Al expandir un ejercicio en "Hoy" (chevron de "semana pasada"), un botón nuevo "Ver progreso" te lleva directo a la gráfica de ese ejercicio en Progreso, con el buscador ya cargado.

### Added

- **"Ver progreso"** en el detalle expandido de un ejercicio (`exerciseRowHtml()`, `js/app.js`): botón nuevo al lado del label "Semana pasada" (o del mensaje "Sin datos..." cuando no hay comparación previa — aparece en las dos ramas del detalle, ya que Progreso no depende de tener datos de la semana pasada) que navega directo a la vista Progreso con ese ejercicio cargado en el buscador (`goToProgress()`, nuevo). El nombre del ejercicio viaja en un `data-name` en el propio botón en vez de buscarse subiendo por el DOM, porque el detalle expandido (`.ex-detail`) se renderiza como hermano de la fila (`.ex-row`), no como hijo — un `.closest('.ex-row')` desde dentro del detalle no lo encuentra. **Orden de llamadas importa**: `switchToView('progreso')` se llama antes de `renderProgreso()`, al revés del patrón que usa el resto de la navegación de la app (`renderAll(); switchToView(...)`) — acá sí importa porque `renderProgreso()` dibuja un gráfico de Chart.js sobre un `<canvas>` que mide 0×0 mientras su vista está oculta (`.view{display:none}`), así que dibujarlo antes de mostrar la vista lo dejaría deforme. Verificado con un ejercicio real (con historial) y uno de prueba sin historial previo, ambas ramas cargan el gráfico correctamente.

## [1.20.0] - 2026-08-12 — Heatmap anual con niveles rojo/amarillo/verde

### En la app: Heatmap anual con niveles rojo/amarillo/verde

- El heatmap anual de Calendario ya no solo pinta verde: ahora usa el mismo criterio rojo/amarillo/verde que la vista de mes, así que se ven también los días fallados y los flojos, no solo los cumplidos.

### Changed

- **Heatmap anual** (Calendario): pasa de pintar un único tono (verde en los días cumplidos, gris/transparente en el resto) a usar `computeDayTier()` — la misma función que ya pinta rojo/amarillo/verde en la vista de mes (0 ejercicios marcados / 1–5 / 6+) — en vez de derivar un booleano "completado" desde `buildChronoDays()`. Antes un día fallado y un día sin semana creada se veían exactamente igual (ambos sin pintar); ahora se distinguen: rojo si hubo semana pero 0 ejercicios marcados, sin pintar si directamente no había semana esa fecha. Mismos 3 tokens de color que ya usaba Calendario (`--danger`/`--pending`/`--ok`), sin agregar ninguno nuevo. Verificado que los colores del heatmap coinciden pixel a pixel con los de la vista de mes para el mismo criterio.

## [1.19.0] - 2026-08-12 — Auto-bump de caché del service worker

### En la app: Auto-bump de caché del service worker

- Ya no hace falta acordarse de subir el número de caché de la PWA a mano en cada cambio — se recalcula solo a partir del contenido, así que un navegador con la app instalada siempre agarra la versión nueva.

### Added

- **Auto-bump de `CACHE_NAME`**: nuevo `scripts/bump-sw-cache.php`, corrido automáticamente por un hook de git (`.githooks/pre-commit`) en cada commit — hashea el contenido de `index.html`, `css/styles.css`, `js/app.js`, `js/api.js` y `js/offline-queue.js` (`sha1`, primeros 10 caracteres) y reescribe `CACHE_NAME` en `sw.js` (`bitacora-shell-<hash>`) solo si alguno de esos archivos cambió respecto al último bump — un commit que no toca el app shell no vuelve a tocar `sw.js`. Reemplaza el bump manual (`v2` → `v15` a mano en 15+ commits), que el propio equipo se olvidó de hacer varias veces durante el desarrollo, dejando navegadores con la PWA instalada sirviendo el shell viejo desde caché sin avisar. Requiere activar el hook una sola vez por clon del repo: `git config core.hooksPath .githooks` (documentado en el README). Sin dependencias nuevas — usa PHP CLI, que el proyecto ya requiere para correr localmente; no se introdujo Node/npm solo para esto.

## [1.18.0] - 2026-08-12 — Menor constancia por días reales

### En la app: Menor constancia por días reales

- Los períodos de "menor constancia" ahora se miden en días reales entre un entrenamiento y el siguiente, no en semanas — más precisos, sin fechas repetidas raras.
- "Hueco más largo sin entrenar" ahora muestra el año.
- Se quita la regla "Días/semana máximos para semana floja" de Ajustes — ya no se usa.

### Changed

- **Menor constancia** deja de medirse en semanas y pasa a medirse en días reales entre un entrenamiento y el siguiente — mismo cálculo que ya usaba "Hueco más largo sin entrenar" (`maxGapDays`), pero quedándose con los 3 huecos más grandes en vez de uno solo, en vez de la aproximación semanal anterior (correr `findRuns()` sobre semanas con ≤1 día cumplido). Encontrado revisando un caso real: un hueco de ~4 meses (6 ene – 28 abr 2025) se mostraba como "Enero 2025" con el mismo día de inicio y fin repetido, porque el cálculo anterior caía a un día suelto marcado como hecho en medio del hueco en vez de a los bordes reales del tramo. Ahora los bordes son directamente el último día entrenado antes del hueco y el primero después, sin ambigüedad. Umbral mínimo para aparecer en la lista: `milestone_min_run_weeks × 7` días (reutiliza la regla existente en vez de sumar una nueva). "Mayor constancia" no cambia — ahí sí tiene sentido seguir midiendo en semanas buenas seguidas. La regla `milestone_weak_max` ("Días/semana máximos para contar como semana floja en Hitos") queda sin uso con este cambio y se elimina de Ajustes, `RULES` y `api/settings.php` — un valor viejo guardado para esa clave en `app_settings` (si lo hubiera) queda huérfano e inofensivo, nunca se vuelve a leer.
- `fmtShortDateRange()` (nuevo) agrega el año a "Hueco más largo sin entrenar" y "Mejor racha" — antes mostraban fechas sin año (ej. "4 ene – 24 sep" / "13 abr – 5 jun"), ahora "4 ene – 24 sep 2024" / "13 abr – 5 jun 2026" (o ambos años si el rango cruza un cambio de año).

## [1.17.0] - 2026-08-12 — Racha e Hitos: huecos reales

### En la app: Racha e Hitos: huecos reales

- Un mes entero sin ninguna semana creada ahora cuenta como "0 días cumplidos" en vez de quedar invisible — Hitos ya muestra los huecos reales de meses, no solo huecos chicos entre semanas que sí existían.

### Changed

- **Racha e Hitos**: `computeStreakDetail()` y `computeMilestones()` caminaban solo las semanas que existen como fila en `weeks` — una semana sin fila (mes entero sin crear ninguna, típico del histórico importado de Garmin 2022-2025) quedaba invisible en vez de contar como "0 días cumplidos". Nuevo helper `fullWeekRange()` genera todas las claves de semana desde la primera con datos hasta hoy sin saltos; una semana faltante ahora se trata igual que una semana con 0 días. Efecto: "menor constancia" pasa de reportar huecos de 2-3 semanas a los huecos reales de varios meses (ej. "Enero a Septiembre 2024 — 37 semanas", que coincide con el hueco visible en el heatmap anual); "mayor constancia" ya no puede puentear dos semanas activas separadas por meses de nada como si fueran consecutivas. "Mejor racha" no cambió con los datos actuales, pero quedó protegida contra el mismo bug hacia adelante. Encontrado revisando por qué los períodos de "menor constancia" no coincidían con los huecos visibles en el heatmap anual.

## [1.16.0] - 2026-08-12 — Conversor kg / lbs

### En la app: Conversor kg / lbs

- Nuevo conversor en "Hoy", debajo de la nota de la semana — escribí en kg o en lbs y el otro campo se actualiza solo.

### Added

- **Conversor kg / lbs** en "Hoy", debajo de la nota de la semana: dos inputs enlazados (`#conv-kg`/`#conv-lbs`) — escribir en uno recalcula el otro al instante (`kg * 2.20462`). Es una calculadora suelta, no un dato de la app: no se guarda en ningún lado, no depende de `state` ni de la semana/día activo, así que no necesitó tocar el backend.

## [1.15.0] - 2026-08-12 — Ajustes de UI y fix de Ajustes

### En la app: Ajustes de UI y fix de Ajustes

- Heatmap anual de Calendario ahora es vertical (Lun–Dom en columnas, una fila por semana) y muestra todos los años con datos, no solo 2023–2026.
- Hitos: el rango de fecha de cada período se separa en mes/año y día/fecha, en vez de una sola línea larga.
- Nota de la semana pasa al final de "Hoy"; Balance por grupo muscular pasa al final de Historial.
- Fix: el botón "Guardar reglas" en Ajustes ya no se salía del margen del panel.

### Changed

- Ajustes de UI puntuales: en "Hoy", la nota de la semana pasa al final del bloque (después del panel del día, ya no entre el riel de días y la tira de resumen). En Historial, el panel de balance por grupo muscular pasa al final (después de la lista de tarjetas). El heatmap anual de Calendario cambia de horizontal (7 filas × N columnas, scroll lateral) a vertical (7 columnas Lun–Dom × 52/53 filas, una por semana) — cambio puramente de CSS (`grid-auto-flow` de `column` a `row` + `grid-template-columns` en vez de `grid-template-rows`), sin tocar `renderHeatmap()`: el JS ya generaba las celdas en orden cronológico día por día, que es exactamente el orden que necesita un grid de fila. Las celdas pasan de un tamaño fijo (11px) a `grid-template-columns:repeat(7, 1fr)` + `aspect-ratio:1` en `.heat-cell`, para que el heatmap ocupe todo el ancho disponible en vez de quedar angosto con espacio vacío al lado; ajuste posterior con `max-width:40vw` + `margin-inline:auto` para no dejarlo crecer demasiado ancho en pantallas grandes, centrado dentro del panel. El riel de años del heatmap deja de ser una lista fija (`2026-2023`) y pasa a derivarse de `state.order` (mismo criterio que ya usa el riel de meses de Historial) — sin esto, el histórico de 2022 importado desde Garmin quedaba invisible en el heatmap aunque sí contaba para Hitos. En Perfil, "Hitos y constancia" (`renderMilestones()`) separa la fecha en dos líneas: mes(es) y año arriba (`periodMonthYearLabel()`, ej. "Marzo a Junio 2026"), día y fecha abajo (`periodDayLabel()`, ej. "Lunes 23 Mar al Viernes 05 Jun" — abreviatura de mes de 3 letras capitalizada, tomada de `MESES_LARGO` recortado) — reemplaza a `periodRangeLabel()`, que quedó sin uso y se eliminó.

### Fixed

- Ajustes: el botón "Guardar reglas" se salía del gutter de 18px del panel y quedaba pegado a los bordes redondeados. Causa: `.rules-save-btn` y `.perfil-btn` (declarada más abajo en `styles.css`) tienen la misma especificidad CSS — con esa igualdad, gana la regla que aparece después en el archivo sin importar el orden de las clases en el HTML, así que `.perfil-btn` pisaba el `width`/`margin` angostos con `width:100%`. Se resolvió con un selector compuesto `.perfil-btn.rules-save-btn` (mayor especificidad, gana siempre).

## [1.14.0] - 2026-08-12 — Edición offline

### En la app: Edición offline

- Marcar/editar/borrar un ejercicio o la nota de una semana ya no se pierde si se corta la conexión — se guarda y sincroniza solo al reconectar.
- Alcance acotado: crear semana, agregar ejercicio, migrar día, copiar semana pasada, importar datos y la librería siguen necesitando conexión.

### Added

- **Edición offline** (alcance acotado): si se pierde la conexión mientras se edita un ejercicio ya existente (marcar hecho, cambiar nombre/kg/reps/series/nota, borrar) o la nota de una semana, el cambio se guarda en una cola local (`js/offline-queue.js`, IndexedDB) en vez de perderse, y se reintenta solo al reconectar (`window.addEventListener('online', ...)`, más un intento al abrir la app por si quedó una cola de una sesión anterior cerrada offline). Conflictos se resuelven con **last-write-wins** por timestamp: `exercises.updated_at` (columna nueva) + `client_time` en la mutación reproducida — si el registro ya tiene un cambio más nuevo que el que se está reproduciendo, se descarta en vez de pisarlo (`api/exercises.php`, verificado con un caso real de conflicto). **Bug encontrado y corregido durante la implementación**: comparar los timestamps directo con `strtotime()` en PHP fallaba porque PHP corre en UTC y MySQL en una zona 6 horas atrás en este entorno — la comparación se rehizo como una duración ("hace cuántos segundos fue client_time") evaluada contra el propio `NOW()` de MySQL, no contra `updated_at` re-parseado por PHP. Un banner fijo arriba de la app muestra "Sin conexión" y cuántos cambios están pendientes; al sincronizar, un toast resume cuántos se aplicaron y cuántos se descartaron por viejos. **Alcance explícitamente recortado**: quedan fuera de la cola (siguen fallando con el error de siempre si no hay conexión) crear semana, agregar ejercicio, migrar día, copiar semana pasada, importar datos y la librería de ejercicios — todas dependen de que el servidor resuelva IDs nuevos o lógica no trivial (la cadena de "Migrar día", la validación transaccional de importar), fingir eso sin servidor era más riesgo que valor para esta tanda.

## [1.13.0] - 2026-08-12 — Backup automático

### En la app: Backup automático

- Script para respaldar todas tus semanas automáticamente por cron — configuración en el README, sección "Backup automático (cron)".

### Added

- **Backup automático**: script CLI nuevo `api/db/backup_export.php` — vuelca todas las semanas a un JSON con el mismo formato que exportar desde Perfil, en `api/db/backups/` (protegida por su propio `.htaccess` — `Require all denied` — y por un guard `PHP_SAPI !== 'cli'` que corta cualquier intento de correrlo por navegador con 403, verificado). Guarda solo los últimos 14 backups y borra el resto solo — probado forzando 18 archivos de golpe y confirmando que rota a 14. Pensado para cPanel → Cron Jobs, que no necesita acceso SSH (documentado en el README, sección "Backup automático (cron)") — no se pudo configurar el cron real en esta tanda por no tener acceso al hosting de producción desde acá.

## [1.12.0] - 2026-08-12 — Progresión sugerida

### En la app: Progresión sugerida

- Al expandir un ejercicio que la semana pasada se marcó como hecho, aparece un peso sugerido para esta semana.

### Added

- **Progresión sugerida**: en el detalle expandido de un ejercicio (el que ya compara contra la semana pasada), si esa semana se marcó como hecha y su kg es numérico, se agrega una línea "Sugerido esta semana" con ese kg + un incremento fijo (`PROGRESSION_INCREMENT_KG = 2.5`, constante en `js/app.js`, no editable desde Ajustes — ver el comentario en el código sobre por qué no se sumó a `RULES`/`app_settings`: ese endpoint fuerza todas las reglas a entero). Es solo una referencia visual, nunca precarga el input — no pisa lo que el usuario ya haya escrito.

## [1.11.0] - 2026-08-12 — Nota libre por semana

### En la app: Nota libre por semana

- Nuevo campo en "Hoy" para anotar cómo fue la semana completa (lesiones, ajustes) — se guarda solo, separado de las notas por ejercicio.

### Added

- **Nota libre por semana**: textarea nuevo en "Hoy" (`weeks.note`, columna nueva — ver README "Pendiente de correr en producción") para anotar cómo fue la semana completa (lesiones, ajustes), separado de las notas por ejercicio que ya existían. Se guarda sola al salir del campo, mismo patrón que el resto de los inputs de la app; cambia de contenido al cambiar de semana activa sin mezclarse entre semanas. `api/weeks.php` gana su primer endpoint `PUT` (antes solo tenía GET/POST/DELETE). Exportar/importar datos ahora incluye `note` por semana (campo opcional y retrocompatible, igual que ya pasa con `overrides`).

## [1.10.0] - 2026-08-12 — Balance por grupo muscular

### En la app: Balance por grupo muscular

- Nuevo panel en Historial con cuántos días cumplidos tuvo cada grupo muscular en el período filtrado.

### Added

- **Balance por grupo muscular** en Historial: panel nuevo con una barra por grupo (`day.group`) mostrando cuántos días "cumplidos" tuvo cada uno, en el mismo período que ya filtra el riel de meses existente arriba (reutiliza el `keys` que `renderHistorial()` ya calcula, sin duplicar el filtro). Barras hechas con CSS puro (`width` proporcional al grupo con más días), sin agregar una librería de gráficos nueva solo para esto.

## [1.9.0] - 2026-08-12 — PR automático

### En la app: PR automático

- Al marcar un ejercicio como hecho con un kg mayor a tu mejor registro histórico para ese ejercicio, aparece un aviso de nuevo récord.

### Added

- **PR automático**: al marcar un ejercicio como hecho, si su kg supera el mejor kg histórico registrado para ese mismo nombre (`bestPriorKgForExercise()`, cualquier semana anterior, solo apariciones ya marcadas como hechas), aparece un toast de récord ("Nuevo récord en..."). No cuenta como PR la primera vez que se registra un ejercicio nuevo — hace falta al menos un registro previo para comparar, si no cualquier ejercicio nuevo dispararía el toast sin significar nada. `toggleExercise()` deja de fijar `ex.done` a partir de lo que devuelve el servidor y pasa a calcularlo local antes de esperar la respuesta — necesario para que la próxima feature (edición offline) funcione igual online y offline, donde una mutación encolada no tiene un eco real del servidor todavía.

## [1.8.0] - 2026-08-12 — Compartir como imagen

### En la app: Compartir como imagen

- Nuevo botón para compartir el día activo o una semana de Historial como imagen (PNG) — comparte directo desde el celular o la descarga.

### Added

- **Compartir día/semana como imagen**: botón nuevo (ícono compartir) en el panel del día activo y en cada tarjeta de Historial — captura el elemento con [html2canvas](https://html2canvas.hertzen.com/) 1.4.1 (CDN) y usa `navigator.share()` si el navegador lo soporta (celular, comparte el PNG directo a otra app), o cae a una descarga normal (`bitacora-<semana>-<día>.png` / `bitacora-semana-<semana>.png`). El botón de la tarjeta de Historial necesitó un guard explícito en el listener de click de la tarjeta completa (`if(e.target.closest('[data-action="share-week"]')) return;`) — un `stopPropagation()` en el listener delegado no alcanza porque el listener de la tarjeta, al estar más cerca del botón en el árbol, ya se dispara antes en la fase de bubbling. Nota: html2canvas tira un warning de consola no bloqueante ("Unable to find element in cloned iframe") en algunos capturas — la imagen generada sale íntegra igual, es un quirk conocido de la librería al intentar inlinear las fuentes web (Google Fonts/Font Awesome) durante el clonado interno.

## [1.7.0] - 2026-08-12 — Volumen del día

### En la app: Volumen del día

- Nuevo chip "Volumen" en la tira de resumen de Hoy — kg x reps x series sumado de los ejercicios marcados como hechos.

### Added

- **Volumen del día**: cuarto chip en la tira de resumen de "Hoy" (`computeDayVolume()`) con kg × reps × series sumado de los ejercicios marcados como hechos del día activo. Mismo criterio de tolerancia que el resto de la app: si algún campo no es numérico, ese ejercicio se descarta del total en vez de contar como cero. La tira de resumen de "Hoy" pasa a 4 columnas (`.summary-strip.cols-4`); la de Progreso, que reutiliza la misma clase base con solo 3 chips, queda sin tocar.

## [1.6.0] - 2026-08-12 — Reglas editables y heatmap anual

### En la app: Reglas editables y heatmap anual

- Ajustes: sección "Reglas" — los mínimos de racha, día cumplido y Hitos ahora se editan desde la app y afectan el cálculo real al instante.
- Calendario: card de heatmap anual (365 días, filtro por año) y botón "Volver a hoy" con swipe entre meses.
- Hitos: los períodos muestran el rango real de entrenamiento ("Lunes 23 de Marzo al Viernes 05 de Junio") en vez de meses calendario.
- Ajustes de espaciado, orden de "Migrar día" y el riel de días en móvil.

### Added

- **Reglas editables** en Ajustes: nueva tabla `app_settings` (`setting_key`/`setting_value`) y endpoint `api/settings.php` (GET/PUT, valida rango por regla) reemplazan lo que antes eran constantes fijas en `js/app.js` (`MIN_DONE_FOR_STREAK`, `WEEK_STREAK_MIN_DAYS`, `MILESTONE_STRONG_MIN`, `MILESTONE_WEAK_MAX`, `MILESTONE_MIN_RUN_WEEKS`) por un objeto `RULES` mutable que se llena desde la API al cargar la app. Panel nuevo en Ajustes con un input numérico por regla y un botón "Guardar reglas" — al guardar, PUT a la API y re-render inmediato de racha, riel de días, Historial e Hitos, para que el cambio afecte el cálculo real sin recargar la página (no es solo un valor de referencia).
- Calendario: card de **heatmap anual** (primera versión) — riel de años (2026–2023, más reciente primero, mismo estilo `.week-pill` que el filtro de mes de Historial) como filtro, y un grid de 365 días estilo GitHub (`grid-auto-flow:column`, 7 filas) para el año elegido. Solo pinta verde (`--ok`) los días cumplidos según el mismo criterio que la racha (`buildChronoDays()` + `RULES.min_done_per_day`); sin niveles rojo/amarillo todavía — alcance explícitamente acotado a un primer pase.
- Calendario: botón "Volver a hoy" (deshabilitado cuando ya se está viendo el mes actual) y swipe horizontal para cambiar de mes, mismo patrón táctil (umbral de 50px, descarta gestos mayormente verticales) que el swipe entre días.

### Changed

- Botón "Migrar día" en el panel de día se mueve de arriba (junto al header) a debajo de "+ Agregar ejercicio"; `.migrate-row` pasa de `border-bottom` a `border-top` para separarlo visualmente del contenido de arriba en vez de dejar un borde colgante sin nada debajo.
- Nombre de archivo del export de datos incluye hora además de fecha (`bitacora-backup-YYYY-MM-DD-HHMMSS.json`), para no pisar un export anterior del mismo día si se exporta más de una vez.
- Hitos: los rangos de período (mayor y menor constancia) pasan de mostrar mes(es) calendario ("Marzo–Junio 2026") a la fecha real de inicio/fin de entrenamiento con día de la semana ("Lunes 23 de Marzo al Viernes 05 de Junio"), calculado a partir del primer y último día efectivamente cumplido dentro del tramo (`fmtFullDate()` nuevo, `findRuns()` ahora recibe `days` y anota `startDate`/`endDate` por tramo).

### Fixed

- `findRuns()` (Hitos): un tramo de "menor constancia" podía mostrarse como semanas seguidas aunque en realidad tuviera meses de hueco en medio — `weekStats` solo contiene semanas que existen como fila en la BD, así que dos semanas sueltas separadas por semanas nunca creadas quedaban adyacentes en el array disperso y se contaban como consecutivas. Encontrado al verificar el nuevo formato de fecha por período (tarea de arriba), que expuso el problema mostrando un rango de 6 meses para un tramo de solo "2 semanas". Ahora un tramo se corta si la siguiente semana no es calendario-consecutiva a la anterior.
- `sw.js`: `CACHE_NAME` a `v13`, y a `v14` en esta tanda (Reglas/heatmap) — por la misma razón de siempre, tocando `index.html`/`css/styles.css`/`js/app.js`.

## [1.5.0] - 2026-08-11 — Hitos y constancia

### En la app: Hitos y constancia

- Nueva sección en Perfil con tus períodos de mayor y menor constancia, y una lista de hitos: primera sesión, mejor racha, mejor mes, hueco más largo sin entrenar y año más productivo.

### Added

- Histórico 2022–2025 importado desde el export de Garmin Connect (113 sesiones de fuerza, 41 semanas nuevas), para enriquecer "Hitos y constancia" con la línea completa en vez de solo 2026. Garmin no guarda ejercicios individuales de esa época (solo categorías agregadas por sesión, ej. `BENCH_PRESS: 6 sets, 72 reps`) ni peso (`maxWeight` no existe en el export antes de 2025), así que se importó como relleno de bajo esfuerzo, no reconstrucción precisa: una fila `Garmin: <CATEGORÍA>` por categoría real (se descartan `CARDIO`/`MOVE`/`WARM_UP`), con `kg` vacío, `reps`/`series` estandarizados a 12/4 (los totales crudos de Garmin no son confiables — sesiones que se quedaban corriendo sin cortar inflaban los números), y relleno con `Garmin: UNKNOWN EXERCISE N` hasta completar 6 filas por día para que alcance el mínimo de "día cumplido" ya existente. Grupo muscular fijo "Entrenamiento funcional" para todos estos días vía `week_day_overrides` (el mismo mecanismo de "Migrar día", con `migrated_from: null` — no hizo falta tocar el esquema). Validado cruzando contra un análisis previo de este mismo historial: el hueco más largo sin entrenar y la mejor racha coinciden.
- **Hitos y constancia** en Perfil: inspirado en un análisis de constancia que el usuario hizo sobre su historial completo de Garmin (2022-2026) fuera de la app — se implementa la parte de "hitos"/milestones ahora, calculada solo con los datos que ya viven en `bitacora_hierro` (desde enero 2026), sin depender de importar el histórico completo de Garmin (queda pendiente para más adelante). `computeMilestones()` reutiliza `buildChronoDays()` (misma fuente que la racha) para detectar tramos de semanas consecutivas con 3+ días (mayor constancia) o 0-1 días (menor constancia), y calcula primer entrenamiento, mejor racha con rango de fechas (`computeStreakDetail()`, extraído de `computeStreaks()` sin cambiar su contrato), mes con más días entrenados, hueco más largo sin entrenar y año más productivo. Íconos de Font Awesome (trofeo / triángulo de alerta) con los colores `--ok`/`--danger` ya existentes, no colores nuevos.
- Medallero en "Tus periodos de mayor constancia": 1er lugar usa trofeo (`fa-trophy`, dorado), 2do y 3er lugar usan medalla (`fa-medal`) en plata y bronce. Tres tokens de color nuevos (`--gold`, `--silver`, `--bronze`) — son colores de ranking, no de estado (`--ok`/`--pending`/`--danger`), por eso no se reutilizaron esos.
- **Changelog** en Perfil: versión actual + historial de versiones, cada una en un `<details>`/`<summary>` nativo (colapsado por default salvo la más reciente) para no mostrar mucho texto de una — `APP_VERSIONS` en `js/app.js` es un resumen de cara al usuario de este mismo archivo, agrupado en tandas legibles con las fechas reales de los commits (`git log --date=short`). El `CHANGELOG.md` técnico sigue siendo la fuente detallada para desarrollo.
- `api/import.php` y `buildExportPayload()` ahora incluyen `overrides` por semana (`{ [day_key]: {group_name, notes, migrated_from} }`) — sin esto, exportar/reimportar una semana con un día migrado (ver "Migrar día") perdía la etiqueta de grupo correcta y el `migrated_from` que usa la racha para no contar ese día como fallido. Campo opcional y retrocompatible: un backup viejo sin `overrides` sigue importando igual que antes (días sin override de vuelta a su grupo por defecto).
- `api/import.php`: los nombres que empiezan con `Garmin: ` (filas sintéticas del histórico importado) ya no se agregan a `exercise_library` — sin esto, "Garmin: BENCH_PRESS", "Garmin: UNKNOWN EXERCISE 1", etc. aparecían como sugerencia de autocompletado al agregar ejercicios reales.
- Vistas de Perfil reordenadas: Hitos y constancia → Tus datos → Cerrar sesión → Changelog.

### Fixed

- Vista Perfil: `.perfil-panel` y `.logout-btn` no tenían `margin-top`, así que quedaban pegados sin espacio contra la card de arriba (0px de separación) mientras `.changelog-panel` sí tenía 16px — inconsistente. Ahora las cuatro cards de Perfil (Hitos, Tus datos, Cerrar sesión, Changelog) quedan separadas por 16px de forma uniforme.

## [1.4.0] - 2026-08-11 — Racha semanal y calendario clicable

### En la app: Racha semanal y calendario clicable

- La racha ya no se rompe día por día: una semana necesita 5 o más días cumplidos para no cortarla.
- Tocar un día en el Calendario navega directo a ese día para verlo o editarlo.

### Added

- Calendario: tocar un día que pertenece a una semana ya creada navega a "Hoy" con ese día seleccionado (mismo patrón que Historial) — `data-date` en cada celda, día calculado con `DAY_ORDER[(date.getDay()+6)%7]` para que domingo también sea navegable aunque no pinte línea. Días sin semana no son clicables (`.cal-day.clickable` solo se agrega si `state.weeks[monday]` existe).

### Changed

- Racha (`computeStreaks()`): el corte pasa de ser día por día a ser semanal — una semana (lun–sáb) necesita al menos 5 días cumplidos (`WEEK_STREAK_MIN_DAYS`) para no romper la racha; si los alcanza, sus días cumplidos suman normal a la cuenta (que sigue expresándose en días, no en semanas), si no, la racha se corta ahí. La semana en curso nunca se juzga "rota" hasta que termine, mismo criterio que antes aplicaba solo al día de hoy.

### Fixed

- `js/app.js`: el calendario pintaba de rojo días futuros dentro de una semana ya creada (ej. si hoy es martes, miércoles/jueves/viernes de esa misma semana salían en rojo como si ya hubieran "fallado"). `computeDayTier()` ahora ignora fechas posteriores a hoy, igual que ya hacía `buildChronoDays()` para la racha.
- `sw.js`: durante el desarrollo de esta tanda de cambios, el service worker siguió sirviendo `js/app.js` cacheado (versión vieja) después de editarlo, ocultando el fix de arriba hasta darse cuenta y subir `CACHE_NAME`. Ver la nota en el README sobre bumpear la versión del cache en cada deploy que toque el shell.

## [1.3.0] - 2026-08-11 — Sábado, domingo y Migrar día

### En la app: Sábado, domingo y Migrar día

- El riel de días crece a 7 (Lun–Dom) — sábado y domingo quedan revelados al hacer scroll horizontal.
- Nueva función "Migrar día": mueve el set completo de ejercicios de un día a otro dentro de la misma semana, recorriendo en cadena si el destino ya tiene contenido.

### Added

- Sábado y domingo en el riel de días: crece de 5 a 7 tabs (Lun–Dom); Lun–Vie siguen llenando el ancho visible y Sáb/Dom quedan revelados con scroll horizontal (`.day-rack` pasa a `overflow-x:auto`, mismo patrón que `.week-rail`). Tabla `day_templates` extendida con filas por defecto para `sab` ("Recuperación") y `dom` ("Descanso").
- Funcionalidad **"Migrar día"**: mueve el set completo de ejercicios (mismo grupo muscular, notas y estado marcado) de un día a otro dentro de la misma semana, para reflejar cuándo se entrenó realmente (ej. un día entre semana que se recuperó el sábado). Nueva tabla `week_day_overrides` (`week_id`, `day_key`, `group_name`, `notes`, `migrated_from`) que le da a un día migrado su propio grupo/notas por semana, en vez de depender del valor fijo por día de `day_templates` — sin fila, el día sigue usando el default de siempre. Nuevo endpoint `api/migrate_day.php`, y `fetch_week_detail()` (ahora en `api/week_helpers.php`, compartido con `weeks.php`) resuelve `group_name`/`notes`/`migrated_from` con `LEFT JOIN` a `week_day_overrides`. UI: botón "Migrar día" en el panel del día, con un `<select>` inline de días destino.
- "Migrar día" v2 — **corrimiento en cadena**: el destino puede ser cualquier día posterior de la misma semana (no solo uno vacío). Si ya tiene contenido, ese contenido se recorre un día más adelante, y así en cadena hasta encontrar un hueco (ej. migrar martes→miércoles cuando miércoles ya tiene su propia rutina empuja miércoles→jueves, jueves→viernes, viernes→sábado). Se bloquea (409) solo si algún día de la cadena ya tiene ejercicios marcados como hechos (nunca se recorre por encima de un entrenamiento ya registrado), o si no queda ningún día vacío hasta el domingo. La respuesta del endpoint agrega `shifted` (cuántos días de más se recorrieron) para que el toast lo distinga de un movimiento simple. El picker de destino ahora lista todos los días posteriores, marcando cuáles "ya tienen rutina, se recorren".

### Changed

- `day_key` (`day_templates`, `exercises`) pasa de ENUM de 5 valores (Lun–Vie) a 7 (Lun–Dom) — requiere correr un `ALTER TABLE` sobre bases ya existentes (ya corrido en local).
- Racha (`buildChronoDays()`): domingo nunca cuenta (gimnasio cerrado); sábado solo entra a la cuenta si tiene algún ejercicio esa semana; un día Lun–Vie que quedó vacío por una migración (directa o por corrimiento en cadena) se excluye en vez de contar como fallido — se detecta juntando todos los `migratedFrom` de la semana en un `Set` y comparando contra cada día vacío, en vez de solo mirar si sábado apunta directo a ese día (necesario desde que "Migrar día" soporta cadenas de varios días, no solo un salto directo a sábado).
- Calendario (`computeDayTier()`): sábado ahora se colorea con la misma lógica rojo/amarillo/verde que Lun–Vie, pero solo si tiene algún ejercicio esa semana (un sábado libre queda sin línea, no rojo). Domingo sigue siempre sin línea.
- Historial: la fila de indicadores por semana crece de 5 a 6 días (agrega sábado, domingo se excluye por estar siempre cerrado).
- `api/exercises.php` / `api/import.php`: `DAY_KEYS` extendido a 7 valores; en `import.php`, `sab`/`dom` quedan como opcionales (los backups viejos no los tienen) mientras que Lun–Vie siguen siendo obligatorios.
- `api/weeks.php`: `is_monday()`/`find_week_id()`/`fetch_week_detail()` se mueven a un nuevo `api/week_helpers.php` compartido, para reutilizarlos en `api/migrate_day.php` sin duplicar la lógica de JOIN con `week_day_overrides`.

### Fixed

- `sw.js`: `CACHE_NAME` a `v6` (sábado/domingo + Migrar día) — cada cambio a `index.html`/`css/`/`js/` necesita este bump o el navegador sigue sirviendo el shell viejo desde caché.
- `js/app.js`: primera versión de `computeDayTier()` para sábado pintaba en rojo cualquier sábado pasado sin ejercicios, como si fuera un día "fallado" — pero sábado no es obligatorio como Lun–Vie. Corregido para dejarlo sin línea cuando no tiene ningún ejercicio esa semana (detectado probando en navegador antes de dar la funcionalidad por terminada).

## [1.2.0] - 2026-08-11 — Historial, Progreso y respaldo de datos

### En la app: Historial, Progreso y respaldo de datos

- Vista Historial con una tarjeta por semana, filtrable por mes.
- Vista Progreso con gráfica de carga por ejercicio (Chart.js).
- Exportar e importar todos tus datos como JSON desde Perfil.

### Added

- Vista y tab **Historial**: tarjeta por semana (más reciente primero) con 5 indicadores de día y total de ejercicios marcados/total; riel de meses arriba (reutiliza `.week-rail`/`.week-pill` de "Hoy") como filtro, con "Todas" por defecto. Tocar un día específico de la tarjeta selecciona esa semana y ese día y navega a "Hoy" (nuevo helper `switchToView()`, extraído del handler de nav para reutilizarlo desde el click de la tarjeta); tocar el resto de la tarjeta cae en lunes. Todo calculado del lado del cliente desde `state.weeks` ya cargado, sin llamadas nuevas a la API.
- Vista y tab **Progreso**: buscador de ejercicio (`#prog-search`, mismo datalist `exercise-library-list` que ya usa el nombre de ejercicio en el panel del día) y gráfica de línea en SVG hecho a mano (kg en el tiempo), con puntos espaciados por orden de aparición (no proporcional a la fecha calendario, para no dejar huecos raros por semanas sin ese ejercicio). `collectExerciseHistory()` solo cuenta ocurrencias con `done:true` y `kg` parseable (`parseFloat`, tolera formatos como `"40(8)"` → 40; descarta lo no numérico en vez de mostrar un cero falso). Chips de último/mejor/cambio (reutiliza `.summary-strip`/`.sum-chip`); tocar un punto muestra fecha, reps y series en `#prog-detail`.
- `api/import.php`: importa una lista de semanas desde JSON (mismo formato que `import_weeks_json.php`, ahora también accesible vía HTTP autenticado). Valida la forma completa del payload antes de escribir nada (todo o nada); por semana, si ya existe la reemplaza por completo (borra sus ejercicios y mete los del archivo), si no existe la crea. Semanas no incluidas en el archivo quedan intactas.
- Exportar / importar datos en Perfil: exportar arma el JSON directo desde `state` (ya cargado, sin pedir nada nuevo a la API) y lo descarga; importar lee un archivo, muestra un `confirm()` con cuántas semanas se reemplazarían/crearían, y lo manda a `api/import.php`.

### Changed

- Progreso migra de SVG hecho a mano a [Chart.js](https://www.chartjs.org/) 4.4.0 (CDN), a pedido del usuario — mismo enfoque que su proyecto anterior. `type:'line'`, relleno de área, colores tomados de las variables CSS del tema. Sin leyenda (solo hay una serie por gráfica, a diferencia del proyecto anterior con 3 métricas). El tooltip nativo de Chart.js reemplaza el `#prog-detail`/click-en-punto hecho a mano.

### Fixed

- `sw.js`: `CACHE_NAME` a `v3` (subió a `v2` en la tanda anterior, y volvió a pasar lo mismo desarrollando Historial), a `v4` en la tanda de Historial/Progreso, y a `v5` en esta (Chart.js/export-import).
- Datos: 11 filas de "Prone leg curl acostado" tenían `kg="40(8)"` — el `(8)` era la cuenta de placas porque esa máquina no tenía etiqueta de peso, no parte del valor. Corregido en local (`kg="40"`, nota explicando el porqué); pendiente correr el mismo `UPDATE` en producción.
- `js/app.js`: en Historial, una semana que cruza dos meses (ej. 27 abr–3 may) solo contaba para el filtro del mes del lunes — ahora `weekMonths()` calcula ambos meses cuando el lunes y el domingo caen en meses distintos, y la tarjeta aparece en los dos filtros.
- `js/app.js`: al tocar una tarjeta de Historial, la navegación a "Hoy" nunca cambiaba `state.activeDay`, así que siempre caía en el día activo por defecto (el de hoy) sin importar qué se tocara. Ahora cada punto L/M/X/J/V es clicable individualmente y selecciona ese día exacto.
- `js/api.js`: un `401` en cualquier endpoint pisaba el mensaje real del servidor con un genérico "No autenticado." — ahora `login.php` devuelve su propio mensaje ("Usuario o contraseña incorrectos.") y el aviso de sesión expirada es un efecto aparte, no reemplaza el mensaje.
- `js/app.js`: IDs de ejercicio comparados como string vs number en varios lugares (`findExercise`, `expandedIds`, borrado) — los ejercicios vienen de la API con `id` numérico pero el DOM siempre entrega `dataset.id` como string; sin normalizar, el chevron de "semana pasada" nunca abría y algunas comparaciones de ID fallaban silenciosamente.

## [1.1.0] - 2026-08-11 — PWA instalable y sesión persistente

### En la app: PWA instalable y sesión persistente

- La app se puede instalar como PWA (manifest + service worker).
- Sesión persistente de 30 días — ya no hay que iniciar sesión cada vez.
- Nuevas vistas Perfil y Calendario.

### Added

- PWA real: `manifest.json` (rutas relativas, instalable en Android/desktop/iOS), `sw.js` (cachea el app shell estático; nunca `api/`, sin sincronización offline de datos), íconos propios `icons/icon-192.png` / `icons/icon-512.png` (mancuerna en `--accent` sobre `--bg`, generados con Pillow). Registro del service worker en `js/app.js`, tags de manifest/íconos/meta iOS en `index.html`.
- Vista y tab **Calendario**: grid mensual lunes–domingo, navegable (mes actual por defecto), calculado enteramente del lado del cliente a partir de `state.weeks` ya cargado (sin llamadas nuevas a la API). Línea de color por día lun–vie perteneciente a una semana registrada: rojo (0 ejercicios marcados), amarillo (1–5), verde (6+); fines de semana y días futuros quedan sin línea.
- Vista y tab **Perfil**: por ahora solo aloja el botón de cerrar sesión (se removió de Ajustes).
- Sesión persistente de 30 días (`api/config.php`): cookie + `session.gc_maxlifetime` a 2,592,000 segundos, en vez de cookie de sesión que expiraba al cerrar el navegador.

### Changed

- `js/app.js`: `computeStreaks()` ya no cuenta el día de hoy como "corte" de racha solo por no estar marcado todavía — la racha actual se congela en el valor de ayer y solo baja a 0 cuando un día ya pasado (no hoy) se queda sin marcar.
- Resumen del día (`.summary-strip`) pasa de 4 a 3 tarjetas: se quita "Racha actual" (queda solo el badge del header); grid ajustado a 3 columnas.
- Anillo de progreso del panel del día ahora cambia de color según cuántos ejercicios están marcados: rojo (`--danger`) con 2 o menos, amarillo (`--pending`) con 3 a 5, verde (`--ok`) con 6 o más.
- Iconos: se reemplazó el sprite SVG inline (`<symbol>`/`<use>`) por Font Awesome 6 Free vía CDN, en `index.html` y en todo el HTML generado dinámicamente en `js/app.js`. `.icon` en `css/styles.css` pasa de `width/height` (SVG) a `font-size` (icon font).
- Botón de cerrar sesión se mueve de Ajustes a la nueva vista Perfil.
- Nav inferior pasa de 4 a 6 secciones: Hoy, Historial, Progreso, Calendario, Perfil, Ajustes.
- Despliegue: `tu-dominio.com/bitacora` (subcarpeta) en vez del subdominio dedicado planeado originalmente — sin impacto en código gracias a que todas las rutas ya eran relativas.
- `.day-tab` pasa de un ancho fijo de 88px (calibrado para el preview de escritorio de 520px) a `calc((100% - 24px) / 5)`, para que Lun–Vie siempre llenen el ancho real del `.day-rack` en cualquier celular en vez de solo mostrar 3-4 tabs completos.

## [1.0.0] - 2026-08-11 — Conectada a base de datos real

### En la app: Conectada a base de datos real

- El frontend deja de usar datos de ejemplo en memoria y se conecta a la API real: login, semanas y ejercicios persistentes.
- Importador de rutinas históricas desde JSON.

### Added

- `js/api.js`: cliente fetch mínimo (`apiGet/apiPost/apiPut/apiDelete`), maneja `401` centralizadamente.
- Pantalla de login (`#view-login`) que protege toda la app (`#app-shell`); botón de cerrar sesión en Ajustes.
- `api/db/import_weeks_json.php`: script CLI reutilizable para importar semanas históricas desde JSON (`{monday_date, days:{lun..vie:[{name,kg,reps,series,note,done}]}}`), con modo vista previa por defecto y `--commit` para escribir. Usado para poblar 31 semanas (5 ene–3 ago 2026) desde el historial en Google Sheets del usuario, exportado a xlsx y parseado con un script Python ad-hoc (no versionado) que detectó automáticamente, por bloque de día, si la hoja tenía columna de checkbox — el formato de la hoja original fue cambiando semana a semana.

### Changed

- `js/app.js`: el frontend ya no fabrica datos de ejemplo en memoria — arranca pidiendo sesión, semanas y librería a la API, y cada acción (marcar, editar, agregar/borrar, copiar semana, librería) escribe contra los endpoints reales en vez de mutar solo el estado local.
- Servidor de desarrollo local pasa de `python -m http.server` a `php -S` (la app ya depende de `api/`).

## [0.1.0] - 2026-08-11 — Prototipo inicial (datos de ejemplo)

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

### Changed

- `README.md`: documenta la nueva estructura de carpetas, el esquema de base de datos y los pasos de puesta en marcha del backend.
- `index.html` separado en tres archivos: `index.html` (solo markup), `css/styles.css` (estilos) y `js/app.js` (lógica y state en memoria). Sin cambios de comportamiento — verificado sirviendo el sitio localmente.

### Fixed

- `README.md`: documentado que `Get-Content -Raw | mysql` en PowerShell corrompe acentos al importar `schema.sql` (detectado porque corrompió el seed de `day_templates` en el ambiente local) — se documenta la alternativa correcta.
