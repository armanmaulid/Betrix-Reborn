import { test, expect } from '@playwright/test';
import { ADMIN_COOKIE } from './helpers/mock-auth';

test.describe('E2E User Management System', () => {
  test.beforeEach(async ({ context, page }) => {
    await context.addCookies([
      ADMIN_COOKIE
    ]);

    await page.route('**/api/admin/users*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              id: 'usr-001',
              email: 'trader1@betrix.ai',
              name: 'Alpha Trader',
              isAdmin: false,
              status: 'active',
              credits: 50000,
              tier: 'starter',
              emailVerified: true,
              createdAt: '2026-08-01T00:00:00Z',
              updatedAt: '2026-08-20T00:00:00Z'
            }
          ],
          meta: {
            page: 1,
            limit: 25,
            total: 1,
            totalPages: 1
          }
        })
      });
    });
  });

  test('should render users catalog table and open update modal', async ({ page }) => {
    await page.goto('/users');

    await expect(page.getByText('REGISTERED TRADERS & SYSTEM ACCOUNTS')).toBeVisible();
    await expect(page.getByText('trader1@betrix.ai')).toBeVisible();
    await expect(page.getByText('Alpha Trader')).toBeVisible();

    // Click edit button on first user
    await page.locator('button[title="Edit User Profile & Tier"]').first().click();

    await expect(page.locator('text=MODIFY USER ACCOUNT')).toBeVisible();
    await expect(page.locator('input[placeholder="e.g. John Doe"]')).toHaveValue('Alpha Trader');
  });
});
