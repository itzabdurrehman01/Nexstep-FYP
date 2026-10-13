import { Router } from 'express';
import { pool } from './db.js';
import { requireAuth } from './auth.middleware.js';
import { requireAdmin } from './adminPortal.routes.js';

export const feedbackRouter = Router();

// Ensure pilot_feedback table exists
pool.query(`
  CREATE TABLE IF NOT EXISTS pilot_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    feedback_type VARCHAR(50) NOT NULL, -- 'DATA_ERROR', 'RECOMMENDATION_RATING', 'BROKEN_URL'
    entity_type VARCHAR(100),
    entity_id VARCHAR(255),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comments TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
`).catch((err) => console.error('Error creating pilot_feedback table:', err));

// 1. Student Pilot: Report incorrect data or broken link
feedbackRouter.post('/report-data', requireAuth(), async (req, res) => {
  try {
    const { entityType, entityId, comments } = req.body;
    if (!comments || !comments.trim()) {
      return res.status(400).json({ error: 'comments text is required.' });
    }
    const userId = req.user!.id;
    await pool.query(
      `INSERT INTO pilot_feedback (user_id, feedback_type, entity_type, entity_id, comments)
       VALUES ($1, 'DATA_ERROR', $2, $3, $4)`,
      [userId, entityType || 'GENERAL', entityId || null, comments.trim()]
    );
    res.json({ message: 'Feedback report submitted successfully. Thank you!', status: 'SUBMITTED' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to submit report', details: err.message });
  }
});

// 2. Student Pilot: Rate recommendation usefulness
feedbackRouter.post('/pilot-rating', requireAuth(), async (req, res) => {
  try {
    const { rating, comments } = req.body;
    if (!rating || typeof rating !== 'number' || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'rating must be an integer between 1 and 5.' });
    }
    const userId = req.user!.id;
    await pool.query(
      `INSERT INTO pilot_feedback (user_id, feedback_type, rating, comments)
       VALUES ($1, 'RECOMMENDATION_RATING', $2, $3)`,
      [userId, rating, comments?.trim() || null]
    );
    res.json({ message: 'Pilot rating recorded.', status: 'RECORDED' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to submit rating', details: err.message });
  }
});

// 3. Admin: View pilot feedback
feedbackRouter.get('/admin/list', requireAdmin, async (_req, res) => {
  try {
    const result = await pool.query('SELECT * FROM pilot_feedback ORDER BY created_at DESC LIMIT 100');
    res.json({ count: result.rows.length, feedback: result.rows });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch feedback list', details: err.message });
  }
});
