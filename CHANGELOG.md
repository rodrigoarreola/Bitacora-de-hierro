# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/). Este proyecto todavía no tiene versiones etiquetadas (pre-release, solo frontend).

## [Unreleased]

### Added

- `index.html` inicial: frontend completo de la PWA con datos de ejemplo en memoria (sin backend todavía).
  - Header con racha actual / mejor racha (3+ ejercicios marcados, consecutivos, cruzando semanas).
  - Riel de semanas (más reciente primero) con creación de semana nueva restringida a lunes.
  - 5 tabs de día (Lun–Vie) que se marcan como cumplidos en verde.
  - Panel de día con ejercicios editables (nombre, kg, reps, series), nota por ejercicio, comparación contra la semana anterior (chevron expandible), alta/baja de ejercicios y copiado de rutina de la semana previa.
  - Librería de ejercicios con autocompletado, en la pestaña de Ajustes.
  - Swipe entre días y confirmaciones antes de eliminar ejercicios o semanas.
  - Identidad visual: acero oscuro + acento óxido, tipografías Big Shoulders Display / Inter / JetBrains Mono, iconos SVG inline.
  - Placeholders sin implementar para las vistas de Historial y Progreso.
- Control de versiones local con git.
- `README.md` y `CHANGELOG.md`.
