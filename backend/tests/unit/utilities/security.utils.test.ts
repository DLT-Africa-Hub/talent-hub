import { randomBytes } from 'crypto';
import {
  BCRYPT_HASH_REGEX,
  generateSecureToken,
  hashToken,
  isBcryptHash,
  timingSafeEqualHex,
} from '../../../utils/security.utils';

describe('security.utils', () => {
  it('generates secure tokens with expected length', () => {
    const token = generateSecureToken(32);
    expect(token).toHaveLength(64);
    expect(token).toMatch(/^[a-f0-9]+$/i);
  });

  it('hashToken produces deterministic SHA-256 hashes', () => {
    const sample = 'example-token';
    const firstHash = hashToken(sample);
    const secondHash = hashToken(sample);
    expect(firstHash).toBe(secondHash);
    expect(firstHash).toHaveLength(64);
  });

  it('isBcryptHash validates hashed passwords', () => {
    const fakeHash = '$2a$10$01234567890123456789012345678901234567890123456789012';
    expect(isBcryptHash(fakeHash)).toBe(true);
    expect(BCRYPT_HASH_REGEX.test(fakeHash)).toBe(true);
    expect(isBcryptHash('plain-password')).toBe(false);
  });

  it('timingSafeEqualHex performs constant-time comparisons', () => {
    const bufferA = randomBytes(64).toString('hex');
    const bufferB = bufferA;
    const bufferC = randomBytes(64).toString('hex');

    expect(timingSafeEqualHex(bufferA, bufferB)).toBe(true);
    expect(timingSafeEqualHex(bufferA, bufferC)).toBe(false);
  });
});



