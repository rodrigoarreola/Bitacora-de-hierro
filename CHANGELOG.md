# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/). Los números de versión siguen el mismo semver que `APP_VERSIONS` en `js/app.js` (visible en la app: Perfil → Changelog) — todavía no hay tags de git, es solo un registro de fechas/versiones documentado acá.

## [1.43.0] - 2026-08-14 — Resumen semanal: card al 30%, texto legible y rieles sin cortes

### Changed

- **`.dashboard-share` pasa de sólida a `rgba(20,23,27,0.3)`** (30% de opacidad, mismo tono que `--bg`/#14171B) — probado en real: sólida al 100% tapaba demasiado la foto de fondo al compartir en redes; a medias se sigue leyendo la card y se nota el fondo.
- **Contraste de los elementos sin card propia** (`.dashboard-share h1`, `.dashboard-share .sub`, `.dashboard-share .streak .l`, `.dashboard-share .streak .n`): con la card semitransparente, los tonos apagados de la app en vivo (`--text-dim`, `--text-faint`, y el gris del número de racha cuando no es "complete") perdían contraste. Se fuerzan a blanco (título/subtítulo/label) y verde fijo (`--ok`, siempre, tenga o no la clase `.complete`) solo dentro del export — la app en vivo no cambia. `.day-tab.completed` también sube de 10% a 30% de opacidad en el verde de fondo, mismo criterio que la card exterior.
- **`cloneRailForShare()` reescrito**: antes recortaba con `overflow:hidden` + replicar el `scrollLeft` del riel real, lo que dejaba el último pill/tab cortado a la mitad. Ahora se queda solo con los ítems completamente visibles en el riel real (mismo scroll que ya tiene en pantalla) y descarta el resto — nunca un ítem a medias. Nueva función auxiliar `pairedFlexItems()` resuelve los ítems reales del flex recorriendo el nodo VIVO y el clon en paralelo por posición: `#week-rail` mete los pills adentro de un `#week-pills{display:contents}`, y `getComputedStyle` sobre un clon todavía fuera del DOM no siempre resuelve `display:contents` bien — de ahí el primer intento (`flexItems()` mirando el clon directamente) fallara con "Cannot read properties of undefined" al perder la cuenta de cuántos ítems había.
- **Bug encontrado y corregido en la misma reescritura**: la primera versión medía cada ítem con `offsetLeft`/`offsetWidth`, pero ni `.week-rail` ni `.day-rack` tienen `position:relative` — `offsetLeft` quedaba medido contra el offsetParent real (algún ancestro más arriba), no contra el riel, con un sesgo fijo para todos los ítems. En vivo esto hizo perder el tab "VIE" del riel de días (5º de 5, calculado 14px "de más" por el sesgo). Reemplazado por `getBoundingClientRect()` de cada ítem contra el propio riel, que da coordenadas de viewport reales sin ese problema.
- **`.day-rack` reparte 100% del ancho dinámicamente** (`{ stretch: true }` en `cloneRailForShare`, pisa el `flex:0 0 calc((100% - 24px) / 5)` fijo de `.day-tab` con `flex:1 1 0` inline en cada tab que sobrevive al recorte) — antes asumía siempre exactamente 5 tabs; ahora sea cual sea la cantidad que entre (probado con 5 normal y con 5 después de scrollear a sáb/dom), llenan el 100% del riel sin dejar espacio muerto.

## [1.42.0] - 2026-08-14 — Resumen semanal: card sólida ("patrón Strava") en vez de fondo transparente

### Changed

- **`.dashboard-share` pasa a ser una card sólida y redondeada** (`background:var(--bg)`, `border:1px solid var(--line)`, `border-radius:22px`) en vez de fondo transparente. Motivo: probado en real compartiendo a redes sociales, el fondo transparente solo se ve bien sobre una superficie oscura y uniforme (un chat) — sobre una foto real, todo lo que no fuera una card interna (título "BITÁCORA", "Registro de entrenamiento", labels de los day-tabs, el borde de "+ Nueva semana") no tenía fondo propio y quedaba prácticamente ilegible.
- **Se probó `box-shadow` primero** (card flotando con sombra difusa, un wrap exterior transparente con padding para que la sombra tuviera espacio) pero se descartó: comprobado leyendo el PNG resultante píxel a píxel, html2canvas 1.4.1 no renderiza `box-shadow` en absoluto — el corte entre la card y el resto queda en alpha 0 sin ningún degradé, no hay sombra que mostrar. Un borde de 1px sí se renderiza bien (mismo mecanismo que ya usan `.sum-chip`/`.recap-card`), así que reemplaza a la sombra como señal de "esto es una card flotante".
- `copyElementAsImage()` sigue con `backgroundColor: null` en `html2canvas`, pero ahora solo para que las esquinas redondeadas de la card queden transparentes (si no, html2canvas rellena todo el rectángulo del elemento y las esquinas se ven cuadradas) — ya no para dejar transparente todo el fondo.

## [1.41.0] - 2026-08-14 — Compartir semana: resumen del dashboard, copiado al portapapeles

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

### Added

- **Panel "Horarios de entrenamiento"** (Perfil, `#time-stats-host`/`renderTimeStats()` en `js/app.js`): vive debajo de "Hitos y constancia" a propósito — no se agregó botón al `bottom-nav`, que ya tenía sus 6 fijos. Reemplaza los 5 renglones de texto suelto que antes vivían al final de la lista de Hitos (`computeTimeStats()` ya no se llama desde `computeMilestones()`, ahora es standalone).
- **Filtros de año/mes**, independientes entre sí (`timeStatsYear`/`timeStatsMonth`, `null` = "Todo"/"Todos"): el de año lista solo los años que tienen alguna sesión con horario registrado (`collectTimeEntries()`), no todos los años con semanas creadas. El de mes es acumulativo entre años cuando el año está en "Todo" (ej. "Todo" + "Julio" junta todos los julios de cualquier año) — mismo patrón de riel (`.week-rail`/`.week-pill`) que ya usa el heatmap para su filtro de año, delegando el click una sola vez sobre `#time-stats-host` porque `renderTimeStats()` reconstruye el innerHTML en cada render.
- **Gráfica de duración por sesión**: mismo estilo de línea con puntos que Progreso (`prog-canvas`) — tension suave, zoom/pan con `chartjs-plugin-zoom`, doble click resetea. A diferencia de Progreso, los puntos y el grosor de línea son condicionales: con año **y** mes filtrados a la vez (`detailed`) se ven puntos y línea normal; si cualquiera de los dos queda en "Todo"/"Todos" el set puede tener cientos de sesiones, así que la línea se adelgaza (`borderWidth`) y los puntos se ocultan (`pointRadius:0`, quedan solo al hacer hover) para que se lea como tendencia y no como un enjambre de dots.
- **Distribución de horas de inicio** (`computeTimeStats()` ahora recibe el set ya filtrado en vez de recorrer todo `state.weeks`, y devuelve `hourBuckets`): barras horizontales reusando el mismo patrón visual que "Balance por grupo muscular" en Historial (`.balance-row` → `.hour-row`), la hora más frecuente resaltada con `--accent`.

### Nota de diseño

Se probaron y descartaron dos alternativas antes de esta versión: (1) colorear cada punto de la gráfica de duración según su hora de inicio (degradé `--info`→`--accent`) para fusionar ambos gráficos en uno solo — funcionaba pero perdía el ranking numérico por hora; (2) una segunda línea en eje `y1` para la hora de inicio (mismo patrón que el toggle de reps en Progreso) — technically correcto pero el usuario no quedó convencido visualmente. Se volvió a la versión con panel de barras separado.

## [1.39.0] - 2026-08-13 — Heatmap: etiquetas de mes alineadas al corte real

### Changed

- **Etiquetas de mes del heatmap anual** (`renderHeatmap()`, `js/app.js`): borde de 1px y `border-radius:2px` — mismo lenguaje visual que `.heat-cell`. Pasó por tres iteraciones antes de esta versión final: (1) una fila combinada mostrando los dos meses en una sola caja — rechazada, "no crear una nueva combinando dos meses"; (2) cada fila asignada por mayoría de días a un solo mes, sin partir — dejaba un hueco de una fila entera sin bordear entre un mes y el siguiente (ninguno de los dos la reclamaba); (3) intento de recorte con `position:absolute` + `getBoundingClientRect()` — frágil de verdad, no cosmético: se rompía si `renderHeatmap()` corría con la vista todavía oculta (`display:none` devuelve rects en 0) y además corromper la medición de un label al pasar a absoluto a los anteriores en el mismo loop.
- **Solución final, sin medir nada en JS**: el grid usa 3 "fine-rows" por semana real (mitad de arriba / mitad de abajo / separador fijo de 3px) en vez de una fila + gap uniforme. Cada `.heat-cell` ocupa sus 2 mitades (`grid-row: N / span 2`), saltándose el separador. Cada mes arranca/termina en la línea del medio de su fila de transición con el vecino (`seamRow[mes]` en `renderHeatmap()`) — esa misma línea es a la vez el fin de un mes y el arranque del siguiente, así que los bordes coinciden exacto y el separador de 3px queda reservado solo para semanas realmente distintas, nunca entre las dos mitades de una fila compartida.

## [1.38.0] - 2026-08-13 — Reordenar ejercicios, exportar semana, zoom en Progreso y más

### Added

- **Reordenar ejercicios arrastrando** (`.ex-drag-handle` en cada fila): Pointer Events (mouse+touch en un solo código), técnica de placeholder — la fila arrastrada pasa a `position:fixed` y sigue al puntero, un div vacío del mismo alto ocupa su lugar en el flujo y se mueve entre los demás según qué punto medio cruza el puntero. Al soltar, persiste vía `POST api/exercises.php?action=reorder` (`{monday_date, day_key, order:[ids...]}`), que valida que el set de IDs recibido coincida exactamente con los ejercicios de ese día antes de tocar `sort_order`.
- **"Compartir semana completa"** (botón junto a "Compartir día"): arma un contenedor fuera de pantalla con los 7 días (nombre/kg/rep/ser, sin inputs ni botones — nada editable tiene sentido en una imagen) y lo captura con el mismo `shareElementAsImage()`/html2canvas que ya usan día e Historial. Sin librería nueva (nada de jsPDF): una imagen larga cubre el pedido.
- **Zoom/pan en el gráfico de Progreso**: `chartjs-plugin-zoom` vía CDN (mismo criterio que Chart.js/html2canvas), rueda/pellizco/arrastre en el eje X, doble click o doble tap resetea. Plugin opt-in por gráfico — no afecta las sparklines del mini-dashboard.
- **Heatmap anual**: celdas clickeables (mismo `goToDate()` que ahora comparten Calendario, Historial y el heatmap — también corrige que el riel de semanas quedara sin centrar la semana correcta al navegar desde esos dos) y etiquetas de mes verticales al costado (columna extra en el mismo grid, `grid-row: span N` agrupando filas seguidas del mismo mes).
- **"Nueva semana" limitada a 1 semana en el futuro**: validado en el date picker (client) y en `api/weeks.php` `POST` (server, espejado por si se pega el POST directo).
- **Botón "Eliminar esta semana"** al final de "Hoy", con doble confirmación (`deleteWeek(key, {doubleConfirm:true})`) — la X chica del riel de semanas se queda con su confirmación simple de siempre.

## [1.37.0] - 2026-08-13 — Hora de inicio, fin y duración por día

### Added

- **Tabla `week_day_sessions`** (`api/db/schema.sql`): hora de inicio/fin y duración de un día puntual, una fila por semana+día, sin fila = sin horario registrado. `duration_min` es independiente de `end_time - start_time` a propósito — puede venir de un backfill de Garmin con su propio cálculo, o editarse a mano sin tocar las horas.
- **Card "Iniciar/Finalizar entrenamiento"** (`#day-session-panel`, debajo del panel del día): un botón cuyo label se deriva del estado (`start_time` sin `end_time` → "Finalizar", cualquier otro caso → "Iniciar") guarda la hora actual en cada tap vía `api/weeks.php` `PUT` (mismo endpoint que ya usaba la nota semanal, extendido con `day_key`/`start_time`/`end_time`/`duration_min`). Los inputs de hora inicio/fin quedan editables a mano (autoguardan al perder foco, recalculando duración) para corregir o cargar un horario importado de Garmin; duración es de solo lectura, formateada "Xh Ym".
- **`api/import.php`** acepta ahora dos formas por día: la lista plana de siempre (backups viejos) u un objeto `{exercises, start_time?, end_time?, duration_min?}` — se distinguen por la presencia de la clave `exercises`. `api/db/backup_export.php` y `buildExportPayload()` (`js/app.js`) ya exportan la forma nueva.

### Pendiente

- El bloque `CREATE TABLE IF NOT EXISTS week_day_sessions` queda en el README, sección "Pendiente de correr en producción", a la espera del próximo deploy manual vía phpMyAdmin.
- `migrate_day.php` no mueve horarios al migrar un día a propósito — mover ejercicios a otro día no implica que se haya entrenado a esa hora.

## [1.36.0] - 2026-08-13 — Badge de racha a un costado, recap hasta hoy, reps solo sin comparar

### Changed

- **Badge de racha**: pasa de arriba del número a un costado izquierdo, verticalmente centrado junto a "N días" + "racha actual" (`.streak` de columna a fila) — a pedido del usuario viendo una captura, quedaba muy separado del texto apilado arriba.
- **Recap semanal** (`renderWeeklyRecap()`): cuando la semana activa es la semana en curso, la comparación contra la semana pasada se recorta al mismo día de la semana que hoy (ej. si hoy es miércoles, ambas semanas se miden lun-mié) en vez de comparar una semana a medio andar contra una ya cerrada completa — eso hacía que la semana actual siempre se viera "peor" aunque fuera solo cuestión de tiempo. Domingo recorta a sábado (semana ya cerrada, el gimnasio no abre ese día). Una semana pasada ya terminada se sigue comparando completa (lun-sáb), porque ahí no hay nada a medio registrar. El título de la card indica el corte cuando aplica (ej. "Esta semana vs. la pasada (hasta Miércoles)").
- **Línea de reps en Progreso**: ya no se agrega cuando hay un segundo ejercicio en comparación — mostrar reps de un ejercicio junto al kg de otro no tenía lectura clara. El toggle de reps se deshabilita visualmente mientras haya una comparación activa.

### Pendiente

- **Comparar 2 ejercicios con peso y repeticiones**: hoy la línea de reps y el modo comparar son mutuamente excluyentes (ver arriba) — falta diseñar cómo mostrar ambas métricas de dos ejercicios a la vez sin saturar el gráfico (¿reps de los dos en el mismo eje `y1`? ¿solo del primario? ¿un toggle por ejercicio?).

## [1.35.0] - 2026-08-12 — Progreso: comparar ejercicios, línea de reps, mini-dashboard

### Added

- **Comparar dos ejercicios a la vez** en Progreso: segundo buscador opcional ("Comparar con…") que superpone una segunda línea (verde, `--ok`) sobre el mismo gráfico. Dos ejercicios rara vez se entrenaron los mismos días, así que el eje X se arma con la unión de fechas de ambos históricos (`buildUnifiedIsoDates()`, ordenada por ISO — `YYYY-MM-DD` ordena igual como string que como fecha) y cada dataset se alinea contra ese eje con `null` en los huecos (`alignField()`/`alignPoints()`); `spanGaps:true` conecta la línea saltando esos huecos en vez de cortarla. La leyenda de Chart.js, oculta hasta ahora por haber una sola serie, se activa sola cuando hay más de un dataset.
- **Línea de repeticiones** (azul, nuevo token `--info`) en el mismo gráfico, activable con un toggle nuevo junto al buscador — vive en un eje derecho propio (`y1`, sin grid propia para no ensuciar el gráfico) ya que las reps y los kg no comparten escala. El toggle es pegajoso entre búsquedas (se mantiene activado al cambiar de ejercicio) a pedido del usuario; se resetea junto con la comparación solo al saltar a Progreso desde el botón "Ver progreso" de otro ejercicio (`goToProgress()`).
- **Mini-dashboard**: cuando no hay ningún ejercicio buscado, en vez del placeholder vacío de siempre se muestra un grid de sparklines (una por ejercicio de la librería que tiene al menos un registro marcado como hecho — intersección librería∩historial, no unión), ordenadas por entrenado-más-reciente-primero, con un ícono de tendencia (sube/baja/plano) y el último kg registrado. Tocar una tarjeta carga ese ejercicio en el detalle de siempre.

`renderProgreso()` pasa de una única función a un dispatcher (`renderProgDetail()` / `renderProgDashboard()`) que primero destruye **todas** las instancias de Chart.js vivas — la única de detalle (`progChart`) y las N del mini-dashboard (`progSparkCharts`, un arreglo nuevo) — antes de decidir qué modo dibujar, para no filtrar canvases al alternar entre ambos. Con un solo ejercicio y sin reps activadas, el tooltip sale con el texto idéntico al de antes (sin prefijo de nombre) — la lógica de comparación/reps es aditiva, no cambia el caso por defecto.

## [1.34.0] - 2026-08-12 — Recap semanal en "Hoy"

### Added

- **Recap semanal**: card nueva debajo de la tira de resumen de "Hoy" que compara volumen (kg×reps×series, `computeWeekVolume()` — suma `computeDayVolume()` de lun a sáb sin tocar esa función) y adherencia (días cumplidos sobre días con contenido, `computeWeekAdherence()`) de la semana activa contra la semana calendario inmediatamente anterior. Solo se muestra cuando esa semana anterior existe y es realmente adyacente — el lunes cae exactamente 7 días antes, no solo la entrada previa en `state.order` (que puede saltar un hueco de meses sin ninguna semana creada, típico del histórico importado de Garmin) — si no, la card se oculta en vez de comparar contra una semana que no es realmente "la pasada".

## [1.33.0] - 2026-08-12 — Buscar por ejercicio en Historial

### Added

- **Buscador de ejercicio** en Historial (reutiliza la clase `.prog-search`, mismo look que el de Progreso): filtra las tarjetas de semana por nombre, combinado en AND con el filtro de mes ya existente. El panel de balance por grupo muscular hereda el filtro combinado automáticamente, sin tocarlo, porque ya consumía el mismo arreglo `keys` que ahora sale filtrado también por búsqueda. Mensaje de "sin resultados" diferenciado según si el vacío es por el mes elegido o por la búsqueda.

## [1.32.0] - 2026-08-12 — Badges de racha (7/30/100 días)

### Added

- **Badges de racha** junto al número de racha actual del header: bronce a partir de 7 días, plata desde 30, oro desde 100 — reutiliza los mismos íconos/colores (`fa-medal`/`fa-trophy`, `.milestone-ico.gold/.silver/.bronze`) que ya usa el medallero de "Tus periodos de mayor constancia" en Hitos. A pedido del usuario, se muestran **todos** los tiers alcanzados a la vez (ej. a los 120 días se ven bronce+plata+oro juntos), no solo el más alto — distinto del medallero de Hitos, que sí es exclusivo por ranking. `computeStreakDetail()`/`computeStreaks()` no se tocan; `renderStreakBadges()` es puramente de presentación sobre el `current` ya calculado.

## [1.31.0] - 2026-08-12 — Snackbar "Deshacer" al borrar un ejercicio

### Added

- **Deshacer borrado de ejercicio**: `deleteExercise()` deja de mostrar un `confirm()` bloqueante — el ejercicio desaparece de la UI de inmediato y la llamada real al servidor se difiere 5 segundos, ventana durante la cual un toast con botón "Deshacer" permite restaurarlo en su posición original sin haber tocado la base todavía. Si se deja pasar el tiempo sin tocar nada, se confirma solo contra el mismo `Api.del(...)` de siempre — la cola offline (`js/offline-queue.js`) lo sigue cubriendo igual si no hay red en ese momento. Alcance acotado a `deleteExercise` — `deleteWeek` y el borrado de la librería de ejercicios se quedan con `confirm()`, por ser borrados de mayor impacto.
- `showToast(msg, opts)` gana un segundo parámetro opcional (`actionLabel`/`onAction`/`duration`), retrocompatible con los ~15 sitios existentes que la llaman con un string plano.

### Changed

- Solo se permite **un borrado pendiente de undo a la vez**: si se borra un segundo ejercicio mientras el primero todavía espera su ventana de 5s, ese primero se confirma de inmediato en vez de encolarse o perderse en silencio. `deleteWeek()` y `applyWeekDetail()` (esta última compartida por "Migrar día", crear semana e importar — reemplaza `state.weeks[key]` por completo) asientan cualquier undo pendiente antes de reemplazar/eliminar el objeto de semana del que ese borrado podría depender, para no resucitar un ejercicio en un día ya reemplazado o huérfano.

## [1.30.0] - 2026-08-12 — Carga inicial en una sola petición

### Fixed

- **Bug real encontrado en producción**: `loadAppData()` pedía cada semana con una petición HTTP separada (`Promise.all(state.order.map(key => Api.get(...)))`) — con las semanas suficientes de una cuenta real, eso disparaba decenas de peticiones simultáneas al loguearse. En el hosting compartido de producción eso agotó el cupo de procesos PHP y/o el lock del archivo de sesión, produciendo una mezcla de `504 Gateway Timeout` y `401 Unauthorized` (una sesión recién creada dejando de reconocerse en medio de la ráfaga) — el usuario podía loguearse pero no veía sus datos, y a veces la sesión se caía sola. No pasaba en local (73 semanas alcanzaban para notarlo recién en producción, con probablemente más semanas y menos cupo de procesos que en desarrollo).
- **Nueva `fetch_all_weeks_detail()`** (`api/week_helpers.php`): arma el detalle de **todas** las semanas en 4 queries totales (semanas+notas, day_templates, todos los overrides, todos los ejercicios — agrupados en PHP por `week_id`) en vez de las 3 queries por semana que hacía `fetch_week_detail()` repetida N veces. `api/weeks.php` sin `?date` ahora devuelve `{ order: [...], weeks: { [monday_date]: detalle } }` (antes devolvía solo la lista de fechas) — el frontend pasa de N+1 peticiones a **una sola** para toda la carga inicial. `fetch_week_detail()` (para una semana puntual) no se tocó, se sigue usando en crear/copiar/actualizar-nota semana.

## [1.29.0] - 2026-08-12 — Más espacio entre "Ver progreso" y "Semana pasada"

### Changed

- `.ex-detail-head-left` pasa de `gap:10px` a `justify-content:space-between` — el botón "Ver progreso" y el label "Semana pasada:" quedaban muy pegados entre sí (a pedido del usuario viendo una captura); ahora se reparten el ancho disponible de las columnas 1-2 del grid en vez de agruparse al principio.

## [1.28.0] - 2026-08-12 — Label "Semana pasada" en dos líneas

### Changed

- `.ex-detail-label` ("Semana pasada:") pasa a ocupar dos líneas (`Semana<br>pasada:`) en vez de una sola forzada con `white-space:nowrap` — libera ancho horizontal junto al botón "Ver progreso" dentro de `.ex-detail-head-left` (columnas 1-2 del grid alineado con `.ex-row`, ver 1.27.0).

## [1.27.0] - 2026-08-12 — Detalle de un ejercicio alineado con la fila

### Changed

- `.ex-detail` pasa de un `flex` con su propio espaciado a usar el mismo `grid-template-columns` que `.ex-row` (`22px 1fr 38px 30px 30px 18px 18px`, mismo `gap` y mismo padding horizontal de 12px) — así el grid de "semana pasada" (Kg/Rep/Ser) queda exactamente debajo de las columnas Kg/Rep/Ser de la fila del ejercicio arriba, en vez de con un espaciado (`gap:18px`) que no correspondía a los anchos reales de esas columnas. `.ex-detail-head-left` (botón "Ver progreso" + label "Semana pasada:") ocupa las columnas 1-2 (check + nombre) de esa misma fila del grid; `.ex-detail-suggestion` sigue como fila aparte, ahora expandida a todo el ancho (`grid-column:1/-1`). Verificado con `getBoundingClientRect()` que los tres pares de columnas (kg, rep, ser) coinciden en píxeles exactos entre la fila y el detalle.

## [1.26.0] - 2026-08-12 — Heatmap anual sin rojo

### Changed

- El heatmap anual deja de pintar `tier-red` — se saca el downgrade condicional de 1.24.0 (que solo lo sacaba para días sin datos) y pasa a ser incondicional: ningún día se pinta rojo ahí, a pedido explícito del usuario viendo una captura del heatmap real. `dayHasExercises()` (usada solo para ese downgrade condicional) queda sin uso y se elimina junto con `.heat-cell.tier-red` en CSS. Calendario (vista de mes) no se toca — sigue mostrando "Sin actividad" en rojo, que es donde ese estado sí se pidió mantener.

## [1.25.0] - 2026-08-12 — Detalle de un ejercicio: todo en una fila

### Changed

- El apilado vertical de 1.24.0 (botón, label, grid cada uno en su propia línea) no era lo que se pidió — el usuario lo aclaró con una captura: quería los tres en una sola fila, con el grid alineado a la derecha, como estaba de hecho más cerca del diseño original. Reestructurado con dos contenedores flex anidados: `.ex-detail-head` (fila completa, `justify-content:space-between`) con `.ex-detail-head-left` (botón + label, agrupados con poco espacio entre sí) a la izquierda y `.ex-detail-grid` a la derecha. Mismo cambio en la rama "sin datos de la semana pasada" (mensaje + botón en la misma fila). Verificado con capturas de pantalla que coincide con lo pedido, y que Calendario (que comparte `computeDayTier()` con el heatmap) no se vio afectado por el ajuste del heatmap de la versión anterior.

## [1.24.0] - 2026-08-12 — Ajustes al heatmap y al detalle de un ejercicio

### Changed

- **Heatmap anual**: `computeDayTier()` (compartido con Calendario) trata "0 ejercicios registrados" y "ejercicios registrados pero ninguno marcado" igual — ambos devuelven `tier-red`, porque en la vista de mes un día lun-vie vacío sí cuenta como "debía entrenar y no lo hizo". El heatmap necesita distinguirlos: un día realmente sin datos no debería pintarse igual que un día fallado. Nuevo helper `dayHasExercises(date)` y un downgrade puntual en `renderHeatmap()` (`tier-red` → sin pintar cuando ese día no tiene ningún ejercicio registrado) — sin tocar `computeDayTier()` ni la vista de mes, que se queda con su comportamiento de siempre. Verificado que 20 celdas que antes salían rojas (sin datos) ahora quedan sin pintar, mientras Calendario (mismo período) sigue mostrando esos mismos días en rojo sin cambios.
- **Detalle expandido de un ejercicio**: el botón "Ver progreso" pasa a ir primero (antes del label), seguido de "Semana pasada:" (con dos puntos, antes sin) y recién después el grid de comparación — se quita el contenedor `.ex-detail-head` que los ponía lado a lado.

## [1.23.0] - 2026-08-12 — Protección contra fuerza bruta en login

### Added

- **Bloqueo tras intentos fallidos** en `api/login.php`: 5 intentos con contraseña incorrecta bloquean la cuenta 15 minutos (`LOGIN_MAX_ATTEMPTS`/`LOGIN_LOCKOUT_MINUTES`, constantes en el propio archivo). Nuevas columnas `users.failed_attempts`/`users.locked_until` (`ALTER TABLE`, ver README → "Pendiente de correr en producción"). Sin tracking de IP a propósito — hay una sola cuenta posible de todos modos (`api/config.php` ya documenta que la app prioriza simplicidad por ser de un solo usuario), así que un contador por cuenta cubre el riesgo real de la app estando expuesta públicamente. `is_locked` se calcula en la misma consulta con el `NOW()` de MySQL (`locked_until IS NOT NULL AND locked_until > NOW()`) en vez de comparar después contra un timestamp re-parseado por PHP — el mismo desfase de zona horaria PHP-vs-MySQL que ya causó un bug real en el last-write-wins de la edición offline (1.14.0) aplicaría igual acá si se comparara del lado de PHP. Login con usuario inexistente sigue respondiendo el mismo mensaje/status que contraseña incorrecta, sin tocar la base (no hay fila que actualizar), para no revelar si la cuenta existe. Usa status `429` en vez de `401` a propósito, para no disparar el flujo de "sesión expirada" que `js/api.js` ya engancha específicamente a 401.

  **Bug real encontrado y corregido durante la verificación**: la condición del `UPDATE` comparaba `failed_attempts + 1 >= :max` dentro del mismo `CASE` que ya reasigna `failed_attempts = failed_attempts + 1` — pero MySQL evalúa las asignaciones de un `SET` de izquierda a derecha, así que para cuando el `CASE` lee `failed_attempts` ya ve el valor **nuevo** (post-incremento), no el viejo. Sumarle 1 de nuevo disparaba el bloqueo un intento antes de lo esperado (al 4to intento en vez del 5to) — encontrado corriendo el flujo real de 5 intentos fallidos seguidos contra la BD local y viendo que el bloqueo llegaba antes de tiempo. Corregido comparando `failed_attempts >= :max` directo, ya que esa referencia dentro del `CASE` ya es el valor post-incremento. Verificado de nuevo con el flujo completo (intentos 1-5 en 401, 6to en 429) y confirmado que un reset manual de `failed_attempts`/`locked_until` (mismo `UPDATE` que corre login.php en el branch de éxito) desbloquea la cuenta de inmediato. Estado de la cuenta real revertido a `failed_attempts=0, locked_until=NULL` al terminar.

## [1.22.0] - 2026-08-12 — Backups descargables desde Perfil

### Added

- **Pantalla de backups** en Perfil: nuevo endpoint `api/backups.php` (autenticado, `require_login()` igual que el resto de la API) con dos acciones — sin parámetros (o `?action=list`) lista los backups de `api/db/backups/` (`glob('backup-*.json')`, orden descendente por nombre, que ya es cronológico) devolviendo fecha y tamaño vía el `respond_ok()` de siempre; `?action=download&file=<nombre>` sirve el archivo crudo con `Content-Disposition: attachment`, saltándose el sobre `{ok,data}` porque acá el cliente necesita el JSON tal cual, no envuelto — por eso la descarga va por un `<a href>` normal en vez de por `Api.get()` (que siempre espera `{ok,data}`). El nombre de archivo se valida contra el mismo patrón exacto que genera `backup_export.php` antes de tocar el filesystem, para no abrir una ruta de path traversal siendo el único dato que manda el cliente en este endpoint — verificado que `../../config.local.php` y nombres con caracteres extra devuelven 422 en vez de leer nada. El `.htaccess` (`Require all denied`) de `api/db/backups/` sigue intacto — este endpoint vive fuera de esa carpeta y lee los archivos del lado del servidor, no depende de acceso directo por navegador a esa ruta. Verificado también que list y download devuelven 401 sin sesión. Cierra el hueco que ya documentaba el README ("bajarlos requiere FTP, no hay pantalla en la app para eso todavía").

## [1.21.0] - 2026-08-12 — Botón "Ver progreso" en el detalle de un ejercicio

### Added

- **"Ver progreso"** en el detalle expandido de un ejercicio (`exerciseRowHtml()`, `js/app.js`): botón nuevo al lado del label "Semana pasada" (o del mensaje "Sin datos..." cuando no hay comparación previa — aparece en las dos ramas del detalle, ya que Progreso no depende de tener datos de la semana pasada) que navega directo a la vista Progreso con ese ejercicio cargado en el buscador (`goToProgress()`, nuevo). El nombre del ejercicio viaja en un `data-name` en el propio botón en vez de buscarse subiendo por el DOM, porque el detalle expandido (`.ex-detail`) se renderiza como hermano de la fila (`.ex-row`), no como hijo — un `.closest('.ex-row')` desde dentro del detalle no lo encuentra. **Orden de llamadas importa**: `switchToView('progreso')` se llama antes de `renderProgreso()`, al revés del patrón que usa el resto de la navegación de la app (`renderAll(); switchToView(...)`) — acá sí importa porque `renderProgreso()` dibuja un gráfico de Chart.js sobre un `<canvas>` que mide 0×0 mientras su vista está oculta (`.view{display:none}`), así que dibujarlo antes de mostrar la vista lo dejaría deforme. Verificado con un ejercicio real (con historial) y uno de prueba sin historial previo, ambas ramas cargan el gráfico correctamente.

## [1.20.0] - 2026-08-12 — Heatmap anual con niveles rojo/amarillo/verde

### Changed

- **Heatmap anual** (Calendario): pasa de pintar un único tono (verde en los días cumplidos, gris/transparente en el resto) a usar `computeDayTier()` — la misma función que ya pinta rojo/amarillo/verde en la vista de mes (0 ejercicios marcados / 1–5 / 6+) — en vez de derivar un booleano "completado" desde `buildChronoDays()`. Antes un día fallado y un día sin semana creada se veían exactamente igual (ambos sin pintar); ahora se distinguen: rojo si hubo semana pero 0 ejercicios marcados, sin pintar si directamente no había semana esa fecha. Mismos 3 tokens de color que ya usaba Calendario (`--danger`/`--pending`/`--ok`), sin agregar ninguno nuevo. Verificado que los colores del heatmap coinciden pixel a pixel con los de la vista de mes para el mismo criterio.

## [1.19.0] - 2026-08-12 — Auto-bump de caché del service worker

### Added

- **Auto-bump de `CACHE_NAME`**: nuevo `scripts/bump-sw-cache.php`, corrido automáticamente por un hook de git (`.githooks/pre-commit`) en cada commit — hashea el contenido de `index.html`, `css/styles.css`, `js/app.js`, `js/api.js` y `js/offline-queue.js` (`sha1`, primeros 10 caracteres) y reescribe `CACHE_NAME` en `sw.js` (`bitacora-shell-<hash>`) solo si alguno de esos archivos cambió respecto al último bump — un commit que no toca el app shell no vuelve a tocar `sw.js`. Reemplaza el bump manual (`v2` → `v15` a mano en 15+ commits), que el propio equipo se olvidó de hacer varias veces durante el desarrollo, dejando navegadores con la PWA instalada sirviendo el shell viejo desde caché sin avisar. Requiere activar el hook una sola vez por clon del repo: `git config core.hooksPath .githooks` (documentado en el README). Sin dependencias nuevas — usa PHP CLI, que el proyecto ya requiere para correr localmente; no se introdujo Node/npm solo para esto.

## [1.18.0] - 2026-08-12 — Menor constancia por días reales

### Changed

- **Menor constancia** deja de medirse en semanas y pasa a medirse en días reales entre un entrenamiento y el siguiente — mismo cálculo que ya usaba "Hueco más largo sin entrenar" (`maxGapDays`), pero quedándose con los 3 huecos más grandes en vez de uno solo, en vez de la aproximación semanal anterior (correr `findRuns()` sobre semanas con ≤1 día cumplido). Encontrado revisando un caso real: un hueco de ~4 meses (6 ene – 28 abr 2025) se mostraba como "Enero 2025" con el mismo día de inicio y fin repetido, porque el cálculo anterior caía a un día suelto marcado como hecho en medio del hueco en vez de a los bordes reales del tramo. Ahora los bordes son directamente el último día entrenado antes del hueco y el primero después, sin ambigüedad. Umbral mínimo para aparecer en la lista: `milestone_min_run_weeks × 7` días (reutiliza la regla existente en vez de sumar una nueva). "Mayor constancia" no cambia — ahí sí tiene sentido seguir midiendo en semanas buenas seguidas. La regla `milestone_weak_max` ("Días/semana máximos para contar como semana floja en Hitos") queda sin uso con este cambio y se elimina de Ajustes, `RULES` y `api/settings.php` — un valor viejo guardado para esa clave en `app_settings` (si lo hubiera) queda huérfano e inofensivo, nunca se vuelve a leer.
- `fmtShortDateRange()` (nuevo) agrega el año a "Hueco más largo sin entrenar" y "Mejor racha" — antes mostraban fechas sin año (ej. "4 ene – 24 sep" / "13 abr – 5 jun"), ahora "4 ene – 24 sep 2024" / "13 abr – 5 jun 2026" (o ambos años si el rango cruza un cambio de año).

## [1.17.0] - 2026-08-12 — Racha e Hitos: huecos reales

### Changed

- **Racha e Hitos**: `computeStreakDetail()` y `computeMilestones()` caminaban solo las semanas que existen como fila en `weeks` — una semana sin fila (mes entero sin crear ninguna, típico del histórico importado de Garmin 2022-2025) quedaba invisible en vez de contar como "0 días cumplidos". Nuevo helper `fullWeekRange()` genera todas las claves de semana desde la primera con datos hasta hoy sin saltos; una semana faltante ahora se trata igual que una semana con 0 días. Efecto: "menor constancia" pasa de reportar huecos de 2-3 semanas a los huecos reales de varios meses (ej. "Enero a Septiembre 2024 — 37 semanas", que coincide con el hueco visible en el heatmap anual); "mayor constancia" ya no puede puentear dos semanas activas separadas por meses de nada como si fueran consecutivas. "Mejor racha" no cambió con los datos actuales, pero quedó protegida contra el mismo bug hacia adelante. Encontrado revisando por qué los períodos de "menor constancia" no coincidían con los huecos visibles en el heatmap anual.

## [1.16.0] - 2026-08-12 — Conversor kg / lbs

### Added

- **Conversor kg / lbs** en "Hoy", debajo de la nota de la semana: dos inputs enlazados (`#conv-kg`/`#conv-lbs`) — escribir en uno recalcula el otro al instante (`kg * 2.20462`). Es una calculadora suelta, no un dato de la app: no se guarda en ningún lado, no depende de `state` ni de la semana/día activo, así que no necesitó tocar el backend.

## [1.15.0] - 2026-08-12 — Ajustes de UI y fix de Ajustes

### Changed

- Ajustes de UI puntuales: en "Hoy", la nota de la semana pasa al final del bloque (después del panel del día, ya no entre el riel de días y la tira de resumen). En Historial, el panel de balance por grupo muscular pasa al final (después de la lista de tarjetas). El heatmap anual de Calendario cambia de horizontal (7 filas × N columnas, scroll lateral) a vertical (7 columnas Lun–Dom × 52/53 filas, una por semana) — cambio puramente de CSS (`grid-auto-flow` de `column` a `row` + `grid-template-columns` en vez de `grid-template-rows`), sin tocar `renderHeatmap()`: el JS ya generaba las celdas en orden cronológico día por día, que es exactamente el orden que necesita un grid de fila. Las celdas pasan de un tamaño fijo (11px) a `grid-template-columns:repeat(7, 1fr)` + `aspect-ratio:1` en `.heat-cell`, para que el heatmap ocupe todo el ancho disponible en vez de quedar angosto con espacio vacío al lado; ajuste posterior con `max-width:40vw` + `margin-inline:auto` para no dejarlo crecer demasiado ancho en pantallas grandes, centrado dentro del panel. El riel de años del heatmap deja de ser una lista fija (`2026-2023`) y pasa a derivarse de `state.order` (mismo criterio que ya usa el riel de meses de Historial) — sin esto, el histórico de 2022 importado desde Garmin quedaba invisible en el heatmap aunque sí contaba para Hitos. En Perfil, "Hitos y constancia" (`renderMilestones()`) separa la fecha en dos líneas: mes(es) y año arriba (`periodMonthYearLabel()`, ej. "Marzo a Junio 2026"), día y fecha abajo (`periodDayLabel()`, ej. "Lunes 23 Mar al Viernes 05 Jun" — abreviatura de mes de 3 letras capitalizada, tomada de `MESES_LARGO` recortado) — reemplaza a `periodRangeLabel()`, que quedó sin uso y se eliminó.

### Fixed

- Ajustes: el botón "Guardar reglas" se salía del gutter de 18px del panel y quedaba pegado a los bordes redondeados. Causa: `.rules-save-btn` y `.perfil-btn` (declarada más abajo en `styles.css`) tienen la misma especificidad CSS — con esa igualdad, gana la regla que aparece después en el archivo sin importar el orden de las clases en el HTML, así que `.perfil-btn` pisaba el `width`/`margin` angostos con `width:100%`. Se resolvió con un selector compuesto `.perfil-btn.rules-save-btn` (mayor especificidad, gana siempre).

## [1.14.0] - 2026-08-12 — Edición offline

### Added

- **Edición offline** (alcance acotado): si se pierde la conexión mientras se edita un ejercicio ya existente (marcar hecho, cambiar nombre/kg/reps/series/nota, borrar) o la nota de una semana, el cambio se guarda en una cola local (`js/offline-queue.js`, IndexedDB) en vez de perderse, y se reintenta solo al reconectar (`window.addEventListener('online', ...)`, más un intento al abrir la app por si quedó una cola de una sesión anterior cerrada offline). Conflictos se resuelven con **last-write-wins** por timestamp: `exercises.updated_at` (columna nueva) + `client_time` en la mutación reproducida — si el registro ya tiene un cambio más nuevo que el que se está reproduciendo, se descarta en vez de pisarlo (`api/exercises.php`, verificado con un caso real de conflicto). **Bug encontrado y corregido durante la implementación**: comparar los timestamps directo con `strtotime()` en PHP fallaba porque PHP corre en UTC y MySQL en una zona 6 horas atrás en este entorno — la comparación se rehizo como una duración ("hace cuántos segundos fue client_time") evaluada contra el propio `NOW()` de MySQL, no contra `updated_at` re-parseado por PHP. Un banner fijo arriba de la app muestra "Sin conexión" y cuántos cambios están pendientes; al sincronizar, un toast resume cuántos se aplicaron y cuántos se descartaron por viejos. **Alcance explícitamente recortado**: quedan fuera de la cola (siguen fallando con el error de siempre si no hay conexión) crear semana, agregar ejercicio, migrar día, copiar semana pasada, importar datos y la librería de ejercicios — todas dependen de que el servidor resuelva IDs nuevos o lógica no trivial (la cadena de "Migrar día", la validación transaccional de importar), fingir eso sin servidor era más riesgo que valor para esta tanda.

## [1.13.0] - 2026-08-12 — Backup automático

### Added

- **Backup automático**: script CLI nuevo `api/db/backup_export.php` — vuelca todas las semanas a un JSON con el mismo formato que exportar desde Perfil, en `api/db/backups/` (protegida por su propio `.htaccess` — `Require all denied` — y por un guard `PHP_SAPI !== 'cli'` que corta cualquier intento de correrlo por navegador con 403, verificado). Guarda solo los últimos 14 backups y borra el resto solo — probado forzando 18 archivos de golpe y confirmando que rota a 14. Pensado para cPanel → Cron Jobs, que no necesita acceso SSH (documentado en el README, sección "Backup automático (cron)") — no se pudo configurar el cron real en esta tanda por no tener acceso al hosting de producción desde acá.

## [1.12.0] - 2026-08-12 — Progresión sugerida

### Added

- **Progresión sugerida**: en el detalle expandido de un ejercicio (el que ya compara contra la semana pasada), si esa semana se marcó como hecha y su kg es numérico, se agrega una línea "Sugerido esta semana" con ese kg + un incremento fijo (`PROGRESSION_INCREMENT_KG = 2.5`, constante en `js/app.js`, no editable desde Ajustes — ver el comentario en el código sobre por qué no se sumó a `RULES`/`app_settings`: ese endpoint fuerza todas las reglas a entero). Es solo una referencia visual, nunca precarga el input — no pisa lo que el usuario ya haya escrito.

## [1.11.0] - 2026-08-12 — Nota libre por semana

### Added

- **Nota libre por semana**: textarea nuevo en "Hoy" (`weeks.note`, columna nueva — ver README "Pendiente de correr en producción") para anotar cómo fue la semana completa (lesiones, ajustes), separado de las notas por ejercicio que ya existían. Se guarda sola al salir del campo, mismo patrón que el resto de los inputs de la app; cambia de contenido al cambiar de semana activa sin mezclarse entre semanas. `api/weeks.php` gana su primer endpoint `PUT` (antes solo tenía GET/POST/DELETE). Exportar/importar datos ahora incluye `note` por semana (campo opcional y retrocompatible, igual que ya pasa con `overrides`).

## [1.10.0] - 2026-08-12 — Balance por grupo muscular

### Added

- **Balance por grupo muscular** en Historial: panel nuevo con una barra por grupo (`day.group`) mostrando cuántos días "cumplidos" tuvo cada uno, en el mismo período que ya filtra el riel de meses existente arriba (reutiliza el `keys` que `renderHistorial()` ya calcula, sin duplicar el filtro). Barras hechas con CSS puro (`width` proporcional al grupo con más días), sin agregar una librería de gráficos nueva solo para esto.

## [1.9.0] - 2026-08-12 — PR automático

### Added

- **PR automático**: al marcar un ejercicio como hecho, si su kg supera el mejor kg histórico registrado para ese mismo nombre (`bestPriorKgForExercise()`, cualquier semana anterior, solo apariciones ya marcadas como hechas), aparece un toast de récord ("Nuevo récord en..."). No cuenta como PR la primera vez que se registra un ejercicio nuevo — hace falta al menos un registro previo para comparar, si no cualquier ejercicio nuevo dispararía el toast sin significar nada. `toggleExercise()` deja de fijar `ex.done` a partir de lo que devuelve el servidor y pasa a calcularlo local antes de esperar la respuesta — necesario para que la próxima feature (edición offline) funcione igual online y offline, donde una mutación encolada no tiene un eco real del servidor todavía.

## [1.8.0] - 2026-08-12 — Compartir como imagen

### Added

- **Compartir día/semana como imagen**: botón nuevo (ícono compartir) en el panel del día activo y en cada tarjeta de Historial — captura el elemento con [html2canvas](https://html2canvas.hertzen.com/) 1.4.1 (CDN) y usa `navigator.share()` si el navegador lo soporta (celular, comparte el PNG directo a otra app), o cae a una descarga normal (`bitacora-<semana>-<día>.png` / `bitacora-semana-<semana>.png`). El botón de la tarjeta de Historial necesitó un guard explícito en el listener de click de la tarjeta completa (`if(e.target.closest('[data-action="share-week"]')) return;`) — un `stopPropagation()` en el listener delegado no alcanza porque el listener de la tarjeta, al estar más cerca del botón en el árbol, ya se dispara antes en la fase de bubbling. Nota: html2canvas tira un warning de consola no bloqueante ("Unable to find element in cloned iframe") en algunos capturas — la imagen generada sale íntegra igual, es un quirk conocido de la librería al intentar inlinear las fuentes web (Google Fonts/Font Awesome) durante el clonado interno.

## [1.7.0] - 2026-08-12 — Volumen del día

### Added

- **Volumen del día**: cuarto chip en la tira de resumen de "Hoy" (`computeDayVolume()`) con kg × reps × series sumado de los ejercicios marcados como hechos del día activo. Mismo criterio de tolerancia que el resto de la app: si algún campo no es numérico, ese ejercicio se descarta del total en vez de contar como cero. La tira de resumen de "Hoy" pasa a 4 columnas (`.summary-strip.cols-4`); la de Progreso, que reutiliza la misma clase base con solo 3 chips, queda sin tocar.

## [1.6.0] - 2026-08-12 — Reglas editables y heatmap anual

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

### Added

- Calendario: tocar un día que pertenece a una semana ya creada navega a "Hoy" con ese día seleccionado (mismo patrón que Historial) — `data-date` en cada celda, día calculado con `DAY_ORDER[(date.getDay()+6)%7]` para que domingo también sea navegable aunque no pinte línea. Días sin semana no son clicables (`.cal-day.clickable` solo se agrega si `state.weeks[monday]` existe).

### Changed

- Racha (`computeStreaks()`): el corte pasa de ser día por día a ser semanal — una semana (lun–sáb) necesita al menos 5 días cumplidos (`WEEK_STREAK_MIN_DAYS`) para no romper la racha; si los alcanza, sus días cumplidos suman normal a la cuenta (que sigue expresándose en días, no en semanas), si no, la racha se corta ahí. La semana en curso nunca se juzga "rota" hasta que termine, mismo criterio que antes aplicaba solo al día de hoy.

### Fixed

- `js/app.js`: el calendario pintaba de rojo días futuros dentro de una semana ya creada (ej. si hoy es martes, miércoles/jueves/viernes de esa misma semana salían en rojo como si ya hubieran "fallado"). `computeDayTier()` ahora ignora fechas posteriores a hoy, igual que ya hacía `buildChronoDays()` para la racha.
- `sw.js`: durante el desarrollo de esta tanda de cambios, el service worker siguió sirviendo `js/app.js` cacheado (versión vieja) después de editarlo, ocultando el fix de arriba hasta darse cuenta y subir `CACHE_NAME`. Ver la nota en el README sobre bumpear la versión del cache en cada deploy que toque el shell.

## [1.3.0] - 2026-08-11 — Sábado, domingo y Migrar día

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
