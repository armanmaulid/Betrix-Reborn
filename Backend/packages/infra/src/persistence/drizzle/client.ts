import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema.js';

const { Pool } = pg;

export function createPgPool(connectionString: string, maxPoolSize: number = 20): pg.Pool {
  const url = new URL(connectionString);
  const hostname = url.hostname.toLowerCase();
  const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === 'postgres';

  return new Pool({
    connectionString,
    max: maxPoolSize,
    ssl: isLocal ? false : { rejectUnauthorized: false }
  });
}

export function createDrizzleClient(pool: pg.Pool) {
  return drizzle(pool, { schema });
}

export type DrizzleDb = ReturnType<typeof createDrizzleClient>;
