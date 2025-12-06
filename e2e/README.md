# E2E Tests

This directory contains end-to-end tests for the Talent Hub application using Playwright.

## Setup

The e2e tests are configured to use:
- **In-memory MongoDB** (via `mongodb-memory-server`) for the backend - no database setup required!
- **Local frontend** dev server
- **Local backend** test server

## Running Tests

```bash
# Install dependencies (if not already done)
pnpm install

# Run all tests
pnpm test

# Run tests in UI mode
pnpm exec playwright test --ui

# Run a specific test file
pnpm exec playwright test tests/example.spec.ts

# Run tests in headed mode (see browser)
pnpm exec playwright test --headed
```

## Test Database

The tests automatically use an **in-memory MongoDB instance** that:
- Starts automatically when tests run
- Is isolated from your development/production database
- Gets cleaned up after tests complete
- Requires no setup or configuration

The backend test server (`backend/index.test.ts`) uses `mongodb-memory-server` to create a temporary MongoDB instance that exists only in memory during test execution.

## Configuration

The test configuration is in `playwright.config.ts`:
- Frontend runs on `http://localhost:5174`
- Backend runs on `http://localhost:3090`
- Both servers start automatically before tests run

## Environment Variables

The test backend uses these default environment variables (set in `playwright.config.ts`):
- `NODE_ENV=test`
- `PORT=3090`
- `EMAIL_ENABLED=false` (emails are disabled during tests)
- `EMAIL_PROVIDER=console` (email output goes to console)

## Writing Tests

See existing test files in the `tests/` directory for examples:
- `example.spec.ts` - Basic navigation tests
- `graduate-signup-flow.spec.ts` - User signup and onboarding flow
- `company-job-notification-flow.spec.ts` - Company job creation flow

## Troubleshooting

### Backend server won't start
- Make sure you have `mongodb-memory-server` installed: `cd ../backend && pnpm install`
- Check that port 3090 is not already in use

### Frontend server won't start
- Make sure you have frontend dependencies installed: `cd ../frontend && pnpm install`
- Check that port 5174 is not already in use

### Tests fail with database errors
- The in-memory database should work automatically
- If issues persist, check that `mongodb-memory-server` is properly installed in the backend
