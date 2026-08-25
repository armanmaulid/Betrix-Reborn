import { test, expect } from '@playwright/test';
import { ADMIN_COOKIE } from './helpers/mock-auth';

test.describe('E2E Credit Voucher System', () => {
  test.beforeEach(async ({ context, page }) => {
    await context.addCookies([ADMIN_COOKIE]);

    await page.route('**/api/admin/vouchers*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              id: 'vch-001',
              code: 'BTX-SUMMER26',
              amount: 25000,
              isRedeemed: false,
              redeemedById: null,
              redeemedAt: null,
              expiresAt: null,
              createdAt: '2026-08-15T00:00:00Z'
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

  test('should render voucher inventory and open generation dialog', async ({ page }) => {
    await page.goto('/vouchers');

    await expect(page.locator('text=PROMOTIONAL CREDIT VOUCHERS')).toBeVisible();
    await expect(page.locator('text=BTX-SUMMER26')).toBeVisible();
    await expect(page.locator('text=25,000 CREDITS')).toBeVisible();
    await expect(page.getByText('AVAILABLE', { exact: true })).toBeVisible();

    // Open generate modal
    await page.click('button:has-text("GENERATE VOUCHER")');
    await expect(page.locator('text=GENERATE NEW CREDIT VOUCHER')).toBeVisible();
    await expect(page.locator('#voucher-amount')).toBeVisible();
  });
});
