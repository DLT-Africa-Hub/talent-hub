import jwt from 'jsonwebtoken';
import type { StringValue } from 'ms';

const DEFAULT_SECRET = 'default-secret';

const ACCESS_TOKEN_SECRET =
  process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || DEFAULT_SECRET;
const ACCESS_TOKEN_EXPIRE: StringValue | number =
  (process.env.JWT_ACCESS_EXPIRE as StringValue | undefined) || '15m';

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
    expiresIn: ACCESS_TOKEN_EXPIRE,
  });
}

/**
 * Verify and decode a JWT access token.
 */
export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, ACCESS_TOKEN_SECRET) as AccessTokenPayload;
}

