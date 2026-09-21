# 0004. Design tokens y componentes base (`.card`, `.btn`)

- **Estado:** Aceptada
- **Fecha:** 2026-09-21

## Contexto
Había 14 variantes de tarjeta y 12 de botón copiadas, 8 valores de radio, ~10
tamaños de texto entre 9.5 y 13 px y 14 `rgba(...)` sueltos. Solo el color
tenía tokens. Cada cambio de estilo había que hacerlo en muchos sitios.

## Decisión
- `css/tokens.css`: colores (y sus versiones con transparencia), radios
  (4/8/10/12/16), tamaños de texto de interfaz (9/10/11/12/13/15), espaciado.
- `css/components.css`: `.card` (`--compact`, `--raised`, `--dashed`) y `.btn`
  (`--primary`, `--ghost`, `--danger`, `--block`, `--sm`, `--icon`).
- Las clases de vista se conservan junto a `.card`/`.btn` y aportan solo lo
  propio (padding, margen, overflow), así ningún selector de JS o CSS cambia.
- Los `rgba` son valores literales, **no** `color-mix()`: html2canvas 1.4.1
  (las imágenes de "Compartir") no lo entiende.

## Alternativas descartadas
- **Reescribir las 6 vistas de una vez**: mucho riesgo visual sin build ni tests.
- **Un preprocesador (Sass)**: agrega build a un proyecto que no lo tiene.

## Consecuencias
- Un cambio de radio o de botón se hace en un solo lugar.
- El redondeo de fuentes a la escala movió texto ±0.5 px y las vistas crecieron
  3–47 px de alto en total.
- Excepciones a la escala, comentadas en el CSS: `.sum-chip .k/.v` (8.5/14.5 px)
  y la barra inferior (9.5 px), porque el tamaño de la escala parte "MEJOR RACHA",
  "40 días" o hace desbordar "CALENDARIO" a 375 px.
- Pendiente: partir `styles.css` en `css/views/*.css` y extender `--sp-*` a
  márgenes y gaps.
