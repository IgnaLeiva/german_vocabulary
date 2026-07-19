// Main controller: view routing, Study/Words/Add/Settings behaviour.

let WORDS = [];
let SETTINGS = {};
let ghSha = null; // last known sha of data.json, for conflict-free writes
let studyDirection = 'de-en';
let currentCard = null;
let cardShowsAnswer = false;
let pushTimer = null;

// This app's own public repo — fixed, not user-editable. Reading a public
// repo's contents needs no token, so any brand-new device (e.g. a phone) auto
// -pulls the latest words with zero setup. A token (Settings) is only needed
// to push changes from a given device.
const DEFAULT_GH = { ghOwner: 'IgnaLeiva', ghRepo: 'german_vocabulary', ghBranch: 'main', ghPath: 'data.json' };

/* ---------------- Init ---------------- */

async function init() {
  // Owner/repo/branch/path always come from DEFAULT_GH — only ghToken, aiApiKey,
  // and aiModel are user-editable/persisted.
  SETTINGS = { ...loadSettings(), ...DEFAULT_GH };
  hydrateSettingsForm();

  const local = loadLocalWords();
  WORDS = local || [];
  if (!local) ensureSeeded();

  wireTabs();
  wireStudy();
  wireWords();
  wireGrammar();
  wireAdd();
  wireSettings();

  if (githubReadConfigured(SETTINGS)) {
    setSyncStatus('pending');
    try {
      const { words, sha } = await githubGetWords(SETTINGS);
      ghSha = sha;
      if (words) {
        WORDS = words;
        saveLocalWords(WORDS);
      } else if (WORDS.length && githubConfigured(SETTINGS)) {
        // repo file doesn't exist yet — seed it with what we have locally (needs a token)
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

// Debounced push — used for high-frequency changes (grading cards during a
// study session) so we don't fire an API call on every single grade.
function persist() {
  saveLocalWords(WORDS);
  if (githubConfigured(SETTINGS)) {
    setSyncStatus('pending');
    clearTimeout(pushTimer);
    pushTimer = setTimeout(pushToGithub, 1500);
  }
}

// Immediate push — used for deliberate, one-off changes (adding/deleting a
// word, importing a backup) where the user expects it to sync right away.
function persistNow() {
  saveLocalWords(WORDS);
  clearTimeout(pushTimer);
  if (githubConfigured(SETTINGS)) {
    setSyncStatus('pending');
    pushToGithub();
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
  if (view === 'grammar') renderGrammarView();
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
  renderConfusableWarning(currentCard);
  if (dir === 'en-de') speak(currentCard.german, 'de-DE');
}

function renderConfusableWarning(w) {
  const el = document.getElementById('fcConfusable');
  const confusables = (w.confusables || []).map((id) => WORDS.find((x) => x.id === id)).filter(Boolean);
  if (!confusables.length) { el.hidden = true; el.innerHTML = ''; return; }
  el.hidden = false;
  el.innerHTML = `⚠️ Don't confuse "${escapeHtml(w.german)}" with: ` + confusables.map((c) =>
    `<strong>${escapeHtml(c.german)}</strong> (${escapeHtml(c.english)}) <button type="button" class="inline-speak" data-speak="${escapeHtml(c.german)}">🔊</button>`
  ).join(', ');
  el.querySelectorAll('[data-speak]').forEach((btn) => {
    btn.addEventListener('click', () => speak(btn.dataset.speak, 'de-DE'));
  });
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
    <div class="word-row" data-id="${escapeHtml(w.id)}">
      <span class="word-badge ${TYPE_BADGE_CLASS[w.type] || 'badge-verb'}">${escapeHtml(w.type)}</span>
      <span class="german">${escapeHtml(w.german)}</span>
      <span class="english">${escapeHtml(w.english)}</span>
      <span class="due-pill">${isDue(w.srs) ? 'due now' : `due ${new Date(w.srs.due).toLocaleDateString()}`}</span>
    </div>
  `).join('');

  list.querySelectorAll('.word-row').forEach((row) => {
    row.addEventListener('click', () => openWordModal(row.dataset.id));
  });
}

const TYPE_BADGE_CLASS = { verb: 'badge-verb', noun: 'badge-noun', adjective: 'badge-adjective' };

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
      persistNow();
      closeModal();
      renderAll();
    }
  });

  modal.querySelectorAll('[data-unlink]').forEach((btn) => {
    btn.addEventListener('click', () => unlinkConfusable(id, btn.dataset.unlink));
  });

  const searchInput = modal.querySelector('#confusableSearch');
  const resultsEl = modal.querySelector('#confusableSearchResults');
  let confusableSearchTimer = null;
  searchInput.addEventListener('input', () => {
    clearTimeout(confusableSearchTimer);
    const query = searchInput.value;
    confusableSearchTimer = setTimeout(() => renderConfusableSearchResults(w, query, resultsEl), 200);
  });

  modal.querySelector('#suggestConfusablesBtn').addEventListener('click', () => {
    renderConfusableSuggestions(w, modal.querySelector('#confusableSuggestions'));
  });
}

function linkConfusable(wordId, otherId) {
  const w = WORDS.find((x) => x.id === wordId);
  const o = WORDS.find((x) => x.id === otherId);
  if (!w || !o) return;
  w.confusables = w.confusables || [];
  o.confusables = o.confusables || [];
  if (!w.confusables.includes(otherId)) w.confusables.push(otherId);
  if (!o.confusables.includes(wordId)) o.confusables.push(wordId);
  persistNow();
  openWordModal(wordId);
}

function unlinkConfusable(wordId, otherId) {
  const w = WORDS.find((x) => x.id === wordId);
  const o = WORDS.find((x) => x.id === otherId);
  if (w) w.confusables = (w.confusables || []).filter((cid) => cid !== otherId);
  if (o) o.confusables = (o.confusables || []).filter((cid) => cid !== wordId);
  persistNow();
  openWordModal(wordId);
}

function renderConfusableSearchResults(w, query, el) {
  const q = query.trim().toLowerCase();
  if (!q) { el.innerHTML = ''; return; }
  const linked = new Set(w.confusables || []);
  const matches = WORDS.filter((x) => x.id !== w.id && !linked.has(x.id)
    && (x.german.toLowerCase().includes(q) || x.english.toLowerCase().includes(q))).slice(0, 6);
  if (!matches.length) { el.innerHTML = '<p class="muted">No matches.</p>'; return; }
  el.innerHTML = matches.map((m) => `
    <div class="confusable-result" data-link="${escapeHtml(m.id)}">
      <span><span class="word-badge ${TYPE_BADGE_CLASS[m.type] || 'badge-verb'}">${escapeHtml(m.type)}</span> ${escapeHtml(m.german)} — ${escapeHtml(m.english)}</span>
      <span class="btn ghost small">+ Link</span>
    </div>
  `).join('');
  el.querySelectorAll('[data-link]').forEach((row) => {
    row.addEventListener('click', () => linkConfusable(w.id, row.dataset.link));
  });
}

function renderConfusableSuggestions(w, el) {
  const candidates = findConfusableCandidates(w, WORDS).slice(0, 6);
  if (!candidates.length) { el.innerHTML = '<p class="muted">No suggestions found — link one manually with the search box above if you know of one.</p>'; return; }
  el.innerHTML = candidates.map((c) => {
    const other = WORDS.find((x) => x.id === c.id);
    if (!other) return '';
    return `
      <div class="confusable-suggestion">
        <div><span class="word-badge ${TYPE_BADGE_CLASS[other.type] || 'badge-verb'}">${escapeHtml(other.type)}</span> <strong>${escapeHtml(other.german)}</strong> — ${escapeHtml(other.english)}<span class="reason">${escapeHtml(c.reason)}</span></div>
        <button type="button" class="btn ghost small" data-suggest-add="${escapeHtml(other.id)}">+ Add</button>
      </div>
    `;
  }).join('');
  el.querySelectorAll('[data-suggest-add]').forEach((btn) => {
    btn.addEventListener('click', () => linkConfusable(w.id, btn.dataset.suggestAdd));
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
    ${confusablesSectionHtml(w)}
    ${body}
    <div class="modal-close-row">
      <button class="btn danger" id="modalDeleteBtn">Delete</button>
      <button class="btn primary" id="modalCloseBtn">Close</button>
    </div>
  `;
}

function confusablesSectionHtml(w) {
  const linked = (w.confusables || []).map((id) => WORDS.find((x) => x.id === id)).filter(Boolean);
  const rows = linked.length ? linked.map((c) => `
    <div class="confusable-row">
      <span class="word-badge ${TYPE_BADGE_CLASS[c.type] || 'badge-verb'}">${escapeHtml(c.type)}</span>
      <span class="german">${escapeHtml(c.german)}</span>
      <span class="english">${escapeHtml(c.english)}</span>
      <button type="button" class="inline-speak" data-speak="${escapeHtml(c.german)}">🔊</button>
      <button type="button" class="btn ghost small" data-unlink="${escapeHtml(c.id)}">✕</button>
    </div>
  `).join('') : '<p class="muted">None linked yet.</p>';

  return `
    <div class="section-title">⚠️ Don't confuse with</div>
    <div id="confusablesList">${rows}</div>
    <div class="confusable-add-row">
      <input type="text" id="confusableSearch" placeholder="Search a word to link…" autocomplete="off">
      <button type="button" class="btn ghost small" id="suggestConfusablesBtn">💡 Suggest</button>
    </div>
    <div id="confusableSearchResults"></div>
    <div id="confusableSuggestions"></div>
  `;
}

function verbDetailHtml(w) {
  const v = w.verb;
  const tenses = buildVerbTenses(v, w.german);
  const traits = `${v.regular ? 'Regular (weak)' : 'Irregular (strong/mixed)'}${v.separable ? ' · Separable (trennbar)' + (v.prefix ? `, prefix "${escapeHtml(v.prefix)}"` : '') : ''} · Auxiliary: ${escapeHtml(v.auxiliary)} · Partizip II: ${escapeHtml(v.partizipII)}`;

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
  const genderClass = { der: 'gender-der', die: 'gender-die', das: 'gender-das' }[n.gender] || 'gender-der';
  const rows = (obj, label) => `
    <div class="section-title">${label}</div>
    <table>
      <tr><th>Case</th><th>Definite</th><th>Indefinite</th></tr>
      ${Object.keys(CASE_LABELS).map((c) => `<tr><td>${CASE_LABELS[c]}</td><td>${escapeHtml(obj[c].def)}</td><td>${escapeHtml(obj[c].indef)}</td></tr>`).join('')}
    </table>
  `;
  return `
    <p><span class="gender-tag ${genderClass}">${escapeHtml(n.gender)}</span> ${escapeHtml(w.german)} &nbsp; plural: <strong>${escapeHtml(n.plural)}</strong></p>
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

/* ================= GRAMMAR (reference + practice) ================= */

let grammarQuizStarted = false;

function wireGrammar() {
  // Quiz option/next buttons are wired per-render in renderQuizQuestion/answerQuiz.
}

function renderGrammarView() {
  renderGrammarReference();
  if (!grammarQuizStarted) {
    grammarQuizStarted = true;
    nextQuizQuestion();
  }
}

function articleReferenceTable(articleMap) {
  const { der, die, das } = EXAMPLE_NOUNS;
  const phrase = (genderKey, c, noun) => `${articleMap[genderKey][c]} ${exampleNounWord(noun, genderKey, c)}`;
  return `
    <table>
      <tr><th>Case</th><th>maskulin</th><th>feminin</th><th>neutral</th><th>Plural</th></tr>
      ${Object.keys(CASE_LABELS).map((c) => `<tr>
        <td>${CASE_LABELS[c]}</td>
        <td>${phrase('der', c, der)}</td>
        <td>${phrase('die', c, die)}</td>
        <td>${phrase('das', c, das)}</td>
        <td>${phrase('plural', c, der)}</td>
      </tr>`).join('')}
    </table>
  `;
}

function possessiveReferenceTable(stem) {
  const decl = possessiveDeclension(stem);
  const { der, die, das } = EXAMPLE_NOUNS;
  const phrase = (colKey, genderKey, c, noun) => `${decl[c][colKey]} ${exampleNounWord(noun, genderKey, c)}`;
  return `
    <table>
      <tr><th>Case</th><th>maskulin</th><th>feminin</th><th>neutral</th><th>Plural</th></tr>
      ${Object.keys(CASE_LABELS).map((c) => `<tr>
        <td>${CASE_LABELS[c]}</td>
        <td>${phrase('m', 'der', c, der)}</td>
        <td>${phrase('f', 'die', c, die)}</td>
        <td>${phrase('n', 'das', c, das)}</td>
        <td>${phrase('pl', 'plural', c, der)}</td>
      </tr>`).join('')}
    </table>
  `;
}

function adjectiveEndingsReferenceTables() {
  const { der, die, das } = EXAMPLE_NOUNS;
  return Object.keys(ADJ_ENDINGS).map((k) => {
    const t = ADJ_ENDINGS[k];
    const articleWord = (genderKey, c) => {
      if (k === 'weak') return DEF_ARTICLES[genderKey][c];
      if (k === 'mixed') return INDEF_ARTICLES[genderKey][c];
      return '';
    };
    const phrase = (genderKey, colKey, c, noun) => {
      const art = articleWord(genderKey, c);
      const adj = `${EXAMPLE_ADJECTIVE}${t[c][colKey]}`;
      const word = exampleNounWord(noun, genderKey, c);
      return `${art ? `${art} ` : ''}${adj} ${word}`;
    };
    return `
      <div class="section-title">${escapeHtml(t.label)}</div>
      <table>
        <tr><th>Case</th><th>maskulin</th><th>feminin</th><th>neutral</th><th>Plural</th></tr>
        ${Object.keys(CASE_LABELS).map((c) => `<tr>
          <td>${CASE_LABELS[c]}</td>
          <td>${phrase('der', 'm', c, der)}</td>
          <td>${phrase('die', 'f', c, die)}</td>
          <td>${phrase('das', 'n', c, das)}</td>
          <td>${phrase('plural', 'pl', c, der)}</td>
        </tr>`).join('')}
      </table>
    `;
  }).join('');
}

function renderGrammarReference() {
  document.getElementById('grammarReference').innerHTML = `
    <div class="ref-card">
      <h3>1) Definite articles — der / die / das</h3>
      <p class="muted">Worked with example nouns: der Mann, die Frau, das Kind (plural: die Männer).</p>
      ${articleReferenceTable(DEF_ARTICLES)}
    </div>
    <div class="ref-card">
      <h3>2) Indefinite articles — ein / eine / einen…</h3>
      <p class="muted">"ein" has no plural (you'd just drop the article). Shown instead: <strong>kein</strong> (not a/no) in the plural column, since it follows the identical pattern and does have one.</p>
      ${articleReferenceTable(INDEF_ARTICLES)}
    </div>
    <div class="ref-card">
      <h3>3) Possessives — mein, dein, sein…</h3>
      <p class="muted">Every possessive declines exactly like "ein" (same endings) — just swap the stem. Worked example below uses <strong>mein</strong> (my):</p>
      <div class="stem-list">${Object.entries(POSSESSIVE_STEMS).map(([stem, meaning]) => `<div class="stem-chip"><strong>${escapeHtml(stem)}</strong> — ${escapeHtml(meaning)}</div>`).join('')}</div>
      ${possessiveReferenceTable('mein')}
      <p class="muted">Irregular: <strong>euer</strong> contracts to <em>eur-</em> before any ending (euer → eure Frau, euren Mann, eurem Kind…), never "euere".</p>
    </div>
    <div class="ref-card">
      <h3>4) Adjective endings after an article</h3>
      <p class="muted">Which set of endings an adjective takes depends on what (if anything) precedes it — a der-word, an ein-word, or nothing. Worked with the regular adjective <strong>klein</strong> (small) so the ending pattern stays clear — a few adjectives (hoch, gut…) also shift their stem; check the word's own detail page for those.</p>
      ${adjectiveEndingsReferenceTables()}
    </div>
  `;
}

/* ---- Practice quiz ---- */

let quizScore = { correct: 0, total: 0 };
let quizCurrent = null;

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickNounForQuiz() {
  const pool = WORDS.filter((w) => w.type === 'noun' && w.noun && w.noun.gender);
  const source = pool.length ? pool.map((w) => ({ german: w.german, gender: w.noun.gender, plural: w.noun.plural })) : GENERIC_NOUNS;
  return source[Math.floor(Math.random() * source.length)];
}

function pickAdjectiveForQuiz() {
  const pool = WORDS.filter((w) => w.type === 'adjective');
  return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
}

function genderColKey(genderOrPlural) {
  return genderOrPlural === 'plural' ? 'pl' : { der: 'm', die: 'f', das: 'n' }[genderOrPlural];
}

function addRandomDistractors(options, pool, max) {
  const p = [...pool];
  while (options.size < max && options.size < new Set(p).size) {
    options.add(p[Math.floor(Math.random() * p.length)]);
  }
  return options;
}

function buildQuizQuestion() {
  const noun = pickNounForQuiz();
  const cases = Object.keys(CASE_LABELS);
  const c = cases[Math.floor(Math.random() * cases.length)];
  const canPlural = noun.plural && noun.plural !== '—';
  const isPlural = canPlural && Math.random() < 0.35;
  const genderKey = isPlural ? 'plural' : noun.gender;
  const nounDisplay = isPlural ? (noun.plural || noun.german) : noun.german;
  const numberLabel = isPlural ? 'plural' : 'singular';

  const adjWord = Math.random() < 0.35 ? pickAdjectiveForQuiz() : null;
  const type = adjWord ? 'adjective' : ['definite', 'indefinite', 'possessive'][Math.floor(Math.random() * 3)];

  if (type === 'definite') {
    const correct = DEF_ARTICLES[genderKey][c];
    const pool = Object.values(DEF_ARTICLES).flatMap((g) => Object.values(g));
    const options = addRandomDistractors(new Set([correct]), pool, 4);
    return { prompt: `___ ${nounDisplay}`, context: `Definite article · ${CASE_LABELS[c]} · ${numberLabel}`, correct, options: shuffle([...options]) };
  }

  if (type === 'indefinite') {
    const correct = INDEF_ARTICLES[genderKey][c];
    const pool = Object.values(INDEF_ARTICLES).flatMap((g) => Object.values(g));
    const options = addRandomDistractors(new Set([correct]), pool, 4);
    return { prompt: `___ ${nounDisplay}`, context: `Indefinite article${isPlural ? ' (kein-)' : ''} · ${CASE_LABELS[c]} · ${numberLabel}`, correct, options: shuffle([...options]) };
  }

  if (type === 'possessive') {
    const stems = Object.keys(POSSESSIVE_STEMS);
    const stem = stems[Math.floor(Math.random() * stems.length)];
    const decl = possessiveDeclension(stem);
    const correct = decl[c][genderColKey(genderKey)];
    const pool = Object.values(decl).flatMap((row) => Object.values(row));
    const options = addRandomDistractors(new Set([correct]), pool, 4);
    return { prompt: `___ ${nounDisplay}`, context: `Possessive "${stem}" (${POSSESSIVE_STEMS[stem]}) · ${CASE_LABELS[c]} · ${numberLabel}`, correct, options: shuffle([...options]) };
  }

  // adjective ending
  const paradigmKeys = ['weak', 'mixed', 'strong'];
  const paradigmKey = paradigmKeys[Math.floor(Math.random() * paradigmKeys.length)];
  const paradigm = ADJ_ENDINGS[paradigmKey];
  const genderCol = genderColKey(genderKey);
  const correct = paradigm[c][genderCol];
  const article = paradigmKey === 'weak' ? DEF_ARTICLES[genderKey][c] : paradigmKey === 'mixed' ? INDEF_ARTICLES[genderKey][c] : '';
  const endingPool = Object.values(ADJ_ENDINGS).flatMap((p) => Object.keys(CASE_LABELS).flatMap((cc) => Object.values(p[cc])));
  const options = addRandomDistractors(new Set([correct]), endingPool, 4);
  return {
    prompt: `${article ? `${article} ` : ''}___ ${nounDisplay}`,
    context: `"${adjWord.german}" · ${paradigm.label} · ${CASE_LABELS[c]} · ${numberLabel}`,
    correct,
    options: shuffle([...options]),
    isEnding: true,
    adjStem: adjWord.german,
  };
}

function nextQuizQuestion() {
  quizCurrent = buildQuizQuestion();
  renderQuizQuestion();
}

function renderQuizQuestion() {
  const q = quizCurrent;
  const displayOpt = (opt) => (q.isEnding ? `${q.adjStem}${opt}` : opt);
  document.getElementById('grammarQuiz').innerHTML = `
    <div class="quiz-card">
      <div class="quiz-question">${escapeHtml(q.prompt)}</div>
      <div class="quiz-context">${escapeHtml(q.context)}</div>
      <div class="quiz-options">
        ${q.options.map((opt) => `<button type="button" class="quiz-option" data-opt="${escapeHtml(opt)}">${escapeHtml(displayOpt(opt))}</button>`).join('')}
      </div>
      <div class="quiz-feedback" id="quizFeedback"></div>
      <div class="quiz-scoreboard" id="quizScoreboard"><span>Score: <strong>${quizScore.correct}/${quizScore.total}</strong></span></div>
    </div>
  `;
  document.querySelectorAll('#grammarQuiz .quiz-option').forEach((btn) => {
    btn.addEventListener('click', () => answerQuiz(btn.dataset.opt));
  });
}

function answerQuiz(chosen) {
  const q = quizCurrent;
  const correct = chosen === q.correct;
  quizScore.total += 1;
  if (correct) quizScore.correct += 1;

  document.querySelectorAll('#grammarQuiz .quiz-option').forEach((btn) => {
    btn.disabled = true;
    if (btn.dataset.opt === q.correct) btn.classList.add('correct');
    else if (btn.dataset.opt === chosen) btn.classList.add('wrong');
  });

  const displayCorrect = q.isEnding ? `${q.adjStem}${q.correct}` : q.correct;
  const feedback = document.getElementById('quizFeedback');
  feedback.textContent = correct ? '✓ Correct!' : `✗ Not quite — correct answer: ${displayCorrect}`;
  feedback.className = `quiz-feedback ${correct ? 'correct-text' : 'wrong-text'}`;
  document.getElementById('quizScoreboard').innerHTML = `<span>Score: <strong>${quizScore.correct}/${quizScore.total}</strong></span>`;

  const nextBtn = document.createElement('button');
  nextBtn.type = 'button';
  nextBtn.className = 'btn primary';
  nextBtn.style.marginTop = '16px';
  nextBtn.textContent = 'Next question →';
  nextBtn.addEventListener('click', nextQuizQuestion);
  document.querySelector('#grammarQuiz .quiz-card').appendChild(nextBtn);
}

/* ================= ADD ================= */

let pendingWordData = null;
let dupCheckTimer = null;

const GERMAN_ARTICLES = ['der', 'die', 'das', 'den', 'dem', 'des', 'ein', 'eine', 'einen', 'einem', 'einer', 'eines'];

// Users often type/paste words with an article ("der Hund") — strip it so the
// stored dictionary form matches what's actually looked up/compared.
function stripLeadingArticle(word) {
  const trimmed = (word || '').trim();
  const parts = trimmed.split(/\s+/);
  if (parts.length > 1 && GERMAN_ARTICLES.includes(parts[0].toLowerCase())) {
    return parts.slice(1).join(' ');
  }
  return trimmed;
}

// German nouns are always capitalized; verbs/adjectives are always lowercase.
// Applied automatically so users don't have to think about it.
function applyGermanCasing(word, type) {
  const stripped = stripLeadingArticle(word);
  if (!stripped) return stripped;
  const lower = stripped.toLowerCase();
  return type === 'noun' ? lower.charAt(0).toUpperCase() + lower.slice(1) : lower;
}

function findExistingWord(german, excludeId) {
  const target = stripLeadingArticle(german).toLowerCase();
  if (!target) return null;
  return WORDS.find((w) => w.id !== excludeId && w.german.trim().toLowerCase() === target) || null;
}

function renderDupWarning(rawWord, excludeId) {
  const el = document.getElementById('dupWarning');
  const existing = findExistingWord(rawWord, excludeId);
  if (!existing) { el.hidden = true; el.innerHTML = ''; return; }
  el.hidden = false;
  el.innerHTML = `⚠️ "${escapeHtml(existing.german)}" (${escapeHtml(existing.type)}) is already in your list.
    <button type="button" class="btn ghost" id="dupViewBtn">View it</button>`;
  el.querySelector('#dupViewBtn').addEventListener('click', () => {
    switchView('words');
    openWordModal(existing.id);
  });
}

function wireAdd() {
  document.getElementById('aiLookupBtn').addEventListener('click', doAiLookup);
  document.getElementById('copyPromptBtn').addEventListener('click', doCopyPrompt);
  document.getElementById('parsePasteBtn').addEventListener('click', doParsePaste);
  document.getElementById('cancelPasteBtn').addEventListener('click', () => {
    document.getElementById('pastePanel').hidden = true;
    document.getElementById('pasteResponse').value = '';
  });
  document.getElementById('manualEntryBtn').addEventListener('click', () => {
    const word = document.getElementById('addWordInput').value.trim();
    const typeHint = document.getElementById('addTypeHint').value === 'auto' ? 'verb' : document.getElementById('addTypeHint').value;
    pendingWordData = blankWordData(applyGermanCasing(word, typeHint), typeHint);
    renderWordForm(pendingWordData);
    renderDupWarning(pendingWordData.german);
  });
  document.getElementById('addWordInput').addEventListener('input', (e) => {
    clearTimeout(dupCheckTimer);
    const val = e.target.value;
    dupCheckTimer = setTimeout(() => renderDupWarning(val), 250);
  });
}

async function doCopyPrompt() {
  const word = document.getElementById('addWordInput').value.trim();
  const statusEl = document.getElementById('aiStatus');
  if (!word) { statusEl.textContent = 'Type a word first.'; statusEl.className = 'ai-status err'; return; }

  const prompt = buildCopyPastePrompt(word);
  document.getElementById('promptOutput').value = prompt;
  document.getElementById('pastePanel').hidden = false;
  document.getElementById('pasteResponse').focus();

  try {
    await navigator.clipboard.writeText(prompt);
    statusEl.textContent = 'Prompt copied — paste it into a claude.ai chat, then paste the reply below.';
    statusEl.className = 'ai-status ok';
  } catch (e) {
    statusEl.textContent = 'Could not auto-copy (clipboard permission) — select the text below and copy it manually.';
    statusEl.className = 'ai-status err';
  }
}

function doParsePaste() {
  const raw = document.getElementById('pasteResponse').value;
  const statusEl = document.getElementById('aiStatus');
  if (!raw.trim()) { statusEl.textContent = 'Paste claude.ai\'s reply first.'; statusEl.className = 'ai-status err'; return; }
  try {
    const data = extractJson(raw);
    pendingWordData = normalizeAiData(data);
    statusEl.textContent = 'Got it — review and save below.';
    statusEl.className = 'ai-status ok';
    renderWordForm(pendingWordData);
    renderDupWarning(pendingWordData.german);
    document.getElementById('pastePanel').hidden = true;
    document.getElementById('pasteResponse').value = '';
  } catch (e) {
    statusEl.textContent = `Couldn't parse that as JSON: ${e.message}`;
    statusEl.className = 'ai-status err';
  }
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
    renderDupWarning(pendingWordData.german);
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
  const merged = blankWordData(applyGermanCasing(data.german || '', type), type);
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
    const newType = e.target.value;
    const carriedGerman = applyGermanCasing(readField(form, 'german') || data.german, newType);
    pendingWordData = blankWordData(carriedGerman, newType);
    renderWordForm(pendingWordData);
    renderDupWarning(carriedGerman);
  });
  const germanInput = form.querySelector('[data-field="german"]');
  germanInput.addEventListener('blur', () => {
    const type = readField(form, 'type');
    germanInput.value = applyGermanCasing(germanInput.value, type);
    renderDupWarning(germanInput.value);
  });
  form.querySelector('#cancelFormBtn').addEventListener('click', () => {
    form.hidden = true; form.innerHTML = ''; pendingWordData = null;
    document.getElementById('dupWarning').hidden = true;
  });
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
  const german = applyGermanCasing(readField(form, 'german'), type);
  const word = { type, german, english: readField(form, 'english').trim(), notes: readField(form, 'notes').trim() };

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

  const existing = findExistingWord(word.german);
  if (existing && !confirm(`"${existing.german}" (${existing.type}) is already in your list. Save "${word.german}" as a duplicate anyway?`)) {
    return;
  }

  word.id = uid();
  word.createdAt = new Date().toISOString();
  word.srs = freshSrs();

  WORDS.push(word);
  persistNow();
  renderAll();

  form.hidden = true;
  form.innerHTML = '';
  pendingWordData = null;
  document.getElementById('addWordInput').value = '';
  document.getElementById('dupWarning').hidden = true;
  document.getElementById('aiStatus').textContent = `Saved "${word.german}" ✓`;
  document.getElementById('aiStatus').className = 'ai-status ok';
}

/* ================= SETTINGS ================= */

function hydrateSettingsForm() {
  document.getElementById('aiApiKey').value = SETTINGS.aiApiKey || '';
  document.getElementById('aiModel').value = SETTINGS.aiModel || 'claude-haiku-4-5-20251001';
  document.getElementById('ghToken').value = SETTINGS.ghToken || '';
  setSyncStatus(githubReadConfigured(SETTINGS) ? 'pending' : 'none');
}

function wireSettings() {
  document.getElementById('saveSettingsBtn').addEventListener('click', () => {
    SETTINGS = {
      aiApiKey: document.getElementById('aiApiKey').value.trim(),
      aiModel: document.getElementById('aiModel').value,
      ghToken: document.getElementById('ghToken').value.trim(),
      ...DEFAULT_GH,
    };
    saveSettings(SETTINGS);
    ghSha = null;
    const msg = document.getElementById('settingsSavedMsg');
    msg.textContent = 'Saved ✓';
    msg.className = 'ai-status ok';
    setSyncStatus(githubReadConfigured(SETTINGS) ? 'pending' : 'none');
    setTimeout(() => { msg.textContent = ''; }, 2500);
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
        persistNow();
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
