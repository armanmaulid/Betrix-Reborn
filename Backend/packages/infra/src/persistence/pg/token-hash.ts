import { createHash } from 'node:crypto';

/**
 * Tokens at rest are stored as SHA-256 digests, never plaintext: a database
 * leak must not immediately yield live sessions / verification tokens.
 *
 * Lookup flow hashes the presented raw token and queries by digest, so the
 * raw value only ever exists in memory (and in the issued response/email).
 */
export function hashTokenForStorage(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
