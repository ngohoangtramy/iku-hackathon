import { Router, Request, Response } from 'express';
import { query } from '../db/connection';
import { authenticate } from '../middleware/auth';
import { requireTier } from '../middleware/requireTier';

const router = Router();

// GET /events — filterable discovery
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const {
    category,
    lat,
    lng,
    radius = '10', // km
    startDate,
    endDate,
    maxPrice,
    tier,
    page = '1',
    limit = '20',
  } = req.query;

  const conditions: string[] = ["e.status IN ('active', 'pending_approval')"];
  const params: any[] = [];
  let paramIndex = 1;

  if (category) {
    conditions.push(`e.category = $${paramIndex++}`);
    params.push(String(category));
  }

  if (startDate) {
    conditions.push(`e.start_time >= $${paramIndex++}`);
    params.push(new Date(String(startDate)));
  } else {
    // Default show current and future events
    conditions.push(`e.end_time >= NOW()`);
  }

  if (endDate) {
    conditions.push(`e.start_time <= $${paramIndex++}`);
    params.push(new Date(String(endDate)));
  }

  if (maxPrice !== undefined) {
    conditions.push(`e.price <= $${paramIndex++}`);
    params.push(parseFloat(String(maxPrice)));
  }

  if (tier !== undefined) {
    conditions.push(`e.required_tier <= $${paramIndex++}`);
    params.push(parseInt(String(tier), 10));
  }

  const offset = (Math.max(1, parseInt(String(page), 10)) - 1) * parseInt(String(limit), 10);
  const limitValue = Math.min(100, Math.max(1, parseInt(String(limit), 10)));

  try {
    const sql = `
      SELECT e.id, e.host_id, e.title, e.description, e.category,
             e.start_time, e.end_time, e.location_name, e.address,
             e.lat, e.lng, e.max_attendees, e.current_attendees,
             e.price, e.required_tier, e.status, e.created_at,
             p.display_name AS host_name, p.avatar_url AS host_avatar
      FROM events e
      LEFT JOIN profiles p ON p.user_id = e.host_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY e.start_time ASC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;
    params.push(limitValue, offset);

    const result = await query(sql, params);

    // If user provided coordinates, calculate distance in km
    let events = result.rows;
    if (lat && lng) {
      const uLat = parseFloat(String(lat));
      const uLng = parseFloat(String(lng));
      const maxRadiusKm = parseFloat(String(radius));

      events = events
        .map((ev) => {
          const dLat = ((Number(ev.lat) - uLat) * Math.PI) / 180;
          const dLng = ((Number(ev.lng) - uLng) * Math.PI) / 180;
          const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos((uLat * Math.PI) / 180) *
              Math.cos((Number(ev.lat) * Math.PI) / 180) *
              Math.sin(dLng / 2) *
              Math.sin(dLng / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          const distanceKm = 6371 * c;
          return { ...ev, distanceKm: Number(distanceKm.toFixed(2)) };
        })
        .filter((ev) => ev.distanceKm <= maxRadiusKm);
    }

    res.json({
      success: true,
      data: events,
      meta: {
        page: Number(page),
        limit: limitValue,
        count: events.length,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'SERVER_ERROR', message: error.message });
  }
});

// GET /events/:id
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const result = await query(
      `SELECT e.*, p.display_name AS host_name, p.avatar_url AS host_avatar, p.bio AS host_bio
       FROM events e
       LEFT JOIN profiles p ON p.user_id = e.host_id
       WHERE e.id = $1`,
      [id]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ success: false, error: 'EVENT_NOT_FOUND', message: 'Event does not exist' });
      return;
    }

    const event = result.rows[0];
    res.json({
      success: true,
      data: event,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'SERVER_ERROR', message: error.message });
  }
});

// POST /events — Create event (Tier 2 required)
router.post('/', authenticate, requireTier(2), async (req: Request, res: Response): Promise<void> => {
  const hostId = req.user!.sub;
  const {
    title,
    description,
    category,
    startTime,
    endTime,
    locationName,
    address,
    lat,
    lng,
    maxAttendees,
    price = 0.0,
    requiredTier = 1,
  } = req.body;

  if (!title || !category || !startTime || !endTime || !locationName || lat === undefined || lng === undefined) {
    res.status(400).json({
      success: false,
      error: 'MISSING_FIELDS',
      message: 'title, category, startTime, endTime, locationName, lat, and lng are required',
    });
    return;
  }

  try {
    const result = await query(
      `INSERT INTO events (
        host_id, title, description, category, start_time, end_time,
        location_name, address, lat, lng, max_attendees, price, required_tier, status
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'pending_approval')
       RETURNING *`,
      [
        hostId,
        title,
        description || null,
        category,
        new Date(startTime),
        new Date(endTime),
        locationName,
        address || null,
        lat,
        lng,
        maxAttendees || null,
        price,
        requiredTier,
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Event created and submitted for safety review',
      data: result.rows[0],
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'SERVER_ERROR', message: error.message });
  }
});

// PUT /events/:id — Update event (host + Tier 2)
router.put('/:id', authenticate, requireTier(2), async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const hostId = req.user!.sub;
  const { title, description, category, startTime, endTime, locationName, address, lat, lng, maxAttendees, price } = req.body;

  try {
    const existing = await query(`SELECT host_id FROM events WHERE id = $1`, [id]);
    if (existing.rowCount === 0) {
      res.status(404).json({ success: false, error: 'EVENT_NOT_FOUND' });
      return;
    }
    if (existing.rows[0].host_id !== hostId) {
      res.status(403).json({ success: false, error: 'UNAUTHORIZED', message: 'You can only update your own events' });
      return;
    }

    const updated = await query(
      `UPDATE events
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           category = COALESCE($3, category),
           start_time = COALESCE($4, start_time),
           end_time = COALESCE($5, end_time),
           location_name = COALESCE($6, location_name),
           address = COALESCE($7, address),
           lat = COALESCE($8, lat),
           lng = COALESCE($9, lng),
           max_attendees = COALESCE($10, max_attendees),
           price = COALESCE($11, price),
           updated_at = NOW()
       WHERE id = $12
       RETURNING *`,
      [
        title,
        description,
        category,
        startTime ? new Date(startTime) : null,
        endTime ? new Date(endTime) : null,
        locationName,
        address,
        lat,
        lng,
        maxAttendees,
        price,
        id,
      ]
    );

    res.json({
      success: true,
      message: 'Event updated successfully',
      data: updated.rows[0],
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'SERVER_ERROR', message: error.message });
  }
});

// DELETE /events/:id — Soft delete / cancel event
router.delete('/:id', authenticate, requireTier(2), async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const hostId = req.user!.sub;

  try {
    const existing = await query(`SELECT host_id FROM events WHERE id = $1`, [id]);
    if (existing.rowCount === 0) {
      res.status(404).json({ success: false, error: 'EVENT_NOT_FOUND' });
      return;
    }
    if (existing.rows[0].host_id !== hostId) {
      res.status(403).json({ success: false, error: 'UNAUTHORIZED', message: 'You can only cancel your own events' });
      return;
    }

    await query(`UPDATE events SET status = 'cancelled', updated_at = NOW() WHERE id = $1`, [id]);

    res.json({
      success: true,
      message: 'Event cancelled successfully',
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'SERVER_ERROR', message: error.message });
  }
});

// POST /events/:id/rsvp — Tier 1+
router.post('/:id/rsvp', authenticate, requireTier(1), async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const userId = req.user!.sub;

  try {
    const eventRes = await query(
      `SELECT id, max_attendees, current_attendees, status, required_tier FROM events WHERE id = $1`,
      [id]
    );

    if (eventRes.rowCount === 0) {
      res.status(404).json({ success: false, error: 'EVENT_NOT_FOUND' });
      return;
    }

    const event = eventRes.rows[0];

    if (event.status === 'cancelled') {
      res.status(400).json({ success: false, error: 'EVENT_CANCELLED', message: 'This event has been cancelled' });
      return;
    }

    if (req.user!.tier < event.required_tier) {
      res.status(403).json({
        success: false,
        error: 'TIER_REQUIRED',
        message: `This event requires Tier ${event.required_tier} verification.`,
      });
      return;
    }

    if (event.max_attendees && event.current_attendees >= event.max_attendees) {
      res.status(400).json({
        success: false,
        error: 'EVENT_FULL',
        message: 'This event has reached its maximum attendee capacity',
      });
      return;
    }

    await query(
      `INSERT INTO event_attendees (event_id, user_id, status)
       VALUES ($1, $2, 'rsvp')
       ON CONFLICT (event_id, user_id)
       DO UPDATE SET status = 'rsvp', rsvp_at = NOW()`,
      [id, userId]
    );

    await query(
      `UPDATE events
       SET current_attendees = (SELECT COUNT(*) FROM event_attendees WHERE event_id = $1 AND status = 'rsvp'),
           updated_at = NOW()
       WHERE id = $1`,
      [id]
    );

    res.json({
      success: true,
      message: 'RSVP confirmed successfully!',
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'SERVER_ERROR', message: error.message });
  }
});

// DELETE /events/:id/rsvp — Cancel RSVP
router.delete('/:id/rsvp', authenticate, requireTier(1), async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const userId = req.user!.sub;

  try {
    await query(
      `UPDATE event_attendees SET status = 'cancelled' WHERE event_id = $1 AND user_id = $2`,
      [id, userId]
    );

    await query(
      `UPDATE events
       SET current_attendees = (SELECT COUNT(*) FROM event_attendees WHERE event_id = $1 AND status = 'rsvp'),
           updated_at = NOW()
       WHERE id = $1`,
      [id]
    );

    res.json({
      success: true,
      message: 'RSVP cancelled',
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'SERVER_ERROR', message: error.message });
  }
});

// GET /events/:id/attendees — Attendee count only (privacy preservation)
router.get('/:id/attendees', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const result = await query(
      `SELECT COUNT(*)::int AS count FROM event_attendees WHERE event_id = $1 AND status = 'rsvp'`,
      [id]
    );

    res.json({
      success: true,
      count: result.rows[0]?.count || 0,
      privacyNote: 'Individual attendee identities are protected for community safety.',
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'SERVER_ERROR', message: error.message });
  }
});

// POST /events/:id/report — Report event
router.post('/:id/report', authenticate, requireTier(1), async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const reporterId = req.user!.sub;
  const { reason, details } = req.body;

  try {
    const evRes = await query(`SELECT host_id FROM events WHERE id = $1`, [id]);
    if (evRes.rowCount === 0) {
      res.status(404).json({ success: false, error: 'EVENT_NOT_FOUND' });
      return;
    }

    const hostId = evRes.rows[0].host_id;

    await query(
      `INSERT INTO user_reports (reporter_id, reported_user_id, reason, details, status)
       VALUES ($1, $2, $3, $4, 'open')`,
      [reporterId, hostId, `Event Report (${id}): ${reason || 'Inappropriate event content'}`, details || null]
    );

    res.json({
      success: true,
      message: 'Event reported to Ami moderation team for review.',
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'SERVER_ERROR', message: error.message });
  }
});

export { router as eventsRouter };
