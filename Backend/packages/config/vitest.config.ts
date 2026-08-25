import { defineConfig } from 'vitest/config';

// Provide the minimum required environment so the config module can load during
// tests. The module fails fast at import time when these are missing (intended
// production safety), so the test harness must supply them. Values are
// test-only and never reach a real database/Redis instance.
export default defineConfig({
  test: {
    env: {
      JWT_SECRET: 'test-secret-minimum-thirty-two-characters-long-0123456789',
      DATABASE_URL: 'postgresql://betrix:betrixpass@localhost:5432/betrix_reborn',
      UPSTASH_REDIS_REST_URL: 'http://localhost:8079',
      UPSTASH_REDIS_REST_TOKEN: 'local_dev_token'
    }
  }
});
