// ═══════════════════════════════════════════════════════════════════════════
// Mavericks — Frontend Application
// Mobile-first PWA-style interface
// ═══════════════════════════════════════════════════════════════════════════

const API = '';

// ─── State ──────────────────────────────────────────────────────────────────

const state = {
  token: null,
  user: null,
  file: null,
  prefs: { allergens: [], dislikes: [] },
};

// ─── DOM ─────────────────────────────────────────────────────────────────────

const $ = (id) => document.getElementById(id);

// ─── Auth ─────────────────────────────────────────────────────────────────────

function saveToken(token) {
  state.token = token;
  localStorage.setItem('mv_token', token);
}

function loadToken() {
  const fragment = new URLSearchParams(window.location.hash.slice(1));
  const fragmentToken = fragment.get('token');
  if (fragmentToken) {
    saveToken(fragmentToken);
    history.replaceState(null, '', window.location.pathname);
  } else {
    state.token = localStorage.getItem('mv_token');
  }
}

async function fetchCurrentUser() {
  if (!state.token) return;
  try {
    const res = await apiFetch('/api/auth/me');
    const data = await res.json();
    state.user = data.user || null;
    if (!state.user) { state.token = null; localStorage.removeItem('mv_token'); }
  } catch {
    state.token = null;
    state.user = null;
  }
}

function renderAuthArea() {
  const area = $('auth-area');
  if (!area) return;
  if (state.user) {
    const initial = (state.user.name || state.user.email || '?')[0].toUpperCase();
    area.innerHTML = `
      <div class="user-pill">
        ${state.user.avatar
          ? `<img src="${escHtml(state.user.avatar)}" alt="${escHtml(state.user.name)}" class="user-pill__avatar" />`
          : `<div class="user-pill__avatar--placeholder">${initial}</div>`}
        <span>${escHtml(state.user.name || state.user.email)}</span>
      </div>
      <button class="btn btn--ghost btn--sm" id="btn-logout">Выйти</button>`;
    $('btn-logout')?.addEventListener('click', logout);
  } else {
    area.innerHTML = `<button class="btn btn--primary btn--sm" id="btn-login">Войти</button>`;
    $('btn-login')?.addEventListener('click', openAuthModal);
  }
}

function logout() {
  state.token = null;
  state.user = null;
  localStorage.removeItem('mv_token');
  renderAuthArea();
}

// ─── API helper ───────────────────────────────────────────────────────────────

function apiFetch(path, opts = {}) {
  const headers = { ...(opts.headers || {}) };
  if (state.token) headers['Authorization'] = `Bearer ${state.token}`;
  return fetch(API + path, { ...opts, headers });
}

// ─── Preferences (persisted to localStorage, synced to DB if logged in) ───────

const PREFS_KEY = 'mv_prefs';

function loadPrefsFromStorage() {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) state.prefs = JSON.parse(raw);
  } catch { /* ignore */ }
}

function savePrefsToStorage() {
  localStorage.setItem(PREFS_KEY, JSON.stringify(state.prefs));
}

async function loadPrefsFromServer() {
  if (!state.token) return;
  try {
    const res = await apiFetch('/api/preferences');
    if (res.ok) {
      const data = await res.json();
      // Merge server prefs into local (server wins)
      state.prefs = { allergens: data.allergens || [], dislikes: data.dislikes || [] };
      savePrefsToStorage();
    }
  } catch { /* ignore */ }
}

async function savePrefsToServer() {
  if (!state.token) return;
  try {
    await apiFetch('/api/preferences', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state.prefs),
    });
  } catch { /* ignore */ }
}

function updateActivePrefsUI() {
  const banner = $('active-prefs');
  if (!banner) return;
  const { allergens, dislikes } = state.prefs;
  const hasAny = allergens.length > 0 || dislikes.length > 0;
  banner.hidden = !hasAny;

  if (hasAny) {
    let html = '';
    if (allergens.length) {
      html += `<span class="active-prefs__label">⚠️ Аллергии:</span>`;
      html += allergens.map((a) => `<span class="active-prefs__tag">${escHtml(a)}</span>`).join('');
    }
    if (dislikes.length) {
      html += `<span class="active-prefs__label" style="margin-left:4px">🚫 Не нравится:</span>`;
      html += dislikes.map((d) => `<span class="active-prefs__tag active-prefs__tag--dislike">${escHtml(d)}</span>`).join('');
    }
    banner.innerHTML = html;
  }

  // Show dot on button
  const dot = $('prefs-indicator');
  if (dot) dot.hidden = !hasAny;

  updatePrefsSyncNote();
}

// ─── Preferences drawer ────────────────────────────────────────────────────────

function renderPrefsDrawer() {
  renderChips('allergens-chips', state.prefs.allergens, 'allergens');
  renderChips('dislikes-chips', state.prefs.dislikes, 'dislikes');
  updatePrefsSyncNote();
}

function renderChips(containerId, items, type) {
  const container = $(containerId);
  if (!container) return;
  container.innerHTML = items.length
    ? items.map((item, idx) => `
        <div class="chip-removable ${type === 'dislikes' ? 'chip-removable--dislike' : ''}" role="listitem">
          <span>${escHtml(item)}</span>
          <button class="chip-removable__remove" data-type="${type}" data-idx="${idx}" aria-label="Удалить ${escHtml(item)}">✕</button>
        </div>`).join('')
    : `<span style="font-size:0.78rem;color:var(--text-muted)">Нет ограничений</span>`;

  container.querySelectorAll('.chip-removable__remove').forEach((btn) => {
    btn.addEventListener('click', () => {
      const t = btn.dataset.type;
      const i = Number(btn.dataset.idx);
      state.prefs[t].splice(i, 1);
      savePrefsToStorage();
      renderPrefsDrawer();
      updateActivePrefsUI();
    });
  });
}

function updatePrefsSyncNote() {
  const note = $('prefs-sync-note');
  if (!note) return;
  note.textContent = state.user
    ? '✅ Предпочтения сохранятся на сервере'
    : 'Войди в аккаунт, чтобы сохранить на сервере';
}

function addPrefItem(type, inputId) {
  const input = $(inputId);
  const val = input.value.trim().toLowerCase();
  if (!val) return;

  // Support comma-separated input
  const items = val.split(',').map((s) => s.trim()).filter(Boolean);
  const existing = new Set(state.prefs[type]);
  items.forEach((item) => existing.add(item));
  state.prefs[type] = [...existing];

  input.value = '';
  savePrefsToStorage();
  renderPrefsDrawer();
  updateActivePrefsUI();
}

// ─── File upload ───────────────────────────────────────────────────────────────

function handleFile(file) {
  if (!file?.type.startsWith('image/')) return showToast('Нужен файл-изображение (JPEG, PNG, WebP)');
  if (file.size > 10 * 1024 * 1024) return showToast('Файл слишком большой. Максимум 10 МБ');

  state.file = file;
  const reader = new FileReader();
  reader.onload = (e) => {
    $('preview-img').src = e.target.result;
    $('upload-idle').hidden = true;
    $('upload-preview').hidden = false;
    $('btn-analyze').disabled = false;
  };
  reader.readAsDataURL(file);
}

function resetUpload() {
  state.file = null;
  $('file-input').value = '';
  $('preview-img').src = '';
  $('upload-idle').hidden = false;
  $('upload-preview').hidden = true;
  $('btn-analyze').disabled = true;
  $('results-section').hidden = true;
}

// ─── Voice Assistant State ──────────────────────────────────────────────────

const voiceState = {
  recipe: null,
  currentStep: 0,
  recognition: null,
  synth: window.speechSynthesis,
  isListening: false,
};

function initSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return null;
  const rec = new SpeechRecognition();
  rec.lang = 'ru-RU';
  rec.continuous = true;
  rec.interimResults = false;
  
  rec.onresult = (event) => {
    const last = event.results.length - 1;
    const command = event.results[last][0].transcript.trim().toLowerCase();
    
    if (command.includes('дальше') || command.includes('следующий')) {
      handleVoiceNext();
    } else if (command.includes('назад') || command.includes('предыдущий')) {
      handleVoicePrev();
    } else if (command.includes('повтори') || command.includes('ещё раз')) {
      readCurrentStep();
    }
  };
  
  rec.onstart = () => { voiceState.isListening = true; $('voice-pulse').classList.add('listening'); };
  rec.onend = () => { 
    if (voiceState.recipe) { // restart if still cooking
      try { rec.start(); } catch(e){} 
    } else {
      voiceState.isListening = false; $('voice-pulse').classList.remove('listening');
    }
  };
  return rec;
}

voiceState.recognition = initSpeechRecognition();

function openVoiceMode(recipeIndex) {
  voiceState.recipe = currentRecipes[recipeIndex];
  if (!voiceState.recipe || !voiceState.recipe.steps.length) return;
  voiceState.currentStep = 0;
  
  $('voice-recipe-title').textContent = voiceState.recipe.title;
  $('voice-overlay').setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  
  if (voiceState.recognition) {
    try { voiceState.recognition.start(); } catch(e){}
  }
  
  updateVoiceUI();
  readCurrentStep();
}

function closeVoiceMode() {
  voiceState.recipe = null;
  voiceState.synth.cancel();
  if (voiceState.recognition) voiceState.recognition.stop();
  $('voice-overlay').setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

function updateVoiceUI() {
  $('voice-step-counter').textContent = `Шаг ${voiceState.currentStep + 1} из ${voiceState.recipe.steps.length}`;
  $('voice-step-text').textContent = voiceState.recipe.steps[voiceState.currentStep];
}

function readCurrentStep() {
  voiceState.synth.cancel();
  const text = voiceState.recipe.steps[voiceState.currentStep];
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'ru-RU';
  utterance.rate = 0.95;
  voiceState.synth.speak(utterance);
}

function handleVoiceNext() {
  if (voiceState.currentStep < voiceState.recipe.steps.length - 1) {
    voiceState.currentStep++;
    updateVoiceUI();
    readCurrentStep();
  } else {
    voiceState.synth.cancel();
    voiceState.synth.speak(new SpeechSynthesisUtterance('Это был последний шаг. Приятного аппетита!'));
  }
}

function handleVoicePrev() {
  if (voiceState.currentStep > 0) {
    voiceState.currentStep--;
    updateVoiceUI();
    readCurrentStep();
  }
}

// ─── Analyze ───────────────────────────────────────────────────────────────────

let currentRecipes = [];

async function runAnalysis() {
  if (!state.file) return;
  setLoading(true);
  $('results-section').hidden = true;

  try {
    const activeVibe = document.querySelector('.vibe-btn.active')?.dataset.vibe || null;

    const form = new FormData();
    form.append('photo', state.file);
    form.append('allergens', JSON.stringify(state.prefs.allergens));
    form.append('dislikes', JSON.stringify(state.prefs.dislikes));
    if (activeVibe) form.append('vibe', activeVibe);

    const res = await apiFetch('/api/analyze', { method: 'POST', body: form });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Ошибка сервера');

    renderResults(data);
    $('results-section').hidden = false;
    setTimeout(() => {
      $('results-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  } catch (err) {
    showToast(err.message);
  } finally {
    setLoading(false);
  }
}

function setLoading(on) {
  $('btn-analyze').querySelector('.btn__text').hidden = on;
  $('btn-analyze').querySelector('.btn__icon').hidden = on;
  $('btn-analyze').querySelector('.btn__spinner').hidden = !on;
  $('btn-analyze').disabled = on;
}

// ─── Render results ────────────────────────────────────────────────────────────

function renderResults({ ingredients = [], recipes = [] }) {
  currentRecipes = recipes;
  const chipList = $('ingredients-list');
  chipList.innerHTML = ingredients.length
    ? ingredients.map((i) => `<span class="chip" role="listitem">${escHtml(i)}</span>`).join('')
    : '<span class="chip">Продукты не определены</span>';

  $('recipes-grid').innerHTML = recipes.map((r, idx) => recipeCard(r, idx)).join('');
}

function recipeCard(r, idx) {
  const diffMap = { легко: 'easy', средне: 'medium', сложно: 'hard' };
  const diffClass = diffMap[r.difficulty] || 'medium';
  const steps = (r.steps || [])
    .map((s, i) => `<div class="step"><span class="step__num">${i + 1}</span><span>${escHtml(s)}</span></div>`)
    .join('');
  const ingreds = (r.ingredients || []).map(escHtml).join(', ');
  
  let missingHtml = '';
  if (r.missingIngredients && r.missingIngredients.length > 0) {
    missingHtml = `
      <div class="missing-ingredients">
        <div class="missing-ingredients__title">🛒 Нужно докупить:</div>
        <div class="missing-ingredients__list">${r.missingIngredients.map(escHtml).join(', ')}</div>
      </div>
    `;
  }

  return `
    <div class="recipe-card" role="listitem" style="animation-delay:${idx * 0.12}s">
      <div>
        <h3 class="recipe-card__title">${escHtml(r.title)}</h3>
        <div class="recipe-card__meta">
          <span class="meta-tag meta-tag--time">⏱ ${r.time} мин</span>
          <span class="meta-tag meta-tag--${diffClass}">${escHtml(r.difficulty)}</span>
        </div>
      </div>
      <div class="recipe-card__ingredients"><strong>Ингредиенты:</strong> ${ingreds}</div>
      ${missingHtml}
      <div class="recipe-card__steps">${steps}</div>
      <button class="btn btn--primary btn--sm" style="margin-top:auto" onclick="openVoiceMode(${idx})">👨‍🍳 Готовить (Голос)</button>
    </div>`;
}

// ─── History drawer ────────────────────────────────────────────────────────────

async function openHistoryDrawer() {
  openDrawer($('history-drawer'));
  $('history-list').innerHTML = '<p class="empty-state">Загрузка...</p>';
  try {
    const res = await apiFetch('/api/history?limit=20');
    const data = await res.json();
    if (!data.items?.length) { $('history-list').innerHTML = '<p class="empty-state">История пуста</p>'; return; }
    $('history-list').innerHTML = data.items.map((item) => {
      const date = new Date(item.createdAt).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' });
      const recipes = item.aiResponse?.recipes?.map((r) => r.title).join(', ') || '—';
      return `<div class="history-item">
        <div class="history-item__date">${date}</div>
        <div class="history-item__ingredients">${escHtml(item.ingredients || '—')}</div>
        <div class="history-item__recipes">🍳 ${escHtml(recipes)}</div>
      </div>`;
    }).join('');
  } catch (err) {
    $('history-list').innerHTML = `<p class="error-toast" style="position:static;transform:none">${err.message}</p>`;
  }
}

// ─── Drawer helpers ────────────────────────────────────────────────────────────

function openDrawer(el) {
  el.setAttribute('aria-hidden', 'false');
  $('overlay').hidden = false;
  document.body.style.overflow = 'hidden';
}

function closeDrawer(el) {
  el.setAttribute('aria-hidden', 'true');
  $('overlay').hidden = true;
  document.body.style.overflow = '';
}

// ─── Auth modal ────────────────────────────────────────────────────────────────

function openAuthModal() {
  $('auth-modal').setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeAuthModal() {
  $('auth-modal').setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

// ─── Utilities ─────────────────────────────────────────────────────────────────

function escHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function showToast(msg) {
  const el = document.createElement('div');
  el.className = 'error-toast';
  el.textContent = `❌ ${msg}`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 5000);
}

// ─── Event listeners ──────────────────────────────────────────────────────────

function bindEvents() {
  // Upload
  const zone = $('upload-zone');
  zone.addEventListener('click', (e) => { if (!e.target.closest('button')) $('file-input').click(); });
  zone.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') $('file-input').click(); });
  $('btn-browse').addEventListener('click', () => $('file-input').click());
  $('btn-change').addEventListener('click', (e) => { e.stopPropagation(); resetUpload(); });
  $('file-input').addEventListener('change', () => handleFile($('file-input').files[0]));
  zone.addEventListener('dragenter', (e) => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragover',  (e) => { e.preventDefault(); });
  zone.addEventListener('dragleave', ()  => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', (e) => { e.preventDefault(); zone.classList.remove('drag-over'); handleFile(e.dataTransfer.files[0]); });

  // Analyze
  $('btn-analyze').addEventListener('click', runAnalysis);

  // History
  $('btn-history').addEventListener('click', openHistoryDrawer);
  $('btn-close-history').addEventListener('click', () => closeDrawer($('history-drawer')));

  // Preferences
  $('btn-prefs').addEventListener('click', () => { renderPrefsDrawer(); openDrawer($('prefs-drawer')); });
  $('btn-close-prefs').addEventListener('click', () => closeDrawer($('prefs-drawer')));

  $('btn-add-allergen').addEventListener('click', () => addPrefItem('allergens', 'allergen-input'));
  $('allergen-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); addPrefItem('allergens', 'allergen-input'); } });
  $('btn-add-dislike').addEventListener('click', () => addPrefItem('dislikes', 'dislike-input'));
  $('dislike-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); addPrefItem('dislikes', 'dislike-input'); } });

  $('btn-save-prefs').addEventListener('click', async () => {
    await savePrefsToServer();
    closeDrawer($('prefs-drawer'));
    showToast('✅ Предпочтения сохранены');
  });

  // Auth modal
  $('btn-close-modal').addEventListener('click', closeAuthModal);
  $('auth-modal').addEventListener('click', (e) => { if (e.target === $('auth-modal')) closeAuthModal(); });

  // Overlay
  $('overlay').addEventListener('click', () => {
    [$('history-drawer'), $('prefs-drawer')].forEach((d) => closeDrawer(d));
  });

  // Mobile bottom nav
  $('bnav-history')?.addEventListener('click', openHistoryDrawer);
  $('bnav-prefs')?.addEventListener('click', () => { renderPrefsDrawer(); openDrawer($('prefs-drawer')); });
  $('bnav-profile')?.addEventListener('click', () => { state.user ? null : openAuthModal(); });
  $('bnav-home')?.addEventListener('click', () => {
    $('main').scrollTo({ top: 0, behavior: 'smooth' });
    document.querySelectorAll('.bottom-nav__item').forEach((b) => b.classList.remove('active'));
    $('bnav-home').classList.add('active');
  });

  // Vibe Selector
  document.querySelectorAll('.vibe-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.vibe-btn').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-checked', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-checked', 'true');
    });
  });

  // Voice Controls
  $('btn-close-voice')?.addEventListener('click', closeVoiceMode);
  $('btn-voice-prev')?.addEventListener('click', handleVoicePrev);
  $('btn-voice-next')?.addEventListener('click', handleVoiceNext);
  $('btn-voice-repeat')?.addEventListener('click', readCurrentStep);

  // Expose openVoiceMode to global scope for inline onclick handlers in HTML
  window.openVoiceMode = openVoiceMode;
}


// ─── Init ──────────────────────────────────────────────────────────────────────

async function init() {
  loadToken();
  loadPrefsFromStorage();
  await Promise.all([fetchCurrentUser(), loadPrefsFromServer()]);
  renderAuthArea();
  updateActivePrefsUI();
  bindEvents();
}

init();
