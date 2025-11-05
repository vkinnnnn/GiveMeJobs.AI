import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for GiveMeJobs Platform E2E Tests
 * 
 * This configuration sets up comprehensive end-to-end testing across:
 * - Multiple browsers (Chrome, Firefox, Safari)
 * - Mobile devices (iPhone, Android)
 * - Different viewport sizes
 * - Visual regression testing
 * - Performance testing
 * 
 * Requirements: 14.3 - End-to-end testing across the entire platform
 */

export default defineConfig({
  testDir: './src/__tests__/e2e/playwright',
  
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
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['github'], // GitHub Actions integration
  ],
  
  /* Shared settings for all the projects below. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    
    /* Collect trace when retrying the failed test. */
    trace: 'on-first-retry',
    
    /* Take screenshot on failure */
    screenshot: 'only-on-failure',
    
    /* Record video on failure */
    video: 'retain-on-failure',
    
    /* Global timeout for each test */
    actionTimeout: 30000,
    
    /* Global timeout for navigation */
    navigationTimeout: 30000,
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    /* Test against mobile viewports. */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },

    /* Test against branded browsers. */
    {
      name: 'Microsoft Edge',
      use: { ...devices['Desktop Edge'], channel: 'msedge' },
    },
    {
      name: 'Google Chrome',
      use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    },

    /* Visual regression testing project */
    {
      name: 'visual-regression',
      use: { 
        ...devices['Desktop Chrome'],
        // Consistent viewport for visual testing
        viewport: { width: 1280, height: 720 },
      },
      testMatch: '**/*.visual.spec.ts',
    },

    /* Performance testing project */
    {
      name: 'performance',
      use: { 
        ...devices['Desktop Chrome'],
        // Performance-specific settings
        launchOptions: {
          args: ['--enable-precise-memory-info'],
        },
      },
      testMatch: '**/*.performance.spec.ts',
    },
  ],

  /* Global setup and teardown */
  globalSetup: require.resolve('./src/__tests__/e2e/playwright/global-setup.ts'),
  globalTeardown: require.resolve('./src/__tests__/e2e/playwright/global-teardown.ts'),

  /* Run your local dev server before starting the tests */
  webServer: [
    {
      command: 'npm run dev',
      port: 3000,
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
    {
      command: 'cd ../python-services && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000',
      port: 8000,
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
  ],

  /* Expect options */
  expect: {
    /* Threshold for visual comparisons */
    threshold: 0.2,
    
    /* Timeout for expect assertions */
    timeout: 10000,
  },

  /* Output directories */
  outputDir: 'test-results/',
  
  /* Test timeout */
  timeout: 60000,
});