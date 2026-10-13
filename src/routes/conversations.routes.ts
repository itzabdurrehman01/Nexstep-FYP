/**
 * src/server/conversations.routes.ts
 * ─────────────────────────────────────────────────────────────────────────────
 *  GET  /api/conversations               — list user's AI conversations
 *  POST /api/conversations               — create new conversation
 *  GET  /api/conversations/:id/messages  — get messages for conversation
 *  POST /api/conversations/:id/messages  — append message to conversation
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { Router, Request, Response } from 'express';
import { query, queryOne } from './db.js';
import { requireAuth } from './auth.middleware.js';

const router = Router();
router.use(requireAuth());

// List conversations
router.get('/', async (req: Request, res: Response) => {
  try {
    const rows = await query<any>(
      `SELECT id, title, updated_at AS "updatedAt",
              (SELECT content FROM ai_messages WHERE conversation_id=ac.id ORDER BY created_at DESC LIMIT 1) AS "lastMessage"
       FROM ai_conversations ac
       WHERE user_id=$1 ORDER BY updated_at DESC LIMIT 50`,
      [req.user!.id]
    );
    res.json({ count: rows.length, data: rows });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to load conversations.' });
  }
});

// Create new conversation
router.post('/', async (req: Request, res: Response) => {
  try {
    const { title = 'New Conversation' } = req.body;
    const row = await queryOne<any>(
      `INSERT INTO ai_conversations (user_id, title) VALUES ($1,$2)
       RETURNING id, title, created_at AS "createdAt"`,
      [req.user!.id, title]
    );
    res.status(201).json({ success: true, data: row });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create conversation.' });
  }
});

// Get messages for a conversation (ownership enforced)
router.get('/:id/messages', async (req: Request, res: Response) => {
  try {
    // Verify ownership
    const convo = await queryOne<any>(
      'SELECT id FROM ai_conversations WHERE id=$1 AND user_id=$2',
      [req.params.id, req.user!.id]
    );
    if (!convo) return res.status(404).json({ error: 'Conversation not found.' });

    const messages = await query<any>(
      `SELECT id, role, content, created_at AS "createdAt"
       FROM ai_messages WHERE conversation_id=$1 ORDER BY created_at ASC`,
      [req.params.id]
    );
    res.json({ count: messages.length, data: messages });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to load messages.' });
  }
});

// Append message to conversation
router.post('/:id/messages', async (req: Request, res: Response) => {
  try {
    // Verify ownership before writing
    const convo = await queryOne<any>(
      'SELECT id FROM ai_conversations WHERE id=$1 AND user_id=$2',
      [req.params.id, req.user!.id]
    );
    if (!convo) return res.status(404).json({ error: 'Conversation not found.' });

    const { role, content } = req.body;
    if (!role || !content)
      return res.status(400).json({ error: 'role and content are required.' });
    if (!['user', 'assistant'].includes(role))
      return res.status(400).json({ error: 'role must be "user" or "assistant".' });

    const msg = await queryOne<any>(
      `INSERT INTO ai_messages (conversation_id, role, content) VALUES ($1,$2,$3)
       RETURNING id, role, content, created_at AS "createdAt"`,
      [req.params.id, role, content]
    );

    // Update conversation updated_at
    await query(
      'UPDATE ai_conversations SET updated_at=NOW() WHERE id=$1',
      [req.params.id]
    );

    res.status(201).json({ success: true, data: msg });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to save message.' });
  }
});

export { router as conversationsRouter };
