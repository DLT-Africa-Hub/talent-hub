import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import type { Request } from 'express';
import { verifyAccessToken } from '../utils/jwt.utils';

const deriveRateLimitKey = (req: Request): string => {
  if (req.user?.userId) {
    return `user:${req.user.userId}`;
  }

  const authHeader = req.headers.authorization;
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      const decoded = verifyAccessToken(token);
      if (decoded?.userId) {
        return `user:${decoded.userId}`;
      }
    } catch {
      // Swallow errors so that invalid tokens fall back to IP-based limiting
    }
  }

  const ip = typeof req.ip === 'string' && req.ip.length > 0 ? req.ip : '127.0.0.1';

  return `ip:${ipKeyGenerator(ip)}`;
};

export const userRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  keyGenerator: deriveRateLimitKey,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === 'test' || req.method === 'OPTIONS',
  message: {
    success: false,
    message: 'Too many requests. Please slow down.',
  },
});


