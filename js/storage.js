// Local cache (localStorage) + optional GitHub-backed sync so the same word
// list & review progress can be reached from any device pointed at the repo.

const LS_WORDS = 'gv_words_v1';
const LS_SETTINGS = 'gv_settings_v1';

function loadLocalWords() {
  try {
    const raw = localStorage.getItem(LS_WORDS);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.error('loadLocalWords failed', e);
    return null;
  }
}

function saveLocalWords(words) {
  localStorage.setItem(LS_WORDS, JSON.stringify(words));
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(LS_SETTINGS);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function saveSettings(settings) {
  localStorage.setItem(LS_SETTINGS, JSON.stringify(settings));
}

function b64EncodeUnicode(str) {
  return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode(`0x${p1}`)));
}

function b64DecodeUnicode(str) {
  return decodeURIComponent(
    atob(str.replace(/\n/g, '')).split('').map((c) => `%${(`00${c.charCodeAt(0).toString(16)}`).slice(-2)}`).join('')
  );
}

function githubConfigured(settings) {
  return !!(settings.ghToken && settings.ghOwner && settings.ghRepo);
}

async function githubGetWords(settings) {
  const { ghOwner, ghRepo, ghBranch = 'main', ghPath = 'data.json', ghToken } = settings;
  const url = `https://api.github.com/repos/${ghOwner}/${ghRepo}/contents/${ghPath}?ref=${encodeURIComponent(ghBranch)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${ghToken}`, Accept: 'application/vnd.github+json' },
  });
  if (res.status === 404) return { words: null, sha: null };
  if (!res.ok) throw new Error(`GitHub read failed: ${res.status} ${await res.text()}`);
  const json = await res.json();
  const words = JSON.parse(b64DecodeUnicode(json.content));
  return { words, sha: json.sha };
}

async function githubPutWords(settings, words, sha) {
  const { ghOwner, ghRepo, ghBranch = 'main', ghPath = 'data.json', ghToken } = settings;
  const url = `https://api.github.com/repos/${ghOwner}/${ghRepo}/contents/${ghPath}`;
  const body = {
    message: `Update vocabulary data (${new Date().toISOString()})`,
    content: b64EncodeUnicode(JSON.stringify(words, null, 2)),
    branch: ghBranch,
  };
  if (sha) body.sha = sha;
  const res = await fetch(url, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${ghToken}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`GitHub write failed: ${res.status} ${await res.text()}`);
  const json = await res.json();
  return json.content.sha;
}
