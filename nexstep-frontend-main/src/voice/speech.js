/**
 * speech.js — small helpers around the browser Web Speech API
 * (speech-to-text + text-to-speech), shared by the voice assistant and the
 * mock interview.
 */

export const SpeechRecognitionCtor =
  typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition || null) : null;

export const recognitionSupported = Boolean(SpeechRecognitionCtor);
export const synthesisSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;
export const recordingSupported = typeof window !== 'undefined' && typeof window.MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;

let voicesPromise = null;
/** Voices load asynchronously in Chrome; wait for them (max ~1.5 s). */
export function loadVoices() {
  if (!synthesisSupported) return Promise.resolve([]);
  const now = window.speechSynthesis.getVoices();
  if (now.length) return Promise.resolve(now);
  if (!voicesPromise) {
    voicesPromise = new Promise((resolve) => {
      const done = () => resolve(window.speechSynthesis.getVoices());
      window.speechSynthesis.addEventListener?.('voiceschanged', done, { once: true });
      setTimeout(done, 1500);
    }).finally(() => { voicesPromise = null; });
  }
  return voicesPromise;
}

/** Best voice for a BCP-47 language such as 'ur-PK' or 'en-US'. */
export function pickVoice(voices, lang) {
  const want = lang.toLowerCase();
  const base = want.split('-')[0];
  return (
    voices.find((v) => v.lang?.toLowerCase() === want && /natural|online|google/i.test(v.name)) ||
    voices.find((v) => v.lang?.toLowerCase() === want) ||
    voices.find((v) => v.lang?.toLowerCase().startsWith(base)) ||
    null
  );
}

/**
 * Speak text. Resolves { ok: true } when finished, or { ok: false, reason }.
 * reason 'no-voice' means this device has no voice for the language (common for Urdu in Chrome).
 */
export async function speak(text, { lang = 'en-US', rate, onStart } = {}) {
  if (!synthesisSupported || !text) return { ok: false, reason: 'unsupported' };
  const voices = await loadVoices();
  const voice = pickVoice(voices, lang);
  if (!voice && lang.toLowerCase().startsWith('ur')) return { ok: false, reason: 'no-voice' };
  window.speechSynthesis.cancel();
  return new Promise((resolve) => {
    const u = new SpeechSynthesisUtterance(text.replace(/[*#_~`]/g, ''));
    u.lang = voice?.lang || lang;
    if (voice) u.voice = voice;
    u.rate = rate ?? (lang.startsWith('ur') ? 0.95 : 1);
    u.onstart = () => onStart?.();
    u.onend = () => resolve({ ok: true });
    u.onerror = (e) => resolve({ ok: false, reason: e.error || 'error' });
    window.speechSynthesis.speak(u);
  });
}

export function stopSpeaking() {
  if (synthesisSupported) window.speechSynthesis.cancel();
}

/** Friendly message for a SpeechRecognition error code. */
export function recognitionErrorMessage(code, lang = 'en') {
  const ur = lang.startsWith('ur');
  switch (code) {
    case 'not-allowed':
    case 'service-not-allowed':
      return ur ? 'مائیکروفون کی اجازت نہیں ملی۔ براؤزر کی ایڈریس بار میں مائیکروفون کی اجازت دیں۔' : 'Microphone permission was blocked. Allow the microphone in your browser’s address bar and try again.';
    case 'no-speech':
      return ur ? 'کوئی آواز سنائی نہیں دی۔ دوبارہ بولیں۔' : 'No speech was heard. Tap the mic and try again.';
    case 'audio-capture':
      return ur ? 'کوئی مائیکروفون نہیں ملا۔' : 'No microphone was found on this device.';
    case 'network':
      return ur ? 'آواز کی شناخت کے لیے انٹرنیٹ درکار ہے۔' : 'Speech recognition needs an internet connection.';
    case 'language-not-supported':
      return ur ? 'یہ براؤزر اس زبان کی شناخت نہیں کر سکتا۔' : 'This browser cannot recognise speech in this language.';
    default:
      return ur ? 'آواز کی شناخت میں مسئلہ ہوا۔ دوبارہ کوشش کریں۔' : 'Speech recognition stopped unexpectedly. Please try again.';
  }
}

export const UNSUPPORTED_MESSAGE = 'Voice input is not supported in this browser. Use Google Chrome or Microsoft Edge on a computer or Android phone.';
export const NO_URDU_VOICE_MESSAGE = 'This device has no Urdu voice, so replies are shown as text. Microsoft Edge includes Urdu voices.';
