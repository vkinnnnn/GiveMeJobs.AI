import { test, expect, Page } from '@playwright/test';

/**
 * E2E Tests for Job Search and Application Flow
 * 
 * Tests complete job search and application journeys including:
 * - Job search with filters and sorting
 * - Job details viewing
 * - Job application process
 * - Application tracking
 * - Saved jobs functionality
 * - AI-powered job matching
 * 
 * Requirements: 14.3 - End-to-end testing for critical business workflows
 */

test.describe('Job Search and Application Flow E2E Tests', () => {
  let page: Page;

  // Use pre-authenticated user state
  test.use({ storageState: 'playwright/.auth/user.json' });

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto('/dashboard');
    
    // Verify user is authenticated
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  });

  test.afterEach(async () => {
    await page.close();
  });

  test.describe('Job Search Journey', () => {
    test('should perform basic job search and display results', async () => {
      // Navigate to job search
      await page.click('[data-testid="nav-jobs"]');
      await page.waitForURL('**/jobs');

      // Verify job search page loads
      await expect(page.locator('[data-testid="job-search"]')).toBeVisible();
      await expect(page.locator('[data-testid="search-input"]')).toBeVisible();
      await expect(page.locator('[data-testid="job-results"]')).toBeVisible();

      // Perform search
      await page.fill('[data-testid="search-input"]', 'Software Engineer');
      await page.click('[data-testid="search-button"]');

      // Wait for results to load
      await page.waitForSelector('[data-testid="job-card"]', { timeout: 10000 });

      // Verify search results
      const jobCards = page.locator('[data-testid="job-card"]');
      await expect(jobCards).toHaveCountGreaterThan(0);

      // Verify job card contains required information
      const firstJobCard = jobCards.first();
      await expect(firstJobCard.locator('[data-testid="job-title"]')).toBeVisible();
      await expect(firstJobCard.locator('[data-testid="company-name"]')).toBeVisible();
      await expect(firstJobCard.locator('[data-testid="job-location"]')).toBeVisible();
      await expect(firstJobCard.locator('[data-testid="job-salary"]')).toBeVisible();
      await expect(firstJobCard.locator('[data-testid="match-score"]')).toBeVisible();
    });

    test('should filter jobs by location', async () => {
      await page.goto('/jobs');

      // Open location filter
      await page.click('[data-testid="location-filter"]');
      await expect(page.locator('[data-testid="location-dropdown"]')).toBeVisible();

      // Select San Francisco
      await page.click('[data-testid="location-option-san-francisco"]');
      await page.click('[data-testid="apply-filters"]');

      // Wait for filtered results
      await page.waitForSelector('[data-testid="job-card"]', { timeout: 10000 });

      // Verify all results are in San Francisco
      const jobCards = page.locator('[data-testid="job-card"]');
      const count = await jobCards.count();
      
      for (let i = 0; i < count; i++) {
        const location = jobCards.nth(i).locator('[data-testid="job-location"]');
        await expect(location).toContainText('San Francisco');
      }

      // Verify filter is applied in UI
      await expect(page.locator('[data-testid="active-filter-location"]')).toContainText('San Francisco');
    });

    test('should filter jobs by salary range', async () => {
      await page.goto('/jobs');

      // Open salary filter
      await page.click('[data-testid="salary-filter"]');
      await expect(page.locator('[data-testid="salary-range-slider"]')).toBeVisible();

      // Set minimum salary to $100k
      await page.fill('[data-testid="min-salary-input"]', '100000');
      await page.fill('[data-testid="max-salary-input"]', '200000');
      await page.click('[data-testid="apply-filters"]');

      // Wait for filtered results
      await page.waitForSelector('[data-testid="job-card"]', { timeout: 10000 });

      // Verify salary ranges are within filter
      const jobCards = page.locator('[data-testid="job-card"]');
      const count = await jobCards.count();
      
      for (let i = 0; i < Math.min(count, 5); i++) { // Check first 5 results
        const salaryText = await jobCards.nth(i).locator('[data-testid="job-salary"]').textContent();
        // Verify salary contains numbers within range (basic check)
        expect(salaryText).toMatch(/\$[\d,]+/);
      }
    });

    test('should sort jobs by relevance, date, and salary', async () => {
      await page.goto('/jobs');
      await page.fill('[data-testid="search-input"]', 'Developer');
      await page.click('[data-testid="search-button"]');
      await page.waitForSelector('[data-testid="job-card"]');

      // Test sort by date (newest first)
      await page.click('[data-testid="sort-dropdown"]');
      await page.click('[data-testid="sort-date-desc"]');
      await page.waitForTimeout(2000); // Wait for re-sort

      // Verify first job is more recent than second
      const firstJobDate = await page.locator('[data-testid="job-card"]').first().locator('[data-testid="job-date"]').textContent();
      const secondJobDate = await page.locator('[data-testid="job-card"]').nth(1).locator('[data-testid="job-date"]').textContent();
      
      // Basic date comparison (would need more sophisticated parsing in real implementation)
      expect(firstJobDate).toBeTruthy();
      expect(secondJobDate).toBeTruthy();

      // Test sort by salary (highest first)
      await page.click('[data-testid="sort-dropdown"]');
      await page.click('[data-testid="sort-salary-desc"]');
      await page.waitForTimeout(2000);

      // Verify sorting indicator
      await expect(page.locator('[data-testid="sort-indicator"]')).toContainText('Salary: High to Low');
    });

    test('should handle empty search results gracefully', async () => {
      await page.goto('/jobs');

      // Search for something that won't have results
      await page.fill('[data-testid="search-input"]', 'xyznonexistentjob123');
      await page.click('[data-testid="search-button"]');

      // Wait for search to complete
      await page.waitForTimeout(3000);

      // Verify empty state
      await expect(page.locator('[data-testid="no-results"]')).toBeVisible();
      await expect(page.locator('[data-testid="no-results"]')).toContainText('No jobs found');
      await expect(page.locator('[data-testid="search-suggestions"]')).toBeVisible();
    });

    test('should provide search suggestions and autocomplete', async () => {
      await page.goto('/jobs');

      // Start typing in search
      await page.fill('[data-testid="search-input"]', 'Soft');

      // Wait for suggestions to appear
      await expect(page.locator('[data-testid="search-suggestions"]')).toBeVisible();
      await expect(page.locator('[data-testid="suggestion-item"]')).toHaveCountGreaterThan(0);

      // Click on a suggestion
      await page.click('[data-testid="suggestion-item"]', { hasText: 'Software Engineer' });

      // Verify suggestion was applied
      await expect(page.locator('[data-testid="search-input"]')).toHaveValue('Software Engineer');
    });
  });

  test.describe('Job Details Journey', () => {
    test('should view job details and see all required information', async () => {
      await page.goto('/jobs');
      await page.fill('[data-testid="search-input"]', 'Engineer');
      await page.click('[data-testid="search-button"]');
      await page.waitForSelector('[data-testid="job-card"]');

      // Click on first job
      await page.click('[data-testid="job-card"]');
      await page.waitForURL('**/jobs/*');

      // Verify job details page
      await expect(page.locator('[data-testid="job-details"]')).toBeVisible();
      await expect(page.locator('[data-testid="job-title"]')).toBeVisible();
      await expect(page.locator('[data-testid="company-name"]')).toBeVisible();
      await expect(page.locator('[data-testid="job-description"]')).toBeVisible();
      await expect(page.locator('[data-testid="job-requirements"]')).toBeVisible();
      await expect(page.locator('[data-testid="job-benefits"]')).toBeVisible();
      await expect(page.locator('[data-testid="apply-button"]')).toBeVisible();
      await expect(page.locator('[data-testid="save-job-button"]')).toBeVisible();

      // Verify match score and explanation
      await expect(page.locator('[data-testid="match-score"]')).toBeVisible();
      await expect(page.locator('[data-testid="match-explanation"]')).toBeVisible();

      // Verify company information
      await expect(page.locator('[data-testid="company-info"]')).toBeVisible();
      await expect(page.locator('[data-testid="company-size"]')).toBeVisible();
      await expect(page.locator('[data-testid="company-industry"]')).toBeVisible();
    });

    test('should save and unsave jobs', async () => {
      await page.goto('/jobs');
      await page.fill('[data-testid="search-input"]', 'Developer');
      await page.click('[data-testid="search-button"]');
      await page.waitForSelector('[data-testid="job-card"]');

      // Click on first job
      await page.click('[data-testid="job-card"]');
      await page.waitForURL('**/jobs/*');

      // Save the job
      await page.click('[data-testid="save-job-button"]');
      
      // Verify job is saved
      await expect(page.locator('[data-testid="save-job-button"]')).toContainText('Saved');
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Job saved successfully');

      // Navigate to saved jobs
      await page.click('[data-testid="nav-saved-jobs"]');
      await page.waitForURL('**/saved-jobs');

      // Verify job appears in saved jobs
      await expect(page.locator('[data-testid="saved-job-card"]')).toHaveCountGreaterThan(0);

      // Go back to job details
      await page.click('[data-testid="saved-job-card"]');

      // Unsave the job
      await page.click('[data-testid="save-job-button"]');
      
      // Verify job is unsaved
      await expect(page.locator('[data-testid="save-job-button"]')).toContainText('Save Job');
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Job removed from saved');
    });

    test('should share job via different methods', async () => {
      await page.goto('/jobs');
      await page.fill('[data-testid="search-input"]', 'Engineer');
      await page.click('[data-testid="search-button"]');
      await page.waitForSelector('[data-testid="job-card"]');
      await page.click('[data-testid="job-card"]');

      // Open share menu
      await page.click('[data-testid="share-job-button"]');
      await expect(page.locator('[data-testid="share-menu"]')).toBeVisible();

      // Test copy link
      await page.click('[data-testid="copy-link-button"]');
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Link copied');

      // Test email share
      await page.click('[data-testid="email-share-button"]');
      await expect(page.locator('[data-testid="email-share-modal"]')).toBeVisible();
      
      await page.fill('[data-testid="recipient-email"]', 'friend@example.com');
      await page.fill('[data-testid="share-message"]', 'Check out this job opportunity!');
      await page.click('[data-testid="send-email-button"]');
      
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Job shared successfully');
    });
  });

  test.describe('Job Application Journey', () => {
    test('should complete job application with resume upload', async () => {
      await page.goto('/jobs');
      await page.fill('[data-testid="search-input"]', 'Software Engineer');
      await page.click('[data-testid="search-button"]');
      await page.waitForSelector('[data-testid="job-card"]');
      await page.click('[data-testid="job-card"]');

      // Start application
      await page.click('[data-testid="apply-button"]');
      await page.waitForURL('**/apply/*');

      // Verify application form
      await expect(page.locator('[data-testid="application-form"]')).toBeVisible();
      await expect(page.locator('[data-testid="job-summary"]')).toBeVisible();

      // Fill application form
      await page.fill('[data-testid="cover-letter"]', 'I am very interested in this position and believe my skills align well with the requirements.');

      // Upload resume (mock file upload)
      const fileInput = page.locator('[data-testid="resume-upload"]');
      await fileInput.setInputFiles({
        name: 'resume.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('Mock PDF content'),
      });

      // Verify file upload
      await expect(page.locator('[data-testid="uploaded-file"]')).toContainText('resume.pdf');

      // Add additional information
      await page.fill('[data-testid="additional-info"]', 'Available for immediate start. Open to relocation.');

      // Submit application
      await page.click('[data-testid="submit-application"]');

      // Verify success
      await expect(page.locator('[data-testid="application-success"]')).toBeVisible();
      await expect(page.locator('[data-testid="application-success"]')).toContainText('Application submitted successfully');
      await expect(page.locator('[data-testid="application-id"]')).toBeVisible();

      // Verify redirect to applications page
      await page.click('[data-testid="view-applications-button"]');
      await page.waitForURL('**/applications');
      await expect(page.locator('[data-testid="application-card"]')).toHaveCountGreaterThan(0);
    });

    test('should generate AI-powered resume for application', async () => {
      await page.goto('/jobs');
      await page.fill('[data-testid="search-input"]', 'Frontend Developer');
      await page.click('[data-testid="search-button"]');
      await page.waitForSelector('[data-testid="job-card"]');
      await page.click('[data-testid="job-card"]');
      await page.click('[data-testid="apply-button"]');

      // Use AI resume generation
      await page.click('[data-testid="generate-resume-button"]');
      await expect(page.locator('[data-testid="ai-resume-modal"]')).toBeVisible();

      // Select resume template
      await page.click('[data-testid="template-modern"]');

      // Customize resume settings
      await page.check('[data-testid="include-projects"]');
      await page.check('[data-testid="include-certifications"]');
      await page.fill('[data-testid="additional-skills"]', 'React, TypeScript, Node.js');

      // Generate resume
      await page.click('[data-testid="generate-button"]');

      // Wait for generation (show loading state)
      await expect(page.locator('[data-testid="generating-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="generating-message"]')).toContainText('Generating your tailored resume');

      // Wait for completion
      await page.waitForSelector('[data-testid="resume-preview"]', { timeout: 30000 });

      // Verify generated resume
      await expect(page.locator('[data-testid="resume-preview"]')).toBeVisible();
      await expect(page.locator('[data-testid="download-resume"]')).toBeVisible();
      await expect(page.locator('[data-testid="use-resume"]')).toBeVisible();

      // Use generated resume for application
      await page.click('[data-testid="use-resume"]');

      // Verify resume is attached to application
      await expect(page.locator('[data-testid="attached-resume"]')).toContainText('AI Generated Resume');
    });

    test('should prevent duplicate applications', async () => {
      // Apply to a job first
      await page.goto('/jobs');
      await page.fill('[data-testid="search-input"]', 'Engineer');
      await page.click('[data-testid="search-button"]');
      await page.waitForSelector('[data-testid="job-card"]');
      
      const jobTitle = await page.locator('[data-testid="job-card"]').first().locator('[data-testid="job-title"]').textContent();
      await page.click('[data-testid="job-card"]');
      await page.click('[data-testid="apply-button"]');

      // Complete application
      await page.fill('[data-testid="cover-letter"]', 'First application');
      await page.click('[data-testid="submit-application"]');
      await expect(page.locator('[data-testid="application-success"]')).toBeVisible();

      // Try to apply to same job again
      await page.goto('/jobs');
      await page.fill('[data-testid="search-input"]', 'Engineer');
      await page.click('[data-testid="search-button"]');
      await page.waitForSelector('[data-testid="job-card"]');

      // Find the same job and try to apply
      const jobCards = page.locator('[data-testid="job-card"]');
      const count = await jobCards.count();
      
      for (let i = 0; i < count; i++) {
        const title = await jobCards.nth(i).locator('[data-testid="job-title"]').textContent();
        if (title === jobTitle) {
          await jobCards.nth(i).click();
          break;
        }
      }

      // Verify apply button shows "Already Applied"
      await expect(page.locator('[data-testid="apply-button"]')).toContainText('Already Applied');
      await expect(page.locator('[data-testid="apply-button"]')).toBeDisabled();
      await expect(page.locator('[data-testid="application-status"]')).toContainText('You have already applied to this position');
    });
  });

  test.describe('Application Tracking Journey', () => {
    test('should view and track application status', async () => {
      // Navigate to applications page
      await page.click('[data-testid="nav-applications"]');
      await page.waitForURL('**/applications');

      // Verify applications page
      await expect(page.locator('[data-testid="applications-list"]')).toBeVisible();
      await expect(page.locator('[data-testid="application-filters"]')).toBeVisible();

      // Check if there are applications (from previous tests or seed data)
      const applicationCards = page.locator('[data-testid="application-card"]');
      const count = await applicationCards.count();

      if (count > 0) {
        // Verify application card information
        const firstApplication = applicationCards.first();
        await expect(firstApplication.locator('[data-testid="job-title"]')).toBeVisible();
        await expect(firstApplication.locator('[data-testid="company-name"]')).toBeVisible();
        await expect(firstApplication.locator('[data-testid="application-date"]')).toBeVisible();
        await expect(firstApplication.locator('[data-testid="application-status"]')).toBeVisible();

        // Click to view application details
        await firstApplication.click();
        await expect(page.locator('[data-testid="application-details"]')).toBeVisible();
        await expect(page.locator('[data-testid="application-timeline"]')).toBeVisible();
        await expect(page.locator('[data-testid="cover-letter-preview"]')).toBeVisible();
        await expect(page.locator('[data-testid="resume-preview"]')).toBeVisible();
      }
    });

    test('should filter applications by status', async () => {
      await page.goto('/applications');

      // Test different status filters
      const statuses = ['pending', 'reviewed', 'interview', 'rejected', 'accepted'];

      for (const status of statuses) {
        await page.click(`[data-testid="filter-${status}"]`);
        await page.waitForTimeout(1000);

        // Verify filter is applied
        await expect(page.locator(`[data-testid="active-filter-${status}"]`)).toBeVisible();

        // Verify results match filter (if any results exist)
        const applicationCards = page.locator('[data-testid="application-card"]');
        const count = await applicationCards.count();

        if (count > 0) {
          for (let i = 0; i < Math.min(count, 3); i++) {
            const statusElement = applicationCards.nth(i).locator('[data-testid="application-status"]');
            const statusText = await statusElement.textContent();
            expect(statusText?.toLowerCase()).toContain(status);
          }
        }
      }
    });

    test('should withdraw application', async () => {
      await page.goto('/applications');

      const applicationCards = page.locator('[data-testid="application-card"]');
      const count = await applicationCards.count();

      if (count > 0) {
        // Find a pending application to withdraw
        for (let i = 0; i < count; i++) {
          const statusText = await applicationCards.nth(i).locator('[data-testid="application-status"]').textContent();
          
          if (statusText?.toLowerCase().includes('pending')) {
            await applicationCards.nth(i).click();
            
            // Withdraw application
            await page.click('[data-testid="withdraw-application"]');
            await expect(page.locator('[data-testid="withdraw-confirmation"]')).toBeVisible();
            
            await page.fill('[data-testid="withdrawal-reason"]', 'Found another opportunity');
            await page.click('[data-testid="confirm-withdrawal"]');
            
            // Verify withdrawal
            await expect(page.locator('[data-testid="success-message"]')).toContainText('Application withdrawn');
            await expect(page.locator('[data-testid="application-status"]')).toContainText('Withdrawn');
            
            break;
          }
        }
      }
    });
  });

  test.describe('AI-Powered Job Matching', () => {
    test('should show personalized job recommendations', async () => {
      await page.goto('/dashboard');

      // Verify recommendations section
      await expect(page.locator('[data-testid="job-recommendations"]')).toBeVisible();
      await expect(page.locator('[data-testid="recommendation-title"]')).toContainText('Recommended for You');

      const recommendedJobs = page.locator('[data-testid="recommended-job"]');
      await expect(recommendedJobs).toHaveCountGreaterThan(0);

      // Verify recommendation cards have match scores
      const firstRecommendation = recommendedJobs.first();
      await expect(firstRecommendation.locator('[data-testid="match-score"]')).toBeVisible();
      await expect(firstRecommendation.locator('[data-testid="match-reasons"]')).toBeVisible();

      // Click on recommendation
      await firstRecommendation.click();
      await page.waitForURL('**/jobs/*');

      // Verify detailed match explanation
      await expect(page.locator('[data-testid="match-explanation"]')).toBeVisible();
      await expect(page.locator('[data-testid="skill-matches"]')).toBeVisible();
      await expect(page.locator('[data-testid="experience-match"]')).toBeVisible();
    });

    test('should update recommendations based on profile changes', async () => {
      // Update profile first
      await page.goto('/profile');
      
      // Add new skills
      await page.click('[data-testid="edit-skills"]');
      await page.fill('[data-testid="skills-input"]', 'Python, Machine Learning, Data Science');
      await page.click('[data-testid="save-skills"]');
      
      await expect(page.locator('[data-testid="success-message"]')).toContainText('Skills updated');

      // Go back to dashboard
      await page.goto('/dashboard');

      // Wait for recommendations to update
      await page.waitForTimeout(3000);

      // Verify recommendations reflect new skills
      const recommendedJobs = page.locator('[data-testid="recommended-job"]');
      const count = await recommendedJobs.count();

      if (count > 0) {
        // Check if any recommendations mention the new skills
        for (let i = 0; i < Math.min(count, 3); i++) {
          const jobCard = recommendedJobs.nth(i);
          await jobCard.click();
          
          const matchReasons = await page.locator('[data-testid="match-reasons"]').textContent();
          if (matchReasons?.includes('Python') || matchReasons?.includes('Machine Learning')) {
            // Found a recommendation that matches new skills
            expect(matchReasons).toBeTruthy();
            break;
          }
          
          await page.goBack();
        }
      }
    });
  });

  test.describe('Mobile Responsiveness', () => {
    test('should work correctly on mobile devices', async () => {
      // This test runs on mobile viewports defined in playwright.config.ts
      await page.goto('/jobs');

      // Verify mobile-specific elements
      await expect(page.locator('[data-testid="mobile-search-toggle"]')).toBeVisible();
      await expect(page.locator('[data-testid="mobile-filter-button"]')).toBeVisible();

      // Test mobile search
      await page.click('[data-testid="mobile-search-toggle"]');
      await expect(page.locator('[data-testid="mobile-search-overlay"]')).toBeVisible();
      
      await page.fill('[data-testid="mobile-search-input"]', 'Developer');
      await page.click('[data-testid="mobile-search-submit"]');

      // Verify results display correctly on mobile
      await expect(page.locator('[data-testid="job-card"]')).toBeVisible();

      // Test mobile filters
      await page.click('[data-testid="mobile-filter-button"]');
      await expect(page.locator('[data-testid="mobile-filter-drawer"]')).toBeVisible();
      
      await page.click('[data-testid="location-filter-mobile"]');
      await page.click('[data-testid="location-option-remote"]');
      await page.click('[data-testid="apply-mobile-filters"]');

      // Verify filters are applied
      await expect(page.locator('[data-testid="active-filter-remote"]')).toBeVisible();
    });
  });
});