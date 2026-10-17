import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import { isAllowedUniversityEmail, authRouter } from '../routes/auth';
import * as db from '../db/connection';

// Mock DB
vi.mock('../db/connection', () => ({
  query: vi.fn(),
  pool: {
    connect: vi.fn(),
  },
  logDatabaseStatus: vi.fn(),
}));

describe('Auth Module & Domain Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isAllowedUniversityEmail()', () => {
    it('accepts accredited UK and academic university domains', () => {
      expect(isAllowedUniversityEmail('sophie@kcl.ac.uk').allowed).toBe(true);
      expect(isAllowedUniversityEmail('maya@ucl.ac.uk').allowed).toBe(true);
      expect(isAllowedUniversityEmail('elena@imperial.ac.uk').allowed).toBe(true);
      expect(isAllowedUniversityEmail('student@ox.ac.uk').allowed).toBe(true);
      expect(isAllowedUniversityEmail('researcher@mit.edu').allowed).toBe(true);
    });

    it('rejects commercial or non-academic email domains', () => {
      expect(isAllowedUniversityEmail('chloe@gmail.com').allowed).toBe(false);
      expect(isAllowedUniversityEmail('attacker@yahoo.com').allowed).toBe(false);
      expect(isAllowedUniversityEmail('test@outlook.com').allowed).toBe(false);
      expect(isAllowedUniversityEmail('bad@domain.org').allowed).toBe(false);
    });
  });

  describe('POST /register endpoint behavior', () => {
    const app = express();
    app.use(express.json());
    app.use('/auth', authRouter);

    it('rejects registration with invalid non-university domain', async () => {
      const req = {
        body: {
          email: 'user@gmail.com',
          password: 'Password123!',
          displayName: 'Test User',
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

      // Call router directly via express app or handler
      const findRoute = (authRouter.stack as any[]).find(
        (s) => s.route?.path === '/register' && s.route?.methods?.post
      );

      // The last handle is the route handler
      const handler = findRoute.route.stack[findRoute.route.stack.length - 1].handle;
      await handler(req, res);

      expect(statusCode).toBe(400);
      expect(jsonBody.error).toBe('INVALID_UNI_DOMAIN');
      expect(jsonBody.success).toBe(false);
    });

    it('rejects registration when email already exists (duplicate 409)', async () => {
      vi.mocked(db.query).mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 'existing-uuid' }],
      } as any);

      const req = {
        body: {
          email: 'maya@ucl.ac.uk',
          password: 'Password123!',
          displayName: 'Maya Patel',
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

      const findRoute = (authRouter.stack as any[]).find(
        (s) => s.route?.path === '/register' && s.route?.methods?.post
      );
      const handler = findRoute.route.stack[findRoute.route.stack.length - 1].handle;
      await handler(req, res);

      expect(statusCode).toBe(409);
      expect(jsonBody.error).toBe('EMAIL_ALREADY_EXISTS');
      expect(jsonBody.success).toBe(false);
    });

    it('successfully registers valid university student and returns JWT', async () => {
      // 1. Existing check -> rowCount: 0
      vi.mocked(db.query).mockResolvedValueOnce({ rowCount: 0, rows: [] } as any);
      // 2. Insert user
      vi.mocked(db.query).mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 'new-user-uuid', email: 'elena@imperial.ac.uk', created_at: new Date() }],
      } as any);
      // 3. Insert profile
      vi.mocked(db.query).mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 'new-profile-uuid', display_name: 'Elena Rostova', university_domain: 'imperial.ac.uk' }],
      } as any);
      // 4. Insert verification
      vi.mocked(db.query).mockResolvedValueOnce({ rowCount: 1, rows: [] } as any);
      // 5. Insert trust status
      vi.mocked(db.query).mockResolvedValueOnce({ rowCount: 1, rows: [] } as any);
      // 6. Insert consent settings
      vi.mocked(db.query).mockResolvedValueOnce({ rowCount: 1, rows: [] } as any);

      const req = {
        body: {
          email: 'elena@imperial.ac.uk',
          password: 'Password123!',
          displayName: 'Elena Rostova',
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

      const findRoute = (authRouter.stack as any[]).find(
        (s) => s.route?.path === '/register' && s.route?.methods?.post
      );
      const handler = findRoute.route.stack[findRoute.route.stack.length - 1].handle;
      await handler(req, res);

      expect(statusCode).toBe(201);
      expect(jsonBody.success).toBe(true);
      expect(jsonBody.data.token).toBeDefined();
      expect(jsonBody.data.user.email).toBe('elena@imperial.ac.uk');
      expect(jsonBody.data.user.tier).toBe(0);
    });
  });
});
