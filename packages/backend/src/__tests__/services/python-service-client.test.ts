/**
 * Comprehensive tests for enhanced Python service client
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Container } from 'inversify';
import { Logger } from 'winston';
import { PythonServiceClient } from '../../services/python-service-client';
import { GracefulDegradationService } from '../../services/graceful-degradation.service';
import { TYPES } from '../../types/container.types';
import {
  UserProfile,
  JobPosting,
  GeneratedDocument,
  JobMatch,
  AnalyticsInsights,
  Result,
  ServiceError
} from '../../types/service-client.types';
import { ICacheService } from '../../types/repository.types';

// Mock implementations
const mockLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn()
} as unknown as Logger;

const mockCacheService = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
  invalidate: vi.fn(),
  exists: vi.fn(),
  getOrSet: vi.fn(),
  mget: vi.fn(),
  mset: vi.fn()
} as unknown as ICacheService;

const mockGracefulDegradation = {
  isFeatureEnabled: vi.fn(),
  isServiceHealthy: vi.fn(),
  updateServiceHealth: vi.fn(),
  executeWithFallback: vi.fn(),
  getCachedResponse: vi.fn(),
  setCachedResponse: vi.fn(),
  generateBasicResume: vi.fn(),
  getSimplifiedJobMatches: vi.fn(),
  getBasicAnalytics: vi.fn(),
  getServiceHealth: vi.fn(),
  getFeatureFlag: vi.fn(),
  updateFeatureFlag: vi.fn()
} as unknown as GracefulDegradationService;

// Test data
const mockUserProfile: UserProfile = {
  id: 'user-123',
  skills: ['JavaScript', 'TypeScript', 'React', 'Node.js'],
  experience: [
    {
      id: 'exp-1',
      title: 'Software Engineer',
      company: 'Tech Corp',
      duration: '2 years',
      description: 'Developed web applications',
      skills: ['JavaScript', 'React']
    }
  ],
  education: [
    {
      id: 'edu-1',
      degree: 'BS Computer Science',
      institution: 'University',
      year: 2020,
      gpa: 3.8
    }
  ],
  preferences: {
    remoteWork: true,
    salaryRange: { min: 80000, max: 120000 },
    locations: ['Remote', 'San Francisco'],
    jobTypes: ['full-time']
  },
  careerGoals: 'Senior Software Engineer',
  yearsExperience: 3,
  salaryExpectationMin: 90000,
  preferredLocations: ['Remote']
};

const mockJobPosting: JobPosting = {
  id: 'job-123',
  title: 'Senior React Developer',
  company: 'Awesome Company',
  description: 'Looking for experienced React developer',
  requirements: ['React', 'TypeScript', 'Node.js'],
  location: 'Remote',
  salaryMin: 90000,
  salaryMax: 130000,
  remoteType: 'remote',
  requiredSkills: ['React', 'TypeScript'],
  requiredExperienceYears: 3
};

const mockGeneratedDocument: GeneratedDocument = {
  content: 'Generated resume content...',
  metadata: {
    wordCount: 500,
    generationTime: 2000,
    templateId: 'modern-template'
  }
};

const mockJobMatches: JobMatch[] = [
  {
    jobId: 'job-1',
    semanticScore: 0.85,
    traditionalScore: 0.80,
    compositeScore: 0.83,
    jobData: mockJobPosting,
    matchExplanation: 'Strong match based on React and TypeScript skills'
  }
];

const mockAnalytics: AnalyticsInsights = {
  metrics: {
    totalApplications: 25,
    responseRate: 32,
    interviewRate: 16,
    offerRate: 8,
    averageResponseTimeDays: 5
  },
  insights: {
    topPerformingSkills: ['React', 'TypeScript', 'Node.js'],
    recommendedImprovements: ['Add more backend skills', 'Update portfolio'],
    marketTrends: ['Remote work increasing', 'Full-stack skills in demand']
  },
  successPrediction: {
    successProbability: 75,
    confidence: 85,
    keyFactors: ['Strong technical skills', 'Good experience level']
  },
  recommendations: [
    'Apply to more senior positions',
    'Highlight React expertise',
    'Consider full-stack roles'
  ],
  generatedAt: new Date().toISOString()
};

describe('PythonServiceClient', () => {
  let container: Container;
  let pythonClient: PythonServiceClient;

  beforeEach(() => {
    container = new Container();
    
    // Bind dependencies
    container.bind<Logger>(TYPES.Logger).toConstantValue(mockLogger);
    container.bind<ICacheService>(TYPES.CacheService).toConstantValue(mockCacheService);
    container.bind<GracefulDegradationService>(TYPES.GracefulDegradationService)
      .toConstantValue(mockGracefulDegradation);

    // Reset mocks
    vi.clearAllMocks();
    
    // Set default mock behaviors
    vi.mocked(mockGracefulDegradation.isFeatureEnabled).mockReturnValue(true);
    vi.mocked(mockGracefulDegradation.isServiceHealthy).mockReturnValue(true);
    vi.mocked(mockGracefulDegradation.executeWithFallback).mockImplementation(
      async (operation, primaryFunction, fallbackStrategies) => {
        return await primaryFunction();
      }
    );

    pythonClient = new PythonServiceClient(mockLogger, mockGracefulDegradation);
  });

  describe('generateResume', () => {
    it('should generate resume successfully when service is healthy', async () => {
      // Mock successful HTTP response
      vi.spyOn(pythonClient as any, 'post').mockResolvedValue(
        Result.success(mockGeneratedDocument)
      );

      const result = await pythonClient.generateResume(mockUserProfile, mockJobPosting, 'modern-template');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockGeneratedDocument);
      expect(mockGracefulDegradation.isFeatureEnabled).toHaveBeenCalledWith(
        'ai-document-generation',
        { userId: mockUserProfile.id }
      );
      expect(mockGracefulDegradation.isServiceHealthy).toHaveBeenCalled();
      expect(mockGracefulDegradation.updateServiceHealth).toHaveBeenCalledWith(
        'python-ai-service',
        true
      );
    });

    it('should use fallback when AI document generation is disabled', async () => {
      vi.mocked(mockGracefulDegradation.isFeatureEnabled).mockReturnValue(false);
      vi.mocked(mockGracefulDegradation.generateBasicResume).mockResolvedValue(
        Result.success(mockGeneratedDocument)
      );

      const result = await pythonClient.generateResume(mockUserProfile, mockJobPosting);

      expect(result.success).toBe(true);
      expect(mockGracefulDegradation.generateBasicResume).toHaveBeenCalledWith(
        mockUserProfile,
        mockJobPosting
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'AI document generation disabled, using fallback',
        { userId: mockUserProfile.id }
      );
    });

    it('should use fallback when service is unhealthy', async () => {
      vi.mocked(mockGracefulDegradation.isServiceHealthy).mockReturnValue(false);
      vi.mocked(mockGracefulDegradation.generateBasicResume).mockResolvedValue(
        Result.success(mockGeneratedDocument)
      );

      const result = await pythonClient.generateResume(mockUserProfile, mockJobPosting);

      expect(result.success).toBe(true);
      expect(mockGracefulDegradation.generateBasicResume).toHaveBeenCalledWith(
        mockUserProfile,
        mockJobPosting
      );
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Python service unhealthy, using fallback',
        expect.objectContaining({ userId: mockUserProfile.id })
      );
    });

    it('should handle service failure and update health status', async () => {
      const serviceError = new Error('Service unavailable') as ServiceError;
      serviceError.code = 'SERVICE_UNAVAILABLE';
      
      vi.spyOn(pythonClient as any, 'post').mockResolvedValue(
        Result.error(serviceError)
      );

      vi.mocked(mockGracefulDegradation.executeWithFallback).mockImplementation(
        async (operation, primaryFunction, fallbackStrategies) => {
          const result = await primaryFunction();
          if (!result.success) {
            // Simulate fallback execution
            return Result.success(mockGeneratedDocument);
          }
          return result;
        }
      );

      const result = await pythonClient.generateResume(mockUserProfile, mockJobPosting);

      expect(result.success).toBe(true);
      expect(mockGracefulDegradation.executeWithFallback).toHaveBeenCalled();
    });
  });

  describe('findMatchingJobs', () => {
    it('should find matching jobs successfully when service is healthy', async () => {
      vi.spyOn(pythonClient as any, 'post').mockResolvedValue(
        Result.success(mockJobMatches)
      );

      const result = await pythonClient.findMatchingJobs(mockUserProfile);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockJobMatches);
      expect(mockGracefulDegradation.isFeatureEnabled).toHaveBeenCalledWith(
        'semantic-search',
        { userId: mockUserProfile.id }
      );
      expect(mockGracefulDegradation.updateServiceHealth).toHaveBeenCalledWith(
        'python-ai-service',
        true
      );
    });

    it('should use simplified matching when semantic search is disabled', async () => {
      vi.mocked(mockGracefulDegradation.isFeatureEnabled).mockReturnValue(false);
      vi.mocked(mockGracefulDegradation.getSimplifiedJobMatches).mockResolvedValue(
        Result.success(mockJobMatches)
      );

      const result = await pythonClient.findMatchingJobs(mockUserProfile);

      expect(result.success).toBe(true);
      expect(mockGracefulDegradation.getSimplifiedJobMatches).toHaveBeenCalledWith(
        mockUserProfile
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Semantic search disabled, using simplified matching',
        { userId: mockUserProfile.id }
      );
    });

    it('should cache successful job matches', async () => {
      vi.spyOn(pythonClient as any, 'post').mockResolvedValue(
        Result.success(mockJobMatches)
      );

      await pythonClient.findMatchingJobs(mockUserProfile, { location: ['Remote'] });

      expect(mockGracefulDegradation.setCachedResponse).toHaveBeenCalledWith(
        expect.stringContaining('job_matches:user-123:'),
        mockJobMatches,
        300
      );
    });
  });

  describe('calculateAnalytics', () => {
    it('should calculate analytics successfully when service is healthy', async () => {
      vi.spyOn(pythonClient as any, 'post').mockResolvedValue(
        Result.success(mockAnalytics)
      );

      const result = await pythonClient.calculateAnalytics('user-123', '3m');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockAnalytics);
      expect(mockGracefulDegradation.isFeatureEnabled).toHaveBeenCalledWith(
        'advanced-analytics',
        { userId: 'user-123' }
      );
      expect(mockGracefulDegradation.updateServiceHealth).toHaveBeenCalledWith(
        'python-ai-service',
        true
      );
    });

    it('should use basic analytics when advanced analytics is disabled', async () => {
      vi.mocked(mockGracefulDegradation.isFeatureEnabled).mockReturnValue(false);
      vi.mocked(mockGracefulDegradation.getBasicAnalytics).mockResolvedValue(
        Result.success(mockAnalytics)
      );

      const result = await pythonClient.calculateAnalytics('user-123');

      expect(result.success).toBe(true);
      expect(mockGracefulDegradation.getBasicAnalytics).toHaveBeenCalledWith('user-123');
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Advanced analytics disabled, using basic analytics',
        { userId: 'user-123' }
      );
    });

    it('should cache successful analytics results', async () => {
      vi.spyOn(pythonClient as any, 'post').mockResolvedValue(
        Result.success(mockAnalytics)
      );

      await pythonClient.calculateAnalytics('user-123', '6m');

      expect(mockGracefulDegradation.setCachedResponse).toHaveBeenCalledWith(
        'analytics:user-123:6m',
        mockAnalytics,
        1800
      );
    });
  });

  describe('getServiceStatus', () => {
    it('should return comprehensive service status', async () => {
      const mockHealth = {
        service: 'python-ai-service',
        status: 'healthy' as const,
        lastCheck: new Date(),
        responseTime: 150,
        consecutiveFailures: 0
      };

      vi.mocked(mockGracefulDegradation.getServiceHealth).mockReturnValue({
        isHealthy: true,
        lastCheck: mockHealth.lastCheck,
        responseTime: mockHealth.responseTime,
        consecutiveFailures: mockHealth.consecutiveFailures
      });

      vi.spyOn(pythonClient, 'getCircuitBreakerStats').mockReturnValue({
        name: 'python-service-circuit-breaker',
        state: 'closed',
        stats: {}
      });

      const status = await pythonClient.getServiceStatus();

      expect(status).toEqual({
        serviceName: 'python-ai-service',
        isHealthy: true,
        circuitBreakerState: 'closed',
        lastHealthCheck: mockHealth.lastCheck,
        responseTime: mockHealth.responseTime,
        consecutiveFailures: mockHealth.consecutiveFailures,
        featureFlags: {
          'ai-document-generation': true,
          'semantic-search': true,
          'advanced-analytics': true,
          'ml-predictions': true
        }
      });
    });
  });

  describe('circuit breaker management', () => {
    it('should force circuit breaker open', () => {
      const mockCircuitBreaker = {
        open: vi.fn(),
        close: vi.fn()
      };
      
      (pythonClient as any).circuitBreaker = mockCircuitBreaker;

      pythonClient.forceCircuitBreakerOpen();

      expect(mockCircuitBreaker.open).toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Circuit breaker manually opened',
        { service: 'python-ai-service' }
      );
    });

    it('should force circuit breaker close', () => {
      const mockCircuitBreaker = {
        open: vi.fn(),
        close: vi.fn()
      };
      
      (pythonClient as any).circuitBreaker = mockCircuitBreaker;

      pythonClient.forceCircuitBreakerClose();

      expect(mockCircuitBreaker.close).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Circuit breaker manually closed',
        { service: 'python-ai-service' }
      );
    });
  });

  describe('feature flag management', () => {
    it('should update feature flag', () => {
      const mockFlag = {
        name: 'ai-document-generation',
        enabled: true,
        rolloutPercentage: 100,
        fallbackBehavior: 'simplified' as const
      };

      vi.mocked(mockGracefulDegradation.getFeatureFlag).mockReturnValue(mockFlag);

      pythonClient.updateFeatureFlag('ai-document-generation', false);

      expect(mockGracefulDegradation.updateFeatureFlag).toHaveBeenCalledWith(
        'ai-document-generation',
        { enabled: false }
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Feature flag updated',
        {
          flagName: 'ai-document-generation',
          enabled: false,
          service: 'python-ai-service'
        }
      );
    });
  });

  describe('warmUpService', () => {
    it('should warm up service and update health status on success', async () => {
      vi.spyOn(pythonClient as any, 'post').mockResolvedValue(
        Result.success({ status: 'warmed up' })
      );

      const result = await pythonClient.warmUpService();

      expect(result.success).toBe(true);
      expect(mockGracefulDegradation.updateServiceHealth).toHaveBeenCalledWith(
        'python-ai-service',
        true
      );
      expect(mockLogger.info).toHaveBeenCalledWith('Service warmed up successfully');
    });

    it('should update health status on warmup failure', async () => {
      const error = new Error('Warmup failed') as ServiceError;
      error.code = 'WARMUP_FAILED';
      
      vi.spyOn(pythonClient as any, 'post').mockResolvedValue(
        Result.error(error)
      );

      const result = await pythonClient.warmUpService();

      expect(result.success).toBe(false);
      expect(mockGracefulDegradation.updateServiceHealth).toHaveBeenCalledWith(
        'python-ai-service',
        false
      );
    });
  });
});