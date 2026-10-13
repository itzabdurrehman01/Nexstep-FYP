/**
 * DynamicTranslationContext.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Provides dynamic English → Urdu translation for API/database content that
 * is NOT covered by the static translations.js dictionary.
 *
 * Architecture:
 *   Component calls useTranslate() → hook batches strings → POST /api/translate
 *   → backend calls Google Cloud Translation / Gemini → result cached in memory
 *   → component re-renders with Urdu text
 *
 * Key properties:
 *   - Batched: strings are collected for 30ms then sent in one request
 *   - Cached: same string is never sent twice in a session
 *   - Non-blocking: English text shown immediately while translation loads
 *   - Graceful: if backend fails the English original is shown, no crash
 *   - RTL: automatic for Urdu
 * ─────────────────────────────────────────────────────────────────────────────
 */
import React, {
  createContext, useContext, useCallback, useRef, useState, useEffect,
} from 'react';
import { useLanguage } from './I18nContext.jsx';

// ── In-memory session cache: `"en|ur|Hello"` → `"ہیلو"` ─────────────────────
const SESSION_CACHE = new Map();

function cacheKey(text, src, tgt) {
  return `${src}|${tgt}|${text}`;
}

// ── Context ───────────────────────────────────────────────────────────────────
const DynamicTranslationContext = createContext({
  translateBatch: async (texts) => texts,
  translateText:  async (text)  => text,
  isTranslating:  false,
});

// ── Provider ──────────────────────────────────────────────────────────────────
export function DynamicTranslationProvider({ children }) {
  const { lang } = useLanguage();
  const [isTranslating, setIsTranslating] = useState(false);

  // Pending batch: resolved per-string via callbacks
  const pendingRef  = useRef(new Map()); // text → [resolve, reject][]
  const timerRef    = useRef(null);

  // Flush the pending batch to the backend
  const flush = useCallback(async (src, tgt) => {
    const pending = pendingRef.current;
    if (!pending.size) return;
    pendingRef.current = new Map();

    const texts = [...pending.keys()];

    // Split into cache hits and misses
    const hits   = [];
    const misses = [];
    for (const t of texts) {
      if (SESSION_CACHE.has(cacheKey(t, src, tgt))) hits.push(t);
      else misses.push(t);
    }

    // Resolve cache hits immediately
    for (const t of hits) {
      const translated = SESSION_CACHE.get(cacheKey(t, src, tgt));
      (pending.get(t) || []).forEach(([resolve]) => resolve(translated));
    }

    if (!misses.length) return;

    setIsTranslating(true);
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texts: misses, sourceLanguage: src, targetLanguage: tgt }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      for (const item of (data.results || [])) {
        const k = cacheKey(item.source, src, tgt);
        SESSION_CACHE.set(k, item.translated);
        (pending.get(item.source) || []).forEach(([resolve]) => resolve(item.translated));
      }

      // Any miss with no result — resolve with original
      for (const t of misses) {
        if (!SESSION_CACHE.has(cacheKey(t, src, tgt))) {
          SESSION_CACHE.set(cacheKey(t, src, tgt), t);
          (pending.get(t) || []).forEach(([resolve]) => resolve(t));
        }
      }
    } catch (err) {
      console.warn('[DynamicTranslation] batch failed:', err.message);
      // Graceful degradation — resolve with originals
      for (const t of misses) {
        SESSION_CACHE.set(cacheKey(t, src, tgt), t);
        (pending.get(t) || []).forEach(([resolve]) => resolve(t));
      }
    } finally {
      setIsTranslating(false);
    }
  }, []);

  // Schedule a batched flush 30ms after the last enqueue
  const scheduleFlush = useCallback((src, tgt) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => flush(src, tgt), 30);
  }, [flush]);

  // Enqueue one string; returns a Promise<string>
  const enqueue = useCallback((text, src, tgt) => {
    if (!text?.trim()) return Promise.resolve(text);
    // If already cached — resolve synchronously
    const k = cacheKey(text, src, tgt);
    if (SESSION_CACHE.has(k)) return Promise.resolve(SESSION_CACHE.get(k));

    return new Promise((resolve, reject) => {
      const current = pendingRef.current.get(text) || [];
      current.push([resolve, reject]);
      pendingRef.current.set(text, current);
      scheduleFlush(src, tgt);
    });
  }, [scheduleFlush]);

  // ── Public API ──────────────────────────────────────────────────────────────

  /** Translate a single string to the current language */
  const translateText = useCallback(async (text) => {
    if (!text?.trim() || lang === 'en') return text;
    return enqueue(text, 'en', lang);
  }, [lang, enqueue]);

  /** Translate an array of strings to the current language */
  const translateBatch = useCallback(async (texts) => {
    if (lang === 'en') return texts;
    return Promise.all(texts.map(t => enqueue(t, 'en', lang)));
  }, [lang, enqueue]);

  // Clear session cache when language switches to force re-translation
  useEffect(() => {
    // Keep 'en' values but drop any target-language entries so a fresh
    // translation request is made if we switch back to Urdu after English
    for (const k of SESSION_CACHE.keys()) {
      if (!k.startsWith('en|en|')) SESSION_CACHE.delete(k);
    }
  }, [lang]);

  return (
    <DynamicTranslationContext.Provider value={{ translateText, translateBatch, isTranslating }}>
      {children}
    </DynamicTranslationContext.Provider>
  );
}

// ── useTranslate hook ─────────────────────────────────────────────────────────
/**
 * Hook for translating dynamic content (API / database data).
 *
 * Usage — single string:
 *   const { t } = useTranslate();
 *   const title = await t('Software Engineer');
 *
 * Usage — batch (preferred for multiple strings):
 *   const { tb } = useTranslate();
 *   const [titleUr, descUr] = await tb(['Software Engineer', 'Design software']);
 *
 * Usage — auto-translate React state:
 *   const [careers, setCareers] = useState([]);
 *   const { translateField } = useTranslate();
 *   // translateField returns the Urdu value if lang=ur, original otherwise
 *   careers.map(c => ({ ...c, title: translateField(c.id + '.title', c.title) }))
 */
export function useTranslate() {
  const { translateText, translateBatch, isTranslating } = useContext(DynamicTranslationContext);
  const { lang } = useLanguage();

  return {
    /** Translate a single string; returns a Promise */
    t: translateText,
    /** Translate an array of strings; returns a Promise */
    tb: translateBatch,
    /** Whether a batch request is in-flight */
    isTranslating,
    /** Current language code */
    lang,
    /** True when Urdu mode is active */
    isUrdu: lang === 'ur',
  };
}

// ── useAutoTranslate hook ────────────────────────────────────────────────────
/**
 * Automatically translates an array of objects whenever the language changes.
 *
 * @param items Source array (English)
 * @param fields Fields to translate on each item, e.g. ['title','description']
 * @param getKey Optional: returns a stable cache key for the item (default: item.id)
 *
 * Returns: { translated, isLoading }
 *
 * Example:
 *   const { translated } = useAutoTranslate(careers, ['title', 'description']);
 *   // translated[0].title is Urdu when lang=ur, English when lang=en
 */
export function useAutoTranslate(items, fields, getKey) {
  const { translateBatch, lang } = useContext(DynamicTranslationContext);
  const [translated, setTranslated] = useState(items);
  const [isLoading,  setIsLoading]  = useState(false);
  const prevLang = useRef(lang);

  // Callers usually pass `fields` as an inline array literal, so depend on its
  // contents rather than its identity to avoid re-running every render.
  const fieldsKey = Array.isArray(fields) ? fields.join('|') : '';

  useEffect(() => {
    // English renders `items` directly (see return below) — no state update needed.
    if (lang === 'en') return;
    if (!items?.length || !fields?.length) { setTranslated(items); return; }
    if (prevLang.current === lang && translated.length === items.length) return;

    let cancelled = false;
    setIsLoading(true);

    (async () => {
      try {
        // Collect all strings to translate in one batch
        const allTexts = [];
        for (const item of items) {
          for (const field of fields) {
            const val = item[field];
            if (typeof val === 'string' && val.trim()) allTexts.push(val);
          }
        }

        const results = await translateBatch([...new Set(allTexts)]);

        // Build a map: original → translated
        const map = new Map();
        const unique = [...new Set(allTexts)];
        unique.forEach((orig, idx) => map.set(orig, results[idx] ?? orig));

        if (!cancelled) {
          setTranslated(
            items.map(item => {
              const copy = { ...item };
              for (const field of fields) {
                if (typeof item[field] === 'string') {
                  copy[field] = map.get(item[field]) ?? item[field];
                }
              }
              return copy;
            })
          );
          prevLang.current = lang;
        }
      } catch {
        if (!cancelled) setTranslated(items);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [items, lang, fieldsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return { translated: lang === 'en' ? items : translated, isLoading };
}

export default DynamicTranslationContext;
