import { describe, it, expect, vi, beforeEach } from 'vitest';
import { calculateWeightedRating } from '../services/safety';
import { ratingsRouter } from '../routes/ratings';
import * as db from '../db/connection';

vi.mock('../db/connection', () => ({
  query: vi.fn(),
  logDatabaseStatus: vi.fn(),
}));

describe('Ratings & Safety Scoring Algorithm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('calculateWeightedRating() math and decay', () => {
    it('accurately computes weighted ratings with Tier 2 (2.0x) and Tier 1 (1.0x)', () => {
      // 1 fresh Tier 2 rating (5 stars), 1 fresh Tier 1 rating (1 star)
      const ratings = [
        { rating: 5, tier_weight: 2.0, created_at: new Date() },
        { rating: 1, tier_weight: 1.0, created_at: new Date() },
      ];

      // Formula: (5 * 2.0 * 1 + 1 * 1.0 * 1) / (2.0 * 1 + 1.0 * 1) = (10 + 1) / 3 = 11 / 3 = 3.666...
      const result = calculateWeightedRating(ratings);

      expect(result.rawRating).toBeCloseTo(3.67, 1);
      // Normalized: ((3.67 - 1) / 4) * 100 = (2.67 / 4) * 100 = 66.75 -> ~67
      expect(result.score).toBeGreaterThanOrEqual(65);
      expect(result.score).toBeLessThanOrEqual(68);
      expect(result.tierBreakdown.tier2Count).toBe(1);
      expect(result.tierBreakdown.tier1Count).toBe(1);
    });

    it('decays older ratings over time according to exponential time-decay', () => {
      // Rating A: 1 star from today
      // Rating B: 5 stars from 30 days ago
      const ratingsWithOld = [
        { rating: 1, tier_weight: 1.0, created_at: new Date() },
        { rating: 5, tier_weight: 1.0, created_at: new Date(Date.now() - 30 * 86400000) },
      ];

      // Decay for 30 days: exp(-0.05 * 30) = exp(-1.5) ≈ 0.223
      // Without decay: (1 + 5) / 2 = 3.0
      // With decay: (1*1 + 5*0.223) / (1 + 0.223) = 2.115 / 1.223 ≈ 1.73 (heavily weighted towards recent 1 star)
      const result = calculateWeightedRating(ratingsWithOld);

      expect(result.rawRating).toBeLessThan(2.0);
    });

    it('assigns correct confidence ratings based on sample sizes', () => {
      // Insufficient (0 samples)
      expect(calculateWeightedRating([]).confidence).toBe('insufficient');

      // Low (1-4 samples)
      const lowSamples = [{ rating: 4, tier_weight: 1.0, created_at: new Date() }];
      expect(calculateWeightedRating(lowSamples).confidence).toBe('low');

      // Medium (5-14 samples)
      const medSamples = Array.from({ length: 6 }, () => ({
        rating: 4,
        tier_weight: 1.0,
        created_at: new Date(),
      }));
      expect(calculateWeightedRating(medSamples).confidence).toBe('medium');

      // High (15+ samples)
      const highSamples = Array.from({ length: 16 }, () => ({
        rating: 4,
        tier_weight: 1.0,
        created_at: new Date(),
      }));
      expect(calculateWeightedRating(highSamples).confidence).toBe('high');
    });

    it('strictly avoids misleading claims: NEVER output "safe" or "guaranteed safe"', () => {
      const perfectRatings = Array.from({ length: 20 }, () => ({
        rating: 5,
        tier_weight: 2.0,
        created_at: new Date(),
      }));

      const result = calculateWeightedRating(perfectRatings);
      const allText = [...result.indicators, ...result.dataWarnings].join(' ').toLowerCase();

      expect(allText).not.toContain('guaranteed safe');
      expect(allText).not.toContain('route is safe');
      expect(result.dataWarnings).toContain('Community-reported data — verify conditions in person.');
    });
  });

  describe('POST /ratings anti-spam check (24 hour rule)', () => {
    it('rejects duplicate rating within 24h on the same segment with 400', async () => {
      // Mock existing rating found in past 24h
      vi.mocked(db.query).mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 'existing-rating-id' }],
      } as any);

      const findRoute = (ratingsRouter.stack as any[]).find(
        (s) => s.route?.path === '/' && s.route?.methods?.post
      );
      const handler = findRoute.route.stack[findRoute.route.stack.length - 1].handle;

      const req = {
        user: { sub: 'user-101', email: 'test@kcl.ac.uk', tier: 1 },
        body: {
          segmentId: 'segment-uuid-1',
          rating: 4,
          notes: 'Well-lit walkway',
        },
      } as any;

      let statusCode = 200;
      let jsonBody: any = null;
      const res = {
        status: (code: number) => {
          statusCode = code;
          return res;
        },
        json: (data: any) => {
          jsonBody = data;
          return res;
        },
      } as any;

      await handler(req, res);

      expect(statusCode).toBe(400);
      expect(jsonBody.error).toBe('DUPLICATE_RATING');
    });
  });
});
