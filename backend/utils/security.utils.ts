import crypto from 'crypto';

export function generateSecureToken(byteSize = 64): string {
  return crypto.randomBytes(byteSize).toString('hex');
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function calculateExpiryDate(ttlMs: number): Date {
  return new Date(Date.now() + ttlMs);
}


