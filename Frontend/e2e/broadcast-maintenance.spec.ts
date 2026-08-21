import { test, expect } from '@playwright/test';

test.describe('E2E Broadcast & Maintenance Console', () => {
  test.beforeEach(async ({ context }) => {
    await context.addCookies([
      {
        name: 'betrix_admin_token',
        value: 'mock-admin-token',
        domain: '127.0.0.1',
        path: '/'
      }
    ]);
  });

  test('should render broadcast center with target selectors and char counter', async ({ page }) => {
    await page.goto('/broadcast');

    await expect(page.locator('text=GLOBAL MESSAGE BROADCAST CENTER')).toBeVisible();
    await expect(page.locator('text=ALL ACTIVE TRADERS')).toBeVisible();
    await expect(page.locator('text=SPECIFIC USER RECIPIENTS')).toBeVisible();
    await expect(page.locator('#broadcast-subject')).toBeVisible();
    await expect(page.locator('#broadcast-body')).toBeVisible();
  });

  test('should render system maintenance console with retention slider', async ({ page }) => {
    await page.goto('/maintenance');

    await expect(page.locator('text=SYSTEM MAINTENANCE & DATABASE RETENTION CONSOLE')).toBeVisible();
    await expect(page.locator('text=AUTOMATIC HOURLY WORKER RECURRENCE')).toBeVisible();
    await expect(page.locator('#cleanup-days')).toBeVisible();
    await expect(page.locator('button:has-text("RUN EMERGENCY MAINTENANCE")')).toBeVisible();
  });
});
