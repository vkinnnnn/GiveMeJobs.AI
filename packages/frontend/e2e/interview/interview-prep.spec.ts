import { test, expect } from '@playwright/test';
import { login, navigateTo, TEST_USERS, mockApiResponse, clickButton } from '../helpers/test-utils';
import { testApplication, testInterviewQuestions } from '../fixtures/test-data';

/**
 * E2E tests for interview preparation functionality
 * Requirements: 6.1, 6.4
 */

test.describe('Interview Preparation', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_USERS.regular);
  });

  test('should generate interview prep package within 30 seconds', async ({ page }) => {
    // Update application status to trigger interview prep
    await navigateTo(page, `/applications/${testApplication.id}`);
    
    await page.getByRole('button', { name: /update status/i }).click();
    await page.getByRole('option', { name: /interview scheduled/i }).click();
    await clickButton(page, /save|update/i);
    
    // Mock interview prep generation
    await mockApiResponse(page, /\/api\/interview-prep\/generate/, {
      id: 'prep-123',
      questions: testInterviewQuestions,
      companyResearch: {
        companyName: 'Tech Corp',
        industry: 'Technology',
        culture: ['Innovation', 'Collaboration'],
      },
    });
    
    const startTime = Date.now();
    
    await clickButton(page, /prepare for interview|generate prep/i);
    
    // Wait for prep package to be generated
    await page.waitForSelector('[data-testid="interview-prep"]', { timeout: 30000 });
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Requirement 6.1: Generate within 30 seconds
    expect(duration).toBeLessThan(30000);
    
    await expect(page.getByText(/interview preparation|prep package/i)).toBeVisible();
  });

  test('should display different question categories', async ({ page }) => {
    await navigateTo(page, `/interview-prep/${testApplication.id}`);
    
    await mockApiResponse(page, /\/api\/interview-prep\/.*/, {
      questions: testInterviewQuestions,
    });
    
    // Requirement 6.2: Include different question types
    await expect(page.getByText(/behavioral questions/i)).toBeVisible();
    await expect(page.getByText(/technical questions/i)).toBeVisible();
    await expect(page.getByText(/company-specific questions/i)).toBeVisible();
  });

  test('should display suggested answers for questions', async ({ page }) => {
    await navigateTo(page, `/interview-prep/${testApplication.id}`);
    
    await mockApiResponse(page, /\/api\/interview-prep\/.*/, {
      questions: testInterviewQuestions,
    });
    
    // Click on first question
    await page.locator('[data-testid="interview-question"]').first().click();
    
    // Requirement 6.3: Include suggested answers
    await expect(page.getByText(/suggested answer|sample answer/i)).toBeVisible();
    await expect(page.getByText(testInterviewQuestions[0].suggestedAnswer)).toBeVisible();
  });

  test('should practice answering questions', async ({ page }) => {
    await navigateTo(page, `/interview-prep/${testApplication.id}`);
    
    await mockApiResponse(page, /\/api\/interview-prep\/.*/, {
      questions: testInterviewQuestions,
    });
    
    await page.locator('[data-testid="interview-question"]').first().click();
    
    // Requirement 6.4: Allow recording responses
    await clickButton(page, /practice|record answer/i);
    
    await expect(page.getByRole('textbox', { name: /your answer|response/i })).toBeVisible();
    
    // Type a response
    await page.getByRole('textbox', { name: /your answer|response/i }).fill(
      'In my previous role, I encountered a challenging bug in production...'
    );
    
    await clickButton(page, /submit|save answer/i);
    
    await expect(page.getByText(/answer saved|response recorded/i)).toBeVisible();
  });

  test('should analyze practice responses', async ({ page }) => {
    await navigateTo(page, `/interview-prep/${testApplication.id}`);
    
    await mockApiResponse(page, /\/api\/interview-prep\/.*/, {
      questions: testInterviewQuestions,
    });
    
    await page.locator('[data-testid="interview-question"]').first().click();
    await clickButton(page, /practice|record answer/i);
    
    const response = 'Situation: We had a critical bug. Task: Fix it quickly. Action: I debugged and found the issue. Result: Fixed in 2 hours.';
    await page.getByRole('textbox', { name: /your answer|response/i }).fill(response);
    
    // Mock analysis response
    await mockApiResponse(page, /\/api\/interview-prep\/.*\/analyze/, {
      overallScore: 85,
      clarity: 90,
      relevance: 85,
      starMethodUsage: true,
      suggestions: ['Great use of STAR method', 'Consider adding more details about the impact'],
    });
    
    await clickButton(page, /analyze|get feedback/i);
    
    // Requirement 6.5: Evaluate responses
    await page.waitForSelector('[data-testid="response-analysis"]');
    
    await expect(page.getByText(/overall score|analysis/i)).toBeVisible();
    await expect(page.getByText(/clarity/i)).toBeVisible();
    await expect(page.getByText(/relevance/i)).toBeVisible();
    await expect(page.getByText(/STAR method/i)).toBeVisible();
  });

  test('should display company research', async ({ page }) => {
    await navigateTo(page, `/interview-prep/${testApplication.id}`);
    
    await mockApiResponse(page, /\/api\/interview-prep\/.*/, {
      companyResearch: {
        companyName: 'Tech Corp',
        industry: 'Technology',
        size: '1000-5000 employees',
        culture: ['Innovation', 'Collaboration', 'Work-life balance'],
        recentNews: [
          {
            title: 'Tech Corp launches new product',
            summary: 'Company announces innovative solution',
            publishedDate: new Date().toISOString(),
          },
        ],
        values: ['Customer focus', 'Excellence', 'Integrity'],
      },
    });
    
    await page.getByRole('tab', { name: /company research|about company/i }).click();
    
    await expect(page.getByText(/Tech Corp/i)).toBeVisible();
    await expect(page.getByText(/Innovation/i)).toBeVisible();
    await expect(page.getByText(/recent news/i)).toBeVisible();
  });

  test('should send interview reminders', async ({ page }) => {
    await navigateTo(page, `/applications/${testApplication.id}`);
    
    // Set interview date
    await page.getByLabel(/interview date/i).fill('2024-12-31');
    await clickButton(page, /save|update/i);
    
    // Requirement 6.6: Send reminders
    await expect(page.getByText(/reminder set|notification scheduled/i)).toBeVisible();
  });

  test('should display technical questions for technical roles', async ({ page }) => {
    await navigateTo(page, `/interview-prep/${testApplication.id}`);
    
    await mockApiResponse(page, /\/api\/interview-prep\/.*/, {
      questions: [
        ...testInterviewQuestions,
        {
          id: 'tech-1',
          category: 'technical',
          question: 'Implement a function to reverse a linked list',
          suggestedAnswer: 'Here is an approach using iteration...',
          difficulty: 'medium',
        },
      ],
    });
    
    // Requirement 6.7: Include technical questions for technical roles
    await page.getByRole('tab', { name: /technical questions/i }).click();
    
    await expect(page.getByText(/reverse a linked list/i)).toBeVisible();
  });

  test('should track practice progress', async ({ page }) => {
    await navigateTo(page, `/interview-prep/${testApplication.id}`);
    
    await mockApiResponse(page, /\/api\/interview-prep\/.*\/progress/, {
      totalQuestions: 10,
      practicedsQuestions: 6,
      averageScore: 82,
      readyForInterview: true,
    });
    
    await page.getByRole('tab', { name: /progress|my progress/i }).click();
    
    await expect(page.getByText(/6.*10|60%/i)).toBeVisible();
    await expect(page.getByText(/average score.*82/i)).toBeVisible();
  });

  test('should export interview prep as PDF', async ({ page }) => {
    await navigateTo(page, `/interview-prep/${testApplication.id}`);
    
    const downloadPromise = page.waitForEvent('download');
    
    await clickButton(page, /export|download.*pdf/i);
    
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/interview.*prep.*\.pdf$/i);
  });

  test('should display STAR method guidance', async ({ page }) => {
    await navigateTo(page, `/interview-prep/${testApplication.id}`);
    
    await page.locator('[data-testid="interview-question"]').first().click();
    
    // Check for STAR method guidance
    await expect(page.getByText(/STAR method|Situation.*Task.*Action.*Result/i)).toBeVisible();
  });
});
