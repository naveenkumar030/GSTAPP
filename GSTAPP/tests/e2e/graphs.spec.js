import { test, expect } from '@playwright/test';

test.describe('Graph Pages smoke test', () => {
  test.beforeEach(async ({ page }) => {
    // Intercept login to bypass auth
    await page.route('**/api/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ token: 'mock-jwt-token', name: 'Test User', email: 'test@example.com' })
      });
    });

    // Login first to get into the app
    await page.goto('/login');
    await page.locator('input[id="login-email"]').fill('valid@example.com');
    await page.locator('input[id="login-password"]').fill('CorrectPassword123');
    await page.locator('button[type="submit"]').click({ force: true });
    await page.waitForURL(/.*\/dashboard/, { timeout: 15000 });
    await page.waitForLoadState('networkidle');
  });

  test('should render Network Graph page and canvas', async ({ page }) => {
    // Mock the network graph data API
    await page.route('**/api/graph/data?type=network*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          nodes: [{ id: 'GSTIN1', label: 'Company' }, { id: 'GSTIN2', label: 'Company' }],
          links: [{ source: 'GSTIN1', target: 'GSTIN2', type: 'CONNECTED_TO' }]
        })
      });
    });

    await page.goto('/dashboard/network-graph');
    
    // Ensure page title/header is visible
    await expect(page.locator('h2:has-text("Network Graph")')).toBeVisible();

    // Verify if a canvas is rendered (react-force-graph-2d uses canvas)
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();
  });

  test('should render Fraud Graph page and canvas', async ({ page }) => {
    // Mock the fraud graph data API
    await page.route('**/api/graph/data?type=fraud*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          nodes: [
            { id: 'Fraud1', label: 'HighRisk', riskScore: 90 },
            { id: 'Inv1', label: 'Invoice' }
          ],
          links: [
            { source: 'Fraud1', target: 'Inv1', type: 'ISSUED' }
          ]
        })
      });
    });

    await page.goto('/dashboard/fraud-graph');
    
    // Ensure page title/header is visible
    await expect(page.locator('text=Fraud Investigation Graph')).toBeVisible();

    // Verify if a canvas is rendered
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();
  });
});
