import rateLimit from 'express-rate-limit';

export const generalLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many requests from this IP. Please try again after 15 minutes.',
  },
});

export const authLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 10,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'AUTH_RATE_LIMIT_EXCEEDED',
    message: 'Too many authentication attempts. Please try again after 15 minutes.',
  },
});

export const qrLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  limit: 20,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'QR_RATE_LIMIT_EXCEEDED',
    message: 'Too many QR requests. Please slow down.',
  },
});

export const ratingLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 10,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'RATING_RATE_LIMIT_EXCEEDED',
    message: 'Rating limit reached (max 10 per hour). Please try again later.',
  },
});
