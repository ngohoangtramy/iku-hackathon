import { Router, Request, Response } from 'express';
import { query } from '../db/connection';
import { authenticate } from '../middleware/auth';
import { requireTier } from '../middleware/requireTier';
import { ratingLimit } from '../middleware/rateLimit';
import { calculateWeightedRating } from '../services/safety';

const router = Router();

// GET /routes
router.get('/routes', async (req: Request, res: Response): Promise<void> => {
  const { origin = req.query.from, destination = req.query.to } = req.query;

  if (!origin || !destination) {
    res.status(400).json({
      success: false,
      error: 'MISSING_PARAMS',
      message: 'Both origin and destination coordinates are required as lat,lng',
    });
    return;
  }

  const parseCoordinate = (value: unknown): [number, number] | null => {
    const parts = String(value).split(',').map(Number);
    if (parts.length !== 2 || !parts.every(Number.isFinite)) return null;
    const [lat, lng] = parts;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
    return [lat, lng];
  };

  const from = parseCoordinate(origin);
  const to = parseCoordinate(destination);
  if (!from || !to) {
    res.status(400).json({ success: false, error: 'INVALID_COORDINATES', message: 'Coordinates must be valid lat,lng pairs.' });
    return;
  }

  try {
    const alternatives: any[] = [];
    for (let alternative = 0; alternative < 3; alternative += 1) {
      const params = new URLSearchParams({
        lonlats: `${from[1]},${from[0]}|${to[1]},${to[0]}`,
        profile: 'trekking',
        alternativeidx: String(alternative),
        format: 'geojson',
      });
      const response = await fetch(`https://brouter.de/brouter?${params.toString()}`);
      if (!response.ok) {
        if (alternative === 0) throw new Error(`BRouter returned HTTP ${response.status}`);
        break;
      }

      const data = await response.json() as {
        features?: Array<{
          geometry?: { type?: string; coordinates?: [number, number][] };
          properties?: Record<string, unknown>;
        }>;
      };
      const feature = data.features?.find((candidate) => candidate.geometry?.type === 'LineString' && candidate.geometry.coordinates?.length);
      if (!feature?.geometry?.coordinates) break;

      alternatives.push({
        routeId: `brouter-${alternative}`,
        summary: alternative === 0 ? 'Walking route' : `Walking alternative ${alternative}`,
        duration: `${Math.max(1, Math.round(Number(feature.properties?.['total-time'] || 0) / 60))} mins`,
        durationSeconds: Number(feature.properties?.['total-time']) || 0,
        distance: `${Number(feature.properties?.['track-length']) || 0} m`,
        distanceMeters: Number(feature.properties?.['track-length']) || 0,
        coordinates: feature.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
        safetyScore: calculateWeightedRating([]),
        isRecommended: false,
        isSimulated: false,
        dataWarnings: ['Route geometry comes from OpenStreetMap; safety is not guaranteed.'],
      });
    }

    if (!alternatives.length) {
      res.status(404).json({ success: false, error: 'ROUTE_NOT_FOUND', message: 'No walkable route found between those coordinates.' });
      return;
    }

    res.json({ success: true, data: { routes: alternatives, isMock: false, provider: 'BRouter / OpenStreetMap' } });
  } catch (error) {
    console.warn('[MAP] BRouter route request failed:', error);
    res.status(502).json({ success: false, error: 'ROUTING_UNAVAILABLE', message: 'Walking route service is temporarily unavailable.' });
  }
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
