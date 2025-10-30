import { redisClient } from '../config/database';
import { RateLimitConfig } from '../types/job.types';

export class RateLimiter {
  private config: RateLimitConfig;
  private provider: string;

  constructor(provider: string, config: RateLimitConfig) {
    this.provider = provider;
    this.config = config;
  }

  async checkLimit(userId?: string): Promise<boolean> {
    const minuteKey = this.getKey('minute', userId);
    const dayKey = this.getKey('day', userId);

    const [minuteCount, dayCount] = await Promise.all([
      redisClient.get(minuteKey),
      redisClient.get(dayKey),
    ]);

    const currentMinuteCount = minuteCount ? parseInt(minuteCount, 10) : 0;
    const currentDayCount = dayCount ? parseInt(dayCount, 10) : 0;

    return (
      currentMinuteCount < this.config.requestsPerMinute &&
      currentDayCount < this.config.requestsPerDay
    );
  }

  async incrementCounter(userId?: string): Promise<void> {
    const minuteKey = this.getKey('minute', userId);
    const dayKey = this.getKey('day', userId);

    const pipeline = redisClient.multi();

    // Increment minute counter
    pipeline.incr(minuteKey);
    pipeline.expire(minuteKey, 60); // Expire after 1 minute

    // Increment day counter
    pipeline.incr(dayKey);
    pipeline.expire(dayKey, 86400); // Expire after 24 hours

    await pipeline.exec();
  }

  async getRemainingRequests(userId?: string): Promise<{ minute: number; day: number }> {
    const minuteKey = this.getKey('minute', userId);
    const dayKey = this.getKey('day', userId);

    const [minuteCount, dayCount] = await Promise.all([
      redisClient.get(minuteKey),
      redisClient.get(dayKey),
    ]);

    const currentMinuteCount = minuteCount ? parseInt(minuteCount, 10) : 0;
    const currentDayCount = dayCount ? parseInt(dayCount, 10) : 0;

    return {
      minute: Math.max(0, this.config.requestsPerMinute - currentMinuteCount),
      day: Math.max(0, this.config.requestsPerDay - currentDayCount),
    };
  }

  private getKey(period: 'minute' | 'day', userId?: string): string {
    const timestamp =
      period === 'minute'
        ? Math.floor(Date.now() / 60000) // Current minute
        : Math.floor(Date.now() / 86400000); // Current day

    const userPart = userId ? `:${userId}` : '';
    return `ratelimit:${this.provider}${userPart}:${period}:${timestamp}`;
  }
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt < maxRetries - 1) {
        // Exponential backoff
        const delay = delayMs * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError!;
}
