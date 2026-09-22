# 0014. Registro solo con el día activo; riel de semanas y de días a Resumen

- **Estado:** Aceptada
- **Fecha:** 2026-09-22

## Contexto
La 1.57.0 (ADR 0012) partió Hoy en Registro/Resumen, pero dejó el riel de
semanas fuera de ambas pestañas (arriba de las dos) y el riel de días dentro
de Registro. Al usuario "no le terminó de convencer": Registro seguía
mezclando información del día activo con navegación de nivel semana, y
varios bloques habían perdido su lugar de versiones anteriores (el
cronómetro de sesión bajó de posición en algún punto sin que quedara
registrado por qué).

Se le pidió al modelo una lista independiente de cambios estructurales
(sin ver primero la lista del usuario, para no sesgarla) y luego se
reconciliaron ambas. Quedaron dos decisiones de navegación abiertas,
resueltas con el usuario vía preguntas directas:
1. Sin riel de días visible en Registro, ¿cómo se cambia de día? → un
   selector compacto (flechas + fecha), no solo el swipe ya existente.
2. Al tocar un día del riel (ahora en Resumen), ¿se salta a Registro? Y al
   tocar una semana, ¿también? → tocar un **día** salta a Registro (se
   quiere ver sus ejercicios); tocar una **semana** se queda en Resumen
   (comparar semanas no implica querer ver un día en particular).

## Decisión
- **Riel de semanas y riel de días se mudan a Resumen** por completo — Registro
  ya no tiene ninguna navegación de nivel semana visible, solo información
  del día activo.
- **Nuevo selector de día compacto en Registro** (`.day-switch-row`: ‹ flecha,
  fecha, flecha, ícono conversor ›), respaldado por una función compartida
  con el swipe existente: `stepActiveDay(delta)` (antes la lógica vivía
  inline solo en el handler de `touchend`).
- **Tocar un día** en el riel de Resumen llama `setHoyTab('registro')` antes
  de renderizar — mismo patrón que ya usa `goToDate()` (ADR 0012). **Tocar
  una semana** no cambia de pestaña (comportamiento que ya tenía, se dejó
  intacto).
- **Sesión (Iniciar/Finalizar) vuelve a subir** arriba de la tabla de
  ejercicios dentro de Registro — recupera su posición de versiones previas
  a como quedó tras cambios anteriores no documentados.
- **Conversor kg/lbs se muda a Registro** (es ahí donde se usa, a media
  sesión) pero deja de ser una card siempre visible: pasa a un
  `#converter-overlay` (`.sheet-overlay`/`.sheet`, el mismo componente que ya
  usan `#exercise-info-overlay` y `#confirm-overlay`), con
  `openConverterSheet()`/`closeConverterSheet()` calcadas de
  `openExerciseInfo()`/`closeExerciseInfo()`. Se cierra tocando el fondo,
  sin botón de X (no tiene ninguna acción que confirmar).
- **Chips de Series/Ejercicios/Volumen se fusionan con la cabecera del panel
  del día**: nueva línea `.day-stats` ("9 series · 4,980 kg") junto al
  nombre del grupo muscular. El chip "Ejercicios" se elimina — ya lo muestra
  el anillo de progreso (`3/7`), mostrarlo dos veces era redundante.
  `updateDayStats()` (nueva, no destructiva) recalcula esta línea en cada
  tecleo de kg/rep/ser sin perder el foco del input — mismo criterio que ya
  usaban `#day-session-panel`/`#week-note-panel`.
- **"Compartir resumen semanal" sale de la cabecera del día** (no comparte
  contenido de ese día, sino del dashboard completo) y se reubica como
  ícono en `#streak-hero-card`, junto a las medallas. Su listener pasa de
  delegado (`dayPanelHost`, por posición) a directo
  (`getElementById('share-dashboard-btn')`), porque el botón deja de ser
  descendiente del contenedor que delegaba el clic.
- **Fila de ejercicio de 9 a 7 controles**: el ícono de info (ojo) y el de
  eliminar (papelera) se mueven al detalle que despliega el chevron, junto
  al botón "Ver progreso" ya existente (`.ex-detail-actions`). Quedan
  siempre visibles: check, nombre+nota, kg, reps, series, chevron, asa de
  arrastre.
- **"Eliminar esta semana" pierde énfasis**: de `.btn--danger.btn--block` a
  `.btn--ghost`. Ya pedía doble confirmación
  (`deleteWeek(key, {doubleConfirm:true})`) — no hizo falta agregar nada ahí.
- **Nota de la semana** se queda en Resumen sin cambios. El usuario pidió
  notas *por día* a futuro, pero requiere columna nueva en `exercises` (o
  tabla nueva) — queda **fuera de alcance** de este ADR.

## Alternativas descartadas
- **Dejar el riel de días en Registro además del selector compacto**:
  redundante — ambos navegan el mismo eje (día dentro de la semana activa),
  y el pedido explícito era simplificar Registro a "solo el día activo".
- **Que tocar una semana en Resumen también salte a Registro** (mismo
  comportamiento que tocar un día): se descartó porque comparar semanas es
  una tarea de Resumen en sí misma — saltar de pantalla interrumpiría esa
  comparación sin que el usuario haya pedido ver un día concreto.
- **Un botón de cierre explícito en el sheet del conversor**: los otros
  sheets de la app (`exercise-info`, `confirm`) sí lo tienen porque
  requieren leer contenido largo o confirmar una acción; el conversor es
  dos campos que se leen al vuelo, tocar el fondo alcanza y evita un
  control adicional sin uso real.

## Consecuencias
- Registro queda con 3 bloques (selector de día, sesión, card del día) en
  vez de 5; toda la navegación y comparación de nivel semana vive en un solo
  lugar (Resumen), que ahora abre con: riel de semanas, riel de días, racha,
  comparación, nota, eliminar semana.
- `updateSummaryStrip()` se elimina — sus 6 call sites simples (que ya
  llamaban `renderDayPanel()` justo antes) pasan a `renderWeeklyRecap()`
  directo; el único call site especial (el input de kg/rep/ser, que evita
  `renderDayPanel()` a propósito para no perder el foco) pasa a
  `updateDayStats(); renderWeeklyRecap();`.
- Se encontraron y corrigieron de paso tres bugs expuestos por este
  reordenamiento (ver CHANGELOG 1.59.0, sección Fixed): `.ex-detail-empty`
  sin `grid-column` tras perder su wrapper, el `input` de kg/rep/ser sin
  actualizar Series/Volumen en vivo por un `if` sin llaves, y un selector de
  esqueleto de carga (`.streak .n`) que llevaba desde la 1.57.0 apuntando a
  una clase ya inexistente.
- Verificado en el navegador: selector de día funcional y sincronizado con
  el swipe; riel de días salta a Registro, riel de semanas se queda en
  Resumen; sesión arriba de la tabla sin perder foco; cabecera fusionada sin
  duplicar "ejercicios"; conversor abre/cierra y convierte igual que antes;
  fila de ejercicio a 7 controles con el detalle mostrando las 3 acciones;
  "Eliminar esta semana" como ghost con su confirmación intacta; imagen de
  "Compartir resumen semanal" sin duplicar el ícono; sin ids duplicados ni
  errores de consola nuevos.

## Seguimiento
El nombre de la vista ("Hoy") y de la pestaña "Registro" cambiaron en la
1.60.0 (ADR 0015) a "Semana" y "Hoy" respectivamente, y Resumen pasó a ser
la pestaña que abre por default (antes Registro). Toda la reorganización
que describe este ADR (qué vive en cada pestaña, a dónde saltan los
atajos) sigue vigente — solo cambió el naming visible y cuál abre primero.
