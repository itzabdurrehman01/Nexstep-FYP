import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
dotenv.config();

const key = (process.env.GEMINI_API_KEY ?? '').trim();
const ai = new GoogleGenAI({ apiKey: key, apiVersion: 'v1beta' });

const MODEL_CANDIDATES = [
  // v1beta / v1 stable-ish names currently documented
  'models/gemini-2.5-flash-preview-05-20',
  'models/gemini-2.5-flash',
  'models/gemini-2.5-pro-preview-05-20',
  'models/gemini-2.0-flash',
  'models/gemini-2.0-flash-001',
  'models/gemini-2.0-flash-exp',
  'models/gemini-3.8-flash-preview-07-15',
  'models/gemini-3.8-flash',
  'models/gemini-2.5-flash-preview',
  // With `gemini-` prefix (some SDKs strip the "models/" prefix)
  'gemini-2.5-flash-preview-05-20',
  'gemini-3.8-flash',
  'gemini-2.0-flash',
];

const prompt = 'Reply with exactly: MODEL_OK. Nothing else.';

for (const model of MODEL_CANDIDATES) {
  process.stdout.write(`  ${model.padEnd(44)} → `);
  try {
    const t0 = Date.now();
    const r = await ai.models.generateContent({ model, contents: prompt });
    const text = (r.text ?? '').trim();
    console.log(`✅ OK  (${Date.now() - t0}ms)  "${text.slice(0, 80)}"`);
    process.exit(0); // Found at least one working model
  } catch (e: any) {
    const msg = e?.message ?? String(e);
    let summary = msg;
    try {
      const parsed = JSON.parse(msg);
      summary = `HTTP ${parsed?.error?.code ?? '?'} ${parsed?.error?.status ?? '?'}`;
      const inner = (parsed?.error?.message ?? '').slice(0, 100);
      if (inner) summary += ` · ${inner}`;
    } catch {}
    console.log(`❌ FAIL ${summary.slice(0, 200)}`);
  }
}
console.log('\n(No working model was found for this API key + apiVersion = v1beta)');
