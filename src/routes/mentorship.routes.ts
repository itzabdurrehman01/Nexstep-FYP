/**
 * mentorship.routes.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Admin assigns mentors to students → students request sessions with their
 * assigned mentor → the mentor accepts (schedules) or declines, and later marks
 * the session completed.
 *
 * Student  (/api/mentorship)
 *   GET  /my-mentors                 assigned mentors + their mentor profile
 *   GET  /my-sessions                the student's requests and sessions
 *   POST /requests                   { mentorId, topic, preferredAt, durationMinutes?, message? }
 *   POST /requests/:id/cancel
 * Mentor   (/api/mentorship/mentor)
 *   GET  /students                   students assigned to this mentor
 *   GET  /sessions                   all requests / sessions for this mentor
 *   POST /sessions/:id/accept        { scheduledAt?, meetingLink?, note? }
 *   POST /sessions/:id/decline       { note? }
 *   POST /sessions/:id/complete      { notes? }
 *   POST /sessions/:id/cancel        { note? }
 * Admin    (mounted on the protected /api/admin router)
 *   GET    /assignments
 *   POST   /assignments              { studentEmail, mentorEmail, note? }
 *   DELETE /assignments/:id
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { Router, Request, Response, NextFunction } from 'express';
import { pool, query, queryOne } from './db.js';
import { requireAuth } from './auth.middleware.js';
import { notifyUser } from '../services/notify.service.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DURATIONS = [30, 45, 60, 90];
const MAX_PENDING_PER_MENTOR = 3;

// ── Schema ───────────────────────────────────────────────────────────────────
let ready: Promise<void> | null = null;
export function ensureMentorshipSchema(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      // Enum values must be added in their own statements (outside a transaction).
      await pool.query(`ALTER TYPE session_status ADD VALUE IF NOT EXISTS 'requested'`).catch(() => {});
      await pool.query(`ALTER TYPE session_status ADD VALUE IF NOT EXISTS 'declined'`).catch(() => {});
      await pool.query(`
        CREATE TABLE IF NOT EXISTS mentor_assignments (
          id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          student_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          mentor_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          assigned_by  UUID,
          note         VARCHAR(300),
          created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE (student_id, mentor_id)
        );
        CREATE INDEX IF NOT EXISTS idx_mentor_assignments_mentor ON mentor_assignments(mentor_id);
        ALTER TABLE mentor_sessions ADD COLUMN IF NOT EXISTS request_message TEXT;
        ALTER TABLE mentor_sessions ADD COLUMN IF NOT EXISTS mentor_response TEXT;
        ALTER TABLE mentor_sessions ADD COLUMN IF NOT EXISTS responded_at   TIMESTAMPTZ;
        ALTER TABLE mentor_sessions ADD COLUMN IF NOT EXISTS request_kind   VARCHAR(30) NOT NULL DEFAULT 'session';
        CREATE TABLE IF NOT EXISTS notifications (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          type VARCHAR(50) NOT NULL, title VARCHAR(255) NOT NULL, body TEXT NOT NULL,
          link VARCHAR(500), is_read BOOLEAN NOT NULL DEFAULT FALSE,
          scheduled_at TIMESTAMPTZ, sent_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);
    })().catch((err) => { ready = null; throw err; });
  }
  return ready;
}

async function notify(userId: string, title: string, body: string, link: string) {
  await notifyUser(userId, { type: 'MENTORSHIP', title, body, link, kind: 'mentor' });
}

const schema = (req: Request, res: Response, next: NextFunction) =>
  ensureMentorshipSchema().then(() => next()).catch(() => res.status(503).json({ error: 'Database not ready.' }));

const fullName = (first?: string, last?: string) => `${first || ''} ${last || ''}`.trim();
const clean = (v: unknown, max: number) => (v === undefined || v === null ? '' : String(v).trim().slice(0, max));
function futureDate(v: unknown): Date | null {
  const d = new Date(String(v ?? ''));
  if (isNaN(d.getTime())) return null;
  if (d.getTime() < Date.now() - 5 * 60 * 1000) return null;
  if (d.getTime() > Date.now() + 180 * 24 * 3600 * 1000) return null;
  return d;
}
const safeLink = (v: unknown) => { const s = clean(v, 500); return /^https?:\/\/\S+$/i.test(s) ? s : ''; };

const REQUEST_KINDS = ['session', 'interview', 'mock_interview'] as const;

const SESSION_SELECT = `
  SELECT ms.id, ms.topic, ms.scheduled_at AS "scheduledAt", ms.duration_minutes AS "durationMinutes",
         ms.status, ms.meeting_link AS "meetingLink", ms.notes, ms.request_message AS "message",
         ms.mentor_response AS "mentorResponse", ms.request_kind AS "requestKind",
         ms.created_at AS "createdAt", ms.responded_at AS "respondedAt",
         s.id AS "studentId", s.first_name AS "studentFirst", s.last_name AS "studentLast", s.email AS "studentEmail",
         m.id AS "mentorId", m.first_name AS "mentorFirst", m.last_name AS "mentorLast", m.email AS "mentorEmail",
         sp.grade_level AS "studentLevel"
    FROM mentor_sessions ms
    JOIN users s ON s.id = ms.student_id
    JOIN users m ON m.id = ms.mentor_id
    LEFT JOIN profiles sp ON sp.user_id = ms.student_id`;
const toSession = (r: any) => ({
  id: r.id, topic: r.topic, scheduledAt: r.scheduledAt, durationMinutes: r.durationMinutes, status: r.status,
  meetingLink: r.meetingLink, notes: r.notes, message: r.message, mentorResponse: r.mentorResponse,
  requestKind: r.requestKind || 'session',
  createdAt: r.createdAt, respondedAt: r.respondedAt,
  student: { id: r.studentId, name: fullName(r.studentFirst, r.studentLast) || r.studentEmail, email: r.studentEmail, level: r.studentLevel },
  mentor: { id: r.mentorId, name: fullName(r.mentorFirst, r.mentorLast) || r.mentorEmail },
});

// ── Student ──────────────────────────────────────────────────────────────────
export const mentorshipRouter = Router();
mentorshipRouter.use(requireAuth(), schema);

const studentOnly = (req: Request, res: Response, next: NextFunction) =>
  req.user?.role === 'STUDENT' ? next() : res.status(403).json({ error: 'Only students can do this.' });
const mentorOnly = (req: Request, res: Response, next: NextFunction) =>
  req.user?.role === 'MENTOR' ? next() : res.status(403).json({ error: 'Only mentors can do this.' });

function mapMentor(r: any, assignedAt?: any) {
  const mp = r.mentor_profile || {};
  return {
    id: r.id, name: fullName(r.first_name, r.last_name) || 'Mentor', avatarUrl: r.avatar_url, city: r.city, bio: r.bio,
    headline: mp.headline || '', organization: mp.organization || '', expertise: mp.expertise || [], subjects: mp.subjects || [],
    yearsExperience: mp.yearsExperience ?? null, availability: mp.availability || '', sessionMode: mp.sessionMode || '',
    assignedAt: assignedAt || r.assigned_at || null,
  };
}

mentorshipRouter.get('/my-mentors', studentOnly, async (req, res) => {
  const assigned = await query<any>(`
    SELECT u.id, u.first_name, u.last_name, u.avatar_url, p.mentor_profile, p.bio, p.city, a.created_at AS assigned_at
      FROM mentor_assignments a
      JOIN users u ON u.id = a.mentor_id AND u.is_active = TRUE AND u.role = 'MENTOR'
      LEFT JOIN profiles p ON p.user_id = u.id
     WHERE a.student_id = $1
     ORDER BY a.created_at`, [req.user!.id]);
  if (assigned.length) return res.json({ data: assigned.map((r) => mapMentor(r)) });
  const all = await query<any>(`
    SELECT u.id, u.first_name, u.last_name, u.avatar_url, p.mentor_profile, p.bio, p.city
      FROM users u LEFT JOIN profiles p ON p.user_id = u.id
     WHERE u.is_active = TRUE AND u.role = 'MENTOR'
     ORDER BY u.first_name NULLS LAST LIMIT 40`);
  res.json({ data: all.map((r) => mapMentor(r)), directory: true });
});

mentorshipRouter.get('/directory', studentOnly, async (req, res) => {
  const rows = await query<any>(`
    SELECT u.id, u.first_name, u.last_name, u.avatar_url, p.mentor_profile, p.bio, p.city
      FROM users u LEFT JOIN profiles p ON p.user_id = u.id
     WHERE u.is_active = TRUE AND u.role = 'MENTOR'
     ORDER BY u.first_name NULLS LAST LIMIT 40`);
  res.json({ data: rows.map((r) => mapMentor(r)) });
});

mentorshipRouter.get('/my-sessions', studentOnly, async (req, res) => {
  const rows = await query<any>(`${SESSION_SELECT} WHERE ms.student_id = $1 ORDER BY ms.scheduled_at DESC LIMIT 100`, [req.user!.id]);
  res.json({ data: rows.map(toSession) });
});

mentorshipRouter.post('/requests', studentOnly, async (req, res) => {
  const { mentorId, topic, preferredAt, durationMinutes, message, kind } = req.body ?? {};
  if (!UUID_RE.test(String(mentorId))) return res.status(400).json({ error: 'Choose a mentor.' });
  const mentor = await queryOne<any>(
    `SELECT id FROM users WHERE id = $1 AND role = 'MENTOR' AND is_active = TRUE`, [mentorId]);
  if (!mentor) return res.status(400).json({ error: 'That mentor is not available.' });
  await query(
    `INSERT INTO mentor_assignments (student_id, mentor_id, note) VALUES ($1, $2, 'Requested by student')
     ON CONFLICT (student_id, mentor_id) DO NOTHING`, [req.user!.id, mentorId]).catch(() => {});
  const requestKind = (REQUEST_KINDS as readonly string[]).includes(String(kind)) ? String(kind) : 'session';
  const kindLabel = requestKind === 'interview' ? 'interview prep' : requestKind === 'mock_interview' ? 'mock interview' : 'session';
  const t = clean(topic, 300) || (requestKind === 'session' ? 'Career guidance session' : requestKind === 'interview' ? 'Interview preparation' : 'Mock interview practice');
  if (t.length < 3) return res.status(400).json({ error: 'Please describe what you want to discuss.' });
  const when = futureDate(preferredAt);
  if (!when) return res.status(400).json({ error: 'Choose a preferred date and time in the future (within 6 months).' });
  const minutes = DURATIONS.includes(Number(durationMinutes)) ? Number(durationMinutes) : 60;
  const pending = await queryOne<any>(
    `SELECT COUNT(*)::int AS n FROM mentor_sessions WHERE student_id = $1 AND mentor_id = $2 AND status = 'requested'`,
    [req.user!.id, mentorId]);
  if ((pending?.n ?? 0) >= MAX_PENDING_PER_MENTOR)
    return res.status(429).json({ error: `You already have ${MAX_PENDING_PER_MENTOR} requests waiting for this mentor. Wait for a reply first.` });

  const row = await queryOne<any>(
    `INSERT INTO mentor_sessions (mentor_id, student_id, topic, scheduled_at, duration_minutes, status, request_message, request_kind)
     VALUES ($1, $2, $3, $4, $5, 'requested', $6, $7) RETURNING id`,
    [mentorId, req.user!.id, t, when.toISOString(), minutes, clean(message, 1000) || null, requestKind]);
  const student = await queryOne<any>(`SELECT first_name, last_name, email FROM users WHERE id = $1`, [req.user!.id]);
  await notify(mentorId, `New ${kindLabel} request`, `${fullName(student?.first_name, student?.last_name) || student?.email} asked for a ${kindLabel}: ${t}`, '/portal/mentor');
  const full = await queryOne<any>(`${SESSION_SELECT} WHERE ms.id = $1`, [row.id]);
  res.status(201).json({ data: toSession(full) });
});

mentorshipRouter.post('/requests/:id/cancel', studentOnly, async (req, res) => {
  if (!UUID_RE.test(req.params.id)) return res.status(404).json({ error: 'Not found.' });
  const row = await queryOne<any>(
    `UPDATE mentor_sessions SET status = 'cancelled', updated_at = NOW()
      WHERE id = $1 AND student_id = $2 AND status IN ('requested', 'upcoming') RETURNING mentor_id, topic`,
    [req.params.id, req.user!.id]);
  if (!row) return res.status(404).json({ error: 'This request can no longer be cancelled.' });
  await notify(row.mentor_id, 'Session cancelled by student', `The session "${row.topic}" was cancelled by the student.`, '/portal/mentor');
  res.json({ success: true });
});

// ── Mentor ───────────────────────────────────────────────────────────────────
mentorshipRouter.get('/mentor/students', mentorOnly, async (req, res) => {
  const rows = await query<any>(`
    SELECT u.id, u.first_name, u.last_name, u.email, u.avatar_url, p.grade_level, p.education_stream, p.city, a.created_at AS assigned_at,
           (SELECT COUNT(*)::int FROM mentor_sessions ms WHERE ms.student_id = u.id AND ms.mentor_id = $1 AND ms.status = 'completed') AS completed
      FROM mentor_assignments a
      JOIN users u ON u.id = a.student_id
      LEFT JOIN profiles p ON p.user_id = u.id
     WHERE a.mentor_id = $1
     ORDER BY a.created_at DESC`, [req.user!.id]);
  res.json({
    data: rows.map((r) => ({
      id: r.id, name: fullName(r.first_name, r.last_name) || r.email, email: r.email, avatarUrl: r.avatar_url,
      level: r.grade_level, stream: r.education_stream, city: r.city, assignedAt: r.assigned_at, completedSessions: r.completed,
    })),
  });
});

mentorshipRouter.get('/mentor/sessions', mentorOnly, async (req, res) => {
  const rows = await query<any>(`${SESSION_SELECT} WHERE ms.mentor_id = $1 ORDER BY ms.scheduled_at DESC LIMIT 200`, [req.user!.id]);
  res.json({ data: rows.map(toSession) });
});

async function mentorUpdate(req: Request, res: Response, fromStatuses: string[], set: string, params: any[], notice: (r: any) => [string, string] | null) {
  if (!UUID_RE.test(req.params.id)) return res.status(404).json({ error: 'Not found.' });
  const row = await queryOne<any>(
    `UPDATE mentor_sessions SET ${set}, updated_at = NOW()
      WHERE id = $1 AND mentor_id = $2 AND status = ANY($3::session_status[])
      RETURNING id, student_id, topic, scheduled_at`,
    [req.params.id, req.user!.id, fromStatuses, ...params]);
  if (!row) return res.status(409).json({ error: 'This session was already updated. Refresh the page.' });
  const n = notice(row);
  if (n) await notify(row.student_id, n[0], n[1], '/mentorship');
  const full = await queryOne<any>(`${SESSION_SELECT} WHERE ms.id = $1`, [row.id]);
  res.json({ data: toSession(full) });
}

mentorshipRouter.post('/mentor/sessions/:id/accept', mentorOnly, async (req, res) => {
  const { scheduledAt, meetingLink, note } = req.body ?? {};
  let when: Date | null = null;
  if (scheduledAt) {
    when = futureDate(scheduledAt);
    if (!when) return res.status(400).json({ error: 'Choose a session time in the future.' });
  }
  return mentorUpdate(req, res, ['requested'],
    `status = 'upcoming', scheduled_at = COALESCE($4::timestamptz, scheduled_at), meeting_link = NULLIF($5, ''), mentor_response = NULLIF($6, ''), responded_at = NOW()`,
    [when ? when.toISOString() : null, safeLink(meetingLink), clean(note, 1000)],
    (r) => ['Session accepted', `Your session "${r.topic}" was accepted for ${new Date(r.scheduled_at).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Karachi' })}.`]);
});

mentorshipRouter.post('/mentor/sessions/:id/decline', mentorOnly, async (req, res) =>
  mentorUpdate(req, res, ['requested'], `status = 'declined', mentor_response = NULLIF($4, ''), responded_at = NOW()`,
    [clean(req.body?.note, 1000)], (r) => ['Session request declined', `Your request "${r.topic}" was declined. You can request another time.`]));

mentorshipRouter.post('/mentor/sessions/:id/complete', mentorOnly, async (req, res) =>
  mentorUpdate(req, res, ['upcoming'], `status = 'completed', notes = COALESCE(NULLIF($4, ''), notes)`,
    [clean(req.body?.notes, 2000)], (r) => ['Session completed', `Your session "${r.topic}" was marked as completed.`]));

mentorshipRouter.post('/mentor/sessions/:id/cancel', mentorOnly, async (req, res) =>
  mentorUpdate(req, res, ['upcoming'], `status = 'cancelled', mentor_response = COALESCE(NULLIF($4, ''), mentor_response)`,
    [clean(req.body?.note, 1000)], (r) => ['Session cancelled by mentor', `Your session "${r.topic}" was cancelled by your mentor.`]));

// ── Admin: assignments ───────────────────────────────────────────────────────
export const adminAssignmentsRouter = Router();
adminAssignmentsRouter.use('/assignments', schema);

adminAssignmentsRouter.get('/assignments', async (req, res) => {
  const search = clean(req.query.search, 100).toLowerCase();
  const params: any[] = [];
  let where = '';
  if (search) {
    params.push(`%${search}%`);
    where = `WHERE LOWER(s.email) LIKE $1 OR LOWER(m.email) LIKE $1 OR LOWER(s.first_name || ' ' || s.last_name) LIKE $1 OR LOWER(m.first_name || ' ' || m.last_name) LIKE $1`;
  }
  const rows = await query<any>(`
    SELECT a.id, a.note, a.created_at,
           s.id AS sid, s.first_name AS sf, s.last_name AS sl, s.email AS se, sp.grade_level AS slevel,
           m.id AS mid, m.first_name AS mf, m.last_name AS ml, m.email AS me
      FROM mentor_assignments a
      JOIN users s ON s.id = a.student_id
      JOIN users m ON m.id = a.mentor_id
      LEFT JOIN profiles sp ON sp.user_id = s.id
      ${where}
     ORDER BY a.created_at DESC LIMIT 500`, params);
  const load = await query<any>(`SELECT mentor_id, COUNT(*)::int AS n FROM mentor_assignments GROUP BY mentor_id`);
  res.json({
    data: rows.map((r) => ({
      id: r.id, note: r.note, createdAt: r.created_at,
      student: { id: r.sid, name: fullName(r.sf, r.sl) || r.se, email: r.se, level: r.slevel },
      mentor: { id: r.mid, name: fullName(r.mf, r.ml) || r.me, email: r.me },
    })),
    mentorLoad: Object.fromEntries(load.map((l) => [l.mentor_id, l.n])),
  });
});

adminAssignmentsRouter.post('/assignments', async (req, res) => {
  const studentEmail = clean(req.body?.studentEmail, 255).toLowerCase();
  const mentorEmail = clean(req.body?.mentorEmail, 255).toLowerCase();
  if (!studentEmail || !mentorEmail) return res.status(400).json({ error: 'Enter both the student and the mentor email.' });
  const student = await queryOne<any>(`SELECT id, role, first_name, last_name FROM users WHERE LOWER(email) = $1 AND clerk_user_id IS NOT NULL`, [studentEmail]);
  if (!student) return res.status(404).json({ error: 'No student has signed up with that email yet.' });
  if (student.role !== 'STUDENT') return res.status(400).json({ error: 'That email belongs to a mentor, not a student.' });
  const mentor = await queryOne<any>(`SELECT id, role, first_name, last_name FROM users WHERE LOWER(email) = $1 AND clerk_user_id IS NOT NULL`, [mentorEmail]);
  if (!mentor) return res.status(404).json({ error: 'No user has signed up with that mentor email.' });
  if (mentor.role !== 'MENTOR') return res.status(400).json({ error: 'That user is not a mentor yet. Make them a mentor on the Mentors page first.' });
  const row = await queryOne<any>(
    `INSERT INTO mentor_assignments (student_id, mentor_id, assigned_by, note) VALUES ($1, $2, $3, $4)
     ON CONFLICT (student_id, mentor_id) DO NOTHING RETURNING id`,
    [student.id, mentor.id, req.admin?.id ?? null, clean(req.body?.note, 300) || null]);
  if (!row) return res.status(409).json({ error: 'This mentor is already assigned to that student.' });
  const mentorName = fullName(mentor.first_name, mentor.last_name) || mentorEmail;
  const studentName = fullName(student.first_name, student.last_name) || studentEmail;
  await notify(student.id, 'You have a mentor', `${mentorName} is now your mentor. You can request a session from the Mentorship page.`, '/mentorship');
  await notify(mentor.id, 'New student assigned', `${studentName} has been assigned to you.`, '/portal/mentor');
  res.status(201).json({ success: true, message: `${mentorName} is now mentoring ${studentName}.` });
});

adminAssignmentsRouter.delete('/assignments/:id', async (req, res) => {
  if (!UUID_RE.test(req.params.id)) return res.status(404).json({ error: 'Not found.' });
  const rows = await query<any>(`DELETE FROM mentor_assignments WHERE id = $1 RETURNING id`, [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Assignment not found.' });
  res.json({ success: true });
});
