import { Router, Request, Response } from 'express';
import { query } from '../db/connection';
import { authenticate } from '../middleware/auth';
import { requireTier } from '../middleware/requireTier';
import { ratingLimit } from '../middleware/rateLimit';
import { scoreRoute, calculateWeightedRating } from '../services/safety';

const router = Router();

// GET /routes
router.get('/routes', async (req: Request, res: Response): Promise<void> => {
  const { origin, destination, mode = 'walking' } = req.query;

  if (!origin || !destination) {
    res.status(400).json({
      success: false,
      error: 'MISSING_PARAMS',
      message: 'Both origin and destination coordinates/names are required',
    });
    return;
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (apiKey && apiKey !== 'AIzaSyAhy_XW5wei7IhRhiRVbqj3uQoNZbexKkI_placeholder') {
    try {
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(
        String(origin)
      )}&destination=${encodeURIComponent(
        String(destination)
      )}&mode=${encodeURIComponent(String(mode))}&alternatives=true&key=${apiKey}`;

      const response = await fetch(url);
      const data = await response.json() as any;

      if (data.status === 'OK' && data.routes?.length > 0) {
        const enrichedRoutes = await Promise.all(
          data.routes.map(async (route: any, index: number) => {
            const leg = route.legs?.[0];
            const safety = await scoreRoute(route.overview_polyline?.points, {
              isSimulated: false,
            });

            return {
              routeId: `google-route-${index}`,
              summary: route.summary || `Route ${index + 1}`,
              duration: leg?.duration?.text || '15 mins',
              durationSeconds: leg?.duration?.value || 900,
              distance: leg?.distance?.text || '1.2 km',
              distanceMeters: leg?.distance?.value || 1200,
              overviewPolyline: route.overview_polyline?.points,
              safetyScore: safety,
              isRecommended: index === 0,
            };
          })
        );

        res.json({
          success: true,
          data: {
            routes: enrichedRoutes,
            isMock: false,
          },
        });
        return;
      }
    } catch (err: any) {
      console.warn('[MAP] Directions API fetch failed, falling back to mock routes:', err.message);
    }
  }

  // Fallback realistic mock routes with Central London coordinates
  const mockRoute1Safety = calculateWeightedRating([
    { rating: 5, tier_weight: 2.0, created_at: new Date() },
    { rating: 4, tier_weight: 2.0, created_at: new Date(Date.now() - 86400000) },
    { rating: 5, tier_weight: 1.0, created_at: new Date(Date.now() - 2 * 86400000) },
    { rating: 4, tier_weight: 2.0, created_at: new Date(Date.now() - 4 * 86400000) },
  ], true);

  const mockRoute2Safety = calculateWeightedRating([
    { rating: 3, tier_weight: 1.0, created_at: new Date() },
    { rating: 3, tier_weight: 2.0, created_at: new Date(Date.now() - 86400000) },
    { rating: 2, tier_weight: 1.0, created_at: new Date(Date.now() - 5 * 86400000) },
  ], true);

  const mockRoutes = [
    {
      routeId: 'mock-lighted-corridor',
      summary: 'Via Southampton Row & High Holborn (Well-Lit Commercial Avenue)',
      duration: '14 mins',
      durationSeconds: 840,
      distance: '1.1 km',
      distanceMeters: 1100,
      safetyScore: mockRoute1Safety,
      isRecommended: true,
      features: ['Active street lighting', 'Open commercial venues', 'Continuous pedestrian activity'],
      coordinates: [
        [51.5298, -0.1265],
        [51.5262, -0.1248],
        [51.5212, -0.1225],
        [51.5168, -0.1205],
      ],
    },
    {
      routeId: 'mock-direct-shortcut',
      summary: 'Via Woburn Walk & Russell Square East (Direct Residential Path)',
      duration: '11 mins',
      durationSeconds: 660,
      distance: '850 m',
      distanceMeters: 850,
      safetyScore: mockRoute2Safety,
      isRecommended: false,
      features: ['Shorter distance', 'Lower lighting in park sectors', 'Quiet after 8pm'],
      coordinates: [
        [51.5298, -0.1265],
        [51.5250, -0.1285],
        [51.5218, -0.1250],
        [51.5168, -0.1205],
      ],
    },
  ];

  res.json({
    success: true,
    data: {
      routes: mockRoutes,
      isMock: true,
    },
  });
});

// GET /safety-data (GeoJSON FeatureCollection within bounding box)
router.get('/safety-data', async (req: Request, res: Response): Promise<void> => {
  const {
    north = '51.55',
    south = '51.48',
    east = '-0.08',
    west = '-0.18',
  } = req.query;

  const n = parseFloat(String(north));
  const s = parseFloat(String(south));
  const e = parseFloat(String(east));
  const w = parseFloat(String(west));

  try {
    // 1. Streetlights in bbox
    const slRes = await query(
      `SELECT id, lat, lng, is_working, pole_number, notes, status, created_at
       FROM streetlight_reports
       WHERE lat BETWEEN $1 AND $2 AND lng BETWEEN $3 AND $4`,
      [s, n, w, e]
    );

    // 2. Incident reports in bbox
    const incRes = await query(
      `SELECT id, incident_type, description, lat, lng, severity, status, incident_time
       FROM safety_incident_reports
       WHERE lat BETWEEN $1 AND $2 AND lng BETWEEN $3 AND $4`,
      [s, n, w, e]
    );

    // 3. Route segments in bbox
    const segRes = await query(
      `SELECT id, name, start_lat, start_lng, end_lat, end_lng, lighting_score, foot_traffic_score, overall_score
       FROM route_segments
       WHERE (start_lat BETWEEN $1 AND $2 AND start_lng BETWEEN $3 AND $4)
          OR (end_lat BETWEEN $1 AND $2 AND end_lng BETWEEN $3 AND $4)`,
      [s, n, w, e]
    );

    const features: any[] = [];

    // Streetlight features
    for (const row of slRes.rows) {
      features.push({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [Number(row.lng), Number(row.lat)],
        },
        properties: {
          id: row.id,
          featureType: 'streetlight',
          isWorking: row.is_working,
          poleNumber: row.pole_number,
          notes: row.notes,
          status: row.status,
          createdAt: row.created_at,
        },
      });
    }

    // Incident features
    for (const row of incRes.rows) {
      features.push({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [Number(row.lng), Number(row.lat)],
        },
        properties: {
          id: row.id,
          featureType: 'safety_incident',
          incidentType: row.incident_type,
          description: row.description,
          severity: row.severity,
          status: row.status,
          incidentTime: row.incident_time,
        },
      });
    }

    // Segment features
    for (const row of segRes.rows) {
      features.push({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [
            [Number(row.start_lng), Number(row.start_lat)],
            [Number(row.end_lng), Number(row.end_lat)],
          ],
        },
        properties: {
          id: row.id,
          featureType: 'route_segment',
          name: row.name,
          lightingScore: Number(row.lighting_score),
          footTrafficScore: Number(row.foot_traffic_score),
          overallScore: Number(row.overall_score),
        },
      });
    }

    res.json({
      type: 'FeatureCollection',
      features,
      metadata: {
        totalFeatures: features.length,
        disclaimer: 'Community-reported observations. Never guaranteed safe.',
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: error.message,
    });
  }
});

// POST /hazard-report (Authenticated Tier 1+)
router.post(
  '/hazard-report',
  authenticate,
  requireTier(1),
  ratingLimit,
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.sub;
    const {
      incidentType,
      description,
      lat,
      lng,
      severity = 'medium',
      incidentTime = new Date(),
    } = req.body;

    if (!incidentType || lat === undefined || lng === undefined) {
      res.status(400).json({
        success: false,
        error: 'MISSING_FIELDS',
        message: 'incidentType, lat, and lng are required',
      });
      return;
    }

    const validTypes = ['poor_lighting', 'harassment', 'suspicious_activity', 'obstruction', 'other'];
    if (!validTypes.includes(incidentType)) {
      res.status(400).json({
        success: false,
        error: 'INVALID_INCIDENT_TYPE',
        message: `incidentType must be one of: ${validTypes.join(', ')}`,
      });
      return;
    }

    try {
      const result = await query(
        `INSERT INTO safety_incident_reports (reporter_id, incident_type, description, lat, lng, incident_time, severity, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
         RETURNING *`,
        [userId, incidentType, description || null, lat, lng, incidentTime, severity]
      );

      res.status(201).json({
        success: true,
        message: 'Hazard observation submitted successfully. Thank you for helping keep the community aware.',
        data: result.rows[0],
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'SERVER_ERROR',
        message: error.message,
      });
    }
  }
);

// GET /streetlights
router.get('/streetlights', async (req: Request, res: Response): Promise<void> => {
  const {
    north = '51.55',
    south = '51.48',
    east = '-0.08',
    west = '-0.18',
  } = req.query;

  try {
    const result = await query(
      `SELECT id, lat, lng, is_working, pole_number, notes, status, created_at
       FROM streetlight_reports
       WHERE lat BETWEEN $1 AND $2 AND lng BETWEEN $3 AND $4
       ORDER BY created_at DESC
       LIMIT 100`,
      [parseFloat(String(south)), parseFloat(String(north)), parseFloat(String(west)), parseFloat(String(east))]
    );

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: error.message,
    });
  }
});

export { router as mapRouter };
