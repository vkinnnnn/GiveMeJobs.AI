import { injectable, inject } from 'inversify';
import { TYPES } from '../types/container.types';
import { ICacheService } from '../types/repository.types';
import { Logger } from 'winston';

export interface InvalidationRule {
  pattern: string;
  dependencies: string[];
  ttl?: number;
  strategy: 'immediate' | 'lazy' | 'scheduled';
}

export interface InvalidationEvent {
  type: 'create' | 'update' | 'delete';
  entity: string;
  entityId: string;
  userId?: string;
  timestamp: Date;
}

@injectable()
export class CacheInvalidationService {
  private invalidationRules: Map<string, InvalidationRule[]> = new Map();
  private pendingInvalidations: Set<string> = new Set();

  constructor(
    @inject(TYPES.CacheService) private cache: ICacheService,
    @inject(TYPES.Logger) private logger: Logger
  ) {
    this.initializeInvalidationRules();
  }

  /**
   * Initialize cache invalidation rules
   */
  private initializeInvalidationRules(): void {
    // User-related invalidations
    this.addInvalidationRule('user', [
      {
        pattern: 'user:*',
        dependencies: ['profile:*', 'applications:user:*', 'stats:*'],
        strategy: 'immediate',
      },
    ]);

    // Profile-related invalidations
    this.addInvalidationRule('profile', [
      {
        pattern: 'profile:*',
        dependencies: ['user:*', 'skill-score:*'],
        strategy: 'immediate',
      },
    ]);

    // Job-related invalidations
    this.addInvalidationRule('job', [
      {
        pattern: 'job:*',
        dependencies: ['job:search:*', 'job:company:*', 'saved_jobs:*'],
        strategy: 'immediate',
      },
    ]);

    // Application-related invalidations
    this.addInvalidationRule('application', [
      {
        pattern: 'applications:*',
        dependencies: ['stats:*', 'applications:user:*'],
        strategy: 'immediate',
      },
    ]);

    // Search-related invalidations (lazy strategy for performance)
    this.addInvalidationRule('search', [
      {
        pattern: 'job:search:*',
        dependencies: [],
        strategy: 'lazy',
        ttl: 300, // 5 minutes
      },
    ]);

    this.logger.info('Cache invalidation rules initialized');
  }

  /**
   * Add invalidation rule for an entity type
   */
  addInvalidationRule(entityType: string, rules: InvalidationRule[]): void {
    this.invalidationRules.set(entityType, rules);
  }

  /**
   * Handle entity change event
   */
  async handleEntityChange(event: InvalidationEvent): Promise<void> {
    const rules = this.invalidationRules.get(event.entity);
    if (!rules) {
      return;
    }

    this.logger.debug('Processing cache invalidation', {
      entity: event.entity,
      entityId: event.entityId,
      type: event.type,
    });

    for (const rule of rules) {
      await this.processInvalidationRule(rule, event);
    }
  }

  /**
   * Process a single invalidation rule
   */
  private async processInvalidationRule(rule: InvalidationRule, event: InvalidationEvent): Promise<void> {
    const patterns = [rule.pattern, ...rule.dependencies];
    
    switch (rule.strategy) {
      case 'immediate':
        await this.immediateInvalidation(patterns, event);
        break;
      
      case 'lazy':
        await this.lazyInvalidation(patterns, event, rule.ttl);
        break;
      
      case 'scheduled':
        await this.scheduleInvalidation(patterns, event);
        break;
    }
  }

  /**
   * Immediate cache invalidation
   */
  private async immediateInvalidation(patterns: string[], event: InvalidationEvent): Promise<void> {
    const resolvedPatterns = patterns.map(pattern => 
      this.resolvePattern(pattern, event)
    );

    for (const pattern of resolvedPatterns) {
      try {
        await this.cache.invalidate(pattern);
        this.logger.debug('Cache invalidated immediately', { pattern });
      } catch (error) {
        this.logger.error('Immediate cache invalidation failed', { pattern, error });
      }
    }
  }

  /**
   * Lazy cache invalidation (mark for later cleanup)
   */
  private async lazyInvalidation(patterns: string[], event: InvalidationEvent, ttl?: number): Promise<void> {
    const resolvedPatterns = patterns.map(pattern => 
      this.resolvePattern(pattern, event)
    );

    for (const pattern of resolvedPatterns) {
      // Add to pending invalidations
      this.pendingInvalidations.add(pattern);
      
      // Set a marker with short TTL to indicate stale data
      const markerKey = `_stale:${pattern}`;
      await this.cache.set(markerKey, true, ttl || 300);
      
      this.logger.debug('Cache marked for lazy invalidation', { pattern, ttl });
    }
  }

  /**
   * Schedule cache invalidation for later
   */
  private async scheduleInvalidation(patterns: string[], event: InvalidationEvent): Promise<void> {
    // This would integrate with a job queue system like Bull or Agenda
    // For now, we'll just log the scheduled invalidation
    const resolvedPatterns = patterns.map(pattern => 
      this.resolvePattern(pattern, event)
    );

    this.logger.info('Cache invalidation scheduled', { 
      patterns: resolvedPatterns,
      event: event.type,
      entity: event.entity,
    });
  }

  /**
   * Resolve pattern placeholders with actual values
   */
  private resolvePattern(pattern: string, event: InvalidationEvent): string {
    return pattern
      .replace('{entityId}', event.entityId)
      .replace('{userId}', event.userId || '*')
      .replace('{entity}', event.entity);
  }

  /**
   * Process pending lazy invalidations
   */
  async processPendingInvalidations(): Promise<void> {
    if (this.pendingInvalidations.size === 0) {
      return;
    }

    this.logger.info('Processing pending cache invalidations', { 
      count: this.pendingInvalidations.size 
    });

    const patterns = Array.from(this.pendingInvalidations);
    this.pendingInvalidations.clear();

    for (const pattern of patterns) {
      try {
        await this.cache.invalidate(pattern);
        
        // Remove stale marker
        const markerKey = `_stale:${pattern}`;
        await this.cache.delete(markerKey);
        
        this.logger.debug('Pending cache invalidation processed', { pattern });
      } catch (error) {
        this.logger.error('Pending cache invalidation failed', { pattern, error });
      }
    }
  }

  /**
   * Check if cache key is stale
   */
  async isStale(key: string): Promise<boolean> {
    const markerKey = `_stale:${key}`;
    return await this.cache.exists(markerKey);
  }

  /**
   * Invalidate cache for specific user
   */
  async invalidateUserCache(userId: string): Promise<void> {
    const patterns = [
      `user:${userId}`,
      `profile:${userId}`,
      `applications:user:${userId}*`,
      `stats:${userId}*`,
      `saved_jobs:${userId}`,
    ];

    for (const pattern of patterns) {
      await this.cache.invalidate(pattern);
    }

    this.logger.info('User cache invalidated', { userId });
  }

  /**
   * Invalidate cache for specific job
   */
  async invalidateJobCache(jobId: string): Promise<void> {
    const patterns = [
      `job:${jobId}`,
      `job:search:*`, // Invalidate all search results
      `applications:job:${jobId}*`,
    ];

    for (const pattern of patterns) {
      await this.cache.invalidate(pattern);
    }

    this.logger.info('Job cache invalidated', { jobId });
  }

  /**
   * Invalidate search cache
   */
  async invalidateSearchCache(): Promise<void> {
    await this.cache.invalidate('job:search:*');
    this.logger.info('Search cache invalidated');
  }

  /**
   * Get invalidation statistics
   */
  getInvalidationStats(): {
    pendingInvalidations: number;
    rulesCount: number;
    entities: string[];
  } {
    return {
      pendingInvalidations: this.pendingInvalidations.size,
      rulesCount: Array.from(this.invalidationRules.values()).reduce((sum, rules) => sum + rules.length, 0),
      entities: Array.from(this.invalidationRules.keys()),
    };
  }

  /**
   * Event handlers for common operations
   */
  async onUserCreated(userId: string): Promise<void> {
    await this.handleEntityChange({
      type: 'create',
      entity: 'user',
      entityId: userId,
      userId,
      timestamp: new Date(),
    });
  }

  async onUserUpdated(userId: string): Promise<void> {
    await this.handleEntityChange({
      type: 'update',
      entity: 'user',
      entityId: userId,
      userId,
      timestamp: new Date(),
    });
  }

  async onJobCreated(jobId: string): Promise<void> {
    await this.handleEntityChange({
      type: 'create',
      entity: 'job',
      entityId: jobId,
      timestamp: new Date(),
    });
  }

  async onApplicationCreated(applicationId: string, userId: string, jobId: string): Promise<void> {
    await this.handleEntityChange({
      type: 'create',
      entity: 'application',
      entityId: applicationId,
      userId,
      timestamp: new Date(),
    });

    // Also invalidate user and job related caches
    await this.invalidateUserCache(userId);
    await this.invalidateJobCache(jobId);
  }
}

// Helper function to create invalidation events
export const createInvalidationEvent = (
  type: InvalidationEvent['type'],
  entity: string,
  entityId: string,
  userId?: string
): InvalidationEvent => ({
  type,
  entity,
  entityId,
  userId,
  timestamp: new Date(),
});