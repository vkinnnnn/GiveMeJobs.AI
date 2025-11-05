/**
 * Test Configuration Validator
 * Ensures test environment is properly configured
 */

import { config } from '../../config';
import { verifyTestToken, generateTestToken } from './auth.helper';

/**
 * Validate that test configuration is correct
 */
export function validateTestConfig(): void {
  const errors: string[] = [];

  // Check environment
  if (process.env.NODE_ENV !== 'test') {
    errors.push(`NODE_ENV should be 'test', got '${process.env.NODE_ENV}'`);
  }

  // Check JWT configuration
  if (!process.env.JWT_SECRET) {
    errors.push('JWT_SECRET is not set in test environment');
  }

  if (!process.env.JWT_REFRESH_SECRET) {
    errors.push('JWT_REFRESH_SECRET is not set in test environment');
  }

  // Check database configuration
  if (!process.env.TEST_DATABASE_URL) {
    errors.push('TEST_DATABASE_URL is not set');
  }

  // Validate JWT token generation and verification
  try {
    const testUserId = 'test-user-id';
    const testEmail = 'test@example.com';
    const token = generateTestToken(testUserId, testEmail);
    const payload = verifyTestToken(token);
    
    if (payload.userId !== testUserId || payload.email !== testEmail) {
      errors.push('JWT token generation/verification mismatch');
    }
  } catch (error) {
    errors.push(`JWT token validation failed: ${error.message}`);
  }

  if (errors.length > 0) {
    throw new Error(`Test configuration errors:\n${errors.join('\n')}`);
  }
}

/**
 * Log test configuration for debugging
 */
export function logTestConfig(): void {
  console.log('Test Configuration:');
  console.log('- NODE_ENV:', process.env.NODE_ENV);
  console.log('- JWT_SECRET:', process.env.JWT_SECRET ? '[SET]' : '[NOT SET]');
  console.log('- JWT_REFRESH_SECRET:', process.env.JWT_REFRESH_SECRET ? '[SET]' : '[NOT SET]');
  console.log('- TEST_DATABASE_URL:', process.env.TEST_DATABASE_URL ? '[SET]' : '[NOT SET]');
  console.log('- Config JWT Secret:', config.jwt.secret ? '[SET]' : '[NOT SET]');
}