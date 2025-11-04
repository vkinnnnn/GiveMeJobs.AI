import { test, expect } from '@playwright/test';
import { login, navigateTo, TEST_USERS, mockApiResponse, clickButton, waitForToast } from '../helpers/test-utils';
import { testJobs, testResume, testCoverLetter, testApplication } from '../fixtures/test-data';

/**
 * E2E tests for complete job search to application flow
 * Requirements: 3.1, 4.1, 5.1
 * 
 * This test covers the complete user journey:
 * 1. Search for jobs
 * 2. View job details and match analysis
 * 3. Generate tailored documents
 * 4. Submit application
 * 5. Track application status
 */

test.describe('Complete Job Search to Application Flow', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_USERS.regular);
  });

  test('should complete full job search to application submission flow', async ({ page }) => {
    // Step 1: Search for jobs (Requirement 3.1)
    await navigateTo(page, '/jobs/search');
    
    // Mock job search API
    await mockApiResponse(page, /\/api\/jobs\/search/, {
      jobs: testJobs,
      total: testJobs.length,
      page: 1,
      totalPages: 1,
    });
    
    // Search for jobs
    await page.getByPlaceholder(/search.*jobs|job title|keywords/i).fill('Software Engineer');
    
    const searchStartTime = Date.now();
    await clickButton(page, /search|find jobs/i);
    
    // Wait for results and verify search performance (Requirement 3.1: within 3 seconds)
    await page.waitForSelector('[data-testid="job-card"]', { timeout: 3000 });
    const searchEndTime = Date.now();
    expect(searchEndTime - searchStartTime).toBeLessThan(3000);
    
    // Verify job results are displayed with match scores
    const jobCards = await page.locator('[data-testid="job-card"]').count();
    expect(jobCards).toBeGreaterThan(0);
    
    // Verify match scores are displayed (Requirement 3.2)
    const matchScores = await page.locator('[data-testid="match-score"]').all();
    expect(matchScores.length).toBeGreaterThan(0);
    
    // Step 2: View job details and match analysis
    await mockApiResponse(page, new RegExp(`/api/jobs/${testJobs[0].id}`), testJobs[0]);
    await mockApiResponse(page, new RegExp(`/api/jobs/${testJobs[0].id}/match-analysis`), {
      jobId: testJobs[0].id,
      overallScore: 85,
      breakdown: {
        skillMatch: 90,
        experienceMatch: 80,
        locationMatch: 85,
        salaryMatch: 90,
        cultureFit: 75,
      },
      matchingSkills: ['JavaScript', 'React', 'Node.js'],
      missingSkills: ['Python', 'AWS'],
      recommendations: ['Consider learning Python for backend development'],
    });
    
    // Click on first job to view details
    await page.locator('[data-testid="job-card"]').first().click();
    
    // Verify job details page loads (Requirement 3.3)
    await expect(page.getByRole('heading', { name: testJobs[0].title })).toBeVisible();
    await expect(page.getByText(/requirements|qualifications/i)).toBeVisible();
    await expect(page.getByText(/matching skills|your skills/i)).toBeVisible();
    await expect(page.getByText(/missing.*skills|skills.*gap/i)).toBeVisible();
    
    // Step 3: Navigate to application page
    await clickButton(page, /apply now|apply for this job/i);
    await page.waitForURL(`/jobs/${testJobs[0].id}/apply`);
    
    // Step 4: Generate tailored documents (Requirement 4.1)
    await mockApiResponse(page, /\/api\/documents\/resume\/generate/, {
      ...testResume,
      jobId: testJobs[0].id,
      metadata: {
        wordCount: 350,
        keywordsUsed: ['JavaScript', 'React', 'Node.js', 'Software Engineer'],
        generationTime: 8500, // Under 10 seconds
      },
    });
    
    await mockApiResponse(page, /\/api\/documents\/cover-letter\/generate/, {
      ...testCoverLetter,
      jobId: testJobs[0].id,
      content: `Dear Hiring Manager,\n\nI am excited to apply for the ${testJobs[0].title} position at ${testJobs[0].company}...`,
    });
    
    // Generate documents and verify timing (Requirement 4.4: within 10 seconds)
    const docGenStartTime = Date.now();
    await clickButton(page, /generate.*documents|auto-generate/i);
    
    // Wait for documents to be generated
    await page.waitForSelector('[data-testid="generated-resume"]', { timeout: 10000 });
    await page.waitForSelector('[data-testid="generated-cover-letter"]', { timeout: 10000 });
    
    const docGenEndTime = Date.now();
    expect(docGenEndTime - docGenStartTime).toBeLessThan(10000);
    
    // Verify documents are generated and displayed
    await expect(page.getByText(/resume generated|resume ready/i)).toBeVisible();
    await expect(page.getByText(/cover letter generated|cover letter ready/i)).toBeVisible();
    
    // Step 5: Preview and edit documents (Requirement 4.5)
    await clickButton(page, /preview.*resume|view.*resume/i);
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('button', { name: /close|×/i }).click();
    
    // Test document editing
    await clickButton(page, /edit.*resume/i);
    await expect(page.getByRole('textbox', { name: /resume.*content|edit.*resume/i })).toBeVisible();
    
    // Make a small edit
    const resumeEditor = page.getByRole('textbox', { name: /resume.*content|edit.*resume/i });
    await resumeEditor.fill('Updated resume content with relevant experience');
    await clickButton(page, /save|update/i);
    await expect(page.getByText(/saved|updated successfully/i)).toBeVisible();
    
    // Step 6: Submit application (Requirement 5.1)
    await mockApiResponse(page, /\/api\/applications/, {
      success: true,
      applicationId: 'app-123',
      status: 'applied',
      appliedDate: new Date().toISOString(),
    });
    
    await clickButton(page, /submit.*application|apply/i);
    
    // Verify application submission
    await expect(page.getByText(/application.*submitted|applied successfully/i)).toBeVisible();
    
    // Should redirect to application tracker
    await page.waitForURL('/applications');
    
    // Step 7: Verify application tracking (Requirement 5.2)
    await mockApiResponse(page, /\/api\/applications/, [
      {
        ...testApplication,
        jobId: testJobs[0].id,
        job: testJobs[0],
        status: 'applied',
        appliedDate: new Date().toISOString(),
      },
    ]);
    
    // Verify application appears in tracker
    await expect(page.getByText(testJobs[0].title)).toBeVisible();
    await expect(page.getByText(/applied|status.*applied/i)).toBeVisible();
    
    // Step 8: View application details
    await page.getByText(testJobs[0].title).click();
    
    // Verify application details page
    await expect(page.getByRole('heading', { name: /application.*details/i })).toBeVisible();
    await expect(page.getByText(/status.*applied/i)).toBeVisible();
    await expect(page.getByText(/applied.*date/i)).toBeVisible();
  });

  test('should handle document generation errors gracefully', async ({ page }) => {
    await navigateTo(page, `/jobs/${testJobs[0].id}/apply`);
    
    // Mock API error
    await mockApiResponse(page, /\/api\/documents\/resume\/generate/, 
      { error: 'Generation failed' }, 500);
    
    await clickButton(page, /generate.*resume/i);
    
    // Should show error message
    await expect(page.getByText(/error.*generating|generation.*failed/i)).toBeVisible();
    
    // Should allow retry
    await expect(page.getByRole('button', { name: /retry|try again/i })).toBeVisible();
  });

  test('should save job for later application', async ({ page }) => {
    // Step 1: Search and find job
    await navigateTo(page, '/jobs/search');
    
    await mockApiResponse(page, /\/api\/jobs\/search/, {
      jobs: testJobs,
      total: testJobs.length,
    });
    
    await page.getByPlaceholder(/search.*jobs/i).fill('Engineer');
    await clickButton(page, /search/i);
    await page.waitForSelector('[data-testid="job-card"]');
    
    // Step 2: Save job (Requirement 3.5)
    await mockApiResponse(page, /\/api\/jobs\/.*\/save/, { success: true });
    
    await page.locator('[data-testid="save-job-button"]').first().click();
    await expect(page.getByText(/job saved|saved successfully/i)).toBeVisible();
    
    // Step 3: Navigate to saved jobs
    await navigateTo(page, '/jobs/saved');
    
    await mockApiResponse(page, /\/api\/jobs\/saved/, testJobs);
    
    // Verify saved job appears
    await expect(page.getByText(testJobs[0].title)).toBeVisible();
    
    // Step 4: Apply from saved jobs
    await page.getByText(testJobs[0].title).click();
    await clickButton(page, /apply now/i);
    
    // Should navigate to application page
    await page.waitForURL(`/jobs/${testJobs[0].id}/apply`);
  });

  test('should track application status updates', async ({ page }) => {
    // Start from application tracker
    await navigateTo(page, '/applications');
    
    const applicationWithUpdates = {
      ...testApplication,
      jobId: testJobs[0].id,
      job: testJobs[0],
      status: 'screening',
      timeline: [
        {
          id: '1',
          eventType: 'status_change',
          description: 'Application submitted',
          timestamp: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        },
        {
          id: '2',
          eventType: 'status_change',
          description: 'Application under review',
          timestamp: new Date().toISOString(),
        },
      ],
    };
    
    await mockApiResponse(page, /\/api\/applications/, [applicationWithUpdates]);
    
    // Click on application to view details
    await page.getByText(testJobs[0].title).click();
    
    // Verify timeline is displayed (Requirement 5.3)
    await expect(page.getByText(/timeline|application.*history/i)).toBeVisible();
    await expect(page.getByText(/application submitted/i)).toBeVisible();
    await expect(page.getByText(/under review/i)).toBeVisible();
    
    // Test status update
    await mockApiResponse(page, /\/api\/applications\/.*\/status/, { success: true });
    
    await page.getByRole('combobox', { name: /status/i }).selectOption('interview_scheduled');
    await clickButton(page, /update.*status/i);
    
    await expect(page.getByText(/status.*updated/i)).toBeVisible();
  });

  test('should display application health bar visualization', async ({ page }) => {
    await navigateTo(page, '/applications');
    
    const applicationWithHealthBar = {
      ...testApplication,
      jobId: testJobs[0].id,
      job: testJobs[0],
      status: 'interview_scheduled',
      healthBar: {
        currentStage: 'interview_scheduled',
        stages: [
          { name: 'Applied', status: 'completed', date: new Date(Date.now() - 172800000).toISOString() },
          { name: 'Screening', status: 'completed', date: new Date(Date.now() - 86400000).toISOString() },
          { name: 'Interview', status: 'current', date: new Date().toISOString() },
          { name: 'Offer', status: 'pending' },
        ],
        progressPercentage: 60,
      },
    };
    
    await mockApiResponse(page, /\/api\/applications/, [applicationWithHealthBar]);
    
    await page.getByText(testJobs[0].title).click();
    
    // Verify health bar is displayed (Requirement 5.8)
    await expect(page.locator('[data-testid="application-health-bar"]')).toBeVisible();
    await expect(page.getByText(/60%|progress.*60/i)).toBeVisible();
    
    // Verify stages are shown
    await expect(page.getByText(/applied.*completed/i)).toBeVisible();
    await expect(page.getByText(/interview.*current/i)).toBeVisible();
  });

  test('should handle network errors during job search', async ({ page }) => {
    await navigateTo(page, '/jobs/search');
    
    // Mock network error
    await page.route(/\/api\/jobs\/search/, route => {
      route.abort('failed');
    });
    
    await page.getByPlaceholder(/search.*jobs/i).fill('Engineer');
    await clickButton(page, /search/i);
    
    // Should show error message
    await expect(page.getByText(/error.*loading|network.*error|try.*again/i)).toBeVisible();
    
    // Should show retry option
    await expect(page.getByRole('button', { name: /retry|try again/i })).toBeVisible();
  });

  test('should validate required fields before application submission', async ({ page }) => {
    await navigateTo(page, `/jobs/${testJobs[0].id}/apply`);
    
    // Try to submit without generating documents
    await clickButton(page, /submit.*application/i);
    
    // Should show validation errors
    await expect(page.getByText(/resume.*required|please.*generate.*resume/i)).toBeVisible();
  });
});