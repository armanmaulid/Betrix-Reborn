import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sql } from 'drizzle-orm';
import { createPgPool, createDrizzleClient } from './client.js';
import * as schema from './schema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../../../../.env'), quiet: true });
dotenv.config({ quiet: true });

/**
 * D1 Phase 1 — Better Auth backfill.
 *
 * Copies every `identity.users.password_hash` into a corresponding
 * `auth.account` row so Better Auth can authenticate existing users after the
 * cutover WITHOUT forcing a mass password reset.
 *
 * The bcrypt hash is preserved verbatim — Better Auth's `password.hash` /
 * `password.verify` override (Phase 2) reuses the same bcryptjs cost 12 so
 * the cost is read from the hash itself, not from config.
 *
 * Idempotent: skips users that already have an `auth.account` row keyed by
 * `accountId = email` (the canonical BA credential key).
 *
 * Run with:
 *   pnpm --filter @betrix/infra db:backfill:d1
 * Or directly:
 *   tsx packages/infra/src/persistence/drizzle/d1-backfill-accounts.ts
 */
export async function runD1Backfill(connectionString?: string): Promise<void> {
  const conn = connectionString || process.env.DATABASE_URL;
  if (!conn) {
    throw new Error('DATABASE_URL is required for the D1 backfill.');
  }
  console.log(`[D1] Connecting to: ${conn.replace(/:[^:@]+@/, ':****@')}`);

  const pool = createPgPool(conn, 1);
  const db = createDrizzleClient(pool);

  console.log('[D1] Phase 1 backfill: identity.users.password_hash -> auth.account.password');

  // The drizzle schema in this package already exposes both `users` (legacy,
  // identity schema) and the BA `account` table. Use raw SQL for the cross-
  // schema INSERT — drizzle's typed query API would force a type-narrow
  // round-trip through two pgSchema namespaces that don't share FK relations.
  const result = await db.execute(sql`
    INSERT INTO auth.account (
      id,
      account_id,
      provider_id,
      user_id,
      password,
      created_at,
      updated_at
    )
    SELECT
      gen_random_uuid(),
      u.email,
      'credential',
      u.id,
      u.password_hash,
      now(),
      now()
    FROM identity.users AS u
    WHERE u.password_hash IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM auth.account AS a
        WHERE a.user_id = u.id
          AND a.provider_id = 'credential'
      )
  `);

  const inserted = (result as unknown as { rowCount?: number }).rowCount ?? 'unknown';
  console.log(`[D1] Backfilled ${inserted} account row(s) into auth.account`);

  // Validation: count parity
  const userCount = (await db.execute(
    sql`SELECT COUNT(*)::int AS n FROM identity.users WHERE password_hash IS NOT NULL`
  )) as unknown as { rows: { n: number }[] };
  const accountCount = (await db.execute(
    sql`SELECT COUNT(*)::int AS n FROM auth.account WHERE provider_id = 'credential'`
  )) as unknown as { rows: { n: number }[] };
  const users = userCount.rows[0]?.n ?? 0;
  const accounts = accountCount.rows[0]?.n ?? 0;
  console.log(`[D1] Validation: ${users} users with password_hash, ${accounts} auth.account rows`);

  if (users !== accounts) {
    console.warn(
      `[D1] ⚠ count mismatch: users=${users} accounts=${accounts}. ` +
        'Investigate before Phase 2 cutover. Common causes: ' +
        '(1) backfill was run twice and the second run hit the NOT EXISTS guard; ' +
        '(2) users table was modified between the SELECT and the count.'
    );
  } else {
    console.log('[D1] ✓ counts match — backfill is consistent.');
  }

  await pool.end();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runD1Backfill().catch((err) => {
    console.error('[D1] Backfill failed:', err);
    process.exit(1);
  });
}
