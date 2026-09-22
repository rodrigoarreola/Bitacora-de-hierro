# 0011. Hitos y Horarios se mudan de Perfil a Progreso, con pestañas en Progreso

- **Estado:** Aceptada
- **Fecha:** 2026-09-22

## Contexto
Perfil mezclaba análisis del entrenamiento (Hitos y constancia, Horarios de
entrenamiento — ambos calculados de `state.weeks`, sin relación con la cuenta)
con administración de cuenta (exportar/importar, backups, cerrar sesión,
changelog). Ya estaba anotado en `docs/UI-ESTRUCTURA.md` como una de las
pantallas que mezclan tipos.

El usuario planteó mover Perfil a un ícono del header (en vez de la barra
inferior), inspirado en una PWA de referencia (captura de otra app propia)
donde el perfil es solo cuenta/ajustes personales y las estadísticas viven en
la pantalla de progreso, con pestañas segmentadas dentro de cada pantalla en
vez de más destinos en la barra. Para que un ícono de header no esconda
contenido real, Perfil necesitaba quedar liviano primero.

## Decisión
- **Hitos y constancia** y **Horarios de entrenamiento** se mueven de Perfil a
  Progreso, como dos pestañas nuevas junto a la ya existente (renombrada
  "Ejercicios"): **Ejercicios · Constancia · Horarios**.
- Nuevo componente `.seg-tabs`/`.seg-tab` (`components.css`): un selector de
  modo de pantalla (pocas opciones fijas, una activa a la vez), distinto del
  riel de píldoras (`.week-rail`/`.week-pill`, que filtra listas con scroll).
  Reutilizable para lo que sigue (Hoy también lo usará).
- `progTab` (estado en memoria, no en la URL — igual que `historialMonth` o
  `heatmapYear`) decide qué pestaña se ve; `renderMilestones()` y
  `renderTimeStats()` se siguen llamando siempre desde `updateStreakBadge()`,
  sin importar la pestaña activa (mismo criterio que cuando vivían en Perfil:
  el contenido llega actualizado aunque esté oculto).
- **Horarios vuelve a renderizarse al mostrar su pestaña** (`setProgTab()`):
  Chart.js mide el canvas al crearlo, y un contenedor `display:none` mide
  0×0 — mismo motivo por el que `switchToView()` va antes de `renderProgreso()`
  en `goToProgress()`.
- El CSS de ambos bloques se mueve de `perfil.css` a `progreso.css` completo
  (un selector, un archivo — mismo criterio que ADR 0004).

## Alternativas descartadas
- **Apilar Hitos/Horarios debajo del contenido de Ejercicios, sin pestañas**:
  mueve el problema de pantalla sin resolverlo — Progreso pasaría a ser tan
  largo como era Perfil.
- **Dejar Hitos/Horarios en Perfil** y solo mover el resto (datos, backups,
  sesión) a un header liviano: no resuelve el problema de fondo (Perfil
  seguiría mezclando análisis con cuenta), y un ícono de header escondería
  contenido que se usa seguido.

## Consecuencias
- Perfil queda con 4 bloques, todos "cuenta/datos": Tus datos, Backups
  automáticos, Cerrar sesión, Changelog — listo para vivir detrás de un
  ícono de header (siguiente paso de esta misma dirección de trabajo).
- Progreso gana profundidad (3 pestañas) pero cada una es más simple de
  escanear que el Perfil anterior.
- `goToProgress()` (el atajo "Ver progreso" desde un ejercicio) fuerza
  `progTab = 'ejercicios'`, por si el usuario estaba en Constancia u
  Horarios.
- Verificado en el navegador: las 3 pestañas cambian de contenido
  correctamente, Horarios dibuja su gráfica con el ancho real del canvas
  (no 0×0), y Perfil quedó con exactamente los 4 títulos esperados.
