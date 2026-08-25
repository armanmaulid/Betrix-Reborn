import { defineConfig, devices } from '@playwright/test';

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
    command: 'pnpm start',
    url: 'http://127.0.0.1:3001',
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
    env: {
      // E2E harness flag — lets `verifySession` trust the `mock-admin-token`
      // cookie without round-tripping to the real backend (see lib/server-auth.ts).
      PLAYWRIGHT: 'true'
    }
  }
});
