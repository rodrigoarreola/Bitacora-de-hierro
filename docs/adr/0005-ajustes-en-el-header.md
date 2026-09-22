# 0005. Barra de 5 destinos y Ajustes como ícono del header

- **Estado:** Aceptada
- **Fecha:** 2026-09-21

## Contexto
La barra inferior tenía 6 destinos (lo cómodo en móvil son 3 a 5), y con 6 el
texto "CALENDARIO" ya casi no cabía. Ajustes (reglas, fuente de nombres,
librería) es de uso ocasional; lo diario es Hoy y Progreso.

## Decisión
Barra inferior de 5 destinos (Hoy, Historial, Progreso, Calendario, Perfil) y
Ajustes como ícono de engranaje a la derecha del header, con `href="#/ajustes"`
y `data-view="ajustes"`. Se resalta cuando es la vista activa.

## Alternativas descartadas
- **Fusionar Ajustes dentro de Perfil**: mezcla más tipos en una pantalla que ya
  combina análisis y administración.
- **Quitar otro destino (Historial o Calendario)**: son de uso frecuente.

## Consecuencias
- El header pasa de 40 a 56 px a 375 px: para que la racha no se parta, el
  subtítulo "Registro de entrenamiento" envuelve a 2 líneas (a 320 px, 71 px).
  Reducir el espacio de las medallas no lo evita y ese espacio fue una decisión
  previa; la salida sería quitar el subtítulo.
- El ícono de Ajustes se excluye de la imagen de "Compartir resumen semanal".

## Seguimiento
La racha se mudó del header a una card en Hoy → Resumen (1.57.0, ADR 0012),
y Perfil se movió del bottom-nav al logo del header (1.58.0, ADR 0013),
bajando la barra de 5 a 4 destinos. Con la racha afuera, el subtítulo volvió
a caber en una línea y el header bajó a 42 px — la limitación de espacio que
esta decisión describía ya no aplica, pero la decisión en sí (Ajustes en el
header) sigue vigente.

El usuario notó que el ícono de Ajustes, con su caja de fondo/borde
(`.btn.btn--icon`), pesaba visualmente casi lo mismo que `.brand-mark` (el
logo, que sí funciona como "avatar" de la app) — una jerarquía no
intencional entre dos elementos de importancia distinta. Corregido en la
1.62.0: `.head-settings` pierde el fondo y el borde (queda como ícono
suelto, un poco más grande — de 13 a 18px — para no perder presencia sin
la caja), mismo tamaño de toque (30px). El logo no cambió.
