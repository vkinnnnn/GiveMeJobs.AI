"""
Visual regression tests using Playwright screenshots.
"""

import pytest
from playwright.async_api import Page, expect
import os


@pytest.mark.e2e
@pytest.mark.visual
@pytest.mark.asyncio
class TestVisualRegression:
    """Visual regression tests for UI components."""
    
    async def test_dashboard_visual_regression(
        self, 
        authenticated_page: Page,
        screenshot_on_failure
    ):
        """Test dashboard visual consistency."""
        # Navigate to dashboard
        await authenticated_page.goto("http://localhost:3000/dashboard")
        
        # Wait for all content to load
        await authenticated_page.wait_for_load_state("networkidle")
        
        # Hide dynamic elements (dates, real-time data)
        await authenticated_page.add_style_tag(content="""
            [data-testid="current-time"],
            [data-testid="last-updated"],
            [data-testid="real-time-counter"] {
                visibility: hidden !important;
            }
        """)
        
        # Take full page screenshot
        await expect(authenticated_page).to_have_screenshot(
            "dashboard-full-page.png",
            full_page=True,
            threshold=0.2  # Allow 20% difference for minor changes
        )
        
        # Take screenshot of specific components
        await expect(
            authenticated_page.locator('[data-testid="stats-overview"]')
        ).to_have_screenshot("dashboard-stats.png")
        
        await expect(
            authenticated_page.locator('[data-testid="recent-applications"]')
        ).to_have_screenshot("dashboard-recent-apps.png")
    
    async def test_job_search_visual_regression(
        self, 
        authenticated_page: Page,
        screenshot_on_failure
    ):
        """Test job search page visual consistency."""
        # Navigate to job search
        await authenticated_page.goto("http://localhost:3000/jobs/search")
        
        # Perform search to get consistent results
        await authenticated_page.fill('[data-testid="search-input"]', "python developer")
        await authenticated_page.click('[data-testid="search-button"]')
        
        # Wait for results to load
        await authenticated_page.wait_for_selector('[data-testid="search-results"]')
        await authenticated_page.wait_for_load_state("networkidle")
        
        # Hide dynamic elements
        await authenticated_page.add_style_tag(content="""
            [data-testid="posted-date"],
            [data-testid="application-count"],
            [data-testid="view-count"] {
                visibility: hidden !important;
            }
        """)
        
        # Screenshot search interface
        await expect(
            authenticated_page.locator('[data-testid="search-interface"]')
        ).to_have_screenshot("job-search-interface.png")
        
        # Screenshot search results
        await expect(
            authenticated_page.locator('[data-testid="search-results"]')
        ).to_have_screenshot("job-search-results.png")
        
        # Screenshot filters panel
        await authenticated_page.click('[data-testid="filters-toggle"]')
        await expect(
            authenticated_page.locator('[data-testid="filters-panel"]')
        ).to_have_screenshot("job-search-filters.png")
    
    async def test_job_details_visual_regression(
        self, 
        authenticated_page: Page,
        screenshot_on_failure
    ):
        """Test job details page visual consistency."""
        # Navigate to specific job (assuming test job exists)
        await authenticated_page.goto("http://localhost:3000/jobs/test-job-123")
        
        # Wait for content to load
        await authenticated_page.wait_for_load_state("networkidle")
        
        # Hide dynamic elements
        await authenticated_page.add_style_tag(content="""
            [data-testid="posted-date"],
            [data-testid="application-deadline"],
            [data-testid="view-count"] {
                visibility: hidden !important;
            }
        """)
        
        # Screenshot job header
        await expect(
            authenticated_page.locator('[data-testid="job-header"]')
        ).to_have_screenshot("job-details-header.png")
        
        # Screenshot job description
        await expect(
            authenticated_page.locator('[data-testid="job-description"]')
        ).to_have_screenshot("job-details-description.png")
        
        # Screenshot application section
        await expect(
            authenticated_page.locator('[data-testid="application-section"]')
        ).to_have_screenshot("job-details-application.png")
    
    async def test_profile_page_visual_regression(
        self, 
        authenticated_page: Page,
        screenshot_on_failure
    ):
        """Test user profile page visual consistency."""
        # Navigate to profile
        await authenticated_page.goto("http://localhost:3000/profile")
        
        # Wait for content to load
        await authenticated_page.wait_for_load_state("networkidle")
        
        # Hide dynamic elements
        await authenticated_page.add_style_tag(content="""
            [data-testid="last-login"],
            [data-testid="profile-views"],
            [data-testid="last-updated"] {
                visibility: hidden !important;
            }
        """)
        
        # Screenshot profile header
        await expect(
            authenticated_page.locator('[data-testid="profile-header"]')
        ).to_have_screenshot("profile-header.png")
        
        # Screenshot skills section
        await expect(
            authenticated_page.locator('[data-testid="skills-section"]')
        ).to_have_screenshot("profile-skills.png")
        
        # Screenshot experience section
        await expect(
            authenticated_page.locator('[data-testid="experience-section"]')
        ).to_have_screenshot("profile-experience.png")
    
    async def test_analytics_dashboard_visual_regression(
        self, 
        authenticated_page: Page,
        screenshot_on_failure
    ):
        """Test analytics dashboard visual consistency."""
        # Navigate to analytics
        await authenticated_page.goto("http://localhost:3000/analytics")
        
        # Wait for charts to render
        await authenticated_page.wait_for_load_state("networkidle")
        await authenticated_page.wait_for_timeout(3000)  # Wait for chart animations
        
        # Hide dynamic elements
        await authenticated_page.add_style_tag(content="""
            [data-testid="last-updated"],
            [data-testid="real-time-data"],
            .recharts-tooltip {
                visibility: hidden !important;
            }
        """)
        
        # Screenshot metrics overview
        await expect(
            authenticated_page.locator('[data-testid="metrics-overview"]')
        ).to_have_screenshot("analytics-metrics.png")
        
        # Screenshot application trends chart
        await expect(
            authenticated_page.locator('[data-testid="trends-chart"]')
        ).to_have_screenshot("analytics-trends.png")
        
        # Screenshot success rate chart
        await expect(
            authenticated_page.locator('[data-testid="success-chart"]')
        ).to_have_screenshot("analytics-success.png")
    
    async def test_document_generation_visual_regression(
        self, 
        authenticated_page: Page,
        screenshot_on_failure
    ):
        """Test document generation interface visual consistency."""
        # Navigate to document generation
        await authenticated_page.goto("http://localhost:3000/documents/generate")
        
        # Wait for content to load
        await authenticated_page.wait_for_load_state("networkidle")
        
        # Screenshot generation options
        await expect(
            authenticated_page.locator('[data-testid="generation-options"]')
        ).to_have_screenshot("document-generation-options.png")
        
        # Select resume generation to show form
        await authenticated_page.click('[data-testid="generate-resume-card"]')
        
        # Screenshot resume generation form
        await expect(
            authenticated_page.locator('[data-testid="resume-generation-form"]')
        ).to_have_screenshot("resume-generation-form.png")
        
        # Screenshot template selection
        await expect(
            authenticated_page.locator('[data-testid="template-selection"]')
        ).to_have_screenshot("template-selection.png")


@pytest.mark.e2e
@pytest.mark.visual
@pytest.mark.asyncio
class TestResponsiveVisualRegression:
    """Visual regression tests for responsive design."""
    
    @pytest.mark.parametrize("viewport", [
        {"width": 1920, "height": 1080},  # Desktop
        {"width": 1024, "height": 768},   # Tablet
        {"width": 375, "height": 667},    # Mobile
    ])
    async def test_dashboard_responsive_visual(
        self, 
        browser,
        viewport,
        test_user_credentials
    ):
        """Test dashboard visual consistency across different screen sizes."""
        # Create context with specific viewport
        context = await browser.new_context(viewport=viewport)
        page = await context.new_page()
        
        try:
            # Login
            await page.goto("http://localhost:3000/login")
            await page.fill('[data-testid="email-input"]', test_user_credentials["email"])
            await page.fill('[data-testid="password-input"]', test_user_credentials["password"])
            await page.click('[data-testid="login-button"]')
            
            # Navigate to dashboard
            await page.wait_for_url("**/dashboard")
            await page.wait_for_load_state("networkidle")
            
            # Hide dynamic elements
            await page.add_style_tag(content="""
                [data-testid="current-time"],
                [data-testid="last-updated"] {
                    visibility: hidden !important;
                }
            """)
            
            # Take screenshot with viewport size in filename
            viewport_name = f"{viewport['width']}x{viewport['height']}"
            await expect(page).to_have_screenshot(
                f"dashboard-responsive-{viewport_name}.png",
                full_page=True
            )
            
        finally:
            await context.close()
    
    @pytest.mark.parametrize("viewport", [
        {"width": 1920, "height": 1080},  # Desktop
        {"width": 768, "height": 1024},   # Tablet Portrait
        {"width": 375, "height": 667},    # Mobile
    ])
    async def test_job_search_responsive_visual(
        self, 
        browser,
        viewport,
        test_user_credentials
    ):
        """Test job search visual consistency across different screen sizes."""
        context = await browser.new_context(viewport=viewport)
        page = await context.new_page()
        
        try:
            # Login and navigate
            await page.goto("http://localhost:3000/login")
            await page.fill('[data-testid="email-input"]', test_user_credentials["email"])
            await page.fill('[data-testid="password-input"]', test_user_credentials["password"])
            await page.click('[data-testid="login-button"]')
            
            await page.goto("http://localhost:3000/jobs/search")
            await page.wait_for_load_state("networkidle")
            
            # Perform search
            await page.fill('[data-testid="search-input"]', "python")
            await page.click('[data-testid="search-button"]')
            await page.wait_for_selector('[data-testid="search-results"]')
            
            # Hide dynamic elements
            await page.add_style_tag(content="""
                [data-testid="posted-date"],
                [data-testid="application-count"] {
                    visibility: hidden !important;
                }
            """)
            
            viewport_name = f"{viewport['width']}x{viewport['height']}"
            await expect(page).to_have_screenshot(
                f"job-search-responsive-{viewport_name}.png",
                full_page=True
            )
            
        finally:
            await context.close()


@pytest.mark.e2e
@pytest.mark.visual
@pytest.mark.asyncio
class TestThemeVisualRegression:
    """Visual regression tests for different themes."""
    
    @pytest.mark.parametrize("theme", ["light", "dark"])
    async def test_dashboard_theme_visual(
        self, 
        authenticated_page: Page,
        theme: str,
        screenshot_on_failure
    ):
        """Test dashboard visual consistency across themes."""
        # Navigate to dashboard
        await authenticated_page.goto("http://localhost:3000/dashboard")
        
        # Set theme
        await authenticated_page.click('[data-testid="theme-toggle"]')
        if theme == "dark":
            await authenticated_page.click('[data-testid="dark-theme-option"]')
        else:
            await authenticated_page.click('[data-testid="light-theme-option"]')
        
        # Wait for theme to apply
        await authenticated_page.wait_for_timeout(1000)
        await authenticated_page.wait_for_load_state("networkidle")
        
        # Hide dynamic elements
        await authenticated_page.add_style_tag(content="""
            [data-testid="current-time"],
            [data-testid="last-updated"] {
                visibility: hidden !important;
            }
        """)
        
        # Take screenshot
        await expect(authenticated_page).to_have_screenshot(
            f"dashboard-{theme}-theme.png",
            full_page=True
        )
    
    @pytest.mark.parametrize("theme", ["light", "dark"])
    async def test_job_search_theme_visual(
        self, 
        authenticated_page: Page,
        theme: str,
        screenshot_on_failure
    ):
        """Test job search visual consistency across themes."""
        # Navigate and set theme
        await authenticated_page.goto("http://localhost:3000/jobs/search")
        
        await authenticated_page.click('[data-testid="theme-toggle"]')
        if theme == "dark":
            await authenticated_page.click('[data-testid="dark-theme-option"]')
        else:
            await authenticated_page.click('[data-testid="light-theme-option"]')
        
        await authenticated_page.wait_for_timeout(1000)
        
        # Perform search
        await authenticated_page.fill('[data-testid="search-input"]', "python")
        await authenticated_page.click('[data-testid="search-button"]')
        await authenticated_page.wait_for_selector('[data-testid="search-results"]')
        
        # Hide dynamic elements
        await authenticated_page.add_style_tag(content="""
            [data-testid="posted-date"] {
                visibility: hidden !important;
            }
        """)
        
        await expect(authenticated_page).to_have_screenshot(
            f"job-search-{theme}-theme.png",
            full_page=True
        )