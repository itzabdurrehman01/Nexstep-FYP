import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
dotenv.config();

const key = (process.env.GEMINI_API_KEY ?? '').trim();
console.log(`Key prefix: ${key.slice(0, 4)}... (${key.startsWith('AQ.') ? 'GCP AQ. format' : key.startsWith('AIza') ? 'AI Studio AIza format' : 'UNKNOWN'})\n`);

const candidates = [
  { model: 'gemini-1.5-flash-002',       apiVersion: 'v1beta'  },
  { model: 'gemini-1.5-flash-002',       apiVersion: 'v1'      },
  { model: 'gemini-1.5-flash-latest',    apiVersion: 'v1beta'  },
  { model: 'gemini-2.0-flash',           apiVersion: 'v1beta'  },
  { model: 'gemini-2.0-flash',           apiVersion: 'v1'      },
  { model: 'gemini-3.8-flash',           apiVersion: 'v1alpha' },
];

const PROMPT = 'Hi Nexstep — respond with the word "CONNECTED" and nothing else.';
let anyWorked = false;

for (const { model, apiVersion } of candidates) {
  const label = `model=${model.padEnd(26)}  apiVersion=${apiVersion.padEnd(8)}`;
  process.stdout.write(`🔍 ${label}  → `);
  try {
    const ai = new GoogleGenAI({ apiKey: key, apiVersion });
    const t0 = Date.now();
    const r: any = await ai.models.generateContent({ model, contents: PROMPT });
    const txt = (r?.text ?? '').trim();
    const took = Date.now() - t0;
    const ok = txt.length > 3;
    process.stdout.write(
      ok ? `✅ OK (${took}ms, ${txt.length} chars): "${txt.slice(0, 60)}"\n`
         : `⚠️  EMPTY (${took}ms)\n`
    );
    if (ok) anyWorked = true;
  } catch (e: any) {
    const raw = String(e?.message ?? e);
    let code = 'unknown';
    try { const p = JSON.parse(raw); code = String(p?.error?.code ?? code); } catch {}
    if (code === 'unknown' && raw.includes('404')) code = '404';
    if (code === 'unknown' && raw.includes('429')) code = '429';
    if (code === 'unknown' && raw.includes('401') || raw.includes('API_KEY_INVALID')) code = '401';

    const hint =
      code === '404' ? '❌ 404 model/version not supported on this endpoint' :
      code === '429' ? '⚠️  429 (KEY VALID — quota exceeded, model+apiVersion combo DOES exist)'  :
      code === '401' ? '🔑 401 invalid key'
                     : `❌ ${code}: ${raw.slice(0, 140)}`;
    process.stdout.write(`${hint}\n`);
    if (code === '429') anyWorked = true; // 429 = at least the model was found
  }
}

console.log('\n── Summary ──');
console.log('Recomended default (per guide best-effort) for your key format:');
if (key.startsWith('AQ.')) {
  console.log('  GCP (AQ.) keys → use a VERSIONED model name, e.g. gemini-1.5-flash-002 with apiVersion v1beta');
} else {
  console.log('  AI Studio (AIza...) keys → use gemini-1.5-flash with apiVersion v1 (guide default, always works)');
}
console.log(`Any endpoint reachable (200 or 429 instead of 404): ${anyWorked ? 'YES' : 'NO — try AI Studio AIza... key from https://aistudio.google.com/apikey'}`);
process.exit(anyWorked ? 0 : 1);
