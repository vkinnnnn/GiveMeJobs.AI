"""
End-to-end test configuration and fixtures.
"""

import pytest
import asyncio
from playwright.async_api import async_playwright, Browser, BrowserContext, Page
from typing import AsyncGenerator
import os
import tempfile
import shutil


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session")
async def browser() -> AsyncGenerator[Browser, None]:
    """Create browser instance for E2E tests."""
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=[
                "--no-sandbox",
                "--disable-dev-shm-usage",
                "--disable-gpu",
                "--disable-web-security",
                "--allow-running-insecure-content"
            ]
        )
        yield browser
        await browser.close()


@pytest.fixture
async def browser_context(browser: Browser) -> AsyncGenerator[BrowserContext, None]:
    """Create browser context with common settings."""
    context = await browser.new_context(
        viewport={"width": 1280, "height": 720},
        ignore_https_errors=True,
        record_video_dir="test-results/videos" if os.getenv("RECORD_VIDEO") else None,
        record_har_path="test-results/network.har" if os.getenv("RECORD_HAR") else None
    )
    yield context
    await context.close()


@pytest.fixture
async def page(browser_context: BrowserContext) -> AsyncGenerator[Page, None]:
    """Create page instance for tests."""
    page = await browser_context.new_page()
    
    # Set up console logging
    page.on("console", lambda msg: print(f"Console: {msg.text}"))
    
    # Set up error handling
    page.on("pageerror", lambda error: print(f"Page Error: {error}"))
    
    yield page
    await page.close()


@pytest.fixture
def test_data_directory():
    """Create temporary directory for test data."""
    temp_dir = tempfile.mkdtemp()
    yield temp_dir
    shutil.rmtree(temp_dir)


@pytest.fixture
def test_user_credentials():
    """Provide test user credentials."""
    return {
        "email": "test.user@example.com",
        "password": "TestPassword123!",
        "first_name": "Test",
        "last_name": "User",
        "professional_headline": "Software Engineer"
    }


@pytest.fixture
def test_job_data():
    """Provide test job data."""
    return {
        "title": "Senior Python Developer",
        "company": "TechCorp Inc",
        "location": "San Francisco, CA",
        "description": "Looking for experienced Python developer with FastAPI experience",
        "salary_min": 120000,
        "salary_max": 160000,
        "employment_type": "full-time",
        "experience_level": "senior"
    }


@pytest.fixture
async def authenticated_page(page: Page, test_user_credentials) -> Page:
    """Create authenticated page session."""
    # Navigate to login page
    await page.goto("http://localhost:3000/login")
    
    # Fill login form
    await page.fill('[data-testid="email-input"]', test_user_credentials["email"])
    await page.fill('[data-testid="password-input"]', test_user_credentials["password"])
    
    # Submit login
    await page.click('[data-testid="login-button"]')
    
    # Wait for navigation to dashboard
    await page.wait_for_url("**/dashboard")
    
    return page


@pytest.fixture
def screenshot_on_failure(request, page: Page):
    """Take screenshot on test failure."""
    yield
    if request.node.rep_call.failed:
        screenshot_path = f"test-results/screenshots/{request.node.name}.png"
        os.makedirs(os.path.dirname(screenshot_path), exist_ok=True)
        asyncio.create_task(page.screenshot(path=screenshot_path))


@pytest.hookimpl(tryfirst=True, hookwrapper=True)
def pytest_runtest_makereport(item, call):
    """Hook to capture test results for screenshot on failure."""
    outcome = yield
    rep = outcome.get_result()
    setattr(item, "rep_" + rep.when, rep)


@pytest.fixture(scope="session", autouse=True)
async def setup_test_environment():
    """Set up test environment before running E2E tests."""
    # Ensure test results directory exists
    os.makedirs("test-results/screenshots", exist_ok=True)
    os.makedirs("test-results/videos", exist_ok=True)
    
    # Set environment variables for testing
    os.environ["NODE_ENV"] = "test"
    os.environ["NEXT_PUBLIC_API_URL"] = "http://localhost:8000"
    
    yield
    
    # Cleanup after tests
    print("E2E test cleanup completed")