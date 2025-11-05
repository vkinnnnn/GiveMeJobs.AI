import { pgPool } from '../config/database';
import { redisClient } from '../config/redis-config';
import dotenv from 'dotenv';
import { generateTestToken } from './helpers/auth.helper';

// Load test environment FIRST
dotenv.config({ path: '.env.test' });

// Ensure JWT configuration is loaded
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'test-secret-key-for-testing-only';
}
if (!process.env.JWT_REFRESH_SECRET) {
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key';
}

/**
 * Test Setup
 * Handles database cleanup and connection management for tests
 */

export const setupTestDatabase = async () => {
  // Ensure Redis is connected for tests
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }
  
  // Clean up test data before each test suite
  await cleanupTestData();
};

export const teardownTestDatabase = async () => {
  // Clean up test data after tests
  await cleanupTestData();
  
  // Close database connections
  if (pgPool.totalCount > 0) {
    await pgPool.end();
  }
  if (redisClient.isOpen) {
    await redisClient.quit();
  }
};

export const cleanupTestData = async () => {
  const client = await pgPool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Delete test data in reverse order of dependencies
    await client.query(`DELETE FROM career_goals WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%test%')`);
    await client.query(`DELETE FROM education WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%test%')`);
    await client.query(`DELETE FROM experience WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%test%')`);
    await client.query(`DELETE FROM skills WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%test%')`);
    await client.query(`DELETE FROM user_profiles WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%test%')`);
    await client.query(`DELETE FROM users WHERE email LIKE '%test%'`);
    
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const createTestUser = async (email?: string) => {
  const client = await pgPool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Use provided email or generate unique one
    const userEmail = email || `test.user.${Date.now()}@example.com`;
    
    // Create test user
    const userResult = await client.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, professional_headline)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, first_name, last_name, professional_headline`,
      [
        userEmail,
        '$2b$10$abcdefghijklmnopqrstuvwxyz', // Dummy hash
        'Test',
        'User',
        'Software Engineer'
      ]
    );
    
    const user = userResult.rows[0];
    
    // Create user profile
    await client.query(
      `INSERT INTO user_profiles (user_id, skill_score, preferences)
       VALUES ($1, $2, $3)`,
      [user.id, 0, JSON.stringify({})]
    );
    
    await client.query('COMMIT');
    
    return user;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Create a test user with authentication token
 */
export const createTestUserWithAuth = async (email?: string) => {
  const user = await createTestUser(email);
  const token = generateTestToken(user.id, user.email);
  
  return {
    user,
    token,
    authHeader: `Bearer ${token}`,
  };
};
