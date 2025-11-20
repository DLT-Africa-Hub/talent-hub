import { Request, Response, NextFunction } from 'express';
import Session from '../models/Session.model';
import User from '../models/User.model';
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

    // Fetch user to check email verification status
    const user = await User.findById(decoded.userId);
    if (!user) {
      res.status(401).json({ message: 'User not found' });
      return;
    }

    req.user = {
      userId: decoded.userId,
      role: decoded.role,
      sessionId: decoded.sessionId,
      emailVerified: user.emailVerified,
    };

    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
};

/**
 * Email verification middleware
 * Blocks access if user's email is not verified
 */
export const requireEmailVerification = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  if (req.user.emailVerified === false || !req.user.emailVerified) {
    res.status(403).json({
      message: 'Email verification required',
      code: 'EMAIL_NOT_VERIFIED',
      emailVerified: false,
    });
    return;
  }

  next();
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
