// Pronunciation via the browser's built-in Web Speech API — no server needed.

let _voicesCache = [];
if ('speechSynthesis' in window) {
  const refresh = () => { _voicesCache = window.speechSynthesis.getVoices(); };
  refresh();
  window.speechSynthesis.onvoiceschanged = refresh;
}

function pickGermanVoice() {
  return _voicesCache.find((v) => v.lang === 'de-DE') || _voicesCache.find((v) => v.lang && v.lang.startsWith('de'));
}

function speak(text, lang = 'de-DE') {
  if (!text || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = lang;
  utter.rate = 0.92;
  const voice = lang.startsWith('de') ? pickGermanVoice() : _voicesCache.find((v) => v.lang && v.lang.startsWith('en'));
  if (voice) utter.voice = voice;
  window.speechSynthesis.speak(utter);
}

function speechSupported() {
  return 'speechSynthesis' in window;
}
