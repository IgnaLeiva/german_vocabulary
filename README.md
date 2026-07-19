# Vokabeltrainer

A single-page German vocabulary trainer: Anki-style spaced-repetition study, full grammar
detail per word (verb conjugation across tenses, noun articles/declension, adjective
comparison/declension), AI-assisted word lookup via your own Claude API key, spoken
pronunciation, and optional GitHub-backed sync so the same word list follows you across
devices.

No build step, no backend — it's plain HTML/CSS/JS. Open `index.html` locally, or host it
on GitHub Pages for access from your phone.

## Run it locally

Just open `index.html` in a browser, or serve the folder so `fetch`/localStorage behave
normally:

```bash
python3 -m http.server 8080
# then open http://localhost:8080
```

## Features

- **Study** — due cards, SM-2-style spaced repetition (Again/Hard/Good/Easy), DE→EN /
  EN→DE / mixed direction, spoken pronunciation on each card.
- **Words** — searchable/filterable list; click a word for full grammar detail:
  - Verbs: regular/irregular, separable (trennbar), auxiliary, Präsens, Präteritum,
    Perfekt, Plusquamperfekt, Futur I/II, Konjunktiv II — every form with a 🔊 button.
  - Nouns: der/die/das, full definite & indefinite (ein/einen/einer…) declension table
    across all 4 cases, singular and plural.
  - Adjectives: comparative/superlative, plus the full weak/mixed/strong declension
    ending tables.
- **Add** — type a word, click "Look up with AI" to auto-fill everything via your Claude
  API key, review/edit the generated fields, then save. Or click "Enter manually" to fill
  a blank form yourself — no API key required for that path.
- **Settings** — Claude API key + model, GitHub sync fields, manual JSON export/import
  backup.

## AI lookup: two ways to fill in a word

**Note:** a claude.ai Pro/Max subscription and the Anthropic API are separate products —
there's no supported way for a website to call claude.ai using your subscription's quota
directly (no public endpoint for that). So there are two independent options:

### Option A — copy/paste into claude.ai (uses your subscription, no extra cost)

1. Add tab → type a word → **"📋 Copy prompt for claude.ai"**. This copies a ready-made
   prompt to your clipboard and opens a paste panel.
2. Open a new chat at [claude.ai](https://claude.ai), paste the prompt, send it.
3. Copy Claude's reply, paste it into the "paste claude.ai's reply here" box in the app,
   click **"Parse & fill form"**. Review the auto-filled fields and save.

No API key, no extra billing — just your normal claude.ai usage.

### Option B — direct API call (fully automatic, pay-per-lookup)

1. Get an API key from the [Anthropic Console](https://console.anthropic.com/) — this is
   billed separately from claude.ai.
2. Settings tab → paste it into "Anthropic API key" → Save settings.
3. The key is stored only in your browser's `localStorage` and sent directly to
   `api.anthropic.com` — this app has no backend of its own, so nothing passes through a
   third-party server. Anyone with access to that browser profile could read the key back
   out of localStorage, so don't use this on a shared/public computer.
4. Add tab → "✨ Look up with API key" does the whole round-trip for you. Each lookup
   costs a small amount against your Anthropic account (Haiku 4.5 is the default — fast
   and inexpensive).

## Setting up GitHub sync (so your phone and computer share the same data)

1. Push this folder to a GitHub repo (see below).
2. Create a **fine-grained personal access token**: GitHub → Settings → Developer
   settings → Personal access tokens → Fine-grained tokens → Generate new token.
   - Repository access: only this repo.
   - Permissions: **Contents → Read and write**.
3. Settings tab in the app → fill in the token, your username, the repo name, branch
   (`main`), and file path (`data.json`) → Save settings.
4. The app will pull `data.json` from the repo on load and push changes back
   automatically (debounced ~1.5s after each change). Use "Pull now" / "Push now" if you
   ever need to force a sync.
5. This token is also stored only in your browser's localStorage. Scope it to just this
   one repo so a leak has minimal blast radius.

**Data flow**: your word list + review progress live in `data.json` inside the repo. The
first push creates the file if it doesn't exist yet.

## Hosting on GitHub Pages

```bash
git init
git add .
git commit -m "Initial vocabulary trainer"
git branch -M main
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```

Then on GitHub: repo → Settings → Pages → Source: "Deploy from a branch" → Branch:
`main` / root → Save. Your app will be live at
`https://<you>.github.io/<repo>/` within a minute or two, reachable from any device.

## Data model

Each word is stored as one JSON object in the array (see `js/seed.js` for real examples):

```jsonc
{
  "id": "w_...", "type": "verb" | "noun" | "adjective",
  "german": "gehen", "english": "to go", "notes": "",
  "verb": { "regular": false, "separable": false, "prefix": null, "auxiliary": "sein",
            "partizipII": "gegangen", "praesens": {"ich": "gehe", ...},
            "praeteritum": {...}, "konjunktiv2": {...} },
  "noun": { "gender": "der", "plural": "Tische", "genitiveSingular": "Tisches", "pluralDative": "Tischen" },
  "adjective": { "comparative": "schöner", "superlative": "schönsten", "predicateOnly": false },
  "srs": { "ef": 2.5, "interval": 0, "reps": 0, "due": "2026-...", "lastResult": null }
}
```

Perfekt/Plusquamperfekt/Futur I/II are *derived* at render time from `praesens`,
`praeteritum`, `partizipII`, and `auxiliary` — you only ever need to enter those four
things (plus optionally `konjunktiv2` for irregular verbs; regular verbs fall back to the
würde-form automatically).
