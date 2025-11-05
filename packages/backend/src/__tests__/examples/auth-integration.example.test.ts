/**
 * Example: Properly Configured Authentication Integration Test
 * This shows how to write integration tests with proper auth setup
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { setupTestDatabase, teardownTestDatabase, cleanupTestData, createTestUserWithAuth } from '../setup';
import { createTestApp } from '../helpers/test-app.helper';
import { createAuthHelper, authTestPatterns } from '../helpers/test-auth.helper';

const app = createTestApp();
const authHelper = createAuthHelper(app);

let testUserData: any;

beforeAll(async () => {
  await setupTestDatabase();
});

afterAll(async () => {
  await teardownTestDatabase();
});

beforeEach(async () => {
  await cleanupTestData();
  testUserData = await createTestUserWithAuth();
});

describe('Authentication Integration Example', () => {
  describe('Protected Endpoints', () => {
    it('should require authentication for profile access', async () => {
      await authHelper.expectAuthRequired('get', `/api/users/${testUserData.user.id}/profile`);
    });

    it('should work with valid authentication', async () => {
      const response = await authHelper.expectAuthSuccess(
        'get',
        `/api/users/${testUserData.user.id}/profile`,
        testUserData.user.id,
        testUserData.user.email
      );

      expect(response.body.success).toBe(true);
    });

    it('should reject invalid tokens', async () => {
      await authHelper.expectInvalidToken('get', `/api/users/${testUserData.user.id}/profile`);
    });
  });

  describe('Token Validation Patterns', () => {
    it('should validate token structure and content', async () => {
      await authTestPatterns.testTokenValidation(app, `/api/users/${testUserData.user.id}/profile`);
    });
  });

  describe('CRUD Operations with Auth', () => {
    it('should test complete CRUD auth pattern', async () => {
      const createData = {
        name: 'JavaScript',
        category: 'technical',
        proficiencyLevel: 4,
        yearsOfExperience: 3
      };

      const updateData = {
        proficiencyLevel: 5,
        yearsOfExperience: 4
      };

      await authTestPatterns.testCrudAuth(
        app,
        `/api/users/${testUserData.user.id}/skills`,
        'skill-id',
        testUserData.user.id,
        testUserData.user.email,
        createData,
        updateData
      );
    });
  });
});