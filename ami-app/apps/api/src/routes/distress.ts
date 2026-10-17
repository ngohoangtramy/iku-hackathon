import { Router, Request, Response } from 'express';
import { query } from '../db/connection';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// PUT /distress/consent — Update distress detection consent
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
      message: 'Distress detection settings updated',
      data: result.rows[0],
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'SERVER_ERROR', message: error.message });
  }
});

// POST /distress/alert — Log distress event (never auto-action; explicit outcome logging)
router.post('/alert', async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.sub;
  const {
    sessionId,
    triggerType = 'verbal_safeword',
    confidenceScore = 0.95,
    outcome,
    lat,
    lng,
  } = req.body;

  const validOutcomes = ['dismissed', 'okay', 'help_requested'];
  if (!outcome || !validOutcomes.includes(outcome)) {
    res.status(400).json({
      success: false,
      error: 'INVALID_OUTCOME',
      message: `outcome must be one of: ${validOutcomes.join(', ')}`,
    });
    return;
  }

  try {
    const result = await query(
      `INSERT INTO distress_alert_events (
         session_id, user_id, trigger_type, confidence_score, outcome, lat, lng, created_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       RETURNING id, outcome, created_at`,
      [sessionId || null, userId, triggerType, confidenceScore, outcome, lat || null, lng || null]
    );

    // If session ID provided, increment distress count on session
    if (sessionId) {
      await query(
        `UPDATE ai_call_sessions
         SET distress_flag_count = distress_flag_count + 1
         WHERE id = $1`,
        [sessionId]
      );
    }

    res.status(201).json({
      logged: true,
      success: true,
      eventId: result.rows[0].id,
      outcome: result.rows[0].outcome,
      loggedAt: result.rows[0].created_at,
      safetyNotice: 'Ami never triggers external authorities automatically without user confirmation.',
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'SERVER_ERROR', message: error.message });
  }
});

// GET /distress/settings — Return current user consent settings
router.get('/settings', async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.sub;

  try {
    const result = await query(
      `SELECT distress_detection_enabled, consent_updated_at
       FROM ai_call_consent_settings
       WHERE user_id = $1`,
      [userId]
    );

    if (result.rowCount === 0) {
      // Return default
      res.json({
        success: true,
        data: {
          distressDetectionEnabled: false,
          consentUpdatedAt: null,
        },
      });
      return;
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'SERVER_ERROR', message: error.message });
  }
});

export { router as distressRouter };
