import { test, expect } from '@playwright/test';
import { navigateTo, fillFormField, clickButton, clearStorage } from '../helpers/test-utils';

/**
 * E2E tests for password recovery flow
 * Requirements: 1.5
 */

test.describe('Password Recovery', () => {
  test.beforeEach(async ({ page }) => {
    await clearStorage(page);
  });

  test('should display forgot password form', async ({ page }) => {
    await navigateTo(page, '/auth/forgot-password');
    
    await expect(page.getByRole('heading', { name: /forgot.*password|reset.*password/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /send.*reset.*link|reset.*password/i })).toBeVisible();
  });

  test('should send password reset email for valid email', async ({ page }) => {
    await navigateTo(page, '/auth/forgot-password');
    
    await fillFormField(page, 'Email', 'test@example.com');
    await clickButton(page, /send.*reset.*link|reset.*password/i);
    
    // Should show success message
    await expect(page.getByText(/check.*email|reset.*link.*sent/i)).toBeVisible({ timeout: 5000 });
  });

  test('should show validation error for invalid email', async ({ page }) => {
    await navigateTo(page, '/auth/forgot-password');
    
    await fillFormField(page, 'Email', 'invalid-email');
    await clickButton(page, /send.*reset.*link|reset.*password/i);
    
    await expect(page.getByText(/invalid.*email|valid.*email/i)).toBeVisible();
  });

  test('should navigate back to login', async ({ page }) => {
    await navigateTo(page, '/auth/forgot-password');
    
    await page.getByRole('link', { name: /back.*login|sign in/i }).click();
    
    await page.waitForURL('/auth/login');
    await expect(page.getByRole('heading', { name: /sign in|log in/i })).toBeVisible();
  });

  test('should display reset password form with valid token', async ({ page }) => {
    // Navigate with a mock token
    await navigateTo(page, '/auth/reset-password?token=mock-reset-token');
    
    await expect(page.getByRole('heading', { name: /reset.*password|new.*password/i })).toBeVisible();
    await expect(page.getByLabel(/new.*password|password/i)).toBeVisible();
    await expect(page.getByLabel(/confirm.*password/i)).toBeVisible();
  });

  test('should reset password with valid token and matching passwords', async ({ page }) => {
    await navigateTo(page, '/auth/reset-password?token=mock-reset-token');
    
    await fillFormField(page, /new.*password|^password$/i, 'NewPassword123!@#');
    await fillFormField(page, /confirm.*password/i, 'NewPassword123!@#');
    
    await clickButton(page, /reset.*password|update.*password/i);
    
    // Should show success and redirect to login
    await page.waitForURL('/auth/login', { timeout: 5000 });
    await expect(page.getByText(/password.*reset.*success|password.*updated/i)).toBeVisible();
  });

  test('should show error when passwords do not match', async ({ page }) => {
    await navigateTo(page, '/auth/reset-password?token=mock-reset-token');
    
    await fillFormField(page, /new.*password|^password$/i, 'NewPassword123!@#');
    await fillFormField(page, /confirm.*password/i, 'DifferentPassword123!@#');
    
    await clickButton(page, /reset.*password|update.*password/i);
    
    await expect(page.getByText(/passwords.*match/i)).toBeVisible();
  });

  test('should show error for weak password', async ({ page }) => {
    await navigateTo(page, '/auth/reset-password?token=mock-reset-token');
    
    await fillFormField(page, /new.*password|^password$/i, '123');
    await fillFormField(page, /confirm.*password/i, '123');
    
    await clickButton(page, /reset.*password|update.*password/i);
    
    await expect(page.getByText(/password.*strong|password.*8 characters/i)).toBeVisible();
  });

  test('should show error for invalid or expired token', async ({ page }) => {
    await navigateTo(page, '/auth/reset-password?token=invalid-token');
    
    // Should show error message
    await expect(page.getByText(/invalid.*token|expired.*token|link.*expired/i)).toBeVisible({ timeout: 5000 });
  });
});
