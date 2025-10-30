import { test, expect } from '@playwright/test';
import { navigateTo, clearStorage } from '../helpers/test-utils';

/**
 * E2E tests for OAuth authentication flows
 * Requirements: 1.1
 */

test.describe('OAuth Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await clearStorage(page);
  });

  test('should display OAuth login options', async ({ page }) => {
    await navigateTo(page, '/auth/login');
    
    // Check for OAuth buttons
    const googleButton = page.getByRole('button', { name: /continue.*google|sign.*google/i });
    const linkedinButton = page.getByRole('button', { name: /continue.*linkedin|sign.*linkedin/i });
    
    await expect(googleButton).toBeVisible();
    await expect(linkedinButton).toBeVisible();
  });

  test('should initiate Google OAuth flow', async ({ page, context }) => {
    await navigateTo(page, '/auth/login');
    
    // Listen for popup
    const popupPromise = context.waitForEvent('page');
    
    await page.getByRole('button', { name: /continue.*google|sign.*google/i }).click();
    
    // Should open OAuth popup or redirect
    const popup = await popupPromise;
    await popup.waitForLoadState();
    
    // Check if redirected to Google OAuth
    expect(popup.url()).toContain('accounts.google.com');
  });

  test('should initiate LinkedIn OAuth flow', async ({ page, context }) => {
    await navigateTo(page, '/auth/login');
    
    // Listen for popup
    const popupPromise = context.waitForEvent('page');
    
    await page.getByRole('button', { name: /continue.*linkedin|sign.*linkedin/i }).click();
    
    // Should open OAuth popup or redirect
    const popup = await popupPromise;
    await popup.waitForLoadState();
    
    // Check if redirected to LinkedIn OAuth
    expect(popup.url()).toContain('linkedin.com');
  });

  test('should handle OAuth callback success', async ({ page }) => {
    // Simulate OAuth callback with success
    await navigateTo(page, '/auth/callback?provider=google&code=mock-auth-code');
    
    // Should redirect to dashboard after successful OAuth
    await page.waitForURL('/dashboard', { timeout: 10000 });
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
  });

  test('should handle OAuth callback error', async ({ page }) => {
    // Simulate OAuth callback with error
    await navigateTo(page, '/auth/callback?provider=google&error=access_denied');
    
    // Should redirect back to login with error message
    await page.waitForURL('/auth/login');
    await expect(page.getByText(/authentication.*failed|oauth.*error/i)).toBeVisible();
  });

  test('should display OAuth options on registration page', async ({ page }) => {
    await navigateTo(page, '/auth/register');
    
    // Check for OAuth buttons
    const googleButton = page.getByRole('button', { name: /continue.*google|sign.*google/i });
    const linkedinButton = page.getByRole('button', { name: /continue.*linkedin|sign.*linkedin/i });
    
    await expect(googleButton).toBeVisible();
    await expect(linkedinButton).toBeVisible();
  });

  test('should link OAuth account to existing user', async ({ page }) => {
    // Login with regular credentials first
    await navigateTo(page, '/auth/login');
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/password/i).fill('Test123!@#');
    await page.getByRole('button', { name: /sign in|log in/i }).click();
    
    await page.waitForURL('/dashboard');
    
    // Navigate to settings
    await page.goto('/settings/account');
    
    // Link OAuth account
    await page.getByRole('button', { name: /connect.*google|link.*google/i }).click();
    
    // Should show success message
    await expect(page.getByText(/google.*account.*connected|linked.*successfully/i)).toBeVisible({ timeout: 5000 });
  });
});
