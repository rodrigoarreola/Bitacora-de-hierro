(function(){
  // ============================================================
  // Configuración de días
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
    const days = {};
    DAY_ORDER.forEach(dk=>{
      const d = detail.days[dk];
      days[dk] = { group: d.group_name, notes: d.notes, exercises: d.exercises };
    });
    state.weeks[key] = { days };
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

  // La racha actual no cae a 0 solo porque hoy todavía no se marcó — el día
  // de hoy sigue "en curso". Solo cuenta como corte cuando un día ya pasó
  // (es estrictamente anterior a hoy) y no llegó al mínimo de ejercicios.
  function computeStreaks(){
    const days = buildChronoDays();
    const todayIdx = days.findIndex(d => d.date.getTime() === today.getTime());
    const pastDays = todayIdx === -1 ? days : days.slice(0, todayIdx);
    const todayEntry = todayIdx === -1 ? null : days[todayIdx];

    let best = 0, run = 0;
    pastDays.forEach(d=>{
      if(d.completed){ run++; best = Math.max(best, run); }
      else { run = 0; }
    });

    let current = run;
    if(todayEntry && todayEntry.completed){
      current += 1;
      best = Math.max(best, current);
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
    renderAll();
    const el = document.querySelector(`.week-pill[data-week="${key}"]`);
    if(el) el.scrollIntoView({inline:'center', block:'nearest', behavior:'smooth'});
  }

  async function deleteWeek(key){
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
    const expanded = expandedIds.has(String(ex.id));
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

    host.innerHTML = `
      <div class="day-panel">
        <div class="day-panel-head">
          <div>
            <div class="grp">${day.group}</div>
            <div class="day-of">${DAY_NAMES[state.activeDay]} · ${fmtShortDate(d)}</div>
          </div>
          <div class="progress-ring ${ringTier}">
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

    document.getElementById('sum-best-streak').textContent = diasLabel(best);

    // Los cards de día dependen del mismo estado, así que se refrescan aquí también
    renderDayRack();
  }

  function updateSummaryStrip(){
    const day = currentDay();
    if(!day){
      document.getElementById('sum-series').textContent = '0';
      document.getElementById('sum-exercises').textContent = '0/0';
      return;
    }
    const doneRows = day.exercises.filter(e=>e.done);
    let seriesSum = 0;
    doneRows.forEach(e=>{ const n = parseInt(e.series, 10); if(!isNaN(n)) seriesSum += n; });
    document.getElementById('sum-series').textContent = seriesSum;
    document.getElementById('sum-exercises').textContent = `${doneRows.length}/${day.exercises.length}`;
  }

  // ============================================================
  // Acciones sobre ejercicios
  // ============================================================
  async function toggleExercise(id){
    const ex = findExercise(id);
    if(!ex) return;
    let updated;
    try{ updated = await Api.put(`api/exercises.php?id=${encodeURIComponent(id)}`, { done: !ex.done }); }
    catch(err){ showToast(err.message); return; }
    ex.done = updated.done;
    renderDayPanel();
    updateStreakBadge();
    updateSummaryStrip();
  }

  async function deleteExercise(id){
    const ex = findExercise(id);
    if(!ex) return;
    if(!confirm(`¿Eliminar "${ex.name || 'este ejercicio'}"?`)) return;
    try{ await Api.del(`api/exercises.php?id=${encodeURIComponent(id)}`); }
    catch(err){ showToast(err.message); return; }
    const day = currentDay();
    day.exercises = day.exercises.filter(e=>String(e.id) !== String(id));
    expandedIds.delete(String(id));
    renderDayPanel();
    updateStreakBadge();
    updateSummaryStrip();
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
    if(e.target.closest('[data-action="first-week"]')){ addWeekBtn.click(); return; }
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
    const [weekDates, library] = await Promise.all([
      Api.get('api/weeks.php'),
      Api.get('api/library.php'),
    ]);

    state.order = weekDates;
    EXERCISE_LIBRARY.length = 0;
    library.forEach(item => EXERCISE_LIBRARY.push(item));
    EXERCISE_LIBRARY.sort((a,b)=> a.name.localeCompare(b.name, 'es'));

    const details = await Promise.all(
      state.order.map(key => Api.get(`api/weeks.php?date=${encodeURIComponent(key)}`))
    );
    state.order.forEach((key, i) => applyWeekDetail(key, details[i]));

    state.activeWeek = state.order.includes(todayMondayKey) ? todayMondayKey : (state.order[0] ?? null);

    renderLibraryDatalist();
    renderLibraryView();
    renderAll();
  }

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
  // Arranque
  // ============================================================
  (async function bootstrap(){
    try{
      const session = await Api.get('api/session.php');
      if(session.authenticated){
        showApp();
        await loadAppData();
      } else {
        showLogin();
      }
    }catch(err){
      showLogin();
    }
  })();
})();
