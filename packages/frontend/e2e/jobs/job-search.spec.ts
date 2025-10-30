import { test, expect } from '@playwright/test';
import { login, navigateTo, TEST_USERS, mockApiResponse } from '../helpers/test-utils';
import { testJobs } from '../fixtures/test-data';

/**
 * E2E tests for job search functionality
 * Requirements: 3.1, 3.2, 3.3
 */

test.describe('Job Search', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_USERS.regular);
  });

  test('should display job search interface', async ({ page }) => {
    await navigateTo(page, '/jobs/search');
    
    await expect(page.getByRole('heading', { name: /job search|find jobs/i })).toBeVisible();
    await expect(page.getByPlaceholder(/search.*jobs|job title|keywords/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /search|find jobs/i })).toBeVisible();
  });

  test('should search for jobs and display results within 3 seconds', async ({ page }) => {
    await navigateTo(page, '/jobs/search');
    
    // Mock API response
    await mockApiResponse(page, /\/api\/jobs\/search/, {
      jobs: testJobs,
      total: testJobs.length,
      page: 1,
      totalPages: 1,
    });
    
    const startTime = Date.now();
    
    await page.getByPlaceholder(/search.*jobs|job title|keywords/i).fill('Software Engineer');
    await page.getByRole('button', { name: /search|find jobs/i }).click();
    
    // Wait for results
    await page.waitForSelector('[data-testid="job-card"]', { timeout: 3000 });
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Requirement 3.1: Return results within 3 seconds
    expect(duration).toBeLessThan(3000);
    
    // Check if results are displayed
    const jobCards = await page.locator('[data-testid="job-card"]').count();
    expect(jobCards).toBeGreaterThan(0);
  });

  test('should display match score for each job', async ({ page }) => {
    await navigateTo(page, '/jobs/search');
    
    await mockApiResponse(page, /\/api\/jobs\/search/, {
      jobs: testJobs,
      total: testJobs.length,
    });
    
    await page.getByPlaceholder(/search.*jobs|job title|keywords/i).fill('Developer');
    await page.getByRole('button', { name: /search|find jobs/i }).click();
    
    await page.waitForSelector('[data-testid="job-card"]');
    
    // Requirement 3.2: Show match score (0-100%)
    const matchScores = await page.locator('[data-testid="match-score"]').all();
    expect(matchScores.length).toBeGreaterThan(0);
    
    for (const score of matchScores) {
      const text = await score.textContent();
      expect(text).toMatch(/\d+%/);
    }
  });

  test('should filter jobs by location', async ({ page }) => {
    await navigateTo(page, '/jobs/search');
    
    await page.getByLabel(/location/i).fill('San Francisco');
    await page.getByRole('button', { name: /search|find jobs/i }).click();
    
    await page.waitForSelector('[data-testid="job-card"]');
    
    // Check if location filter is applied
    const jobLocations = await page.locator('[data-testid="job-location"]').allTextContents();
    jobLocations.forEach(location => {
      expect(location.toLowerCase()).toContain('san francisco');
    });
  });

  test('should filter jobs by remote type', async ({ page }) => {
    await navigateTo(page, '/jobs/search');
    
    await page.getByLabel(/remote/i).selectOption('remote');
    await page.getByRole('button', { name: /search|find jobs/i }).click();
    
    await page.waitForSelector('[data-testid="job-card"]');
    
    // Check if remote filter is applied
    const remoteLabels = await page.locator('[data-testid="remote-type"]').allTextContents();
    remoteLabels.forEach(label => {
      expect(label.toLowerCase()).toContain('remote');
    });
  });

  test('should filter jobs by salary range', async ({ page }) => {
    await navigateTo(page, '/jobs/search');
    
    await page.getByLabel(/minimum salary/i).fill('100000');
    await page.getByRole('button', { name: /search|find jobs/i }).click();
    
    await page.waitForSelector('[data-testid="job-card"]');
    
    // Check if salary filter is applied
    const salaries = await page.locator('[data-testid="job-salary"]').allTextContents();
    salaries.forEach(salary => {
      const amount = parseInt(salary.replace(/[^0-9]/g, ''));
      expect(amount).toBeGreaterThanOrEqual(100000);
    });
  });

  test('should save a job for later', async ({ page }) => {
    await navigateTo(page, '/jobs/search');
    
    await mockApiResponse(page, /\/api\/jobs\/search/, {
      jobs: testJobs,
      total: testJobs.length,
    });
    
    await page.getByPlaceholder(/search.*jobs|job title|keywords/i).fill('Engineer');
    await page.getByRole('button', { name: /search|find jobs/i }).click();
    
    await page.waitForSelector('[data-testid="job-card"]');
    
    // Requirement 3.5: Save job
    await page.locator('[data-testid="save-job-button"]').first().click();
    
    await expect(page.getByText(/job saved|saved successfully/i)).toBeVisible();
  });

  test('should view job details', async ({ page }) => {
    await navigateTo(page, '/jobs/search');
    
    await mockApiResponse(page, /\/api\/jobs\/search/, {
      jobs: testJobs,
      total: testJobs.length,
    });
    
    await page.getByPlaceholder(/search.*jobs|job title|keywords/i).fill('Engineer');
    await page.getByRole('button', { name: /search|find jobs/i }).click();
    
    await page.waitForSelector('[data-testid="job-card"]');
    
    // Click on first job
    await page.locator('[data-testid="job-card"]').first().click();
    
    // Requirement 3.3: View job details with matching skills
    await expect(page.getByRole('heading', { name: testJobs[0].title })).toBeVisible();
    await expect(page.getByText(/requirements|qualifications/i)).toBeVisible();
    await expect(page.getByText(/matching skills|your skills/i)).toBeVisible();
  });

  test('should display missing requirements', async ({ page }) => {
    await navigateTo(page, '/jobs/search');
    
    await mockApiResponse(page, /\/api\/jobs\/search/, {
      jobs: testJobs,
      total: testJobs.length,
    });
    
    await page.getByPlaceholder(/search.*jobs|job title|keywords/i).fill('Engineer');
    await page.getByRole('button', { name: /search|find jobs/i }).click();
    
    await page.waitForSelector('[data-testid="job-card"]');
    await page.locator('[data-testid="job-card"]').first().click();
    
    // Requirement 3.3: Identify missing requirements
    await expect(page.getByText(/missing.*skills|skills.*gap/i)).toBeVisible();
  });

  test('should paginate search results', async ({ page }) => {
    await navigateTo(page, '/jobs/search');
    
    await page.getByPlaceholder(/search.*jobs|job title|keywords/i).fill('Developer');
    await page.getByRole('button', { name: /search|find jobs/i }).click();
    
    await page.waitForSelector('[data-testid="job-card"]');
    
    // Check pagination controls
    await expect(page.getByRole('button', { name: /next|page 2/i })).toBeVisible();
    
    await page.getByRole('button', { name: /next|page 2/i }).click();
    
    // Should load next page
    await page.waitForSelector('[data-testid="job-card"]');
  });

  test('should display empty state when no jobs found', async ({ page }) => {
    await navigateTo(page, '/jobs/search');
    
    await mockApiResponse(page, /\/api\/jobs\/search/, {
      jobs: [],
      total: 0,
    });
    
    await page.getByPlaceholder(/search.*jobs|job title|keywords/i).fill('NonexistentJobTitle12345');
    await page.getByRole('button', { name: /search|find jobs/i }).click();
    
    await expect(page.getByText(/no jobs found|no results/i)).toBeVisible();
  });
});
