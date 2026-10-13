/**
 * src/server/mentor.routes.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * All routes require: requireAuth() + requireRole('MENTOR')
 * A STUDENT or RECRUITER will receive 403 FORBIDDEN.
 *
 *  GET  /api/mentor/profile       — mentor's own profile
 *  PUT  /api/mentor/profile       — update mentor profile
 *  GET  /api/mentor/sessions      — upcoming + past sessions (from DB)
 *  POST /api/mentor/sessions      — create a new session slot
 *  PUT  /api/mentor/sessions/:id  — update session (confirm, complete, cancel)
 *  GET  /api/mentor/students      — students who booked sessions with this mentor
 *  GET  /api/mentor/stats         — session count, rating, total mentees
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { Router, Request, Response } from 'express';
import { query, queryOne } from './db.js';
import { requireAuth, requireRole } from './auth.middleware.js';

const router = Router();

// All mentor routes require authentication AND MENTOR role
router.use(requireAuth());
router.use(requireRole('MENTOR'));

// ── GET /api/mentor/profile ───────────────────────────────────────────────────
router.get('/profile', async (req: Request, res: Response) => {
  try {
    const uid = req.user!.id;
    const profile = await queryOne<any>(
      `SELECT u.first_name, u.last_name, u.email,
              p.city, p.bio, p.avatar_url, p.target_career,
              (SELECT COUNT(*) FROM mentor_sessions WHERE mentor_id=$1) AS total_sessions
       FROM users u
       LEFT JOIN profiles p ON p.user_id = u.id
       WHERE u.id = $1`,
      [uid]
    );
    res.json({ data: profile });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to load mentor profile.' });
  }
});

// ── PUT /api/mentor/profile ───────────────────────────────────────────────────
router.put('/profile', async (req: Request, res: Response) => {
  try {
    const uid = req.user!.id;
    const { bio, city, avatarUrl, expertise } = req.body;
    await query(
      `INSERT INTO profiles (user_id, city, bio, avatar_url)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (user_id) DO UPDATE
       SET city=$2, bio=$3, avatar_url=$4, updated_at=NOW()`,
      [uid, city, bio, avatarUrl]
    );
    if (expertise && Array.isArray(expertise)) {
      await query('DELETE FROM user_skills WHERE user_id=$1', [uid]);
      for (const e of expertise) {
        await query(
          `INSERT INTO user_skills (user_id, name, level, category) VALUES ($1,$2,'Expert','Technical')`,
          [uid, e]
        );
      }
    }
    res.json({ success: true, message: 'Mentor profile updated.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update mentor profile.' });
  }
});

// ── GET /api/mentor/sessions ──────────────────────────────────────────────────
router.get('/sessions', async (req: Request, res: Response) => {
  try {
    const uid = req.user!.id;
    const rows = await query<any>(
      `SELECT ms.id, ms.student_id, ms.topic, ms.scheduled_at, ms.status,
              ms.meeting_link, ms.notes, ms.duration_minutes,
              u.first_name || ' ' || u.last_name AS student_name,
              u.email AS student_email,
              p.grade_level AS student_grade
       FROM mentor_sessions ms
       JOIN users u ON u.id = ms.student_id
       LEFT JOIN profiles p ON p.user_id = ms.student_id
       WHERE ms.mentor_id = $1
       ORDER BY ms.scheduled_at DESC
       LIMIT 50`,
      [uid]
    );
    res.json({ count: rows.length, data: rows });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to load sessions.' });
  }
});

// ── POST /api/mentor/sessions ─────────────────────────────────────────────────
router.post('/sessions', async (req: Request, res: Response) => {
  try {
    const uid = req.user!.id;
    const { studentId, topic, scheduledAt, durationMinutes=60, meetingLink, notes } = req.body;
    if (!studentId || !scheduledAt) return res.status(400).json({ error: 'studentId and scheduledAt are required.' });
    const row = await queryOne<any>(
      `INSERT INTO mentor_sessions
       (mentor_id, student_id, topic, scheduled_at, duration_minutes, meeting_link, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING id, status, scheduled_at AS "scheduledAt"`,
      [uid, studentId, topic, scheduledAt, durationMinutes, meetingLink, notes]
    );
    res.status(201).json({ success: true, data: row });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create session.' });
  }
});

// ── PUT /api/mentor/sessions/:id ──────────────────────────────────────────────
router.put('/sessions/:id', async (req: Request, res: Response) => {
  try {
    const uid = req.user!.id;
    const { status, notes, meetingLink } = req.body;
    // Ownership: WHERE mentor_id = uid prevents cross-mentor updates
    const row = await queryOne<any>(
      `UPDATE mentor_sessions
       SET status=COALESCE($1,status), notes=COALESCE($2,notes),
           meeting_link=COALESCE($3,meeting_link), updated_at=NOW()
       WHERE id=$4 AND mentor_id=$5
       RETURNING id, status, notes`,
      [status, notes, meetingLink, req.params.id, uid]
    );
    if (!row) return res.status(404).json({ error: 'Session not found.' });
    res.json({ success: true, data: row });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update session.' });
  }
});

// ── GET /api/mentor/students ──────────────────────────────────────────────────
router.get('/students', async (req: Request, res: Response) => {
  try {
    const uid = req.user!.id;
    const rows = await query<any>(
      `SELECT DISTINCT u.id, u.first_name || ' ' || u.last_name AS name,
              u.email, p.grade_level, p.preferred_stream,
              COUNT(ms.id) AS session_count
       FROM mentor_sessions ms
       JOIN users u ON u.id = ms.student_id
       LEFT JOIN profiles p ON p.user_id = ms.student_id
       WHERE ms.mentor_id = $1
       GROUP BY u.id, u.first_name, u.last_name, u.email, p.grade_level, p.preferred_stream
       ORDER BY session_count DESC`,
      [uid]
    );
    res.json({ count: rows.length, data: rows });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to load students.' });
  }
});

// ── GET /api/mentor/stats ─────────────────────────────────────────────────────
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const uid = req.user!.id;
    const stats = await queryOne<any>(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'completed') AS completed_sessions,
         COUNT(*) FILTER (WHERE status = 'upcoming')  AS upcoming_sessions,
         COUNT(DISTINCT student_id)                   AS total_mentees,
         COUNT(*)                                     AS total_sessions
       FROM mentor_sessions WHERE mentor_id = $1`,
      [uid]
    );
    res.json({ data: stats });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to load stats.' });
  }
});

export { router as mentorRouter };
