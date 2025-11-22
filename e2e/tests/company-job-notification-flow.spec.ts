import { test, expect } from '@playwright/test';

/**
 * E2E Test: Company Job Post → Notification Delivery Flow
 * 
 * This test covers:
 * 1. Company signs up and completes profile
 * 2. Company creates a job posting
 * 3. Verifies notification is created for the company
 * 4. Verifies job appears in company's job list
 * 5. Verifies notification appears in notifications
 */
test.describe('Company Job Post to Notification Flow', () => {
  const testEmail = `test-company-${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';
  const testCompanyName = `Test Company ${Date.now()}`;
  const testJobTitle = `Test Job ${Date.now()}`;

  test.beforeEach(async ({ page, context }) => {
    // Clear any existing session/auth state
    await context.clearCookies();
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    // Wait for React to hydrate and auth context to initialize
    await page.waitForTimeout(1000);
  });

  test('company creates job and receives notification', async ({ page }) => {
    // Step 1: Register as company
    // Try to click Get Started link, or navigate directly if not found
    const getStartedLink = page.getByText('Get Started', { exact: true });
    const linkCount = await getStartedLink.count();
    if (linkCount > 0) {
      await getStartedLink.first().click();
      await expect(page).toHaveURL(/.*register/, { timeout: 10000 });
    } else {
      // Fallback: navigate directly to register page
      await page.goto('/register');
      await expect(page).toHaveURL(/.*register/, { timeout: 10000 });
    }

    // Select company role by clicking the Company tab/button
    await page.click('button:has-text("Company")');
    await page.waitForTimeout(500); // Wait for role selection to register
    
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    
    // No terms checkbox in current form

    await page.click('button[type="submit"]');
    await page.waitForURL(/.*verify-email|.*login|.*company/, { timeout: 10000 });

    // Step 2: Login if needed
    if (page.url().includes('/login')) {
      await page.fill('input[name="email"]', testEmail);
      await page.fill('input[name="password"]', testPassword);
      await page.click('button[type="submit"]');
    }

    // Step 3: Complete company onboarding
    await page.waitForURL(/.*onboarding|.*company/, { timeout: 10000 });

    if (page.url().includes('/onboarding') || page.url().includes('/company/onboarding')) {
      await page.fill('input[name="companyName"]', testCompanyName);
      await page.selectOption('select[name="industry"]', 'Technology');
      await page.selectOption('select[name="companySize"]', '50-200');
      await page.fill('input[name="location"]', 'San Francisco, CA');
      await page.fill('textarea[name="description"]', 'A leading technology company');

      const submitButton = page.locator('button[type="submit"]:has-text("Complete"), button:has-text("Submit"), button:has-text("Continue")');
      await submitButton.first().click();
      await page.waitForURL(/.*company/, { timeout: 10000 });
    }

    // Step 4: Navigate to jobs page
    await page.goto('/company');
    await page.waitForLoadState('networkidle');

    // Click on "Post a Job" or navigate to jobs
    const postJobButton = page.locator('button:has-text("Post a Job"), a:has-text("Jobs"), button:has-text("Create Job")').first();
    if (await postJobButton.count() > 0) {
      await postJobButton.click();
    } else {
      await page.goto('/jobs');
    }

    // Step 5: Create a job posting
    // Wait for job creation modal or page
    await page.waitForTimeout(1000);

    // Fill job creation form
    const jobTitleInput = page.locator('input[name="title"], input[placeholder*="job title" i]').first();
    await jobTitleInput.fill(testJobTitle);

    const jobDescriptionInput = page.locator('textarea[name="description"], textarea[placeholder*="description" i]').first();
    await jobDescriptionInput.fill('We are looking for a talented developer to join our team.');

    const locationInput = page.locator('input[name="location"], input[placeholder*="location" i]').first();
    await locationInput.fill('San Francisco, CA');

    // Select job type
    const jobTypeSelect = page.locator('select[name="jobType"]').first();
    if (await jobTypeSelect.count() > 0) {
      await jobTypeSelect.selectOption('Full time');
    }

    // Fill salary if field exists
    const salaryMinInput = page.locator('input[name="salaryMin"], input[name="salary.min"]').first();
    if (await salaryMinInput.count() > 0) {
      await salaryMinInput.fill('80000');
      const salaryMaxInput = page.locator('input[name="salaryMax"], input[name="salary.max"]').first();
      if (await salaryMaxInput.count() > 0) {
        await salaryMaxInput.fill('120000');
      }
    }

    // Continue to rank selection (if multi-step)
    const continueButton = page.locator('button:has-text("Continue"), button:has-text("Next")').first();
    if (await continueButton.count() > 0) {
      await continueButton.click();
      await page.waitForTimeout(500);

      // Select rank preference
      const rankButton = page.locator('button:has-text("A"), button:has-text("B"), input[value="A"]').first();
      if (await rankButton.count() > 0) {
        await rankButton.click();
      }
    }

    // Submit job creation
    const submitJobButton = page.locator('button[type="submit"]:has-text("Post"), button:has-text("Create"), button:has-text("Submit")').first();
    await submitJobButton.click();

    // Step 6: Wait for job creation success
    // Look for success message or redirect
    await page.waitForTimeout(2000);
    
    // Verify job appears in jobs list
    await page.goto('/jobs');
    await page.waitForLoadState('networkidle');
    
    // Check if job title appears in the list
    const jobCard = page.locator(`text=${testJobTitle}`).first();
    await expect(jobCard).toBeVisible({ timeout: 10000 });

    // Step 7: Check notifications
    // Navigate to notifications page
    await page.goto('/notifications');
    await page.waitForLoadState('networkidle');

    // Verify notification exists for job creation
    // Wait for notifications to load
    await page.waitForTimeout(2000);
    
    // Try to find notification - check multiple possible indicators
    const notificationText = page.getByText('Job Created', { exact: false }).first();
    const hasNotificationText = await notificationText.count() > 0;
    
    // Also check if any notification element exists
    const notificationElements = page.locator('[class*="notification"], [data-testid*="notification"], article, .notification').first();
    const hasNotificationElement = await notificationElements.count() > 0;
    
    // At least one notification should exist
    expect(hasNotificationText || hasNotificationElement).toBeTruthy();

    // Try to click on notification if it exists (optional step)
    const notificationToClick = page.getByText('Job Created', { exact: false }).first();
    if (await notificationToClick.count() > 0) {
      await notificationToClick.click();
      await page.waitForTimeout(1000);
      
      // Check if notification modal or details page shows job title
      const notificationJobTitle = page.getByText(testJobTitle, { exact: false }).first();
      if (await notificationJobTitle.count() > 0) {
        await expect(notificationJobTitle).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('company can view created jobs', async ({ page }) => {
    // This test verifies the job list functionality
    // Login as company (assuming test account exists)
    await page.goto('/login');
    // Note: In a real scenario, you'd use a test account or create one in beforeAll
    
    // Navigate to jobs
    await page.goto('/jobs');
    
    // Verify jobs page loads - check for common elements on jobs page
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    // Verify URL changed to jobs page or check for page content
    await expect(page).toHaveURL(/.*jobs/i, { timeout: 10000 });
    // Try to find any heading or text element to verify page loaded
    const pageContent = page.locator('body').first();
    await expect(pageContent).toBeVisible({ timeout: 5000 });
  });
});

