"""
End-to-end tests for critical user journeys.
"""

import pytest
from playwright.async_api import Page, expect
import asyncio


@pytest.mark.e2e
@pytest.mark.asyncio
class TestUserRegistrationJourney:
    """E2E tests for user registration journey."""
    
    async def test_complete_user_registration_flow(
        self, 
        page: Page, 
        test_user_credentials,
        screenshot_on_failure
    ):
        """Test complete user registration and onboarding flow."""
        # Navigate to registration page
        await page.goto("http://localhost:3000/register")
        
        # Verify registration page loaded
        await expect(page.locator('[data-testid="registration-form"]')).to_be_visible()
        
        # Fill registration form
        await page.fill('[data-testid="first-name-input"]', test_user_credentials["first_name"])
        await page.fill('[data-testid="last-name-input"]', test_user_credentials["last_name"])
        await page.fill('[data-testid="email-input"]', test_user_credentials["email"])
        await page.fill('[data-testid="password-input"]', test_user_credentials["password"])
        await page.fill('[data-testid="confirm-password-input"]', test_user_credentials["password"])
        await page.fill('[data-testid="headline-input"]', test_user_credentials["professional_headline"])
        
        # Accept terms and conditions
        await page.check('[data-testid="terms-checkbox"]')
        
        # Submit registration
        await page.click('[data-testid="register-button"]')
        
        # Wait for email verification page
        await page.wait_for_url("**/verify-email")
        await expect(page.locator('[data-testid="verification-message"]')).to_be_visible()
        
        # Simulate email verification (in real test, would check email)
        # For E2E test, we'll navigate directly to dashboard
        await page.goto("http://localhost:3000/dashboard")
        
        # Verify dashboard loaded with welcome message
        await expect(page.locator('[data-testid="welcome-message"]')).to_contain_text("Welcome")
        await expect(page.locator('[data-testid="user-name"]')).to_contain_text(test_user_credentials["first_name"])
    
    async def test_user_profile_completion_flow(
        self, 
        authenticated_page: Page,
        screenshot_on_failure
    ):
        """Test user profile completion flow."""
        # Navigate to profile completion
        await authenticated_page.goto("http://localhost:3000/profile/complete")
        
        # Fill skills section
        await authenticated_page.click('[data-testid="add-skill-button"]')
        await authenticated_page.fill('[data-testid="skill-input-0"]', "Python")
        await authenticated_page.click('[data-testid="add-skill-button"]')
        await authenticated_page.fill('[data-testid="skill-input-1"]', "FastAPI")
        await authenticated_page.click('[data-testid="add-skill-button"]')
        await authenticated_page.fill('[data-testid="skill-input-2"]', "PostgreSQL")
        
        # Fill experience section
        await authenticated_page.click('[data-testid="add-experience-button"]')
        await authenticated_page.fill('[data-testid="job-title-0"]', "Senior Software Engineer")
        await authenticated_page.fill('[data-testid="company-0"]', "TechCorp")
        await authenticated_page.fill('[data-testid="duration-0"]', "2020-2023")
        await authenticated_page.fill('[data-testid="description-0"]', "Led development of microservices")
        
        # Fill education section
        await authenticated_page.click('[data-testid="add-education-button"]')
        await authenticated_page.fill('[data-testid="degree-0"]', "BS Computer Science")
        await authenticated_page.fill('[data-testid="institution-0"]', "University of Technology")
        await authenticated_page.fill('[data-testid="graduation-year-0"]', "2020")
        
        # Save profile
        await authenticated_page.click('[data-testid="save-profile-button"]')
        
        # Verify success message
        await expect(authenticated_page.locator('[data-testid="success-message"]')).to_be_visible()
        
        # Verify redirect to dashboard with completed profile
        await authenticated_page.wait_for_url("**/dashboard")
        await expect(authenticated_page.locator('[data-testid="profile-completion"]')).to_contain_text("100%")


@pytest.mark.e2e
@pytest.mark.asyncio
class TestJobSearchJourney:
    """E2E tests for job search journey."""
    
    async def test_job_search_and_filtering_flow(
        self, 
        authenticated_page: Page,
        screenshot_on_failure
    ):
        """Test job search with filters and sorting."""
        # Navigate to job search
        await authenticated_page.goto("http://localhost:3000/jobs/search")
        
        # Perform basic search
        await authenticated_page.fill('[data-testid="search-input"]', "python developer")
        await authenticated_page.click('[data-testid="search-button"]')
        
        # Wait for search results
        await expect(authenticated_page.locator('[data-testid="search-results"]')).to_be_visible()
        
        # Verify search results are displayed
        job_cards = authenticated_page.locator('[data-testid="job-card"]')
        await expect(job_cards).to_have_count_greater_than(0)
        
        # Apply location filter
        await authenticated_page.click('[data-testid="location-filter"]')
        await authenticated_page.fill('[data-testid="location-input"]', "San Francisco")
        await authenticated_page.click('[data-testid="apply-filters-button"]')
        
        # Wait for filtered results
        await authenticated_page.wait_for_timeout(2000)  # Wait for API call
        
        # Apply salary filter
        await authenticated_page.click('[data-testid="salary-filter"]')
        await authenticated_page.fill('[data-testid="min-salary-input"]', "100000")
        await authenticated_page.click('[data-testid="apply-filters-button"]')
        
        # Wait for filtered results
        await authenticated_page.wait_for_timeout(2000)
        
        # Sort by relevance
        await authenticated_page.click('[data-testid="sort-dropdown"]')
        await authenticated_page.click('[data-testid="sort-relevance"]')
        
        # Verify results are still displayed
        await expect(job_cards.first()).to_be_visible()
    
    async def test_semantic_job_search_flow(
        self, 
        authenticated_page: Page,
        screenshot_on_failure
    ):
        """Test semantic job search functionality."""
        # Navigate to advanced search
        await authenticated_page.goto("http://localhost:3000/jobs/search/advanced")
        
        # Enable semantic search
        await authenticated_page.check('[data-testid="semantic-search-toggle"]')
        
        # Perform semantic search
        search_query = "machine learning engineer with python experience"
        await authenticated_page.fill('[data-testid="semantic-search-input"]', search_query)
        await authenticated_page.click('[data-testid="semantic-search-button"]')
        
        # Wait for semantic search results
        await expect(authenticated_page.locator('[data-testid="semantic-results"]')).to_be_visible()
        
        # Verify semantic match scores are displayed
        match_scores = authenticated_page.locator('[data-testid="match-score"]')
        await expect(match_scores.first()).to_be_visible()
        
        # Click on first result to view details
        await authenticated_page.click('[data-testid="job-card"]:first-child')
        
        # Verify job details page
        await expect(authenticated_page.locator('[data-testid="job-details"]')).to_be_visible()
        await expect(authenticated_page.locator('[data-testid="match-explanation"]')).to_be_visible()


@pytest.mark.e2e
@pytest.mark.asyncio
class TestJobApplicationJourney:
    """E2E tests for job application journey."""
    
    async def test_complete_job_application_flow(
        self, 
        authenticated_page: Page,
        test_job_data,
        screenshot_on_failure
    ):
        """Test complete job application process."""
        # Navigate to job details (assuming job exists)
        await authenticated_page.goto("http://localhost:3000/jobs/test-job-123")
        
        # Verify job details are displayed
        await expect(authenticated_page.locator('[data-testid="job-title"]')).to_be_visible()
        await expect(authenticated_page.locator('[data-testid="company-name"]')).to_be_visible()
        
        # Click apply button
        await authenticated_page.click('[data-testid="apply-button"]')
        
        # Fill application form
        await authenticated_page.fill(
            '[data-testid="cover-letter-textarea"]', 
            "I am very interested in this position and believe my skills align well..."
        )
        
        # Select resume (assuming resume exists)
        await authenticated_page.click('[data-testid="resume-dropdown"]')
        await authenticated_page.click('[data-testid="resume-option-0"]')
        
        # Submit application
        await authenticated_page.click('[data-testid="submit-application-button"]')
        
        # Verify success message
        await expect(authenticated_page.locator('[data-testid="application-success"]')).to_be_visible()
        
        # Navigate to applications page
        await authenticated_page.click('[data-testid="view-applications-link"]')
        
        # Verify application appears in list
        await expect(authenticated_page.locator('[data-testid="application-list"]')).to_be_visible()
        application_items = authenticated_page.locator('[data-testid="application-item"]')
        await expect(application_items).to_have_count_greater_than(0)
    
    async def test_application_status_tracking(
        self, 
        authenticated_page: Page,
        screenshot_on_failure
    ):
        """Test application status tracking functionality."""
        # Navigate to applications page
        await authenticated_page.goto("http://localhost:3000/applications")
        
        # Verify applications are displayed
        await expect(authenticated_page.locator('[data-testid="application-list"]')).to_be_visible()
        
        # Click on first application
        await authenticated_page.click('[data-testid="application-item"]:first-child')
        
        # Verify application details page
        await expect(authenticated_page.locator('[data-testid="application-details"]')).to_be_visible()
        await expect(authenticated_page.locator('[data-testid="status-timeline"]')).to_be_visible()
        
        # Verify status updates are displayed
        status_items = authenticated_page.locator('[data-testid="status-item"]')
        await expect(status_items).to_have_count_greater_than(0)


@pytest.mark.e2e
@pytest.mark.asyncio
class TestDocumentGenerationJourney:
    """E2E tests for document generation journey."""
    
    async def test_ai_resume_generation_flow(
        self, 
        authenticated_page: Page,
        screenshot_on_failure
    ):
        """Test AI-powered resume generation flow."""
        # Navigate to document generation
        await authenticated_page.goto("http://localhost:3000/documents/generate")
        
        # Select resume generation
        await authenticated_page.click('[data-testid="generate-resume-card"]')
        
        # Select job for tailoring (assuming job exists)
        await authenticated_page.click('[data-testid="job-selector"]')
        await authenticated_page.click('[data-testid="job-option-0"]')
        
        # Select template
        await authenticated_page.click('[data-testid="template-modern"]')
        
        # Start generation
        await authenticated_page.click('[data-testid="generate-button"]')
        
        # Wait for generation to complete (with loading indicator)
        await expect(authenticated_page.locator('[data-testid="generation-loading"]')).to_be_visible()
        await expect(authenticated_page.locator('[data-testid="generation-complete"]')).to_be_visible(timeout=30000)
        
        # Verify generated resume is displayed
        await expect(authenticated_page.locator('[data-testid="resume-preview"]')).to_be_visible()
        
        # Download resume
        async with authenticated_page.expect_download() as download_info:
            await authenticated_page.click('[data-testid="download-resume-button"]')
        download = await download_info.value
        
        # Verify download
        assert download.suggested_filename.endswith('.pdf')
    
    async def test_cover_letter_generation_flow(
        self, 
        authenticated_page: Page,
        screenshot_on_failure
    ):
        """Test AI-powered cover letter generation flow."""
        # Navigate to document generation
        await authenticated_page.goto("http://localhost:3000/documents/generate")
        
        # Select cover letter generation
        await authenticated_page.click('[data-testid="generate-cover-letter-card"]')
        
        # Select job for tailoring
        await authenticated_page.click('[data-testid="job-selector"]')
        await authenticated_page.click('[data-testid="job-option-0"]')
        
        # Add custom notes
        await authenticated_page.fill(
            '[data-testid="custom-notes-textarea"]',
            "I am particularly interested in this role because..."
        )
        
        # Generate cover letter
        await authenticated_page.click('[data-testid="generate-button"]')
        
        # Wait for generation
        await expect(authenticated_page.locator('[data-testid="generation-complete"]')).to_be_visible(timeout=30000)
        
        # Verify generated cover letter
        await expect(authenticated_page.locator('[data-testid="cover-letter-preview"]')).to_be_visible()
        
        # Edit generated content
        await authenticated_page.click('[data-testid="edit-button"]')
        await authenticated_page.fill('[data-testid="cover-letter-editor"]', "Edited content...")
        await authenticated_page.click('[data-testid="save-edits-button"]')
        
        # Save to library
        await authenticated_page.click('[data-testid="save-to-library-button"]')
        await expect(authenticated_page.locator('[data-testid="save-success"]')).to_be_visible()


@pytest.mark.e2e
@pytest.mark.asyncio
class TestAnalyticsJourney:
    """E2E tests for analytics and insights journey."""
    
    async def test_application_analytics_dashboard(
        self, 
        authenticated_page: Page,
        screenshot_on_failure
    ):
        """Test application analytics dashboard."""
        # Navigate to analytics
        await authenticated_page.goto("http://localhost:3000/analytics")
        
        # Verify analytics dashboard loads
        await expect(authenticated_page.locator('[data-testid="analytics-dashboard"]')).to_be_visible()
        
        # Verify key metrics are displayed
        await expect(authenticated_page.locator('[data-testid="total-applications"]')).to_be_visible()
        await expect(authenticated_page.locator('[data-testid="response-rate"]')).to_be_visible()
        await expect(authenticated_page.locator('[data-testid="interview-rate"]')).to_be_visible()
        
        # Verify charts are displayed
        await expect(authenticated_page.locator('[data-testid="applications-chart"]')).to_be_visible()
        await expect(authenticated_page.locator('[data-testid="response-timeline"]')).to_be_visible()
        
        # Change time period
        await authenticated_page.click('[data-testid="time-period-dropdown"]')
        await authenticated_page.click('[data-testid="period-6months"]')
        
        # Wait for data refresh
        await authenticated_page.wait_for_timeout(2000)
        
        # Verify data updated
        await expect(authenticated_page.locator('[data-testid="analytics-dashboard"]')).to_be_visible()
    
    async def test_skill_scoring_insights(
        self, 
        authenticated_page: Page,
        screenshot_on_failure
    ):
        """Test skill scoring and insights functionality."""
        # Navigate to skill insights
        await authenticated_page.goto("http://localhost:3000/analytics/skills")
        
        # Verify skill scoring dashboard
        await expect(authenticated_page.locator('[data-testid="skill-dashboard"]')).to_be_visible()
        
        # Verify skill scores are displayed
        skill_items = authenticated_page.locator('[data-testid="skill-item"]')
        await expect(skill_items).to_have_count_greater_than(0)
        
        # Click on skill for detailed analysis
        await authenticated_page.click('[data-testid="skill-item"]:first-child')
        
        # Verify detailed skill analysis
        await expect(authenticated_page.locator('[data-testid="skill-analysis"]')).to_be_visible()
        await expect(authenticated_page.locator('[data-testid="market-demand"]')).to_be_visible()
        await expect(authenticated_page.locator('[data-testid="improvement-suggestions"]')).to_be_visible()


@pytest.mark.e2e
@pytest.mark.asyncio
class TestCrossBrowserCompatibility:
    """E2E tests for cross-browser compatibility."""
    
    @pytest.mark.parametrize("browser_name", ["chromium", "firefox", "webkit"])
    async def test_login_across_browsers(
        self, 
        browser_name: str,
        test_user_credentials
    ):
        """Test login functionality across different browsers."""
        async with async_playwright() as p:
            browser = await getattr(p, browser_name).launch(headless=True)
            context = await browser.new_context()
            page = await context.new_page()
            
            try:
                # Navigate to login
                await page.goto("http://localhost:3000/login")
                
                # Fill login form
                await page.fill('[data-testid="email-input"]', test_user_credentials["email"])
                await page.fill('[data-testid="password-input"]', test_user_credentials["password"])
                
                # Submit login
                await page.click('[data-testid="login-button"]')
                
                # Verify successful login
                await page.wait_for_url("**/dashboard")
                await expect(page.locator('[data-testid="dashboard"]')).to_be_visible()
                
            finally:
                await context.close()
                await browser.close()


@pytest.mark.e2e
@pytest.mark.asyncio
class TestMobileResponsiveness:
    """E2E tests for mobile responsiveness."""
    
    async def test_mobile_navigation(self, browser):
        """Test mobile navigation and responsiveness."""
        # Create mobile context
        context = await browser.new_context(
            viewport={"width": 375, "height": 667},  # iPhone SE size
            user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)"
        )
        page = await context.new_page()
        
        try:
            # Navigate to homepage
            await page.goto("http://localhost:3000")
            
            # Verify mobile menu button is visible
            await expect(page.locator('[data-testid="mobile-menu-button"]')).to_be_visible()
            
            # Open mobile menu
            await page.click('[data-testid="mobile-menu-button"]')
            
            # Verify mobile menu is displayed
            await expect(page.locator('[data-testid="mobile-menu"]')).to_be_visible()
            
            # Test navigation items
            await page.click('[data-testid="mobile-nav-jobs"]')
            await page.wait_for_url("**/jobs")
            
            # Verify responsive layout
            await expect(page.locator('[data-testid="job-search-mobile"]')).to_be_visible()
            
        finally:
            await context.close()