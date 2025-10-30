import { test, expect } from '@playwright/test';
import { navigateTo, fillFormField, clickButton, clearStorage, TEST_USERS } from '../helpers/test-utils';

/**
 * E2E tests for user login flow
 * Requirements: 1.4
 */

test.describe('User Login', () => {
  test.beforeEach(async ({ page }) => {
    await clearStorage(page);
  });

  test('should display login form', async ({ page }) => {
    await navigateTo(page, '/auth/login');
    
    await expect(page.getByRole('heading', { name: /sign in|log in/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in|log in/i })).toBeVisible();
  });

  test('should login with valid credentials', async ({ page }) => {
    await navigateTo(page, '/auth/login');
    
    await fillFormField(page, 'Email', TEST_USERS.regular.email);
    await fillFormField(page, 'Password', TEST_USERS.regular.password);
    
    await clickButton(page, /sign in|log in/i);
    
    // Should redirect to dashboard within 2 seconds (Requirement 1.4)
    await page.waitForURL('/dashboard', { timeout: 2000 });
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await navigateTo(page, '/auth/login');
    
    await fillFormField(page, 'Email', 'wrong@example.com');
    await fillFormField(page, 'Password', 'WrongPassword123!');
    
    await clickButton(page, /sign in|log in/i);
    
    // Should display error message (Requirement 1.5)
    await expect(page.getByText(/invalid.*credentials|incorrect.*email.*password/i)).toBeVisible();
  });

  test('should show validation error for empty email', async ({ page }) => {
    await navigateTo(page, '/auth/login');
    
    await fillFormField(page, 'Password', 'Test123!@#');
    await clickButton(page, /sign in|log in/i);
    
    await expect(page.getByText(/email.*required/i)).toBeVisible();
  });

  test('should show validation error for empty password', async ({ page }) => {
    await navigateTo(page, '/auth/login');
    
    await fillFormField(page, 'Email', 'test@example.com');
    await clickButton(page, /sign in|log in/i);
    
    await expect(page.getByText(/password.*required/i)).toBeVisible();
  });

  test('should navigate to forgot password page', async ({ page }) => {
    await navigateTo(page, '/auth/login');
    
    await page.getByRole('link', { name: /forgot.*password/i }).click();
    
    await page.waitForURL('/auth/forgot-password');
    await expect(page.getByRole('heading', { name: /forgot.*password|reset.*password/i })).toBeVisible();
  });

  test('should navigate to registration page', async ({ page }) => {
    await navigateTo(page, '/auth/login');
    
    await page.getByRole('link', { name: /sign up|create.*account|register/i }).click();
    
    await page.waitForURL('/auth/register');
    await expect(page.getByRole('heading', { name: /sign up|register|create account/i })).toBeVisible();
  });

  test('should show OAuth login options', async ({ page }) => {
    await navigateTo(page, '/auth/login');
    
    // Check for OAuth buttons (Requirement 1.1)
    await expect(page.getByRole('button', { name: /google/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /linkedin/i })).toBeVisible();
  });

  test('should persist session after login', async ({ page, context }) => {
    await navigateTo(page, '/auth/login');
    
    await fillFormField(page, 'Email', TEST_USERS.regular.email);
    await fillFormField(page, 'Password', TEST_USERS.regular.password);
    await clickButton(page, /sign in|log in/i);
    
    await page.waitForURL('/dashboard');
    
    // Open new page in same context
    const newPage = await context.newPage();
    await newPage.goto('/dashboard');
    
    // Should still be logged in
    await expect(newPage.getByRole('heading', { name: /dashboard/i })).toBeVisible();
  });
});
