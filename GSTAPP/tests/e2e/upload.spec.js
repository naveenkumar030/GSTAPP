import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

test.describe('File Upload flow', () => {
  test('should upload GSTR-2B file and mock reconciliation results', async ({ page }) => {
    // Intercept login to bypass auth
    await page.route('**/api/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ token: 'mock-jwt-token', name: 'Test User', email: 'test@example.com' })
      });
    });

    // Intercept upload API
    await page.route('**/api/reconciliation/upload', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          uploads: [
            {
              type: "gstr2b",
              filename: "dummy_gstr2b.json",
              records: 1,
              size: 100,
              status: "success",
              s3_url: "mock-url"
            }
          ]
        })
      });
    });
    
    // Intercept run engine API
    await page.route('**/api/reconciliation/run', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: "Mock reconciliation complete" })
      });
    });

    // Login first
    await page.goto('/login');
    await page.locator('input[type="email"]').fill('valid@example.com');
    await page.locator('input[type="password"]').fill('CorrectPassword123');
    await page.locator('button[type="submit"]').click({ force: true });
    await expect(page).toHaveURL(/.*\/dashboard/, { timeout: 15000 });

    // Go to upload page
    await page.goto('/dashboard/upload');
    await expect(page.locator('h1:has-text("Data Upload")')).toBeVisible();

    // Create a dummy file
    const randomSuffix = Math.random().toString(36).substring(7);
    const dummyFilePath = path.join(process.cwd(), `dummy_gstr2b_${randomSuffix}.json`);
    fs.writeFileSync(dummyFilePath, JSON.stringify([{ gstin: "29ABCDE1234F1Z5", invoice_no: "INV-001" }]));

    // Upload GSTR-2B file
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(dummyFilePath);

    // Wait for upload success UI
    // Check if the file is shown as uploaded
    await expect(page.locator(`text=${path.basename(dummyFilePath)}`)).toBeVisible({ timeout: 15000 });

    // Click Verify Compliance
    await page.click('button:has-text("Verify Compliance")', { force: true });

    // Wait for the success/redirect
    await expect(page.locator('text=Reconciliation successful')).toBeVisible({ timeout: 15000 });

    // Cleanup
    fs.unlinkSync(dummyFilePath);
  });
});
