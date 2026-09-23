# 0018. Splits elegibles y Guía del día

- **Estado:** Aceptada
- **Fecha:** 2026-09-22

## Contexto
El grupo de cada día (Pecho y Tríceps, Piernas…) vivía fijo en
`day_templates`, sin forma de cambiarlo desde la app, y la única manera de
armar una semana era "Copiar semana pasada". El usuario quiere poder elegir
un split de los más usados (Full Body, Torso/Pierna, PHUL, PPL…) y que cada
día diga **qué ejercicios le tocan**, con series × reps como **guía** — por
ahora no se escriben en los campos `reps`/`series`.

Además, `fetch_week_detail()` leía el grupo de `day_templates` en vivo:
cambiar el split habría renombrado todas las semanas pasadas y roto el
balance por grupo de Historial.

## Decisión
- **Grupo congelado por semana**: tabla nueva `week_day_groups` (grupo,
  notas y plantilla por semana y día), copiada de `day_templates` al crear
  la semana (`materialize_week_groups()`) y con backfill para las semanas
  existentes. Prioridad al leer: override de día migrado > grupo congelado >
  split vigente. `week_day_overrides` gana `template_key` para que un día
  migrado se lleve su guía.
- **Split vigente = `day_templates`** + columna `template_key`. Se edita
  desde Ajustes → Split (`api/split.php`). Cambiarlo aplica a las semanas
  nuevas; una casilla permite aplicarlo también a la semana en curso.
  Una vista previa en el mismo panel muestra, día por día, los huecos y
  el ejercicio que se sugeriría (mismo `suggestForSlot()` que la guía).
- **Catálogo estático en el frontend** (`js/split-catalog.js`): `DAY_PLANS`
  (12 plantillas de día como listas de "huecos": músculo del dataset + tipo
  + series × reps + ejercicio sugerido) y `SPLITS` (6 presets que asignan
  grupo y plantilla a cada día). El preset marcado en Ajustes se deduce
  comparando con `day_templates`; no se guarda aparte, así "Personalizado"
  no necesita nada extra.
- **Guía del día** en Hoy: `<details>` con cada hueco, ✓ si un ejercicio
  del día lo cubre y, si no, un botón con el ejercicio sugerido que lo
  agrega solo con nombre. "Llenar con la guía" hace lo mismo con todos los
  huecos en un día vacío. La sugerencia prefiere el ejercicio de la
  plantilla si lo haces (o si tu historial no tiene nada de ese músculo);
  si no, el que más repites de ese músculo en las últimas 12 semanas.
- **Músculo de cada ejercicio**: campo `target` agregado a
  `data/exercise-name-mapping.json` (copiado del dataset), para no bajar el
  dataset de ~1MB solo para esto.

## Alternativas descartadas
- **Guardar el grupo en `week_day_overrides`**: esa tabla significa "día
  migrado" (`migratedFrom`) y el export solo incluye esas filas — mezclar
  los dos conceptos rompía el export y el cálculo de racha.
- **Llenar series/reps en los campos**: el usuario prefirió solo guía por
  ahora; los campos siguen reservados para lo que realmente hizo.
- **Plantillas con ejercicios fijos por split**: con huecos por músculo, 12
  plantillas de día cubren todos los splits y la sugerencia se adapta a tu
  historial.

## Consecuencias
- Hay que correr la migración en producción (bloque idempotente en el
  README). Mientras no se corra, el código funciona como antes
  (`split_schema_ready()`), y Ajustes → Split muestra el aviso.
- Un ejercicio que no está en `exercise-name-mapping.json` no cubre ningún
  hueco (ej. "Patada de glúteo en maquina"). Agregar entradas al mapeo lo
  resuelve.
- El export (app y backup) incluye `groups` por semana; backups viejos sin
  `groups` toman el split vigente al importarse.
- Pendiente: balance de series por músculo y, si se pide, llenar reps/series
  desde la guía.
