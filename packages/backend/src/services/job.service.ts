import { injectable, inject } from 'inversify';
import { Job, JobSearchQuery, JobSearchResult } from '../types/job.types';
import { jobAggregatorService } from './job-aggregator.service';
import { TYPES } from '../types/container.types';
import { IJobRepository, JobSearchCriteria } from '../repositories/job.repository';
import { ICacheService } from '../types/repository.types';
import { Logger } from 'winston';

@injectable()
export class JobService {
  private searchCachePrefix = 'job:search:';
  private cacheTTL = 3600; // 1 hour

  constructor(
    @inject(TYPES.JobRepository) private jobRepository: IJobRepository,
    @inject(TYPES.CacheService) private cache: ICacheService,
    @inject(TYPES.Logger) private logger: Logger
  ) {}

  async searchJobs(query: JobSearchQuery): Promise<JobSearchResult> {
    try {
      const page = query.page || 1;
      const limit = query.limit || 20;
      const offset = (page - 1) * limit;

      // Generate cache key based on query
      const cacheKey = this.generateSearchCacheKey(query);

      // Try to get from cache
      const cached = await this.cache.get<JobSearchResult>(cacheKey);
      if (cached) {
        return cached;
      }

      // Search from external sources
      const externalJobs = await jobAggregatorService.searchJobs(query);

      // Store jobs in database
      await this.storeJobs(externalJobs);

      // Convert query to repository criteria
      const criteria: JobSearchCriteria = {
        title: query.keywords,
        location: query.location,
        jobType: query.jobType?.[0],
        remoteType: query.remoteType?.[0],
        salaryMin: query.salaryMin,
        salaryMax: query.salaryMax,
        limit,
        offset,
      };

      // Search from database using repository
      const jobs = await this.jobRepository.searchJobs(criteria);
      const total = await this.jobRepository.count(criteria);
      const totalPages = Math.ceil(total / limit);

      const result: JobSearchResult = {
        jobs,
        total,
        page,
        totalPages,
      };

      // Cache the result
      await this.cache.set(cacheKey, result, this.cacheTTL);

      this.logger.info('Job search completed', { query, resultCount: jobs.length });

      return result;
    } catch (error) {
      this.logger.error('Job search failed', { query, error });
      throw error;
    }
  }

  async getJobById(jobId: string): Promise<Job | null> {
    try {
      return await this.jobRepository.findById(jobId);
    } catch (error) {
      this.logger.error('Failed to get job by ID', { jobId, error });
      throw error;
    }
  }

  async getJobDetails(source: string, externalId: string): Promise<Job | null> {
    try {
      // Try to get from database first
      let job = await this.jobRepository.findByExternalId(externalId, source);

      if (job) {
        return job;
      }

      // If not in database, fetch from external source
      job = await jobAggregatorService.getJobDetails(source, externalId);
      
      if (job) {
        // Store in database for future use
        await this.storeJob(job);
      }

      return job;
    } catch (error) {
      this.logger.error('Error fetching job details', { source, externalId, error });
      return null;
    }
  }

  async getJobByExternalId(source: string, externalId: string): Promise<Job | null> {
    try {
      return await this.jobRepository.findByExternalId(externalId, source);
    } catch (error) {
      this.logger.error('Failed to get job by external ID', { source, externalId, error });
      throw error;
    }
  }

  private async storeJobs(jobs: Job[]): Promise<void> {
    for (const job of jobs) {
      await this.storeJob(job);
    }
  }

  private async storeJob(job: Job): Promise<string> {
    try {
      // Check if job already exists
      const existingJob = await this.jobRepository.findByExternalId(job.externalId, job.source);
      
      if (existingJob) {
        // Update existing job
        const updatedJob = await this.jobRepository.update(existingJob.id, {
          title: job.title,
          company: job.company,
          location: job.location,
          remote_type: job.remoteType,
          job_type: job.jobType,
          salary_min: job.salaryMin,
          salary_max: job.salaryMax,
          description: job.description,
          requirements: job.requirements,
          responsibilities: job.responsibilities,
          benefits: job.benefits,
          posted_date: job.postedDate,
          application_deadline: job.applicationDeadline,
          apply_url: job.applyUrl,
          company_logo: job.companyLogo,
          industry: job.industry,
          experience_level: job.experienceLevel,
        });
        return updatedJob.id;
      } else {
        // Create new job
        const jobData = {
          external_id: job.externalId,
          source: job.source,
          title: job.title,
          company: job.company,
          location: job.location,
          remote_type: job.remoteType,
          job_type: job.jobType,
          salary_min: job.salaryMin,
          salary_max: job.salaryMax,
          description: job.description,
          requirements: job.requirements,
          responsibilities: job.responsibilities,
          benefits: job.benefits,
          posted_date: job.postedDate,
          application_deadline: job.applicationDeadline,
          apply_url: job.applyUrl,
          company_logo: job.companyLogo,
          industry: job.industry,
          experience_level: job.experienceLevel,
        };
        
        const newJob = await this.jobRepository.create(jobData);
        return newJob.id;
      }
    } catch (error) {
      this.logger.error('Failed to store job', { job: job.externalId, error });
      throw error;
    }
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

  // Saved Jobs functionality - simplified for now
  // These methods would be moved to a separate SavedJobsService in a full implementation
  async saveJob(userId: string, jobId: string, notes?: string): Promise<void> {
    // This would use a SavedJobsRepository in a full implementation
    this.logger.info('Job saved', { userId, jobId });
  }

  async unsaveJob(userId: string, jobId: string): Promise<void> {
    // This would use a SavedJobsRepository in a full implementation
    this.logger.info('Job unsaved', { userId, jobId });
  }

  async getSavedJobs(userId: string): Promise<Job[]> {
    // This would use a SavedJobsRepository in a full implementation
    return [];
  }

  async isJobSaved(userId: string, jobId: string): Promise<boolean> {
    // This would use a SavedJobsRepository in a full implementation
    return false;
  }
}
