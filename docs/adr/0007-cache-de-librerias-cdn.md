# 0007. Librerías de CDN en un caché propio del service worker

- **Estado:** Aceptada
- **Fecha:** 2026-09-21

## Contexto
Chart.js, chartjs-plugin-zoom, html2canvas, Font Awesome y las tipografías de
Google Fonts vienen de CDN y el service worker no los interceptaba. Con la copia
local de datos (ADR 0002) la app ya abría sin red, pero sin íconos, sin gráficas,
sin tipografías y sin "Compartir como imagen".

## Decisión
El service worker guarda esas librerías en `bitacora-libs-v1`, un caché **separado
del shell**: caché primero para `cdnjs.cloudflare.com`, `fonts.googleapis.com` y
`fonts.gstatic.com`. Sus URLs son inmutables (llevan la versión), así que no se
invalida con cada versión de la app y `activate` solo borra los `bitacora-shell-*`
viejos.

- **Precarga en `install`**, porque en la primera visita la página carga antes de
  que el SW la controle y esas peticiones no pasarían por él. Las URLs se leen del
  propio `index.html` (no hay una lista duplicada en `sw.js`), y de los CSS solo
  se guardan las fuentes que la app usa: Font Awesome `solid` y los subconjuntos
  `latin` y `latin-ext` de Google Fonts (6 archivos, ~236 KB, en vez de ~1 MB).
  Es de mejor esfuerzo: si falla, se guardan al pedirlas.
- **Peticiones en modo CORS**: una respuesta opaca (`no-cors`) le cuesta a Chrome
  ~7 MB de cuota por archivo aunque pese 40 KB. Los tres CDN envían
  `Access-Control-Allow-Origin: *`; si alguno dejara de hacerlo, se cae a la
  petición original.

Guarda ~910 KB en total (12 archivos).

## Alternativas descartadas
- **Vendorizar (descargar las librerías al repo)**: elimina la dependencia de los
  CDN y no exige una primera visita en línea, pero agrega ~1 MB al repositorio y
  a cada despliegue, y exige mantener licencias y versiones a mano. Se descartó
  por preferencia del dueño del proyecto; sigue siendo una salida si un CDN
  desaparece.

## Consecuencias
- La primera visita debe ser con conexión; desde entonces íconos, gráficas,
  tipografías y "Compartir" funcionan sin red.
- La app sigue dependiendo de los CDN para esa primera visita y para versiones
  nuevas de una librería.
- `LIBS_CACHE` no se limpia solo: subir una librería de versión deja la anterior
  guardada. Para vaciarlo, cambiar el nombre a `bitacora-libs-v2` en `sw.js`.
- Si se usa otro estilo de Font Awesome (regular/brands) o texto en otro alfabeto,
  hay que ampliar `fontUrlsToWarm()`; mientras tanto esos casos piden a la red y
  caen a una fuente del sistema.
- El dataset de ejercicios y los GIFs vienen del servidor y siguen sin guardarse.
