# 0008. Diálogos propios en vez de `confirm()` y `prompt()`

- **Estado:** Aceptada
- **Fecha:** 2026-09-21

## Contexto
Eliminar una semana, quitar un ejercicio de la librería e importar datos usaban
`window.confirm()`, y la nota de un ejercicio usaba `window.prompt()`: cuadros del
navegador, fuera del diseño de la app, sin contexto (no decía qué semana) y sin
distinguir una acción que borra datos de una que no. En una PWA instalada además
se ven como algo ajeno. El `prompt()` tampoco respetaba el límite de la nota
(`exercises.note` es `VARCHAR(200)`).

## Decisión
`confirmDialog({ title, message, confirmLabel, danger })` devuelve una promesa con
`true`/`false` y `promptDialog({ title, message, value, placeholder, maxLength })`
devuelve el texto (vacío incluido, para poder borrar) o `null` si se cancela, igual
que `prompt()`. Se usan con `await`. Los dos comparten `openDialog()` y se pintan como un
bottom sheet (`#confirm-overlay`, componente `.sheet`, que se extrajo del panel de
info de ejercicio) con `role="alertdialog"` y `aria-modal`. Comportamiento:
- En `confirmDialog` el foco cae en **Cancelar**, así Enter no borra nada por
  accidente; en `promptDialog` cae en el campo, con el texto seleccionado, y Enter
  guarda. Al cerrar el foco vuelve al elemento que lo abrió (si sigue en el DOM).
- Tab y Shift+Tab se quedan dentro del diálogo (campo → Cancelar → acción);
  Escape o tocar el fondo cancelan, aunque haya texto escrito.
- El campo es un `.prog-search` (el mismo aspecto que los buscadores) con
  `maxlength` y `aria-labelledby` apuntando al título.
- `danger: true` pinta la acción en rojo (`.btn--danger-solid`): eliminar semana,
  quitar de la librería e importar cuando reemplaza semanas existentes.
- Solo hay uno a la vez: abrir otro cancela el anterior. Eliminar una semana
  desde el botón grande de Hoy sigue pidiendo dos confirmaciones seguidas.

## Alternativas descartadas
- **`<dialog>` con `showModal()`**: da foco y Escape gratis, pero no coincide con
  el bottom sheet que ya usa la app ni permite el mismo estilo sin más CSS.
- **Dejar `confirm()`**: sin contexto ni estilo, y no se puede probar ni adaptar.

## Consecuencias
- El mensaje ahora incluye el contexto (la semana, el nombre del ejercicio).
- `.sheet-overlay` / `.sheet` pasan a `components.css` como componente
  reutilizable (verificado idéntico con el hash de estilos calculados).
- Los diálogos son asíncronos: quien los llama debe ser `async` y usar `await`.
- La nota de un ejercicio usa `promptDialog()` con tope de 200 caracteres.
- No se probó el diálogo de importar con un archivo real, ni el campo de texto con
  el teclado virtual de un teléfono (ver más abajo).
- **Riesgo conocido:** con teclado virtual, un bottom sheet anclado abajo puede
  quedar tapado en algunos navegadores móviles (Chrome Android lo reacomoda si la
  página usa `interactive-widget=resizes-content`, que no se activó porque también
  movería la barra inferior). Si pasa, la salida es anclar este diálogo arriba
  cuando tiene campo de texto.
