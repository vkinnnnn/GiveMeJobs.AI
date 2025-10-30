import { Pool } from 'pg';
import { pgPool, redisClient } from '../config/database';
import { Job, JobSearchQuery, JobSearchResult } from '../types/job.types';
import { jobAggregatorService } from './job-aggregator.service';

export class JobService {
  private db: Pool;
  private cachePrefix = 'job:';
  private searchCachePrefix = 'job:search:';
  private cacheTTL = 3600; // 1 hour

  constructor() {
    this.db = pgPool;
  }

  async searchJobs(query: JobSearchQuery): Promise<JobSearchResult> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const offset = (page - 1) * limit;

    // Generate cache key based on query
    const cacheKey = this.generateSearchCacheKey(query);

    // Try to get from cache
    const cached = await this.getFromCache<JobSearchResult>(cacheKey);
    if (cached) {
      return cached;
    }

    // Search from external sources
    const externalJobs = await jobAggregatorService.searchJobs(query);

    // Store jobs in database
    await this.storeJobs(externalJobs);

    // Apply filters and pagination
    let filteredJobs = this.applyFilters(externalJobs, query);

    // Calculate pagination
    const total = filteredJobs.length;
    const totalPages = Math.ceil(total / limit);
    filteredJobs = filteredJobs.slice(offset, offset + limit);

    const result: JobSearchResult = {
      jobs: filteredJobs,
      total,
      page,
      totalPages,
    };

    // Cache the result
    await this.setCache(cacheKey, result, this.cacheTTL);

    return result;
  }

  async getJobById(jobId: string): Promise<Job | null> {
    // Try cache first
    const cacheKey = `${this.cachePrefix}${jobId}`;
    const cached = await this.getFromCache<Job>(cacheKey);
    if (cached) {
      return cached;
    }

    // Query database
    const query = `
      SELECT 
        id, external_id, source, title, company, location, remote_type,
        job_type, salary_min, salary_max, description, requirements,
        responsibilities, benefits, posted_date, application_deadline,
        apply_url, company_logo, industry, experience_level,
        created_at, updated_at
      FROM jobs
      WHERE id = $1
    `;

    const result = await this.db.query(query, [jobId]);

    if (result.rows.length === 0) {
      return null;
    }

    const job = this.mapRowToJob(result.rows[0]);

    // Cache the result
    await this.setCache(cacheKey, job, this.cacheTTL);

    return job;
  }

  async getJobDetails(source: string, externalId: string): Promise<Job | null> {
    // Try to get from database first
    let job = await this.getJobByExternalId(source, externalId);

    if (job) {
      return job;
    }

    // If not in database, fetch from external source
    try {
      job = await jobAggregatorService.getJobDetails(source, externalId);
      
      if (job) {
        // Store in database for future use
        await this.storeJob(job);
        
        // Cache the result
        const cacheKey = `${this.cachePrefix}${source}:${externalId}`;
        await this.setCache(cacheKey, job, this.cacheTTL);
      }

      return job;
    } catch (error) {
      console.error(`Error fetching job details from ${source}:`, error);
      return null;
    }
  }

  async getJobByExternalId(source: string, externalId: string): Promise<Job | null> {
    const query = `
      SELECT 
        id, external_id, source, title, company, location, remote_type,
        job_type, salary_min, salary_max, description, requirements,
        responsibilities, benefits, posted_date, application_deadline,
        apply_url, company_logo, industry, experience_level,
        created_at, updated_at
      FROM jobs
      WHERE source = $1 AND external_id = $2
    `;

    const result = await this.db.query(query, [source, externalId]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToJob(result.rows[0]);
  }

  private async storeJobs(jobs: Job[]): Promise<void> {
    for (const job of jobs) {
      await this.storeJob(job);
    }
  }

  private async storeJob(job: Job): Promise<string> {
    const query = `
      INSERT INTO jobs (
        external_id, source, title, company, location, remote_type,
        job_type, salary_min, salary_max, description, requirements,
        responsibilities, benefits, posted_date, application_deadline,
        apply_url, company_logo, industry, experience_level
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      ON CONFLICT (external_id, source) 
      DO UPDATE SET
        title = EXCLUDED.title,
        company = EXCLUDED.company,
        location = EXCLUDED.location,
        remote_type = EXCLUDED.remote_type,
        job_type = EXCLUDED.job_type,
        salary_min = EXCLUDED.salary_min,
        salary_max = EXCLUDED.salary_max,
        description = EXCLUDED.description,
        requirements = EXCLUDED.requirements,
        responsibilities = EXCLUDED.responsibilities,
        benefits = EXCLUDED.benefits,
        posted_date = EXCLUDED.posted_date,
        application_deadline = EXCLUDED.application_deadline,
        apply_url = EXCLUDED.apply_url,
        company_logo = EXCLUDED.company_logo,
        industry = EXCLUDED.industry,
        experience_level = EXCLUDED.experience_level,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id
    `;

    const values = [
      job.externalId,
      job.source,
      job.title,
      job.company,
      job.location,
      job.remoteType,
      job.jobType,
      job.salaryMin,
      job.salaryMax,
      job.description,
      job.requirements,
      job.responsibilities,
      job.benefits,
      job.postedDate,
      job.applicationDeadline,
      job.applyUrl,
      job.companyLogo,
      job.industry,
      job.experienceLevel,
    ];

    const result = await this.db.query(query, values);
    return result.rows[0].id;
  }

  private applyFilters(jobs: Job[], query: JobSearchQuery): Job[] {
    let filtered = [...jobs];

    // Filter by keywords
    if (query.keywords) {
      const keywords = query.keywords.toLowerCase();
      filtered = filtered.filter(
        (job) =>
          job.title.toLowerCase().includes(keywords) ||
          job.description.toLowerCase().includes(keywords) ||
          job.company.toLowerCase().includes(keywords)
      );
    }

    // Filter by location
    if (query.location) {
      const location = query.location.toLowerCase();
      filtered = filtered.filter((job) =>
        job.location.toLowerCase().includes(location)
      );
    }

    // Filter by remote type
    if (query.remoteType && query.remoteType.length > 0) {
      filtered = filtered.filter(
        (job) => job.remoteType && query.remoteType!.includes(job.remoteType)
      );
    }

    // Filter by job type
    if (query.jobType && query.jobType.length > 0) {
      filtered = filtered.filter(
        (job) => job.jobType && query.jobType!.includes(job.jobType)
      );
    }

    // Filter by salary
    if (query.salaryMin) {
      filtered = filtered.filter(
        (job) => job.salaryMax && job.salaryMax >= query.salaryMin!
      );
    }

    if (query.salaryMax) {
      filtered = filtered.filter(
        (job) => job.salaryMin && job.salaryMin <= query.salaryMax!
      );
    }

    // Filter by posted date
    if (query.postedWithin) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - query.postedWithin);
      filtered = filtered.filter((job) => job.postedDate >= cutoffDate);
    }

    return filtered;
  }

  private mapRowToJob(row: any): Job {
    return {
      id: row.id,
      externalId: row.external_id,
      source: row.source,
      title: row.title,
      company: row.company,
      location: row.location,
      remoteType: row.remote_type,
      jobType: row.job_type,
      salaryMin: row.salary_min,
      salaryMax: row.salary_max,
      description: row.description,
      requirements: row.requirements || [],
      responsibilities: row.responsibilities || [],
      benefits: row.benefits || [],
      postedDate: new Date(row.posted_date),
      applicationDeadline: row.application_deadline
        ? new Date(row.application_deadline)
        : undefined,
      applyUrl: row.apply_url,
      companyLogo: row.company_logo,
      industry: row.industry,
      experienceLevel: row.experience_level,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private generateSearchCacheKey(query: JobSearchQuery): string {
    const parts = [
      query.keywords || '',
      query.location || '',
      (query.remoteType || []).join(','),
      (query.jobType || []).join(','),
      query.salaryMin || '',
      query.salaryMax || '',
      query.postedWithin || '',
      query.page || 1,
      query.limit || 20,
    ];
    return `${this.searchCachePrefix}${parts.join(':')}`;
  }

  private async getFromCache<T>(key: string): Promise<T | null> {
    try {
      const cached = await redisClient.get(key);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.error('Cache get error:', error);
    }
    return null;
  }

  private async setCache(key: string, value: any, ttl: number): Promise<void> {
    try {
      await redisClient.setEx(key, ttl, JSON.stringify(value));
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  // Saved Jobs functionality
  async saveJob(userId: string, jobId: string, notes?: string): Promise<void> {
    const query = `
      INSERT INTO saved_jobs (user_id, job_id, notes)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id, job_id) DO UPDATE
      SET notes = EXCLUDED.notes
    `;

    await this.db.query(query, [userId, jobId, notes]);

    // Invalidate saved jobs cache for this user
    await this.invalidateSavedJobsCache(userId);
  }

  async unsaveJob(userId: string, jobId: string): Promise<void> {
    const query = `
      DELETE FROM saved_jobs
      WHERE user_id = $1 AND job_id = $2
    `;

    await this.db.query(query, [userId, jobId]);

    // Invalidate saved jobs cache for this user
    await this.invalidateSavedJobsCache(userId);
  }

  async getSavedJobs(userId: string): Promise<Job[]> {
    // Try cache first
    const cacheKey = `saved_jobs:${userId}`;
    const cached = await this.getFromCache<Job[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const query = `
      SELECT 
        j.id, j.external_id, j.source, j.title, j.company, j.location, 
        j.remote_type, j.job_type, j.salary_min, j.salary_max, j.description, 
        j.requirements, j.responsibilities, j.benefits, j.posted_date, 
        j.application_deadline, j.apply_url, j.company_logo, j.industry, 
        j.experience_level, j.created_at, j.updated_at,
        sj.notes, sj.created_at as saved_at
      FROM saved_jobs sj
      JOIN jobs j ON sj.job_id = j.id
      WHERE sj.user_id = $1
      ORDER BY sj.created_at DESC
    `;

    const result = await this.db.query(query, [userId]);
    const jobs = result.rows.map((row) => this.mapRowToJob(row));

    // Cache the result
    await this.setCache(cacheKey, jobs, this.cacheTTL);

    return jobs;
  }

  async isJobSaved(userId: string, jobId: string): Promise<boolean> {
    const query = `
      SELECT 1 FROM saved_jobs
      WHERE user_id = $1 AND job_id = $2
    `;

    const result = await this.db.query(query, [userId, jobId]);
    return result.rows.length > 0;
  }

  private async invalidateSavedJobsCache(userId: string): Promise<void> {
    const cacheKey = `saved_jobs:${userId}`;
    try {
      await redisClient.del(cacheKey);
    } catch (error) {
      console.error('Cache invalidation error:', error);
    }
  }
}

export const jobService = new JobService();
