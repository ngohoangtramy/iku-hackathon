import { Router, Request, Response } from 'express';
import { query } from '../db/connection';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// POST /emergency/log — Log emergency action attempt (never claim success — log attempt only)
router.post('/log', async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.sub;
  const { actionType, lat, lng, notes } = req.body;

  const validActionTypes = ['call_999', 'call_112', 'contact_trusted', 'share_location'];
  if (!actionType || !validActionTypes.includes(actionType)) {
    res.status(400).json({
      success: false,
      error: 'INVALID_ACTION_TYPE',
      message: `actionType must be one of: ${validActionTypes.join(', ')}`,
    });
    return;
  }

  try {
    const result = await query(
      `INSERT INTO emergency_action_logs (user_id, action_type, lat, lng, notes, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING id, action_type, created_at`,
      [userId, actionType, lat || null, lng || null, notes || null]
    );

    res.status(201).json({
      success: true,
      message: 'Emergency assistance attempt recorded.',
      data: {
        id: result.rows[0].id,
        actionType: result.rows[0].action_type,
        loggedAt: result.rows[0].created_at,
        disclaimer: 'System logs user action intent. Ami does not verify external emergency telephony dispatch.',
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'SERVER_ERROR', message: error.message });
  }
});

// GET /emergency/trusted-contacts
router.get('/trusted-contacts', async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.sub;

  try {
    const result = await query(
      `SELECT id, contact_name, phone_number, relationship, priority, created_at, updated_at
       FROM trusted_contacts
       WHERE user_id = $1
       ORDER BY priority ASC, created_at ASC`,
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

// PUT /emergency/trusted-contacts — Add or update trusted contact
router.put('/trusted-contacts', async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.sub;
  const { id, contactName, phoneNumber, relationship, priority = 1 } = req.body;

  if (!contactName || !phoneNumber) {
    res.status(400).json({
      success: false,
      error: 'MISSING_FIELDS',
      message: 'contactName and phoneNumber are required',
    });
    return;
  }

  try {
    if (id) {
      // Update existing
      const updated = await query(
        `UPDATE trusted_contacts
         SET contact_name = $1, phone_number = $2, relationship = $3, priority = $4, updated_at = NOW()
         WHERE id = $5 AND user_id = $6
         RETURNING *`,
        [contactName, phoneNumber, relationship || null, priority, id, userId]
      );

      if (updated.rowCount === 0) {
        res.status(404).json({ success: false, error: 'CONTACT_NOT_FOUND' });
        return;
      }

      res.json({
        success: true,
        message: 'Trusted contact updated',
        data: updated.rows[0],
      });
      return;
    }

    // Insert new
    const inserted = await query(
      `INSERT INTO trusted_contacts (user_id, contact_name, phone_number, relationship, priority)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, contactName, phoneNumber, relationship || null, priority]
    );

    res.status(201).json({
      success: true,
      message: 'Trusted contact added',
      data: inserted.rows[0],
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'SERVER_ERROR', message: error.message });
  }
});

// DELETE /emergency/trusted-contacts/:id
router.delete('/trusted-contacts/:id', async (req: Request, res: Response): Promise<void> => {
  const contactId = req.params.id;
  const userId = req.user!.sub;

  try {
    const deleted = await query(
      `DELETE FROM trusted_contacts WHERE id = $1 AND user_id = $2 RETURNING id`,
      [contactId, userId]
    );

    if (deleted.rowCount === 0) {
      res.status(404).json({ success: false, error: 'CONTACT_NOT_FOUND' });
      return;
    }

    res.json({
      success: true,
      message: 'Trusted contact removed',
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'SERVER_ERROR', message: error.message });
  }
});

// GET /emergency/nearby-places — Open public safe places near user
router.get('/nearby-places', async (req: Request, res: Response): Promise<void> => {
  const {
    lat = '51.5246',
    lng = '-0.1340',
    radius = '2', // km
  } = req.query;

  const userLat = parseFloat(String(lat));
  const userLng = parseFloat(String(lng));
  const maxRadiusKm = parseFloat(String(radius));

  try {
    const result = await query(
      `SELECT id, name, place_type, address, lat, lng, is_open_late, safety_features
       FROM nearby_places
       WHERE is_verified = true
       ORDER BY is_open_late DESC, name ASC`
    );

    const safeHavens = result.rows
      .map((p) => {
        const dLat = ((Number(p.lat) - userLat) * Math.PI) / 180;
        const dLon = ((Number(p.lng) - userLng) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos((userLat * Math.PI) / 180) *
            Math.cos((Number(p.lat) * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distanceKm = 6371 * c;

        return {
          id: p.id,
          name: p.name,
          placeType: p.place_type,
          address: p.address,
          lat: Number(p.lat),
          lng: Number(p.lng),
          isOpenLate: p.is_open_late,
          safetyFeatures: p.safety_features || [],
          distanceKm: Number(distanceKm.toFixed(2)),
        };
      })
      .filter((p) => p.distanceKm <= maxRadiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm);

    res.json({
      success: true,
      data: safeHavens,
      ukEmergencyNumbers: {
        primary: '999',
        panEuropean: '112',
        nonEmergencyPolice: '101',
        nhsNonEmergency: '111',
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'SERVER_ERROR', message: error.message });
  }
});

export { router as emergencyRouter };
