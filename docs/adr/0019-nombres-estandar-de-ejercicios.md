# 0019. Nombres estándar de ejercicios, con el original guardado

- **Estado:** Aceptada
- **Fecha:** 2026-09-23

## Contexto
Los ejercicios se escribían a mano y acumularon variantes: tres nombres
para el mismo curl femoral sentado, "Chin ups" para lo que en realidad es
un jalón con maneral en V, "Pájaros en maquina" para una elevación
lateral. La app agrupa por nombre (Progreso, "semana pasada", progresión
sugerida, PR, Guía del día), así que cada variante partía el historial.
Además, `data/exercise-name-mapping.json` tenía varios emparejamientos
equivocados con el dataset (pájaros → apertura invertida, press militar en
máquina → press landmine de pie, sentadilla individual → pistol).

El usuario revisó los 46 nombres uno por uno contra el dataset, con fotos
de las máquinas que usa, en una tabla de revisión (artifact con `db`), y
aprobó un nombre final y un ejercicio del dataset (o "sin equivalente")
para cada uno.

## Decisión
- **Se renombra todo el historial**, no solo desde la semana del 21 de
  septiembre: un corte partiría cada gráfica, dejaría la primera semana
  sin "semana pasada" ni progresión y reiniciaría los PR.
- **`exercises.original_name`** guarda el nombre tal como estaba (solo en
  filas renombradas; NULL = nunca se renombró). Es informativo — la app
  sigue agrupando por `name` — y permite deshacer una fusión si hace
  falta. Viaja en el export, el backup y el import.
- **Migración SQL generada** desde las decisiones aprobadas:
  `api/db/migrations/2026-09-23-renombrar-ejercicios.sql` (43 renombres,
  46 → 40 nombres, 5 fusiones; también actualiza la librería). Idempotente
  y en una transacción.
- **Mapeo reconstruido** con los IDs elegidos (`confidence: "confirmada"`),
  con llaves para el nombre nuevo y el viejo, así una base sin migrar
  también resuelve bien. Los ejercicios sin equivalente no tienen llave.
- Los `sugerido` de `js/split-catalog.js` pasan a los nombres nuevos.

## Alternativas descartadas
- **Aplicar solo hacia adelante**: rompe todo lo que compara por nombre en
  la frontera de la semana del 21.
- **Tabla de alias** (viejo → nuevo) conservando el texto viejo en las
  semanas pasadas: habría que tocar cada lugar que compara por nombre;
  más código y más fácil que algo quede sin actualizar.

## Consecuencias
- Días que tenían dos variantes fusionadas ahora muestran dos filas con el
  mismo nombre (ej. martes 14 de sep, dos aperturas).
- "Hip thrust en maquina" quedó sin equivalente (el dataset no tiene la
  máquina): no tiene imagen ni cuenta en la Guía del día. Pendiente,
  si se pide: ejercicios propios en el catálogo.
- En producción: backup, luego el SQL de la migración (ver DEPLOY.local.md).
