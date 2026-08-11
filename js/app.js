(function(){
  // ============================================================
  // Configuración de días y rutina base
  // ============================================================
  const DAY_ORDER  = ['lun','mar','mie','jue','vie'];
  const DAY_NAMES  = {lun:'Lunes', mar:'Martes', mie:'Miércoles', jue:'Jueves', vie:'Viernes'};
  const DAY_SHORT  = {lun:'Lun', mar:'Mar', mie:'Mié', jue:'Jue', vie:'Vie'};
  const DAY_LETTER = {lun:'L', mar:'M', mie:'X', jue:'J', vie:'V'};
  const DAY_OFFSET = {lun:0, mar:1, mie:2, jue:3, vie:4};
  const MESES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  const WEEKDAY_TO_KEY = {1:'lun', 2:'mar', 3:'mie', 4:'jue', 5:'vie'};
  const MIN_DONE_FOR_STREAK = 3;
  const RING_R = 16;
  const RING_C = 2 * Math.PI * RING_R;

  let uidCounter = 0;
  function uid(){ return 'ex' + (++uidCounter); }

  // Ya sin asteriscos en el nombre: cada ejercicio lleva su propia nota
  // (p. ej. "incluye barra", "×2 la mancuerna") visible directo en la fila.
  const BASE_TEMPLATE = {
    lun: { group:'Pecho y Tríceps', notes:'', exercises:[
      {name:'Press de banca plano con barra', kg:60, reps:12, series:3, note:'incluye barra'},
      {name:'Press inclinado con barra', kg:50, reps:12, series:3, note:'incluye barra'},
      {name:'Aperturas con mancuernas o en máquina', kg:60, reps:12, series:3, note:''},
      {name:'Extensión de tríceps en polea', kg:30, reps:12, series:3, note:''},
      {name:'Extensión de tríceps con mancuerna', kg:12.5, reps:8, series:3, note:'×2 la mancuerna'},
      {name:'Copa sobre la cabeza', kg:22.5, reps:12, series:3, note:''},
      {name:'Press francés con barra Z', kg:'', reps:12, series:'', note:''},
    ]},
    mar: { group:'Piernas', notes:'', exercises:[
      {name:'Sentadilla libre con barra', kg:70, reps:12, series:3, note:'incluye barra'},
      {name:'Press de pierna', kg:90, reps:12, series:3, note:'solo discos'},
      {name:'Peso muerto rumano con mancuerna', kg:60, reps:12, series:4, note:''},
      {name:'Extensión de isquios sentado', kg:60, reps:12, series:3, note:''},
      {name:'Extensión de cuádriceps sentado', kg:60, reps:12, series:4, note:''},
      {name:'Abductores en máquina', kg:30, reps:20, series:4, note:''},
      {name:'Hip thrust en máquina', kg:60, reps:12, series:3, note:''},
      {name:'Pantorrilla sentado', kg:20, reps:12, series:4, note:''},
      {name:'Prone leg curl acostado', kg:'40(8)', reps:12, series:3, note:''},
      {name:'Patada de glúteo en máquina', kg:30, reps:12, series:4, note:''},
    ]},
    mie: { group:'Espalda y Bíceps', notes:'Filas sin marcar: variantes que rotan semana a semana.', exercises:[
      {name:'Jalones al pecho', kg:55, reps:12, series:3, note:''},
      {name:'Remo con barra T', kg:35, reps:12, series:4, note:''},
      {name:'Remo con polea baja', kg:60, reps:12, series:3, note:''},
      {name:'Remo con mancuerna', kg:16, reps:16, series:4, note:''},
      {name:'Chin ups', kg:30, reps:12, series:4, note:''},
      {name:'Curl de bíceps predicador', kg:20, reps:10, series:3, note:''},
      {name:'Curl de bíceps mancuerna', kg:25, reps:8, series:3, note:''},
      {name:'Curl de bíceps martillo', kg:30, reps:7, series:3, note:''},
      {name:'Antebrazo', kg:15, reps:12, series:4, note:''},
    ]},
    jue: { group:'Hombros', notes:'', exercises:[
      {name:'Press militar mancuerna', kg:35, reps:12, series:3, note:'peso entre las dos'},
      {name:'Elevaciones laterales mancuernas', kg:25, reps:10, series:3, note:'peso entre las dos'},
      {name:'Pájaros en máquina', kg:30, reps:12, series:3, note:''},
      {name:'Elevación frontal de mancuernas', kg:20, reps:10, series:3, note:'peso entre las dos'},
      {name:'Remo al mentón barra Z', kg:20, reps:12, series:3, note:'sin barra'},
      {name:'Rear delt fly en máquina', kg:60, reps:12, series:3, note:''},
    ]},
    vie: { group:'Full Body', notes:'Día de cierre — se ajusta según lo que falte de la semana.', exercises:[
      {name:'Hack squat', kg:50, reps:12, series:3, note:''},
      {name:'Press de isquiotibiales sentado', kg:50, reps:8, series:4, note:''},
      {name:'Leg curl acostado', kg:40, reps:12, series:3, note:''},
      {name:'Press en banco inclinado con mancuerna', kg:45, reps:12, series:3, note:''},
      {name:'Chin up con máquina', kg:60, reps:10, series:3, note:''},
      {name:'Press militar en máquina', kg:40, reps:12, series:4, note:''},
      {name:'Remo en máquina', kg:40, reps:8, series:4, note:''},
      {name:'Patada de glúteo en máquina', kg:30, reps:8, series:4, note:''},
      {name:'Extensión de tríceps sobre cabeza', kg:22.5, reps:12, series:4, note:''},
    ]},
  };

  // ============================================================
  // Librería de ejercicios (reutilizable / autocompletado)
  // ============================================================
  const EXERCISE_LIBRARY = [];
  (function seedLibrary(){
    const seen = new Set();
    Object.values(BASE_TEMPLATE).forEach(day=>{
      day.exercises.forEach(e=>{
        const key = e.name.trim().toLowerCase();
        if(key && !seen.has(key)){
          seen.add(key);
          EXERCISE_LIBRARY.push({ id: uid(), name: e.name.trim() });
        }
      });
    });
    EXERCISE_LIBRARY.sort((a,b)=> a.name.localeCompare(b.name, 'es'));
  })();

  function addToLibrary(name){
    const trimmed = (name || '').trim();
    if(!trimmed) return;
    const exists = EXERCISE_LIBRARY.some(e => e.name.toLowerCase() === trimmed.toLowerCase());
    if(exists) return;
    EXERCISE_LIBRARY.push({ id: uid(), name: trimmed });
    EXERCISE_LIBRARY.sort((a,b)=> a.name.localeCompare(b.name, 'es'));
    renderLibraryDatalist();
    renderLibraryView();
  }

  function removeFromLibrary(id){
    const idx = EXERCISE_LIBRARY.findIndex(e => e.id === id);
    if(idx === -1) return;
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
        <button type="button" class="lib-del" data-action="lib-del" aria-label="Eliminar de la librería"><svg class="icon"><use href="#i-trash"/></svg></button>
      </div>
    `).join('');
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
  // Datos de ejemplo: semana actual (sin marcar) + 2 semanas previas
  // completadas — 3 semanas de historial en total
  // ============================================================
  function makeWeekDays(deltaKg, allDone){
    const days = {};
    DAY_ORDER.forEach(k=>{
      days[k] = {
        group: BASE_TEMPLATE[k].group,
        notes: BASE_TEMPLATE[k].notes,
        exercises: BASE_TEMPLATE[k].exercises.map(e=>{
          let kg = e.kg;
          if(typeof kg === 'number') kg = Math.max(0, +(kg + deltaKg).toFixed(2));
          return { id:uid(), name:e.name, kg, reps:e.reps, series:e.series, note:e.note||'', done: !!allDone };
        })
      };
    });
    return days;
  }
  function makeEmptyWeekDays(){
    const days = {};
    DAY_ORDER.forEach(k=>{ days[k] = { group: BASE_TEMPLATE[k].group, notes: BASE_TEMPLATE[k].notes, exercises: [] }; });
    return days;
  }

  const today = new Date(); today.setHours(0,0,0,0);
  const currentMonday = mondayOfWeek(today);
  const lastMonday = new Date(currentMonday); lastMonday.setDate(lastMonday.getDate() - 7);
  const prevMonday = new Date(currentMonday); prevMonday.setDate(prevMonday.getDate() - 14);

  const kCurrent = toISO(currentMonday);
  const kLast = toISO(lastMonday);
  const kPrev = toISO(prevMonday);

  const state = {
    weeks: {
      [kPrev]:    { days: makeWeekDays(-2.5, true) },
      [kLast]:    { days: makeWeekDays(0, true) },
      [kCurrent]: { days: makeWeekDays(0, false) },
    },
    order: [kPrev, kLast, kCurrent].sort((a,b)=> b.localeCompare(a)), // más reciente primero
    activeWeek: kCurrent,
    activeDay: WEEKDAY_TO_KEY[today.getDay()] || 'lun',
  };

  const expandedIds = new Set();

  function currentWeek(){ return state.weeks[state.activeWeek]; }
  function currentDay(){ return currentWeek().days[state.activeDay]; }
  function findExercise(id){ return currentDay().exercises.find(e=>e.id===id); }
  function getPrevWeekKey(key){
    // state.order va de más reciente a más antigua, así que la semana
    // cronológicamente anterior está en la siguiente posición del arreglo.
    const idx = state.order.indexOf(key);
    return (idx > -1 && idx < state.order.length - 1) ? state.order[idx+1] : null;
  }
  function findExerciseInPrevWeek(name){
    const prevKey = getPrevWeekKey(state.activeWeek);
    if(!prevKey) return null;
    const prevDay = state.weeks[prevKey].days[state.activeDay];
    const target = (name || '').trim().toLowerCase();
    if(!target) return null;
    return prevDay.exercises.find(e => e.name.trim().toLowerCase() === target) || null;
  }

  function comparisonHtml(curRaw, prevRaw){
    const prevDisplay = (prevRaw === '' || prevRaw === null || prevRaw === undefined) ? '—' : escapeHtml(prevRaw);
    const cur = parseFloat(curRaw);
    const prev = parseFloat(prevRaw);
    if(isNaN(cur) || isNaN(prev)){
      return `<span>${prevDisplay}</span>`;
    }
    if(cur > prev){
      return `<span>${prevDisplay}</span><svg class="icon cmp-icon cmp-up"><use href="#i-chevron"/></svg>`;
    }
    if(cur < prev){
      return `<span>${prevDisplay}</span><svg class="icon cmp-icon cmp-down"><use href="#i-chevron"/></svg>`;
    }
    return `<span>${prevDisplay}</span><span class="cmp-eq">=</span>`;
  }

  // ============================================================
  // Racha: días "cumplidos" (3+ ejercicios marcados) consecutivos,
  // cruzando semanas (lunes a viernes, ignorando fines de semana).
  // Solo cuenta días hasta hoy — los días futuros de la semana en
  // curso no cortan la racha por estar simplemente aún sin llegar.
  // ============================================================
  function buildChronoDays(){
    const list = [];
    const ascKeys = [...state.order].sort((a,b)=> a.localeCompare(b));
    ascKeys.forEach(wk=>{
      DAY_ORDER.forEach(dk=>{
        const date = dayDate(wk, dk);
        if(date > today) return;
        const done = state.weeks[wk].days[dk].exercises.filter(e=>e.done).length;
        list.push({ date, completed: done >= MIN_DONE_FOR_STREAK });
      });
    });
    list.sort((a,b)=> a.date - b.date);
    return list;
  }

  function computeStreaks(){
    const days = buildChronoDays();
    let best = 0, run = 0;
    days.forEach(d=>{
      if(d.completed){ run++; best = Math.max(best, run); }
      else { run = 0; }
    });
    let current = 0;
    for(let i = days.length - 1; i >= 0; i--){
      if(days[i].completed) current++; else break;
    }
    return { current, best };
  }

  // ============================================================
  // Render
  // ============================================================
  function renderAll(){
    renderWeekPills();
    renderDayRack();
    renderDayPanel();
    updateStreakBadge();
    updateSummaryStrip();
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
        del.innerHTML = '<svg class="icon"><use href="#i-x"/></svg>';
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
    renderAll();
    const el = document.querySelector(`.week-pill[data-week="${key}"]`);
    if(el) el.scrollIntoView({inline:'center', block:'nearest', behavior:'smooth'});
  }

  function deleteWeek(key){
    if(state.order.length <= 1){ showToast('Debe quedar al menos una semana.'); return; }
    if(!confirm('¿Eliminar esta semana? Se perderán sus registros.')) return;
    delete state.weeks[key];
    state.order = state.order.filter(k => k !== key);
    if(state.activeWeek === key){
      state.activeWeek = state.order[state.order.length - 1];
    }
    renderAll();
    showToast('Semana eliminada.');
  }

  function renderDayRack(){
    const host = document.getElementById('day-rack');
    host.innerHTML = '';
    const week = currentWeek();
    DAY_ORDER.forEach(dk=>{
      const doneCount = week.days[dk].exercises.filter(e=>e.done).length;
      const isCompleted = doneCount >= MIN_DONE_FOR_STREAK;
      const tab = document.createElement('div');
      tab.className = 'day-tab' + (dk === state.activeDay ? ' active' : '') + (isCompleted ? ' completed' : '');
      tab.dataset.day = dk;
      tab.innerHTML = `
        <div class="plate">${DAY_LETTER[dk]}</div>
        <div class="dname">${DAY_SHORT[dk]}</div>
        <span class="muted-tag">${week.days[dk].group.split(' ')[0]}</span>
      `;
      tab.addEventListener('click', ()=>{
        state.activeDay = dk;
        renderDayRack();
        renderDayPanel();
        updateSummaryStrip();
      });
      host.appendChild(tab);
    });
  }

  function exerciseRowHtml(ex){
    const expanded = expandedIds.has(ex.id);
    let detailHtml = '';
    if(expanded){
      const prevEx = findExerciseInPrevWeek(ex.name);
      if(!prevEx){
        detailHtml = `<div class="ex-detail"><p class="ex-detail-empty">Sin datos de la semana pasada para este ejercicio.</p></div>`;
      } else {
        detailHtml = `
          <div class="ex-detail">
            <div class="ex-detail-label">Semana pasada</div>
            <div class="ex-detail-grid">
              <div class="ex-detail-item"><span class="k">Kg</span><span class="v">${comparisonHtml(ex.kg, prevEx.kg)}</span></div>
              <div class="ex-detail-item"><span class="k">Rep</span><span class="v">${comparisonHtml(ex.reps, prevEx.reps)}</span></div>
              <div class="ex-detail-item"><span class="k">Ser</span><span class="v">${comparisonHtml(ex.series, prevEx.series)}</span></div>
            </div>
          </div>`;
      }
    }
    const hasName = !!(ex.name && ex.name.trim());
    const displayText = hasName ? escapeHtml(ex.name) : 'Nombre del ejercicio';
    const noteText = ex.note && ex.note.trim() ? escapeHtml(ex.note.trim()) : '+ nota';
    const noteClass = ex.note && ex.note.trim() ? 'ex-note has-note' : 'ex-note';
    return `
      <div class="ex-row ${ex.done ? 'done' : 'pending'}" data-id="${ex.id}">
        <div class="ex-check" data-action="toggle"><svg class="icon"><use href="#${ex.done ? 'i-check' : 'i-minus'}"/></svg></div>
        <div class="ex-name-cell">
          <div class="ex-name-display${hasName ? '' : ' empty'}" data-action="edit-name">${displayText}</div>
          <input class="ex-name-input" data-field="name" list="exercise-library-list" value="${escapeHtml(ex.name)}" placeholder="Nombre del ejercicio">
          <button type="button" class="${noteClass}" data-action="edit-note">${noteText}</button>
        </div>
        <input class="ex-val-input" data-field="kg" value="${escapeHtml(ex.kg)}" inputmode="decimal" placeholder="—">
        <input class="ex-val-input" data-field="reps" value="${escapeHtml(ex.reps)}" inputmode="numeric" placeholder="—">
        <input class="ex-val-input" data-field="series" value="${escapeHtml(ex.series)}" inputmode="numeric" placeholder="—">
        <button class="ex-del" type="button" data-action="delete" aria-label="Eliminar ejercicio"><svg class="icon"><use href="#i-trash"/></svg></button>
        <button class="ex-chevron${expanded ? ' open' : ''}" type="button" data-action="chevron" aria-label="Ver semana pasada"><svg class="icon"><use href="#i-chevron"/></svg></button>
      </div>${detailHtml}`;
  }

  function renderDayPanel(){
    const host = document.getElementById('day-panel-host');
    const day = currentDay();
    const d = dayDate(state.activeWeek, state.activeDay);
    const total = day.exercises.length;
    const done = day.exercises.filter(e=>e.done).length;
    const ratio = total ? done/total : 0;
    const offset = RING_C * (1 - ratio);

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
        <div class="add-ex-row" data-action="add-ex"><svg class="icon"><use href="#i-plus"/></svg>Agregar ejercicio</div>
        ${day.notes ? `<div class="day-notes">${day.notes}</div>` : ''}`;
    }

    host.innerHTML = `
      <div class="day-panel">
        <div class="day-panel-head">
          <div>
            <div class="grp">${day.group}</div>
            <div class="day-of">${DAY_NAMES[state.activeDay]} · ${fmtShortDate(d)}</div>
          </div>
          <div class="progress-ring">
            <svg width="40" height="40" viewBox="0 0 40 40">
              <circle class="bgc" cx="20" cy="20" r="16"></circle>
              <circle class="fgc" cx="20" cy="20" r="16" stroke-dasharray="${RING_C.toFixed(1)}" stroke-dashoffset="${offset.toFixed(1)}"></circle>
            </svg>
            <div class="pct">${done}/${total}</div>
          </div>
        </div>
        ${bodyHtml}
      </div>`;
  }

  function updateStreakBadge(){
    const { current, best } = computeStreaks();

    const badge = document.getElementById('streak-badge');
    badge.textContent = diasLabel(current);
    badge.classList.toggle('complete', current > 0);

    document.getElementById('sum-streak').textContent = diasLabel(current);
    document.getElementById('sum-best-streak').textContent = diasLabel(best);

    // Los cards de día dependen del mismo estado, así que se refrescan aquí también
    renderDayRack();
  }

  function updateSummaryStrip(){
    const day = currentDay();
    const doneRows = day.exercises.filter(e=>e.done);
    let seriesSum = 0;
    doneRows.forEach(e=>{ const n = parseInt(e.series, 10); if(!isNaN(n)) seriesSum += n; });
    document.getElementById('sum-series').textContent = seriesSum;
    document.getElementById('sum-exercises').textContent = `${doneRows.length}/${day.exercises.length}`;
  }

  // ============================================================
  // Acciones sobre ejercicios
  // ============================================================
  function toggleExercise(id){
    const ex = findExercise(id);
    if(!ex) return;
    ex.done = !ex.done;
    renderDayPanel();
    updateStreakBadge();
    updateSummaryStrip();
  }

  function deleteExercise(id){
    const ex = findExercise(id);
    if(!ex) return;
    if(!confirm(`¿Eliminar "${ex.name || 'este ejercicio'}"?`)) return;
    const day = currentDay();
    day.exercises = day.exercises.filter(e=>e.id !== id);
    expandedIds.delete(id);
    renderDayPanel();
    updateStreakBadge();
    updateSummaryStrip();
  }

  function addExercise(){
    const day = currentDay();
    const newId = uid();
    day.exercises.push({ id: newId, name:'', kg:'', reps:'', series:'', note:'', done:false });
    renderDayPanel();
    updateStreakBadge();
    updateSummaryStrip();
    enterNameEdit(newId);
  }

  function copyPreviousWeek(){
    const prevKey = getPrevWeekKey(state.activeWeek);
    if(!prevKey) return;
    const prevWeek = state.weeks[prevKey];
    const week = currentWeek();
    DAY_ORDER.forEach(dk=>{
      week.days[dk].exercises = prevWeek.days[dk].exercises.map(e=>(
        { id: uid(), name:e.name, kg:e.kg, reps:e.reps, series:e.series, note:e.note||'', done:false }
      ));
    });
    renderDayPanel();
    updateStreakBadge();
    updateSummaryStrip();
    showToast('Rutina copiada de la semana pasada — sin marcar.');
  }

  function toggleDetail(id){
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
  dayPanelHost.addEventListener('click', (e)=>{
    const toggleEl = e.target.closest('[data-action="toggle"]');
    if(toggleEl){ toggleExercise(toggleEl.closest('.ex-row').dataset.id); return; }
    const delEl = e.target.closest('[data-action="delete"]');
    if(delEl){ deleteExercise(delEl.closest('.ex-row').dataset.id); return; }
    const chevronEl = e.target.closest('[data-action="chevron"]');
    if(chevronEl){ toggleDetail(chevronEl.closest('.ex-row').dataset.id); return; }
    const nameEl = e.target.closest('[data-action="edit-name"]');
    if(nameEl){ enterNameEdit(nameEl.closest('.ex-row').dataset.id); return; }
    const noteEl = e.target.closest('[data-action="edit-note"]');
    if(noteEl){
      const row = noteEl.closest('.ex-row');
      const ex = findExercise(row.dataset.id);
      if(!ex) return;
      const val = prompt('Nota para este ejercicio (ej. incluye barra, ×2 la mancuerna):', ex.note || '');
      if(val !== null){ ex.note = val.trim(); renderDayPanel(); }
      return;
    }
    if(e.target.closest('[data-action="add-ex"]')){ addExercise(); return; }
    if(e.target.closest('[data-action="copy-week"]')){ copyPreviousWeek(); return; }
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

  // Al salir del campo de nombre, volver a modo "mostrar" (envuelto, altura fija)
  dayPanelHost.addEventListener('focusout', (e)=>{
    const input = e.target.closest('.ex-name-input');
    if(!input) return;
    const cell = input.closest('.ex-name-cell');
    const row = input.closest('.ex-row');
    const ex = findExercise(row.dataset.id);
    const display = cell.querySelector('.ex-name-display');
    const hasName = !!(ex && ex.name && ex.name.trim());
    display.textContent = hasName ? ex.name : 'Nombre del ejercicio';
    display.classList.toggle('empty', !hasName);
    cell.classList.remove('editing');
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
    const ex = EXERCISE_LIBRARY.find(x => x.id === row.dataset.id);
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
  // Navegación: tabs inferiores
  // ============================================================
  document.querySelectorAll('nav.bottom-nav button').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      document.querySelectorAll('nav.bottom-nav button').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
      document.getElementById('view-' + btn.dataset.view).classList.add('active');
    });
  });

  // ============================================================
  // Toast
  // ============================================================
  const toastEl = document.getElementById('toast');
  function showToast(msg){
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(()=>toastEl.classList.remove('show'), 2400);
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

  dateInput.addEventListener('change', ()=>{
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
    state.weeks[key] = { days: makeEmptyWeekDays() };
    state.order.push(key);
    state.order.sort((a,b)=> b.localeCompare(a)); // más reciente primero
    state.activeWeek = key;
    state.activeDay = 'lun';
    renderAll();
    showToast('Semana creada — agrégale ejercicios o cópiala de la anterior.');
  });

  // ============================================================
  // Estado inicial
  // ============================================================
  renderLibraryDatalist();
  renderLibraryView();
  renderAll();
})();
