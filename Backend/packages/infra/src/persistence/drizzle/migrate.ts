import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { createPgPool, createDrizzleClient } from './client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load root .env file
dotenv.config({ path: path.resolve(__dirname, '../../../../../.env'), quiet: true });
dotenv.config({ quiet: true });

export async function runMigrations(connectionString?: string) {
  // T0.4: no embedded dev credentials — the URL must come from the caller or
  // the environment, exactly like every other production entrypoint.
  const conn = connectionString || process.env.DATABASE_URL;
  if (!conn) {
    throw new Error(
      'DATABASE_URL is required to run migrations. Export it (or pass connectionString) and retry.'
    );
  }
  console.log(`Connecting to: ${conn.replace(/:[^:@]+@/, ':****@')}`);
  const pool = createPgPool(conn, 1);
  const db = createDrizzleClient(pool);

  console.log('Running database migrations...');
  const migrationsFolder = path.resolve(__dirname, '../../../drizzle');
  await migrate(db, { migrationsFolder });
  console.log('Migrations completed successfully.');

  await pool.end();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runMigrations().catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
}
