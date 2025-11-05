/**
 * Unit tests for Graceful Degradation Service
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GracefulDegradationService } from '../../services/graceful-degradation.service';
import { Logger } from 'winston';
import { ICacheService } from '../../types/repository.types';
import { Result, ServiceError, UserProfile } from '../../types/service-client.types';

// Mock dependencies
const mockLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn()
} as unknown as Logger;

const mockCache = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
  invalidate: vi.fn(),
  healthCheck: vi.fn().mockResolvedValue({ redis: true, memory: true })
} as unknown as ICacheService;

describe('GracefulDegradationService', () => {
  let gracefulDegradation: GracefulDegradationService;

  beforeEach(() => {
    vi.clearAllMocks();
    gracefulDegradation = new GracefulDegradationService(mockLogger, mockCache);
  });

  describe('Feature Flags', () => {
    it('should check if feature is enabled', () => {
      const isEnabled = gracefulDegradation.isFeatureEnabled('ai-document-generation');
      expect(typeof isEnabled).toBe('boolean');
    });

    it('should get feature flag details', () => {
      const flag = gracefulDegradation.getFeatureFlag('ai-document-generation');
      
      expect(flag).toBeDefined();
      expect(flag!.name).toBe('ai-document-generation');
      expect(flag!.enabled).toBe(true);
      expect(flag!.rolloutPercentage).toBe(100);
    });

    it('should update feature flag', () => {
      gracefulDegradation.updateFeatureFlag('ai-document-generation', {
        enabled: false,
        rolloutPercentage: 50
      });

      const flag = gracefulDegradation.getFeatureFlag('ai-document-generation');
      expect(flag!.enabled).toBe(false);
      expect(flag!.rolloutPercentage).toBe(50);
    });

    it('should handle rollout percentage', () => {
      gracefulDegradation.updateFeatureFlag('semantic-search', {
        rolloutPercentage: 0
      });

      const isEnabled = gracefulDegradation.isFeatureEnabled('semantic-search', {
        userId: 'test-user'
      });
      
      expect(isEnabled).toBe(false);
    });

    it('should handle feature conditions', () => {
      gracefulDegradation.updateFeatureFlag('advanced-analytics', {
        conditions: { userType: 'premium' }
      });

      const isEnabledForPremium = gracefulDegradation.isFeatureEnabled('advanced-analytics', {
        userType: 'premium'
      });
      
      const isEnabledForBasic = gracefulDegradation.isFeatureEnabled('advanced-analytics', {
        userType: 'basic'
      });

      expect(isEnabledForPremium).toBe(true);
      expect(isEnabledForBasic).toBe(false);
    });
  });

  describe('Service Health Monitoring', () => {
    it('should update service health status', () => {
      gracefulDegradation.updateServiceHealth('python-service', true, 150);
      
      const health = gracefulDegradation.getServiceHealth('python-service');
      expect(health).toBeDefined();
      expect(health!.isHealthy).toBe(true);
      expect(health!.responseTime).toBe(150);
      expect(health!.consecutiveFailures).toBe(0);
    });

    it('should track consecutive failures', () => {
      gracefulDegradation.updateServiceHealth('python-service', false);
      gracefulDegradation.updateServiceHealth('python-service', false);
      gracefulDegradation.updateServiceHealth('python-service', false);
      
      const health = gracefulDegradation.getServiceHealth('python-service');
      expect(health!.consecutiveFailures).toBe(3);
      expect(health!.isHealthy).toBe(false);
    });

    it('should reset consecutive failures on recovery', () => {
      gracefulDegradation.updateServiceHealth('python-service', false);
      gracefulDegradation.updateServiceHealth('python-service', false);
      gracefulDegradation.updateServiceHealth('python-service', true);
      
      const health = gracefulDegradation.getServiceHealth('python-service');
      expect(health!.consecutiveFailures).toBe(0);
      expect(health!.isHealthy).toBe(true);
    });

    it('should check if service is healthy', () => {
      gracefulDegradation.updateServiceHealth('test-service', true);
      expect(gracefulDegradation.isServiceHealthy('test-service')).toBe(true);

      gracefulDegradation.updateServiceHealth('test-service', false);
      expect(gracefulDegradation.isServiceHealthy('test-service')).toBe(false);

      // Unknown service should default to healthy
      expect(gracefulDegradation.isServiceHealthy('unknown-service')).toBe(true);
    });
  });

  describe('Fallback Execution', () => {
    it('should execute primary function when successful', async () => {
      const primaryFunction = vi.fn().mockResolvedValue(Result.success('primary-result'));
      const fallbackStrategy = {
        name: 'fallback',
        priority: 1,
        enabled: true,
        execute: vi.fn().mockResolvedValue(Result.success('fallback-result'))
      };

      const result = await gracefulDegradation.executeWithFallback(
        'test-operation',
        primaryFunction,
        [fallbackStrategy]
      );

      expect(result.success).toBe(true);
      expect(result.data).toBe('primary-result');
      expect(primaryFunction).toHaveBeenCalled();
      expect(fallbackStrategy.execute).not.toHaveBeenCalled();
    });

    it('should execute fallback when primary fails', async () => {
      const error = new Error('Primary failed') as ServiceError;
      error.code = 'PRIMARY_FAILED';
      
      const primaryFunction = vi.fn().mockResolvedValue(Result.error(error));
      const fallbackStrategy = {
        name: 'fallback',
        priority: 1,
        enabled: true,
        execute: vi.fn().mockResolvedValue(Result.success('fallback-result'))
      };

      const result = await gracefulDegradation.executeWithFallback(
        'test-operation',
        primaryFunction,
        [fallbackStrategy]
      );

      expect(result.success).toBe(true);
      expect(result.data).toBe('fallback-result');
      expect(primaryFunction).toHaveBeenCalled();
      expect(fallbackStrategy.execute).toHaveBeenCalled();
    });

    it('should try fallbacks in priority order', async () => {
      const primaryFunction = vi.fn().mockResolvedValue(Result.error(new Error('Primary failed')));
      const fallback1 = {
        name: 'fallback-1',
        priority: 2,
        enabled: true,
        execute: vi.fn().mockResolvedValue(Result.error(new Error('Fallback 1 failed')))
      };
      const fallback2 = {
        name: 'fallback-2',
        priority: 1,
        enabled: true,
        execute: vi.fn().mockResolvedValue(Result.success('fallback-2-result'))
      };

      const result = await gracefulDegradation.executeWithFallback(
        'test-operation',
        primaryFunction,
        [fallback1, fallback2]
      );

      expect(result.success).toBe(true);
      expect(result.data).toBe('fallback-2-result');
      expect(fallback2.execute).toHaveBeenCalledBefore(fallback1.execute as any);
    });

    it('should skip disabled fallbacks', async () => {
      const primaryFunction = vi.fn().mockResolvedValue(Result.error(new Error('Primary failed')));
      const disabledFallback = {
        name: 'disabled-fallback',
        priority: 1,
        enabled: false,
        execute: vi.fn().mockResolvedValue(Result.success('disabled-result'))
      };
      const enabledFallback = {
        name: 'enabled-fallback',
        priority: 2,
        enabled: true,
        execute: vi.fn().mockResolvedValue(Result.success('enabled-result'))
      };

      const result = await gracefulDegradation.executeWithFallback(
        'test-operation',
        primaryFunction,
        [disabledFallback, enabledFallback]
      );

      expect(result.success).toBe(true);
      expect(result.data).toBe('enabled-result');
      expect(disabledFallback.execute).not.toHaveBeenCalled();
      expect(enabledFallback.execute).toHaveBeenCalled();
    });

    it('should fail when all strategies fail', async () => {
      const primaryFunction = vi.fn().mockResolvedValue(Result.error(new Error('Primary failed')));
      const fallbackStrategy = {
        name: 'fallback',
        priority: 1,
        enabled: true,
        execute: vi.fn().mockResolvedValue(Result.error(new Error('Fallback failed')))
      };

      const result = await gracefulDegradation.executeWithFallback(
        'test-operation',
        primaryFunction,
        [fallbackStrategy]
      );

      expect(result.success).toBe(false);
      expect(result.error.code).toBe('ALL_FALLBACKS_FAILED');
    });
  });

  describe('Cached Responses', () => {
    it('should get cached response', async () => {
      const testData = { test: 'data' };
      vi.mocked(mockCache.get).mockResolvedValue(JSON.stringify(testData));

      const result = await gracefulDegradation.getCachedResponse('test-key');
      expect(result).toEqual(testData);
    });

    it('should return null for missing cache', async () => {
      vi.mocked(mockCache.get).mockResolvedValue(null);

      const result = await gracefulDegradation.getCachedResponse('missing-key');
      expect(result).toBeNull();
    });

    it('should set cached response', async () => {
      const testData = { test: 'data' };
      
      await gracefulDegradation.setCachedResponse('test-key', testData, 3600);
      
      expect(mockCache.set).toHaveBeenCalledWith(
        'test-key',
        JSON.stringify(testData),
        3600
      );
    });

    it('should handle cache errors gracefully', async () => {
      vi.mocked(mockCache.get).mockRejectedValue(new Error('Cache error'));

      const result = await gracefulDegradation.getCachedResponse('error-key');
      expect(result).toBeNull();
    });
  });

  describe('Simplified Fallbacks', () => {
    it('should generate simplified job matches', async () => {
      const userProfile: UserProfile = {
        id: 'test-user',
        skills: ['JavaScript', 'React'],
        experience: [],
        education: [],
        preferences: {
          remoteWork: true,
          salaryRange: { min: 50000, max: 100000 },
          locations: ['Remote'],
          jobTypes: ['full-time']
        },
        preferredLocations: ['New York']
      };

      const result = await gracefulDegradation.getSimplifiedJobMatches(userProfile);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(Array.isArray(result.data)).toBe(true);
        expect(result.data.length).toBeGreaterThan(0);
        expect(result.data[0].jobData.title).toContain('javascript');
      }
    });

    it('should generate basic analytics', async () => {
      const result = await gracefulDegradation.getBasicAnalytics('test-user');
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.metrics).toBeDefined();
        expect(result.data.insights).toBeDefined();
        expect(result.data.successPrediction).toBeDefined();
        expect(result.data.recommendations).toBeDefined();
        expect(result.data.generatedAt).toBeDefined();
      }
    });

    it('should generate basic resume', async () => {
      const userProfile: UserProfile = {
        id: 'test-user',
        skills: ['Python', 'Django'],
        experience: [{
          id: 'exp-1',
          title: 'Backend Developer',
          company: 'Tech Corp',
          duration: '2 years',
          description: 'Python development',
          skills: ['Python', 'Django']
        }],
        education: [{
          id: 'edu-1',
          degree: 'Computer Science',
          institution: 'University',
          year: 2020
        }],
        preferences: {
          remoteWork: false,
          salaryRange: { min: 60000, max: 120000 },
          locations: ['San Francisco'],
          jobTypes: ['full-time']
        }
      };

      const jobPosting = {
        id: 'test-job',
        title: 'Python Developer',
        company: 'Test Company',
        description: 'Looking for Python developer',
        requirements: ['Python', 'Django'],
        location: 'San Francisco',
        requiredSkills: ['Python']
      };

      const result = await gracefulDegradation.generateBasicResume(userProfile, jobPosting);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.content).toContain('Resume');
        expect(result.data.content).toContain('Python');
        expect(result.data.metadata.wordCount).toBeGreaterThan(0);
        expect(result.data.metadata.templateId).toBe('basic-template');
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle unknown feature flags', () => {
      const isEnabled = gracefulDegradation.isFeatureEnabled('unknown-feature');
      expect(isEnabled).toBe(false);
    });

    it('should handle update of unknown feature flag', () => {
      // Should not throw error
      gracefulDegradation.updateFeatureFlag('unknown-feature', { enabled: false });
      
      // Should still return null
      const flag = gracefulDegradation.getFeatureFlag('unknown-feature');
      expect(flag).toBeNull();
    });

    it('should handle service health for unknown service', () => {
      const health = gracefulDegradation.getServiceHealth('unknown-service');
      expect(health).toBeNull();
    });
  });
});