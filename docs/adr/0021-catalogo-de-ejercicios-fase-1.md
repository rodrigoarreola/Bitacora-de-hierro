# 0021. Catálogo de ejercicios y ejercicios del usuario (Fase 1)

- **Estado:** Aceptada
- **Fecha:** 2026-09-23

## Contexto
La app se piensa lanzar al público y a gimnasios/coaches. Hoy un ejercicio
es **solo texto** en `exercises.name`: Progreso, "semana pasada", la
progresión sugerida, los PR y la Guía del día agrupan comparando nombres,
por eso renombrar requirió una migración de 43 `UPDATE` (ADR 0019). El
vínculo con el dataset vive en un archivo del código
(`data/exercise-name-mapping.json`) que no se puede editar desde la app, y
un ejercicio propio sin equivalente (el hip thrust en máquina) no tiene
forma de decir qué músculo trabaja. La card "Fuente de nombres" de Ajustes
cambia el autocompletado a 1,324 nombres, mitad en inglés y sin vínculo.

Datos del dataset (hasaneyldrm/exercises-dataset), verificados:

| Campo | Cobertura | Licencia |
|---|---|---|
| Nombre en inglés | 1,324 / 1,324 (es el único nombre que trae) | MIT |
| Nombre en español | 0 en el origen; 321 generados por nuestro traductor por reglas (`scripts/lib/translate-exercise-name.php`, confianza alta); 1,003 sin traducir | propio |
| Instrucciones en/es | 1,324 / 1,324 cada una (también trae 8 idiomas más) | MIT |
| Músculo, equipo, parte del cuerpo | 1,324 / 1,324 | MIT |
| Imágenes y GIFs | 1,324 | **© Gym visual** — requiere licencia propia para uso comercial |

**Idiomas del producto: solo español e inglés.** Los otros 8 idiomas de
instrucciones se descartan.

## Decisión

### Modelo: dos capas ahora, tres con gimnasios (Fase 3)

**`catalog_exercises`** — catálogo global, lo edita solo el dueño del producto.
| Columna | Notas |
|---|---|
| `id` INT PK | propio, no el id del dataset |
| `source` ENUM('dataset','propio') | |
| `source_ref` VARCHAR(10) NULL | id del dataset (`0584`), para la media y re-sincronizar |
| `name_en` VARCHAR(150) NOT NULL | |
| `name_es` VARCHAR(150) NULL | |
| `name_es_status` ENUM('regla','auto','revisada') NULL | de dónde salió la traducción |
| `target`, `body_part`, `equipment` VARCHAR | vocabulario del dataset (inglés; la UI traduce con los diccionarios que ya existen) |
| `secondary_muscles` JSON | |
| `instructions_en`, `instructions_es` TEXT | pasos en `instruction_steps_*` JSON |
| `media_ref` VARCHAR NULL | hoy = `source_ref` vía `api/exercise_media.php`; mañana, media licenciada o propia |

**`user_exercises`** — reemplaza a `exercise_library`: lo que el usuario hace de verdad.
| Columna | Notas |
|---|---|
| `id` INT PK | |
| `user_id` INT NOT NULL FK → `users` | desde ya, aunque hoy exista un solo usuario (Fase 2 no tendrá que migrar esta tabla) |
| `name` VARCHAR(150) | el nombre que ve el usuario; único por usuario (comparación sin acentos ni mayúsculas) |
| `catalog_exercise_id` INT NULL FK | NULL = ejercicio propio |
| `target`, `equipment` VARCHAR NULL | obligatorio `target` si es propio; si está vinculado, opcional (sobrescribe al catálogo) |
| `archived_at` DATETIME NULL | archivar en vez de borrar si tiene registros |

Músculo efectivo = `COALESCE(user_exercises.target, catalog_exercises.target)`.

**`exercises`** (los registros) gana `user_exercise_id` INT NULL FK.
`name` se queda como **copia de respaldo**: la cola offline, el export y
cualquier código viejo siguen funcionando. Renombrar un ejercicio del
usuario actualiza su fila en `user_exercises` y, en el mismo UPDATE, la
copia en sus registros.

### Agrupar por ID, no por nombre
Una sola función `exerciseKey(ex)` = `user_exercise_id` (o el nombre
normalizado si falta, para filas viejas) reemplaza las comparaciones por
texto en: `findExerciseInPrevWeek()`, la serie de Progreso y su búsqueda,
la detección de PR en `toggleExercise()`, la progresión sugerida, la
comparación semanal y la Guía del día (`computeGuide()`/`suggestForSlot()`).

### Traducción al español
1. Se conservan las 321 de reglas (`name_es_status = 'regla'`).
2. Las 1,003 restantes se traducen una sola vez en lote (con Claude, a
   partir del nombre en inglés, el equipo y el músculo), siguiendo el estilo
   de las existentes ("Press de banca inclinado con mancuerna"):
   `name_es_status = 'auto'`.
3. Las que el usuario tiene en uso se revisan a mano primero
   (`'revisada'`) — hoy son 8 sin traducción (#2616, #2286, #0362, #0201,
   #0194, #0233, #1463, #0292), ya revisadas de hecho en la tabla de
   revisión de ADR 0019.
4. En pantalla: `name_es` si existe, si no `name_en`. La búsqueda del
   catálogo encuentra por los dos idiomas.

### Ajustes → Ejercicios
- **Se elimina "Fuente de nombres"** (y `bitacora.exerciseSource`).
- **"Mis ejercicios"** reemplaza la card de la librería: cada ejercicio con
  imagen, músculo y origen (Catálogo · Propio); los propios sin músculo se
  marcan "falta músculo". Acciones: renombrar, cambiar vínculo al catálogo,
  elegir músculo, archivar.
- **"Agregar del catálogo"**: buscador sobre `catalog_exercises` (es/en,
  con filtros de músculo y equipo) que crea el ejercicio del usuario ya
  vinculado.
- **"Crear propio"**: nombre + músculo obligatorio (+ equipo opcional).

### Autocompletado y alta de ejercicios
El `<datalist>` sale de `user_exercises` activos. Al escribir en un día un
nombre que no existe, se crea como propio y aparece en "Mis ejercicios"
con "falta músculo" — sin bloquear el registro en el gimnasio.

### Guía del día
`DAY_PLANS` cambia `sugerido: '<nombre>'` por `sugerido: <id del
catálogo>`. La sugerencia usa el ejercicio del usuario vinculado a ese id;
si no tiene uno, ofrece agregarlo del catálogo. La cobertura usa el músculo
efectivo, así el hip thrust en máquina (propio, glúteos) ya cuenta.

### API
- `api/catalog.php` — `GET ?q=&target=&equipment=` (máx. 30 resultados) y
  `GET ?id=`. Solo lectura.
- `api/user_exercises.php` — `GET` (con datos del catálogo), `POST`
  (`{name, catalog_exercise_id}` o `{name, target, equipment?}`), `PUT`
  (renombrar / vincular / músculo / archivar), `DELETE` (solo si no tiene
  registros; si tiene, archivar).
- `api/exercises.php` — `POST`/`PUT` aceptan `user_exercise_id`; si solo
  llega `name` (cola offline, clientes viejos) el servidor lo resuelve o
  crea el ejercicio del usuario.
- `api/library.php` queda como alias de solo lectura una versión y luego se
  borra.

### Migración (idempotente, en transacción, como ADR 0019)
1. Crear `catalog_exercises` y sembrarla: script
   `scripts/build-catalog-sql.php` genera
   `api/db/migrations/<fecha>-catalogo.sql` desde el dataset (solo datos
   MIT; en/es; sin los otros 8 idiomas).
2. Crear `user_exercises` desde `exercise_library` + los nombres de
   `exercises`, vinculando con el mapeo actual (IDs confirmados en ADR
   0019); "Hip thrust en maquina" queda propio con `target = 'glutes'`.
3. `exercises.user_exercise_id` ← match por nombre normalizado.
4. Verificación dentro del script: 0 registros (no Garmin, no vacíos) sin
   `user_exercise_id`.
5. `exercise_library` se conserva una versión (respaldo) y se borra en la
   siguiente.

`data/exercise-name-mapping.json` y `data/exercises-dataset.json` dejan de
cargarse en la app (el catálogo viene de la API); quedan solo como
entrada del script de siembra.

### Media
Sin cambios de comportamiento: proxy `api/exercise_media.php` por
`media_ref`, atribución visible. **Antes de un lanzamiento comercial**:
licencia con Gym visual o media propia/de otro proveedor; `media_ref`
permite cambiar de fuente sin tocar los registros.

## Alternativas descartadas
- **Seguir agrupando por nombre y solo mover el mapeo a la base**: resuelve
  el hip thrust pero deja la fragilidad del texto; cada renombre o fusión
  futura vuelve a ser una migración.
- **Guardar en `exercises` el id del catálogo directamente**: pierde el
  nombre propio del usuario y no admite ejercicios propios ni, después, el
  catálogo del gimnasio.
- **Mostrar el nombre en inglés cuando falta el español, sin traducir**:
  el catálogo quedaría ~76% en inglés para un usuario hispanohablante.

## Consecuencias
- Cambio grande en `js/app.js` (todo lo que compara nombres) y en la API;
  se entrega en una versión menor con migración obligatoria.
- `user_id` solo en `user_exercises`: el resto de tablas (semanas, reglas,
  split) sigue siendo de un solo usuario hasta la Fase 2.
- La calidad de las 1,003 traducciones automáticas se corrige por uso; el
  estado `name_es_status` permite listarlas y revisarlas.

## Plan de trabajo
1. `scripts/build-catalog-sql.php` + traducción en lote → SQL de siembra.
2. Esquema + migración de datos, probada en local contra un backup.
3. API (`catalog.php`, `user_exercises.php`, cambios en `exercises.php`,
   export/import/backup).
4. `exerciseKey()` y refactor de Progreso, semana pasada, PR, progresión,
   Guía del día.
5. Ajustes → Ejercicios ("Mis ejercicios", catálogo, crear propio); quitar
   Fuente de nombres.
6. Documentación (README, SCREENS, ESTRUCTURA), CHANGELOG, paquete.

## Verificación
- Migración local: mismas filas en `exercises`; 0 sin `user_exercise_id`;
  40 ejercicios del usuario (39 vinculados + hip thrust propio).
- Progreso de "Curl femoral sentado con máquina" muestra el historial
  completo; renombrarlo desde "Mis ejercicios" no parte la gráfica.
- Semana pasada, PR y Guía del día iguales que antes con los datos
  migrados; la guía de Pierna hipertrofia cuenta el hip thrust.
- Offline: editar el nombre de un registro sin conexión y sincronizar
  resuelve el ejercicio del usuario.
- Export → import conserva vínculos.

## Implementación (1.67.0)
Diferencias con lo planeado arriba, decididas al implementar:
- **Id del catálogo = id del dataset como entero** (`0584` → 584), no un
  autoincremental: es estable entre instalaciones y `js/split-catalog.js`
  puede apuntar a él. Los ejercicios propios del catálogo empiezan en 100000.
- **Instrucciones: solo los pasos** (`instruction_steps_en/_es`, JSON); el
  párrafo venía duplicado y se arma uniendo los pasos. La siembra pesa
  1.5 MB en vez de ~3 MB.
- **Traducciones**: `data/catalog-names-es.json` (993 automáticas, 49
  revisadas); 12 nombres repetidos entre variantes (vista lateral/posterior,
  v.2) se desambiguaron. `scripts/build-catalog-sql.php` también corrige
  "45в°" → "45°" del origen.
- **Dueño de los datos migrados**: el usuario de id más bajo.
- **Progreso**: si el mismo ejercicio aparece dos veces en un día (variantes
  fusionadas en ADR 0019), la gráfica toma la serie más pesada del día.
- **Sin migración**: la API responde 409 en `catalog.php`/`user_exercises.php`
  y la app cae a `library.php` y al mapeo por nombre, como antes.

