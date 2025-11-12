import type { NextFunction, Request, Response } from 'express';
import { securityConfig } from '../config/secrets';
import { hashToken, timingSafeEqualHex } from '../utils/security.utils';

const hasConfiguredApiKeys = securityConfig.apiKeys.hashes.length > 0;

export const requireApiKey =
  (): ((req: Request, res: Response, next: NextFunction) => void) =>
  (req: Request, res: Response, next: NextFunction): void => {
    if (!hasConfiguredApiKeys) {
      next();
      return;
    }

    const providedKey =
      req.headers[securityConfig.apiKeys.headerName] ??
      req.headers[securityConfig.apiKeys.originalHeaderName];

    if (typeof providedKey !== 'string' || providedKey.trim().length === 0) {
      res.status(401).json({
        success: false,
        message: 'API key is required',
      });
      return;
    }

    const normalizedKey = providedKey.trim();
    const providedHash = hashToken(normalizedKey);

    const isAuthorized = securityConfig.apiKeys.hashes.some((hash) =>
      timingSafeEqualHex(hash, providedHash)
    );

    if (!isAuthorized) {
      res.status(401).json({
        success: false,
        message: 'Invalid API key',
      });
      return;
    }

    next();
  };


