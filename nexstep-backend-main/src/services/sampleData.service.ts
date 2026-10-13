/**
 * sampleData.service.ts — demo content from the scope document.
 *
 * Loads backend/src/data/sample/sampleData.json into the database once:
 *   100 universities, ~60 scholarships, ~50 free courses / certifications,
 *   20 jobs & internships, merit cut-offs per university programme and
 *   entry-test practice MCQs.
 * Every row is tagged is_sample = TRUE so the admin can edit it like real data
 * and remove all of it with one click (Admin → Content → Sample data).
 *
 * Admin (mounted on the protected /api/admin router)
 *   GET    /sample-data     counts of sample rows per table
 *   DELETE /sample-data     remove every sample row
 *   POST   /sample-data     add the sample rows again (skips items that already exist)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Router } from 'express';
import { pool, query, queryOne } from '../routes/db.js';
import { ensureEducationSchema } from '../routes/education.routes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.resolve(__dirname, '../data/sample/sampleData.json');
const SEED_KEY = 'sample_data_v1';
const TABLES = ['universities', 'scholarships', 'courses', 'jobs', 'merit_cutoffs', 'entry_test_questions'] as const;
const ALL_LEVELS = ['class8', 'class9', 'class10', 'class11', 'class12', 'dae', 'university'];

let ready: Promise<void> | null = null;
export function ensureSampleSchema(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await ensureEducationSchema();
      await pool.query(`
        CREATE TABLE IF NOT EXISTS content_seeds (key VARCHAR(80) PRIMARY KEY, seeded_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
        ALTER TABLE universities ADD COLUMN IF NOT EXISTS merit_cutoff_pct NUMERIC(5,2);
        ALTER TABLE universities ADD COLUMN IF NOT EXISTS has_hostel BOOLEAN;
        ALTER TABLE universities ADD COLUMN IF NOT EXISTS description TEXT;
        ALTER TABLE scholarships ADD COLUMN IF NOT EXISTS min_academic_pct INTEGER;
        ALTER TABLE scholarships ADD COLUMN IF NOT EXISTS deadline_note VARCHAR(100);
        ALTER TABLE universities ADD COLUMN IF NOT EXISTS is_sample BOOLEAN NOT NULL DEFAULT FALSE;
        ALTER TABLE scholarships ADD COLUMN IF NOT EXISTS is_sample BOOLEAN NOT NULL DEFAULT FALSE;
        ALTER TABLE courses      ADD COLUMN IF NOT EXISTS is_sample BOOLEAN NOT NULL DEFAULT FALSE;
        ALTER TABLE jobs         ADD COLUMN IF NOT EXISTS is_sample BOOLEAN NOT NULL DEFAULT FALSE;
        ALTER TABLE merit_cutoffs ADD COLUMN IF NOT EXISTS is_sample BOOLEAN NOT NULL DEFAULT FALSE;
        ALTER TABLE entry_test_questions ADD COLUMN IF NOT EXISTS is_sample BOOLEAN NOT NULL DEFAULT FALSE;
      `);
    })().catch((err) => { ready = null; throw err; });
  }
  return ready;
}

/** "October 15" → the next 15 October as a date; anything else → null. */
function nextDeadline(text: unknown): string | null {
  const m = String(text || '').match(/^([A-Za-z]+)\s+(\d{1,2})$/);
  if (!m) return null;
  const month = new Date(`${m[1]} 1, 2000`).getMonth();
  if (isNaN(month)) return null;
  const now = new Date();
  let d = new Date(Date.UTC(now.getUTCFullYear(), month, Number(m[2])));
  if (d.getTime() < now.getTime()) d = new Date(Date.UTC(now.getUTCFullYear() + 1, month, Number(m[2])));
  return d.toISOString().slice(0, 10);
}

const cleanUrl = (u: unknown) => (typeof u === 'string' && /^https?:\/\//.test(u) ? u.slice(0, 500) : null);

/** Inserts the sample rows that are missing. Returns how many rows were added per table. */
export async function insertSampleData(): Promise<Record<string, number>> {
  await ensureSampleSchema();
  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  const added: Record<string, number> = Object.fromEntries(TABLES.map((t) => [t, 0]));
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const exists = async (table: string, col: string, value: string) =>
      (await client.query(`SELECT 1 FROM ${table} WHERE LOWER(${col}) = LOWER($1) LIMIT 1`, [value])).rowCount! > 0;

    for (const u of data.universities) {
      if (await exists('universities', 'name', u.name)) continue;
      await client.query(
        `INSERT INTO universities (name, short_name, city, province, type, hec_rank_tier, is_hec_recognized, annual_fee_pkr,
           official_website, admissions_url, programs, merit_cutoff_pct, has_hostel, description, education_levels, verification_status, is_sample)
         VALUES ($1,$2,$3,$4,$5,$6,TRUE,$7,$8,NULL,$9,$10,$11,$12,$13,'SAMPLE',TRUE)`,
        [u.name, u.shortName, u.city, u.province, u.type, u.hecRankTier, u.annualFeePkr, cleanUrl(u.websiteUrl),
          JSON.stringify(u.programs || []), u.lastMeritCutoffPct, u.hasHostel, u.description, ['class11', 'class12', 'dae', 'university']]);
      added.universities++;
    }
    for (const s of data.scholarships) {
      if (await exists('scholarships', 'name', s.name)) continue;
      await client.query(
        `INSERT INTO scholarships (name, provider, description, province, category, coverage, amount_pkr, max_family_income,
           min_academic_pct, deadline, deadline_note, application_url, official_url, education_levels, verification_status, is_sample)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$12,$13,'SAMPLE',TRUE)`,
        [s.name.slice(0, 255), s.provider.slice(0, 255), s.description, (s.province || 'Federal / All Provinces').slice(0, 100), (s.category || '').slice(0, 100),
          String(s.coverage || '').slice(0, 255), s.amountPkr, s.maxFamilyIncome, s.minAcademicPct, nextDeadline(s.deadline),
          s.deadline ? String(s.deadline).slice(0, 100) : null, cleanUrl(s.applicationUrl), (s.levels || []).filter((l: string) => ALL_LEVELS.includes(l))]);
      added.scholarships++;
    }
    for (const c of data.courses) {
      if (await exists('courses', 'title', c.title)) continue;
      await client.query(
        `INSERT INTO courses (title, provider, description, skills_covered, duration, format, price_pkr, enrollment_url, education_levels, verification_status, is_sample)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'{}','SAMPLE',TRUE)`,
        [c.title.slice(0, 255), c.provider.slice(0, 255), c.description, JSON.stringify(c.skills || []), String(c.duration || '').slice(0, 100),
          (c.format || 'Online').slice(0, 50), c.pricePkr || 0, cleanUrl(c.url)]);
      added.courses++;
    }
    for (const j of data.jobs) {
      if (await exists('jobs', 'title', j.title) && await exists('jobs', 'company', j.company)) continue;
      await client.query(
        `INSERT INTO jobs (title, company, description, location, city, employment_type, experience_level, required_skills,
           salary_min, salary_max, application_url, expires_at, education_levels, verification_status, is_sample)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, NOW() + INTERVAL '90 days', $12,'SAMPLE',TRUE)`,
        [j.title, j.company, j.description, j.location, j.city, j.type, j.experience, JSON.stringify(j.skills || []),
          j.salaryMin, j.salaryMax, cleanUrl(j.url), ['dae', 'university']]);
      added.jobs++;
    }
    const uniIds = new Map<string, string>(
      (await client.query(`SELECT id, name FROM universities`)).rows.map((r: any) => [r.name.toLowerCase(), r.id]));
    const haveCutoffs = (await client.query(`SELECT COUNT(*)::int AS n FROM merit_cutoffs WHERE is_sample`)).rows[0].n > 0;
    if (!haveCutoffs) {
      for (const m of data.meritCutoffs) {
        await client.query(
          `INSERT INTO merit_cutoffs (university_id, university_name, program_name, degree_type, entry_test, academic_year, merit_pct,
             fsc_weight, test_weight, city, verification_status, is_sample)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'SAMPLE',TRUE)`,
          [uniIds.get(m.university.toLowerCase()) || null, m.university, m.program, m.program.split(' ')[0].slice(0, 50), m.test, m.year, m.merit,
            m.fscWeight, m.testWeight, m.city]);
        added.merit_cutoffs++;
      }
    }
    for (const q of data.questions) {
      if (await exists('entry_test_questions', 'question', q.question)) continue;
      await client.query(
        `INSERT INTO entry_test_questions (test_type, subject, difficulty, question, option_a, option_b, option_c, option_d, correct, explanation, is_sample)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,TRUE)`,
        [q.test, q.subject, q.difficulty, q.question, q.a, q.b, q.c, q.d, q.correct, q.explanation]);
      added.entry_test_questions++;
    }
    await client.query(`INSERT INTO content_seeds (key) VALUES ($1) ON CONFLICT DO NOTHING`, [SEED_KEY]);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
  return added;
}

/** Called at start-up: adds the sample data only the first time. */
export async function ensureSampleData(): Promise<void> {
  await ensureSampleSchema();
  const done = await queryOne<any>(`SELECT 1 FROM content_seeds WHERE key = $1`, [SEED_KEY]);
  if (done) return;
  const added = await insertSampleData();
  console.log(`[sample-data] Added sample content: ${Object.entries(added).map(([t, n]) => `${t} ${n}`).join(', ')}`);
}

async function sampleCounts() {
  const out: Record<string, number> = {};
  for (const t of TABLES) out[t] = (await queryOne<any>(`SELECT COUNT(*)::int AS n FROM ${t} WHERE is_sample`))?.n ?? 0;
  return out;
}

export const adminSampleDataRouter = Router();
adminSampleDataRouter.use('/sample-data', (_req, res, next) => {
  ensureSampleSchema().then(() => next()).catch(() => res.status(503).json({ error: 'Database not ready.' }));
});
adminSampleDataRouter.get('/sample-data', async (_req, res) => {
  res.json({ data: await sampleCounts() });
});
adminSampleDataRouter.delete('/sample-data', async (_req, res) => {
  const removed: Record<string, number> = {};
  // cut-offs reference universities, so remove them first
  for (const t of ['merit_cutoffs', 'entry_test_questions', 'universities', 'scholarships', 'courses', 'jobs']) {
    removed[t] = (await query<any>(`DELETE FROM ${t} WHERE is_sample RETURNING id`)).length;
  }
  res.json({ data: { removed, remaining: await sampleCounts() } });
});
adminSampleDataRouter.post('/sample-data', async (_req, res) => {
  try {
    const added = await insertSampleData();
    res.json({ data: { added, counts: await sampleCounts() } });
  } catch (err: any) {
    console.error('[sample-data] insert', err?.message);
    res.status(500).json({ error: 'Could not add the sample data.' });
  }
});
