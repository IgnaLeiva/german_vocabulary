// Verb + fixed preposition ("Verben mit Präpositionen") — browse by preposition
// or by verb, look at wo-/da- question forms, and practise with spaced repetition.
// Stored separately from WORDS (verb_prepositions.json) because one verb can
// take several prepositions (schreiben an / über) and one preposition has
// many verbs — a many-to-many list doesn't fit a single word card.

const LS_VERBPREPS = 'gv_verbpreps_v1';
const VP_GH_PATH = 'verb_prepositions.json';
const VP_CASE_LABEL = { akk: 'Akk', dat: 'Dat' };
const VP_FALLBACK_PREPS = ['an', 'auf', 'über', 'für', 'mit', 'von', 'um', 'zu', 'in', 'vor', 'bei', 'nach', 'aus', 'unter'];

// [verb, preposition, case, English, example sentence]
const VERB_PREP_SEED = [
  ['denken', 'an', 'akk', 'to think of', 'Ich denke oft an dich.'],
  ['glauben', 'an', 'akk', 'to believe in', 'Sie glaubt an das Glück.'],
  ['zweifeln', 'an', 'dat', 'to doubt', 'Er zweifelt an seinem Erfolg.'],
  ['schreiben', 'an', 'akk', 'to write to (someone)', 'Ich schreibe an meinen Chef.'],
  ['sterben', 'an', 'dat', 'to die of', 'Er ist an einer Krankheit gestorben.'],
  ['erkennen', 'an', 'dat', 'to recognise by', 'Ich erkenne ihn an seiner Stimme.'],
  ['leiden', 'an', 'dat', 'to suffer from (illness)', 'Sie leidet an Asthma.'],
  ['leiden', 'unter', 'dat', 'to suffer from (something unpleasant)', 'Wir leiden unter der Hitze.'],
  ['arbeiten', 'an', 'dat', 'to work on', 'Ich arbeite an meinem Projekt.'],
  ['sich gewöhnen', 'an', 'akk', 'to get used to', 'Ich gewöhne mich an das Wetter.'],
  ['sich halten', 'an', 'akk', 'to stick to / follow', 'Bitte halte dich an die Regeln.'],
  ['nachdenken', 'über', 'akk', 'to think about / reflect on', 'Ich denke über das Problem nach.'],
  ['schreiben', 'über', 'akk', 'to write about', 'Sie schreibt über ihre Reise.'],
  ['diskutieren', 'über', 'akk', 'to discuss', 'Wir diskutieren über Politik.'],
  ['sprechen', 'über', 'akk', 'to talk about', 'Er spricht über seine Arbeit.'],
  ['lachen', 'über', 'akk', 'to laugh about', 'Alle lachen über den Witz.'],
  ['reden', 'über', 'akk', 'to talk about', 'Wir reden über das Wetter.'],
  ['sich freuen', 'über', 'akk', 'to be pleased about', 'Ich freue mich über das Geschenk.'],
  ['sich ärgern', 'über', 'akk', 'to be annoyed about', 'Er ärgert sich über den Lärm.'],
  ['helfen', 'mit', 'dat', 'to help with', 'Sie hilft mir mit den Hausaufgaben.'],
  ['rechnen', 'mit', 'dat', 'to expect / reckon with', 'Wir rechnen mit viel Verkehr.'],
  ['beginnen', 'mit', 'dat', 'to begin with', 'Wir beginnen mit dem Unterricht.'],
  ['einverstanden sein', 'mit', 'dat', 'to agree with', 'Ich bin mit dem Plan einverstanden.'],
  ['sprechen', 'mit', 'dat', 'to speak with', 'Ich spreche mit meiner Lehrerin.'],
  ['anfangen', 'mit', 'dat', 'to start with', 'Er fängt mit der Arbeit an.'],
  ['aufhören', 'mit', 'dat', 'to stop (doing)', 'Hör mit dem Lärm auf!'],
  ['ausgeben', 'für', 'akk', 'to spend on', 'Ich gebe viel Geld für Bücher aus.'],
  ['kämpfen', 'für', 'akk', 'to fight for', 'Sie kämpfen für ihre Rechte.'],
  ['kämpfen', 'gegen', 'akk', 'to fight against', 'Wir kämpfen gegen den Klimawandel.'],
  ['sich interessieren', 'für', 'akk', 'to be interested in', 'Ich interessiere mich für Musik.'],
  ['sich engagieren', 'für', 'akk', 'to be committed to', 'Er engagiert sich für den Umweltschutz.'],
  ['sich einsetzen', 'für', 'akk', 'to stand up for', 'Sie setzt sich für die Kinder ein.'],
  ['sich schämen', 'für', 'akk', 'to be ashamed of', 'Ich schäme mich für mein Verhalten.'],
  ['sich bewerben', 'für', 'akk', 'to apply for (a programme / grant)', 'Er bewirbt sich für das Stipendium.'],
  ['sich bedanken', 'für', 'akk', 'to thank for', 'Ich bedanke mich für die Einladung.'],
  ['sich kümmern', 'um', 'akk', 'to take care of', 'Sie kümmert sich um ihre Oma.'],
  ['sich bewerben', 'um', 'akk', 'to apply for (a job / position)', 'Sie bewirbt sich um die Stelle.'],
  ['bestehen', 'aus', 'dat', 'to consist of', 'Das Team besteht aus zehn Personen.'],
  ['erzählen', 'von', 'dat', 'to tell about', 'Er erzählt von seiner Reise.'],
  ['träumen', 'von', 'dat', 'to dream of', 'Sie träumt von einem Haus am Meer.'],
  ['hören', 'von', 'dat', 'to hear from / of', 'Ich habe lange nichts von ihm gehört.'],
  ['abhängen', 'von', 'dat', 'to depend on', 'Das hängt von dem Wetter ab.'],
  ['sich trennen', 'von', 'dat', 'to separate from', 'Sie hat sich von ihrem Freund getrennt.'],
  ['sich verabschieden', 'von', 'dat', 'to say goodbye to', 'Wir verabschieden uns von den Gästen.'],
  ['sich erholen', 'von', 'dat', 'to recover from', 'Er erholt sich von der Krankheit.'],
  ['ankommen', 'auf', 'akk', 'to depend on', 'Es kommt auf das Wetter an.'],
  ['antworten', 'auf', 'akk', 'to answer / reply to', 'Ich antworte auf die E-Mail.'],
  ['aufpassen', 'auf', 'akk', 'to look after / watch out for', 'Ich passe auf das Kind auf.'],
  ['bestehen', 'auf', 'dat', 'to insist on', 'Er besteht auf seinem Recht.'],
  ['hoffen', 'auf', 'akk', 'to hope for', 'Wir hoffen auf besseres Wetter.'],
  ['reagieren', 'auf', 'akk', 'to react to', 'Sie reagiert auf die Kritik.'],
  ['achten', 'auf', 'akk', 'to pay attention to', 'Achte auf die Grammatik!'],
  ['warten', 'auf', 'akk', 'to wait for', 'Ich warte auf den Bus.'],
  ['hören', 'auf', 'akk', 'to listen to (advice)', 'Er hört auf seine Mutter.'],
  ['sich freuen', 'auf', 'akk', 'to look forward to', 'Ich freue mich auf den Urlaub.'],
  ['sich konzentrieren', 'auf', 'akk', 'to concentrate on', 'Sie konzentriert sich auf die Prüfung.'],
  ['sich auswirken', 'auf', 'akk', 'to affect / have an effect on', 'Das wirkt sich auf die Preise aus.'],
  ['sich verlassen', 'auf', 'akk', 'to rely on', 'Ich verlasse mich auf dich.'],
  ['sich bewerben', 'auf', 'akk', 'to apply for (a specific advertised post)', 'Er bewirbt sich auf die Stelle.'],
  ['fliehen', 'vor', 'dat', 'to flee from', 'Sie fliehen vor dem Krieg.'],
  ['schützen', 'vor', 'dat', 'to protect from', 'Die Creme schützt vor der Sonne.'],
  ['warnen', 'vor', 'dat', 'to warn about', 'Ich warne dich vor dem Hund.'],
  ['zittern', 'vor', 'dat', 'to tremble with', 'Er zittert vor Angst.'],
  ['sich ekeln', 'vor', 'dat', 'to be disgusted by', 'Sie ekelt sich vor Spinnen.'],
  ['sich fürchten', 'vor', 'dat', 'to be afraid of', 'Das Kind fürchtet sich vor der Dunkelheit.'],
  ['ankommen', 'bei', 'dat', 'to be well received by', 'Die Idee kommt bei den Kunden gut an.'],
  ['anrufen', 'bei', 'dat', 'to call (a company / office)', 'Ich rufe bei der Bank an.'],
  ['helfen', 'bei', 'dat', 'to help with (a task)', 'Er hilft mir bei der Arbeit.'],
  ['arbeiten', 'bei', 'dat', 'to work at (a company)', 'Sie arbeitet bei einer Bank.'],
  ['sich bedanken', 'bei', 'dat', 'to thank (a person)', 'Ich bedanke mich bei dir.'],
  ['sich beschweren', 'bei', 'dat', 'to complain to', 'Er beschwert sich bei dem Chef.'],
  ['sich anmelden', 'bei', 'dat', 'to register with', 'Ich melde mich bei der Universität an.'],
  ['sich bewerben', 'bei', 'dat', 'to apply to (a company)', 'Sie bewirbt sich bei einer Firma.'],
];

let VERB_PREPS = [];
let vpSha = null;
let vpPushTimer = null;
let vpGroupBy = 'prep'; // 'prep' | 'verb'
let vpMode = 'browse'; // 'browse' | 'practice'
let vpPrepFilter = 'all';
let vpSearch = '';
let vpQuiz = null;
let vpScore = { correct: 0, total: 0 };

/* ---------------- Pure helpers ---------------- */

function vpBaseVerb(verb) {
  return (verb || '').trim().toLowerCase().replace(/^sich\s+/, '');
}

function vpKey(verb, prep) {
  return `${vpBaseVerb(verb)}|${(prep || '').trim().toLowerCase()}`;
}

// wo(r)-/da(r)- forms replace "preposition + thing": woran / daran, worüber / darüber, wofür / dafür.
function vpCompound(prefix, prep) {
  return `${prefix}${/^[aeiouäöü]/i.test(prep) ? 'r' : ''}${prep}`;
}

function vpPersonQuestion(prep, kase) {
  const q = kase === 'dat' ? 'wem' : 'wen';
  return `${prep.charAt(0).toUpperCase()}${prep.slice(1)} ${q}`;
}

// Parse "an +Akk", "an +Dat / an +Akk", "auf" → [{ prep, case }]
function vpParsePrepField(text) {
  if (!text || /^[—–-]+$/.test(text.trim())) return [];
  return text.split(/[\/,;]/).map((part) => {
    const m = part.trim().match(/^([A-Za-zäöüÄÖÜß]+)\s*\+?\s*(akk|dat)?/i);
    return m ? { prep: m[1].toLowerCase(), case: m[2] ? m[2].toLowerCase() : null } : null;
  }).filter(Boolean);
}

function vpSplitExample(example, prep) {
  if (!example) return null;
  const re = new RegExp(`(^|[^\\p{L}])(${prep.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})(?![\\p{L}])`, 'iu');
  const m = re.exec(example);
  if (!m) return null;
  const start = m.index + m[1].length;
  return { before: example.slice(0, start), match: m[2], after: example.slice(start + m[2].length) };
}

function vpHighlightExample(example, prep) {
  const parts = vpSplitExample(example, prep);
  if (!parts) return escapeHtml(example);
  return `${escapeHtml(parts.before)}<mark class="vp-hl">${escapeHtml(parts.match)}</mark>${escapeHtml(parts.after)}`;
}

function vpCaseBadge(kase) {
  return kase ? `<span class="vp-case vp-case-${kase}">+${VP_CASE_LABEL[kase]}</span>` : '<span class="vp-case vp-case-none">+?</span>';
}

function vpMakeEntry(verb, prep, kase, english, example) {
  return {
    id: uid(), verb: verb.trim(), prep: prep.trim().toLowerCase(), case: kase || null,
    english: (english || '').trim(), example: (example || '').trim(),
    createdAt: new Date().toISOString(), srs: freshSrs(),
  };
}

function vpSeedEntries() {
  return VERB_PREP_SEED.map(([v, p, c, e, x]) => vpMakeEntry(v, p, c, e, x));
}

// Adds any verb+preposition combos a word card already records (verb.preposition)
// that aren't in the list yet. Returns true if anything was added.
function syncVerbPrepsFromWord(word) {
  if (!word || word.type !== 'verb' || !word.verb) return false;
  let added = false;
  vpParsePrepField(word.verb.preposition).forEach((p) => {
    if (VERB_PREPS.some((e) => vpKey(e.verb, e.prep) === vpKey(word.german, p.prep))) return;
    VERB_PREPS.push(vpMakeEntry(word.german, p.prep, p.case, word.english, ''));
    added = true;
  });
  return added;
}

/* ---------------- Persistence / sync ---------------- */

function vpLoadLocal() {
  try {
    const raw = localStorage.getItem(LS_VERBPREPS);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function vpSettings() {
  return { ...SETTINGS, ghPath: VP_GH_PATH };
}

async function vpPush() {
  try {
    vpSha = await githubPutWords(vpSettings(), VERB_PREPS, vpSha);
    setSyncStatus('ok');
  } catch (e) {
    console.error(e);
    setSyncStatus('err', e.message);
  }
}

function persistVerbPreps(immediate = true) {
  localStorage.setItem(LS_VERBPREPS, JSON.stringify(VERB_PREPS));
  clearTimeout(vpPushTimer);
  if (!githubConfigured(SETTINGS)) return;
  setSyncStatus('pending');
  if (immediate) vpPush();
  else vpPushTimer = setTimeout(vpPush, 1500);
}

async function initVerbPreps() {
  const local = vpLoadLocal();
  VERB_PREPS = local || [];
  let fresh = !local;

  if (githubReadConfigured(SETTINGS)) {
    try {
      const { words, sha } = await githubGetWords(vpSettings());
      vpSha = sha;
      if (words) { VERB_PREPS = words; fresh = false; localStorage.setItem(LS_VERBPREPS, JSON.stringify(words)); }
    } catch (e) {
      console.error(e);
    }
  }

  if (fresh) {
    VERB_PREPS = vpSeedEntries();
    WORDS.forEach(syncVerbPrepsFromWord);
    persistVerbPreps(true);
  }
}

/* ---------------- Browse ---------------- */

function vpFiltered() {
  const q = vpSearch.trim().toLowerCase();
  return VERB_PREPS.filter((e) => (vpPrepFilter === 'all' || e.prep === vpPrepFilter)
    && (!q || `${e.verb} ${e.prep} ${e.english}`.toLowerCase().includes(q)));
}

function vpPrepCounts() {
  const counts = {};
  VERB_PREPS.forEach((e) => { counts[e.prep] = (counts[e.prep] || 0) + 1; });
  return Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'de'));
}

function vpRow(e, showPrep) {
  const dueNow = isDue(e.srs) && e.srs && e.srs.reps > 0;
  return `
    <div class="vp-row" data-id="${e.id}">
      <span class="vp-verb">${escapeHtml(e.verb)}${showPrep ? ` <strong class="vp-prep">${escapeHtml(e.prep)}</strong>` : ''}</span>
      ${vpCaseBadge(e.case)}
      <span class="vp-english">${escapeHtml(e.english)}</span>
      ${dueNow ? '<span class="due-pill">due</span>' : ''}
    </div>`;
}

function vpRenderByPrep(list) {
  const groups = {};
  list.forEach((e) => { (groups[e.prep] = groups[e.prep] || []).push(e); });
  return Object.keys(groups).sort((a, b) => groups[b].length - groups[a].length || a.localeCompare(b, 'de')).map((prep) => `
    <div class="ref-card vp-group">
      <div class="vp-group-head">
        <h3>${escapeHtml(prep)}</h3>
        <span class="muted">${vpCompound('wo', prep)}…? · ${vpCompound('da', prep)}…</span>
        <button type="button" class="inline-speak" data-speak="${escapeHtml(prep)}" title="Pronounce">🔊</button>
      </div>
      ${groups[prep].sort((a, b) => a.verb.localeCompare(b.verb, 'de')).map((e) => vpRow(e, false)).join('')}
    </div>`).join('');
}

function vpRenderByVerb(list) {
  const groups = {};
  list.forEach((e) => { (groups[vpBaseVerb(e.verb)] = groups[vpBaseVerb(e.verb)] || []).push(e); });
  const keys = Object.keys(groups).sort((a, b) => a.localeCompare(b, 'de'));
  const multi = keys.filter((k) => groups[k].length > 1);
  const render = (k) => `
    <div class="ref-card vp-group">
      ${groups[k].length > 1 ? '<div class="vp-contrast">⚡ same verb, different preposition — the meaning changes</div>' : ''}
      ${groups[k].map((e) => vpRow(e, true)).join('')}
    </div>`;
  return `
    ${multi.length ? `<h3 class="vp-subhead">Verbs with several prepositions</h3>${multi.map(render).join('')}<h3 class="vp-subhead">All other verbs</h3>` : ''}
    ${keys.filter((k) => groups[k].length === 1).map(render).join('')}`;
}

function renderVerbPreps() {
  const dueCount = VERB_PREPS.filter((e) => isDue(e.srs)).length;
  document.getElementById('vpStats').textContent = `${VERB_PREPS.length} verb–preposition pairs · ${dueCount} due for practice`;
  document.querySelectorAll('#vpModeToggle .dir-btn').forEach((b) => b.classList.toggle('active', b.dataset.mode === vpMode));
  document.getElementById('vpBrowse').hidden = vpMode !== 'browse';
  document.getElementById('vpPractice').hidden = vpMode !== 'practice';

  document.getElementById('vpPrepChips').innerHTML = [['all', VERB_PREPS.length], ...vpPrepCounts()]
    .map(([p, n]) => `<button type="button" class="chip${vpPrepFilter === p ? ' active' : ''}" data-prep="${escapeHtml(p)}">${p === 'all' ? 'All' : escapeHtml(p)} <span class="muted">${n}</span></button>`).join('');

  if (vpMode === 'practice') { if (!vpQuiz) nextVpQuestion(); else renderVpQuestion(); return; }

  document.querySelectorAll('#vpGroupToggle .dir-btn').forEach((b) => b.classList.toggle('active', b.dataset.group === vpGroupBy));
  const list = vpFiltered();
  document.getElementById('vpList').innerHTML = list.length
    ? (vpGroupBy === 'prep' ? vpRenderByPrep(list) : vpRenderByVerb(list))
    : '<div class="empty-state"><p class="muted">No matches.</p></div>';
}

/* ---------------- Detail modal ---------------- */

function vpFormHtml(e) {
  return `
    <form id="vpEditForm" class="word-form">
      <div class="form-row">
        <label>Verb <input type="text" name="verb" value="${escapeHtml(e.verb)}" required></label>
        <label>Preposition <input type="text" name="prep" value="${escapeHtml(e.prep)}" required></label>
        <label>Case
          <select name="case">
            <option value="akk"${e.case === 'akk' ? ' selected' : ''}>Akkusativ</option>
            <option value="dat"${e.case === 'dat' ? ' selected' : ''}>Dativ</option>
            <option value=""${!e.case ? ' selected' : ''}>Unknown</option>
          </select>
        </label>
      </div>
      <label>English <input type="text" name="english" value="${escapeHtml(e.english)}"></label>
      <label>Example sentence (should contain the preposition) <input type="text" name="example" value="${escapeHtml(e.example)}"></label>
      <div class="modal-close-row">
        <button type="button" class="btn ghost" id="vpEditCancel">Cancel</button>
        <button type="submit" class="btn primary">Save</button>
      </div>
    </form>`;
}

function vpDetailHtml(e) {
  const sameVerb = VERB_PREPS.filter((o) => o.id !== e.id && vpBaseVerb(o.verb) === vpBaseVerb(e.verb));
  const samePrep = VERB_PREPS.filter((o) => o.id !== e.id && o.prep === e.prep);
  const caseWord = e.case === 'akk' ? 'Akkusativ' : e.case === 'dat' ? 'Dativ' : '';
  return `
    <h2>${escapeHtml(e.verb)} <strong class="vp-prep">${escapeHtml(e.prep)}</strong> ${vpCaseBadge(e.case)}
      <button type="button" class="inline-speak" data-speak="${escapeHtml(`${e.verb} ${e.prep}`)}" title="Pronounce">🔊</button></h2>
    <p class="muted">${escapeHtml(e.english) || '—'}${caseWord ? ` · takes the ${caseWord}` : ''}</p>

    <div class="section-title">Example</div>
    ${e.example ? `<p class="vp-example">${vpHighlightExample(e.example, e.prep)} <button type="button" class="inline-speak" data-speak="${escapeHtml(e.example)}">🔊</button></p>` : '<p class="muted">No example yet — use Edit to add one.</p>'}

    <div class="section-title">Asking &amp; answering</div>
    <table>
      <tr><th>About a thing</th><td><strong>${vpCompound('Wo', e.prep)}</strong>…? → <strong>${vpCompound('da', e.prep)}</strong></td></tr>
      <tr><th>About a person</th><td><strong>${escapeHtml(vpPersonQuestion(e.prep, e.case))}</strong>…? → ${escapeHtml(e.prep)} ${e.case === 'dat' ? 'ihm / ihr / dem Mann' : 'ihn / sie / den Mann'}</td></tr>
    </table>
    <p class="muted">Tip: ${vpCompound('wo', e.prep)}- / ${vpCompound('da', e.prep)}- are for things and ideas; for people keep the preposition and use wen / wem.</p>

    ${sameVerb.length ? `<div class="section-title">Same verb, other preposition</div>${sameVerb.map((o) => vpRow(o, true)).join('')}` : ''}
    ${samePrep.length ? `<div class="section-title">Other verbs with “${escapeHtml(e.prep)}”</div>${samePrep.map((o) => vpRow(o, false)).join('')}` : ''}

    <div class="modal-close-row" style="margin-top:20px">
      <button class="btn danger" id="vpDeleteBtn">Delete</button>
      <button class="btn ghost" id="vpEditBtn">Edit</button>
      <button class="btn primary" id="modalCloseBtn">Close</button>
    </div>`;
}

function openVpModal(id) {
  const e = VERB_PREPS.find((x) => x.id === id);
  if (!e) return;
  const modal = document.getElementById('wordModal');
  modal.innerHTML = vpDetailHtml(e);
  document.getElementById('modalBackdrop').hidden = false;
  document.getElementById('modalCloseBtn').addEventListener('click', closeModal);
  modal.querySelectorAll('[data-speak]').forEach((b) => b.addEventListener('click', () => speak(b.dataset.speak)));
  modal.querySelectorAll('.vp-row').forEach((r) => r.addEventListener('click', () => openVpModal(r.dataset.id)));
  document.getElementById('vpDeleteBtn').addEventListener('click', () => {
    if (!confirm(`Delete "${e.verb} ${e.prep}"?`)) return;
    VERB_PREPS = VERB_PREPS.filter((x) => x.id !== id);
    persistVerbPreps();
    closeModal();
    vpQuiz = null;
    renderVerbPreps();
  });
  document.getElementById('vpEditBtn').addEventListener('click', () => {
    modal.innerHTML = `<h2>Edit</h2>${vpFormHtml(e)}`;
    document.getElementById('vpEditCancel').addEventListener('click', () => openVpModal(id));
    document.getElementById('vpEditForm').addEventListener('submit', (ev) => {
      ev.preventDefault();
      const f = new FormData(ev.target);
      const dup = VERB_PREPS.find((x) => x.id !== id && vpKey(x.verb, x.prep) === vpKey(f.get('verb'), f.get('prep')));
      if (dup) { alert('That verb + preposition pair already exists.'); return; }
      Object.assign(e, {
        verb: f.get('verb').trim(), prep: f.get('prep').trim().toLowerCase(), case: f.get('case') || null,
        english: f.get('english').trim(), example: f.get('example').trim(),
      });
      persistVerbPreps();
      vpQuiz = null;
      renderVerbPreps();
      openVpModal(id);
    });
  });
}

/* ---------------- Add ---------------- */

function vpAddEntries(entries) {
  const fresh = entries.filter((n) => !VERB_PREPS.some((e) => vpKey(e.verb, e.prep) === vpKey(n.verb, n.prep)));
  if (fresh.length) {
    VERB_PREPS.push(...fresh);
    persistVerbPreps();
    renderVerbPreps();
  }
  return { added: fresh.length, skipped: entries.length - fresh.length };
}

function vpShowStatus(text, ok = true) {
  const el = document.getElementById('vpAddStatus');
  el.textContent = text;
  el.className = `ai-status ${ok ? 'ok' : 'err'}`;
}

// Accepts the list as you'd write it or paste it from notes: bullets/headers are
// ignored, "(sich)" is normalised, and "leiden an / unter" or "kämpfen für / gegen"
// expands into one pair per preposition. Case is optional ("denken an +Akk").
function vpParseList(text) {
  const out = [];
  text.split('\n').forEach((raw) => {
    const line = raw.replace(/^[\s*•·\-–]+/, '').replace(/\(sich\)/gi, 'sich').replace(/\s+/g, ' ').trim();
    if (!line) return;
    const [first, ...rest] = line.split('/').map((x) => x.trim());
    const m = first.match(/^(.+?)\s+([A-Za-zäöüÄÖÜß]+)\s*(?:\+\s*(akk|dat))?$/i);
    if (!m) return;
    out.push({ verb: m[1], prep: m[2].toLowerCase(), case: m[3] ? m[3].toLowerCase() : null });
    rest.forEach((part) => {
      const pm = part.match(/^([A-Za-zäöüÄÖÜß]+)\s*(?:\+\s*(akk|dat))?$/i);
      if (pm) out.push({ verb: m[1], prep: pm[1].toLowerCase(), case: pm[2] ? pm[2].toLowerCase() : null });
    });
  });
  return out;
}

// Pairs to send to Claude: whatever is pasted in the box, otherwise every saved
// pair that is still missing its case, meaning or example.
function vpPairsForPrompt() {
  const typed = vpParseList(document.getElementById('vpBulkInput').value);
  if (typed.length) return typed;
  return VERB_PREPS.filter((e) => !e.case || !e.english || !e.example).map((e) => ({ verb: e.verb, prep: e.prep, case: e.case }));
}

// Merge Claude's answer: new pairs are added, existing ones only get blanks filled in.
function vpApplyAiResult(items) {
  let added = 0;
  let updated = 0;
  items.forEach((it) => {
    if (!it || !it.verb || !it.prep) return;
    const kase = /^akk/i.test(it.case || '') ? 'akk' : /^dat/i.test(it.case || '') ? 'dat' : null;
    const existing = VERB_PREPS.find((e) => vpKey(e.verb, e.prep) === vpKey(it.verb, it.prep));
    if (!existing) {
      VERB_PREPS.push(vpMakeEntry(it.verb, it.prep, kase, it.english, it.example));
      added += 1;
      return;
    }
    let changed = false;
    if (!existing.case && kase) { existing.case = kase; changed = true; }
    if (!existing.english && it.english) { existing.english = String(it.english).trim(); changed = true; }
    if (!existing.example && it.example) { existing.example = String(it.example).trim(); changed = true; }
    if (changed) updated += 1;
  });
  persistVerbPreps();
  vpQuiz = null;
  renderVerbPreps();
  vpShowStatus(`Done: ${added} added, ${updated} filled in ✓`);
}

function wireAddVerbPrep() {
  document.getElementById('vpAddForm').addEventListener('submit', (ev) => {
    ev.preventDefault();
    const f = new FormData(ev.target);
    const verb = f.get('verb').trim();
    const prep = f.get('prep').trim();
    if (!verb || !prep) return;
    const r = vpAddEntries([vpMakeEntry(verb, prep, f.get('case') || null, f.get('english'), f.get('example'))]);
    if (r.added) { ev.target.reset(); vpShowStatus(`Added "${verb} ${prep}" ✓`); }
    else vpShowStatus(`"${verb} ${prep}" is already in your list.`, false);
  });

  document.getElementById('vpBulkBtn').addEventListener('click', () => {
    const pairs = vpParseList(document.getElementById('vpBulkInput').value);
    if (!pairs.length) { vpShowStatus('Nothing to add — paste one "verb preposition" pair per line.', false); return; }
    const r = vpAddEntries(pairs.map((p) => vpMakeEntry(p.verb, p.prep, p.case, '', '')));
    document.getElementById('vpBulkInput').value = '';
    vpShowStatus(`Added ${r.added}${r.skipped ? `, skipped ${r.skipped} already in your list` : ''}. Use “Copy prompt” to fill in case, meaning and examples.`);
  });

  document.getElementById('vpCopyPromptBtn').addEventListener('click', async () => {
    const pairs = vpPairsForPrompt();
    if (!pairs.length) { vpShowStatus('Nothing to look up — paste some pairs, or everything already has full details.', false); return; }
    const prompt = buildVerbPrepPrompt(pairs);
    document.getElementById('vpPromptOutput').value = prompt;
    document.getElementById('vpPastePanel').hidden = false;
    try { await navigator.clipboard.writeText(prompt); vpShowStatus(`Prompt for ${pairs.length} pair(s) copied — paste it into claude.ai, then paste the reply below.`); }
    catch (e) { vpShowStatus('Could not copy automatically — select the prompt below and copy it.', false); }
  });

  document.getElementById('vpParsePasteBtn').addEventListener('click', () => {
    try {
      vpApplyAiResult(extractJsonArray(document.getElementById('vpPasteResponse').value));
      document.getElementById('vpPasteResponse').value = '';
      document.getElementById('vpPastePanel').hidden = true;
    } catch (e) { vpShowStatus(`Could not read that reply: ${e.message}`, false); }
  });

  document.getElementById('vpAiBtn').addEventListener('click', async () => {
    const pairs = vpPairsForPrompt();
    if (!pairs.length) { vpShowStatus('Nothing to look up — paste some pairs, or everything already has full details.', false); return; }
    vpShowStatus(`Asking Claude about ${pairs.length} pair(s)…`);
    try { vpApplyAiResult(await lookupVerbPrepsWithAI(pairs, SETTINGS)); }
    catch (e) { vpShowStatus(e.message, false); }
  });
}

/* ---------------- Practice ---------------- */

function vpDistractors(entry, pool) {
  const chosen = new Set([entry.prep]);
  const add = (list) => { list.forEach((p) => { if (chosen.size < 4) chosen.add(p); }); };
  // Same verb with other prepositions is the most instructive trap (schreiben an vs. über)…
  add(pool.filter((e) => e.id !== entry.id && vpBaseVerb(e.verb) === vpBaseVerb(entry.verb)).map((e) => e.prep));
  // …then prepositions that share the case, then anything else in the list.
  add(shuffle(pool.filter((e) => e.case && e.case === entry.case).map((e) => e.prep)));
  add(shuffle(pool.map((e) => e.prep)));
  add(shuffle(VP_FALLBACK_PREPS));
  return shuffle([...chosen]);
}

function nextVpQuestion() {
  const scope = VERB_PREPS.filter((e) => vpPrepFilter === 'all' || e.prep === vpPrepFilter);
  if (!scope.length) { vpQuiz = null; document.getElementById('vpQuiz').innerHTML = '<div class="empty-state"><p class="muted">Nothing to practise yet.</p></div>'; return; }
  const due = scope.filter((e) => isDue(e.srs));
  let pool = due.length ? due : scope;
  if (pool.length > 1 && vpQuiz) pool = pool.filter((e) => e.id !== vpQuiz.entry.id);
  const entry = pool[Math.floor(Math.random() * pool.length)];
  vpQuiz = { entry, options: vpDistractors(entry, VERB_PREPS), stage: 'prep', freePractice: !due.length };
  renderVpQuestion();
}

function renderVpQuestion() {
  const q = vpQuiz;
  const el = document.getElementById('vpQuiz');
  if (!q) return;
  const e = q.entry;
  const parts = vpSplitExample(e.example, e.prep);
  const prompt = parts ? `${escapeHtml(parts.before)}<span class="vp-blank">${q.stage === 'prep' ? '___' : escapeHtml(e.prep)}</span>${escapeHtml(parts.after)}`
    : `${escapeHtml(e.verb)} <span class="vp-blank">${q.stage === 'prep' ? '___' : escapeHtml(e.prep)}</span> …`;
  const dueCount = VERB_PREPS.filter((x) => isDue(x.srs)).length;

  let body = '';
  if (q.stage === 'prep') {
    body = `<div class="quiz-options">${q.options.map((o) => `<button type="button" class="quiz-option" data-opt="${escapeHtml(o)}">${escapeHtml(o)}</button>`).join('')}</div>`;
  } else if (q.stage === 'case') {
    body = `<div class="quiz-context">✓ ${escapeHtml(e.prep)} — now which case does it take?</div>
      <div class="quiz-options"><button type="button" class="quiz-option" data-case="akk">Akkusativ</button><button type="button" class="quiz-option" data-case="dat">Dativ</button></div>`;
  } else {
    body = `<div class="quiz-feedback ${q.grade === GRADE.GOOD ? 'correct-text' : 'wrong-text'}">${q.message}</div>
      <div class="vp-answer">
        <div><strong>${escapeHtml(e.verb)} ${escapeHtml(e.prep)}</strong> ${vpCaseBadge(e.case)}</div>
        <div class="muted">${vpCompound('Wo', e.prep)}…? → ${vpCompound('da', e.prep)}… · ${escapeHtml(vpPersonQuestion(e.prep, e.case))}…?</div>
        ${e.example ? `<div class="vp-example">${vpHighlightExample(e.example, e.prep)}</div>` : ''}
      </div>
      <button type="button" class="btn primary" id="vpNextBtn" style="margin-top:16px">Next →</button>`;
  }

  el.innerHTML = `
    <div class="quiz-card">
      <div class="quiz-question">${prompt}</div>
      <div class="quiz-context">${escapeHtml(e.verb)} — ${escapeHtml(e.english) || 'which preposition?'}${vpPrepFilter !== 'all' ? ` · practising “${escapeHtml(vpPrepFilter)}” only` : ''}</div>
      ${body}
      <div class="quiz-scoreboard"><span>Score: <strong>${vpScore.correct}/${vpScore.total}</strong></span><span>${q.freePractice ? 'No cards due — free practice' : `${dueCount} due`}</span></div>
    </div>`;

  el.querySelectorAll('[data-opt]').forEach((b) => b.addEventListener('click', () => answerVpPrep(b.dataset.opt)));
  el.querySelectorAll('[data-case]').forEach((b) => b.addEventListener('click', () => answerVpCase(b.dataset.case)));
  const next = document.getElementById('vpNextBtn');
  if (next) next.addEventListener('click', nextVpQuestion);
}

function finishVpQuestion(grade, message) {
  const q = vpQuiz;
  q.stage = 'done';
  q.grade = grade;
  q.message = message;
  vpScore.total += 1;
  if (grade === GRADE.GOOD) vpScore.correct += 1;
  q.entry.srs = gradeCard(q.entry.srs, grade);
  persistVerbPreps(false);
  renderVpQuestion();
}

function answerVpPrep(chosen) {
  const e = vpQuiz.entry;
  if (chosen !== e.prep) {
    finishVpQuestion(GRADE.AGAIN, `✗ Not “${escapeHtml(chosen)}” — it's “${escapeHtml(e.prep)}”.`);
    return;
  }
  if (!e.case) { finishVpQuestion(GRADE.GOOD, '✓ Correct!'); return; }
  vpQuiz.stage = 'case';
  renderVpQuestion();
}

function answerVpCase(chosen) {
  const e = vpQuiz.entry;
  if (chosen === e.case) finishVpQuestion(GRADE.GOOD, '✓ Correct — preposition and case!');
  else finishVpQuestion(GRADE.HARD, `✓ Preposition right, but the case is ${e.case === 'akk' ? 'Akkusativ' : 'Dativ'}.`);
}

/* ---------------- Wiring ---------------- */

function wireVerbPreps() {
  document.getElementById('vpModeToggle').addEventListener('click', (ev) => {
    const b = ev.target.closest('.dir-btn');
    if (!b) return;
    vpMode = b.dataset.mode;
    if (vpMode === 'practice') vpQuiz = null;
    renderVerbPreps();
  });
  document.getElementById('vpGroupToggle').addEventListener('click', (ev) => {
    const b = ev.target.closest('.dir-btn');
    if (!b) return;
    vpGroupBy = b.dataset.group;
    renderVerbPreps();
  });
  document.getElementById('vpPrepChips').addEventListener('click', (ev) => {
    const b = ev.target.closest('.chip');
    if (!b) return;
    vpPrepFilter = b.dataset.prep;
    vpQuiz = null;
    renderVerbPreps();
  });
  document.getElementById('vpSearch').addEventListener('input', (ev) => {
    vpSearch = ev.target.value;
    renderVerbPreps();
  });
  document.getElementById('vpList').addEventListener('click', (ev) => {
    const speakBtn = ev.target.closest('[data-speak]');
    if (speakBtn) { speak(speakBtn.dataset.speak); return; }
    const row = ev.target.closest('.vp-row');
    if (row) openVpModal(row.dataset.id);
  });
  document.getElementById('vpPrepList').innerHTML = [...new Set([...VP_FALLBACK_PREPS, ...VERB_PREPS.map((e) => e.prep)])]
    .map((p) => `<option value="${escapeHtml(p)}">`).join('');
  wireAddVerbPrep();
}
