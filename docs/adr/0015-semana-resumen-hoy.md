# 0015. La vista Hoy pasa a llamarse Semana; Resumen abre por default

- **Estado:** Aceptada
- **Fecha:** 2026-09-22

## Contexto
Tras la 1.59.0 (ADR 0014), el usuario siguió sin quedar conforme con el
naming de la vista y sus pestañas: "Resumen" le parecía bien, pero
"Registro" no le convencía del todo y "Hoy" —el nombre de la vista en la
barra inferior— ya no describía bien su contenido, porque Resumen muestra
sobre todo información de **la semana** (racha, comparación semanal, riel
de semanas), no solo del día de hoy. Además, pidió que Resumen sea la
pantalla principal al entrar: hasta ahora abría en Registro.

Se le presentaron cuatro combinaciones de naming (vía `AskUserQuestion`,
con recomendación explícita) y se resolvió con: **"Semana / Hoy"**.

## Decisión
- **La vista (barra inferior) pasa de "Hoy" a "Semana".** Encaja con que su
  pestaña principal (Resumen) es, en esencia, un tablero de la semana
  activa: racha, comparación semanal, riel de semanas y riel de días.
- **La pestaña "Registro" pasa a llamarse "Hoy".** Al liberar "Hoy" del rol
  de nombre de vista, recupera su sentido literal: es exactamente la
  pestaña sobre el día de hoy (o el día que se esté viendo), con el
  registro de ejercicios. Resultado legible: tocas "Semana" en la barra →
  ves el Resumen de tu semana, con una pestaña "Hoy" al lado para anotar el
  entrenamiento del día.
- **Resumen pasa a ser la pestaña que abre por default** (antes era
  Registro/Hoy). `hoyTab` inicia en `'resumen'` en vez de `'registro'`.
- **Solo cambia el texto visible.** Los identificadores internos —ruta
  `#/hoy`, id `#view-hoy`, variable `hoyTab`, valores `'registro'`/
  `'resumen'` de `data-hoy-tab`, nombre de archivo `css/views/hoy.css`— se
  quedan igual a propósito: son implementación, no importan al usuario, y
  cambiarlos habría sido mucho más trabajo (rutas con historial, hash
  guardado en `manifest.json`/enlaces) para cero beneficio visible. Los
  atajos que fuerzan la pestaña "Hoy" (`goToDate()`, tocar un día del riel
  en Resumen) siguen usando internamente la clave `'registro'` — solo
  cambió su etiqueta, no su comportamiento.

## Alternativas descartadas
- **"Hoy / Rutina"** y **"Hoy / Entreno"**: mantenían el nombre de vista sin
  resolver el problema real (que "Hoy" ya no describe bien un tablero que
  es mayormente semanal), y sumaban una tercera palabra nueva al
  vocabulario de la app sin necesidad.
- **No renombrar nada, solo cambiar el default**: resolvía el pedido de
  "Resumen como pantalla principal" pero dejaba sin resolver la duda del
  usuario sobre si "Registro" y "Hoy" eran los nombres correctos.

## Consecuencias
- Cambian: el texto del botón en `nav.bottom-nav` (`index.html`), el label
  de la pestaña `data-hoy-tab="registro"` (ahora dice "Hoy"), cuál pestaña
  lleva `.seg-tab.active`/`aria-selected="true"` y cuál panel arranca sin
  `hidden` en el HTML estático, y `let hoyTab` en `js/app.js`
  (`'registro'` → `'resumen'`).
- Comentarios de código que usaban "Registro" como nombre visible de la
  pestaña se actualizaron a "Hoy" (o "pestaña Hoy", para no confundir con
  el uso genérico de "hoy" como día calendario); los que usaban "Hoy" como
  nombre de la vista se actualizaron a "Semana" donde correspondía.
  Comentarios que hablan de la ruta/id interna (`#/hoy`, `#view-hoy`,
  `hoyTab`) no cambiaron — siguen describiendo el código tal cual es.
- Verificado en el navegador: la app abre en Semana → Resumen; tocar la
  pestaña "Hoy" muestra el día activo; tocar un día del riel en Resumen
  salta a Hoy con ese día cargado; tocar una semana se queda en Resumen;
  "SEMANA" en la barra inferior no desborda (6 letras, menos que
  "Calendario" o "Historial", que ya cabían); sin ids duplicados ni
  errores de consola.

## Seguimiento
Esta decisión solo cubrió **cuál pestaña abre por default** (`hoyTab`);
dejó sin querer a "Hoy" en la primera posición visual del `.seg-tabs` (el
orden de los botones en el HTML no se tocó). El usuario aclaró que se
refería también a la posición visual — corregido en la 1.61.0 (ADR 0016),
que pone a Resumen primero de izquierda a derecha.
