import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
dotenv.config();

const key = (process.env.GEMINI_API_KEY ?? '').trim();
const ai = new GoogleGenAI({ apiKey: key });

// Test different models to determine which tier this key has access to.
// AQ-prefixed keys typically come from GCP Vertex AI / API Keys Manager and
// may not have access to the "3.x" public preview model names.
const MODELS = [
  'models/gemini-2.0-flash',
  'models/gemini-1.5-flash',
  'models/gemini-1.5-flash-002',
  'models/gemini-1.0-pro',
  'models/gemini-3.8-flash',
];

const prompt = 'Reply with exactly: OK (<model-name>). Nothing else.';

for (const model of MODELS) {
  process.stdout.write(`  testing ${model.padEnd(32)} → `);
  const t0 = Date.now();
  try {
    const r = await ai.models.generateContent({ model, contents: prompt.replace('<model-name>', model) });
    const dt = Date.now() - t0;
    const text = (r.text ?? '').slice(0, 80).trim();
    console.log(`✅ OK  (${dt}ms)  "${text}"`);
  } catch (e: any) {
    const msg = e?.message ?? String(e);
    // Extract short summary
    let summary = msg;
    try {
      const parsed = JSON.parse(msg);
      summary = `HTTP ${parsed?.error?.code ?? '?'} ${parsed?.error?.status ?? '?'} / ${parsed?.error?.message ?? ''}`;
    } catch {}
    console.log(`❌ FAIL ${summary.slice(0, 160)}`);
  }
}
