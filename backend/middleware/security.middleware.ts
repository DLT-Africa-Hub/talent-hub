import helmet from 'helmet';
import hpp from 'hpp';
import mongoSanitize from 'express-mongo-sanitize';
import xssClean from 'xss-clean';
import type { RequestHandler } from 'express';

export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      scriptSrc: ["'self'", "'unsafe-inline'", 'https:'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https:'],
      connectSrc: ["'self'", 'https:'],
      fontSrc: ["'self'", 'https:', 'data:'],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: {
    policy: 'cross-origin',
  },
  referrerPolicy: {
    policy: 'no-referrer',
  },
  frameguard: {
    action: 'deny',
  },
  hidePoweredBy: true,
});

export const preventHttpParameterPollution: RequestHandler = hpp();

export const sanitizeRequest: RequestHandler = mongoSanitize({
  replaceWith: '_',
});

export const mitigateXss: RequestHandler = xssClean();


