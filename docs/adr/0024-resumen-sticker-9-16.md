# 0024. "Compartir resumen" como sticker 9:16 transparente

- **Estado:** Aceptada
- **Fecha:** 2026-09-27

## Contexto
`shareDashboardAsImage()`/`buildDashboardShareContainer()` (ver ADR previas
del Resumen: 0016, 0022, 0023) armaban una sola card `.dashboard-share`
—ancho fijo de 520px, fondo semitransparente (`--bg-glass`, 50%)— con
header, racha completa, riel de días y "Esta semana" apilados de arriba a
abajo. Pensada para pegarse encima de una foto al compartir en redes, pero
probada en el celular real (capturas reales del usuario) mostró dos
problemas: el bloque ocupaba casi toda la imagen, dejando muy poco de la
foto real visible detrás; y algunas cards internas (`.week-stats-row`,
`.mb-card`) no tenían fondo propio en la app en vivo (dependen del `--bg`
sólido de la página), así que en el export quedaban prácticamente
transparentes y sus números casi ilegibles.

Referencia externa: el flujo de "Share Activity" de Garmin Connect ofrece
varios fondos (foto propia con overlay, card oscura de marca, fondo
transparente) y aspect ratios (9:16, 4:5, 1:1); confirma que un overlay
chico sobre la foto real —no una card que la tape— es el patrón esperado
para compartir en historias, y que hasta Garmin tiene el mismo problema de
contraste de texto blanco sobre foto clara sin una solución mejor que
ofrecer variantes.

## Decisión
- **Marco 9:16 fijo** (520×924px, mismo ancho que ya usaban las cards),
  `display:flex; flex-direction:column`, **sin fondo propio**: header
  arriba, card de progreso debajo, un `.dashboard-share-spacer`
  (`flex:1 1 auto`) vacío a propósito —ahí se ve la foto real al pegar el
  PNG como sticker— y "Esta semana" anclado abajo del todo.
- **Racha compacta en el header** en vez de la card grande: el número y la
  medalla (clonados de `#streak-badge`/`#streak-badges`) se achican a la
  derecha del título, a una escala que combina con "BITÁCORA" en vez del
  número de 104px de la app en vivo.
- **Card de progreso** (`.dashboard-share-progress`, `--bg-glass` + borde
  de 1px, sin `box-shadow` real —html2canvas 1.4.1 no lo renderiza,
  comprobado leyendo el PNG resultante píxel a píxel—) con solo los dos
  indicadores (`#streak-next-badge` + `#streak-week`); nada del riel de
  días, que no tiene sentido en un sticker angosto.
- **Texto suelto** (header, "Esta semana") sin card propia: blanco fijo +
  `text-shadow` para aguantar tanto sobre foto oscura como clara —probado
  con `html2canvas(..., {backgroundColor: '#14171B'})` y
  `{backgroundColor: '#D8D3C4'}` para simular ambos casos.
- **Cards sin fondo propio en la app en vivo** (`.week-stats-row`,
  `.mb-card`) reciben `background:var(--bg-glass)` solo dentro de
  `.dashboard-share-footer` — si no, quedaban completamente transparentes
  y sus números casi ilegibles (bug real, reportado con una captura).
- **"Esta semana" con ícono+título a la izquierda y valor+diferencia a la
  derecha**, los 3 stats en la misma fila (grid `auto 1fr` por stat,
  reacomoda los 4 elementos existentes del DOM sin tocar el markup de
  `renderWeeklyRecap()`) — el layout apilado de la app en vivo (ancha) no
  entraba en el tercio de columna que le toca a cada stat en un sticker de
  520px.
- **Balance muscular fuera del export**: probado con las 7 filas
  completas, el footer ocupaba casi la mitad del cuadro y el hueco vacío
  bajaba a ~20% del alto en vez de la mitad — se sacó para priorizar que
  se vea la foto.

## Alternativas descartadas
- **`box-shadow` en vez de borde** en las cards del export: se probó con
  blur+offset; html2canvas 1.4.1 no lo dibuja, el corte entre la card y el
  resto queda en alpha 0 sin degradé.
- **Card única cubriendo casi todo el alto** (diseño anterior, ADR
  implícita en `buildDashboardShareContainer()` original): tapaba
  demasiado la foto real; descartada tras ver capturas reales del celular.
- **Balance muscular en el footer**: se implementó y se probó (con el
  botón "Ver todos" quitado del clon, por no tener sentido en una imagen
  estática), pero el hueco vacío resultante era demasiado chico. Se puede
  reconsiderar si el footer se vuelve más compacto.
- **Elegir fondo/aspect ratio como Garmin**: por ahora un solo diseño fijo
  (9:16, transparente); un selector de variantes queda para más adelante
  si hace falta.

## Consecuencias
- `buildDashboardShareContainer()` ya no clona `#day-rack` ni
  `#muscle-balance-host`; si algún día se quiere volver a incluir el
  balance muscular habría que rediseñar el footer para que sea más bajo.
- Los overrides de `.dashboard-share`/`.dashboard-share-footer` en
  `css/views/hoy.css` dependen de la estructura actual de
  `renderWeeklyRecap()` (orden ícono/título/valor/diferencia) y de
  `.week-stats-row`/`.mb-card` sin fondo propio — si esos cambian, hay que
  revisar el export.
- Verificado en local (`DEV_AUTOLOGIN`) leyendo el canal alfa del PNG real
  (`backgroundColor: null`) con un decodificador PNG a mano: el hueco
  central da alpha 0 y las cards dan alpha 128 (50% exacto de
  `--bg-glass`), y renderizando el mismo export sobre fondo oscuro y claro
  para confirmar la legibilidad del texto suelto.
