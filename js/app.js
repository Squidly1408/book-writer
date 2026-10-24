/* Book Writer — a local-first writing app. No build step, no dependencies. */
(() => {
  'use strict';

  // ---------- Constants & helpers ----------
  const LS_KEY = 'bookwriter:data:v1';
  const SS_KEY = 'bookwriter:session:v1';
  const STATUSES = [['idea', 'Idea'], ['draft', 'Draft'], ['revised', 'Revised'], ['final', 'Final']];
  const STATUS_KEYS = STATUSES.map(s => s[0]);
  const DEFAULT_SETTINGS = { theme: 'system', dailyGoal: 1000, sessionGoal: 500, font: 'serif', fontSize: 19 };

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const uid = () => Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-5);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const countWords = s => { const m = String(s || '').match(/\S+/g); return m ? m.length : 0; };
  const fmt = n => Number(n || 0).toLocaleString();
  const clampInt = (v, min, max, dflt) => { const n = parseInt(v, 10); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : dflt; };
  const dateKey = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const todayKey = () => dateKey(new Date());
  const arr = v => (Array.isArray(v) ? v : []);
  const plural = (n, w) => `${fmt(n)} ${w}${n === 1 ? '' : 's'}`;
  const hue = s => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };

  const svg = (p, size = 18, extra = '') => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${p}</svg>`;
  const ICONS = {
    grip: `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></svg>`,
    chev: svg('<path d="m9 6 6 6-6 6"/>', 16),
    dots: `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="19" cy="12" r="1.7"/></svg>`,
    x: svg('<path d="M18 6 6 18M6 6l12 12"/>'),
    edit: svg('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>'),
    trash: svg('<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>'),
    sun: svg('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>', 20),
    moon: svg('<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/>', 20),
    auto: svg('<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18Z" fill="currentColor"/>', 20),
  };

  // ---------- Data model ----------
  const newScene = (title = 'Untitled scene', content = '', synopsis = '', status = 'idea') =>
    ({ id: uid(), title, content, synopsis, status, words: countWords(content) });
  const newChapter = (title = 'New chapter') => ({ id: uid(), title, summary: '', collapsed: false, scenes: [] });
  function newProject(title = 'Untitled book') {
    const ch = newChapter('Chapter 1');
    ch.scenes.push(newScene('Scene 1'));
    return { id: uid(), title, synopsis: '', createdAt: Date.now(), updatedAt: Date.now(), chapters: [ch], characters: [], locations: [] };
  }

  function sampleProject() {
    const p = newProject('The Lighthouse Keeper');
    p.synopsis = 'A retired cartographer takes a job tending a decommissioned lighthouse, and discovers the light still answers someone out at sea.';
    const c1 = p.chapters[0];
    c1.title = 'Chapter 1 — Arrival';
    c1.summary = 'Mara arrives on the island and meets the last keeper.';
    c1.scenes = [
      newScene('Welcome to Book Writer',
`This is a sample book so you can see how everything fits together. Delete it whenever you like.

A few things to try:

• The panel on the left holds your chapters and scenes. Drag the ⋮⋮ handles to reorder them, even moving a scene into another chapter.
• Switch to Plan (top bar) to outline: write a synopsis for each scene, set its status and rearrange cards.
• The people icon opens character and location notes beside your draft.
• The corners icon (or Ctrl+Shift+F) turns on focus mode. Press Esc to leave it.
• Your session and daily word goals are tracked at the bottom. Click the target icon to change them.
• Everything saves automatically in this browser. Use the ⋯ menu to back up to JSON or export your manuscript as .md or .txt.

Happy writing.`, 'How the app works.', 'final'),
      newScene('The ferry', 'The ferry left her on the jetty with two suitcases and a box of maps that had been out of date for thirty years.', 'Mara crosses to the island in a storm.', 'draft'),
    ];
    const c2 = newChapter('Chapter 2 — The Light');
    c2.summary = 'The lamp turns on by itself.';
    c2.scenes = [newScene('First night', '', 'Mara sees the beam sweep the water although the lamp was disconnected decades ago.', 'idea')];
    p.chapters.push(c2);
    p.characters = [
      { id: uid(), name: 'Mara Quill', role: 'Protagonist', notes: 'Sixty-one. Retired cartographer. Precise, stubborn, secretly lonely.\nWants: to be useful again.\nFears: open water.' },
      { id: uid(), name: 'Tobias Venn', role: 'The last keeper', notes: 'Left the island in 1989. Writes letters that arrive without stamps.' },
    ];
    p.locations = [
      { id: uid(), name: 'Gull Rock Lighthouse', type: 'Setting', notes: 'Whitewashed tower, 112 steps. The lamp room smells of brass polish and salt.' },
    ];
    return p;
  }

  function normalizeProject(p) {
    p = p && typeof p === 'object' ? p : {};
    const out = {
      id: String(p.id || uid()),
      title: String(p.title || 'Untitled book'),
      synopsis: String(p.synopsis || ''),
      createdAt: Number(p.createdAt) || Date.now(),
      updatedAt: Number(p.updatedAt) || Date.now(),
      chapters: arr(p.chapters).map(c => ({
        id: String(c.id || uid()),
        title: String(c.title ?? 'Chapter'),
        summary: String(c.summary || ''),
        collapsed: !!c.collapsed,
        scenes: arr(c.scenes).map(s => {
          const content = String(s.content ?? '');
          return {
            id: String(s.id || uid()),
            title: String(s.title ?? 'Scene'),
            content,
            synopsis: String(s.synopsis || ''),
            status: STATUS_KEYS.includes(s.status) ? s.status : 'idea',
            words: countWords(content),
          };
        }),
      })),
      characters: arr(p.characters).map(c => ({ id: String(c.id || uid()), name: String(c.name || ''), role: String(c.role || ''), notes: String(c.notes || '') })),
      locations: arr(p.locations).map(l => ({ id: String(l.id || uid()), name: String(l.name || ''), type: String(l.type || ''), notes: String(l.notes || '') })),
    };
    return out;
  }

  function normalize(d) {
    if (!d || typeof d !== 'object') throw new Error('Invalid data');
    if (!Array.isArray(d.projects) && Array.isArray(d.chapters)) d = { projects: [d] }; // a single book
    if (!Array.isArray(d.projects)) throw new Error('Invalid data');
    const settings = { ...DEFAULT_SETTINGS, ...(d.settings && typeof d.settings === 'object' ? d.settings : {}) };
    if (!['system', 'light', 'dark'].includes(settings.theme)) settings.theme = 'system';
    if (!['serif', 'sans', 'mono'].includes(settings.font)) settings.font = 'serif';
    settings.dailyGoal = clampInt(settings.dailyGoal, 0, 100000, 1000);
    settings.sessionGoal = clampInt(settings.sessionGoal, 0, 100000, 500);
    settings.fontSize = clampInt(settings.fontSize, 14, 28, 19);
    const daily = {};
    if (d.daily && typeof d.daily === 'object') for (const [k, v] of Object.entries(d.daily)) if (/^\d{4}-\d{2}-\d{2}$/.test(k) && Number.isFinite(+v)) daily[k] = +v;
    const s = {
      version: 1,
      settings,
      projects: d.projects.map(normalizeProject),
      currentProjectId: d.currentProjectId,
      currentSceneId: d.currentSceneId,
      view: d.view === 'plan' ? 'plan' : 'write',
      daily,
    };
    if (!s.projects.length) s.projects.push(newProject());
    if (!s.projects.some(p => p.id === s.currentProjectId)) s.currentProjectId = s.projects[0].id;
    ensureCurrentScene(s);
    return s;
  }

  function ensureCurrentScene(s) {
    const p = s.projects.find(x => x.id === s.currentProjectId);
    const all = p.chapters.flatMap(c => c.scenes);
    if (!all.some(x => x.id === s.currentSceneId)) s.currentSceneId = all[0] ? all[0].id : null;
  }

  function defaultState() {
    const p = sampleProject();
    return { version: 1, settings: { ...DEFAULT_SETTINGS }, projects: [p], currentProjectId: p.id, currentSceneId: p.chapters[0].scenes[0].id, view: 'write', daily: {} };
  }

  function load() {
    let raw = null;
    try {
      raw = localStorage.getItem(LS_KEY);
      if (raw) return normalize(JSON.parse(raw));
    } catch (e) {
      console.warn('Book Writer: could not load saved data', e);
      storageProblem = true;
      // Keep the unreadable data under a separate key so it is never silently lost.
      try { if (raw) localStorage.setItem(LS_KEY + ':unreadable-' + Date.now(), raw); } catch (err) { /* ignore */ }
    }
    return defaultState();
  }

  let storageProblem = false;
  let state = load();

  // Session word counter survives reloads within the same tab.
  let session = (() => {
    try { const s = JSON.parse(sessionStorage.getItem(SS_KEY)); if (s && typeof s.words === 'number') return s; } catch (e) { /* ignore */ }
    return { words: 0, start: Date.now(), toasted: false };
  })();
  const saveSession = () => { try { sessionStorage.setItem(SS_KEY, JSON.stringify(session)); } catch (e) { /* ignore */ } };

  // ---------- Getters ----------
  const proj = () => state.projects.find(p => p.id === state.currentProjectId);
  const allScenes = (p = proj()) => p.chapters.flatMap(c => c.scenes);
  const chapterWords = ch => ch.scenes.reduce((a, s) => a + s.words, 0);
  const projectWords = p => p.chapters.reduce((a, c) => a + chapterWords(c), 0);
  function findScene(id, p = proj()) {
    if (!id) return null;
    for (const ch of p.chapters) {
      const scene = ch.scenes.find(s => s.id === id);
      if (scene) return { chapter: ch, scene };
    }
    return null;
  }
  const findChapter = id => proj().chapters.find(c => c.id === id);

  // ---------- Saving ----------
  let saveTimer = null;
  function setSaveStatus(text, error = false) {
    el.saveStatus.textContent = text;
    el.saveStatus.classList.toggle('error', error);
  }
  function scheduleSave() {
    setSaveStatus('Saving…');
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveNow, 450);
  }
  function saveNow() {
    clearTimeout(saveTimer);
    saveTimer = null;
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(state));
      setSaveStatus('Saved');
      return true;
    } catch (e) {
      setSaveStatus('Not saved', true);
      toast('Could not save: browser storage is full or blocked. Back up to JSON from the ⋯ menu.', 'error', 6000);
      return false;
    }
  }
  function touch() {
    const p = proj();
    if (p) p.updatedAt = Date.now();
    scheduleSave();
  }

  function recordDelta(delta) {
    if (!delta) return;
    session.words += delta;
    const k = todayKey();
    state.daily[k] = (state.daily[k] || 0) + delta;
    saveSession();
  }

  // ---------- Elements & UI state ----------
  const el = {};
  ['app', 'btnBinder', 'btnProjects', 'projectName', 'saveStatus', 'btnNotes', 'btnFocus', 'btnTheme', 'btnMenu',
    'binder', 'binderTotal', 'binderScroll', 'binderList', 'btnAddChapter', 'writeView', 'writeEmpty', 'btnEmptyAdd',
    'editorWrap', 'crumbChapter', 'sceneTitle', 'sceneStatus', 'btnPrev', 'btnNext', 'btnDeleteScene', 'editor',
    'statusbar', 'wcScene', 'wcChapter', 'wcBook', 'goalSession', 'goalDaily', 'btnGoals', 'btnExitFocus',
    'planView', 'planScroll', 'notes', 'countChars', 'countLocs', 'btnCloseNotes', 'notesSearch', 'btnAddNote',
    'notesList', 'scrim', 'menu', 'modalRoot', 'toasts', 'importFile'].forEach(id => { el[id] = document.getElementById(id); });

  const mqBinder = window.matchMedia('(min-width: 760px)');
  const mqNotes = window.matchMedia('(min-width: 1100px)');
  const ui = {
    binderOpen: mqBinder.matches,
    notesOpen: false,
    notesTab: 'characters',
    notesQuery: '',
    expanded: new Set(),
    focus: false,
    loadedSceneId: null,
    dailyToastKey: null,
  };

  el.sceneStatus.innerHTML = STATUSES.map(([k, l]) => `<option value="${k}">${l}</option>`).join('');

  // ---------- Rendering ----------
  function renderAll() {
    applyTheme();
    renderTopbar();
    renderBinder();
    renderMain();
    renderNotes();
    renderLayout();
  }

  function applyTheme() {
    const t = state.settings.theme;
    if (t === 'system') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', t);
    el.btnTheme.innerHTML = t === 'light' ? ICONS.sun : t === 'dark' ? ICONS.moon : ICONS.auto;
    const label = `Theme: ${t === 'system' ? 'match system' : t}`;
    el.btnTheme.title = label + ' (click to change)';
    el.btnTheme.setAttribute('aria-label', label);
  }

  function renderTopbar() {
    const p = proj();
    el.projectName.textContent = p.title || 'Untitled book';
    document.title = `${p.title || 'Untitled book'} · Book Writer`;
    $$('.view-tabs [data-view]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.view === state.view)));
    el.btnNotes.setAttribute('aria-pressed', String(ui.notesOpen));
    el.btnBinder.setAttribute('aria-pressed', String(ui.binderOpen));
  }

  function renderLayout() {
    el.app.classList.toggle('binder-open', ui.binderOpen);
    el.app.classList.toggle('notes-open', ui.notesOpen);
    el.btnNotes.setAttribute('aria-pressed', String(ui.notesOpen));
    el.btnBinder.setAttribute('aria-pressed', String(ui.binderOpen));
  }

  function sceneItemHTML(s) {
    return `<li class="scene-item ${s.id === state.currentSceneId ? 'active' : ''}" data-sort-item data-type="scene" data-id="${esc(s.id)}">
      <span class="handle" data-drag="scene" title="Drag to reorder">${ICONS.grip}</span>
      <button class="scene-link" data-act="open-scene"><span class="dot status-${s.status}"></span><span class="scene-name">${esc(s.title) || 'Untitled scene'}</span></button>
      <span class="wc" data-scene-wc="${esc(s.id)}">${fmt(s.words)}</span>
    </li>`;
  }

  function renderBinder() {
    const p = proj();
    el.binderList.innerHTML = p.chapters.map(ch => `
      <div class="chapter ${ch.collapsed ? 'collapsed' : ''}" data-sort-item data-type="chapter" data-id="${esc(ch.id)}">
        <div class="chapter-head">
          <span class="handle" data-drag="chapter" title="Drag to reorder">${ICONS.grip}</span>
          <button class="chev" data-act="toggle-chapter" aria-label="${ch.collapsed ? 'Expand' : 'Collapse'} chapter">${ICONS.chev}</button>
          <button class="chapter-name" data-act="toggle-chapter">${esc(ch.title) || 'Untitled chapter'}</button>
          <span class="wc" data-chapter-wc="${esc(ch.id)}">${fmt(chapterWords(ch))}</span>
          <button class="icon-btn sm" data-act="chapter-menu" aria-label="Chapter options" title="Chapter options">${ICONS.dots}</button>
        </div>
        <ul class="scene-list" data-sort-container="scene" data-chapter="${esc(ch.id)}">${ch.scenes.map(sceneItemHTML).join('')}</ul>
        <button class="add-scene" data-act="add-scene">+ Add scene</button>
      </div>`).join('') || '<p class="empty-hint">No chapters yet. Add one to begin.</p>';
    el.binderTotal.textContent = `${plural(projectWords(p), 'word')} · ${plural(p.chapters.length, 'chapter')}`;
  }

  function renderMain() {
    el.writeView.hidden = state.view !== 'write';
    el.planView.hidden = state.view !== 'plan';
    if (state.view === 'write') renderWrite(); else renderPlan();
  }

  function renderWrite() {
    const f = findScene(state.currentSceneId);
    el.editor.dataset.font = state.settings.font;
    el.editor.style.setProperty('--editor-size', state.settings.fontSize + 'px');
    if (!f) {
      el.writeEmpty.hidden = false;
      el.editorWrap.hidden = true;
      ui.loadedSceneId = null;
      updateStats();
      return;
    }
    el.writeEmpty.hidden = true;
    el.editorWrap.hidden = false;
    el.crumbChapter.textContent = f.chapter.title || 'Untitled chapter';
    if (document.activeElement !== el.sceneTitle || ui.loadedSceneId !== f.scene.id) el.sceneTitle.value = f.scene.title;
    el.sceneStatus.value = f.scene.status;
    el.sceneStatus.className = `status-select status-${f.scene.status}`;
    if (ui.loadedSceneId !== f.scene.id) {
      el.editor.value = f.scene.content;
      el.editor.scrollTop = 0;
      el.editor.setSelectionRange(0, 0);
      ui.loadedSceneId = f.scene.id;
    } else if (el.editor.value !== f.scene.content) {
      el.editor.value = f.scene.content;
    }
    const list = allScenes();
    const idx = list.findIndex(s => s.id === f.scene.id);
    el.btnPrev.disabled = idx <= 0;
    el.btnNext.disabled = idx >= list.length - 1;
    updateStats();
  }

  function setGoal(node, value, goal) {
    const v = Math.max(0, value);
    const pct = goal > 0 ? Math.min(100, (v / goal) * 100) : 0;
    $('.meter i', node).style.width = pct + '%';
    $('.goal-val', node).textContent = goal > 0 ? `${fmt(v)} / ${fmt(goal)}` : fmt(v);
    node.classList.toggle('done', goal > 0 && v >= goal);
  }

  function updateStats() {
    const p = proj();
    const f = findScene(state.currentSceneId);
    el.wcScene.textContent = fmt(f ? f.scene.words : 0);
    el.wcChapter.textContent = fmt(f ? chapterWords(f.chapter) : 0);
    el.wcBook.textContent = fmt(projectWords(p));
    const { sessionGoal, dailyGoal } = state.settings;
    const today = state.daily[todayKey()] || 0;
    setGoal(el.goalSession, session.words, sessionGoal);
    setGoal(el.goalDaily, today, dailyGoal);
  }

  function checkGoalToasts() {
    const { sessionGoal, dailyGoal } = state.settings;
    if (sessionGoal > 0 && session.words >= sessionGoal && !session.toasted) {
      session.toasted = true; saveSession();
      toast(`Session goal reached: ${fmt(sessionGoal)} words.`, 'ok');
    }
    const k = todayKey();
    const today = state.daily[k] || 0;
    if (dailyGoal > 0 && today >= dailyGoal && ui.dailyToastKey !== k) {
      ui.dailyToastKey = k;
      toast(`Daily goal reached: ${fmt(dailyGoal)} words today.`, 'ok');
    }
  }

  function updateCounts(f) {
    const sw = $(`[data-scene-wc="${CSS.escape(f.scene.id)}"]`, el.binderList);
    if (sw) sw.textContent = fmt(f.scene.words);
    const cw = $(`[data-chapter-wc="${CSS.escape(f.chapter.id)}"]`, el.binderList);
    if (cw) cw.textContent = fmt(chapterWords(f.chapter));
    const p = proj();
    el.binderTotal.textContent = `${plural(projectWords(p), 'word')} · ${plural(p.chapters.length, 'chapter')}`;
    updateStats();
  }

  // ----- Plan view -----
  function renderPlan() {
    const p = proj();
    const scroll = el.planScroll.scrollTop;
    const statusOptions = cur => STATUSES.map(([k, l]) => `<option value="${k}" ${k === cur ? 'selected' : ''}>${l}</option>`).join('');
    const sceneCount = allScenes(p).length;
    el.planScroll.innerHTML = `
      <div class="plan-intro">
        <div>
          <h1>${esc(p.title) || 'Untitled book'}</h1>
          <p>${plural(p.chapters.length, 'chapter')} · ${plural(sceneCount, 'scene')} · ${plural(projectWords(p), 'word')}</p>
        </div>
        <button class="btn sm" data-act="add-chapter">+ Chapter</button>
      </div>
      <section class="card plan-synopsis">
        <label for="planSynopsis">Book synopsis / premise</label>
        <textarea id="planSynopsis" class="bare" rows="3" data-field="synopsis" placeholder="What is this book about? Who wants what, and what stands in the way?">${esc(p.synopsis)}</textarea>
      </section>
      <div class="plan-chapters" data-sort-root data-sort-container="chapter">
        ${p.chapters.map(ch => `
          <section class="card plan-chapter" data-sort-item data-type="chapter" data-id="${esc(ch.id)}">
            <header>
              <span class="handle" data-drag="chapter" title="Drag to reorder chapter">${ICONS.grip}</span>
              <input class="plan-ch-title" data-field="ch-title" value="${esc(ch.title)}" placeholder="Chapter title" aria-label="Chapter title">
              <span class="wc">${plural(ch.scenes.length, 'scene')} · ${fmt(chapterWords(ch))} w</span>
              <button class="icon-btn sm" data-act="chapter-menu" aria-label="Chapter options" title="Chapter options">${ICONS.dots}</button>
            </header>
            <textarea class="bare plan-ch-summary" rows="1" data-field="ch-summary" placeholder="Chapter summary…" aria-label="Chapter summary">${esc(ch.summary)}</textarea>
            <div class="card-grid" data-sort-container="scene" data-chapter="${esc(ch.id)}" data-layout="grid">${ch.scenes.map(s => `
              <article class="scene-card status-${s.status}" data-sort-item data-type="scene" data-id="${esc(s.id)}">
                <div class="card-top">
                  <span class="handle" data-drag="scene" title="Drag to reorder scene">${ICONS.grip}</span>
                  <input class="card-title" data-field="sc-title" value="${esc(s.title)}" placeholder="Scene title" aria-label="Scene title">
                  <select class="card-status" data-field="sc-status" aria-label="Scene status">${statusOptions(s.status)}</select>
                </div>
                <textarea class="bare card-synopsis" data-field="sc-synopsis" rows="3" placeholder="What happens in this scene?" aria-label="Scene synopsis">${esc(s.synopsis)}</textarea>
                <div class="card-foot"><span class="wc">${plural(s.words, 'word')}</span><button class="link-btn" data-act="open-scene">Write →</button></div>
              </article>`).join('')}</div>
            <button class="btn sm ghost add-card" data-act="add-scene">+ Add scene</button>
          </section>`).join('')}
      </div>
      ${p.chapters.length ? '' : '<p class="empty-hint">No chapters yet.</p>'}
      <button class="btn block" data-act="add-chapter">+ Add chapter</button>`;
    el.planScroll.scrollTop = scroll;
    $$('.plan-ch-summary', el.planScroll).forEach(autoGrow);
  }

  function autoGrow(t) {
    t.style.height = 'auto';
    t.style.height = t.scrollHeight + 2 + 'px';
  }

  // ----- Notes panel -----
  function renderNotes() {
    const p = proj();
    el.countChars.textContent = p.characters.length;
    el.countLocs.textContent = p.locations.length;
    $$('#notes [data-tab]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === ui.notesTab)));
    const isChar = ui.notesTab === 'characters';
    const items = isChar ? p.characters : p.locations;
    const q = ui.notesQuery.trim().toLowerCase();
    const shown = q ? items.filter(n => [n.name, n.role, n.type, n.notes].join(' ').toLowerCase().includes(q)) : items;
    const sub = isChar ? 'role' : 'type';
    if (!shown.length) {
      el.notesList.innerHTML = `<div class="notes-empty">${q ? 'No matches.' : isChar ? 'No characters yet.<br>Add the people in your story.' : 'No locations yet.<br>Add the places in your story.'}</div>`;
      return;
    }
    el.notesList.innerHTML = shown.map(n => {
      const open = ui.expanded.has(n.id);
      const initial = (n.name.trim()[0] || '?').toUpperCase();
      return `<article class="note-card ${open ? 'open' : ''}" data-id="${esc(n.id)}">
        <button class="note-summary" data-act="toggle-note" aria-expanded="${open}">
          <span class="avatar ${isChar ? '' : 'loc'}" style="--h:${hue(n.name || n.id)}">${esc(initial)}</span>
          <span class="txt"><strong data-sum="name">${esc(n.name) || 'Unnamed'}</strong><small data-sum="sub">${esc(n[sub]) || (isChar ? 'No role yet' : 'No type yet')}</small></span>
          ${ICONS.chev}
        </button>
        <div class="note-body">
          <label class="field"><span>Name</span><input class="input" data-nf="name" value="${esc(n.name)}" autocomplete="off"></label>
          <label class="field"><span>${isChar ? 'Role' : 'Type'}</span><input class="input" data-nf="${sub}" value="${esc(n[sub])}" placeholder="${isChar ? 'e.g. Protagonist, mentor, rival' : 'e.g. City, room, planet'}" autocomplete="off"></label>
          <label class="field"><span>Notes</span><textarea class="textarea" data-nf="notes" rows="6" placeholder="${isChar ? 'Appearance, goals, fears, voice, backstory…' : 'Look, sounds, smells, history, who goes there…'}">${esc(n.notes)}</textarea></label>
          <button class="danger-link" data-act="delete-note">Delete ${isChar ? 'character' : 'location'}</button>
        </div>
      </article>`;
    }).join('');
  }

  // ---------- Actions ----------
  function setView(v) {
    if (state.view === v) return;
    if (state.view === 'write') flushEditor();
    state.view = v;
    scheduleSave();
    renderTopbar();
    renderMain();
  }

  function isOverlay(which) { return which === 'binder' ? !mqBinder.matches : !mqNotes.matches; }

  function openScene(id, { focus = true } = {}) {
    if (!findScene(id)) return;
    state.currentSceneId = id;
    if (state.view !== 'write') state.view = 'write';
    if (isOverlay('binder')) ui.binderOpen = false;
    scheduleSave();
    renderTopbar();
    renderBinder();
    renderMain();
    renderLayout();
    if (focus && !window.matchMedia('(pointer: coarse)').matches) el.editor.focus();
  }

  function addChapter() {
    const p = proj();
    const ch = newChapter(`Chapter ${p.chapters.length + 1}`);
    const s = newScene('Scene 1');
    ch.scenes.push(s);
    p.chapters.push(ch);
    touch();
    if (state.view === 'plan') {
      renderBinder(); renderPlan();
      const input = $(`.plan-chapter[data-id="${CSS.escape(ch.id)}"] .plan-ch-title`, el.planScroll);
      if (input) { input.scrollIntoView({ block: 'center', behavior: 'smooth' }); input.select(); input.focus({ preventScroll: true }); }
    } else {
      openScene(s.id, { focus: false });
      el.sceneTitle.focus(); el.sceneTitle.select();
    }
  }

  function addScene(chId) {
    const ch = findChapter(chId);
    if (!ch) return;
    const s = newScene(`Scene ${ch.scenes.length + 1}`);
    ch.scenes.push(s);
    ch.collapsed = false;
    touch();
    if (state.view === 'plan') {
      renderBinder(); renderPlan();
      const input = $(`.scene-card[data-id="${CSS.escape(s.id)}"] .card-title`, el.planScroll);
      if (input) { input.focus(); input.select(); }
    } else {
      openScene(s.id, { focus: false });
      el.sceneTitle.focus(); el.sceneTitle.select();
    }
  }

  async function deleteScene(id) {
    const f = findScene(id);
    if (!f) return;
    const msg = f.scene.words ? `“${f.scene.title || 'Untitled scene'}” has ${plural(f.scene.words, 'word')}. This cannot be undone.` : `Delete “${f.scene.title || 'Untitled scene'}”?`;
    if (!(await confirmDialog('Delete scene?', msg, 'Delete scene'))) return;
    const list = allScenes();
    const idx = list.findIndex(s => s.id === id);
    f.chapter.scenes = f.chapter.scenes.filter(s => s.id !== id);
    if (state.currentSceneId === id) {
      const rest = list.filter(s => s.id !== id);
      state.currentSceneId = rest.length ? rest[Math.min(idx, rest.length - 1)].id : null;
    }
    touch();
    renderAll();
    toast('Scene deleted.');
  }

  async function deleteChapter(id) {
    const ch = findChapter(id);
    if (!ch) return;
    const w = chapterWords(ch);
    const ok = await confirmDialog('Delete chapter?', `“${ch.title || 'Untitled chapter'}” and its ${plural(ch.scenes.length, 'scene')}${w ? ` (${plural(w, 'word')})` : ''} will be removed. This cannot be undone.`, 'Delete chapter');
    if (!ok) return;
    const p = proj();
    p.chapters = p.chapters.filter(c => c.id !== id);
    ensureCurrentScene(state);
    touch();
    renderAll();
    toast('Chapter deleted.');
  }

  async function chapterMenu(id) {
    const ch = findChapter(id);
    if (!ch) return;
    const res = await openModal({
      title: 'Chapter',
      body: `<label class="field"><span>Title</span><input class="input" id="chTitleInput" value="${esc(ch.title)}" autofocus autocomplete="off"></label>
             <label class="field"><span>Summary</span><textarea class="textarea" id="chSummaryInput" rows="3" placeholder="What happens in this chapter?">${esc(ch.summary)}</textarea></label>`,
      actions: [
        { label: 'Delete chapter', value: 'delete', kind: 'danger spacer-l' },
        { label: 'Add scene', value: 'add' },
        { label: 'Save', value: 'save', kind: 'primary', primary: true },
      ],
      collect: w => ({ title: $('#chTitleInput', w).value, summary: $('#chSummaryInput', w).value }),
    });
    if (!res) return;
    if (res.value === 'delete') return deleteChapter(id);
    ch.title = res.data.title.trim() || ch.title;
    ch.summary = res.data.summary;
    touch();
    if (res.value === 'add') return addScene(id);
    renderAll();
  }

  function navScene(dir) {
    const list = allScenes();
    const idx = list.findIndex(s => s.id === state.currentSceneId);
    const next = list[idx + dir];
    if (next) openScene(next.id);
  }

  function flushEditor() {
    // Content is written on every input event; nothing pending to flush besides saving.
    if (saveTimer) saveNow();
  }

  function toggleBinder(force) {
    ui.binderOpen = typeof force === 'boolean' ? force : !ui.binderOpen;
    if (ui.binderOpen && isOverlay('notes') && isOverlay('binder')) ui.notesOpen = false;
    renderLayout();
  }
  function toggleNotes(force) {
    ui.notesOpen = typeof force === 'boolean' ? force : !ui.notesOpen;
    if (ui.notesOpen && isOverlay('binder')) ui.binderOpen = false;
    renderLayout();
    if (ui.notesOpen) renderNotes();
  }

  function setFocus(on) {
    ui.focus = on;
    document.body.classList.toggle('focus', on);
    document.body.classList.remove('typing');
    if (on) {
      closeMenu();
      if (state.view !== 'write') { state.view = 'write'; renderTopbar(); renderMain(); }
      if (el.editorWrap.hidden) { toast('Add a scene first.'); setFocus(false); return; }
      el.editor.focus();
      toast('Focus mode. Press Esc to exit.');
    }
  }

  function cycleTheme() {
    const order = ['system', 'light', 'dark'];
    state.settings.theme = order[(order.indexOf(state.settings.theme) + 1) % order.length];
    applyTheme();
    scheduleSave();
    toast(`Theme: ${state.settings.theme === 'system' ? 'match system' : state.settings.theme}`);
  }

  // ---------- Projects ----------
  function switchProject(id) {
    flushEditor();
    state.currentProjectId = id;
    ensureCurrentScene(state);
    ui.loadedSceneId = null;
    ui.expanded.clear();
    scheduleSave();
    renderAll();
  }

  function openProjects() {
    closeMenu();
    const body = document.createElement('div');
    const draw = () => {
      body.innerHTML = `<div class="project-list">${state.projects
        .slice().sort((a, b) => b.updatedAt - a.updatedAt)
        .map(p => `<div class="project-row ${p.id === state.currentProjectId ? 'current' : ''}" data-id="${esc(p.id)}">
          <button class="project-open" data-act="open"><strong>${esc(p.title) || 'Untitled book'}</strong>
            <small>${plural(p.chapters.length, 'chapter')} · ${plural(projectWords(p), 'word')} · edited ${new Date(p.updatedAt).toLocaleDateString()}</small></button>
          <button class="icon-btn sm" data-act="rename" aria-label="Rename" title="Rename">${ICONS.edit}</button>
          <button class="icon-btn sm" data-act="delete" aria-label="Delete" title="Delete">${ICONS.trash}</button>
        </div>`).join('')}</div>
        <button class="btn primary block" data-act="new">+ New book</button>`;
    };
    draw();
    openModal({
      title: 'Your books',
      body,
      onOpen: (wrap, close) => {
        body.addEventListener('click', async e => {
          const b = e.target.closest('[data-act]');
          if (!b) return;
          const id = b.closest('[data-id]')?.dataset.id;
          const p = state.projects.find(x => x.id === id);
          if (b.dataset.act === 'open') { close(); switchProject(id); }
          else if (b.dataset.act === 'new') {
            const title = await promptDialog('New book', 'Title', '', 'Create');
            if (title === null) return;
            const np = newProject(title.trim() || 'Untitled book');
            state.projects.push(np);
            close();
            switchProject(np.id);
            toast('Book created.');
          } else if (b.dataset.act === 'rename' && p) {
            const title = await promptDialog('Rename book', 'Title', p.title, 'Rename');
            if (title === null || !title.trim()) return;
            p.title = title.trim(); p.updatedAt = Date.now();
            scheduleSave(); draw(); renderTopbar(); if (state.view === 'plan') renderPlan();
          } else if (b.dataset.act === 'delete' && p) {
            const ok = await confirmDialog('Delete book?', `“${p.title}” (${plural(projectWords(p), 'word')}) will be permanently removed from this browser. Consider backing up to JSON first.`, 'Delete book');
            if (!ok) return;
            state.projects = state.projects.filter(x => x.id !== id);
            if (!state.projects.length) state.projects.push(newProject());
            if (state.currentProjectId === id) { state.currentProjectId = state.projects[0].id; ensureCurrentScene(state); ui.loadedSceneId = null; }
            saveNow(); draw(); renderAll();
            toast('Book deleted.');
          }
        });
      },
    });
  }

  // ---------- Goals / settings ----------
  async function openGoals() {
    closeMenu();
    const s = state.settings;
    const days = [];
    for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); days.push(d); }
    const vals = days.map(d => Math.max(0, state.daily[dateKey(d)] || 0));
    const max = Math.max(s.dailyGoal, ...vals, 1);
    const total = vals.reduce((a, b) => a + b, 0);
    const res = await openModal({
      title: 'Goals & editor',
      body: `
        <div class="history" aria-label="Words written over the last 7 days">${days.map((d, i) => `
          <div class="bar ${s.dailyGoal && vals[i] >= s.dailyGoal ? 'met' : ''}" title="${d.toLocaleDateString()}: ${fmt(vals[i])} words">
            <i style="height:${Math.round((vals[i] / max) * 70)}px"></i><span>${d.toLocaleDateString(undefined, { weekday: 'narrow' })}</span>
          </div>`).join('')}</div>
        <p class="history-label">${plural(total, 'word')} in the last 7 days · ${plural(Math.max(0, session.words), 'word')} this session</p>
        <div class="field-row">
          <label class="field"><span>Session goal (words)</span><input class="input" type="number" min="0" step="50" id="gSession" value="${s.sessionGoal}"></label>
          <label class="field"><span>Daily goal (words)</span><input class="input" type="number" min="0" step="50" id="gDaily" value="${s.dailyGoal}"></label>
        </div>
        <div class="field-row">
          <label class="field"><span>Editor font</span>
            <select class="select" id="gFont">
              <option value="serif" ${s.font === 'serif' ? 'selected' : ''}>Serif</option>
              <option value="sans" ${s.font === 'sans' ? 'selected' : ''}>Sans-serif</option>
              <option value="mono" ${s.font === 'mono' ? 'selected' : ''}>Typewriter (mono)</option>
            </select></label>
          <label class="field"><span>Text size: <output id="gSizeOut">${s.fontSize}px</output></span>
            <input type="range" min="14" max="28" id="gSize" value="${s.fontSize}"></label>
        </div>
        <p>Set a goal to 0 to turn it off. Counts are net words: deleting text lowers them.</p>`,
      actions: [
        { label: 'Reset session', value: 'reset', kind: 'spacer-l' },
        { label: 'Cancel', value: null },
        { label: 'Save', value: 'save', kind: 'primary', primary: true },
      ],
      onOpen: w => { $('#gSize', w).addEventListener('input', e => { $('#gSizeOut', w).textContent = e.target.value + 'px'; }); },
      collect: w => ({ session: $('#gSession', w).value, daily: $('#gDaily', w).value, font: $('#gFont', w).value, size: $('#gSize', w).value }),
    });
    if (!res) return;
    if (res.value === 'reset') {
      session = { words: 0, start: Date.now(), toasted: false };
      saveSession();
      updateStats();
      toast('Session counter reset.');
      return;
    }
    s.sessionGoal = clampInt(res.data.session, 0, 100000, s.sessionGoal);
    s.dailyGoal = clampInt(res.data.daily, 0, 100000, s.dailyGoal);
    s.font = ['serif', 'sans', 'mono'].includes(res.data.font) ? res.data.font : 'serif';
    s.fontSize = clampInt(res.data.size, 14, 28, 19);
    if (session.words < s.sessionGoal) session.toasted = false;
    saveNow();
    renderMain();
  }

  function showShortcuts() {
    closeMenu();
    const mod = /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl';
    openModal({
      title: 'Keyboard shortcuts',
      body: `<dl class="kbd-list">
        <dt><kbd>${mod}</kbd> + <kbd>S</kbd></dt><dd>Save now</dd>
        <dt><kbd>${mod}</kbd> + <kbd>Shift</kbd> + <kbd>F</kbd></dt><dd>Toggle focus mode</dd>
        <dt><kbd>Esc</kbd></dt><dd>Exit focus mode, close menus and dialogs</dd>
        <dt><kbd>Alt</kbd> + <kbd>↑</kbd> / <kbd>↓</kbd></dt><dd>Previous / next scene</dd>
        <dt><kbd>${mod}</kbd> + <kbd>Shift</kbd> + <kbd>P</kbd></dt><dd>Switch between Write and Plan</dd>
      </dl>`,
      actions: [{ label: 'Close', value: null, kind: 'primary', primary: true }],
    });
  }

  // ---------- Export / import ----------
  function download(name, text, type) {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
  const slug = s => (String(s || 'book').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'book');

  function exportJSON() {
    closeMenu();
    saveNow();
    const data = { app: 'book-writer', exportedAt: new Date().toISOString(), ...state };
    download(`book-writer-backup-${todayKey()}.json`, JSON.stringify(data, null, 2), 'application/json');
    toast('Backup downloaded.');
  }

  function buildManuscript(p, format, { sceneTitles, synopsis }) {
    const out = [];
    const md = format === 'md';
    const sep = md ? '\n\n* * *\n\n' : '\n\n                *   *   *\n\n';
    out.push(md ? `# ${p.title}` : p.title.toUpperCase());
    if (synopsis && p.synopsis.trim()) out.push(md ? p.synopsis.trim().split('\n').map(l => `> ${l}`).join('\n') : p.synopsis.trim());
    p.chapters.forEach(ch => {
      const heading = md ? `## ${ch.title || 'Untitled chapter'}` : `\n${(ch.title || 'Untitled chapter').toUpperCase()}\n${'='.repeat(Math.min(60, (ch.title || 'Untitled chapter').length))}`;
      const scenes = ch.scenes.map(s => {
        const text = s.content.replace(/\s+$/, '').replace(/^\n+/, '');
        if (sceneTitles) return (md ? `### ${s.title || 'Untitled scene'}` : `${s.title || 'Untitled scene'}\n${'-'.repeat(Math.min(60, (s.title || 'Untitled scene').length))}`) + (text ? `\n\n${text}` : '');
        return text;
      }).filter(Boolean);
      out.push(scenes.length ? heading + '\n\n' + scenes.join(sceneTitles ? '\n\n' : sep) : heading);
    });
    return out.join('\n\n').replace(/\n{4,}/g, '\n\n\n') + '\n';
  }

  async function exportManuscript(format) {
    closeMenu();
    const p = proj();
    const res = await openModal({
      title: `Export manuscript (.${format})`,
      body: `<p>“${esc(p.title)}”: ${plural(p.chapters.length, 'chapter')}, ${plural(projectWords(p), 'word')}.</p>
        <label class="check"><input type="checkbox" id="xTitles"> Include scene titles</label>
        <label class="check"><input type="checkbox" id="xSyn" checked> Include book synopsis</label>
        <p style="margin-top:10px">Without scene titles, scenes are separated by a centered “* * *” break.</p>`,
      actions: [{ label: 'Cancel', value: null }, { label: 'Download', value: 'go', kind: 'primary', primary: true }],
      collect: w => ({ sceneTitles: $('#xTitles', w).checked, synopsis: $('#xSyn', w).checked }),
    });
    if (!res) return;
    const text = buildManuscript(p, format, res.data);
    download(`${slug(p.title)}.${format}`, text, format === 'md' ? 'text/markdown;charset=utf-8' : 'text/plain;charset=utf-8');
    toast('Manuscript downloaded.');
  }

  async function handleImport(file) {
    let incoming;
    try {
      const raw = JSON.parse(await file.text());
      incoming = normalize(raw);
    } catch (e) {
      toast('That file is not a valid Book Writer backup.', 'error');
      return;
    }
    const n = incoming.projects.length;
    const words = incoming.projects.reduce((a, p) => a + projectWords(p), 0);
    const res = await openModal({
      title: 'Import backup',
      body: `<p>“${esc(file.name)}” contains ${plural(n, 'book')} (${plural(words, 'word')}).</p>
        <p><b>Merge</b> adds them next to your current books. <b>Replace</b> erases everything stored in this browser and loads the backup instead.</p>`,
      actions: [
        { label: 'Replace all', value: 'replace', kind: 'danger spacer-l' },
        { label: 'Cancel', value: null },
        { label: 'Merge', value: 'merge', kind: 'primary', primary: true },
      ],
    });
    if (!res) return;
    if (res.value === 'replace') {
      const ok = await confirmDialog('Replace all data?', 'Your current books in this browser will be overwritten. This cannot be undone.', 'Replace');
      if (!ok) return;
      state = incoming;
    } else {
      const ids = new Set(state.projects.map(p => p.id));
      incoming.projects.forEach(p => {
        if (ids.has(p.id)) { p.id = uid(); p.title += ' (imported)'; }
        state.projects.push(p);
      });
      for (const [k, v] of Object.entries(incoming.daily)) state.daily[k] = Math.max(state.daily[k] || 0, v);
      state.currentProjectId = incoming.projects[0].id;
      ensureCurrentScene(state);
    }
    ui.loadedSceneId = null;
    ui.expanded.clear();
    saveNow();
    renderAll();
    toast(`Imported ${plural(n, 'book')}.`, 'ok');
  }

  // ---------- Menu ----------
  function openMenu() {
    el.menu.hidden = false;
    el.btnMenu.setAttribute('aria-expanded', 'true');
    const r = el.btnMenu.getBoundingClientRect();
    el.menu.style.top = r.bottom + 6 + 'px';
    el.menu.style.right = Math.max(8, window.innerWidth - r.right) + 'px';
    el.menu.querySelector('button').focus();
  }
  function closeMenu() {
    if (el.menu.hidden) return;
    el.menu.hidden = true;
    el.btnMenu.setAttribute('aria-expanded', 'false');
  }

  // ---------- Modal, prompt, confirm, toast ----------
  function openModal({ title, body, actions = [], onOpen, collect, wide }) {
    return new Promise(resolve => {
      const prevFocus = document.activeElement;
      const wrap = document.createElement('div');
      wrap.className = 'modal-backdrop';
      wrap.innerHTML = `<div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
        <header class="modal-head"><h2>${esc(title)}</h2><button class="icon-btn sm" data-close aria-label="Close">${ICONS.x}</button></header>
        <div class="modal-body"></div><footer class="modal-foot"></footer></div>`;
      const bodyEl = $('.modal-body', wrap);
      if (typeof body === 'string') bodyEl.innerHTML = body; else if (body) bodyEl.append(body);
      const foot = $('.modal-foot', wrap);
      let primaryBtn = null;
      let done = false;
      const close = value => {
        if (done) return;
        done = true;
        const data = value != null && collect ? collect(wrap) : undefined;
        wrap.remove();
        document.removeEventListener('keydown', onKey, true);
        if (prevFocus && document.contains(prevFocus) && prevFocus.focus) prevFocus.focus({ preventScroll: true });
        resolve(value == null ? null : collect ? { value, data } : value);
      };
      actions.forEach(a => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'btn ' + (a.kind || '');
        b.textContent = a.label;
        b.addEventListener('click', () => close(a.value));
        foot.append(b);
        if (a.primary) primaryBtn = b;
      });
      if (!actions.length) foot.remove();
      function onKey(e) {
        if (el.modalRoot.lastElementChild !== wrap) return; // only the top-most dialog reacts
        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(null); }
        else if (e.key === 'Enter' && primaryBtn && e.target.tagName === 'INPUT' && e.target.type !== 'checkbox') { e.preventDefault(); primaryBtn.click(); }
        else if (e.key === 'Tab') { // keep focus inside the dialog
          const f = $$('button, input, select, textarea, [tabindex]:not([tabindex="-1"])', wrap).filter(x => !x.disabled && x.offsetParent !== null);
          if (!f.length) return;
          if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
          else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
        }
      }
      wrap.addEventListener('mousedown', e => { if (e.target === wrap) close(null); });
      $('[data-close]', wrap).addEventListener('click', () => close(null));
      document.addEventListener('keydown', onKey, true);
      el.modalRoot.append(wrap);
      if (onOpen) onOpen(wrap, close);
      const af = $('[autofocus]', wrap) || primaryBtn || $('.modal-body button, .modal-body input', wrap) || $('[data-close]', wrap);
      if (af) { af.focus(); if (af.select && af.tagName === 'INPUT') af.select(); }
    });
  }

  async function promptDialog(title, label, value = '', okLabel = 'Save') {
    const res = await openModal({
      title,
      body: `<label class="field"><span>${esc(label)}</span><input class="input" id="promptInput" value="${esc(value)}" autofocus autocomplete="off"></label>`,
      actions: [{ label: 'Cancel', value: null }, { label: okLabel, value: 'ok', kind: 'primary', primary: true }],
      collect: w => $('#promptInput', w).value,
    });
    return res ? res.data : null;
  }

  async function confirmDialog(title, message, okLabel = 'OK') {
    const res = await openModal({
      title,
      body: `<p>${esc(message)}</p>`,
      actions: [{ label: 'Cancel', value: null }, { label: okLabel, value: 'ok', kind: 'danger', primary: true }],
    });
    return res === 'ok';
  }

  function toast(msg, kind = '', ms = 2600) {
    const t = document.createElement('div');
    t.className = 'toast ' + kind;
    t.textContent = msg;
    el.toasts.append(t);
    while (el.toasts.children.length > 3) el.toasts.firstElementChild.remove();
    setTimeout(() => t.remove(), ms);
  }

  // ---------- Drag to reorder (pointer events: mouse, touch & pen) ----------
  let drag = null;
  function onDragStart(e) {
    const handle = e.target.closest('[data-drag]');
    if (!handle || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const item = handle.closest('[data-sort-item]');
    const scope = item && item.closest('[data-sort-root]');
    if (!item || !scope) return;
    e.preventDefault();
    drag = {
      type: handle.dataset.drag, item, scope, handle,
      startX: e.clientX, startY: e.clientY, moved: false,
      scroller: item.closest('.binder-scroll, .plan-scroll'),
    };
    try { handle.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    handle.addEventListener('pointermove', onDragMove);
    handle.addEventListener('pointerup', onDragEnd);
    handle.addEventListener('pointercancel', onDragEnd);
  }

  function onDragMove(e) {
    if (!drag) return;
    if (!drag.moved) {
      if (Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) < 4) return;
      drag.moved = true;
      drag.item.classList.add('dragging');
      document.body.classList.add('is-dragging');
    }
    // Auto-scroll near the edges of the scroll container.
    if (drag.scroller) {
      const r = drag.scroller.getBoundingClientRect();
      if (e.clientY < r.top + 40) drag.scroller.scrollTop -= 14;
      else if (e.clientY > r.bottom - 40) drag.scroller.scrollTop += 14;
    }
    const under = document.elementFromPoint(e.clientX, e.clientY);
    if (!under || !drag.scope.contains(under)) return;
    const type = drag.type;
    const target = under.closest(`[data-sort-item][data-type="${type}"]`);
    if (target && target !== drag.item && !drag.item.contains(target) && drag.scope.contains(target)) {
      const r = target.getBoundingClientRect();
      const grid = target.parentElement.dataset.layout === 'grid';
      const before = grid ? e.clientX < r.left + r.width / 2 : e.clientY < r.top + r.height / 2;
      if (before && target.previousElementSibling === drag.item) return;
      if (!before && target.nextElementSibling === drag.item) return;
      target.parentElement.insertBefore(drag.item, before ? target : target.nextElementSibling);
      return;
    }
    if (!target && type === 'scene') {
      // Dropping into an empty area of another chapter: append to its scene list.
      let container = under.closest('[data-sort-container="scene"]');
      if (!container) {
        const chEl = under.closest('[data-type="chapter"]');
        container = chEl && $('[data-sort-container="scene"]', chEl);
      }
      if (container && container !== drag.item.parentElement && drag.scope.contains(container)) container.append(drag.item);
    }
  }

  function onDragEnd() {
    if (!drag) return;
    const { handle, moved, scope, type, item } = drag;
    handle.removeEventListener('pointermove', onDragMove);
    handle.removeEventListener('pointerup', onDragEnd);
    handle.removeEventListener('pointercancel', onDragEnd);
    item.classList.remove('dragging');
    document.body.classList.remove('is-dragging');
    drag = null;
    if (moved) applyOrder(scope, type, item.dataset.id);
  }

  function applyOrder(scope, type, movedId) {
    const p = proj();
    if (type === 'chapter') {
      const container = scope.matches('[data-sort-container="chapter"]') ? scope : $('[data-sort-container="chapter"]', scope);
      const byId = new Map(p.chapters.map(c => [c.id, c]));
      const ordered = Array.from(container.children).filter(n => n.dataset.type === 'chapter').map(n => byId.get(n.dataset.id)).filter(Boolean);
      p.chapters.forEach(c => { if (!ordered.includes(c)) ordered.push(c); });
      p.chapters = ordered;
    } else {
      const byId = new Map(allScenes(p).map(s => [s.id, s]));
      const placed = new Set();
      $$('[data-sort-container="scene"]', scope).forEach(list => {
        const ch = findChapter(list.dataset.chapter);
        if (!ch) return;
        ch.scenes = Array.from(list.children).filter(n => n.dataset.type === 'scene').map(n => byId.get(n.dataset.id)).filter(Boolean);
        ch.scenes.forEach(s => placed.add(s.id));
      });
      // Safety net: never lose a scene.
      byId.forEach(s => { if (!placed.has(s.id)) p.chapters[0]?.scenes.push(s); });
      const f = findScene(movedId);
      if (f) f.chapter.collapsed = false;
    }
    touch();
    renderBinder();
    renderMain();
  }

  // ---------- Event wiring ----------
  el.btnBinder.addEventListener('click', () => toggleBinder());
  el.btnNotes.addEventListener('click', () => toggleNotes());
  el.btnCloseNotes.addEventListener('click', () => toggleNotes(false));
  el.btnFocus.addEventListener('click', () => setFocus(true));
  el.btnExitFocus.addEventListener('click', () => setFocus(false));
  el.btnTheme.addEventListener('click', cycleTheme);
  el.btnProjects.addEventListener('click', openProjects);
  el.btnGoals.addEventListener('click', openGoals);
  el.btnAddChapter.addEventListener('click', addChapter);
  el.btnEmptyAdd.addEventListener('click', addChapter);
  el.btnPrev.addEventListener('click', () => navScene(-1));
  el.btnNext.addEventListener('click', () => navScene(1));
  el.btnDeleteScene.addEventListener('click', () => deleteScene(state.currentSceneId));
  el.crumbChapter.addEventListener('click', () => { const f = findScene(state.currentSceneId); if (f) chapterMenu(f.chapter.id); });
  el.scrim.addEventListener('click', () => {
    if (isOverlay('binder')) ui.binderOpen = false;
    if (isOverlay('notes')) ui.notesOpen = false;
    renderLayout();
  });
  $$('.view-tabs [data-view]').forEach(b => b.addEventListener('click', () => setView(b.dataset.view)));

  el.btnMenu.addEventListener('click', e => { e.stopPropagation(); el.menu.hidden ? openMenu() : closeMenu(); });
  document.addEventListener('mousedown', e => { if (!el.menu.hidden && !el.menu.contains(e.target) && !el.btnMenu.contains(e.target)) closeMenu(); });
  el.menu.addEventListener('click', e => {
    const cmd = e.target.closest('[data-cmd]')?.dataset.cmd;
    if (!cmd) return;
    closeMenu();
    ({
      projects: openProjects,
      goals: openGoals,
      'export-md': () => exportManuscript('md'),
      'export-txt': () => exportManuscript('txt'),
      'export-json': exportJSON,
      'import-json': () => el.importFile.click(),
      shortcuts: showShortcuts,
    })[cmd]?.();
  });
  el.importFile.addEventListener('change', () => {
    const file = el.importFile.files[0];
    el.importFile.value = '';
    if (file) handleImport(file);
  });

  // Editor
  el.editor.addEventListener('input', () => {
    const f = findScene(state.currentSceneId);
    if (!f) return;
    f.scene.content = el.editor.value;
    const w = countWords(f.scene.content);
    const delta = w - f.scene.words;
    f.scene.words = w;
    recordDelta(delta);
    updateCounts(f);
    if (delta > 0) checkGoalToasts();
    touch();
    if (ui.focus) document.body.classList.add('typing');
  });
  document.addEventListener('mousemove', () => { if (ui.focus) document.body.classList.remove('typing'); });
  el.sceneTitle.addEventListener('input', () => {
    const f = findScene(state.currentSceneId);
    if (!f) return;
    f.scene.title = el.sceneTitle.value;
    const name = $(`.scene-item[data-id="${CSS.escape(f.scene.id)}"] .scene-name`, el.binderList);
    if (name) name.textContent = f.scene.title || 'Untitled scene';
    touch();
  });
  el.sceneTitle.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); el.editor.focus(); } });
  el.sceneStatus.addEventListener('change', () => {
    const f = findScene(state.currentSceneId);
    if (!f) return;
    f.scene.status = el.sceneStatus.value;
    el.sceneStatus.className = `status-select status-${f.scene.status}`;
    touch();
    renderBinder();
  });

  // Binder (delegated)
  el.binderList.addEventListener('pointerdown', onDragStart);
  el.binderList.addEventListener('click', e => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const chId = b.closest('[data-type="chapter"]')?.dataset.id;
    const scId = b.closest('[data-type="scene"]')?.dataset.id;
    switch (b.dataset.act) {
      case 'open-scene': openScene(scId); break;
      case 'toggle-chapter': {
        const ch = findChapter(chId);
        if (ch) { ch.collapsed = !ch.collapsed; scheduleSave(); renderBinder(); }
        break;
      }
      case 'chapter-menu': chapterMenu(chId); break;
      case 'add-scene': addScene(chId); break;
    }
  });

  // Plan (delegated)
  el.planScroll.addEventListener('pointerdown', onDragStart);
  el.planScroll.addEventListener('click', e => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const chId = b.closest('[data-type="chapter"]')?.dataset.id;
    const scId = b.closest('[data-type="scene"]')?.dataset.id;
    switch (b.dataset.act) {
      case 'open-scene': openScene(scId); break;
      case 'chapter-menu': chapterMenu(chId); break;
      case 'add-scene': addScene(chId); break;
      case 'add-chapter': addChapter(); break;
    }
  });
  el.planScroll.addEventListener('input', e => {
    const t = e.target;
    const field = t.dataset.field;
    if (!field) return;
    const p = proj();
    const ch = findChapter(t.closest('[data-type="chapter"]')?.dataset.id);
    const f = findScene(t.closest('[data-type="scene"]')?.dataset.id);
    switch (field) {
      case 'synopsis': p.synopsis = t.value; break;
      case 'ch-title': if (ch) { ch.title = t.value; renderBinder(); } break;
      case 'ch-summary': if (ch) { ch.summary = t.value; autoGrow(t); } break;
      case 'sc-title': if (f) { f.scene.title = t.value; renderBinder(); } break;
      case 'sc-synopsis': if (f) f.scene.synopsis = t.value; break;
      case 'sc-status':
        if (f) {
          f.scene.status = t.value;
          const card = t.closest('.scene-card');
          card.className = `scene-card status-${t.value}`;
          renderBinder();
        }
        break;
    }
    touch();
  });

  // Notes (delegated)
  $$('#notes [data-tab]').forEach(b => b.addEventListener('click', () => { ui.notesTab = b.dataset.tab; renderNotes(); }));
  el.notesSearch.addEventListener('input', () => { ui.notesQuery = el.notesSearch.value; renderNotes(); });
  el.btnAddNote.addEventListener('click', () => {
    const p = proj();
    const isChar = ui.notesTab === 'characters';
    const n = isChar ? { id: uid(), name: '', role: '', notes: '' } : { id: uid(), name: '', type: '', notes: '' };
    (isChar ? p.characters : p.locations).unshift(n);
    ui.expanded.add(n.id);
    ui.notesQuery = ''; el.notesSearch.value = '';
    touch();
    renderNotes();
    const input = $(`.note-card[data-id="${CSS.escape(n.id)}"] [data-nf="name"]`, el.notesList);
    if (input) input.focus();
  });
  el.notesList.addEventListener('click', async e => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const card = b.closest('.note-card');
    const id = card?.dataset.id;
    if (b.dataset.act === 'toggle-note') {
      if (ui.expanded.has(id)) ui.expanded.delete(id); else ui.expanded.add(id);
      card.classList.toggle('open', ui.expanded.has(id));
      b.setAttribute('aria-expanded', String(ui.expanded.has(id)));
    } else if (b.dataset.act === 'delete-note') {
      const p = proj();
      const key = ui.notesTab === 'characters' ? 'characters' : 'locations';
      const n = p[key].find(x => x.id === id);
      if (!n) return;
      const ok = await confirmDialog(`Delete ${key === 'characters' ? 'character' : 'location'}?`, `“${n.name || 'Unnamed'}” and its notes will be removed.`, 'Delete');
      if (!ok) return;
      p[key] = p[key].filter(x => x.id !== id);
      ui.expanded.delete(id);
      touch();
      renderNotes();
    }
  });
  el.notesList.addEventListener('input', e => {
    const t = e.target;
    const f = t.dataset.nf;
    if (!f) return;
    const card = t.closest('.note-card');
    const p = proj();
    const list = ui.notesTab === 'characters' ? p.characters : p.locations;
    const n = list.find(x => x.id === card.dataset.id);
    if (!n) return;
    n[f] = t.value;
    if (f === 'name') {
      $('[data-sum="name"]', card).textContent = n.name || 'Unnamed';
      const av = $('.avatar', card);
      av.textContent = (n.name.trim()[0] || '?').toUpperCase();
      av.style.setProperty('--h', hue(n.name || n.id));
    } else if (f === 'role' || f === 'type') {
      $('[data-sum="sub"]', card).textContent = n[f] || (f === 'role' ? 'No role yet' : 'No type yet');
    }
    touch();
  });

  // Global keys
  document.addEventListener('keydown', e => {
    const mod = e.ctrlKey || e.metaKey;
    if (mod && !e.shiftKey && e.key.toLowerCase() === 's') { e.preventDefault(); if (saveNow()) toast('Saved.'); return; }
    if (el.modalRoot.children.length) return;
    if (mod && e.shiftKey && e.key.toLowerCase() === 'f') { e.preventDefault(); setFocus(!ui.focus); return; }
    if (mod && e.shiftKey && e.key.toLowerCase() === 'p') { e.preventDefault(); setView(state.view === 'write' ? 'plan' : 'write'); return; }
    if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown') && state.view === 'write') { e.preventDefault(); navScene(e.key === 'ArrowUp' ? -1 : 1); return; }
    if (e.key === 'Escape') {
      if (!el.menu.hidden) { closeMenu(); el.btnMenu.focus(); return; }
      if (ui.focus) { setFocus(false); return; }
      if (ui.notesOpen && isOverlay('notes')) { toggleNotes(false); return; }
      if (ui.binderOpen && isOverlay('binder')) { toggleBinder(false); return; }
    }
  });

  // Responsive transitions
  mqBinder.addEventListener('change', e => { ui.binderOpen = e.matches; renderLayout(); });
  mqNotes.addEventListener('change', e => { if (!e.matches) ui.notesOpen = false; renderLayout(); });

  // Keep data safe when leaving / switching tabs; sync if another tab saved.
  window.addEventListener('beforeunload', () => { if (saveTimer) saveNow(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && saveTimer) saveNow(); });
  window.addEventListener('storage', e => {
    if (e.key !== LS_KEY || !e.newValue) return;
    try {
      state = normalize(JSON.parse(e.newValue));
      ui.loadedSceneId = null;
      renderAll();
      toast('Updated from another tab.');
    } catch (err) { /* ignore */ }
  });

  // ---------- Boot ----------
  renderAll();
  if (storageProblem) toast('Saved data could not be read, so a fresh copy was started. The old data was kept aside in browser storage.', 'error', 6000);
  else {
    try {
      if (!localStorage.getItem(LS_KEY)) saveNow(); else setSaveStatus('Saved');
    } catch (e) { setSaveStatus('Storage unavailable', true); }
  }
})();
