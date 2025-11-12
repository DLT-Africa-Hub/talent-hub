import csrf from 'csurf';
import type { Request, RequestHandler, Response } from 'express';
import { securityConfig } from '../config/secrets';

const rawCsrfProtection = csrf({
  cookie: {
    key: securityConfig.csrf.cookieName,
    httpOnly: true,
    sameSite: securityConfig.csrf.cookieSameSite,
    secure: securityConfig.csrf.cookieSecure,
    maxAge: securityConfig.csrf.cookieMaxAgeMs,
  },
  ignoreMethods: securityConfig.csrf.ignoredMethods,
  value: (req) => {
    const headerToken = req.headers[securityConfig.csrf.headerName];
    if (typeof headerToken === 'string' && headerToken.trim().length > 0) {
      return headerToken;
    }

    if (
      req.body &&
      typeof req.body === 'object' &&
      typeof (req.body as Record<string, unknown>)._csrf === 'string'
    ) {
      return ((req.body as Record<string, unknown>)._csrf as string).trim();
    }

    if (
      req.query &&
      typeof req.query === 'object' &&
      typeof (req.query as Record<string, unknown>)._csrf === 'string'
    ) {
      return ((req.query as Record<string, unknown>)._csrf as string).trim();
    }

    return '';
  },
});

export const csrfProtection: RequestHandler =
  rawCsrfProtection as unknown as RequestHandler;

export const exposeCsrfToken = (): RequestHandler => {
  const handler: RequestHandler = (req: Request, res: Response, next) => {
    if (typeof req.csrfToken !== 'function') {
      return next();
    }

    try {
      const token = req.csrfToken();
      res.locals.csrfToken = token;
      res.setHeader(securityConfig.csrf.headerNameCanonical, token);
    } catch (error) {
      return next(error);
    }

    return next();
  };

  return handler;
};


