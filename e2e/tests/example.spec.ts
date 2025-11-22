import { test, expect } from '@playwright/test';

/**
 * Example test file - can be used as a template for new tests
 * This file demonstrates basic Playwright patterns
 */

test.describe('Example Test Suite', () => {
  test('should load the home page', async ({ page, context }) => {
    // Clear any existing session/auth state
    await context.clearCookies();
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Wait for page to load
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    // Wait for React to hydrate
    await page.waitForTimeout(1000);

    // Check page title or key element
    const title = page.getByText('Talent Hub', { exact: false }).first();
    await expect(title).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to login page', async ({ page, context }) => {
    // Clear any existing session/auth state
    await context.clearCookies();
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Wait for page to be interactive
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    // Wait for React to hydrate
    await page.waitForTimeout(1000);

    // Click login link/button
    const loginLink = page.getByText('Login', { exact: true }).first();
    await expect(loginLink).toBeVisible({ timeout: 10000 });
    await loginLink.click();

    // Verify navigation
    await expect(page).toHaveURL(/.*login/, { timeout: 10000 });

    // Verify login form is present
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    await expect(emailInput).toBeVisible({ timeout: 10000 });
  });
});

