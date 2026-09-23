# 0020. Ajustes en 3 pestañas con enlace propio

- **Estado:** Aceptada
- **Fecha:** 2026-09-23

## Contexto
Ajustes era una sola columna con cuatro paneles: Split (con su vista
previa, el más largo), Reglas, Fuente de nombres y Librería. Desde la
1.64.0 el Split empujaba todo lo demás muy abajo en el celular. Semana y
Progreso ya usan pestañas `.seg-tabs` (ADR 0012).

## Decisión
- **Tres pestañas**: Split · Reglas · Ejercicios. "Ejercicios" junta la
  fuente de nombres y la librería: las dos deciden qué nombres se ofrecen
  al escribir un ejercicio.
- **Enlace propio por pestaña**: `#/ajustes/split`, `#/ajustes/reglas`,
  `#/ajustes/ejercicios`. Tocar una pestaña hace `pushState`, así el botón
  atrás recorre las pestañas; el hash sigue resolviendo la vista por su
  primer segmento (`routeFromHash()` no cambia). `#/ajustes` a secas (el
  engranaje del header) abre la última pestaña usada, guardada en
  `localStorage` (`bitacora.ajustesTab`); la primera vez, Split.
- **Los cambios sin guardar no se pierden**: cambiar de pestaña no recarga
  nada; el split se lee del servidor solo al entrar a Ajustes desde otra
  pantalla y nunca encima de un borrador (`splitIsDirty()`). Split y
  Reglas muestran un punto en su pestaña y en su botón Guardar mientras
  hay cambios pendientes.
- La vista previa del split abre solo el primer día con guía la primera
  vez, para que los presets y Guardar se vean sin scroll.
- La Guía del día enlaza a `#/ajustes/split` ("Cambiar split").

## Alternativas descartadas
- **Recordar solo la última pestaña, sin hash propio**: no permite enlazar
  a una pestaña desde otra pantalla ni volver con el botón atrás.
- **Avisar al salir con cambios sin guardar** (diálogo): más fricción para
  un caso que el punto ya hace visible, y el borrador se conserva igual.

## Consecuencias
- Un enlace a `#/ajustes/<algo-inválido>` cae en la última pestaña usada.
- El borrador del split vive en memoria: se pierde al recargar la página.
