import { test, expect } from '@playwright/test';
import { login, navigateTo, TEST_USERS, mockApiResponse, clickButton } from '../helpers/test-utils';
import { testJobs, testResume, testCoverLetter } from '../fixtures/test-data';

/**
 * E2E tests for job application flow
 * Requirements: 4.1, 5.1
 */

test.describe('Job Application', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_USERS.regular);
  });

  test('should navigate to application page from job details', async ({ page }) => {
    await navigateTo(page, `/jobs/${testJobs[0].id}`);
    
    await mockApiResponse(page, /\/api\/jobs\/.*/, testJobs[0]);
    
    await clickButton(page, /apply now|apply for this job/i);
    
    await page.waitForURL(`/jobs/${testJobs[0].id}/apply`);
    await expect(page.getByRole('heading', { name: /apply for|application/i })).toBeVisible();
  });

  test('should generate tailored resume and cover letter within 10 seconds', async ({ page }) => {
    await navigateTo(page, `/jobs/${testJobs[0].id}/apply`);
    
    // Mock document generation API
    await mockApiResponse(page, /\/api\/documents\/resume\/generate/, testResume);
    await mockApiResponse(page, /\/api\/documents\/cover-letter\/generate/, testCoverLetter);
    
    const startTime = Date.now();
    
    await clickButton(page, /generate.*documents|auto-generate/i);
    
    // Wait for documents to be generated
    await page.waitForSelector('[data-testid="generated-resume"]', { timeout: 10000 });
    await page.waitForSelector('[data-testid="generated-cover-letter"]', { timeout: 10000 });
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Requirement 4.4: Complete within 10 seconds
    expect(duration).toBeLessThan(10000);
    
    // Check if documents are displayed
    await expect(page.getByText(/resume generated|resume ready/i)).toBeVisible();
    await expect(page.getByText(/cover letter generated|cover letter ready/i)).toBeVisible();
  });

  test('should preview generated resume', async ({ page }) => {
    await navigateTo(page, `/jobs/${testJobs[0].id}/apply`);
    
    await mockApiResponse(page, /\/api\/documents\/resume\/generate/, testResume);
    
    await clickButton(page, /generate.*resume/i);
    await page.waitForSelector('[data-testid="generated-resume"]');
    
    await clickButton(page, /preview.*resume|view.*resume/i);
    
    // Should open preview modal or page
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText(testResume.content.sections[0].content)).toBeVisible();
  });

  test('should edit generated resume', async ({ page }) => {
    await navigateTo(page, `/jobs/${testJobs[0].id}/apply`);
    
    await mockApiResponse(page, /\/api\/documents\/resume\/generate/, testResume);
    
    await clickButton(page, /generate.*resume/i);
    await page.waitForSelector('[data-testid="generated-resume"]');
    
    // Requirement 4.5: Provide editor for manual adjustments
    await clickButton(page, /edit.*resume/i);
    
    await expect(page.getByRole('textbox', { name: /resume.*content|edit.*resume/i })).toBeVisible();
    
    // Make an edit
    await page.getByRole('textbox', { name: /resume.*content|edit.*resume/i }).fill('Updated content');
    await clickButton(page, /save|update/i);
    
    await expect(page.getByText(/saved|updated successfully/i)).toBeVisible();
  });

  test('should download resume in multiple formats', async ({ page }) => {
    await navigateTo(page, `/jobs/${testJobs[0].id}/apply`);
    
    await mockApiResponse(page, /\/api\/documents\/resume\/generate/, testResume);
    
    await clickButton(page, /generate.*resume/i);
    await page.waitForSelector('[data-testid="generated-resume"]');
    
    // Requirement 4.6: Store in multiple formats
    const downloadPromise = page.waitForEvent('download');
    
    await page.getByRole('button', { name: /download/i }).click();
    await page.getByRole('menuitem', { name: /pdf/i }).click();
    
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.pdf$/);
  });

  test('should submit application', async ({ page }) => {
    await navigateTo(page, `/jobs/${testJobs[0].id}/apply`);
    
    await mockApiResponse(page, /\/api\/documents\/resume\/generate/, testResume);
    await mockApiResponse(page, /\/api\/documents\/cover-letter\/generate/, testCoverLetter);
    await mockApiResponse(page, /\/api\/applications/, { success: true, applicationId: 'app-123' });
    
    await clickButton(page, /generate.*documents/i);
    await page.waitForSelector('[data-testid="generated-resume"]');
    
    await clickButton(page, /submit.*application|apply/i);
    
    // Requirement 5.1: Create application record
    await expect(page.getByText(/application.*submitted|applied successfully/i)).toBeVisible();
    
    // Should redirect to application tracker
    await page.waitForURL('/applications');
  });

  test('should track application after submission', async ({ page }) => {
    await navigateTo(page, `/jobs/${testJobs[0].id}/apply`);
    
    await mockApiResponse(page, /\/api\/applications/, { 
      success: true, 
      applicationId: 'app-123',
      status: 'applied'
    });
    
    await clickButton(page, /submit.*application/i);
    
    await page.waitForURL('/applications');
    
    // Requirement 5.2: Display application with status
    await expect(page.getByText(testJobs[0].title)).toBeVisible();
    await expect(page.getByText(/applied|status.*applied/i)).toBeVisible();
  });

  test('should use existing resume instead of generating new one', async ({ page }) => {
    await navigateTo(page, `/jobs/${testJobs[0].id}/apply`);
    
    await page.getByRole('radio', { name: /use existing resume/i }).click();
    
    await page.getByRole('combobox', { name: /select resume/i }).selectOption('existing-resume-1');
    
    await expect(page.getByText(/resume selected/i)).toBeVisible();
  });

  test('should show job requirements in application page', async ({ page }) => {
    await navigateTo(page, `/jobs/${testJobs[0].id}/apply`);
    
    await mockApiResponse(page, /\/api\/jobs\/.*/, testJobs[0]);
    
    // Requirement 4.1: Analyze job description
    await expect(page.getByText(/requirements|qualifications/i)).toBeVisible();
    
    testJobs[0].requirements.forEach(async (req) => {
      await expect(page.getByText(req)).toBeVisible();
    });
  });

  test('should highlight relevant experience in generated documents', async ({ page }) => {
    await navigateTo(page, `/jobs/${testJobs[0].id}/apply`);
    
    await mockApiResponse(page, /\/api\/documents\/resume\/generate/, testResume);
    
    await clickButton(page, /generate.*resume/i);
    await page.waitForSelector('[data-testid="generated-resume"]');
    
    // Requirement 4.2: Highlight relevant experience
    await expect(page.getByText(/tailored|customized|relevant experience/i)).toBeVisible();
  });

  test('should ensure keywords from job description appear in documents', async ({ page }) => {
    await navigateTo(page, `/jobs/${testJobs[0].id}/apply`);
    
    await mockApiResponse(page, /\/api\/documents\/resume\/generate/, {
      ...testResume,
      metadata: {
        keywordsUsed: ['JavaScript', 'React', 'Node.js'],
      },
    });
    
    await clickButton(page, /generate.*resume/i);
    await page.waitForSelector('[data-testid="generated-resume"]');
    
    // Requirement 4.7: Ensure keywords appear naturally
    await expect(page.getByText(/keywords.*included|optimized for ATS/i)).toBeVisible();
  });
});
