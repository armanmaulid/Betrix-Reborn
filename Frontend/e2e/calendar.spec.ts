import { test, expect } from '@playwright/test';
import { ADMIN_COOKIE } from './helpers/mock-auth';

test.describe('E2E Economic Calendar', () => {
  test.beforeEach(async ({ context, page }) => {
    await context.addCookies([ADMIN_COOKIE]);

    await page.route('**/api/calendar*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              id: 'usd_non_farm_payrolls_2026-09-01',
              currency: 'USD',
              eventCode: 'non_farm_payrolls',
              eventName: 'Non-Farm Payrolls',
              referencePeriodDate: '2026-09-01',
              announcementUnix: 1893456000,
              announcementDatetimeUtc: '2030-01-04T13:30:00.000Z',
              announcementDatetimeLocal: '2030-01-04T08:30:00.000Z',
              importance: 'high',
              marketTier: 1,
              isTopTier: true,
              sourceName: 'BLS',
              sourceUrl: 'https://example.com',
              beforeValue: 187000,
              forecastValue: 175000,
              forecastType: 'market_consensus',
              actualValue: 192000,
              hasOfficialForecast: true,
              createdAt: '2026-08-25T00:00:00Z',
              updatedAt: '2026-08-25T00:00:00Z'
            }
          ]
        })
      });
    });
  });

  test('should render economic calendar table with Before/Forecast/Actual columns', async ({
    page
  }) => {
    await page.goto('/calendar');

    await expect(page.locator('h1:has-text("ECONOMIC CALENDAR")')).toBeVisible();
    await expect(page.locator('button:has-text("THIS WEEK")')).toBeVisible();
    await expect(page.locator('button:has-text("YESTERDAY")')).toBeVisible();
    await expect(page.locator('button:has-text("NEXT MONTH")')).toBeVisible();
    await expect(page.locator('th:has-text("IMPORTANCE")')).toBeVisible();
    await expect(page.locator('th:has-text("COUNTRY")')).toBeVisible();
    await expect(page.locator('th:has-text("ACTUAL")')).toBeVisible();
    await expect(page.locator('th:has-text("PREVIOUS")')).toBeVisible();
    await expect(page.locator('th:has-text("FORECAST")')).toBeVisible();
    await expect(page.locator('text=Non-Farm Payrolls')).toBeVisible();
  });

  test('should expose ECONOMIC CALENDAR in the navigation directory above BROADCAST', async ({
    page
  }) => {
    await page.goto('/calendar');

    const sidebar = page.locator('aside');
    await expect(sidebar.locator('text=ECONOMIC CALENDAR')).toBeVisible();
    await expect(sidebar.locator('text=BROADCAST MSG')).toBeVisible();

    const calendarNum = await sidebar.locator('a[href="/calendar"] >> text=[09]').count();
    const broadcastNum = await sidebar.locator('a[href="/broadcast"] >> text=[10]').count();
    expect(calendarNum).toBeGreaterThan(0);
    expect(broadcastNum).toBeGreaterThan(0);
  });
});
