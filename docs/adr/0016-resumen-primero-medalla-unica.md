# 0016. Resumen como primera pestaña visual; una sola medalla más grande

- **Estado:** Aceptada
- **Fecha:** 2026-09-22

## Contexto
Dos pedidos del usuario sobre lo entregado en la 1.60.0 (ADR 0015):

1. Esa versión hizo que Resumen **abriera** por default, pero dejó "Hoy"
   como el primer botón de izquierda a derecha en `.seg-tabs` — el usuario
   se refería también al orden visual, no solo a cuál pestaña carga sola.
2. Las medallas de racha (hasta 3 íconos chicos apilados, bronce+plata+oro
   acumulativas) le parecían de bajo impacto. Pidió: una sola medalla (la
   más alta ya ganada), más grande — a la altura del bloque "40 días" +
   "racha actual" — y alguna idea para aprovechar mejor esa sección. De
   tres alternativas presentadas (progreso a la siguiente medalla,
   distancia al récord, frase motivacional), eligió **progreso a la
   siguiente medalla**.

De paso pidió dos ajustes de teclado/cursor en Hoy: que el conversor
kg/lbs abra el teclado numérico de una vez en celular, y que tocar un
input de kg/rep/ser para editar ponga el cursor al final del valor en vez
de donde cayó el toque.

## Decisión
- **`.seg-tabs` de Semana reordenado**: el botón "Resumen" pasa a ser el
  primero en el HTML (con `.active`/`aria-selected="true"`), "Hoy" el
  segundo. Los paneles (`#hoy-tab-resumen`/`#hoy-tab-registro`) también se
  reordenaron en el DOM para que coincida — no era estrictamente necesario
  (la visibilidad depende de `.hidden`, no de la posición), pero mantiene
  el documento legible en el mismo orden en que se ve.
- **Una sola medalla** (`renderStreakBadges()`): el tier más alto ya
  ganado, no los anteriores apilados. A 48px (antes 26px) — el cálculo de
  "cuánto mide el bloque de al lado" dio exactamente 48px (32px del número
  + 4px de margen + ~13px de la etiqueta), así que el ícono iguala esa
  altura en vez de solo acercarse. Selector `#streak-badges
  .streak-hero-badge-ico` (id + clase) en vez de depender del orden de los
  `<link>` — `.milestone-ico` (progreso.css, mismo tamaño de selector)
  carga después de `hoy.css` y le habría ganado en cascada por orden.
- **Progreso a la siguiente medalla** (`renderNextBadgeProgress()`, nueva):
  "Faltan N días para la medalla de bronce/plata/oro (X días)." debajo de
  "Mejor racha", usando el mismo arreglo de umbrales (`STREAK_BADGE_TIERS`)
  que ahora comparten `renderStreakBadges()` y esta función, para no
  repetir los números 7/30/100. Vacío (y oculto vía `:empty`) al llegar a
  oro, que no tiene "siguiente".
- **Conversor kg/lbs**: `openConverterSheet()` hace `focus()` + `select()`
  sobre `#conv-kg` al abrir (mismo patrón que `enterNameEdit()`) — el foco
  programático dentro del mismo gesto de clic todavía cuenta como
  "iniciado por el usuario" para que iOS/Android abran el teclado, sin
  esperar un segundo toque sobre el campo.
- **Cursor al final en kg/rep/ser**: nuevo listener delegado `focusin` en
  `dayPanelHost` que llama `setSelectionRange(largo, largo)` en un
  `setTimeout(..., 0)` — necesario porque el posicionamiento nativo del
  toque ocurre después del evento `focus`/`focusin`; sin el diferido, la
  posición del toque ganaría igual. Solo se dispara en la transición a
  foco (`focusin`), no en cada clic dentro de un campo ya enfocado, así
  que reposicionar el cursor a mano mientras se edita sigue funcionando.

## Alternativas descartadas
- **Progreso a la siguiente medalla como barra visual** (en vez de texto):
  se descartó por ahora a favor de texto simple — menos superficie nueva
  de CSS/diseño para una primera versión, se puede convertir en barra más
  adelante sin tocar el cálculo.
- **Distancia al récord / frase motivacional** (alternativas presentadas):
  no elegidas; quedan como ideas para otra ronda si el progreso a la
  siguiente medalla no convence con uso real.

## Consecuencias
- `renderStreakBadges()` y la nueva `renderNextBadgeProgress()` comparten
  `STREAK_BADGE_TIERS` — cambiar un umbral en el futuro es un solo lugar.
- Verificado en el navegador: Resumen es la primera pestaña visible y
  activa al abrir; una sola medalla (plata a 40 días) del mismo alto
  (48px) que "40 días" + "racha actual"; "Faltan 60 días para la medalla
  de oro (100 días)." se ve correctamente; el conversor enfoca y selecciona
  `#conv-kg` al abrir; un toque real (no solo `.focus()` por JS) en el
  borde izquierdo de un valor de kg deja el cursor al final; sin errores
  de consola.
