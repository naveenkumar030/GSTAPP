import { test, expect } from '@playwright/test';

test.describe('Registration flow', () => {
  test('should successfully complete the registration flow', async ({ page }) => {
    // Intercept API calls to avoid hitting the backend and sending emails
    await page.route('**/api/auth/register', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'OTP sent successfully. Please check your email and enter the 6-digit code.' })
      });
    });

    await page.route('**/api/auth/verify-otp', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Account verified successfully' })
      });
    });

    await page.goto('/register');

    // Step 1: Account Info
    await page.fill('input[id="reg-name"]', 'Test User'); // Full Name
    await page.fill('input[id="reg-email"]', 'testuser@example.com');
    await page.fill('input[id="reg-pw"]', 'TestPassword123!');
    await page.fill('input[id="reg-cpw"]', 'TestPassword123!');
    
    // Check terms
    await page.check('input[type="checkbox"]', { force: true });

    // Click Next (Send OTP)
    await page.getByRole('button', { name: /Continue/i }).click({ force: true });

    // Wait for the OTP step
    await expect(page.getByText('Check your email')).toBeVisible();

    // Step 2: OTP Verification
    // Fill the 6 OTP input boxes
    const otpInputs = page.locator('input[type="text"]').filter({ hasClass: /text-center/ });
    await expect(otpInputs).toHaveCount(6, { timeout: 15000 });
    
    for (let i = 0; i < 6; i++) {
      await otpInputs.nth(i).fill('1');
    }

    // Click Verify
    await page.getByRole('button', { name: /Verify Code/i }).click({ force: true });

    // Wait for Organization step
    await expect(page.locator('input[id="reg-org"]')).toBeVisible();

    // Step 3: Organization Info
    await page.fill('input[id="reg-org"]', 'Test Org');
    await page.selectOption('select[id="reg-role"]', { label: 'Other' });
    await page.fill('input[id="reg-gstin"]', '29ABCDE1234F1Z5');

    // Finish
    await page.click('button:has-text("Launch My Workspace")', { force: true });

    // Wait for navigation to login (handled by handleFinish)
    await expect(page).toHaveURL(/.*\/login/, { timeout: 15000 });
  });
});
