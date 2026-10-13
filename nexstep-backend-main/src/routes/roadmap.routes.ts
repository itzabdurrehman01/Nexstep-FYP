/**
 * src/server/roadmap.routes.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * User-scoped roadmap persistence in PostgreSQL.
 *
 *  GET  /api/roadmap         — load user's roadmap
 *  PUT  /api/roadmap         — save/replace user's roadmap
 *  DELETE /api/roadmap       — reset roadmap to defaults
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { Router, Request, Response } from 'express';
import { pool, query, queryOne } from './db.js';
import { requireAuth } from './auth.middleware.js';

const router = Router();
// `/api/roadmap/generate` belongs to the public recommendation router. Let it
// pass through this persistence router so its own route can handle the request.
router.use((req, res, next) => {
  if (req.path === '/generate') return next();
  return requireAuth()(req, res, next);
});

// ── GET /api/roadmap ──────────────────────────────────────────────────────────
router.get('/', async (req: Request, res: Response) => {
  try {
    const uid = req.user!.id;

    const roadmap = await queryOne<any>(
      'SELECT id, selected_career_id AS "selectedCareerId", last_updated AS "lastUpdated" FROM roadmaps WHERE user_id=$1',
      [uid]
    );
    if (!roadmap) return res.json({ data: null });

    const milestones = await query<any>(
      `SELECT id, position, title, period, status FROM roadmap_milestones
       WHERE roadmap_id=$1 ORDER BY position ASC`,
      [roadmap.id]
    );

    const enriched = await Promise.all(milestones.map(async (m: any) => {
      const tasks = await query<any>(
        `SELECT task_key AS id, text, done FROM roadmap_tasks
         WHERE milestone_id=$1 ORDER BY task_key ASC`,
        [m.id]
      );
      return {
        id:     m.position,
        title:  m.title,
        period: m.period,
        status: m.status,
        tasks,
        _pgId:  m.id,
      };
    }));

    res.json({
      data: {
        selectedCareerId: roadmap.selectedCareerId,
        milestones:       enriched,
        lastUpdated:      roadmap.lastUpdated,
      }
    });
  } catch (err: any) {
    console.error('GET /roadmap error:', err.message);
    res.status(500).json({ error: 'Failed to load roadmap.' });
  }
});

// ── PUT /api/roadmap ──────────────────────────────────────────────────────────
// Saves the entire roadmap state atomically (upsert).
router.put('/', async (req: Request, res: Response) => {
  try {
    const uid = req.user!.id;
    const { selectedCareerId, milestones } = req.body;

    if (!selectedCareerId || !Array.isArray(milestones))
      return res.status(400).json({ error: 'selectedCareerId and milestones are required.' });

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Upsert roadmap header
      const roadmapResult = await client.query(
        `INSERT INTO roadmaps (user_id, selected_career_id, last_updated)
         VALUES ($1, $2, NOW())
         ON CONFLICT (user_id) DO UPDATE
         SET selected_career_id = EXCLUDED.selected_career_id, last_updated = NOW()
         RETURNING id`,
        [uid, selectedCareerId]
      );
      const roadmapId = roadmapResult.rows[0].id;

      // Delete existing milestones (cascade deletes tasks)
      await client.query('DELETE FROM roadmap_milestones WHERE roadmap_id=$1', [roadmapId]);

      // Re-insert milestones and tasks
      for (const m of milestones) {
        const mResult = await client.query(
          `INSERT INTO roadmap_milestones (roadmap_id, position, title, period, status)
           VALUES ($1,$2,$3,$4,$5) RETURNING id`,
          [roadmapId, m.id ?? m.position, m.title, m.period, m.status ?? 'upcoming']
        );
        const milestoneDbId = mResult.rows[0].id;

        for (const t of (m.tasks ?? [])) {
          await client.query(
            `INSERT INTO roadmap_tasks (milestone_id, task_key, text, done)
             VALUES ($1,$2,$3,$4)`,
            [milestoneDbId, t.id, t.text, t.done ?? false]
          );
        }
      }

      await client.query('COMMIT');
      res.json({ success: true, message: 'Roadmap saved.' });
    } catch (txErr) {
      await client.query('ROLLBACK');
      throw txErr;
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.error('PUT /roadmap error:', err.message);
    res.status(500).json({ error: 'Failed to save roadmap.' });
  }
});

// ── DELETE /api/roadmap ───────────────────────────────────────────────────────
router.delete('/', async (req: Request, res: Response) => {
  try {
    // Cascade deletes milestones and tasks
    await query('DELETE FROM roadmaps WHERE user_id=$1', [req.user!.id]);
    res.json({ success: true, message: 'Roadmap reset.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to reset roadmap.' });
  }
});

export { router as roadmapRouter };
