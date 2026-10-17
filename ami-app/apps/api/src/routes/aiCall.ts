import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { query } from '../db/connection';
import { authenticate } from '../middleware/auth';
import { getAmiResponse } from '../providers/gemini';
import { synthesizeSpeech } from '../providers/elevenlabs';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'ami-default-development-secret-key-32-chars-min';

router.use(authenticate);

// POST /ai-call/session — Start AI call session & issue short-lived 2h session token
router.post('/session', async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.sub;

  try {
    const sessionRes = await query(
      `INSERT INTO ai_call_sessions (user_id, started_at, distress_flag_count)
       VALUES ($1, NOW(), 0)
       RETURNING id, started_at`,
      [userId]
    );

    const session = sessionRes.rows[0];

    const sessionToken = jwt.sign(
      {
        sub: userId,
        sessionId: session.id,
        type: 'ai_call_session',
      },
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    res.status(201).json({
      success: true,
      data: {
        sessionId: session.id,
        sessionToken,
        startedAt: session.started_at,
        expiresInSeconds: 7200,
        mode: process.env.GEMINI_API_KEY ? 'live' : 'demo',
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'SERVER_ERROR', message: error.message });
  }
});

// POST /ai-call/message — Interactive conversation with safety companion
router.post('/message', async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.sub;
  const { sessionId, transcript, context } = req.body;

  if (!sessionId || !transcript) {
    res.status(400).json({
      success: false,
      error: 'MISSING_FIELDS',
      message: 'sessionId and transcript are required',
    });
    return;
  }

  try {
    // Verify session belongs to user and is active
    const sessionRes = await query(
      `SELECT id, ended_at FROM ai_call_sessions WHERE id = $1 AND user_id = $2`,
      [sessionId, userId]
    );

    if (sessionRes.rowCount === 0) {
      res.status(404).json({ success: false, error: 'SESSION_NOT_FOUND' });
      return;
    }

    if (sessionRes.rows[0].ended_at) {
      res.status(400).json({ success: false, error: 'SESSION_ALREADY_ENDED' });
      return;
    }

    const { response, isMock } = await getAmiResponse(transcript, context);

    res.json({
      success: true,
      data: {
        sessionId,
        response,
        isMock,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'SERVER_ERROR', message: error.message });
  }
});

// POST /ai-call/tts — Speech synthesis proxy
router.post('/tts', async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.sub;
  const { sessionId, text } = req.body;

  if (!sessionId || !text) {
    res.status(400).json({ success: false, error: 'MISSING_FIELDS', message: 'sessionId and text are required' });
    return;
  }

  try {
    // Verify session
    const sessionRes = await query(
      `SELECT id FROM ai_call_sessions WHERE id = $1 AND user_id = $2`,
      [sessionId, userId]
    );

    if (sessionRes.rowCount === 0) {
      res.status(404).json({ success: false, error: 'SESSION_NOT_FOUND' });
      return;
    }

    const audioBuffer = await synthesizeSpeech(text);

    if (!audioBuffer) {
      res.json({
        success: true,
        mockMode: true,
        message: 'Demo mode active — configure ELEVENLABS_API_KEY for live audio streaming.',
      });
      return;
    }

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', audioBuffer.length);
    res.send(audioBuffer);
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'SERVER_ERROR', message: error.message });
  }
});

// DELETE /ai-call/session/:id — End call session
router.delete('/session/:id', async (req: Request, res: Response): Promise<void> => {
  const sessionId = req.params.id;
  const userId = req.user!.sub;

  try {
    const updated = await query(
      `UPDATE ai_call_sessions
       SET ended_at = NOW(),
           duration_seconds = GREATEST(1, ROUND(EXTRACT(EPOCH FROM (NOW() - started_at))))::int
       WHERE id = $1 AND user_id = $2 AND ended_at IS NULL
       RETURNING id, started_at, ended_at, duration_seconds`,
      [sessionId, userId]
    );

    if (updated.rowCount === 0) {
      res.status(404).json({ success: false, error: 'SESSION_NOT_FOUND_OR_ENDED' });
      return;
    }

    res.json({
      success: true,
      message: 'AI call session ended',
      data: updated.rows[0],
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'SERVER_ERROR', message: error.message });
  }
});

// PUT /ai-call/consent — Update distress detection consent settings
router.put('/consent', async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.sub;
  const { distressDetectionEnabled } = req.body;

  if (typeof distressDetectionEnabled !== 'boolean') {
    res.status(400).json({
      success: false,
      error: 'INVALID_VALUE',
      message: 'distressDetectionEnabled boolean is required',
    });
    return;
  }

  try {
    const result = await query(
      `INSERT INTO ai_call_consent_settings (user_id, distress_detection_enabled, consent_updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET distress_detection_enabled = $2, consent_updated_at = NOW()
       RETURNING *`,
      [userId, distressDetectionEnabled]
    );

    res.json({
      success: true,
      message: 'AI distress detection consent settings updated',
      data: result.rows[0],
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'SERVER_ERROR', message: error.message });
  }
});

export { router as aiCallRouter };
