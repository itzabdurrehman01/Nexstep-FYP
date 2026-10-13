const dotenv = require('dotenv');
dotenv.config();

const k = (process.env.GEMINI_API_KEY || '').trim();
const models = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.6-flash',
  'gemini-3.7-flash',
  'gemini-3.8-flash',
  'gemini-flash-latest',
  'gemini-2.5-pro'
];

async function run() {
  console.log('Testing key length:', k.length);
  for (const m of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${k}`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: 'Hello, reply with OK' }] }] })
      });
      const data = await res.json();
      if (res.ok) {
        console.log(`✅ SUCCESS [${m}]:`, data.candidates?.[0]?.content?.parts?.[0]?.text?.trim());
      } else {
        console.log(`❌ FAILED [${m}]: HTTP ${res.status}`, data.error?.message || data.error?.status);
      }
    } catch (e) {
      console.log(`❌ ERROR [${m}]:`, e.message);
    }
  }
}

run();
