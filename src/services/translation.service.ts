/**
 * translation.service.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Translates English text into Urdu (or any supported language pair) using:
 *
 *   1. PostgreSQL cache — checked first (free, instant)
 *   2. Google Cloud Translation API — if key is configured
 *   3. Gemini AI fallback — if Google key is absent but Gemini key is present
 *
 * Architecture:
 *   Frontend → POST /api/translate → this service → Cache / Google / Gemini
 *
 * The frontend NEVER holds any API key. Credentials stay server-side only.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { pool } from '../routes/db.js';
import { GoogleGenAI } from '@google/genai';

const GOOGLE_TRANSLATE_KEY = process.env.GOOGLE_TRANSLATE_API_KEY?.trim() || '';
const GEMINI_KEY           = process.env.GEMINI_API_KEY?.trim() || '';

const GOOGLE_ENABLED = Boolean(GOOGLE_TRANSLATE_KEY && !GOOGLE_TRANSLATE_KEY.startsWith('PASTE_'));
const GEMINI_ENABLED = Boolean(GEMINI_KEY);

const geminiAi = GEMINI_ENABLED ? new GoogleGenAI({ apiKey: GEMINI_KEY }) : null;

// ── DB helpers ────────────────────────────────────────────────────────────────

async function getCached(texts: string[], src: string, tgt: string): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (!texts.length) return map;
  try {
    const { rows } = await pool.query(
      `SELECT source_text, translated_text
         FROM translation_cache
        WHERE source_language = $1
          AND target_language = $2
          AND source_text = ANY($3::text[])`,
      [src, tgt, texts]
    );
    for (const row of rows) map.set(row.source_text, row.translated_text);
  } catch { /* DB unavailable — treat as cache miss */ }
  return map;
}

async function saveCache(pairs: Array<{ source: string; translated: string }>, src: string, tgt: string) {
  if (!pairs.length) return;
  try {
    const vals = pairs.map((_, i) => `($${i * 4 + 1}, $${i * 4 + 2}, $${i * 4 + 3}, $${i * 4 + 4})`).join(', ');
    const args: (string | number)[] = [];
    for (const p of pairs) args.push(p.source, src, tgt, p.translated, p.source.length);
    // Rebuild with correct count (5 params per row)
    const vals2 = pairs.map((_, i) => `($${i * 5 + 1}, $${i * 5 + 2}, $${i * 5 + 3}, $${i * 5 + 4}, $${i * 5 + 5})`).join(', ');
    const args2: (string | number)[] = [];
    for (const p of pairs) args2.push(p.source, src, tgt, p.translated, p.source.length);
    await pool.query(
      `INSERT INTO translation_cache (source_text, source_language, target_language, translated_text, char_count)
       VALUES ${vals2}
       ON CONFLICT (source_text, source_language, target_language)
       DO UPDATE SET translated_text = EXCLUDED.translated_text, updated_at = NOW()`,
      args2
    );
  } catch { /* non-fatal */ }
}

// ── Google Cloud Translation ──────────────────────────────────────────────────

async function googleTranslateBatch(texts: string[], tgt: string): Promise<string[]> {
  // Cloud Translation v2 REST API — no npm package needed
  const url = `https://translation.googleapis.com/language/translate/v2?key=${GOOGLE_TRANSLATE_KEY}`;
  const body = { q: texts, target: tgt, source: 'en', format: 'text' };
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google Translate API error ${res.status}: ${err.slice(0, 200)}`);
  }
  const data = (await res.json()) as { data: { translations: Array<{ translatedText: string }> } };
  return data.data.translations.map(t => t.translatedText);
}

// ── Gemini fallback (batch) ───────────────────────────────────────────────────

async function geminiBatchTranslate(texts: string[], tgt: string): Promise<string[]> {
  if (!geminiAi) throw new Error('No translation backend configured.');
  const langName = tgt === 'ur' ? 'Urdu (اردو)' : tgt;
  const numbered = texts.map((t, i) => `${i + 1}. ${t}`).join('\n');
  const prompt = `Translate the following numbered items from English to ${langName}.
Return ONLY a JSON array of translated strings in the same order, no extra text.
Do NOT translate proper nouns (NUST, FAST, MDCAT, ECAT, HEC, PEEF, TEVTA, NexStep).

${numbered}`;

  const TRANSLATE_MODELS = [
    (process.env.GEMINI_MODEL ?? '').trim(),
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-flash-latest',
    'gemini-3.8-flash',
  ].filter((m, i, all) => m && all.indexOf(m) === i);

  let lastErr: unknown;
  for (const model of TRANSLATE_MODELS) {
    try {
      const r = await geminiAi.models.generateContent({ model, contents: prompt });
      const raw = (r.text || '').trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed) || parsed.length !== texts.length) {
        throw new Error('Gemini returned unexpected batch translation format.');
      }
      return parsed as string[];
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('Gemini translation failed.');
}

// ── Public API ────────────────────────────────────────────────────────────────

export interface TranslationResult {
  source: string;
  translated: string;
  cached: boolean;
}

/**
 * Translate an array of texts from `src` to `tgt`.
 * Hits the cache first; only calls the external API for cache misses.
 * Saves new results to the cache.
 */
export async function batchTranslate(
  texts: string[],
  src = 'en',
  tgt = 'ur',
): Promise<TranslationResult[]> {
  // Deduplicate, preserve order
  const unique = [...new Set(texts.map(t => t.trim()).filter(Boolean))];
  if (!unique.length) return [];

  // 1. Cache lookup
  const cached = await getCached(unique, src, tgt);
  const misses  = unique.filter(t => !cached.has(t));

  const toSave: Array<{ source: string; translated: string }> = [];

  // 2. Translate misses via API
  if (misses.length > 0) {
    let translated: string[] = [];
    try {
      if (GOOGLE_ENABLED) {
        // Google supports up to 128 strings per request — chunk if needed
        const CHUNK = 128;
        for (let i = 0; i < misses.length; i += CHUNK) {
          const chunk = misses.slice(i, i + CHUNK);
          const results = await googleTranslateBatch(chunk, tgt);
          translated.push(...results);
        }
        console.log(`[translate] Google: translated ${misses.length} strings`);
      } else if (GEMINI_ENABLED) {
        // Gemini handles smaller batches better — chunk at 40
        const CHUNK = 40;
        for (let i = 0; i < misses.length; i += CHUNK) {
          const chunk = misses.slice(i, i + CHUNK);
          const results = await geminiBatchTranslate(chunk, tgt);
          translated.push(...results);
        }
        console.log(`[translate] Gemini: translated ${misses.length} strings`);
      } else {
        // No backend configured — return originals
        translated = [...misses];
        console.warn('[translate] No translation backend configured. Returning originals.');
      }
    } catch (err: any) {
      console.error('[translate] API error:', err.message);
      // Graceful degradation — return originals for misses
      translated = [...misses];
    }

    // Map results back
    misses.forEach((source, idx) => {
      const translatedText = translated[idx] ?? source;
      cached.set(source, translatedText);
      toSave.push({ source, translated: translatedText });
    });

    // 3. Persist to cache (fire-and-forget)
    if (toSave.length) saveCache(toSave, src, tgt).catch(() => {});
  }

  // Build result in original input order
  return texts
    .map(t => t.trim())
    .filter(Boolean)
    .map(source => ({
      source,
      translated: cached.get(source) ?? source,
      cached: !toSave.some(p => p.source === source),
    }));
}

/**
 * Translate a single string. Convenience wrapper around batchTranslate.
 */
export async function translateOne(text: string, src = 'en', tgt = 'ur'): Promise<string> {
  if (!text?.trim()) return text;
  const [result] = await batchTranslate([text], src, tgt);
  return result?.translated ?? text;
}

/** Returns true if at least one translation backend is available */
export function isTranslationAvailable(): boolean {
  return GOOGLE_ENABLED || GEMINI_ENABLED;
}

export const translationStatus = {
  google: GOOGLE_ENABLED,
  gemini: GEMINI_ENABLED,
  backend: GOOGLE_ENABLED ? 'google' : GEMINI_ENABLED ? 'gemini' : 'none',
};
