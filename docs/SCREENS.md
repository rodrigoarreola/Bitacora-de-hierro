# Pantallas

Inventario de pantallas de Bitácora de Hierro. Para el detalle de qué contiene
cada una, ver [UI-ESTRUCTURA.md](UI-ESTRUCTURA.md); para el mapa de código,
[ESTRUCTURA.md](ESTRUCTURA.md).

Las vistas son secciones de `index.html` que `showView()` (`js/app.js`) muestra
u oculta. Cada una tiene URL por hash: `switchToView()` registra la entrada en
el historial, así que atrás/adelante, recargar y los enlaces directos funcionan.
Sin un hash válido se abre `#/hoy`.

## Navegación

| Destino | Dónde está | Ruta |
|---|---|---|
| Semana | barra inferior | `#/hoy` (ruta interna, ver ADR 0015) |
| Historial | barra inferior | `#/historial` |
| Progreso | barra inferior | `#/progreso` |
| Calendario | barra inferior | `#/calendario` |
| Perfil | logo (header, izquierda) | `#/perfil` |
| Ajustes | ícono de engranaje (header, derecha) | `#/ajustes` |

Atajos entre vistas: una tarjeta de Historial o un día de Calendario/Heatmap
abren **Semana → Hoy** en esa semana y día; "Ver progreso" en un ejercicio abre
**Progreso** con ese ejercicio cargado.

## Inventario

| Pantalla | Tipo | Ruta | Datos | Estados (V / C / E / O) |
|---|---|---|---|---|
| Arranque | Estado | `#boot-screen` (sin ruta) | `api/session.php`, copia local | V n/a · C ✓ · E ✓ (Reintentar) · O ✓ |
| Login | Formulario | `#view-login` (sin ruta) | `api/session.php`, `api/login.php` | V n/a · C ✓ · E ✓ · O ~ |
| Semana | Dashboard + formulario (2 pestañas: Resumen default, Hoy) | `#/hoy` | `api/weeks.php`, `api/exercises.php`, `api/migrate_day.php`, `api/library.php`, `api/settings.php`, `js/split-catalog.js` (Guía del día) | V ✓ · C ✓ · E ~ · O ~ |
| Historial | Lista | `#/historial` | semanas ya cargadas (memoria) | V ✓ · C ✓ · E n/a · O ✓ |
| Progreso | Dashboard / detalle (3 pestañas: Ejercicios, Constancia, Horarios) | `#/progreso` | semanas en memoria + Chart.js (CDN, en caché del SW) | V ✓ · C ✓ · E ✓ · O ✓ |
| Calendario | Dashboard | `#/calendario` | semanas en memoria | V ~ · C ✓ · E n/a · O ✓ |
| Perfil | Datos / cuenta | `#/perfil` | semanas en memoria, `api/backups.php`, `api/import.php` | V ✓ · C ✓ · E ✓ · O ~ |
| Ajustes | Ajustes | `#/ajustes` | `api/split.php`, `api/settings.php`, `api/library.php`, `data/exercises-dataset.json` | V ~ · C ✓ · E ~ · O ✗ |
| Info de ejercicio | Detalle (bottom sheet) | `#exercise-info-overlay` (sin ruta) | `data/exercises-dataset.json`, `api/exercise_media.php` | V ✓ · C ✓ · E ✓ · O ✗ |
| Confirmación / texto | Diálogo (bottom sheet) | `#confirm-overlay` (sin ruta) | — | n/a |

**Leyenda:** V = vacío, C = cargando, E = error, O = sin conexión.
✓ manejado · ~ parcial · ✗ falta · n/a no aplica.

### Notas sobre los estados

- **Cargando:** al abrir la app se ve la pantalla de Arranque; al verificarse la
  sesión, el shell aparece con **esqueletos** (`renderSkeletons()`) en Semana,
  Historial, Progreso, Calendario, Perfil y Ajustes hasta que llegan los datos
  (`#app-shell.is-loading` y `aria-busy`; mientras tanto no se puede crear ni
  borrar semanas). Si la carga falla, se vuelve a la pantalla de Arranque con
  Reintentar, incluso justo después de iniciar sesión. Las recargas posteriores
  (sincronizar al volver la red) no usan esqueletos: ya hay datos en pantalla.
  La lista de backups muestra "Cargando…" la primera vez y, si falla, Reintentar.
  Login: el botón dice "Entrando…" mientras espera.
- **Sin conexión:** al abrir sin red se usa la copia local de datos
  (`js/snapshot.js`) con el banner "mostrando tus últimos datos guardados". La
  cola de `js/offline-queue.js` cubre editar/borrar ejercicios y la nota de la
  semana; crear semana, agregar ejercicio, migrar día, copiar semana, importar,
  guardar reglas y la librería requieren conexión. Las ediciones en cola no se
  reflejan en la copia local hasta sincronizar.
- **Librerías de CDN:** Chart.js, html2canvas, Font Awesome y las tipografías
  están en `bitacora-libs-v1` (caché del service worker), así que íconos,
  gráficas, tipografías y "Compartir" funcionan sin red desde la segunda visita
  (la primera, con conexión, las guarda). Si Chart.js no llegó a cargar (primera
  visita sin red), Progreso y Horarios muestran "Gráfica no disponible" con
  Recargar en vez de romperse.
- **Info de ejercicio (✗ O):** el dataset y los GIFs vienen del servidor y no
  se guardan en el service worker.
- **Ajustes (~ V):** el estado vacío de la librería de ejercicios no está
  verificado.
- **Calendario (~ V):** sin semanas registradas la cuadrícula aparece sin
  mensaje.

### Pantallas que mezclan tipos

- ~~Hoy: registro (formulario) + resumen (dashboard) + utilidades~~ —
  atenuado (1.57.0, [ADR 0012](adr/0012-hoy-pestanas-registro-resumen.md)):
  2 pestañas (Registro / Resumen) separan lo diario de lo ocasional. Sigue
  siendo una sola pantalla con dos modos, no dos pantallas.
- ~~Perfil: análisis (Hitos, Horarios) + administración~~ — resuelto
  (1.56.0, [ADR 0011](adr/0011-hitos-horarios-a-progreso.md)): Hitos y
  Horarios se movieron a Progreso; Perfil quedó solo con cuenta/datos.
- **Ajustes:** configuración (Reglas, fuente de nombres) + contenido
  (librería de ejercicios).
