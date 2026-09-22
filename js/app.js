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
  // Sin entrada para domingo (0) a propósito: quien la usa resuelve el
  // domingo con `|| 'dom'` (día bonus, solo cuenta si tiene ejercicios).
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
  // Changelog para Perfil: js/changelog-data.js (window.APP_VERSIONS), GENERADO
  // desde CHANGELOG.md por scripts/build-changelog.php — la fuente única son
  // los bloques "### En la app: …" de ese archivo (no editar la lista a mano).
  // La más reciente va primero; CURRENT_VERSION es la [0].
  // ============================================================
  const APP_VERSIONS = window.APP_VERSIONS || [];
  const CURRENT_VERSION = APP_VERSIONS.length ? APP_VERSIONS[0].version : '—';

  // ============================================================
  // Librería de ejercicios (reutilizable / autocompletado)
  // Se carga desde la API en el arranque; ver loadAppData().
  // ============================================================
  const EXERCISE_LIBRARY = [];

  // ============================================================
  // Dataset externo de ejercicios (hasaneyldrm/exercises-dataset) — GIFs,
  // músculo/equipo e instrucciones. Vive como JSON estático en data/, no
  // en la base. EXERCISE_SOURCE es una preferencia del dispositivo (no
  // pasa por api/settings.php, que solo valida reglas numéricas), guardada
  // en localStorage. NAME_MAPPING (chico) se carga siempre al boot para
  // saber cuándo mostrar el ícono de ojo; EXERCISE_DATASET (~1MB) se carga
  // lazy recién cuando hace falta (ojo abierto, o fuente "dataset" elegida).
  // ============================================================
  let EXERCISE_SOURCE = localStorage.getItem('bitacora.exerciseSource') === 'dataset' ? 'dataset' : 'custom';
  let NAME_MAPPING = {};
  let EXERCISE_DATASET = null;
  let EXERCISE_DATASET_BY_ID = null;
  let exerciseDatasetPromise = null;

  function normalizeExerciseName(name){
    return String(name ?? '')
      .trim()
      .toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, ''); // saca acentos (á->a, etc.)
  }

  async function loadNameMapping(){
    try{
      const res = await fetch('data/exercise-name-mapping.json');
      NAME_MAPPING = res.ok ? await res.json() : {};
    }catch(err){
      NAME_MAPPING = {}; // sin conexión / archivo no disponible: el ojito simplemente no aparece
    }
  }

  function findDatasetMatch(name){
    const entry = NAME_MAPPING[normalizeExerciseName(name)];
    return entry ? entry.datasetId : null;
  }

  function loadExerciseDataset(){
    if(EXERCISE_DATASET) return Promise.resolve(EXERCISE_DATASET);
    if(exerciseDatasetPromise) return exerciseDatasetPromise;
    exerciseDatasetPromise = fetch('data/exercises-dataset.json')
      .then(res => { if(!res.ok) throw new Error('No se pudo cargar el catálogo.'); return res.json(); })
      .then(list => {
        EXERCISE_DATASET = list;
        EXERCISE_DATASET_BY_ID = new Map(list.map(e => [e.id, e]));
        return list;
      })
      .catch(err => { exerciseDatasetPromise = null; throw err; });
    return exerciseDatasetPromise;
  }

  function renderExerciseSourceSetting(){
    const customRadio = document.getElementById('exercise-source-custom');
    const datasetRadio = document.getElementById('exercise-source-dataset');
    if(!customRadio || !datasetRadio) return;
    customRadio.checked = EXERCISE_SOURCE === 'custom';
    datasetRadio.checked = EXERCISE_SOURCE === 'dataset';
  }

  async function setExerciseSource(source){
    EXERCISE_SOURCE = source === 'dataset' ? 'dataset' : 'custom';
    localStorage.setItem('bitacora.exerciseSource', EXERCISE_SOURCE);
    await renderLibraryDatalist();
  }

  // Labels ES para los enums chicos del dataset (category/body_part,
  // equipment, target/muscle_group) — a diferencia de los ~1.324 nombres,
  // acá son ~10-30 valores fijos por campo, así que un diccionario a mano
  // da una traducción siempre limpia, sin el fallback a inglés.
  const CATEGORY_LABELS_ES = {
    waist: 'Abdomen', 'upper legs': 'Piernas (superior)', back: 'Espalda', 'lower legs': 'Pantorrillas',
    chest: 'Pecho', 'upper arms': 'Brazos (superior)', cardio: 'Cardio', shoulders: 'Hombros',
    'lower arms': 'Antebrazos', neck: 'Cuello',
  };
  const EQUIP_LABELS_ES = {
    'body weight': 'Peso corporal', cable: 'Polea', 'leverage machine': 'Máquina', assisted: 'Asistido',
    'medicine ball': 'Balón medicinal', 'stability ball': 'Balón', band: 'Banda', barbell: 'Barra',
    rope: 'Cuerda', dumbbell: 'Mancuerna', 'ez barbell': 'Barra Z', 'sled machine': 'Prensa',
    'upper body ergometer': 'Ergómetro de brazos', kettlebell: 'Pesa rusa', 'olympic barbell': 'Barra olímpica',
    weighted: 'Con peso', 'bosu ball': 'Bosu', 'resistance band': 'Banda de resistencia', roller: 'Rodillo',
    'skierg machine': 'Máquina de esquí', hammer: 'Martillo (máquina)', 'smith machine': 'Multipower',
    'wheel roller': 'Rueda abdominal', 'stationary bike': 'Bicicleta estática', tire: 'Llanta',
    'trap bar': 'Barra hexagonal', 'elliptical machine': 'Elíptica', 'stepmill machine': 'Escaladora',
  };
  const MUSCLE_LABELS_ES = {
    abs: 'Abdominales', quads: 'Cuádriceps', lats: 'Dorsales', calves: 'Pantorrillas', pectorals: 'Pectorales',
    glutes: 'Glúteos', hamstrings: 'Isquiotibiales', adductors: 'Aductores', triceps: 'Tríceps',
    'cardiovascular system': 'Sistema cardiovascular', spine: 'Columna', 'upper back': 'Espalda alta',
    biceps: 'Bíceps', delts: 'Deltoides', forearms: 'Antebrazos', traps: 'Trapecios',
    'serratus anterior': 'Serrato anterior', abductors: 'Abductores', 'levator scapulae': 'Elevador de la escápula',
    'hip flexors': 'Flexores de cadera', obliques: 'Oblicuos', 'ankle stabilizers': 'Estabilizadores de tobillo',
    'lower back': 'Zona lumbar', ankles: 'Tobillos', trapezius: 'Trapecio', deltoids: 'Deltoides',
    core: 'Core', rhomboids: 'Romboides', 'rotator cuff': 'Manguito rotador', 'wrist flexors': 'Flexores de muñeca',
    'wrist extensors': 'Extensores de muñeca', 'latissimus dorsi': 'Dorsal ancho', abdominals: 'Abdominales',
    soleus: 'Sóleo', wrists: 'Muñecas', hands: 'Manos', quadriceps: 'Cuádriceps', chest: 'Pecho',
  };
  const esLabel = (dict, key) => dict[key] || key;

  function renderExerciseInfoPanel(ex, entry){
    const panel = document.getElementById('exercise-info-panel');
    const secondary = (entry.secondary_muscles || []).map(m => esLabel(MUSCLE_LABELS_ES, m));
    const steps = entry.instruction_steps_es && entry.instruction_steps_es.length
      ? entry.instruction_steps_es
      : (entry.instructions_es ? entry.instructions_es.split(/(?<=[.!?])\s+/).filter(Boolean) : []);
    const stepsHtml = steps.length
      ? `<ol class="ex-info-steps">${steps.map(s => `<li>${escapeHtml(s)}</li>`).join('')}</ol>`
      : '<p class="ex-info-empty">Sin instrucciones disponibles.</p>';
    panel.innerHTML = `
      <div class="ex-info-head">
        <div>
          <div class="ex-info-title">${escapeHtml(ex.name)}</div>
          <div class="ex-info-subtitle">${escapeHtml(entry.name_es || entry.name)}</div>
        </div>
        <button type="button" class="btn btn--icon ex-info-close" data-action="close-exercise-info" aria-label="Cerrar"><i class="icon fa-solid fa-xmark"></i></button>
      </div>
      <div class="ex-info-media" id="ex-info-media">
        <div class="ex-info-media-loading">Cargando GIF…</div>
        <img class="hidden" alt="Demostración: ${escapeHtml(entry.name_es || entry.name)}" src="api/exercise_media.php?id=${encodeURIComponent(entry.id)}&type=gif">
      </div>
      <div class="ex-info-tags">
        <span class="ex-info-tag"><i class="icon fa-solid fa-layer-group"></i>${escapeHtml(esLabel(CATEGORY_LABELS_ES, entry.category))}</span>
        <span class="ex-info-tag"><i class="icon fa-solid fa-dumbbell"></i>${escapeHtml(esLabel(EQUIP_LABELS_ES, entry.equipment))}</span>
        <span class="ex-info-tag"><i class="icon fa-solid fa-bullseye"></i>${escapeHtml(esLabel(MUSCLE_LABELS_ES, entry.target))}</span>
      </div>
      ${secondary.length ? `<div class="ex-info-secondary">Músculos secundarios: ${escapeHtml(secondary.join(', '))}</div>` : ''}
      <div class="ex-info-instructions">
        <div class="ex-info-section-title">Instrucciones</div>
        ${stepsHtml}
      </div>
      <div class="ex-info-attribution">Animaciones © Gym visual (gymvisual.com), vía github.com/hasaneyldrm/exercises-dataset.</div>
    `;
    const media = document.getElementById('ex-info-media');
    const img = media.querySelector('img');
    const loading = media.querySelector('.ex-info-media-loading');
    img.addEventListener('load', () => { loading.remove(); img.classList.remove('hidden'); }, { once: true });
    img.addEventListener('error', () => { loading.textContent = 'GIF no disponible.'; }, { once: true });
  }

  async function openExerciseInfo(name){
    const datasetId = findDatasetMatch(name);
    if(!datasetId) return;
    const overlay = document.getElementById('exercise-info-overlay');
    const panel = document.getElementById('exercise-info-panel');
    panel.innerHTML = '<div class="ex-info-media-loading">Cargando…</div>';
    overlay.classList.remove('hidden');
    try{
      await loadExerciseDataset();
      const entry = EXERCISE_DATASET_BY_ID.get(datasetId);
      if(!entry){ closeExerciseInfo(); return; }
      renderExerciseInfoPanel({ name }, entry);
    }catch(err){
      panel.innerHTML = '<p class="ex-info-empty">No se pudo cargar la info del ejercicio.</p>';
    }
  }

  function closeExerciseInfo(){
    document.getElementById('exercise-info-overlay').classList.add('hidden');
  }

  // Conversor kg/lbs, colapsado detrás de un ícono en Semana → Hoy (antes
  // era una card siempre visible en Resumen). Mismo patrón que openExerciseInfo/
  // closeExerciseInfo: un sheet más entre los overlays reutilizables.
  function openConverterSheet(){
    document.getElementById('converter-overlay').classList.remove('hidden');
  }

  function closeConverterSheet(){
    document.getElementById('converter-overlay').classList.add('hidden');
  }

  // ============================================================
  // Diálogos: reemplazan a window.confirm() y window.prompt() (que se ven fuera
  // de la app, sin estilo ni contexto). Se usan igual que ellos pero con await:
  //   confirmDialog(opts) -> true | false
  //   promptDialog(opts)  -> texto (puede ser "") | null si se cancela
  // Es un bottom sheet (.sheet) con role="alertdialog": en confirmDialog el foco
  // cae en Cancelar (Enter no borra nada por accidente); en promptDialog, en el
  // campo, con el texto seleccionado y Enter para guardar. Tab se queda dentro
  // del diálogo, Escape o tocar el fondo cancelan, y al cerrar el foco vuelve a
  // donde estaba.
  // ============================================================
  const confirmOverlay = document.getElementById('confirm-overlay');
  const confirmTitleEl = document.getElementById('confirm-title');
  const confirmMsgEl = document.getElementById('confirm-msg');
  const confirmInputEl = document.getElementById('confirm-input');
  const confirmOkBtn = document.getElementById('confirm-ok');
  const confirmCancelBtn = document.getElementById('confirm-cancel');
  let confirmResolve = null;
  let confirmReturnFocus = null;
  let confirmHasInput = false;

  // accepted: true = botón de acción (o Enter en el campo), false = cancelar.
  function closeConfirm(accepted){
    if(!confirmResolve) return;
    const resolve = confirmResolve;
    const value = confirmInputEl.value;
    const hadInput = confirmHasInput;
    confirmResolve = null;
    confirmOverlay.classList.add('hidden');
    document.removeEventListener('keydown', onConfirmKeydown, true);
    const back = confirmReturnFocus;
    confirmReturnFocus = null;
    if(back && document.contains(back)) back.focus();
    resolve(hadInput ? (accepted ? value : null) : accepted);
  }

  function onConfirmKeydown(e){
    if(e.key === 'Escape'){ e.preventDefault(); e.stopPropagation(); closeConfirm(false); return; }
    if(e.key === 'Enter' && confirmHasInput && document.activeElement === confirmInputEl){ e.preventDefault(); closeConfirm(true); return; }
    if(e.key !== 'Tab') return;
    const order = confirmHasInput ? [confirmInputEl, confirmCancelBtn, confirmOkBtn] : [confirmCancelBtn, confirmOkBtn];
    const i = order.indexOf(document.activeElement);
    e.preventDefault();
    order[e.shiftKey ? (i <= 0 ? order.length - 1 : i - 1) : (i === order.length - 1 ? 0 : i + 1)].focus();
  }

  // input: null (confirmación) o { value, placeholder, maxLength } (texto).
  function openDialog({ title, message, confirmLabel, cancelLabel, danger, input }){
    if(confirmResolve) closeConfirm(false); // de a uno: uno nuevo cancela el anterior
    return new Promise(resolve=>{
      confirmResolve = resolve;
      confirmReturnFocus = document.activeElement;
      confirmHasInput = !!input;
      confirmTitleEl.textContent = title;
      confirmMsgEl.textContent = message;
      confirmMsgEl.classList.toggle('hidden', !message);
      confirmOkBtn.textContent = confirmLabel;
      confirmCancelBtn.textContent = cancelLabel;
      confirmOkBtn.classList.toggle('btn--danger-solid', danger);
      confirmOkBtn.classList.toggle('btn--primary', !danger);
      confirmInputEl.classList.toggle('hidden', !input);
      if(input){
        confirmInputEl.value = input.value || '';
        confirmInputEl.placeholder = input.placeholder || '';
        if(input.maxLength) confirmInputEl.maxLength = input.maxLength; else confirmInputEl.removeAttribute('maxlength');
      }
      confirmOverlay.classList.remove('hidden');
      document.addEventListener('keydown', onConfirmKeydown, true);
      if(input){ confirmInputEl.focus(); confirmInputEl.select(); }
      else confirmCancelBtn.focus();
    });
  }

  // opts: { title, message, confirmLabel, cancelLabel, danger }. `danger` pinta
  // el botón de acción en rojo (para acciones que borran o reemplazan datos).
  function confirmDialog({ title = '', message = '', confirmLabel = 'Confirmar', cancelLabel = 'Cancelar', danger = false } = {}){
    return openDialog({ title, message, confirmLabel, cancelLabel, danger, input: null });
  }

  // opts: { title, message, value, placeholder, maxLength, confirmLabel, cancelLabel }.
  // Devuelve el texto tal cual (vacío incluido, para poder borrar) o null si se cancela.
  function promptDialog({ title = '', message = '', value = '', placeholder = '', maxLength = 0, confirmLabel = 'Guardar', cancelLabel = 'Cancelar' } = {}){
    return openDialog({ title, message, confirmLabel, cancelLabel, danger: false, input: { value, placeholder, maxLength } });
  }

  confirmOverlay.addEventListener('click', (e)=>{ if(e.target === confirmOverlay) closeConfirm(false); });
  confirmCancelBtn.addEventListener('click', ()=> closeConfirm(false));
  confirmOkBtn.addEventListener('click', ()=> closeConfirm(true));

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

  async function renderLibraryDatalist(){
    let dl = document.getElementById('exercise-library-list');
    if(!dl){
      dl = document.createElement('datalist');
      dl.id = 'exercise-library-list';
      document.body.appendChild(dl);
    }
    if(EXERCISE_SOURCE === 'dataset'){
      let list;
      try{ list = await loadExerciseDataset(); }
      catch(err){ showToast('No se pudo cargar el dataset de ejercicios.'); list = []; }
      dl.innerHTML = list.map(e => `<option value="${escapeHtml(e.name_es || e.name)}">`).join('');
      return;
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
      days[dk] = {
        group: d.group_name, notes: d.notes, migratedFrom: d.migrated_from, exercises: d.exercises,
        startTime: d.start_time ? d.start_time.slice(0,5) : null,
        endTime: d.end_time ? d.end_time.slice(0,5) : null,
        durationMin: d.duration_min,
      };
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
  // cruzando semanas (lunes a viernes normalmente). Solo cuenta días hasta hoy — los días
  // futuros de la semana en curso no cortan la racha por estar
  // simplemente aún sin llegar.
  //
  // Sábado y domingo son días "bonus": solo entran a la lista si tienen
  // algún ejercicio (vacío = neutral; así un día recuperado en domingo
  // sí suma a la racha, en vez de ignorarse). "Migrar
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
        const date = dayDate(wk, dk);
        if(date > today) return;
        const total = week.days[dk].exercises.length;
        const bonus = dk === 'sab' || dk === 'dom';
        if(bonus && total === 0) return;
        if(!bonus && total === 0 && migratedFromSet.has(dk)) return;
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
  // semana (lun-dom) necesita al menos RULES.week_streak_min_days días
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

    // Constancia semanal: días cumplidos por semana (lun-dom), excluyendo
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

  // Entradas de tiempo (panel "Horarios de entrenamiento" en Perfil): un
  // registro por día con duration_min guardado (botón "Iniciar/Finalizar
  // entrenamiento" o backfill de Garmin), sin importar si ese día quedó
  // "cumplido" — la duración de la sesión es un dato aparte de cuántos
  // ejercicios se marcaron.
  function collectTimeEntries(){
    const entries = [];
    state.order.forEach(wk=>{
      const week = state.weeks[wk];
      DAY_ORDER.forEach(dk=>{
        const day = week.days[dk];
        if(day.durationMin == null) return;
        entries.push({ date: dayDate(wk, dk), durationMin: day.durationMin, startTime: day.startTime });
      });
    });
    return entries;
  }

  // Estadísticas sobre un set de entradas ya filtrado (por año/mes, ver
  // renderTimeStats). Se degrada solo (return null) si el set queda vacío.
  function computeTimeStats(entries){
    if(entries.length === 0) return null;

    const totalMin = entries.reduce((s,e)=> s + e.durationMin, 0);
    const avgMin = totalMin / entries.length;
    const longest = entries.reduce((a,b)=> b.durationMin > a.durationMin ? b : a);
    const shortest = entries.reduce((a,b)=> b.durationMin < a.durationMin ? b : a);

    const hourCounts = new Map();
    entries.forEach(e=>{
      if(!e.startTime) return;
      const hour = parseInt(e.startTime.split(':')[0], 10);
      hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
    });
    let commonHour = null, commonHourCount = 0;
    hourCounts.forEach((count, hour)=>{ if(count > commonHourCount){ commonHourCount = count; commonHour = hour; } });
    const hourBuckets = [...hourCounts.entries()]
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => a.hour - b.hour);

    return { sessionCount: entries.length, totalMin, avgMin, longest, shortest, commonHour, commonHourCount, hourBuckets };
  }

  function fmtHourLabel(hour){
    const suffix = hour < 12 ? 'a.m.' : 'p.m.';
    const h12 = hour % 12 === 0 ? 12 : hour % 12;
    return `${h12}:00 ${suffix}`;
  }

  // ------------------------------------------------------------
  // Render: panel "Horarios de entrenamiento" (Perfil). Filtro por año
  // (Todo / años con sesiones registradas) y por mes (Todos / Ene-Dic,
  // acumulado a través de años si el año activo es "Todo"). El gráfico de
  // duración por sesión reusa el mismo look de línea con puntos que la
  // gráfica de Progreso (mismo dataset de opciones + zoom/pan).
  // ------------------------------------------------------------
  let timeStatsYear = null;  // null = "Todo"
  let timeStatsMonth = null; // null = "Todos", 1-12
  let timeChart = null;

  function renderTimeStats(){
    const host = document.getElementById('time-stats-host');
    if(!host) return;
    if(timeChart){ timeChart.destroy(); timeChart = null; }

    const allEntries = collectTimeEntries();
    if(allEntries.length === 0){
      host.innerHTML = `<p class="milestone-empty">Todavía no hay sesiones con horario registrado — usa "Iniciar/Finalizar entrenamiento" en Hoy para que aparezcan acá.</p>`;
      return;
    }

    const years = [...new Set(allEntries.map(e => e.date.getFullYear()))].sort((a, b) => b - a);
    if(timeStatsYear !== null && !years.includes(timeStatsYear)) timeStatsYear = null;

    const yearPillsHtml = [`<div class="week-pill${timeStatsYear === null ? ' active' : ''}" data-year="">Todo</div>`]
      .concat(years.map(y => `<div class="week-pill${timeStatsYear === y ? ' active' : ''}" data-year="${y}">${y}</div>`))
      .join('');
    const monthPillsHtml = [`<div class="week-pill${timeStatsMonth === null ? ' active' : ''}" data-month="">Todos</div>`]
      .concat(MESES.map((m, i) => `<div class="week-pill${timeStatsMonth === i + 1 ? ' active' : ''}" data-month="${i + 1}">${m.toUpperCase()}</div>`))
      .join('');
    const filtersHtml = `
      <div class="week-rail time-filter-rail">${yearPillsHtml}</div>
      <div class="week-rail time-filter-rail">${monthPillsHtml}</div>`;

    const filtered = allEntries
      .filter(e => (timeStatsYear === null || e.date.getFullYear() === timeStatsYear)
                && (timeStatsMonth === null || e.date.getMonth() + 1 === timeStatsMonth))
      .sort((a, b) => a.date - b.date);
    const stats = computeTimeStats(filtered);

    if(!stats){
      host.innerHTML = filtersHtml + `<p class="milestone-empty">No hay sesiones con horario registrado en este período.</p>`;
      return;
    }

    const chipsHtml = `
      <div class="summary-strip cols-4 time-summary">
        <div class="card card--compact sum-chip"><div class="k">Tiempo total</div><div class="v accent">${fmtDurationLabel(stats.totalMin)}</div></div>
        <div class="card card--compact sum-chip"><div class="k">Promedio</div><div class="v">${fmtDurationLabel(Math.round(stats.avgMin))}</div></div>
        <div class="card card--compact sum-chip"><div class="k">Más larga</div><div class="v">${fmtDurationLabel(stats.longest.durationMin)}</div></div>
        <div class="card card--compact sum-chip"><div class="k">Hora frecuente</div><div class="v">${stats.commonHour !== null ? fmtHourLabel(stats.commonHour) : '—'}</div></div>
      </div>`;

    const chartHtml = `
      <div class="card card--compact card--raised time-chart-card">
        <div class="time-chart-title">Duración por sesión <span class="sub">${stats.sessionCount} sesión${stats.sessionCount === 1 ? '' : 'es'}</span></div>
        <div class="time-canvas-wrap"><canvas id="time-duration-canvas"></canvas></div>
      </div>`;

    const maxHourCount = stats.hourBuckets.reduce((m, h) => Math.max(m, h.count), 0);
    const hourListHtml = stats.hourBuckets.length
      ? stats.hourBuckets.map(h => `
        <div class="hour-row">
          <span class="hour-label">${fmtHourLabel(h.hour)}</span>
          <div class="hour-bar-track"><div class="hour-bar-fill${h.count === maxHourCount ? ' peak' : ''}" style="width:${(h.count / maxHourCount * 100).toFixed(0)}%"></div></div>
          <span class="hour-value">${h.count}</span>
        </div>`).join('')
      : `<p class="milestone-empty">Ninguna de estas sesiones tiene hora de inicio registrada.</p>`;
    const hourHtml = `
      <div class="card card--compact card--raised time-chart-card">
        <div class="time-chart-title">¿A qué hora sueles entrenar?</div>
        <div class="hour-list">${hourListHtml}</div>
      </div>`;

    host.innerHTML = filtersHtml + chipsHtml + chartHtml + hourHtml;

    if(!chartsAvailable()){
      const wrap = host.querySelector('.time-canvas-wrap');
      if(wrap) wrap.innerHTML = '<p class="milestone-empty">No se pudo cargar la librería de gráficas. Revisa tu conexión y recarga.</p>';
      return;
    }

    const chartColor = cssVar('--info');
    const line = cssVar('--line');
    const textFaint = cssVar('--text-faint');
    const surface = cssVar('--surface-2');
    // Con "Todo"/"Todos" en año o en mes el set puede tener muchísimas
    // sesiones — los puntos se ocultan (quedan solo al hacer hover) y la
    // línea se adelgaza para que se lea como una tendencia y no como un
    // enjambre de dots. Recién con año Y mes puntuales (ambos filtrados) se
    // ve el detalle sesión por sesión con puntos y línea normal.
    const detailed = timeStatsYear !== null && timeStatsMonth !== null;

    // Mismo estilo de línea con puntos que el gráfico de Progreso
    // (prog-canvas): tension suave, puntos rellenos con el color de fondo
    // y borde de acento, más zoom/pan en X para cuando hay muchas sesiones.
    timeChart = new Chart(document.getElementById('time-duration-canvas'), {
      type: 'line',
      data: {
        labels: filtered.map(e => fmtShortDate(e.date)),
        datasets: [{
          data: filtered.map(e => e.durationMin),
          borderColor: chartColor, backgroundColor: chartColor + '33', fill: true, tension: 0.25, borderWidth: detailed ? 2 : 1,
          pointRadius: detailed ? 4 : 0, pointHoverRadius: 6, pointBackgroundColor: surface, pointBorderColor: chartColor, pointBorderWidth: 2,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: surface, borderColor: line, borderWidth: 1,
            callbacks: { label: (ctx) => `${ctx.parsed.y} min` },
          },
          zoom: {
            pan: { enabled: true, mode: 'x' },
            zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: 'x' },
          },
        },
        scales: {
          x: { grid: { color: line }, ticks: { color: textFaint, font: { size: 9 } } },
          y: { grid: { color: line }, ticks: { color: textFaint, font: { size: 9 } } },
        },
      },
    });
    document.getElementById('time-duration-canvas').addEventListener('dblclick', ()=> timeChart.resetZoom());
  }

  // Delegado una sola vez sobre el contenedor fijo (renderTimeStats()
  // reconstruye el innerHTML en cada render, mismo criterio que el riel de
  // años del heatmap).
  document.getElementById('time-stats-host').addEventListener('click', (e)=>{
    const yearPill = e.target.closest('[data-year]');
    if(yearPill){
      timeStatsYear = yearPill.dataset.year ? parseInt(yearPill.dataset.year, 10) : null;
      renderTimeStats();
      return;
    }
    const monthPill = e.target.closest('[data-month]');
    if(monthPill){
      timeStatsMonth = monthPill.dataset.month ? parseInt(monthPill.dataset.month, 10) : null;
      renderTimeStats();
    }
  });

  // ============================================================
  // Pestañas de la vista Semana (id/ruta internos siguen siendo hoy/#/hoy,
  // ver ADR 0015): Hoy (día activo — selector compacto, sesión, ejercicios;
  // lo que se usa a diario; clave interna 'registro') / Resumen (riel de
  // semanas, riel de días, racha, comparación semanal, nota, eliminar
  // semana — lo ocasional o de nivel semana; pestaña que abre por default).
  // Ninguna de las dos tiene gráfica, así que a diferencia de Progreso no
  // hace falta re-renderizar nada al cambiar de pestaña.
  // ============================================================
  let hoyTab = 'resumen'; // 'registro' | 'resumen' — Resumen abre por default (ver ADR 0015)

  function renderHoyTabs(){
    document.querySelectorAll('#hoy-tabs .seg-tab').forEach(b=>{
      const on = b.dataset.hoyTab === hoyTab;
      b.classList.toggle('active', on);
      b.setAttribute('aria-selected', String(on));
    });
    document.getElementById('hoy-tab-registro').classList.toggle('hidden', hoyTab !== 'registro');
    document.getElementById('hoy-tab-resumen').classList.toggle('hidden', hoyTab !== 'resumen');
  }

  function setHoyTab(tab){
    hoyTab = tab;
    renderHoyTabs();
  }

  document.getElementById('hoy-tabs').addEventListener('click', (e)=>{
    const btn = e.target.closest('[data-hoy-tab]');
    if(btn) setHoyTab(btn.dataset.hoyTab);
  });
  renderHoyTabs();

  // ============================================================
  // Render
  // ============================================================
  function renderAll(){
    renderWeekPills();
    renderDayRack();
    renderDaySwitcher();
    renderDayPanel();
    renderWeekNote();
    updateStreakBadge();
    renderWeeklyRecap();
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

  // Navega a "Hoy" con la semana/día de una fecha puntual ya seleccionados
  // — usado por Calendario, Historial y el heatmap anual (mismo
  // comportamiento en los 3: solo funciona si esa semana ya existe, y
  // deja el riel de semanas centrado en la semana de destino en vez de
  // donde haya quedado scrolleado antes).
  function goToDate(date){
    const wk = toISO(mondayOfWeek(date));
    if(!state.weeks[wk]) return;
    state.activeWeek = wk;
    state.activeDay = DAY_ORDER[(date.getDay() + 6) % 7];
    migratePickerOpen = false;
    setHoyTab('registro'); // el destino es un día puntual — Resumen no muestra ejercicios
    renderAll();
    switchToView('hoy');
    const el = document.querySelector(`.week-pill[data-week="${wk}"]`);
    if(el) el.scrollIntoView({inline:'center', block:'nearest', behavior:'smooth'});
  }

  // doubleConfirm: el botón chico (X) del riel de semanas se queda con un
  // solo diálogo — ya requiere abrir el riel y apuntarle a un ícono
  // pequeño. El botón grande al final de "Hoy" es mucho más fácil de tocar
  // sin querer, así que pide dos confirmaciones seguidas en vez de una.
  async function deleteWeek(key, { doubleConfirm = false } = {}){
    if(pendingDelete) finalizePendingDelete(); // evita resucitar un ejercicio en una semana que está por desaparecer
    if(state.order.length <= 1){ showToast('Debe quedar al menos una semana.'); return; }
    if(!await confirmDialog({ title: '¿Eliminar esta semana?', message: `Se perderán todos los registros de la semana ${weekLabel(key)}.`, confirmLabel: 'Eliminar', danger: true })) return;
    if(doubleConfirm && !await confirmDialog({ title: '¿Seguro?', message: 'Esta acción no se puede deshacer.', confirmLabel: 'Sí, eliminar', danger: true })) return;
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

  // Mueve state.activeDay `delta` posiciones dentro de la semana (-1 día
  // anterior, +1 siguiente), respetando los bordes lun/dom — no da la
  // vuelta. Reusada por el swipe (day-swipe-area) y por las flechas ‹ › del
  // selector compacto de la pestaña Hoy (day-switch-row). Devuelve false en
  // el borde, útil para deshabilitar el botón correspondiente.
  function stepActiveDay(delta){
    const idx = DAY_ORDER.indexOf(state.activeDay);
    const next = idx + delta;
    if(next < 0 || next >= DAY_ORDER.length) return false;
    state.activeDay = DAY_ORDER[next];
    migratePickerOpen = false;
    renderDayRack();
    renderDaySwitcher();
    renderDayPanel();
    renderWeeklyRecap();
    return true;
  }

  // Selector compacto de día en la pestaña Hoy (‹ Martes · 15 sep ›): reemplaza
  // al riel de 7 días para no repetir ahí lo que ya se ve completo en
  // Resumen. El swipe entre días sigue siendo el gesto principal; esto es
  // la versión visible/tocable del mismo movimiento (stepActiveDay()).
  function renderDaySwitcher(){
    const label = document.getElementById('day-switch-label');
    const prevBtn = document.getElementById('day-switch-prev');
    const nextBtn = document.getElementById('day-switch-next');
    if(!label) return;
    if(!state.activeWeek){
      label.textContent = '—';
      prevBtn.disabled = true;
      nextBtn.disabled = true;
      return;
    }
    const idx = DAY_ORDER.indexOf(state.activeDay);
    const d = dayDate(state.activeWeek, state.activeDay);
    label.textContent = `${DAY_NAMES[state.activeDay]} · ${fmtShortDate(d)}`;
    prevBtn.disabled = idx <= 0;
    nextBtn.disabled = idx >= DAY_ORDER.length - 1;
  }

  document.getElementById('day-switch-prev').addEventListener('click', ()=> stepActiveDay(-1));
  document.getElementById('day-switch-next').addEventListener('click', ()=> stepActiveDay(1));

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
      // El riel de días vive en Resumen (desde 1.59.0): tocar un día
      // puntual manda a ver sus ejercicios, así que salta a la pestaña
      // Hoy — mismo criterio que goToDate() desde Historial/Calendario.
      tab.addEventListener('click', ()=>{
        state.activeDay = dk;
        migratePickerOpen = false;
        setHoyTab('registro');
        renderDayRack();
        renderDaySwitcher();
        renderDayPanel();
        renderWeeklyRecap();
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
    // Ver info (ojo) y eliminar (papelera): antes siempre visibles en la
    // fila, ahora dentro del detalle que despliega el chevron — la fila
    // principal queda con 7 controles en vez de 9. Borrar sigue con el
    // mismo criterio de siempre (toast + deshacer, ver deleteExercise()),
    // solo cambia dónde se toca.
    const infoBtnHtml = hasName && findDatasetMatch(ex.name)
      ? `<button type="button" class="ex-progress-btn" data-action="view-exercise-info" data-name="${escapeHtml(ex.name)}"><i class="icon fa-solid fa-eye"></i>Ver info</button>`
      : '';
    const deleteBtnHtml = `<button type="button" class="ex-progress-btn ex-progress-btn--danger" data-action="delete"><i class="icon fa-solid fa-trash"></i>Eliminar</button>`;
    const detailActionsHtml = `<div class="ex-detail-actions">${progressBtnHtml}${infoBtnHtml}${deleteBtnHtml}</div>`;
    let detailHtml = '';
    if(expanded){
      const prevEx = findExerciseInPrevWeek(ex.name);
      if(!prevEx){
        detailHtml = `<div class="ex-detail" data-id="${ex.id}">${detailActionsHtml}<p class="ex-detail-empty">Sin datos de la semana pasada para este ejercicio.</p></div>`;
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
          <div class="ex-detail" data-id="${ex.id}">
            ${detailActionsHtml}
            <div class="ex-detail-label">Semana pasada:</div>
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
        <button class="ex-chevron${expanded ? ' open' : ''}" type="button" data-action="chevron" aria-label="Ver detalle del ejercicio"><i class="icon fa-solid fa-chevron-down"></i></button>
        <div class="ex-drag-handle" aria-label="Reordenar"><i class="icon fa-solid fa-grip-lines"></i></div>
      </div>${detailHtml}`;
  }

  function renderDayPanel(){
    const host = document.getElementById('day-panel-host');

    if(!state.activeWeek){
      renderDaySession();
      host.innerHTML = `
        <div class="card day-panel">
          <div class="day-empty">
            <p>Todavía no has creado ninguna semana.</p>
            <div class="day-empty-actions">
              <button class="btn btn--primary" type="button" data-action="first-week">+ Nueva semana</button>
            </div>
          </div>
        </div>`;
      return;
    }

    const day = currentDay();
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
            ${prevKey ? `<button class="btn btn--primary" type="button" data-action="copy-week">Copiar semana pasada</button>` : ''}
            <button class="btn" type="button" data-action="add-ex">+ Agregar ejercicio</button>
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
            <button class="btn btn--primary btn--sm" type="button" data-action="migrate-confirm">Migrar</button>
            <button class="btn btn--ghost btn--icon btn-migrate-cancel" type="button" data-action="migrate-cancel" aria-label="Cancelar"><i class="icon fa-solid fa-xmark"></i></button>
          </div>`;
      } else {
        migrateHtml = `
          <div class="migrate-row">
            <button class="btn btn--ghost btn--sm" type="button" data-action="migrate-open"><i class="icon fa-solid fa-right-left"></i>Migrar día</button>
          </div>`;
      }
    }

    // Series/Volumen del día viven en el head (ids fijos, ver
    // updateDayStats()) en vez de una tira de chips aparte — el "hechos/
    // total" que antes era un tercer chip ya lo muestra el anillo, mostrarlo
    // dos veces era redundante. "Compartir resumen semanal" se mudó a la
    // card de racha en Resumen (#share-dashboard-btn, listener propio más
    // abajo) — este head solo comparte el día puntual.
    host.innerHTML = `
      <div class="card day-panel">
        <div class="day-panel-head">
          <div>
            <div class="grp">${day.group}</div>
            <div class="day-stats"><span id="day-stat-series">0</span> series · <span id="day-stat-volume">0 kg</span></div>
          </div>
          <div class="day-panel-head-actions">
            <button class="btn btn--icon share-btn" type="button" data-action="share-day" aria-label="Compartir día"><i class="icon fa-solid fa-share-nodes"></i></button>
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
    updateDayStats();
    renderDaySession();
  }

  // Series (suma de las marcadas como hechas) y volumen del día, dentro de
  // la cabecera del panel. Función aparte de renderDayPanel() (no solo
  // parte de su plantilla) porque también se llama sola al escribir en el
  // campo "series" de un ejercicio ya hecho — reescribir todo el panel en
  // cada tecla perdería el foco del input (mismo motivo por el que
  // day-session-panel/week-note-panel viven fuera del innerHTML reconstruido).
  function updateDayStats(){
    const seriesEl = document.getElementById('day-stat-series');
    const volEl = document.getElementById('day-stat-volume');
    if(!seriesEl || !volEl) return;
    const day = currentDay();
    if(!day){ seriesEl.textContent = '0'; volEl.textContent = '0 kg'; return; }
    let seriesSum = 0;
    day.exercises.filter(e=>e.done).forEach(e=>{ const n = parseInt(e.series, 10); if(!isNaN(n)) seriesSum += n; });
    seriesEl.textContent = seriesSum;
    volEl.textContent = `${Math.round(computeDayVolume(day)).toLocaleString('es-MX')} kg`;
  }

  // Card de "Iniciar/Finalizar entrenamiento" del día activo — vive fuera
  // del innerHTML de #day-panel-host (como #week-note-panel) para no perder
  // el foco de los inputs de hora en cada re-render. Posición fija dentro de
  // la pestaña Hoy (después de day-panel-host) para cualquier día, sea o no
  // hoy — antes se reubicaba dinámicamente cerca de la tira de resumen solo
  // cuando el día activo era hoy de verdad, pero con Hoy/Resumen ya
  // separados (1.57.0) la sesión siempre vive junto a los ejercicios del día
  // que se está viendo, sin ese caso especial.
  function fmtDurationLabel(min){
    if(min == null) return '—';
    const h = Math.floor(min / 60), m = min % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  function computeDurationMin(startHHMM, endHHMM){
    if(!startHHMM || !endHHMM) return null;
    const [sh, sm] = startHHMM.split(':').map(Number);
    const [eh, em] = endHHMM.split(':').map(Number);
    let diff = (eh * 60 + em) - (sh * 60 + sm);
    if(diff < 0) diff += 24 * 60; // cruza medianoche
    return diff;
  }

  function nowHHMM(){
    const n = new Date();
    return `${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}`;
  }

  function renderDaySession(){
    const panel = document.getElementById('day-session-panel');
    const week = currentWeek();
    panel.classList.toggle('hidden', !week);
    if(!week) return;

    const day = currentDay();
    const startEl = document.getElementById('day-session-start');
    const endEl = document.getElementById('day-session-end');
    const durEl = document.getElementById('day-session-duration');
    const toggleBtn = document.getElementById('day-session-toggle');

    if(document.activeElement !== startEl) startEl.value = day.startTime || '';
    if(document.activeElement !== endEl) endEl.value = day.endTime || '';
    durEl.textContent = fmtDurationLabel(day.durationMin);

    const inProgress = !!day.startTime && !day.endTime;
    toggleBtn.querySelector('.icon').className = `icon fa-solid ${inProgress ? 'fa-stop' : 'fa-play'}`;
    toggleBtn.setAttribute('aria-label', inProgress ? 'Finalizar entrenamiento' : 'Iniciar entrenamiento');
    toggleBtn.classList.toggle('in-progress', inProgress);
  }

  async function saveDaySession(fields){
    if(!state.activeWeek) return;
    let detail;
    try{
      detail = await Api.put(`api/weeks.php?date=${encodeURIComponent(state.activeWeek)}`, { day_key: state.activeDay, ...fields });
    }catch(err){ showToast(err.message); return; }
    applyWeekDetail(state.activeWeek, detail);
    renderDaySession();
  }

  document.getElementById('day-session-toggle').addEventListener('click', ()=>{
    const day = currentDay();
    const inProgress = !!day.startTime && !day.endTime;
    if(inProgress){
      const endTime = nowHHMM();
      saveDaySession({ start_time: day.startTime, end_time: endTime, duration_min: computeDurationMin(day.startTime, endTime) });
    } else {
      saveDaySession({ start_time: nowHHMM(), end_time: null, duration_min: null });
    }
  });

  function handleDaySessionTimeChange(){
    const startEl = document.getElementById('day-session-start');
    const endEl = document.getElementById('day-session-end');
    const startTime = startEl.value || null;
    const endTime = endEl.value || null;
    saveDaySession({ start_time: startTime, end_time: endTime, duration_min: computeDurationMin(startTime, endTime) });
  }
  document.getElementById('day-session-start').addEventListener('focusout', handleDaySessionTimeChange);
  document.getElementById('day-session-end').addEventListener('focusout', handleDaySessionTimeChange);

  document.getElementById('delete-week-btn').addEventListener('click', ()=>{
    if(!state.activeWeek) return;
    deleteWeek(state.activeWeek, { doubleConfirm: true });
  });

  // "Compartir resumen semanal": vive en la card de racha (Resumen), fuera
  // de #day-panel-host — listener propio en vez de la delegación de ese
  // contenedor (que solo cubre lo que está dentro de él).
  document.getElementById('share-dashboard-btn').addEventListener('click', shareDashboardAsImage);

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
      `<i class="icon streak-hero-badge-ico milestone-ico ${t.cls} fa-solid ${t.icon}" title="${t.label}" aria-label="${t.label}"></i>`
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
    renderTimeStats();
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
          <div class="changelog-entry-top">
            <span class="changelog-entry-version">v${v.version}</span>
            <span class="changelog-entry-date">${fmtShortDate(fromISO(v.date))}</span>
            <i class="icon chev fa-solid fa-chevron-down"></i>
          </div>
          <span class="changelog-entry-title">${escapeHtml(v.title)}</span>
        </summary>
        <div class="changelog-entry-body">
          <ul>${v.items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
        </div>
      </details>`).join('');
  }
  renderChangelog();

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

  function computeWeekVolume(week, days){
    let vol = 0;
    days.forEach(dk => { vol += computeDayVolume(week.days[dk]); });
    return vol;
  }

  // Adherencia: días con contenido esa semana que llegaron al mínimo de
  // ejercicios marcados (mismo criterio de "día cumplido" que el resto de
  // la app), sobre el total de días con contenido — evaluados solo en
  // `days` (ver recorte por día de la semana en renderWeeklyRecap()).
  function computeWeekAdherence(week, days){
    const relevantDays = days.filter(dk => week.days[dk].exercises.length > 0);
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

    // Si la semana activa es la semana en curso, comparar solo hasta hoy
    // (ej. si hoy es miércoles, ambas semanas se miden lun-mié) — sin esto,
    // una semana a mitad de andar siempre se ve "peor" que una ya cerrada.
    // Una semana pasada y ya terminada se compara completa (lun-dom),
    // porque ahí no hay nada a medio registrar todavía.
    const allDays = DAY_ORDER;
    const isCurrentWeek = curKey === toISO(mondayOfWeek(today));
    let days = allDays;
    if(isCurrentWeek){
      const todayDow = today.getDay(); // 0=domingo..6=sábado
      const cutoffKey = WEEKDAY_TO_KEY[todayDow] || 'dom';
      days = allDays.slice(0, allDays.indexOf(cutoffKey) + 1);
    }

    const curVol = computeWeekVolume(curWeek, days), prevVol = computeWeekVolume(prevWeek, days);
    const volDelta = prevVol > 0 ? ((curVol - prevVol) / prevVol) * 100 : null;
    const curAdh = computeWeekAdherence(curWeek, days), prevAdh = computeWeekAdherence(prevWeek, days);
    const deltaColor = (volDelta ?? 0) >= 0 ? 'var(--ok)' : 'var(--danger)';

    host.classList.remove('hidden');
    host.innerHTML = `
      <div class="recap-title">Esta semana vs. la pasada${days.length < allDays.length ? ` (hasta ${DAY_NAMES[days[days.length-1]]})` : ''}</div>
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
    renderWeeklyRecap();
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
    renderWeeklyRecap();
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
    renderWeeklyRecap();

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
    renderWeeklyRecap();
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
    renderWeeklyRecap();
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
    // El botón vive dentro de .ex-detail (hermano de .ex-row, no hijo, desde
    // que se movió al desplegable del chevron) — closest('[data-id]') sirve
    // para los dos casos, ya que ambos llevan el mismo data-id.
    if(delEl){ deleteExercise(delEl.closest('[data-id]').dataset.id); return; }
    const chevronEl = e.target.closest('[data-action="chevron"]');
    if(chevronEl){ toggleDetail(chevronEl.closest('.ex-row').dataset.id); return; }
    const progressEl = e.target.closest('[data-action="view-progress"]');
    if(progressEl){ goToProgress(progressEl.dataset.name); return; }
    const infoEl = e.target.closest('[data-action="view-exercise-info"]');
    if(infoEl){ openExerciseInfo(infoEl.dataset.name); return; }
    const nameEl = e.target.closest('[data-action="edit-name"]');
    if(nameEl){ enterNameEdit(nameEl.closest('.ex-row').dataset.id); return; }
    const noteEl = e.target.closest('[data-action="edit-note"]');
    if(noteEl){
      const row = noteEl.closest('.ex-row');
      const ex = findExercise(row.dataset.id);
      if(!ex) return;
      const val = await promptDialog({
        title: 'Nota del ejercicio',
        message: ex.note ? `${ex.name}. Déjala vacía para quitar la nota.` : ex.name,
        value: ex.note || '',
        placeholder: 'Ej. incluye barra, ×2 la mancuerna',
        maxLength: 200, // exercises.note es VARCHAR(200)
      });
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
    updateDayStats();
    renderWeeklyRecap();
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
    stepActiveDay(dx < 0 ? 1 : -1);
  });

  // ============================================================
  // Reordenar ejercicios arrastrando el handle (.ex-drag-handle), con
  // Pointer Events (mouse+touch en un solo código). El resto de la fila
  // (checkbox, nombre, inputs, borrar, chevron) no se ve afectado — solo
  // el handle inicia el drag. Técnica de "placeholder": la fila arrastrada
  // pasa a position:fixed (sigue al puntero libremente) y un div vacío del
  // mismo alto (.ex-row-placeholder) ocupa su lugar en el flujo normal,
  // moviéndose entre los demás .ex-row según qué punto medio cruza el
  // puntero — al soltar, la fila real toma el lugar del placeholder y se
  // persiste el nuevo orden.
  // ============================================================
  let dragState = null;

  dayPanelHost.addEventListener('pointerdown', (e)=>{
    const handle = e.target.closest('.ex-drag-handle');
    if(!handle) return;
    const row = handle.closest('.ex-row');
    const list = row.parentElement;
    const rect = row.getBoundingClientRect();

    const placeholder = document.createElement('div');
    placeholder.className = 'ex-row-placeholder';
    placeholder.style.height = `${rect.height}px`;
    row.after(placeholder);

    row.style.position = 'fixed';
    row.style.top = `${rect.top}px`;
    row.style.left = `${rect.left}px`;
    row.style.width = `${rect.width}px`;
    row.classList.add('dragging');

    dragState = { row, list, placeholder, pointerId: e.pointerId, startClientY: e.clientY, startTop: rect.top };
    row.setPointerCapture(e.pointerId);
    e.preventDefault();
  });

  dayPanelHost.addEventListener('pointermove', (e)=>{
    if(!dragState || e.pointerId !== dragState.pointerId) return;
    const dy = e.clientY - dragState.startClientY;
    dragState.row.style.top = `${dragState.startTop + dy}px`;

    const siblings = [...dragState.list.querySelectorAll(':scope > .ex-row')].filter(el => el !== dragState.row);
    let target = null;
    for(const sib of siblings){
      const r = sib.getBoundingClientRect();
      const mid = r.top + r.height / 2;
      if(e.clientY < mid){ target = sib; break; }
    }
    if(target) target.before(dragState.placeholder);
    else dragState.list.appendChild(dragState.placeholder);
  });

  async function finishExerciseDrag(){
    if(!dragState) return;
    const { row, list, placeholder } = dragState;
    placeholder.replaceWith(row);
    row.style.position = '';
    row.style.top = '';
    row.style.left = '';
    row.style.width = '';
    row.classList.remove('dragging');
    dragState = null;

    const day = currentDay();
    if(!day) return;
    const newOrder = [...list.querySelectorAll(':scope > .ex-row')].map(r => parseInt(r.dataset.id, 10));
    const oldOrder = day.exercises.map(e => e.id);
    if(newOrder.length !== oldOrder.length || newOrder.every((id, i) => id === oldOrder[i])) return; // sin cambios

    day.exercises.sort((a, b) => newOrder.indexOf(a.id) - newOrder.indexOf(b.id));

    try{
      await Api.post('api/exercises.php?action=reorder', { monday_date: state.activeWeek, day_key: state.activeDay, order: newOrder });
    }catch(err){ showToast(err.message); }
  }

  dayPanelHost.addEventListener('pointerup', finishExerciseDrag);
  dayPanelHost.addEventListener('pointercancel', finishExerciseDrag);

  // ============================================================
  // Librería: eventos de la vista Ajustes
  // ============================================================
  document.getElementById('lib-list').addEventListener('click', async (e)=>{
    const btn = e.target.closest('[data-action="lib-del"]');
    if(!btn) return;
    const row = btn.closest('.lib-row');
    const id = row.dataset.id;
    const ex = EXERCISE_LIBRARY.find(x => String(x.id) === id);
    if(ex && await confirmDialog({ title: '¿Quitar de la librería?', message: `Se quitará "${ex.name}" de la lista de autocompletar. Tus ejercicios ya registrados no cambian.`, confirmLabel: 'Quitar', danger: true })) removeFromLibrary(id);
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

  // Fuente de nombres de ejercicios (Ajustes)
  document.getElementById('exercise-source-options').addEventListener('change', (e)=>{
    const input = e.target.closest('input[name="exercise-source"]');
    if(input) setExerciseSource(input.value);
  });

  // Panel de info de ejercicio (ícono de ojo): cerrar con la X o tocando
  // el fondo (nunca el panel mismo, para no cerrarlo al hacer scroll/tap
  // dentro de las instrucciones).
  const exerciseInfoOverlay = document.getElementById('exercise-info-overlay');
  exerciseInfoOverlay.addEventListener('click', (e)=>{
    if(e.target === exerciseInfoOverlay || e.target.closest('[data-action="close-exercise-info"]')){
      closeExerciseInfo();
    }
  });

  // Conversor kg/lbs (ícono en el selector de día de la pestaña Hoy): mismo cierre
  // por fondo que el resto de los sheets; sin botón de X porque no tiene
  // acciones que confirmar, solo dos campos que se leen y ya.
  document.getElementById('converter-open-btn').addEventListener('click', openConverterSheet);
  const converterOverlay = document.getElementById('converter-overlay');
  converterOverlay.addEventListener('click', (e)=>{
    if(e.target === converterOverlay) closeConverterSheet();
  });

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
  // Routing por hash (#/hoy, #/historial, #/progreso, #/calendario, #/perfil,
  // #/ajustes): cada vista tiene URL propia, el botón atrás recorre las
  // vistas visitadas y un enlace directo abre esa vista. showView() solo
  // muestra la vista; switchToView() además registra la entrada en el
  // historial (pushState no dispara hashchange, así que no hay bucle) y es la
  // que usan la barra, el header y los atajos (goToDate, goToProgress…). Sigue
  // siendo síncrona a propósito: goToProgress() necesita la vista visible
  // antes de dibujar el gráfico.
  const VIEWS = ['hoy', 'historial', 'progreso', 'calendario', 'perfil', 'ajustes'];

  function routeFromHash(){
    const m = /^#\/([a-z]+)/.exec(location.hash);
    return m && VIEWS.includes(m[1]) ? m[1] : null;
  }

  function showView(name){
    document.querySelectorAll('[data-view]').forEach(b=>{
      const on = b.dataset.view === name;
      b.classList.toggle('active', on);
      if(on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
    document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
    document.getElementById('view-' + name).classList.add('active');
    if(name === 'perfil') loadBackupsList(); // la lista de backups se pide de nuevo cada vez que se abre Perfil
  }

  function switchToView(name){
    showView(name);
    const target = '#/' + name;
    if(location.hash === target) return;
    try{ history.pushState(null, '', target); }
    catch(err){ location.hash = target; } // sin History API: hashchange vuelve a llamar a showView(), es idempotente
  }

  // Atrás/adelante del navegador o un hash editado a mano.
  window.addEventListener('hashchange', ()=>{
    const name = routeFromHash();
    if(name) showView(name);
  });

  // Al mostrar la app: abre la vista del hash actual (enlace directo /
  // recarga); sin hash válido, fija #/hoy como primera entrada del historial.
  function applyInitialRoute(){
    const name = routeFromHash();
    if(name){ showView(name); return; }
    showView('hoy');
    try{ history.replaceState(null, '', '#/hoy'); }catch(err){ /* sin History API: se queda sin hash hasta la primera navegación */ }
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
    setProgTab('ejercicios'); // por si venía de la pestaña Constancia/Horarios
    switchToView('progreso');
    renderProgreso();
  }

  // ============================================================
  // Pestañas de Progreso: Ejercicios (buscador + gráfica/dashboard) /
  // Constancia (Hitos, ex-Perfil) / Horarios (ex-Perfil). renderMilestones()
  // y renderTimeStats() ya se llaman siempre desde updateStreakBadge(),
  // sin importar qué pestaña esté activa (mismo criterio que antes, cuando
  // vivían en Perfil) — su contenido llega actualizado aunque esté oculto.
  // Horarios sí necesita re-render al mostrarse: Chart.js mide el canvas al
  // crearlo, y un contenedor display:none todavía mide 0×0 (mismo motivo por
  // el que switchToView() va antes de renderProgreso() en goToProgress()).
  // ============================================================
  let progTab = 'ejercicios'; // 'ejercicios' | 'constancia' | 'horarios'

  function renderProgTabs(){
    document.querySelectorAll('#prog-tabs .seg-tab').forEach(b=>{
      const on = b.dataset.progTab === progTab;
      b.classList.toggle('active', on);
      b.setAttribute('aria-selected', String(on));
    });
    ['ejercicios', 'constancia', 'horarios'].forEach(t=>{
      document.getElementById('prog-tab-' + t).classList.toggle('hidden', t !== progTab);
    });
  }

  function setProgTab(tab){
    if(progTab === tab){ renderProgTabs(); return; }
    progTab = tab;
    renderProgTabs();
    if(tab === 'horarios') renderTimeStats();
  }

  document.getElementById('prog-tabs').addEventListener('click', (e)=>{
    const btn = e.target.closest('[data-prog-tab]');
    if(btn) setProgTab(btn.dataset.progTab);
  });
  renderProgTabs();

  // Barra inferior y ícono de Ajustes del header (ambos con data-view).
  document.querySelectorAll('[data-view]').forEach(el=>{
    el.addEventListener('click', (e)=>{
      e.preventDefault(); // el <a href="#/ajustes"> del header: la navegación la hace switchToView()
      switchToView(el.dataset.view);
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

  // Tope de "1 semana en el futuro": el lunes siguiente al de la semana
  // calendario actual. Se refleja en el date picker (max) y se valida de
  // nuevo al cambiar, por si el navegador no soporta/ignora max en el
  // picker nativo — mismo tope espejado en api/weeks.php (POST).
  function maxNewWeekKey(){
    const nextMonday = new Date(mondayOfWeek(today));
    nextMonday.setDate(nextMonday.getDate() + 7);
    return toISO(nextMonday);
  }

  addWeekBtn.addEventListener('click', ()=>{
    const suggested = nearestMonday(new Date());
    dateInput.value = toISO(suggested);
    dateInput.max = maxNewWeekKey();
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
    if(key > maxNewWeekKey()){
      showToast('Solo se puede crear hasta una semana en el futuro.');
      return;
    }
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
  // Sábado y domingo se colorean igual que cualquier día lun-vie; si están
  // vacíos se quedan sin línea (WEEKDAY_TO_KEY no tiene 'dom', se resuelve
  // con el respaldo en computeDayTier()).
  // Días futuros y semanas no registradas tampoco llevan línea.
  // ============================================================
  let calMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  function computeDayTier(date){
    if(date > today) return null; // día futuro, todavía no "pasó" — sin línea
    const dayKey = WEEKDAY_TO_KEY[date.getDay()] || 'dom';
    const week = state.weeks[toISO(mondayOfWeek(date))];
    if(!week) return null;
    const total = week.days[dayKey].exercises.length;
    // Sábado y domingo no son días obligatorios como lun-vie: si nunca se
    // usaron (0 ejercicios en total, no solo 0 marcados) se dejan sin
    // línea en vez de rojo — rojo se reserva para "debía entrenar y no
    // lo hizo", y un fin de semana libre no es eso.
    if((dayKey === 'sab' || dayKey === 'dom') && total === 0) return null;
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
    goToDate(fromISO(cell.dataset.date));
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

    // Etiquetas de mes verticales, en la columna 1 del mismo grid (ver
    // .heatmap-grid en CSS). El grid usa 3 fine-rows por semana real: mitad
    // de arriba, mitad de abajo, y un separador fijo de 3px (el gap entre
    // semanas distintas se hace con ese separador, no con la propiedad
    // "gap" — si el gap fuera uniforme también se metería DENTRO de la
    // fila de transición, entre las dos mitades de meses vecinos, dejando
    // un hueco sin bordear ahí). Cada celda ocupa las 2 fine-rows de su
    // semana (mitad arriba + mitad abajo), saltándose el separador. El mes
    // arranca/termina en la línea del medio de su fila de transición con
    // el vecino — esa misma línea es a la vez el fin de un mes y el
    // arranque del siguiente, así que los bordes coinciden exacto.
    let cellsHtml = '';
    // seamRow[mes] = primera fila (semana) donde aparece ese mes — la fila
    // de transición con el mes anterior: el mes anterior la muestra en su
    // mitad de arriba, este mes en su mitad de abajo.
    const seamRow = new Array(12).fill(null);
    let firstRow = null, lastRow = null;
    const cursor = new Date(gridStart);
    let rowIdx = 0;
    while(cursor <= gridEnd){
      const fineRowStart = rowIdx * 3 + 1;
      for(let col = 0; col < 7; col++){
        const inYear = cursor.getFullYear() === heatmapYear;
        if(inYear){
          if(firstRow === null) firstRow = rowIdx;
          lastRow = rowIdx;
          const m = cursor.getMonth();
          if(seamRow[m] === null) seamRow[m] = rowIdx;
        }
        let tier = inYear ? computeDayTier(cursor) : null;
        // A diferencia de Calendario, el heatmap no pinta rojo — se reserva
        // el color para los días cumplidos (verde/amarillo), un día sin
        // pintar ya se lee como "no cumplido", sin necesidad de un rojo
        // que en 365 celdas termina siendo más ruido que señal.
        if(tier === 'tier-red') tier = null;
        const dateAttr = inYear ? ` data-date="${toISO(cursor)}"` : '';
        const style = `grid-row:${fineRowStart} / span 2; grid-column:${col + 2}`;
        cellsHtml += `<div class="heat-cell${inYear ? '' : ' out'}${tier ? ' ' + tier : ''}" style="${style}" title="${inYear ? fmtFullDate(cursor) : ''}"${dateAttr}></div>`;
        cursor.setDate(cursor.getDate() + 1);
      }
      rowIdx++;
    }

    const monthsPresent = [];
    for(let m = 0; m < 12; m++){ if(seamRow[m] !== null) monthsPresent.push(m); }

    const labelParts = monthsPresent.map((m, i)=>{
      const isFirst = i === 0;
      const isLast = i === monthsPresent.length - 1;
      // Enero (isFirst) arranca en el borde de arriba de su primera fila
      // — no hay mes anterior con quien compartirla. Cualquier otro mes
      // arranca a la mitad de su fila de transición (seamRow[m]), cediendo
      // la mitad de arriba de esa misma fila al mes anterior.
      const startLine = isFirst ? (firstRow * 3 + 1) : (seamRow[m] * 3 + 2);
      // Diciembre (isLast) termina en el borde de abajo de su última fila
      // (antes de su separador). Cualquier otro mes termina a la mitad de
      // la fila de transición del SIGUIENTE mes — esa misma línea es el
      // startLine del que sigue, así que los dos bordes coinciden exacto.
      const endLine = isLast ? (lastRow * 3 + 3) : (seamRow[monthsPresent[i + 1]] * 3 + 2);
      return `<div class="heat-month-label" style="grid-row:${startLine} / ${endLine}">${MESES[m]}</div>`;
    });

    gridEl.innerHTML = labelParts.join('') + cellsHtml;
  }

  document.getElementById('heatmap-year-rail').addEventListener('click', (e)=>{
    const pill = e.target.closest('[data-year]');
    if(!pill) return;
    heatmapYear = parseInt(pill.dataset.year, 10);
    renderHeatmap();
  });

  // Delegado una sola vez sobre el contenedor fijo (renderHeatmap()
  // reconstruye el innerHTML en cada render) — solo las celdas dentro del
  // año (con data-date) son clickeables; goToDate() ya se encarga de no
  // hacer nada si esa fecha no cae en una semana creada.
  document.getElementById('heatmap-grid').addEventListener('click', (e)=>{
    const cell = e.target.closest('.heat-cell');
    if(!cell || !cell.dataset.date) return;
    goToDate(fromISO(cell.dataset.date));
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
      DAY_ORDER.forEach(dk=>{
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
      const dayDots = DAY_ORDER.map(dk=>{
        const day = week.days[dk];
        const done = day.exercises.filter(e=>e.done).length;
        totalDone += done;
        totalEx += day.exercises.length;
        const completed = done >= RULES.min_done_per_day;
        return `<span class="hist-dot${completed ? ' done' : ''}" data-day="${dk}" title="${DAY_NAMES[dk]}">${DAY_LETTER[dk]}</span>`;
      }).join('');

      return `
        <div class="card card--compact hist-card" data-week="${key}">
          <div class="hist-card-head">
            <span class="hist-card-label">${weekLabel(key)}</span>
            <div class="hist-card-head-right">
              <span class="hist-card-total">${totalDone}/${totalEx}</span>
              <button class="btn btn--icon share-btn" type="button" data-action="share-week" aria-label="Compartir semana"><i class="icon fa-solid fa-share-nodes"></i></button>
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
        const dayKey = dot ? dot.dataset.day : 'lun';
        goToDate(dayDate(card.dataset.week, dayKey));
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

  // Compartir día/tarjeta de Historial como imagen: captura el elemento
  // con html2canvas (CDN) y usa Web Share API si el navegador la soporta
  // (celular), o cae a una descarga directa (mismo patrón de <a download>
  // que ya usa exportar datos en Perfil).
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

  // Clona un nodo del dashboard real para el export de imagen, quitando
  // los `id` (evita colisiones mientras el clon vive fuera de pantalla —
  // getElementById igual encuentra primero el original, pero mejor no
  // dejar ids duplicados dando vueltas).
  function cloneForShare(el){
    const clone = el.cloneNode(true);
    clone.removeAttribute('id');
    clone.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'));
    return clone;
  }

  // Empareja los ítems reales del flex de un riel con sus clones: por lo
  // general son los hijos directos, pero #week-rail mete los pills
  // adentro de un #week-pills{display:contents} (para no armar el botón
  // "+ Nueva semana" desde JS) — un nodo con display:contents no genera
  // caja propia, así que sus HIJOS son los que cuentan como ítems del
  // flex, no él. El display computado se mira siempre sobre el nodo VIVO
  // (`liveEl`): sobre un clon todavía fuera del DOM, `getComputedStyle`
  // no siempre resuelve `display:contents` bien (algunos navegadores
  // devuelven el valor inicial en vez del que trae el `style` inline),
  // así que el clon se recorre en paralelo por posición en vez de
  // preguntarle a él directamente.
  function pairedFlexItems(liveEl, cloneEl){
    const live = [];
    const clone = [];
    Array.from(liveEl.children).forEach((liveChild, i)=>{
      const cloneChild = cloneEl.children[i];
      if(getComputedStyle(liveChild).display === 'contents'){
        const sub = pairedFlexItems(liveChild, cloneChild);
        live.push(...sub.live);
        clone.push(...sub.clone);
      } else {
        live.push(liveChild);
        clone.push(cloneChild);
      }
    });
    return { live, clone };
  }

  // Ancho de contenido de .dashboard-share: 520px de card menos su
  // padding horizontal (14px a cada lado) — ver esa regla en
  // css/styles.css. Si esos valores cambian ahí, hay que actualizar este
  // número también.
  const SHARE_CONTENT_WIDTH = 520 - 14 * 2;

  // Igual que cloneForShare, pero para un riel horizontal (.week-rail,
  // .day-rack). Antes recortaba con overflow+scrollLeft dejando el último
  // ítem cortado a la mitad, y fijaba el ancho del clon al `clientWidth`
  // EN VIVO del riel real — si el celular de origen es más angosto que la
  // card exportada (520px, fija), el clon quedaba encogido a ese ancho
  // angosto adentro de una card más ancha, dejando un hueco vacío a la
  // derecha (bug real, encontrado con capturas reales del usuario). Los
  // dos casos se resuelven distinto porque los ítems de cada riel se
  // comportan distinto:
  function cloneRailForShare(el, { stretch = false } = {}){
    const clone = cloneForShare(el);
    const { live: liveItems, clone: cloneItems } = pairedFlexItems(el, clone);
    const eps = 2; // tolerancia por redondeo subpixel

    if(stretch){
      // .day-rack: los tabs son porcentuales (`flex:0 0 calc((100% -
      // 24px)/5)` en css/styles.css), su ancho en vivo escala con el
      // contenedor y no sirve para calcular cuántos entran en un
      // contenedor de otro ancho — pero como escalan, siempre entran
      // exactamente los mismos "de los 7" sea cual sea el ancho (Lun-Vie
      // por defecto, Sáb/Dom solo si el riel real está scrolleado hasta
      // ahí). Por eso el conjunto se decide igual que antes —
      // getBoundingClientRect() contra el propio riel, no offsetLeft:
      // ninguno de los dos riels tiene position:relative/absolute, así
      // que el offsetParent real de sus hijos es algún ancestro más
      // arriba, y offsetLeft quedaba medido contra ESE ancestro (bug
      // real: se perdía el día "vie" por 14px de sesgo fijo) — y lo que
      // cambia es que el clon se ensancha al 100% del ancho real de la
      // card (no al `clientWidth` angosto del celular de origen) y esos
      // tabs reparten ESE ancho entre ellos.
      const containerRect = el.getBoundingClientRect();
      liveItems.forEach((liveItem, i)=>{
        const r = liveItem.getBoundingClientRect();
        const fullyVisible = r.left >= containerRect.left - eps && r.right <= containerRect.right + eps;
        if(!fullyVisible) cloneItems[i].remove();
      });
      clone.style.width = '100%';
      clone.style.overflow = 'hidden';
      Array.from(clone.children).forEach(item => { item.style.flex = '1 1 0'; });
      return clone;
    }

    // .week-rail: los pills tienen ancho propio por su texto
    // (`flex-shrink:0`, no escalan con el contenedor), así que si el
    // celular de origen es más angosto que la card exportada entraban
    // menos pills de los que en realidad caben en la imagen final. En vez
    // de recortar contra el ancho angosto del celular, se arranca en el
    // mismo pill donde el riel real ya está scrolleado (mismo criterio de
    // "qué se ve hoy") y se van sumando anchos reales (con su gap) hasta
    // llenar SHARE_CONTENT_WIDTH — así entran más semanas si el export
    // tiene más lugar que el celular de origen.
    const gap = parseFloat(getComputedStyle(el).columnGap) || 0;
    const containerLeft = el.getBoundingClientRect().left;
    let startIndex = liveItems.findIndex(item => item.getBoundingClientRect().right > containerLeft + eps);
    if(startIndex === -1) startIndex = 0;
    let used = 0;
    let endIndex = startIndex;
    for(let i = startIndex; i < liveItems.length; i++){
      const w = liveItems[i].getBoundingClientRect().width;
      const next = used + (i > startIndex ? gap : 0) + w;
      if(next > SHARE_CONTENT_WIDTH + eps) break;
      used = next;
      endIndex = i + 1;
    }
    cloneItems.forEach((item, i) => { if(i < startIndex || i >= endIndex) item.remove(); });
    clone.style.width = '100%';
    clone.style.overflow = 'hidden';
    return clone;
  }

  // Arma, fuera de pantalla, el mismo bloque que se ve arriba de "Hoy":
  // header con racha, riel de semanas, riel de días, tira de resumen y
  // (si hay datos) la card de comparación semanal. Clona el DOM real en
  // vez de reconstruir HTML a mano para que el export nunca se desalinee
  // de lo que la app ya renderiza.
  function buildDashboardShareContainer(){
    const card = document.createElement('div');
    card.className = 'dashboard-share';
    const headerClone = cloneForShare(document.querySelector('header.app-head'));
    headerClone.querySelector('.head-settings')?.remove(); // el ícono de Ajustes no tiene sentido en una imagen
    card.appendChild(headerClone);
    const weekRailClone = cloneRailForShare(document.getElementById('week-rail'));
    // El <input type="date"> de "+ Nueva semana" es invisible en la app real
    // gracias a #new-week-date{opacity:0} (selector por id) — como
    // cloneForShare() quita los ids para evitar duplicados, esa regla ya no
    // aplica al clon y el input aparecería como una caja blanca suelta. No
    // tiene sentido en una imagen estática de todos modos, así que se saca.
    weekRailClone.querySelector('input[type="date"]')?.remove();
    card.appendChild(weekRailClone);
    card.appendChild(cloneRailForShare(document.getElementById('day-rack'), { stretch: true }));
    // La racha vivía en el header (siempre se clonaba); ahora es su propia
    // card en la pestaña Resumen — se agrega aparte para no perderla de la
    // imagen. Funciona sin importar qué pestaña de Hoy esté activa: cloneNode
    // no depende de la visibilidad del original (ver shareDashboardAsImage()).
    // Los chips de Series/Volumen del día ya no existen como bloque aparte
    // (viven en la cabecera del panel del día, dato de HOY, no de la
    // semana) — se sacaron de la imagen porque nunca fueron parte del
    // "resumen semanal" que este botón arma.
    const streakHero = document.getElementById('streak-hero-card');
    if(streakHero){
      const streakHeroClone = cloneForShare(streakHero);
      streakHeroClone.querySelector('.share-btn')?.remove(); // el propio botón de compartir no tiene sentido en la imagen (cloneForShare() ya quitó los ids)
      card.appendChild(streakHeroClone);
    }
    const recapHost = document.getElementById('weekly-recap-host');
    if(recapHost && !recapHost.classList.contains('hidden') && recapHost.innerHTML.trim()){
      card.appendChild(cloneForShare(recapHost));
    }
    return card;
  }

  // Genera el PNG con html2canvas y lo copia al portapapeles (Clipboard
  // API). `backgroundColor: null` deja transparentes las esquinas
  // redondeadas de .dashboard-share (si no, html2canvas rellena todo el
  // rectángulo del elemento y las esquinas se ven cuadradas). Si el
  // navegador no soporta copiar imágenes (o el usuario niega el permiso),
  // cae a una descarga directa (mismo patrón de <a download> que ya usa
  // exportar datos en Perfil).
  async function copyElementAsImage(el, filename){
    if(typeof html2canvas === 'undefined'){ showToast('No se pudo generar la imagen.'); return; }
    const canvas = await html2canvas(el, { backgroundColor: null, scale: 2 });
    canvas.toBlob(async (blob)=>{
      if(!blob){ showToast('No se pudo generar la imagen.'); return; }
      if(navigator.clipboard && window.ClipboardItem){
        try{
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
          showToast('Imagen copiada al portapapeles');
          return;
        }catch(err){ /* sin permiso o sin soporte real: cae a descarga */ }
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Imagen descargada (tu navegador no soporta copiar al portapapeles)');
    }, 'image/png');
  }

  // Resumen semanal (header + riel de semanas + riel de días + tira de
  // resumen + comparación semanal) como una sola imagen PNG, copiada al
  // portapapeles — ver copyElementAsImage() y buildDashboardShareContainer().
  async function shareDashboardAsImage(){
    const container = buildDashboardShareContainer();
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.top = '0';
    document.body.appendChild(container);
    try{
      await copyElementAsImage(container, `bitacora-resumen-${state.activeWeek}.png`);
    } finally {
      document.body.removeChild(container);
    }
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

  // Chart.js viene de un CDN (con caché del service worker): si nunca pudo
  // cargarse (primera visita sin red), las gráficas se sustituyen por un aviso
  // con Recargar en vez de romper el render con un ReferenceError.
  function chartsAvailable(){ return typeof Chart !== 'undefined'; }

  function chartUnavailableHtml(){
    return `
      <div class="card card--dashed placeholder">
        <i class="icon fa-solid fa-chart-line"></i>
        <span>Gráfica no disponible</span>
        <p>No se pudo cargar la librería de gráficas. Revisa tu conexión y recarga.</p>
        <button type="button" class="btn" data-action="reload-app"><i class="icon fa-solid fa-rotate-right"></i>Recargar</button>
      </div>`;
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

    if(!chartsAvailable()){ contentEl.innerHTML = chartUnavailableHtml(); return; }

    if(!progExercise){ renderProgDashboard(contentEl); return; }
    renderProgDetail(contentEl);
  }

  function syncProgToolbar(){
    const row = document.getElementById('prog-compare-row');
    const repsBtn = document.getElementById('prog-reps-toggle');
    if(!row) return;
    row.classList.toggle('hidden', !progExercise);
    // La línea de reps solo tiene sentido con un ejercicio a la vista —
    // comparar dos con reps a la vez queda pendiente (ver CHANGELOG.md).
    repsBtn.disabled = !!progExercise2;
    repsBtn.classList.toggle('active', progShowReps && !progExercise2);
    repsBtn.setAttribute('aria-pressed', String(progShowReps && !progExercise2));
    repsBtn.title = progExercise2 ? 'No disponible al comparar dos ejercicios' : 'Mostrar repeticiones';
  }

  function renderProgDetail(contentEl){
    const points1 = collectExerciseHistory(progExercise);
    if(points1.length === 0){
      contentEl.innerHTML = `
        <div class="card card--dashed placeholder">
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
        <div class="card card--compact sum-chip"><div class="k">Último</div><div class="v accent">${last} kg</div></div>
        <div class="card card--compact sum-chip"><div class="k">Mejor</div><div class="v">${best} kg</div></div>
        <div class="card card--compact sum-chip"><div class="k">Cambio</div><div class="v" style="color:${deltaColor}">${deltaSign}${delta.toFixed(1)} kg</div></div>
      </div>
      <div class="card prog-chart-card">
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

    if(progShowReps && !progExercise2){
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
    if(progShowReps && !progExercise2){
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
          // Zoom/pan en el eje X (chartjs-plugin-zoom, CDN en index.html) —
          // pensado para cuando hay muchos puntos seguidos y tocar uno
          // puntual a simple vista es difícil. Doble tap/click resetea.
          zoom: {
            pan: { enabled: true, mode: 'x' },
            zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: 'x' },
          },
        },
        scales,
      },
    });
    document.getElementById('prog-canvas').addEventListener('dblclick', ()=> progChart.resetZoom());
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
        <div class="card card--dashed placeholder">
          <i class="icon fa-solid fa-chart-line"></i>
          <span>Progreso</span>
          <p>Busca un ejercicio arriba para ver su progreso.</p>
        </div>`;
      return;
    }

    contentEl.innerHTML = `
      <p class="prog-dash-hint">Elige un ejercicio para ver su detalle, o mira de un vistazo cómo va cada uno.</p>
      <div class="prog-dash-grid" id="prog-dash-grid">
        ${candidates.map((c, i) => {
          const kgs = c.points.map(p => p.kg);
          const last = kgs[kgs.length - 1];
          const delta = kgs.length > 1 ? last - kgs[0] : 0;
          const trendIco = delta > 0 ? 'fa-arrow-trend-up' : delta < 0 ? 'fa-arrow-trend-down' : 'fa-minus';
          const trendClass = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';
          return `
          <div class="card card--compact prog-spark-card" data-idx="${i}">
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
        // Cada día se exporta como {exercises, start_time?, end_time?,
        // duration_min?} — los campos de horario solo se incluyen si hay
        // dato, mismo criterio que ya usa "note"/"overrides" acá abajo.
        const dayPayload = {
          exercises: day.exercises.map(e=>({
            name: e.name, kg: e.kg, reps: e.reps, series: e.series, note: e.note, done: e.done,
          })),
        };
        if(day.startTime) dayPayload.start_time = day.startTime;
        if(day.endTime) dayPayload.end_time = day.endTime;
        if(day.durationMin != null) dayPayload.duration_min = day.durationMin;
        days[dk] = dayPayload;
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
      + `${existing} ya existen y se van a reemplazar, ${nuevas} son nuevas.`;
    if(!await confirmDialog({ title: '¿Importar datos?', message: msg, confirmLabel: 'Importar', danger: existing > 0 })) return;

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
    // "Cargando…" solo la primera vez: en las visitas siguientes se conserva la lista anterior hasta que llega la nueva, sin parpadeo.
    if(!hostEl.children.length) hostEl.innerHTML = `<p class="lib-sub" role="status">Cargando…</p>`;
    let backups;
    try{
      backups = await Api.get('api/backups.php');
    }catch(err){
      hostEl.innerHTML = `
        <p class="lib-sub">No se pudo cargar la lista de backups.</p>
        <button type="button" class="btn btn--block" data-action="retry-backups"><i class="icon fa-solid fa-rotate-right"></i>Reintentar</button>`;
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

  const bootScreen = document.getElementById('boot-screen');
  const bootMsg = document.getElementById('boot-msg');
  const bootRetry = document.getElementById('boot-retry');

  function showLogin(){
    bootScreen.classList.add('hidden');
    appShell.classList.add('hidden');
    viewLogin.classList.remove('hidden');
  }
  function showApp(){
    bootScreen.classList.add('hidden');
    viewLogin.classList.add('hidden');
    appShell.classList.remove('hidden');
    applyInitialRoute();
  }
  // Pantalla de arranque: "Cargando…" mientras se verifica la sesión, o un
  // mensaje con "Reintentar" si no se pudo verificar (sin red o error del
  // servidor). Nunca manda al Login por un fallo de red: eso pasa solo si el
  // servidor confirma que no hay sesión.
  function showBoot(msg, { retry = false } = {}){
    appShell.classList.add('hidden');
    viewLogin.classList.add('hidden');
    bootScreen.classList.remove('hidden');
    bootMsg.textContent = msg;
    bootRetry.classList.toggle('hidden', !retry);
  }

  // Sesión perdida (401): la copia local de datos no debe sobrevivirla.
  Api.onUnauthorized = ()=>{ window.Snapshot && window.Snapshot.clear(); showLogin(); };

  // Vuelca en memoria y pinta lo que devuelve la API (o la copia local
  // guardada por Snapshot cuando se abre la app sin conexión).
  function applyAppData({ bulk, library, settings }){
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
    renderExerciseSourceSetting();
    renderAll();
    dataLoadedOnce = true;
  }

  // Recargar (sin librería de gráficas) y Reintentar (lista de backups).
  document.addEventListener('click', (e)=>{
    const btn = e.target.closest('[data-action="reload-app"], [data-action="retry-backups"]');
    if(!btn) return;
    if(btn.dataset.action === 'reload-app') location.reload();
    else loadBackupsList();
  });

  // ============================================================
  // Estado de carga: la primera vez que se piden los datos (tras el login o al
  // abrir la app), el shell ya está visible pero vacío. Se rellenan los huecos
  // con esqueletos (.skeleton) y #app-shell queda con aria-busy hasta que llegan.
  // applyAppData() pinta todo encima. Las recargas posteriores (sincronizar al
  // volver la red) no los usan: ya hay datos en pantalla.
  // ============================================================
  let dataLoadedOnce = false;

  function setAppLoading(on){
    appShell.classList.toggle('is-loading', on);
    appShell.setAttribute('aria-busy', String(on));
  }

  function renderSkeletons(){
    const set = (id, html)=>{ const el = document.getElementById(id); if(el) el.innerHTML = html; };
    const box = (cls)=> `<div class="skeleton ${cls}" aria-hidden="true"></div>`;
    const line = (cls)=> box(`skeleton-line ${cls}`);
    const many = (n, html)=> Array(n).fill(html).join('');

    // Hoy
    set('week-pills', many(4, box('skeleton-pill')));
    set('day-rack', many(5, box('skeleton-daytab')));
    set('day-panel-host', `
      <div class="card day-panel" aria-hidden="true">
        <div class="day-panel-head">
          <div class="skeleton-stack">${line('h-lg w-m')}${line('w-s')}</div>
          ${box('skeleton-ring')}
        </div>
        ${many(4, `<div class="skeleton-row">${box('skeleton-box')}<div class="skeleton-stack">${line('w-l')}${line('w-s')}</div></div>`)}
      </div>`);
    // Historial y Progreso
    set('hist-list', many(3, `<div class="card card--compact skeleton-card" aria-hidden="true">${line('h-lg w-m')}${line('w-l')}</div>`));
    set('prog-content', `<div class="prog-dash-grid">${many(4, `<div class="card card--compact skeleton-card" aria-hidden="true">${line('w-m')}${box('skeleton-spark')}${line('w-s')}</div>`)}</div>`);
    // Calendario
    set('cal-grid', many(35, box('cal-day')));
    // Perfil
    set('milestones-host', many(3, `<div class="skeleton-card" aria-hidden="true">${line('h-lg w-m')}${line('w-l')}</div>`));
    set('time-stats-host', `<div class="skeleton-card" aria-hidden="true">${line('w-l')}${line('w-m')}${line('w-l')}</div>`);
    // Ajustes
    set('lib-list', many(5, `<div class="skeleton-row" aria-hidden="true"><div class="skeleton-stack">${line('w-m')}</div></div>`));
  }

  async function loadAppData(){
    // api/weeks.php sin ?date trae TODAS las semanas en una sola petición
    // (fetch_all_weeks_detail() del lado del servidor) — antes era una
    // petición HTTP por semana en paralelo, que en cuentas con muchas
    // semanas disparaba decenas de requests simultáneas y saturaba el
    // hosting compartido justo después de loguearse (mezcla de 504 y 401
    // encontrada en producción).
    const firstLoad = !dataLoadedOnce;
    if(firstLoad){ renderSkeletons(); setAppLoading(true); }
    try{
      const [bulk, library, settings] = await Promise.all([
        Api.get('api/weeks.php'),
        Api.get('api/library.php'),
        Api.get('api/settings.php').catch(()=> null), // si falla, se queda con los defaults de RULES
        loadNameMapping(), // liviano (~40 entradas) — decide cuándo mostrar el ícono de ojo
      ]);

      applyAppData({ bulk, library, settings });
      showingSnapshot = false;
      if(window.Snapshot) window.Snapshot.save({ bulk, library, settings });
      await refreshOfflineBanner();
    } finally {
      if(firstLoad) setAppLoading(false);
    }
  }

  // ============================================================
  // Edición offline: banner de estado + disparo de sincronización.
  // Alcance acotado a propósito — ver la versión 1.14.0 del
  // CHANGELOG.md para el detalle de qué queda fuera (crear semana, agregar
  // ejercicio, migrar día, copiar semana, importar, librería).
  // ============================================================
  // true mientras se muestran los datos de la copia local (Snapshot) porque
  // no se pudo llegar al servidor — el navegador puede seguir reportando
  // "en línea" (servidor caído, red intermitente), así que no basta con
  // navigator.onLine para decidir el banner.
  let showingSnapshot = false;

  async function refreshOfflineBanner(){
    const pendingCount = window.OfflineQueue ? await window.OfflineQueue.count() : 0;
    const banner = document.getElementById('offline-banner');
    if(!banner) return;
    const offline = !navigator.onLine || showingSnapshot;
    if(!offline && pendingCount === 0){ banner.classList.add('hidden'); return; }
    banner.classList.remove('hidden');
    banner.textContent = offline
      ? (pendingCount > 0 ? `Sin conexión — ${pendingCount} cambio${pendingCount===1?'':'s'} pendiente${pendingCount===1?'':'s'} de sincronizar.` : (showingSnapshot ? 'Sin conexión — mostrando tus últimos datos guardados.' : 'Sin conexión.'))
      : `Sincronizando ${pendingCount} cambio${pendingCount===1?'':'s'}…`;
  }

  async function syncOfflineQueue(){
    if(!window.OfflineQueue || !navigator.onLine) return;
    const result = await window.OfflineQueue.flush(Api.replayMutation);
    // También se recarga si se abrió con la copia local: ya hay red, hay que traer lo real.
    if(result.synced > 0 || showingSnapshot){
      try{ await loadAppData(); }catch(err){ if(err.status !== 401) await refreshOfflineBanner(); return; } // resincroniza todo el estado desde el servidor — más simple y seguro que parchear campo por campo
      if(result.synced === 0) return; // solo era refrescar la copia local, sin cambios que anunciar
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
    loginSubmit.textContent = 'Entrando…';
    try{
      await Api.post('api/login.php', { username: loginUsername.value.trim(), password: loginPassword.value });
      loginPassword.value = '';
    }catch(err){
      loginError.textContent = err.message || 'No se pudo iniciar sesión.';
      return;
    }finally{
      loginSubmit.disabled = false;
      loginSubmit.textContent = 'Entrar';
    }
    // Sesión iniciada. Si la carga de datos falla, el error va a la pantalla de
    // arranque (con Reintentar): el login ya está oculto y ahí nadie lo vería.
    showApp();
    try{
      await loadAppData();
    }catch(err){
      if(err.status === 401) return; // sesión perdida: onUnauthorized ya mostró el login
      showBoot('No se pudieron cargar tus datos.', { retry: true });
    }
  });

  document.getElementById('logout-btn').addEventListener('click', async ()=>{
    try{ await Api.post('api/logout.php'); }catch(err){ /* ya no hay sesión útil de todos modos */ }
    if(window.Snapshot) await window.Snapshot.clear();
    showView('hoy');
    try{ history.replaceState(null, '', '#/hoy'); }catch(err){ /* sin History API */ }
    showLogin();
  });

  // ============================================================
  // Service worker (PWA): cachea el app shell, no depende de la sesión.
  // Una versión nueva espera hasta que el usuario acepta "Actualizar".
  // ============================================================
  if('serviceWorker' in navigator){
    // Solo se recarga tras aceptar una actualización: en la primera
    // instalación el SW también toma el control (controllerchange) y no hay
    // nada que recargar.
    const hadController = !!navigator.serviceWorker.controller;
    let reloadingForUpdate = false;
    navigator.serviceWorker.addEventListener('controllerchange', ()=>{
      if(!hadController || reloadingForUpdate) return;
      reloadingForUpdate = true;
      location.reload();
    });

    function offerUpdate(worker){
      showToast('Hay una versión nueva de la app.', {
        actionLabel: 'Actualizar',
        duration: 30000,
        onAction: ()=> worker.postMessage({ type: 'SKIP_WAITING' }),
      });
    }

    navigator.serviceWorker.register('sw.js').then(reg=>{
      // Ya había una versión esperando (se instaló en una visita anterior).
      if(reg.waiting && navigator.serviceWorker.controller) offerUpdate(reg.waiting);

      reg.addEventListener('updatefound', ()=>{
        const worker = reg.installing;
        if(!worker) return;
        worker.addEventListener('statechange', ()=>{
          if(worker.state === 'installed' && navigator.serviceWorker.controller) offerUpdate(worker);
        });
      });

      // Una PWA instalada puede pasar días abierta sin navegar de nuevo, que es
      // cuando el navegador busca un sw.js nuevo: se busca también al volver a
      // primer plano, y se vuelve a ofrecer la actualización si sigue pendiente.
      document.addEventListener('visibilitychange', ()=>{
        if(document.visibilityState !== 'visible') return;
        reg.update().catch(()=>{});
        if(reg.waiting && navigator.serviceWorker.controller) offerUpdate(reg.waiting);
      });
    }).catch(()=>{ /* PWA es un extra, no bloquea la app si falla */ });
  }

  // ============================================================
  // Arranque
  // ============================================================
  async function bootstrap(){
    showBoot('Cargando…');
    let session;
    try{
      session = await Api.get('api/session.php');
    }catch(err){
      // No se pudo verificar la sesión. Sin red y con copia local, se abre la
      // app con esos datos (la cookie dura 30 días); si el servidor la dio
      // por vencida, el primer 401 al reconectar manda al Login y borra la
      // copia. Sin copia, o ante un error real del servidor, se pide
      // reintentar — no se manda al Login: no hay evidencia de que no haya
      // sesión.
      const snap = err.offline && window.Snapshot ? await window.Snapshot.load() : null;
      if(snap){
        showApp();
        applyAppData(snap);
        showingSnapshot = true;
        await refreshOfflineBanner();
        return;
      }
      showBoot(err.offline ? 'Sin conexión. Conéctate para abrir la app.' : 'No se pudo conectar con el servidor.', { retry: true });
      return;
    }

    if(!session.authenticated){
      if(window.Snapshot) await window.Snapshot.clear();
      showLogin();
      return;
    }
    showApp();
    try{
      await loadAppData();
    }catch(err){
      if(err.status === 401) return; // sesión vencida: onUnauthorized ya mostró el Login y borró la copia
      // Sesión válida pero la carga falló a medias (red que se cae, 5xx):
      // misma salida que arriba, con la copia local si existe.
      const snap = window.Snapshot ? await window.Snapshot.load() : null;
      if(snap){
        applyAppData(snap);
        showingSnapshot = true;
        await refreshOfflineBanner();
        return;
      }
      showBoot('No se pudieron cargar tus datos.', { retry: true });
      return;
    }
    await syncOfflineQueue(); // por si quedó una cola sin sincronizar de una sesión anterior cerrada offline
  }

  bootRetry.addEventListener('click', bootstrap);
  bootstrap();
})();
