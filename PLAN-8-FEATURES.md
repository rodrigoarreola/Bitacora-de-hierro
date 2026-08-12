# Plan nocturno — 8 features

Generado la noche del 2026-08-12 para ejecutar sin depender de más respuestas
del usuario (sesión con 80% de capacidad restante, usuario dormido). Este
documento tiene **toda la información necesaria para implementar cada feature
de punta a punta**: decisiones de diseño ya tomadas, esquema exacto, endpoints
exactos, funciones/CSS exactos y cómo verificar cada una. Si esta sesión se
corta a la mitad, cualquier continuación puede retomar leyendo la sección
"Registro de progreso" al final y seguir desde ahí sin releer todo el repo.

## Reglas de trabajo acordadas con el usuario

- **Commits**: uno por feature, al terminarla y verificarla localmente (no un
  commit gigante al final, no todo sin commitear). Mensaje en español,
  consistente con el historial existente. `Co-Authored-By: Claude Sonnet 5
  <noreply@anthropic.com>`.
- **Edición offline (feature 8)**: conflictos se resuelven con
  last-write-wins (gana el cambio más reciente por timestamp). Diseño exacto
  más abajo.
- **Sin acceso a hosting de producción** (Hostgator/cPanel): todo lo que
  toque despliegue real (correr el `ALTER TABLE` en producción, configurar el
  cron de backups) se documenta en el README bajo "Pendiente de correr en
  producción" — mismo patrón que ya usa el repo — pero no se ejecuta contra
  producción. Solo se prueba contra la BD local.
- **Orden de ejecución**: el de abajo, de menor a mayor riesgo/dependencia.
  No hace falta terminarlas todas — si el tiempo se acaba, parar después de
  completar+commitear una feature entera, nunca a la mitad de una.
- Cada feature termina con: verificación en el navegador local (Chrome vía
  Claude Browser, `php -S localhost:8000`), entrada en `CHANGELOG.md` bajo
  `## [Unreleased]` → `### Added` (estilo verboso existente, explicando el
  *por qué* de las decisiones no obvias), entrada nueva en `APP_VERSIONS`
  (`js/app.js`) con bump de versión menor, y commit.

## Entorno confirmado

- PHP 8.5.9 CLI disponible en `C:\php\php.exe` (`php -S localhost:8000` desde
  la raíz del repo sirve la app).
- `api/config.local.php` ya existe y apunta a MySQL local
  (`bitacora_hierro`, host `localhost`) con **datos reales**: 73 semanas,
  1842 ejercicios, 45 en la librería, 131 overrides, 5 settings. Confirmado
  con `SHOW TABLES` + conteos vía PDO.
- **Importante para PHP + rutas en este entorno**: el binario de PHP es
  nativo de Windows — usa rutas `C:/...` o `C:\...`, NO rutas estilo
  Git-Bash `/c/...` (fallan silenciosamente con "no such file or
  directory" aunque el directorio exista). Si se necesita otro
  script ad-hoc de un solo uso, usar rutas Windows.
- Backup de seguridad de las 7 tablas ya volcado a JSON en
  `scratchpad/db-backup/*.json` antes de tocar el esquema, por si una
  migración sale mal localmente.
- `mysql`/`mysqldump` CLI no están en el PATH — cualquier verificación de
  esquema se hace vía PDO desde PHP, no vía `mysql -e`.

## Convenciones del proyecto (ya vigentes, seguir igual)

- **Vanilla JS**, un solo IIFE en `js/app.js` (~1650 líneas), sin build step.
  Nuevas funciones van cerca de las que usan (hay bloques `====` separando
  secciones temáticas: Fechas, Estado, Racha, Hitos, Render, Acciones,
  Historial, Progreso, Perfil, Sesión, Service worker, Arranque).
- **Estado**: `state.weeks[monday_date] = { days: { lun: {group, notes,
  migratedFrom, exercises[]}, ... } }`, `state.order` = claves de semana
  más reciente primero. Un día de `state.weeks[key].days[dk]` (a agregar
  con la feature 5): también tendrá `note` a nivel semana, no por día —
  vive en `state.weeks[key].note`, no dentro de `days`.
- **Render**: funciones `render*()` idempotentes que regeneran `innerHTML`
  completo de su host y no dependen de estado previo del DOM. Delegación de
  eventos en contenedores fijos (`dayPanelHost.addEventListener('click', ...)`
  con `data-action="..."` + `e.target.closest(...)`), no listeners por fila.
- **API** (`js/api.js`): `Api.get/post/put/del(path, body)` → helpers que
  hacen `fetch` con `credentials:'same-origin'`, tiran `Error` si
  `!json.ok`, y llaman a `Api.onUnauthorized()` en un 401. Endpoints PHP:
  `require config.php` (PDO + sesión) → `require auth.php` (helpers) →
  `require_login()` → switch por `$_SERVER['REQUEST_METHOD']` →
  `respond_ok($data, $status)` / `respond_error($msg, $status)`.
- **Schema**: `kg`/`reps`/`series` son `VARCHAR` a propósito (texto libre,
  formatos como `"40(8)"`). Todo cálculo numérico usa `parseFloat`/`parseInt`
  y **descarta silenciosamente lo no numérico** (nunca lo trata como cero).
  Migraciones nuevas van al final de `api/db/schema.sql` con comentario de
  bloque `-- ====`, y si ya hay datos en producción, el `ALTER
  TABLE`/`INSERT` exacto se agrega también a la sección "Pendiente de correr
  en producción" del `README.md`.
- **CSS**: variables en `:root` (`--bg`, `--surface`, `--accent`, `--ok`,
  `--danger`, `--pending`, `--text`, `--text-dim`, `--text-faint`, fonts
  `--font-display`/`--font-body`/`--font-mono`). Cards = `background:
  var(--surface); border:1px solid var(--line); border-radius:16px`. Sin
  frameworks, sin emojis en ningún texto de UI (todo el copy existente es
  texto plano en español, ese tono se mantiene).
- **Changelog + versión**: `CURRENT_VERSION` = `APP_VERSIONS[0].version` en
  `js/app.js`. Cada feature nueva = una entrada nueva al principio del array
  (bump de versión **menor**, ej. 1.6.0 → 1.7.0), con `date` de hoy y
  `items` describiendo el cambio de cara al usuario. `CHANGELOG.md` es la
  fuente técnica detallada (bullets largos explicando el *por qué*);
  `APP_VERSIONS` es el resumen corto de cara al usuario en Perfil.
- **`sw.js`**: si se toca `index.html`/`css/`/`js/`, incrementar
  `CACHE_NAME` (hoy `bitacora-shell-v14` → `v15`) y agregar cualquier archivo
  JS nuevo a `SHELL_ASSETS`. Nunca cachear nada bajo `api/`.

---

## Feature 1 — Volumen x día (Bajo)

**Qué hace**: nuevo chip en la tira de resumen de "Hoy" con el volumen total
del día (kg × reps × series, solo ejercicios marcados como hechos).

**Diseño**:
- Nueva función en `js/app.js`, cerca de `updateSummaryStrip()`:
  ```js
  function computeDayVolume(day){
    let vol = 0;
    day.exercises.forEach(e=>{
      if(!e.done) return;
      const kg = parseFloat(e.kg), reps = parseInt(e.reps,10), series = parseInt(e.series,10);
      if(isNaN(kg) || isNaN(reps) || isNaN(series)) return;
      vol += kg * reps * series;
    });
    return vol;
  }
  ```
- En `updateSummaryStrip()`, agregar el cálculo y setear un 4to chip:
  `document.getElementById('sum-volume').textContent =
  Math.round(computeDayVolume(day)).toLocaleString('es-MX') + ' kg';`
  (si `!day`, poner `'0 kg'`, igual que los otros chips en ese branch).
- **`index.html`**: agregar un 4to `.sum-chip` a `.summary-strip` de la
  vista Hoy (la que tiene `id="week-rail"` arriba), con
  `<div class="k">Volumen</div><div class="v" id="sum-volume">0 kg</div>`.
  **No** tocar el `.summary-strip` que arma `renderProgreso()` (ese sigue
  con 3 chips) — para no romperlo, esta feature usa una clase modificadora
  nueva en vez de cambiar `.summary-strip` a secas.
- **CSS**: agregar `.summary-strip.cols-4{ grid-template-columns:repeat(4,
  1fr); }` y ponerle la clase `cols-4` solo al `.summary-strip` de Hoy en el
  HTML (`class="summary-strip cols-4"`). El de Progreso queda con 3
  columnas igual que hoy.

**Verificación**: `php -S localhost:8000`, login, marcar 2-3 ejercicios con
kg/reps/series numéricos como hechos, confirmar que el chip nuevo suma bien
y que en pantallas angostas (probar con `resize_window` a mobile) las 4
columnas no se encimen ni corten el texto.

**Changelog/versión**: `1.7.0` — "Volumen del día".

---

## Feature 2 — Compartir día/semana como imagen (Bajo)

**Qué hace**: botón para capturar el panel del día activo (o una tarjeta de
Historial) como PNG y compartirlo/descargarlo.

**Diseño**:
- Librería: **html2canvas 1.4.1** vía CDN (mismo patrón que Chart.js/Font
  Awesome). Agregar en `index.html`, junto a la línea de Chart.js:
  `<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js" defer></script>`
- Helper compartido en `js/app.js` (cerca de `cssVar()`, que ya existe):
  ```js
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
  ```
- **Botón día**: en `renderDayPanel()`, dentro de `.day-panel-head`, envolver
  el `.progress-ring` existente junto a un botón nuevo en un contenedor
  `.day-panel-head-actions` (`display:flex; align-items:center; gap:8px;`):
  `<button class="share-btn" type="button" data-action="share-day"
  aria-label="Compartir día"><i class="icon fa-solid
  fa-share-nodes"></i></button>`. Manejar en el switch de delegación de
  `dayPanelHost` (junto a los demás `data-action`):
  ```js
  if(e.target.closest('[data-action="share-day"]')){
    shareElementAsImage(document.querySelector('.day-panel'), `bitacora-${state.activeWeek}-${state.activeDay}.png`);
    return;
  }
  ```
- **Botón semana**: en `renderHistorial()`, dentro de `.hist-card-head`,
  envolver `.hist-card-total` + un botón nuevo en `.hist-card-head-right`
  (mismo estilo flex). **Ojo con el orden de bubbling**: el listener de
  click de la tarjeta completa (`card.addEventListener('click', ...)`, ya
  existente, navega a "Hoy") está MÁS CERCA del botón en el árbol que
  cualquier listener delegado en `#hist-list` — un `stopPropagation()`
  puesto en el listener delegado llega tarde, porque el de la tarjeta ya
  se disparó antes en la fase de bubbling. La forma correcta es agregar un
  guard al principio del listener de la tarjeta:
  ```js
  card.addEventListener('click', (e)=>{
    if(e.target.closest('[data-action="share-week"]')) return; // el botón compartir maneja su propio click aparte
    const dot = e.target.closest('.hist-dot');
    // ... resto igual que hoy ...
  });
  ```
  Y el listener delegado que realmente ejecuta la acción va, **una sola
  vez, fuera de `renderHistorial()`** (esa función reconstruye el
  `innerHTML` en cada render — atar un listener ahí adentro lo duplicaría
  en cada render):
  ```js
  document.getElementById('hist-list').addEventListener('click', (e)=>{
    const shareBtn = e.target.closest('[data-action="share-week"]');
    if(!shareBtn) return;
    const card = shareBtn.closest('.hist-card');
    shareElementAsImage(card, `bitacora-semana-${card.dataset.week}.png`);
  });
  ```
- **CSS**:
  ```css
  .day-panel-head-actions{ display:flex; align-items:center; gap:8px; }
  .hist-card-head-right{ display:flex; align-items:center; gap:8px; }
  .share-btn{
    background:var(--surface-2); border:1px solid var(--line); color:var(--text-dim);
    width:30px; height:30px; border-radius:8px; display:flex; align-items:center;
    justify-content:center; cursor:pointer; flex-shrink:0;
  }
  .share-btn:hover{ color:var(--accent); border-color:var(--accent); }
  .share-btn .icon{ font-size:13px; }
  ```

**Verificación**: en el navegador local, tocar "compartir" en el día activo
y en una tarjeta de Historial; sin `navigator.share` disponible (desktop)
debe descargar el PNG directo — confirmar que el archivo baja y se ve bien
(fondo oscuro correcto, sin recortes). Revisar consola sin errores.

**Changelog/versión**: `1.8.0` — "Compartir como imagen".

---

## Feature 3 — PR automático (Medio)

**Qué hace**: al marcar un ejercicio como hecho, si su kg supera el mejor kg
histórico registrado para ese mismo nombre (en cualquier semana anterior,
solo apariciones ya marcadas como hechas), muestra un toast de récord.
**No** cuenta como PR la primera vez que se registra un ejercicio (no hay
nada contra qué comparar) — se necesita al menos un registro previo.

**Diseño**:
- Nueva función, cerca de `collectExerciseHistory()` (Progreso) porque
  recorre la misma estructura:
  ```js
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
  ```
- **Reescribir `toggleExercise()`** (necesario también para la feature 8,
  no depender del `done` que devuelve el servidor sino calcularlo local):
  ```js
  async function toggleExercise(id){
    const ex = findExercise(id);
    if(!ex) return;
    const newDone = !ex.done;
    // Se calcula el mejor histórico ANTES de aplicar el toggle, para no comparar el ejercicio contra sí mismo.
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
  ```
  (antes, esta función leía `ex.done = updated.done` del response — ya no
  hace falta ni conviene, porque la feature 8 hará que una mutación en cola
  offline devuelva un objeto sin `done` real todavía).

**Verificación**: crear/editar un ejercicio con el mismo nombre en dos
semanas con distinto kg (ej. "Press banca" 40kg semana pasada, 45kg esta
semana), marcarlo como hecho en la semana con más kg y confirmar el toast
de récord. Confirmar que NO aparece toast si se marca un ejercicio nuevo sin
historial previo, ni si el kg es igual o menor al mejor previo.

**Changelog/versión**: `1.9.0` — "PR automático".

---

## Feature 4 — Balance por grupo muscular (Medio)

**Qué hace**: panel nuevo en Historial con una barra por grupo muscular
mostrando cuántos días "cumplidos" tuvo cada grupo, en el período que ya
está filtrado por el riel de meses existente (`historialMonth`).

**Diseño**:
- Nueva función en `js/app.js`, cerca de `renderHistorial()`:
  ```js
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
  ```
- Llamar `renderGroupBalance(keys)` dentro de `renderHistorial()`, justo
  después de armar `const keys = state.order.filter(...)` (reutiliza el
  mismo array ya filtrado por mes, no hace falta duplicar el filtro).
- **`index.html`**: agregar dentro de `#view-historial`, entre
  `#hist-month-rail` y `#hist-list`:
  ```html
  <div class="lib-panel balance-panel">
    <div class="lib-head">
      <div class="lib-title">Balance por grupo muscular</div>
      <p class="lib-sub">Días cumplidos por grupo, en el período filtrado arriba.</p>
    </div>
    <div class="balance-list" id="group-balance-host"></div>
  </div>
  ```
- **CSS**:
  ```css
  .balance-panel{ margin-bottom:16px; }
  .balance-list{ padding:6px 18px 16px; display:flex; flex-direction:column; gap:10px; }
  .balance-row{ display:grid; grid-template-columns:auto 1fr 22px; align-items:center; gap:10px; }
  .balance-label{ font-size:11.5px; color:var(--text-dim); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:110px; }
  .balance-bar-track{ height:8px; background:var(--surface-2); border-radius:4px; overflow:hidden; }
  .balance-bar-fill{ height:100%; background:var(--accent); border-radius:4px; }
  .balance-value{ font-family:var(--font-mono); font-size:11px; color:var(--text-dim); text-align:right; }
  .balance-empty{ font-size:11.5px; color:var(--text-faint); padding:8px 0; margin:0; }
  ```

**Verificación**: entrar a Historial con "Todas" seleccionado, confirmar que
las barras aparecen ordenadas de mayor a menor y que cambiar el filtro de
mes recalcula el panel. Probar con un mes sin días cumplidos (debe mostrar
el mensaje vacío, no romperse).

**Changelog/versión**: `1.10.0` — "Balance por grupo muscular".

---

## Feature 5 — Nota libre por semana (Medio)

**Qué hace**: textarea para anotar cómo fue la semana (lesiones, ajustes,
etc.), separado de las notas por ejercicio que ya existen. Se guarda sola al
salir del campo (mismo patrón que el resto de los inputs de la app).

**Diseño — Schema** (`api/db/schema.sql`, al final, bloque nuevo):
```sql
-- ============================================================
-- weeks.note: nota libre de la semana completa (cómo se sintió,
-- lesiones, ajustes), separada de exercises.note que es por
-- ejercicio. Nullable — la mayoría de semanas no van a tener nota.
-- ============================================================
ALTER TABLE weeks ADD COLUMN note TEXT NULL AFTER monday_date;
```
Correr esta migración contra la BD local (PDO, ver sección "Entorno") antes
de tocar el backend. Documentar el mismo `ALTER TABLE` en el README bajo
"Pendiente de correr en producción".

**Diseño — Backend**:
- `api/week_helpers.php` → `fetch_week_detail()`: agregar una query para
  traer `note` y devolverla en el array de salida:
  ```php
  $stmtNote = $pdo->prepare('SELECT note FROM weeks WHERE id = :id');
  $stmtNote->execute(['id' => $weekId]);
  $note = $stmtNote->fetchColumn();
  // ... y en el return:
  return ['monday_date' => $mondayDate, 'note' => $note !== false ? ($note ?? '') : '', 'days' => $days];
  ```
- `api/weeks.php`: agregar un branch `PUT` (hoy solo tiene GET/POST/DELETE),
  antes del `respond_error('Método no permitido.', 405);` final:
  ```php
  if ($method === 'PUT') {
      if ($date === null) {
          respond_error('Falta el parámetro date.', 422);
      }
      $weekId = find_week_id($pdo, $date);
      if ($weekId === null) {
          respond_error('Semana no encontrada.', 404);
      }
      $body = read_json_body();
      if (!array_key_exists('note', $body)) {
          respond_error('Nada que actualizar.', 422);
      }
      $pdo->prepare('UPDATE weeks SET note = :n WHERE id = :id')
          ->execute(['n' => (string) $body['note'], 'id' => $weekId]);
      respond_ok(fetch_week_detail($pdo, $weekId, $date));
  }
  ```
- `api/import.php`: al resolver `$weekId` (tanto si es nueva como si ya
  existía), agregar `UPDATE weeks SET note = :n WHERE id = :id` con
  `(string) ($w['note'] ?? '')` — así una semana reimportada también
  actualiza su nota (opcional/retrocompatible: backups viejos sin `note`
  simplemente la dejan vacía).

**Diseño — Frontend**:
- `applyWeekDetail(key, detail)`: cambiar `state.weeks[key] = { days };`
  por `state.weeks[key] = { days, note: detail.note || '' };`
- `buildExportPayload()`: agregar `if(week.note) weekPayload.note =
  week.note;` (mismo patrón condicional que ya usa `overrides`).
- **`index.html`**: agregar entre `.day-rack` y `.summary-strip` (dentro de
  `#view-hoy`):
  ```html
  <div class="week-note-panel" id="week-note-panel">
    <label for="week-note-input" class="week-note-label">Nota de la semana</label>
    <textarea id="week-note-input" class="week-note-input" rows="2" placeholder="Cómo te sentiste, lesiones, ajustes…"></textarea>
  </div>
  ```
- `js/app.js`, nueva función llamada desde `renderAll()`:
  ```js
  function renderWeekNote(){
    const el = document.getElementById('week-note-input');
    const panel = document.getElementById('week-note-panel');
    const week = currentWeek();
    panel.classList.toggle('hidden', !week);
    if(!week) return;
    if(document.activeElement !== el) el.value = week.note || '';
  }
  ```
  (el chequeo de `document.activeElement` evita pisar lo que el usuario está
  escribiendo si por algún motivo se dispara un re-render mientras el
  textarea tiene foco — incluirlo en `renderAll()`).
- Listener de guardado (junto a los demás listeners de nivel superior, cerca
  de donde vive `rules-save-btn`):
  ```js
  document.getElementById('week-note-input').addEventListener('focusout', async (e)=>{
    if(!state.activeWeek) return;
    const week = currentWeek();
    const val = e.target.value;
    if(week.note === val) return;
    week.note = val;
    try{ await Api.put(`api/weeks.php?date=${encodeURIComponent(state.activeWeek)}`, { note: val }); }
    catch(err){ showToast(err.message); }
  });
  ```
- **CSS**:
  ```css
  .week-note-panel{ background:var(--surface); border:1px solid var(--line); border-radius:14px; padding:12px 14px; margin-bottom:16px; }
  .week-note-label{ display:block; font-size:9.5px; color:var(--text-faint); text-transform:uppercase; letter-spacing:.04em; font-weight:600; margin-bottom:6px; }
  .week-note-input{
    width:100%; background:transparent; border:none; color:var(--text); font-family:var(--font-body);
    font-size:12px; line-height:1.5; resize:vertical; padding:0; min-height:36px;
  }
  .week-note-input:focus{ outline:none; }
  .week-note-input::placeholder{ color:var(--text-faint); }
  ```

**Verificación**: escribir una nota, cambiar de vista y volver, confirmar
que persiste; cambiar de semana y confirmar que cada semana tiene su propia
nota (no se mezclan); recargar la página y confirmar que sigue ahí (viene
de la API, no de memoria); exportar datos y confirmar que el JSON incluye
`note` en las semanas que la tienen.

**Changelog/versión**: `1.11.0` — "Nota libre por semana".

---

## Feature 6 — Progresión sugerida (Medio)

**Qué hace**: en el detalle expandido de un ejercicio (el que ya compara
contra la semana pasada), si la semana pasada ese mismo ejercicio se marcó
como hecho y su kg es numérico, sugiere un próximo peso (kg de la semana
pasada + incremento fijo).

**Decisión de diseño**: el incremento es una constante fija en el frontend,
**no editable desde Ajustes** — sumar esto a `RULES`/`app_settings`
obligaría a que ese endpoint acepte decimales (hoy `api/settings.php` hace
`(int) $value` a todas las reglas), lo cual es un cambio de mayor alcance
que no vale la pena para esta feature. Si en el futuro se quiere hacer
editable, extender `RULES`/`app_settings` para permitir floats sería el
camino, pero queda fuera de esta tanda.

**Diseño**:
- Constante nueva cerca de `RULES` en `js/app.js`:
  ```js
  const PROGRESSION_INCREMENT_KG = 2.5;
  ```
- Modificar `exerciseRowHtml()`, dentro del branch `if(expanded)` donde ya
  se resuelve `prevEx` — agregar una línea de sugerencia al final del
  `ex-detail` existente, solo si `prevEx.done` y su kg es numérico:
  ```js
  if(expanded){
    const prevEx = findExerciseInPrevWeek(ex.name);
    if(!prevEx){
      detailHtml = `<div class="ex-detail"><p class="ex-detail-empty">Sin datos de la semana pasada para este ejercicio.</p></div>`;
    } else {
      const prevKg = parseFloat(prevEx.kg);
      let suggestionHtml = '';
      if(prevEx.done && !isNaN(prevKg)){
        const suggested = prevKg + PROGRESSION_INCREMENT_KG;
        const suggestedLabel = Number.isInteger(suggested) ? suggested : suggested.toFixed(1);
        suggestionHtml = `<div class="ex-detail-suggestion">Sugerido esta semana: <strong>${suggestedLabel} kg</strong></div>`;
      }
      detailHtml = `
        <div class="ex-detail">
          <div class="ex-detail-label">Semana pasada</div>
          <div class="ex-detail-grid">
            <div class="ex-detail-item"><span class="k">Kg</span><span class="v">${comparisonHtml(ex.kg, prevEx.kg)}</span></div>
            <div class="ex-detail-item"><span class="k">Rep</span><span class="v">${comparisonHtml(ex.reps, prevEx.reps)}</span></div>
            <div class="ex-detail-item"><span class="k">Ser</span><span class="v">${comparisonHtml(ex.series, prevEx.series)}</span></div>
          </div>
          ${suggestionHtml}
        </div>`;
    }
  }
  ```
  (Nota: esto reemplaza el bloque `if(!prevEx){...} else {...}` que ya
  existe dentro de `exerciseRowHtml()` — no es código nuevo aparte, es
  editar el que ya está ahí.)
- **CSS**:
  ```css
  .ex-detail-suggestion{ margin-top:10px; padding-top:10px; border-top:1px dashed var(--line); font-size:11px; color:var(--text-dim); }
  .ex-detail-suggestion strong{ color:var(--accent); font-family:var(--font-mono); }
  ```

**Verificación**: expandir (chevron) un ejercicio que la semana pasada se
marcó como hecho con kg numérico — debe verse la línea "Sugerido esta
semana: X kg". Expandir uno que la semana pasada NO se marcó como hecho, o
sin kg numérico — no debe aparecer la línea (solo la grilla de comparación
de siempre).

**Changelog/versión**: `1.12.0` — "Progresión sugerida".

---

## Feature 7 — Backup automático (Medio)

**Qué hace**: script PHP que vuelca todas las semanas/ejercicios/overrides a
un JSON (mismo formato que exporta el frontend), pensado para correr
semanalmente vía cron. **No hay acceso al hosting de producción desde acá**,
así que esta feature se construye y se prueba localmente completa, pero el
cron real se documenta para que el usuario lo configure él mismo en cPanel.

**Diseño**:
- Nuevo archivo `api/db/backup_export.php` (mismo patrón CLI-only que
  `api/db/create_user.php` — chequeo `PHP_SAPI !== 'cli'` al principio):
  ```php
  <?php
  declare(strict_types=1);

  /**
   * Backup automático: vuelca todas las semanas a un JSON con el mismo
   * formato que exporta el frontend (Perfil > Exportar datos), en
   * api/db/backups/. Pensado para correr semanalmente vía cron (cPanel >
   * Cron Jobs no necesita acceso SSH, ver README). Guarda solo los
   * últimos BACKUP_RETENTION archivos y borra el resto.
   *
   * Uso: php backup_export.php
   */

  if (PHP_SAPI !== 'cli') {
      http_response_code(403);
      exit('Este script solo se puede ejecutar por línea de comandos.');
  }

  require __DIR__ . '/../config.php';

  const BACKUP_RETENTION = 14;
  $backupDir = __DIR__ . '/backups';
  if (!is_dir($backupDir)) {
      mkdir($backupDir, 0750, true);
  }

  $weeks = $pdo->query('SELECT id, monday_date, note FROM weeks ORDER BY monday_date')->fetchAll();
  $payload = [];
  $exStmt = $pdo->prepare('SELECT day_key, name, kg, reps, series, note, done FROM exercises WHERE week_id = :w ORDER BY day_key, sort_order, id');
  $ovStmt = $pdo->prepare('SELECT day_key, group_name, notes, migrated_from FROM week_day_overrides WHERE week_id = :w');

  foreach ($weeks as $w) {
      $weekId = (int) $w['id'];
      $days = [];
      $exStmt->execute(['w' => $weekId]);
      foreach ($exStmt->fetchAll() as $row) {
          $days[$row['day_key']][] = [
              'name' => $row['name'], 'kg' => $row['kg'], 'reps' => $row['reps'],
              'series' => $row['series'], 'note' => $row['note'], 'done' => (bool) $row['done'],
          ];
      }
      $entry = ['monday_date' => $w['monday_date'], 'note' => $w['note'] ?? '', 'days' => (object) $days];

      $ovStmt->execute(['w' => $weekId]);
      $overrides = [];
      foreach ($ovStmt->fetchAll() as $o) {
          $overrides[$o['day_key']] = ['group_name' => $o['group_name'], 'notes' => $o['notes'], 'migrated_from' => $o['migrated_from']];
      }
      if ($overrides) {
          $entry['overrides'] = (object) $overrides;
      }
      $payload[] = $entry;
  }

  $filename = sprintf('%s/backup-%s.json', $backupDir, date('Y-m-d-His'));
  file_put_contents($filename, json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
  echo "Backup escrito: {$filename} (" . count($payload) . " semanas)\n";

  $files = glob($backupDir . '/backup-*.json');
  sort($files);
  $excess = count($files) - BACKUP_RETENTION;
  for ($i = 0; $i < $excess; $i++) {
      unlink($files[$i]);
      echo "Eliminado backup viejo: {$files[$i]}\n";
  }
  ```
  (Nota: este script depende de `note` de la feature 5 — implementar la
  feature 5 antes que esta, o quitar `note` del payload/entry si por algún
  motivo se hace en otro orden.)
- **Proteger la carpeta de backups**: crear `api/db/backups/.htaccess` con
  ```
  Require all denied
  ```
  (mismo estilo Apache 2.4 que ya usa el `.htaccess` raíz). Como la carpeta
  se crea recién al primer run, commitear el `.htaccess` junto con un
  `.gitkeep` vacío para que la carpeta exista en el repo, y agregar a
  `.gitignore`:
  ```
  api/db/backups/*.json
  ```
  (los backups en sí — datos personales reales — nunca se commitean, solo
  la protección de la carpeta).
- **README.md**: agregar una sub-sección bajo "Despliegue" explicando cómo
  configurar el cron en cPanel (sin SSH, mismo patrón que ya documenta el
  repo para crear el usuario): cPanel → Cron Jobs → Add New Cron Job →
  comando `php /home/<usuario_cpanel>/<ruta_a_bitacora>/api/db/backup_export.php`,
  frecuencia sugerida semanal (ej. domingos 3am). Aclarar que los backups
  quedan en el servidor (protegidos por `.htaccess`) y se rotan solos —
  bajarlos requiere FTP, no hay UI para eso todavía.

**Verificación**: correr `php api/db/backup_export.php` (Windows: `php
api\db\backup_export.php`) contra la BD local, confirmar que crea
`api/db/backups/backup-<fecha>.json` con las 73 semanas y que el formato es
compatible con importar ese mismo archivo desde Perfil → Importar datos
(probarlo de verdad: no hace falta importarlo en la BD real, alcanza con
que `JSON.parse` lo lea bien y `payload` sea un array con la forma
esperada). Correrlo dos veces seguidas y confirmar que NO se acumulan más
de `BACKUP_RETENTION` archivos si se simulan corridas viejas (opcional,
solo si da tiempo — no bloqueante). Confirmar que pegar la URL del script
en el navegador (`http://localhost:8000/api/db/backup_export.php`) da 403,
no ejecuta el backup vía HTTP.

**Changelog/versión**: `1.13.0` — "Backup automático". Aclarar en el
changelog que el cron en sí lo tiene que dar de alta el usuario en cPanel
(no se puede automatizar desde acá).

---

## Feature 8 — Edición offline (Alto)

**Qué hace**: si se pierde la conexión mientras se edita un ejercicio ya
existente (marcar hecho, cambiar nombre/kg/reps/series/nota, borrar) o la
nota de una semana, el cambio se guarda en una cola local (IndexedDB) en vez
de perderse, y se reintenta solo al recuperar conexión. Conflictos se
resuelven con **last-write-wins** por timestamp (decisión del usuario).

**Alcance recortado a propósito** (para que sea terminable en una noche sin
arriesgar corrupción de datos): la cola offline **solo** cubre mutaciones
sobre recursos que ya existen (`PUT`/`DELETE` a `api/exercises.php`, `PUT` a
`api/weeks.php`). **Quedan fuera** (siguen fallando con el toast de error de
siempre si no hay conexión, sin cola): crear semana, agregar ejercicio,
migrar día, copiar semana pasada, importar datos, librería de ejercicios.
Motivo: esas acciones dependen de que el servidor asigne un ID nuevo o
resuelva lógica no trivial (la cadena de "Migrar día", la validación
transaccional de importar) — fingir eso localmente sin servidor es mucho
más riesgo que valor para esta tanda. Si más adelante se quiere ampliar el
alcance, el mismo mecanismo de cola se puede extender.

### 8.1 — Schema: `updated_at` en `exercises`

```sql
-- ============================================================
-- exercises.updated_at: habilita last-write-wins para la cola de
-- edición offline (ver js/offline-queue.js) — al reproducir una
-- mutación encolada, el backend compara su client_time contra este
-- valor y descarta la mutación si el registro ya tiene un cambio
-- más nuevo que el que se está reproduciendo.
-- ============================================================
ALTER TABLE exercises ADD COLUMN updated_at DATETIME NOT NULL
  DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at;
```
Correr contra la BD local y agregar al README ("Pendiente de correr en
producción"), igual que las demás migraciones de esta tanda.

### 8.2 — Backend: guardia de staleness en `api/exercises.php`

En el branch `PUT` (después de confirmar que el ejercicio existe, antes de
armar el `UPDATE`):
```php
if ($method === 'PUT') {
    $existing = ($id !== null) ? fetch_exercise($pdo, $id) : null;
    if ($existing === null) {
        respond_error('Ejercicio no encontrado.', 404);
    }

    $body = read_json_body();

    // client_time solo viene en mutaciones reproducidas desde la cola
    // offline (ver js/offline-queue.js) — si el registro ya tiene un
    // cambio más nuevo que este, se descarta en vez de pisarlo
    // (last-write-wins). Las ediciones normales en vivo no mandan
    // client_time y se comportan exactamente igual que siempre.
    //
    // IMPORTANTE — bug real encontrado y corregido durante la
    // implementación: comparar strtotime(client_time) contra
    // strtotime(updated_at) directamente falla si PHP y MySQL corren en
    // zonas horarias distintas (en este entorno, PHP en UTC y MySQL 6
    // horas atrás) — strtotime() interpreta el string naive de MySQL
    // como si ya estuviera en la zona de PHP, desfasando la comparación
    // y dejando pasar escrituras viejas como si fueran nuevas. La forma
    // correcta es comparar una DURACIÓN ("hace cuántos segundos fue
    // client_time", calculada con DateTime timezone-aware en PHP) contra
    // el propio NOW() de MySQL, no contra updated_at re-parseado por PHP
    // — así ambos lados de la comparación quedan en el reloj de MySQL.
    if (isset($body['client_time'])) {
        try {
            $clientDt = new DateTime((string) $body['client_time']);
            $nowUtc = new DateTime('now', new DateTimeZone('UTC'));
            $secondsAgo = max(0, $nowUtc->getTimestamp() - $clientDt->getTimestamp());

            $stmt = $pdo->prepare('SELECT (updated_at > (NOW() - INTERVAL :secs SECOND)) AS is_newer FROM exercises WHERE id = :id');
            $stmt->execute(['secs' => $secondsAgo, 'id' => $id]);
            if ((bool) $stmt->fetchColumn()) {
                respond_ok(array_merge(fetch_exercise($pdo, $id), ['stale' => true]));
            }
        } catch (Exception $e) {
            // client_time con formato inválido: se ignora el guard y se aplica normal.
        }
    }
    unset($body['client_time']);

    $editable = ['name', 'kg', 'reps', 'series', 'note', 'done'];
    // ... resto del branch PUT exactamente igual que hoy ...
}
```
(El resto de la función no cambia — solo se agrega este bloque de guardia
al principio del branch `PUT`, y se hace `unset($body['client_time'])`
antes del loop `foreach ($editable as $field)` para que ese campo nunca se
intente guardar como columna.)

### 8.3 — `js/offline-queue.js` (archivo nuevo)

Wrapper mínimo de IndexedDB, sin dependencias externas. Se carga en
`index.html` **antes** de `api.js` (api.js lo va a usar):

```js
(function(){
  const DB_NAME = 'bitacora-offline';
  const DB_VERSION = 1;
  const STORE = 'pending_mutations';

  function openDb(){
    return new Promise((resolve, reject)=>{
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = ()=>{
        const db = req.result;
        if(!db.objectStoreNames.contains(STORE)){
          db.createObjectStore(STORE, { keyPath: 'localId' });
        }
      };
      req.onsuccess = ()=> resolve(req.result);
      req.onerror = ()=> reject(req.error);
    });
  }

  function genId(){
    return (crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  async function add(method, path, body){
    const db = await openDb();
    const mutation = { localId: genId(), method, path, body: body || {}, queuedAt: Date.now() };
    return new Promise((resolve, reject)=>{
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).add(mutation);
      tx.oncomplete = ()=> resolve(mutation);
      tx.onerror = ()=> reject(tx.error);
    });
  }

  async function getAll(){
    const db = await openDb();
    return new Promise((resolve, reject)=>{
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = ()=> resolve(req.result);
      req.onerror = ()=> reject(req.error);
    });
  }

  async function remove(localId){
    const db = await openDb();
    return new Promise((resolve, reject)=>{
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(localId);
      tx.oncomplete = ()=> resolve();
      tx.onerror = ()=> reject(tx.error);
    });
  }

  async function count(){
    return (await getAll()).length;
  }

  // flushFn: función inyectada por api.js que sabe cómo reproducir una
  // mutación (evita import circular entre este archivo y api.js).
  async function flush(replayFn){
    const pending = (await getAll()).sort((a,b)=> a.queuedAt - b.queuedAt);
    let synced = 0, dropped = 0, stale = 0;
    for(const m of pending){
      try{
        const result = await replayFn(m);
        if(result && result.stale) stale++;
        await remove(m.localId);
        synced++;
      }catch(err){
        if(err.status === 404){ await remove(m.localId); dropped++; continue; }
        break; // sigue sin conexión u otro error - se reintenta en el próximo flush, sin tocar el resto de la cola
      }
    }
    return { synced, dropped, stale, pending: (await getAll()).length };
  }

  window.OfflineQueue = { add, getAll, remove, count, flush };
})();
```

### 8.4 — `js/api.js`: encolar en vez de fallar, y exponer replay

Reemplazar el archivo completo por (mismo comportamiento de siempre para
todo lo que no es queueable; ver comentarios inline con lo nuevo):

```js
(function () {
  'use strict';

  function isQueueable(method, path){
    if(method === 'PUT' && path.startsWith('api/exercises.php')) return true;
    if(method === 'DELETE' && path.startsWith('api/exercises.php')) return true;
    if(method === 'PUT' && path.startsWith('api/weeks.php')) return true;
    return false;
  }

  async function request(method, path, body, opts) {
    opts = opts || {};
    let res;
    try {
      res = await fetch(path, {
        method,
        credentials: 'same-origin',
        headers: body !== undefined ? { 'Content-Type': 'application/json' } : {},
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch (networkErr) {
      // opts.isReplay: esta llamada YA es una reproducción desde la cola
      // offline — si vuelve a fallar por red, no hay que reencolarla de
      // nuevo (OfflineQueue.flush ya la deja en la cola si esto tira).
      if (!opts.isReplay && window.OfflineQueue && isQueueable(method, path)) {
        await window.OfflineQueue.add(method, path, body);
        if (typeof Api.onQueueChange === 'function') Api.onQueueChange();
        return { __queued: true };
      }
      throw new Error('Sin conexión — no se pudo completar la acción.');
    }

    let json;
    try {
      json = await res.json();
    } catch (err) {
      throw new Error('Respuesta inválida del servidor.');
    }

    if (res.status === 401 && typeof Api.onUnauthorized === 'function') {
      Api.onUnauthorized();
    }

    if (!json.ok) {
      const err = new Error(json.error || 'Error desconocido.');
      err.status = res.status;
      throw err;
    }
    return json.data;
  }

  const Api = {
    get: (path) => request('GET', path),
    post: (path, body) => request('POST', path, body ?? {}),
    put: (path, body, opts) => request('PUT', path, body ?? {}, opts),
    del: (path, opts) => request('DELETE', path, undefined, opts),
    onUnauthorized: null,
    onQueueChange: null, // app.js lo asigna para actualizar el banner de pendientes
  };

  // Reproduce una mutación encolada contra el endpoint real. Para PUT a
  // exercises.php se agrega client_time (momento en que se hizo el cambio
  // originalmente offline, no el momento del replay) — es lo que el
  // backend usa para decidir si el cambio sigue siendo el más nuevo
  // (last-write-wins, ver api/exercises.php).
  Api.replayMutation = async function(mutation){
    const opts = { isReplay: true };
    if (mutation.method === 'PUT') {
      const body = mutation.path.startsWith('api/exercises.php')
        ? { ...mutation.body, client_time: new Date(mutation.queuedAt).toISOString() }
        : mutation.body;
      return request('PUT', mutation.path, body, opts);
    }
    if (mutation.method === 'DELETE') {
      return request('DELETE', mutation.path, undefined, opts);
    }
    throw new Error(`Método no reproducible: ${mutation.method}`);
  };

  window.Api = Api;
})();
```

### 8.5 — `js/app.js`: banner de estado + disparo de sync

- Nueva función + estado, cerca del bootstrap:
  ```js
  let queuePendingCount = 0;

  async function refreshOfflineBanner(){
    queuePendingCount = window.OfflineQueue ? await window.OfflineQueue.count() : 0;
    const banner = document.getElementById('offline-banner');
    if(!banner) return;
    const offline = !navigator.onLine;
    if(!offline && queuePendingCount === 0){ banner.classList.add('hidden'); return; }
    banner.classList.remove('hidden');
    banner.textContent = offline
      ? (queuePendingCount > 0 ? `Sin conexión — ${queuePendingCount} cambio${queuePendingCount===1?'':'s'} pendiente${queuePendingCount===1?'':'s'} de sincronizar.` : 'Sin conexión.')
      : `Sincronizando ${queuePendingCount} cambio${queuePendingCount===1?'':'s'}…`;
  }

  async function syncOfflineQueue(){
    if(!window.OfflineQueue || !navigator.onLine) return;
    const result = await window.OfflineQueue.flush(Api.replayMutation);
    if(result.synced > 0){
      await loadAppData(); // resincroniza todo el estado desde el servidor, más simple y seguro que parchear campo por campo
      let msg = `${result.synced} cambio${result.synced===1?'':'s'} sincronizado${result.synced===1?'':'s'}.`;
      if(result.stale > 0) msg += ` ${result.stale} se descartó${result.stale===1?'':'aron'} por ser más viejo${result.stale===1?'':'s'} que un cambio posterior.`;
      showToast(msg);
    }
    await refreshOfflineBanner();
  }

  window.addEventListener('online', syncOfflineQueue);
  window.addEventListener('offline', refreshOfflineBanner);
  Api.onQueueChange = refreshOfflineBanner;
  ```
- En `toggleExercise`/focusout de campos/`deleteExercise`/nota de ejercicio
  ya funcionan sin cambios adicionales porque todos actualizan el estado
  local ANTES de esperar la respuesta de red (o, en el caso de
  `toggleExercise` después del refactor de la feature 3, con un valor
  calculado localmente, no leído del response) — así que un `{__queued:
  true}` en vez de tirar error no rompe nada de lo que ya existe. **No
  hace falta tocar esas funciones de nuevo en esta feature.**
- Llamar `refreshOfflineBanner()` una vez dentro de `loadAppData()` (al
  final, junto a los demás `render*()`), y llamar `syncOfflineQueue()` una
  vez al final del `bootstrap()` (por si quedó una cola sin sincronizar de
  una sesión anterior que se cerró offline).

### 8.6 — `index.html`

- Agregar antes de `js/api.js`:
  `<script src="js/offline-queue.js" defer></script>`
- Agregar el banner, como primer hijo de `#app-shell` (para que quede fijo
  arriba de todo):
  `<div class="offline-banner hidden" id="offline-banner"></div>`

### 8.7 — CSS

```css
.offline-banner{
  position:fixed; top:0; left:0; right:0; z-index:30;
  background:var(--pending); color:var(--accent-ink);
  font-size:11px; font-weight:600; text-align:center;
  padding:7px 10px; max-width:520px; margin-inline:auto;
}
```

### 8.8 — `sw.js`

Agregar `'js/offline-queue.js'` a `SHELL_ASSETS` e incrementar `CACHE_NAME`
a `bitacora-shell-v15` (esto de todos modos hay que hacerlo por todas las
demás features que tocan `index.html`/`css`/`js` — hacerlo una sola vez acá
al final de toda la tanda, no en cada feature, para no generar 8 bumps de
cache innecesarios). **Aclaración de orden**: como excepción a la regla de
"un commit por feature", el bump de `CACHE_NAME` se hace en el commit de
esta última feature (la 8), cubriendo todos los cambios de shell de la
noche completa.

### Verificación (la más importante de toda la tanda)

1. `php -S localhost:8000`, login, cargar la app normal (online).
2. Abrir DevTools → Network → marcar "Offline" (o desconectar el wifi si se
   prueba desde el celular).
3. Marcar un ejercicio como hecho, editar el kg de otro, borrar un tercero,
   escribir una nota de semana. Confirmar que:
   - No aparecen toasts de error.
   - El banner de "Sin conexión — N cambios pendientes" aparece y el
     número sube con cada cambio.
   - Los cambios se ven reflejados en la UI de inmediato (estado local).
4. Recargar la página **todavía offline** (F5) — confirmar que el shell
   carga (service worker) y que `OfflineQueue.count()` sigue reportando los
   cambios pendientes (persistieron en IndexedDB, no en memoria).
5. Volver a marcar "Online" en DevTools. Confirmar que:
   - Se dispara la sincronización sola (sin recargar la página).
   - El toast final dice cuántos cambios se sincronizaron.
   - El banner desaparece.
   - Los datos en la BD local (verificar con una query PDO rápida) reflejan
     los cambios hechos offline.
6. **Probar el conflicto real**: con dos "sesiones" (dos pestañas del
   mismo login), poner la pestaña A offline, editar el kg de un ejercicio en
   la pestaña A (queda encolado) Y en la pestaña B (online, se guarda
   directo con un `updated_at` más nuevo). Reconectar la pestaña A y
   confirmar que su cambio encolado (más viejo) se descarta (`stale:true`)
   en vez de pisar el de la pestaña B, y que el toast lo menciona.

**Changelog/versión**: `1.14.0` — "Edición offline (alcance acotado)".
Aclarar explícitamente en el changelog qué acciones quedan fuera del
alcance (crear semana, agregar ejercicio, migrar día, copiar semana,
importar, librería), para que quede documentado y no parezca un olvido.

---

## Registro de progreso

Actualizar esta tabla a medida que se completa cada feature, para que
cualquier continuación de esta sesión sepa exactamente dónde retomar sin
tener que releer todo el documento.

| # | Feature | Estado | Commit | Notas |
|---|---------|--------|--------|-------|
| 1 | Volumen x día | ✅ Hecho | 8ad1785 | Verificado en navegador (chip 2,000 kg con 50x10x4), sin errores de consola |
| 2 | Compartir día/semana como imagen | ✅ Hecho | 1d4c00a | Verificado en navegador (descarga día y semana OK, 154KB PNG válido). Bug encontrado y corregido en el plan: stopPropagation() en el listener delegado llegaba tarde por el orden de bubbling, se cambió a un guard en el listener de la tarjeta. Warning de consola no bloqueante de html2canvas documentado en CHANGELOG. |
| 3 | PR automático | ✅ Hecho | 3c88a66 | Verificado con "Jalones al pecho" (mejor histórico real 60kg): toast de récord al marcar 65kg, sin toast al desmarcar ni con valores menores. Datos de prueba revertidos y confirmados en la BD. |
| 4 | Balance por grupo muscular | ✅ Hecho | 0a2ed10 | Verificado con datos reales: "Todas" y filtro por mes ambos recalculan bien, ordenado desc, sin errores nuevos en consola. |
| 5 | Nota libre por semana | ✅ Hecho | f488daa | Migración corrida en BD local. Verificado: guarda, persiste tras reload, no se mezcla entre semanas, aparece en export. Dato de prueba escrito y revertido en la BD real, confirmado por consulta directa. |
| 6 | Progresión sugerida | ✅ Hecho | 0b66a98 | Verificado con datos reales: sugiere 57.5kg (55+2.5) y 37.5kg (35+2.5) cuando la semana pasada estaba done, no sugiere nada cuando no lo estaba. Solo lectura, sin escrituras a la BD. |
| 7 | Backup automático | ✅ Hecho | 298ed9f | Verificado: 73 semanas volcadas correctamente, formato compatible con import.php, HTTP bloqueado (403), rotación probada forzando 18 archivos → quedaron 14. Archivos de prueba limpiados del disco (gitignored de todos modos). Cron real no configurado (sin acceso a producción) — documentado en README. |
| 8 | Edición offline | ✅ Hecho | 158d19d | Verificado end-to-end: toggle/edit/delete offline se encolan sin error, persisten en IndexedDB tras reload, sincronizan solos al reconectar, toast resume synced/stale. Acciones excluidas (agregar ejercicio) fallan normal, no se encolan. Conflicto real probado (edit offline viejo vs edit online nuevo) — el viejo se descarta, gana el nuevo. **Bug real encontrado y corregido durante la verificación**: comparación de timestamps con strtotime() fallaba por desfase de zona horaria PHP↔MySQL (6 horas en este entorno) — el guard nunca rechazaba nada. Corregido comparando una duración contra NOW() de MySQL en vez de timestamps absolutos re-parseados por PHP. Todos los datos de prueba (exercises 2139, 2140) limpiados y confirmados por consulta directa a la BD — conteo final de ejercicios idéntico al inicial (1842).

## Estado final: 8/8 features completas

Backup de seguridad de la BD local (previo a cualquier migración): hecho,
en `scratchpad/db-backup/*.json` (7 tablas, 73 semanas, 1842 ejercicios).
Al cierre de la tanda, la BD local tiene el mismo conteo de ejercicios
(1842) y semanas (73) que al inicio — todos los datos de prueba usados
para verificar cada feature fueron revertidos o eran filas descartables
creadas y borradas dentro de la misma verificación.

Migraciones corridas en local durante esta tanda (pendientes en
producción, ver README → "Pendiente de correr en producción"):
- `ALTER TABLE weeks ADD COLUMN note TEXT NULL AFTER monday_date;`
- `ALTER TABLE exercises ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at;`

Versión final de la app: **1.14.0** (arrancó en 1.6.0). `sw.js` en
`bitacora-shell-v15`. 8 commits nuevos en `master`, uno por feature.

### Pendiente para cuando el usuario esté disponible

- Configurar el cron real de `api/db/backup_export.php` en cPanel
  (Producción) — ver README, sección "Backup automático (cron)".
  No se pudo hacer desde esta sesión por no tener acceso al hosting.
- Correr las dos migraciones de arriba contra la base de producción
  antes de subir el código de esta tanda (mismo patrón que ya usa el
  repo — ver README).
- Revisar y decidir si este archivo (`PLAN-8-FEATURES.md`) se
  commitea como referencia histórica o se borra — quedó fuera de los
  8 commits de features a propósito, sin pedirlo explícitamente.
