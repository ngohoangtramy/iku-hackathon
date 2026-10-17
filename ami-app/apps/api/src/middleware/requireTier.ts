import { Request, Response, NextFunction } from 'express';
import { query } from '../db/connection';

export function requireTier(minTier: number) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user || !req.user.sub) {
      res.status(401).json({
        success: false,
        error: 'AUTH_REQUIRED',
        message: 'Authentication required before verifying trust tier',
      });
      return;
    }

    try {
      const result = await query(
        `SELECT tier, is_suspended, suspension_reason
         FROM user_trust_status
         WHERE user_id = $1`,
        [req.user.sub]
      );

      if (result.rowCount === 0) {
        res.status(403).json({
          success: false,
          error: 'TRUST_STATUS_NOT_FOUND',
          message: 'User trust status record not found',
        });
        return;
      }

      const trust = result.rows[0];

      if (trust.is_suspended) {
        res.status(403).json({
          success: false,
          error: 'ACCOUNT_SUSPENDED',
          message: 'Your account has been suspended from accessing this feature',
          reason: trust.suspension_reason || null,
        });
        return;
      }

      const currentTier = Number(trust.tier);

      if (currentTier < minTier) {
        res.status(403).json({
          success: false,
          error: 'TIER_REQUIRED',
          required: minTier,
          current: currentTier,
          message: `This action requires Tier ${minTier} verification. Your current level is Tier ${currentTier}.`,
        });
        return;
      }

      // Update tier on req.user for downstream handlers
      req.user.tier = currentTier;
      next();
    } catch (error: any) {
      console.error('[REQUIRE_TIER] Error checking tier:', error.message);
      res.status(500).json({
        success: false,
        error: 'TIER_VERIFICATION_FAILED',
        message: 'Internal error checking user tier status',
      });
    }
  };
}
