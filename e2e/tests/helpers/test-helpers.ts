/**
 * Test helpers for E2E tests
 */

export interface TestUser {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
}

/**
 * Generate a unique test email
 */
export function generateTestEmail(prefix: string = 'test'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
}

/**
 * Generate test user data
 */
export function generateTestUser(type: 'graduate' | 'company'): TestUser {
  const email = generateTestEmail(type);
  const password = 'TestPassword123!';

  if (type === 'graduate') {
    return {
      email,
      password,
      firstName: 'Test',
      lastName: 'Graduate',
    };
  } else {
    return {
      email,
      password,
      companyName: `Test Company ${Date.now()}`,
    };
  }
}

/**
 * Wait for API response
 */
export async function waitForApiResponse(
  page: any,
  urlPattern: string | RegExp,
  timeout: number = 10000
): Promise<void> {
  await page.waitForResponse(
    (response: any) => {
      const url = response.url();
      if (typeof urlPattern === 'string') {
        return url.includes(urlPattern);
      }
      return urlPattern.test(url);
    },
    { timeout }
  );
}

/**
 * Fill form fields by label or placeholder
 */
export async function fillFormField(
  page: any,
  labelOrPlaceholder: string,
  value: string
): Promise<void> {
  // Try by label first
  const label = page.locator(`label:has-text("${labelOrPlaceholder}")`);
  if (await label.count() > 0) {
    const input = page.locator(`input[id="${await label.getAttribute('for')}"], textarea[id="${await label.getAttribute('for')}"]`);
    if (await input.count() > 0) {
      await input.fill(value);
      return;
    }
  }

  // Try by placeholder
  const placeholderInput = page.locator(`input[placeholder*="${labelOrPlaceholder}" i], textarea[placeholder*="${labelOrPlaceholder}" i]`);
  if (await placeholderInput.count() > 0) {
    await placeholderInput.first().fill(value);
    return;
  }

  // Try by name attribute
  const nameInput = page.locator(`input[name*="${labelOrPlaceholder}" i], textarea[name*="${labelOrPlaceholder}" i]`);
  if (await nameInput.count() > 0) {
    await nameInput.first().fill(value);
    return;
  }

  throw new Error(`Could not find form field: ${labelOrPlaceholder}`);
}

/**
 * Wait for navigation with retry
 */
export async function waitForNavigation(
  page: any,
  urlPattern: string | RegExp,
  options: { timeout?: number; retries?: number } = {}
): Promise<void> {
  const { timeout = 10000, retries = 3 } = options;
  let lastError: Error | null = null;

  for (let i = 0; i < retries; i++) {
    try {
      await page.waitForURL(urlPattern, { timeout });
      return;
    } catch (error) {
      lastError = error as Error;
      if (i < retries - 1) {
        await page.waitForTimeout(1000);
      }
    }
  }

  throw lastError || new Error('Navigation timeout');
}

