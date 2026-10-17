import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requireTier } from '../middleware/requireTier';
import { authenticate } from '../middleware/auth';
import * as db from '../db/connection';

vi.mock('../db/connection', () => ({
  query: vi.fn(),
  logDatabaseStatus: vi.fn(),
}));

describe('Trust Tier & Authentication Permissions Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('authenticate middleware', () => {
    it('returns 401 AUTH_REQUIRED when Authorization header is absent', () => {
      const req = { headers: {} } as any;
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
      const next = vi.fn();

      authenticate(req, res, next);

      expect(statusCode).toBe(401);
      expect(jsonBody.error).toBe('AUTH_REQUIRED');
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 401 INVALID_TOKEN when token is malformed', () => {
      const req = { headers: { authorization: 'Bearer invalid.token.signature' } } as any;
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
      const next = vi.fn();

      authenticate(req, res, next);

      expect(statusCode).toBe(401);
      expect(jsonBody.error).toBe('INVALID_TOKEN');
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('requireTier(minTier) middleware', () => {
    it('blocks Tier 0 unverified user on Tier 1 protected route with 403 TIER_REQUIRED', async () => {
      // Mock db returns tier 0
      vi.mocked(db.query).mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ tier: 0, is_suspended: false, suspension_reason: null }],
      } as any);

      const middleware = requireTier(1);
      const req = { user: { sub: 'user-tier-0', email: 'chloe@gmail.com', tier: 0 } } as any;
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
      const next = vi.fn();

      await middleware(req, res, next);

      expect(statusCode).toBe(403);
      expect(jsonBody.error).toBe('TIER_REQUIRED');
      expect(jsonBody.required).toBe(1);
      expect(jsonBody.current).toBe(0);
      expect(next).not.toHaveBeenCalled();
    });

    it('blocks Tier 1 user on Tier 2 protected route with 403 TIER_REQUIRED', async () => {
      // Mock db returns tier 1
      vi.mocked(db.query).mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ tier: 1, is_suspended: false, suspension_reason: null }],
      } as any);

      const middleware = requireTier(2);
      const req = { user: { sub: 'user-tier-1', email: 'elena@imperial.ac.uk', tier: 1 } } as any;
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
      const next = vi.fn();

      await middleware(req, res, next);

      expect(statusCode).toBe(403);
      expect(jsonBody.error).toBe('TIER_REQUIRED');
      expect(jsonBody.required).toBe(2);
      expect(jsonBody.current).toBe(1);
      expect(next).not.toHaveBeenCalled();
    });

    it('blocks suspended user regardless of tier with 403 ACCOUNT_SUSPENDED', async () => {
      // Mock db returns is_suspended: true
      vi.mocked(db.query).mockResolvedValueOnce({
        rowCount: 1,
        rows: [
          {
            tier: 2,
            is_suspended: true,
            suspension_reason: 'Violation of community safety guidelines',
          },
        ],
      } as any);

      const middleware = requireTier(1);
      const req = { user: { sub: 'suspended-user', email: 'bad@kcl.ac.uk', tier: 2 } } as any;
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
      const next = vi.fn();

      await middleware(req, res, next);

      expect(statusCode).toBe(403);
      expect(jsonBody.error).toBe('ACCOUNT_SUSPENDED');
      expect(jsonBody.reason).toBe('Violation of community safety guidelines');
      expect(next).not.toHaveBeenCalled();
    });

    it('allows Tier 2 user on Tier 1 and Tier 2 protected routes', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ tier: 2, is_suspended: false }],
      } as any);

      const middleware = requireTier(2);
      const req = { user: { sub: 'tier2-user', email: 'sophie@kcl.ac.uk', tier: 2 } } as any;
      const res = {} as any;
      const next = vi.fn();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user.tier).toBe(2);
    });
  });
});
