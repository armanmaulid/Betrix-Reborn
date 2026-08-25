import { test, expect } from '@playwright/test';
import { ADMIN_COOKIE } from './helpers/mock-auth';

test.describe('E2E AI Agent Management Hub', () => {
  test.beforeEach(async ({ context, page }) => {
    await context.addCookies([ADMIN_COOKIE]);

    await page.route('**/api/admin/agents', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              id: 'gpt-4o-primary',
              name: 'GPT-4o Master Reasoner',
              modelName: 'gpt-4o',
              baseUrl: null,
              apiKey: null,
              taskType: 'trade_reasoning',
              systemPrompt: 'You are an institutional trading assistant...',
              tier: 'deep',
              creditsPer1kTokens: 2,
              maxTokens: 8192,
              temperature: 0.7,
              supportsThinking: true,
              isDefault: true,
              isActive: true,
              visibility: 'public',
              description: 'Flagship reasoning model for real-time market analysis',
              createdAt: '2026-08-01T00:00:00Z',
              updatedAt: '2026-08-20T00:00:00Z'
            }
          ]
        })
      });
    });
  });

  test('should render agent fleet catalog with default badge', async ({ page }) => {
    await page.goto('/agents');

    await expect(page.getByText('AI AGENT FLEET & MODEL GOVERNANCE')).toBeVisible();
    await expect(page.getByText('GPT-4o Master Reasoner')).toBeVisible();
    await expect(page.getByText('SYSTEM DEFAULT', { exact: true })).toBeVisible();
    await expect(page.getByText('DEEP TIER')).toBeVisible();
    await expect(page.getByText('DEPLOY NEW MODEL')).toBeVisible();
  });
});
