/**
 * Authentication Helper for Tests
 * Provides consistent JWT token generation and validation for testing
 */

import jwt from 'jsonwebtoken';
import { JWTPayload } from '../../types/auth.types';

// Use the same JWT configuration as the main application
const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-for-testing-only';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';

/**
 * Generate a valid JWT token for testing
 * Uses the same secret and payload structure as the auth middleware
 */
export function generateTestToken(userId: string, email: string): string {
  const payload: JWTPayload = {
    userId,
    email,
    type: 'access',
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

/**
 * Generate a refresh token for testing
 */
export function generateTestRefreshToken(userId: string, email: string): string {
  const payload: JWTPayload = {
    userId,
    email,
    type: 'refresh',
  };

  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET || 'test-refresh-secret-key', {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  });
}

/**
 * Create authorization header for tests
 */
export function createAuthHeader(token: string): string {
  return `Bearer ${token}`;
}

/**
 * Generate both access and refresh tokens for testing
 */
export function generateTestTokens(userId: string, email: string) {
  return {
    accessToken: generateTestToken(userId, email),
    refreshToken: generateTestRefreshToken(userId, email),
    expiresIn: 3600, // 1 hour in seconds
    tokenType: 'Bearer' as const,
  };
}

/**
 * Verify that a token has the correct structure for testing
 */
export function verifyTestToken(token: string): JWTPayload {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as JWTPayload;
    
    if (payload.type !== 'access') {
      throw new Error('Invalid token type for access token');
    }

    return payload;
  } catch (error) {
    throw new Error(`Invalid test token: ${error.message}`);
  }
}