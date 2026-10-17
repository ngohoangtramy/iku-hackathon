import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import QRCode from 'qrcode';
import { pool, query } from '../db/connection';
import { authenticate } from '../middleware/auth';
import { requireTier } from '../middleware/requireTier';
import { qrLimit } from '../middleware/rateLimit';

const router = Router();

// Haversine distance in meters
function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// POST /qr/generate (Host + Tier 2)
router.post(
  '/generate',
  authenticate,
  requireTier(2),
  qrLimit,
  async (req: Request, res: Response): Promise<void> => {
    const hostId = req.user!.sub;
    const { eventId, hostLat, hostLng } = req.body;

    if (!eventId) {
      res.status(400).json({ success: false, error: 'MISSING_EVENT_ID', message: 'eventId is required' });
      return;
    }

    try {
      // Verify user is the host of this event
      const eventRes = await query(
        `SELECT id, host_id, status FROM events WHERE id = $1`,
        [eventId]
      );

      if (eventRes.rowCount === 0) {
        res.status(404).json({ success: false, error: 'EVENT_NOT_FOUND', message: 'Event not found' });
        return;
      }

      const event = eventRes.rows[0];
      if (event.host_id !== hostId) {
        res.status(403).json({
          success: false,
          error: 'UNAUTHORIZED_HOST',
          message: 'Only the designated event host can generate verification QR codes',
        });
        return;
      }

      if (event.status !== 'active') {
        res.status(400).json({
          success: false,
          error: 'EVENT_NOT_ACTIVE',
          message: 'QR codes can only be generated for active events',
        });
        return;
      }

      const rawToken = crypto.randomUUID();
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const expirySeconds = parseInt(process.env.QR_TOKEN_EXPIRY_SECONDS || '30', 10);
      const expiresAt = new Date(Date.now() + expirySeconds * 1000);

      await query(
        `INSERT INTO event_qr_tokens (event_id, host_id, token_hash, expires_at, is_used, host_lat, host_lng)
         VALUES ($1, $2, $3, $4, false, $5, $6)`,
        [eventId, hostId, tokenHash, expiresAt, hostLat || null, hostLng || null]
      );

      // Generate Base64 QR code image
      const qrPayload = JSON.stringify({
        token: rawToken,
        eventId,
        hostLat,
        hostLng,
        expiresAt: expiresAt.toISOString(),
      });

      const qrDataUrl = await QRCode.toDataURL(qrPayload, {
        errorCorrectionLevel: 'H',
        margin: 2,
        width: 320,
        color: {
          dark: '#1e1e2d',
          light: '#ffffff',
        },
      });

      res.json({
        success: true,
        data: {
          qrDataUrl,
          rawToken,
          expiresInSeconds: expirySeconds,
          expiresAt: expiresAt.toISOString(),
        },
      });
    } catch (error: any) {
      console.error('[QR] Error generating QR code:', error.message);
      res.status(500).json({ success: false, error: 'SERVER_ERROR', message: error.message });
    }
  }
);

// POST /qr/redeem (Attendee Tier 1 -> Upgrades to Tier 2)
// Transactional with SELECT FOR UPDATE to prevent replay attacks / race conditions
router.post(
  '/redeem',
  authenticate,
  requireTier(1),
  qrLimit,
  async (req: Request, res: Response): Promise<void> => {
    const attendeeId = req.user!.sub;
    const { token, eventId, attendeeLat, attendeeLng } = req.body;

    if (!token || !eventId) {
      res.status(400).json({
        success: false,
        error: 'MISSING_FIELDS',
        message: 'token and eventId are required for QR redemption',
      });
      return;
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // 1. SELECT FOR UPDATE to lock token row
      const tokenRes = await client.query(
        `SELECT id, event_id, host_id, expires_at, is_used, host_lat, host_lng
         FROM event_qr_tokens
         WHERE token_hash = $1
         FOR UPDATE`,
        [tokenHash]
      );

      if (tokenRes.rowCount === 0) {
        await client.query('ROLLBACK');
        res.status(404).json({
          success: false,
          error: 'TOKEN_NOT_FOUND',
          message: 'Invalid verification token. Code does not exist.',
        });
        return;
      }

      const qrRow = tokenRes.rows[0];

      // 2. Check if already used
      if (qrRow.is_used) {
        await client.query('ROLLBACK');
        res.status(400).json({
          success: false,
          error: 'TOKEN_ALREADY_USED',
          message: 'This QR code has already been redeemed. Please scan a fresh code from the host.',
        });
        return;
      }

      // 3. Check expiration
      const now = new Date();
      if (new Date(qrRow.expires_at) < now) {
        await client.query('ROLLBACK');
        res.status(400).json({
          success: false,
          error: 'TOKEN_EXPIRED',
          message: 'This QR token has expired. Ask the host to display a new QR code.',
        });
        return;
      }

      // 4. Verify event match
      if (qrRow.event_id !== eventId) {
        await client.query('ROLLBACK');
        res.status(400).json({
          success: false,
          error: 'EVENT_MISMATCH',
          message: 'The QR token does not match this event.',
        });
        return;
      }

      // 5. Check if user is scanning their own host code
      if (qrRow.host_id === attendeeId) {
        await client.query('ROLLBACK');
        res.status(400).json({
          success: false,
          error: 'CANNOT_VERIFY_SELF',
          message: 'Event hosts cannot redeem their own verification QR codes.',
        });
        return;
      }

      // 6. Proximity Check (if host coords and attendee coords available)
      const proximityThresholdMeters = parseFloat(process.env.QR_PROXIMITY_THRESHOLD_METERS || '15');
      if (
        qrRow.host_lat !== null &&
        qrRow.host_lng !== null &&
        attendeeLat !== undefined &&
        attendeeLng !== undefined
      ) {
        const distance = haversineMeters(
          Number(qrRow.host_lat),
          Number(qrRow.host_lng),
          parseFloat(String(attendeeLat)),
          parseFloat(String(attendeeLng))
        );

        if (distance > proximityThresholdMeters) {
          await client.query('ROLLBACK');
          res.status(400).json({
            success: false,
            error: 'PROXIMITY_CHECK_FAILED',
            message: `Proximity verification failed. You are ${Math.round(distance)}m away (max allowed: ${proximityThresholdMeters}m). Please stand near the host.`,
            distanceMeters: Math.round(distance),
            maxAllowedMeters: proximityThresholdMeters,
          });
          return;
        }
      }

      // 7. Mark token used
      await client.query(
        `UPDATE event_qr_tokens
         SET is_used = true, used_by_user_id = $1
         WHERE id = $2`,
        [attendeeId, qrRow.id]
      );

      // 8. Record physical verification
      await client.query(
        `INSERT INTO physical_verifications (
           user_id, event_id, verified_by_host_id, qr_token_id, attendee_lat, attendee_lng, verified_at, method
         ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), 'qr_scan')`,
        [attendeeId, eventId, qrRow.host_id, qrRow.id, attendeeLat || null, attendeeLng || null]
      );

      // 9. Update attendee RSVP status to attended
      await client.query(
        `UPDATE event_attendees SET status = 'attended' WHERE event_id = $1 AND user_id = $2`,
        [eventId, attendeeId]
      );

      // 10. Audit log
      await client.query(
        `INSERT INTO verification_audit_logs (user_id, action, from_tier, to_tier, verified_by, metadata)
         VALUES ($1, 'TIER2_PHYSICAL_QR_VERIFIED', 1, 2, $2, $3)`,
        [
          attendeeId,
          qrRow.host_id,
          JSON.stringify({
            eventId,
            method: 'qr_scan',
            proximityChecked: qrRow.host_lat !== null,
          }),
        ]
      );

      // 11. Upgrade user trust status to Tier 2
      await client.query(
        `UPDATE user_trust_status
         SET tier = 2,
             tier2_granted_at = NOW(),
             updated_at = NOW()
         WHERE user_id = $1`,
        [attendeeId]
      );

      await client.query('COMMIT');

      res.json({
        success: true,
        message: 'Physical attendance verified! You have unlocked Ami Tier 2 trust status.',
        data: {
          newTier: 2,
          verifiedAt: new Date().toISOString(),
          eventId,
        },
      });
    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error('[QR] Redeem transaction failed:', error.message);
      res.status(500).json({ success: false, error: 'SERVER_ERROR', message: error.message });
    } finally {
      client.release();
    }
  }
);

// GET /qr/status/:eventId — Host monitoring
router.get(
  '/status/:eventId',
  authenticate,
  requireTier(2),
  async (req: Request, res: Response): Promise<void> => {
    const { eventId } = req.params;
    const hostId = req.user!.sub;

    try {
      const activeTokenRes = await query(
        `SELECT id, expires_at, is_used, created_at
         FROM event_qr_tokens
         WHERE event_id = $1 AND host_id = $2
         ORDER BY created_at DESC
         LIMIT 1`,
        [eventId, hostId]
      );

      const statsRes = await query(
        `SELECT COUNT(*)::int AS verified_count
         FROM physical_verifications
         WHERE event_id = $1`,
        [eventId]
      );

      const latestToken = activeTokenRes.rows[0] || null;
      const isExpired = latestToken ? new Date(latestToken.expires_at) < new Date() : true;

      res.json({
        success: true,
        data: {
          hasActiveToken: latestToken ? !latestToken.is_used && !isExpired : false,
          latestTokenExpiry: latestToken?.expires_at || null,
          isUsed: latestToken?.is_used || false,
          isExpired,
          verifiedCount: statsRes.rows[0]?.verified_count || 0,
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: 'SERVER_ERROR', message: error.message });
    }
  }
);

// POST /qr/manual-review (Fallback for GPS or camera anomalies)
router.post(
  '/manual-review',
  authenticate,
  requireTier(1),
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.sub;
    const { eventId, hostId, reason, attendeeLat, attendeeLng } = req.body;

    if (!eventId || !hostId) {
      res.status(400).json({
        success: false,
        error: 'MISSING_FIELDS',
        message: 'eventId and hostId are required for manual verification review',
      });
      return;
    }

    try {
      await query(
        `INSERT INTO verification_audit_logs (user_id, action, from_tier, to_tier, verified_by, metadata)
         VALUES ($1, 'MANUAL_REVIEW_REQUESTED', 1, 1, $2, $3)`,
        [
          userId,
          hostId,
          JSON.stringify({
            eventId,
            reason: reason || 'GPS / Camera scanning difficulty at physical event',
            lat: attendeeLat,
            lng: attendeeLng,
            status: 'pending_host_confirmation',
          }),
        ]
      );

      res.json({
        success: true,
        message: 'Manual verification review submitted. The host will confirm your attendance in person.',
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: 'SERVER_ERROR', message: error.message });
    }
  }
);

export { router as verificationRouter };
