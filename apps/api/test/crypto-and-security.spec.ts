import { CryptoUtil } from '../src/common/crypto/crypto.util';

describe('Crypto & Security Utilities', () => {
  const secretKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

  it('should generate cryptographically secure tokens with >= 128 bits of entropy', () => {
    const token1 = CryptoUtil.generateSecureToken(32);
    const token2 = CryptoUtil.generateSecureToken(32);

    expect(token1).toHaveLength(64); // 32 bytes = 256 bits = 64 hex chars
    expect(token2).toHaveLength(64);
    expect(token1).not.toEqual(token2);
  });

  it('should generate standardized customer recovery codes in CEDOI-XXXX-XXXX-XXXX format', () => {
    const code = CryptoUtil.generateRecoveryCode();
    expect(code).toMatch(/^CEDOI-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/);
  });

  it('should encrypt and decrypt QR tokens at rest using AES-256-GCM', () => {
    const plaintext = 'CEDOI_QR_TICKET_PAYLOAD_CONFIDENTIAL_12345678';
    const encrypted = CryptoUtil.encrypt(plaintext, secretKey);

    expect(encrypted).toContain(':');
    const parts = encrypted.split(':');
    expect(parts).toHaveLength(3); // iv, authTag, ciphertext

    const decrypted = CryptoUtil.decrypt(encrypted, secretKey);
    expect(decrypted).toEqual(plaintext);
  });

  it('should fail decryption if ciphertext or authTag is tampered', () => {
    const plaintext = 'SENSITIVE_TICKET_DATA';
    const encrypted = CryptoUtil.encrypt(plaintext, secretKey);
    const parts = encrypted.split(':');

    // Tamper with ciphertext
    const tamperedCiphertext = parts[2].slice(0, -2) + 'ff';
    const tamperedPayload = `${parts[0]}:${parts[1]}:${tamperedCiphertext}`;

    expect(() => CryptoUtil.decrypt(tamperedPayload, secretKey)).toThrow();
  });

  it('should generate consistent SHA-256 hashes', () => {
    const hash1 = CryptoUtil.sha256('CEDOI-TEST-CODE');
    const hash2 = CryptoUtil.sha256('CEDOI-TEST-CODE');
    const hash3 = CryptoUtil.sha256('DIFFERENT-CODE');

    expect(hash1).toHaveLength(64);
    expect(hash1).toEqual(hash2);
    expect(hash1).not.toEqual(hash3);
  });
});
