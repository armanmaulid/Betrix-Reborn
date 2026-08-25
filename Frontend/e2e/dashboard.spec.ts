import { test, expect } from '@playwright/test';
import { ADMIN_COOKIE } from './helpers/mock-auth';

test.describe('E2E Live Operations Dashboard', () => {
  test.beforeEach(async ({ context, page }) => {
    await context.addCookies([
      ADMIN_COOKIE
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
            totalTokensUsed: 19500000,
            dbPoolActive: 4,
            dbPoolIdle: 16,
            uptimeSeconds: 864000
          }
        })
      });
    });

    await page.route('**/api/admin/analytics*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            newUsersToday: 42,
            newUsersThisWeek: 290,
            newUsersThisMonth: 1200,
            activeUsers24h: 310,
            activeUsersWeekly: 850,
            activeUsersMonthly: 2100,
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

    await expect(page.getByText('NEW REGISTRATIONS', { exact: true })).toBeVisible();
    await expect(page.getByText('ACTIVE TRADERS', { exact: true })).toBeVisible();
  });
});
