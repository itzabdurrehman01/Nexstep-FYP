/**
 * education.routes.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Education level (Pakistani system) for each student, automatic promotion to
 * the next class, level-tagged content and the admin content manager.
 *
 * Levels: class8 → class9 → class10 → class11 → class12 → university
 *         dae (3-year diploma) → university
 *
 * Promotion rule (agreed with the product owner):
 *   - A student moves to the next level one year after their current class
 *     started (three years for DAE), OR on a promotion date they choose.
 *   - A chosen promotion date must be at least 10 months after the class started.
 *   - Promotion is applied automatically the next time the profile is loaded.
 *
 *   GET  /api/education            → current level state (applies due promotions)
 *   PUT  /api/education            → { level, stream?, startedAt, promotionDate? }
 *   POST /api/education/ack        → dismiss the "you were promoted" banner
 *
 *   Admin (mounted on the protected /api/admin router):
 *   GET    /content/:type            type = universities | scholarships | courses | jobs
 *   POST   /content/:type
 *   PUT    /content/:type/:id
 *   DELETE /content/:type/:id
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { Router, Request, Response } from 'express';
import { pool, query, queryOne } from './db.js';
import { requireAuth } from './auth.middleware.js';

// ── Levels ───────────────────────────────────────────────────────────────────
export const EDUCATION_LEVELS = ['class8', 'class9', 'class10', 'class11', 'class12', 'dae', 'university'] as const;
export type EducationLevel = typeof EDUCATION_LEVELS[number];

const LEVEL_INFO: Record<EducationLevel, { label: string; next: EducationLevel | null; months: number }> = {
  class8:     { label: 'Class 8',                         next: 'class9',     months: 12 },
  class9:     { label: 'Class 9 (Matric Part I)',         next: 'class10',    months: 12 },
  class10:    { label: 'Class 10 (Matric Part II)',       next: 'class11',    months: 12 },
  class11:    { label: 'Class 11 (Inter Part I)',         next: 'class12',    months: 12 },
  class12:    { label: 'Class 12 (Inter Part II)',        next: 'university', months: 12 },
  dae:        { label: 'DAE / Polytechnic',               next: 'university', months: 36 },
  university: { label: 'University (BS)',                 next: null,         months: 0 },
};

/** Groups / streams a student can pick at each level (empty = free text or none). */
export const LEVEL_STREAMS: Record<EducationLevel, string[]> = {
  class8: ['Science (Biology)', 'Science (Computer Science)', 'Humanities / Arts', 'Technical'],
  class9: ['Science (Biology)', 'Science (Computer Science)', 'Humanities / Arts', 'Technical', 'O-Levels'],
  class10: ['Science (Biology)', 'Science (Computer Science)', 'Humanities / Arts', 'Technical', 'O-Levels'],
  class11: ['FSc Pre-Medical', 'FSc Pre-Engineering', 'ICS', 'ICom', 'FA / Humanities', 'A-Levels'],
  class12: ['FSc Pre-Medical', 'FSc Pre-Engineering', 'ICS', 'ICom', 'FA / Humanities', 'A-Levels'],
  dae: ['Civil', 'Electrical', 'Mechanical', 'Computer / IT', 'Electronics'],
  university: ['Computer Science', 'Engineering', 'Medical / Health', 'Business', 'Arts / Social Sciences'],
};

const MIN_PROMOTION_MONTHS = 10;
export const isLevel = (v: unknown): v is EducationLevel => (EDUCATION_LEVELS as readonly string[]).includes(String(v));

const STREAM_ALIASES: Record<string, string> = {
  'pre_medical': 'FSc Pre-Medical',
  'pre-medical': 'FSc Pre-Medical',
  'pre medical': 'FSc Pre-Medical',
  'fsc pre-medical': 'FSc Pre-Medical',
  'pre_engineering': 'FSc Pre-Engineering',
  'pre-engineering': 'FSc Pre-Engineering',
  'ics (comp sci)': 'ICS',
  'ics (computer science)': 'ICS',
  'commerce': 'ICom',
  'icom (commerce)': 'ICom',
  'arts/fa': 'FA / Humanities',
  'arts': 'FA / Humanities',
  fa: 'FA / Humanities',
  'science_bio': 'Science (Biology)',
  'science (biology)': 'Science (Biology)',
  'science_cs': 'Science (Computer Science)',
  'science (computer)': 'Science (Computer Science)',
  'science (computer science)': 'Science (Computer Science)',
};

function canonicalizeStream(value: unknown, level: EducationLevel): string | null {
  if (value == null || value === '') return null;
  const raw = String(value).trim().slice(0, 80);
  const alias = STREAM_ALIASES[raw.toLowerCase()] || raw;
  const listed = LEVEL_STREAMS[level] || [];
  if (!listed.length) return alias;
  return listed.find((s) => s === alias || s.toLowerCase() === alias.toLowerCase() || s.toLowerCase() === raw.toLowerCase()) || null;
}

// ── Schema ───────────────────────────────────────────────────────────────────
let schemaReady: Promise<void> | null = null;
export function ensureEducationSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      await pool.query(`
        ALTER TABLE profiles ADD COLUMN IF NOT EXISTS education_level   VARCHAR(20);
        ALTER TABLE profiles ADD COLUMN IF NOT EXISTS education_stream  VARCHAR(80);
        ALTER TABLE profiles ADD COLUMN IF NOT EXISTS level_started_at  DATE;
        ALTER TABLE profiles ADD COLUMN IF NOT EXISTS promotion_date    DATE;
        ALTER TABLE profiles ADD COLUMN IF NOT EXISTS promoted_from     VARCHAR(20);
        ALTER TABLE profiles ADD COLUMN IF NOT EXISTS institution       VARCHAR(200);
        ALTER TABLE universities ADD COLUMN IF NOT EXISTS education_levels TEXT[] NOT NULL DEFAULT '{}';
        ALTER TABLE scholarships ADD COLUMN IF NOT EXISTS education_levels TEXT[] NOT NULL DEFAULT '{}';
        ALTER TABLE courses      ADD COLUMN IF NOT EXISTS education_levels TEXT[] NOT NULL DEFAULT '{}';
        ALTER TABLE jobs         ADD COLUMN IF NOT EXISTS education_levels TEXT[] NOT NULL DEFAULT '{}';
        ALTER TABLE careers      ADD COLUMN IF NOT EXISTS education_levels TEXT[] NOT NULL DEFAULT '{}';
        ALTER TABLE careers      ADD COLUMN IF NOT EXISTS category  VARCHAR(80);
        ALTER TABLE careers      ADD COLUMN IF NOT EXISTS streams   JSONB NOT NULL DEFAULT '[]';
        ALTER TABLE careers      ADD COLUMN IF NOT EXISTS degrees   JSONB NOT NULL DEFAULT '[]';
        ALTER TABLE careers      ADD COLUMN IF NOT EXISTS pathway   TEXT;
        ALTER TABLE universities ADD COLUMN IF NOT EXISTS merit_cutoff_pct NUMERIC(5,2);
        ALTER TABLE universities ADD COLUMN IF NOT EXISTS has_hostel BOOLEAN;
        ALTER TABLE universities ADD COLUMN IF NOT EXISTS description TEXT;
        ALTER TABLE scholarships ADD COLUMN IF NOT EXISTS min_academic_pct INTEGER;
        ALTER TABLE universities ADD COLUMN IF NOT EXISTS verified_year INTEGER;
        ALTER TABLE scholarships ADD COLUMN IF NOT EXISTS verified_year INTEGER;
      `);
    })().catch((err) => { schemaReady = null; throw err; });
  }
  return schemaReady;
}

// ── Date helpers (all dates are calendar dates, YYYY-MM-DD) ─────────────────
const toDate = (v: unknown): Date | null => {
  if (!v) return null;
  const d = v instanceof Date ? new Date(v) : new Date(String(v).slice(0, 10) + 'T00:00:00Z');
  return isNaN(d.getTime()) ? null : d;
};
const iso = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);
const addMonths = (d: Date, m: number) => { const r = new Date(d); r.setUTCMonth(r.getUTCMonth() + m); return r; };
const today = () => { const n = new Date(); return new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate())); };

function effectivePromotion(level: EducationLevel, startedAt: Date | null, chosen: Date | null): Date | null {
  const info = LEVEL_INFO[level];
  if (!info.next || !startedAt) return null;
  return chosen ?? addMonths(startedAt, info.months);
}

export interface EducationState {
  level: EducationLevel | null;
  levelLabel: string | null;
  stream: string | null;
  institution: string | null;
  startedAt: string | null;
  promotionDate: string | null;     // effective date of the next promotion
  customPromotionDate: boolean;
  nextLevel: EducationLevel | null;
  nextLevelLabel: string | null;
  promotedFrom: EducationLevel | null;
  promotedFromLabel: string | null;
  needsStream: boolean;             // e.g. just moved from Matric to Inter: pick an Inter group
}

function toState(row: any): EducationState {
  const level = isLevel(row?.education_level) ? row.education_level : null;
  const started = toDate(row?.level_started_at);
  const chosen = toDate(row?.promotion_date);
  const promo = level ? effectivePromotion(level, started, chosen) : null;
  const next = level ? LEVEL_INFO[level].next : null;
  const from = isLevel(row?.promoted_from) ? row.promoted_from : null;
  return {
    level,
    levelLabel: level ? LEVEL_INFO[level].label : null,
    stream: row?.education_stream || row?.preferred_stream || null,
    institution: row?.institution || null,
    startedAt: iso(started),
    promotionDate: iso(promo),
    customPromotionDate: Boolean(chosen),
    nextLevel: next,
    nextLevelLabel: next ? LEVEL_INFO[next].label : null,
    promotedFrom: from,
    promotedFromLabel: from ? LEVEL_INFO[from].label : null,
    needsStream: Boolean(level && LEVEL_STREAMS[level].length && !(row?.education_stream || row?.preferred_stream)),
  };
}

/** Moves the student up as many levels as are due, then returns their state. */
export async function loadEducation(userId: string): Promise<EducationState> {
  await ensureEducationSchema();
  let row = await queryOne<any>(
    `SELECT education_level, education_stream, preferred_stream, institution, level_started_at, promotion_date, promoted_from FROM profiles WHERE user_id = $1`,
    [userId]);
  if (!row || !isLevel(row.education_level)) return toState(row);

  let level: EducationLevel = row.education_level;
  let started = toDate(row.level_started_at);
  let chosen = toDate(row.promotion_date);
  let stream: string | null = row.education_stream || row.preferred_stream;
  const original = level;
  const now = today();

  for (let guard = 0; guard < 8; guard++) {
    const due = effectivePromotion(level, started, chosen);
    if (!due || due > now) break;
    const next = LEVEL_INFO[level].next!;
    // Matric → Inter and Inter/DAE → university need a new group / programme.
    const keepStream = (level === 'class9' && next === 'class10') || (level === 'class11' && next === 'class12');
    if (!keepStream) stream = null;
    level = next;
    started = due;
    chosen = null;
  }

  if (level !== original) {
    row = await queryOne<any>(
      `UPDATE profiles
          SET education_level = $2, education_stream = $3, preferred_stream = $3, level_started_at = $4, promotion_date = NULL,
              promoted_from = $5, grade_level = $6, updated_at = NOW()
        WHERE user_id = $1
        RETURNING education_level, education_stream, preferred_stream, institution, level_started_at, promotion_date, promoted_from`,
      [userId, level, stream, iso(started), original, LEVEL_INFO[level].label]);
  }
  return toState(row);
}

/** Level used to filter public listings: ?level=… or the signed-in student's level. */
export async function requestLevel(req: Request): Promise<EducationLevel | null> {
  const q = String(req.query.level ?? '').trim();
  if (q === 'all') return null;
  if (isLevel(q)) return q;
  if (!req.user?.id || req.user.role !== 'STUDENT') return null;
  try {
    const row = await queryOne<any>(`SELECT education_level FROM profiles WHERE user_id = $1`, [req.user.id]);
    return isLevel(row?.education_level) ? row.education_level : null;
  } catch { return null; }
}

/** SQL fragment: rows with no levels apply to everyone; otherwise the level must be listed. */
export function levelClause(alias: string, params: any[], level: EducationLevel | null): string {
  if (!level) return '';
  params.push(level);
  return ` AND (cardinality(${alias}.education_levels) = 0 OR $${params.length} = ANY(${alias}.education_levels))`;
}

// ── Student routes (/api/education) ──────────────────────────────────────────
export const educationRouter = Router();
educationRouter.use(requireAuth());

educationRouter.get('/', async (req, res) => {
  try {
    res.json({ data: await loadEducation(req.user!.id), levels: EDUCATION_LEVELS.map((id) => ({ id, ...LEVEL_INFO[id], streams: LEVEL_STREAMS[id] })) });
  } catch (err: any) {
    console.error('GET /education', err?.message);
    res.status(500).json({ error: 'Could not load your education level.' });
  }
});

educationRouter.put('/', async (req, res) => {
  try {
    await ensureEducationSchema();
    const { level, stream, startedAt, promotionDate } = req.body ?? {};
    if (!isLevel(level)) return res.status(400).json({ error: 'Choose a valid class or level.' });

    const streams = LEVEL_STREAMS[level];
    const cleanStream = canonicalizeStream(stream, level)
      || (stream ? String(stream).trim().slice(0, 80) : null);
    if (streams.length && !cleanStream)
      return res.status(400).json({ error: 'Choose a group / stream from the list.' });
    const rawInstitution = req.body?.institutionName ?? req.body?.institution;
    const cleanInstitution = rawInstitution == null ? null : String(rawInstitution).trim().slice(0, 200) || null;

    let started = toDate(startedAt) ?? today();
    const now = today();
    if (started > now) started = now;
    const info = LEVEL_INFO[level];
    if (info.next && started < addMonths(now, -info.months)) {
      started = addMonths(now, -info.months);
    }

    let chosen: Date | null = null;
    if (promotionDate) {
      if (!info.next) return res.status(400).json({ error: 'There is no next level to be promoted to.' });
      chosen = toDate(promotionDate);
      if (!chosen) return res.status(400).json({ error: 'Enter a valid promotion date.' });
      const earliest = addMonths(started, MIN_PROMOTION_MONTHS);
      if (chosen < earliest) return res.status(400).json({ error: `The promotion date must be at least ${MIN_PROMOTION_MONTHS} months after the class started (on or after ${iso(earliest)}).` });
      if (chosen > addMonths(started, Math.max(info.months, 12) + 12)) return res.status(400).json({ error: 'That promotion date is too far away.' });
      if (chosen < now) chosen = null;
    }

    const marks = req.body?.marks || {};
    const pct = (v: unknown) => {
      const n = Number(v);
      return Number.isFinite(n) && n >= 0 && n <= 100 ? n : null;
    };
    const matric = pct(marks.matricPct ?? req.body?.matricPct);
    const fsc = pct(marks.fscPct ?? req.body?.fscPct);
    const entry = pct(marks.entryTestScore ?? req.body?.entryTestScore);

    await query(
      `INSERT INTO profiles (user_id, education_level, education_stream, level_started_at, promotion_date, promoted_from, grade_level,
            preferred_stream, matric_pct, fsc_pct, entry_test_score, institution)
       VALUES ($1, $2, $3, $4, $5, NULL, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (user_id) DO UPDATE SET
         education_level = EXCLUDED.education_level, education_stream = EXCLUDED.education_stream,
         level_started_at = EXCLUDED.level_started_at, promotion_date = EXCLUDED.promotion_date,
         promoted_from = NULL, grade_level = EXCLUDED.grade_level,
         preferred_stream = COALESCE(EXCLUDED.preferred_stream, EXCLUDED.education_stream, profiles.preferred_stream),
         matric_pct = COALESCE(EXCLUDED.matric_pct, profiles.matric_pct),
         fsc_pct = COALESCE(EXCLUDED.fsc_pct, profiles.fsc_pct),
         entry_test_score = COALESCE(EXCLUDED.entry_test_score, profiles.entry_test_score),
         institution = COALESCE(EXCLUDED.institution, profiles.institution),
         updated_at = NOW()`,
      [req.user!.id, level, cleanStream, iso(started), iso(chosen), info.label, cleanStream, matric, fsc, entry, cleanInstitution]);
    res.json({ data: await loadEducation(req.user!.id) });
  } catch (err: any) {
    console.error('PUT /education', err?.message);
    res.status(500).json({ error: 'Could not save your education level.' });
  }
});

educationRouter.post('/ack', async (req, res) => {
  await query(`UPDATE profiles SET promoted_from = NULL WHERE user_id = $1`, [req.user!.id]).catch(() => {});
  res.json({ success: true });
});

// ── Admin content manager ────────────────────────────────────────────────────
type FieldKind = 'text' | 'longtext' | 'int' | 'bool' | 'url' | 'date' | 'list' | 'riasec';
interface ContentDef { table: string; order: string; fields: Record<string, { column: string; kind: FieldKind; required?: boolean }>; }

const CONTENT: Record<string, ContentDef> = {
  universities: {
    table: 'universities', order: 'name ASC',
    fields: {
      name:            { column: 'name', kind: 'text', required: true },
      shortName:       { column: 'short_name', kind: 'text' },
      city:            { column: 'city', kind: 'text', required: true },
      province:        { column: 'province', kind: 'text', required: true },
      type:            { column: 'type', kind: 'text' },
      hecRankTier:     { column: 'hec_rank_tier', kind: 'text' },
      isHecRecognized: { column: 'is_hec_recognized', kind: 'bool' },
      annualFeePkr:    { column: 'annual_fee_pkr', kind: 'int' },
      officialWebsite: { column: 'official_website', kind: 'url' },
      admissionsUrl:   { column: 'admissions_url', kind: 'url' },
      programs:        { column: 'programs', kind: 'list' },
      lastMeritCutoffPct: { column: 'merit_cutoff_pct', kind: 'int' },
      hasHostel:       { column: 'has_hostel', kind: 'bool' },
      description:     { column: 'description', kind: 'longtext' },
      verifiedYear:    { column: 'verified_year', kind: 'int' },
    },
  },
  scholarships: {
    table: 'scholarships', order: 'created_at DESC',
    fields: {
      name:            { column: 'name', kind: 'text', required: true },
      provider:        { column: 'provider', kind: 'text', required: true },
      description:     { column: 'description', kind: 'longtext' },
      province:        { column: 'province', kind: 'text' },
      category:        { column: 'category', kind: 'text' },
      coverage:        { column: 'coverage', kind: 'text' },
      amountPkr:       { column: 'amount_pkr', kind: 'int' },
      maxFamilyIncome: { column: 'max_family_income', kind: 'int' },
      deadline:        { column: 'deadline', kind: 'date' },
      applicationUrl:  { column: 'application_url', kind: 'url' },
      officialUrl:     { column: 'official_url', kind: 'url' },
      minAcademicPct:  { column: 'min_academic_pct', kind: 'int' },
      verifiedYear:    { column: 'verified_year', kind: 'int' },
    },
  },
  courses: {
    table: 'courses', order: 'title ASC',
    fields: {
      title:           { column: 'title', kind: 'text', required: true },
      provider:        { column: 'provider', kind: 'text', required: true },
      description:     { column: 'description', kind: 'longtext' },
      skillsCovered:   { column: 'skills_covered', kind: 'list' },
      duration:        { column: 'duration', kind: 'text' },
      format:          { column: 'format', kind: 'text' },
      pricePkr:        { column: 'price_pkr', kind: 'int' },
      enrollmentUrl:   { column: 'enrollment_url', kind: 'url' },
    },
  },
  careers: {
    table: 'careers', order: 'title ASC',
    fields: {
      title:             { column: 'title', kind: 'text', required: true },
      category:          { column: 'category', kind: 'text' },
      riasecCode:        { column: 'riasec_code', kind: 'riasec', required: true },
      description:       { column: 'description', kind: 'longtext' },
      streams:           { column: 'streams', kind: 'list' },
      degrees:           { column: 'degrees', kind: 'list' },
      requiredSkills:    { column: 'required_skills', kind: 'list' },
      pathway:           { column: 'pathway', kind: 'longtext' },
      demandLevel:       { column: 'demand_level', kind: 'text' },
      startingSalaryPkr: { column: 'starting_salary_pkr', kind: 'int' },
      avgSalaryPkr:      { column: 'avg_salary_pkr', kind: 'int' },
    },
  },
  jobs: {
    table: 'jobs', order: 'created_at DESC',
    fields: {
      title:           { column: 'title', kind: 'text', required: true },
      company:         { column: 'company', kind: 'text', required: true },
      description:     { column: 'description', kind: 'longtext' },
      city:            { column: 'city', kind: 'text' },
      province:        { column: 'province', kind: 'text' },
      location:        { column: 'location', kind: 'text' },
      employmentType:  { column: 'employment_type', kind: 'text' },
      experienceLevel: { column: 'experience_level', kind: 'text' },
      requiredSkills:  { column: 'required_skills', kind: 'list' },
      salaryMin:       { column: 'salary_min', kind: 'int' },
      salaryMax:       { column: 'salary_max', kind: 'int' },
      applicationUrl:  { column: 'application_url', kind: 'url' },
      expiresAt:       { column: 'expires_at', kind: 'date' },
    },
  },
};

class ValidationError extends Error {}

function cleanValue(key: string, kind: FieldKind, raw: unknown, required?: boolean): any {
  const empty = raw === undefined || raw === null || (typeof raw === 'string' && raw.trim() === '');
  if (empty) {
    if (required) throw new ValidationError(`${key} is required.`);
    if (kind === 'list') return JSON.stringify([]);
    if (kind === 'bool') return null;
    return null;
  }
  switch (kind) {
    case 'text': return String(raw).trim().slice(0, 255);
    case 'longtext': return String(raw).trim().slice(0, 5000);
    case 'int': {
      const n = Number(raw);
      if (!Number.isFinite(n) || n < 0 || n > 2_000_000_000) throw new ValidationError(`${key} must be a positive number.`);
      return Math.round(n);
    }
    case 'bool': return raw === true || raw === 'true';
    case 'url': {
      const s = String(raw).trim().slice(0, 500);
      if (!/^https?:\/\/[^\s]+$/i.test(s)) throw new ValidationError(`${key} must start with http:// or https://`);
      return s;
    }
    case 'date': {
      const d = toDate(raw);
      if (!d) throw new ValidationError(`${key} must be a valid date.`);
      return iso(d);
    }
    case 'riasec': {
      const code = [...new Set(String(raw).toUpperCase().replace(/[^RIASEC]/g, '').split(''))].join('').slice(0, 3);
      if (!code) throw new ValidationError(`${key} must use the letters R, I, A, S, E, C (e.g. ICR).`);
      return code;
    }
    case 'list': {
      const arr = Array.isArray(raw) ? raw : String(raw).split(/[\n,]/);
      return JSON.stringify(arr.map((x) => String(x).trim()).filter(Boolean).slice(0, 100));
    }
  }
}

function cleanLevels(raw: unknown): string[] {
  const arr = Array.isArray(raw) ? raw : [];
  return [...new Set(arr.map(String).filter(isLevel))];
}

function rowToApi(def: ContentDef, row: any) {
  const out: any = { id: row.id, educationLevels: row.education_levels ?? [], updatedAt: row.updated_at, isSample: row.is_sample === true, lastVerifiedAt: row.last_verified_at || null };
  for (const [key, f] of Object.entries(def.fields)) {
    let v = row[f.column];
    if (f.kind === 'date' && v) v = iso(toDate(v));
    if (f.kind === 'list') v = Array.isArray(v) ? v : [];
    out[key] = v;
  }
  return out;
}

export const adminContentRouter = Router();

adminContentRouter.use('/content/:type', (req, res, next) => {
  if (!CONTENT[req.params.type]) return res.status(404).json({ error: 'Unknown content type.' });
  ensureEducationSchema().then(() => next()).catch(() => res.status(503).json({ error: 'Database not ready.' }));
});

adminContentRouter.get('/content/:type', async (req, res) => {
  const def = CONTENT[req.params.type];
  const params: any[] = [];
  let where = 'WHERE 1=1';
  const search = String(req.query.search ?? '').trim().toLowerCase();
  if (search) {
    const firstText = Object.values(def.fields).find((f) => f.required)!.column;
    params.push(`%${search}%`);
    where += ` AND LOWER(${firstText}) LIKE $${params.length}`;
  }
  const level = String(req.query.level ?? '');
  if (isLevel(level)) where += levelClause(def.table, params, level);
  const rows = await query<any>(`SELECT * FROM ${def.table} ${where} ORDER BY ${def.order} LIMIT 500`, params);
  res.json({ data: rows.map((r) => rowToApi(def, r)) });
});

function buildValues(def: ContentDef, body: any, partial: boolean) {
  const cols: string[] = [];
  const vals: any[] = [];
  for (const [key, f] of Object.entries(def.fields)) {
    if (partial && !(key in body)) continue;
    cols.push(f.column);
    vals.push(cleanValue(key, f.kind, body[key], f.required));
  }
  cols.push('education_levels');
  vals.push(cleanLevels(body.educationLevels));
  if (body.verifiedYear !== undefined && body.verifiedYear !== '' && def.fields.verifiedYear) {
    cols.push('last_verified_at');
    vals.push(new Date());
  }
  return { cols, vals };
}

adminContentRouter.post('/content/:type', async (req, res) => {
  const def = CONTENT[req.params.type];
  try {
    const { cols, vals } = buildValues(def, req.body ?? {}, false);
    const placeholders = vals.map((_, i) => `$${i + 1}`).join(', ');
    const row = await queryOne<any>(`INSERT INTO ${def.table} (${cols.join(', ')}) VALUES (${placeholders}) RETURNING *`, vals);
    res.status(201).json({ data: rowToApi(def, row) });
  } catch (err: any) {
    if (err instanceof ValidationError) return res.status(400).json({ error: err.message });
    console.error('[admin content] create', err?.message);
    res.status(500).json({ error: 'Could not save this item.' });
  }
});

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

adminContentRouter.put('/content/:type/:id', async (req, res) => {
  const def = CONTENT[req.params.type];
  if (!UUID_RE.test(req.params.id)) return res.status(404).json({ error: 'Item not found.' });
  try {
    const { cols, vals } = buildValues(def, req.body ?? {}, false);
    const sets = cols.map((c, i) => `${c} = $${i + 1}`).join(', ');
    vals.push(req.params.id);
    const row = await queryOne<any>(`UPDATE ${def.table} SET ${sets}, updated_at = NOW() WHERE id = $${vals.length} RETURNING *`, vals);
    if (!row) return res.status(404).json({ error: 'Item not found.' });
    res.json({ data: rowToApi(def, row) });
  } catch (err: any) {
    if (err instanceof ValidationError) return res.status(400).json({ error: err.message });
    console.error('[admin content] update', err?.message);
    res.status(500).json({ error: 'Could not save this item.' });
  }
});

adminContentRouter.delete('/content/:type/:id', async (req, res) => {
  const def = CONTENT[req.params.type];
  if (!UUID_RE.test(req.params.id)) return res.status(404).json({ error: 'Item not found.' });
  try {
    const rows = await query<any>(`DELETE FROM ${def.table} WHERE id = $1 RETURNING id`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Item not found.' });
    res.json({ success: true });
  } catch (err: any) {
    console.error('[admin content] delete', err?.message);
    res.status(500).json({ error: 'Could not delete this item.' });
  }
});
