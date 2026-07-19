// Starter word list so the app isn't empty on first launch. IDs/SRS state are
// assigned at first run (see app.js#ensureSeeded).

const SEED_WORDS = [
  {
    type: 'verb', german: 'gehen', english: 'to go', notes: 'Strong verb; motion verb, takes sein.',
    verb: {
      regular: false, separable: false, prefix: null, auxiliary: 'sein', partizipII: 'gegangen',
      praesens: { ich: 'gehe', du: 'gehst', er: 'geht', wir: 'gehen', ihr: 'geht', sie: 'gehen' },
      praeteritum: { ich: 'ging', du: 'gingst', er: 'ging', wir: 'gingen', ihr: 'gingt', sie: 'gingen' },
      konjunktiv2: { ich: 'ginge', du: 'gingest', er: 'ginge', wir: 'gingen', ihr: 'ginget', sie: 'gingen' },
    },
  },
  {
    type: 'verb', german: 'arbeiten', english: 'to work', notes: 'Regular; extra -e- before endings because stem ends in -t.',
    verb: {
      regular: true, separable: false, prefix: null, auxiliary: 'haben', partizipII: 'gearbeitet',
      praesens: { ich: 'arbeite', du: 'arbeitest', er: 'arbeitet', wir: 'arbeiten', ihr: 'arbeitet', sie: 'arbeiten' },
      praeteritum: { ich: 'arbeitete', du: 'arbeitetest', er: 'arbeitete', wir: 'arbeiteten', ihr: 'arbeitetet', sie: 'arbeiteten' },
      konjunktiv2: null,
    },
  },
  {
    type: 'verb', german: 'aufstehen', english: 'to get up', notes: 'Separable (trennbar): prefix auf- splits off in main clauses.',
    verb: {
      regular: false, separable: true, prefix: 'auf', auxiliary: 'sein', partizipII: 'aufgestanden',
      praesens: { ich: 'stehe auf', du: 'stehst auf', er: 'steht auf', wir: 'stehen auf', ihr: 'steht auf', sie: 'stehen auf' },
      praeteritum: { ich: 'stand auf', du: 'standst auf', er: 'stand auf', wir: 'standen auf', ihr: 'standet auf', sie: 'standen auf' },
      konjunktiv2: { ich: 'stünde auf', du: 'stündest auf', er: 'stünde auf', wir: 'stünden auf', ihr: 'stündet auf', sie: 'stünden auf' },
    },
  },
  {
    type: 'verb', german: 'sein', english: 'to be', notes: 'Highly irregular; also functions as its own auxiliary.',
    verb: {
      regular: false, separable: false, prefix: null, auxiliary: 'sein', partizipII: 'gewesen',
      praesens: { ich: 'bin', du: 'bist', er: 'ist', wir: 'sind', ihr: 'seid', sie: 'sind' },
      praeteritum: { ich: 'war', du: 'warst', er: 'war', wir: 'waren', ihr: 'wart', sie: 'waren' },
      konjunktiv2: { ich: 'wäre', du: 'wärst', er: 'wäre', wir: 'wären', ihr: 'wärt', sie: 'wären' },
    },
  },
  {
    type: 'verb', german: 'haben', english: 'to have', notes: 'Irregular; stem drops b in du/er present forms.',
    verb: {
      regular: false, separable: false, prefix: null, auxiliary: 'haben', partizipII: 'gehabt',
      praesens: { ich: 'habe', du: 'hast', er: 'hat', wir: 'haben', ihr: 'habt', sie: 'haben' },
      praeteritum: { ich: 'hatte', du: 'hattest', er: 'hatte', wir: 'hatten', ihr: 'hattet', sie: 'hatten' },
      konjunktiv2: { ich: 'hätte', du: 'hättest', er: 'hätte', wir: 'hätten', ihr: 'hättet', sie: 'hätten' },
    },
  },
  {
    type: 'verb', german: 'trinken', english: 'to drink', notes: 'Strong verb; i → a → u ablaut pattern (trinken/trank/getrunken).',
    verb: {
      regular: false, separable: false, prefix: null, auxiliary: 'haben', partizipII: 'getrunken',
      praesens: { ich: 'trinke', du: 'trinkst', er: 'trinkt', wir: 'trinken', ihr: 'trinkt', sie: 'trinken' },
      praeteritum: { ich: 'trank', du: 'trankst', er: 'trank', wir: 'tranken', ihr: 'trankt', sie: 'tranken' },
      konjunktiv2: { ich: 'tränke', du: 'tränkest', er: 'tränke', wir: 'tränken', ihr: 'tränket', sie: 'tränken' },
    },
  },
  {
    type: 'noun', german: 'Tisch', english: 'table', notes: '',
    noun: { gender: 'der', plural: 'Tische', genitiveSingular: 'Tisches', pluralDative: 'Tischen' },
  },
  {
    type: 'noun', german: 'Frau', english: 'woman / wife', notes: '',
    noun: { gender: 'die', plural: 'Frauen', genitiveSingular: 'Frau', pluralDative: 'Frauen' },
  },
  {
    type: 'noun', german: 'Kind', english: 'child', notes: '',
    noun: { gender: 'das', plural: 'Kinder', genitiveSingular: 'Kindes', pluralDative: 'Kindern' },
  },
  {
    type: 'adjective', german: 'gut', english: 'good', notes: 'Irregular comparison.',
    adjective: { comparative: 'besser', superlative: 'besten', predicateOnly: false },
  },
  {
    type: 'adjective', german: 'schön', english: 'beautiful / nice', notes: 'Regular comparison.',
    adjective: { comparative: 'schöner', superlative: 'schönsten', predicateOnly: false },
  },
  {
    type: 'adjective', german: 'hoch', english: 'high / tall', notes: 'Irregular: drops the c before endings/comparison (höher, höchsten).',
    adjective: { comparative: 'höher', superlative: 'höchsten', predicateOnly: false },
  },
];
