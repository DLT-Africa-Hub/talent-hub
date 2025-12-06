import { defineConfig, devices } from '@playwright/test';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// require('dotenv').config();

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html'],
    ['list'],
    process.env.CI ? ['github'] : ['list'],
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:5174',
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    /* Increase timeout for slower operations */
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },

  /* Increase global test timeout */
  timeout: 60000, // 60 seconds per test

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },

    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },
  ],

  /* Run your local dev server before starting the tests */
  webServer: process.env.CI ? undefined : [
    // Start backend server with test MongoDB (in-memory)
    {
      command: 'cd ../backend && pnpm run start:test',
      url: 'http://localhost:3090/api/v1/health',
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
      stdout: 'ignore',
      stderr: 'pipe',
      env: {
        NODE_ENV: 'test',
        PORT: '3090',
        CORS_ORIGIN: 'http://localhost:5174',
        JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'test-jwt-secret-key-min-32-chars-long-for-e2e-tests',
        JWT_ACCESS_EXPIRE: '15m',
        EMAIL_ENABLED: 'false',
        EMAIL_PROVIDER: 'console',
        // MongoDB will be set by index.test.ts (in-memory)
      },
    },
    // Start frontend dev server
    {
      command: 'cd ../frontend && pnpm run dev',
      url: 'http://localhost:5174',
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
      stdout: 'ignore',
      stderr: 'pipe',
    },
  ],
});

