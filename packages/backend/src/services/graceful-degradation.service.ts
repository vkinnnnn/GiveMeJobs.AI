/**
 * Graceful degradation service for handling service failures
 */

import { injectable, inject } from 'inversify';
import { Logger } from 'winston';
import { TYPES } from '../types/container.types';
import { ICacheService } from '../types/repository.types';
import {
  UserProfile,
  JobPosting,
  GeneratedDocument,
  JobMatch,
  AnalyticsInsights,
  Result,
  ServiceError
} from '../types/service-client.types';

export interface FallbackStrategy {
  name: string;
  priority: number;
  enabled: boolean;
  execute<T>(operation: string, params: any): Promise<Result<T, ServiceError>>;
}

export interface FeatureFlag {
  name: string;
  enabled: boolean;
  rolloutPercentage: number;
  conditions?: Record<string, any>;
  fallbackBehavior: 'disable' | 'cache' | 'simplified';
}

export interface ServiceHealthStatus {
  serviceName: string;
  isHealthy: boolean;
  lastCheck: Date;
  consecutiveFailures: number;
  responseTime?: number;
}

export interface IGracefulDegradationService {
  // Fallback strategies
  executeWithFallback<T>(
    operation: string,
    primaryFunction: () => Promise<Result<T, ServiceError>>,
    fallbackStrategies: FallbackStrategy[]
  ): Promise<Result<T, ServiceError>>;

  // Feature flags
  isFeatureEnabled(featureName: string, context?: any): boolean;
  getFeatureFlag(featureName: string): FeatureFlag | null;
  updateFeatureFlag(featureName: string, updates: Partial<FeatureFlag>): void;

  // Service health monitoring
  updateServiceHealth(serviceName: string, isHealthy: boolean, responseTime?: number): void;
  getServiceHealth(serviceName: string): ServiceHealthStatus | null;
  isServiceHealthy(serviceName: string): boolean;

  // Cached responses
  getCachedResponse<T>(key: string): Promise<T | null>;
  setCachedResponse<T>(key: string, data: T, ttl?: number): Promise<void>;
  
  // Simplified fallbacks
  getSimplifiedJobMatches(userProfile: UserProfile): Promise<Result<JobMatch[], ServiceError>>;
  getBasicAnalytics(userId: string): Promise<Result<AnalyticsInsights, ServiceError>>;
  generateBasicResume(userProfile: UserProfile, jobPosting: JobPosting): Promise<Result<GeneratedDocument, ServiceError>>;
}

@injectable()
export class GracefulDegradationService implements IGracefulDegradationService {
  private featureFlags: Map<string, FeatureFlag> = new Map();
  private serviceHealthStatus: Map<string, ServiceHealthStatus> = new Map();
  private fallbackStrategies: Map<string, FallbackStrategy[]> = new Map();

  constructor(
    @inject(TYPES.Logger) private logger: Logger,
    @inject(TYPES.CacheService) private cache: ICacheService
  ) {
    this.initializeFeatureFlags();
    this.initializeFallbackStrategies();
  }

  private initializeFeatureFlags(): void {
    const defaultFlags: FeatureFlag[] = [
      {
        name: 'ai-document-generation',
        enabled: true,
        rolloutPercentage: 100,
        fallbackBehavior: 'simplified'
      },
      {
        name: 'semantic-search',
        enabled: true,
        rolloutPercentage: 100,
        fallbackBehavior: 'cache'
      },
      {
        name: 'advanced-analytics',
        enabled: true,
        rolloutPercentage: 90,
        fallbackBehavior: 'simplified'
      },
      {
        name: 'real-time-job-matching',
        enabled: true,
        rolloutPercentage: 80,
        fallbackBehavior: 'cache'
      },
      {
        name: 'ml-predictions',
        enabled: true,
        rolloutPercentage: 70,
        fallbackBehavior: 'disable'
      }
    ];

    defaultFlags.forEach(flag => {
      this.featureFlags.set(flag.name, flag);
    });

    this.logger.info('Feature flags initialized', {
      flags: Array.from(this.featureFlags.keys())
    });
  }

  private initializeFallbackStrategies(): void {
    // Document generation fallbacks
    this.fallbackStrategies.set('document-generation', [
      {
        name: 'cached-template',
        priority: 1,
        enabled: true,
        execute: async (operation, params) => {
          return this.getCachedDocumentTemplate(params.userProfile, params.jobPosting);
        }
      },
      {
        name: 'basic-template',
        priority: 2,
        enabled: true,
        execute: async (operation, params) => {
          return this.generateBasicResume(params.userProfile, params.jobPosting);
        }
      }
    ]);

    // Job matching fallbacks
    this.fallbackStrategies.set('job-matching', [
      {
        name: 'cached-matches',
        priority: 1,
        enabled: true,
        execute: async (operation, params) => {
          return this.getCachedJobMatches(params.userProfile);
        }
      },
      {
        name: 'keyword-matching',
        priority: 2,
        enabled: true,
        execute: async (operation, params) => {
          return this.getSimplifiedJobMatches(params.userProfile);
        }
      }
    ]);

    // Analytics fallbacks
    this.fallbackStrategies.set('analytics', [
      {
        name: 'cached-analytics',
        priority: 1,
        enabled: true,
        execute: async (operation, params) => {
          return this.getCachedAnalytics(params.userId);
        }
      },
      {
        name: 'basic-analytics',
        priority: 2,
        enabled: true,
        execute: async (operation, params) => {
          return this.getBasicAnalytics(params.userId);
        }
      }
    ]);
  }

  async executeWithFallback<T>(
    operation: string,
    primaryFunction: () => Promise<Result<T, ServiceError>>,
    fallbackStrategies: FallbackStrategy[]
  ): Promise<Result<T, ServiceError>> {
    this.logger.debug('Executing operation with fallback', { operation });

    try {
      // Try primary function first
      const result = await primaryFunction();
      if (result.success) {
        this.logger.debug('Primary operation succeeded', { operation });
        return result;
      }

      this.logger.warn('Primary operation failed, trying fallbacks', {
        operation,
        error: result.error
      });
    } catch (error) {
      this.logger.error('Primary operation threw exception', {
        operation,
        error: error.message
      });
    }

    // Try fallback strategies in priority order
    const sortedStrategies = fallbackStrategies
      .filter(strategy => strategy.enabled)
      .sort((a, b) => a.priority - b.priority);

    for (const strategy of sortedStrategies) {
      try {
        this.logger.debug('Trying fallback strategy', {
          operation,
          strategy: strategy.name
        });

        const result = await strategy.execute<T>(operation, {});
        if (result.success) {
          this.logger.info('Fallback strategy succeeded', {
            operation,
            strategy: strategy.name
          });
          return result;
        }
      } catch (error) {
        this.logger.warn('Fallback strategy failed', {
          operation,
          strategy: strategy.name,
          error: error.message
        });
      }
    }

    // All strategies failed
    const error = new Error(`All fallback strategies failed for operation: ${operation}`) as ServiceError;
    error.code = 'ALL_FALLBACKS_FAILED';
    
    this.logger.error('All fallback strategies failed', { operation });
    return Result.error(error);
  }

  isFeatureEnabled(featureName: string, context?: any): boolean {
    const flag = this.featureFlags.get(featureName);
    if (!flag) {
      this.logger.warn('Unknown feature flag', { featureName });
      return false;
    }

    if (!flag.enabled) {
      return false;
    }

    // Check rollout percentage
    if (flag.rolloutPercentage < 100) {
      const hash = this.hashString(featureName + (context?.userId || ''));
      const percentage = (hash % 100) + 1;
      if (percentage > flag.rolloutPercentage) {
        return false;
      }
    }

    // Check conditions if present
    if (flag.conditions && context) {
      for (const [key, value] of Object.entries(flag.conditions)) {
        if (context[key] !== value) {
          return false;
        }
      }
    }

    return true;
  }

  getFeatureFlag(featureName: string): FeatureFlag | null {
    return this.featureFlags.get(featureName) || null;
  }

  updateFeatureFlag(featureName: string, updates: Partial<FeatureFlag>): void {
    const existingFlag = this.featureFlags.get(featureName);
    if (!existingFlag) {
      this.logger.warn('Attempted to update unknown feature flag', { featureName });
      return;
    }

    const updatedFlag = { ...existingFlag, ...updates };
    this.featureFlags.set(featureName, updatedFlag);

    this.logger.info('Feature flag updated', {
      featureName,
      updates
    });
  }

  updateServiceHealth(serviceName: string, isHealthy: boolean, responseTime?: number): void {
    const existing = this.serviceHealthStatus.get(serviceName);
    
    const status: ServiceHealthStatus = {
      serviceName,
      isHealthy,
      lastCheck: new Date(),
      consecutiveFailures: isHealthy ? 0 : (existing?.consecutiveFailures || 0) + 1,
      responseTime
    };

    this.serviceHealthStatus.set(serviceName, status);

    if (!isHealthy && status.consecutiveFailures >= 3) {
      this.logger.warn('Service marked as unhealthy after consecutive failures', {
        serviceName,
        consecutiveFailures: status.consecutiveFailures
      });
    }
  }

  getServiceHealth(serviceName: string): ServiceHealthStatus | null {
    return this.serviceHealthStatus.get(serviceName) || null;
  }

  isServiceHealthy(serviceName: string): boolean {
    const status = this.serviceHealthStatus.get(serviceName);
    return status ? status.isHealthy : true; // Default to healthy if unknown
  }

  async getCachedResponse<T>(key: string): Promise<T | null> {
    try {
      const cached = await this.cache.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      this.logger.error('Failed to get cached response', {
        key,
        error: error.message
      });
      return null;
    }
  }

  async setCachedResponse<T>(key: string, data: T, ttl: number = 3600): Promise<void> {
    try {
      await this.cache.set(key, JSON.stringify(data), ttl);
    } catch (error) {
      this.logger.error('Failed to set cached response', {
        key,
        error: error.message
      });
    }
  }

  async getSimplifiedJobMatches(userProfile: UserProfile): Promise<Result<JobMatch[], ServiceError>> {
    this.logger.info('Generating simplified job matches', {
      userId: userProfile.id
    });

    try {
      // Simple keyword-based matching logic
      const userSkills = userProfile.skills.map(skill => skill.toLowerCase());
      
      // Mock job matches based on user skills (in real implementation, this would query a database)
      const mockMatches: JobMatch[] = [
        {
          jobId: 'fallback-job-1',
          semanticScore: 0.7,
          traditionalScore: 0.8,
          compositeScore: 0.75,
          jobData: {
            id: 'fallback-job-1',
            title: `${userSkills[0]} Developer`,
            company: 'Tech Company',
            description: `Looking for someone with ${userSkills.slice(0, 3).join(', ')} skills`,
            requirements: userSkills.slice(0, 3),
            location: userProfile.preferredLocations?.[0] || 'Remote'
          },
          matchExplanation: 'Matched based on skill keywords'
        }
      ];

      return Result.success(mockMatches);
    } catch (error) {
      this.logger.error('Failed to generate simplified job matches', {
        userId: userProfile.id,
        error: error.message
      });
      
      const serviceError = new Error('Simplified job matching failed') as ServiceError;
      serviceError.code = 'SIMPLIFIED_MATCHING_FAILED';
      return Result.error(serviceError);
    }
  }

  async getBasicAnalytics(userId: string): Promise<Result<AnalyticsInsights, ServiceError>> {
    this.logger.info('Generating basic analytics', { userId });

    try {
      // Basic analytics without ML predictions
      const basicAnalytics: AnalyticsInsights = {
        metrics: {
          totalApplications: 10,
          responseRate: 20,
          interviewRate: 10,
          offerRate: 5,
          averageResponseTimeDays: 7
        },
        insights: {
          topPerformingSkills: ['JavaScript', 'React', 'Node.js'],
          recommendedImprovements: ['Update resume', 'Apply to more positions'],
          marketTrends: ['Remote work increasing', 'Tech skills in demand']
        },
        successPrediction: {
          successProbability: 65,
          confidence: 50,
          keyFactors: ['Experience level', 'Skill match']
        },
        recommendations: [
          'Consider applying to more positions',
          'Update your skills section',
          'Follow up on pending applications'
        ],
        generatedAt: new Date().toISOString()
      };

      return Result.success(basicAnalytics);
    } catch (error) {
      this.logger.error('Failed to generate basic analytics', {
        userId,
        error: error.message
      });
      
      const serviceError = new Error('Basic analytics generation failed') as ServiceError;
      serviceError.code = 'BASIC_ANALYTICS_FAILED';
      return Result.error(serviceError);
    }
  }

  async generateBasicResume(
    userProfile: UserProfile,
    jobPosting: JobPosting
  ): Promise<Result<GeneratedDocument, ServiceError>> {
    this.logger.info('Generating basic resume', {
      userId: userProfile.id,
      jobId: jobPosting.id
    });

    try {
      // Simple template-based resume generation
      const resumeContent = this.createBasicResumeTemplate(userProfile, jobPosting);
      
      const document: GeneratedDocument = {
        content: resumeContent,
        metadata: {
          wordCount: resumeContent.split(' ').length,
          generationTime: 1000, // 1 second
          templateId: 'basic-template'
        }
      };

      return Result.success(document);
    } catch (error) {
      this.logger.error('Failed to generate basic resume', {
        userId: userProfile.id,
        jobId: jobPosting.id,
        error: error.message
      });
      
      const serviceError = new Error('Basic resume generation failed') as ServiceError;
      serviceError.code = 'BASIC_RESUME_FAILED';
      return Result.error(serviceError);
    }
  }

  private async getCachedDocumentTemplate(
    userProfile: UserProfile,
    jobPosting: JobPosting
  ): Promise<Result<GeneratedDocument, ServiceError>> {
    const cacheKey = `resume:${userProfile.id}:${jobPosting.id}`;
    const cached = await this.getCachedResponse<GeneratedDocument>(cacheKey);
    
    if (cached) {
      this.logger.info('Using cached document template', {
        userId: userProfile.id,
        jobId: jobPosting.id
      });
      return Result.success(cached);
    }

    const error = new Error('No cached document template available') as ServiceError;
    error.code = 'NO_CACHED_TEMPLATE';
    return Result.error(error);
  }

  private async getCachedJobMatches(userProfile: UserProfile): Promise<Result<JobMatch[], ServiceError>> {
    const cacheKey = `job_matches:${userProfile.id}`;
    const cached = await this.getCachedResponse<JobMatch[]>(cacheKey);
    
    if (cached) {
      this.logger.info('Using cached job matches', {
        userId: userProfile.id,
        matchCount: cached.length
      });
      return Result.success(cached);
    }

    const error = new Error('No cached job matches available') as ServiceError;
    error.code = 'NO_CACHED_MATCHES';
    return Result.error(error);
  }

  private async getCachedAnalytics(userId: string): Promise<Result<AnalyticsInsights, ServiceError>> {
    const cacheKey = `analytics:${userId}`;
    const cached = await this.getCachedResponse<AnalyticsInsights>(cacheKey);
    
    if (cached) {
      this.logger.info('Using cached analytics', { userId });
      return Result.success(cached);
    }

    const error = new Error('No cached analytics available') as ServiceError;
    error.code = 'NO_CACHED_ANALYTICS';
    return Result.error(error);
  }

  private createBasicResumeTemplate(userProfile: UserProfile, jobPosting: JobPosting): string {
    return `
# Resume

## Contact Information
Name: ${userProfile.id}
Skills: ${userProfile.skills.join(', ')}

## Experience
${userProfile.experience.map(exp => `
### ${exp.title} at ${exp.company}
Duration: ${exp.duration}
Description: ${exp.description}
Skills: ${exp.skills.join(', ')}
`).join('\n')}

## Education
${userProfile.education.map(edu => `
### ${edu.degree} from ${edu.institution}
Year: ${edu.year}
${edu.gpa ? `GPA: ${edu.gpa}` : ''}
`).join('\n')}

## Relevant Skills for ${jobPosting.title}
${userProfile.skills.filter(skill => 
  jobPosting.requiredSkills?.some(reqSkill => 
    reqSkill.toLowerCase().includes(skill.toLowerCase())
  )
).join(', ')}

---
Generated using basic template fallback
    `.trim();
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
}