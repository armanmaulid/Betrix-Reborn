import { defineConfig, devices } from '@playwright/test';
import crypto from 'node:crypto';

// Per-run random secret that gates the server-side mock-session bypass in
// lib/server-auth.ts. Because it is regenerated on every run and injected
// only into this run's server subprocess + spec process, a leaked static
// `PLAYWRIGHT=true` env var alone can never grant admin access.
const e2eMockSecret = process.env.E2E_MOCK_SECRET ?? crypto.randomBytes(16).toString('hex');
// Expose to spec files (they execute in the same process as this config).
process.env.E2E_MOCK_SECRET = e2eMockSecret;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 2,
  reporter: 'list',
  use: {
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://127.0.0.1:3001',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ],
  webServer: {
    // NOTE: expects a prior `pnpm build`. CI pipelines must run the build
    // before invoking playwright — `next start` does not build.
    command: 'pnpm start',
    url: 'http://127.0.0.1:3001',
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
    env: {
      // E2E harness flags — lets `verifySession` trust ONLY the exact
      // `mock-<secret>` token generated for this run (see lib/server-auth.ts).
      PLAYWRIGHT: 'true',
      E2E_MOCK_SECRET: e2eMockSecret
    }
  }
});
