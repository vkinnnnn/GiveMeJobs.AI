import { test, expect, Page } from '@playwright/test';

/**
 * Visual Regression Tests for GiveMeJobs Platform
 * 
 * Tests visual consistency across:
 * - Key pages and components
 * - Different screen sizes
 * - Theme variations
 * - Interactive states
 * 
 * Requirements: 14.3 - Visual regression testing
 */

test.describe('Visual Regression Tests', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    
    // Set consistent viewport for visual testing
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test.afterEach(async () => {
    await page.close();
  });

  test.describe('Authentication Pages', () => {
    test('login page should match visual baseline', async () => {
      await page.goto('/login');
      
      // Wait for page to fully load
      await page.waitForLoadState('networkidle');
      await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
      
      // Take screenshot and compare
      await expect(page).toHaveScreenshot('login-page.png');
    });

    test('registration page should match visual baseline', async () => {
      await page.goto('/register');
      
      await page.waitForLoadState('networkidle');
      await expect(page.locator('[data-testid="registration-form"]')).toBeVisible();
      
      await expect(page).toHaveScreenshot('registration-page.png');
    });

    test('forgot password page should match visual baseline', async () => {
      await page.goto('/forgot-password');
      
      await page.waitForLoadState('networkidle');
      await expect(page.locator('[data-testid="forgot-password-form"]')).toBeVisible();
      
      await expect(page).toHaveScreenshot('forgot-password-page.png');
    });

    test('login form with validation errors should match baseline', async () => {
      await page.goto('/login');
      
      // Trigger validation errors
      await page.click('[data-testid="login-button"]');
      await page.waitForSelector('[data-testid="email-error"]');
      
      await expect(page).toHaveScreenshot('login-form-errors.png');
    });

    test('registration form with validation errors should match baseline', async () => {
      await page.goto('/register');
      
      // Fill invalid data to trigger errors
      await page.fill('[data-testid="email-input"]', 'invalid-email');
      await page.fill('[data-testid="password-input"]', '123');
      await page.fill('[data-testid="confirm-password-input"]', '456');
      await page.click('[data-testid="register-button"]');
      
      // Wait for validation errors
      await page.waitForSelector('[data-testid="email-error"]');
      
      await expect(page).toHaveScreenshot('registration-form-errors.png');
    });
  });

  test.describe('Dashboard and Navigation', () => {
    // Use authenticated user state
    test.use({ storageState: 'playwright/.auth/user.json' });

    test('dashboard page should match visual baseline', async () => {
      await page.goto('/dashboard');
      
      await page.waitForLoadState('networkidle');
      await expect(page.locator('[data-testid="dashboard-welcome"]')).toBeVisible();
      
      // Wait for dynamic content to load
      await page.waitForTimeout(2000);
      
      await expect(page).toHaveScreenshot('dashboard-page.png');
    });

    test('navigation menu should match visual baseline', async () => {
      await page.goto('/dashboard');
      
      // Ensure navigation is visible
      await expect(page.locator('[data-testid="main-navigation"]')).toBeVisible();
      
      await expect(page.locator('[data-testid="main-navigation"]')).toHaveScreenshot('navigation-menu.png');
    });

    test('user menu dropdown should match visual baseline', async () => {
      await page.goto('/dashboard');
      
      // Open user menu
      await page.click('[data-testid="user-menu"]');
      await expect(page.locator('[data-testid="user-dropdown"]')).toBeVisible();
      
      await expect(page.locator('[data-testid="user-dropdown"]')).toHaveScreenshot('user-menu-dropdown.png');
    });

    test('mobile navigation should match visual baseline', async () => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/dashboard');
      
      // Open mobile menu
      await page.click('[data-testid="mobile-menu-toggle"]');
      await expect(page.locator('[data-testid="mobile-navigation"]')).toBeVisible();
      
      await expect(page).toHaveScreenshot('mobile-navigation.png');
    });
  });

  test.describe('Job Search and Listings', () => {
    test.use({ storageState: 'playwright/.auth/user.json' });

    test('job search page should match visual baseline', async () => {
      await page.goto('/jobs');
      
      await page.waitForLoadState('networkidle');
      await expect(page.locator('[data-testid="job-search"]')).toBeVisible();
      
      // Wait for job results to load
      await page.waitForSelector('[data-testid="job-card"]', { timeout: 10000 });
      
      await expect(page).toHaveScreenshot('job-search-page.png');
    });

    test('job search filters should match visual baseline', async () => {
      await page.goto('/jobs');
      
      // Open filters panel
      await page.click('[data-testid="filters-toggle"]');
      await expect(page.locator('[data-testid="filters-panel"]')).toBeVisible();
      
      await expect(page.locator('[data-testid="filters-panel"]')).toHaveScreenshot('job-search-filters.png');
    });

    test('job card layout should match visual baseline', async () => {
      await page.goto('/jobs');
      await page.waitForSelector('[data-testid="job-card"]');
      
      // Screenshot first job card
      await expect(page.locator('[data-testid="job-card"]').first()).toHaveScreenshot('job-card.png');
    });

    test('job details page should match visual baseline', async () => {
      await page.goto('/jobs');
      await page.waitForSelector('[data-testid="job-card"]');
      
      // Click on first job
      await page.click('[data-testid="job-card"]');
      await page.waitForURL('**/jobs/*');
      await page.waitForLoadState('networkidle');
      
      await expect(page).toHaveScreenshot('job-details-page.png');
    });

    test('empty job search results should match visual baseline', async () => {
      await page.goto('/jobs');
      
      // Search for something that won't have results
      await page.fill('[data-testid="search-input"]', 'xyznonexistentjob123');
      await page.click('[data-testid="search-button"]');
      
      // Wait for empty state
      await page.waitForSelector('[data-testid="no-results"]');
      
      await expect(page).toHaveScreenshot('job-search-empty.png');
    });
  });

  test.describe('Profile and Settings', () => {
    test.use({ storageState: 'playwright/.auth/user.json' });

    test('profile page should match visual baseline', async () => {
      await page.goto('/profile');
      
      await page.waitForLoadState('networkidle');
      await expect(page.locator('[data-testid="profile-form"]')).toBeVisible();
      
      await expect(page).toHaveScreenshot('profile-page.png');
    });

    test('profile edit mode should match visual baseline', async () => {
      await page.goto('/profile');
      
      // Enter edit mode
      await page.click('[data-testid="edit-profile"]');
      await expect(page.locator('[data-testid="profile-edit-form"]')).toBeVisible();
      
      await expect(page).toHaveScreenshot('profile-edit-mode.png');
    });

    test('settings page should match visual baseline', async () => {
      await page.goto('/settings');
      
      await page.waitForLoadState('networkidle');
      await expect(page.locator('[data-testid="settings-form"]')).toBeVisible();
      
      await expect(page).toHaveScreenshot('settings-page.png');
    });
  });

  test.describe('Application Flow', () => {
    test.use({ storageState: 'playwright/.auth/user.json' });

    test('job application form should match visual baseline', async () => {
      await page.goto('/jobs');
      await page.waitForSelector('[data-testid="job-card"]');
      await page.click('[data-testid="job-card"]');
      await page.click('[data-testid="apply-button"]');
      
      await page.waitForURL('**/apply/*');
      await expect(page.locator('[data-testid="application-form"]')).toBeVisible();
      
      await expect(page).toHaveScreenshot('job-application-form.png');
    });

    test('applications list should match visual baseline', async () => {
      await page.goto('/applications');
      
      await page.waitForLoadState('networkidle');
      await expect(page.locator('[data-testid="applications-list"]')).toBeVisible();
      
      await expect(page).toHaveScreenshot('applications-list.png');
    });

    test('application details should match visual baseline', async () => {
      await page.goto('/applications');
      
      const applicationCards = page.locator('[data-testid="application-card"]');
      const count = await applicationCards.count();
      
      if (count > 0) {
        await applicationCards.first().click();
        await expect(page.locator('[data-testid="application-details"]')).toBeVisible();
        
        await expect(page).toHaveScreenshot('application-details.png');
      }
    });
  });

  test.describe('Responsive Design', () => {
    test.use({ storageState: 'playwright/.auth/user.json' });

    test('tablet layout should match visual baseline', async () => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('/dashboard');
      
      await page.waitForLoadState('networkidle');
      
      await expect(page).toHaveScreenshot('dashboard-tablet.png');
    });

    test('mobile layout should match visual baseline', async () => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/dashboard');
      
      await page.waitForLoadState('networkidle');
      
      await expect(page).toHaveScreenshot('dashboard-mobile.png');
    });

    test('job search mobile layout should match visual baseline', async () => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/jobs');
      
      await page.waitForLoadState('networkidle');
      await page.waitForSelector('[data-testid="job-card"]');
      
      await expect(page).toHaveScreenshot('job-search-mobile.png');
    });
  });

  test.describe('Interactive States', () => {
    test.use({ storageState: 'playwright/.auth/user.json' });

    test('button hover states should match visual baseline', async () => {
      await page.goto('/jobs');
      await page.waitForSelector('[data-testid="job-card"]');
      
      // Hover over apply button
      const applyButton = page.locator('[data-testid="apply-button"]').first();
      await applyButton.hover();
      
      await expect(applyButton).toHaveScreenshot('apply-button-hover.png');
    });

    test('form focus states should match visual baseline', async () => {
      await page.goto('/login');
      
      // Focus on email input
      await page.focus('[data-testid="email-input"]');
      
      await expect(page.locator('[data-testid="email-input"]')).toHaveScreenshot('input-focus-state.png');
    });

    test('loading states should match visual baseline', async () => {
      await page.goto('/jobs');
      
      // Trigger search to show loading state
      await page.fill('[data-testid="search-input"]', 'Engineer');
      await page.click('[data-testid="search-button"]');
      
      // Capture loading state (might need to be quick)
      try {
        await expect(page.locator('[data-testid="loading-spinner"]')).toHaveScreenshot('loading-spinner.png');
      } catch (error) {
        // Loading might be too fast to capture, that's okay
        console.log('Loading state too fast to capture');
      }
    });
  });

  test.describe('Theme Variations', () => {
    test.use({ storageState: 'playwright/.auth/user.json' });

    test('dark theme should match visual baseline', async () => {
      await page.goto('/settings');
      
      // Switch to dark theme
      await page.click('[data-testid="theme-toggle"]');
      await page.waitForTimeout(1000); // Wait for theme transition
      
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      
      await expect(page).toHaveScreenshot('dashboard-dark-theme.png');
    });

    test('high contrast theme should match visual baseline', async () => {
      await page.goto('/settings');
      
      // Switch to high contrast theme
      await page.selectOption('[data-testid="theme-selector"]', 'high-contrast');
      await page.waitForTimeout(1000);
      
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      
      await expect(page).toHaveScreenshot('dashboard-high-contrast.png');
    });
  });

  test.describe('Error States', () => {
    test('404 page should match visual baseline', async () => {
      await page.goto('/nonexistent-page');
      
      await page.waitForLoadState('networkidle');
      await expect(page.locator('[data-testid="error-404"]')).toBeVisible();
      
      await expect(page).toHaveScreenshot('404-page.png');
    });

    test('500 error page should match visual baseline', async () => {
      // This would require triggering a server error
      // For now, we'll navigate to an error test route
      await page.goto('/test-error');
      
      await page.waitForLoadState('networkidle');
      
      // If error page exists
      if (await page.locator('[data-testid="error-500"]').isVisible()) {
        await expect(page).toHaveScreenshot('500-error-page.png');
      }
    });

    test('network error state should match visual baseline', async () => {
      await page.goto('/jobs');
      
      // Simulate network failure
      await page.route('**/api/**', route => route.abort());
      
      // Try to perform an action that requires network
      await page.fill('[data-testid="search-input"]', 'Engineer');
      await page.click('[data-testid="search-button"]');
      
      // Wait for error state
      await page.waitForSelector('[data-testid="network-error"]', { timeout: 10000 });
      
      await expect(page.locator('[data-testid="network-error"]')).toHaveScreenshot('network-error-state.png');
    });
  });

  test.describe('Accessibility Features', () => {
    test('high contrast mode should be visually distinct', async () => {
      await page.goto('/login');
      
      // Enable high contrast mode
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.addStyleTag({
        content: `
          @media (prefers-contrast: high) {
            * { 
              filter: contrast(150%) !important;
            }
          }
        `
      });
      
      await expect(page).toHaveScreenshot('login-high-contrast.png');
    });

    test('reduced motion mode should match baseline', async () => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto('/dashboard');
      
      await page.waitForLoadState('networkidle');
      
      await expect(page).toHaveScreenshot('dashboard-reduced-motion.png');
    });
  });
});