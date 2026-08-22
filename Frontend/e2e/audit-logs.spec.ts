import { test, expect } from '@playwright/test';

test.describe('E2E Security & Activity Audit Trail', () => {
  test.beforeEach(async ({ context, page }) => {
    await context.addCookies([
      {
        name: 'betrix_admin_token',
        value: 'mock-admin-token',
        domain: '127.0.0.1',
        path: '/'
      }
    ]);

    await page.route('**/api/admin/audit-logs*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              id: 'aud-001',
              userId: 'adm-001',
              action: 'UPDATE_USER',
              resource: 'user',
              resourceId: 'usr-001',
              ipAddress: '192.168.1.1',
              userAgent: 'Mozilla/5.0 Chrome/151.0',
              details: { changed: 'status' },
              createdAt: '2026-08-21T08:00:00Z'
            }
          ],
          meta: {
            page: 1,
            limit: 50,
            total: 1,
            totalPages: 1
          }
        })
      });
    });
  });

  test('should render audit logs table and open JSON tree viewer', async ({ page }) => {
    await page.goto('/audit-logs');

    await expect(page.getByText('SECURITY AUDIT LOGS & TRACEABILITY')).toBeVisible();
    await expect(page.getByRole('table').getByText('UPDATE_USER')).toBeVisible();
    await expect(page.getByText('192.168.1.1', { exact: true })).toBeVisible();
    await expect(page.locator('button:has-text("EXPORT CSV")')).toBeVisible();
    await expect(page.locator('button:has-text("EXPORT JSON")')).toBeVisible();

    // Click inspect details
    await page.click('button:has-text("INSPECT")');
    await expect(page.locator('text=AUDIT METADATA INSPECTOR')).toBeVisible();
    await expect(page.locator('text=COPY RAW JSON')).toBeVisible();
  });
});
