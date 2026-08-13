(function(){
  // ============================================================
  // Configuración de días
  // ============================================================
  const DAY_ORDER  = ['lun','mar','mie','jue','vie','sab','dom'];
  const DAY_NAMES  = {lun:'Lunes', mar:'Martes', mie:'Miércoles', jue:'Jueves', vie:'Viernes', sab:'Sábado', dom:'Domingo'};
  const DAY_SHORT  = {lun:'Lun', mar:'Mar', mie:'Mié', jue:'Jue', vie:'Vie', sab:'Sáb', dom:'Dom'};
  const DAY_LETTER = {lun:'L', mar:'M', mie:'X', jue:'J', vie:'V', sab:'S', dom:'D'};
  const DAY_OFFSET = {lun:0, mar:1, mie:2, jue:3, vie:4, sab:5, dom:6};
  const MESES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  const MESES_LARGO = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  // Sin entrada para domingo (0) a propósito: el gimnasio no abre, así
  // que computeDayTier() debe seguir devolviendo null para ese día.
  const WEEKDAY_TO_KEY = {1:'lun', 2:'mar', 3:'mie', 4:'jue', 5:'vie', 6:'sab'};
  const RING_R = 16;
  const RING_C = 2 * Math.PI * RING_R;

  // ============================================================
  // Reglas: valores editables desde Ajustes (api/settings.php), con
  // estos defaults como respaldo mientras carga la API o si algo
  // falla. Reemplazan lo que antes eran constantes fijas — cualquier
  // función que las use debe leer de este objeto mutable, no de una
  // copia local, para que un cambio guardado en Ajustes se refleje
  // de inmediato sin recargar la página.
  // ============================================================
  const RULES = {
    min_done_per_day: 3,
    week_streak_min_days: 5,
    milestone_strong_min: 3,
    milestone_min_run_weeks: 2,
  };

  // Progresión sugerida: incremento fijo, no editable desde Ajustes a
  // propósito — api/settings.php fuerza todas las reglas a entero
  // ((int) $value), así que sumar esta acá obligaría a extender ese
  // endpoint para aceptar decimales. Queda como constante simple hasta
  // que valga la pena ese cambio.
  const PROGRESSION_INCREMENT_KG = 2.5;

  // ============================================================
  // Changelog para Perfil — versión resumida y de cara al usuario del
  // CHANGELOG.md técnico del repo (ese sigue siendo la fuente detallada
  // para desarrollo; esta lista agrupa los mismos cambios en tandas
  // legibles, con las fechas reales de los commits correspondientes).
  // La más reciente va primero; CURRENT_VERSION es la [0].
  // ============================================================
  const APP_VERSIONS = [
    { version: '1.35.0', date: '2026-08-12', title: 'Progreso: comparar ejercicios, línea de reps, mini-dashboard', items: [
      'Nuevo buscador "Comparar con…" en Progreso para ver dos ejercicios superpuestos en el mismo gráfico.',
      'Toggle para agregar una línea de repeticiones (azul) al gráfico de un ejercicio.',
      'Cuando no hay ningún ejercicio buscado, ahora se ve un mini-dashboard con la tendencia de todos los ejercicios de tu librería que tienen historial.',
    ]},
    { version: '1.34.0', date: '2026-08-12', title: 'Recap semanal en "Hoy"', items: [
      'Nueva card que compara el volumen y la adherencia de esta semana contra la semana pasada.',
    ]},
    { version: '1.33.0', date: '2026-08-12', title: 'Buscar por ejercicio en Historial', items: [
      'Nuevo buscador en Historial para filtrar las semanas por nombre de ejercicio, combinable con el filtro de mes.',
    ]},
    { version: '1.32.0', date: '2026-08-12', title: 'Badges de racha (7/30/100 días)', items: [
      'Nuevos íconos de bronce/plata/oro junto a la racha actual del header al llegar a 7, 30 y 100 días.',
    ]},
    { version: '1.31.0', date: '2026-08-12', title: 'Deshacer al borrar un ejercicio', items: [
      'Borrar un ejercicio ya no pide confirmación — se borra al toque y aparece un botón "Deshacer" por 5 segundos antes de confirmarlo de verdad.',
    ]},
    { version: '1.30.0', date: '2026-08-12', title: 'Carga inicial en una sola petición', items: [
      'La app arrancaba pidiendo cada semana en una petición HTTP aparte, todas al mismo tiempo — en cuentas con muchas semanas eso disparaba decenas de peticiones simultáneas. Ahora se traen todas juntas en un solo pedido.',
    ]},
    { version: '1.29.0', date: '2026-08-12', title: 'Más espacio entre "Ver progreso" y "Semana pasada"', items: [
      'El label "Semana pasada:" del detalle expandido deja de quedar pegado al botón "Ver progreso" — ahora se reparte el espacio disponible entre los dos.',
    ]},
    { version: '1.28.0', date: '2026-08-12', title: 'Label "Semana pasada" en dos líneas', items: [
      'El label "Semana pasada:" del detalle expandido pasa a "Semana / pasada:" en dos líneas, para ocupar menos ancho junto al botón "Ver progreso".',
    ]},
    { version: '1.27.0', date: '2026-08-12', title: 'Detalle de un ejercicio alineado con la fila', items: [
      'Los valores de "semana pasada" (Kg/Rep/Ser) ahora quedan exactamente debajo de las columnas Kg/Rep/Ser de la fila del ejercicio, en vez de con su propio espaciado suelto.',
    ]},
    { version: '1.26.0', date: '2026-08-12', title: 'Heatmap anual sin rojo', items: [
      'El heatmap anual deja de pintar rojo — un día sin pintar ya se lee como "no cumplido", sin necesitar un color de más entre 365 celdas.',
    ]},
    { version: '1.25.0', date: '2026-08-12', title: 'Detalle de un ejercicio: todo en una fila', items: [
      '"Ver progreso", "Semana pasada:" y los valores Kg/Rep/Ser vuelven a quedar en una sola fila (como pidió el usuario viendo una captura) en vez de apilados verticalmente.',
    ]},
    { version: '1.24.0', date: '2026-08-12', title: 'Ajustes al heatmap y al detalle de un ejercicio', items: [
      'El heatmap anual ya no pinta rojo un día sin ningún ejercicio registrado — el rojo queda solo para cuando sí hubo ejercicios pero ninguno se marcó.',
      'En el detalle expandido de un ejercicio, "Ver progreso" pasa a estar primero, arriba del label "Semana pasada:".',
    ]},
    { version: '1.23.0', date: '2026-08-12', title: 'Protección contra fuerza bruta en login', items: [
      '5 intentos fallidos seguidos bloquean el login 15 minutos — antes no había ningún límite.',
    ]},
    { version: '1.22.0', date: '2026-08-12', title: 'Backups descargables desde Perfil', items: [
      'Nuevo panel en Perfil que lista los backups automáticos del servidor con fecha y tamaño, cada uno descargable con un click — antes había que bajarlos por FTP.',
    ]},
    { version: '1.21.0', date: '2026-08-12', title: 'Botón Ver progreso en el detalle de un ejercicio', items: [
      'Al expandir un ejercicio en "Hoy" (chevron de "semana pasada"), un botón nuevo "Ver progreso" te lleva directo a la gráfica de ese ejercicio en Progreso, con el buscador ya cargado.',
    ]},
    { version: '1.20.0', date: '2026-08-12', title: 'Heatmap anual con niveles rojo/amarillo/verde', items: [
      'El heatmap anual de Calendario ya no solo pinta verde: ahora usa el mismo criterio rojo/amarillo/verde que la vista de mes, así que se ven también los días fallados y los flojos, no solo los cumplidos.',
    ]},
    { version: '1.19.0', date: '2026-08-12', title: 'Auto-bump de caché del service worker', items: [
      'Ya no hace falta acordarse de subir el número de caché de la PWA a mano en cada cambio — se recalcula solo a partir del contenido, así que un navegador con la app instalada siempre agarra la versión nueva.',
    ]},
    { version: '1.18.0', date: '2026-08-12', title: 'Menor constancia por días reales', items: [
      'Los períodos de "menor constancia" ahora se miden en días reales entre un entrenamiento y el siguiente, no en semanas — más precisos, sin fechas repetidas raras.',
      '"Hueco más largo sin entrenar" ahora muestra el año.',
      'Se quita la regla "Días/semana máximos para semana floja" de Ajustes — ya no se usa.',
    ]},
    { version: '1.17.0', date: '2026-08-12', title: 'Racha e Hitos: huecos reales', items: [
      'Un mes entero sin ninguna semana creada ahora cuenta como "0 días cumplidos" en vez de quedar invisible — Hitos ya muestra los huecos reales de meses, no solo huecos chicos entre semanas que sí existían.',
    ]},
    { version: '1.16.0', date: '2026-08-12', title: 'Conversor kg / lbs', items: [
      'Nuevo conversor en "Hoy", debajo de la nota de la semana — escribí en kg o en lbs y el otro campo se actualiza solo.',
    ]},
    { version: '1.15.0', date: '2026-08-12', title: 'Ajustes de UI y fix de Ajustes', items: [
      'Heatmap anual de Calendario ahora es vertical (Lun–Dom en columnas, una fila por semana) y muestra todos los años con datos, no solo 2023–2026.',
      'Hitos: el rango de fecha de cada período se separa en mes/año y día/fecha, en vez de una sola línea larga.',
      'Nota de la semana pasa al final de "Hoy"; Balance por grupo muscular pasa al final de Historial.',
      'Fix: el botón "Guardar reglas" en Ajustes ya no se salía del margen del panel.',
    ]},
    { version: '1.14.0', date: '2026-08-12', title: 'Edición offline', items: [
      'Marcar/editar/borrar un ejercicio o la nota de una semana ya no se pierde si se corta la conexión — se guarda y sincroniza solo al reconectar.',
      'Alcance acotado: crear semana, agregar ejercicio, migrar día, copiar semana pasada, importar datos y la librería siguen necesitando conexión.',
    ]},
    { version: '1.13.0', date: '2026-08-12', title: 'Backup automático', items: [
      'Script para respaldar todas tus semanas automáticamente por cron — configuración en el README, sección "Backup automático (cron)".',
    ]},
    { version: '1.12.0', date: '2026-08-12', title: 'Progresión sugerida', items: [
      'Al expandir un ejercicio que la semana pasada se marcó como hecho, aparece un peso sugerido para esta semana.',
    ]},
    { version: '1.11.0', date: '2026-08-12', title: 'Nota libre por semana', items: [
      'Nuevo campo en "Hoy" para anotar cómo fue la semana completa (lesiones, ajustes) — se guarda solo, separado de las notas por ejercicio.',
    ]},
    { version: '1.10.0', date: '2026-08-12', title: 'Balance por grupo muscular', items: [
      'Nuevo panel en Historial con cuántos días cumplidos tuvo cada grupo muscular en el período filtrado.',
    ]},
    { version: '1.9.0', date: '2026-08-12', title: 'PR automático', items: [
      'Al marcar un ejercicio como hecho con un kg mayor a tu mejor registro histórico para ese ejercicio, aparece un aviso de nuevo récord.',
    ]},
    { version: '1.8.0', date: '2026-08-12', title: 'Compartir como imagen', items: [
      'Nuevo botón para compartir el día activo o una semana de Historial como imagen (PNG) — comparte directo desde el celular o la descarga.',
    ]},
    { version: '1.7.0', date: '2026-08-12', title: 'Volumen del día', items: [
      'Nuevo chip "Volumen" en la tira de resumen de Hoy — kg x reps x series sumado de los ejercicios marcados como hechos.',
    ]},
    { version: '1.6.0', date: '2026-08-12', title: 'Reglas editables y heatmap anual', items: [
      'Ajustes: sección "Reglas" — los mínimos de racha, día cumplido y Hitos ahora se editan desde la app y afectan el cálculo real al instante.',
      'Calendario: card de heatmap anual (365 días, filtro por año) y botón "Volver a hoy" con swipe entre meses.',
      'Hitos: los períodos muestran el rango real de entrenamiento ("Lunes 23 de Marzo al Viernes 05 de Junio") en vez de meses calendario.',
      'Ajustes de espaciado, orden de "Migrar día" y el riel de días en móvil.',
    ]},
    { version: '1.5.0', date: '2026-08-11', title: 'Hitos y constancia', items: [
      'Nueva sección en Perfil con tus períodos de mayor y menor constancia, y una lista de hitos: primera sesión, mejor racha, mejor mes, hueco más largo sin entrenar y año más productivo.',
    ]},
    { version: '1.4.0', date: '2026-08-11', title: 'Racha semanal y calendario clicable', items: [
      'La racha ya no se rompe día por día: una semana necesita 5 o más días cumplidos para no cortarla.',
      'Tocar un día en el Calendario navega directo a ese día para verlo o editarlo.',
    ]},
    { version: '1.3.0', date: '2026-08-11', title: 'Sábado, domingo y Migrar día', items: [
      'El riel de días crece a 7 (Lun–Dom) — sábado y domingo quedan revelados al hacer scroll horizontal.',
      'Nueva función "Migrar día": mueve el set completo de ejercicios de un día a otro dentro de la misma semana, recorriendo en cadena si el destino ya tiene contenido.',
    ]},
    { version: '1.2.0', date: '2026-08-11', title: 'Historial, Progreso y respaldo de datos', items: [
      'Vista Historial con una tarjeta por semana, filtrable por mes.',
      'Vista Progreso con gráfica de carga por ejercicio (Chart.js).',
      'Exportar e importar todos tus datos como JSON desde Perfil.',
    ]},
    { version: '1.1.0', date: '2026-08-11', title: 'PWA instalable y sesión persistente', items: [
      'La app se puede instalar como PWA (manifest + service worker).',
      'Sesión persistente de 30 días — ya no hay que iniciar sesión cada vez.',
      'Nuevas vistas Perfil y Calendario.',
    ]},
    { version: '1.0.0', date: '2026-08-11', title: 'Conectada a base de datos real', items: [
      'El frontend deja de usar datos de ejemplo en memoria y se conecta a la API real: login, semanas y ejercicios persistentes.',
      'Importador de rutinas históricas desde JSON.',
    ]},
  ];
  const CURRENT_VERSION = APP_VERSIONS[0].version;

  // ============================================================
  // Librería de ejercicios (reutilizable / autocompletado)
  // Se carga desde la API en el arranque; ver loadAppData().
  // ============================================================
  const EXERCISE_LIBRARY = [];

  async function addToLibrary(name){
    const trimmed = (name || '').trim();
    if(!trimmed) return;
    const exists = EXERCISE_LIBRARY.some(e => e.name.toLowerCase() === trimmed.toLowerCase());
    if(exists) return;
    let entry;
    try{ entry = await Api.post('api/library.php', { name: trimmed }); }
    catch(err){ showToast(err.message); return; }
    EXERCISE_LIBRARY.push(entry);
    EXERCISE_LIBRARY.sort((a,b)=> a.name.localeCompare(b.name, 'es'));
    renderLibraryDatalist();
    renderLibraryView();
  }

  async function removeFromLibrary(id){
    const idx = EXERCISE_LIBRARY.findIndex(e => String(e.id) === String(id));
    if(idx === -1) return;
    try{ await Api.del(`api/library.php?id=${encodeURIComponent(id)}`); }
    catch(err){ showToast(err.message); return; }
    EXERCISE_LIBRARY.splice(idx, 1);
    renderLibraryDatalist();
    renderLibraryView();
  }

  function renderLibraryDatalist(){
    let dl = document.getElementById('exercise-library-list');
    if(!dl){
      dl = document.createElement('datalist');
      dl.id = 'exercise-library-list';
      document.body.appendChild(dl);
    }
    dl.innerHTML = EXERCISE_LIBRARY.map(e => `<option value="${escapeHtml(e.name)}">`).join('');
  }

  function renderLibraryView(){
    const host = document.getElementById('lib-list');
    const countEl = document.getElementById('lib-count');
    if(!host) return;
    const q = (document.getElementById('lib-search')?.value || '').trim().toLowerCase();
    const filtered = EXERCISE_LIBRARY.filter(e => e.name.toLowerCase().includes(q));
    countEl.textContent = `${EXERCISE_LIBRARY.length} ejercicio${EXERCISE_LIBRARY.length===1?'':'s'} guardados`;
    if(filtered.length === 0){
      host.innerHTML = `<p class="lib-empty">${EXERCISE_LIBRARY.length===0 ? 'Todavía no hay ejercicios guardados.' : 'Sin resultados.'}</p>`;
      return;
    }
    host.innerHTML = filtered.map(e => `
      <div class="lib-row" data-id="${e.id}">
        <span>${escapeHtml(e.name)}</span>
        <button type="button" class="lib-del" data-action="lib-del" aria-label="Eliminar de la librería"><i class="icon fa-solid fa-trash"></i></button>
      </div>
    `).join('');
  }

  function renderRulesPanel(){
    Object.keys(RULES).forEach(key=>{
      const input = document.getElementById(`rule-${key}`);
      if(input) input.value = RULES[key];
    });
  }

  async function saveRules(){
    const btn = document.getElementById('rules-save-btn');
    const body = {};
    for(const key of Object.keys(RULES)){
      const input = document.getElementById(`rule-${key}`);
      if(!input) continue;
      const val = parseInt(input.value, 10);
      if(!Number.isFinite(val)){ showToast('Todas las reglas deben ser números.'); return; }
      body[key] = val;
    }
    btn.disabled = true;
    try{
      const updated = await Api.put('api/settings.php', body);
      Object.assign(RULES, updated);
      renderRulesPanel();
      // Estas reglas alimentan la racha, el riel de días, Historial e
      // Hitos — se refrescan todos para que el cambio se vea de inmediato,
      // no solo la próxima vez que se navegue a esa vista.
      renderAll();
      renderHistorial();
      renderMilestones();
      showToast('Reglas guardadas.');
    }catch(err){
      showToast(err.message);
    }finally{
      btn.disabled = false;
    }
  }

  // ============================================================
  // Helpers de fecha
  // ============================================================
  function toISO(d){ return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); }
  function fromISO(iso){ return new Date(iso + 'T00:00:00'); }

  function mondayOfWeek(d){
    const day = d.getDay();
    const diff = (day + 6) % 7;
    const nd = new Date(d);
    nd.setDate(nd.getDate() - diff);
    return nd;
  }

  function nearestMonday(d){
    const day = d.getDay();
    if(day === 1) return new Date(d);
    const fwd = (1 - day + 7) % 7;
    const back = (day - 1 + 7) % 7;
    const nd = new Date(d);
    if(fwd <= back){ nd.setDate(nd.getDate() + fwd); } else { nd.setDate(nd.getDate() - back); }
    return nd;
  }

  function dayDate(weekKey, dayKey){
    const d = fromISO(weekKey);
    d.setDate(d.getDate() + DAY_OFFSET[dayKey]);
    return d;
  }
  function fmtShortDate(d){ return `${d.getDate()} ${MESES[d.getMonth()]}`; }
  // "4 ene – 24 sep 2024" — año una sola vez si ambas fechas caen en el
  // mismo año; si el rango cruza un cambio de año, se muestra en las dos.
  function fmtShortDateRange(startDate, endDate){
    const startYear = startDate.getFullYear();
    const endYear = endDate.getFullYear();
    if(startYear === endYear) return `${fmtShortDate(startDate)} – ${fmtShortDate(endDate)} ${endYear}`;
    return `${fmtShortDate(startDate)} ${startYear} – ${fmtShortDate(endDate)} ${endYear}`;
  }
  function fmtLongDate(d){ return `${d.getDate()} ${MESES_LARGO[d.getMonth()].toLowerCase()} ${d.getFullYear()}`; }
  // "Martes 13 de Marzo" — día de la semana + fecha completa, sin año
  // (se usa para rangos de período en Hitos, donde el año ya es obvio
  // por contexto o poco relevante frente al tramo de semanas en sí).
  function fmtFullDate(d){
    const key = WEEKDAY_TO_KEY[d.getDay()] || 'dom';
    return `${DAY_NAMES[key]} ${String(d.getDate()).padStart(2,'0')} de ${MESES_LARGO[d.getMonth()]}`;
  }
  function weekLabel(weekKey){
    const monday = fromISO(weekKey);
    const sunday = new Date(monday); sunday.setDate(sunday.getDate() + 6);
    if(monday.getMonth() === sunday.getMonth()){
      return `${monday.getDate()}–${sunday.getDate()} ${MESES[monday.getMonth()]}`;
    }
    return `${monday.getDate()} ${MESES[monday.getMonth()]}–${sunday.getDate()} ${MESES[sunday.getMonth()]}`;
  }
  function diasLabel(n){ return `${n} día${n===1?'':'s'}`; }

  function escapeHtml(s){
    return String(s ?? '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  // ============================================================
  // Estado — caché local de lo que ya se cargó de la API
  // ============================================================
  const today = new Date(); today.setHours(0,0,0,0);
  const todayMondayKey = toISO(mondayOfWeek(today));

  const state = {
    weeks: {},   // { [monday_date]: { days: { lun:{group,notes,exercises[]}, ... } } }
    order: [],   // monday_date[], más reciente primero (igual que devuelve la API)
    activeWeek: null,
    activeDay: WEEKDAY_TO_KEY[today.getDay()] || 'lun',
  };

  const expandedIds = new Set();
  let migratePickerOpen = false;
  let pendingDelete = null; // { day, exercise, index, timer } | null — borrado con undo, ver deleteExercise()
  const UNDO_DELETE_MS = 5000;

  function currentWeek(){ return state.activeWeek ? state.weeks[state.activeWeek] : null; }
  function currentDay(){ const w = currentWeek(); return w ? w.days[state.activeDay] : null; }
  function findExercise(id){ const d = currentDay(); return d ? d.exercises.find(e => String(e.id) === String(id)) : null; }
  function getPrevWeekKey(key){
    // state.order va de más reciente a más antigua, así que la semana
    // cronológicamente anterior está en la siguiente posición del arreglo.
    const idx = state.order.indexOf(key);
    return (idx > -1 && idx < state.order.length - 1) ? state.order[idx+1] : null;
  }
  function findExerciseInPrevWeek(name){
    const prevKey = getPrevWeekKey(state.activeWeek);
    if(!prevKey || !state.weeks[prevKey]) return null;
    const prevDay = state.weeks[prevKey].days[state.activeDay];
    const target = (name || '').trim().toLowerCase();
    if(!target) return null;
    return prevDay.exercises.find(e => e.name.trim().toLowerCase() === target) || null;
  }

  // La API devuelve group_name/notes por día (join a day_templates) y
  // exercises tal cual; se traduce group_name→group una sola vez acá para
  // que el resto del render siga usando el mismo shape que siempre tuvo.
  function applyWeekDetail(key, detail){
    // Reemplaza state.weeks[key] por completo — si había un borrado
    // pendiente de undo colgando de un objeto de día de ESTA semana, hay
    // que asentarlo antes de que ese objeto quede huérfano (ver
    // deleteExercise()/finalizePendingDelete()).
    if(pendingDelete) finalizePendingDelete();
    const days = {};
    DAY_ORDER.forEach(dk=>{
      const d = detail.days[dk];
      days[dk] = { group: d.group_name, notes: d.notes, migratedFrom: d.migrated_from, exercises: d.exercises };
    });
    state.weeks[key] = { days, note: detail.note || '' };
  }

  function comparisonHtml(curRaw, prevRaw){
    const prevDisplay = (prevRaw === '' || prevRaw === null || prevRaw === undefined) ? '—' : escapeHtml(prevRaw);
    const cur = parseFloat(curRaw);
    const prev = parseFloat(prevRaw);
    if(isNaN(cur) || isNaN(prev)){
      return `<span>${prevDisplay}</span>`;
    }
    if(cur > prev){
      return `<span>${prevDisplay}</span><i class="icon cmp-icon cmp-up fa-solid fa-chevron-down"></i>`;
    }
    if(cur < prev){
      return `<span>${prevDisplay}</span><i class="icon cmp-icon cmp-down fa-solid fa-chevron-down"></i>`;
    }
    return `<span>${prevDisplay}</span><span class="cmp-eq">=</span>`;
  }

  // ============================================================
  // Racha: días "cumplidos" (3+ ejercicios marcados) consecutivos,
  // cruzando semanas (lunes a viernes normalmente, ignorando domingo
  // que siempre está cerrado). Solo cuenta días hasta hoy — los días
  // futuros de la semana en curso no cortan la racha por estar
  // simplemente aún sin llegar.
  //
  // Sábado es un día "bonus": solo entra a la lista si tiene algún
  // ejercicio esa semana (vacío = neutral, igual que domingo). "Migrar
  // día" puede vaciar cualquier día lun-vie (su contenido se recorrió a
  // otro día posterior, en cadena) — ese día de origen se salta en vez
  // de contar como fallido. Se detecta juntando todos los migratedFrom
  // que aparecen esa semana: si alguno apunta a este día y este día ya
  // no tiene ejercicios, es porque se vació por una migración, no por
  // abandono.
  // ============================================================
  function buildChronoDays(){
    const list = [];
    const ascKeys = [...state.order].sort((a,b)=> a.localeCompare(b));
    ascKeys.forEach(wk=>{
      const week = state.weeks[wk];
      const migratedFromSet = new Set(DAY_ORDER.map(dk => week.days[dk].migratedFrom).filter(Boolean));
      DAY_ORDER.forEach(dk=>{
        if(dk === 'dom') return;
        const date = dayDate(wk, dk);
        if(date > today) return;
        const total = week.days[dk].exercises.length;
        if(dk === 'sab' && total === 0) return;
        if(dk !== 'sab' && total === 0 && migratedFromSet.has(dk)) return;
        const done = week.days[dk].exercises.filter(e=>e.done).length;
        list.push({ date, completed: done >= RULES.min_done_per_day });
      });
    });
    list.sort((a,b)=> a.date - b.date);
    return list;
  }

  // Claves de semana (lunes ISO) desde la primera semana con datos hasta
  // la semana actual, SIN SALTOS — una semana sin fila en la BD (mes
  // entero sin ninguna semana creada, típico del histórico importado de
  // Garmin) se recorre igual que una semana que sí existe pero con 0 días
  // cumplidos, en vez de quedar ausente. Sin esto, computeStreakDetail()
  // y computeMilestones() caminan solo las semanas que existen como fila
  // y pueden "puentear" huecos de meses como si dos semanas activas
  // separadas por ese hueco fueran consecutivas — un hueco real (nunca
  // se creó la semana) tiene que cortar la racha y aparecer como período
  // de menor constancia igual que lo muestra el heatmap anual, no quedar
  // invisible.
  function fullWeekRange(){
    if(state.order.length === 0) return [];
    const firstWk = [...state.order].sort((a,b)=> a.localeCompare(b))[0];
    const lastWk = toISO(mondayOfWeek(today));
    const keys = [];
    const cursor = fromISO(firstWk);
    while(toISO(cursor) <= lastWk){
      keys.push(toISO(cursor));
      cursor.setDate(cursor.getDate() + 7);
    }
    return keys;
  }

  // La racha se cuenta en días (RULES.min_done_per_day+ ejercicios
  // marcados), pero el corte ya no es día por día — es semanal: una
  // semana (lun-sáb) necesita al menos RULES.week_streak_min_days días
  // cumplidos para no romper la racha. Si los alcanza, todos sus días
  // cumplidos suman normal a la cuenta; si no, la racha se corta ahí
  // (esos días no suman, aunque individualmente hayan llegado al mínimo).
  // La semana en curso nunca se juzga como "rota" hasta que termine —
  // sus días cumplidos hasta hoy se van sumando igual, el mismo criterio
  // que antes aplicaba solo a "hoy".

  // Misma caminata semana-por-semana que computeStreaks(), pero además
  // guarda las fechas de inicio/fin de la mejor racha — lo necesita la
  // sección de Hitos para mostrar el rango de fechas, no solo el número.
  function computeStreakDetail(){
    const days = buildChronoDays();
    const currentWeekKey = toISO(mondayOfWeek(today));

    const byWeek = new Map();
    days.forEach(d=>{
      const wk = toISO(mondayOfWeek(d.date));
      if(!byWeek.has(wk)) byWeek.set(wk, []);
      byWeek.get(wk).push(d);
    });
    const weekKeys = fullWeekRange();

    let best = 0, run = 0, bestStart = null, bestEnd = null, runStart = null;
    weekKeys.forEach(wk=>{
      const entries = byWeek.get(wk) || [];
      const isCurrentWeek = wk === currentWeekKey;
      const qualifies = isCurrentWeek || entries.filter(e=>e.completed).length >= RULES.week_streak_min_days;
      if(qualifies){
        entries.forEach(e=>{
          if(e.completed){
            if(run === 0) runStart = e.date;
            run++;
            if(run > best){ best = run; bestStart = runStart; bestEnd = e.date; }
          }
        });
      } else {
        run = 0;
        runStart = null;
      }
    });

    return { current: run, best, bestStart, bestEnd };
  }

  function computeStreaks(){
    const { current, best } = computeStreakDetail();
    return { current, best };
  }

  // ============================================================
  // Hitos: estadísticas de constancia para Perfil, calculadas del
  // lado del cliente desde state.weeks ya cargado — mismo criterio de
  // "día cumplido" (RULES.min_done_per_day+ ejercicios) que la racha.
  // No depende de ningún historial externo (ej. Garmin); crece solo
  // con lo que ya está en la app, así que con pocos meses de datos es
  // normal que salga poco. Umbrales en RULES.milestone_*.
  // ============================================================

  // startDate/endDate son los días REALES de entrenamiento (primero y
  // último) dentro del tramo, no el lunes/domingo calendario de la
  // semana. Partido en dos líneas para Hitos: mes(es)+año arriba
  // ("Marzo a Junio 2026") y día+fecha abajo ("Lunes 23 al Viernes 05")
  // — si el tramo cruza un cambio de año, se muestra el año en ambos
  // extremos para no dejarlo ambiguo.
  function periodMonthYearLabel(startDate, endDate){
    const startMonth = MESES_LARGO[startDate.getMonth()];
    const endMonth = MESES_LARGO[endDate.getMonth()];
    const startYear = startDate.getFullYear();
    const endYear = endDate.getFullYear();
    if(startYear !== endYear) return `${startMonth} ${startYear} a ${endMonth} ${endYear}`;
    if(startMonth === endMonth) return `${startMonth} ${startYear}`;
    return `${startMonth} a ${endMonth} ${startYear}`;
  }

  // "Lunes 23, Mar al Viernes 05 Jun" — abreviatura de mes de 3 caracteres
  // con mayúscula inicial (MESES_LARGO ya viene capitalizado, alcanza con
  // recortar a 3 letras). Coma solo después de la primera fecha.
  function periodDayLabel(startDate, endDate){
    const startKey = WEEKDAY_TO_KEY[startDate.getDay()] || 'dom';
    const endKey = WEEKDAY_TO_KEY[endDate.getDay()] || 'dom';
    const startMon = MESES_LARGO[startDate.getMonth()].slice(0, 3);
    const endMon = MESES_LARGO[endDate.getMonth()].slice(0, 3);
    return `${DAY_NAMES[startKey]} ${String(startDate.getDate()).padStart(2,'0')} ${startMon} al ${DAY_NAMES[endKey]} ${String(endDate.getDate()).padStart(2,'0')} ${endMon}`;
  }

  function findRuns(weekStats, predicate, days){
    const runs = [];
    let cur = null;
    weekStats.forEach(w=>{
      if(predicate(w)){
        // weekStats solo trae semanas que existen como fila en la BD —
        // si falta una semana entera (nunca se creó, no que exista con 0
        // ejercicios), queda ausente del array, no como un 0 de relleno.
        // Sin este chequeo, dos semanas sueltas separadas por meses de
        // huecos se verían como "N semanas seguidas" solo por quedar
        // adyacentes en el array disperso.
        let isAdjacent = false;
        if(cur){
          const expected = fromISO(cur.endWk);
          expected.setDate(expected.getDate() + 7);
          isAdjacent = toISO(expected) === w.wk;
        }
        if(cur && !isAdjacent){ runs.push(cur); cur = null; }
        if(!cur){ cur = { startWk: w.wk, endWk: w.wk, weeks: [w] }; }
        else { cur.endWk = w.wk; cur.weeks.push(w); }
      } else if(cur){ runs.push(cur); cur = null; }
    });
    if(cur) runs.push(cur);
    runs.forEach(r=>{
      r.totalDays = r.weeks.reduce((s,w)=> s + w.count, 0);
      r.avgPerWeek = r.totalDays / r.weeks.length;
      // Rango real de entrenamiento dentro del tramo (no el lunes/domingo
      // calendario) — si por algún motivo no hay ningún día cumplido en
      // el rango (tramo "flojo" con puros ceros), cae de vuelta a los
      // límites de semana como respaldo.
      const rangeStart = fromISO(r.startWk);
      const rangeEnd = fromISO(r.endWk); rangeEnd.setDate(rangeEnd.getDate() + 6);
      const trainedInRange = days.filter(d => d.completed && d.date >= rangeStart && d.date <= rangeEnd);
      r.startDate = trainedInRange.length ? trainedInRange[0].date : rangeStart;
      r.endDate = trainedInRange.length ? trainedInRange[trainedInRange.length - 1].date : rangeEnd;
    });
    return runs;
  }

  function computeMilestones(){
    const days = buildChronoDays();
    const trained = days.filter(d => d.completed);
    if(trained.length === 0) return null;

    const firstDate = trained[0].date;
    const { best: bestStreak, bestStart, bestEnd } = computeStreakDetail();

    const byMonth = new Map();
    const byYear = new Map();
    trained.forEach(d=>{
      const mk = `${d.date.getFullYear()}-${String(d.date.getMonth()+1).padStart(2,'0')}`;
      byMonth.set(mk, (byMonth.get(mk) || 0) + 1);
      const y = d.date.getFullYear();
      byYear.set(y, (byYear.get(y) || 0) + 1);
    });
    let bestMonthKey = null, bestMonthCount = 0;
    byMonth.forEach((count, key)=>{ if(count > bestMonthCount){ bestMonthCount = count; bestMonthKey = key; } });
    let bestYear = null, bestYearCount = 0;
    byYear.forEach((count, y)=>{ if(count > bestYearCount){ bestYearCount = count; bestYear = y; } });

    let maxGapDays = 0, maxGapStart = null, maxGapEnd = null;
    for(let i = 1; i < trained.length; i++){
      const gap = Math.round((trained[i].date - trained[i-1].date) / 86400000);
      if(gap > maxGapDays){ maxGapDays = gap; maxGapStart = trained[i-1].date; maxGapEnd = trained[i].date; }
    }

    // Constancia semanal: días cumplidos por semana (lun-sáb), excluyendo
    // la semana en curso (todavía incompleta, no sirve para detectar
    // tramos). fullWeekRange() recorre TODAS las semanas calendario desde
    // la primera con datos hasta hoy, sin saltos — una semana sin fila en
    // la BD entra con count:0 en vez de quedar ausente, para que un hueco
    // de meses (nunca se creó esa semana) se detecte como período de
    // menor constancia igual que se ve en el heatmap anual.
    const byWeek = new Map();
    days.forEach(d=>{
      const wk = toISO(mondayOfWeek(d.date));
      if(!byWeek.has(wk)) byWeek.set(wk, []);
      byWeek.get(wk).push(d);
    });
    const currentWeekKey = toISO(mondayOfWeek(today));
    const weekStats = fullWeekRange()
      .filter(wk => wk !== currentWeekKey)
      .map(wk => ({ wk, count: (byWeek.get(wk) || []).filter(e=>e.completed).length }));

    const topStrong = findRuns(weekStats, w => w.count >= RULES.milestone_strong_min, days)
      .filter(r => r.weeks.length >= RULES.milestone_min_run_weeks)
      .sort((a,b)=> b.weeks.length - a.weeks.length || b.avgPerWeek - a.avgPerWeek)
      .slice(0, 3);

    // Menor constancia: a diferencia de mayor constancia (que sí tiene
    // sentido medir en semanas — semanas buenas seguidas), un hueco es más
    // preciso medido en días reales entre un entrenamiento y el siguiente,
    // sin pasar por la aproximación semanal — mismo cálculo que "hueco más
    // largo sin entrenar" (maxGapDays de arriba), pero quedándose con los
    // 3 huecos más grandes en vez de uno solo. Umbral mínimo reutiliza
    // milestone_min_run_weeks en días (×7) para no listar huecos triviales
    // de un par de días como si fueran un hito.
    const minGapDays = RULES.milestone_min_run_weeks * 7;
    const gaps = [];
    for(let i = 1; i < trained.length; i++){
      const gapDays = Math.round((trained[i].date - trained[i-1].date) / 86400000);
      if(gapDays >= minGapDays){
        gaps.push({ startDate: trained[i-1].date, endDate: trained[i].date, gapDays });
      }
    }
    const topWeak = gaps.sort((a,b)=> b.gapDays - a.gapDays).slice(0, 3);

    return { firstDate, bestStreak, bestStart, bestEnd, bestMonthKey, bestMonthCount, bestYear, bestYearCount, maxGapDays, maxGapStart, maxGapEnd, topStrong, topWeak };
  }

  // ============================================================
  // Render
  // ============================================================
  function renderAll(){
    renderWeekPills();
    renderDayRack();
    renderDayPanel();
    renderWeekNote();
    updateStreakBadge();
    updateSummaryStrip();
  }

  // Nota libre de la semana activa (separada de la nota por ejercicio).
  // El chequeo de activeElement evita pisar lo que el usuario está
  // escribiendo si algo dispara un re-render mientras el textarea tiene foco.
  function renderWeekNote(){
    const el = document.getElementById('week-note-input');
    const panel = document.getElementById('week-note-panel');
    const week = currentWeek();
    panel.classList.toggle('hidden', !week);
    if(!week) return;
    if(document.activeElement !== el) el.value = week.note || '';
  }

  function renderWeekPills(){
    const host = document.getElementById('week-pills');
    host.innerHTML = '';
    state.order.forEach(key=>{
      const pill = document.createElement('div');
      pill.className = 'week-pill' + (key === state.activeWeek ? ' active' : '');
      pill.dataset.week = key;

      const label = document.createElement('span');
      label.textContent = weekLabel(key);
      pill.appendChild(label);

      if(key === state.activeWeek && state.order.length > 1){
        const del = document.createElement('button');
        del.type = 'button';
        del.className = 'wp-del';
        del.setAttribute('aria-label', 'Eliminar semana');
        del.innerHTML = '<i class="icon fa-solid fa-xmark"></i>';
        del.addEventListener('click', (e)=>{ e.stopPropagation(); deleteWeek(key); });
        pill.appendChild(del);
      }

      pill.addEventListener('click', ()=> selectWeek(key));
      host.appendChild(pill);
    });
  }

  function selectWeek(key){
    if(!state.weeks[key] || key === state.activeWeek) return;
    state.activeWeek = key;
    migratePickerOpen = false;
    renderAll();
    const el = document.querySelector(`.week-pill[data-week="${key}"]`);
    if(el) el.scrollIntoView({inline:'center', block:'nearest', behavior:'smooth'});
  }

  async function deleteWeek(key){
    if(pendingDelete) finalizePendingDelete(); // evita resucitar un ejercicio en una semana que está por desaparecer
    if(state.order.length <= 1){ showToast('Debe quedar al menos una semana.'); return; }
    if(!confirm('¿Eliminar esta semana? Se perderán sus registros.')) return;
    try{ await Api.del(`api/weeks.php?date=${encodeURIComponent(key)}`); }
    catch(err){ showToast(err.message); return; }
    delete state.weeks[key];
    state.order = state.order.filter(k => k !== key);
    if(state.activeWeek === key){
      state.activeWeek = state.order[state.order.length - 1] ?? null;
    }
    renderAll();
    showToast('Semana eliminada.');
  }

  function renderDayRack(){
    const host = document.getElementById('day-rack');
    host.innerHTML = '';
    const week = currentWeek();
    if(!week) return;
    DAY_ORDER.forEach(dk=>{
      const doneCount = week.days[dk].exercises.filter(e=>e.done).length;
      const isCompleted = doneCount >= RULES.min_done_per_day;
      const migratedFrom = week.days[dk].migratedFrom;
      const tab = document.createElement('div');
      tab.className = 'day-tab' + (dk === state.activeDay ? ' active' : '') + (isCompleted ? ' completed' : '');
      tab.dataset.day = dk;
      tab.innerHTML = `
        ${migratedFrom ? `<i class="icon migrated-mark fa-solid fa-right-left" title="Migrado de ${DAY_NAMES[migratedFrom]}"></i>` : ''}
        <div class="plate">${DAY_LETTER[dk]}</div>
        <div class="dname">${DAY_SHORT[dk]}</div>
        <span class="muted-tag">${week.days[dk].group.split(' ')[0]}</span>
      `;
      tab.addEventListener('click', ()=>{
        state.activeDay = dk;
        migratePickerOpen = false;
        renderDayRack();
        renderDayPanel();
        updateSummaryStrip();
      });
      host.appendChild(tab);
    });
  }

  function exerciseRowHtml(ex){
    const expanded = expandedIds.has(String(ex.id));
    const hasName = !!(ex.name && ex.name.trim());
    // Botón para saltar a Progreso con este ejercicio ya cargado — no
    // depende de tener datos de la semana pasada (Progreso usa todo el
    // historial vía collectExerciseHistory()), así que aparece en las dos
    // ramas del detalle expandido, no solo cuando hay comparación.
    const progressBtnHtml = hasName
      ? `<button type="button" class="ex-progress-btn" data-action="view-progress" data-name="${escapeHtml(ex.name)}"><i class="icon fa-solid fa-chart-line"></i>Ver progreso</button>`
      : '';
    let detailHtml = '';
    if(expanded){
      const prevEx = findExerciseInPrevWeek(ex.name);
      if(!prevEx){
        detailHtml = `<div class="ex-detail"><div class="ex-detail-empty-row">${progressBtnHtml}<p class="ex-detail-empty">Sin datos de la semana pasada para este ejercicio.</p></div></div>`;
      } else {
        // Progresión sugerida: solo si la semana pasada se marcó como
        // hecha (si no, no hay nada que "progresar" todavía) y su kg es
        // numérico. Es una sugerencia de referencia, no se precarga en el
        // input — evita pisar algo que el usuario ya haya escrito.
        const prevKg = parseFloat(prevEx.kg);
        let suggestionHtml = '';
        if(prevEx.done && !isNaN(prevKg)){
          const suggested = prevKg + PROGRESSION_INCREMENT_KG;
          const suggestedLabel = Number.isInteger(suggested) ? suggested : suggested.toFixed(1);
          suggestionHtml = `<div class="ex-detail-suggestion">Sugerido esta semana: <strong>${suggestedLabel} kg</strong></div>`;
        }
        detailHtml = `
          <div class="ex-detail">
            <div class="ex-detail-head-left">
              ${progressBtnHtml}
              <div class="ex-detail-label">Semana<br>pasada:</div>
            </div>
            <div class="ex-detail-item"><span class="k">Kg</span><span class="v">${comparisonHtml(ex.kg, prevEx.kg)}</span></div>
            <div class="ex-detail-item"><span class="k">Rep</span><span class="v">${comparisonHtml(ex.reps, prevEx.reps)}</span></div>
            <div class="ex-detail-item"><span class="k">Ser</span><span class="v">${comparisonHtml(ex.series, prevEx.series)}</span></div>
            ${suggestionHtml}
          </div>`;
      }
    }
    const displayText = hasName ? escapeHtml(ex.name) : 'Nombre del ejercicio';
    const noteText = ex.note && ex.note.trim() ? escapeHtml(ex.note.trim()) : '+ nota';
    const noteClass = ex.note && ex.note.trim() ? 'ex-note has-note' : 'ex-note';
    return `
      <div class="ex-row ${ex.done ? 'done' : 'pending'}" data-id="${ex.id}">
        <div class="ex-check" data-action="toggle"><i class="icon fa-solid ${ex.done ? 'fa-check' : 'fa-minus'}"></i></div>
        <div class="ex-name-cell">
          <div class="ex-name-display${hasName ? '' : ' empty'}" data-action="edit-name">${displayText}</div>
          <input class="ex-name-input" data-field="name" list="exercise-library-list" value="${escapeHtml(ex.name)}" placeholder="Nombre del ejercicio">
          <button type="button" class="${noteClass}" data-action="edit-note">${noteText}</button>
        </div>
        <input class="ex-val-input" data-field="kg" value="${escapeHtml(ex.kg)}" inputmode="decimal" placeholder="—">
        <input class="ex-val-input" data-field="reps" value="${escapeHtml(ex.reps)}" inputmode="numeric" placeholder="—">
        <input class="ex-val-input" data-field="series" value="${escapeHtml(ex.series)}" inputmode="numeric" placeholder="—">
        <button class="ex-del" type="button" data-action="delete" aria-label="Eliminar ejercicio"><i class="icon fa-solid fa-trash"></i></button>
        <button class="ex-chevron${expanded ? ' open' : ''}" type="button" data-action="chevron" aria-label="Ver semana pasada"><i class="icon fa-solid fa-chevron-down"></i></button>
      </div>${detailHtml}`;
  }

  function renderDayPanel(){
    const host = document.getElementById('day-panel-host');

    if(!state.activeWeek){
      host.innerHTML = `
        <div class="day-panel">
          <div class="day-empty">
            <p>Todavía no has creado ninguna semana.</p>
            <div class="day-empty-actions">
              <button class="btn-copy-week" type="button" data-action="first-week">+ Nueva semana</button>
            </div>
          </div>
        </div>`;
      return;
    }

    const day = currentDay();
    const d = dayDate(state.activeWeek, state.activeDay);
    const total = day.exercises.length;
    const done = day.exercises.filter(e=>e.done).length;
    const ratio = total ? done/total : 0;
    const offset = RING_C * (1 - ratio);
    const ringTier = done <= 2 ? 'tier-red' : done <= 5 ? 'tier-yellow' : 'tier-green';

    let bodyHtml;
    if(total === 0){
      const prevKey = getPrevWeekKey(state.activeWeek);
      bodyHtml = `
        <div class="day-empty">
          <p>Todavía no hay ejercicios para este día.</p>
          <div class="day-empty-actions">
            ${prevKey ? `<button class="btn-copy-week" type="button" data-action="copy-week">Copiar semana pasada</button>` : ''}
            <button class="btn-add-ex" type="button" data-action="add-ex">+ Agregar ejercicio</button>
          </div>
        </div>`;
    } else {
      bodyHtml = `
        <div class="col-heads"><span></span><span>Ejercicio</span><span>Kg</span><span>Rep</span><span>Ser</span><span></span><span></span></div>
        ${day.exercises.map(exerciseRowHtml).join('')}
        <div class="add-ex-row" data-action="add-ex"><i class="icon fa-solid fa-plus"></i>Agregar ejercicio</div>
        ${day.notes ? `<div class="day-notes">${day.notes}</div>` : ''}`;
    }

    // "Migrar día": el destino puede ser cualquier día posterior de la
    // misma semana, tenga o no contenido ya — si lo tiene, el backend lo
    // recorre en cadena hacia el día siguiente (y así sucesivamente)
    // hasta encontrar un hueco. Solo se oculta el botón si activeDay es
    // el último de la semana (domingo — no hay ningún día posterior).
    const week = currentWeek();
    const activeIdx = DAY_ORDER.indexOf(state.activeDay);
    const migrateTargets = DAY_ORDER.filter((dk, idx) => idx > activeIdx);
    let migrateHtml = '';
    if(total > 0 && migrateTargets.length > 0){
      if(migratePickerOpen){
        const options = migrateTargets.map(dk => {
          const occupied = week.days[dk].exercises.length > 0;
          const label = `${DAY_NAMES[dk]} · ${fmtShortDate(dayDate(state.activeWeek, dk))}${occupied ? ' — ya tiene rutina, se recorre' : ''}`;
          return `<option value="${dk}">${label}</option>`;
        }).join('');
        migrateHtml = `
          <div class="migrate-row open">
            <select id="migrate-target">${options}</select>
            <button class="btn-migrate-confirm" type="button" data-action="migrate-confirm">Migrar</button>
            <button class="btn-migrate-cancel" type="button" data-action="migrate-cancel" aria-label="Cancelar"><i class="icon fa-solid fa-xmark"></i></button>
          </div>`;
      } else {
        migrateHtml = `
          <div class="migrate-row">
            <button class="btn-migrate" type="button" data-action="migrate-open"><i class="icon fa-solid fa-right-left"></i>Migrar día</button>
          </div>`;
      }
    }

    host.innerHTML = `
      <div class="day-panel">
        <div class="day-panel-head">
          <div>
            <div class="grp">${day.group}</div>
            <div class="day-of">${DAY_NAMES[state.activeDay]} · ${fmtShortDate(d)}</div>
          </div>
          <div class="day-panel-head-actions">
            <button class="share-btn" type="button" data-action="share-day" aria-label="Compartir día"><i class="icon fa-solid fa-share-nodes"></i></button>
            <div class="progress-ring ${ringTier}">
              <svg width="40" height="40" viewBox="0 0 40 40">
                <circle class="bgc" cx="20" cy="20" r="16"></circle>
                <circle class="fgc" cx="20" cy="20" r="16" stroke-dasharray="${RING_C.toFixed(1)}" stroke-dashoffset="${offset.toFixed(1)}"></circle>
              </svg>
              <div class="pct">${done}/${total}</div>
            </div>
          </div>
        </div>
        ${bodyHtml}
        ${migrateHtml}
      </div>`;
  }

  async function migrateDay(toDay){
    if(!state.activeWeek) return;
    let detail;
    try{
      detail = await Api.post('api/migrate_day.php', { monday_date: state.activeWeek, from_day: state.activeDay, to_day: toDay });
    }catch(err){ showToast(err.message); return; }
    applyWeekDetail(state.activeWeek, detail);
    state.activeDay = toDay;
    migratePickerOpen = false;
    renderAll();
    const shifted = detail.shifted || 0;
    showToast(shifted > 0
      ? `Día migrado a ${DAY_NAMES[toDay]} — se recorrieron ${shifted} día${shifted === 1 ? '' : 's'} más.`
      : `Día migrado a ${DAY_NAMES[toDay]}.`);
  }

  // Badges apilados: a los 100 días se ven bronce+plata+oro juntos (no
  // solo el más alto) — mismo criterio de "un ícono por rango" que ya usa
  // el medallero de Hitos, pero acumulativo en vez de exclusivo.
  function renderStreakBadges(current){
    const host = document.getElementById('streak-badges');
    if(!host) return;
    const tiers = [];
    if(current >= 7)   tiers.push({ icon: 'fa-medal',  cls: 'bronze', label: 'Racha de 7+ días' });
    if(current >= 30)  tiers.push({ icon: 'fa-medal',  cls: 'silver', label: 'Racha de 30+ días' });
    if(current >= 100) tiers.push({ icon: 'fa-trophy', cls: 'gold',   label: 'Racha de 100+ días' });
    host.innerHTML = tiers.map(t =>
      `<i class="icon streak-badge-ico milestone-ico ${t.cls} fa-solid ${t.icon}" title="${t.label}" aria-label="${t.label}"></i>`
    ).join('');
  }

  function updateStreakBadge(){
    const { current, best } = computeStreaks();

    const badge = document.getElementById('streak-badge');
    badge.textContent = diasLabel(current);
    badge.classList.toggle('complete', current > 0);
    renderStreakBadges(current);

    document.getElementById('sum-best-streak').textContent = diasLabel(best);

    // Los cards de día, el calendario, el historial, progreso e hitos dependen del mismo estado, así que se refrescan aquí también
    renderDayRack();
    renderCalendar();
    renderHeatmap();
    renderHistorial();
    renderProgreso();
    renderMilestones();
  }

  function renderMilestones(){
    const host = document.getElementById('milestones-host');
    if(!host) return;
    const m = computeMilestones();
    if(!m){
      host.innerHTML = `<p class="milestone-empty">Todavía no hay días marcados como cumplidos — cuando registres algunos, tus hitos van a aparecer aquí.</p>`;
      return;
    }

    const strongHtml = m.topStrong.length
      ? m.topStrong.map((r, i) => {
        // 1er lugar: trofeo dorado. 2do y 3ro: medalla plata/bronce.
        const rankIco = i === 0 ? 'fa-trophy' : 'fa-medal';
        const rankColor = i === 0 ? 'gold' : i === 1 ? 'silver' : 'bronze';
        return `
        <div class="milestone-row">
          <i class="icon milestone-ico ${rankColor} fa-solid ${rankIco}"></i>
          <div>
            <div class="milestone-title">
              <div class="milestone-period">${i+1}. ${periodMonthYearLabel(r.startDate, r.endDate)}</div>
              <div class="milestone-daterange">${periodDayLabel(r.startDate, r.endDate)}</div>
            </div>
            <p class="milestone-desc">${r.weeks.length} semanas seguidas con ${r.avgPerWeek.toFixed(1)} días de entrenamiento en promedio.</p>
          </div>
        </div>`;
      }).join('<div class="milestone-divider"></div>')
      : `<p class="milestone-empty">Todavía no se distingue un tramo sólido de varias semanas seguidas — sigue registrando para verlo aquí.</p>`;

    const weakHtml = m.topWeak.length
      ? m.topWeak.map(g => `
        <div class="milestone-row">
          <i class="icon milestone-ico danger fa-solid fa-triangle-exclamation"></i>
          <div>
            <div class="milestone-title">
              <div class="milestone-period">${periodMonthYearLabel(g.startDate, g.endDate)}</div>
              <div class="milestone-daterange">${periodDayLabel(g.startDate, g.endDate)}</div>
            </div>
            <p class="milestone-desc">${g.gapDays} días sin entrenar.</p>
          </div>
        </div>`).join('<div class="milestone-divider"></div>')
      : `<p class="milestone-empty">Sin huecos largos sin entrenar todavía — bien ahí.</p>`;

    const items = [
      `Primer entrenamiento registrado: <strong>${fmtLongDate(m.firstDate)}</strong>`,
    ];
    if(m.bestStreak > 0){
      items.push(`Mejor racha: <strong>${diasLabel(m.bestStreak)} seguidos</strong> (${fmtShortDateRange(m.bestStart, m.bestEnd)})`);
    }
    if(m.bestMonthKey){
      const [y, mo] = m.bestMonthKey.split('-');
      items.push(`Mes con más entrenamientos: <strong>${MESES_LARGO[parseInt(mo,10)-1]} ${y}</strong> (${m.bestMonthCount})`);
    }
    if(m.maxGapDays > 0){
      items.push(`Hueco más largo sin entrenar: <strong>${m.maxGapDays} días</strong> (${fmtShortDateRange(m.maxGapStart, m.maxGapEnd)})`);
    }
    if(m.bestYear){
      items.push(`Año más productivo: <strong>${m.bestYear}</strong> (${m.bestYearCount} días entrenados)`);
    }

    host.innerHTML = `
      <div class="milestone-block">
        <div class="milestone-block-title">Tus periodos de mayor constancia</div>
        ${strongHtml}
      </div>
      <div class="milestone-block">
        <div class="milestone-block-title">Tus periodos de menor constancia</div>
        ${weakHtml}
      </div>
      <div class="milestone-block">
        <div class="milestone-block-title">Hitos interesantes</div>
        <ul class="milestone-list">${items.map(i => `<li>${i}</li>`).join('')}</ul>
      </div>`;
  }

  // Changelog: contenido estático (APP_VERSIONS), así que se renderiza
  // una sola vez — no depende de state.weeks como Hitos.
  function renderChangelog(){
    const listEl = document.getElementById('changelog-list');
    const versionEl = document.getElementById('changelog-current-version');
    if(!listEl || !versionEl) return;

    versionEl.textContent = CURRENT_VERSION;
    listEl.innerHTML = APP_VERSIONS.map((v, i) => `
      <details class="changelog-entry"${i === 0 ? ' open' : ''}>
        <summary>
          <div class="changelog-entry-heading">
            <span class="changelog-entry-version">v${v.version}</span>
            <span class="changelog-entry-title">${escapeHtml(v.title)}</span>
          </div>
          <span class="changelog-entry-date">${fmtShortDate(fromISO(v.date))}</span>
          <i class="icon chev fa-solid fa-chevron-down"></i>
        </summary>
        <div class="changelog-entry-body">
          <ul>${v.items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
        </div>
      </details>`).join('');
  }
  renderChangelog();

  function updateSummaryStrip(){
    renderWeeklyRecap();
    const day = currentDay();
    if(!day){
      document.getElementById('sum-series').textContent = '0';
      document.getElementById('sum-exercises').textContent = '0/0';
      document.getElementById('sum-volume').textContent = '0 kg';
      return;
    }
    const doneRows = day.exercises.filter(e=>e.done);
    let seriesSum = 0;
    doneRows.forEach(e=>{ const n = parseInt(e.series, 10); if(!isNaN(n)) seriesSum += n; });
    document.getElementById('sum-series').textContent = seriesSum;
    document.getElementById('sum-exercises').textContent = `${doneRows.length}/${day.exercises.length}`;
    document.getElementById('sum-volume').textContent = `${Math.round(computeDayVolume(day)).toLocaleString('es-MX')} kg`;
  }

  // Volumen del día: kg x reps x series sumado de los ejercicios marcados
  // como hechos. Descarta silenciosamente cualquier valor no numérico
  // (mismo criterio que el resto de la app: "40(8)" o vacío no cuentan
  // como cero, se ignoran).
  function computeDayVolume(day){
    let vol = 0;
    day.exercises.forEach(e=>{
      if(!e.done) return;
      const kg = parseFloat(e.kg), reps = parseInt(e.reps, 10), series = parseInt(e.series, 10);
      if(isNaN(kg) || isNaN(reps) || isNaN(series)) return;
      vol += kg * reps * series;
    });
    return vol;
  }

  function computeWeekVolume(week){
    let vol = 0;
    DAY_ORDER.filter(dk => dk !== 'dom').forEach(dk => { vol += computeDayVolume(week.days[dk]); });
    return vol;
  }

  // Adherencia: días con contenido esa semana que llegaron al mínimo de
  // ejercicios marcados (mismo criterio de "día cumplido" que el resto de
  // la app), sobre el total de días con contenido.
  function computeWeekAdherence(week){
    const relevantDays = DAY_ORDER.filter(dk => dk !== 'dom').filter(dk => week.days[dk].exercises.length > 0);
    const doneDays = relevantDays.filter(dk => week.days[dk].exercises.filter(e=>e.done).length >= RULES.min_done_per_day);
    return { done: doneDays.length, total: relevantDays.length };
  }

  function renderWeeklyRecap(){
    const host = document.getElementById('weekly-recap-host');
    if(!host) return;

    const curKey = state.activeWeek;
    const curWeek = curKey ? state.weeks[curKey] : null;
    const prevKey = curKey ? getPrevWeekKey(curKey) : null;
    const prevWeek = prevKey ? state.weeks[prevKey] : null;

    // Solo cuenta como "semana pasada" real si el lunes anterior cae
    // EXACTAMENTE 7 días antes — getPrevWeekKey() da la entrada adyacente
    // en state.order, que puede saltar un hueco (mes entero sin semanas).
    const isAdjacent = !!(curWeek && prevWeek && (fromISO(curKey) - fromISO(prevKey)) === 7 * 86400000);

    if(!isAdjacent){ host.classList.add('hidden'); host.innerHTML = ''; return; }

    const curVol = computeWeekVolume(curWeek), prevVol = computeWeekVolume(prevWeek);
    const volDelta = prevVol > 0 ? ((curVol - prevVol) / prevVol) * 100 : null;
    const curAdh = computeWeekAdherence(curWeek), prevAdh = computeWeekAdherence(prevWeek);
    const deltaColor = (volDelta ?? 0) >= 0 ? 'var(--ok)' : 'var(--danger)';

    host.classList.remove('hidden');
    host.innerHTML = `
      <div class="recap-title">Esta semana vs. la pasada</div>
      <div class="recap-row">
        <div class="recap-item">
          <div class="k">Volumen</div>
          <div class="v">${Math.round(curVol).toLocaleString('es-MX')} kg${volDelta === null ? '' :
            ` <span class="recap-delta" style="color:${deltaColor}">${volDelta >= 0 ? '+' : ''}${volDelta.toFixed(0)}%</span>`}</div>
        </div>
        <div class="recap-item">
          <div class="k">Adherencia</div>
          <div class="v">${curAdh.done}/${curAdh.total} <span class="recap-vs">(antes ${prevAdh.done}/${prevAdh.total})</span></div>
        </div>
      </div>`;
  }

  // ============================================================
  // Acciones sobre ejercicios
  // ============================================================
  async function toggleExercise(id){
    const ex = findExercise(id);
    if(!ex) return;
    const newDone = !ex.done;
    // El mejor histórico se calcula ANTES de aplicar el toggle, para no
    // comparar el ejercicio contra sí mismo. Se calcula local en vez de
    // leerlo de la respuesta del servidor a propósito: la cola de edición
    // offline puede devolver una respuesta sin eco real cuando no hay
    // conexión, así que ex.done siempre se fija con el valor calculado
    // acá, nunca con lo que devuelva la API.
    const prevBest = (newDone && ex.name.trim()) ? bestPriorKgForExercise(ex.name) : null;
    try{ await Api.put(`api/exercises.php?id=${encodeURIComponent(id)}`, { done: newDone }); }
    catch(err){ showToast(err.message); return; }
    ex.done = newDone;
    if(newDone && prevBest !== null){
      const kg = parseFloat(ex.kg);
      if(!isNaN(kg) && kg > prevBest){
        showToast(`Nuevo récord en "${ex.name.trim()}": ${kg} kg (antes ${prevBest} kg).`);
      }
    }
    renderDayPanel();
    updateStreakBadge();
    updateSummaryStrip();
  }

  // Confirma en el servidor un borrado que ya se aplicó de forma optimista
  // en la UI — se llama sola al vencer la ventana de undo, o de inmediato
  // si una mutación estructural (deleteWeek/applyWeekDetail) necesita
  // asentar el estado antes de reemplazar/eliminar la semana entera.
  function finalizePendingDelete(){
    if(!pendingDelete) return;
    const { exercise } = pendingDelete;
    clearTimeout(pendingDelete.timer);
    pendingDelete = null;
    Api.del(`api/exercises.php?id=${encodeURIComponent(exercise.id)}`).catch(err=>{ showToast(err.message); });
  }

  function undoPendingDelete(){
    if(!pendingDelete) return;
    clearTimeout(pendingDelete.timer);
    const { day, exercise, index } = pendingDelete;
    day.exercises.splice(index, 0, exercise);
    pendingDelete = null;
    renderDayPanel();
    updateStreakBadge();
    updateSummaryStrip();
  }

  function deleteExercise(id){
    const day = currentDay();
    if(!day) return;
    const index = day.exercises.findIndex(e=>String(e.id) === String(id));
    if(index === -1) return;

    // Un solo cupo de undo a la vez: si ya había un borrado pendiente, se
    // confirma de inmediato en vez de encolarlo o perderlo silenciosamente.
    if(pendingDelete) finalizePendingDelete();

    const [exercise] = day.exercises.splice(index, 1);
    expandedIds.delete(String(id));
    renderDayPanel();
    updateStreakBadge();
    updateSummaryStrip();

    pendingDelete = { day, exercise, index, timer: setTimeout(finalizePendingDelete, UNDO_DELETE_MS) };

    showToast(`"${exercise.name || 'Ejercicio'}" eliminado.`, {
      actionLabel: 'Deshacer',
      onAction: undoPendingDelete,
      duration: UNDO_DELETE_MS,
    });
  }

  async function addExercise(){
    if(!state.activeWeek) return;
    let created;
    try{
      created = await Api.post('api/exercises.php', { monday_date: state.activeWeek, day_key: state.activeDay });
    }catch(err){ showToast(err.message); return; }
    currentDay().exercises.push(created);
    renderDayPanel();
    updateStreakBadge();
    updateSummaryStrip();
    enterNameEdit(created.id);
  }

  async function copyPreviousWeek(){
    const prevKey = getPrevWeekKey(state.activeWeek);
    if(!prevKey) return;
    let detail;
    try{
      detail = await Api.post(`api/weeks.php?date=${encodeURIComponent(state.activeWeek)}&action=copy-previous`);
    }catch(err){ showToast(err.message); return; }
    applyWeekDetail(state.activeWeek, detail);
    renderDayPanel();
    updateStreakBadge();
    updateSummaryStrip();
    showToast('Rutina copiada de la semana pasada — sin marcar.');
  }

  function toggleDetail(id){
    id = String(id);
    if(expandedIds.has(id)) expandedIds.delete(id); else expandedIds.add(id);
    renderDayPanel();
  }

  function enterNameEdit(id){
    const row = document.querySelector(`#day-panel-host .ex-row[data-id="${id}"]`);
    if(!row) return;
    const cell = row.querySelector('.ex-name-cell');
    cell.classList.add('editing');
    const input = cell.querySelector('.ex-name-input');
    input.focus();
    input.select();
  }

  // Delegación de eventos dentro del panel del día
  const dayPanelHost = document.getElementById('day-panel-host');
  dayPanelHost.addEventListener('click', async (e)=>{
    const toggleEl = e.target.closest('[data-action="toggle"]');
    if(toggleEl){ toggleExercise(toggleEl.closest('.ex-row').dataset.id); return; }
    const delEl = e.target.closest('[data-action="delete"]');
    if(delEl){ deleteExercise(delEl.closest('.ex-row').dataset.id); return; }
    const chevronEl = e.target.closest('[data-action="chevron"]');
    if(chevronEl){ toggleDetail(chevronEl.closest('.ex-row').dataset.id); return; }
    const progressEl = e.target.closest('[data-action="view-progress"]');
    if(progressEl){ goToProgress(progressEl.dataset.name); return; }
    const nameEl = e.target.closest('[data-action="edit-name"]');
    if(nameEl){ enterNameEdit(nameEl.closest('.ex-row').dataset.id); return; }
    const noteEl = e.target.closest('[data-action="edit-note"]');
    if(noteEl){
      const row = noteEl.closest('.ex-row');
      const ex = findExercise(row.dataset.id);
      if(!ex) return;
      const val = prompt('Nota para este ejercicio (ej. incluye barra, ×2 la mancuerna):', ex.note || '');
      if(val === null) return;
      const trimmed = val.trim();
      try{ await Api.put(`api/exercises.php?id=${encodeURIComponent(ex.id)}`, { note: trimmed }); }
      catch(err){ showToast(err.message); return; }
      ex.note = trimmed;
      renderDayPanel();
      return;
    }
    if(e.target.closest('[data-action="add-ex"]')){ addExercise(); return; }
    if(e.target.closest('[data-action="copy-week"]')){ copyPreviousWeek(); return; }
    if(e.target.closest('[data-action="share-day"]')){
      shareElementAsImage(document.querySelector('.day-panel'), `bitacora-${state.activeWeek}-${state.activeDay}.png`);
      return;
    }
    if(e.target.closest('[data-action="first-week"]')){ addWeekBtn.click(); return; }
    if(e.target.closest('[data-action="migrate-open"]')){ migratePickerOpen = true; renderDayPanel(); return; }
    if(e.target.closest('[data-action="migrate-cancel"]')){ migratePickerOpen = false; renderDayPanel(); return; }
    if(e.target.closest('[data-action="migrate-confirm"]')){
      const sel = document.getElementById('migrate-target');
      if(sel && sel.value) migrateDay(sel.value);
      return;
    }
  });

  dayPanelHost.addEventListener('input', (e)=>{
    const input = e.target.closest('input[data-field]');
    if(!input) return;
    const row = input.closest('.ex-row');
    const ex = findExercise(row.dataset.id);
    if(!ex) return;
    ex[input.dataset.field] = input.value;
    if(input.dataset.field === 'series' && ex.done) updateSummaryStrip();
  });

  dayPanelHost.addEventListener('change', (e)=>{
    const input = e.target.closest('.ex-name-input');
    if(input) addToLibrary(input.value);
  });

  // Al salir de un campo editable (nombre, kg, rep, ser) se persiste ese
  // campo contra la API; si es el nombre, además vuelve al modo "mostrar".
  dayPanelHost.addEventListener('focusout', async (e)=>{
    const input = e.target.closest('.ex-name-input, .ex-val-input');
    if(!input) return;
    const row = input.closest('.ex-row');
    const ex = findExercise(row.dataset.id);
    if(!ex) return;

    if(input.classList.contains('ex-name-input')){
      const cell = input.closest('.ex-name-cell');
      const display = cell.querySelector('.ex-name-display');
      const hasName = !!(ex.name && ex.name.trim());
      display.textContent = hasName ? ex.name : 'Nombre del ejercicio';
      display.classList.toggle('empty', !hasName);
      cell.classList.remove('editing');
    }

    const field = input.dataset.field;
    try{ await Api.put(`api/exercises.php?id=${encodeURIComponent(ex.id)}`, { [field]: ex[field] }); }
    catch(err){ showToast(err.message); }
  });

  // Swipe horizontal entre días
  let touchStartX = null, touchStartY = null;
  dayPanelHost.addEventListener('touchstart', (e)=>{
    const t = e.touches[0];
    touchStartX = t.clientX; touchStartY = t.clientY;
  }, {passive:true});
  dayPanelHost.addEventListener('touchend', (e)=>{
    if(touchStartX === null) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartX;
    const dy = t.clientY - touchStartY;
    touchStartX = null;
    if(Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    const idx = DAY_ORDER.indexOf(state.activeDay);
    if(dx < 0 && idx < DAY_ORDER.length - 1){ state.activeDay = DAY_ORDER[idx+1]; }
    else if(dx > 0 && idx > 0){ state.activeDay = DAY_ORDER[idx-1]; }
    else return;
    migratePickerOpen = false;
    renderDayRack();
    renderDayPanel();
    updateSummaryStrip();
  });

  // ============================================================
  // Librería: eventos de la vista Ajustes
  // ============================================================
  document.getElementById('lib-list').addEventListener('click', (e)=>{
    const btn = e.target.closest('[data-action="lib-del"]');
    if(!btn) return;
    const row = btn.closest('.lib-row');
    const ex = EXERCISE_LIBRARY.find(x => String(x.id) === row.dataset.id);
    if(ex && confirm(`¿Quitar "${ex.name}" de la librería?`)) removeFromLibrary(row.dataset.id);
  });
  document.getElementById('lib-search').addEventListener('input', renderLibraryView);
  document.getElementById('lib-add-btn').addEventListener('click', ()=>{
    const input = document.getElementById('lib-new-input');
    addToLibrary(input.value);
    input.value = '';
    input.focus();
  });
  document.getElementById('lib-new-input').addEventListener('keydown', (e)=>{
    if(e.key === 'Enter'){ e.preventDefault(); document.getElementById('lib-add-btn').click(); }
  });

  // ============================================================
  // Reglas: eventos de la vista Ajustes
  // ============================================================
  document.getElementById('rules-save-btn').addEventListener('click', saveRules);

  // ============================================================
  // Nota libre de la semana: se guarda sola al salir del campo, mismo
  // patrón que el resto de los inputs de la app.
  // ============================================================
  document.getElementById('week-note-input').addEventListener('focusout', async (e)=>{
    if(!state.activeWeek) return;
    const week = currentWeek();
    const val = e.target.value;
    if(week.note === val) return;
    week.note = val;
    try{ await Api.put(`api/weeks.php?date=${encodeURIComponent(state.activeWeek)}`, { note: val }); }
    catch(err){ showToast(err.message); }
  });

  // ============================================================
  // Conversor kg / lbs: dos inputs enlazados, sin persistir en ningún
  // lado (es una calculadora suelta, no un dato de la app). Escribir en
  // uno recalcula el otro; setear .value por JS no dispara 'input', así
  // que no hay riesgo de loop entre los dos listeners.
  // ============================================================
  const KG_TO_LBS = 2.20462;
  const round2 = n => Math.round(n * 100) / 100;
  const convKgInput = document.getElementById('conv-kg');
  const convLbsInput = document.getElementById('conv-lbs');

  convKgInput.addEventListener('input', ()=>{
    const kg = parseFloat(convKgInput.value);
    convLbsInput.value = isNaN(kg) ? '' : round2(kg * KG_TO_LBS);
  });
  convLbsInput.addEventListener('input', ()=>{
    const lbs = parseFloat(convLbsInput.value);
    convKgInput.value = isNaN(lbs) ? '' : round2(lbs / KG_TO_LBS);
  });

  // ============================================================
  // Navegación: tabs inferiores
  // ============================================================
  function switchToView(name){
    document.querySelectorAll('nav.bottom-nav button').forEach(b=>b.classList.toggle('active', b.dataset.view === name));
    document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
    document.getElementById('view-' + name).classList.add('active');
  }

  // Navega a Progreso con un ejercicio puntual ya cargado (botón "Ver
  // progreso" del detalle expandido). switchToView() va antes de
  // renderProgreso() a propósito: .view{display:none} deja el canvas de
  // Chart.js en 0×0 hasta que la vista queda visible, así que dibujar el
  // gráfico mientras todavía está oculto lo dejaría deforme.
  function goToProgress(name){
    progExercise = name;
    progExercise2 = null; // comparación no tiene sentido al saltar a un ejercicio nuevo desde otra vista
    document.getElementById('prog-search').value = name;
    document.getElementById('prog-search-2').value = '';
    switchToView('progreso');
    renderProgreso();
  }

  document.querySelectorAll('nav.bottom-nav button').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      switchToView(btn.dataset.view);
      if(btn.dataset.view === 'perfil') loadBackupsList();
    });
  });

  // ============================================================
  // Toast
  // ============================================================
  const toastEl = document.getElementById('toast');
  const toastMsgEl = document.getElementById('toast-msg');
  const toastActionEl = document.getElementById('toast-action');

  // opts: { actionLabel, onAction, duration } — todos opcionales, para no
  // romper los ~15 call sites existentes que llaman showToast(msg) solo.
  function showToast(msg, opts){
    opts = opts || {};
    toastMsgEl.textContent = msg;

    if(opts.actionLabel && typeof opts.onAction === 'function'){
      toastActionEl.textContent = opts.actionLabel;
      toastActionEl.classList.remove('hidden');
      toastActionEl.onclick = (e)=>{ e.stopPropagation(); hideToast(); opts.onAction(); };
    } else {
      toastActionEl.classList.add('hidden');
      toastActionEl.onclick = null;
    }

    toastEl.classList.add('show');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(hideToast, opts.duration || 2400);
  }

  function hideToast(){
    toastEl.classList.remove('show');
    clearTimeout(showToast._t);
  }

  // ============================================================
  // Nueva semana: solo lunes
  // ============================================================
  const dateInput = document.getElementById('new-week-date');
  const addWeekBtn = document.getElementById('add-week-btn');

  addWeekBtn.addEventListener('click', ()=>{
    const suggested = nearestMonday(new Date());
    dateInput.value = toISO(suggested);
    try{ dateInput.showPicker(); }catch(err){ dateInput.focus(); dateInput.click(); }
  });
  dateInput.addEventListener('click', (e)=> e.stopPropagation());

  dateInput.addEventListener('change', async ()=>{
    if(!dateInput.value) return;
    let picked = fromISO(dateInput.value);
    if(picked.getDay() !== 1){
      picked = nearestMonday(picked);
      dateInput.value = toISO(picked);
      showToast('Ajustado al lunes más cercano.');
    }
    const key = toISO(picked);
    if(state.weeks[key]){
      selectWeek(key);
      showToast('Ya existe esa semana.');
      return;
    }
    let detail;
    try{ detail = await Api.post('api/weeks.php', { monday_date: key }); }
    catch(err){ showToast(err.message); return; }
    applyWeekDetail(key, detail);
    state.order.push(key);
    state.order.sort((a,b)=> b.localeCompare(a)); // más reciente primero
    state.activeWeek = key;
    state.activeDay = 'lun';
    renderAll();
    showToast('Semana creada — agrégale ejercicios o cópiala de la anterior.');
  });

  // ============================================================
  // Calendario: mes actual por defecto, navegable. Lunes a domingo.
  // Sábado se colorea igual que cualquier día lun-vie (WEEKDAY_TO_KEY
  // lo mapea a 'sab'). Domingo se queda sin línea siempre — no tiene
  // entrada en WEEKDAY_TO_KEY porque el gimnasio nunca abre ese día.
  // Días futuros y semanas no registradas tampoco llevan línea.
  // ============================================================
  let calMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  function computeDayTier(date){
    if(date > today) return null; // día futuro, todavía no "pasó" — sin línea
    const dayKey = WEEKDAY_TO_KEY[date.getDay()];
    if(!dayKey) return null;
    const week = state.weeks[toISO(mondayOfWeek(date))];
    if(!week) return null;
    const total = week.days[dayKey].exercises.length;
    // Sábado no es un día obligatorio como lun-vie: si nunca se usó ese
    // sábado (0 ejercicios en total, no solo 0 marcados) se deja sin
    // línea en vez de rojo — rojo se reserva para "debía entrenar y no
    // lo hizo", y un sábado libre no es eso.
    if(dayKey === 'sab' && total === 0) return null;
    const done = week.days[dayKey].exercises.filter(e=>e.done).length;
    if(done === 0) return 'tier-red';
    if(done <= 5) return 'tier-yellow';
    return 'tier-green';
  }

  function renderCalendar(){
    const titleEl = document.getElementById('cal-title');
    const gridEl = document.getElementById('cal-grid');
    if(!titleEl || !gridEl) return;

    titleEl.textContent = `${MESES_LARGO[calMonth.getMonth()]} ${calMonth.getFullYear()}`;

    const todayBtn = document.getElementById('cal-today');
    if(todayBtn){
      const isCurrentMonth = calMonth.getFullYear() === today.getFullYear() && calMonth.getMonth() === today.getMonth();
      todayBtn.disabled = isCurrentMonth;
    }

    const firstOfMonth = new Date(calMonth.getFullYear(), calMonth.getMonth(), 1);
    const cursor = mondayOfWeek(firstOfMonth);

    let html = '';
    for(let i = 0; i < 42; i++){
      const otherMonth = cursor.getMonth() !== calMonth.getMonth();
      const isToday = cursor.getTime() === today.getTime();
      const tier = computeDayTier(cursor);
      const wk = toISO(mondayOfWeek(cursor));
      const hasWeek = !!state.weeks[wk];
      html += `
        <div class="cal-day${otherMonth ? ' other-month' : ''}${isToday ? ' today' : ''}${hasWeek ? ' clickable' : ''}" data-date="${toISO(cursor)}">
          <div class="num">${cursor.getDate()}</div>
          <div class="cal-line${tier ? ' ' + tier : ''}"></div>
        </div>`;
      cursor.setDate(cursor.getDate() + 1);
    }
    gridEl.innerHTML = html;
  }

  document.getElementById('cal-prev').addEventListener('click', ()=>{
    calMonth.setMonth(calMonth.getMonth() - 1);
    renderCalendar();
  });
  document.getElementById('cal-next').addEventListener('click', ()=>{
    calMonth.setMonth(calMonth.getMonth() + 1);
    renderCalendar();
  });
  document.getElementById('cal-today').addEventListener('click', ()=>{
    calMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    renderCalendar();
  });

  // Tocar un día del calendario navega a "Hoy" con esa semana/día
  // seleccionados, para verlo o editarlo — mismo patrón que Historial.
  // Solo funciona si esa semana ya existe; días sin semana no hacen nada.
  document.getElementById('cal-grid').addEventListener('click', (e)=>{
    const cell = e.target.closest('.cal-day');
    if(!cell || !cell.classList.contains('clickable')) return;
    const date = fromISO(cell.dataset.date);
    const wk = toISO(mondayOfWeek(date));
    if(!state.weeks[wk]) return;
    state.activeWeek = wk;
    state.activeDay = DAY_ORDER[(date.getDay() + 6) % 7];
    migratePickerOpen = false;
    renderAll();
    switchToView('hoy');
  });

  // Swipe horizontal entre meses — mismo patrón que el swipe de días.
  let calTouchStartX = null, calTouchStartY = null;
  const calPanelEl = document.querySelector('.cal-panel');
  calPanelEl.addEventListener('touchstart', (e)=>{
    const t = e.touches[0];
    calTouchStartX = t.clientX; calTouchStartY = t.clientY;
  }, {passive:true});
  calPanelEl.addEventListener('touchend', (e)=>{
    if(calTouchStartX === null) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - calTouchStartX;
    const dy = t.clientY - calTouchStartY;
    calTouchStartX = null;
    if(Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    calMonth.setMonth(calMonth.getMonth() + (dx < 0 ? 1 : -1));
    renderCalendar();
  });

  // ============================================================
  // Heatmap anual (Calendario): grid estilo GitHub de 365 días del
  // año elegido, filtrado con un riel de años (mismo patrón que
  // .week-rail/.week-pill). Usa computeDayTier() por día, el mismo
  // cálculo rojo/amarillo/verde que ya pinta la vista de mes.
  // ============================================================
  // Años disponibles: derivados de las semanas ya cargadas (state.order,
  // que trae el historial completo desde el arranque) en vez de una lista
  // fija — mismo criterio que ya usa Historial para su riel de meses. El
  // año en curso siempre se agrega aunque todavía no tenga semanas, para
  // que una cuenta nueva pueda ver su heatmap vacío del año actual.
  function availableHeatmapYears(){
    const years = new Set(state.order.map(k => parseInt(k.slice(0, 4), 10)));
    years.add(today.getFullYear());
    return [...years].sort((a, b) => b - a);
  }

  let heatmapYear = today.getFullYear();

  function renderHeatmap(){
    const railEl = document.getElementById('heatmap-year-rail');
    const gridEl = document.getElementById('heatmap-grid');
    if(!railEl || !gridEl) return;

    const years = availableHeatmapYears();
    if(!years.includes(heatmapYear)) heatmapYear = years[0];
    railEl.innerHTML = years.map(y => `
      <div class="week-pill${y === heatmapYear ? ' active' : ''}" data-year="${y}">${y}</div>
    `).join('');

    const jan1 = new Date(heatmapYear, 0, 1);
    const dec31 = new Date(heatmapYear, 11, 31);
    const gridStart = mondayOfWeek(jan1);
    const gridEnd = new Date(dec31);
    const endDow = (dec31.getDay() + 6) % 7; // 0=lun..6=dom
    gridEnd.setDate(gridEnd.getDate() + (6 - endDow));

    let html = '';
    const cursor = new Date(gridStart);
    while(cursor <= gridEnd){
      const inYear = cursor.getFullYear() === heatmapYear;
      let tier = inYear ? computeDayTier(cursor) : null;
      // A diferencia de Calendario, el heatmap no pinta rojo — se reserva
      // el color para los días cumplidos (verde/amarillo), un día sin
      // pintar ya se lee como "no cumplido", sin necesidad de un rojo
      // que en 365 celdas termina siendo más ruido que señal.
      if(tier === 'tier-red') tier = null;
      html += `<div class="heat-cell${inYear ? '' : ' out'}${tier ? ' ' + tier : ''}" title="${inYear ? fmtFullDate(cursor) : ''}"></div>`;
      cursor.setDate(cursor.getDate() + 1);
    }
    gridEl.innerHTML = html;
  }

  document.getElementById('heatmap-year-rail').addEventListener('click', (e)=>{
    const pill = e.target.closest('[data-year]');
    if(!pill) return;
    heatmapYear = parseInt(pill.dataset.year, 10);
    renderHeatmap();
  });

  // ============================================================
  // Historial: tarjeta por semana, filtrable por mes con un riel
  // (mismo look que el riel de semanas de "Hoy": .week-rail/.week-pill).
  // ============================================================
  let historialMonth = null; // 'YYYY-MM', o null = todas
  let historialSearch = ''; // texto de #hist-search, combinado en AND con historialMonth

  // Meses que toca una semana — [mes-mas-reciente, mes-mas-antiguo] cuando
  // cruza el corte de mes (ej. 27 abr - 3 may -> ['2026-05','2026-04']),
  // o un solo elemento cuando cae completa dentro de un mes.
  function weekMonths(key){
    const monday = fromISO(key);
    const sunday = new Date(monday); sunday.setDate(sunday.getDate() + 6);
    const m1 = key.slice(0, 7);
    const m2 = toISO(sunday).slice(0, 7);
    return m1 === m2 ? [m1] : [m2, m1];
  }

  // Balance por grupo muscular: cuántos días "cumplidos" tuvo cada grupo
  // en el período filtrado (mismo weekKeys ya filtrado por mes que arma
  // renderHistorial()). Mismo criterio de "día cumplido" que la racha.
  function computeGroupBalance(weekKeys){
    const byGroup = new Map();
    weekKeys.forEach(wk=>{
      const week = state.weeks[wk];
      DAY_ORDER.filter(dk => dk !== 'dom').forEach(dk=>{
        const date = dayDate(wk, dk);
        if(date > today) return;
        const day = week.days[dk];
        const done = day.exercises.filter(e=>e.done).length;
        if(done < RULES.min_done_per_day) return;
        const group = day.group || 'Sin grupo';
        byGroup.set(group, (byGroup.get(group) || 0) + 1);
      });
    });
    return [...byGroup.entries()]
      .map(([group, days]) => ({ group, days }))
      .sort((a,b)=> b.days - a.days);
  }

  function renderGroupBalance(weekKeys){
    const host = document.getElementById('group-balance-host');
    if(!host) return;
    const rows = computeGroupBalance(weekKeys);
    if(rows.length === 0){
      host.innerHTML = `<p class="balance-empty">Sin días cumplidos en este período todavía.</p>`;
      return;
    }
    const max = rows[0].days;
    host.innerHTML = rows.map(r => `
      <div class="balance-row">
        <span class="balance-label">${escapeHtml(r.group)}</span>
        <div class="balance-bar-track"><div class="balance-bar-fill" style="width:${(r.days/max*100).toFixed(0)}%"></div></div>
        <span class="balance-value">${r.days}</span>
      </div>`).join('');
  }

  function renderHistorial(){
    const railEl = document.getElementById('hist-month-rail');
    const listEl = document.getElementById('hist-list');
    if(!railEl || !listEl) return;

    const months = [];
    state.order.forEach(key=>{
      weekMonths(key).forEach(ym=>{ if(!months.includes(ym)) months.push(ym); });
    });
    if(historialMonth && !months.includes(historialMonth)) historialMonth = null;

    railEl.innerHTML = '';
    const allPill = document.createElement('div');
    allPill.className = 'week-pill' + (historialMonth === null ? ' active' : '');
    allPill.textContent = 'Todas';
    allPill.addEventListener('click', ()=>{ historialMonth = null; renderHistorial(); });
    railEl.appendChild(allPill);

    months.forEach(ym=>{
      const [y, m] = ym.split('-');
      const pill = document.createElement('div');
      pill.className = 'week-pill' + (historialMonth === ym ? ' active' : '');
      pill.textContent = `${MESES_LARGO[parseInt(m, 10) - 1]} ${y}`;
      pill.addEventListener('click', ()=>{ historialMonth = ym; renderHistorial(); });
      railEl.appendChild(pill);
    });

    const searchQ = historialSearch.trim().toLowerCase();
    const keys = state.order.filter(key=>{
      if(historialMonth && !weekMonths(key).includes(historialMonth)) return false;
      if(searchQ){
        const week = state.weeks[key];
        const hasMatch = DAY_ORDER.some(dk => week.days[dk].exercises.some(e => e.name && e.name.toLowerCase().includes(searchQ)));
        if(!hasMatch) return false;
      }
      return true;
    });
    renderGroupBalance(keys);

    if(keys.length === 0){
      const msg = searchQ ? 'No hay semanas con ese ejercicio en este período.' : 'No hay semanas en este mes.';
      listEl.innerHTML = `<p class="hist-empty">${msg}</p>`;
      return;
    }

    listEl.innerHTML = keys.map(key=>{
      const week = state.weeks[key];
      let totalDone = 0, totalEx = 0;
      // Domingo se excluye del riel de puntos y de los totales: el
      // gimnasio nunca abre ese día, así que siempre estaría vacío.
      const dayDots = DAY_ORDER.filter(dk => dk !== 'dom').map(dk=>{
        const day = week.days[dk];
        const done = day.exercises.filter(e=>e.done).length;
        totalDone += done;
        totalEx += day.exercises.length;
        const completed = done >= RULES.min_done_per_day;
        return `<span class="hist-dot${completed ? ' done' : ''}" data-day="${dk}" title="${DAY_NAMES[dk]}">${DAY_LETTER[dk]}</span>`;
      }).join('');

      return `
        <div class="hist-card" data-week="${key}">
          <div class="hist-card-head">
            <span class="hist-card-label">${weekLabel(key)}</span>
            <div class="hist-card-head-right">
              <span class="hist-card-total">${totalDone}/${totalEx}</span>
              <button class="share-btn" type="button" data-action="share-week" aria-label="Compartir semana"><i class="icon fa-solid fa-share-nodes"></i></button>
            </div>
          </div>
          <div class="hist-card-days">${dayDots}</div>
        </div>`;
    }).join('');

    listEl.querySelectorAll('.hist-card').forEach(card=>{
      card.addEventListener('click', (e)=>{
        // El botón "compartir" vive dentro de la tarjeta — sin este guard,
        // tocarlo también dispararía la navegación a "Hoy" de la tarjeta
        // completa (su listener está más cerca del target en el bubbling
        // que cualquier listener delegado más arriba, así que un
        // stopPropagation() en un listener externo llega tarde).
        if(e.target.closest('[data-action="share-week"]')) return;
        const dot = e.target.closest('.hist-dot');
        state.activeWeek = card.dataset.week;
        state.activeDay = dot ? dot.dataset.day : 'lun';
        migratePickerOpen = false;
        renderAll();
        switchToView('hoy');
      });
    });
  }

  // Delegado una sola vez sobre el contenedor fijo (no dentro de
  // renderHistorial, que reconstruye el innerHTML en cada render — atarlo
  // ahí acumularía un listener duplicado por cada render).
  document.getElementById('hist-list').addEventListener('click', (e)=>{
    const shareBtn = e.target.closest('[data-action="share-week"]');
    if(!shareBtn) return;
    const card = shareBtn.closest('.hist-card');
    shareElementAsImage(card, `bitacora-semana-${card.dataset.week}.png`);
  });

  // ============================================================
  // Progreso: carga (kg) de un ejercicio en el tiempo. Solo cuenta
  // apariciones marcadas como hechas — lo demás sería un dato falso
  // ("estaba en la rutina" no es lo mismo que "se hizo").
  // ============================================================
  let progExercise = null;
  let progExercise2 = null;   // segundo ejercicio a comparar, o null
  let progShowReps = false;   // toggle de línea de reps — pegajoso entre búsquedas
  let progChart = null;
  let progSparkCharts = [];   // instancias del mini-dashboard de sparklines

  function cssVar(name){
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  // Compartir día/semana como imagen: captura el elemento con html2canvas
  // (CDN) y usa Web Share API si el navegador la soporta (celular), o
  // cae a una descarga directa (mismo patrón de <a download> que ya usa
  // exportar datos en Perfil).
  async function shareElementAsImage(el, filename){
    if(typeof html2canvas === 'undefined'){ showToast('No se pudo generar la imagen.'); return; }
    const canvas = await html2canvas(el, { backgroundColor: cssVar('--bg'), scale: 2 });
    canvas.toBlob(async (blob)=>{
      if(!blob){ showToast('No se pudo generar la imagen.'); return; }
      const file = new File([blob], filename, { type: 'image/png' });
      if(navigator.canShare && navigator.canShare({ files: [file] })){
        try{ await navigator.share({ files: [file], title: 'Bitácora de Hierro' }); return; }
        catch(err){ if(err.name === 'AbortError') return; }
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 'image/png');
  }

  // Mejor kg histórico registrado para un ejercicio (solo apariciones ya
  // marcadas como hechas, mismo criterio de tolerancia que el resto de la
  // app). Usado por PR automático — ver toggleExercise().
  function bestPriorKgForExercise(name){
    const target = name.trim().toLowerCase();
    let best = null;
    state.order.forEach(wk=>{
      DAY_ORDER.forEach(dk=>{
        state.weeks[wk].days[dk].exercises.forEach(e=>{
          if(!e.done || e.name.trim().toLowerCase() !== target) return;
          const kg = parseFloat(e.kg);
          if(isNaN(kg)) return;
          if(best === null || kg > best) best = kg;
        });
      });
    });
    return best;
  }

  function collectExerciseHistory(name){
    const target = name.trim().toLowerCase();
    const points = [];
    [...state.order].sort((a, b) => a.localeCompare(b)).forEach(wk=>{
      DAY_ORDER.forEach(dk=>{
        state.weeks[wk].days[dk].exercises.forEach(e=>{
          if(!e.done || e.name.trim().toLowerCase() !== target) return;
          const kg = parseFloat(e.kg);
          if(isNaN(kg)) return;
          points.push({ date: dayDate(wk, dk), kg, reps: e.reps, series: e.series });
        });
      });
    });
    return points;
  }

  // Eje X compartido para comparar dos ejercicios que no se entrenaron
  // los mismos días: todas las fechas de ambos históricos, ordenadas por
  // ISO (YYYY-MM-DD ordena igual como string que como fecha). Cada
  // dataset se alinea contra ese eje con null en los huecos; spanGaps
  // conecta la línea igual, saltando el hueco.
  function buildUnifiedIsoDates(...pointsArrays){
    const set = new Set();
    pointsArrays.forEach(points => points.forEach(p => set.add(toISO(p.date))));
    return [...set].sort();
  }
  function alignField(points, unifiedIso, field){
    const byIso = new Map(points.map(p => [toISO(p.date), p]));
    return unifiedIso.map(iso=>{
      const p = byIso.get(iso);
      if(!p) return null;
      const v = field === 'kg' ? p.kg : parseFloat(p.reps);
      return isNaN(v) ? null : v;
    });
  }
  function alignPoints(points, unifiedIso){
    const byIso = new Map(points.map(p => [toISO(p.date), p]));
    return unifiedIso.map(iso => byIso.get(iso) || null);
  }

  function renderProgreso(){
    const contentEl = document.getElementById('prog-content');
    if(!contentEl) return;

    // Se destruyen siempre todas las instancias de Chart.js antes de
    // decidir qué modo dibujar — evita fugas de canvases al alternar
    // entre el gráfico de detalle y el grid de sparklines.
    if(progChart){ progChart.destroy(); progChart = null; }
    if(progSparkCharts.length){ progSparkCharts.forEach(c=>c.destroy()); progSparkCharts = []; }

    syncProgToolbar();

    if(!progExercise){ renderProgDashboard(contentEl); return; }
    renderProgDetail(contentEl);
  }

  function syncProgToolbar(){
    const row = document.getElementById('prog-compare-row');
    const repsBtn = document.getElementById('prog-reps-toggle');
    if(!row) return;
    row.classList.toggle('hidden', !progExercise);
    repsBtn.classList.toggle('active', progShowReps);
    repsBtn.setAttribute('aria-pressed', String(progShowReps));
  }

  function renderProgDetail(contentEl){
    const points1 = collectExerciseHistory(progExercise);
    if(points1.length === 0){
      contentEl.innerHTML = `
        <div class="placeholder">
          <i class="icon fa-solid fa-chart-line"></i>
          <span>Progreso</span>
          <p>No hay registros marcados como hechos para "${escapeHtml(progExercise)}" todavía.</p>
        </div>`;
      return;
    }
    const points2 = progExercise2 ? collectExerciseHistory(progExercise2) : [];

    // Los 3 chips (Último/Mejor/Cambio) siguen basados solo en el
    // ejercicio primario — comparar no cambia esa semántica.
    const kgs1 = points1.map(p=>p.kg);
    const last = kgs1[kgs1.length - 1];
    const best = Math.max(...kgs1);
    const delta = last - kgs1[0];
    const deltaSign = delta >= 0 ? '+' : '';
    const deltaColor = delta >= 0 ? 'var(--ok)' : 'var(--danger)';

    contentEl.innerHTML = `
      <div class="summary-strip">
        <div class="sum-chip"><div class="k">Último</div><div class="v accent">${last} kg</div></div>
        <div class="sum-chip"><div class="k">Mejor</div><div class="v">${best} kg</div></div>
        <div class="sum-chip"><div class="k">Cambio</div><div class="v" style="color:${deltaColor}">${deltaSign}${delta.toFixed(1)} kg</div></div>
      </div>
      <div class="prog-chart-card">
        <div class="prog-ex-name">${escapeHtml(progExercise)}${progExercise2 ? `<span class="prog-ex-vs">vs</span>${escapeHtml(progExercise2)}` : ''}</div>
        <div class="prog-canvas-wrap"><canvas id="prog-canvas"></canvas></div>
      </div>`;

    const unifiedIso = buildUnifiedIsoDates(points1, points2);
    const labels = unifiedIso.map(iso => fmtShortDate(fromISO(iso)));

    const accent = cssVar('--accent');
    const info = cssVar('--info');
    const ok = cssVar('--ok');
    const line = cssVar('--line');
    const textDim = cssVar('--text-dim');
    const textFaint = cssVar('--text-faint');
    const surface = cssVar('--surface');

    const datasets = [{
      label: progExercise,
      data: alignField(points1, unifiedIso, 'kg'),
      borderColor: accent, backgroundColor: accent + '33', fill: !progExercise2, tension: 0.25,
      pointRadius: 4, pointHoverRadius: 6, pointBackgroundColor: surface, pointBorderColor: accent, pointBorderWidth: 2,
      spanGaps: true, yAxisID: 'y',
      _alignedPoints: alignPoints(points1, unifiedIso),
    }];

    if(progShowReps){
      datasets.push({
        label: 'Repeticiones',
        data: alignField(points1, unifiedIso, 'reps'),
        borderColor: info, backgroundColor: 'transparent', fill: false, tension: 0.25,
        pointRadius: 3, pointHoverRadius: 5, pointBackgroundColor: surface, pointBorderColor: info, pointBorderWidth: 2,
        borderDash: [4, 3], spanGaps: true, yAxisID: 'y1',
        _alignedPoints: alignPoints(points1, unifiedIso),
      });
    }

    if(progExercise2 && points2.length){
      datasets.push({
        label: progExercise2,
        data: alignField(points2, unifiedIso, 'kg'),
        borderColor: ok, backgroundColor: 'transparent', fill: false, tension: 0.25,
        pointRadius: 4, pointHoverRadius: 6, pointBackgroundColor: surface, pointBorderColor: ok, pointBorderWidth: 2,
        spanGaps: true, yAxisID: 'y',
        _alignedPoints: alignPoints(points2, unifiedIso),
      });
    }

    const scales = {
      x: { grid: { color: line }, ticks: { color: textFaint, font: { size: 9 } } },
      y: { grid: { color: line }, ticks: { color: textDim, font: { size: 10 } } },
    };
    if(progShowReps){
      scales.y1 = { position: 'right', grid: { drawOnChartArea: false }, ticks: { color: info, font: { size: 9 } } };
    }

    const multi = datasets.length > 1;
    progChart = new Chart(document.getElementById('prog-canvas'), {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: multi, labels: { color: textDim, font: { size: 10 }, boxWidth: 10 } },
          tooltip: {
            filter: (item) => item.parsed.y !== null,
            callbacks: {
              label: (ctx)=>{
                const p = ctx.dataset._alignedPoints[ctx.dataIndex];
                if(!p) return null;
                if(ctx.dataset.label === 'Repeticiones') return `Reps: ${p.reps || '—'}`;
                const prefix = multi ? `${ctx.dataset.label}: ` : '';
                return `${prefix}${p.kg} kg × ${p.reps || '—'} reps × ${p.series || '—'} series`;
              },
            },
          },
        },
        scales,
      },
    });
  }

  function renderProgDashboard(contentEl){
    // Candidatos: ejercicios de la librería con al menos un registro
    // histórico marcado como hecho (mismo criterio que collectExerciseHistory).
    const candidates = EXERCISE_LIBRARY
      .map(e => ({ name: e.name, points: collectExerciseHistory(e.name) }))
      .filter(c => c.points.length > 0)
      .sort((a, b) => b.points[b.points.length - 1].date - a.points[a.points.length - 1].date);

    if(candidates.length === 0){
      contentEl.innerHTML = `
        <div class="placeholder">
          <i class="icon fa-solid fa-chart-line"></i>
          <span>Progreso</span>
          <p>Busca un ejercicio arriba para ver su progreso.</p>
        </div>`;
      return;
    }

    contentEl.innerHTML = `
      <p class="prog-dash-hint">Elegí un ejercicio para ver su detalle, o mirá de un vistazo cómo va cada uno.</p>
      <div class="prog-dash-grid" id="prog-dash-grid">
        ${candidates.map((c, i) => {
          const kgs = c.points.map(p => p.kg);
          const last = kgs[kgs.length - 1];
          const delta = kgs.length > 1 ? last - kgs[0] : 0;
          const trendIco = delta > 0 ? 'fa-arrow-trend-up' : delta < 0 ? 'fa-arrow-trend-down' : 'fa-minus';
          const trendClass = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';
          return `
          <div class="prog-spark-card" data-idx="${i}">
            <div class="prog-spark-head">
              <span class="prog-spark-name">${escapeHtml(c.name)}</span>
              <i class="icon prog-spark-trend ${trendClass} fa-solid ${trendIco}"></i>
            </div>
            <div class="prog-spark-canvas-wrap"><canvas class="prog-spark-canvas"></canvas></div>
            <div class="prog-spark-last">${last} kg</div>
          </div>`;
        }).join('')}
      </div>`;

    const accent = cssVar('--accent');
    contentEl.querySelectorAll('.prog-spark-card').forEach(card=>{
      const c = candidates[parseInt(card.dataset.idx, 10)];
      const chart = new Chart(card.querySelector('.prog-spark-canvas'), {
        type: 'line',
        data: {
          labels: c.points.map(p => fmtShortDate(p.date)),
          datasets: [{
            data: c.points.map(p => p.kg), borderColor: accent, borderWidth: 1.5,
            pointRadius: 0, tension: 0.25, fill: false,
          }],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { enabled: false } },
          scales: { x: { display: false }, y: { display: false } },
        },
      });
      progSparkCharts.push(chart);
      card.addEventListener('click', ()=>{
        progExercise = c.name;
        document.getElementById('prog-search').value = c.name;
        renderProgreso();
      });
    });
  }

  document.getElementById('prog-search').addEventListener('input', (e)=>{
    const val = e.target.value.trim();
    const match = EXERCISE_LIBRARY.find(x => x.name.toLowerCase() === val.toLowerCase());
    if(match){ progExercise = match.name; renderProgreso(); }
  });

  document.getElementById('prog-search-2').addEventListener('input', (e)=>{
    const val = e.target.value.trim();
    if(val === ''){ progExercise2 = null; renderProgreso(); return; }
    const match = EXERCISE_LIBRARY.find(x => x.name.toLowerCase() === val.toLowerCase());
    if(match){ progExercise2 = match.name; renderProgreso(); }
  });

  document.getElementById('prog-reps-toggle').addEventListener('click', ()=>{
    progShowReps = !progShowReps;
    renderProgreso();
  });

  document.getElementById('hist-search').addEventListener('input', (e)=>{
    historialSearch = e.target.value;
    renderHistorial();
  });

  // ============================================================
  // Perfil: exportar / importar datos (JSON), mismo formato que
  // api/db/import_weeks_json.php y api/import.php.
  // ============================================================
  function buildExportPayload(){
    return state.order.map(key=>{
      const week = state.weeks[key];
      const days = {};
      const overrides = {};
      DAY_ORDER.forEach(dk=>{
        const day = week.days[dk];
        days[dk] = day.exercises.map(e=>({
          name: e.name, kg: e.kg, reps: e.reps, series: e.series, note: e.note, done: e.done,
        }));
        // Días con contenido migrado tienen su propio group/notes (no el
        // default de day_templates) — se exportan aparte para que un
        // reimport los restaure igual, en vez de perder la migración.
        if(day.migratedFrom){
          overrides[dk] = { group_name: day.group, notes: day.notes, migrated_from: day.migratedFrom };
        }
      });
      const weekPayload = { monday_date: key, days };
      if(Object.keys(overrides).length) weekPayload.overrides = overrides;
      if(week.note) weekPayload.note = week.note;
      return weekPayload;
    });
  }

  document.getElementById('export-btn').addEventListener('click', ()=>{
    const payload = buildExportPayload();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    a.download = `bitacora-backup-${toISO(today)}-${hh}${mm}${ss}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`Exportadas ${payload.length} semanas.`);
  });

  const importFileInput = document.getElementById('import-file-input');
  document.getElementById('import-btn').addEventListener('click', ()=> importFileInput.click());

  importFileInput.addEventListener('change', async ()=>{
    const file = importFileInput.files[0];
    importFileInput.value = '';
    if(!file) return;

    let payload;
    try{
      payload = JSON.parse(await file.text());
      if(!Array.isArray(payload)) throw new Error('formato inválido');
    }catch(err){
      showToast('El archivo no es un JSON válido de Bitácora.');
      return;
    }

    const existing = payload.filter(w => state.weeks[w.monday_date]).length;
    const nuevas = payload.length - existing;
    const msg = `Vas a importar ${payload.length} semana${payload.length === 1 ? '' : 's'}: `
      + `${existing} ya existen y se van a reemplazar, ${nuevas} son nuevas. ¿Continuar?`;
    if(!confirm(msg)) return;

    let result;
    try{
      result = await Api.post('api/import.php', payload);
    }catch(err){
      showToast(err.message);
      return;
    }

    await loadAppData();
    switchToView('perfil');
    showToast(`Importado: ${result.weeks} semanas, ${result.exercises} ejercicios.`);
  });

  // ============================================================
  // Backups automáticos (Perfil): lista de volcados generados por el
  // cron del servidor (api/db/backup_export.php). Se pide de nuevo cada
  // vez que se abre Perfil — la lista es chica, no vale la pena cachear.
  // ============================================================
  async function loadBackupsList(){
    const hostEl = document.getElementById('backups-list');
    if(!hostEl) return;
    let backups;
    try{
      backups = await Api.get('api/backups.php');
    }catch(err){
      hostEl.innerHTML = `<p class="lib-sub">No se pudo cargar la lista de backups.</p>`;
      return;
    }
    if(!backups.length){
      hostEl.innerHTML = `<p class="lib-sub">Sin backups todavía.</p>`;
      return;
    }
    hostEl.innerHTML = backups.map(b => {
      const kb = (b.sizeBytes / 1024).toFixed(1);
      const dateLabel = b.date || b.filename;
      const href = `api/backups.php?action=download&file=${encodeURIComponent(b.filename)}`;
      return `
        <a class="backup-row" href="${href}" download="${b.filename}">
          <span class="backup-row-info">
            <span class="backup-row-date">${dateLabel}</span>
            <span class="backup-row-size">${kb} KB</span>
          </span>
          <i class="icon fa-solid fa-download"></i>
        </a>`;
    }).join('');
  }

  // ============================================================
  // Sesión: login / logout / bootstrap
  // ============================================================
  const viewLogin = document.getElementById('view-login');
  const appShell = document.getElementById('app-shell');
  const loginForm = document.getElementById('login-form');
  const loginError = document.getElementById('login-error');
  const loginSubmit = document.getElementById('login-submit');
  const loginUsername = document.getElementById('login-username');
  const loginPassword = document.getElementById('login-password');

  function showLogin(){
    appShell.classList.add('hidden');
    viewLogin.classList.remove('hidden');
  }
  function showApp(){
    viewLogin.classList.add('hidden');
    appShell.classList.remove('hidden');
  }

  Api.onUnauthorized = showLogin;

  async function loadAppData(){
    // api/weeks.php sin ?date trae TODAS las semanas en una sola petición
    // (fetch_all_weeks_detail() del lado del servidor) — antes era una
    // petición HTTP por semana en paralelo, que en cuentas con muchas
    // semanas disparaba decenas de requests simultáneas y saturaba el
    // hosting compartido justo después de loguearse (mezcla de 504 y 401
    // encontrada en producción).
    const [bulk, library, settings] = await Promise.all([
      Api.get('api/weeks.php'),
      Api.get('api/library.php'),
      Api.get('api/settings.php').catch(()=> null), // si falla, se queda con los defaults de RULES
    ]);

    state.order = bulk.order;
    EXERCISE_LIBRARY.length = 0;
    library.forEach(item => EXERCISE_LIBRARY.push(item));
    EXERCISE_LIBRARY.sort((a,b)=> a.name.localeCompare(b.name, 'es'));
    if(settings) Object.assign(RULES, settings);

    state.order.forEach(key => applyWeekDetail(key, bulk.weeks[key]));

    state.activeWeek = state.order.includes(todayMondayKey) ? todayMondayKey : (state.order[0] ?? null);

    renderLibraryDatalist();
    renderLibraryView();
    renderRulesPanel();
    renderAll();
    await refreshOfflineBanner();
  }

  // ============================================================
  // Edición offline: banner de estado + disparo de sincronización.
  // Alcance acotado a propósito — ver PLAN-8-FEATURES.md feature 8 y el
  // CHANGELOG para el detalle de qué queda fuera (crear semana, agregar
  // ejercicio, migrar día, copiar semana, importar, librería).
  // ============================================================
  async function refreshOfflineBanner(){
    const pendingCount = window.OfflineQueue ? await window.OfflineQueue.count() : 0;
    const banner = document.getElementById('offline-banner');
    if(!banner) return;
    const offline = !navigator.onLine;
    if(!offline && pendingCount === 0){ banner.classList.add('hidden'); return; }
    banner.classList.remove('hidden');
    banner.textContent = offline
      ? (pendingCount > 0 ? `Sin conexión — ${pendingCount} cambio${pendingCount===1?'':'s'} pendiente${pendingCount===1?'':'s'} de sincronizar.` : 'Sin conexión.')
      : `Sincronizando ${pendingCount} cambio${pendingCount===1?'':'s'}…`;
  }

  async function syncOfflineQueue(){
    if(!window.OfflineQueue || !navigator.onLine) return;
    const result = await window.OfflineQueue.flush(Api.replayMutation);
    if(result.synced > 0){
      await loadAppData(); // resincroniza todo el estado desde el servidor — más simple y seguro que parchear campo por campo
      let msg = `${result.synced} cambio${result.synced===1?'':'s'} sincronizado${result.synced===1?'':'s'}.`;
      if(result.stale > 0) msg += ` ${result.stale} se descartó${result.stale===1?'':'aron'} por ser más viejo${result.stale===1?'':'s'} que un cambio posterior.`;
      showToast(msg);
    }
    await refreshOfflineBanner();
  }

  window.addEventListener('online', syncOfflineQueue);
  window.addEventListener('offline', refreshOfflineBanner);
  Api.onQueueChange = refreshOfflineBanner;

  loginForm.addEventListener('submit', async (e)=>{
    e.preventDefault();
    loginError.textContent = '';
    loginSubmit.disabled = true;
    try{
      await Api.post('api/login.php', { username: loginUsername.value.trim(), password: loginPassword.value });
      loginPassword.value = '';
      showApp();
      await loadAppData();
    }catch(err){
      loginError.textContent = err.message || 'No se pudo iniciar sesión.';
    }finally{
      loginSubmit.disabled = false;
    }
  });

  document.getElementById('logout-btn').addEventListener('click', async ()=>{
    try{ await Api.post('api/logout.php'); }catch(err){ /* ya no hay sesión útil de todos modos */ }
    showLogin();
  });

  // ============================================================
  // Service worker (PWA): cachea el app shell, no depende de la sesión.
  // ============================================================
  if('serviceWorker' in navigator){
    navigator.serviceWorker.register('sw.js').catch(()=>{ /* PWA es un extra, no bloquea la app si falla */ });
  }

  // ============================================================
  // Arranque
  // ============================================================
  (async function bootstrap(){
    try{
      const session = await Api.get('api/session.php');
      if(session.authenticated){
        showApp();
        await loadAppData();
        await syncOfflineQueue(); // por si quedó una cola sin sincronizar de una sesión anterior cerrada offline
      } else {
        showLogin();
      }
    }catch(err){
      showLogin();
    }
  })();
})();
