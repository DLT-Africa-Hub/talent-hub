import crypto from 'crypto';

export const BCRYPT_HASH_REGEX = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;

export function generateSecureToken(byteSize = 64): string {
  return crypto.randomBytes(byteSize).toString('hex');
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function calculateExpiryDate(ttlMs: number): Date {
  return new Date(Date.now() + ttlMs);
}

export function isBcryptHash(value: string): boolean {
  return BCRYPT_HASH_REGEX.test(value);
}

export function timingSafeEqualHex(hashA: string, hashB: string): boolean {
  if (hashA.length !== hashB.length) {
    return false;
  }

  const bufferA = Buffer.from(hashA, 'hex');
  const bufferB = Buffer.from(hashB, 'hex');

  if (bufferA.length !== bufferB.length) {
    return false;
  }

  return crypto.timingSafeEqual(bufferA, bufferB);
}

