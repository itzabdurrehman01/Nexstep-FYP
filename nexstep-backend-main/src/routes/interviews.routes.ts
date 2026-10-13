/**
 * src/server/interviews.routes.ts
 * ─────────────────────────────────────────────────────────────────────────────
 *  POST /api/interviews      — save a completed interview session
 *  GET  /api/interviews      — list user's interview history
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { Router, Request, Response } from 'express';
import { query, queryOne } from './db.js';
import { requireAuth } from './auth.middleware.js';

const router = Router();
router.use(requireAuth());

router.post('/', async (req: Request, res: Response) => {
  try {
    const uid = req.user!.id;
    const {
      category, difficulty, overallScore, grade, totalQuestions,
      topStrengths, areasToImprove, recommendedTopics, perQuestion,
    } = req.body;

    const row = await queryOne<any>(
      `INSERT INTO interview_sessions
       (user_id, category, difficulty, overall_score, grade, total_questions,
        top_strengths, areas_to_improve, recommended_topics, per_question)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING id, overall_score AS "overallScore", grade, created_at AS "createdAt"`,
      [
        uid, category, difficulty,
        Number(overallScore) || 0,
        grade,
        Number(totalQuestions) || 0,
        JSON.stringify(topStrengths    || []),
        JSON.stringify(areasToImprove  || []),
        JSON.stringify(recommendedTopics || []),
        JSON.stringify(perQuestion     || []),
      ]
    );
    res.status(201).json({ success: true, data: row });
  } catch (err: any) {
    console.error('POST /interviews error:', err.message);
    res.status(500).json({ error: 'Failed to save interview session.' });
  }
});

router.get('/', async (req: Request, res: Response) => {
  try {
    const rows = await query<any>(
      `SELECT id, category, difficulty,
              overall_score AS "overallScore",
              grade, total_questions AS "totalQuestions",
              top_strengths AS "topStrengths",
              areas_to_improve AS "areasToImprove",
              recommended_topics AS "recommendedTopics",
              per_question AS "perQuestion",
              created_at AS "date"
       FROM interview_sessions
       WHERE user_id=$1
       ORDER BY created_at DESC
       LIMIT 20`,
      [req.user!.id]
    );
    res.json({ count: rows.length, data: rows });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to load interview history.' });
  }
});

export { router as interviewsRouter };
