import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
dotenv.config();

const key = process.env.GEMINI_API_KEY ?? '';
const ai = new GoogleGenAI({ apiKey: key });

console.log('\n── End-to-End Gemini Proof ──────────────────');
console.log('Model: models/gemini-3.8-flash\n');

const q1 = 'In 2-3 bullet points, what is MDCAT and who needs to take it in Pakistan?';
const q2 = 'What are the top 3 IT careers in Pakistan in 2026 with salary ranges in PKR?';

for (const [n, q] of [[1, q1], [2, q2]] as [number, string][]) {
  console.log(`Q${n}: ${q}`);
  try {
    const r = await ai.models.generateContent({ model: 'models/gemini-3.8-flash', contents: q });
    console.log(`A${n}: ${r.text?.trim()}\n`);
  } catch (e: any) {
    console.error(`FAILED: ${e.message?.slice(0, 200)}`);
    process.exit(1);
  }
}
console.log('✅ Gemini is live and answering real questions.\n');
