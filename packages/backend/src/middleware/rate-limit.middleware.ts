import { Request, Response, NextFunction } from 'express';
import { redisClient } from '../config/database';

interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  message?: string;
  skipSuccessfulRequests?: boolean;
  keyGenerator?: (req: Request) => string;
}

/**
 * Rate limiting middleware using Redis
 * Implements sliding window algorithm for accurate rate limiting
 */
export function rateLimit(options: RateLimitOptions) {
  const {
    windowMs,
    maxRequests,
    message = 'Too many requests, please try again later',
    skipSuccessfulRequests = false,
    keyGenerator = (req: Request) => {
      // Default: use IP address
      return req.ip || req.socket.remoteAddress || 'unknown';
    },
  } = options;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const key = `ratelimit:${keyGenerator(req)}`;
      const now = Date.now();
      const windowStart = now - windowMs;

      // Remove old entries outside the window
      await redisClient.zRemRangeByScore(key, 0, windowStart);

      // Count requests in current window
      const requestCount = await redisClient.zCard(key);

      if (requestCount >= maxRequests) {
        // Get the oldest request timestamp to calculate retry-after
        const oldestRequest = await redisClient.zRange(key, 0, 0, { REV: false, BY: 'SCORE' });
        const retryAfter = oldestRequest.length > 0 
          ? Math.ceil((parseInt(oldestRequest[1]) + windowMs - now) / 1000)
          : Math.ceil(windowMs / 1000);

        res.status(429).json({
          success: false,
          error: message,
          retryAfter,
        });
        return;
      }

      // Add current request to the window
      await redisClient.zAdd(key, { score: now, value: `${now}-${Math.random()}` });
      
      // Set expiry on the key
      await redisClient.expire(key, Math.ceil(windowMs / 1000));

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', maxRequests.toString());
      res.setHeader('X-RateLimit-Remaining', (maxRequests - requestCount - 1).toString());
      res.setHeader('X-RateLimit-Reset', new Date(now + windowMs).toISOString());

      if (skipSuccessfulRequests) {
        // Store original send function
        const originalSend = res.send;
        res.send = function (data: any) {
          // If response is successful, remove the request from rate limit
          if (res.statusCode < 400) {
            redisClient.zRem(key, `${now}-${Math.random()}`).catch(() => {});
          }
          return originalSend.call(this, data);
        };
      }

      next();
    } catch (error) {
      console.error('Rate limit middleware error:', error);
      // On error, allow the request to proceed
      next();
    }
  };
}

/**
 * IP-based rate limiting middleware
 * Limits requests per IP address
 */
export function ipRateLimit(options: Omit<RateLimitOptions, 'keyGenerator'>) {
  return rateLimit({
    ...options,
    keyGenerator: (req: Request) => {
      const ip = req.ip || req.socket.remoteAddress || 'unknown';
      return `ip:${ip}`;
    },
  });
}

/**
 * User-based rate limiting middleware
 * Limits requests per authenticated user
 */
export function userRateLimit(options: Omit<RateLimitOptions, 'keyGenerator'>) {
  return rateLimit({
    ...options,
    keyGenerator: (req: Request) => {
      const userId = req.jwtPayload?.userId || 'anonymous';
      return `user:${userId}`;
    },
  });
}

/**
 * Endpoint-specific rate limiting middleware
 * Limits requests per IP per endpoint
 */
export function endpointRateLimit(options: Omit<RateLimitOptions, 'keyGenerator'>) {
  return rateLimit({
    ...options,
    keyGenerator: (req: Request) => {
      const ip = req.ip || req.socket.remoteAddress || 'unknown';
      const endpoint = req.path;
      return `endpoint:${ip}:${endpoint}`;
    },
  });
}

/**
 * Predefined rate limit configurations
 */
export const rateLimitPresets = {
  // Strict rate limit for authentication endpoints
  auth: ipRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
    message: 'Too many authentication attempts, please try again later',
  }),

  // Standard rate limit for API endpoints
  api: userRateLimit({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60,
  }),

  // Generous rate limit for read operations
  read: userRateLimit({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
  }),

  // Strict rate limit for write operations
  write: userRateLimit({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30,
  }),

  // Very strict rate limit for expensive operations (AI generation)
  expensive: userRateLimit({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
    message: 'Rate limit exceeded for AI operations, please try again later',
  }),

  // Global IP-based throttling
  global: ipRateLimit({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
  }),
};
