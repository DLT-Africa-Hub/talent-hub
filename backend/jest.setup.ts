import 'reflect-metadata';

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET =
  process.env.JWT_ACCESS_SECRET || 'test-secret-test-secret-test-secret!!';
process.env.JWT_ACCESS_EXPIRE = '15m';
process.env.ENFORCE_HTTPS = 'false';
process.env.CSRF_COOKIE_SECURE = 'false';
process.env.API_PREFIX = '/api/v1';
process.env.CORS_ORIGIN = 'http://localhost:5174';

// Set Calendly config for tests (required for OAuth callback)
process.env.CALENDLY_CLIENT_ID =
  process.env.CALENDLY_CLIENT_ID || 'test_client_id';
process.env.CALENDLY_CLIENT_SECRET =
  process.env.CALENDLY_CLIENT_SECRET || 'test_client_secret';
process.env.CALENDLY_REDIRECT_URI =
  process.env.CALENDLY_REDIRECT_URI ||
  'http://localhost:3090/api/v1/companies/calendly/callback';
process.env.CALENDLY_ENCRYPTION_KEY =
  process.env.CALENDLY_ENCRYPTION_KEY ||
  'test-encryption-key-32-characters-long!!';

jest.setTimeout(30000);
