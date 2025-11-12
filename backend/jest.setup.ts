import 'reflect-metadata';

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET =
  process.env.JWT_ACCESS_SECRET || 'test-secret-test-secret-test-secret!!';
process.env.JWT_ACCESS_EXPIRE = '15m';
process.env.ENFORCE_HTTPS = 'false';
process.env.CSRF_COOKIE_SECURE = 'false';
process.env.API_PREFIX = '/api/v1';
process.env.CORS_ORIGIN = 'http://localhost:5173';

jest.setTimeout(30000);

