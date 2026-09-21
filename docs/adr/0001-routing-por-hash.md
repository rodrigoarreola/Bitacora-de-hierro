# 0001. Routing por hash, sin router ni servidor

- **Estado:** Aceptada
- **Fecha:** 2026-09-21

## Contexto
Las 6 vistas eran secciones de `index.html` alternadas con clases CSS: sin URL
por vista, el botón atrás cerraba la app y no había enlaces directos. La app se
sirve como archivos sueltos en hosting compartido y en una subcarpeta
(`/bitacora`), sin build ni framework.

## Decisión
Rutas por hash (`#/hoy`, `#/historial`, `#/progreso`, `#/calendario`,
`#/perfil`, `#/ajustes`). `showView()` solo muestra la vista; `switchToView()`
la muestra y registra la entrada con `history.pushState`; un listener
`hashchange` atiende atrás/adelante. `switchToView()` se mantiene síncrona.

## Alternativas descartadas
- **Rutas con path (`/perfil`)**: exigen reescritura de URLs en el servidor y
  rompen el requisito de funcionar en cualquier subcarpeta con rutas relativas.
- **Librería de routing**: no hay build ni dependencias de JS; sería mucho
  peso para 6 vistas.
- **Router asíncrono (renderizar en `hashchange`)**: `goToProgress()` necesita
  la vista visible *antes* de dibujar el gráfico (un canvas de Chart.js en una
  vista `display:none` mide 0×0).

## Consecuencias
- Atrás/adelante, recarga y enlaces directos funcionan; la barra y el header
  marcan el destino activo con `aria-current`.
- `pushState` no dispara `hashchange`, por eso no hay bucles.
- No hay parámetros en la ruta: "Ver progreso" pasa el ejercicio por memoria,
  así que `#/progreso` abierto en frío no carga un ejercicio concreto.
