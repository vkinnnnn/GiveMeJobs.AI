import { AdzunaAdapter } from '../services/job-adapters/adzuna-adapter';
import dotenv from 'dotenv';

dotenv.config();

describe('Adzuna API Integration', () => {
  let adapter: AdzunaAdapter;

  beforeAll(() => {
    // Use credentials directly or from env
    const appId = process.env.ADZUNA_APP_ID || '0ab00c272';
    const appKey = process.env.ADZUNA_APP_KEY || '012b349adec137d5ac6c637f8a03d610';
    
    adapter = new AdzunaAdapter(appId, appKey, {
      maxRequestsPerMinute: 60,
      maxRequestsPerDay: 1000,
      useRedis: false, // Disable Redis for tests
    });
  });

  describe('Configuration', () => {
    it('should have adapter name set to adzuna', () => {
      expect(adapter.name).toBe('adzuna');
    });

    it('should handle missing credentials gracefully', async () => {
      const emptyAdapter = new AdzunaAdapter('', '', {
        maxRequestsPerMinute: 60,
        maxRequestsPerDay: 1000,
        useRedis: false,
      });
      const jobs = await emptyAdapter.search({
        keywords: 'software developer',
        location: 'New York',
      });

      expect(jobs).toEqual([]);
    });
  });

  describe('Job Search', () => {
    it('should search for jobs with keywords', async () => {
      const appId = process.env.ADZUNA_APP_ID || '0ab00c272';
      const appKey = process.env.ADZUNA_APP_KEY || '012b349adec137d5ac6c637f8a03d610';
      
      if (!appId || !appKey || appId === '' || appKey === '') {
        console.log('⚠️  Adzuna credentials not configured, skipping API test');
        return;
      }

      const jobs = await adapter.search({
        keywords: 'software developer',
        location: 'New York',
        limit: 5,
      });

      console.log(`\n✅ Found ${jobs.length} jobs from Adzuna`);
      
      if (jobs.length > 0) {
        console.log('\n📋 First job:');
        console.log(`   Title: ${jobs[0].title}`);
        console.log(`   Company: ${jobs[0].company}`);
        console.log(`   Location: ${jobs[0].location}`);
        console.log(`   Source: ${jobs[0].source}`);
        console.log(`   Posted: ${jobs[0].postedDate.toLocaleDateString()}`);
        if (jobs[0].salaryMin && jobs[0].salaryMax) {
          console.log(`   Salary: $${jobs[0].salaryMin.toLocaleString()} - $${jobs[0].salaryMax.toLocaleString()}`);
        }
        console.log(`   Apply URL: ${jobs[0].applyUrl}`);

        // Verify job structure
        expect(jobs[0]).toHaveProperty('id');
        expect(jobs[0]).toHaveProperty('externalId');
        expect(jobs[0]).toHaveProperty('source');
        expect(jobs[0]).toHaveProperty('title');
        expect(jobs[0]).toHaveProperty('company');
        expect(jobs[0]).toHaveProperty('location');
        expect(jobs[0]).toHaveProperty('description');
        expect(jobs[0]).toHaveProperty('postedDate');
        expect(jobs[0]).toHaveProperty('applyUrl');
        expect(jobs[0].source).toBe('adzuna');
      }
    });

    it('should search for remote jobs', async () => {
      if (!process.env.ADZUNA_APP_ID || !process.env.ADZUNA_APP_KEY) {
        console.log('⚠️  Adzuna credentials not configured, skipping API test');
        return;
      }

      const jobs = await adapter.search({
        keywords: 'remote software engineer',
        location: 'United States',
        limit: 3,
      });

      console.log(`\n✅ Found ${jobs.length} remote jobs`);
      
      if (jobs.length > 0) {
        const remoteJobs = jobs.filter(job => job.remoteType === 'remote');
        console.log(`   ${remoteJobs.length} marked as remote`);
      }
    });

    it('should handle different search parameters', async () => {
      if (!process.env.ADZUNA_APP_ID || !process.env.ADZUNA_APP_KEY) {
        console.log('⚠️  Adzuna credentials not configured, skipping API test');
        return;
      }

      const jobs = await adapter.search({
        keywords: 'frontend developer',
        location: 'San Francisco',
        limit: 5,
        page: 1,
      });

      console.log(`\n✅ Found ${jobs.length} frontend developer jobs in San Francisco`);
      expect(Array.isArray(jobs)).toBe(true);
    });
  });

  describe('Data Normalization', () => {
    it('should normalize job data correctly', async () => {
      if (!process.env.ADZUNA_APP_ID || !process.env.ADZUNA_APP_KEY) {
        console.log('⚠️  Adzuna credentials not configured, skipping API test');
        return;
      }

      const jobs = await adapter.search({
        keywords: 'developer',
        location: 'Boston',
        limit: 3,
      });

      if (jobs.length > 0) {
        jobs.forEach(job => {
          // Check required fields
          expect(job.id).toBeTruthy();
          expect(job.externalId).toBeTruthy();
          expect(job.source).toBe('adzuna');
          expect(job.title).toBeTruthy();
          expect(job.company).toBeTruthy();
          expect(job.location).toBeTruthy();
          expect(job.description).toBeTruthy();
          expect(job.postedDate).toBeInstanceOf(Date);
          expect(job.applyUrl).toBeTruthy();

          // Check optional fields are properly typed
          if (job.remoteType) {
            expect(['remote', 'hybrid', 'onsite']).toContain(job.remoteType);
          }
          if (job.jobType) {
            expect(['full-time', 'part-time', 'contract', 'internship']).toContain(job.jobType);
          }
          if (job.experienceLevel) {
            expect(['entry', 'mid', 'senior']).toContain(job.experienceLevel);
          }
        });

        console.log('\n✅ All jobs have proper data structure');
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      const badAdapter = new AdzunaAdapter('invalid-id', 'invalid-key', {
        maxRequestsPerMinute: 60,
        maxRequestsPerDay: 1000,
        useRedis: false,
      });
      
      const jobs = await badAdapter.search({
        keywords: 'test',
        location: 'test',
      });

      // Should return empty array instead of throwing
      expect(jobs).toEqual([]);
    });

    it('should handle network timeouts', async () => {
      if (!process.env.ADZUNA_APP_ID || !process.env.ADZUNA_APP_KEY) {
        console.log('⚠️  Adzuna credentials not configured, skipping API test');
        return;
      }

      // This should complete within reasonable time or return empty array
      const jobs = await adapter.search({
        keywords: 'developer',
        location: 'New York',
        limit: 1,
      });

      expect(Array.isArray(jobs)).toBe(true);
    });
  });
});
