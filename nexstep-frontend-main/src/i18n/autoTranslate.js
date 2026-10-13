/**
 * autoTranslate.js — whole-page English → Urdu translation.
 *
 * When Urdu is selected, every visible English text on the page (and the
 * placeholder / title / aria-label of controls) is replaced with Urdu:
 *   1. built-in dictionaries (translations.js + URDU_DICT) — instant
 *   2. this browser's cache (localStorage) — instant
 *   3. POST /api/translate — batched; the server keeps a shared database cache,
 *      so each string is only translated once for everybody.
 * Switching back to English restores the original text exactly.
 *
 * ur.json holds Urdu for the app's built-in interface text (generated once, edit freely).
 * Opt out for an element (and its children) with  data-no-translate  or  translate="no".
 * Clerk's sign-in widgets (cl-*) are skipped.
 */
import { translations } from '../data/translations.js';
import { URDU_DICT } from '../utils/translator.js';
import UR_UI from './ur.json';

const CACHE_KEY = 'ns_ur_cache_v1';
const ATTRS = ['placeholder', 'title', 'aria-label', 'alt'];
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'CODE', 'PRE', 'KBD', 'SAMP', 'TEXTAREA', 'svg', 'SVG', 'MATH']);
const URDU_RE = /[؀-ۿ]/;
const LATIN_WORD_RE = /[A-Za-z]{2,}/;
const SKIP_VALUE_RE = /^(https?:\/\/|www\.|[\w.+-]+@[\w-]+\.[\w.]+$)/i;

// ── Dictionary: English string → Urdu string ────────────────────────────────
const dictionary = new Map();
function flatten(en, ur) {
  if (typeof en === 'string' && typeof ur === 'string') {
    if (en.trim() && ur.trim() && en !== ur) dictionary.set(en.trim(), ur.trim());
    return;
  }
  if (en && ur && typeof en === 'object' && typeof ur === 'object') {
    for (const key of Object.keys(en)) flatten(en[key], ur[key]);
  }
}
try { flatten(translations.en, translations.ur); } catch { /* ignore */ }
for (const [en, ur] of Object.entries(UR_UI)) dictionary.set(en, ur);
for (const [en, ur] of Object.entries(URDU_DICT)) if (typeof ur === 'string') dictionary.set(en, ur);

let cache = {};
try { cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}') || {}; } catch { cache = {}; }
let saveTimer = null;
function persistCache() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      const keys = Object.keys(cache);
      if (keys.length > 6000) for (const k of keys.slice(0, keys.length - 6000)) delete cache[k];
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch { /* storage full or blocked */ }
  }, 800);
}

const lookup = (text) => dictionary.get(text) ?? cache[text];

// ── State ────────────────────────────────────────────────────────────────────
const textState = new WeakMap();        // Text node → { orig, applied }
const attrState = new WeakMap();        // Element → { [attr]: { orig, applied } }
const touchedText = new Set();          // nodes we changed (for restoring)
const touchedAttr = new Set();
const waiting = new Map();              // english → Set<() => void>
const inFlight = new Set();
const unavailable = new Set();         // server had no translation this session (AI offline)
let queue = new Set();
let flushTimer = null;
let observer = null;
let active = false;
let failures = 0;

function skipElement(el) {
  for (let e = el; e && e !== document.body; e = e.parentElement) {
    if (SKIP_TAGS.has(e.tagName)) return true;
    if (e.isContentEditable) return true;
    if (e.hasAttribute?.('data-no-translate') || e.getAttribute?.('translate') === 'no') return true;
    const cls = typeof e.className === 'string' ? e.className : '';
    if (cls.includes('cl-')) return true;
  }
  return false;
}

function translatable(raw) {
  const text = raw.replace(/\s+/g, ' ').trim();
  if (!text || text.length > 1000) return null;
  if (URDU_RE.test(text) || !LATIN_WORD_RE.test(text) || SKIP_VALUE_RE.test(text)) return null;
  return text;
}

function whenReady(text, apply) {
  const ur = lookup(text);
  if (ur) { apply(ur); return; }
  if (!waiting.has(text)) waiting.set(text, new Set());
  waiting.get(text).add(apply);
  if (!inFlight.has(text) && !unavailable.has(text)) { queue.add(text); scheduleFlush(); }
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(flush, 150);
}

async function flush() {
  flushTimer = null;
  if (!active || !queue.size) return;
  const batch = [...queue].slice(0, 100);
  batch.forEach((t) => { queue.delete(t); inFlight.add(t); });
  if (queue.size) scheduleFlush();
  try {
    const res = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texts: batch, targetLang: 'ur' }),
    });
    if (!res.ok) throw new Error(String(res.status));
    const data = await res.json();
    const out = Array.isArray(data.translatedTexts) ? data.translatedTexts : [];
    batch.forEach((en, i) => {
      const ur = out[i];
      if (typeof ur === 'string' && ur.trim() && ur !== en) {
        cache[en] = ur;
        (waiting.get(en) || []).forEach((fn) => fn(ur));
        waiting.delete(en);
      } else if (data.partial) {
        unavailable.add(en);
      }
    });
    failures = 0;
    persistCache();
  } catch {
    failures += 1;
    // Back off and retry later (e.g. rate limit); after a few failures stay in English.
    if (failures < 4) batch.forEach((t) => queue.add(t));
    setTimeout(scheduleFlush, 1500 * failures);
  } finally {
    batch.forEach((t) => inFlight.delete(t));
  }
}

// ── Applying ─────────────────────────────────────────────────────────────────
function handleTextNode(node) {
  if (!node.parentElement || skipElement(node.parentElement)) return;
  const value = node.nodeValue || '';
  const st = textState.get(node);
  if (st && value === st.applied) return;           // our own change
  const text = translatable(value);
  if (!text) return;
  const lead = value.match(/^\s*/)[0];
  const trail = value.match(/\s*$/)[0];
  textState.set(node, { orig: value, applied: null });
  whenReady(text, (ur) => {
    if (!active || !node.isConnected) return;
    const s = textState.get(node);
    if (!s || node.nodeValue !== s.orig) return;      // React changed it meanwhile
    const applied = lead + ur + trail;
    s.applied = applied;
    node.nodeValue = applied;
    touchedText.add(node);
  });
}

function handleAttrs(el) {
  if (skipElement(el)) return;
  for (const attr of ATTRS) {
    if (!el.hasAttribute(attr)) continue;
    const value = el.getAttribute(attr) || '';
    const all = attrState.get(el) || {};
    const st = all[attr];
    if (st && value === st.applied) continue;
    const text = translatable(value);
    if (!text) continue;
    all[attr] = { orig: value, applied: null };
    attrState.set(el, all);
    whenReady(text, (ur) => {
      if (!active || !el.isConnected) return;
      const s = (attrState.get(el) || {})[attr];
      if (!s || el.getAttribute(attr) !== s.orig) return;
      s.applied = ur;
      el.setAttribute(attr, ur);
      touchedAttr.add(el);
    });
  }
}

function scan(root) {
  if (!root) return;
  if (root.nodeType === Node.TEXT_NODE) { handleTextNode(root); return; }
  if (root.nodeType !== Node.ELEMENT_NODE) return;
  if (skipElement(root)) return;
  handleAttrs(root);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
    acceptNode: (n) => {
      if (n.nodeType === Node.ELEMENT_NODE) {
        if (SKIP_TAGS.has(n.tagName) || n.hasAttribute('data-no-translate') || n.getAttribute('translate') === 'no') return NodeFilter.FILTER_REJECT;
        const cls = typeof n.className === 'string' ? n.className : '';
        if (cls.includes('cl-')) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  let n = walker.nextNode();
  while (n) {
    if (n.nodeType === Node.TEXT_NODE) handleTextNode(n);
    else handleAttrs(n);
    n = walker.nextNode();
  }
}

let pending = new Set();
let rafId = null;
function onMutations(list) {
  for (const m of list) {
    if (m.type === 'characterData') pending.add(m.target);
    else if (m.type === 'attributes') pending.add(m.target);
    else m.addedNodes.forEach((n) => pending.add(n));
  }
  if (!rafId) {
    // setTimeout (not requestAnimationFrame) so it also runs in background tabs.
    rafId = setTimeout(() => {
      rafId = null;
      const nodes = pending; pending = new Set();
      nodes.forEach((n) => { if (n.isConnected) scan(n); });
    }, 30);
  }
}

/** Turn whole-page Urdu on or off. */
export function setAutoTranslate(on) {
  if (on === active) return;
  active = on;
  if (on) {
    scan(document.body);
    observer = new MutationObserver(onMutations);
    observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
    return;
  }
  observer?.disconnect();
  observer = null;
  queue = new Set();
  waiting.clear();
  touchedText.forEach((node) => {
    const s = textState.get(node);
    if (s && node.isConnected && node.nodeValue === s.applied) node.nodeValue = s.orig;
    textState.delete(node);
  });
  touchedAttr.forEach((el) => {
    const all = attrState.get(el) || {};
    for (const [attr, s] of Object.entries(all)) if (el.isConnected && el.getAttribute(attr) === s.applied) el.setAttribute(attr, s.orig);
    attrState.delete(el);
  });
  touchedText.clear();
  touchedAttr.clear();
}
