import { test, expect } from '@playwright/test';
import { MOCK_ADMIN_TOKEN } from './helpers/mock-auth';

test.describe('E2E Auth Gateway & Route Guard', () => {
  test('should render terminal login interface with Bloomberg styling', async ({ page }) => {
    await page.goto('/login');

    await expect(page.locator('text=BETRIX // TERMINAL AUTH')).toBeVisible();
    await expect(page.locator('text=ADMINISTRATOR LOGIN')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toContainText('ESTABLISH SESSION');
  });

  test('should reject invalid credentials with terminal error banner', async ({ page }) => {
    await page.route('**/api/auth/login', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' }
        })
      });
    });

    await page.goto('/login');
    await page.fill('input[type="email"]', 'wrong@betrix.ai');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    await expect(page.locator('text=AUTH_FAILURE')).toBeVisible({ timeout: 5000 });
  });

  test('should redirect unauthenticated requests from dashboard to login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/.*\/login/);
  });

  test('should log in successfully and redirect to dashboard', async ({ page }) => {
    await page.route('**/api/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'Set-Cookie': `betrix_admin_token=${MOCK_ADMIN_TOKEN}; Path=/; SameSite=Lax`
        },
        body: JSON.stringify({
          success: true,
          data: {
            token: MOCK_ADMIN_TOKEN,
            user: {
              id: 'adm-001',
              email: 'admin@betrix.ai',
              name: 'Root Administrator',
              isAdmin: true,
              status: 'active'
            }
          }
        })
      });
    });

    await page.route('**/api/admin/metrics', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            totalUsers: 1250,
            activeSessions: 84,
            totalChats: 45000,
            totalTokens: 18500000,
            dbPool: { totalCount: 20, idleCount: 15, waitingCount: 0 },
            serverUptimeSeconds: 720000,
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
              newUsersToday: 25,
              newUsersWeekly: 140,
              activeTraders24h: 180
            },
            dailyTokenUsage: [],
            topModels: []
          }
        })
      });
    });

    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@betrix.ai');
    await page.fill('input[type="password"]', 'SuperSecurePassword123!');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/.*\/dashboard/, { timeout: 10000 });
  });
});
