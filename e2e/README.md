# E2E Tests for Talent Hub

This directory contains end-to-end (E2E) tests using Playwright to test critical user journeys.

## Setup

1. Install dependencies:
```bash
cd e2e
npm install
npx playwright install
```

2. Make sure the backend and frontend are running:
```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm run dev
```

## Running Tests

### Run all tests
```bash
npm run test:e2e
```

### Run tests in UI mode (interactive)
```bash
npm run test:e2e:ui
```

### Run tests in headed mode (see browser)
```bash
npm run test:e2e:headed
```

### Debug tests
```bash
npm run test:e2e:debug
```

### View test report
```bash
npm run test:e2e:report
```

## Test Coverage

### Critical User Journeys

1. **Graduate Signup Flow** (`graduate-signup-flow.spec.ts`)
   - User registration
   - Email verification
   - Onboarding completion
   - Profile creation
   - Route guard verification

2. **Company Job Post Flow** (`company-job-notification-flow.spec.ts`)
   - Company registration
   - Profile completion
   - Job creation
   - Notification delivery
   - Job listing verification

## Configuration

Tests are configured in `playwright.config.ts`. Key settings:

- **Base URL**: `http://localhost:5174` (frontend dev server)
- **Browsers**: Chromium, Firefox, WebKit
- **Retries**: 2 retries on CI, 0 locally
- **Screenshots**: On failure only
- **Videos**: Retained on failure

## Environment Variables

- `PLAYWRIGHT_TEST_BASE_URL`: Override base URL (default: `http://localhost:5174`)
- `CI`: Set to `true` in CI environment

## Writing New Tests

1. Create a new test file in `tests/` directory
2. Use the test helpers from `tests/helpers/test-helpers.ts`
3. Follow the existing test patterns
4. Use descriptive test names and descriptions

Example:
```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test('should do something', async ({ page }) => {
    await page.goto('/');
    // Test implementation
  });
});
```

## CI Integration

Tests run automatically in CI/CD pipeline. Make sure:
- Backend is running on port 3090
- Frontend is running on port 5174
- MongoDB is available
- All environment variables are set

## Troubleshooting

### Tests fail with timeout
- Check if backend and frontend are running
- Verify database connection
- Check network connectivity

### Selectors not found
- Use Playwright's codegen: `npx playwright codegen http://localhost:5174`
- Check browser DevTools for actual selectors
- Update selectors in test files

### Flaky tests
- Add appropriate waits (`waitForLoadState`, `waitForSelector`)
- Use `waitForURL` for navigation
- Increase timeout if needed

