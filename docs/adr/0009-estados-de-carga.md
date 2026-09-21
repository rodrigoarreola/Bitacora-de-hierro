# 0009. Esqueletos en la primera carga y Reintentar ante fallos

- **Estado:** Aceptada
- **Fecha:** 2026-09-21

## Contexto
Ninguna vista tenía estado de carga. Al abrir la app (o justo después de iniciar
sesión) el shell aparecía vacío mientras llegaban los datos, con "0 días",
chips en "0" y el botón de eliminar semana activo. Si la carga fallaba tras el
login, `loginError` se escribía en un formulario ya oculto y la persona veía una
app en blanco sin explicación. Además, sin Chart.js (primera visita sin red) el
render de Progreso y Horarios lanzaba un `ReferenceError`.

## Decisión
- **Esqueletos, no spinners**: en la primera carga de datos `loadAppData()` llama
  a `renderSkeletons()` y marca `#app-shell.is-loading` + `aria-busy="true"`. Los
  esqueletos ocupan el lugar de lo que va a aparecer (pastillas, días, panel del
  día, tarjetas, calendario, hitos, librería), no mueven el diseño al llegar los
  datos y los reemplaza el render normal. El brillo se apaga con
  `prefers-reduced-motion`.
- **Solo la primera vez** (`dataLoadedOnce`): las recargas posteriores, como al
  sincronizar al volver la red, ya tienen datos en pantalla y no los usan.
- **Mientras carga** no se pueden crear ni borrar semanas, y la racha y los
  chips muestran un bloque gris en vez de un "0" que parece un dato real.
- **Fallos**: si `loadAppData()` falla, se vuelve a la pantalla de Arranque con
  Reintentar, también tras iniciar sesión (antes el error iba al login oculto). El
  login muestra "Entrando…" mientras espera.
- **Chart.js ausente**: `chartsAvailable()` sustituye las gráficas por un aviso
  con Recargar; los chips y las barras de Horarios siguen visibles.
- **Backups**: "Cargando…" la primera vez (sin parpadeo en las siguientes) y
  Reintentar si falla.

## Alternativas descartadas
- **Spinner global**: no da idea de la forma del contenido y provoca un salto de
  diseño al llegar los datos.
- **Mantener la pantalla de Arranque hasta tener los datos**: evitaría los
  esqueletos, pero Progreso necesita estar visible al dibujar (un canvas de
  Chart.js en un contenedor oculto mide 0×0), y un enlace directo a `#/progreso`
  se dibujaría deforme.

## Consecuencias
- El estado de carga solo se ve cuando el servidor tarda; en desarrollo hay que
  provocarlo (por ejemplo, con un retraso temporal en `api/weeks.php`).
- Los esqueletos son marcado en `renderSkeletons()`: una vista nueva que cargue
  datos debe agregar el suyo ahí.
- Los estados **vacíos** (Calendario sin semanas, librería vacía) no cambian.
