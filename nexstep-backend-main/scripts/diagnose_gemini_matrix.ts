import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
dotenv.config();

const key = (process.env.GEMINI_API_KEY ?? '').trim();
console.log('Using key prefix:', key.slice(0, 10) + '... (len=' + key.length + ')');
console.log('@google/genai package:');
try {
  const pkg = JSON.parse(require('fs').readFileSync('./node_modules/@google/genai/package.json', 'utf8'));
  console.log('  version:', pkg.version);
  console.log('  description:', pkg.description?.slice(0, 80));
} catch {}
console.log();

// Test matrix: with/without models/ prefix × various model names × various apiVersions
const API_VERSIONS: Array<'v1' | 'v1beta' | 'v1alpha'> = ['v1', 'v1beta', 'v1alpha'];
const MODEL_BASE = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-3.8-flash',
  'gemini-1.5-flash',
];
const PROMPT = 'Reply with exactly: OK. No extra words.';

let workingConfig: null | { apiVersion: string; model: string } = null;

for (const apiVersion of API_VERSIONS) {
  for (const base of MODEL_BASE) {
    for (const prefix of ['', 'models/']) {
      const model = `${prefix}${base}`;
      const ai = new GoogleGenAI({ apiKey: key, apiVersion });
      process.stdout.write(`  api=${apiVersion.padEnd(7)} model=${model.padEnd(30)} → `);
      try {
        const t0 = Date.now();
        const r = await ai.models.generateContent({ model, contents: PROMPT });
        const text = (r.text ?? '').trim();
        console.log(`✅ OK (${Date.now() - t0}ms) "${text.slice(0, 80)}"`);
        workingConfig = { apiVersion, model };
        break;
      } catch (e: any) {
        const msg = e?.message ?? String(e);
        let code = '?'; let status = '?'; let inner = msg.slice(0, 120);
        try { const p = JSON.parse(msg); code = p?.error?.code; status = p?.error?.status; inner = (p?.error?.message ?? msg).slice(0, 120); } catch {}
        console.log(`❌ ${code} ${status.padEnd(12)} ${inner}`);
      }
    }
    if (workingConfig) break;
  }
  if (workingConfig) break;
}

console.log();
if (workingConfig) {
  console.log('✅ FIRST WORKING CONFIGURATION FOUND:');
  console.log(`   apiVersion = '${workingConfig.apiVersion}'`);
  console.log(`   model      = '${workingConfig.model}'`);
} else {
  console.log('⚠️  No working combination found. Check key validity.');
  console.log('   If key starts with "AQ." it is a GCP API Keys Manager key,');
  console.log('   which requires the Vertex AI endpoint or GOOGLE_CLOUD_* vars.');
  console.log('   AI Studio free-tier keys always start with "AIza..."');
}
