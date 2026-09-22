// GENERADO por scripts/build-changelog.php a partir de CHANGELOG.md (bloques
// "### En la app: …"). No editar a mano: se regenera en cada commit.
window.APP_VERSIONS = [
    {
        "version": "1.55.1",
        "date": "2026-09-21",
        "title": "Sin cambios visibles (preparación para producción)",
        "items": [
            "No cambia nada de lo que ves ni de cómo funciona: es un ajuste interno para que las actualizaciones de la app se detecten igual desde cualquier computadora."
        ]
    },
    {
        "version": "1.55.2",
        "date": "2026-09-21",
        "title": "Sin cambios visibles (herramienta de despliegue)",
        "items": [
            "No cambia nada de la app: se agrega un script para subir los archivos al servidor sin usar FileZilla a mano."
        ]
    },
    {
        "version": "1.55.0",
        "date": "2026-09-21",
        "title": "Editar la nota de un ejercicio dentro de la app",
        "items": [
            "Al tocar \"+ nota\" (o el texto de una nota) ahora se abre un cuadro de la app, con el nombre del ejercicio, un campo para escribir y el botón Guardar. Enter también guarda, Escape o tocar afuera cancelan, y dejarlo vacío quita la nota. Ya no se usa ningún cuadro del navegador.",
            "La nota queda limitada a 200 caracteres, que es lo que acepta la base de datos (antes se podía escribir más y no había aviso)."
        ]
    },
    {
        "version": "1.54.0",
        "date": "2026-09-21",
        "title": "La app muestra que está cargando, y avisa si algo falla",
        "items": [
            "Al abrir la app o iniciar sesión, en vez de ver pantallas vacías con ceros mientras llegan tus datos, ves marcadores grises con un suave brillo donde van a aparecer; y mientras tanto no se puede crear ni borrar semanas por error.",
            "Si tus datos no se pueden cargar, ahora te lo dice con un botón \"Reintentar\" (antes, después de iniciar sesión, te quedabas viendo la app en blanco sin ningún mensaje).",
            "Si las gráficas no se pueden cargar (por ejemplo, la primera vez sin internet), Progreso y Horarios lo avisan con un botón \"Recargar\" en vez de fallar. La lista de backups también muestra \"Cargando…\" y \"Reintentar\"."
        ]
    },
    {
        "version": "1.53.0",
        "date": "2026-09-21",
        "title": "Confirmaciones dentro de la app y atajos en el ícono",
        "items": [
            "Al eliminar una semana, quitar un ejercicio de la librería o importar datos, ahora ves un aviso propio de la app, con el detalle de lo que vas a hacer (por ejemplo, qué semana se elimina) y un botón rojo cuando la acción borra datos. Puedes cancelar con el botón, tocando afuera o con Escape.",
            "Si instalas la app, al mantener presionado su ícono aparecen atajos a Progreso, Historial y Calendario."
        ]
    },
    {
        "version": "1.52.0",
        "date": "2026-09-21",
        "title": "Íconos, gráficas y tipografías también sin internet",
        "items": [
            "Después de abrir la app una vez con conexión, ahora también se ven sin internet los íconos, las gráficas de Progreso, las tipografías y la opción de compartir como imagen; antes, sin conexión, faltaban."
        ]
    },
    {
        "version": "1.51.0",
        "date": "2026-09-21",
        "title": "Botones y separaciones más parejos",
        "items": [
            "Botones y campos quedan unos 2 píxeles más altos, así son más fáciles de tocar, y las separaciones entre elementos siguen ahora una misma escala.",
            "Las pantallas crecen unos pocos píxeles (entre 3 y 36 según la pantalla); todo lo demás se ve igual."
        ]
    },
    {
        "version": "1.50.3",
        "date": "2026-09-21",
        "title": "Sin cambios visibles (orden interno)",
        "items": [
            "La app se ve y funciona igual: por dentro, las separaciones entre elementos ahora salen de una escala común en vez de números sueltos."
        ]
    },
    {
        "version": "1.50.2",
        "date": "2026-09-21",
        "title": "Sin cambios visibles (orden interno)",
        "items": [
            "La app se ve y funciona igual: por dentro, los estilos se separaron en un archivo por pantalla para que sea más fácil mantenerlos."
        ]
    },
    {
        "version": "1.50.1",
        "date": "2026-09-21",
        "title": "Sin cambios visibles (orden interno)",
        "items": [
            "No cambia cómo funciona la app: por dentro se reorganizó cómo se arma este historial de versiones y la documentación.",
            "Corregido: dos textos que estaban escritos en otro español (\"Elegí… mirá\", \"Bajalos acá\") ahora dicen \"Elige… mira\" y \"Bájalos aquí\"."
        ]
    },
    {
        "version": "1.50.0",
        "date": "2026-09-21",
        "title": "Cada pantalla con su enlace, y Ajustes en el header",
        "items": [
            "Ajustes ahora es un ícono de engranaje arriba a la derecha, junto a tu racha. La barra inferior queda con 5 destinos: Hoy, Historial, Progreso, Calendario y Perfil.",
            "Cada pantalla tiene su propia dirección (#/hoy, #/perfil…): el botón atrás te regresa a la pantalla anterior, y si recargas o abres un enlace directo te quedas en la misma pantalla.",
            "El subtítulo \"Registro de entrenamiento\" del header ahora ocupa dos líneas para dejar lugar al engranaje."
        ]
    },
    {
        "version": "1.49.0",
        "date": "2026-09-21",
        "title": "Estilos unificados",
        "items": [
            "Tarjetas, botones y tamaños de texto ahora salen de un mismo sistema de estilos, así los botones y paneles se ven consistentes en toda la app.",
            "Algunos textos pequeños se ven medio punto más grandes y unas esquinas cambian 1-2 px de redondeo; el resto se ve igual."
        ]
    },
    {
        "version": "1.48.0",
        "date": "2026-09-21",
        "title": "Aviso de versión nueva",
        "items": [
            "Cuando hay una versión nueva de la app, aparece un aviso \"Hay una versión nueva — Actualizar\" y se aplica cuando tú quieras, sin que la pantalla cambie a la mitad de lo que estás haciendo.",
            "Corregido: tras una actualización podía mezclarse una pantalla nueva con código viejo hasta recargar un par de veces. Ahora toda la app se sirve de la misma versión.",
            "La app también busca actualizaciones cada vez que vuelves a ella, aunque la tengas instalada y abierta por días."
        ]
    },
    {
        "version": "1.47.0",
        "date": "2026-09-21",
        "title": "Abrir la app sin conexión",
        "items": [
            "Si abres la app sin internet, ya no te manda al inicio de sesión: abre con tus últimos datos guardados y un aviso \"Sin conexión\". Al volver la red se actualiza sola.",
            "Si no hay datos guardados y no hay conexión, ves una pantalla con \"Reintentar\" en vez del login.",
            "Pantalla de carga al arrancar, en vez de quedar en blanco mientras se verifica tu sesión.",
            "Al cerrar sesión (o si tu sesión vence) se borran los datos guardados en el dispositivo."
        ]
    },
    {
        "version": "1.46.1",
        "date": "2026-09-21",
        "title": "El domingo cuenta en racha, Historial y comparación semanal",
        "items": [
            "Un día recuperado en domingo ahora suma a la racha (y a los 5 días mínimos de la semana). Un domingo sin ejercicios no cuenta ni corta la racha, igual que el sábado.",
            "El domingo también se incluye en la comparación semanal, el balance por grupo muscular, el calendario y el heatmap. En Historial, el punto \"D\" aparece siempre."
        ]
    },
    {
        "version": "1.46.0",
        "date": "2026-08-14",
        "title": "GIFs e info de ejercicios (dataset externo)",
        "items": [
            "Nuevo ícono de ojo junto al nombre de un ejercicio (cuando hay coincidencia con el dataset externo hasaneyldrm/exercises-dataset): abre un panel con el GIF de demostración, categoría/equipo/músculo objetivo y las instrucciones paso a paso, todo en español.",
            "En Ajustes, \"Fuente de nombres de ejercicios\": elegir entre tu librería personalizada de siempre o el dataset completo (1.324 ejercicios) para autocompletar al agregar un ejercicio. El ícono de ojo aparece igual con cualquiera de las dos.",
            "Los GIFs se traen bajo demanda y quedan cacheados en el servidor — la primera vez tardan un toque, después son instantáneos incluso sin conexión al origen."
        ]
    },
    {
        "version": "1.45.0",
        "date": "2026-08-14",
        "title": "Timer del día como íconos, y changelog colapsado en Perfil",
        "items": [
            "La card \"Iniciar/Finalizar entrenamiento\" ahora es un ícono de play/stop en rojo, en vez de un botón de texto — entra en la misma fila que Hora inicio/Hora fin/Duración incluso en un celular angosto.",
            "Si el día cargado en \"Hoy\" es literalmente hoy, esa card se mueve arriba, entre el riel de días y las 4 cards de resumen — cualquier otro día la deja donde siempre vivió.",
            "Changelog en Perfil colapsado por defecto: ahora solo se ve \"Changelog / Versión actual: X.X.X\", y se despliega la lista completa al tocarlo.",
            "Corregido: la fecha de cada versión del changelog quedaba descolgada cuando el título ocupaba 2 líneas — ahora versión/fecha/chevron siempre van en su propia fila, con el título suelto debajo."
        ]
    },
    {
        "version": "1.44.0",
        "date": "2026-08-14",
        "title": "Resumen semanal: card al 50%, días en blanco y rieles a todo el ancho",
        "items": [
            "La card del resumen semanal sube de 30% a 50% de opacidad — a 30% se notaba demasiado el fondo.",
            "Nombre del día y grupo muscular en las cards de Lun-Dom ahora van en blanco (se perdían con el verde de fondo cuando el día estaba completado).",
            "Corregido: en celulares más angostos que la imagen exportada, el riel de semanas y el de días quedaban encogidos con un hueco vacío a la derecha en vez de ocupar todo el ancho de la card."
        ]
    },
    {
        "version": "1.43.0",
        "date": "2026-08-14",
        "title": "Resumen semanal: card al 30%, texto legible y rieles sin cortes",
        "items": [
            "La card del resumen semanal pasa de sólida a 30% de opacidad — se sigue notando un poco el fondo detrás.",
            "Título, subtítulo y el label \"racha actual\" ahora van en blanco; el número de racha siempre en verde. Los días completados llevan su verde también al 30%.",
            "El riel de semanas ya no corta un pill a la mitad — solo muestra los que entran completos.",
            "El riel de días reparte el 100% del ancho entre los tabs que entran, sea cual sea la cantidad (antes asumía siempre 5 y podía perder un tab si el cálculo daba justo en el borde)."
        ]
    },
    {
        "version": "1.42.0",
        "date": "2026-08-14",
        "title": "Resumen semanal: card sólida en vez de fondo transparente",
        "items": [
            "El PNG que se copia al portapapeles (\"Copiar resumen de la semana\") ahora es una sola card sólida y redondeada, no un fondo transparente — se veía mal sobre una foto real al compartir en redes, porque el título y los labels sueltos quedaban sin nada detrás."
        ]
    },
    {
        "version": "1.41.0",
        "date": "2026-08-14",
        "title": "Compartir semana: resumen del dashboard, copiado al portapapeles",
        "items": [
            "El botón de calendario junto a \"Compartir día\" ahora captura el mismo bloque que se ve arriba de \"Hoy\" (racha, riel de semanas, riel de días, resumen y comparación semanal) en vez de una tabla larga con los 7 días.",
            "La imagen sale en PNG con fondo transparente — solo las cards (pills, tabs, chips, la card de comparación) llevan color sólido.",
            "Ya no descarga de entrada: la imagen se copia directo al portapapeles, y solo cae a descarga si el navegador no soporta copiar imágenes.",
            "Corregido: \"+ Nueva semana\" salía con una caja blanca de más en la imagen (el date picker invisible perdía su estilo al clonar el DOM)."
        ]
    },
    {
        "version": "1.40.0",
        "date": "2026-08-13",
        "title": "Horarios de entrenamiento en Perfil",
        "items": [
            "Nuevo panel \"Horarios de entrenamiento\" en Perfil, debajo de Hitos y constancia — sin agregar botón al menú inferior.",
            "Filtro por año (Todo / años con sesiones registradas) y por mes (Todos / Ene-Dic, combinables entre sí).",
            "Gráfica de duración por sesión (mismo estilo de línea con puntos que Progreso, con zoom/pan) — con año y mes filtrados a la vez se ven los puntos; si alguno queda en \"Todo\", la línea se adelgaza y los puntos se ocultan para no saturar la vista.",
            "Distribución de horas de inicio más frecuentes, como barras horizontales."
        ]
    },
    {
        "version": "1.39.0",
        "date": "2026-08-13",
        "title": "Heatmap: etiquetas de mes alineadas al corte real",
        "items": [
            "Las etiquetas de mes del heatmap anual ahora tienen borde y esquinas redondeadas, igual que las celdas de días.",
            "La fila donde cambia el mes ya no queda entera de un lado — se reparte 50/50 entre el mes que termina y el que empieza, sin dejar un hueco sin bordear entre los dos."
        ]
    },
    {
        "version": "1.38.0",
        "date": "2026-08-13",
        "title": "Reordenar ejercicios, exportar semana, zoom en Progreso y más",
        "items": [
            "Reordenar ejercicios arrastrando dentro de un día (handle dedicado, mouse y touch).",
            "Nuevo botón \"Compartir semana completa\" junto al de compartir día, con los 7 días en una sola imagen.",
            "Zoom y pan en el gráfico de Progreso (rueda, pellizco o arrastre) — doble click/tap para volver al zoom original.",
            "El heatmap anual ahora tiene etiquetas de mes al costado y sus celdas son clickeables (te llevan directo a ese día).",
            "Ir a un día desde Calendario o Historial ahora centra el riel de semanas en la semana correcta.",
            "\"Nueva semana\" ya no deja crear más de una semana hacia el futuro.",
            "Botón \"Eliminar esta semana\" al final de \"Hoy\", con doble confirmación antes de borrar."
        ]
    },
    {
        "version": "1.37.0",
        "date": "2026-08-13",
        "title": "Hora de inicio, fin y duración por día",
        "items": [
            "Nueva card \"Iniciar/Finalizar entrenamiento\" debajo del panel del día: un botón guarda la hora actual al arrancar y al terminar, y calcula la duración solo.",
            "Hora de inicio y fin también se pueden corregir a mano — útil para cargar un horario importado de Garmin.",
            "Exportar/Importar datos ahora incluye estos horarios por día (compatible con backups viejos, que no los tenían)."
        ]
    },
    {
        "version": "1.36.0",
        "date": "2026-08-13",
        "title": "Badge de racha a un costado, recap hasta hoy, reps solo sin comparar",
        "items": [
            "El badge de racha se mueve al costado del número, en vez de arriba.",
            "El recap semanal ahora compara \"hasta hoy\" contra la semana pasada, no la semana completa contra una a medio andar.",
            "La línea de reps en Progreso ya no aparece al comparar dos ejercicios."
        ]
    },
    {
        "version": "1.35.0",
        "date": "2026-08-12",
        "title": "Progreso: comparar ejercicios, línea de reps, mini-dashboard",
        "items": [
            "Nuevo buscador \"Comparar con…\" en Progreso para ver dos ejercicios superpuestos en el mismo gráfico.",
            "Toggle para agregar una línea de repeticiones (azul) al gráfico de un ejercicio.",
            "Cuando no hay ningún ejercicio buscado, ahora se ve un mini-dashboard con la tendencia de todos los ejercicios de tu librería que tienen historial."
        ]
    },
    {
        "version": "1.34.0",
        "date": "2026-08-12",
        "title": "Recap semanal en \"Hoy\"",
        "items": [
            "Nueva card que compara el volumen y la adherencia de esta semana contra la semana pasada."
        ]
    },
    {
        "version": "1.33.0",
        "date": "2026-08-12",
        "title": "Buscar por ejercicio en Historial",
        "items": [
            "Nuevo buscador en Historial para filtrar las semanas por nombre de ejercicio, combinable con el filtro de mes."
        ]
    },
    {
        "version": "1.32.0",
        "date": "2026-08-12",
        "title": "Badges de racha (7/30/100 días)",
        "items": [
            "Nuevos íconos de bronce/plata/oro junto a la racha actual del header al llegar a 7, 30 y 100 días."
        ]
    },
    {
        "version": "1.31.0",
        "date": "2026-08-12",
        "title": "Deshacer al borrar un ejercicio",
        "items": [
            "Borrar un ejercicio ya no pide confirmación — se borra al toque y aparece un botón \"Deshacer\" por 5 segundos antes de confirmarlo de verdad."
        ]
    },
    {
        "version": "1.30.0",
        "date": "2026-08-12",
        "title": "Carga inicial en una sola petición",
        "items": [
            "La app arrancaba pidiendo cada semana en una petición HTTP aparte, todas al mismo tiempo — en cuentas con muchas semanas eso disparaba decenas de peticiones simultáneas. Ahora se traen todas juntas en un solo pedido."
        ]
    },
    {
        "version": "1.29.0",
        "date": "2026-08-12",
        "title": "Más espacio entre \"Ver progreso\" y \"Semana pasada\"",
        "items": [
            "El label \"Semana pasada:\" del detalle expandido deja de quedar pegado al botón \"Ver progreso\" — ahora se reparte el espacio disponible entre los dos."
        ]
    },
    {
        "version": "1.28.0",
        "date": "2026-08-12",
        "title": "Label \"Semana pasada\" en dos líneas",
        "items": [
            "El label \"Semana pasada:\" del detalle expandido pasa a \"Semana / pasada:\" en dos líneas, para ocupar menos ancho junto al botón \"Ver progreso\"."
        ]
    },
    {
        "version": "1.27.0",
        "date": "2026-08-12",
        "title": "Detalle de un ejercicio alineado con la fila",
        "items": [
            "Los valores de \"semana pasada\" (Kg/Rep/Ser) ahora quedan exactamente debajo de las columnas Kg/Rep/Ser de la fila del ejercicio, en vez de con su propio espaciado suelto."
        ]
    },
    {
        "version": "1.26.0",
        "date": "2026-08-12",
        "title": "Heatmap anual sin rojo",
        "items": [
            "El heatmap anual deja de pintar rojo — un día sin pintar ya se lee como \"no cumplido\", sin necesitar un color de más entre 365 celdas."
        ]
    },
    {
        "version": "1.25.0",
        "date": "2026-08-12",
        "title": "Detalle de un ejercicio: todo en una fila",
        "items": [
            "\"Ver progreso\", \"Semana pasada:\" y los valores Kg/Rep/Ser vuelven a quedar en una sola fila (como pidió el usuario viendo una captura) en vez de apilados verticalmente."
        ]
    },
    {
        "version": "1.24.0",
        "date": "2026-08-12",
        "title": "Ajustes al heatmap y al detalle de un ejercicio",
        "items": [
            "El heatmap anual ya no pinta rojo un día sin ningún ejercicio registrado — el rojo queda solo para cuando sí hubo ejercicios pero ninguno se marcó.",
            "En el detalle expandido de un ejercicio, \"Ver progreso\" pasa a estar primero, arriba del label \"Semana pasada:\"."
        ]
    },
    {
        "version": "1.23.0",
        "date": "2026-08-12",
        "title": "Protección contra fuerza bruta en login",
        "items": [
            "5 intentos fallidos seguidos bloquean el login 15 minutos — antes no había ningún límite."
        ]
    },
    {
        "version": "1.22.0",
        "date": "2026-08-12",
        "title": "Backups descargables desde Perfil",
        "items": [
            "Nuevo panel en Perfil que lista los backups automáticos del servidor con fecha y tamaño, cada uno descargable con un click — antes había que bajarlos por FTP."
        ]
    },
    {
        "version": "1.21.0",
        "date": "2026-08-12",
        "title": "Botón Ver progreso en el detalle de un ejercicio",
        "items": [
            "Al expandir un ejercicio en \"Hoy\" (chevron de \"semana pasada\"), un botón nuevo \"Ver progreso\" te lleva directo a la gráfica de ese ejercicio en Progreso, con el buscador ya cargado."
        ]
    },
    {
        "version": "1.20.0",
        "date": "2026-08-12",
        "title": "Heatmap anual con niveles rojo/amarillo/verde",
        "items": [
            "El heatmap anual de Calendario ya no solo pinta verde: ahora usa el mismo criterio rojo/amarillo/verde que la vista de mes, así que se ven también los días fallados y los flojos, no solo los cumplidos."
        ]
    },
    {
        "version": "1.19.0",
        "date": "2026-08-12",
        "title": "Auto-bump de caché del service worker",
        "items": [
            "Ya no hace falta acordarse de subir el número de caché de la PWA a mano en cada cambio — se recalcula solo a partir del contenido, así que un navegador con la app instalada siempre agarra la versión nueva."
        ]
    },
    {
        "version": "1.18.0",
        "date": "2026-08-12",
        "title": "Menor constancia por días reales",
        "items": [
            "Los períodos de \"menor constancia\" ahora se miden en días reales entre un entrenamiento y el siguiente, no en semanas — más precisos, sin fechas repetidas raras.",
            "\"Hueco más largo sin entrenar\" ahora muestra el año.",
            "Se quita la regla \"Días/semana máximos para semana floja\" de Ajustes — ya no se usa."
        ]
    },
    {
        "version": "1.17.0",
        "date": "2026-08-12",
        "title": "Racha e Hitos: huecos reales",
        "items": [
            "Un mes entero sin ninguna semana creada ahora cuenta como \"0 días cumplidos\" en vez de quedar invisible — Hitos ya muestra los huecos reales de meses, no solo huecos chicos entre semanas que sí existían."
        ]
    },
    {
        "version": "1.16.0",
        "date": "2026-08-12",
        "title": "Conversor kg / lbs",
        "items": [
            "Nuevo conversor en \"Hoy\", debajo de la nota de la semana — escribí en kg o en lbs y el otro campo se actualiza solo."
        ]
    },
    {
        "version": "1.15.0",
        "date": "2026-08-12",
        "title": "Ajustes de UI y fix de Ajustes",
        "items": [
            "Heatmap anual de Calendario ahora es vertical (Lun–Dom en columnas, una fila por semana) y muestra todos los años con datos, no solo 2023–2026.",
            "Hitos: el rango de fecha de cada período se separa en mes/año y día/fecha, en vez de una sola línea larga.",
            "Nota de la semana pasa al final de \"Hoy\"; Balance por grupo muscular pasa al final de Historial.",
            "Fix: el botón \"Guardar reglas\" en Ajustes ya no se salía del margen del panel."
        ]
    },
    {
        "version": "1.14.0",
        "date": "2026-08-12",
        "title": "Edición offline",
        "items": [
            "Marcar/editar/borrar un ejercicio o la nota de una semana ya no se pierde si se corta la conexión — se guarda y sincroniza solo al reconectar.",
            "Alcance acotado: crear semana, agregar ejercicio, migrar día, copiar semana pasada, importar datos y la librería siguen necesitando conexión."
        ]
    },
    {
        "version": "1.13.0",
        "date": "2026-08-12",
        "title": "Backup automático",
        "items": [
            "Script para respaldar todas tus semanas automáticamente por cron — configuración en el README, sección \"Backup automático (cron)\"."
        ]
    },
    {
        "version": "1.12.0",
        "date": "2026-08-12",
        "title": "Progresión sugerida",
        "items": [
            "Al expandir un ejercicio que la semana pasada se marcó como hecho, aparece un peso sugerido para esta semana."
        ]
    },
    {
        "version": "1.11.0",
        "date": "2026-08-12",
        "title": "Nota libre por semana",
        "items": [
            "Nuevo campo en \"Hoy\" para anotar cómo fue la semana completa (lesiones, ajustes) — se guarda solo, separado de las notas por ejercicio."
        ]
    },
    {
        "version": "1.10.0",
        "date": "2026-08-12",
        "title": "Balance por grupo muscular",
        "items": [
            "Nuevo panel en Historial con cuántos días cumplidos tuvo cada grupo muscular en el período filtrado."
        ]
    },
    {
        "version": "1.9.0",
        "date": "2026-08-12",
        "title": "PR automático",
        "items": [
            "Al marcar un ejercicio como hecho con un kg mayor a tu mejor registro histórico para ese ejercicio, aparece un aviso de nuevo récord."
        ]
    },
    {
        "version": "1.8.0",
        "date": "2026-08-12",
        "title": "Compartir como imagen",
        "items": [
            "Nuevo botón para compartir el día activo o una semana de Historial como imagen (PNG) — comparte directo desde el celular o la descarga."
        ]
    },
    {
        "version": "1.7.0",
        "date": "2026-08-12",
        "title": "Volumen del día",
        "items": [
            "Nuevo chip \"Volumen\" en la tira de resumen de Hoy — kg x reps x series sumado de los ejercicios marcados como hechos."
        ]
    },
    {
        "version": "1.6.0",
        "date": "2026-08-12",
        "title": "Reglas editables y heatmap anual",
        "items": [
            "Ajustes: sección \"Reglas\" — los mínimos de racha, día cumplido y Hitos ahora se editan desde la app y afectan el cálculo real al instante.",
            "Calendario: card de heatmap anual (365 días, filtro por año) y botón \"Volver a hoy\" con swipe entre meses.",
            "Hitos: los períodos muestran el rango real de entrenamiento (\"Lunes 23 de Marzo al Viernes 05 de Junio\") en vez de meses calendario.",
            "Ajustes de espaciado, orden de \"Migrar día\" y el riel de días en móvil."
        ]
    },
    {
        "version": "1.5.0",
        "date": "2026-08-11",
        "title": "Hitos y constancia",
        "items": [
            "Nueva sección en Perfil con tus períodos de mayor y menor constancia, y una lista de hitos: primera sesión, mejor racha, mejor mes, hueco más largo sin entrenar y año más productivo."
        ]
    },
    {
        "version": "1.4.0",
        "date": "2026-08-11",
        "title": "Racha semanal y calendario clicable",
        "items": [
            "La racha ya no se rompe día por día: una semana necesita 5 o más días cumplidos para no cortarla.",
            "Tocar un día en el Calendario navega directo a ese día para verlo o editarlo."
        ]
    },
    {
        "version": "1.3.0",
        "date": "2026-08-11",
        "title": "Sábado, domingo y Migrar día",
        "items": [
            "El riel de días crece a 7 (Lun–Dom) — sábado y domingo quedan revelados al hacer scroll horizontal.",
            "Nueva función \"Migrar día\": mueve el set completo de ejercicios de un día a otro dentro de la misma semana, recorriendo en cadena si el destino ya tiene contenido."
        ]
    },
    {
        "version": "1.2.0",
        "date": "2026-08-11",
        "title": "Historial, Progreso y respaldo de datos",
        "items": [
            "Vista Historial con una tarjeta por semana, filtrable por mes.",
            "Vista Progreso con gráfica de carga por ejercicio (Chart.js).",
            "Exportar e importar todos tus datos como JSON desde Perfil."
        ]
    },
    {
        "version": "1.1.0",
        "date": "2026-08-11",
        "title": "PWA instalable y sesión persistente",
        "items": [
            "La app se puede instalar como PWA (manifest + service worker).",
            "Sesión persistente de 30 días — ya no hay que iniciar sesión cada vez.",
            "Nuevas vistas Perfil y Calendario."
        ]
    },
    {
        "version": "1.0.0",
        "date": "2026-08-11",
        "title": "Conectada a base de datos real",
        "items": [
            "El frontend deja de usar datos de ejemplo en memoria y se conecta a la API real: login, semanas y ejercicios persistentes.",
            "Importador de rutinas históricas desde JSON."
        ]
    }
];
