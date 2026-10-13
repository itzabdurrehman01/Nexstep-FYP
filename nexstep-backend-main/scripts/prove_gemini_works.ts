import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
dotenv.config();

const key = (process.env.GEMINI_API_KEY ?? '').trim();
console.log(`Key present: ${key.length > 0 ? 'YES (' + key.slice(0, 6) + '...)' : 'NO'}`);
const isGCP = key.startsWith('AQ.');
const isAIza = key.startsWith('AIza');
const fmtLabel =
  isGCP ? 'GCP API Keys Manager (AQ.) — only newer gemini-3.8-flash / v1alpha reachable per probe'
  : isAIza ? 'Google AI Studio (AIza) — use guide default gemini-1.5-flash / v1'
  : 'UNKNOWN';
console.log(`Key format: ${fmtLabel}`);
console.log('');

// Explicit override via env always wins; else use tiered per-key default (endpoint-verified)
const _def = isGCP
  ? { model: 'gemini-3.8-flash',   apiVersion: 'v1alpha' }
  : { model: 'gemini-1.5-flash',  apiVersion: 'v1' };
const model = (process.env.GEMINI_MODEL ?? '').trim() || _def.model;
const apiVersion = (process.env.GEMINI_API_VERSION ?? '').trim() || _def.apiVersion;
console.log(`Using model=${model}, apiVersion=${apiVersion}`);
if (isGCP && !process.env.GEMINI_MODEL) {
  console.log(`Note: Guide's "gemini-1.5-flash / v1 combo DOES NOT work for AQ. GCP keys (all 404). To use it, swap to an AIza key from https://aistudio.google.com/apikey`);
}
console.log('');

const ai = new GoogleGenAI({ apiKey: key, apiVersion });

const questions = [
  'Hello Nexstep',
  'In 2-3 bullet points, what is MDCAT and who needs to take it in Pakistan?',
  'I got 62% in FSc pre-engineering. What engineering fields in Punjab should I realistically target?',
];

let successCount = 0;
for (const [i, q] of questions.entries()) {
  process.stdout.write(`\nQ${i + 1}: ${q.slice(0, 140)}\n`);
  try {
    const t0 = Date.now();
    const r: any = await ai.models.generateContent({ model, contents: q });
    const candidate = r?.candidates?.[0];
    const finishReason = candidate?.finishReason ?? '';
    process.stdout.write(`  finishReason=${finishReason || 'n/a'}\n`);
    if (finishReason === 'SAFETY') {
      process.stdout.write(`  ⚠️  Blocked by safety filters.\n`);
      continue;
    }

    let text = '';
    try {
      text = (r?.text ?? '').trim();
    } catch (extractErr: any) {
      const parts = candidate?.content?.parts ?? [];
      text = parts.map((p: any) => p.text ?? '').join(' ').trim();
      process.stdout.write(`  (manual extraction used; .text accessor threw: ${String(extractErr.message || extractErr).slice(0, 80)})\n`);
    }

    const dur = Date.now() - t0;
    const preview = text.length > 0 ? text.split('\n').join('\n  ').slice(0, 900) : '(empty!)';
    process.stdout.write(`A${i + 1} (${dur}ms, ${text.length} chars):\n  ${preview}\n`);
    if (text && text.length > 10) successCount++;
  } catch (e: any) {
    const msg = e?.message ?? String(e);
    process.stdout.write(`FAILED: ${msg.slice(0, 400)}\n`);
    if (msg.includes('401') || msg.includes('403') || msg.includes('API_KEY_INVALID')) {
      process.stdout.write('  → Key is INVALID. Generate a fresh key from https://aistudio.google.com/apikey\n');
    } else if (msg.includes('404') || msg.includes('not found')) {
      process.stdout.write('  → 404 model/version not supported for this key format.\n');
      if (isGCP) {
        process.stdout.write('    GCP (AQ.) tip: use gemini-3.8-flash with v1alpha OR switch to AIza-format AI Studio key.\n');
      } else {
        process.stdout.write('    Try GEMINI_MODEL=gemini-1.5-flash with GEMINI_API_VERSION=v1.\n');
      }
    } else if (msg.includes('429') || msg.toLowerCase().includes('quota')) {
      process.stdout.write('  → ✅ KEY IS VALID and MODEL EXISTS on this endpoint — but QUOTA EXCEEDED.\n');
      process.stdout.write('    Fix: Wait ~1h for quota reset, or upgrade GCP billing, or generate a fresh AIza key from aistudio.google.com.\n');
    }
  }
}

console.log(`\n── RESULTS: ${successCount}/${questions.length} successful calls (model=${model}, apiVersion=${apiVersion}) ──`);
process.exit(successCount === questions.length ? 0 : 1);
