import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sql } from 'drizzle-orm';
import { createPgPool, createDrizzleClient } from './client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../../../../.env'), quiet: true });
dotenv.config({ quiet: true });

/**
 * D1 Phase 3 — Cutover: invalidate legacy auth state.
 *
 * At the cutover flip (USE_BETTER_AUTH=true) Better Auth becomes the live
 * auth path and issues its own cookie-based sessions in `auth.session`.
 * The legacy `identity.sessions` rows (and the legacy 7-day JWTs that
 * reference them) are now dead weight and must be cleared so no stale
 * session can be resurrected.
 *
 * Because the legacy `authenticate` guard is bypassed when the flag is on,
 * leaving these rows would only risk confusion during debugging — they are
 * never consulted. We TRUNCATE them here as a clean cut.
 *
 * Also clears `identity.failed_login_attempts` so the progressive-captcha
 * counter starts fresh under the new path.
 *
 * Idempotent / safe: pure data deletion, no schema change.
 *
 * Run with:
 *   pnpm --filter @betrix/infra db:cutover:d1
 * Or directly:
 *   tsx packages/infra/src/persistence/drizzle/d1-cutover-invalidate.ts
 */
export async function runD1CutoverInvalidate(connectionString?: string): Promise<void> {
  const conn = connectionString || process.env.DATABASE_URL;
  if (!conn) {
    throw new Error('DATABASE_URL is required for the D1 cutover invalidation.');
  }
  console.log(`[D1] Connecting to: ${conn.replace(/:[^:@]+@/, ':****@')}`);

  const pool = createPgPool(conn, 1);
  const db = createDrizzleClient(pool);
  try {
    const sessions = await db.execute(sql`TRUNCATE TABLE identity.sessions RESTART IDENTITY CASCADE`);
    console.log('[D1] Truncated identity.sessions');
    const attempts = await db.execute(sql`TRUNCATE TABLE identity.failed_login_attempts RESTART IDENTITY CASCADE`);
    console.log('[D1] Truncated identity.failed_login_attempts');
    void sessions;
    void attempts;
    console.log('[D1] Cutover invalidation complete. Legacy sessions + login-attempt counters cleared.');
  } finally {
    await pool.end();
  }
}

// Allow running directly via tsx.
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  runD1CutoverInvalidate()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[D1] Cutover invalidation failed:', err);
      process.exit(1);
    });
}
