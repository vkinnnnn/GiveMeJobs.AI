import { Page, expect } from '@playwright/test';

/**
 * Test utilities and helpers for E2E tests
 */

export interface TestUser {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export const TEST_USERS = {
  regular: {
    email: 'test@example.com',
    password: 'Test123!@#',
    firstName: 'Test',
    lastName: 'User',
  },
  premium: {
    email: 'premium@example.com',
    password: 'Premium123!@#',
    firstName: 'Premium',
    lastName: 'User',
  },
};

/**
 * Navigate to a specific page and wait for it to load
 */
export async function navigateTo(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState('networkidle');
}

/**
 * Fill in a form field by label
 */
export async function fillFormField(page: Page, label: string, value: string) {
  await page.getByLabel(label).fill(value);
}

/**
 * Click a button by text
 */
export async function clickButton(page: Page, text: string) {
  await page.getByRole('button', { name: text }).click();
}

/**
 * Wait for a toast/notification message
 */
export async function waitForToast(page: Page, message: string) {
  await expect(page.getByText(message)).toBeVisible({ timeout: 5000 });
}

/**
 * Login helper
 */
export async function login(page: Page, user: TestUser) {
  await navigateTo(page, '/auth/login');
  await fillFormField(page, 'Email', user.email);
  await fillFormField(page, 'Password', user.password);
  await clickButton(page, 'Sign In');
  await page.waitForURL('/dashboard', { timeout: 10000 });
}

/**
 * Logout helper
 */
export async function logout(page: Page) {
  await page.getByRole('button', { name: /logout|sign out/i }).click();
  await page.waitForURL('/auth/login');
}

/**
 * Register a new user
 */
export async function register(page: Page, user: TestUser) {
  await navigateTo(page, '/auth/register');
  await fillFormField(page, 'First Name', user.firstName);
  await fillFormField(page, 'Last Name', user.lastName);
  await fillFormField(page, 'Email', user.email);
  await fillFormField(page, 'Password', user.password);
  await fillFormField(page, 'Confirm Password', user.password);
  await clickButton(page, 'Create Account');
}

/**
 * Wait for API response
 */
export async function waitForApiResponse(page: Page, urlPattern: string | RegExp) {
  return page.waitForResponse(
    (response) => {
      const url = response.url();
      if (typeof urlPattern === 'string') {
        return url.includes(urlPattern);
      }
      return urlPattern.test(url);
    },
    { timeout: 10000 }
  );
}

/**
 * Check if element is visible
 */
export async function isVisible(page: Page, selector: string): Promise<boolean> {
  try {
    await page.waitForSelector(selector, { state: 'visible', timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Take a screenshot with a descriptive name
 */
export async function takeScreenshot(page: Page, name: string) {
  await page.screenshot({ path: `e2e/screenshots/${name}.png`, fullPage: true });
}

/**
 * Clear browser storage
 */
export async function clearStorage(page: Page) {
  await page.context().clearCookies();
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}

/**
 * Mock API response
 */
export async function mockApiResponse(
  page: Page,
  urlPattern: string | RegExp,
  response: any,
  status = 200
) {
  await page.route(urlPattern, (route) => {
    route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(response),
    });
  });
}

/**
 * Wait for element and get text
 */
export async function getElementText(page: Page, selector: string): Promise<string> {
  await page.waitForSelector(selector);
  return page.textContent(selector) || '';
}

/**
 * Check accessibility violations (basic check)
 */
export async function checkAccessibility(page: Page) {
  // Check for basic accessibility attributes
  const images = await page.locator('img').all();
  for (const img of images) {
    const alt = await img.getAttribute('alt');
    expect(alt).toBeTruthy();
  }

  const buttons = await page.locator('button').all();
  for (const button of buttons) {
    const ariaLabel = await button.getAttribute('aria-label');
    const text = await button.textContent();
    expect(ariaLabel || text).toBeTruthy();
  }
}
