# 0008. Diálogo de confirmación propio en vez de `confirm()`

- **Estado:** Aceptada
- **Fecha:** 2026-09-21

## Contexto
Eliminar una semana, quitar un ejercicio de la librería e importar datos usaban
`window.confirm()`: un cuadro del navegador, fuera del diseño de la app, sin
contexto (no decía qué semana) y sin distinguir una acción que borra datos de una
que no. En una PWA instalada además se ve como algo ajeno.

## Decisión
`confirmDialog({ title, message, confirmLabel, danger })` devuelve una promesa con
`true`/`false`, así que se usa como `confirm()` pero con `await`. Se pinta como un
bottom sheet (`#confirm-overlay`, componente `.sheet`, que se extrajo del panel de
info de ejercicio) con `role="alertdialog"` y `aria-modal`. Comportamiento:
- El foco cae en **Cancelar**, así Enter no borra nada por accidente; al cerrar
  vuelve al elemento que lo abrió.
- Tab y Shift+Tab se quedan dentro del diálogo; Escape o tocar el fondo cancelan.
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
- **Pendiente:** la nota de un ejercicio sigue usando `prompt()` del navegador;
  reemplazarlo pide un diálogo con campo de texto.
- No se probó el diálogo de importar con un archivo real (se probaron los otros
  dos caminos, incluido confirmar).
