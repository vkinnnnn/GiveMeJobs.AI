"""
Playwright configuration for E2E tests.
"""

from playwright.sync_api import sync_playwright
import os

# Playwright configuration
PLAYWRIGHT_CONFIG = {
    "testDir": "tests/e2e",
    "timeout": 30000,  # 30 seconds per test
    "expect": {
        "timeout": 5000  # 5 seconds for assertions
    },
    "fullyParallel": True,
    "forbidOnly": bool(os.getenv("CI")),  # Fail if test.only in CI
    "retries": 2 if os.getenv("CI") else 0,  # Retry failed tests in CI
    "workers": 4 if os.getenv("CI") else 2,  # Parallel workers
    "reporter": [
        ["html", {"outputFolder": "test-results/playwright-report"}],
        ["junit", {"outputFile": "test-results/junit.xml"}],
        ["json", {"outputFile": "test-results/results.json"}]
    ],
    "use": {
        "baseURL": "http://localhost:3000",
        "trace": "on-first-retry",  # Collect trace on first retry
        "screenshot": "only-on-failure",
        "video": "retain-on-failure",
        "actionTimeout": 10000,  # 10 seconds for actions
        "navigationTimeout": 30000,  # 30 seconds for navigation
    },
    "projects": [
        {
            "name": "chromium",
            "use": {
                "browserName": "chromium",
                "viewport": {"width": 1280, "height": 720},
                "ignoreHTTPSErrors": True,
            }
        },
        {
            "name": "firefox",
            "use": {
                "browserName": "firefox",
                "viewport": {"width": 1280, "height": 720},
                "ignoreHTTPSErrors": True,
            }
        },
        {
            "name": "webkit",
            "use": {
                "browserName": "webkit",
                "viewport": {"width": 1280, "height": 720},
                "ignoreHTTPSErrors": True,
            }
        },
        {
            "name": "mobile-chrome",
            "use": {
                "browserName": "chromium",
                "viewport": {"width": 375, "height": 667},
                "deviceScaleFactor": 2,
                "isMobile": True,
                "hasTouch": True,
                "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15"
            }
        },
        {
            "name": "mobile-safari",
            "use": {
                "browserName": "webkit",
                "viewport": {"width": 375, "height": 667},
                "deviceScaleFactor": 2,
                "isMobile": True,
                "hasTouch": True,
                "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15"
            }
        }
    ],
    "webServer": {
        "command": "npm run dev",
        "port": 3000,
        "timeout": 120000,  # 2 minutes to start server
        "reuseExistingServer": not bool(os.getenv("CI"))
    }
}

def setup_playwright():
    """Set up Playwright browsers."""
    with sync_playwright() as p:
        # Install browsers if not already installed
        p.chromium.launch()
        p.firefox.launch()
        p.webkit.launch()

if __name__ == "__main__":
    setup_playwright()
    print("Playwright setup completed!")