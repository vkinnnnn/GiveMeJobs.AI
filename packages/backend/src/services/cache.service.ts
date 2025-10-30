import { redisClient } from '../config/database';

/**
 * Cache Service
 * Provides caching functionality for database query results
 */
export class CacheService {
  private defaultTTL: number = 300; // 5 minutes default

  /**
   * Get cached value
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const cached = await redisClient.get(key);
      if (!cached) {
        return null;
      }
      return JSON.parse(cached) as T;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Set cached value
   */
  async set(key: string, value: any, ttl: number = this.defaultTTL): Promise<void> {
    try {
      await redisClient.setex(key, ttl, JSON.stringify(value));
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  /**
   * Delete cached value
   */
  async delete(key: string): Promise<void> {
    try {
      await redisClient.del(key);
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }

  /**
   * Delete multiple cached values by pattern
   */
  async deletePattern(pattern: string): Promise<void> {
    try {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(...keys);
      }
    } catch (error) {
      console.error('Cache delete pattern error:', error);
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await redisClient.exists(key);
      return result === 1;
    } catch (error) {
      console.error('Cache exists error:', error);
      return false;
    }
  }

  /**
   * Get or set cached value
   * If value exists in cache, return it
   * Otherwise, execute the function, cache the result, and return it
   */
  async getOrSet<T>(
    key: string,
    fn: () => Promise<T>,
    ttl: number = this.defaultTTL
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const result = await fn();
    await this.set(key, result, ttl);
    return result;
  }

  /**
   * Increment a counter
   */
  async increment(key: string, ttl?: number): Promise<number> {
    try {
      const value = await redisClient.incr(key);
      if (ttl) {
        await redisClient.expire(key, ttl);
      }
      return value;
    } catch (error) {
      console.error('Cache increment error:', error);
      return 0;
    }
  }

  /**
   * Decrement a counter
   */
  async decrement(key: string): Promise<number> {
    try {
      return await redisClient.decr(key);
    } catch (error) {
      console.error('Cache decrement error:', error);
      return 0;
    }
  }

  /**
   * Set with expiry at specific time
   */
  async setExpireAt(key: string, value: any, timestamp: number): Promise<void> {
    try {
      await redisClient.set(key, JSON.stringify(value));
      await redisClient.expireat(key, timestamp);
    } catch (error) {
      console.error('Cache setExpireAt error:', error);
    }
  }

  /**
   * Get TTL of a key
   */
  async getTTL(key: string): Promise<number> {
    try {
      return await redisClient.ttl(key);
    } catch (error) {
      console.error('Cache getTTL error:', error);
      return -1;
    }
  }

  /**
   * Clear all cache entries for a specific user
   */
  async clearUserCache(userId: string): Promise<void> {
    try {
      const patterns = [
        `user:${userId}*`,
        `*:${userId}:*`,
        `job:recommendations:${userId}`,
        `application:stats:${userId}`,
        `skill:score:${userId}`,
        `skill:gap:${userId}:*`,
        `analytics:${userId}:*`,
      ];

      for (const pattern of patterns) {
        await this.deletePattern(pattern);
      }
    } catch (error) {
      console.error('Error clearing user cache:', error);
    }
  }

  /**
   * Cache key generators for common patterns
   */
  keys = {
    user: (userId: string) => `user:${userId}`,
    userProfile: (userId: string) => `user:${userId}:profile`,
    userSkills: (userId: string) => `user:${userId}:skills`,
    userExperience: (userId: string) => `user:${userId}:experience`,
    userEducation: (userId: string) => `user:${userId}:education`,
    userApplications: (userId: string) => `user:${userId}:applications`,
    userAnalytics: (userId: string, period: string) => `user:${userId}:analytics:${period}`,
    
    job: (jobId: string) => `job:${jobId}`,
    jobSearch: (query: string) => `job:search:${query}`,
    jobRecommendations: (userId: string) => `job:recommendations:${userId}`,
    
    application: (applicationId: string) => `application:${applicationId}`,
    applicationStats: (userId: string) => `application:stats:${userId}`,
    
    skillScore: (userId: string) => `skill:score:${userId}`,
    skillGapAnalysis: (userId: string, targetRole: string) => 
      `skill:gap:${userId}:${targetRole}`,
    
    document: (documentId: string) => `document:${documentId}`,
    
    interviewPrep: (applicationId: string) => `interview:prep:${applicationId}`,
    
    analytics: (userId: string, type: string) => `analytics:${userId}:${type}`,
    benchmarks: () => `analytics:benchmarks`,
  };

  /**
   * Cache TTL presets (in seconds)
   */
  ttl = {
    short: 60,           // 1 minute
    medium: 300,         // 5 minutes
    long: 900,           // 15 minutes
    hour: 3600,          // 1 hour
    day: 86400,          // 24 hours
    week: 604800,        // 7 days
  };
}

export const cacheService = new CacheService();

/**
 * Cache decorator for methods
 * Automatically caches method results
 */
export function Cacheable(keyPrefix: string, ttl: number = 300) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const cacheKey = `${keyPrefix}:${JSON.stringify(args)}`;
      
      const cached = await cacheService.get(cacheKey);
      if (cached !== null) {
        return cached;
      }

      const result = await originalMethod.apply(this, args);
      await cacheService.set(cacheKey, result, ttl);
      
      return result;
    };

    return descriptor;
  };
}

/**
 * Cache invalidation decorator
 * Automatically invalidates cache patterns after method execution
 */
export function InvalidateCache(...patterns: string[]) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const result = await originalMethod.apply(this, args);
      
      // Invalidate cache patterns
      for (const pattern of patterns) {
        await cacheService.deletePattern(pattern);
      }
      
      return result;
    };

    return descriptor;
  };
}
