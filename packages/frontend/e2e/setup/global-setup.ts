import { chromium, FullConfig } from '@playwright/test';

/**
 * Global setup for E2E tests
 * Runs once before all tests
 */
async function globalSetup(config: FullConfig) {
  const { baseURL } = config.projects[0].use;
  
  console.log('🚀 Starting global E2E test setup...');
  
  // Launch browser for setup
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    // Check if the application is running
    console.log(`📡 Checking if app is available at ${baseURL}...`);
    await page.goto(baseURL || 'http://localhost:3000', { timeout: 30000 });
    console.log('✅ Application is running');
    
    // You can add more setup tasks here:
    // - Create test users in the database
    // - Seed test data
    // - Set up test environment variables
    
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
  
  console.log('✅ Global setup complete');
}

export default globalSetup;
