/**
 * Comprehensive Authentication Test Helper
 * Provides utilities for testing authentication flows
 */

import request from 'supertest';
import { Express } from 'express';
import { generateTestToken, generateTestTokens } from './auth.helper';
import { createTestUser } from '../setup';

/**
 * Test authentication scenarios
 */
export class TestAuthHelper {
  private app: Express;

  constructor(app: Express) {
    this.app = app;
  }

  /**
   * Test that an endpoint requires authentication
   */
  async expectAuthRequired(method: 'get' | 'post' | 'put' | 'delete', path: string, data?: any) {
    const request_method = request(this.app)[method];
    
    let req = request_method(path);
    
    if (data && (method === 'post' || method === 'put')) {
      req = req.send(data);
    }
    
    const response = await req.expect(401);
    
    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain('Authentication required');
    
    return response;
  }

  /**
   * Test that an endpoint works with valid authentication
   */
  async expectAuthSuccess(
    method: 'get' | 'post' | 'put' | 'delete', 
    path: string, 
    userId: string, 
    email: string,
    data?: any,
    expectedStatus = 200
  ) {
    const token = generateTestToken(userId, email);
    const request_method = request(this.app)[method];
    
    let req = request_method(path).set('Authorization', `Bearer ${token}`);
    
    if (data && (method === 'post' || method === 'put')) {
      req = req.send(data);
    }
    
    const response = await req.expect(expectedStatus);
    
    return response;
  }

  /**
   * Test that an endpoint rejects invalid tokens
   */
  async expectInvalidToken(method: 'get' | 'post' | 'put' | 'delete', path: string, data?: any) {
    const request_method = request(this.app)[method];
    
    let req = request_method(path).set('Authorization', 'Bearer invalid-token');
    
    if (data && (method === 'post' || method === 'put')) {
      req = req.send(data);
    }
    
    const response = await req.expect(401);
    
    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain('Invalid or expired token');
    
    return response;
  }

  /**
   * Create a test user and return auth data
   */
  async createAuthenticatedUser(email?: string) {
    const user = await createTestUser(email);
    const tokens = generateTestTokens(user.id, user.email);
    
    return {
      user,
      tokens,
      authHeader: `Bearer ${tokens.accessToken}`,
    };
  }
}

/**
 * Utility function to create auth helper for any app
 */
export function createAuthHelper(app: Express): TestAuthHelper {
  return new TestAuthHelper(app);
}

/**
 * Common auth test patterns
 */
export const authTestPatterns = {
  /**
   * Test the standard CRUD auth pattern for a resource
   */
  async testCrudAuth(
    app: Express, 
    basePath: string, 
    resourceId: string, 
    userId: string, 
    email: string,
    createData: any,
    updateData: any
  ) {
    const helper = new TestAuthHelper(app);
    
    // Test GET requires auth
    await helper.expectAuthRequired('get', `${basePath}/${resourceId}`);
    
    // Test POST requires auth
    await helper.expectAuthRequired('post', basePath, createData);
    
    // Test PUT requires auth
    await helper.expectAuthRequired('put', `${basePath}/${resourceId}`, updateData);
    
    // Test DELETE requires auth
    await helper.expectAuthRequired('delete', `${basePath}/${resourceId}`);
    
    // Test with valid auth
    await helper.expectAuthSuccess('get', `${basePath}/${resourceId}`, userId, email);
  },

  /**
   * Test token validation patterns
   */
  async testTokenValidation(app: Express, path: string) {
    const helper = new TestAuthHelper(app);
    
    // No token
    await helper.expectAuthRequired('get', path);
    
    // Invalid token
    await helper.expectInvalidToken('get', path);
    
    // Expired token (would need to generate expired token)
    // Malformed token
    await request(app)
      .get(path)
      .set('Authorization', 'InvalidFormat')
      .expect(401);
  },
};