/**
 * Integration tests for service communication layer
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { container } from '../../container/container';
import { TYPES } from '../../types/container.types';
import { PythonServiceClient, IPythonServiceClient } from '../../services/python-service-client';
import { ServiceAuthService, IServiceAuthService } from '../../services/service-auth.service';
import { ServiceRegistry, IServiceRegistry } from '../../services/service-registry.service';
import { GracefulDegradationService, IGracefulDegradationService } from '../../services/graceful-degradation.service';
import { DistributedTracingService, IDistributedTracingService } from '../../services/distributed-tracing.service';
import {
  UserProfile,
  JobPosting,
  ServiceError,
  Result
} from '../../types/service-client.types';

// Mock HTTP server for testing
import express from 'express';
import { Server } from 'http';

describe('Service Communication Integration Tests', () => {
  let pythonServiceClient: IPythonServiceClient;
  let serviceAuth: IServiceAuthService;
  let serviceRegistry: IServiceRegistry;
  let gracefulDegradation: IGracefulDegradationService;
  let distributedTracing: IDistributedTracingService;
  let mockServer: Server;
  let mockServerPort: number;

  beforeAll(async () => {
    // Initialize container
    await container.get(TYPES.DatabaseConnection);
    
    // Get services from container
    pythonServiceClient = container.get<IPythonServiceClient>(TYPES.PythonServiceClient);
    serviceAuth = container.get<IServiceAuthService>(TYPES.ServiceAuthService);
    serviceRegistry = container.get<IServiceRegistry>(TYPES.ServiceRegistry);
    gracefulDegradation = container.get<IGracefulDegradationService>(TYPES.GracefulDegradationService);
    distributedTracing = container.get<IDistributedTracingService>(TYPES.DistributedTracingService);

    // Initialize distributed tracing
    await distributedTracing.initialize();

    // Start mock Python service
    mockServerPort = 8001;
    mockServer = await startMockPythonService(mockServerPort);
  });

  afterAll(async () => {
    if (mockServer) {
      mockServer.close();
    }
    await distributedTracing.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Circuit Breaker Functionality', () => {
    it('should handle successful service calls', async () => {
      const userProfile: UserProfile = {
        id: 'test-user-1',
        skills: ['JavaScript', 'React', 'Node.js'],
        experience: [],
        education: [],
        preferences: {
          remoteWork: true,
          salaryRange: { min: 50000, max: 100000 },
          locations: ['Remote'],
          jobTypes: ['full-time']
        }
      };

      const jobPosting: JobPosting = {
        id: 'test-job-1',
        title: 'Frontend Developer',
        company: 'Test Company',
        description: 'Looking for a React developer',
        requirements: ['React', 'JavaScript'],
        location: 'Remote'
      };

      const result = await pythonServiceClient.generateResume(userProfile, jobPosting);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.content).toBeDefined();
        expect(result.data.metadata.wordCount).toBeGreaterThan(0);
      }
    });

    it('should trigger circuit breaker on consecutive failures', async () => {
      // Stop mock server to simulate failures
      mockServer.close();

      const userProfile: UserProfile = {
        id: 'test-user-2',
        skills: ['Python'],
        experience: [],
        education: [],
        preferences: {
          remoteWork: false,
          salaryRange: { min: 60000, max: 120000 },
          locations: ['New York'],
          jobTypes: ['full-time']
        }
      };

      const jobPosting: JobPosting = {
        id: 'test-job-2',
        title: 'Python Developer',
        company: 'Test Company',
        description: 'Looking for a Python developer',
        requirements: ['Python'],
        location: 'New York'
      };

      // Make multiple requests to trigger circuit breaker
      const results = await Promise.all([
        pythonServiceClient.generateResume(userProfile, jobPosting),
        pythonServiceClient.generateResume(userProfile, jobPosting),
        pythonServiceClient.generateResume(userProfile, jobPosting),
        pythonServiceClient.generateResume(userProfile, jobPosting)
      ]);

      // At least some requests should fail
      const failedResults = results.filter(r => !r.success);
      expect(failedResults.length).toBeGreaterThan(0);

      // Some failures should be due to circuit breaker
      const circuitBreakerErrors = failedResults.filter(r => 
        r.error && (r.error as ServiceError).isCircuitOpen
      );
      expect(circuitBreakerErrors.length).toBeGreaterThan(0);

      // Restart mock server for other tests
      mockServer = await startMockPythonService(mockServerPort);
    });

    it('should get circuit breaker statistics', async () => {
      const stats = pythonServiceClient.getCircuitBreakerStats();
      
      expect(stats).toBeDefined();
      expect(stats.name).toBeDefined();
      expect(stats.state).toMatch(/^(open|closed|half-open)$/);
      expect(stats.stats).toBeDefined();
    });
  });

  describe('Service Authentication', () => {
    it('should generate service tokens', async () => {
      const token = await serviceAuth.generateServiceToken('python-ai-service');
      
      expect(token).toBeDefined();
      expect(token.accessToken).toBeDefined();
      expect(token.refreshToken).toBeDefined();
      expect(token.serviceId).toBe('python-ai-service');
      expect(token.permissions).toContain('document:generate');
    });

    it('should validate service tokens', async () => {
      const token = await serviceAuth.generateServiceToken('python-ai-service');
      const claims = await serviceAuth.validateServiceToken(token.accessToken);
      
      expect(claims).toBeDefined();
      expect(claims!.serviceId).toBe('python-ai-service');
      expect(claims!.permissions).toContain('document:generate');
    });

    it('should refresh service tokens', async () => {
      const originalToken = await serviceAuth.generateServiceToken('python-ai-service');
      const refreshedToken = await serviceAuth.refreshServiceToken(originalToken.refreshToken);
      
      expect(refreshedToken).toBeDefined();
      expect(refreshedToken.accessToken).not.toBe(originalToken.accessToken);
      expect(refreshedToken.serviceId).toBe(originalToken.serviceId);
    });

    it('should reject invalid tokens', async () => {
      const claims = await serviceAuth.validateServiceToken('invalid-token');
      expect(claims).toBeNull();
    });

    it('should revoke service tokens', async () => {
      const token = await serviceAuth.generateServiceToken('python-ai-service');
      await serviceAuth.revokeServiceToken('python-ai-service');
      
      const claims = await serviceAuth.validateServiceToken(token.accessToken);
      expect(claims).toBeNull();
    });
  });

  describe('Service Registry', () => {
    it('should register and retrieve services', async () => {
      const service = await serviceRegistry.registerService({
        name: 'test-service',
        url: 'http://localhost:9999',
        version: '1.0.0',
        status: 'healthy',
        metadata: {
          description: 'Test service',
          capabilities: ['testing'],
          dependencies: [],
          tags: ['test']
        },
        weight: 1
      });

      expect(service).toBeDefined();
      expect(service.name).toBe('test-service');
      expect(service.id).toBeDefined();

      const retrieved = await serviceRegistry.getService(service.id);
      expect(retrieved).toEqual(service);
    });

    it('should find services by capability', async () => {
      const services = await serviceRegistry.getServicesByCapability('document-generation');
      expect(services.length).toBeGreaterThan(0);
      
      const pythonService = services.find(s => s.name === 'python-ai-service');
      expect(pythonService).toBeDefined();
    });

    it('should update service health status', async () => {
      const services = await serviceRegistry.getServicesByName('python-ai-service');
      expect(services.length).toBeGreaterThan(0);
      
      const service = services[0];
      await serviceRegistry.updateServiceStatus(service.id, 'unhealthy', 5000);
      
      const updated = await serviceRegistry.getService(service.id);
      expect(updated!.status).toBe('unhealthy');
      expect(updated!.responseTime).toBe(5000);
    });

    it('should get service metrics', async () => {
      const metrics = await serviceRegistry.getServiceMetrics();
      
      expect(metrics).toBeDefined();
      expect(metrics.totalServices).toBeGreaterThan(0);
      expect(metrics.servicesByCapability).toBeDefined();
    });
  });

  describe('Graceful Degradation', () => {
    it('should execute primary function when available', async () => {
      const primaryFunction = vi.fn().mockResolvedValue(Result.success('primary-result'));
      const fallbackStrategies = [
        {
          name: 'fallback-1',
          priority: 1,
          enabled: true,
          execute: vi.fn().mockResolvedValue(Result.success('fallback-result'))
        }
      ];

      const result = await gracefulDegradation.executeWithFallback(
        'test-operation',
        primaryFunction,
        fallbackStrategies
      );

      expect(result.success).toBe(true);
      expect(result.data).toBe('primary-result');
      expect(primaryFunction).toHaveBeenCalled();
      expect(fallbackStrategies[0].execute).not.toHaveBeenCalled();
    });

    it('should use fallback when primary function fails', async () => {
      const primaryFunction = vi.fn().mockResolvedValue(Result.error(new Error('Primary failed')));
      const fallbackStrategies = [
        {
          name: 'fallback-1',
          priority: 1,
          enabled: true,
          execute: vi.fn().mockResolvedValue(Result.success('fallback-result'))
        }
      ];

      const result = await gracefulDegradation.executeWithFallback(
        'test-operation',
        primaryFunction,
        fallbackStrategies
      );

      expect(result.success).toBe(true);
      expect(result.data).toBe('fallback-result');
      expect(primaryFunction).toHaveBeenCalled();
      expect(fallbackStrategies[0].execute).toHaveBeenCalled();
    });

    it('should check feature flags', () => {
      const isEnabled = gracefulDegradation.isFeatureEnabled('ai-document-generation');
      expect(typeof isEnabled).toBe('boolean');
    });

    it('should generate simplified job matches', async () => {
      const userProfile: UserProfile = {
        id: 'test-user-3',
        skills: ['Java', 'Spring'],
        experience: [],
        education: [],
        preferences: {
          remoteWork: true,
          salaryRange: { min: 70000, max: 130000 },
          locations: ['Remote'],
          jobTypes: ['full-time']
        }
      };

      const result = await gracefulDegradation.getSimplifiedJobMatches(userProfile);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(Array.isArray(result.data)).toBe(true);
        expect(result.data.length).toBeGreaterThan(0);
      }
    });

    it('should generate basic analytics', async () => {
      const result = await gracefulDegradation.getBasicAnalytics('test-user-4');
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.metrics).toBeDefined();
        expect(result.data.insights).toBeDefined();
        expect(result.data.successPrediction).toBeDefined();
      }
    });
  });

  describe('Distributed Tracing', () => {
    it('should create and finish spans', async () => {
      const span = distributedTracing.createSpan({
        operationName: 'test-operation',
        tags: { 'test.tag': 'test-value' }
      });

      expect(span).toBeDefined();
      
      distributedTracing.finishSpan(span, {
        'result': 'success'
      });

      // Span should be finished (no exception thrown)
      expect(true).toBe(true);
    });

    it('should trace async operations', async () => {
      const result = await distributedTracing.traceAsyncOperation(
        'async-test-operation',
        async (span) => {
          span.setTag('operation.type', 'test');
          return 'async-result';
        }
      );

      expect(result).toBe('async-result');
    });

    it('should handle tracing errors gracefully', async () => {
      await expect(
        distributedTracing.traceAsyncOperation(
          'failing-operation',
          async (span) => {
            throw new Error('Operation failed');
          }
        )
      ).rejects.toThrow('Operation failed');
    });

    it('should inject and extract trace headers', () => {
      const span = distributedTracing.createSpan({
        operationName: 'header-test'
      });

      const headers: Record<string, string> = {};
      distributedTracing.injectHeaders(span, headers);

      expect(Object.keys(headers).length).toBeGreaterThan(0);

      const extractedContext = distributedTracing.extractSpanContext(headers);
      expect(extractedContext).toBeDefined();

      distributedTracing.finishSpan(span);
    });
  });

  describe('End-to-End Service Communication', () => {
    it('should handle complete service workflow with tracing', async () => {
      const userProfile: UserProfile = {
        id: 'e2e-test-user',
        skills: ['TypeScript', 'React', 'Node.js'],
        experience: [{
          id: 'exp-1',
          title: 'Software Developer',
          company: 'Tech Corp',
          duration: '2 years',
          description: 'Full-stack development',
          skills: ['TypeScript', 'React']
        }],
        education: [{
          id: 'edu-1',
          degree: 'Computer Science',
          institution: 'University',
          year: 2020
        }],
        preferences: {
          remoteWork: true,
          salaryRange: { min: 80000, max: 150000 },
          locations: ['Remote'],
          jobTypes: ['full-time']
        }
      };

      const jobPosting: JobPosting = {
        id: 'e2e-test-job',
        title: 'Full Stack Developer',
        company: 'E2E Test Company',
        description: 'Looking for a full-stack developer with React and Node.js experience',
        requirements: ['React', 'Node.js', 'TypeScript'],
        location: 'Remote',
        salaryMin: 90000,
        salaryMax: 140000
      };

      // Test document generation with tracing
      const documentResult = await distributedTracing.traceAsyncOperation(
        'e2e-document-generation',
        async (span) => {
          span.setTag('user.id', userProfile.id);
          span.setTag('job.id', jobPosting.id);
          
          return pythonServiceClient.generateResume(userProfile, jobPosting);
        }
      );

      expect(documentResult.success).toBe(true);

      // Test job matching with fallback
      const matchingResult = await gracefulDegradation.executeWithFallback(
        'e2e-job-matching',
        async () => pythonServiceClient.findMatchingJobs(userProfile),
        [{
          name: 'simplified-matching',
          priority: 1,
          enabled: true,
          execute: async () => gracefulDegradation.getSimplifiedJobMatches(userProfile)
        }]
      );

      expect(matchingResult.success).toBe(true);

      // Test analytics with graceful degradation
      const analyticsResult = await gracefulDegradation.executeWithFallback(
        'e2e-analytics',
        async () => pythonServiceClient.calculateAnalytics(userProfile.id),
        [{
          name: 'basic-analytics',
          priority: 1,
          enabled: true,
          execute: async () => gracefulDegradation.getBasicAnalytics(userProfile.id)
        }]
      );

      expect(analyticsResult.success).toBe(true);
    });
  });
});

// Helper function to start mock Python service
async function startMockPythonService(port: number): Promise<Server> {
  const app = express();
  app.use(express.json());

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  });

  // Document generation endpoint
  app.post('/document/generate-resume', (req, res) => {
    const { user_profile, job_posting } = req.body;
    
    res.json({
      content: `Resume for ${user_profile.id} applying to ${job_posting.title}`,
      metadata: {
        wordCount: 250,
        generationTime: 1500,
        templateId: 'mock-template'
      }
    });
  });

  // Job matching endpoint
  app.post('/search/semantic-match', (req, res) => {
    const { user_profile } = req.body;
    
    res.json([
      {
        jobId: 'mock-job-1',
        semanticScore: 0.85,
        traditionalScore: 0.75,
        compositeScore: 0.80,
        jobData: {
          id: 'mock-job-1',
          title: 'Mock Job',
          company: 'Mock Company',
          description: 'Mock job description',
          requirements: user_profile.skills.slice(0, 2),
          location: 'Remote'
        },
        matchExplanation: 'Mock match explanation'
      }
    ]);
  });

  // Analytics endpoint
  app.post('/analytics/calculate-insights', (req, res) => {
    res.json({
      metrics: {
        totalApplications: 15,
        responseRate: 25,
        interviewRate: 15,
        offerRate: 8,
        averageResponseTimeDays: 5
      },
      insights: {
        topPerformingSkills: ['React', 'Node.js'],
        recommendedImprovements: ['Update portfolio'],
        marketTrends: ['Remote work trending']
      },
      successPrediction: {
        successProbability: 75,
        confidence: 80,
        keyFactors: ['Skill match', 'Experience level']
      },
      recommendations: ['Apply to more positions'],
      generatedAt: new Date().toISOString()
    });
  });

  return new Promise((resolve) => {
    const server = app.listen(port, () => {
      console.log(`Mock Python service running on port ${port}`);
      resolve(server);
    });
  });
}