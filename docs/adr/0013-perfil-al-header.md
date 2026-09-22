# 0013. Perfil se mueve al header (logo), barra inferior de 4 destinos

- **Estado:** Aceptada
- **Fecha:** 2026-09-22

## Contexto
El usuario, viendo capturas de otra PWA propia (perfil como ícono/avatar en
el header, ajustes en el otro extremo, contenido diario en la barra
inferior), propuso mover Perfil al header en Bitácora. Perfil ya había
quedado liviano en el mismo trabajo (Hitos y Horarios se movieron a Progreso
en ADR 0011), así que un ícono de header ya no escondería contenido de uso
frecuente, solo cuenta/datos.

## Decisión
- **`.brand`** (logo + "Bitácora" + subtítulo, arriba a la izquierda) pasa de
  `<div>` a `<a href="#/perfil" data-view="perfil">`: en una app de un solo
  usuario, "la app" y "tu cuenta" son casi lo mismo, así que el logo hace de
  avatar. Se resalta el ícono (borde de acento), no el título completo.
- **Perfil sale de la barra inferior**, que queda en 4 destinos: Hoy,
  Historial, Progreso, Calendario.
- Sin cambios de `showView()`/`switchToView()`: ambas ya operan de forma
  genérica sobre `[data-view]` (ver ADR 0001), así que agregar el atributo al
  `<a>` fue suficiente — ninguna función de routing se tocó.

## Alternativas descartadas
- **Ícono nuevo (avatar/persona) además del logo**: dos elementos compitiendo
  por la esquina izquierda cuando uno solo (el logo, que ya estaba ahí) puede
  cumplir las dos funciones.
- **Perfil a la derecha, junto al engranaje**: el usuario pidió explícitamente
  "Perfil arriba a la izquierda, Ajustes arriba a la derecha" — los separa en
  los dos extremos del header en vez de agruparlos.

## Consecuencias
- La barra inferior queda en el rango más ajustado recomendado (auditoría
  original: 3 a 5); con 4 destinos hay más espacio por botón.
- **Efecto no buscado, positivo**: con la racha ya afuera del header (ADR
  0012) y ahora `.head-right` reducido a un solo ícono, el subtítulo
  "Registro de entrenamiento" vuelve a caber en una línea (antes envolvía a
  2 desde 1.50.0) y el texto de la barra inferior vuelve a la escala de
  tokens (10px en vez de 9.5px "fuera de escala") sin desbordar "Calendario".
- Verificado en el navegador: 4 botones en la barra, el logo navega a Perfil
  y se resalta (`aria-current="page"`), Ajustes sigue funcionando igual,
  compartir resumen semanal sigue sin incluir el engranaje, sin ids
  duplicados ni errores de consola.
