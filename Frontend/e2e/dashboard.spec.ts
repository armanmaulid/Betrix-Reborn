import { test, expect } from '@playwright/test';

test.describe('E2E Live Operations Dashboard', () => {
  test.beforeEach(async ({ context, page }) => {
    await context.addCookies([
      {
        name: 'betrix_admin_token',
        value: 'mock-admin-token',
        domain: '127.0.0.1',
        path: '/'
      }
    ]);

    await page.route('**/api/admin/metrics', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            totalUsers: 1420,
            activeSessions: 95,
            totalChats: 48200,
            totalTokens: 19500000,
            dbPool: { totalCount: 20, idleCount: 16, waitingCount: 0 },
            serverUptimeSeconds: 864000,
            systemHealth: { status: 'healthy', timestamp: new Date().toISOString() }
          }
        })
      });
    });

    await page.route('**/api/admin/analytics/history', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            userAcquisition: {
              newUsersToday: 42,
              newUsersWeekly: 290,
              activeTraders24h: 310
            },
            dailyTokenUsage: [
              { date: '2026-08-15', totalTokens: 1200000, costEstimateUsd: 12 },
              { date: '2026-08-16', totalTokens: 1500000, costEstimateUsd: 15 }
            ],
            topModels: [
              { modelName: 'gpt-4o', usageCount: 25000, totalTokens: 12000000 },
              { modelName: 'claude-3-7-sonnet', usageCount: 18000, totalTokens: 6000000 }
            ]
          }
        })
      });
    });
  });

  test('should render 6-gauge live operational metrics and charts', async ({ page }) => {
    await page.goto('/dashboard');

    await expect(page.getByText('TOTAL USERS', { exact: true })).toBeVisible();
    await expect(page.getByText('ACTIVE SESSIONS', { exact: true })).toBeVisible();
    await expect(page.getByText('TOTAL CHATS', { exact: true })).toBeVisible();
    await expect(page.getByText('TOKENS PROCESSED', { exact: true })).toBeVisible();
    await expect(page.getByText('DB POOL STATUS', { exact: true })).toBeVisible();
    await expect(page.getByText('SYSTEM UPTIME', { exact: true })).toBeVisible();

    await expect(page.getByText('NEW REGISTRATIONS TODAY', { exact: true })).toBeVisible();
    await expect(page.getByText('NEW USERS THIS WEEK', { exact: true })).toBeVisible();
    await expect(page.getByText('ACTIVE TRADERS (24H)', { exact: true })).toBeVisible();
  });
});
