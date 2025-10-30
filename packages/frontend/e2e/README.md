# E2E Testing Quick Start Guide

## Setup

1. Install dependencies:
```bash
npm install
```

2. Install Playwright browsers:
```bash
npx playwright install
```

## Running Tests

### Run all tests
```bash
npm run test:e2e
```

### Run specific test file
```bash
npx playwright test e2e/auth/login.spec.ts
```

### Run tests in UI mode (recommended for development)
```bash
npm run test:e2e:ui
```

### Run tests in headed mode (see browser)
```bash
npm run test:e2e:headed
```

### Debug a specific test
```bash
npm run test:e2e:debug
```

### Run tests on specific browser
```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

## Viewing Results

### View HTML report
```bash
npm run test:e2e:report
```

### View traces (for failed tests)
```bash
npx playwright show-trace trace.zip
```

## Writing Tests

### Basic test structure
```typescript
import { test, expect } from '@playwright/test';
import { login, navigateTo } from '../helpers/test-utils';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Setup before each test
  });

  test('should do something', async ({ page }) => {
    // Test implementation
    await navigateTo(page, '/some-path');
    await expect(page.getByRole('heading')).toBeVisible();
  });
});
```

### Using test utilities
```typescript
import { 
  login, 
  logout, 
  navigateTo, 
  fillFormField, 
  clickButton,
  mockApiResponse 
} from '../helpers/test-utils';

// Login
await login(page, TEST_USERS.regular);

// Navigate
await navigateTo(page, '/dashboard');

// Fill form
await fillFormField(page, 'Email', 'test@example.com');

// Click button
await clickButton(page, 'Submit');

// Mock API
await mockApiResponse(page, /\/api\/jobs/, { jobs: [] });
```

## Test Organization

```
e2e/
├── auth/              # Authentication tests
├── jobs/              # Job search and application tests
├── interview/         # Interview preparation tests
├── helpers/           # Test utilities
├── fixtures/          # Test data
└── setup/             # Global setup/teardown
```

## Tips

1. **Use data-testid**: Add `data-testid` attributes to elements for reliable selection
2. **Mock APIs**: Mock external API calls to avoid flaky tests
3. **Clear storage**: Clear browser storage before each test
4. **Wait for elements**: Use `waitForSelector` or `waitForLoadState` for dynamic content
5. **Take screenshots**: Use `takeScreenshot()` helper for debugging

## Environment Variables

- `BASE_URL`: Application URL (default: http://localhost:3000)
- `CI`: Set to true in CI environment

## Troubleshooting

### Tests are failing locally
1. Make sure the dev server is running: `npm run dev`
2. Clear browser cache and storage
3. Check if ports are available

### Tests are slow
1. Run tests in parallel: `npx playwright test --workers=4`
2. Mock external API calls
3. Use `--project=chromium` to run on single browser

### Browser not found
```bash
npx playwright install
```

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Test Utilities](./helpers/test-utils.ts)
- [Test Fixtures](./fixtures/test-data.ts)
