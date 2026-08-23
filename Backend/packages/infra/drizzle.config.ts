import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/persistence/drizzle/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://betrix:betrixpass@localhost:5432/betrix'
  }
});
