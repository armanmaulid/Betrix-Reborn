import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { setTimeout } from 'node:timers/promises';

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
  return setTimeout(ms);
}

// A2 — single source of truth for UUID validation. Used by use-cases that
// branch on "is this string a valid UUID" before joining keys; the same regex
// is also registered with the TypeBox `FormatRegistry` so `Type.String({format:'uuid'})`
// validates at the schema boundary in the future.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isUuid(value: unknown): boolean {
  return typeof value === 'string' && UUID_RE.test(value);
}

/**
 * A4 — RFC 4180 CSV field escape. Wraps a value in double-quotes if it
 * contains a comma, double-quote, CR, or LF; doubles internal double-quotes.
 * `null`/`undefined` become an empty field. Numbers/booleans are stringified.
 */
export function escapeCsvField(value: unknown): string {
  if (value === null || value === undefined) return '';
  const s = typeof value === 'string' ? value : String(value);
  if (s === '') return '';
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** A4 — serialize a row of fields to a single CSV line. */
export function toCsvRow(fields: readonly unknown[]): string {
  return fields.map(escapeCsvField).join(',');
}
