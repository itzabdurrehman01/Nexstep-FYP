/**
 * mockInterview.routes.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Students record mock-interview answers (audio + transcript) and send them to
 * an assigned mentor, who listens, scores each answer and writes feedback.
 *
 *   POST   /api/mock-interviews                         { mentorId, category, answers:[{question, transcript, durationSeconds}] }
 *   PUT    /api/mock-interviews/:id/answers/:pos/audio  raw audio body (audio/webm, audio/ogg, audio/mp4…), ≤ 8 MB
 *   GET    /api/mock-interviews                         student: own interviews
 *   GET    /api/mock-interviews/review-queue            mentor: interviews sent to me
 *   GET    /api/mock-interviews/:id                     owner student or the reviewing mentor
 *   GET    /api/mock-interviews/:id/answers/:pos/audio  owner student or the reviewing mentor
 *   POST   /api/mock-interviews/:id/review              mentor: { answers:[{position, score 0-10, feedback}], feedback }
 *   DELETE /api/mock-interviews/:id                     owner student, before review
 * ─────────────────────────────────────────────────────────────────────────────
 */
import express, { Router, Request, Response, NextFunction } from 'express';
import { pool, query, queryOne } from './db.js';
import { requireAuth } from './auth.middleware.js';
import { notifyUser } from '../services/notify.service.js';
import { getUserPlan, FREE_LIMITS } from '../services/plan.service.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_ANSWERS = 10;
const MAX_AUDIO_BYTES = 8 * 1024 * 1024;
const AUDIO_TYPES = ['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/aac'];

let ready: Promise<void> | null = null;
export function ensureMockInterviewSchema(): Promise<void> {
  if (!ready) {
    ready = pool.query(`
      CREATE TABLE IF NOT EXISTS mock_interviews (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        student_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        mentor_id       UUID REFERENCES users(id) ON DELETE SET NULL,
        category        VARCHAR(120) NOT NULL,
        status          VARCHAR(20)  NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','reviewed')),
        overall_score   INTEGER,
        mentor_feedback TEXT,
        submitted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        reviewed_at     TIMESTAMPTZ
      );
      CREATE INDEX IF NOT EXISTS idx_mock_interviews_student ON mock_interviews(student_id);
      CREATE INDEX IF NOT EXISTS idx_mock_interviews_mentor  ON mock_interviews(mentor_id);
      CREATE TABLE IF NOT EXISTS mock_interview_answers (
        id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        interview_id     UUID NOT NULL REFERENCES mock_interviews(id) ON DELETE CASCADE,
        position         INTEGER NOT NULL,
        question         TEXT NOT NULL,
        transcript       TEXT,
        duration_seconds INTEGER,
        audio            BYTEA,
        audio_mime       VARCHAR(60),
        score            INTEGER CHECK (score BETWEEN 0 AND 10),
        feedback         TEXT,
        UNIQUE (interview_id, position)
      );
    `).then(() => undefined).catch((err) => { ready = null; throw err; });
  }
  return ready;
}

const clean = (v: unknown, max: number) => (v === undefined || v === null ? '' : String(v).trim().slice(0, max));
const name = (f?: string, l?: string, e?: string) => `${f || ''} ${l || ''}`.trim() || e || '';

async function notify(userId: string, title: string, body: string, link: string) {
  await notifyUser(userId, { type: 'MOCK_INTERVIEW', title, body, link, kind: 'mentor' });
}

/** Loads an interview the current user may see (owner student or reviewing mentor). */
async function loadAccessible(req: Request, id: string) {
  if (!UUID_RE.test(id)) return null;
  const row = await queryOne<any>(`SELECT * FROM mock_interviews WHERE id = $1`, [id]);
  if (!row) return null;
  if (row.student_id === req.user!.id) return { row, as: 'student' as const };
  if (req.user!.role === 'MENTOR' && row.mentor_id === req.user!.id) return { row, as: 'mentor' as const };
  return null;
}

async function detail(id: string) {
  const r = await queryOne<any>(`
    SELECT mi.*, s.first_name AS sf, s.last_name AS sl, s.email AS se, sp.grade_level AS slevel,
           m.first_name AS mf, m.last_name AS ml, m.email AS me
      FROM mock_interviews mi
      JOIN users s ON s.id = mi.student_id
      LEFT JOIN profiles sp ON sp.user_id = mi.student_id
      LEFT JOIN users m ON m.id = mi.mentor_id
     WHERE mi.id = $1`, [id]);
  const answers = await query<any>(`
    SELECT position, question, transcript, duration_seconds, score, feedback, audio_mime, (audio IS NOT NULL) AS has_audio
      FROM mock_interview_answers WHERE interview_id = $1 ORDER BY position`, [id]);
  return {
    id: r.id, category: r.category, status: r.status, overallScore: r.overall_score, mentorFeedback: r.mentor_feedback,
    submittedAt: r.submitted_at, reviewedAt: r.reviewed_at,
    student: { id: r.student_id, name: name(r.sf, r.sl, r.se), level: r.slevel },
    mentor: r.mentor_id ? { id: r.mentor_id, name: name(r.mf, r.ml, r.me) } : null,
    answers: answers.map((a) => ({
      position: a.position, question: a.question, transcript: a.transcript, durationSeconds: a.duration_seconds,
      score: a.score, feedback: a.feedback, hasAudio: a.has_audio,
    })),
  };
}

export const mockInterviewRouter = Router();
mockInterviewRouter.use(requireAuth(), (_req: Request, res: Response, next: NextFunction) => {
  ensureMockInterviewSchema().then(() => next()).catch(() => res.status(503).json({ error: 'Database not ready.' }));
});

mockInterviewRouter.post('/', async (req, res) => {
  if (req.user!.role !== 'STUDENT') return res.status(403).json({ error: 'Only students can submit mock interviews.' });
  const { mentorId, category, answers } = req.body ?? {};
  if (!UUID_RE.test(String(mentorId))) return res.status(400).json({ error: 'Choose a mentor to review your interview.' });
  const assigned = await queryOne<any>(
    `SELECT 1 FROM mentor_assignments a JOIN users u ON u.id = a.mentor_id AND u.role = 'MENTOR' AND u.is_active
      WHERE a.student_id = $1 AND a.mentor_id = $2`, [req.user!.id, mentorId]).catch(() => null);
  if (!assigned) return res.status(403).json({ error: 'You can only send interviews to a mentor assigned to you.' });
  const plan = await getUserPlan(req.user!.id);
  if (plan.tier !== 'premium') {
    const used = await queryOne<any>(`SELECT COUNT(*)::int AS n FROM mock_interviews WHERE student_id = $1 AND submitted_at >= date_trunc('month', NOW())`, [req.user!.id]);
    if ((used?.n ?? 0) >= FREE_LIMITS.mockInterviewsPerMonth)
      return res.status(402).json({ error: `The Free plan includes ${FREE_LIMITS.mockInterviewsPerMonth} mentor-reviewed interviews a month. Upgrade to Premium for unlimited reviews.`, code: 'PREMIUM_REQUIRED' });
  }
  if (!Array.isArray(answers) || answers.length === 0 || answers.length > MAX_ANSWERS)
    return res.status(400).json({ error: `Answer between 1 and ${MAX_ANSWERS} questions.` });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO mock_interviews (student_id, mentor_id, category) VALUES ($1, $2, $3) RETURNING id`,
      [req.user!.id, mentorId, clean(category, 120) || 'General']);
    const id = rows[0].id;
    for (let i = 0; i < answers.length; i++) {
      const a = answers[i] ?? {};
      const q = clean(a.question, 1000);
      if (!q) throw Object.assign(new Error('Every answer needs its question.'), { status: 400 });
      const secs = Number(a.durationSeconds);
      await client.query(
        `INSERT INTO mock_interview_answers (interview_id, position, question, transcript, duration_seconds) VALUES ($1, $2, $3, $4, $5)`,
        [id, i + 1, q, clean(a.transcript, 8000) || null, Number.isFinite(secs) && secs >= 0 && secs < 3600 ? Math.round(secs) : null]);
    }
    await client.query('COMMIT');
    res.status(201).json({ data: { id } });
  } catch (err: any) {
    await client.query('ROLLBACK').catch(() => {});
    res.status(err.status || 500).json({ error: err.status ? err.message : 'Could not save your interview.' });
  } finally {
    client.release();
  }
});

mockInterviewRouter.put('/:id/answers/:pos/audio',
  express.raw({ type: (r) => String(r.headers['content-type'] || '').startsWith('audio/'), limit: MAX_AUDIO_BYTES }),
  async (req, res) => {
    const access = await loadAccessible(req, req.params.id);
    if (!access || access.as !== 'student') return res.status(404).json({ error: 'Interview not found.' });
    if (access.row.status !== 'submitted') return res.status(409).json({ error: 'This interview was already reviewed.' });
    const mime = String(req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
    if (!AUDIO_TYPES.includes(mime)) return res.status(415).json({ error: 'Unsupported audio format.' });
    const body = req.body as Buffer;
    if (!Buffer.isBuffer(body) || body.length < 200) return res.status(400).json({ error: 'The recording is empty.' });
    const pos = Number(req.params.pos);
    const row = await queryOne<any>(
      `UPDATE mock_interview_answers SET audio = $3, audio_mime = $4 WHERE interview_id = $1 AND position = $2 RETURNING position`,
      [req.params.id, pos, body, mime]);
    if (!row) return res.status(404).json({ error: 'Answer not found.' });
    res.json({ success: true });
  });

/** Called by the student after all uploads finished: lets the mentor know. */
mockInterviewRouter.post('/:id/submit', async (req, res) => {
  const access = await loadAccessible(req, req.params.id);
  if (!access || access.as !== 'student') return res.status(404).json({ error: 'Interview not found.' });
  if (access.row.mentor_id) {
    const s = await queryOne<any>(`SELECT first_name, last_name, email FROM users WHERE id = $1`, [req.user!.id]);
    await notify(access.row.mentor_id, 'Mock interview to review', `${name(s?.first_name, s?.last_name, s?.email)} sent you a ${access.row.category} mock interview to review.`, '/portal/mentor');
  }
  res.json({ success: true });
});

mockInterviewRouter.get('/', async (req, res) => {
  const rows = await query<any>(`
    SELECT mi.id, mi.category, mi.status, mi.overall_score, mi.submitted_at, mi.reviewed_at,
           m.first_name AS mf, m.last_name AS ml, m.email AS me,
           (SELECT COUNT(*)::int FROM mock_interview_answers a WHERE a.interview_id = mi.id) AS answers
      FROM mock_interviews mi LEFT JOIN users m ON m.id = mi.mentor_id
     WHERE mi.student_id = $1 ORDER BY mi.submitted_at DESC LIMIT 50`, [req.user!.id]);
  res.json({ data: rows.map((r) => ({ id: r.id, category: r.category, status: r.status, overallScore: r.overall_score, submittedAt: r.submitted_at, reviewedAt: r.reviewed_at, answers: r.answers, mentorName: name(r.mf, r.ml, r.me) })) });
});

mockInterviewRouter.get('/review-queue', async (req, res) => {
  if (req.user!.role !== 'MENTOR') return res.status(403).json({ error: 'Only mentors can review interviews.' });
  const rows = await query<any>(`
    SELECT mi.id, mi.category, mi.status, mi.overall_score, mi.submitted_at, mi.reviewed_at,
           s.first_name AS sf, s.last_name AS sl, s.email AS se, sp.grade_level AS slevel,
           (SELECT COUNT(*)::int FROM mock_interview_answers a WHERE a.interview_id = mi.id) AS answers
      FROM mock_interviews mi JOIN users s ON s.id = mi.student_id LEFT JOIN profiles sp ON sp.user_id = mi.student_id
     WHERE mi.mentor_id = $1 ORDER BY (mi.status = 'submitted') DESC, mi.submitted_at DESC LIMIT 100`, [req.user!.id]);
  res.json({ data: rows.map((r) => ({ id: r.id, category: r.category, status: r.status, overallScore: r.overall_score, submittedAt: r.submitted_at, reviewedAt: r.reviewed_at, answers: r.answers, student: { name: name(r.sf, r.sl, r.se), level: r.slevel } })) });
});

mockInterviewRouter.get('/:id', async (req, res) => {
  const access = await loadAccessible(req, req.params.id);
  if (!access) return res.status(404).json({ error: 'Interview not found.' });
  res.json({ data: await detail(req.params.id) });
});

mockInterviewRouter.get('/:id/answers/:pos/audio', async (req, res) => {
  const access = await loadAccessible(req, req.params.id);
  if (!access) return res.status(404).json({ error: 'Interview not found.' });
  const row = await queryOne<any>(`SELECT audio, audio_mime FROM mock_interview_answers WHERE interview_id = $1 AND position = $2`, [req.params.id, Number(req.params.pos)]);
  if (!row?.audio) return res.status(404).json({ error: 'No recording for this answer.' });
  res.setHeader('Content-Type', row.audio_mime || 'audio/webm');
  res.setHeader('Cache-Control', 'private, max-age=300');
  res.send(row.audio);
});

mockInterviewRouter.post('/:id/review', async (req, res) => {
  const access = await loadAccessible(req, req.params.id);
  if (!access || access.as !== 'mentor') return res.status(404).json({ error: 'Interview not found.' });
  const items = Array.isArray(req.body?.answers) ? req.body.answers : [];
  const existing = await query<any>(`SELECT position FROM mock_interview_answers WHERE interview_id = $1`, [req.params.id]);
  const positions = new Set(existing.map((e) => e.position));
  const scores: number[] = [];
  for (const it of items) {
    const pos = Number(it?.position);
    const score = Number(it?.score);
    if (!positions.has(pos)) continue;
    if (!Number.isInteger(score) || score < 0 || score > 10) return res.status(400).json({ error: 'Each score must be a whole number from 0 to 10.' });
    scores.push(score);
    await query(`UPDATE mock_interview_answers SET score = $3, feedback = $4 WHERE interview_id = $1 AND position = $2`,
      [req.params.id, pos, score, clean(it?.feedback, 2000) || null]);
  }
  if (scores.length !== positions.size) return res.status(400).json({ error: 'Score every answer before submitting the review.' });
  const overall = Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10);
  await query(`UPDATE mock_interviews SET status = 'reviewed', overall_score = $2, mentor_feedback = $3, reviewed_at = NOW() WHERE id = $1`,
    [req.params.id, overall, clean(req.body?.feedback, 4000) || null]);
  await notify(access.row.student_id, 'Your mock interview was reviewed', `Your mentor scored your ${access.row.category} interview ${overall}%. Open Mock Interview to see the feedback.`, '/mock-interview');
  res.json({ data: await detail(req.params.id) });
});

mockInterviewRouter.delete('/:id', async (req, res) => {
  const access = await loadAccessible(req, req.params.id);
  if (!access || access.as !== 'student') return res.status(404).json({ error: 'Interview not found.' });
  if (access.row.status === 'reviewed') return res.status(409).json({ error: 'Reviewed interviews are kept for your record.' });
  await query(`DELETE FROM mock_interviews WHERE id = $1`, [req.params.id]);
  res.json({ success: true });
});
