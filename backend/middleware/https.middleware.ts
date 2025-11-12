import type { NextFunction, Request, Response } from 'express';

export const enforceHttps = (req: Request, res: Response, next: NextFunction): void => {
  const xForwardedProto = req.headers['x-forwarded-proto'];
  const forwarded = Array.isArray(xForwardedProto)
    ? xForwardedProto[0]
    : xForwardedProto;
  const isForwardedSecure = typeof forwarded === 'string' && forwarded.includes('https');

  if (req.secure || isForwardedSecure) {
    next();
    return;
  }

  if (req.method === 'GET' || req.method === 'HEAD') {
    const host = req.headers.host;
    if (host) {
      res.redirect(307, `https://${host}${req.originalUrl}`);
      return;
    }
  }

  res.status(403).json({
    success: false,
    message: 'HTTPS is required for this resource',
  });
};


