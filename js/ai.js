// Calls the Anthropic Messages API directly from the browser to auto-fill
// grammar data for a word. Requires the user's own API key (kept only in
// localStorage on their device — never sent anywhere but api.anthropic.com).

const AI_SYSTEM_PROMPT = `You are a precise German grammar reference. Given a single German or English word, respond with ONLY a JSON object (no prose, no markdown fences) describing it for a flashcard app. Follow this exact schema:

{
  "type": "verb" | "noun" | "adjective",
  "german": "dictionary form, e.g. infinitive for verbs, singular noun without article, base adjective form",
  "english": "short English translation",
  "notes": "optional 1-sentence usage note, or empty string",

  // present only if type === "verb"
  "verb": {
    "regular": true|false,           // regular (weak) vs irregular (strong/mixed)
    "separable": true|false,          // trennbar
    "prefix": "separable prefix or null",
    "auxiliary": "haben"|"sein",
    "partizipII": "past participle",
    "praesens": {"ich":"","du":"","er":"","wir":"","ihr":"","sie":""},
    "praeteritum": {"ich":"","du":"","er":"","wir":"","ihr":"","sie":""},
    "konjunktiv2": {"ich":"","du":"","er":"","wir":"","ihr":"","sie":""}
  },

  // present only if type === "noun"
  "noun": {
    "gender": "der"|"die"|"das",
    "plural": "plural form without article, or \\"—\\" if none",
    "genitiveSingular": "full genitive singular word, e.g. Mannes",
    "pluralDative": "full dative plural word, e.g. Männern"
  },

  // present only if type === "adjective"
  "adjective": {
    "comparative": "full comparative form, e.g. schöner",
    "superlative": "bare superlative stem WITHOUT 'am', e.g. schönsten",
    "predicateOnly": true|false
  }
}

Use standard High German. For "er" conjugation rows use the er/sie/es form. Be accurate about irregular/strong verb stem changes and umlauts. Respond with nothing but the JSON object.`;

function extractJson(text) {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : trimmed;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('No JSON object found in AI response');
  return JSON.parse(candidate.slice(start, end + 1));
}

async function lookupWordWithAI(word, settings) {
  const apiKey = settings.aiApiKey;
  const model = settings.aiModel || 'claude-haiku-4-5-20251001';
  if (!apiKey) throw new Error('No Claude API key set in Settings.');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model,
      max_tokens: 1500,
      system: AI_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: `Word: ${word}` }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Claude API error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const text = data.content && data.content[0] && data.content[0].text;
  if (!text) throw new Error('Empty response from Claude API.');
  return extractJson(text);
}
