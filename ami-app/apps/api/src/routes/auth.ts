import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { query } from '../db/connection';
import { authenticate, generateToken } from '../middleware/auth';
import { authLimit } from '../middleware/rateLimit';

const router = Router();

// Domain validation helper
export function isAllowedUniversityEmail(email: string): { allowed: boolean; domain: string | null } {
  const parts = email.toLowerCase().split('@');
  if (parts.length !== 2) return { allowed: false, domain: null };
  const domain = parts[1];

  const allowedDomainsEnv = process.env.ALLOWED_UNI_DOMAINS || 'ac.uk,edu,student.manchester.ac.uk,kcl.ac.uk,ucl.ac.uk,imperial.ac.uk';
  const allowedList = allowedDomainsEnv.split(',').map((d) => d.trim().toLowerCase());

  const matches = allowedList.some((allowed) => domain === allowed || domain.endsWith(`.${allowed}`));
  return { allowed: matches, domain };
}

// Schemas
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  displayName: z.string().min(2).max(100),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// POST /register
router.post('/register', authLimit, async (req: Request, res: Response): Promise<void> => {
  const parseResult = registerSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: parseResult.error.errors[0]?.message || 'Invalid input data',
    });
    return;
  }

  const { email, password, displayName } = parseResult.data;
  const { allowed, domain } = isAllowedUniversityEmail(email);

  if (!allowed) {
    res.status(400).json({
      success: false,
      error: 'INVALID_UNI_DOMAIN',
      message: 'Registration requires a verified university email domain (e.g. .ac.uk or .edu)',
    });
    return;
  }

  try {
    const existing = await query(`SELECT id FROM users WHERE email = $1`, [email.toLowerCase()]);
    if (existing.rowCount && existing.rowCount > 0) {
      res.status(409).json({
        success: false,
        error: 'EMAIL_ALREADY_EXISTS',
        message: 'An account with this email address already exists',
      });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const userRes = await query(
      `INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at`,
      [email.toLowerCase(), passwordHash]
    );
    const user = userRes.rows[0];

    const profileRes = await query(
      `INSERT INTO profiles (user_id, display_name, university_domain)
       VALUES ($1, $2, $3)
       RETURNING id, display_name, university_domain`,
      [user.id, displayName, domain]
    );
    const profile = profileRes.rows[0];

    await query(
      `INSERT INTO user_verifications (user_id, email, university_domain, identity_check_status)
       VALUES ($1, $2, $3, 'pending')`,
      [user.id, email.toLowerCase(), domain]
    );

    await query(
      `INSERT INTO user_trust_status (user_id, tier) VALUES ($1, 0)`,
      [user.id]
    );

    await query(
      `INSERT INTO ai_call_consent_settings (user_id, distress_detection_enabled)
       VALUES ($1, true)
       ON CONFLICT (user_id) DO NOTHING`,
      [user.id]
    );

    const token = generateToken({
      sub: user.id,
      email: user.email,
      tier: 0,
    });

    res.status(201).json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          displayName: profile.display_name,
          universityDomain: profile.university_domain,
          tier: 0,
        },
      },
    });
  } catch (error: any) {
    console.error('[AUTH] Register error:', error.message);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'Failed to create user account',
    });
  }
});

// POST /login
router.post('/login', authLimit, async (req: Request, res: Response): Promise<void> => {
  const parseResult = loginSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'Email and password are required',
    });
    return;
  }

  const { email, password } = parseResult.data;

  try {
    const userRes = await query(
      `SELECT u.id, u.email, u.password_hash, p.display_name, p.is_active,
              t.tier, t.is_suspended, t.suspension_reason
       FROM users u
       LEFT JOIN profiles p ON p.user_id = u.id
       LEFT JOIN user_trust_status t ON t.user_id = u.id
       WHERE u.email = $1`,
      [email.toLowerCase()]
    );

    if (userRes.rowCount === 0) {
      res.status(401).json({
        success: false,
        error: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      });
      return;
    }

    const user = userRes.rows[0];

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      res.status(401).json({
        success: false,
        error: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      });
      return;
    }

    if (user.is_suspended) {
      res.status(403).json({
        success: false,
        error: 'ACCOUNT_SUSPENDED',
        message: 'Your account has been suspended',
        reason: user.suspension_reason,
      });
      return;
    }

    const currentTier = user.tier !== null ? Number(user.tier) : 0;

    const token = generateToken({
      sub: user.id,
      email: user.email,
      tier: currentTier,
    });

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          displayName: user.display_name,
          tier: currentTier,
          isActive: user.is_active,
        },
      },
    });
  } catch (error: any) {
    console.error('[AUTH] Login error:', error.message);
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'Authentication failed',
    });
  }
});

// POST /verify-email
router.post('/verify-email', authenticate, async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.sub;

  try {
    await query(
      `UPDATE user_verifications
       SET email_verified = true, email_verified_at = NOW(), updated_at = NOW()
       WHERE user_id = $1`,
      [userId]
    );

    // If identity check also passed, promote to Tier 1
    const verRes = await query(
      `SELECT identity_check_status FROM user_verifications WHERE user_id = $1`,
      [userId]
    );

    let newTier = 0;
    if (verRes.rows[0]?.identity_check_status === 'passed') {
      await query(
        `UPDATE user_trust_status
         SET tier = GREATEST(tier, 1), tier1_granted_at = COALESCE(tier1_granted_at, NOW()), updated_at = NOW()
         WHERE user_id = $1`,
        [userId]
      );
      newTier = 1;
    }

    res.json({
      success: true,
      message: 'Email successfully verified',
      data: { emailVerified: true, tier: newTier },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: error.message,
    });
  }
});

// POST /identity-verify (Mock ID / Liveness verification)
router.post('/identity-verify', authenticate, async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.sub;

  try {
    await query(
      `UPDATE user_verifications
       SET identity_check_status = 'passed',
           identity_check_provider = 'mock_provider',
           identity_check_reference = 'MOCK_REF_' || NOW(),
           liveness_passed = true,
           updated_at = NOW()
       WHERE user_id = $1`,
      [userId]
    );

    // If email is also verified, upgrade to Tier 1
    const verRes = await query(
      `SELECT email_verified FROM user_verifications WHERE user_id = $1`,
      [userId]
    );

    let upgradedTier = 0;
    if (verRes.rows[0]?.email_verified) {
      await query(
        `UPDATE user_trust_status
         SET tier = GREATEST(tier, 1), tier1_granted_at = COALESCE(tier1_granted_at, NOW()), updated_at = NOW()
         WHERE user_id = $1`,
        [userId]
      );
      upgradedTier = 1;
    }

    res.json({
      success: true,
      message: 'Identity and liveness verification passed (Demo Mode)',
      data: {
        identityCheckStatus: 'passed',
        livenessPassed: true,
        tier: upgradedTier,
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

// GET /me
router.post('/refresh', authenticate, async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.sub;

  try {
    const userRes = await query(
      `SELECT u.email, t.tier
       FROM users u
       JOIN user_trust_status t ON t.user_id = u.id
       WHERE u.id = $1`,
      [userId]
    );

    if (userRes.rowCount === 0) {
      res.status(404).json({ success: false, error: 'USER_NOT_FOUND' });
      return;
    }

    const current = userRes.rows[0];
    const token = generateToken({
      sub: userId,
      email: current.email,
      tier: Number(current.tier),
    });

    res.json({
      success: true,
      data: { token, tier: Number(current.tier) },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'SERVER_ERROR', message: error.message });
  }
});

router.get('/me', authenticate, async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.sub;

  try {
    const result = await query(
      `SELECT u.id, u.email, u.created_at,
              p.display_name, p.bio, p.avatar_url, p.university_domain, p.interests, p.approx_lat, p.approx_lng, p.is_active,
              t.tier, t.tier1_granted_at, t.tier2_granted_at, t.is_suspended,
              v.email_verified, v.identity_check_status, v.liveness_passed
       FROM users u
       LEFT JOIN profiles p ON p.user_id = u.id
       LEFT JOIN user_trust_status t ON t.user_id = u.id
       LEFT JOIN user_verifications v ON v.user_id = u.id
       WHERE u.id = $1`,
      [userId]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ success: false, error: 'USER_NOT_FOUND', message: 'User not found' });
      return;
    }

    const row = result.rows[0];
    res.json({
      success: true,
      data: {
        id: row.id,
        email: row.email,
        displayName: row.display_name,
        bio: row.bio,
        avatarUrl: row.avatar_url,
        universityDomain: row.university_domain,
        interests: row.interests,
        approxLat: row.approx_lat,
        approxLng: row.approx_lng,
        isActive: row.is_active,
        trust: {
          tier: Number(row.tier),
          tier1GrantedAt: row.tier1_granted_at,
          tier2GrantedAt: row.tier2_granted_at,
          isSuspended: row.is_suspended,
        },
        verification: {
          emailVerified: row.email_verified,
          identityCheckStatus: row.identity_check_status,
          livenessPassed: row.liveness_passed,
        },
        createdAt: row.created_at,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'SERVER_ERROR', message: error.message });
  }
});

// DELETE /account
router.delete('/account', authenticate, async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.sub;

  try {
    // Soft delete profile and anonymize verifications
    await query(
      `UPDATE profiles
       SET is_active = false,
           display_name = 'Deactivated User',
           bio = NULL,
           interests = NULL,
           updated_at = NOW()
       WHERE user_id = $1`,
      [userId]
    );

    await query(
      `UPDATE user_verifications
       SET email = 'anonymized_' || user_id || '@anonymized.local',
           identity_check_reference = NULL,
           updated_at = NOW()
       WHERE user_id = $1`,
      [userId]
    );

    res.json({
      success: true,
      message: 'Account successfully deactivated and sensitive profile data anonymized.',
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'SERVER_ERROR', message: error.message });
  }
});

// POST /password-reset/request
router.post('/password-reset/request', authLimit, async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body;
  console.log(`[AUTH] Mock password reset requested for: ${email}`);
  res.json({
    success: true,
    message: 'If the email address exists in our system, password reset instructions have been sent.',
  });
});

// POST /password-reset/confirm
router.post('/password-reset/confirm', authLimit, async (req: Request, res: Response): Promise<void> => {
  const { email, newPassword } = req.body;

  if (!email || !newPassword || newPassword.length < 8) {
    res.status(400).json({
      success: false,
      error: 'INVALID_INPUT',
      message: 'Valid email and new password (min 8 characters) are required.',
    });
    return;
  }

  try {
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await query(
      `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE email = $2`,
      [passwordHash, email.toLowerCase()]
    );

    res.json({
      success: true,
      message: 'Password has been reset successfully. Please log in with your new password.',
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'SERVER_ERROR', message: error.message });
  }
});

export { router as authRouter };
