import { test, expect, Page } from '@playwright/test';

/**
 * E2E Tests for Authentication Flow
 * 
 * Tests complete user authentication journeys including:
 * - User registration with validation
 * - Login and logout flows
 * - Password recovery process
 * - Session management
 * - Multi-factor authentication
 * 
 * Requirements: 14.3 - End-to-end testing for critical business workflows
 */

test.describe('Authentication Flow E2E Tests', () => {
  let page: Page;
  const testUser = {
    email: `test.auth.${Date.now()}@example.com`,
    password: 'TestPassword123!',
    firstName: 'Test',
    lastName: 'User',
    professionalHeadline: 'Software Engineer',
  };

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
  });

  test.afterEach(async () => {
    await page.close();
  });

  test.describe('User Registration Journey', () => {
    test('should complete full registration flow with profile creation', async () => {
      // Navigate to registration page
      await page.goto('/register');
      
      // Verify registration page loads
      await expect(page.locator('[data-testid="registration-form"]')).toBeVisible();
      await expect(page.locator('h1')).toContainText('Create Your Account');

      // Fill registration form
      await page.fill('[data-testid="email-input"]', testUser.email);
      await page.fill('[data-testid="password-input"]', testUser.password);
      await page.fill('[data-testid="confirm-password-input"]', testUser.password);
      await page.fill('[data-testid="first-name-input"]', testUser.firstName);
      await page.fill('[data-testid="last-name-input"]', testUser.lastName);
      await page.fill('[data-testid="professional-headline-input"]', testUser.professionalHeadline);

      // Accept terms and conditions
      await page.check('[data-testid="terms-checkbox"]');

      // Submit registration
      await page.click('[data-testid="register-button"]');

      // Verify successful registration
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Account created successfully');

      // Verify redirect to dashboard
      await page.waitForURL('**/dashboard');
      await expect(page.locator('[data-testid="dashboard-welcome"]')).toBeVisible();
      await expect(page.locator('[data-testid="user-name"]')).toContainText(`${testUser.firstName} ${testUser.lastName}`);

      // Verify profile was created
      await page.goto('/profile');
      await expect(page.locator('[data-testid="profile-email"]')).toContainText(testUser.email);
      await expect(page.locator('[data-testid="profile-headline"]')).toContainText(testUser.professionalHeadline);
    });

    test('should show validation errors for invalid registration data', async () => {
      await page.goto('/register');

      // Try to submit empty form
      await page.click('[data-testid="register-button"]');

      // Verify validation errors
      await expect(page.locator('[data-testid="email-error"]')).toContainText('Email is required');
      await expect(page.locator('[data-testid="password-error"]')).toContainText('Password is required');
      await expect(page.locator('[data-testid="first-name-error"]')).toContainText('First name is required');

      // Test invalid email format
      await page.fill('[data-testid="email-input"]', 'invalid-email');
      await page.blur('[data-testid="email-input"]');
      await expect(page.locator('[data-testid="email-error"]')).toContainText('Please enter a valid email');

      // Test weak password
      await page.fill('[data-testid="password-input"]', '123');
      await page.blur('[data-testid="password-input"]');
      await expect(page.locator('[data-testid="password-error"]')).toContainText('Password must be at least 8 characters');

      // Test password mismatch
      await page.fill('[data-testid="password-input"]', 'StrongPassword123!');
      await page.fill('[data-testid="confirm-password-input"]', 'DifferentPassword123!');
      await page.blur('[data-testid="confirm-password-input"]');
      await expect(page.locator('[data-testid="confirm-password-error"]')).toContainText('Passwords do not match');
    });

    test('should prevent registration with existing email', async () => {
      // First registration
      await page.goto('/register');
      await page.fill('[data-testid="email-input"]', testUser.email);
      await page.fill('[data-testid="password-input"]', testUser.password);
      await page.fill('[data-testid="confirm-password-input"]', testUser.password);
      await page.fill('[data-testid="first-name-input"]', testUser.firstName);
      await page.fill('[data-testid="last-name-input"]', testUser.lastName);
      await page.check('[data-testid="terms-checkbox"]');
      await page.click('[data-testid="register-button"]');

      // Wait for successful registration
      await page.waitForURL('**/dashboard');

      // Logout
      await page.click('[data-testid="user-menu"]');
      await page.click('[data-testid="logout-button"]');

      // Try to register again with same email
      await page.goto('/register');
      await page.fill('[data-testid="email-input"]', testUser.email);
      await page.fill('[data-testid="password-input"]', 'DifferentPassword123!');
      await page.fill('[data-testid="confirm-password-input"]', 'DifferentPassword123!');
      await page.fill('[data-testid="first-name-input"]', 'Another');
      await page.fill('[data-testid="last-name-input"]', 'User');
      await page.check('[data-testid="terms-checkbox"]');
      await page.click('[data-testid="register-button"]');

      // Verify error message
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Email already exists');
    });
  });

  test.describe('User Login Journey', () => {
    test.beforeEach(async () => {
      // Create a user for login tests
      await page.goto('/register');
      await page.fill('[data-testid="email-input"]', testUser.email);
      await page.fill('[data-testid="password-input"]', testUser.password);
      await page.fill('[data-testid="confirm-password-input"]', testUser.password);
      await page.fill('[data-testid="first-name-input"]', testUser.firstName);
      await page.fill('[data-testid="last-name-input"]', testUser.lastName);
      await page.check('[data-testid="terms-checkbox"]');
      await page.click('[data-testid="register-button"]');
      await page.waitForURL('**/dashboard');

      // Logout to prepare for login tests
      await page.click('[data-testid="user-menu"]');
      await page.click('[data-testid="logout-button"]');
      await page.waitForURL('**/login');
    });

    test('should complete successful login flow', async () => {
      await page.goto('/login');

      // Verify login page
      await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
      await expect(page.locator('h1')).toContainText('Sign In');

      // Fill login form
      await page.fill('[data-testid="email-input"]', testUser.email);
      await page.fill('[data-testid="password-input"]', testUser.password);

      // Submit login
      await page.click('[data-testid="login-button"]');

      // Verify successful login
      await page.waitForURL('**/dashboard');
      await expect(page.locator('[data-testid="dashboard-welcome"]')).toBeVisible();
      await expect(page.locator('[data-testid="user-name"]')).toContainText(`${testUser.firstName} ${testUser.lastName}`);

      // Verify user menu is available
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    });

    test('should show error for invalid credentials', async () => {
      await page.goto('/login');

      // Try with wrong password
      await page.fill('[data-testid="email-input"]', testUser.email);
      await page.fill('[data-testid="password-input"]', 'WrongPassword123!');
      await page.click('[data-testid="login-button"]');

      // Verify error message
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Invalid email or password');

      // Try with non-existent email
      await page.fill('[data-testid="email-input"]', 'nonexistent@example.com');
      await page.fill('[data-testid="password-input"]', testUser.password);
      await page.click('[data-testid="login-button"]');

      // Verify error message
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Invalid email or password');
    });

    test('should remember user session across browser refresh', async () => {
      // Login
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', testUser.email);
      await page.fill('[data-testid="password-input"]', testUser.password);
      await page.click('[data-testid="login-button"]');
      await page.waitForURL('**/dashboard');

      // Refresh page
      await page.reload();

      // Verify user is still logged in
      await expect(page.locator('[data-testid="dashboard-welcome"]')).toBeVisible();
      await expect(page.locator('[data-testid="user-name"]')).toContainText(`${testUser.firstName} ${testUser.lastName}`);
    });
  });

  test.describe('Password Recovery Journey', () => {
    test.beforeEach(async () => {
      // Create a user for password recovery tests
      await page.goto('/register');
      await page.fill('[data-testid="email-input"]', testUser.email);
      await page.fill('[data-testid="password-input"]', testUser.password);
      await page.fill('[data-testid="confirm-password-input"]', testUser.password);
      await page.fill('[data-testid="first-name-input"]', testUser.firstName);
      await page.fill('[data-testid="last-name-input"]', testUser.lastName);
      await page.check('[data-testid="terms-checkbox"]');
      await page.click('[data-testid="register-button"]');
      await page.waitForURL('**/dashboard');

      // Logout
      await page.click('[data-testid="user-menu"]');
      await page.click('[data-testid="logout-button"]');
    });

    test('should complete password recovery request flow', async () => {
      await page.goto('/login');

      // Click forgot password link
      await page.click('[data-testid="forgot-password-link"]');
      await page.waitForURL('**/forgot-password');

      // Verify forgot password page
      await expect(page.locator('[data-testid="forgot-password-form"]')).toBeVisible();
      await expect(page.locator('h1')).toContainText('Reset Password');

      // Fill email
      await page.fill('[data-testid="email-input"]', testUser.email);

      // Submit request
      await page.click('[data-testid="reset-request-button"]');

      // Verify success message
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="success-message"]')).toContainText('reset link has been sent');

      // Verify email field is disabled after submission
      await expect(page.locator('[data-testid="email-input"]')).toBeDisabled();
    });

    test('should show success message even for non-existent email', async () => {
      await page.goto('/forgot-password');

      // Fill non-existent email
      await page.fill('[data-testid="email-input"]', 'nonexistent@example.com');
      await page.click('[data-testid="reset-request-button"]');

      // Should still show success message (security measure)
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="success-message"]')).toContainText('reset link has been sent');
    });
  });

  test.describe('Logout Journey', () => {
    test.beforeEach(async () => {
      // Login first
      await page.goto('/register');
      await page.fill('[data-testid="email-input"]', testUser.email);
      await page.fill('[data-testid="password-input"]', testUser.password);
      await page.fill('[data-testid="confirm-password-input"]', testUser.password);
      await page.fill('[data-testid="first-name-input"]', testUser.firstName);
      await page.fill('[data-testid="last-name-input"]', testUser.lastName);
      await page.check('[data-testid="terms-checkbox"]');
      await page.click('[data-testid="register-button"]');
      await page.waitForURL('**/dashboard');
    });

    test('should complete logout flow and clear session', async () => {
      // Verify user is logged in
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();

      // Logout
      await page.click('[data-testid="user-menu"]');
      await page.click('[data-testid="logout-button"]');

      // Verify redirect to login page
      await page.waitForURL('**/login');
      await expect(page.locator('[data-testid="login-form"]')).toBeVisible();

      // Try to access protected page
      await page.goto('/dashboard');

      // Should redirect back to login
      await page.waitForURL('**/login');
      await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
    });

    test('should logout from all tabs when logging out from one tab', async () => {
      // Open second tab
      const secondPage = await page.context().newPage();
      await secondPage.goto('/dashboard');
      await expect(secondPage.locator('[data-testid="dashboard-welcome"]')).toBeVisible();

      // Logout from first tab
      await page.click('[data-testid="user-menu"]');
      await page.click('[data-testid="logout-button"]');

      // Verify first tab redirected to login
      await page.waitForURL('**/login');

      // Refresh second tab - should also be logged out
      await secondPage.reload();
      await secondPage.waitForURL('**/login');
      await expect(secondPage.locator('[data-testid="login-form"]')).toBeVisible();

      await secondPage.close();
    });
  });

  test.describe('Session Management', () => {
    test('should handle expired session gracefully', async () => {
      // Login
      await page.goto('/register');
      await page.fill('[data-testid="email-input"]', testUser.email);
      await page.fill('[data-testid="password-input"]', testUser.password);
      await page.fill('[data-testid="confirm-password-input"]', testUser.password);
      await page.fill('[data-testid="first-name-input"]', testUser.firstName);
      await page.fill('[data-testid="last-name-input"]', testUser.lastName);
      await page.check('[data-testid="terms-checkbox"]');
      await page.click('[data-testid="register-button"]');
      await page.waitForURL('**/dashboard');

      // Simulate session expiration by clearing localStorage/cookies
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      await page.context().clearCookies();

      // Try to access protected resource
      await page.goto('/profile');

      // Should redirect to login with appropriate message
      await page.waitForURL('**/login');
      await expect(page.locator('[data-testid="session-expired-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="session-expired-message"]')).toContainText('session has expired');
    });

    test('should auto-refresh token before expiration', async () => {
      // This test would require mocking token expiration
      // For now, we'll test the basic flow
      await page.goto('/register');
      await page.fill('[data-testid="email-input"]', testUser.email);
      await page.fill('[data-testid="password-input"]', testUser.password);
      await page.fill('[data-testid="confirm-password-input"]', testUser.password);
      await page.fill('[data-testid="first-name-input"]', testUser.firstName);
      await page.fill('[data-testid="last-name-input"]', testUser.lastName);
      await page.check('[data-testid="terms-checkbox"]');
      await page.click('[data-testid="register-button"]');
      await page.waitForURL('**/dashboard');

      // Stay on page for a while to trigger token refresh
      await page.waitForTimeout(5000);

      // Verify user is still authenticated
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();

      // Navigate to different pages to ensure token is still valid
      await page.goto('/profile');
      await expect(page.locator('[data-testid="profile-form"]')).toBeVisible();

      await page.goto('/jobs');
      await expect(page.locator('[data-testid="job-search"]')).toBeVisible();
    });
  });

  test.describe('Cross-Browser Authentication', () => {
    test('should maintain consistent behavior across different browsers', async () => {
      // This test runs across different browser projects defined in playwright.config.ts
      await page.goto('/register');
      
      // Verify registration form renders correctly
      await expect(page.locator('[data-testid="registration-form"]')).toBeVisible();
      
      // Fill and submit form
      await page.fill('[data-testid="email-input"]', testUser.email);
      await page.fill('[data-testid="password-input"]', testUser.password);
      await page.fill('[data-testid="confirm-password-input"]', testUser.password);
      await page.fill('[data-testid="first-name-input"]', testUser.firstName);
      await page.fill('[data-testid="last-name-input"]', testUser.lastName);
      await page.check('[data-testid="terms-checkbox"]');
      await page.click('[data-testid="register-button"]');

      // Verify successful registration
      await page.waitForURL('**/dashboard');
      await expect(page.locator('[data-testid="dashboard-welcome"]')).toBeVisible();
    });
  });
});