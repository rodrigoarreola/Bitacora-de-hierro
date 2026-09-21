# Auditoría de organización de la PWA

> **Estado:** foto del 2026-09-21, antes de los cambios 1.47–1.50 (arranque
> sin conexión, caché versionado, tokens y componentes, hash routing, Ajustes
> en el header). Se conserva como registro; el estado actual está en
> `CHANGELOG.md` y `docs/SCREENS.md`.

Auditoría de **solo lectura** (código e historial de git) de Bitácora de
Hierro, versión `1.46.0`. No se probó en un dispositivo ni con Lighthouse;
lo que no se pudo determinar está al final.

## Stack detectado

- **Frontend:** vanilla JS, CSS y HTML, sin framework ni build. Scripts
  propios: `js/offline-queue.js`, `js/api.js` y `js/app.js` (3.367 líneas).
- **CDN (sin bundler):** Font Awesome, Chart.js con zoom, html2canvas y
  Google Fonts.
- **Backend:** PHP 8 con PDO y MySQL, un endpoint por archivo en `api/`.
- **Servido:** Apache (`.htaccess`) en producción y `php -S` en local.
- **Proceso:** hook `pre-commit` que recalcula el hash del caché del
  service worker; despliegue por FTP/SFTP con `scripts/deploy-ftp.ps1`.
- **No hay:** `package.json`, tests ni CI.

## Resumen

1. Base sólida: tokens de color, changelog en formato Keep a Changelog,
   CSS organizado por secciones y hash de caché del service worker
   automático.
2. **No hay routing.** Las 6 vistas se alternan con CSS: sin URL por
   vista, sin botón atrás y sin enlaces directos. Recargar devuelve a Hoy.
3. La barra inferior tiene **6 destinos** (lo ideal son 3 a 5).
4. **Abrir la PWA sin conexión desde cero manda al Login**: `session.php`
   falla y `bootstrap()` llama a `showLogin()`.
5. Al arrancar hay pantalla en blanco; ninguna vista tiene estado de
   "cargando".
6. El service worker no avisa de versiones nuevas, y tras un deploy
   `index.html` va a la red primero pero `css/js` van a caché primero.
7. Font Awesome, Chart.js, html2canvas y las tipografías vienen de CDN sin
   cachear: sin red se pierden íconos, gráficas y compartir como imagen.
8. `js/app.js` es un IIFE de 3.367 líneas que mezcla las 6 vistas, reglas
   de negocio, el changelog completo (líneas 47 a 238), offline y sesión.
9. Hay 14 variantes de tarjeta y 12 de botón copiadas; existen tokens de
   color, pero no de radio (8 valores), tamaño de fuente (~10 valores
   entre 9.5 y 13 px) ni espaciado.
10. **0 de 63 commits** siguen Conventional Commits, no hay tags de git y
    el changelog está duplicado (`CHANGELOG.md` y `APP_VERSIONS`).

---

## 1. Inventario de pantallas

Ninguna pantalla es huérfana ni está duplicada, pero varias mezclan tipos:

- **Hoy:** formulario + dashboard de resumen + utilidades (conversor,
  gestión de semanas).
- **Perfil:** análisis (Hitos, Horarios) + administración (datos, backups,
  sesión, changelog).
- **Ajustes:** configuración + gestión de contenido (librería de
  ejercicios).

Elementos repetidos: 3 buscadores de ejercicio (Historial, Progreso y
Progreso 2) y "Mejor racha" en un chip de Hoy aunque no es del día.

El inventario completo está en el borrador de `SCREENS.md` (más abajo).

## 2. Navegación y arquitectura de información

- Único acceso: barra inferior de 6 destinos (Hoy, Historial, Progreso,
  Calendario, Perfil, Ajustes). Hay atajos: tocar una semana en Historial
  o un día en Calendario/Heatmap lleva a Hoy; "Ver progreso" lleva a
  Progreso con el ejercicio cargado.
- **Alcance al pulgar:** Hoy y Progreso bien ubicados. Calendario, Perfil
  y Ajustes son de uso ocasional pero ocupan 3 de los 6 lugares.
- **Sin URLs:** `switchToView()` solo alterna clases. No hay `pushState`,
  `hashchange` ni `popstate`; el botón atrás cierra la app.

## 3. Estados de cada pantalla

✓ = manejado, ✗ = falta, ~ = parcial.

| Pantalla | Vacío | Cargando | Error | Offline |
|---|---|---|---|---|
| Arranque | n/a | ✗ (pantalla en blanco) | ✗ (cae a Login) | ✗ (cae a Login) |
| Login | n/a | ~ (botón deshabilitado, sin indicador) | ✓ | ✗ |
| Hoy | ✓ | ✗ | ~ (toast por acción) | ~ (cola solo para editar ejercicio, nota de semana y borrar ejercicio) |
| Historial | ✓ | ✗ | n/a | ~ (solo con datos ya cargados) |
| Progreso | ✓ | ✗ | ✗ (sin guard si Chart.js no cargó) | ✗ (Chart.js viene de CDN) |
| Calendario y heatmap | ~ (cuadrícula sin mensaje) | ✗ | n/a | ~ |
| Perfil: Hitos y Horarios | ✓ | ✗ | n/a | ~ |
| Perfil: Backups | ✓ | ✗ | ✓ | ✗ |
| Ajustes | ~ (librería vacía sin verificar) | ✗ | ~ (toast) | ✗ |
| Info de ejercicio | ✓ | ✓ | ✓ | ✗ |

Offline, crear semana, agregar ejercicio, migrar día, copiar semana e
importar no entran en la cola y fallan con "Sin conexión".

## 4. Agrupación de elementos y estilos

- **Tarjetas copiadas** con la misma receta (`surface` + borde + radio 14
  o 16 + padding): `day-panel`, `lib-panel`, `perfil-panel`,
  `milestones-panel`, `heatmap-panel`, `cal-panel`, `recap-card`,
  `prog-chart-card`, `week-note-panel`, `day-session-panel`,
  `converter-panel`.
- **Botones:** 12 clases sueltas (`btn-add-ex`, `btn-copy-week`,
  `btn-delete-week`, `btn-migrate`, `perfil-btn`, `logout-btn`,
  `share-btn`, etc.), sin base común.
- **Modales:** solo uno (info de ejercicio); el resto usa `confirm()`
  nativo.
- **Tokens:** 14 variables de color bien usadas (302 `var(--)`), pero 14
  `rgba(...)` sueltos, un `#0E1710` y un `#fff`. Sin tokens de radio (4, 8,
  9, 10, 12, 14, 16, 20), tamaño de fuente ni espaciado.
- **Otros:** 0 `@media` (ancho fijo máximo de 520 px); safe-area de iOS
  contemplada; sin `role`, `aria-current` en la nav ni
  `prefers-reduced-motion`.

## 5. Organización del código

- **Bien:** `api/` y `scripts/` separados; scripts de BD en `api/db/`; un
  CSS coherente con las vistas y comentado por bloques; `api.js` y
  `offline-queue.js` ya son módulos aparte.
- **Mezclado:** `js/app.js` junta las 6 vistas, racha e Hitos, info de
  ejercicio, compartir imagen, export/import, sesión, offline y el
  changelog embebido.
- **Demasiado grande:** `js/app.js` (3.367 líneas, un IIFE) y
  `css/styles.css` (822 líneas, un solo archivo).

## 6. Documentación y proceso

- **`CHANGELOG.md`:** existe (48 versiones), formato Keep a Changelog con
  semver, pero sin tags de git y duplicado en `APP_VERSIONS`
  (`js/app.js`).
- **`README.md`:** existe (233 líneas).
- **`ESTRUCTURA.md`:** mapa de código, desactualizado (dice 1.45.0).
- **Mapa de pantallas:** no versionado (`UI-ESTRUCTURA.md` está sin
  trackear).
- **ADR:** no hay; las decisiones viven en comentarios y en el changelog.
- **Commits:** 0 de 63 siguen Conventional Commits (mensajes en español,
  en imperativo libre).
- **Comentarios obsoletos:** `js/app.js:3290` cita `PLAN-8-FEATURES.md`
  (ya eliminado) y `sw.js` dice que la app "no tiene sincronización
  offline", cuando ya la tiene.
- Los cambios sin commitear a la racha del domingo no están en el
  changelog todavía.

## 7. Específico de PWA

- **Manifest:** nombre, `short_name`, `display: standalone`, colores,
  `lang` e íconos 192/512 presentes. Íconos con `"any maskable"` juntos
  (se recomienda separarlos). Faltan `id`, `categories`, `shortcuts` y
  `screenshots`.
- **Service worker:** precache del shell; estáticos con caché primero;
  navegación con red primero y respaldo a `index.html`; `api/` y otros
  orígenes sin interceptar.
- **Nombre del caché:** `bitacora-shell-<hash del contenido>`, automático
  vía hook, pero solo si cada clon activó
  `git config core.hooksPath .githooks`. Está ligado al contenido, no a la
  versión semver.
- **Aviso de versión nueva:** no existe. Hay `skipWaiting` y
  `clients.claim`, pero sin `updatefound` ni `controllerchange` en la
  página.
- **Sin conexión:** con la app ya abierta hay banner y cola para 3 tipos
  de edición. En frío, cae al Login; sin CDNs no hay íconos, gráficas,
  tipografías ni compartir imagen.

---

## Tabla de hallazgos

| Área | Qué encontré | Qué falta | Prioridad | Esfuerzo |
|---|---|---|---|---|
| Arranque | Pantalla en blanco; un error de red manda a Login | Splash de carga y pantalla "sin conexión, reintentar" | Alta | Chico |
| PWA | Sin aviso de nueva versión; `index.html` va a la red primero y `css/js` al caché | Aviso "hay versión nueva, actualizar" y misma estrategia para todo el shell | Alta | Chico a mediano |
| Navegación | 6 destinos y sin URLs | Hash routing (`#/hoy`), botón atrás y bajar a 5 destinos | Alta | Mediano |
| Estilos | 14 tarjetas y 12 botones copiados; sin tokens de radio, espacio ni tamaño | Tokens nuevos y clases base `.card` y `.btn` | Alta | Mediano |
| Offline | CDNs sin cachear; el arranque en frío sin red no funciona | Vendorizar librerías y fuentes, o cachearlas | Media | Mediano |
| Offline | Cola solo para 3 tipos de acción | Ampliar la cola o avisar mejor qué no se puede hacer offline | Media | Grande |
| Código | `app.js` de 3.367 líneas, con el changelog dentro | Sacar `APP_VERSIONS` y dividir por feature | Media | Chico (primer paso) a grande |
| Estados | Sin "cargando" en ninguna vista; errores solo por toast | Skeletons y estados de error con reintento | Media | Mediano |
| UX | `confirm()` nativo para acciones destructivas | Reusar el sheet ya existente | Media | Chico |
| Docs | Changelog duplicado y sin tags; comentarios obsoletos | Fuente única, tags de git y corregir comentarios | Media | Chico |
| Proceso | 0 de 63 commits en Conventional Commits | Adoptarlos desde ahora (sin reescribir historia) | Baja | Chico |
| Docs | Sin SCREENS.md ni ADR | Crear `docs/` con ambos | Baja | Chico |
| Accesibilidad | Sin `role`, `aria-current` ni `prefers-reduced-motion` | Revisión básica | Baja | Mediano |
| Manifest | Íconos `any maskable` juntos; faltan `id`, `shortcuts`, `screenshots` | Separar íconos y agregar campos | Baja | Chico |

---

## Borrador de SCREENS.md

Sin router: las vistas son secciones de `index.html` alternadas por
`switchToView()`. Ninguna tiene URL propia. Todas cargan sus datos al
iniciar sesión (`loadAppData()`).

| Pantalla | Tipo | Ruta | Datos | Estados (V/C/E/O) |
|---|---|---|---|---|
| Login | Formulario | `#view-login` (sin URL) | `session.php`, `login.php` | V n/a · C ~ · E ✓ · O ✗ |
| Hoy | Formulario + dashboard | `#view-hoy` | `weeks.php`, `exercises.php`, `migrate_day.php`, `library.php`, `settings.php` | V ✓ · C ✗ · E ~ · O ~ |
| Historial | Lista | `#view-historial` | semanas ya cargadas (memoria) | V ✓ · C ✗ · E n/a · O ~ |
| Progreso | Dashboard / detalle | `#view-progreso` | semanas en memoria + Chart.js (CDN) | V ✓ · C ✗ · E ✗ · O ✗ |
| Calendario | Dashboard | `#view-calendario` | semanas en memoria | V ~ · C ✗ · E n/a · O ~ |
| Perfil | Dashboard + ajustes | `#view-perfil` | semanas, `backups.php`, `import.php` | V ✓ · C ✗ · E ~ · O ~ |
| Ajustes | Ajustes | `#view-ajustes` | `settings.php`, `library.php`, dataset local | V ~ · C ✗ · E ~ · O ✗ |
| Info de ejercicio | Detalle (modal) | `#exercise-info-overlay` | `data/exercises-dataset.json`, `exercise_media.php` | V ✓ · C ✓ · E ✓ · O ✗ |

Leyenda: V vacío, C cargando, E error, O offline. Hoy y Perfil mezclan
tipos.

---

## Estructura de carpetas propuesta

Sin build y moviendo poco. La raíz, `api/`, `data/`, `scripts/`, `icons/`,
`index.html`, `manifest.json` y `sw.js` no se tocan.

```
css/
  styles.css            → se divide en:
  tokens.css            :root con color + radio, espacio y tamaños (nuevo)
  components.css        .card, .btn, .pill, .chip, .sheet (nuevo)
  views/                hoy.css, historial.css, progreso.css,
                        calendario.css, perfil.css, ajustes.css
js/
  app.js                solo arranque, sesión y navegación
  api.js, offline-queue.js   (se quedan donde están)
  shared/               dates.js, ui.js (toast, sheet, confirm),
                        share-image.js, state.js
  features/             hoy.js, historial.js, progreso.js, calendario.js,
                        perfil.js, ajustes.js, racha-hitos.js,
                        ejercicio-info.js
  changelog-data.js     APP_VERSIONS (sale de app.js)
docs/
  SCREENS.md, adr/, ESTRUCTURA.md, UI-ESTRUCTURA.md
```

- La división de JS se puede hacer con `<script>` clásicos en orden, sin
  módulos.
- Al mover archivos hay que actualizar `SHELL_ASSETS` en `sw.js` y la
  lista de `scripts/bump-sw-cache.php`.
- Conviene empezar por el CSS (tokens y componentes), que es lo que más
  sirve para el rediseño, y dejar `app.js` para después.

---

## Los 5 cambios con mejor impacto/esfuerzo

1. **Splash de carga y pantalla "sin conexión, reintentar"** en lugar de
   mandar al Login por un error de red. Esfuerzo chico. Arregla el blanco
   inicial y que la PWA offline parezca rota.
2. **Aviso de nueva versión y estrategia de caché coherente** para
   `index.html`, `css` y `js`. Esfuerzo chico a mediano. Evita que un
   deploy deje la app a medio actualizar.
3. **Tokens de radio, espaciado y tamaño, más clases base `.card` y
   `.btn`.** Esfuerzo mediano. Es la base del rediseño de UI: lo que hoy se
   cambia en 14 lugares pasa a ser uno.
4. **Hash routing (`#/hoy`, `#/historial`…) y bajar la barra a 5
   destinos.** Esfuerzo mediano. Da botón atrás y enlaces directos; el
   destino que sobra podría ser Ajustes, como ícono en el header.
5. **Sacar `APP_VERSIONS` de `app.js`**, con `CHANGELOG.md` como única
   fuente, tags de git y Conventional Commits desde ahora. Esfuerzo chico.
   Quita 190 líneas de `app.js` y una doble fuente de verdad.

---

## Lo que no se pudo determinar leyendo el código

- Cómo se comporta la app en un dispositivo real sin conexión, y si el
  service worker se actualiza bien tras un deploy (lo anterior sale solo
  del código).
- Si los íconos 192 y 512 respetan la zona segura del formato maskable.
- Si `core.hooksPath` está activo en cada clon (el hook solo funciona si
  lo está).
- El estado vacío de la librería en Ajustes y si `Chart` tiene guard
  cuando no carga.
- Los estados y errores del backend (`api/*.php`), que no se auditaron.
- Accesibilidad y rendimiento reales, sin Lighthouse.
