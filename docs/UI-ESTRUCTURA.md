# Estructura de la app (UI / UX)

Mapa de **pantallas y contenido** de Bitácora de Hierro, pensado como base
para rediseñar la interfaz. Para el mapa de código (archivos, funciones,
API) ver `ESTRUCTURA.md`.

Versión de referencia: `1.46.0`. App móvil-first (PWA), un solo usuario,
tema oscuro, ancho máximo 520 px.

---

## 1. Esquema general

```
┌─ Login (si no hay sesión)
└─ App shell
   ├─ Banner offline (condicional)
   ├─ Header fijo ......... logo→Perfil + título + engranaje→Ajustes
   ├─ Vista activa (una de 6)
   │    Semana · Historial · Progreso · Calendario · Perfil (header) · Ajustes (header)
   ├─ Nav inferior ........ 4 botones
   └─ Capas globales ...... toast, overlay de info de ejercicio
```

Navegación: barra inferior de 4 destinos (lo diario) más Perfil y Ajustes
como accesos del header (lo ocasional) — desde 1.58.0, ver ADR 0013. Cada
vista tiene URL por hash (`#/hoy`, `#/historial`, `#/progreso`,
`#/calendario`, `#/perfil`, `#/ajustes`) — id/ruta internos de **Semana**
siguen siendo `hoy`, solo cambió el texto visible (ver ADR 0015): atrás/
adelante y enlaces directos funcionan. Hay atajos entre vistas: tocar una
semana en Historial o un día en Calendario/Heatmap lleva a **Semana → Hoy**;
"Ver progreso" en un ejercicio lleva a **Progreso** con ese ejercicio
cargado.

### Nav inferior (4 ítems, todos con ícono + texto)

| Ítem | Ícono | Vista |
|---|---|---|
| Semana | mancuerna | Resumen semanal (default) + registro del día |
| Historial | reloj con flecha | Semanas pasadas |
| Progreso | línea de gráfica | Evolución por ejercicio |
| Calendario | calendario | Mes + heatmap anual |
| _(header, izquierda)_ Perfil | logo Bitácora | Datos, backups, cuenta |
| _(header, derecha)_ Ajustes | engranaje | Reglas, fuente de nombres, librería |

---

## 2. Elementos globales

### Login
Tarjeta centrada: logo, título "Bitácora", "Inicia sesión para continuar",
campos Usuario y Contraseña, botón **Entrar**, línea de error.

### Header (siempre visible en la app)
- **Izquierda:** logo (mancuerna) + "Bitácora" + subtítulo "Registro de
  entrenamiento", todo un solo enlace a **Perfil** (`.brand`, como un
  avatar — un solo usuario, así que "la app" y "tu cuenta" son casi lo
  mismo). Se resalta el ícono cuando estás en Perfil.
- **Derecha:** el **engranaje** que abre Ajustes (se resalta cuando estás en
  esa vista). La racha (número + medallas 7/30/100 días) ya no vive acá —
  desde 1.57.0 es su propia card en Semana → Resumen.

### Banner offline
Aparece cuando no hay conexión o hay cambios pendientes de sincronizar.
Los cambios offline se guardan en cola (IndexedDB) y se envían solos al
volver la red.

### Toast
Mensaje breve inferior, con botón de acción opcional (se usa para
**Deshacer** al borrar un ejercicio). Dura ~2.4 s.

### Diálogo de confirmación
Bottom sheet (`#confirm-overlay`, componente `.sheet`) que reemplaza al
`confirm()` y al `prompt()` del navegador. Título, mensaje con el contexto (ej. la
semana que se va a eliminar) y dos botones: **Cancelar** y la acción, en rojo
cuando borra o reemplaza datos. Escape o tocar el fondo cancelan. Como
confirmación (foco en Cancelar) lo usan: eliminar semana (dos diálogos seguidos
desde el enlace ghost al final de Semana → Resumen), quitar de la librería e
importar datos. Con un
**campo de texto** (foco en el campo, Enter guarda, máx. 200 caracteres) lo usa la
nota de un ejercicio.

### Overlay "Info del ejercicio"
Panel modal que se abre con el ícono de ojo de un ejercicio (solo si el
nombre coincide con el dataset). Contiene: nombre (tuyo y en español del
dataset), botón cerrar, **GIF** de demostración (con estado "Cargando…" /
"GIF no disponible"), tres etiquetas (categoría, equipo, músculo objetivo),
músculos secundarios, **instrucciones** paso a paso y atribución.

### Sistema visual actual
- **Colores:** fondo `#14171B`, superficies `#1B1F26` / `#242A33`, líneas
  `#2E3540`, acento naranja `#D9481F`. Semánticos: verde `--ok`, ámbar
  `--pending`, rojo `--danger`, azul `--info`.
- **Tipografía:** Big Shoulders Display (títulos, mayúsculas), Inter
  (texto), JetBrains Mono (números y datos).
- **Íconos:** Font Awesome 6.
- **Semáforo de rendimiento** (se reutiliza en anillo del día, calendario y
  heatmap): rojo = sin actividad, ámbar = 1–5 ejercicios, verde = 6+.
- **Patrón repetido:** "riel" de píldoras con scroll horizontal
  (`week-rail`) para semanas, meses y años; tarjetas `lib-panel` con
  `lib-title` + `lib-sub`; chips de resumen `sum-chip` (etiqueta + valor).

---

## 3. Vista SEMANA (`#view-hoy`, id/ruta internos siguen siendo `hoy`)

**2 pestañas** (`.seg-tabs`, desde 1.57.0, ver ADR 0012) directo al inicio
de la vista: Resumen (default desde 1.60.0, todo lo de nivel semana) / Hoy
(solo el día activo). Desde 1.59.0 (ADR 0014) ninguna navegación de semana/
día vive fuera de las pestañas — cada una es dueña de su contenido. El
nombre de la vista y de la pestaña de registro cambiaron en 1.60.0 (ver
ADR 0015): antes eran "Hoy" (vista) y "Registro" (pestaña).

### Resumen (pestaña por defecto)

1. **Riel de semanas.** Botón "+ Nueva semana" (abre selector de fecha, se
   ajusta al lunes más cercano) seguido de una píldora por semana. La
   semana activa muestra una X para eliminarla (si hay más de una). Tocar
   una semana **se queda en Resumen** (refresca riel de días, racha y
   comparación).
2. **Riel de días.** 7 pestañas (L M X J V S D): letra en "placa", nombre
   corto y grupo muscular (primera palabra). Estados: activa / completada
   (≥ mínimo de ejercicios) / con marca de "migrado". Tocar un día **manda
   a Hoy** con ese día cargado (mismo patrón que `goToDate()`).
3. **Card de racha:** número grande + una sola medalla (bronce/plata/oro a
   7/30/100 días — solo la más alta ya ganada, del alto del número) + botón
   **compartir resumen semanal** (imagen); debajo de una línea divisoria,
   "Mejor racha" y cuánto falta para la siguiente medalla. Antes vivía en
   el header, visible en las 6 pantallas; ahora solo se ve acá.
4. **Comparación semanal** (tarjeta, solo si la semana anterior es la
   inmediata): "Esta semana vs. la pasada", con Volumen (± %) y
   Adherencia (hechos/total y "antes X/Y"). En la semana en curso compara
   solo hasta el día de hoy.
5. **Nota de la semana:** textarea ("Cómo te sentiste, lesiones,
   ajustes…").
6. **Eliminar esta semana** (enlace ghost, con doble confirmación).

### Hoy

7. **Selector de día compacto** (`.day-switch-row`): flechas ‹ › + fecha
   ("Martes · 15 sep") y, al final de la misma fila, un ícono que despliega
   el **conversor kg ⇄ lbs** (sheet, ver abajo). Reemplaza al riel de 7
   días dentro de esta pestaña (que vive en Resumen) — cambiar de día
   también se puede **deslizando** el panel a izquierda/derecha (misma
   lógica, `stepActiveDay()`).
8. **Panel de sesión del día**: botón play/stop y campos Hora inicio, Hora
   fin y Duración calculada. Arriba de la tabla de ejercicios.
9. **Panel del día:**
   - Cabecera: grupo muscular, línea de stats fusionada ("9 series · 4,980
     kg"), botón **compartir día** (imagen) y **anillo de progreso**
     hechos/total con color de semáforo. No lleva "Día · fecha" (lo cubre
     el selector de arriba) ni el botón de compartir resumen semanal (vive
     en Resumen).
   - **Sin ejercicios:** mensaje vacío + botones "Copiar semana pasada" y
     "+ Agregar ejercicio".
   - **Con ejercicios:** encabezado de columnas (Ejercicio · Kg · Rep ·
     Ser) y una **fila por ejercicio**, con 7 controles siempre visibles:
     - Check para marcar hecho / pendiente.
     - Nombre (toca para editar, con autocompletado de la librería) y nota
       corta ("+ nota").
     - Inputs Kg, Rep, Ser — al tocar uno para editar, el cursor va directo
       al final del valor (no donde cayó el toque).
     - Chevron y asa de arrastre para **reordenar**.
     - **Detalle expandible** (chevron): fila de acciones ("Ver progreso" /
       "Ver info" si hay coincidencia con el ojo / "Eliminar" en rojo, con
       la papelera) y, debajo, la comparación Kg/Rep/Ser con la semana
       pasada (flechas ↑ ↓ =) con sugerencia de carga (+ incremento), o
       "Sin datos de la semana pasada".
   - Fila "+ Agregar ejercicio" y notas del día (si existen).
   - **Migrar día:** botón que abre un selector con los días posteriores de
     la semana (avisa si el destino ya tiene rutina, que se recorre) y
     botones Migrar / cancelar.

**Conversor kg ⇄ lbs:** no es una card fija — es un sheet
(`#converter-overlay`) que se abre desde el ícono del selector de día en
Hoy (punto 7) y se cierra tocando el fondo. El campo kg recibe el foco (con
su valor seleccionado) apenas se abre, para que el teclado numérico
aparezca de una vez en celular.

Estado vacío global (sin semanas): tarjeta "Todavía no has creado ninguna
semana" con botón "+ Nueva semana" (Resumen).

---

## 4. Vista HISTORIAL (`#view-historial`)

1. **Buscador** de ejercicio (con autocompletado): filtra semanas que
   contengan ese ejercicio.
2. **Riel de meses:** "Todas" + un mes por píldora.
3. **Lista de tarjetas por semana:** etiqueta de la semana, total
   hechos/total de ejercicios, botón compartir (imagen) y fila de **7
   puntos** L M X J V S D (relleno = día cumplido; el domingo aparece
   siempre). Tocar la tarjeta o un punto abre esa semana/día en **Semana → Hoy**.
   Estado vacío: "No hay semanas en este mes / con ese ejercicio".
4. **Balance por grupo muscular:** barras horizontales con los días
   cumplidos por grupo en el período filtrado.

---

## 5. Vista PROGRESO (`#view-progreso`)

**3 pestañas** (`.seg-tabs`, patrón de selector de modo — no de filtro):
Ejercicios · Constancia · Horarios. Las dos últimas vivían en Perfil; se
movieron acá desde la 1.56.0 (ver ADR 0011) porque son análisis de tu
entrenamiento, no datos de cuenta.

### Ejercicios (pestaña por defecto)

1. **Buscador** de ejercicio principal.
2. **Fila de comparación** (aparece al elegir uno): segundo buscador
   ("Comparar con… opcional") y toggle para mostrar **repeticiones**.
3. **Contenido:**
   - **Sin ejercicio elegido → mini-dashboard:** cuadrícula de tarjetas
     con **sparkline** por ejercicio, ícono de tendencia (sube/baja) y
     último peso; tocar una tarjeta abre su detalle.
   - **Con ejercicio → detalle:** chips Último · Mejor · Cambio (kg, con
     color según signo) y tarjeta con **gráfica** de carga en el tiempo
     (opcionalmente vs. un 2.º ejercicio y línea de reps; zoom/paneo,
     doble clic para resetear).
   - Solo cuenta apariciones marcadas como **hechas**.
   - Sin datos: placeholder "Busca un ejercicio arriba para ver su
     progreso".

### Constancia (ex-Perfil)

Tres bloques — periodos de **mayor** constancia (top con trofeo/medallas
oro-plata-bronce, rango de fechas y "N semanas seguidas con X días en
promedio"), periodos de **menor** constancia (huecos sin entrenar, ícono
de alerta) e "Hitos interesantes" (primer entrenamiento, mejor racha,
mejor mes, hueco más largo, año más productivo).

### Horarios (ex-Perfil)

Filtros de año y mes; chips Tiempo total · Promedio · Más larga · Hora
frecuente; gráfica "Duración por sesión" y barras "¿A qué hora sueles
entrenar?".

---

## 6. Vista CALENDARIO (`#view-calendario`)

1. **Calendario mensual:** flechas mes anterior / siguiente, título
   "Mes año", botón "Volver a hoy", cabecera L M X J V S D y cuadrícula.
   Cada día muestra número y una **línea de color** (semáforo); días de
   otro mes atenuados, hoy resaltado, días con semana registrada son
   tocables (abren **Semana → Hoy**). Leyenda: Sin actividad / 1–5 / 6+ ejercicios.
   Sábado y domingo sin ejercicios quedan sin línea (no rojo).
2. **Actividad del año (heatmap):** riel de años y cuadrícula tipo
   contribuciones con etiquetas de mes; celdas coloreadas por semáforo,
   con tooltip de fecha y tocables.

---

## 7. Vista PERFIL (`#view-perfil`)

Solo cuenta/datos — Hitos y Horarios se movieron a Progreso (ver arriba).

1. **Tus datos:** botones Exportar e Importar (JSON).
2. **Backups automáticos:** lista de los últimos 14 con fecha, tamaño y
   descarga.
3. **Cerrar sesión.**
4. **Changelog** (colapsable): versión actual + historial de versiones.

---

## 8. Vista AJUSTES (`#view-ajustes`)

1. **Reglas** (4 campos numéricos + Guardar): ejercicios mínimos por día
   cumplido · días mínimos por semana para no romper la racha · días/semana
   para "semana fuerte" en Hitos · semanas seguidas mínimas para mostrar un
   periodo en Hitos. Aplican de inmediato a toda la app.
2. **Fuente de nombres de ejercicios:** radio **Personalizada** vs.
   **Dataset** (1.324 ejercicios con GIF).
3. **Librería de ejercicios:** input para agregar, buscador, contador y
   lista (con borrado por ítem, con confirmación). También se llena sola al
   escribir ejercicios nuevos.

---

## 9. Interacciones y reglas de negocio que afectan la UI

- **Día cumplido:** ≥ N ejercicios marcados (configurable, por defecto 3).
- **Racha:** cuenta días cumplidos consecutivos entre semanas; una semana
  necesita ≥ N días cumplidos (por defecto 5) para no romperla. Sábado y
  domingo son bonus (solo cuentan si tienen ejercicios). "Migrar día" no
  cuenta como fallo del día de origen.
- **Compartir:** día, semana (Historial) y resumen semanal se exportan como
  imagen (html2canvas).
- **Gestos:** deslizar entre días, arrastrar para reordenar ejercicios,
  doble clic en gráficas para resetear zoom.
- **Diálogos:** propios (`confirmDialog()` y `promptDialog()`): eliminar semana,
  quitar de la librería, importar datos y la nota de un ejercicio. Ya no se usa
  ningún diálogo nativo del navegador.
- **PWA / offline:** instalable, shell cacheado, cola de cambios offline.

---

## 10. Puntos a revisar para el rediseño

Observaciones de la estructura actual (candidatos, no decisiones):

- ~~Hoy concentra demasiado~~ — atenuado (1.57.0, [ADR 0012](adr/0012-hoy-pestanas-registro-resumen.md)):
  2 pestañas (Registro / Resumen) separan lo diario de lo ocasional.
- ~~6 ítems en la nav inferior~~ — resuelto: 5 con Ajustes al header
  (1.50.0), y 4 con Perfil también al header (1.58.0, [ADR 0013](adr/0013-perfil-al-header.md)).
- ~~Acciones destructivas con `confirm()` del navegador~~ — resuelto (1.53.0):
  diálogo propio con contexto y botón rojo. La nota, con `prompt()`, también
  (1.55.0).
- ~~Fila de ejercicio muy cargada (9 controles)~~ — resuelto (1.59.0,
  [ADR 0014](adr/0014-registro-solo-dia-activo.md)): ojo y papelera se
  movieron al detalle del chevron, quedan 7 controles siempre visibles.
- ~~"Mejor racha" vive en la tira del día aunque no es del día~~ — resuelto
  (1.57.0, [ADR 0012](adr/0012-hoy-pestanas-registro-resumen.md)): racha
  actual y mejor racha viven juntas en su propia card, en Semana → Resumen.
- ~~Perfil mezcla análisis con administración~~ — resuelto (1.56.0):
  Hitos y Horarios se movieron a Progreso; Perfil quedó solo con
  cuenta/datos.
- **Progreso** sin ejercicio depende de un buscador vacío; el dashboard de
  sparklines es más útil como estado inicial que como fallback.
- ~~Errores de carga en texto plano~~ — resuelto (1.54.0): esqueletos en la
  primera carga, Reintentar en el arranque y en backups, y aviso con Recargar
  si no cargó Chart.js. Los estados **vacíos** (Calendario, librería) siguen
  siendo texto plano sin acción sugerida.
- **Consistencia:** los rieles de píldoras se usan para semanas, meses y
  años con el mismo estilo aunque su jerarquía difiere.
