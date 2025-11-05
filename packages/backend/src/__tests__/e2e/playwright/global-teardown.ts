import { pgPool } from '../../../config/database';
import { redisClient } from '../../../config/redis-config';

/**
 * Global Teardown for Playwright E2E Tests
 * 
 * This teardown runs once after all tests and:
 * - Cleans up test data
 * - Closes database connections
 * - Performs final cleanup
 * 
 * Requirements: 14.3 - End-to-end testing cleanup
 */

async function globalTeardown() {
  console.log('🧹 Starting E2E test environment cleanup...');

  try {
    // Clean up test data
    await cleanupTestData();

    // Close database connections
    await closeConnections();

    console.log('✅ E2E test environment cleanup completed successfully');
  } catch (error) {
    console.error('❌ E2E test environment cleanup failed:', error);
    // Don't throw error in teardown to avoid masking test failures
  }
}

/**
 * Clean up all test data
 */
async function cleanupTestData() {
  console.log('🗑️ Cleaning up test data...');

  try {
    // Clean database test data
    await pgPool.query(`
      DELETE FROM user_profiles WHERE user_id IN (
        SELECT id FROM users WHERE email LIKE '%e2e.test%'
      )
    `);
    
    await pgPool.query(`
      DELETE FROM job_applications WHERE user_id IN (
        SELECT id FROM users WHERE email LIKE '%e2e.test%'
      )
    `);
    
    await pgPool.query(`
      DELETE FROM job_postings WHERE title LIKE '%E2E Test%'
    `);
    
    await pgPool.query(`
      DELETE FROM users WHERE email LIKE '%e2e.test%'
    `);

    // Clean Redis test data
    const keys = await redisClient.keys('*e2e*');
    if (keys.length > 0) {
      await redisClient.del(keys);
    }

    // Clean session data
    const sessionKeys = await redisClient.keys('session:*');
    for (const key of sessionKeys) {
      const sessionData = await redisClient.get(key);
      if (sessionData && sessionData.includes('e2e.test')) {
        await redisClient.del(key);
      }
    }

    console.log('✅ Test data cleaned successfully');
  } catch (error) {
    console.error('❌ Test data cleanup failed:', error);
  }
}

/**
 * Close all database connections
 */
async function closeConnections() {
  console.log('🔌 Closing database connections...');

  try {
    // Close PostgreSQL connection pool
    await pgPool.end();
    console.log('✅ PostgreSQL connection closed');

    // Close Redis connection
    await redisClient.quit();
    console.log('✅ Redis connection closed');
  } catch (error) {
    console.error('❌ Failed to close connections:', error);
  }
}

export default globalTeardown;