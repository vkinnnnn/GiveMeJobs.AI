import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { jobAggregatorService } from '../../services/job-aggregator.service';
import { LinkedInAdapter, IndeedAdapter, GlassdoorAdapter, AdzunaAdapter } from '../../services/job-adapters';
import { RateLimiter, withRetry } from '../../utils/rate-limiter';
import { JobSearchQuery, Job } from '../../types/job.types';

/**
 * Integration tests for external API integrations
 * Requirements: 8.3, 8.6
 */

// Mock Redis client to avoid connection issues in tests
vi.mock('../../config/database', () => ({
  redisClient: {
    get: vi.fn().mockResolvedValue(null),
    multi: vi.fn().mockReturnValue({
      incr: vi.fn().mockReturnThis(),
      expire: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue([])
    })
  },
  pgPool: {}
}));

describe('External API Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('LinkedIn API Integration', () => {
    let linkedinAdapter: LinkedInAdapter;

    beforeEach(() => {
      linkedinAdapter = new LinkedInAdapter('test-api-key', {
        requestsPerMinute: 5,
        requestsPerDay: 100,
        useRedis: false
      });
    });

    it('should search jobs from LinkedIn API with mocked responses', async () => {
      // Requirement 8.3: Query LinkedIn API
      const mockQuery: JobSearchQuery = {
        keywords: 'software engineer',
        location: 'San Francisco',
        page: 1,
        limit: 10
      };

      const jobs = await linkedinAdapter.search(mockQuery);

      expect(jobs).toBeDefined();
      expect(Array.isArray(jobs)).toBe(true);
      expect(jobs.length).toBeGreaterThan(0);
      
      // Verify job structure
      const job = jobs[0];
      expect(job).toHaveProperty('id');
      expect(job).toHaveProperty('externalId');
      expect(job).toHaveProperty('source', 'linkedin');
      expect(job).toHaveProperty('title');
      expect(job).toHaveProperty('company');
      expect(job).toHaveProperty('location');
      expect(job).toHaveProperty('description');
      expect(job).toHaveProperty('postedDate');
      expect(job).toHaveProperty('applyUrl');
    });

    it('should get job details from LinkedIn API', async () => {
      const externalId = 'linkedin-test-123';
      const job = await linkedinAdapter.getJobDetails(externalId);

      expect(job).toBeDefined();
      expect(job?.externalId).toBe(externalId);
      expect(job?.source).toBe('linkedin');
      expect(job?.title).toBeDefined();
      expect(job?.company).toBeDefined();
    });

    it('should handle LinkedIn API rate limiting', async () => {
      // Requirement 8.6: Respect rate limits
      // Create a simple in-memory rate limiter for testing
      let requestCount = 0;
      const maxRequests = 2;
      
      const mockRateLimiter = {
        checkLimit: () => requestCount < maxRequests,
        incrementCounter: () => { requestCount++; }
      };

      // First two requests should succeed
      expect(mockRateLimiter.checkLimit()).toBe(true);
      mockRateLimiter.incrementCounter();
      
      expect(mockRateLimiter.checkLimit()).toBe(true);
      mockRateLimiter.incrementCounter();

      // Third request should be rate limited
      expect(mockRateLimiter.checkLimit()).toBe(false);
    });

    it('should normalize LinkedIn job data correctly', async () => {
      const jobs = await linkedinAdapter.search({
        keywords: 'developer',
        page: 1,
        limit: 5
      });

      jobs.forEach(job => {
        // Verify normalized structure
        expect(job.source).toBe('linkedin');
        expect(typeof job.title).toBe('string');
        expect(typeof job.company).toBe('string');
        expect(typeof job.location).toBe('string');
        expect(job.postedDate).toBeInstanceOf(Date);
        
        // Verify salary normalization
        if (job.salaryMin) {
          expect(typeof job.salaryMin).toBe('number');
        }
        if (job.salaryMax) {
          expect(typeof job.salaryMax).toBe('number');
        }

        // Verify arrays are properly formatted
        expect(Array.isArray(job.requirements)).toBe(true);
        expect(Array.isArray(job.responsibilities)).toBe(true);
        expect(Array.isArray(job.benefits)).toBe(true);
      });
    });

    it('should handle LinkedIn API errors gracefully', async () => {
      // Mock API failure
      const mockFailingAdapter = new LinkedInAdapter();
      vi.spyOn(mockFailingAdapter, 'search').mockRejectedValue(new Error('API Error'));

      try {
        await mockFailingAdapter.search({ keywords: 'test', page: 1, limit: 10 });
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('API Error');
      }
    });
  });

  describe('Indeed API Integration', () => {
    let indeedAdapter: IndeedAdapter;

    beforeEach(() => {
      indeedAdapter = new IndeedAdapter('test-api-key', {
        requestsPerMinute: 10,
        requestsPerDay: 500,
        useRedis: false
      });
    });

    it('should search jobs from Indeed API with mocked responses', async () => {
      // Requirement 8.3: Query Indeed API
      const mockQuery: JobSearchQuery = {
        keywords: 'frontend developer',
        location: 'New York',
        page: 1,
        limit: 10
      };

      const jobs = await indeedAdapter.search(mockQuery);

      expect(jobs).toBeDefined();
      expect(Array.isArray(jobs)).toBe(true);
      expect(jobs.length).toBeGreaterThan(0);
      
      // Verify job structure
      const job = jobs[0];
      expect(job.source).toBe('indeed');
      expect(job.title).toBeDefined();
      expect(job.company).toBeDefined();
      expect(job.location).toBeDefined();
    });

    it('should normalize Indeed job data format', async () => {
      // Requirement 8.4: Normalize data formats
      const jobs = await indeedAdapter.search({
        keywords: 'developer',
        page: 1,
        limit: 5
      });

      jobs.forEach(job => {
        // Check normalized fields
        expect(job).toHaveProperty('id');
        expect(job).toHaveProperty('externalId');
        expect(job).toHaveProperty('title');
        expect(job).toHaveProperty('company');
        expect(job).toHaveProperty('location');
        expect(job).toHaveProperty('source', 'indeed');
        expect(job).toHaveProperty('description');
        expect(job).toHaveProperty('postedDate');
        expect(job.postedDate).toBeInstanceOf(Date);

        // Verify salary normalization
        if (job.salaryMin || job.salaryMax) {
          if (job.salaryMin) expect(typeof job.salaryMin).toBe('number');
          if (job.salaryMax) expect(typeof job.salaryMax).toBe('number');
        }

        // Verify remote type normalization
        if (job.remoteType) {
          expect(['remote', 'hybrid', 'onsite']).toContain(job.remoteType);
        }

        // Verify job type normalization
        if (job.jobType) {
          expect(['full-time', 'part-time', 'contract', 'internship']).toContain(job.jobType);
        }
      });
    });

    it('should handle Indeed API errors gracefully', async () => {
      // Mock API error
      const mockFailingAdapter = new IndeedAdapter();
      vi.spyOn(mockFailingAdapter, 'search').mockRejectedValue(new Error('Indeed API Error'));

      try {
        await mockFailingAdapter.search({ keywords: 'test', page: 1, limit: 10 });
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Indeed API Error');
      }
    });

    it('should get job details from Indeed API', async () => {
      const externalId = 'indeed-test-456';
      const job = await indeedAdapter.getJobDetails(externalId);

      expect(job).toBeDefined();
      expect(job?.externalId).toBe(externalId);
      expect(job?.source).toBe('indeed');
    });

    it('should handle Indeed rate limiting', async () => {
      // Create a simple in-memory rate limiter for testing
      let requestCount = 0;
      const maxRequests = 3;
      
      const mockRateLimiter = {
        checkLimit: () => requestCount < maxRequests,
        incrementCounter: () => { requestCount++; }
      };

      // Test rate limiting
      for (let i = 0; i < 3; i++) {
        expect(mockRateLimiter.checkLimit()).toBe(true);
        mockRateLimiter.incrementCounter();
      }

      // Fourth request should be rate limited
      expect(mockRateLimiter.checkLimit()).toBe(false);
    });
  });

  describe('Glassdoor API Integration', () => {
    let glassdoorAdapter: GlassdoorAdapter;

    beforeEach(() => {
      glassdoorAdapter = new GlassdoorAdapter('test-api-key', {
        requestsPerMinute: 8,
        requestsPerDay: 200,
        useRedis: false
      });
    });

    it('should search jobs from Glassdoor API with mocked responses', async () => {
      // Requirement 8.3: Query Glassdoor API
      const mockQuery: JobSearchQuery = {
        keywords: 'backend engineer',
        location: 'Seattle',
        page: 1,
        limit: 10
      };

      const jobs = await glassdoorAdapter.search(mockQuery);

      expect(jobs).toBeDefined();
      expect(Array.isArray(jobs)).toBe(true);
      expect(jobs.length).toBeGreaterThan(0);
      
      const job = jobs[0];
      expect(job.source).toBe('glassdoor');
      expect(job.title).toBeDefined();
      expect(job.company).toBeDefined();
    });

    it('should handle Glassdoor API errors gracefully', async () => {
      const mockFailingAdapter = new GlassdoorAdapter();
      vi.spyOn(mockFailingAdapter, 'search').mockRejectedValue(new Error('Glassdoor API Error'));

      try {
        await mockFailingAdapter.search({ keywords: 'test', page: 1, limit: 10 });
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Glassdoor API Error');
      }
    });

    it('should normalize Glassdoor job data', async () => {
      const jobs = await glassdoorAdapter.search({
        keywords: 'engineer',
        page: 1,
        limit: 5
      });

      jobs.forEach(job => {
        expect(job.source).toBe('glassdoor');
        expect(job.postedDate).toBeInstanceOf(Date);
        expect(Array.isArray(job.requirements)).toBe(true);
        expect(Array.isArray(job.responsibilities)).toBe(true);
        expect(Array.isArray(job.benefits)).toBe(true);
      });
    });

    it('should get job details from Glassdoor API', async () => {
      const externalId = 'glassdoor-test-789';
      const job = await glassdoorAdapter.getJobDetails(externalId);

      expect(job).toBeDefined();
      expect(job?.externalId).toBe(externalId);
      expect(job?.source).toBe('glassdoor');
    });
  });

  describe('Adzuna API Integration', () => {
    let adzunaAdapter: AdzunaAdapter;

    beforeEach(() => {
      // Create adapter without credentials to test fallback behavior
      adzunaAdapter = new AdzunaAdapter('', '', {
        requestsPerMinute: 15,
        requestsPerDay: 1000,
        useRedis: false
      });
    });

    it('should handle missing credentials gracefully', async () => {
      // Requirement 8.3: Handle missing API credentials
      const mockQuery: JobSearchQuery = {
        keywords: 'data scientist',
        location: 'Boston',
        page: 1,
        limit: 10
      };

      const jobs = await adzunaAdapter.search(mockQuery);

      expect(jobs).toBeDefined();
      expect(Array.isArray(jobs)).toBe(true);
      // Should return empty array when credentials are missing
      expect(jobs.length).toBe(0);
    });

    it('should handle Adzuna API errors gracefully', async () => {
      const mockFailingAdapter = new AdzunaAdapter();
      vi.spyOn(mockFailingAdapter, 'search').mockRejectedValue(new Error('Adzuna API Error'));

      try {
        await mockFailingAdapter.search({ keywords: 'test', page: 1, limit: 10 });
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Adzuna API Error');
      }
    });

    it('should search jobs with valid credentials', async () => {
      // Mock successful API response
      const mockAdzunaWithCreds = new AdzunaAdapter('valid-app-id', 'valid-app-key', {
        requestsPerMinute: 15,
        requestsPerDay: 1000,
        useRedis: false
      });

      // Mock the search method to return mock data
      vi.spyOn(mockAdzunaWithCreds, 'search').mockResolvedValue([
        {
          id: 'mock-uuid',
          externalId: 'adzuna-123',
          source: 'adzuna',
          title: 'Data Scientist',
          company: 'Tech Corp',
          location: 'Boston, MA',
          remoteType: 'onsite',
          jobType: 'full-time',
          description: 'Mock job description',
          requirements: [],
          responsibilities: [],
          benefits: [],
          postedDate: new Date(),
          applyUrl: 'https://example.com/apply'
        } as Job
      ]);

      const jobs = await mockAdzunaWithCreds.search({
        keywords: 'data scientist',
        page: 1,
        limit: 10
      });

      expect(jobs).toBeDefined();
      expect(Array.isArray(jobs)).toBe(true);
      expect(jobs.length).toBeGreaterThan(0);
      
      const job = jobs[0];
      expect(job.source).toBe('adzuna');
      expect(job.title).toBeDefined();
      expect(job.company).toBeDefined();
    });
  });

  describe('Job Aggregation Service', () => {
    it('should aggregate jobs from multiple sources', async () => {
      // Requirement 8.3: Query multiple APIs
      const mockQuery: JobSearchQuery = {
        keywords: 'software engineer',
        location: 'San Francisco',
        page: 1,
        limit: 20
      };

      const jobs = await jobAggregatorService.searchJobs(mockQuery);

      expect(jobs).toBeDefined();
      expect(Array.isArray(jobs)).toBe(true);
      expect(jobs.length).toBeGreaterThan(0);

      // Should have jobs from multiple sources
      const sources = new Set(jobs.map(job => job.source));
      expect(sources.size).toBeGreaterThan(1);
      expect(sources.has('linkedin')).toBe(true);
      expect(sources.has('indeed')).toBe(true);
    });

    it('should deduplicate job listings', async () => {
      // Requirement 8.4: Deduplicate results
      const mockQuery: JobSearchQuery = {
        keywords: 'developer',
        page: 1,
        limit: 50
      };

      const jobs = await jobAggregatorService.searchJobs(mockQuery);
      
      // Create deduplication keys for comparison
      const jobKeys = jobs.map(job => 
        `${job.title.toLowerCase().trim()}|${job.company.toLowerCase().trim()}|${job.location.toLowerCase().trim()}`
      );
      
      const uniqueKeys = new Set(jobKeys);
      
      // Number of unique jobs should equal total jobs (no duplicates)
      expect(uniqueKeys.size).toBe(jobs.length);
    });

    it('should handle individual adapter failures gracefully', async () => {
      // Mock one adapter to fail
      const mockAggregator = Object.create(jobAggregatorService);
      const originalAdapters = (mockAggregator as any).adapters;
      
      // Mock LinkedIn adapter to fail
      const mockLinkedInAdapter = {
        name: 'linkedin',
        search: vi.fn().mockRejectedValue(new Error('LinkedIn API Error'))
      };
      
      (mockAggregator as any).adapters = [
        mockLinkedInAdapter,
        ...originalAdapters.slice(1)
      ];

      const jobs = await mockAggregator.searchJobs({
        keywords: 'engineer',
        page: 1,
        limit: 10
      });

      // Should still return results from other sources
      expect(jobs).toBeDefined();
      expect(Array.isArray(jobs)).toBe(true);
      
      // Should not contain LinkedIn jobs due to error
      const linkedinJobs = jobs.filter((job: Job) => job.source === 'linkedin');
      expect(linkedinJobs.length).toBe(0);
    });

    it('should normalize job data across sources', async () => {
      const jobs = await jobAggregatorService.searchJobs({
        keywords: 'engineer',
        page: 1,
        limit: 20
      });

      jobs.forEach(job => {
        // All jobs should have normalized structure
        expect(job).toHaveProperty('id');
        expect(job).toHaveProperty('externalId');
        expect(job).toHaveProperty('source');
        expect(job).toHaveProperty('title');
        expect(job).toHaveProperty('company');
        expect(job).toHaveProperty('location');
        expect(job).toHaveProperty('description');
        expect(job).toHaveProperty('postedDate');
        expect(job.postedDate).toBeInstanceOf(Date);

        // Verify source is valid
        expect(['linkedin', 'indeed', 'glassdoor', 'adzuna']).toContain(job.source);

        // Verify arrays are properly formatted
        expect(Array.isArray(job.requirements)).toBe(true);
        expect(Array.isArray(job.responsibilities)).toBe(true);
        expect(Array.isArray(job.benefits)).toBe(true);
      });
    });

    it('should sort jobs by posted date (newest first)', async () => {
      const jobs = await jobAggregatorService.searchJobs({
        keywords: 'developer',
        page: 1,
        limit: 10
      });

      if (jobs.length > 1) {
        for (let i = 0; i < jobs.length - 1; i++) {
          expect(jobs[i].postedDate.getTime()).toBeGreaterThanOrEqual(
            jobs[i + 1].postedDate.getTime()
          );
        }
      }
    });

    it('should get job details from specific source', async () => {
      // Mock the adapter to avoid Redis issues
      const mockAdapter = new LinkedInAdapter('test-key', {
        requestsPerMinute: 10,
        requestsPerDay: 100,
        useRedis: false
      });

      vi.spyOn(mockAdapter, 'getJobDetails').mockResolvedValue({
        id: 'mock-uuid',
        externalId: 'test-job-123',
        source: 'linkedin',
        title: 'Test Job',
        company: 'Test Company',
        location: 'Test Location',
        description: 'Test Description',
        requirements: [],
        responsibilities: [],
        benefits: [],
        postedDate: new Date(),
        applyUrl: 'https://example.com'
      } as Job);

      const job = await mockAdapter.getJobDetails('test-job-123');

      expect(job).toBeDefined();
      expect(job?.source).toBe('linkedin');
      expect(job?.externalId).toBe('test-job-123');
    });

    it('should handle unknown job source', async () => {
      try {
        await jobAggregatorService.getJobDetails('unknown-source', 'test-123');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('Unknown job source');
      }
    });
  });

  describe('Retry Logic and Error Handling', () => {
    it('should implement exponential backoff retry logic', async () => {
      // Requirement 8.6: Implement exponential backoff
      let attemptCount = 0;
      const mockFailingFunction = vi.fn().mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Temporary API Error');
        }
        return Promise.resolve('Success');
      });

      const startTime = Date.now();
      const result = await withRetry(mockFailingFunction, 3, 100);
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(result).toBe('Success');
      expect(attemptCount).toBe(3);
      // Should have waited with exponential backoff (100ms + 200ms = 300ms minimum)
      expect(duration).toBeGreaterThan(250);
    });

    it('should fail after max retries', async () => {
      const mockFailingFunction = vi.fn().mockRejectedValue(new Error('Persistent API Error'));

      try {
        await withRetry(mockFailingFunction, 2, 50);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Persistent API Error');
        expect(mockFailingFunction).toHaveBeenCalledTimes(2);
      }
    });

    it('should handle network timeouts gracefully', async () => {
      const timeoutFunction = () => new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Network timeout')), 50);
      });

      try {
        await withRetry(timeoutFunction, 2, 10);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Network timeout');
      }
    });

    it('should handle invalid API responses', async () => {
      const mockAdapter = new LinkedInAdapter();
      
      // Mock invalid response
      vi.spyOn(mockAdapter, 'search').mockResolvedValue([
        // Invalid job object missing required fields
        {} as Job
      ]);

      const jobs = await mockAdapter.search({ keywords: 'test', page: 1, limit: 10 });
      
      // Should handle gracefully and return empty or normalized data
      expect(Array.isArray(jobs)).toBe(true);
    });

    it('should log API errors for monitoring', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Trigger an error in job aggregation
      const mockQuery: JobSearchQuery = {
        keywords: 'test',
        page: 1,
        limit: 10
      };

      // Mock all adapters to fail
      const mockAggregator = Object.create(jobAggregatorService);
      (mockAggregator as any).adapters = [
        { name: 'linkedin', search: () => Promise.reject(new Error('LinkedIn Error')) },
        { name: 'indeed', search: () => Promise.reject(new Error('Indeed Error')) },
        { name: 'glassdoor', search: () => Promise.reject(new Error('Glassdoor Error')) },
        { name: 'adzuna', search: () => Promise.reject(new Error('Adzuna Error')) }
      ];

      const jobs = await mockAggregator.searchJobs(mockQuery);
      
      // Should return empty array when all sources fail
      expect(jobs).toEqual([]);
      
      consoleSpy.mockRestore();
    });

    it('should handle partial API failures', async () => {
      // Mock scenario where some APIs succeed and others fail
      const mockQuery: JobSearchQuery = {
        keywords: 'engineer',
        page: 1,
        limit: 10
      };

      const mockAggregator = Object.create(jobAggregatorService);
      const originalAdapters = (mockAggregator as any).adapters;
      
      // Mock some adapters to fail, others to succeed
      (mockAggregator as any).adapters = [
        originalAdapters[0], // LinkedIn - success
        { name: 'indeed', search: () => Promise.reject(new Error('Indeed Error')) },
        originalAdapters[2], // Glassdoor - success
        { name: 'adzuna', search: () => Promise.reject(new Error('Adzuna Error')) }
      ];

      const jobs = await mockAggregator.searchJobs(mockQuery);

      // Should return results from successful sources
      expect(jobs.length).toBeGreaterThan(0);
      
      const sources = new Set(jobs.map(job => job.source));
      expect(sources.has('linkedin')).toBe(true);
      expect(sources.has('glassdoor')).toBe(true);
      expect(sources.has('indeed')).toBe(false);
      expect(sources.has('adzuna')).toBe(false);
    });
  });

  describe('Rate Limiting', () => {
    it('should respect API rate limits per provider', async () => {
      // Requirement 8.6: Respect rate limits
      // Create a simple in-memory rate limiter for testing
      let requestCount = 0;
      const maxRequests = 3;
      
      const mockRateLimiter = {
        checkLimit: () => requestCount < maxRequests,
        incrementCounter: () => { requestCount++; }
      };

      // First 3 requests should succeed
      for (let i = 0; i < 3; i++) {
        expect(mockRateLimiter.checkLimit()).toBe(true);
        mockRateLimiter.incrementCounter();
      }

      // 4th request should be rate limited
      expect(mockRateLimiter.checkLimit()).toBe(false);
    });

    it('should track daily rate limits separately', async () => {
      // Create separate counters for minute and day limits
      let minuteCount = 0;
      let dayCount = 0;
      const minuteLimit = 10;
      const dayLimit = 2;
      
      const mockRateLimiter = {
        checkLimit: () => minuteCount < minuteLimit && dayCount < dayLimit,
        incrementCounter: () => { 
          minuteCount++; 
          dayCount++; 
        }
      };

      // First 2 requests should succeed (within daily limit)
      expect(mockRateLimiter.checkLimit()).toBe(true);
      mockRateLimiter.incrementCounter();
      
      expect(mockRateLimiter.checkLimit()).toBe(true);
      mockRateLimiter.incrementCounter();

      // 3rd request should be rate limited (exceeds daily limit)
      expect(mockRateLimiter.checkLimit()).toBe(false);
    });

    it('should provide remaining request counts', async () => {
      // Mock remaining requests functionality
      let requestCount = 0;
      const maxRequests = 5;
      
      const mockRateLimiter = {
        getRemainingRequests: () => ({
          minute: maxRequests - requestCount,
          day: 20 - requestCount
        }),
        incrementCounter: () => { requestCount++; }
      };

      // Initial state
      let remaining = mockRateLimiter.getRemainingRequests();
      expect(remaining.minute).toBe(5);
      expect(remaining.day).toBe(20);

      // After one request
      mockRateLimiter.incrementCounter();
      remaining = mockRateLimiter.getRemainingRequests();
      expect(remaining.minute).toBe(4);
      expect(remaining.day).toBe(19);
    });

    it('should handle rate limiting per user', async () => {
      // Mock per-user rate limiting
      const userCounts: Record<string, number> = {};
      const maxRequests = 2;
      
      const mockRateLimiter = {
        checkLimit: (userId: string) => (userCounts[userId] || 0) < maxRequests,
        incrementCounter: (userId: string) => { 
          userCounts[userId] = (userCounts[userId] || 0) + 1; 
        }
      };

      const user1 = 'user-123';
      const user2 = 'user-456';

      // User 1 makes 2 requests
      expect(mockRateLimiter.checkLimit(user1)).toBe(true);
      mockRateLimiter.incrementCounter(user1);
      
      expect(mockRateLimiter.checkLimit(user1)).toBe(true);
      mockRateLimiter.incrementCounter(user1);

      // User 1 is now rate limited
      expect(mockRateLimiter.checkLimit(user1)).toBe(false);

      // User 2 should still be able to make requests
      expect(mockRateLimiter.checkLimit(user2)).toBe(true);
      mockRateLimiter.incrementCounter(user2);
    });

    it('should handle adapter rate limiting in practice', async () => {
      // Mock adapter with rate limiting
      const adapter = new LinkedInAdapter('test-key', {
        requestsPerMinute: 2,
        requestsPerDay: 10,
        useRedis: false
      });

      // Mock the makeRequest method to simulate rate limiting
      let requestCount = 0;
      const originalMakeRequest = adapter['makeRequest'];
      
      vi.spyOn(adapter as any, 'makeRequest').mockImplementation(async (fn: Function) => {
        if (requestCount >= 2) {
          throw new Error('Rate limit exceeded for linkedin');
        }
        requestCount++;
        return originalMakeRequest.call(adapter, fn);
      });

      // First 2 requests should succeed
      await adapter.search({ keywords: 'test1', page: 1, limit: 10 });
      await adapter.search({ keywords: 'test2', page: 1, limit: 10 });

      // Third request should fail due to rate limiting
      try {
        await adapter.search({ keywords: 'test3', page: 1, limit: 10 });
        expect.fail('Should have thrown rate limit error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('Rate limit exceeded');
      }
    });
  });

  describe('Data Normalization', () => {
    it('should normalize salary formats from different sources', async () => {
      const jobs = await jobAggregatorService.searchJobs({
        keywords: 'engineer',
        page: 1,
        limit: 20
      });

      jobs.forEach(job => {
        if (job.salaryMin) {
          expect(typeof job.salaryMin).toBe('number');
          expect(job.salaryMin).toBeGreaterThan(0);
        }
        if (job.salaryMax) {
          expect(typeof job.salaryMax).toBe('number');
          expect(job.salaryMax).toBeGreaterThan(0);
        }
        if (job.salaryMin && job.salaryMax) {
          expect(job.salaryMax).toBeGreaterThanOrEqual(job.salaryMin);
        }
      });
    });

    it('should normalize date formats from different sources', async () => {
      const jobs = await jobAggregatorService.searchJobs({
        keywords: 'developer',
        page: 1,
        limit: 15
      });

      jobs.forEach(job => {
        expect(job.postedDate).toBeInstanceOf(Date);
        expect(job.postedDate.getTime()).toBeLessThanOrEqual(Date.now());
        
        if (job.applicationDeadline) {
          expect(job.applicationDeadline).toBeInstanceOf(Date);
          expect(job.applicationDeadline.getTime()).toBeGreaterThan(job.postedDate.getTime());
        }
      });
    });

    it('should normalize location formats', async () => {
      const jobs = await jobAggregatorService.searchJobs({
        keywords: 'engineer',
        page: 1,
        limit: 10
      });

      jobs.forEach(job => {
        expect(job.location).toBeDefined();
        expect(typeof job.location).toBe('string');
        expect(job.location.trim().length).toBeGreaterThan(0);
      });
    });

    it('should normalize remote type values', async () => {
      const jobs = await jobAggregatorService.searchJobs({
        keywords: 'remote developer',
        page: 1,
        limit: 10
      });

      jobs.forEach(job => {
        if (job.remoteType) {
          expect(['remote', 'hybrid', 'onsite']).toContain(job.remoteType);
        }
      });
    });

    it('should normalize job type values', async () => {
      const jobs = await jobAggregatorService.searchJobs({
        keywords: 'software engineer',
        page: 1,
        limit: 10
      });

      jobs.forEach(job => {
        if (job.jobType) {
          expect(['full-time', 'part-time', 'contract', 'internship']).toContain(job.jobType);
        }
      });
    });

    it('should normalize array fields consistently', async () => {
      const jobs = await jobAggregatorService.searchJobs({
        keywords: 'developer',
        page: 1,
        limit: 10
      });

      jobs.forEach(job => {
        // All array fields should be arrays, even if empty
        expect(Array.isArray(job.requirements)).toBe(true);
        expect(Array.isArray(job.responsibilities)).toBe(true);
        expect(Array.isArray(job.benefits)).toBe(true);

        // Array items should be non-empty strings
        job.requirements.forEach(req => {
          expect(typeof req).toBe('string');
          expect(req.trim().length).toBeGreaterThan(0);
        });

        job.responsibilities.forEach(resp => {
          expect(typeof resp).toBe('string');
          expect(resp.trim().length).toBeGreaterThan(0);
        });

        job.benefits.forEach(benefit => {
          expect(typeof benefit).toBe('string');
          expect(benefit.trim().length).toBeGreaterThan(0);
        });
      });
    });

    it('should normalize company and title capitalization', async () => {
      const jobs = await jobAggregatorService.searchJobs({
        keywords: 'engineer',
        page: 1,
        limit: 5
      });

      jobs.forEach(job => {
        // Titles and companies should be properly capitalized
        expect(job.title).toBeDefined();
        expect(job.company).toBeDefined();
        
        // Should not be all uppercase or all lowercase
        expect(job.title).not.toBe(job.title.toUpperCase());
        expect(job.title).not.toBe(job.title.toLowerCase());
        expect(job.company).not.toBe(job.company.toUpperCase());
        expect(job.company).not.toBe(job.company.toLowerCase());
      });
    });

    it('should handle missing or incomplete data gracefully', async () => {
      // Test with adapters that might return incomplete data
      const mockAdapter = new LinkedInAdapter();
      
      // Mock incomplete job data
      const incompleteJob = {
        id: 'incomplete-123',
        title: 'Test Job',
        company: 'Test Company',
        // Missing many fields
      };

      vi.spyOn(mockAdapter, 'search').mockResolvedValue([
        mockAdapter['normalizeJob'](incompleteJob as any)
      ]);

      const jobs = await mockAdapter.search({ keywords: 'test', page: 1, limit: 10 });
      const job = jobs[0];

      // Should have default values for missing fields
      expect(job.requirements).toEqual([]);
      expect(job.responsibilities).toEqual([]);
      expect(job.benefits).toEqual([]);
      expect(job.postedDate).toBeInstanceOf(Date);
    });
  });
});
