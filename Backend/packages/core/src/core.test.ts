import { describe, it, expect } from 'vitest';
import {
  ValidationError,
  AuthenticationError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  PreconditionRequiredError,
  RateLimitError,
  isAppError
} from './errors/index.js';
import {
  hashString,
  generateRandomToken,
  hashPassword,
  comparePassword,
  normalizeEmail,
  generateDeviceFingerprint,
  safeJsonParse
} from './utils/index.js';
import { ok, fail } from './types/index.js';

describe('Core Error Hierarchy', () => {
  it('should instantiate typed errors with correct status codes', () => {
    const valErr = new ValidationError('Invalid email', { field: 'email' });
    expect(valErr.statusCode).toBe(400);
    expect(valErr.code).toBe('VALIDATION_ERROR');
    expect(valErr.details).toEqual({ field: 'email' });

    const authErr = new AuthenticationError();
    expect(authErr.statusCode).toBe(401);

    const forbErr = new ForbiddenError();
    expect(forbErr.statusCode).toBe(403);

    const notFound = new NotFoundError();
    expect(notFound.statusCode).toBe(404);

    const conflict = new ConflictError();
    expect(conflict.statusCode).toBe(409);

    const captchaErr = new PreconditionRequiredError('Math challenge required', {
      challenge: '5 + 3'
    });
    expect(captchaErr.statusCode).toBe(428);
    expect(captchaErr.code).toBe('CAPTCHA_REQUIRED');

    const rateLimit = new RateLimitError();
    expect(rateLimit.statusCode).toBe(429);

    expect(isAppError(valErr)).toBe(true);
    expect(isAppError(new Error('native'))).toBe(false);
  });
});

describe('Core Cryptographic & Utility Functions', () => {
  it('should generate valid SHA-256 hashes and tokens', () => {
    const hash = hashString('test');
    expect(hash).toHaveLength(64);

    const token = generateRandomToken(16);
    expect(token).toHaveLength(32);
  });

  it('should hash and compare passwords correctly', async () => {
    const plain = 'SecretPassword123!';
    const hashed = await hashPassword(plain);
    expect(hashed).not.toBe(plain);

    const match = await comparePassword(plain, hashed);
    expect(match).toBe(true);

    const wrongMatch = await comparePassword('WrongPassword', hashed);
    expect(wrongMatch).toBe(false);
  });

  it('should normalize emails and generate stable device fingerprints', () => {
    expect(normalizeEmail('  User@Example.COM  ')).toBe('user@example.com');

    const fp1 = generateDeviceFingerprint('192.168.1.1', 'Mozilla/5.0 Chrome/120.0');
    const fp2 = generateDeviceFingerprint('192.168.1.1', 'Mozilla/5.0 Chrome/120.0');
    const fp3 = generateDeviceFingerprint('192.168.1.2', 'Mozilla/5.0 Chrome/120.0');

    expect(fp1).toBe(fp2);
    expect(fp1).not.toBe(fp3);
  });

  it('should safely parse JSON with fallback', () => {
    expect(safeJsonParse('{"a":1}', { a: 0 })).toEqual({ a: 1 });
    expect(safeJsonParse('invalid-json', { fallback: true })).toEqual({ fallback: true });
    expect(safeJsonParse(null, 'default')).toBe('default');
  });

  it('should wrap Result monad correctly', () => {
    const successResult = ok(42);
    expect(successResult.success).toBe(true);
    if (successResult.success) {
      expect(successResult.data).toBe(42);
    }

    const failResult = fail(new Error('failed'));
    expect(failResult.success).toBe(false);
    if (!failResult.success) {
      expect(failResult.error.message).toBe('failed');
    }
  });
});
