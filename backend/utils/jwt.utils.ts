import jwt from 'jsonwebtoken';
import { securityConfig } from '../config/secrets';

const ACCESS_TOKEN_SECRET = securityConfig.jwt.accessSecret;
// JWT expiration time (supports formats like '1h', '24h', '7d', or milliseconds as number)
const ACCESS_TOKEN_EXPIRE: string | number =
  (process.env.JWT_ACCESS_EXPIRE as string | undefined) || '24h';

export interface AccessTokenPayload {
  userId: string;
  role: string;
  sessionId: string;
}

/**
 * Generate a signed JWT access token.
 */
export function generateAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, ACCESS_TOKEN_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRE as string | number,
  });
}

/**
 * Verify and decode a JWT access token.
 */
export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, ACCESS_TOKEN_SECRET) as AccessTokenPayload;
}
