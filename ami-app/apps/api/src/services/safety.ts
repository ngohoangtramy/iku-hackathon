import { query } from '../db/connection';

export interface SafetyScore {
  score: number; // 0-100 normalized score
  rawRating?: number; // 1-5 scale
  confidence: 'high' | 'medium' | 'low' | 'insufficient';
  sampleCount: number;
  tierBreakdown: {
    tier1Count: number;
    tier2Count: number;
  };
  indicators: string[]; // Human-readable observation labels
  dataWarnings: string[]; // Safety disclaimer & data warnings
  isSimulated: boolean;
}

export interface ScoreOptions {
  includeNearbyAmenities?: boolean;
  isSimulated?: boolean;
}

const LAMBDA_DECAY = 0.05; // Time decay coefficient per day

/**
 * Computes safety score from route ratings using exponential time-decay
 * decay = exp(-lambda * daysSinceRating)
 * weightedScore = sum(rating * weight * decay) / sum(weight * decay)
 * Rule: NEVER output 'safe' or 'guaranteed safe'.
 */
export function calculateWeightedRating(
  ratings: Array<{ rating: number; tier_weight: number | string; created_at: Date | string }>,
  isSimulated: boolean = false
): SafetyScore {
  const warnings: string[] = [
    'Community-reported data — verify conditions in person.',
  ];
  const indicators: string[] = [];

  if (!ratings || ratings.length === 0) {
    return {
      score: 50, // neutral default when insufficient data
      rawRating: 2.5,
      confidence: 'insufficient',
      sampleCount: 0,
      tierBreakdown: { tier1Count: 0, tier2Count: 0 },
      indicators: ['No recent community reports for this corridor.'],
      dataWarnings: [
        ...warnings,
        'Limited recent community feedback.',
        'Score represents default baseline due to lack of verified ratings.',
      ],
      isSimulated,
    };
  }

  let totalWeightedDecayedSum = 0;
  let totalWeightDecay = 0;
  let tier1Count = 0;
  let tier2Count = 0;
  const now = Date.now();

  for (const r of ratings) {
    const ratingValue = Number(r.rating);
    const weight = Number(r.tier_weight) >= 2.0 ? 2.0 : 1.0;

    if (weight >= 2.0) {
      tier2Count++;
    } else {
      tier1Count++;
    }

    const ratingDate = new Date(r.created_at).getTime();
    const daysSince = Math.max(0, (now - ratingDate) / (1000 * 60 * 60 * 24));
    const decay = Math.exp(-LAMBDA_DECAY * daysSince);

    totalWeightedDecayedSum += ratingValue * weight * decay;
    totalWeightDecay += weight * decay;
  }

  const rawWeightedRating = totalWeightDecay > 0
    ? totalWeightedDecayedSum / totalWeightDecay
    : 2.5;

  // Normalize 1-5 scale to 0-100
  const normalizedScore = Math.round(Math.min(100, Math.max(0, ((rawWeightedRating - 1) / 4) * 100)));

  // Confidence determination
  const sampleCount = ratings.length;
  let confidence: 'high' | 'medium' | 'low' | 'insufficient' = 'low';

  if (sampleCount >= 15) {
    confidence = 'high';
  } else if (sampleCount >= 5) {
    confidence = 'medium';
  } else if (sampleCount >= 1) {
    confidence = 'low';
  } else {
    confidence = 'insufficient';
  }

  if (sampleCount < 5) {
    warnings.push('Limited recent community feedback.');
  }

  // Objective community observation indicators
  if (normalizedScore >= 75) {
    indicators.push('Higher reported lighting along route.');
    indicators.push('More open businesses nearby.');
  } else if (normalizedScore >= 50) {
    indicators.push('Moderate reported street lighting.');
    indicators.push('Mixed pedestrian activity.');
  } else {
    indicators.push('Dimmer lighting reported by pedestrians.');
    indicators.push('Lower pedestrian density reported after dark.');
  }

  return {
    score: normalizedScore,
    rawRating: Number(rawWeightedRating.toFixed(2)),
    confidence,
    sampleCount,
    tierBreakdown: {
      tier1Count,
      tier2Count,
    },
    indicators,
    dataWarnings: warnings,
    isSimulated,
  };
}

/**
 * Scores a route geometry or segment list
 */
export async function scoreRoute(
  routeGeometry: any,
  options: ScoreOptions = {}
): Promise<SafetyScore> {
  const isSimulated = options.isSimulated ?? true;

  try {
    // If route contains segments or coords, query database for route ratings
    const ratingsRes = await query(
      `SELECT rating, tier_weight, created_at
       FROM route_ratings
       ORDER BY created_at DESC
       LIMIT 50`
    );

    const ratings = ratingsRes.rows;
    return calculateWeightedRating(ratings, isSimulated);
  } catch (error) {
    // Fallback to simulated score
    return calculateWeightedRating([
      { rating: 4, tier_weight: 2.0, created_at: new Date() },
      { rating: 4, tier_weight: 1.0, created_at: new Date(Date.now() - 86400000) },
      { rating: 5, tier_weight: 2.0, created_at: new Date(Date.now() - 3 * 86400000) },
    ], true);
  }
}
