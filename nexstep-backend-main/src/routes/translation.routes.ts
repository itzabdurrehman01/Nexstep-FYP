/**
 * translation.routes.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * POST /api/translate          — batch translate (primary endpoint)
 * POST /api/translate/single   — single string translate (convenience)
 * GET  /api/translate/status   — health check: which backend is active
 *
 * Credentials never leave the server. The frontend only sends plain text.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { Router, Request, Response } from 'express';
import { batchTranslate, translateOne, translationStatus } from '../services/translation.service.js';

export const translationRouter = Router();

// Hard limits to prevent abuse and runaway costs
const MAX_TEXTS      = 200;       // max strings per batch request
const MAX_TEXT_CHARS = 5000;      // max chars per individual string
const MAX_TOTAL_CHARS = 100_000;  // max total chars per request

function sanitize(value: unknown): string {
  return typeof value === 'string' ? value.slice(0, MAX_TEXT_CHARS) : '';
}

// ── POST /api/translate ───────────────────────────────────────────────────────
translationRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { texts, text, sourceLanguage = 'en', targetLanguage = 'ur' } = req.body;

    // Accept either `text` (single) or `texts` (array)
    const inputs: string[] = Array.isArray(texts)
      ? texts.map(sanitize).filter(Boolean)
      : text ? [sanitize(text)]
      : [];

    if (!inputs.length) {
      return res.status(400).json({ error: '`texts` (array) or `text` (string) is required.' });
    }

    if (inputs.length > MAX_TEXTS) {
      return res.status(400).json({ error: `Maximum ${MAX_TEXTS} strings per request.` });
    }

    const totalChars = inputs.reduce((s, t) => s + t.length, 0);
    if (totalChars > MAX_TOTAL_CHARS) {
      return res.status(400).json({ error: `Total character limit of ${MAX_TOTAL_CHARS} exceeded.` });
    }

    const supportedLangs = new Set(['en', 'ur']);
    if (!supportedLangs.has(sourceLanguage) || !supportedLangs.has(targetLanguage)) {
      return res.status(400).json({ error: 'Only en ↔ ur is supported.' });
    }

    if (sourceLanguage === targetLanguage) {
      // No-op — return inputs unchanged
      const results = inputs.map(t => ({ source: t, translated: t, cached: true }));
      return res.json({ results, backend: 'passthrough' });
    }

    const results = await batchTranslate(inputs, sourceLanguage, targetLanguage);

    return res.json({
      results,
      backend: translationStatus.backend,
      count: results.length,
    });
  } catch (err: any) {
    console.error('[POST /api/translate] error:', err.message);
    return res.status(500).json({
      error: 'Translation failed.',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
});

// ── POST /api/translate/single ────────────────────────────────────────────────
translationRouter.post('/single', async (req: Request, res: Response) => {
  try {
    const { text, sourceLanguage = 'en', targetLanguage = 'ur' } = req.body;
    const cleaned = sanitize(text);
    if (!cleaned) return res.status(400).json({ error: '`text` string is required.' });
    const translated = await translateOne(cleaned, sourceLanguage, targetLanguage);
    return res.json({ source: cleaned, translated, sourceLanguage, targetLanguage });
  } catch (err: any) {
    return res.status(500).json({ error: 'Translation failed.', details: err.message });
  }
});

// ── GET /api/translate/status ─────────────────────────────────────────────────
translationRouter.get('/status', (_req: Request, res: Response) => {
  res.json({
    available: translationStatus.google || translationStatus.gemini,
    backend: translationStatus.backend,
    google: translationStatus.google,
    gemini: translationStatus.gemini,
    note: translationStatus.backend === 'none'
      ? 'Set GOOGLE_TRANSLATE_API_KEY or GEMINI_API_KEY in backend/.env to enable translation.'
      : null,
  });
});
