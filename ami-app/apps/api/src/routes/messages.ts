import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { query } from '../db/connection';
import { authenticate } from '../middleware/auth';
import { requireTier } from '../middleware/requireTier';

const router = Router();

// 30 messages per minute rate limiter
const messageRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'MESSAGE_RATE_LIMIT',
    message: 'Message rate limit exceeded (max 30/min). Please slow down.',
  },
});

router.use(authenticate, requireTier(2));

// GET /conversations — list user's conversations
router.get('/conversations', async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.sub;

  try {
    const result = await query(
      `SELECT c.id, c.type, c.updated_at,
              CASE WHEN c.user1_id = $1 THEN c.user2_id ELSE c.user1_id END AS other_user_id,
              p.display_name AS other_user_name,
              p.avatar_url AS other_user_avatar,
              (
                SELECT content FROM messages m
                WHERE m.conversation_id = c.id
                ORDER BY m.created_at DESC LIMIT 1
              ) AS last_message_content,
              (
                SELECT created_at FROM messages m
                WHERE m.conversation_id = c.id
                ORDER BY m.created_at DESC LIMIT 1
              ) AS last_message_time,
              (
                SELECT COUNT(*)::int FROM messages m
                WHERE m.conversation_id = c.id AND m.sender_id != $1 AND m.is_read = false
              ) AS unread_count
       FROM conversations c
       JOIN profiles p ON p.user_id = (CASE WHEN c.user1_id = $1 THEN c.user2_id ELSE c.user1_id END)
       WHERE (c.user1_id = $1 OR c.user2_id = $1)
       ORDER BY c.updated_at DESC`,
      [userId]
    );

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'SERVER_ERROR', message: error.message });
  }
});

// GET /conversations/:id/messages — paginated messages
router.get('/conversations/:id/messages', async (req: Request, res: Response): Promise<void> => {
  const convId = req.params.id;
  const userId = req.user!.sub;
  const { page = '1', limit = '50' } = req.query;

  const offset = (Math.max(1, parseInt(String(page), 10)) - 1) * parseInt(String(limit), 10);
  const limitVal = Math.min(100, Math.max(1, parseInt(String(limit), 10)));

  try {
    // Check membership
    const membership = await query(
      `SELECT id FROM conversations WHERE id = $1 AND (user1_id = $2 OR user2_id = $2)`,
      [convId, userId]
    );

    if (membership.rowCount === 0) {
      res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'You are not a member of this conversation',
      });
      return;
    }

    // Mark messages sent by the other party as read
    await query(
      `UPDATE messages SET is_read = true WHERE conversation_id = $1 AND sender_id != $2`,
      [convId, userId]
    );

    const messagesRes = await query(
      `SELECT m.id, m.conversation_id, m.sender_id, m.content, m.is_read, m.created_at,
              p.display_name AS sender_name
       FROM messages m
       JOIN profiles p ON p.user_id = m.sender_id
       WHERE m.conversation_id = $1
       ORDER BY m.created_at ASC
       LIMIT $2 OFFSET $3`,
      [convId, limitVal, offset]
    );

    res.json({
      success: true,
      data: messagesRes.rows,
      meta: {
        page: Number(page),
        limit: limitVal,
        count: messagesRes.rows.length,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'SERVER_ERROR', message: error.message });
  }
});

// POST /conversations/:id/messages — send message with rate limiting
router.post(
  '/conversations/:id/messages',
  messageRateLimit,
  async (req: Request, res: Response): Promise<void> => {
    const convId = req.params.id;
    const senderId = req.user!.sub;
    const { content } = req.body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: 'EMPTY_MESSAGE',
        message: 'Message content cannot be empty',
      });
      return;
    }

    try {
      // 1. Verify membership
      const convRes = await query(
        `SELECT user1_id, user2_id FROM conversations WHERE id = $1 AND (user1_id = $2 OR user2_id = $2)`,
        [convId, senderId]
      );

      if (convRes.rowCount === 0) {
        res.status(403).json({
          success: false,
          error: 'FORBIDDEN',
          message: 'You are not a participant in this conversation',
        });
        return;
      }

      const conv = convRes.rows[0];
      const otherUserId = conv.user1_id === senderId ? conv.user2_id : conv.user1_id;

      // 2. Check if blocked
      const blockRes = await query(
        `SELECT id FROM user_reports
         WHERE reason = 'USER_BLOCKED'
           AND ((reporter_id = $1 AND reported_user_id = $2)
             OR (reporter_id = $2 AND reported_user_id = $1))`,
        [senderId, otherUserId]
      );

      if (blockRes.rowCount && blockRes.rowCount > 0) {
        res.status(403).json({
          success: false,
          error: 'COMMUNICATION_BLOCKED',
          message: 'Communication between these accounts is blocked.',
        });
        return;
      }

      // 3. Insert message
      const msgRes = await query(
        `INSERT INTO messages (conversation_id, sender_id, content, is_read, created_at)
         VALUES ($1, $2, $3, false, NOW())
         RETURNING *`,
        [convId, senderId, content.trim()]
      );

      // 4. Update conversation timestamp
      await query(`UPDATE conversations SET updated_at = NOW() WHERE id = $1`, [convId]);

      res.status(201).json({
        success: true,
        data: msgRes.rows[0],
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: 'SERVER_ERROR', message: error.message });
    }
  }
);

// POST /conversations — create conversation between confirmed buddies
router.post('/conversations', async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.sub;
  const { buddyUserId } = req.body;

  if (!buddyUserId || buddyUserId === userId) {
    res.status(400).json({ success: false, error: 'INVALID_BUDDY', message: 'Valid buddy user ID required' });
    return;
  }

  try {
    // Check confirmed buddy match exists
    const matchRes = await query(
      `SELECT id FROM buddy_matches
       WHERE is_active = true
         AND ((user1_id = $1 AND user2_id = $2)
           OR (user1_id = $2 AND user2_id = $1))`,
      [userId, buddyUserId]
    );

    if (matchRes.rowCount === 0) {
      res.status(403).json({
        success: false,
        error: 'BUDDY_MATCH_REQUIRED',
        message: 'Direct conversations can only be started between confirmed buddies',
      });
      return;
    }

    const convRes = await query(
      `INSERT INTO conversations (type, user1_id, user2_id)
       VALUES ('direct', $1, $2)
       ON CONFLICT (user1_id, user2_id)
       DO UPDATE SET updated_at = NOW()
       RETURNING *`,
      [userId, buddyUserId]
    );

    res.json({
      success: true,
      data: convRes.rows[0],
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'SERVER_ERROR', message: error.message });
  }
});

export { router as messagesRouter };
