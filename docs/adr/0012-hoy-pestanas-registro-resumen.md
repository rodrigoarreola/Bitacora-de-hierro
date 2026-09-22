# 0012. Hoy se parte en pestañas Registro / Resumen, y la racha se muda a una card

- **Estado:** Aceptada
- **Fecha:** 2026-09-22

## Contexto
Hoy era la pantalla más cargada de la app: 9 bloques apilados en un solo
scroll (riel de semanas, riel de días, 4 chips, comparación semanal, panel
del día, sesión, nota de la semana, conversor, eliminar semana), mezclando
lo que se usa **a diario** (registrar ejercicios) con lo **ocasional**
(comparación, nota, conversor, borrar la semana). Ya estaba anotado en
`docs/UI-ESTRUCTURA.md` como el ejemplo más claro de pantalla que mezcla
tipos.

Parte del mismo trabajo: el usuario pidió mover la racha del header (visible
en las 6 pantallas) a una card dentro de una pestaña "Resumen" que todavía
no existía — construirla es lo que resuelve ambos pedidos a la vez.

## Decisión
- **2 pestañas** (`.seg-tabs`, el mismo componente de ADR 0011): **Registro**
  (riel de días, tira de 3 chips del día, panel del día, sesión — todo lo que
  se toca mientras se entrena) y **Resumen** (card de racha, comparación
  semanal, nota de la semana, conversor, eliminar semana). El riel de
  semanas queda **fuera** de las pestañas, arriba de las dos: elegir semana
  aplica sin importar cuál esté activa.
- **`hoyTab`** (estado en memoria, mismo criterio que `progTab`/
  `historialMonth`). A diferencia de Progreso, ninguna pestaña tiene
  gráfica, así que cambiar de pestaña no necesita volver a renderizar nada.
- **`goToDate()`** (el atajo que abre un día puntual desde Historial o
  Calendario) fuerza `hoyTab = 'registro'`: el destino es ver ejercicios de
  ese día, que Resumen no muestra.
- **La racha sale del header** y pasa a `#streak-hero-card`, la primera card
  de Resumen: número grande, medallas (7/30/100 días) a la derecha, y
  "Mejor racha" debajo de una línea divisoria (antes era un chip suelto en
  la tira de 4, sin relación clara con "hoy"). El header pierde su bloque
  `.streak` por completo — sin esto, los mismos ids (`#streak-badge`,
  `#streak-badges`) habrían quedado duplicados en el documento.
- **`placeDaySessionPanel()` se elimina**: la card de sesión ya no se
  reubica según si el día activo es hoy de verdad — con Registro ya
  separado de lo semanal, vive siempre en el mismo lugar (después del panel
  del día), sea cual sea el día que se esté viendo.
- **`buildDashboardShareContainer()`** clona también `#streak-hero-card`,
  para no perder la racha de la imagen de "Compartir resumen semanal" (antes
  se clonaba gratis junto con el header). Funciona sin importar qué pestaña
  esté activa: `cloneNode()` no depende de la visibilidad del original.

## Alternativas descartadas
- **Mantener la racha en el header, solo partir Hoy**: no era lo que pidió
  el usuario, y deja la racha compitiendo por espacio en las 6 pantallas
  con el resto del header en vez de tener un lugar propio y más grande.
- **Un tercer chip/lugar para la racha en vez de una card dedicada**: la
  referencia (captura de otra app del usuario) usa una card destacada al
  abrir la pantalla de resumen — más legible que un chip chico entre otros.

## Consecuencias
- Registro es, de las dos pestañas, la que se parece a la Hoy original pero
  con 4 bloques menos (5 en vez de 9 contando el riel de semanas fuera).
- La imagen compartida gana una card más (racha) — un poco más alta que
  antes, pero sin perder información que ya mostraba.
- Verificado en el navegador: sin ids duplicados, header a 42px (antes
  56px), sesión del día fija en Registro para cualquier día, `goToDate()`
  fuerza Registro incluso viniendo de Resumen, y la imagen de compartir
  incluye la card de racha con el valor correcto.
- **Pendiente:** con la racha fuera, el subtítulo del header ("Registro de
  entrenamiento") probablemente ya no necesita partirse a 2 líneas (se hizo
  así en 1.50.0 para dejarle lugar al engranaje) — a revisar en el próximo
  paso de este mismo trabajo (mover Perfil al header).
