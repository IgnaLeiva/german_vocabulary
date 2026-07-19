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
