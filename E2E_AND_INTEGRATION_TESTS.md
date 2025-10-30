# E2E and Integration Testing Documentation

## Overview

This document provides comprehensive information about the End-to-End (E2E) and Integration testing setup for the GiveMeJobs platform.

## Test Structure

### Frontend E2E Tests (Playwright)

Located in `packages/frontend/e2e/`

#### Test Suites

1. **Authentication Tests** (`e2e/auth/`)
   - `registration.spec.ts` - User registration flow tests
   - `login.spec.ts` - User login flow tests
   - `oauth.spec.ts` - OAuth authentication tests (Google, LinkedIn)
   - `password-recovery.spec.ts` - Password reset flow tests

2. **Job Search Tests** (`e2e/jobs/`)
   - `job-search.spec.ts` - Job search functionality tests
   - `job-application.spec.ts` - Job application flow tests

3. **Interview Preparation Tests** (`e2e/interview/`)
   - `interview-prep.spec.ts` - Interview preparation feature tests

### Backend Integration Tests (Vitest)

Located in `packages/backend/src/__tests__/integration/`

#### Test Suites

1. **External API Integration Tests**
   - `job-board-integration.test.ts` - Job board API integration tests
   - `linkedin-integration.test.ts` - LinkedIn API integration tests

## Running Tests

### Frontend E2E Tests

```bash
cd packages/frontend

# Run all E2E tests
npm run test:e2e

# Run tests in UI mode (interactive)
npm run test:e2e:ui

# Run tests in headed mode (see browser)
npm run test:e2e:headed

# Debug tests
npm run test:e2e:debug

# View test report
npm run test:e2e:report
```

### Backend Integration Tests

```bash
cd packages/backend

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage
```

## Test Configuration

### Playwright Configuration

File: `packages/frontend/playwright.config.ts`

Key settings:
- Base URL: `http://localhost:3000` (configurable via `BASE_URL` env var)
- Browsers: Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari
- Retries: 2 in CI, 0 locally
- Timeout: 30 seconds per test
- Screenshots: On failure only
- Trace: On first retry

### Vitest Configuration

File: `packages/backend/vitest.config.ts`

Key settings:
- Test environment: Node
- Coverage provider: v8
- Global test timeout: 10 seconds

## Test Utilities

### Frontend Test Helpers

Located in `packages/frontend/e2e/helpers/test-utils.ts`

Available utilities:
- `navigateTo(page, path)` - Navigate to a page
- `fillFormField(page, label, value)` - Fill form fields
- `clickButton(page, text)` - Click buttons
- `login(page, user)` - Login helper
- `logout(page)` - Logout helper
- `register(page, user)` - Registration helper
- `waitForApiResponse(page, urlPattern)` - Wait for API calls
- `mockApiResponse(page, urlPattern, response)` - Mock API responses
- `clearStorage(page)` - Clear browser storage
- `takeScreenshot(page, name)` - Take screenshots
- `checkAccessibility(page)` - Basic accessibility checks

### Test Data Fixtures

Located in `packages/frontend/e2e/fixtures/test-data.ts`

Available fixtures:
- `testJobs` - Sample job listings
- `testUserProfile` - Sample user profile
- `testApplication` - Sample application
- `testInterviewQuestions` - Sample interview questions
- `testResume` - Sample resume
- `testCoverLetter` - Sample cover letter

## Requirements Coverage

### Authentication Tests (Requirements 1.1, 1.4, 1.5)

✅ User registration with email
✅ User login with credentials
✅ OAuth authentication (Google, LinkedIn)
✅ Password recovery flow
✅ Authentication within 2 seconds
✅ Error message display
✅ Session persistence

### Job Search Tests (Requirements 3.1, 3.2, 3.3)

✅ Job search across multiple sources
✅ Results returned within 3 seconds
✅ Match score display (0-100%)
✅ Job details with matching skills
✅ Missing requirements identification
✅ Job filtering (location, remote, salary)
✅ Save jobs for later

### Job Application Tests (Requirements 4.1, 5.1)

✅ Tailored resume generation
✅ Cover letter generation
✅ Document generation within 10 seconds
✅ Document preview and editing
✅ Multi-format export (PDF, DOCX)
✅ Application submission
✅ Application tracking

### Interview Preparation Tests (Requirements 6.1, 6.4)

✅ Interview prep generation within 30 seconds
✅ Multiple question categories
✅ Suggested answers
✅ Practice response recording
✅ Response analysis
✅ Company research
✅ Interview reminders
✅ STAR method guidance

### External API Integration Tests (Requirements 8.3, 8.6)

✅ LinkedIn API integration
✅ Indeed API integration
✅ Glassdoor API integration
✅ Job aggregation from multiple sources
✅ Data deduplication
✅ Data normalization
✅ Rate limiting
✅ Exponential backoff
✅ Graceful degradation
✅ Error handling

## CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright browsers
        run: npx playwright install --with-deps
      
      - name: Run E2E tests
        run: npm run test:e2e
        env:
          BASE_URL: http://localhost:3000
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

## Best Practices

### Writing E2E Tests

1. **Use data-testid attributes** for reliable element selection
2. **Mock external APIs** to avoid flaky tests
3. **Clear storage** before each test to ensure clean state
4. **Use meaningful test descriptions** that explain what is being tested
5. **Test user flows** rather than implementation details
6. **Keep tests independent** - each test should run in isolation
7. **Use page object pattern** for complex pages (optional)

### Writing Integration Tests

1. **Test actual integrations** with external services
2. **Mock only when necessary** - prefer real integrations in test environment
3. **Test error scenarios** - network failures, timeouts, rate limits
4. **Verify data transformations** - ensure data is normalized correctly
5. **Test retry logic** - verify exponential backoff works
6. **Check performance** - ensure operations complete within SLA

## Debugging Tests

### Playwright Debugging

```bash
# Run in debug mode
npm run test:e2e:debug

# Run specific test file
npx playwright test e2e/auth/login.spec.ts

# Run with headed browser
npm run test:e2e:headed

# Generate trace
npx playwright test --trace on
```

### Vitest Debugging

```bash
# Run specific test file
npx vitest run src/__tests__/integration/linkedin-integration.test.ts

# Run in watch mode
npm run test:watch

# Run with debugger
node --inspect-brk node_modules/.bin/vitest
```

## Performance Benchmarks

Based on requirements:

- **Authentication**: < 2 seconds (Requirement 1.4)
- **Job Search**: < 3 seconds (Requirement 3.1, 9.3)
- **Document Generation**: < 10 seconds (Requirement 4.4, 9.2)
- **Interview Prep Generation**: < 30 seconds (Requirement 6.1)

All tests verify these performance requirements.

## Accessibility Testing

Basic accessibility checks are included in test utilities:
- Image alt text verification
- Button labels verification
- ARIA attributes verification

For comprehensive accessibility testing, use:
```bash
npm run test:a11y
```

## Troubleshooting

### Common Issues

1. **Tests timing out**
   - Increase timeout in playwright.config.ts
   - Check if application is running
   - Verify network connectivity

2. **Flaky tests**
   - Add explicit waits for dynamic content
   - Mock external API calls
   - Clear storage between tests

3. **Browser not found**
   - Run `npx playwright install`
   - Ensure browsers are installed

4. **Port already in use**
   - Change port in playwright.config.ts
   - Kill process using the port

## Future Enhancements

- [ ] Visual regression testing
- [ ] Performance testing with Lighthouse
- [ ] API contract testing
- [ ] Load testing
- [ ] Security testing
- [ ] Cross-browser compatibility matrix
- [ ] Mobile app E2E tests (React Native)

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Vitest Documentation](https://vitest.dev/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [E2E Testing Patterns](https://martinfowler.com/articles/practical-test-pyramid.html)
