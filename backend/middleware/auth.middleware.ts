import { Request, Response, NextFunction } from 'express';
import Session from '../models/Session.model';
import { verifyAccessToken } from '../utils/jwt.utils';

/**
 * JWT Authentication Middleware
 * Verifies JWT token and attaches user info to request object
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.split(' ')[1]
      : undefined;

    if (!token) {
      res.status(401).json({ message: 'No token provided' });
      return;
    }

    const decoded = verifyAccessToken(token);

    const session = await Session.findById(decoded.sessionId);
    if (!session || !session.isActive()) {
      res.status(401).json({ message: 'Invalid or expired session' });
      return;
    }

    if (!session.user.equals(decoded.userId)) {
      res.status(401).json({ message: 'Session user mismatch' });
      return;
    }

    req.user = {
      userId: decoded.userId,
      role: decoded.role,
      sessionId: decoded.sessionId,
    };

    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
};

/**
 * Role-based authorization middleware
 * @param allowedRoles - Array of allowed roles
 */
export const authorize = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ message: 'Forbidden: Insufficient permissions' });
      return;
    }

    next();
  };
};

