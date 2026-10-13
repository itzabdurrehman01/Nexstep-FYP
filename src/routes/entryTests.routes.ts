/**
 * src/routes/entryTests.routes.ts
 * Entry test prep, mock sessions, merit cutoffs, progress, forum, notifications.
 *
 * Public:
 *   GET  /api/entry-test/questions        — questions (filter by test_type, subject)
 *   GET  /api/merit-cutoffs               — merit cutoffs (filter by program, year)
 *   POST /api/merit-cutoffs/calculator    — "Will I get in?" calculator
 *
 * Authenticated:
 *   POST /api/mock-test/start             — start a new mock test session
 *   POST /api/mock-test/:sessionId/answer — submit an answer
 *   POST /api/mock-test/:sessionId/finish — finish session, calculate score
 *   GET  /api/mock-test/history           — user's past sessions
 *
 *   GET  /api/progress                    — user's progress snapshot
 *   POST /api/progress/snapshot           — save a progress snapshot
 *
 *   GET  /api/forum/posts                 — list posts (paginated)
 *   POST /api/forum/posts                 — create post
 *   GET  /api/forum/posts/:id             — single post with replies
 *   POST /api/forum/posts/:id/reply       — add reply
 *   POST /api/forum/posts/:id/vote        — upvote/downvote post
 *   PUT  /api/forum/posts/:id/solve       — mark post solved (owner only)
 *
 *   GET  /api/notifications               — user's notifications
 *   POST /api/notifications/:id/read      — mark one as read
 *   POST /api/notifications/read-all      — mark all as read
 */
import { Router, Request, Response } from 'express';
import { pool, query, queryOne } from './db.js';
import { requireAuth } from './auth.middleware.js';

export const entryTestsRouter = Router();
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isUuid = (value: string) => UUID_PATTERN.test(value);

function boundedNumber(value: unknown, minimum: number, maximum: number, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(maximum, Math.max(minimum, parsed));
}

// ════════════════════════════════════════════════════════════
// ENTRY TEST QUESTIONS (public)
// ════════════════════════════════════════════════════════════

entryTestsRouter.get('/entry-test/questions', async (req: Request, res: Response) => {
  try {
    const testType = (req.query.test_type || '').toString().toUpperCase();
    const subject  = (req.query.subject  || '').toString();
    const diff     = (req.query.difficulty || '').toString();
    const limit    = Math.min(50, Number(req.query.limit) || 20);
    const params: any[] = [];
    let where = 'WHERE 1=1';
    if (testType) { params.push(testType); where += ` AND test_type = $${params.length}`; }
    if (subject)  { params.push(subject);  where += ` AND LOWER(subject) = LOWER($${params.length})`; }
    if (diff)     { params.push(diff);     where += ` AND LOWER(difficulty) = LOWER($${params.length})`; }
    params.push(limit);
    const rows = await query<any>(`SELECT * FROM entry_test_questions ${where} ORDER BY RANDOM() LIMIT $${params.length}`, params);
    // Don't expose correct answer in list — only expose per-session
    const safe = rows.map(q => ({ ...q, correct: undefined }));
    res.json({ data: safe, total: safe.length });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch questions', details: err.message });
  }
});

// ════════════════════════════════════════════════════════════
// MERIT CUTOFFS (public)
// ════════════════════════════════════════════════════════════

entryTestsRouter.get('/merit-cutoffs', async (req: Request, res: Response) => {
  try {
    const program = (req.query.program || '').toString().toLowerCase();
    const year    = (req.query.year    || '').toString();
    const params: any[] = [];
    let where = 'WHERE 1=1';
    if (program) { params.push(`%${program}%`); where += ` AND LOWER(program_name) LIKE $${params.length}`; }
    if (year)    { params.push(year); where += ` AND academic_year = $${params.length}`; }
    const rows = await query<any>(`SELECT * FROM merit_cutoffs ${where} ORDER BY merit_pct DESC`, params);
    res.json({ data: rows, total: rows.length });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch merit cutoffs', details: err.message });
  }
});

entryTestsRouter.post('/merit-cutoffs/calculator', async (req: Request, res: Response) => {
  try {
    const { fscPct, entryTestScore, programKeyword, year } = req.body;
    const fsc  = parseFloat(fscPct)        || 0;
    const test = parseFloat(entryTestScore) || 0;
    const prog = (programKeyword || '').toString().toLowerCase();
    const yr   = (year || '2024-25').toString();

    // Fetch cutoffs for the requested program
    const cutoffs = await query<any>(
      `SELECT * FROM merit_cutoffs
       WHERE LOWER(program_name) LIKE $1 AND academic_year = $2
       ORDER BY merit_pct ASC`,
      [`%${prog}%`, yr]
    );

    if (!cutoffs.length) {
      return res.json({
        aggregate: null,
        results: [],
        message: `No merit cutoff data found for "${programKeyword}" in ${yr}. Try a broader search.`,
      });
    }

    const results = cutoffs.map((c: any) => {
      // Calculate aggregate using each university's weighting
      const fscW  = Number(c.fsc_weight)  || 50;
      const testW = Number(c.test_weight) || 50;
      const aggregate = Math.round(((fsc * fscW / 100) + (test * testW / 100)) * 10) / 10;
      const gap = aggregate - Number(c.merit_pct);
      return {
        universityName: c.university_name,
        programName:    c.program_name,
        meritCutoff:    Number(c.merit_pct),
        yourAggregate:  aggregate,
        gap:            Math.round(gap * 10) / 10,
        chance:         gap >= 2  ? 'LIKELY'
                      : gap >= 0  ? 'BORDERLINE'
                      : gap >= -5 ? 'UNLIKELY'
                      :             'VERY_UNLIKELY',
        fscWeight:      fscW,
        testWeight:     testW,
        sourceUrl:      c.source_url || null,
      };
    });

    // Sort: likely first
    const order: Record<string,number> = { LIKELY:0, BORDERLINE:1, UNLIKELY:2, VERY_UNLIKELY:3 };
    results.sort((a: any, b: any) => (order[a.chance] || 0) - (order[b.chance] || 0));

    res.json({
      yourFscPct:       fsc,
      yourTestScore:    test,
      programSearched:  programKeyword,
      year:             yr,
      results,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Calculator failed', details: err.message });
  }
});

// ════════════════════════════════════════════════════════════
// MOCK TEST SESSIONS (authenticated)
// ════════════════════════════════════════════════════════════

entryTestsRouter.post('/mock-test/start', requireAuth(), async (req: Request, res: Response) => {
  try {
    const { testType, subject, questionCount = 20 } = req.body;
    if (!testType) return res.status(400).json({ error: 'testType is required' });
    const uid = req.user!.id;
    const count = Math.min(50, Math.max(5, Number(questionCount)));

    // Fetch random questions (with answers — returned to client for this session)
    const params: any[] = [testType.toUpperCase(), count];
    let whereSubj = '';
    if (subject) { params.push(subject); whereSubj = `AND LOWER(subject) = LOWER($${params.length})`; }
    const questions = await query<any>(
      `SELECT * FROM entry_test_questions WHERE test_type=$1 ${whereSubj} ORDER BY RANDOM() LIMIT $2`,
      params
    );
    if (!questions.length) {
      return res.status(404).json({ error: `No questions found for ${testType}${subject ? ' / ' + subject : ''}` });
    }

    // Create session
    const session = await queryOne<any>(
      `INSERT INTO mock_test_sessions (user_id, test_type, subject_filter, total_questions)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [uid, testType.toUpperCase(), subject || null, questions.length]
    );

    res.json({
      sessionId:      session!.id,
      testType:       session!.test_type,
      totalQuestions: questions.length,
      questions:      questions.map((q: any) => ({
        id:       q.id,
        subject:  q.subject,
        difficulty: q.difficulty,
        question: q.question,
        options:  { A: q.option_a, B: q.option_b, C: q.option_c, D: q.option_d },
        chapter:  q.chapter,
        marks:    q.marks,
        negativeMark: q.negative_marks,
      })),
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Could not start test session', details: err.message });
  }
});

// ── POST /api/mock-test/:sessionId/answer ────────────────────────────────────
// Save a draft answer without exposing correctness before the student finishes.
entryTestsRouter.post('/mock-test/:sessionId/answer', requireAuth(), async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { questionId, chosen = null, timeSecs = null } = req.body;
    if (!isUuid(sessionId) || !isUuid(String(questionId || '')))
      return res.status(404).json({ error: 'Test session or question not found.' });
    if (chosen !== null && !['A', 'B', 'C', 'D'].includes(String(chosen).toUpperCase()))
      return res.status(400).json({ error: 'chosen must be A, B, C, D, or null.' });

    const session = await queryOne<any>(
      'SELECT id, test_type, completed_at FROM mock_test_sessions WHERE id=$1 AND user_id=$2',
      [sessionId, req.user!.id]
    );
    if (!session || session.completed_at) return res.status(404).json({ error: 'Active test session not found.' });

    const question = await queryOne<any>(
      'SELECT id FROM entry_test_questions WHERE id=$1 AND test_type=$2',
      [questionId, session.test_type]
    );
    if (!question) return res.status(404).json({ error: 'Question not found for this test.' });

    await pool.query('DELETE FROM mock_test_answers WHERE session_id=$1 AND question_id=$2', [sessionId, questionId]);
    await pool.query(
      'INSERT INTO mock_test_answers (session_id, question_id, chosen, is_correct, time_secs) VALUES ($1,$2,$3,FALSE,$4)',
      [sessionId, questionId, chosen === null ? null : String(chosen).toUpperCase(), boundedNumber(timeSecs, 0, 14400, 0) || null]
    );
    res.json({ success: true, message: 'Answer saved.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Could not save answer.', details: err.message });
  }
});

entryTestsRouter.post('/mock-test/:sessionId/finish', requireAuth(), async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { answers, timeTakenSecs } = req.body;
    // answers: Array<{ questionId: string; chosen: 'A'|'B'|'C'|'D'|null }>
    if (!Array.isArray(answers)) return res.status(400).json({ error: 'answers array required' });

    const uid = req.user!.id;
    const session = await queryOne<any>(`SELECT * FROM mock_test_sessions WHERE id=$1 AND user_id=$2`, [sessionId, uid]);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (session.completed_at) return res.json({ message: 'Already completed', score: session.score_pct });

    await pool.query('DELETE FROM mock_test_answers WHERE session_id=$1', [sessionId]);

    let correct = 0, incorrect = 0, skipped = 0;
    const answerRows: any[] = [];

    for (const ans of answers) {
      const q = await queryOne<any>(`SELECT correct, marks, negative_marks FROM entry_test_questions WHERE id=$1`, [ans.questionId]);
      if (!q) continue;
      const chosen = ans.chosen ? ans.chosen.toUpperCase() : null;
      let isCorrect = false;
      if (!chosen) { skipped++; }
      else if (chosen === q.correct) { correct++; isCorrect = true; }
      else { incorrect++; }
      answerRows.push({ session_id: sessionId, question_id: ans.questionId, chosen, is_correct: isCorrect });
    }

    // Bulk insert answers
    for (const ar of answerRows) {
      await pool.query(
        `INSERT INTO mock_test_answers (session_id,question_id,chosen,is_correct) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING`,
        [ar.session_id, ar.question_id, ar.chosen, ar.is_correct]
      );
    }

    const total = session.total_questions || 1;
    const scorePct = Math.round((correct / total) * 100);

    await pool.query(
      `UPDATE mock_test_sessions SET correct=$1,incorrect=$2,skipped=$3,score_pct=$4,time_taken_secs=$5,completed_at=NOW() WHERE id=$6`,
      [correct, incorrect, skipped, scorePct, timeTakenSecs || null, sessionId]
    );

    res.json({ correct, incorrect, skipped, total, scorePct, message: scorePct >= 70 ? 'Excellent! Above merit benchmark.' : scorePct >= 50 ? 'Good — keep practising.' : 'Needs improvement. Review weak chapters.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Could not finish session', details: err.message });
  }
});

// ── POST /api/progress/snapshot ──────────────────────────────────────────────
// Supports an explicit client-side snapshot in addition to the live snapshot
// generated by GET /api/progress.
entryTestsRouter.post('/progress/snapshot', requireAuth(), async (req: Request, res: Response) => {
  try {
    const value = req.body || {};
    const snapshot = {
      skillsCount: boundedNumber(value.skillsCount, 0, 10000),
      coursesEnrolled: boundedNumber(value.coursesEnrolled, 0, 10000),
      applicationsCount: boundedNumber(value.applicationsCount, 0, 10000),
      roadmapPct: boundedNumber(value.roadmapPct, 0, 100),
      interviewSessions: boundedNumber(value.interviewSessions, 0, 10000),
      avgInterviewScore: value.avgInterviewScore == null ? null : boundedNumber(value.avgInterviewScore, 0, 100),
      mockTestSessions: boundedNumber(value.mockTestSessions, 0, 10000),
      avgMockTestScore: value.avgMockTestScore == null ? null : boundedNumber(value.avgMockTestScore, 0, 100),
      riasecCompleted: Boolean(value.riasecCompleted),
      readinessScore: value.readinessScore == null ? null : boundedNumber(value.readinessScore, 0, 100),
    };
    const row = await queryOne<any>(
      `INSERT INTO progress_snapshots
       (user_id, skills_count, courses_enrolled, applications_count, roadmap_pct, interview_sessions,
        avg_interview_score, mock_test_sessions, avg_mock_test_score, riasec_completed, readiness_score)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (user_id, snapshot_date) DO UPDATE SET
         skills_count=EXCLUDED.skills_count, courses_enrolled=EXCLUDED.courses_enrolled,
         applications_count=EXCLUDED.applications_count, roadmap_pct=EXCLUDED.roadmap_pct,
         interview_sessions=EXCLUDED.interview_sessions, avg_interview_score=EXCLUDED.avg_interview_score,
         mock_test_sessions=EXCLUDED.mock_test_sessions, avg_mock_test_score=EXCLUDED.avg_mock_test_score,
         riasec_completed=EXCLUDED.riasec_completed, readiness_score=EXCLUDED.readiness_score
       RETURNING *`,
      [req.user!.id, snapshot.skillsCount, snapshot.coursesEnrolled, snapshot.applicationsCount,
       snapshot.roadmapPct, snapshot.interviewSessions, snapshot.avgInterviewScore,
       snapshot.mockTestSessions, snapshot.avgMockTestScore, snapshot.riasecCompleted, snapshot.readinessScore]
    );
    res.status(201).json({ success: true, data: row });
  } catch (err: any) {
    res.status(500).json({ error: 'Could not save progress snapshot.', details: err.message });
  }
});

entryTestsRouter.get('/mock-test/history', requireAuth(), async (req: Request, res: Response) => {
  try {
    const rows = await query<any>(
      `SELECT id, test_type, subject_filter, total_questions, correct, incorrect, score_pct, time_taken_secs, started_at, completed_at
       FROM mock_test_sessions WHERE user_id=$1 ORDER BY started_at DESC LIMIT 20`,
      [req.user!.id]
    );
    res.json({ data: rows });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch history', details: err.message });
  }
});

// ════════════════════════════════════════════════════════════
// PROGRESS TRACKER (authenticated)
// ════════════════════════════════════════════════════════════

entryTestsRouter.get('/progress', requireAuth(), async (req: Request, res: Response) => {
  try {
    const uid = req.user!.id;

    // Collect live metrics
    const [skills, bookmarks, applications, roadmapMilestones, interviews, mockTests, quiz] = await Promise.all([
      queryOne<any>(`SELECT COUNT(*) AS n FROM user_skills WHERE user_id=$1`, [uid]),
      queryOne<any>(`SELECT COUNT(*) AS n FROM bookmarks WHERE user_id=$1`, [uid]),
      queryOne<any>(`SELECT COUNT(*) AS n FROM applications WHERE user_id=$1`, [uid]),
      queryOne<any>(`SELECT COUNT(*) AS total, SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) AS done FROM roadmap_milestones rm JOIN roadmaps r ON r.id=rm.roadmap_id WHERE r.user_id=$1`, [uid]),
      queryOne<any>(`SELECT COUNT(*) AS n, AVG(overall_score) AS avg_score FROM interview_sessions WHERE user_id=$1 AND overall_score IS NOT NULL`, [uid]),
      queryOne<any>(`SELECT COUNT(*) AS n, AVG(score_pct) AS avg_score FROM mock_test_sessions WHERE user_id=$1 AND completed_at IS NOT NULL`, [uid]),
      queryOne<any>(`SELECT COUNT(*) AS n FROM quiz_results WHERE user_id=$1`, [uid]),
    ]);

    const milestoneTotal = Number(roadmapMilestones?.total) || 0;
    const milestoneDone  = Number(roadmapMilestones?.done)  || 0;
    const roadmapPct     = milestoneTotal > 0 ? Math.round((milestoneDone / milestoneTotal) * 100) : 0;

    // Weekly snapshots (last 8 weeks)
    const snapshots = await query<any>(
      `SELECT * FROM progress_snapshots WHERE user_id=$1 ORDER BY snapshot_date DESC LIMIT 8`,
      [uid]
    );

    const current = {
      skillsCount:         Number(skills?.n) || 0,
      bookmarksCount:      Number(bookmarks?.n) || 0,
      applicationsCount:   Number(applications?.n) || 0,
      roadmapPct,
      interviewSessions:   Number(interviews?.n) || 0,
      avgInterviewScore:   interviews?.avg_score ? Math.round(Number(interviews.avg_score)) : null,
      mockTestSessions:    Number(mockTests?.n) || 0,
      avgMockTestScore:    mockTests?.avg_score ? Math.round(Number(mockTests.avg_score)) : null,
      riasecCompleted:     Number(quiz?.n) > 0,
    };

    // Calculate readiness score (0-100)
    let readiness = 0;
    if (current.riasecCompleted)         readiness += 20;
    if (current.skillsCount >= 3)        readiness += 20;
    if (current.skillsCount >= 8)        readiness += 5;
    if (current.roadmapPct >= 25)        readiness += 15;
    if (current.roadmapPct >= 75)        readiness += 10;
    if (current.interviewSessions >= 1)  readiness += 15;
    if (current.mockTestSessions >= 1)   readiness += 10;
    if (current.applicationsCount >= 1)  readiness += 5;
    current['readinessScore'] = Math.min(100, readiness);

    // Save today's snapshot
    await pool.query(
      `INSERT INTO progress_snapshots (user_id, skills_count, courses_enrolled, applications_count, roadmap_pct, interview_sessions, avg_interview_score, mock_test_sessions, avg_mock_test_score, riasec_completed, readiness_score)
       VALUES ($1,$2,0,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (user_id, snapshot_date) DO UPDATE SET
         skills_count=EXCLUDED.skills_count, applications_count=EXCLUDED.applications_count,
         roadmap_pct=EXCLUDED.roadmap_pct, interview_sessions=EXCLUDED.interview_sessions,
         avg_interview_score=EXCLUDED.avg_interview_score, mock_test_sessions=EXCLUDED.mock_test_sessions,
         avg_mock_test_score=EXCLUDED.avg_mock_test_score, riasec_completed=EXCLUDED.riasec_completed,
         readiness_score=EXCLUDED.readiness_score`,
      [uid, current.skillsCount, current.applicationsCount, current.roadmapPct,
       current.interviewSessions, current.avgInterviewScore, current.mockTestSessions,
       current.avgMockTestScore, current.riasecCompleted, current['readinessScore']]
    );

    res.json({ current, history: snapshots.reverse() });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch progress', details: err.message });
  }
});

// ════════════════════════════════════════════════════════════
// COMMUNITY FORUM (authenticated)
// ════════════════════════════════════════════════════════════

entryTestsRouter.get('/forum/posts', async (req: Request, res: Response) => {
  try {
    const page     = Math.max(1, Number(req.query.page) || 1);
    const limit    = Math.min(50, Number(req.query.limit) || 15);
    const category = (req.query.category || '').toString();
    const search   = (req.query.search || '').toString().toLowerCase();
    const params: any[] = [];
    let where = 'WHERE 1=1';
    if (category) { params.push(category); where += ` AND LOWER(fp.category) = LOWER($${params.length})`; }
    if (search)   { params.push(`%${search}%`); where += ` AND (LOWER(fp.title) LIKE $${params.length} OR LOWER(fp.body) LIKE $${params.length})`; }
    params.push(limit, (page-1)*limit);
    const posts = await query<any>(
      `SELECT fp.*, u.first_name || ' ' || u.last_name AS author_name
       FROM forum_posts fp
       JOIN users u ON u.id = fp.user_id
       ${where}
       ORDER BY fp.is_pinned DESC, fp.created_at DESC
       LIMIT $${params.length-1} OFFSET $${params.length}`,
      params
    );
    const countParams = params.slice(0, params.length - 2);
    const countRow = await queryOne<any>(`SELECT COUNT(*) AS n FROM forum_posts fp ${where}`, countParams);
    res.json({ data: posts, total: Number(countRow?.n) || 0, page, limit });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch forum posts', details: err.message });
  }
});

entryTestsRouter.post('/forum/posts', requireAuth(), async (req: Request, res: Response) => {
  try {
    const { title, body, category = 'General' } = req.body;
    if (!title?.trim() || !body?.trim()) return res.status(400).json({ error: 'title and body required' });
    const post = await queryOne<any>(
      `INSERT INTO forum_posts (user_id, title, body, category) VALUES ($1,$2,$3,$4) RETURNING *`,
      [req.user!.id, title.trim().slice(0,300), body.trim().slice(0,5000), category]
    );
    res.status(201).json({ data: post });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create post', details: err.message });
  }
});

entryTestsRouter.get('/forum/posts/:id', async (req: Request, res: Response) => {
  if (!isUuid(req.params.id)) return res.status(404).json({ error: 'Post not found' });
  try {
    await pool.query(`UPDATE forum_posts SET view_count = view_count + 1 WHERE id=$1`, [req.params.id]);
    const post = await queryOne<any>(
      `SELECT fp.*, u.first_name || ' ' || u.last_name AS author_name
       FROM forum_posts fp JOIN users u ON u.id=fp.user_id WHERE fp.id=$1`,
      [req.params.id]
    );
    if (!post) return res.status(404).json({ error: 'Post not found' });
    const replies = await query<any>(
      `SELECT fr.*, u.first_name || ' ' || u.last_name AS author_name
       FROM forum_replies fr JOIN users u ON u.id=fr.user_id
       WHERE fr.post_id=$1 ORDER BY fr.is_accepted DESC, fr.vote_count DESC, fr.created_at ASC`,
      [req.params.id]
    );
    res.json({ data: { ...post, replies } });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch post', details: err.message });
  }
});

entryTestsRouter.post('/forum/posts/:id/reply', requireAuth(), async (req: Request, res: Response) => {
  if (!isUuid(req.params.id)) return res.status(404).json({ error: 'Post not found' });
  try {
    const { body } = req.body;
    if (!body?.trim()) return res.status(400).json({ error: 'body required' });
    const reply = await queryOne<any>(
      `INSERT INTO forum_replies (post_id, user_id, body) VALUES ($1,$2,$3) RETURNING *`,
      [req.params.id, req.user!.id, body.trim().slice(0,3000)]
    );
    await pool.query(`UPDATE forum_posts SET reply_count = reply_count + 1 WHERE id=$1`, [req.params.id]);
    res.status(201).json({ data: reply });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to add reply', details: err.message });
  }
});

entryTestsRouter.post('/forum/posts/:id/vote', requireAuth(), async (req: Request, res: Response) => {
  if (!isUuid(req.params.id)) return res.status(404).json({ error: 'Post not found' });
  try {
    const { value = 1 } = req.body;
    const v = value >= 0 ? 1 : -1;
    await pool.query(
      `INSERT INTO forum_votes (user_id, post_id, value) VALUES ($1,$2,$3)
       ON CONFLICT (user_id, post_id) DO UPDATE SET value=$3`,
      [req.user!.id, req.params.id, v]
    );
    const total = await pool.query(
      `UPDATE forum_posts SET vote_count = (SELECT COALESCE(SUM(value),0) FROM forum_votes WHERE post_id=$1) WHERE id=$1 RETURNING vote_count`,
      [req.params.id]
    );
    res.json({ voteCount: total.rows[0]?.vote_count });
  } catch (err: any) {
    res.status(500).json({ error: 'Vote failed', details: err.message });
  }
});

entryTestsRouter.put('/forum/posts/:id/solve', requireAuth(), async (req: Request, res: Response) => {
  if (!isUuid(req.params.id)) return res.status(404).json({ error: 'Post not found' });
  try {
    const post = await queryOne<any>(`SELECT user_id FROM forum_posts WHERE id=$1`, [req.params.id]);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (post.user_id !== req.user!.id && req.user!.role !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' });
    await pool.query(`UPDATE forum_posts SET is_solved=TRUE WHERE id=$1`, [req.params.id]);
    res.json({ message: 'Marked as solved' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to mark solved', details: err.message });
  }
});

// ════════════════════════════════════════════════════════════
// NOTIFICATIONS (authenticated)
// ════════════════════════════════════════════════════════════

entryTestsRouter.get('/notifications', requireAuth(), async (req: Request, res: Response) => {
  try {
    const rows = await query<any>(
      `SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50`,
      [req.user!.id]
    );
    const unread = rows.filter((n: any) => !n.is_read).length;
    res.json({ data: rows, unread });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch notifications', details: err.message });
  }
});

entryTestsRouter.post('/notifications/:id/read', requireAuth(), async (req: Request, res: Response) => {
  try {
    await pool.query(`UPDATE notifications SET is_read=TRUE WHERE id=$1 AND user_id=$2`, [req.params.id, req.user!.id]);
    res.json({ message: 'Marked as read' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed', details: err.message });
  }
});

entryTestsRouter.post('/notifications/read-all', requireAuth(), async (req: Request, res: Response) => {
  try {
    await pool.query(`UPDATE notifications SET is_read=TRUE WHERE user_id=$1`, [req.user!.id]);
    res.json({ message: 'All marked as read' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed', details: err.message });
  }
});
