import * as crypto from 'crypto';

export class CryptoUtil {
  /**
   * Generates a cryptographically secure random token (>= 128 bits entropy).
   * By default generates 32 bytes (256 bits of entropy) in hex.
   */
  static generateSecureToken(bytes: number = 32): string {
    return crypto.randomBytes(bytes).toString('hex');
  }

  /**
   * Computes SHA-256 hash of a string (returned in hex format).
   */
  static sha256(value: string): string {
    return crypto.createHash('sha256').update(value).digest('hex');
  }

  /**
   * Generates a customer-friendly random recovery code:
   * Format: CEDOI-XXXX-XXXX-XXXX (12 uppercase alphanumeric characters)
   */
  static generateRecoveryCode(): string {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // base32 without ambiguous 0/O/1/I
    let code = '';
    const bytes = crypto.randomBytes(12);
    for (let i = 0; i < 12; i++) {
      code += chars[bytes[i] % chars.length];
    }
    return `CEDOI-${code.slice(0, 4)}-${code.slice(4, 8)}-${code.slice(8, 12)}`;
  }

  /**
   * Encrypts plaintext using AES-256-GCM.
   * Returns: iv:authTag:ciphertext in hex.
   */
  static encrypt(text: string, secretKeyHex: string): string {
    const key = Buffer.from(secretKeyHex, 'hex');
    const iv = crypto.randomBytes(12); // 96-bit IV standard for GCM
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  }

  /**
   * Decrypts ciphertext encrypted with encrypt() using AES-256-GCM.
   */
  static decrypt(encryptedPayload: string, secretKeyHex: string): string {
    const [ivHex, authTagHex, encrypted] = encryptedPayload.split(':');
    if (!ivHex || !authTagHex || !encrypted) {
      throw new Error('Invalid encrypted payload format');
    }
    const key = Buffer.from(secretKeyHex, 'hex');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  /**
   * Generates a readable ticket number:
   * Format: TKT-YYYYMMDD-XXXXXX
   */
  static generateTicketNumber(): string {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomHex = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `TKT-${dateStr}-${randomHex}`;
  }

  /**
   * Generates a readable booking number:
   * Format: BK-YYYYMMDD-XXXXXX
   */
  static generateBookingNumber(): string {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomHex = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `BK-${dateStr}-${randomHex}`;
  }

  /**
   * Constant-time string comparison to prevent timing attacks.
   */
  static secureCompare(a: string, b: string): boolean {
    const bufA = Buffer.from(a, 'utf8');
    const bufB = Buffer.from(b, 'utf8');
    if (bufA.length !== bufB.length) {
      return false;
    }
    return crypto.timingSafeEqual(bufA, bufB);
  }
}

