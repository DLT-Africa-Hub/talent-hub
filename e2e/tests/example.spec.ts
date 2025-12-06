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

    // Check for key elements on the home page
    // The page has "Talent Match" in navbar or "Connect Talent With Opportunity" in hero
    const title1 = page.getByText('Talent Match', { exact: false }).first();
    const title2 = page.getByText('Connect Talent With Opportunity', { exact: false }).first();
    const title3 = page.getByText('Start working', { exact: false }).first();
    
    // At least one of these should be visible
    const count1 = await title1.count();
    const count2 = await title2.count();
    const count3 = await title3.count();
    
    expect(count1 > 0 || count2 > 0 || count3 > 0).toBeTruthy();
  });

  test('should navigate to login page', async ({ page, context }) => {
    // Clear any existing session/auth state
    await context.clearCookies();
    
    // Navigate directly to login page (more reliable than clicking)
    // The navbar has "Register" button but "Login" is only in mobile menu
    await page.goto('/login', { waitUntil: 'networkidle', timeout: 30000 });

    // Verify navigation
    await expect(page).toHaveURL(/.*login/, { timeout: 15000 });

    // Wait for login page content - look for "Login" title or "Welcome Back" subtitle
    await page.waitForSelector('text=/Login|Welcome Back/i', { timeout: 15000 }).catch(async () => {
      // If text selector fails, wait for form element
      await page.waitForSelector('form', { timeout: 15000 });
    });

    // Wait a bit more for React to fully render
    await page.waitForTimeout(2000);

    // Try to find email input - the form uses name="email" and type="email"
    const emailInput = page.locator('input[name="email"]').first();
    
    // If not found, try alternative selectors
    if (await emailInput.count() === 0) {
      const altInput = page.locator('input[type="email"]').first();
      await expect(altInput).toBeVisible({ timeout: 10000 });
    } else {
      await expect(emailInput).toBeVisible({ timeout: 10000 });
    }
  });
});

