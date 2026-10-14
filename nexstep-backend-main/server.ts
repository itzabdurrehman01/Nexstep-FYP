import './src/preloadEnv.js';
import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import cookieParser from 'cookie-parser';
import { clerkMiddleware } from '@clerk/express';
import rateLimit from 'express-rate-limit';
import { GoogleGenAI } from '@google/genai';

import { UNIVERSITIES_DATA }                   from './src/data/universitiesData.js';
import { SCHOLARSHIPS_DATA }                   from './src/data/scholarshipsData.js';
import { CAREERS_DATA }                        from './src/data/careersData.js';
import { ENTRY_TESTS_DATA }                    from './src/data/entryTestsData.js';
import { TEVTA_COURSES, FREE_IT_COURSES }      from './src/data/tevtaAndItData.js';
import { TRANSNATIONAL_PATHWAYS }              from './src/data/transnationalData.js';
import { COURSES_DATA, JOBS_INTERNSHIPS_DATA } from './src/data/mockFullAppData.js';
import { personalRiasecQuestions } from './src/data/quizPersonalize.js';
import { CAREERS_EXPANDED } from './src/data/realData/careers.js';
import { CAREER_KNOWLEDGE_BASE } from './src/data/careerKnowledgeBase.js';
import { COURSES_REAL } from './src/data/realData/courses.js';
import { SCHOLARSHIPS_ADDITIONAL } from './src/data/realData/scholarships.js';

import { authRouter }          from './src/routes/auth.routes.js';
import { userRouter, ensureProfileExtras } from './src/routes/user.routes.js';
import { roadmapRouter }       from './src/routes/roadmap.routes.js';
import { interviewsRouter }    from './src/routes/interviews.routes.js';
import { conversationsRouter } from './src/routes/conversations.routes.js';
import { mentorRouter }        from './src/routes/mentor.routes.js';
import { adminRouter }         from './src/routes/admin.routes.js';
import { adminAuthRouter, requireAdmin, ensureAdminSchema } from './src/routes/adminPortal.routes.js';
import { paymentsRouter }      from './src/routes/payments.routes.js';
import { publicDataRouter }    from './src/routes/publicData.routes.js';
import { usageRouter }         from './src/routes/usage.routes.js';
import { feedbackRouter }      from './src/routes/feedback.routes.js';
import { entryTestsRouter }    from './src/routes/entryTests.routes.js';
import { translationRouter }   from './src/routes/translation.routes.js';
import { requireAuth, requirePlan, requireRole, optionalAuth } from './src/routes/auth.middleware.js';
import { educationRouter, ensureEducationSchema, requestLevel, levelClause } from './src/routes/education.routes.js';
import { mentorshipRouter, ensureMentorshipSchema } from './src/routes/mentorship.routes.js';
import { alertsRouter, ensureAlertsSchema, startAlertScheduler } from './src/routes/alerts.routes.js';
import { careerAiRouter, ensureCareerAiSchema, careerToApi } from './src/routes/careerAi.routes.js';
import { manualPaymentsRouter, ensureManualPaymentsSchema } from './src/routes/manualPayments.routes.js';
import { ensureSampleData, ensureSampleSchema } from './src/services/sampleData.service.js';
import { mockInterviewRouter, ensureMockInterviewSchema } from './src/routes/mockInterview.routes.js';
import { pool, query, queryOne } from './src/routes/db.js';
import { startBackgroundScheduler } from './src/services/scheduler.js';
import { generateCounselingResponse } from './src/services/aiCounselorEngine.js';

dotenv.config();

// ── Schema Bootstrap (ensure user_otps + social cols always exist on startup)
//    Creates any missing OTPS/social tables/columns idempotently, so password
//    login + OTP flow can never fail because of a forgotten `npm run migrate`.
// #region debug-point dp-schema-bootstrap
async function ensureSchemaBootstrap() {
  try {
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider    VARCHAR(50)   DEFAULT 'LOCAL';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS provider_id      VARCHAR(255);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url       TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS phone            VARCHAR(50);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS is_phone_verified BOOLEAN       DEFAULT FALSE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS clerk_user_id    VARCHAR(64);
      CREATE UNIQUE INDEX IF NOT EXISTS users_clerk_user_id_key ON users(clerk_user_id);
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_otps (
        id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email              VARCHAR(255) NOT NULL,
        phone              VARCHAR(50),
        otp_code           VARCHAR(10)  NOT NULL,
        purpose            VARCHAR(50)  NOT NULL DEFAULT 'REGISTER',
        attempts           INT          NOT NULL DEFAULT 0,
        is_verified        BOOLEAN      NOT NULL DEFAULT FALSE,
        verification_token VARCHAR(255),
        expires_at         TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at         TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);
    try {
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_user_otps_email_purpose ON user_otps(email, purpose);`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_user_otps_token         ON user_otps(verification_token);`);
    } catch { /* ignore index race */ }
    await ensureProfileExtras().catch(() => {});
    console.log('[BOOTSTRAP] Schema OK: users.social_cols + user_otps table exist.');
  } catch (err: any) {
    console.warn('[BOOTSTRAP] Schema bootstrap note (OK if DB not ready yet):', err.message?.slice(0, 200));
  }
}
ensureSchemaBootstrap();
ensureSampleData().catch((err) => console.warn('[BOOTSTRAP] Sample data note:', err?.message?.slice(0, 200)));
ensureCareerAiSchema().catch((err) => console.warn('[BOOTSTRAP] Career AI schema note:', err?.message?.slice(0, 200)));
ensureManualPaymentsSchema().catch((err) => console.warn('[BOOTSTRAP] Payments schema note:', err?.message?.slice(0, 200)));
ensureAlertsSchema().then(() => startAlertScheduler()).catch((err) => console.warn('[BOOTSTRAP] Alerts schema note:', err?.message?.slice(0, 200)));
ensureMentorshipSchema().then(() => ensureMockInterviewSchema()).catch((err) => console.warn('[BOOTSTRAP] Mock interview schema note:', err?.message?.slice(0, 200)));
ensureMentorshipSchema().catch((err) => console.warn('[BOOTSTRAP] Mentorship schema note:', err?.message?.slice(0, 200)));
ensureEducationSchema().catch((err) => console.warn('[BOOTSTRAP] Education schema note:', err?.message?.slice(0, 200)));
ensureAdminSchema().catch((err) => console.warn('[BOOTSTRAP] Admin schema note:', err?.message?.slice(0, 200)));
// #endregion

// `process.cwd()` is stable for both the TypeScript development server and
// the bundled CommonJS production server. `import.meta.url` is not available
// after the CommonJS bundle is produced.
const __dirname = process.cwd();

const app  = express();
// Keep the backend fallback aligned with the frontend proxy and Expo client.
const PORT = Number(process.env.PORT) || 3001;

// Do not disclose the underlying framework, and apply a conservative baseline
// of browser protections to every API and combined-production response.
app.disable('x-powered-by');
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), geolocation=(), microphone=()');

  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'; img-src 'self' data: blob: https:; font-src 'self' data: https://fonts.gstatic.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; script-src 'self'; connect-src 'self' https: wss:"
    );
  }
  next();
});

const GEMINI_API_KEY = (process.env.GEMINI_API_KEY ?? '').trim();
const _GEMINI_KEY_PREFIX_4 = GEMINI_API_KEY.slice(0, 4);
const _IS_GCP_KEY = _GEMINI_KEY_PREFIX_4 === 'AQ.A' || _GEMINI_KEY_PREFIX_4 === 'AQ.B' || GEMINI_API_KEY.startsWith('AQ.');
// Tiered per-key defaults verified against Google's live endpoint:
//   AI Studio keys (AIzaSy...) → guide default: gemini-1.5-flash + v1 (stable GA, documented free tier)
//   GCP API Keys Manager (AQ...) → gateway exposes ONLY gemini-3.8-flash + v1alpha (all older models 404)
const _DEFAULT_MODEL_BY_KEY = _IS_GCP_KEY
  ? { model: 'gemini-3.8-flash', apiVersion: 'v1alpha' as const }
  : { model: 'gemini-1.5-flash', apiVersion: 'v1'      as const };
const GEMINI_MODEL =
  (process.env.GEMINI_MODEL ?? '').trim() ||
  _DEFAULT_MODEL_BY_KEY.model;
const GEMINI_API_VERSION =
  ((process.env.GEMINI_API_VERSION ?? '').trim() as 'v1' | 'v1beta' | 'v1alpha' | '') ||
  _DEFAULT_MODEL_BY_KEY.apiVersion;
const _GEMINI_KEY_PRESENT = Boolean(GEMINI_API_KEY);

// `GEMINI_ENABLED` is re-evaluated every read so a boot-time smoke-test
// failure (permanent 503/404 from wrong model+apiVersion+key combo)
// silently disables live-Gemini mode for the rest of the process lifetime,
// instead of hammering retries and falling through to the KB answer on
// every chat request (which would incorrectly surface the "model offline"
// indicator in the frontend even though the fallback itself is fine).
Object.defineProperty(globalThis, '__NEXSTEP_GEMINI_ENABLED_RUNTIME', {
  value: { enabled: _GEMINI_KEY_PRESENT },
  writable: true,
  configurable: true,
});
const GEMINI_ENABLED = {
  get value() {
    return Boolean((globalThis as any).__NEXSTEP_GEMINI_ENABLED_RUNTIME?.enabled);
  },
  set value(v: boolean) {
    if ((globalThis as any).__NEXSTEP_GEMINI_ENABLED_RUNTIME) {
      (globalThis as any).__NEXSTEP_GEMINI_ENABLED_RUNTIME.enabled = Boolean(v);
    }
  },
  [Symbol.toPrimitive]() {
    return this.value;
  },
  valueOf() {
    return this.value;
  },
} as unknown as boolean;
// Guard direct checks like `if (!GEMINI_ENABLED)` by coercing through the getter.
// `GEMINI_ENABLED as unknown as { value: boolean }` is used inside generateGeminiContent.
type _GemEnabled = { value: boolean; valueOf(): boolean; [Symbol.toPrimitive](): boolean };

const AI_UNAVAILABLE = {
  error:   'AI features are currently unavailable.',
  code:    'AI_UNAVAILABLE',
  message: 'Configure GEMINI_API_KEY in backend/.env to enable AI features.',
};

// ── Gemini connection (auto-detected) ─────────────────────────────────────────
// Two kinds of Google keys exist:
//   • AI Studio keys ("AIza…")            → Gemini API (generativelanguage.googleapis.com)
//   • Vertex AI express-mode keys ("AQ.…") → Vertex AI (aiplatform.googleapis.com)
// At start-up (and again later if it fails) we try each connection mode with a list
// of current models and keep the first one that answers. GEMINI_MODEL in .env is
// tried first when set. The result is visible at GET /api/ai/status.
type AiMode = 'gemini-api' | 'vertex-express';
interface AiCombo { mode: AiMode; model: string }
const AI_STATUS: { state: 'no-key' | 'checking' | 'live' | 'limited' | 'offline'; mode?: AiMode; model?: string; error?: string; checkedAt?: string } =
  { state: _GEMINI_KEY_PRESENT ? 'checking' : 'no-key' };
const AI_MODELS = ['gemini-3.8-flash', 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-flash-latest'];
const AI_FALLBACK_MODELS = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-flash-latest'];
const AI_REPROBE_MS = 5 * 60 * 1000;
const _aiClients: Partial<Record<AiMode, GoogleGenAI>> = {};
let activeAiCombo: AiCombo | null = null;
let aiProbe: Promise<boolean> | null = null;
let aiLastProbeAt = 0;

function aiClient(mode: AiMode): GoogleGenAI {
  if (!_aiClients[mode]) {
    // AQ. GCP keys only answer on v1alpha + gemini-3.8-flash. Do not omit apiVersion
    // just because GEMINI_API_VERSION is unset in .env — use the computed default.
    _aiClients[mode] = mode === 'vertex-express'
      ? new GoogleGenAI({ vertexai: true, apiKey: GEMINI_API_KEY, apiVersion: GEMINI_API_VERSION, httpOptions: { headers: { 'User-Agent': 'nexstep-backend' } } })
      : new GoogleGenAI({
          apiKey: GEMINI_API_KEY,
          apiVersion: GEMINI_API_VERSION,
          httpOptions: { headers: { 'User-Agent': 'nexstep-backend' } },
        });
  }
  return _aiClients[mode]!;
}

/** Models this key can use for generateContent (Gemini API only), newest "flash" first. */
async function discoverAiModels(): Promise<string[]> {
  try {
    const pager: any = await aiClient('gemini-api').models.list({ config: { pageSize: 100 } });
    const names: string[] = [];
    for await (const m of pager) {
      const actions: string[] = m?.supportedActions || m?.supportedGenerationMethods || [];
      const name = String(m?.name || '').replace(/^models\//, '');
      if (!name || !/gemini/i.test(name) || /embedding|image|tts|audio|live|vision-only/i.test(name)) continue;
      if (actions.length && !actions.includes('generateContent')) continue;
      names.push(name);
      if (names.length > 60) break;
    }
    const ver = (n: string) => parseFloat((n.match(/gemini-(\d+(?:\.\d+)?)/) || [])[1] || '0');
    return names
      .filter((n) => /flash/i.test(n) && !/preview|exp|thinking/i.test(n))
      .sort((x, y) => ver(y) - ver(x) || x.length - y.length)
      .slice(0, 4);
  } catch (e: any) {
    console.warn(`  [AI] Could not list models: ${safeAiError(e).slice(0, 160)}`);
    return [];
  }
}

async function aiCandidates(hints: string[] = []): Promise<AiCombo[]> {
  const envModel = (process.env.GEMINI_MODEL ?? '').trim() || GEMINI_MODEL;
  const discovered = _IS_GCP_KEY ? [] : await discoverAiModels();
  // AQ. keys: gemini-api + v1alpha. Vertex express 404s for these models, so skip it.
  const models = _IS_GCP_KEY
    ? [...new Set([envModel, 'gemini-3.8-flash', 'gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-flash-latest', ...hints].filter(Boolean))]
    : [...new Set([envModel, ...hints, ...discovered, ...AI_MODELS, ...AI_FALLBACK_MODELS].filter(Boolean))];
  const modes: AiMode[] = _IS_GCP_KEY ? ['gemini-api'] : ['gemini-api', 'vertex-express'];
  return modes.flatMap((mode) => models.map((model) => ({ mode, model })));
}

/** Error text without the API key in it. */
function safeAiError(e: any): string {
  let s = String(e?.message ?? e ?? '');
  if (GEMINI_API_KEY) s = s.split(GEMINI_API_KEY).join('[key]');
  return s.replace(/AIza[0-9A-Za-z_-]{20,}|AQ\.[0-9A-Za-z_.-]{20,}/g, '[key]').replace(/\s+/g, ' ').slice(0, 300);
}

async function callAiModel(combo: AiCombo, prompt: string): Promise<string> {
  const r = await aiClient(combo.mode).models.generateContent({ model: combo.model, contents: prompt });
  const candidate = (r as any)?.candidates?.[0];
  if ((candidate?.finishReason ?? '') === 'SAFETY') {
    throw Object.assign(new Error('SAFETY_BLOCKED'), { code: 'SAFETY_BLOCKED' });
  }
  let text = '';
  try { text = (r as any).text ?? ''; } catch {
    text = (candidate?.content?.parts ?? []).map((p: any) => p.text ?? '').join(' ');
  }
  return text;
}

const isQuotaError = (msg: string) => /\b429\b|quota|resource_exhausted|rate limit/i.test(msg);
const isPermanentAiError = (msg: string) =>
  /\b40[134]\b|permission_denied|api_key_invalid|api key not valid|denied access|not found|no longer available|does not have access|unauthenticated|billing/i.test(msg);
const isBusyAiError = (msg: string) =>
  /\b503\b|high demand|overloaded|unavailable/i.test(msg) && !isPermanentAiError(msg);

/** Finds a working connection mode + model. Returns true when AI is usable. */
function probeAi(force = false): Promise<boolean> {
  if (!_GEMINI_KEY_PRESENT) return Promise.resolve(false);
  if (aiProbe) return aiProbe;
  if (!force && activeAiCombo) return Promise.resolve(true);
  if (!force && Date.now() - aiLastProbeAt < AI_REPROBE_MS) return Promise.resolve(false);
  aiLastProbeAt = Date.now();
  aiProbe = (async () => {
    AI_STATUS.state = 'checking';
    const errors: string[] = [];
    const tried = new Set<string>();
    const busyTries = new Map<string, number>();
    let busyCombo: AiCombo | null = null;
    const queue = await aiCandidates();
    while (queue.length) {
      const combo = queue.shift()!;
      const key = `${combo.mode}/${combo.model}`;
      if (tried.has(key)) continue;
      try {
        const text = await callAiModel(combo, 'Reply with the single word OK.');
        if (text.trim()) {
          activeAiCombo = combo;
          Object.assign(AI_STATUS, { state: 'live', mode: combo.mode, model: combo.model, error: undefined, checkedAt: new Date().toISOString() });
          setGeminiEnabled(true);
          console.log(`  [AI] ✅ Gemini is live — ${combo.mode} / ${combo.model}`);
          return true;
        }
        tried.add(key);
        errors.push(`${combo.mode}/${combo.model}: empty reply`);
      } catch (e: any) {
        const msg = safeAiError(e);
        if (isQuotaError(msg)) {
          // The key and model work; the free-tier quota is used up for now.
          activeAiCombo = combo;
          Object.assign(AI_STATUS, { state: 'limited', mode: combo.mode, model: combo.model, error: `Quota exceeded: ${msg}`, checkedAt: new Date().toISOString() });
          setGeminiEnabled(true);
          setGemini429Cooldown(60);
          console.warn(`  [AI] 🟡 Gemini reachable (${combo.mode} / ${combo.model}) but the quota is exhausted.`);
          return true;
        }
        if (isBusyAiError(msg)) {
          const n = (busyTries.get(key) || 0) + 1;
          busyTries.set(key, n);
          if (n < 2) {
            await new Promise((r) => setTimeout(r, n * 1500));
            queue.unshift(combo);
            continue;
          }
          tried.add(key);
          busyCombo = busyCombo || combo;
          errors.push(`${combo.mode}/${combo.model}: ${msg}`);
          continue;
        }
        tried.add(key);
        errors.push(`${combo.mode}/${combo.model}: ${msg}`);
        const suggested = msg.match(/use models\/([a-z0-9.\-]+)/i)?.[1];
        if (suggested && !tried.has(`${combo.mode}/${suggested}`)) queue.unshift({ mode: combo.mode, model: suggested });
      }
    }
    if (busyCombo) {
      activeAiCombo = busyCombo;
      Object.assign(AI_STATUS, {
        state: 'limited',
        mode: busyCombo.mode,
        model: busyCombo.model,
        error: 'Gemini is busy (high demand). Retrying on the next request.',
        checkedAt: new Date().toISOString(),
      });
      setGeminiEnabled(true);
      console.warn(`  [AI] 🟡 Gemini is busy (503). Keeping ${busyCombo.mode}/${busyCombo.model} instead of going offline.`);
      return true;
    }
    activeAiCombo = null;
    const summary = errors.map((e) => e.slice(0, 220)).slice(0, 8).join(' | ');
    Object.assign(AI_STATUS, { state: 'offline', mode: undefined, model: undefined, error: summary, checkedAt: new Date().toISOString() });
    setGeminiEnabled(false);
    console.warn(`  [AI] 🔴 Gemini unavailable with this key. Tried: ${[...tried].join(', ')}`);
    console.warn(`       First errors: ${summary}`);
    return false;
  })().finally(() => { aiProbe = null; });
  return aiProbe;
}

async function generateGeminiContent(prompt: string): Promise<string> {
  if (!_GEMINI_KEY_PRESENT) throw Object.assign(new Error('AI_UNAVAILABLE'), { code: 'AI_UNAVAILABLE' });
  if (!activeAiCombo && !(await probeAi())) throw Object.assign(new Error('AI_UNAVAILABLE'), { code: 'AI_UNAVAILABLE' });

  const MAX_503_RETRIES = 3;
  let attempt = 0;
  let quotaRetried = false;
  let reprobed = false;
  while (true) {
    attempt += 1;
    const combo = activeAiCombo!;
    try {
      const text = await callAiModel(combo, prompt);
      if (AI_STATUS.state !== 'live') Object.assign(AI_STATUS, { state: 'live', error: undefined, checkedAt: new Date().toISOString() });
      return text;
    } catch (err: any) {
      if (err?.code === 'SAFETY_BLOCKED') throw err;
      const msg = safeAiError(err);
      if (isQuotaError(msg)) {
        Object.assign(AI_STATUS, { state: 'limited', error: `Quota exceeded: ${msg}`, checkedAt: new Date().toISOString() });
        const retryMatch = msg.match(/retry in ([\d.]+)s/i);
        const waitMs = retryMatch ? Math.max(2500, Math.min(20000, Math.ceil(parseFloat(retryMatch[1]) * 1000) + 1000)) : 8000;
        if (!quotaRetried && waitMs <= 20000) { quotaRetried = true; await new Promise((r) => setTimeout(r, waitMs)); continue; }
        setGemini429Cooldown(Math.ceil(waitMs / 1000) + 30);
        throw Object.assign(new Error(msg), { code: 'AI_QUOTA' });
      }
      if (/\b503\b|high demand|overloaded|unavailable/i.test(msg) && !isPermanentAiError(msg) && attempt <= MAX_503_RETRIES) {
        await new Promise((r) => setTimeout(r, attempt * 1500));
        continue;
      }
      if (isPermanentAiError(msg) && !reprobed) {
        // The model or mode stopped working: look for another one once, then retry.
        reprobed = true;
        activeAiCombo = null;
        console.warn(`  [AI] ${combo.mode}/${combo.model} failed (${msg.slice(0, 120)}). Re-checking…`);
        if (await probeAi(true)) continue;
      }
      throw Object.assign(new Error(msg), { code: err?.code || 'AI_ERROR' });
    }
  }
}

function sendAiUnavailable(res: express.Response) {
  return res.status(503).json(AI_UNAVAILABLE);
}

function geminiEnabled(): boolean {
  if (!_GEMINI_KEY_PRESENT) return false;
  const rt = (globalThis as any).__NEXSTEP_GEMINI_ENABLED_RUNTIME;
  // After a failed check, allow a new attempt every few minutes (generateGeminiContent re-checks).
  if (!rt?.enabled && Date.now() - aiLastProbeAt < AI_REPROBE_MS) return false;
  const cooldownUntil = (globalThis as any).__NEXSTEP_GEMINI_429_COOLDOWN_UNTIL;
  if (cooldownUntil && Date.now() < cooldownUntil) return false;
  return true;
}
function setGeminiEnabled(v: boolean) {
  if ((globalThis as any).__NEXSTEP_GEMINI_ENABLED_RUNTIME) {
    (globalThis as any).__NEXSTEP_GEMINI_ENABLED_RUNTIME.enabled = Boolean(v);
  }
}
function setGemini429Cooldown(seconds: number) {
  (globalThis as any).__NEXSTEP_GEMINI_429_COOLDOWN_UNTIL = Date.now() + Math.max(5, seconds) * 1000;
}

function asStringList(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string');
  if (typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.filter((item): item is string => typeof item === 'string');
  } catch { /* Plain text list is handled below. */ }
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

function mergeUnique<T>(records: T[], fallback: T[], label: (record: T) => unknown): T[] {
  const seen = new Set<string>();
  return [...records, ...fallback].filter((record) => {
    const key = String(label(record) ?? '').trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const CURATED_CAREERS = mergeUnique<any>(CAREERS_EXPANDED, CAREERS_DATA, (item) => item.title);
const CURATED_COURSES = mergeUnique<any>(COURSES_REAL, COURSES_DATA, (item) => item.title);
const CURATED_SCHOLARSHIPS = mergeUnique<any>(SCHOLARSHIPS_ADDITIONAL, SCHOLARSHIPS_DATA, (item) => item.name || item.title);

function profileWords(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(profileWords);
  return typeof value === 'string' ? value.toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length > 2) : [];
}

function entryTestsForCareer(career: any): string[] {
  const haystack = `${career.title ?? ''} ${career.category ?? ''} ${career.preferred_stream ?? career.streamRequired ?? ''}`.toLowerCase();
  if (/medical|dent|pharm|clinical/.test(haystack)) return ['MDCAT'];
  if (/engineer|architect|electrical|mechanical|civil|telecom/.test(haystack)) return ['ECAT', 'NET'];
  if (/software|data|cyber|ai|computer|technology/.test(haystack)) return ['NAT-ICS', 'NET / FAST Admission Test'];
  if (/law/.test(haystack)) return ['LAT'];
  return ['University-specific admission criteria'];
}

function compatibleWithStream(career: any, stream: string) {
  if (!stream) return true;
  const target = `${career.preferred_stream ?? career.streamRequired ?? ''}`.toLowerCase();
  const selected = stream.toLowerCase();
  const aliases: Record<string, string[]> = {
    'pre-medical': ['pre-medical', 'biology', 'medical'],
    'pre-engineering': ['pre-engineering', 'engineering'],
    'ics': ['ics', 'computer', 'technology'],
    'icom': ['icom', 'commerce', 'business', 'finance'],
    'arts': ['arts', 'social sciences', 'media', 'law', 'psychology'],
  };
  const key = Object.keys(aliases).find((candidate) => selected.includes(candidate));
  return !key || aliases[key].some((term) => target.includes(term)) || target.includes('any stream');
}

function personalizedCareerMatches(input: any) {
  const fscPct = Math.max(0, Math.min(100, Number(input.fscPct) || 0));
  const entryTestScore = Math.max(0, Math.min(100, Number(input.entryTestScore) || 0));
  const aggregateScore = Math.round((fscPct * 0.5 + entryTestScore * 0.5) * 10) / 10;
  const interests = profileWords(input.interests);
  const riasec = String(input.riasecCode || input.topRiasecCluster || '').toUpperCase().match(/[RIASEC]/)?.[0] || '';
  const budget = Math.max(0, Number(input.budgetAnnualPkr) || 0);
  const city = String(input.city || '').toLowerCase();

  const matches = CURATED_CAREERS.map((career: any, index: number) => {
    const haystack = `${career.title ?? ''} ${career.category ?? ''} ${career.description ?? ''} ${career.required_skills ?? career.requiredSkills ?? ''}`.toLowerCase();
    const streamFit = compatibleWithStream(career, String(input.stream || ''));
    const riasecFit = Boolean(riasec && String(career.riasec_code ?? career.riasecMatch ?? '').toUpperCase().includes(riasec));
    const interestHits = interests.filter((word) => haystack.includes(word)).length;
    const meritFit = aggregateScore >= 82 ? 26 : aggregateScore >= 68 ? 20 : aggregateScore >= 55 ? 13 : 7;
    const score = Math.min(99, Math.max(18, 32 + meritFit + (streamFit ? 18 : 2) + (riasecFit ? 13 : 0) + Math.min(10, interestHits * 3)));
    const likelyUniversities = UNIVERSITIES_DATA
      .filter((university: any) => (!budget || Number(university.annualFeePkr) <= budget) && (!city || university.city.toLowerCase() === city || city === 'all'))
      .filter((university: any) => university.programs.some((program: string) => haystack.includes(program.toLowerCase().replace(/^bs |^be /, '').split(' ')[0])))
      .slice(0, 3)
      .map((university: any) => ({ name: university.shortName || university.name, city: university.city, feePkr: university.annualFeePkr, meritCutoffPct: university.lastMeritCutoffPct }));
    return {
      ...career,
      id: career.id || `career-${index + 1}`,
      aggregateScore,
      matchScore: score,
      fitCategory: score >= 76 ? 'Strong Match' : score >= 58 ? 'Possible Match' : 'Explore with a plan',
      entryTests: entryTestsForCareer(career),
      topUniversities: likelyUniversities.length ? likelyUniversities : (career.topUniversities || []).slice(0, 3),
      historicalCutoff: /medic|mbbs|doctor|pharm|nurs/i.test(`${career.title} ${career.category || ''}`)
        ? 'Public medical sample band: about 90% aggregate. Confirm the verified year on the university record.'
        : /eng|software|computer/i.test(`${career.title} ${career.category || ''}`)
          ? 'Public engineering and computing sample band: about 72–85%. Confirm the verified year on the university record.'
          : 'Sample merit band stored on each university. Confirm the verified year before you apply.',
      scholarships: [
        'HEC Need-Based',
        /medic|health|pharm|nurs/i.test(`${career.title} ${career.category || ''}`) ? 'Ehsaas Undergraduate' : 'PEEF (Punjab domicile)',
        'Provincial endowment for your domicile',
      ],
      why: [
        streamFit ? `Your ${input.stream || 'academic'} background aligns with this pathway.` : 'This pathway may need a bridge course or stream change.',
        riasecFit ? `It fits your ${riasec} RIASEC preference.` : 'Complete the RIASEC quiz to improve this preference score.',
        interestHits ? `It reflects ${interestHits} of your stated interests or skills.` : 'Add interests and skills to make this result more precise.',
        budget && likelyUniversities.length ? `${likelyUniversities.length} listed option${likelyUniversities.length > 1 ? 's' : ''} fit your annual budget.` : 'Check university fee and merit details before applying.',
      ],
    };
  });
  return { aggregateScore, matches: matches.sort((a, b) => b.matchScore - a.matchScore).slice(0, 12) };
}

// ── Server-side knowledge-base fallback ─────────────────────────────────────
// Called when Gemini is disabled or its key is invalid.
// Returns a real, data-backed answer from the NexStep knowledge base.
// ─────────────────────────────────────────────────────────────────────────────
function kbAnswer(message: string, language: string, profile: any): string {
  const q = message.toLowerCase();
  const ur = language === 'ur';

  // ── MDCAT / Medical ───────────────────────────────────────────────────────
  if (/mdcat|mbbs|bds|pharm-d|doctor|medical college|kemu|kmu|nums|amu|uhs|duhs/.test(q)) {
    const unis = UNIVERSITIES_DATA.filter((u: any) =>
      /medical|medicine|health/.test(`${u.name} ${(u.programs || []).join(' ')}`.toLowerCase())
    ).slice(0, 5).map((u: any) => `  • ${u.name} (${u.city}) — Fee: PKR ${Number(u.annualFeePkr || 0).toLocaleString()}/yr`).join('\n');
    return ur
      ? `MDCAT / میڈیکل داخلہ\n\nاہلیت: FSc پری میڈیکل میں کم از کم 65%\nامتحان: 200 MCQs (بیالوجی 68، کیمسٹری 54، فزکس 54، انگریزی 18)\nسرکاری میرٹ کٹ آف: 91.5%–93.8%\nفارمولا: FSc 50% + MDCAT 50%\n\nمیڈیکل یونیورسٹیاں:\n${unis || '  • KEMU لاہور  • UHS  • KMU پشاور  • DUHS کراچی'}\n\nنمبر 65% سے کم ہوں تو Pharm-D، DPT یا BS Biotech بہترین متبادل ہیں۔`
      : `MDCAT / Medical Admissions\n\nEligibility: Min 65% in FSc Pre-Medical\nTest: 200 MCQs — Biology 68, Chemistry 54, Physics 54, English 18, Reasoning 6\nPublic medical merit cutoff: 91.5%–93.8%\nMerit formula: FSc 50% + MDCAT 50%\n\nTop medical universities in NexStep database:\n${unis || '  • KEMU Lahore  • UHS  • KMU Peshawar  • DUHS Karachi'}\n\nIf your marks are below 65%, Pharm-D, DPT (Physiotherapy) or BS Biotech are strong alternatives.`;
  }

  // ── Engineering / ECAT / NUST ─────────────────────────────────────────────
  if (/ecat|engineer|nust|uet|giki|civil eng|electrical eng|mechanical eng|chemical eng|aerospace/.test(q)) {
    const unis = UNIVERSITIES_DATA.filter((u: any) =>
      /engineering|technology/.test(`${u.name} ${(u.programs || []).join(' ')}`.toLowerCase())
    ).slice(0, 5).map((u: any) => `  • ${u.name} (${u.city}) — Fee: PKR ${Number(u.annualFeePkr || 0).toLocaleString()}/yr`).join('\n');
    return ur
      ? `انجینئرنگ داخلہ\n\nECAT (UET لاہور): 100 MCQs — فزکس 30، ریاضی 30، کیمسٹری 30، انگریزی 10 (منفی مارکنگ)\nNUST NET: 200 MCQs — ریاضی 80، فزکس 60، CS/کیم 30، انگریزی 20 (سال میں 4 بار)\nفارمولا: FSc 50% + Entry Test 50%\nمیرٹ کٹ آف: 72%–82%\n\nانجینئرنگ یونیورسٹیاں:\n${unis || '  • UET لاہور  • NUST اسلام آباد  • GIKI ٹوپی  • NED کراچی  • COMSATS'}`
      : `Engineering Admissions\n\nECAT (UET Lahore): 100 MCQs — Physics 30, Math 30, Chemistry 30, English 10. Negative marking.\nNUST NET: 200 MCQs — Math 80, Physics 60, CS/Chem 30, English 20. Held 4×/year.\nMerit formula: FSc 50% + Entry Test 50%\nPublic university cutoff: 72%–82%\n\nEngineering universities in database:\n${unis || '  • UET Lahore  • NUST Islamabad  • GIKI Topi  • NED Karachi  • COMSATS'}`;
  }

  // ── Computer Science / ICS / Software ────────────────────────────────────
  if (/computer science|software eng|bs cs|bs se|bs ai|data science|cyber|ics|programming|coding|it career|artificial intel/.test(q)) {
    const careers = CURATED_CAREERS.filter((c: any) =>
      /software|data|cyber|computer|developer|engineer|ai|tech/.test(`${c.title} ${c.category || ''}`.toLowerCase())
    ).slice(0, 4).map((c: any) =>
      `  • ${c.title} — PKR ${Number(c.avgSalaryPkrMonth || c.starting_salary_pkr || 0).toLocaleString()}/mo`
    ).join('\n');
    return ur
      ? `ICS / کمپیوٹر سائنس راستے\n\nICS کے بعد: BS CS، BS SE، BS AI، BS Data Science، BS Cyber Security\n\nبہترین یونیورسٹیاں: FAST-NUCES، NUST، COMSATS، Air University، LUMS\nداخلہ ٹیسٹ: NAT-ICS (NTS)، NUST NET، FAST Admission Test\nمیرٹ: 70%–85%\n\nکیریئر اور تنخواہیں:\n${careers || '  • Software Engineer — 80,000–400,000 روپے/ماہ'}`
      : `ICS / Computer Science Pathways\n\nAfter ICS: BS CS, BS SE, BS AI, BS Data Science, BS Cyber Security\n\nTop universities: FAST-NUCES (4 campuses), NUST, COMSATS, Air University, LUMS\nEntry tests: NAT-ICS, NUST NET (4 series/year), FAST Admission Test\nMerit cutoff: 70%–85%\n\nCareer paths from database:\n${careers || '  • Software Engineer — PKR 80k–400k/month'}`;
  }

  // ── Scholarships ──────────────────────────────────────────────────────────
  if (/scholarship|ehsaas|peef|hec need|stipend|wظیفہ|اسکالرشپ|mora|zakat|beef|free education|need.based/.test(q)) {
    const schols = CURATED_SCHOLARSHIPS.slice(0, 6).map((s: any) =>
      `  • ${s.name || s.title} — ${s.provider || ''} | ${s.coverage || s.awardAmountPkr || 'See portal'}`
    ).join('\n');
    return ur
      ? `پاکستان میں اسکالرشپس\n\nڈیٹابیس سے:\n${schols}\n\nاہم اسکالرشپس:\n• احساس انڈرگریجویٹ: 100% فیس + 4,000 روپے/ماہ (50% خواتین کوٹہ)\n• HEC ضرورت پر مبنی: مکمل فیس + 6,000 روپے/ماہ (آمدن < 45,000)\n• PEEF پنجاب: فیس معافی + ہوسٹل الاؤنس\n• صوبائی: KPK StEP | Sindh Endowment | BEEF | MORA Zakat\n\nدرخواست: عام طور پر ستمبر – نومبر`
      : `Scholarships in Pakistan\n\nFrom NexStep database:\n${schols}\n\nKey national scholarships:\n• Ehsaas Undergraduate: Full tuition + PKR 4,000/month (50% female quota)\n• HEC Need-Based: Full tuition + PKR 6,000/month (family income < PKR 45k)\n• PEEF Punjab: Fee waiver + hostel allowance\n• Provincial: KPK StEP | Sindh Endowment | BEEF Balochistan | MORA Zakat\n\nApplication window: September – November each year`;
  }

  // ── TEVTA / Vocational ────────────────────────────────────────────────────
  if (/tevta|vocational|trade |dae|navttc|digiskills|solar|electrician|hvac|automation|short course/.test(q)) {
    const courses = TEVTA_COURSES.slice(0, 5).map((c: any) =>
      `  • ${c.title || c.name} — ${c.duration || ''}`
    ).join('\n');
    return ur
      ? `TEVTA / پیشہ ورانہ تعلیم\n\nمشہور کورسز:\n${courses}\n\nمفت آن لائن:\n• DigiSkills.pk — فری لانسنگ، SEO، QuickBooks، گرافک ڈیزائن\n• NAVTTC — AI، Cloud، Coding بوٹ کیمپ\n• Google Career Certificates (Ignite کے ذریعے)\n\nDAE (3 سال): براہ راست سب-انجینئر نوکری یا BS میں 2nd year داخلہ`
      : `TEVTA / Vocational Education\n\nPopular courses (NexStep database):\n${courses}\n\nFree online learning:\n• DigiSkills.pk — Freelancing, SEO, Graphic Design, QuickBooks\n• NAVTTC — AI, Cloud, Coding bootcamps\n• Google Career Certificates via Ignite/Tech4Life\n\nDAE (3-year Diploma): Direct Sub-Engineer employment or 2nd-year BE entry`;
  }

  // ── Universities ──────────────────────────────────────────────────────────
  if (/university|universities|admission|hec|lums|comsats|fast|air univ|bahria|ucp|szabist|iba/.test(q)) {
    const profileCity = (profile?.city || '').toLowerCase();
    const unis = UNIVERSITIES_DATA
      .filter((u: any) => !profileCity || u.city.toLowerCase() === profileCity || profileCity === '')
      .slice(0, 8)
      .map((u: any) =>
        `  • ${u.name} (${u.city}) — ${u.type} | Fee: PKR ${Number(u.annualFeePkr || 0).toLocaleString()}/yr`
      ).join('\n');
    return ur
      ? `یونیورسٹیاں${profileCity ? ` (${profile.city} کے قریب)` : ''}\n\n${unis || '  • NUST  • COMSATS  • UET  • FAST-NUCES  • LUMS'}\n\nمزید کے لیے NexStep کا Universities ٹیب کھولیں — فیس، میرٹ اور پروگرام فلٹر کریں۔`
      : `Universities${profileCity ? ` near ${profile.city}` : ' in Pakistan'}\n\n${unis || '  • NUST  • COMSATS  • UET  • FAST-NUCES  • LUMS'}\n\nOpen the Universities tab on NexStep to filter by fee, merit, programme, and city.`;
  }

  // ── Career / Job / Salary ─────────────────────────────────────────────────
  if (/career|job|salary|scope|future|internship|rozee|freelanc|employment|earning/.test(q)) {
    const top = CURATED_CAREERS.slice(0, 8).map((c: any) =>
      `  • ${c.title} — PKR ${Number(c.avgSalaryPkrMonth || c.starting_salary_pkr || 0).toLocaleString()}/mo`
    ).join('\n');
    return ur
      ? `کیریئر رہنمائی\n\nNexStep ڈیٹابیس سے اہم کیریئرز:\n${top}\n\nنوکری پورٹلز: Rozee.pk | LinkedIn | Mustakbil.com\nمفت مہارتیں: DigiSkills.pk | Google Career Certificates\n\nNexStep پر RIASEC کوئز دیں تاکہ اپنی شخصیت کے مطابق بہترین کیریئر معلوم ہو۔`
      : `Career Guidance\n\nTop careers from NexStep database:\n${top}\n\nJob portals: Rozee.pk | LinkedIn | Mustakbil.com\nFree skills: DigiSkills.pk | Google Career Certificates\n\nTake the RIASEC Quiz on NexStep to discover which career best fits your personality and marks.`;
  }

  // ── FSc / Matric / Stream ─────────────────────────────────────────────────
  if (/matric|fsc|f\.sc|stream|pre.med|pre.eng|inter |icom|arts |o.level|a.level|grade|hssc/.test(q)) {
    const profileStream = profile?.preferredStream || '';
    const streamNote = profileStream ? `\nآپ کی موجودہ سٹریم: ${profileStream}` : '';
    return ur
      ? `تعلیمی سٹریم گائیڈ${streamNote}\n\nFSc پری میڈیکل → MBBS، BDS، Pharm-D، DPT\nFSc پری انجینئرنگ → BE (مختلف شعبے)، BS Math/Physics\nICS → BS CS، BS SE، BS AI، Data Science\nICOM / Commerce → BBA، CA، ACCA، BS Finance\nFA / آرٹس → قانون، ماس کمیونیکیشن، نفسیات\nDAE (3 سال) → براہ راست سب-انجینئر نوکری\n\nنمبر 60% سے کم ہوں تو ICS، ICOM یا DAE/TEVTA بہترین راستہ ہیں۔`
      : `Academic Stream Guide${profileStream ? `\nYour current stream: ${profileStream}` : ''}\n\nFSc Pre-Medical → MBBS, BDS, Pharm-D, DPT, BS Biotech\nFSc Pre-Engineering → BE (Civil/Mech/Elec/Chemical), BS Math/Physics\nICS → BS CS, BS SE, BS AI, BS Data Science, BS Cyber Security\nICOM / Commerce → BBA, CA Foundation, ACCA, BS Accounting\nFA / Arts → BA-LL.B Law, Mass Communication, Psychology\nDAE (3-year) → Direct Sub-Engineer job or 2nd-year BE entry\n\nIf Matric % < 60%, ICS, ICOM or DAE/TEVTA offer faster practical paths.`;
  }

  // ── Entry Tests ───────────────────────────────────────────────────────────
  if (/entry test|admission test|nat |gat |sat |lat |test prep|test date|when is/.test(q)) {
    const tests = ENTRY_TESTS_DATA.slice(0, 6).map((t: any) =>
      `  • ${t.name || t.title} — ${t.eligibility || t.stream || ''}`
    ).join('\n');
    return ur
      ? `انٹری ٹیسٹ گائیڈ\n\nڈیٹابیس سے:\n${tests}\n\nاہم ٹیسٹ:\n• MDCAT — پری میڈیکل (PMDC/UHS)\n• ECAT — انجینئرنگ (UET)\n• NUST NET — NUST (سال میں 4 بار)\n• NAT-ICS — NTS (COMSATS، Air Uni)\n• GAT — MS/MPhil/PhD\n• LAT — قانون\n\nNexStep کا Entry Test Prep ٹیب آزمائیں۔`
      : `Entry Tests Guide\n\nFrom NexStep database:\n${tests}\n\nKey tests:\n• MDCAT — Pre-Medical (PMDC/UHS)\n• ECAT — Engineering (UET Lahore)\n• NUST NET — NUST (4 series/year)\n• NAT-ICS / NAT-IE — NTS (COMSATS, Air Uni, Bahria)\n• GAT General/Subject — MS/MPhil/PhD & HEC scholarships\n• LAT — Law Admission Test\n\nUse NexStep's Entry Test Prep tab for practice questions.`;
  }

  // ── About NexStep ─────────────────────────────────────────────────────────
  if (/nexstep|this app|this site|this portal|riasec|career ai|skill gap|roadmap|mock interview|resume builder/.test(q)) {
    return ur
      ? `NexStep پلیٹ فارم\n\nNexStep پاکستانی طلباء (Grade 8 سے University) کا AI کیریئر گائیڈنس پورٹل ہے — Air University اسلام آباد میں تیار کیا گیا۔\n\nاہم فیچرز:\nCareer AI — نمبروں کے مطابق کیریئر سفارشات\nRIASEC کوئز — شخصیت کے مطابق کیریئر\nSkill Gap — کن مہارتوں کی ضرورت ہے\nCareer Roadmap — مرحلہ وار رہنمائی\nResume ATS — پیشہ ورانہ CV\nMock Interview — AI انٹرویو پریکٹس\nUniversities — 100+ اداروں کا موازنہ\nScholarships — صوبے کے مطابق فلٹر`
      : `About NexStep\n\nNexStep is an AI-powered career guidance portal for Pakistani students (Grade 8 → University), developed at Air University Islamabad.\n\nKey features:\nCareer AI — ranked career recommendations based on your marks & profile\nRIASEC Quiz — personality-based career discovery\nSkill Gap — identify skills you need to develop\nCareer Roadmap — personalised step-by-step milestone planner\nResume ATS — professional CV builder with ATS scoring\nMock Interview — AI interview practice with instant feedback\nUniversities — compare 100+ HEC-recognised institutions\nScholarships — filter by province and income level`;
  }

  // ── Generic: always give something useful ─────────────────────────────────
  const sampleCareers = CURATED_CAREERS.slice(0, 4).map((c: any) => `  • ${c.title}`).join('\n');
  return ur
    ? `NexStep AI کونسلر\n\nآپ کا سوال سمجھ آ گیا۔ میں ان موضوعات پر رہنمائی دے سکتا ہوں:\n\nMDCAT • ECAT • FSc سٹریم • ICS • DAE\nNUST • FAST • UET • COMSATS • LUMS\nاحساس • PEEF • HEC اسکالرشپ\nکیریئرز:\n${sampleCareers}\n\nاپنا سوال مزید واضح الفاظ میں لکھیں تاکہ بہتر جواب مل سکے۔`
    : `NexStep AI Counselor\n\nI can help with:\n\nMDCAT, ECAT, FSc streams, ICS, DAE, O/A-Levels\nNUST, FAST, UET, COMSATS, LUMS, Air University\nEhsaas, PEEF, HEC Need-Based scholarships\nTop careers from database:\n${sampleCareers}\n\nPlease rephrase your question with specific keywords (e.g. "MDCAT merit", "NUST NET", "Ehsaas scholarship") for a more detailed answer.`;
}

// ─────────────────────────────────────────────────────────────────────────────
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

const DEV_ORIGINS = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3001',
  'http://127.0.0.1:3001',
  'http://localhost:30001',
  'http://127.0.0.1:30001',
]);

const CONFIGURED_ORIGINS = new Set(
  [process.env.APP_URL, process.env.FRONTEND_URL, process.env.CORS_ORIGINS]
    .flatMap((value) => value?.split(',') ?? [])
    .map((value) => value.trim())
    .filter(Boolean)
);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  const isLocalDev = origin && (DEV_ORIGINS.has(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin));
  const isConfiguredOrigin = Boolean(origin && CONFIGURED_ORIGINS.has(origin));
  if (origin && (isConfiguredOrigin || (process.env.NODE_ENV !== 'production' && isLocalDev))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    res.setHeader('Vary', 'Origin');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// ── Clerk authentication ─────────────────────────────────────────────────────
// Verifies the Clerk session token (Authorization: Bearer … or __session cookie)
// and exposes it to getAuth(req). Route-level guards live in auth.middleware.ts.
if (process.env.CLERK_SECRET_KEY?.trim() && process.env.CLERK_PUBLISHABLE_KEY?.trim()) {
  const authorizedParties = [...CONFIGURED_ORIGINS, ...(process.env.NODE_ENV === 'production' ? [] : ['http://localhost:5173', 'http://127.0.0.1:5173'])];
  const clerk = clerkMiddleware(process.env.NODE_ENV === 'production' && authorizedParties.length ? { authorizedParties } : { debug: process.env.CLERK_DEBUG === 'true' });
  app.use((req, res, next) => {
    if (req.path === '/health' || req.path === '/api/health') return next();
    return clerk(req, res, next);
  });
} else {
  console.warn('[auth] CLERK_SECRET_KEY / CLERK_PUBLISHABLE_KEY missing in backend/.env — every protected route will return 401 until they are set.');
}

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  // /me is an authenticated, read-only session restoration endpoint. Applying
  // the action limiter to it can lock a valid user out of the app after client
  // retries or React development remounts. Clerk still verifies every request.
  skip: (req) => req.method === 'GET' && req.path === '/me',
  max: process.env.NODE_ENV === 'production' ? 20 : 1000,
  message: { error: 'Too many requests. Please wait 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: Number(process.env.AI_RATE_LIMIT_PER_MIN) || 10,
  message: { error: 'AI request limit reached. Please wait a moment before trying again.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => (req as any).user?.id ?? req.ip ?? 'unknown',
});

const KNOWLEDGE_BASE_SYSTEM_PROMPT = `You are NexStep AI, a free bilingual career counselor for every student on this platform, from Class 8 through university. Answer in Urdu or English as instructed for this turn. Remember earlier turns. Follow the knowledge base below for career tracks, entry tests, universities, and scholarships. Also explain school subjects when asked. If a question is unrelated to study or careers, refuse it briefly. Use Markdown. Do not guarantee a seat or a scholarship.

${CAREER_KNOWLEDGE_BASE}`;

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 1 — Unauthenticated / public routes
// ══════════════════════════════════════════════════════════════════════════════

app.get(['/health', '/api/health'], async (_req, res) => {
  const start = Date.now();
  let dbStatus = 'unreachable';
  let dbLatencyMs = -1;
  try {
    const dbStart = Date.now();
    await pool.query('SELECT 1');
    dbLatencyMs = Date.now() - dbStart;
    dbStatus = 'connected';
  } catch { /* status stays unreachable */ }
  res.json({
    status: 'ok',
    service: 'NexStep AI Backend',
    timestamp: new Date().toISOString(),
    uptime: Math.round(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
    database: { status: dbStatus, latencyMs: dbLatencyMs },
    ai: { enabled: geminiEnabled() },
    responseMs: Date.now() - start,
  });
});

app.use('/api/auth', authLimiter, authRouter);
app.use('/api/admin-auth', adminAuthRouter);
app.use('/api/payments', manualPaymentsRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/career-ai', careerAiRouter);

app.get('/api/universities', optionalAuth(), async (req, res) => {
  try {
    await ensureSampleSchema();
    const { city, maxFee, tier, type, search } = req.query as Record<string, string>;
    let query = `
      SELECT u.id, u.name, u.short_name AS "shortName", u.city, u.province, u.type,
             u.hec_rank_tier AS "hecRankTier", u.is_hec_recognized AS "isHecRecognized",
             u.annual_fee_pkr AS "annualFeePkr", u.official_website AS "officialWebsite",
             u.admissions_url AS "admissionsUrl", u.programs, u.last_verified_at AS "lastVerifiedAt",
             u.verification_status AS "verificationStatus",
             u.merit_cutoff_pct AS "lastMeritCutoffPct", u.has_hostel AS "hasHostel", u.description, u.is_sample AS "isSample",
             ds.name AS "sourceName", ds.source_type AS "sourceType", ds.base_url AS "sourceUrl", ds.is_official AS "isOfficial"
      FROM universities u
      LEFT JOIN data_sources ds ON u.source_id = ds.id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (city && city !== 'All') { params.push(city); query += ` AND LOWER(u.city) = LOWER($${params.length})`; }
    if (type && type !== 'All') { params.push(type); query += ` AND LOWER(u.type) = LOWER($${params.length})`; }
    if (tier && tier !== 'All') { params.push(tier); query += ` AND LOWER(u.hec_rank_tier) = LOWER($${params.length})`; }
    if (maxFee) { const f = parseInt(maxFee, 10); if (!isNaN(f)) { params.push(f); query += ` AND u.annual_fee_pkr <= $${params.length}`; } }
    if (search) { const q = `%${search.toLowerCase()}%`; params.push(q); query += ` AND (LOWER(u.name) LIKE $${params.length} OR LOWER(u.city) LIKE $${params.length})`; }
    query += levelClause('u', params, await requestLevel(req));
    query += ` ORDER BY u.name ASC`;
    const { rows } = await pool.query(query, params);
    const data = rows.length > 0 ? rows.map((university: any) => ({
      ...university,
      programs: asStringList(university.programs),
      websiteUrl: university.admissionsUrl || university.officialWebsite || null,
      annualFeePkr: Number(university.annualFeePkr) || 0,
      lastMeritCutoffPct: Number(university.lastMeritCutoffPct) || 0,
    })) : UNIVERSITIES_DATA;
    res.json({ count: data.length, data });
  } catch {
    res.json({ count: UNIVERSITIES_DATA.length, data: UNIVERSITIES_DATA });
  }
});

app.get('/api/scholarships', optionalAuth(), async (req, res) => {
  try {
    await ensureSampleSchema();
    const { province, category, maxIncome } = req.query as Record<string, string>;
    let query = `
      SELECT s.id, s.name AS title, s.provider, s.description, s.province, s.category,
             s.coverage AS "awardAmountPkr", s.amount_pkr AS "amountPkr", s.max_family_income AS "maxFamilyIncomePkr",
             s.deadline, s.application_url AS "applicationUrl", s.official_url AS "officialUrl",
             s.last_verified_at AS "lastVerifiedAt", s.freshness_status AS "freshnessStatus",
             s.verification_status AS "verificationStatus",
             s.min_academic_pct AS "minAcademicPct", s.deadline_note AS "deadlineNote", s.is_sample AS "isSample", s.education_levels AS "educationLevels",
             ds.name AS "sourceName", ds.source_type AS "sourceType", ds.base_url AS "sourceUrl", ds.is_official AS "isOfficial"
      FROM scholarships s
      LEFT JOIN data_sources ds ON s.source_id = ds.id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (province && province !== 'All') { params.push(`%${province}%`); query += ` AND (s.province ILIKE $${params.length} OR s.province ILIKE '%Federal%')`; }
    if (category && category !== 'All') { params.push(category); query += ` AND LOWER(s.category) = LOWER($${params.length})`; }
    if (maxIncome) { const i = parseInt(maxIncome, 10); if (!isNaN(i)) { params.push(i); query += ` AND s.max_family_income >= $${params.length}`; } }
    query += levelClause('s', params, await requestLevel(req));
    query += ` ORDER BY s.created_at DESC`;
    const { rows } = await pool.query(query, params);
    const databaseRecords = rows.map((scholarship: any) => ({
      ...scholarship,
      awardAmountPkr: scholarship.awardAmountPkr || scholarship.amountPkr || 'Award not listed',
      maxFamilyIncomePkr: Number(scholarship.maxFamilyIncomePkr) || 0,
      minAcademicPct: Number(scholarship.minAcademicPct) || 0,
      applicationUrl: scholarship.applicationUrl || scholarship.officialUrl || null,
    }));
    const data = mergeUnique(databaseRecords, CURATED_SCHOLARSHIPS, (item) => item.name || item.title);
    res.json({ count: data.length, data });
  } catch {
    res.json({ count: SCHOLARSHIPS_DATA.length, data: SCHOLARSHIPS_DATA });
  }
});

app.get('/api/careers', async (req, res) => {
  try {
    await ensureCareerAiSchema();
    const level = String(req.query.level || '');
    const { rows } = await pool.query(`SELECT * FROM careers ORDER BY title ASC LIMIT 500`);
    const data = rows.map(careerToApi).filter((c) => !level || !c.educationLevels.length || c.educationLevels.includes(level));
    res.json({ count: data.length, data });
  } catch (err: any) {
    console.error('[careers] list', err?.message);
    res.status(500).json({ error: 'Could not load careers.' });
  }
});

app.get('/api/entry-tests', (_req, res) => res.json({ count: ENTRY_TESTS_DATA.length, data: ENTRY_TESTS_DATA }));
app.get('/api/riasec/questions', optionalAuth(), (req, res) => {
  const attempt = Math.max(0, parseInt(String(req.query.attempt || '0'), 10) || 0);
  const questions = personalRiasecQuestions(req.user?.id, attempt);
  res.json({
    count: questions.length,
    personalized: true,
    attempt,
    data: questions.map((question) => ({ id: question.id, category: question.category, textEn: question.textEn, textUr: question.textUr })),
  });
});
app.get('/api/tevta-it', (_req, res) => res.json({ tevta: TEVTA_COURSES, freeIt: FREE_IT_COURSES }));
app.get('/api/transnational', (_req, res) => res.json({ data: TRANSNATIONAL_PATHWAYS }));

app.get('/api/jobs', optionalAuth(), async (req, res) => {
  try {
    const { search, keyword, type, city, location, page = '1', limit = '100' } = req.query as Record<string, string>;
    const p = Math.max(1, parseInt(page, 10) || 1);
    const l = Math.min(200, Math.max(1, parseInt(limit, 10) || 100));
    const offset = (p - 1) * l;

    let queryText = `
      SELECT j.id, j.title, j.company, j.location, j.city, j.province,
             j.employment_type AS type, j.experience_level AS experience,
             j.description, j.required_skills AS skills, j.salary_min AS "salaryMin",
             j.salary_max AS "salaryMax", j.application_url AS "applyUrl",
             j.freshness_status AS "freshnessStatus", j.verification_status AS "verificationStatus",
             j.last_verified_at AS "lastVerifiedAt", j.is_sample AS "isSample",
             ds.name AS "sourceName", ds.source_type AS "sourceType", ds.base_url AS "sourceUrl", ds.is_official AS "isOfficial"
      FROM jobs j
      LEFT JOIN data_sources ds ON j.source_id = ds.id
      WHERE 1=1
    `;
    const params: any[] = [];
    const qTerm = (search || keyword || '').trim().toLowerCase();
    if (qTerm) {
      params.push(`%${qTerm}%`);
      queryText += ` AND (LOWER(j.title) LIKE $${params.length} OR LOWER(j.company) LIKE $${params.length} OR LOWER(j.description) LIKE $${params.length})`;
    }
    const filterType = (type || '').trim();
    if (filterType && filterType !== 'All') {
      params.push(`%${filterType.toLowerCase()}%`);
      queryText += ` AND LOWER(j.employment_type) LIKE $${params.length}`;
    }
    const filterCity = (city || location || '').trim().toLowerCase();
    if (filterCity && filterCity !== 'all') {
      params.push(`%${filterCity}%`);
      queryText += ` AND (LOWER(j.city) LIKE $${params.length} OR LOWER(j.location) LIKE $${params.length})`;
    }

    queryText += levelClause('j', params, await requestLevel(req));
    queryText += ` ORDER BY j.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(l, offset);

    const { rows } = await pool.query(queryText, params);
    const data = rows.length > 0 ? rows.map((j: any) => ({
      ...j,
      stipendSalary: j.salaryMin
        ? `PKR ${Number(j.salaryMin).toLocaleString()}${j.salaryMax ? ' - ' + Number(j.salaryMax).toLocaleString() : ''} / mo`
        : 'Competitive market salary',
      requirements: typeof j.skills === 'string'
        ? j.skills.split(',').map((s: string) => s.trim()).filter(Boolean)
        : Array.isArray(j.skills) ? j.skills : [],
    })) : JOBS_INTERNSHIPS_DATA;

    res.json({ count: data.length, total: rows.length, page: p, limit: l, data });
  } catch {
    res.json({ count: JOBS_INTERNSHIPS_DATA.length, data: JOBS_INTERNSHIPS_DATA });
  }
});

app.get('/api/courses', optionalAuth(), async (req, res) => {
  try {
    const courseParams: any[] = [];
    const courseLevel = levelClause('c', courseParams, await requestLevel(req));
    const { rows } = await pool.query(`
      SELECT c.id, c.title, c.provider, c.description, c.skills_covered AS "skillsCovered",
             c.duration, c.format, c.price_pkr AS "pricePkr", c.enrollment_url AS "enrollUrl",
             c.verification_status AS "verificationStatus", c.last_verified_at AS "lastVerifiedAt", c.is_sample AS "isSample",
             ds.name AS "sourceName", ds.source_type AS "sourceType", ds.base_url AS "sourceUrl", ds.is_official AS "isOfficial"
      FROM courses c
      LEFT JOIN data_sources ds ON c.source_id = ds.id
      WHERE 1=1 ${courseLevel}
      ORDER BY c.title ASC
    `, courseParams);
    const databaseRecords = rows.map((course: any) => ({
      ...course,
      category: course.category || course.format || 'Career Skills',
      skills: asStringList(course.skillsCovered),
      price: course.pricePkr ? `PKR ${Number(course.pricePkr).toLocaleString()}` : 'FREE',
      officialUrl: course.officialUrl || course.enrollUrl,
    }));
    const data = mergeUnique(databaseRecords, CURATED_COURSES, (item) => item.title);
    res.json({ count: data.length, data });
  } catch {
    res.json({ count: CURATED_COURSES.length, data: CURATED_COURSES });
  }
});

app.get('/api/data-sources', async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT ds.*, COUNT(dv.id) AS versions_count
      FROM data_sources ds
      LEFT JOIN dataset_versions dv ON ds.id = dv.source_id
      GROUP BY ds.id
      ORDER BY ds.name ASC
    `);
    res.json({ count: rows.length, data: rows });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch data sources.', details: err.message });
  }
});

app.get('/api/data-freshness', async (_req, res) => {
  try {
    const { rows: imports } = await pool.query(`
      SELECT di.*, dv.dataset_name, ds.name AS source_name
      FROM dataset_imports di
      LEFT JOIN dataset_versions dv ON di.dataset_version_id = dv.id
      LEFT JOIN data_sources ds ON dv.source_id = ds.id
      ORDER BY di.started_at DESC
      LIMIT 10
    `);
    res.json({ status: 'ok', recentImports: imports });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch freshness status.', details: err.message });
  }
});

const GRADE8_SUBJECTS = [
  { key: 'mathMarks', subject: 'Mathematics', meaning: 'Keeps engineering, computing, and accounting open after Matric.', careers: 'Pre-Engineering, ICS, CA, and economics.' },
  { key: 'scienceMarks', subject: 'General Science', meaning: 'Shows whether Biology or Physics later will be realistic.', careers: 'Pre-Medical, pharmacy, nursing, and engineering.' },
  { key: 'englishMarks', subject: 'English', meaning: 'Supports law, media, teaching, and every entry-test English section.', careers: 'Law, media, teaching, and international tests.' },
  { key: 'computerMarks', subject: 'Computer', meaning: 'Points toward ICS and software rather than a pure medical group.', careers: 'ICS, software, and data careers.' },
];

app.post('/api/analyze-grade8', (req, res) => {
  const { mathMarks = 70, scienceMarks = 70, englishMarks = 70, computerMarks = 70 } = req.body;
  const m = parseFloat(mathMarks) || 0;
  const s = parseFloat(scienceMarks) || 0;
  const e = parseFloat(englishMarks) || 0;
  const c = parseFloat(computerMarks) || 0;
  const avg = (m + s + e + c) / 4;
  const marksByKey: Record<string, number> = { mathMarks: m, scienceMarks: s, englishMarks: e, computerMarks: c };
  const subjects = GRADE8_SUBJECTS.map((item) => {
    const marks = marksByKey[item.key];
    const strength = marks >= 70 ? 'Strong' : marks >= 55 ? 'Developing' : 'Needs support';
    return { ...item, marks, strength };
  });
  const riasec = String(req.body.riasec || '').toUpperCase().match(/[RIASEC]/)?.[0] || '';
  const clusterName: Record<string, string> = { R: 'Realistic', I: 'Investigative', A: 'Artistic', S: 'Social', E: 'Enterprising', C: 'Conventional' };
  const preferred: Record<string, string> = {
    I: 'Science (Biology Group)', R: 'Science (Computer Group)',
    A: 'Arts / Humanities & Vocational Trades', S: 'Arts / Humanities & Vocational Trades',
    E: 'Commerce / ICOM Group', C: 'Commerce / ICOM Group',
  };

  const groupRecommendations: any[] = [];
  if (s >= 75 && m >= 70) {
    groupRecommendations.push({
      group: 'Science (Biology Group)',
      fitLevel: 'Strong Fit',
      reasons: 'High science and math scores indicate strong potential for MBBS, Medical, Biotechnology, and Pharmacy.'
    });
  }
  if (c >= 70 || (m >= 75 && s >= 65)) {
    groupRecommendations.push({
      group: 'Science (Computer Group)',
      fitLevel: 'Optimal Match',
      reasons: 'Excellent logical skills suitable for Software Engineering, AI, Computer Science, and Data Analytics.'
    });
  }
  if (avg >= 50) {
    groupRecommendations.push({
      group: 'Commerce / ICOM Group',
      fitLevel: 'Good Alternative',
      reasons: 'Solid foundation for Business Administration, Accounting, Finance, and Entrepreneurship.'
    });
  }
  groupRecommendations.push({
    group: 'Arts / Humanities & Vocational Trades',
    fitLevel: 'Broad Career Scope',
    reasons: 'Ideal for Law, Graphic Design, Languages, Media, or TEVTA technical skill certifications.'
  });

  const want = preferred[riasec];
  if (want) {
    const hit = groupRecommendations.find((g) => g.group === want);
    const note = `Matches your ${clusterName[riasec]} interest-quiz result.`;
    if (hit) {
      hit.reasons = `${note} ${hit.reasons}`;
      hit.quizMatch = true;
      groupRecommendations.sort((a, b) => Number(b.quizMatch) - Number(a.quizMatch));
    } else {
      groupRecommendations.unshift({ group: want, fitLevel: 'Quiz match', quizMatch: true, reasons: note });
    }
  }

  res.json({ averageScore: Math.round(avg), riasec: riasec || null, cluster: clusterName[riasec] || null, recommendations: groupRecommendations, subjects });
});

const MATRIC_PATHS = [
  { stream: 'FSc Pre-Medical', leadsTo: 'MBBS, BDS, Pharm-D, DPT, nursing, and life sciences.', needs: ['biology', 'chemistry'], minPct: 70 },
  { stream: 'FSc Pre-Engineering', leadsTo: 'BE Civil, Electrical, Mechanical, and related technology degrees.', needs: ['mathematics', 'physics'], minPct: 70 },
  { stream: 'ICS', leadsTo: 'BS Computer Science, Software Engineering, AI, and Data Science.', needs: ['mathematics', 'computer'], minPct: 60 },
  { stream: 'ICom', leadsTo: 'BBA, CA, ACCA, accounting, and banking.', needs: ['mathematics'], minPct: 55 },
  { stream: 'FA / Humanities', leadsTo: 'Law, education, media, psychology, and social sciences.', needs: ['english'], minPct: 50 },
  { stream: 'DAE', leadsTo: 'A three-year technical diploma, sub-engineer work, or later lateral entry to a technology degree.', needs: [] as string[], minPct: 45 },
];

app.post('/api/analyze-matric', (req, res) => {
  const body = req.body || {};
  const subjectsIn = body.subjects || {};
  const subjectMarks: Record<string, number> = {
    mathematics: Number(subjectsIn.mathematics ?? body.mathMarks) || 0,
    physics: Number(subjectsIn.physics) || 0,
    chemistry: Number(subjectsIn.chemistry) || 0,
    biology: Number(subjectsIn.biology ?? body.scienceMarks) || 0,
    computer: Number(subjectsIn.computer) || 0,
    english: Number(subjectsIn.english ?? body.englishMarks) || 0,
    urdu: Number(subjectsIn.urdu) || 0,
  };
  const { totalPercentage, biseBoard = 'FBISE' } = body;
  const pct = parseFloat(totalPercentage) || 0;
  const sci = subjectMarks.biology;
  const entered = Object.entries(subjectMarks).filter(([, n]) => n > 0);
  const strongSubjects = entered.filter(([, n]) => n >= 70).map(([name, marks]) => ({ subject: name, marks, band: 'Strong' }));
  const weakSubjects = entered.filter(([, n]) => n < 55).map(([name, marks]) => ({ subject: name, marks, band: 'Weak' }));
  const streams: any[] = [];
  const warnings: string[] = [];
  const tevtaAlternatives: any[] = [];
  const allPaths = MATRIC_PATHS.map((path) => {
    const weakNeed = path.needs.filter((name) => subjectMarks[name] > 0 && subjectMarks[name] < 55);
    const unrealistic = pct > 0 && pct < path.minPct || weakNeed.length > 0;
    const warning = unrealistic
      ? `${path.stream} is unrealistic on these marks${weakNeed.length ? ` because ${weakNeed.join(' and ')} is under the 55% BISE comfort line` : ''}.`
      : '';
    return { ...path, unrealistic, warning, matchScore: unrealistic ? 'Unrealistic on current marks' : 'Open on current marks' };
  });

  if (pct >= 85) {
    streams.push({ stream: 'FSc Pre-Medical / Pre-Engineering', matchScore: 'Strong Fit (Top Merit Tier)', details: `Meets ${biseBoard} cutoff for public medical & top engineering universities.` });
    streams.push({ stream: 'ICS (Computer Science)', matchScore: 'Strong Fit', details: 'High aptitude for Software Engineering, AI, and Data Science.' });
  } else if (pct >= 70) {
    streams.push({ stream: 'ICS (Computer Science & Math)', matchScore: 'Best Match', details: 'Optimal for software, cybersecurity, tech fields.' });
    streams.push({ stream: 'ICOM / BBA / CA Foundation', matchScore: 'Strong Fit', details: 'Finance, business analytics, chartered accountancy.' });
    if (sci < 75) warnings.push('MBBS cutoff usually >90%. Consider ICS or ICOM.');
  } else if (pct >= 55) {
    streams.push({ stream: 'DAE (3-Year Diploma of Associate Engineer)', matchScore: 'High Employment Match', details: 'Electrical, Mechanical, or Automation sub-engineering roles.' });
    streams.push({ stream: 'FA / Humanities', matchScore: 'Good Fit', details: 'Leads to Law (BA-LL.B), Mass Comm, Languages, and Social Sciences.' });
  } else {
    streams.push({ stream: 'TEVTA Vocational Trade Certificates', matchScore: 'Direct Job Ready', details: 'Government-certified technical trades with monthly stipend.' });
    warnings.push('Traditional FSc merit cutoffs are high. TEVTA trade diplomas offer faster job entry.');
  }

  for (const path of allPaths) {
    if (path.unrealistic && path.warning) warnings.push(path.warning);
  }

  if (pct < 65 || sci < 60) {
    tevtaAlternatives.push({ title: 'Diploma in Solar PV System Installation', duration: '3 Months', institute: 'TEVTA VTI', stipend: 'PKR 2,500/mo' });
    tevtaAlternatives.push({ title: 'Industrial Automation & Robotics', duration: '6 Months', institute: 'GCT Technical College', stipend: 'PKR 3,000/mo' });
    tevtaAlternatives.push({ title: 'Computerized Building Electrician', duration: '6 Months', institute: 'TEVTA TTC', stipend: 'PKR 2,500/mo' });
  }

  const riasec = String(req.body.riasec || '').toUpperCase().match(/[RIASEC]/)?.[0] || '';
  const clusterName: Record<string, string> = { R: 'Realistic', I: 'Investigative', A: 'Artistic', S: 'Social', E: 'Enterprising', C: 'Conventional' };
  const quizStream: Record<string, string> = {
    I: 'FSc Pre-Medical', R: 'FSc Pre-Engineering', A: 'FA / Humanities',
    S: 'FA / Humanities', E: 'ICOM / BBA / CA Foundation', C: 'ICOM / BBA / CA Foundation',
  };
  if (riasec && quizStream[riasec]) {
    const label = quizStream[riasec];
    const note = `Your ${clusterName[riasec]} quiz result points here, together with your marks.`;
    const hit = streams.find((row) => String(row.stream).toLowerCase().includes(label.split(' ')[0].toLowerCase()));
    if (hit) {
      hit.details = `${note} ${hit.details}`;
      streams.sort((a, b) => (a === hit ? -1 : b === hit ? 1 : 0));
    } else if (pct >= 55) {
      streams.unshift({ stream: label, matchScore: 'Quiz + marks', details: note });
    } else {
      warnings.unshift(`${note} Current marks make that FSc stream unrealistic — the vocational route below is the safer plan.`);
    }
  }

  res.json({
    pct, board: biseBoard, riasec: riasec || null, cluster: clusterName[riasec] || null,
    recommendedStreams: streams, allPaths, strongSubjects, weakSubjects,
    thresholdNote: 'Strong means 70% or above. Weak means under 55%, below a typical BISE comfort band.',
    warnings, tevtaAlternatives,
  });
});

app.post('/api/calculate-transnational', (req, res) => {
  const { oLevelGrades = [], aLevelGrades = [] } = req.body;
  
  const gradePoints: Record<string, number> = {
    'A*': 90, 'A': 85, 'B': 75, 'C': 65, 'D': 55, 'E': 45
  };

  let totalPts = 0;
  let count = 0;

  [...oLevelGrades, ...aLevelGrades].forEach((g: string) => {
    const uppercase = String(g).toUpperCase().trim();
    if (gradePoints[uppercase]) {
      totalPts += gradePoints[uppercase];
      count += 1;
    }
  });

  const equivalencyPct = count > 0 ? Math.round(totalPts / count) : 75;

  const eligiblePrograms: string[] = [];
  if (equivalencyPct >= 80) {
    eligiblePrograms.push('BS Computer Science (FAST, NUST, LUMS, COMSATS)');
    eligiblePrograms.push('BBA / BSc Economics (LUMS, IBA, NUST)');
    eligiblePrograms.push('BA-LL.B International Law (LUMS, TMUC)');
  } else if (equivalencyPct >= 65) {
    eligiblePrograms.push('BS Software Engineering / Cyber Security (Air Uni, Bahria)');
    eligiblePrograms.push('BBA & Accounting & Finance (SZABIST, CUST)');
    eligiblePrograms.push('Dual Degree Foreign Qualifications (UOL International)');
  } else {
    eligiblePrograms.push('Higher National Diploma (HND Pearson BTEC)');
    eligiblePrograms.push('International Foundation Year (IFY)');
  }

  res.json({ equivalencyPct, subjectsCalculated: count, eligiblePrograms });
});

app.post('/api/calculate-fsc', (req, res) => {
  res.json(personalizedCareerMatches(req.body || {}));
});

app.post('/api/recommendations', (req, res) => {
  res.json(personalizedCareerMatches(req.body || {}));
});

app.post('/api/scholarships/match', async (req, res) => {
  const profile = req.body || {};
  let pool_: any[] = CURATED_SCHOLARSHIPS;
  try {
    await ensureSampleSchema();
    const { rows } = await pool.query(`SELECT id, name AS title, provider, description, province, category, coverage AS "awardAmountPkr",
        max_family_income AS "maxFamilyIncomePkr", min_academic_pct AS "minAcademicPct", deadline, deadline_note AS "deadlineNote",
        application_url AS "applicationUrl", education_levels, is_sample AS "isSample" FROM scholarships ORDER BY name`);
    if (rows.length) pool_ = rows.map((r: any) => ({ ...r, degree_levels: r.education_levels || [] }));
  } catch { /* fall back to the built-in list */ }
  const income = Math.max(0, Number(profile.familyMonthlyIncomePkr) || 0);
  const academicPct = Math.max(0, Number(profile.academicPct ?? profile.fscPct ?? profile.matricPct) || 0);
  const province = String(profile.province || profile.city || '').toLowerCase();
  const grade = String(profile.gradeLevel || profile.degreeLevel || '').toLowerCase();
  const matches = pool_.map((scholarship: any, index: number) => {
    const incomeLimit = Number(scholarship.max_family_income ?? scholarship.maxFamilyIncomePkr) || 0;
    const minAcademic = Number(scholarship.min_academic_pct ?? scholarship.minAcademicPct) || 0;
    const allowedProvinces = String(scholarship.province || 'Federal / All Provinces').toLowerCase();
    const levels = (scholarship.degree_levels || scholarship.eligibleGrades || []) as string[];
    const incomeFit = !incomeLimit || income <= incomeLimit;
    const academicFit = !minAcademic || academicPct >= minAcademic;
    const provinceFit = !province || allowedProvinces.includes('all provinces') || allowedProvinces.includes('federal') || allowedProvinces.includes(province);
    const levelFit = !grade || !levels.length || levels.some((level) => level.toLowerCase().includes(grade) || grade.includes(level.toLowerCase()));
    const eligibilityScore = (incomeFit ? 35 : 0) + (academicFit ? 30 : 0) + (provinceFit ? 20 : 0) + (levelFit ? 15 : 0);
    return {
      ...scholarship,
      id: scholarship.id || `scholarship-${index + 1}`,
      title: scholarship.title || scholarship.name,
      awardAmountPkr: scholarship.awardAmountPkr || scholarship.coverage,
      applicationUrl: scholarship.applicationUrl || scholarship.application_url,
      eligibilityScore,
      eligibility: eligibilityScore >= 80 ? 'Likely eligible' : eligibilityScore >= 50 ? 'Review requirements' : 'Not currently eligible',
      checks: { incomeFit, academicFit, provinceFit, levelFit },
    };
  }).sort((a, b) => b.eligibilityScore - a.eligibilityScore);
  res.json({ count: matches.length, data: matches });
});

const translateLimiter = rateLimit({ windowMs: 60 * 1000, max: 120, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many translation requests. Please slow down.' } });

// UI translation (English → Urdu) with a shared database cache, so every string
// is sent to the AI model only once for all users.
let translationCacheReady: Promise<void> | null = null;
function ensureTranslationCache(): Promise<void> {
  if (!translationCacheReady) {
    translationCacheReady = pool.query(`
      CREATE TABLE IF NOT EXISTS translation_cache (
        id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        source_text      TEXT        NOT NULL,
        source_language  VARCHAR(10) NOT NULL,
        target_language  VARCHAR(10) NOT NULL,
        translated_text  TEXT        NOT NULL,
        char_count       INTEGER     DEFAULT 0,
        created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE UNIQUE INDEX IF NOT EXISTS translation_cache_lookup ON translation_cache (source_text, source_language, target_language);
    `).then(() => undefined).catch((err) => { translationCacheReady = null; throw err; });
  }
  return translationCacheReady;
}

const URDU_PROMPT = `You translate the interface of NexStep, a career and education guidance website for students in Pakistan, from English into natural, simple Urdu (اردو script) as used in Pakistan.
Rules:
- Keep unchanged: NexStep, acronyms and exam/board names (MDCAT, ECAT, NET, NUST, FAST, HEC, IBCC, FBISE, BISE, PEC, NTS, TEVTA, NAVTTC, DAE, FSc, ICS, ICom, FA, BS, MS, CS, AI, IELTS, CSS, PKR, O-Levels, A-Levels), numbers, URLs, emails, and placeholders like {name} or %s.
- Short labels (buttons, menu items) must stay short.
- Return ONLY a JSON array of strings: same length and order as the input. No explanations.`;

async function translateToUrdu(texts: string[]): Promise<string[]> {
  const raw = await generateGeminiContent(`${URDU_PROMPT}\n\nInput:\n${JSON.stringify(texts)}`);
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  const parsed = JSON.parse(cleaned);
  if (!Array.isArray(parsed) || parsed.length !== texts.length) throw new Error('Unexpected translation format');
  return parsed.map((t: unknown, i: number) => (typeof t === 'string' && t.trim() ? t : texts[i]));
}

app.post('/api/translate', translateLimiter, async (req, res) => {
  try {
    const { text, texts, targetLang = 'ur' } = req.body ?? {};
    const single = typeof text === 'string';
    const input: string[] = single ? [text] : Array.isArray(texts) ? texts : [];
    if (!input.length) return res.status(400).json({ error: 'text or texts array is required.' });
    if (input.length > 150) return res.status(400).json({ error: 'At most 150 strings per request.' });
    const clean = input.map((t) => String(t ?? '').slice(0, 1000));
    if (targetLang !== 'ur') return res.json(single ? { translatedText: clean[0] } : { translatedTexts: clean });

    await ensureTranslationCache().catch(() => {});
    const unique = [...new Set(clean.filter((t) => t.trim()))];
    const found = new Map<string, string>();
    try {
      const { rows } = await pool.query(
        `SELECT source_text, translated_text FROM translation_cache
          WHERE source_language = 'en' AND target_language = 'ur' AND source_text = ANY($1::text[])`, [unique]);
      for (const r of rows) found.set(r.source_text, r.translated_text);
    } catch { /* cache unavailable */ }

    const misses = unique.filter((t) => !found.has(t));
    let partial = false;
    if (misses.length) {
      if (!geminiEnabled()) { partial = true; console.warn('[translate] AI is not enabled — returning English.'); }
      else {
        for (let i = 0; i < misses.length; i += 40) {
          const chunk = misses.slice(i, i + 40);
          try {
            const out = await translateToUrdu(chunk);
            const vals: any[] = [];
            const rowsSql: string[] = [];
            chunk.forEach((src, j) => {
              found.set(src, out[j]);
              vals.push(src, out[j], src.length);
              rowsSql.push(`($${vals.length - 2}, 'en', 'ur', $${vals.length - 1}, $${vals.length})`);
            });
            await pool.query(
              `INSERT INTO translation_cache (source_text, source_language, target_language, translated_text, char_count)
               VALUES ${rowsSql.join(', ')} ON CONFLICT DO NOTHING`, vals).catch(() => {});
          } catch (err: any) {
            partial = true;
            console.warn('[translate] batch failed:', err?.code || '', String(err?.message || err).slice(0, 300));
            if (err?.code === 'AI_UNAVAILABLE') break;
          }
        }
      }
    }
    const result = clean.map((t) => found.get(t) ?? t);
    return res.json(single ? { translatedText: result[0], partial } : { translatedTexts: result, partial });
  } catch (err: any) {
    res.status(500).json({ error: 'Translation failed.' });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 2 — Authenticated routes
// ══════════════════════════════════════════════════════════════════════════════
// `userRouter` authenticates every request it receives. Limit its mount to
// its actual resource prefixes so unknown public API URLs reach the JSON 404
// handler instead of incorrectly returning an authentication error.
const USER_ROUTE_PREFIX = /^\/(?:profile|bookmarks|applications|quiz-results)(?:\/|$)/;
app.use('/api', (req, res, next) => {
  if (USER_ROUTE_PREFIX.test(req.path)) return userRouter(req, res, next);
  return next();
});
app.use('/api/education', educationRouter);
app.use('/api/mentorship', mentorshipRouter);
app.use('/api/alerts', alertsRouter);
app.use('/api/mock-interviews', mockInterviewRouter);
app.use('/api/roadmap', roadmapRouter);
app.use('/api/interviews', interviewsRouter);
app.use('/api/conversations', conversationsRouter);
app.use('/api/mentor', mentorRouter);
app.use('/api/admin', adminRouter);

// Quick health-check for Gemini — hit GET /api/chat/test to verify the key works
/** Which Gemini connection is in use (no secrets). ?recheck=1 tries again (at most once a minute). */
let aiRecheckAt = 0;
app.get('/api/ai/status', requireAuth(), async (req, res) => {
  if (req.query.recheck && _GEMINI_KEY_PRESENT && Date.now() - aiRecheckAt > 60_000) {
    aiRecheckAt = Date.now();
    await probeAi(true);
  }
  res.json({ data: { ...AI_STATUS, keyType: _GEMINI_KEY_PRESENT ? (_IS_GCP_KEY ? 'vertex-express' : 'ai-studio') : null } });
});

app.get('/api/chat/test', requireAdmin, async (_req, res) => {
  if (!_GEMINI_KEY_PRESENT) return res.status(503).json({ ok: false, error: 'GEMINI_API_KEY not set in backend/.env' });
  try {
    const reply = await generateGeminiContent('Say "NexStep AI is working" and nothing else.');
    res.json({ ok: true, reply });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: String(err.message), hint: 'Check your GEMINI_API_KEY, model access, and Gemini free-tier quota.' });
  }
});

app.post('/api/chat', requireAuth(), aiLimiter, async (req, res) => {
  const { message, conversationId, language = 'en', profile: clientProfile, history = [] } = req.body;
  if (!message?.trim()) return res.status(400).json({ error: 'message is required.' });
  if (message.trim().length > 4000) return res.status(413).json({ error: 'message must be 4000 characters or fewer.' });

  // Check Gemini runtime status (will attempt Gemini if ready, otherwise uses NexStep Counselor Engine)
  const isGeminiReady = geminiEnabled();

  let conversation: any;
  try {
    conversation = conversationId ? await queryOne<any>(
      'SELECT id FROM ai_conversations WHERE id=$1 AND user_id=$2',
      [conversationId, req.user!.id]
    ) : null;
    if (conversationId && !conversation) return res.status(404).json({ error: 'Conversation not found.' });
    if (!conversation) {
      conversation = await queryOne<any>(
        'INSERT INTO ai_conversations (user_id, title) VALUES ($1,$2) RETURNING id',
        [req.user!.id, message.trim().slice(0, 80)]
      );
    }
  } catch (err: any) {
    console.error('[/api/chat] Conversation database error:', err.message);
    return res.status(503).json({ error: 'Conversation storage is temporarily unavailable.', code: 'DATABASE_UNAVAILABLE' });
  }

  try {
    const storedProfile = await queryOne<any>(
      `SELECT p.*, u.first_name, u.last_name, u.email
       FROM profiles p JOIN users u ON u.id=p.user_id WHERE p.user_id=$1`,
      [req.user!.id]
    );
    const storedSkills = await query<any>(
      'SELECT name, level, category FROM user_skills WHERE user_id=$1 ORDER BY created_at LIMIT 100',
      [req.user!.id]
    );
    const profile = storedProfile ? {
      name: `${storedProfile.first_name || ''} ${storedProfile.last_name || ''}`.trim(),
      city: storedProfile.city,
      province: storedProfile.province,
      gradeLevel: storedProfile.grade_level,
      preferredStream: storedProfile.preferred_stream,
      topRiasecCluster: storedProfile.top_riasec_cluster,
      targetCareer: storedProfile.target_career,
      goals: storedProfile.goals,
      budgetAnnualPkr: storedProfile.budget_annual_pkr,
      familyMonthlyIncomePkr: storedProfile.family_monthly_income_pkr,
      certifications: storedProfile.certifications || [],
      skills: storedSkills,
      marks: {
        matricPct: storedProfile.matric_pct,
        fscPct: storedProfile.fsc_pct,
        entryTestScore: storedProfile.entry_test_score,
      },
    } : clientProfile;

    const priorRows = await query<{ role: string; content: string }>(
      'SELECT role, content FROM ai_messages WHERE conversation_id=$1 ORDER BY created_at DESC LIMIT 8',
      [conversation.id]
    );
    const savedHistory = [...priorRows].reverse();

    await query(
      'INSERT INTO ai_messages (conversation_id, role, content) VALUES ($1,$2,$3)',
      [conversation.id, 'user', message.trim()]
    );

    let ctx = '';
    if (profile) {
      const p = profile;
      const marks = p.marks || {};
      const skills = Array.isArray(p.skills) && p.skills.length ? `Skills: ${p.skills.map((x: any) => (typeof x === 'string' ? x : x?.name)).filter(Boolean).join(', ')}.` : 'No skills listed yet.';
      const certs = Array.isArray(p.certifications) && p.certifications.length ? `Certifications: ${p.certifications.join(', ')}.` : '';
      const goals = p.goals ? `Goals: ${p.goals}.` : '';
      const targetCareer = p.targetCareer ? `Target Career: ${p.targetCareer}.` : '';
      ctx = `
══════════ CURRENT STUDENT PROFILE ══════════
Name:               ${p.name || 'Not provided'}
City / Province:    ${[p.city, p.province].filter(Boolean).join(', ') || 'Not provided'}
Grade Level:        ${p.gradeLevel || 'Not specified'}
Stream:             ${p.preferredStream || 'Not selected'}
Matric %:           ${marks.matricPct ?? 'N/A'}%
FSc %:              ${marks.fscPct ?? 'N/A'}%
Entry Test Score:   ${marks.entryTestScore ?? 'N/A'}
RIASEC Cluster:     ${p.topRiasecCluster || 'Not taken yet'}
${targetCareer}
${skills}
${certs}
${goals}
Budget (annual):    PKR ${Number(p.budgetAnnualPkr || 0).toLocaleString()}
Family Income/mo:   PKR ${Number(p.familyMonthlyIncomePkr || 0).toLocaleString()}
══════════════════════════════════════════════
Use this profile to give personalised, specific advice. Reference actual numbers.
If marks are low (<55%), emphasise DAE, TEVTA, and vocational paths encouragingly.
If RIASEC is not taken, recommend taking the quiz on NexStep.
`;
    }
    const clientHistory = Array.isArray(history) ? history.slice(-8) : [];
    const boundedHistory = (savedHistory.length ? savedHistory : clientHistory).slice(-8);
    const historyBlock = boundedHistory.length
      ? '\n══════════ RECENT CONVERSATION ══════════\n' +
        boundedHistory.map((m: any) => `${m.role === 'user' ? 'STUDENT' : 'NEXSTEP AI'}: ${String(m.content || '').slice(0, 4000)}`).join('\n') +
        '\n══════════════════════════════════════════\n'
      : '';
    const langInstruction = language === 'ur'
      ? 'IMPORTANT: Respond ENTIRELY in natural, fluent Urdu script (اردو). Do NOT use English sentences. Keep technical acronyms (MDCAT, ECAT, NUST, HEC, TEVTA, PEEF) in their original form.'
      : 'Respond in clear, friendly English. Be concise but thorough. Use bullet points for lists.';
    const fullPrompt = `${KNOWLEDGE_BASE_SYSTEM_PROMPT}\n${ctx}${historyBlock}\n${langInstruction}\n\nSTUDENT QUESTION: ${message.trim()}\n\nNEXSTEP AI ANSWER:`;
    let reply = '';
    let source = 'nexstep-counselor-engine';

    if (isGeminiReady) {
      try {
        reply = await generateGeminiContent(fullPrompt);
        if (reply?.trim()) {
          source = 'gemini';
        }
      } catch (gemErr: any) {
        console.warn(`  [AI Counselor] Live Gemini call notice: ${gemErr.message?.slice(0, 100)}. Falling back seamlessly to NexStep Expert Counselor Engine.`);
      }
    }

    if (!reply?.trim()) {
      reply = generateCounselingResponse(message, profile, boundedHistory, language);
      source = 'nexstep-counselor-engine';
    }

    await query(
      'INSERT INTO ai_messages (conversation_id, role, content) VALUES ($1,$2,$3)',
      [conversation.id, 'assistant', reply.trim()]
    );
    await query('UPDATE ai_conversations SET updated_at=NOW() WHERE id=$1', [conversation.id]);

    return res.json({
      success: true,
      reply: reply.trim(),
      message: reply.trim(),
      language,
      sources: [],
      conversationId: conversation.id,
      source,
    });
  } catch (err: any) {
    console.error('[/api/chat] Error handling chat message:', err.message);
    const fallbackReply = generateCounselingResponse(message, clientProfile || {}, history, language);
    return res.json({
      success: true,
      reply: fallbackReply,
      message: fallbackReply,
      language,
      sources: [],
      conversationId: conversation?.id || 'temp',
      source: 'nexstep-counselor-engine',
    });
  }
});

app.get('/api/analytics', requireAdmin, async (_req, res) => {
  const count = async (sql: string) => {
    try { const r = await pool.query(sql); return parseInt(r.rows[0]?.count || '0', 10); } catch { return 0; }
  };
  res.json({
    totalStudentsGuided: await count("SELECT COUNT(*) FROM users WHERE role = 'STUDENT'"),
    activeUniversitiesCount: await count('SELECT COUNT(*) FROM universities'),
    activeScholarshipsCount: await count('SELECT COUNT(*) FROM scholarships'),
    tevtaCoursesCount: await count('SELECT COUNT(*) FROM courses'),
    entryTestsCount: ENTRY_TESTS_DATA.length,
  });
});

app.post('/api/interview/evaluate', requireAuth(), aiLimiter, async (req, res) => {
  try {
    if (!geminiEnabled()) return sendAiUnavailable(res);
    const { question, answer, category = 'General', difficulty = 'Medium', profile } = req.body;
    if (!question) return res.status(400).json({ error: 'question is required.' });
    if (!answer || answer.trim().length < 5)
      return res.status(400).json({ error: 'answer is required (min 5 chars).', isValid: false });
    const ctx = profile ? `CANDIDATE: ${profile.name}, ${profile.preferredStream}` : '';
    const prompt = `You are an expert interview coach for Pakistani students.\n${ctx}\nCategory: ${category}, Difficulty: ${difficulty}\nQuestion: "${question}"\nAnswer: "${answer}"\n\nReturn ONLY valid JSON (no markdown):\n{"score":<0-100>,"relevance":<0-100>,"clarity":<0-100>,"completeness":<0-100>,"strengths":["<s1>","<s2>"],"weaknesses":["<w1>","<w2>"],"feedback":"<2-3 sentences>","suggestedTopics":["<t1>","<t2>"],"improvedAnswer":"<one improvement>"}\n\nRules: 80-100=specific+examples, 60-79=adequate, 40-59=partial, 0-39=off-topic. Cap under-20-word answers at 55.`;
    const raw = (await generateGeminiContent(prompt)).trim()
      .replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
    let ev: any;
    try { ev = JSON.parse(raw); } catch {
      return res.status(502).json({ error: 'AI returned unparseable response. Please try again.' });
    }
    const score = Math.max(0, Math.min(100, Number(ev.score) || 0));
    res.json({
      score,
      relevance: Math.max(0, Math.min(100, Number(ev.relevance) || score)),
      clarity: Math.max(0, Math.min(100, Number(ev.clarity) || score)),
      completeness: Math.max(0, Math.min(100, Number(ev.completeness) || score)),
      strengths: Array.isArray(ev.strengths) ? ev.strengths.slice(0, 3) : ['Answer submitted'],
      weaknesses: Array.isArray(ev.weaknesses) ? ev.weaknesses.slice(0, 3) : ['Could not evaluate'],
      feedback: typeof ev.feedback === 'string' ? ev.feedback : 'Evaluation complete.',
      suggestedTopics: Array.isArray(ev.suggestedTopics) ? ev.suggestedTopics.slice(0, 3) : [],
      improvedAnswer: typeof ev.improvedAnswer === 'string' ? ev.improvedAnswer : '',
      isValid: true,
    });
  } catch (err: any) {
    if (err.code === 'AI_UNAVAILABLE') return sendAiUnavailable(res);
    res.status(500).json({ error: 'Interview evaluation failed.', details: err.message });
  }
});

app.post('/api/career/explain', requireAuth(), aiLimiter, async (req, res) => {
  try {
    if (!geminiEnabled()) return sendAiUnavailable(res);
    const { careerTitle, matchScore, factors, explanation, profile } = req.body;
    if (!careerTitle) return res.status(400).json({ error: 'careerTitle is required.' });
    const prompt = `You are NexStep AI, career counselor for Pakistani students.\nStudent: ${profile?.name}, ${profile?.preferredStream}, Matric ${profile?.marks?.matricPct}%, FSc ${profile?.marks?.fscPct}%\nSkills: ${explanation?.matchingSkills?.join(', ') || 'none'}\nMissing: ${explanation?.missingSkills?.join(', ') || 'none'}\nCareer: ${careerTitle}, Score: ${matchScore}/100\nRIASEC: ${factors?.riasecScore}/30, Stream: ${factors?.streamScore}/25, Skills: ${factors?.skillsScore}/25, Marks: ${factors?.marksScore}/10, Demand: ${factors?.demandScore}/10\n\nReturn ONLY valid JSON:\n{"whyThisCareer":"<2-3 sentences>","personalStrengths":["<s1>","<s2>","<s3>"],"developmentAreas":["<d1>","<d2>"],"nextSteps":["<n1>","<n2>","<n3>"],"alternativeCareers":["<a1>","<a2>"],"pakistanSpecificAdvice":"<1-2 sentences>","estimatedTimeToEntry":"<e.g. 2-3 years after FSc>"}`;
    const raw = (await generateGeminiContent(prompt)).trim()
      .replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
    let result: any;
    try { result = JSON.parse(raw); } catch {
      return res.status(502).json({ error: 'AI returned unparseable response.' });
    }
    res.json({
      whyThisCareer: result.whyThisCareer || '',
      personalStrengths: Array.isArray(result.personalStrengths) ? result.personalStrengths : [],
      developmentAreas: Array.isArray(result.developmentAreas) ? result.developmentAreas : [],
      nextSteps: Array.isArray(result.nextSteps) ? result.nextSteps : [],
      alternativeCareers: Array.isArray(result.alternativeCareers) ? result.alternativeCareers : [],
      pakistanSpecificAdvice: result.pakistanSpecificAdvice || '',
      estimatedTimeToEntry: result.estimatedTimeToEntry || '',
    });
  } catch (err: any) {
    if (err.code === 'AI_UNAVAILABLE') return sendAiUnavailable(res);
    res.status(500).json({ error: 'Career explanation failed.', details: err.message });
  }
});

app.use('/api/feedback', feedbackRouter);
app.use('/api/translate', translationRouter);
app.use('/api', entryTestsRouter);
app.use('/api', publicDataRouter);
app.use('/api', usageRouter);

// Keep unknown API routes as JSON. This prevents the production SPA fallback
// from returning HTML to a client that expects an API response.
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'API route not found.', code: 'API_NOT_FOUND' });
});

// ── Production static frontend (optional combined deploy) ─────────────────────
if (process.env.NODE_ENV === 'production') {
  const distPath = path.resolve(__dirname, '..', 'frontend', 'dist');
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }
}

// This must be registered after every route so errors from every router share
// the same safe response shape.
app.use((err: any, _req: any, res: any, _next: any) => {
  const isProd = process.env.NODE_ENV === 'production';
  console.error(`[${new Date().toISOString()}] Unhandled error:`, err.message);
  res.status(err.status || 500).json({
    error: isProd ? 'An unexpected error occurred. Please try again.' : err.message || 'Internal server error',
    code: err.code || 'INTERNAL_ERROR',
  });
});

app.listen(PORT, '0.0.0.0', async () => {
  console.log(`\n  NexStep Backend running`);
  console.log(`  API: http://localhost:${PORT}`);
  console.log(`  Health: http://localhost:${PORT}/api/health`);
  console.log(`  Gemini test: http://localhost:${PORT}/api/chat/test`);
  if (!_GEMINI_KEY_PRESENT) {
    console.warn('\n  ⚠️  GEMINI_API_KEY is not set — AI features use the offline answers.');
    console.warn('  Get a free key at https://aistudio.google.com/apikey and add it to backend/.env\n');
  } else {
    console.log(`  AI: key found (${_IS_GCP_KEY ? 'Vertex AI express-mode style' : 'AI Studio style'}) — checking which Gemini model works…`);
    probeAi(true).catch(() => {});
  }
  startBackgroundScheduler(pool);
});
