import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';
import { verificationRouter } from '../routes/verification';
import * as db from '../db/connection';

vi.mock('../db/connection', () => {
  const mockClient = {
    query: vi.fn(),
    release: vi.fn(),
  };
  return {
    query: vi.fn(),
    getClient: vi.fn().mockResolvedValue(mockClient),
    pool: {
      connect: vi.fn().mockResolvedValue(mockClient),
    },
    logDatabaseStatus: vi.fn(),
  };
});

describe('QR Physical Verification Module', () => {
  let mockClient: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockClient = await db.pool.connect();
  });

  const getRedeemHandler = () => {
    const findRoute = (verificationRouter.stack as any[]).find(
      (s) => s.route?.path === '/redeem' && s.route?.methods?.post
    );
    return findRoute.route.stack[findRoute.route.stack.length - 1].handle;
  };

  it('rejects missing token or eventId with 400', async () => {
    const req = {
      user: { sub: 'attendee-1', email: 'attendee@ucl.ac.uk', tier: 1 },
      body: {}, // missing token & eventId
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

    const handler = getRedeemHandler();
    await handler(req, res);

    expect(statusCode).toBe(400);
    expect(jsonBody.error).toBe('MISSING_FIELDS');
  });

  it('rejects expired token with 400 TOKEN_EXPIRED', async () => {
    const rawToken = crypto.randomUUID();
    const handler = getRedeemHandler();

    // Mock token lookup returned expired token
    mockClient.query.mockImplementation((sql: string) => {
      if (sql === 'BEGIN' || sql === 'ROLLBACK') return Promise.resolve({});
      if (sql.includes('SELECT id, event_id')) {
        return Promise.resolve({
          rowCount: 1,
          rows: [
            {
              id: 'qr-row-1',
              event_id: 'event-101',
              host_id: 'host-99',
              expires_at: new Date(Date.now() - 60000), // 1 min in the past
              is_used: false,
              host_lat: null,
              host_lng: null,
            },
          ],
        });
      }
      return Promise.resolve({ rowCount: 1, rows: [] });
    });

    const req = {
      user: { sub: 'attendee-1', email: 'attendee@ucl.ac.uk', tier: 1 },
      body: {
        token: rawToken,
        eventId: 'event-101',
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
    expect(jsonBody.error).toBe('TOKEN_EXPIRED');
    expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
  });

  it('rejects already used token with 400 TOKEN_ALREADY_USED (anti-replay)', async () => {
    const rawToken = crypto.randomUUID();
    const handler = getRedeemHandler();

    mockClient.query.mockImplementation((sql: string) => {
      if (sql === 'BEGIN' || sql === 'ROLLBACK') return Promise.resolve({});
      if (sql.includes('SELECT id, event_id')) {
        return Promise.resolve({
          rowCount: 1,
          rows: [
            {
              id: 'qr-row-2',
              event_id: 'event-101',
              host_id: 'host-99',
              expires_at: new Date(Date.now() + 30000),
              is_used: true, // Already used!
              host_lat: null,
              host_lng: null,
            },
          ],
        });
      }
      return Promise.resolve({ rowCount: 1, rows: [] });
    });

    const req = {
      user: { sub: 'attendee-1', email: 'attendee@ucl.ac.uk', tier: 1 },
      body: {
        token: rawToken,
        eventId: 'event-101',
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
    expect(jsonBody.error).toBe('TOKEN_ALREADY_USED');
    expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
  });

  it('successfully redeems valid token and upgrades attendee to Tier 2', async () => {
    const rawToken = crypto.randomUUID();
    const handler = getRedeemHandler();

    mockClient.query.mockImplementation((sql: string) => {
      if (sql === 'BEGIN' || sql === 'COMMIT') return Promise.resolve({});
      if (sql.includes('SELECT id, event_id')) {
        return Promise.resolve({
          rowCount: 1,
          rows: [
            {
              id: 'qr-row-3',
              event_id: 'event-101',
              host_id: 'host-99',
              expires_at: new Date(Date.now() + 25000), // Valid
              is_used: false,
              host_lat: 51.5246,
              host_lng: -0.1340,
            },
          ],
        });
      }
      return Promise.resolve({ rowCount: 1, rows: [] });
    });

    const req = {
      user: { sub: 'attendee-1', email: 'attendee@ucl.ac.uk', tier: 1 },
      body: {
        token: rawToken,
        eventId: 'event-101',
        attendeeLat: 51.52462,
        attendeeLng: -0.13401,
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

    expect(statusCode).toBe(200);
    expect(jsonBody.success).toBe(true);
    expect(jsonBody.data.newTier).toBe(2);
    expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
  });
});
