import { FullConfig } from '@playwright/test';

/**
 * Global teardown for E2E tests
 * Runs once after all tests
 */
async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting global E2E test teardown...');
  
  // Add cleanup tasks here:
  // - Remove test users from database
  // - Clean up test data
  // - Reset test environment
  
  console.log('✅ Global teardown complete');
}

export default globalTeardown;
