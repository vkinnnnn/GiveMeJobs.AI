import { redisClient } from './database';

// Re-export redisClient for use in other modules
export { redisClient };

/**
 * Redis Key Naming Conventions
 * Format: {namespace}:{entity}:{id}:{field}
 */
export const RedisKeys = {
  // Session keys
  session: (sessionId: string) => `session:${sessionId}`,
  userSessions: (userId: string) => `user:${userId}:sessions`,

  // User cache
  user: (userId: string) => `user:${userId}`,
  userProfile: (userId: string) => `user:${userId}:profile`,
  userSkills: (userId: string) => `user:${userId}:skills`,
  userSkillScore: (userId: string) => `user:${userId}:skill_score`,

  // Job cache
  job: (jobId: string) => `job:${jobId}`,
  jobSearch: (query: string) => `job:search:${query}`,
  jobRecommendations: (userId: string) => `job:recommendations:${userId}`,
  jobMatchScore: (userId: string, jobId: string) => `job:match:${userId}:${jobId}`,

  // Application cache
  application: (applicationId: string) => `application:${applicationId}`,
  userApplications: (userId: string) => `user:${userId}:applications`,
  applicationStats: (userId: string) => `user:${userId}:application_stats`,

  // Document cache
  document: (documentId: string) => `document:${documentId}`,
  userDocuments: (userId: string) => `user:${userId}:documents`,

  // Rate limiting
  rateLimit: (identifier: string, endpoint: string) => `rate_limit:${identifier}:${endpoint}`,
  apiRateLimit: (provider: string, userId: string) => `api_rate_limit:${provider}:${userId}`,

  // Temporary data
  emailVerification: (email: string) => `email_verification:${email}`,
  passwordReset: (token: string) => `password_reset:${token}`,
  mfaToken: (userId: string) => `mfa:${userId}`,

  // Analytics cache
  analytics: (userId: string, period: string) => `analytics:${userId}:${period}`,
  platformStats: (metric: string) => `platform:stats:${metric}`,

  // Job alerts
  jobAlerts: (userId: string) => `job_alerts:${userId}`,
  alertLastRun: (alertId: string) => `alert:${alertId}:last_run`,
};

/**
 * Cache TTL (Time To Live) in seconds
 */
export const CacheTTL = {
  // Short-lived cache (5 minutes)
  SHORT: 300,

  // Medium-lived cache (1 hour)
  MEDIUM: 3600,

  // Long-lived cache (24 hours)
  LONG: 86400,

  // Session cache (7 days)
  SESSION: 604800,

  // Job search cache (15 minutes)
  JOB_SEARCH: 900,

  // User profile cache (1 hour)
  USER_PROFILE: 3600,

  // Job details cache (6 hours)
  JOB_DETAILS: 21600,

  // Rate limit window (1 minute)
  RATE_LIMIT: 60,

  // Temporary tokens (15 minutes)
  TEMP_TOKEN: 900,

  // Analytics cache (30 minutes)
  ANALYTICS: 1800,
};

/**
 * Redis Cache Service
 */
export class RedisCacheService {
  /**
   * Get cached value
   */
  static async get<T>(key: string): Promise<T | null> {
    try {
      const value = await redisClient.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`Redis GET error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set cached value with TTL
   */
  static async set(key: string, value: any, ttl: number = CacheTTL.MEDIUM): Promise<void> {
    try {
      await redisClient.setEx(key, ttl, JSON.stringify(value));
    } catch (error) {
      console.error(`Redis SET error for key ${key}:`, error);
    }
  }

  /**
   * Delete cached value
   */
  static async del(key: string): Promise<void> {
    try {
      await redisClient.del(key);
    } catch (error) {
      console.error(`Redis DEL error for key ${key}:`, error);
    }
  }

  /**
   * Delete multiple keys matching pattern
   */
  static async delPattern(pattern: string): Promise<void> {
    try {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
    } catch (error) {
      console.error(`Redis DEL pattern error for ${pattern}:`, error);
    }
  }

  /**
   * Check if key exists
   */
  static async exists(key: string): Promise<boolean> {
    try {
      const result = await redisClient.exists(key);
      return result === 1;
    } catch (error) {
      console.error(`Redis EXISTS error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Increment counter
   */
  static async incr(key: string): Promise<number> {
    try {
      return await redisClient.incr(key);
    } catch (error) {
      console.error(`Redis INCR error for key ${key}:`, error);
      return 0;
    }
  }

  /**
   * Set expiration on key
   */
  static async expire(key: string, ttl: number): Promise<void> {
    try {
      await redisClient.expire(key, ttl);
    } catch (error) {
      console.error(`Redis EXPIRE error for key ${key}:`, error);
    }
  }

  /**
   * Get remaining TTL
   */
  static async ttl(key: string): Promise<number> {
    try {
      return await redisClient.ttl(key);
    } catch (error) {
      console.error(`Redis TTL error for key ${key}:`, error);
      return -1;
    }
  }

  /**
   * Add to set
   */
  static async sadd(key: string, ...members: string[]): Promise<void> {
    try {
      await redisClient.sAdd(key, members);
    } catch (error) {
      console.error(`Redis SADD error for key ${key}:`, error);
    }
  }

  /**
   * Remove from set
   */
  static async srem(key: string, ...members: string[]): Promise<void> {
    try {
      await redisClient.sRem(key, members);
    } catch (error) {
      console.error(`Redis SREM error for key ${key}:`, error);
    }
  }

  /**
   * Get all set members
   */
  static async smembers(key: string): Promise<string[]> {
    try {
      return await redisClient.sMembers(key);
    } catch (error) {
      console.error(`Redis SMEMBERS error for key ${key}:`, error);
      return [];
    }
  }

  /**
   * Add to sorted set
   */
  static async zadd(key: string, score: number, member: string): Promise<void> {
    try {
      await redisClient.zAdd(key, { score, value: member });
    } catch (error) {
      console.error(`Redis ZADD error for key ${key}:`, error);
    }
  }

  /**
   * Get sorted set range
   */
  static async zrange(key: string, start: number, stop: number): Promise<string[]> {
    try {
      return await redisClient.zRange(key, start, stop);
    } catch (error) {
      console.error(`Redis ZRANGE error for key ${key}:`, error);
      return [];
    }
  }
}

/**
 * Cache Invalidation Strategies
 */
export class CacheInvalidation {
  /**
   * Invalidate user-related caches
   */
  static async invalidateUser(userId: string): Promise<void> {
    await Promise.all([
      RedisCacheService.del(RedisKeys.user(userId)),
      RedisCacheService.del(RedisKeys.userProfile(userId)),
      RedisCacheService.del(RedisKeys.userSkills(userId)),
      RedisCacheService.del(RedisKeys.userSkillScore(userId)),
      RedisCacheService.delPattern(`${RedisKeys.jobRecommendations(userId)}*`),
      RedisCacheService.delPattern(`${RedisKeys.analytics(userId, '*')}`),
    ]);
  }

  /**
   * Invalidate job-related caches
   */
  static async invalidateJob(jobId: string): Promise<void> {
    await Promise.all([
      RedisCacheService.del(RedisKeys.job(jobId)),
      RedisCacheService.delPattern(`job:match:*:${jobId}`),
    ]);
  }

  /**
   * Invalidate application-related caches
   */
  static async invalidateApplication(userId: string, applicationId: string): Promise<void> {
    await Promise.all([
      RedisCacheService.del(RedisKeys.application(applicationId)),
      RedisCacheService.del(RedisKeys.userApplications(userId)),
      RedisCacheService.del(RedisKeys.applicationStats(userId)),
    ]);
  }

  /**
   * Invalidate job search caches
   */
  static async invalidateJobSearches(): Promise<void> {
    await RedisCacheService.delPattern('job:search:*');
  }

  /**
   * Invalidate document caches
   */
  static async invalidateDocument(userId: string, documentId: string): Promise<void> {
    await Promise.all([
      RedisCacheService.del(RedisKeys.document(documentId)),
      RedisCacheService.del(RedisKeys.userDocuments(userId)),
    ]);
  }
}

/**
 * Session Management
 */
export class SessionManager {
  /**
   * Create session
   */
  static async createSession(sessionId: string, userId: string, data: any): Promise<void> {
    const sessionData = {
      userId,
      ...data,
      createdAt: new Date().toISOString(),
    };

    await Promise.all([
      RedisCacheService.set(RedisKeys.session(sessionId), sessionData, CacheTTL.SESSION),
      RedisCacheService.sadd(RedisKeys.userSessions(userId), sessionId),
    ]);
  }

  /**
   * Get session
   */
  static async getSession(sessionId: string): Promise<any> {
    return await RedisCacheService.get(RedisKeys.session(sessionId));
  }

  /**
   * Update session
   */
  static async updateSession(sessionId: string, data: any): Promise<void> {
    const existing = await SessionManager.getSession(sessionId);
    if (existing) {
      await RedisCacheService.set(
        RedisKeys.session(sessionId),
        { ...existing, ...data },
        CacheTTL.SESSION
      );
    }
  }

  /**
   * Delete session
   */
  static async deleteSession(sessionId: string): Promise<void> {
    const session = await SessionManager.getSession(sessionId);
    if (session) {
      await Promise.all([
        RedisCacheService.del(RedisKeys.session(sessionId)),
        RedisCacheService.srem(RedisKeys.userSessions(session.userId), sessionId),
      ]);
    }
  }

  /**
   * Delete all user sessions
   */
  static async deleteAllUserSessions(userId: string): Promise<void> {
    const sessionIds = await RedisCacheService.smembers(RedisKeys.userSessions(userId));
    await Promise.all([
      ...sessionIds.map((id) => RedisCacheService.del(RedisKeys.session(id))),
      RedisCacheService.del(RedisKeys.userSessions(userId)),
    ]);
  }
}

/**
 * Rate Limiting
 */
export class RateLimiter {
  /**
   * Check rate limit
   */
  static async checkLimit(
    identifier: string,
    endpoint: string,
    maxRequests: number,
    windowSeconds: number = 60
  ): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
    const key = RedisKeys.rateLimit(identifier, endpoint);
    const current = await RedisCacheService.incr(key);

    if (current === 1) {
      await RedisCacheService.expire(key, windowSeconds);
    }

    const ttl = await RedisCacheService.ttl(key);
    const resetAt = Date.now() + ttl * 1000;

    return {
      allowed: current <= maxRequests,
      remaining: Math.max(0, maxRequests - current),
      resetAt,
    };
  }

  /**
   * Check API rate limit for external services
   */
  static async checkApiLimit(
    provider: string,
    userId: string,
    maxRequests: number,
    windowSeconds: number = 60
  ): Promise<boolean> {
    const key = RedisKeys.apiRateLimit(provider, userId);
    const current = await RedisCacheService.incr(key);

    if (current === 1) {
      await RedisCacheService.expire(key, windowSeconds);
    }

    return current <= maxRequests;
  }

  /**
   * Get remaining API requests
   */
  static async getRemainingApiRequests(
    provider: string,
    userId: string,
    maxRequests: number
  ): Promise<number> {
    const key = RedisKeys.apiRateLimit(provider, userId);
    const current = parseInt((await redisClient.get(key)) || '0');
    return Math.max(0, maxRequests - current);
  }
}
