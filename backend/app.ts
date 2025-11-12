import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';

import authRoutes from './routes/auth.routes';
import graduateRoutes from './routes/graduate.routes';
import companyRoutes from './routes/company.routes';
import adminRoutes from './routes/admin.routes';
import { loggingMiddleware } from './middleware/logging.middleware';
import { responseFormatter } from './middleware/response.middleware';
import { apiLimiter } from './middleware/rateLimit.middleware';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import openApiDocument from './docs/openapi.json';
import {
  securityHeaders,
  preventHttpParameterPollution,
  sanitizeRequest,
  mitigateXss,
} from './middleware/security.middleware';
import { enforceHttps } from './middleware/https.middleware';
import { csrfProtection, exposeCsrfToken } from './middleware/csrf.middleware';
import { userRateLimiter } from './middleware/userRateLimit.middleware';
import { securityConfig } from './config/secrets';

const app = express();
const API_PREFIX = process.env.API_PREFIX || '/api/v1';

app.disable('x-powered-by');

if (securityConfig.https.trustProxy !== false) {
  app.set('trust proxy', securityConfig.https.trustProxy);
}

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  })
);

app.use(securityHeaders);

if (securityConfig.https.enforce) {
  app.use(enforceHttps);
}

app.use(loggingMiddleware);
app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(preventHttpParameterPollution);
app.use(sanitizeRequest);
app.use(mitigateXss);
app.use(responseFormatter);
app.use(apiLimiter);
app.use(userRateLimiter);
app.use(csrfProtection);
app.use(exposeCsrfToken());

app.get('/health', (_req, res) => {
  res.success({ status: 'ok', message: 'Talent Hub API is running' });
});

app.get(`${API_PREFIX}/health`, (_req, res) => {
  res.success({ status: 'ok', message: 'Talent Hub API is running' });
});

app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));

app.get(`${API_PREFIX}/csrf-token`, (_req, res) => {
  res.success({
    token: res.locals.csrfToken,
    headerName: securityConfig.csrf.headerNameCanonical,
    cookieName: securityConfig.csrf.cookieName,
  });
});

app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/graduates`, graduateRoutes);
app.use(`${API_PREFIX}/companies`, companyRoutes);
app.use(`${API_PREFIX}/admin`, adminRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export { app };
export default app;


