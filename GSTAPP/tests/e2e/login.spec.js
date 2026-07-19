import { test, expect } from '@playwright/test';

test.describe('Login flow', () => {
  test('should show error on invalid login', async ({ page }) => {
    // Intercept login API to mock failure
    await page.route('**/api/auth/login', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Incorrect email or password' })
      });
    });

    await page.goto('/login');
    
    await page.locator('input[id="login-email"]').fill('invalid@example.com');
    await page.locator('input[id="login-password"]').fill('wrongpassword');
    await page.locator('button[type="submit"]').click({ force: true });
    
    // Check if an error message appears.
    const errorMsg = page.locator('text=/Incorrect email or password/i');
    await expect(errorMsg).toBeVisible();
  });

  test('should redirect to dashboard on valid login', async ({ page }) => {
    // Intercept login API to mock success
    await page.route('**/api/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ token: 'mock-jwt-token', name: 'Test User', email: 'test@example.com' })
      });
    });

    await page.goto('/login');
    
    await page.locator('input[id="login-email"]').fill('valid@example.com');
    await page.locator('input[id="login-password"]').fill('CorrectPassword123');
    await page.locator('button[type="submit"]').click({ force: true });
    
    // Check if it redirects to dashboard. Wait for URL to change.
    await expect(page).toHaveURL(/.*\/dashboard/, { timeout: 15000 });
  });
});
