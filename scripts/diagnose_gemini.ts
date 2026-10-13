import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
dotenv.config();

const key = process.env.GEMINI_API_KEY ?? '';
const isNonEmpty = Boolean(key.trim());
const hasAizaPrefix = key.trim().startsWith('AIza');
const keyLen = key.trim().length;

console.log('── PART 1 / Env & Flag Diagnosis ──────────────────');
console.log(`GEMINI_API_KEY present and non-empty:  ${isNonEmpty}`);
console.log(`GEMINI_API_KEY length:                 ${keyLen} chars`);
console.log(`GEMINI_API_KEY starts with 'AIza':     ${hasAizaPrefix}`);
console.log(`GEMINI_ENABLED (Boolean(.trim())):     ${Boolean(key.trim())}`);
console.log(`Key prefix observed:                   ${keyLen > 0 ? key.trim().slice(0, 10) : '(empty)'}...\n`);

if (!hasAizaPrefix) {
  console.log('  ⚠️  KEY FORMAT PROBLEM:');
  console.log('     Google AI Studio REST API keys MUST start with "AIza".');
  console.log('     This key starts with something else — it is NOT a valid');
  console.log('     Google AI Studio / Vertex AI free-tier API key.\n');
}

console.log('── PART 2 / Live API call against configured key ─');
const ai = new GoogleGenAI({ apiKey: key.trim() });

const q = 'Say "hello from gemini" and nothing else.';
console.log(`Request: POST generateContent model=gemini-3.8-flash`);
console.log(`Prompt length: ${q.length} chars\n`);

try {
  const t0 = Date.now();
  const r = await ai.models.generateContent({
    model: 'models/gemini-3.8-flash',
    contents: q,
  });
  const dt = Date.now() - t0;
  const text = r.text?.trim();
  console.log(`✅ SUCCESS in ${dt}ms`);
  console.log(`Response length: ${text?.length ?? 0} chars`);
  console.log(`Raw text: "${text}"\n`);
} catch (e: any) {
  console.log('❌ API CALL FAILED');
  const msg = e?.message ?? String(e);
  console.log(`Message (first 600 chars):\n  ${msg.slice(0, 600)}\n`);
  if (e?.stack) console.log(`Stack (first 300 chars):\n  ${e.stack.slice(0, 300)}`);
  if (msg.includes('API_KEY_INVALID') || msg.includes('API key not valid') || /4\d\d/.test(msg)) {
    console.log('\n  🔴 ROOT CAUSE: INVALID/UNRECOGNIZED API KEY FORMAT');
    console.log('     Action required: regenerate a key from https://aistudio.google.com/apikey');
    console.log('     (keys from that page always begin with "AIza...").\n');
  }
  process.exit(1);
}
