// Main controller: view routing, Study/Words/Add/Settings behaviour.

let WORDS = [];
let SETTINGS = {};
let ghSha = null; // last known sha of data.json, for conflict-free writes
let studyDirection = 'de-en';
let currentCard = null;
let cardShowsAnswer = false;
let pushTimer = null;

/* ---------------- Init ---------------- */

async function init() {
  SETTINGS = loadSettings();
  hydrateSettingsForm();

  const local = loadLocalWords();
  WORDS = local || [];
  if (!local) ensureSeeded();

  wireTabs();
  wireStudy();
  wireWords();
  wireAdd();
  wireSettings();

  if (githubConfigured(SETTINGS)) {
    setSyncStatus('pending');
    try {
      const { words, sha } = await githubGetWords(SETTINGS);
      ghSha = sha;
      if (words) {
        WORDS = words;
        saveLocalWords(WORDS);
      } else if (WORDS.length) {
        // repo file doesn't exist yet — seed it with what we have locally
        ghSha = await githubPutWords(SETTINGS, WORDS, null);
      }
      setSyncStatus('ok');
    } catch (e) {
      console.error(e);
      setSyncStatus('err', e.message);
    }
  }

  renderAll();
}

function ensureSeeded() {
  WORDS = SEED_WORDS.map((w) => ({
    ...w,
    id: uid(),
    createdAt: new Date().toISOString(),
    srs: freshSrs(),
  }));
  saveLocalWords(WORDS);
}

function renderAll() {
  renderStudy();
  renderWordList();
}

/* ---------------- Persistence ---------------- */

function persist() {
  saveLocalWords(WORDS);
  if (githubConfigured(SETTINGS)) {
    setSyncStatus('pending');
    clearTimeout(pushTimer);
    pushTimer = setTimeout(pushToGithub, 1500);
  }
}

async function pushToGithub() {
  try {
    ghSha = await githubPutWords(SETTINGS, WORDS, ghSha);
    setSyncStatus('ok');
  } catch (e) {
    console.error(e);
    setSyncStatus('err', e.message);
  }
}

function setSyncStatus(state, msg) {
  const el = document.getElementById('syncStatus');
  el.classList.remove('ok', 'err');
  if (state === 'ok') { el.classList.add('ok'); el.title = 'Synced with GitHub'; }
  else if (state === 'err') { el.classList.add('err'); el.title = `Sync error: ${msg}`; }
  else if (state === 'pending') { el.title = 'Syncing…'; }
  else { el.title = 'Local only (no GitHub sync configured)'; }
}

/* ---------------- Tabs ---------------- */

function wireTabs() {
  document.getElementById('tabs').addEventListener('click', (e) => {
    const btn = e.target.closest('.tab-btn');
    if (!btn) return;
    switchView(btn.dataset.view);
  });
}

function switchView(view) {
  document.querySelectorAll('.tab-btn').forEach((b) => b.classList.toggle('active', b.dataset.view === view));
  document.querySelectorAll('.view').forEach((v) => v.classList.toggle('active', v.id === `view-${view}`));
  if (view === 'study') renderStudy();
  if (view === 'words') renderWordList();
}

/* ================= STUDY ================= */

function wireStudy() {
  document.getElementById('directionToggle').addEventListener('click', (e) => {
    const btn = e.target.closest('.dir-btn');
    if (!btn) return;
    studyDirection = btn.dataset.dir;
    document.querySelectorAll('.dir-btn').forEach((b) => b.classList.toggle('active', b === btn));
    renderStudy();
  });

  document.getElementById('showAnswerBtn').addEventListener('click', revealAnswer);
  document.getElementById('fcSpeakBtn').addEventListener('click', () => {
    if (currentCard) speak(currentCard.german, 'de-DE');
  });
  document.getElementById('gradeBtns').addEventListener('click', (e) => {
    const btn = e.target.closest('.grade-btn');
    if (!btn) return;
    grade(Number(btn.dataset.grade));
  });

  document.addEventListener('keydown', (e) => {
    if (!document.getElementById('view-study').classList.contains('active')) return;
    if (e.code === 'Space') { e.preventDefault(); cardShowsAnswer ? null : revealAnswer(); }
    if (cardShowsAnswer && ['1', '2', '3', '4'].includes(e.key)) grade(Number(e.key) - 1);
  });
}

function dueWords() {
  return WORDS.filter((w) => isDue(w.srs)).sort((a, b) => new Date(a.srs.due) - new Date(b.srs.due));
}

function renderStudy() {
  const due = dueWords();
  document.getElementById('dueCount').textContent = `${due.length} card${due.length === 1 ? '' : 's'} due`;

  if (!due.length) {
    document.getElementById('flashcard').hidden = true;
    document.getElementById('emptyState').hidden = false;
    document.getElementById('showAnswerBtn').hidden = true;
    document.getElementById('gradeBtns').hidden = true;
    currentCard = null;
    return;
  }

  document.getElementById('flashcard').hidden = false;
  document.getElementById('emptyState').hidden = true;
  currentCard = due[0];
  cardShowsAnswer = false;

  const dir = studyDirection === 'mixed' ? (Math.random() < 0.5 ? 'de-en' : 'en-de') : studyDirection;
  currentCard._dir = dir;

  document.getElementById('fcType').textContent = currentCard.type;
  document.getElementById('fcFront').textContent = dir === 'de-en' ? currentCard.german : currentCard.english;
  document.getElementById('fcBack').hidden = true;
  document.getElementById('showAnswerBtn').hidden = false;
  document.getElementById('gradeBtns').hidden = true;
}

function revealAnswer() {
  if (!currentCard) return;
  cardShowsAnswer = true;
  const dir = currentCard._dir;
  document.getElementById('fcAnswer').textContent = dir === 'de-en' ? currentCard.english : currentCard.german;
  document.getElementById('fcHint').textContent = grammarHint(currentCard);
  document.getElementById('fcBack').hidden = false;
  document.getElementById('showAnswerBtn').hidden = true;
  document.getElementById('gradeBtns').hidden = false;
  if (dir === 'en-de') speak(currentCard.german, 'de-DE');
}

function grammarHint(w) {
  if (w.type === 'verb' && w.verb) {
    const bits = [`${w.verb.regular ? 'regular' : 'irregular'}${w.verb.separable ? ', separable' : ''}`, `aux: ${w.verb.auxiliary}`, `Partizip II: ${w.verb.partizipII}`];
    return bits.join(' · ');
  }
  if (w.type === 'noun' && w.noun) {
    return `${w.noun.gender} ${w.german} · plural: ${w.noun.plural}`;
  }
  if (w.type === 'adjective' && w.adjective) {
    return `komparativ: ${w.adjective.comparative} · superlativ: am ${w.adjective.superlative}`;
  }
  return '';
}

function grade(g) {
  if (!currentCard) return;
  currentCard.srs = gradeCard(currentCard.srs, g);
  persist();
  renderStudy();
}

/* ================= WORDS ================= */

let wordFilterType = 'all';
let wordSearchTerm = '';

function wireWords() {
  document.getElementById('wordSearch').addEventListener('input', (e) => {
    wordSearchTerm = e.target.value.trim().toLowerCase();
    renderWordList();
  });
  document.getElementById('filterChips').addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    wordFilterType = chip.dataset.type;
    document.querySelectorAll('.chip').forEach((c) => c.classList.toggle('active', c === chip));
    renderWordList();
  });
  document.getElementById('modalBackdrop').addEventListener('click', (e) => {
    if (e.target.id === 'modalBackdrop') closeModal();
  });
}

function renderWordList() {
  const list = document.getElementById('wordList');
  const filtered = WORDS.filter((w) => {
    if (wordFilterType !== 'all' && w.type !== wordFilterType) return false;
    if (wordSearchTerm && !`${w.german} ${w.english}`.toLowerCase().includes(wordSearchTerm)) return false;
    return true;
  }).sort((a, b) => a.german.localeCompare(b.german, 'de'));

  if (!filtered.length) {
    list.innerHTML = '<p class="muted">No words match.</p>';
    return;
  }

  list.innerHTML = filtered.map((w) => `
    <div class="word-row" data-id="${w.id}">
      <span class="word-badge badge-${w.type}">${w.type}</span>
      <span class="german">${escapeHtml(w.german)}</span>
      <span class="english">${escapeHtml(w.english)}</span>
      <span class="due-pill">${isDue(w.srs) ? 'due now' : `due ${new Date(w.srs.due).toLocaleDateString()}`}</span>
    </div>
  `).join('');

  list.querySelectorAll('.word-row').forEach((row) => {
    row.addEventListener('click', () => openWordModal(row.dataset.id));
  });
}

function openWordModal(id) {
  const w = WORDS.find((x) => x.id === id);
  if (!w) return;
  document.getElementById('wordModal').innerHTML = buildWordDetailHtml(w);
  document.getElementById('modalBackdrop').hidden = false;

  const modal = document.getElementById('wordModal');
  modal.querySelectorAll('[data-speak]').forEach((btn) => {
    btn.addEventListener('click', () => speak(btn.dataset.speak, 'de-DE'));
  });
  modal.querySelector('#modalCloseBtn').addEventListener('click', closeModal);
  modal.querySelector('#modalDeleteBtn').addEventListener('click', () => {
    if (confirm(`Delete "${w.german}" from your word list?`)) {
      WORDS = WORDS.filter((x) => x.id !== id);
      persist();
      closeModal();
      renderAll();
    }
  });
}

function closeModal() {
  document.getElementById('modalBackdrop').hidden = true;
}

function buildWordDetailHtml(w) {
  let body = '';
  if (w.type === 'verb') body = verbDetailHtml(w);
  else if (w.type === 'noun') body = nounDetailHtml(w);
  else if (w.type === 'adjective') body = adjectiveDetailHtml(w);

  return `
    <h2>${escapeHtml(w.german)} <button class="inline-speak" data-speak="${escapeHtml(w.german)}">🔊</button></h2>
    <p class="muted">${escapeHtml(w.english)}${w.notes ? ` — ${escapeHtml(w.notes)}` : ''}</p>
    ${body}
    <div class="modal-close-row">
      <button class="btn danger" id="modalDeleteBtn">Delete</button>
      <button class="btn primary" id="modalCloseBtn">Close</button>
    </div>
  `;
}

function verbDetailHtml(w) {
  const v = w.verb;
  const tenses = buildVerbTenses(v, w.german);
  const traits = `${v.regular ? 'Regular (weak)' : 'Irregular (strong/mixed)'}${v.separable ? ' · Separable (trennbar)' + (v.prefix ? `, prefix "${v.prefix}"` : '') : ''} · Auxiliary: ${v.auxiliary} · Partizip II: ${v.partizipII}`;

  const tenseOrder = ['praesens', 'praeteritum', 'perfekt', 'plusquamperfekt', 'futur1', 'futur2', 'konjunktiv2', 'konjunktiv2Perfekt'];
  const tables = tenseOrder.map((t) => `
    <div class="section-title">${TENSE_LABELS[t]}</div>
    <table>
      ${PERSONS.map((p) => `<tr><td>${PERSON_LABELS[p]}</td><td>${escapeHtml(tenses[t][p] || '—')}
        <button class="inline-speak" data-speak="${escapeHtml((tenses[t][p] || '').replace(' … ', ' '))}">🔊</button></td></tr>`).join('')}
    </table>
  `).join('');

  return `<p><strong>${traits}</strong></p>${tables}`;
}

function nounDetailHtml(w) {
  const n = w.noun;
  const decl = buildNounDeclension(n, w.german);
  const genderClass = { der: 'gender-der', die: 'gender-die', das: 'gender-das' }[n.gender];
  const rows = (obj, label) => `
    <div class="section-title">${label}</div>
    <table>
      <tr><th>Case</th><th>Definite</th><th>Indefinite</th></tr>
      ${Object.keys(CASE_LABELS).map((c) => `<tr><td>${CASE_LABELS[c]}</td><td>${escapeHtml(obj[c].def)}</td><td>${escapeHtml(obj[c].indef)}</td></tr>`).join('')}
    </table>
  `;
  return `
    <p><span class="gender-tag ${genderClass}">${n.gender}</span> ${escapeHtml(w.german)} &nbsp; plural: <strong>${escapeHtml(n.plural)}</strong></p>
    ${rows(decl.singular, 'Singular declension')}
    ${rows(decl.plural, 'Plural declension')}
  `;
}

function adjectiveDetailHtml(w) {
  const a = w.adjective;
  const comparison = `
    <div class="section-title">Comparison</div>
    <table>
      <tr><th>Positive</th><th>Comparative</th><th>Superlative</th></tr>
      <tr><td>${escapeHtml(w.german)}</td><td>${escapeHtml(a.comparative)}</td><td>am ${escapeHtml(a.superlative)}</td></tr>
    </table>
  `;
  const endingTables = Object.keys(ADJ_ENDINGS).map((k) => {
    const t = ADJ_ENDINGS[k];
    return `
      <div class="section-title">${t.label}</div>
      <table>
        <tr><th>Case</th>${Object.keys(GENDER_COL_LABELS).map((g) => `<th>${GENDER_COL_LABELS[g]}</th>`).join('')}</tr>
        ${Object.keys(CASE_LABELS).map((c) => `<tr><td>${CASE_LABELS[c]}</td>${Object.keys(GENDER_COL_LABELS).map((g) => `<td>${escapeHtml(w.german)}-${t[c][g]}</td>`).join('')}</tr>`).join('')}
      </table>
    `;
  }).join('');
  const note = a.predicateOnly ? '<p class="muted">Predicate-only: does not take declension endings before a noun.</p>' : '';
  const stemNote = a.predicateOnly ? '' : '<p class="muted">Endings shown on the dictionary form — a few adjectives shift spelling before an ending (e.g. hoch → hohe, teuer → teure). Check the comparative/superlative above for the real stem.</p>';
  return `${comparison}${note}${a.predicateOnly ? '' : endingTables}${stemNote}`;
}

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* ================= ADD ================= */

let pendingWordData = null;

function wireAdd() {
  document.getElementById('aiLookupBtn').addEventListener('click', doAiLookup);
  document.getElementById('manualEntryBtn').addEventListener('click', () => {
    const word = document.getElementById('addWordInput').value.trim();
    const typeHint = document.getElementById('addTypeHint').value;
    pendingWordData = blankWordData(word, typeHint === 'auto' ? 'verb' : typeHint);
    renderWordForm(pendingWordData);
  });
}

function blankWordData(german, type) {
  const base = { type, german: german || '', english: '', notes: '' };
  if (type === 'verb') base.verb = { regular: true, separable: false, prefix: '', auxiliary: 'haben', partizipII: '', praesens: {}, praeteritum: {}, konjunktiv2: {} };
  if (type === 'noun') base.noun = { gender: 'der', plural: '', genitiveSingular: '', pluralDative: '' };
  if (type === 'adjective') base.adjective = { comparative: '', superlative: '', predicateOnly: false };
  return base;
}

async function doAiLookup() {
  const word = document.getElementById('addWordInput').value.trim();
  const statusEl = document.getElementById('aiStatus');
  if (!word) { statusEl.textContent = 'Type a word first.'; statusEl.className = 'ai-status err'; return; }
  if (!SETTINGS.aiApiKey) {
    statusEl.textContent = 'No Claude API key set — add one in Settings, or use "Enter manually".';
    statusEl.className = 'ai-status err';
    return;
  }
  statusEl.textContent = 'Looking up with Claude…';
  statusEl.className = 'ai-status';
  document.getElementById('aiLookupBtn').disabled = true;
  try {
    const data = await lookupWordWithAI(word, SETTINGS);
    pendingWordData = normalizeAiData(data);
    statusEl.textContent = 'Got it — review and save below.';
    statusEl.className = 'ai-status ok';
    renderWordForm(pendingWordData);
  } catch (e) {
    console.error(e);
    statusEl.textContent = `Lookup failed: ${e.message}`;
    statusEl.className = 'ai-status err';
  } finally {
    document.getElementById('aiLookupBtn').disabled = false;
  }
}

function normalizeAiData(data) {
  const type = ['verb', 'noun', 'adjective'].includes(data.type) ? data.type : 'verb';
  const merged = blankWordData(data.german || '', type);
  merged.english = data.english || '';
  merged.notes = data.notes || '';
  if (type === 'verb' && data.verb) Object.assign(merged.verb, data.verb);
  if (type === 'noun' && data.noun) Object.assign(merged.noun, data.noun);
  if (type === 'adjective' && data.adjective) Object.assign(merged.adjective, data.adjective);
  return merged;
}

function renderWordForm(data) {
  const form = document.getElementById('wordForm');
  form.hidden = false;

  let typeFields = '';
  if (data.type === 'verb') typeFields = verbFormFields(data.verb);
  else if (data.type === 'noun') typeFields = nounFormFields(data.noun);
  else if (data.type === 'adjective') typeFields = adjectiveFormFields(data.adjective);

  form.innerHTML = `
    <div class="form-row">
      <label>Type
        <select data-field="type">
          <option value="verb" ${data.type === 'verb' ? 'selected' : ''}>Verb</option>
          <option value="noun" ${data.type === 'noun' ? 'selected' : ''}>Noun</option>
          <option value="adjective" ${data.type === 'adjective' ? 'selected' : ''}>Adjective</option>
        </select>
      </label>
      <label>German
        <input type="text" data-field="german" value="${escapeHtml(data.german)}" required>
      </label>
      <label>English
        <input type="text" data-field="english" value="${escapeHtml(data.english)}" required>
      </label>
    </div>
    <label>Notes
      <input type="text" data-field="notes" value="${escapeHtml(data.notes || '')}">
    </label>
    <div id="typeFields">${typeFields}</div>
    <div class="settings-actions">
      <button type="submit" class="btn primary">💾 Save word</button>
      <button type="button" class="btn ghost" id="cancelFormBtn">Cancel</button>
    </div>
  `;

  form.querySelector('[data-field="type"]').addEventListener('change', (e) => {
    pendingWordData = blankWordData(readField(form, 'german') || data.german, e.target.value);
    renderWordForm(pendingWordData);
  });
  form.querySelector('#cancelFormBtn').addEventListener('click', () => { form.hidden = true; form.innerHTML = ''; pendingWordData = null; });
  form.onsubmit = (e) => { e.preventDefault(); saveWordForm(form); };
}

function readField(scope, name) {
  const el = scope.querySelector(`[data-field="${name}"]`);
  return el ? el.value : '';
}

function personGrid(prefix, values) {
  return `<div class="conj-grid">${PERSONS.map((p) => `
    <label>${p}</label>
    <input type="text" data-field="${prefix}.${p}" value="${escapeHtml((values && values[p]) || '')}">
  `).join('')}</div>`;
}

function verbFormFields(v) {
  return `
    <div class="form-section-title">Verb details</div>
    <div class="form-row">
      <label><input type="checkbox" data-field="verb.regular" ${v.regular ? 'checked' : ''}> Regular (weak)</label>
      <label><input type="checkbox" data-field="verb.separable" ${v.separable ? 'checked' : ''}> Separable (trennbar)</label>
      <label>Prefix
        <input type="text" data-field="verb.prefix" value="${escapeHtml(v.prefix || '')}">
      </label>
      <label>Auxiliary
        <select data-field="verb.auxiliary">
          <option value="haben" ${v.auxiliary === 'haben' ? 'selected' : ''}>haben</option>
          <option value="sein" ${v.auxiliary === 'sein' ? 'selected' : ''}>sein</option>
        </select>
      </label>
      <label>Partizip II
        <input type="text" data-field="verb.partizipII" value="${escapeHtml(v.partizipII || '')}">
      </label>
    </div>
    <div class="form-section-title">Präsens</div>
    ${personGrid('verb.praesens', v.praesens)}
    <div class="form-section-title">Präteritum</div>
    ${personGrid('verb.praeteritum', v.praeteritum)}
    <div class="form-section-title">Konjunktiv II (optional — leave blank for auto würde-form)</div>
    ${personGrid('verb.konjunktiv2', v.konjunktiv2)}
  `;
}

function nounFormFields(n) {
  return `
    <div class="form-section-title">Noun details</div>
    <div class="form-row">
      <label>Gender
        <select data-field="noun.gender">
          <option value="der" ${n.gender === 'der' ? 'selected' : ''}>der</option>
          <option value="die" ${n.gender === 'die' ? 'selected' : ''}>die</option>
          <option value="das" ${n.gender === 'das' ? 'selected' : ''}>das</option>
        </select>
      </label>
      <label>Plural
        <input type="text" data-field="noun.plural" value="${escapeHtml(n.plural || '')}">
      </label>
      <label>Genitive singular
        <input type="text" data-field="noun.genitiveSingular" value="${escapeHtml(n.genitiveSingular || '')}" placeholder="e.g. Mannes">
      </label>
      <label>Plural dative
        <input type="text" data-field="noun.pluralDative" value="${escapeHtml(n.pluralDative || '')}" placeholder="e.g. Männern">
      </label>
    </div>
  `;
}

function adjectiveFormFields(a) {
  return `
    <div class="form-section-title">Adjective details</div>
    <div class="form-row">
      <label>Comparative
        <input type="text" data-field="adjective.comparative" value="${escapeHtml(a.comparative || '')}">
      </label>
      <label>Superlative (without "am")
        <input type="text" data-field="adjective.superlative" value="${escapeHtml(a.superlative || '')}">
      </label>
      <label><input type="checkbox" data-field="adjective.predicateOnly" ${a.predicateOnly ? 'checked' : ''}> Predicate-only (no declension)</label>
    </div>
  `;
}

function saveWordForm(form) {
  const type = readField(form, 'type');
  const word = { type, german: readField(form, 'german').trim(), english: readField(form, 'english').trim(), notes: readField(form, 'notes').trim() };

  if (type === 'verb') {
    const persons = (prefix) => PERSONS.reduce((acc, p) => {
      const val = form.querySelector(`[data-field="${prefix}.${p}"]`).value.trim();
      if (val) acc[p] = val;
      return acc;
    }, {});
    const k2 = persons('verb.konjunktiv2');
    word.verb = {
      regular: form.querySelector('[data-field="verb.regular"]').checked,
      separable: form.querySelector('[data-field="verb.separable"]').checked,
      prefix: readField(form, 'verb.prefix').trim() || null,
      auxiliary: readField(form, 'verb.auxiliary'),
      partizipII: readField(form, 'verb.partizipII').trim(),
      praesens: persons('verb.praesens'),
      praeteritum: persons('verb.praeteritum'),
      konjunktiv2: Object.keys(k2).length ? k2 : null,
    };
  } else if (type === 'noun') {
    word.noun = {
      gender: readField(form, 'noun.gender'),
      plural: readField(form, 'noun.plural').trim(),
      genitiveSingular: readField(form, 'noun.genitiveSingular').trim() || null,
      pluralDative: readField(form, 'noun.pluralDative').trim() || null,
    };
  } else if (type === 'adjective') {
    word.adjective = {
      comparative: readField(form, 'adjective.comparative').trim(),
      superlative: readField(form, 'adjective.superlative').trim(),
      predicateOnly: form.querySelector('[data-field="adjective.predicateOnly"]').checked,
    };
  }

  if (!word.german || !word.english) { alert('German and English are required.'); return; }

  word.id = uid();
  word.createdAt = new Date().toISOString();
  word.srs = freshSrs();

  WORDS.push(word);
  persist();
  renderAll();

  form.hidden = true;
  form.innerHTML = '';
  pendingWordData = null;
  document.getElementById('addWordInput').value = '';
  document.getElementById('aiStatus').textContent = `Saved "${word.german}" ✓`;
  document.getElementById('aiStatus').className = 'ai-status ok';
}

/* ================= SETTINGS ================= */

function hydrateSettingsForm() {
  document.getElementById('aiApiKey').value = SETTINGS.aiApiKey || '';
  document.getElementById('aiModel').value = SETTINGS.aiModel || 'claude-haiku-4-5-20251001';
  document.getElementById('ghToken').value = SETTINGS.ghToken || '';
  document.getElementById('ghOwner').value = SETTINGS.ghOwner || '';
  document.getElementById('ghRepo').value = SETTINGS.ghRepo || '';
  document.getElementById('ghBranch').value = SETTINGS.ghBranch || 'main';
  document.getElementById('ghPath').value = SETTINGS.ghPath || 'data.json';
  setSyncStatus(githubConfigured(SETTINGS) ? 'pending' : 'none');
}

function wireSettings() {
  document.getElementById('saveSettingsBtn').addEventListener('click', () => {
    SETTINGS = {
      aiApiKey: document.getElementById('aiApiKey').value.trim(),
      aiModel: document.getElementById('aiModel').value,
      ghToken: document.getElementById('ghToken').value.trim(),
      ghOwner: document.getElementById('ghOwner').value.trim(),
      ghRepo: document.getElementById('ghRepo').value.trim(),
      ghBranch: document.getElementById('ghBranch').value.trim() || 'main',
      ghPath: document.getElementById('ghPath').value.trim() || 'data.json',
    };
    saveSettings(SETTINGS);
    ghSha = null;
    const msg = document.getElementById('settingsSavedMsg');
    msg.textContent = 'Saved ✓';
    msg.className = 'ai-status ok';
    setSyncStatus(githubConfigured(SETTINGS) ? 'pending' : 'none');
    setTimeout(() => { msg.textContent = ''; }, 2500);
  });

  document.getElementById('ghPullBtn').addEventListener('click', async () => {
    const status = document.getElementById('ghStatus');
    if (!githubConfigured(SETTINGS)) { status.textContent = 'Fill in GitHub fields and save settings first.'; status.className = 'ai-status err'; return; }
    status.textContent = 'Pulling…'; status.className = 'ai-status';
    try {
      const { words, sha } = await githubGetWords(SETTINGS);
      ghSha = sha;
      if (words) { WORDS = words; saveLocalWords(WORDS); renderAll(); }
      status.textContent = words ? 'Pulled latest ✓' : 'No data.json in repo yet — push to create it.';
      status.className = 'ai-status ok';
      setSyncStatus('ok');
    } catch (e) {
      status.textContent = `Pull failed: ${e.message}`; status.className = 'ai-status err';
      setSyncStatus('err', e.message);
    }
  });

  document.getElementById('ghPushBtn').addEventListener('click', async () => {
    const status = document.getElementById('ghStatus');
    if (!githubConfigured(SETTINGS)) { status.textContent = 'Fill in GitHub fields and save settings first.'; status.className = 'ai-status err'; return; }
    status.textContent = 'Pushing…'; status.className = 'ai-status';
    try {
      ghSha = await githubPutWords(SETTINGS, WORDS, ghSha);
      status.textContent = 'Pushed ✓'; status.className = 'ai-status ok';
      setSyncStatus('ok');
    } catch (e) {
      status.textContent = `Push failed: ${e.message}`; status.className = 'ai-status err';
      setSyncStatus('err', e.message);
    }
  });

  document.getElementById('exportBtn').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(WORDS, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vokabeltrainer-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  document.getElementById('importBtn').addEventListener('click', () => document.getElementById('importFile').click());
  document.getElementById('importFile').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = JSON.parse(reader.result);
        if (!Array.isArray(imported)) throw new Error('File is not a word list array.');
        WORDS = imported;
        persist();
        renderAll();
        alert(`Imported ${imported.length} words.`);
      } catch (err) {
        alert(`Import failed: ${err.message}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  });
}

init();
