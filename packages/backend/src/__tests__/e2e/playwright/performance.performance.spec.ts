import { test, expect, Page } from '@playwright/test';

/**
 * Performance Tests for GiveMeJobs Platform
 * 
 * Tests performance metrics including:
 * - Page load times
 * - API response times
 * - Memory usage
 * - Network performance
 * - Core Web Vitals
 * 
 * Requirements: 14.4, 12.1, 12.2, 12.3 - Performance and load testing
 */

test.describe('Performance Tests', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    
    // Enable performance monitoring
    await page.addInitScript(() => {
      // Track performance metrics
      window.performanceMetrics = {
        navigationStart: performance.timing.navigationStart,
        loadEventEnd: 0,
        domContentLoaded: 0,
        firstPaint: 0,
        firstContentfulPaint: 0,
        largestContentfulPaint: 0,
        cumulativeLayoutShift: 0,
        firstInputDelay: 0,
      };

      // Capture Core Web Vitals
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'paint') {
            if (entry.name === 'first-paint') {
              window.performanceMetrics.firstPaint = entry.startTime;
            } else if (entry.name === 'first-contentful-paint') {
              window.performanceMetrics.firstContentfulPaint = entry.startTime;
            }
          } else if (entry.entryType === 'largest-contentful-paint') {
            window.performanceMetrics.largestContentfulPaint = entry.startTime;
          } else if (entry.entryType === 'layout-shift') {
            if (!entry.hadRecentInput) {
              window.performanceMetrics.cumulativeLayoutShift += entry.value;
            }
          } else if (entry.entryType === 'first-input') {
            window.performanceMetrics.firstInputDelay = entry.processingStart - entry.startTime;
          }
        }
      }).observe({ entryTypes: ['paint', 'largest-contentful-paint', 'layout-shift', 'first-input'] });

      // Track DOM Content Loaded
      document.addEventListener('DOMContentLoaded', () => {
        window.performanceMetrics.domContentLoaded = performance.now();
      });

      // Track Load Event
      window.addEventListener('load', () => {
        window.performanceMetrics.loadEventEnd = performance.now();
      });
    });
  });

  test.afterEach(async () => {
    await page.close();
  });

  test.describe('Page Load Performance', () => {
    test('homepage should load within performance budget', async () => {
      const startTime = Date.now();
      
      await page.goto('/', { waitUntil: 'networkidle' });
      
      const loadTime = Date.now() - startTime;
      
      // Performance budget: 3 seconds for complete page load
      expect(loadTime).toBeLessThan(3000);
      
      // Get performance metrics
      const metrics = await page.evaluate(() => window.performanceMetrics);
      
      // Core Web Vitals thresholds
      expect(metrics.firstContentfulPaint).toBeLessThan(1800); // 1.8s
      expect(metrics.largestContentfulPaint).toBeLessThan(2500); // 2.5s
      expect(metrics.cumulativeLayoutShift).toBeLessThan(0.1); // 0.1
      
      console.log('Homepage Performance Metrics:', {
        totalLoadTime: loadTime,
        firstContentfulPaint: metrics.firstContentfulPaint,
        largestContentfulPaint: metrics.largestContentfulPaint,
        cumulativeLayoutShift: metrics.cumulativeLayoutShift,
      });
    });

    test('login page should load within performance budget', async () => {
      const startTime = Date.now();
      
      await page.goto('/login', { waitUntil: 'networkidle' });
      
      const loadTime = Date.now() - startTime;
      
      expect(loadTime).toBeLessThan(2000); // 2 seconds for login page
      
      const metrics = await page.evaluate(() => window.performanceMetrics);
      
      expect(metrics.firstContentfulPaint).toBeLessThan(1200);
      expect(metrics.largestContentfulPaint).toBeLessThan(2000);
      
      console.log('Login Page Performance Metrics:', {
        totalLoadTime: loadTime,
        firstContentfulPaint: metrics.firstContentfulPaint,
        largestContentfulPaint: metrics.largestContentfulPaint,
      });
    });

    test('dashboard should load within performance budget for authenticated users', async () => {
      // Use authenticated state
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', 'user.e2e.test@example.com');
      await page.fill('[data-testid="password-input"]', 'UserTest123!');
      await page.click('[data-testid="login-button"]');
      await page.waitForURL('**/dashboard');
      
      const startTime = Date.now();
      
      // Navigate to dashboard again to measure load time
      await page.goto('/dashboard', { waitUntil: 'networkidle' });
      
      const loadTime = Date.now() - startTime;
      
      expect(loadTime).toBeLessThan(3000); // 3 seconds for dashboard
      
      const metrics = await page.evaluate(() => window.performanceMetrics);
      
      expect(metrics.firstContentfulPaint).toBeLessThan(1500);
      expect(metrics.largestContentfulPaint).toBeLessThan(2500);
      
      console.log('Dashboard Performance Metrics:', {
        totalLoadTime: loadTime,
        firstContentfulPaint: metrics.firstContentfulPaint,
        largestContentfulPaint: metrics.largestContentfulPaint,
      });
    });

    test('job search page should load within performance budget', async () => {
      // Login first
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', 'user.e2e.test@example.com');
      await page.fill('[data-testid="password-input"]', 'UserTest123!');
      await page.click('[data-testid="login-button"]');
      await page.waitForURL('**/dashboard');
      
      const startTime = Date.now();
      
      await page.goto('/jobs', { waitUntil: 'networkidle' });
      
      const loadTime = Date.now() - startTime;
      
      expect(loadTime).toBeLessThan(4000); // 4 seconds for job search with data
      
      const metrics = await page.evaluate(() => window.performanceMetrics);
      
      expect(metrics.firstContentfulPaint).toBeLessThan(1800);
      expect(metrics.largestContentfulPaint).toBeLessThan(3000);
      
      console.log('Job Search Performance Metrics:', {
        totalLoadTime: loadTime,
        firstContentfulPaint: metrics.firstContentfulPaint,
        largestContentfulPaint: metrics.largestContentfulPaint,
      });
    });
  });

  test.describe('API Response Performance', () => {
    test('authentication API should respond quickly', async () => {
      await page.goto('/login');
      
      // Monitor network requests
      const apiRequests: any[] = [];
      page.on('response', response => {
        if (response.url().includes('/api/auth/')) {
          apiRequests.push({
            url: response.url(),
            status: response.status(),
            timing: response.timing(),
          });
        }
      });
      
      const startTime = Date.now();
      
      await page.fill('[data-testid="email-input"]', 'user.e2e.test@example.com');
      await page.fill('[data-testid="password-input"]', 'UserTest123!');
      await page.click('[data-testid="login-button"]');
      
      await page.waitForURL('**/dashboard');
      
      const totalTime = Date.now() - startTime;
      
      // Authentication should complete within 2 seconds
      expect(totalTime).toBeLessThan(2000);
      
      // Check API response times
      const loginRequest = apiRequests.find(req => req.url.includes('/login'));
      if (loginRequest) {
        expect(loginRequest.status).toBe(200);
        console.log('Login API Performance:', {
          responseTime: loginRequest.timing,
          totalAuthTime: totalTime,
        });
      }
    });

    test('job search API should respond quickly', async () => {
      // Login first
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', 'user.e2e.test@example.com');
      await page.fill('[data-testid="password-input"]', 'UserTest123!');
      await page.click('[data-testid="login-button"]');
      await page.waitForURL('**/dashboard');
      
      await page.goto('/jobs');
      
      // Monitor job search API requests
      const searchRequests: any[] = [];
      page.on('response', response => {
        if (response.url().includes('/api/jobs/search')) {
          searchRequests.push({
            url: response.url(),
            status: response.status(),
            timing: response.timing(),
          });
        }
      });
      
      const startTime = Date.now();
      
      await page.fill('[data-testid="search-input"]', 'Software Engineer');
      await page.click('[data-testid="search-button"]');
      
      // Wait for results
      await page.waitForSelector('[data-testid="job-card"]', { timeout: 10000 });
      
      const searchTime = Date.now() - startTime;
      
      // Job search should complete within 3 seconds
      expect(searchTime).toBeLessThan(3000);
      
      console.log('Job Search Performance:', {
        totalSearchTime: searchTime,
        apiRequests: searchRequests.length,
      });
    });

    test('profile API should respond quickly', async () => {
      // Login first
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', 'user.e2e.test@example.com');
      await page.fill('[data-testid="password-input"]', 'UserTest123!');
      await page.click('[data-testid="login-button"]');
      await page.waitForURL('**/dashboard');
      
      // Monitor profile API requests
      const profileRequests: any[] = [];
      page.on('response', response => {
        if (response.url().includes('/api/profile') || response.url().includes('/api/users/me')) {
          profileRequests.push({
            url: response.url(),
            status: response.status(),
            timing: response.timing(),
          });
        }
      });
      
      const startTime = Date.now();
      
      await page.goto('/profile');
      await page.waitForSelector('[data-testid="profile-form"]');
      
      const loadTime = Date.now() - startTime;
      
      // Profile should load within 2 seconds
      expect(loadTime).toBeLessThan(2000);
      
      console.log('Profile API Performance:', {
        totalLoadTime: loadTime,
        apiRequests: profileRequests.length,
      });
    });
  });

  test.describe('Memory Usage Performance', () => {
    test('should not have memory leaks during navigation', async () => {
      await page.goto('/login');
      
      // Get initial memory usage
      const initialMemory = await page.evaluate(() => {
        if ('memory' in performance) {
          return (performance as any).memory.usedJSHeapSize;
        }
        return 0;
      });
      
      // Navigate through multiple pages
      const pages = ['/login', '/register', '/forgot-password', '/login'];
      
      for (const pagePath of pages) {
        await page.goto(pagePath);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000); // Allow for cleanup
      }
      
      // Force garbage collection if available
      await page.evaluate(() => {
        if ('gc' in window) {
          (window as any).gc();
        }
      });
      
      // Get final memory usage
      const finalMemory = await page.evaluate(() => {
        if ('memory' in performance) {
          return (performance as any).memory.usedJSHeapSize;
        }
        return 0;
      });
      
      if (initialMemory > 0 && finalMemory > 0) {
        const memoryIncrease = finalMemory - initialMemory;
        const memoryIncreasePercent = (memoryIncrease / initialMemory) * 100;
        
        // Memory should not increase by more than 50% during navigation
        expect(memoryIncreasePercent).toBeLessThan(50);
        
        console.log('Memory Usage:', {
          initial: initialMemory,
          final: finalMemory,
          increase: memoryIncrease,
          increasePercent: memoryIncreasePercent,
        });
      }
    });

    test('should handle large job search results efficiently', async () => {
      // Login first
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', 'user.e2e.test@example.com');
      await page.fill('[data-testid="password-input"]', 'UserTest123!');
      await page.click('[data-testid="login-button"]');
      await page.waitForURL('**/dashboard');
      
      await page.goto('/jobs');
      
      const initialMemory = await page.evaluate(() => {
        if ('memory' in performance) {
          return (performance as any).memory.usedJSHeapSize;
        }
        return 0;
      });
      
      // Perform multiple searches to load data
      const searches = ['Engineer', 'Developer', 'Manager', 'Analyst', 'Designer'];
      
      for (const searchTerm of searches) {
        await page.fill('[data-testid="search-input"]', searchTerm);
        await page.click('[data-testid="search-button"]');
        await page.waitForSelector('[data-testid="job-card"]', { timeout: 10000 });
        await page.waitForTimeout(2000);
      }
      
      const finalMemory = await page.evaluate(() => {
        if ('memory' in performance) {
          return (performance as any).memory.usedJSHeapSize;
        }
        return 0;
      });
      
      if (initialMemory > 0 && finalMemory > 0) {
        const memoryIncrease = finalMemory - initialMemory;
        const memoryIncreasePercent = (memoryIncrease / initialMemory) * 100;
        
        // Memory should not increase by more than 100% during heavy usage
        expect(memoryIncreasePercent).toBeLessThan(100);
        
        console.log('Job Search Memory Usage:', {
          initial: initialMemory,
          final: finalMemory,
          increase: memoryIncrease,
          increasePercent: memoryIncreasePercent,
        });
      }
    });
  });

  test.describe('Network Performance', () => {
    test('should minimize network requests on page load', async () => {
      const networkRequests: any[] = [];
      
      page.on('request', request => {
        networkRequests.push({
          url: request.url(),
          method: request.method(),
          resourceType: request.resourceType(),
        });
      });
      
      await page.goto('/dashboard');
      
      // Wait for all network activity to complete
      await page.waitForLoadState('networkidle');
      
      // Analyze network requests
      const jsRequests = networkRequests.filter(req => req.resourceType === 'script');
      const cssRequests = networkRequests.filter(req => req.resourceType === 'stylesheet');
      const imageRequests = networkRequests.filter(req => req.resourceType === 'image');
      const apiRequests = networkRequests.filter(req => req.url.includes('/api/'));
      
      // Performance budgets
      expect(jsRequests.length).toBeLessThan(10); // Max 10 JS files
      expect(cssRequests.length).toBeLessThan(5); // Max 5 CSS files
      expect(imageRequests.length).toBeLessThan(20); // Max 20 images
      expect(apiRequests.length).toBeLessThan(15); // Max 15 API calls
      
      console.log('Network Requests Analysis:', {
        total: networkRequests.length,
        javascript: jsRequests.length,
        css: cssRequests.length,
        images: imageRequests.length,
        api: apiRequests.length,
      });
    });

    test('should use caching effectively', async () => {
      // First visit
      await page.goto('/jobs');
      await page.waitForLoadState('networkidle');
      
      const firstVisitRequests: any[] = [];
      page.on('response', response => {
        firstVisitRequests.push({
          url: response.url(),
          status: response.status(),
          fromCache: response.fromServiceWorker(),
        });
      });
      
      // Second visit (should use cache)
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Wait a bit for cache analysis
      await page.waitForTimeout(2000);
      
      const cachedRequests = firstVisitRequests.filter(req => 
        req.fromCache || req.status === 304
      );
      
      const cacheHitRate = (cachedRequests.length / firstVisitRequests.length) * 100;
      
      // At least 30% of requests should be cached on reload
      expect(cacheHitRate).toBeGreaterThan(30);
      
      console.log('Cache Performance:', {
        totalRequests: firstVisitRequests.length,
        cachedRequests: cachedRequests.length,
        cacheHitRate: cacheHitRate,
      });
    });
  });

  test.describe('Interaction Performance', () => {
    test('search interactions should be responsive', async () => {
      // Login first
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', 'user.e2e.test@example.com');
      await page.fill('[data-testid="password-input"]', 'UserTest123!');
      await page.click('[data-testid="login-button"]');
      await page.waitForURL('**/dashboard');
      
      await page.goto('/jobs');
      
      // Measure search input responsiveness
      const searchInput = page.locator('[data-testid="search-input"]');
      
      const startTime = Date.now();
      await searchInput.fill('Software Engineer');
      const inputTime = Date.now() - startTime;
      
      // Input should be responsive (< 100ms)
      expect(inputTime).toBeLessThan(100);
      
      // Measure search button click responsiveness
      const clickStartTime = Date.now();
      await page.click('[data-testid="search-button"]');
      
      // Wait for loading indicator or results
      await Promise.race([
        page.waitForSelector('[data-testid="loading-spinner"]'),
        page.waitForSelector('[data-testid="job-card"]'),
      ]);
      
      const responseTime = Date.now() - clickStartTime;
      
      // Search should start responding within 500ms
      expect(responseTime).toBeLessThan(500);
      
      console.log('Search Interaction Performance:', {
        inputResponseTime: inputTime,
        searchResponseTime: responseTime,
      });
    });

    test('form interactions should be smooth', async () => {
      await page.goto('/register');
      
      const formFields = [
        '[data-testid="email-input"]',
        '[data-testid="password-input"]',
        '[data-testid="confirm-password-input"]',
        '[data-testid="first-name-input"]',
        '[data-testid="last-name-input"]',
      ];
      
      const interactionTimes: number[] = [];
      
      for (const field of formFields) {
        const startTime = Date.now();
        await page.fill(field, 'test value');
        const interactionTime = Date.now() - startTime;
        
        interactionTimes.push(interactionTime);
        
        // Each field interaction should be < 50ms
        expect(interactionTime).toBeLessThan(50);
      }
      
      const averageInteractionTime = interactionTimes.reduce((a, b) => a + b, 0) / interactionTimes.length;
      
      console.log('Form Interaction Performance:', {
        averageTime: averageInteractionTime,
        maxTime: Math.max(...interactionTimes),
        minTime: Math.min(...interactionTimes),
      });
    });
  });

  test.describe('Mobile Performance', () => {
    test('should perform well on mobile devices', async () => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Simulate slower mobile network
      await page.route('**/*', async route => {
        await new Promise(resolve => setTimeout(resolve, 100)); // Add 100ms delay
        await route.continue();
      });
      
      const startTime = Date.now();
      
      await page.goto('/jobs', { waitUntil: 'networkidle' });
      
      const loadTime = Date.now() - startTime;
      
      // Mobile should load within 5 seconds (accounting for slower network)
      expect(loadTime).toBeLessThan(5000);
      
      const metrics = await page.evaluate(() => window.performanceMetrics);
      
      // Mobile-specific performance budgets
      expect(metrics.firstContentfulPaint).toBeLessThan(2500);
      expect(metrics.largestContentfulPaint).toBeLessThan(4000);
      
      console.log('Mobile Performance Metrics:', {
        totalLoadTime: loadTime,
        firstContentfulPaint: metrics.firstContentfulPaint,
        largestContentfulPaint: metrics.largestContentfulPaint,
      });
    });
  });
});