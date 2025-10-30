import { test, expect } from '@playwright/test';
import { navigateTo, fillFormField, clickButton, waitForToast, clearStorage } from '../helpers/test-utils';

/**
 * E2E tests for user registration flow
 * Requirements: 1.1, 1.2
 */

test.describe('User Registration', () => {
  test.beforeEach(async ({ page }) => {
    await clearStorage(page);
  });

  test('should display registration form', async ({ page }) => {
    await navigateTo(page, '/auth/register');
    
    await expect(page.getByRole('heading', { name: /sign up|register|create account/i })).toBeVisible();
    await expect(page.getByLabel(/first name/i)).toBeVisible();
    await expect(page.getByLabel(/last name/i)).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/^password$/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /create account|sign up/i })).toBeVisible();
  });

  test('should register a new user with valid data', async ({ page }) => {
    await navigateTo(page, '/auth/register');
    
    const timestamp = Date.now();
    const testEmail = `test${timestamp}@example.com`;
    
    await fillFormField(page, 'First Name', 'Test');
    await fillFormField(page, 'Last Name', 'User');
    await fillFormField(page, 'Email', testEmail);
    await fillFormField(page, 'Password', 'Test123!@#');
    await fillFormField(page, 'Confirm Password', 'Test123!@#');
    
    await clickButton(page, /create account|sign up/i);
    
    // Should redirect to dashboard or show success message
    await page.waitForURL(/\/(dashboard|auth\/verify-email)/, { timeout: 10000 });
  });

  test('should show validation errors for invalid email', async ({ page }) => {
    await navigateTo(page, '/auth/register');
    
    await fillFormField(page, 'First Name', 'Test');
    await fillFormField(page, 'Last Name', 'User');
    await fillFormField(page, 'Email', 'invalid-email');
    await fillFormField(page, 'Password', 'Test123!@#');
    
    await clickButton(page, /create account|sign up/i);
    
    await expect(page.getByText(/invalid email|valid email/i)).toBeVisible();
  });

  test('should show validation errors for weak password', async ({ page }) => {
    await navigateTo(page, '/auth/register');
    
    await fillFormField(page, 'First Name', 'Test');
    await fillFormField(page, 'Last Name', 'User');
    await fillFormField(page, 'Email', 'test@example.com');
    await fillFormField(page, 'Password', '123');
    
    await clickButton(page, /create account|sign up/i);
    
    await expect(page.getByText(/password.*strong|password.*8 characters/i)).toBeVisible();
  });

  test('should show error when passwords do not match', async ({ page }) => {
    await navigateTo(page, '/auth/register');
    
    await fillFormField(page, 'First Name', 'Test');
    await fillFormField(page, 'Last Name', 'User');
    await fillFormField(page, 'Email', 'test@example.com');
    await fillFormField(page, 'Password', 'Test123!@#');
    await fillFormField(page, 'Confirm Password', 'Different123!@#');
    
    await clickButton(page, /create account|sign up/i);
    
    await expect(page.getByText(/passwords.*match/i)).toBeVisible();
  });

  test('should show error for duplicate email', async ({ page }) => {
    await navigateTo(page, '/auth/register');
    
    // Try to register with an existing email
    await fillFormField(page, 'First Name', 'Test');
    await fillFormField(page, 'Last Name', 'User');
    await fillFormField(page, 'Email', 'existing@example.com');
    await fillFormField(page, 'Password', 'Test123!@#');
    await fillFormField(page, 'Confirm Password', 'Test123!@#');
    
    await clickButton(page, /create account|sign up/i);
    
    // Should show error message (might need to mock API response)
    await expect(page.getByText(/email.*already.*exists|already registered/i)).toBeVisible({ timeout: 5000 });
  });

  test('should navigate to login page from registration', async ({ page }) => {
    await navigateTo(page, '/auth/register');
    
    await page.getByRole('link', { name: /sign in|log in|already have account/i }).click();
    
    await page.waitForURL('/auth/login');
    await expect(page.getByRole('heading', { name: /sign in|log in/i })).toBeVisible();
  });
});
