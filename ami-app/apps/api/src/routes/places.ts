import { Router, Request, Response } from 'express';
import { query } from '../db/connection';

const router = Router();

// Helper to calculate Haversine distance in km
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return 6371 * c;
}

// GET /places/nearby
router.get('/nearby', async (req: Request, res: Response): Promise<void> => {
  const {
    lat = '51.5246',
    lng = '-0.1340',
    radius = '5', // km
    type,
    openLateOnly,
  } = req.query;

  const userLat = parseFloat(String(lat));
  const userLng = parseFloat(String(lng));
  const maxRadiusKm = parseFloat(String(radius));

  const conditions: string[] = ['1=1'];
  const params: any[] = [];
  let paramIdx = 1;

  if (type) {
    conditions.push(`p.place_type = $${paramIdx++}`);
    params.push(String(type));
  }

  if (openLateOnly === 'true') {
    conditions.push(`p.is_open_late = true`);
  }

  try {
    const sql = `
      SELECT p.id, p.name, p.place_type, p.address, p.lat, p.lng,
             p.is_open_late, p.is_verified, p.safety_features,
             bp.id AS partner_id, bp.business_name,
             COALESCE(
               json_agg(
                 json_build_object(
                   'id', do.id,
                   'title', do.title,
                   'description', do.description,
                   'discountPercent', do.discount_percent,
                   'promoCode', do.promo_code,
                   'validUntil', do.valid_until
                 )
               ) FILTER (WHERE do.id IS NOT NULL AND do.is_active = true AND do.valid_until >= NOW()),
               '[]'
             ) AS offers
      FROM nearby_places p
      LEFT JOIN business_partners bp ON bp.place_id = p.id AND bp.is_active = true
      LEFT JOIN discount_offers do ON do.partner_id = bp.id
      WHERE ${conditions.join(' AND ')}
      GROUP BY p.id, bp.id
      ORDER BY p.name ASC
    `;

    const result = await query(sql, params);

    const placesWithDistance = result.rows
      .map((row) => {
        const dist = haversineKm(userLat, userLng, Number(row.lat), Number(row.lng));
        const offers = Array.isArray(row.offers) ? row.offers : [];
        return {
          id: row.id,
          name: row.name,
          placeType: row.place_type,
          address: row.address,
          lat: Number(row.lat),
          lng: Number(row.lng),
          isOpenLate: row.is_open_late,
          isVerified: row.is_verified,
          safetyFeatures: row.safety_features || [],
          isPartner: Boolean(row.partner_id),
          discountAvailable: offers.length > 0,
          offers,
          distanceKm: Number(dist.toFixed(2)),
        };
      })
      .filter((p) => p.distanceKm <= maxRadiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm);

    res.json({
      success: true,
      data: placesWithDistance,
      meta: {
        total: placesWithDistance.length,
        radiusKm: maxRadiusKm,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'SERVER_ERROR', message: error.message });
  }
});

// GET /places/offers
router.get('/offers', async (req: Request, res: Response): Promise<void> => {
  const { lat, lng, radius = '10' } = req.query;

  try {
    const sql = `
      SELECT do.id, do.title, do.description, do.discount_percent, do.promo_code,
             do.valid_from, do.valid_until,
             bp.business_name,
             p.name AS place_name, p.place_type, p.address, p.lat, p.lng
      FROM discount_offers do
      JOIN business_partners bp ON bp.id = do.partner_id
      JOIN nearby_places p ON p.id = bp.place_id
      WHERE do.is_active = true
        AND bp.is_active = true
        AND do.valid_until >= NOW()
      ORDER BY do.discount_percent DESC
    `;

    const result = await query(sql);
    let offers = result.rows;

    if (lat && lng) {
      const uLat = parseFloat(String(lat));
      const uLng = parseFloat(String(lng));
      const maxRadiusKm = parseFloat(String(radius));

      offers = offers
        .map((offer) => {
          const dist = haversineKm(uLat, uLng, Number(offer.lat), Number(offer.lng));
          return { ...offer, distanceKm: Number(dist.toFixed(2)) };
        })
        .filter((o) => o.distanceKm <= maxRadiusKm)
        .sort((a, b) => a.distanceKm - b.distanceKm);
    }

    res.json({
      success: true,
      data: offers,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'SERVER_ERROR', message: error.message });
  }
});

export { router as placesRouter };
