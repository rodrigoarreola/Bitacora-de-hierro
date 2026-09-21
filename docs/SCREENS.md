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
| Hoy | barra inferior | `#/hoy` |
| Historial | barra inferior | `#/historial` |
| Progreso | barra inferior | `#/progreso` |
| Calendario | barra inferior | `#/calendario` |
| Perfil | barra inferior | `#/perfil` |
| Ajustes | ícono de engranaje en el header | `#/ajustes` |

Atajos entre vistas: una tarjeta de Historial o un día de Calendario/Heatmap
abren **Hoy** en esa semana y día; "Ver progreso" en un ejercicio abre
**Progreso** con ese ejercicio cargado.

## Inventario

| Pantalla | Tipo | Ruta | Datos | Estados (V / C / E / O) |
|---|---|---|---|---|
| Arranque | Estado | `#boot-screen` (sin ruta) | `api/session.php`, copia local | V n/a · C ✓ · E ✓ (Reintentar) · O ✓ |
| Login | Formulario | `#view-login` (sin ruta) | `api/session.php`, `api/login.php` | V n/a · C ~ · E ✓ · O ~ |
| Hoy | Formulario + dashboard | `#/hoy` | `api/weeks.php`, `api/exercises.php`, `api/migrate_day.php`, `api/library.php`, `api/settings.php` | V ✓ · C ~ · E ~ · O ~ |
| Historial | Lista | `#/historial` | semanas ya cargadas (memoria) | V ✓ · C ~ · E n/a · O ✓ |
| Progreso | Dashboard / detalle | `#/progreso` | semanas en memoria + Chart.js (CDN, en caché del SW) | V ✓ · C ~ · E ✗ · O ✓ |
| Calendario | Dashboard | `#/calendario` | semanas en memoria | V ~ · C ~ · E n/a · O ✓ |
| Perfil | Dashboard + datos | `#/perfil` | semanas en memoria, `api/backups.php`, `api/import.php` | V ✓ · C ~ · E ✓ · O ~ |
| Ajustes | Ajustes | `#/ajustes` | `api/settings.php`, `api/library.php`, `data/exercises-dataset.json` | V ~ · C ~ · E ~ · O ✗ |
| Info de ejercicio | Detalle (bottom sheet) | `#exercise-info-overlay` (sin ruta) | `data/exercises-dataset.json`, `api/exercise_media.php` | V ✓ · C ✓ · E ✓ · O ✗ |

**Leyenda:** V = vacío, C = cargando, E = error, O = sin conexión.
✓ manejado · ~ parcial · ✗ falta · n/a no aplica.

### Notas sobre los estados

- **Cargando (~):** la carga inicial se cubre con la pantalla de Arranque, pero
  no hay esqueletos por vista: tras iniciar sesión o al sincronizar, la vista
  se ve vacía un instante.
- **Sin conexión:** al abrir sin red se usa la copia local de datos
  (`js/snapshot.js`) con el banner "mostrando tus últimos datos guardados". La
  cola de `js/offline-queue.js` cubre editar/borrar ejercicios y la nota de la
  semana; crear semana, agregar ejercicio, migrar día, copiar semana, importar,
  guardar reglas y la librería requieren conexión. Las ediciones en cola no se
  reflejan en la copia local hasta sincronizar.
- **Librerías de CDN:** Chart.js, html2canvas, Font Awesome y las tipografías
  están en `bitacora-libs-v1` (caché del service worker), así que íconos,
  gráficas, tipografías y "Compartir" funcionan sin red desde la segunda visita
  (la primera, con conexión, las guarda). Sigue sin haber aviso si Chart.js no
  carga en una primera visita sin red (Progreso ✗ E).
- **Info de ejercicio (✗ O):** el dataset y los GIFs vienen del servidor y no
  se guardan en el service worker.
- **Ajustes (~ V):** el estado vacío de la librería de ejercicios no está
  verificado.
- **Calendario (~ V):** sin semanas registradas la cuadrícula aparece sin
  mensaje.

### Pantallas que mezclan tipos

- **Hoy:** registro (formulario) + resumen (dashboard) + utilidades
  (conversor, gestión de semanas).
- **Perfil:** análisis (Hitos, Horarios) + administración (datos, backups,
  sesión, changelog).
- **Ajustes:** configuración (Reglas, fuente de nombres) + contenido
  (librería de ejercicios).
