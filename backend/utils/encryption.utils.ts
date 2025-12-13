import crypto from 'crypto';
import { calendlyConfig } from '../config/secrets';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 16 bytes for AES
const SALT_LENGTH = 64; // 64 bytes for salt
const TAG_LENGTH = 16; // 16 bytes for authentication tag
const KEY_LENGTH = 32; // 32 bytes for AES-256

/**
 * Derives a key from the master encryption key using PBKDF2
 */
function deriveKey(salt: Buffer): Buffer {
  const encryptionKey = calendlyConfig.encryption.key;
  if (!encryptionKey) {
    throw new Error(
      'Calendly encryption key is not configured. Please set CALENDLY_ENCRYPTION_KEY environment variable.'
    );
  }
  return crypto.pbkdf2Sync(
    encryptionKey,
    salt,
    100000, // iterations
    KEY_LENGTH,
    'sha512'
  );
}

/**
 * Encrypts a string value (e.g., OAuth token)
 * Returns a hex-encoded string containing: salt + iv + encrypted data + auth tag
 */
export function encrypt(value: string): string {
  if (!value) {
    throw new Error('Cannot encrypt empty value');
  }

  const salt = crypto.randomBytes(SALT_LENGTH);
  const key = deriveKey(salt);
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(value, 'utf8');
  encrypted = Buffer.concat([encrypted, cipher.final()]);

  const tag = cipher.getAuthTag();

  // Combine: salt + iv + encrypted + tag
  const combined = Buffer.concat([salt, iv, encrypted, tag]);

  return combined.toString('hex');
}

/**
 * Decrypts a hex-encoded encrypted string
 * Expects format: salt + iv + encrypted data + auth tag
 */
export function decrypt(encryptedHex: string): string {
  if (!encryptedHex) {
    throw new Error('Cannot decrypt empty value');
  }

  try {
    const combined = Buffer.from(encryptedHex, 'hex');

    // Extract components
    const salt = combined.subarray(0, SALT_LENGTH);
    const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const encrypted = combined.subarray(
      SALT_LENGTH + IV_LENGTH,
      combined.length - TAG_LENGTH
    );
    const tag = combined.subarray(combined.length - TAG_LENGTH);

    const key = deriveKey(salt);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString('utf8');
  } catch (error) {
    throw new Error(
      `Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
