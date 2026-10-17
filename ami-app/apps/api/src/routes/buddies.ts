import { Router, Request, Response } from 'express';
import { query } from '../db/connection';
import { authenticate } from '../middleware/auth';
import { requireTier } from '../middleware/requireTier';

const router = Router();

// Apply Tier 2 enforcement to all buddy discovery routes
router.use(authenticate, requireTier(2));

// GET /buddy-profile — get own profile
router.get('/buddy-profile', async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.sub;

  try {
    const result = await query(
      `SELECT bp.*, p.display_name, p.avatar_url, p.university_domain
       FROM buddy_profiles bp
       JOIN profiles p ON p.user_id = bp.user_id
       WHERE bp.user_id = $1`,
      [userId]
    );

    if (result.rowCount === 0) {
      // Create empty profile if not yet existing
      const newBp = await query(
        `INSERT INTO buddy_profiles (user_id, interests, preferred_radius_km, is_available)
         VALUES ($1, '{}', 5, true)
         RETURNING *`,
        [userId]
      );
      res.json({ success: true, data: newBp.rows[0] });
      return;
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'SERVER_ERROR', message: error.message });
  }
});

// PUT /buddy-profile — update own profile
router.put('/buddy-profile', async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.sub;
  const { interests, bio, preferredRadiusKm, preferredActivities, isAvailable } = req.body;

  try {
    const result = await query(
      `INSERT INTO buddy_profiles (user_id, interests, bio, preferred_radius_km, preferred_activities, is_available, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET
         interests = COALESCE($2, buddy_profiles.interests),
         bio = COALESCE($3, buddy_profiles.bio),
         preferred_radius_km = COALESCE($4, buddy_profiles.preferred_radius_km),
         preferred_activities = COALESCE($5, buddy_profiles.preferred_activities),
         is_available = COALESCE($6, buddy_profiles.is_available),
         updated_at = NOW()
       RETURNING *`,
      [
        userId,
        interests || null,
        bio || null,
        preferredRadiusKm || 5,
        preferredActivities || null,
        isAvailable ?? true,
      ]
    );

    res.json({
      success: true,
      message: 'Buddy profile updated',
      data: result.rows[0],
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'SERVER_ERROR', message: error.message });
  }
});

// GET /buddies/discover — Match by shared interests & proximity (Never expose exact coordinates)
router.get('/discover', async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.sub;

  try {
    // 1. Fetch current user's interests & preferences
    const myProfileRes = await query(
      `SELECT bp.interests, bp.preferred_radius_km, p.approx_lat, p.approx_lng
       FROM buddy_profiles bp
       JOIN profiles p ON p.user_id = bp.user_id
       WHERE bp.user_id = $1`,
      [userId]
    );

    const myInterests: string[] = myProfileRes.rows[0]?.interests || [];

    // 2. Query available Tier 2 candidates (exclude self, exclude already matched, exclude blocked)
    const candidatesRes = await query(
      `SELECT bp.user_id, bp.interests, bp.bio, bp.preferred_activities,
              p.display_name, p.avatar_url, p.university_domain,
              p.approx_lat, p.approx_lng
       FROM buddy_profiles bp
       JOIN profiles p ON p.user_id = bp.user_id
       JOIN user_trust_status t ON t.user_id = bp.user_id
       WHERE bp.user_id != $1
         AND bp.is_available = true
         AND p.is_active = true
         AND t.tier = 2
         AND t.is_suspended = false
         AND NOT EXISTS (
           SELECT 1 FROM buddy_matches bm
           WHERE (bm.user1_id = $1 AND bm.user2_id = bp.user_id)
              OR (bm.user2_id = $1 AND bm.user1_id = bp.user_id)
         )
         AND NOT EXISTS (
           SELECT 1 FROM user_reports ur
           WHERE ur.reporter_id = $1 AND ur.reported_user_id = bp.user_id
         )
       LIMIT 30`,
      [userId]
    );

    // Calculate interest overlap score
    const matches = candidatesRes.rows
      .map((c) => {
        const candidateInterests: string[] = c.interests || [];
        const sharedInterests = myInterests.filter((item) =>
          candidateInterests.includes(item)
        );

        const matchScore = myInterests.length > 0
          ? Math.round((sharedInterests.length / myInterests.length) * 100)
          : 50;

        return {
          userId: c.user_id,
          displayName: c.display_name,
          avatarUrl: c.avatar_url,
          universityDomain: c.university_domain,
          bio: c.bio,
          preferredActivities: c.preferred_activities || [],
          sharedInterests,
          matchScore,
          // Privacy protection: Return coarse district indicator, NEVER exact lat/lng
          approximateDistrict: 'Central London',
        };
      })
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 10);

    res.json({
      success: true,
      data: matches,
      meta: {
        totalFound: matches.length,
        privacyNote: 'Coordinates are strictly masked to ensure member privacy.',
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'SERVER_ERROR', message: error.message });
  }
});

// POST /buddies/request — send buddy request
router.post('/request', async (req: Request, res: Response): Promise<void> => {
  const senderId = req.user!.sub;
  const { recipientId, message } = req.body;

  if (!recipientId || recipientId === senderId) {
    res.status(400).json({
      success: false,
      error: 'INVALID_RECIPIENT',
      message: 'A valid recipient ID different from yourself is required',
    });
    return;
  }

  try {
    const existing = await query(
      `SELECT status FROM buddy_requests
       WHERE (sender_id = $1 AND recipient_id = $2)
          OR (sender_id = $2 AND recipient_id = $1)`,
      [senderId, recipientId]
    );

    if (existing.rowCount && existing.rowCount > 0) {
      res.status(400).json({
        success: false,
        error: 'REQUEST_EXISTS',
        message: 'A buddy request between these accounts already exists',
      });
      return;
    }

    const result = await query(
      `INSERT INTO buddy_requests (sender_id, recipient_id, message, status)
       VALUES ($1, $2, $3, 'pending')
       RETURNING *`,
      [senderId, recipientId, message || null]
    );

    res.status(201).json({
      success: true,
      message: 'Buddy request sent successfully',
      data: result.rows[0],
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'SERVER_ERROR', message: error.message });
  }
});

// POST /buddies/request/:id/respond — accept or decline
router.post('/request/:id/respond', async (req: Request, res: Response): Promise<void> => {
  const requestId = req.params.id;
  const recipientId = req.user!.sub;
  const { response } = req.body; // 'accepted' | 'declined'

  if (response !== 'accepted' && response !== 'declined') {
    res.status(400).json({
      success: false,
      error: 'INVALID_RESPONSE',
      message: "response must be 'accepted' or 'declined'",
    });
    return;
  }

  try {
    const reqRes = await query(
      `SELECT * FROM buddy_requests WHERE id = $1 AND recipient_id = $2`,
      [requestId, recipientId]
    );

    if (reqRes.rowCount === 0) {
      res.status(404).json({ success: false, error: 'REQUEST_NOT_FOUND' });
      return;
    }

    const bReq = reqRes.rows[0];

    await query(
      `UPDATE buddy_requests SET status = $1, updated_at = NOW() WHERE id = $2`,
      [response, requestId]
    );

    if (response === 'accepted') {
      // Create confirmed match
      await query(
        `INSERT INTO buddy_matches (user1_id, user2_id, is_active)
         VALUES ($1, $2, true)
         ON CONFLICT (user1_id, user2_id) DO UPDATE SET is_active = true`,
        [bReq.sender_id, recipientId]
      );

      // Create conversation
      await query(
        `INSERT INTO conversations (type, user1_id, user2_id)
         VALUES ('direct', $1, $2)
         ON CONFLICT (user1_id, user2_id) DO NOTHING`,
        [bReq.sender_id, recipientId]
      );
    }

    res.json({
      success: true,
      message: `Buddy request ${response}`,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'SERVER_ERROR', message: error.message });
  }
});

// GET /buddies/matches — list confirmed buddies
router.get('/matches', async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.sub;

  try {
    const result = await query(
      `SELECT bm.id AS match_id, bm.matched_at,
              CASE WHEN bm.user1_id = $1 THEN bm.user2_id ELSE bm.user1_id END AS buddy_user_id,
              p.display_name, p.avatar_url, p.university_domain, p.bio,
              c.id AS conversation_id
       FROM buddy_matches bm
       JOIN profiles p ON p.user_id = (CASE WHEN bm.user1_id = $1 THEN bm.user2_id ELSE bm.user1_id END)
       LEFT JOIN conversations c ON (c.user1_id = bm.user1_id AND c.user2_id = bm.user2_id)
                                  OR (c.user1_id = bm.user2_id AND c.user2_id = bm.user1_id)
       WHERE (bm.user1_id = $1 OR bm.user2_id = $1)
         AND bm.is_active = true
       ORDER BY bm.matched_at DESC`,
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

// DELETE /buddies/match/:id — unmatch
router.delete('/match/:id', async (req: Request, res: Response): Promise<void> => {
  const matchId = req.params.id;
  const userId = req.user!.sub;

  try {
    await query(
      `UPDATE buddy_matches
       SET is_active = false, updated_at = NOW()
       WHERE id = $1 AND (user1_id = $2 OR user2_id = $2)`,
      [matchId, userId]
    );

    res.json({
      success: true,
      message: 'Unmatched successfully',
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'SERVER_ERROR', message: error.message });
  }
});

// POST /users/:id/report — report user
router.post('/users/:id/report', async (req: Request, res: Response): Promise<void> => {
  const reportedUserId = req.params.id;
  const reporterId = req.user!.sub;
  const { reason, details } = req.body;

  if (!reason) {
    res.status(400).json({ success: false, error: 'MISSING_REASON', message: 'Reason is required' });
    return;
  }

  try {
    await query(
      `INSERT INTO user_reports (reporter_id, reported_user_id, reason, details, status)
       VALUES ($1, $2, $3, $4, 'open')`,
      [reporterId, reportedUserId, reason, details || null]
    );

    res.json({
      success: true,
      message: 'User report received. Our safety team will review it promptly.',
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'SERVER_ERROR', message: error.message });
  }
});

// POST /users/:id/block — block user
router.post('/users/:id/block', async (req: Request, res: Response): Promise<void> => {
  const blockedUserId = req.params.id;
  const userId = req.user!.sub;

  try {
    // 1. Deactivate any existing buddy match
    await query(
      `UPDATE buddy_matches
       SET is_active = false, updated_at = NOW()
       WHERE (user1_id = $1 AND user2_id = $2)
          OR (user1_id = $2 AND user2_id = $1)`,
      [userId, blockedUserId]
    );

    // 2. Log block in reports
    await query(
      `INSERT INTO user_reports (reporter_id, reported_user_id, reason, details, status)
       VALUES ($1, $2, 'USER_BLOCKED', 'User initiated account block', 'resolved')`,
      [userId, blockedUserId]
    );

    res.json({
      success: true,
      message: 'User blocked. They will not be able to see you in buddy discovery or message you.',
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'SERVER_ERROR', message: error.message });
  }
});

export { router as buddiesRouter };
