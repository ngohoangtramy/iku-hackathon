import { Router, Request, Response } from 'express';
import { query } from '../db/connection';
import { authenticate } from '../middleware/auth';
import { requireTier } from '../middleware/requireTier';
import { ratingLimit } from '../middleware/rateLimit';
import { calculateWeightedRating } from '../services/safety';

const router = Router();

// POST /ratings (Tier 1+)
router.post(
  '/',
  authenticate,
  requireTier(1),
  ratingLimit,
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.sub;
    const { segmentId, rating, notes } = req.body;

    const ratingVal = parseInt(String(rating), 10);
    if (!segmentId || isNaN(ratingVal) || ratingVal < 1 || ratingVal > 5) {
      res.status(400).json({
        success: false,
        error: 'INVALID_RATING',
        message: 'segmentId and rating (integer between 1 and 5) are required',
      });
      return;
    }

    try {
      // Check 24-hour duplicate rule
      const recent = await query(
        `SELECT id FROM route_ratings
         WHERE segment_id = $1 AND user_id = $2 AND created_at >= NOW() - INTERVAL '24 hours'`,
        [segmentId, userId]
      );

      if (recent.rowCount && recent.rowCount > 0) {
        res.status(400).json({
          success: false,
          error: 'DUPLICATE_RATING',
          message: 'You have already submitted an observation for this corridor in the last 24 hours.',
        });
        return;
      }

      // Tier 1 weight = 1.0, Tier 2 weight = 2.0
      const tierWeight = req.user!.tier >= 2 ? 2.0 : 1.0;

      const result = await query(
        `INSERT INTO route_ratings (segment_id, user_id, rating, tier_weight, notes)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [segmentId, userId, ratingVal, tierWeight, notes || null]
      );

      // Recompute segment score
      const allRatingsRes = await query(
        `SELECT rating, tier_weight, created_at FROM route_ratings WHERE segment_id = $1`,
        [segmentId]
      );

      const safetyScore = calculateWeightedRating(allRatingsRes.rows);
      await query(
        `UPDATE route_segments
         SET overall_score = $1, updated_at = NOW()
         WHERE id = $2`,
        [safetyScore.rawRating || 3.0, segmentId]
      );

      res.status(201).json({
        success: true,
        message: 'Observation rating recorded. Thank you for contributing to community safety.',
        data: {
          rating: result.rows[0],
          updatedScore: safetyScore,
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: 'SERVER_ERROR', message: error.message });
    }
  }
);

// GET /ratings/segment/:id — Compute weighted score with time decay
router.get('/segment/:id', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const ratingsRes = await query(
      `SELECT rating, tier_weight, created_at
       FROM route_ratings
       WHERE segment_id = $1
       ORDER BY created_at DESC`,
      [id]
    );

    const safetyScore = calculateWeightedRating(ratingsRes.rows);

    res.json({
      success: true,
      data: {
        segmentId: id,
        ...safetyScore,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'SERVER_ERROR', message: error.message });
  }
});

// GET /ratings/aggregate — Bbox query returning per-segment scores
router.get('/aggregate', async (req: Request, res: Response): Promise<void> => {
  const {
    north = '51.55',
    south = '51.48',
    east = '-0.08',
    west = '-0.18',
  } = req.query;

  try {
    const segmentsRes = await query(
      `SELECT s.id, s.name, s.start_lat, s.start_lng, s.end_lat, s.end_lng,
              s.overall_score, s.lighting_score, s.foot_traffic_score,
              COUNT(r.id)::int AS rating_count
       FROM route_segments s
       LEFT JOIN route_ratings r ON r.segment_id = s.id
       WHERE (s.start_lat BETWEEN $1 AND $2 AND s.start_lng BETWEEN $3 AND $4)
          OR (s.end_lat BETWEEN $1 AND $2 AND s.end_lng BETWEEN $3 AND $4)
       GROUP BY s.id`,
      [parseFloat(String(south)), parseFloat(String(north)), parseFloat(String(west)), parseFloat(String(east))]
    );

    res.json({
      success: true,
      data: segmentsRes.rows,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'SERVER_ERROR', message: error.message });
  }
});

// POST /ratings/:id/flag — Flag suspicious rating
router.post('/:id/flag', authenticate, async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const reporterId = req.user!.sub;
  const { reason } = req.body;

  try {
    const ratingRes = await query(`SELECT user_id, segment_id FROM route_ratings WHERE id = $1`, [id]);
    if (ratingRes.rowCount === 0) {
      res.status(404).json({ success: false, error: 'RATING_NOT_FOUND' });
      return;
    }

    const ratingRow = ratingRes.rows[0];

    await query(
      `INSERT INTO user_reports (reporter_id, reported_user_id, reason, details, status)
       VALUES ($1, $2, $3, $4, 'open')`,
      [
        reporterId,
        ratingRow.user_id,
        'SUSPICIOUS_ROUTE_RATING',
        `Flagged rating ${id} on segment ${ratingRow.segment_id}. Reason: ${reason || 'Inaccurate or suspicious feedback'}`,
      ]
    );

    res.json({
      success: true,
      message: 'Rating flagged for moderation review. Thank you for helping keep community data accurate.',
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'SERVER_ERROR', message: error.message });
  }
});

export { router as ratingsRouter };
