// Core grammar reference tables + derivation helpers.
// Nothing here touches the DOM — pure data + functions.

const PERSONS = ['ich', 'du', 'er', 'wir', 'ihr', 'sie'];
const PERSON_LABELS = { ich: 'ich', du: 'du', er: 'er/sie/es', wir: 'wir', ihr: 'ihr', sie: 'sie/Sie' };

// Full conjugations of the three auxiliary verbs — everything else (Perfekt,
// Plusquamperfekt, Futur I/II, würde-Konjunktiv) is built from these.
const AUX = {
  haben: {
    praesens: { ich: 'habe', du: 'hast', er: 'hat', wir: 'haben', ihr: 'habt', sie: 'haben' },
    praeteritum: { ich: 'hatte', du: 'hattest', er: 'hatte', wir: 'hatten', ihr: 'hattet', sie: 'hatten' },
    konjunktiv2: { ich: 'hätte', du: 'hättest', er: 'hätte', wir: 'hätten', ihr: 'hättet', sie: 'hätten' },
    infinitive: 'haben',
  },
  sein: {
    praesens: { ich: 'bin', du: 'bist', er: 'ist', wir: 'sind', ihr: 'seid', sie: 'sind' },
    praeteritum: { ich: 'war', du: 'warst', er: 'war', wir: 'waren', ihr: 'wart', sie: 'waren' },
    konjunktiv2: { ich: 'wäre', du: 'wärst', er: 'wäre', wir: 'wären', ihr: 'wärt', sie: 'wären' },
    infinitive: 'sein',
  },
  werden: {
    praesens: { ich: 'werde', du: 'wirst', er: 'wird', wir: 'werden', ihr: 'werdet', sie: 'werden' },
    praeteritum: { ich: 'wurde', du: 'wurdest', er: 'wurde', wir: 'wurden', ihr: 'wurdet', sie: 'wurden' },
    konjunktiv2: { ich: 'würde', du: 'würdest', er: 'würde', wir: 'würden', ihr: 'würdet', sie: 'würden' },
    infinitive: 'werden',
  },
};

const TENSE_LABELS = {
  praesens: 'Präsens (present)',
  praeteritum: 'Präteritum (simple past)',
  perfekt: 'Perfekt (present perfect)',
  plusquamperfekt: 'Plusquamperfekt (past perfect)',
  futur1: 'Futur I (future)',
  futur2: 'Futur II (future perfect)',
  konjunktiv2: 'Konjunktiv II (subjunctive)',
  konjunktiv2Perfekt: 'Konjunktiv II Perfekt (past subjunctive)',
};

// Build every tense table for a verb entry from its stored fields.
function buildVerbTenses(verb, infinitive) {
  const aux = AUX[verb.auxiliary] || AUX.haben;
  const k2 = verb.konjunktiv2 && Object.keys(verb.konjunktiv2).length
    ? verb.konjunktiv2
    : PERSONS.reduce((acc, p) => { acc[p] = `${AUX.werden.konjunktiv2[p]} ${infinitive}`; return acc; }, {});

  const out = {
    praesens: verb.praesens || {},
    praeteritum: verb.praeteritum || {},
    perfekt: {},
    plusquamperfekt: {},
    futur1: {},
    futur2: {},
    konjunktiv2: k2,
    konjunktiv2Perfekt: {},
  };

  PERSONS.forEach((p) => {
    out.perfekt[p] = `${aux.praesens[p]} … ${verb.partizipII}`;
    out.plusquamperfekt[p] = `${aux.praeteritum[p]} … ${verb.partizipII}`;
    out.futur1[p] = `${AUX.werden.praesens[p]} … ${infinitive}`;
    out.futur2[p] = `${AUX.werden.praesens[p]} … ${verb.partizipII} ${aux.infinitive}`;
    out.konjunktiv2Perfekt[p] = `${aux.konjunktiv2[p]} … ${verb.partizipII}`;
  });

  return out;
}

// Definite / indefinite article declension — purely mechanical from gender.
const DEF_ARTICLES = {
  der: { nom: 'der', akk: 'den', dat: 'dem', gen: 'des' },
  die: { nom: 'die', akk: 'die', dat: 'der', gen: 'der' },
  das: { nom: 'das', akk: 'das', dat: 'dem', gen: 'des' },
  plural: { nom: 'die', akk: 'die', dat: 'den', gen: 'der' },
};

const INDEF_ARTICLES = {
  der: { nom: 'ein', akk: 'einen', dat: 'einem', gen: 'eines' },
  die: { nom: 'eine', akk: 'eine', dat: 'einer', gen: 'einer' },
  das: { nom: 'ein', akk: 'ein', dat: 'einem', gen: 'eines' },
  plural: { nom: 'keine', akk: 'keine', dat: 'keinen', gen: 'keiner' },
};

const CASE_LABELS = { nom: 'Nominativ', akk: 'Akkusativ', dat: 'Dativ', gen: 'Genitiv' };

// Possessive determiners (mein/dein/sein…) decline exactly like ein-words
// (mixed declension) but — unlike "ein" — they also have plural forms.
// "euer" is the one irregular stem: it contracts to "eur-" before any ending.
const POSSESSIVE_STEMS = {
  mein: 'my', dein: 'your (informal, singular owner)', sein: 'his / its',
  ihr: 'her / their', unser: 'our', euer: 'your (informal, plural owner)', Ihr: 'your (formal)',
};

function possessiveDeclension(stem) {
  const base = stem === 'euer' ? 'eur' : stem;
  return {
    nom: { m: stem, f: `${base}e`, n: stem, pl: `${base}e` },
    akk: { m: `${base}en`, f: `${base}e`, n: stem, pl: `${base}e` },
    dat: { m: `${base}em`, f: `${base}er`, n: `${base}em`, pl: `${base}en` },
    gen: { m: `${base}es`, f: `${base}er`, n: `${base}es`, pl: `${base}er` },
  };
}

// Fallback nouns for the practice quiz when the user's own list is too thin.
const GENERIC_NOUNS = [
  { german: 'Mann', gender: 'der', plural: 'Männer' },
  { german: 'Frau', gender: 'die', plural: 'Frauen' },
  { german: 'Kind', gender: 'das', plural: 'Kinder' },
  { german: 'Tisch', gender: 'der', plural: 'Tische' },
  { german: 'Blume', gender: 'die', plural: 'Blumen' },
  { german: 'Auto', gender: 'das', plural: 'Autos' },
];

// One worked example noun per gender for the Grammar tab's reference tables —
// shown as full phrases ("der kleine Mann") rather than bare articles/endings.
// Plural column always uses the masculine noun's plural, since the plural
// article/ending pattern is identical regardless of the singular's gender.
const EXAMPLE_NOUNS = {
  der: { german: 'Mann', gender: 'der', plural: 'Männer', genitiveSingular: 'Mannes', pluralDative: 'Männern' },
  die: { german: 'Frau', gender: 'die', plural: 'Frauen', genitiveSingular: 'Frau', pluralDative: 'Frauen' },
  das: { german: 'Kind', gender: 'das', plural: 'Kinder', genitiveSingular: 'Kindes', pluralDative: 'Kindern' },
};
const EXAMPLE_ADJECTIVE = 'klein'; // regular, no stem change, keeps the ending pattern unambiguous

function buildNounDeclension(noun, word) {
  const g = noun.gender;
  const genitiveS = noun.genitiveSingular || `${word}s`;
  const pluralDative = noun.pluralDative || (noun.plural && !/[ns]$/.test(noun.plural) ? `${noun.plural}n` : noun.plural) || '—';

  const singular = {};
  Object.keys(CASE_LABELS).forEach((c) => {
    const noun_ = c === 'gen' ? genitiveS : word;
    singular[c] = { def: `${DEF_ARTICLES[g][c]} ${noun_}`, indef: `${INDEF_ARTICLES[g][c]} ${noun_}` };
  });

  const plural = {};
  Object.keys(CASE_LABELS).forEach((c) => {
    const w = c === 'dat' ? pluralDative : (noun.plural || '—');
    plural[c] = { def: `${DEF_ARTICLES.plural[c]} ${w}`, indef: `${INDEF_ARTICLES.plural[c]} ${w}` };
  });

  return { singular, plural };
}

// Generic adjective declension endings (word-independent — every adjective follows this).
const ADJ_ENDINGS = {
  weak: { // after der/die/das/die(pl)
    label: 'Weak (after der-words: der, dieser, jeder…)',
    nom: { m: 'e', f: 'e', n: 'e', pl: 'en' },
    akk: { m: 'en', f: 'e', n: 'e', pl: 'en' },
    dat: { m: 'en', f: 'en', n: 'en', pl: 'en' },
    gen: { m: 'en', f: 'en', n: 'en', pl: 'en' },
  },
  mixed: { // after ein/kein/mein...
    label: 'Mixed (after ein-words: ein, kein, mein…)',
    nom: { m: 'er', f: 'e', n: 'es', pl: 'en' },
    akk: { m: 'en', f: 'e', n: 'es', pl: 'en' },
    dat: { m: 'en', f: 'en', n: 'en', pl: 'en' },
    gen: { m: 'en', f: 'en', n: 'en', pl: 'en' },
  },
  strong: { // no article
    label: 'Strong (no article)',
    nom: { m: 'er', f: 'e', n: 'es', pl: 'e' },
    akk: { m: 'en', f: 'e', n: 'es', pl: 'e' },
    dat: { m: 'em', f: 'er', n: 'em', pl: 'en' },
    gen: { m: 'en', f: 'er', n: 'en', pl: 'er' },
  },
};
const GENDER_COL_LABELS = { m: 'maskulin', f: 'feminin', n: 'neutral', pl: 'Plural' };

function uid() {
  return `w_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function freshSrs() {
  return { ef: 2.5, interval: 0, reps: 0, due: new Date().toISOString(), lastResult: null };
}

/* ---------------- Confusable-word detection ---------------- */
// Flags word pairs worth an explicit "don't confuse X with Y" warning, from
// three independent signals: identical spelling (classic homograph trap,
// e.g. der See/die See), near-identical spelling (seit/seid, wieder/wider),
// and identical translation (kennen/wissen both "to know"). This only ever
// *suggests* — linking is always a deliberate user action (see
// linkConfusable in app.js), since spelling/meaning heuristics alone would
// produce too many irrelevant pairs to link automatically.

function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i += 1) {
    const curr = [i];
    for (let j = 1; j <= n; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    prev = curr;
  }
  return prev[n];
}

function isSimilarSpelling(a, b) {
  const x = a.toLowerCase();
  const y = b.toLowerCase();
  if (x === y) return false; // handled separately as an exact-homograph match
  const dist = levenshtein(x, y);
  const maxLen = Math.max(x.length, y.length);
  if (maxLen <= 4) return dist <= 1;
  if (maxLen <= 8) return dist <= 2;
  return dist <= 3;
}

function normalizeTranslation(english) {
  return (english || '').toLowerCase().replace(/^to\s+/, '').trim();
}

function sameTranslation(englishA, englishB) {
  const a = normalizeTranslation(englishA);
  const b = normalizeTranslation(englishB);
  return !!a && a === b;
}

// Returns [{ id, reason }] for words in allWords worth suggesting as
// confusable with `word`, excluding itself and anything already linked.
function findConfusableCandidates(word, allWords) {
  const linked = new Set(word.confusables || []);
  const candidates = [];
  allWords.forEach((other) => {
    if (other.id === word.id || linked.has(other.id)) return;
    if (word.german.toLowerCase() === other.german.toLowerCase()) {
      candidates.push({ id: other.id, reason: 'Same spelling as a different word — a classic mix-up.' });
    } else if (isSimilarSpelling(word.german, other.german)) {
      candidates.push({ id: other.id, reason: 'Spelled almost the same — easy to misread or mistype.' });
    } else if (sameTranslation(word.english, other.english)) {
      candidates.push({ id: other.id, reason: `Same translation ("${word.english}") — easy to reach for the wrong one.` });
    }
  });
  return candidates;
}
