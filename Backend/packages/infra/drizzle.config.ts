import { defineConfig } from 'drizzle-kit';

// CLI operations (generate/migrate/check) REQUIRE DATABASE_URL in the shell
// environment — no embedded credentials, no silent dev fallback. The database
// name comes entirely from the URL so every environment stays explicit.
export default defineConfig({
  schema: './src/persistence/drizzle/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? ''
  }
});
