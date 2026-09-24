# 0023. Series por músculo en Resumen

- **Estado:** Aceptada
- **Fecha:** 2026-09-24

## Contexto
La app ya sabía qué músculo trabaja cada ejercicio (ADR 0021: `target` del
ejercicio del usuario, heredado del catálogo), pero nada mostraba si la
semana iba equilibrada. La referencia común para hipertrofia es de 10 a 20
series efectivas por músculo por semana. Historial tiene un "balance por
grupo muscular" que cuenta **días cumplidos por grupo** del split, no
series, y sirve para tendencias, no para ajustar la semana en curso.

## Decisión
- **Dónde:** Semana → Resumen, debajo de "Esta semana" (dato de la semana
  activa, igual que tiempo, volumen y series).
- **Qué cuenta:** las series (`series`, número) de los ejercicios marcados
  como hechos. Cada ejercicio cuenta **completo para su músculo principal**
  (`target`); los secundarios no suman.
- **Grupos:** Pecho (pectorals), Espalda (lats, upper back, traps), Hombro
  (delts), Bíceps, Tríceps, Cuád. y glúteo (quads, glutes — el dataset
  clasifica sentadilla y prensa como glúteo, así que separarlos daría
  lecturas engañosas), Isquiotibiales. Menores, sin rango y solo si tienen
  series, detrás de "Ver todos": Pantorrilla, abductores/aductores,
  abdomen, antebrazo.
- **Estados:** dentro de 10–20 (verde ✓), arriba (rojo, "+N de más"),
  abajo (ámbar, "faltan N") o, en la semana en curso, **pendiente** (gris)
  si el grupo todavía tiene trabajo por delante: días desde hoy sin
  cumplir cuya plantilla del split o cuyos ejercicios sin marcar lo
  incluyen. Así un miércoles no dice "faltan" en pierna si toca el viernes.
- La barra muestra la franja 10–20 de fondo. El rango es constante
  (`MUSCLE_SETS_MIN`/`MAX`), no una regla de Ajustes todavía.

## Alternativas descartadas
- **Secundarios a medias** (principal 100 %, secundarios 50 %): más fiel,
  pero depende de los músculos secundarios del catálogo, que no siempre
  están completos. Se puede sumar después sin cambiar la vista.
- **En Historial o Progreso:** útil para tendencias, no para decidir qué
  hacer esta semana. Historial podría reutilizar el mismo cálculo después.

## Consecuencias
- Un ejercicio sin músculo (ejercicio propio sin `target`) o sin número en
  series no suma; la vista no avisa de eso.
- Si el rango 10–20 no le sirve a alguien (principiante, fuerza), habría
  que pasarlo a Reglas.
