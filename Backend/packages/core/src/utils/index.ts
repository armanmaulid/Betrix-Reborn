import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';

export function hashString(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function generateRandomToken(bytes: number = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}
export const generateSecureToken = generateRandomToken;

// Cost 12 is the 2026 baseline for bcrypt (cost 10 ≈ sub-100ms GPU brute force).
// Existing hashes verify transparently — bcrypt reads the cost from the hash.
const BCRYPT_SALT_ROUNDS = 12;

export async function hashPassword(
  plaintext: string,
  saltRounds: number = BCRYPT_SALT_ROUNDS
): Promise<string> {
  return bcrypt.hash(plaintext, saltRounds);
}

export async function comparePassword(plaintext: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plaintext, hash);
}
export const verifyPassword = comparePassword;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function generateDeviceFingerprint(ip: string, userAgent: string): string {
  const normalizedIp = (ip || '').replace(/^::ffff:/, '').trim();
  const normalizedUa = (userAgent || '').trim().toLowerCase();
  return hashString(`${normalizedIp}|${normalizedUa}`);
}

export function safeJsonParse<T>(jsonString: string | null | undefined, fallback: T): T {
  if (!jsonString) return fallback;
  try {
    return JSON.parse(jsonString) as T;
  } catch {
    return fallback;
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
