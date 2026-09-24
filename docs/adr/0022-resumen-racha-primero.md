# 0022. Resumen rediseñado: la racha manda, luego qué sigue

- **Estado:** Aceptada
- **Fecha:** 2026-09-23

## Contexto
Resumen abría con dos rieles con scroll (semanas y días), luego la card de
racha, una comparación semanal en texto chico, la nota y "Eliminar esta
semana". Con 79 semanas, el riel de semanas era casi todo scroll, y la que
importa casi siempre es la actual. La racha, que es lo que motiva, quedaba
en tercer lugar. Lo que falta para no romperla esta semana no se veía en
ningún lado. Tampoco había un "qué me toca" de un vistazo, aunque desde el
ADR 0018 cada día tiene su plantilla. El usuario trajo una app de fitness
de referencia; la propuesta se armó como maqueta y el usuario la aprobó
con un cambio: la racha debe pesar más que los días que faltan.

## Decisión
De arriba abajo:
1. **Selector de semana compacto**: una píldora ("Esta semana · 21–27 sep")
   que abre un sheet con todas las semanas y sus días cumplidos (`2/5
   días`). "+ Nueva" y el botón de compartir quedan en la misma fila.
   "Eliminar esta semana" pasa al pie fijo del sheet: ya no está a un toque
   en la pantalla principal.
2. **Card de racha**: el número a 104 px (Big Shoulders, verde), medalla
   grande a la derecha (la más alta ganada; sin ninguna, bronce apagada),
   "Tu mejor racha de siempre" o la mejor racha, y una barra del color de
   la próxima medalla, medida desde cero (días actuales / días de esa
   medalla: 42 días hacia el oro = 42%). Medallas a 10/30/100 días (bronce
   subió de 7 a 10 en la 1.68.1). Debajo de una línea, la condición: "Te faltan N días
   esta semana", con un segmento por día que pide la regla
   (`week_streak_min_days`). Se mide sobre la semana de calendario en curso,
   no sobre la que se esté viendo. Si ya no alcanzan los días, lo dice.
3. **Riel de 7 días** sin scroll: día y número de fecha. Estados: cumplido
   (relleno naranja), hoy (anillo), siguiente (contorno), pasado sin
   registrar (punteado), futuro, y sin plan (apagado: descanso, domingo).
   Tiene leyenda. Tocar un día abre Hoy en ese día.
4. **Siguiente entrenamiento**: carrusel de hasta 3 días, desde hoy, con
   plan y todavía sin cumplir (semana en curso y la siguiente si existe).
   Cada card muestra cuándo, grupo, músculos (de las etiquetas de la
   plantilla), 2 ejercicios con series×reps (los cargados o, si el día está
   vacío, la guía), un botón "+ N ejercicios" que despliega la rutina
   completa, duración estimada y un botón. Desde la 1.68.1 todas las cards
   van completas (antes, las siguientes solo mostraban grupo y músculos). La duración es el promedio de las últimas 8 veces del
   mismo grupo con horario. El botón dice "Empezar" solo en la card de hoy:
   abre el día y arranca el cronómetro de la sesión (desde la 1.68.1, el
   botón "Empezar actividad" de Hoy con el contador en vivo; se guarda la
   hora con segundos para que el contador no dependa de tener la app
   abierta). En los demás días dice
   "Ver día".
5. **Esta semana**: tiempo, kg de volumen y series hechas, cada uno con su
   diferencia contra la semana anterior (cortada al día de hoy si es la
   semana en curso, como antes). Sale aunque no haya semana anterior, solo
   que sin diferencias. La adherencia se quita: ya la cuentan los segmentos
   de la racha.
6. **Nota de la semana**, sin cambios.

La imagen de "Compartir" clona header, semana, racha, días y "Esta semana".

## Alternativas descartadas
- **Días que faltan como número principal** (primera maqueta): motiva a
  corto plazo, pero la racha es el logro acumulado; el usuario pidió
  invertir el peso.
- **Kcal** (estaba en la referencia): la app no tiene ese dato.
- **"Empezar" también en días futuros**: arrancaría un cronómetro en el día
  equivocado.
- **Mantener el riel de semanas**: con decenas de semanas es scroll puro, y
  el sheet muestra más datos (días cumplidos por semana).

## Consecuencias
- Resumen se lee de arriba abajo: cómo voy, qué me falta, qué sigue, cómo va
  la semana.
- Borrar una semana cuesta un paso más (abrir el sheet), a propósito.
- `cloneRailForShare()`, `pairedFlexItems()` y `SHARE_CONTENT_WIDTH` se
  quitaron: el riel de días ya cabe entero y el de semanas no existe.
- La tipografía de Resumen es más grande que la del resto de la app (como
  en la maqueta). Si se adopta en otras vistas conviene pasarla a tokens.
