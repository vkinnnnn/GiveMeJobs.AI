import { Job, JobSearchQuery, JobBoardAdapter, RateLimitConfig } from '../../types/job.types';
import { RateLimiter, withRetry } from '../../utils/rate-limiter';

export abstract class BaseJobAdapter implements JobBoardAdapter {
  abstract name: string;
  protected rateLimiter!: RateLimiter;
  protected apiKey?: string;

  constructor(apiKey?: string, rateLimitConfig?: RateLimitConfig) {
    this.apiKey = apiKey;
    // Rate limiter will be initialized in child class after name is set
    this.initializeRateLimiter(rateLimitConfig);
  }

  protected initializeRateLimiter(rateLimitConfig?: RateLimitConfig): void {
    this.rateLimiter = new RateLimiter(
      this.name,
      rateLimitConfig || {
        requestsPerMinute: 10,
        requestsPerDay: 1000,
      }
    );
  }

  abstract search(query: JobSearchQuery): Promise<Job[]>;
  abstract getJobDetails(externalId: string): Promise<Job | null>;

  protected async makeRequest<T>(
    requestFn: () => Promise<T>,
    userId?: string
  ): Promise<T> {
    // Check rate limit
    const canProceed = await this.rateLimiter.checkLimit(userId);
    if (!canProceed) {
      throw new Error(`Rate limit exceeded for ${this.name}`);
    }

    // Make request with retry logic
    const result = await withRetry(requestFn, 3, 1000);

    // Increment counter
    await this.rateLimiter.incrementCounter(userId);

    return result;
  }

  protected parseDate(dateStr: string | Date | undefined): Date {
    if (!dateStr) {
      return new Date();
    }
    return typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  }

  protected parseSalary(salary: any): { min?: number; max?: number } {
    if (!salary) {
      return {};
    }

    if (typeof salary === 'object' && (salary.min || salary.max)) {
      return {
        min: salary.min,
        max: salary.max,
      };
    }

    if (typeof salary === 'string') {
      // Try to extract numbers from string like "$50,000 - $80,000"
      const numbers = salary.match(/\d+(?:,\d+)*/g);
      if (numbers && numbers.length >= 2) {
        return {
          min: parseInt(numbers[0].replace(/,/g, ''), 10),
          max: parseInt(numbers[1].replace(/,/g, ''), 10),
        };
      }
    }

    return {};
  }

  protected extractArray(data: any, field: string): string[] {
    if (!data || !data[field]) {
      return [];
    }

    if (Array.isArray(data[field])) {
      return data[field];
    }

    if (typeof data[field] === 'string') {
      // Split by common delimiters
      return data[field]
        .split(/[,;\n]/)
        .map((item: string) => item.trim())
        .filter((item: string) => item.length > 0);
    }

    return [];
  }
}
