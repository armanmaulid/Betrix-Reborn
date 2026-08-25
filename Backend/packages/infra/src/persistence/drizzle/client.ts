import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { readFileSync } from 'node:fs';
import * as schema from './schema.js';

const { Pool } = pg;

/**
 * Resolve the TLS policy for the PostgreSQL connection.
 *
 * Security default: remote connections VERIFY the server certificate. A CA
 * can be provided via `PGSSL_ROOT_CERT` (PEM) or `PGSSL_ROOT_CERT_PATH`.
 * Set `PGSSL_REJECT_UNAUTHORIZED=false` ONLY for local/docker topologies
 * where the hostname allowlist below does not apply — never in production.
 */
function resolveSsl(
  connectionString: string
): false | pg.ConnectionConfig['ssl'] {
  const url = new URL(connectionString);
  const hostname = url.hostname.toLowerCase();

  // Local/container topologies run without TLS.
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname === 'postgres'
  ) {
    return false;
  }

  // Explicit sslmode in the URL wins (pg-compatible semantics).
  const sslmode = url.searchParams.get('sslmode');
  if (sslmode === 'disable') return false;

  const rejectUnauthorized = process.env.PGSSL_REJECT_UNAUTHORIZED !== 'false';
  const ca =
    process.env.PGSSL_ROOT_CERT ||
    (process.env.PGSSL_ROOT_CERT_PATH
      ? readFileSync(process.env.PGSSL_ROOT_CERT_PATH, 'utf8')
      : undefined);

  return { rejectUnauthorized, ...(ca ? { ca } : {}) };
}

export function createPgPool(connectionString: string, maxPoolSize: number = 20): pg.Pool {
  return new Pool({
    connectionString,
    max: maxPoolSize,
    ssl: resolveSsl(connectionString)
  });
}

export function createDrizzleClient(pool: pg.Pool) {
  return drizzle(pool, { schema });
}

export type DrizzleDb = ReturnType<typeof createDrizzleClient>;
