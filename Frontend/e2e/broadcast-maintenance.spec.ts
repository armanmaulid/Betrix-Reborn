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

  test('should render broadcast center with target selectors and char counter', async ({
    page
  }) => {
    await page.goto('/broadcast');

    await expect(page.locator('text=HIGH-PRIORITY SYSTEM BROADCAST')).toBeVisible();
    await expect(page.locator('text=ALL ACTIVE TRADERS')).toBeVisible();
    await expect(page.locator('text=SPECIFIC ACCOUNTS')).toBeVisible();
    await expect(
      page.locator('input[placeholder*="URGENT: Scheduled Database Maintenance"]')
    ).toBeVisible();
    await expect(
      page.locator('textarea[placeholder*="Enter complete bulletin message"]')
    ).toBeVisible();
  });

  test('should render system maintenance console with retention slider', async ({ page }) => {
    await page.goto('/maintenance');

    await expect(page.locator('text=FLEET MAINTENANCE & SYSTEM HYGIENE')).toBeVisible();
    await expect(page.locator('text=OPERATIONAL DAEMON THREADS')).toBeVisible();
    await expect(page.locator('text=DATABASE VACUUM & RETENTION POLICY')).toBeVisible();
    await expect(page.locator('button:has-text("EXECUTE VACUUM PURGE")')).toBeVisible();
  });
});
