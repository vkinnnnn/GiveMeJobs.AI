import { injectable } from 'inversify';
import { BaseRepository } from './base.repository';
import { Job } from '../types/job.types';
import { QueryCriteria } from '../types/repository.types';

export interface IJobRepository {
  findById(id: string): Promise<Job | null>;
  findByExternalId(externalId: string, source: string): Promise<Job | null>;
  create(jobData: Omit<Job, 'id' | 'created_at' | 'updated_at'>): Promise<Job>;
  update(id: string, updates: Partial<Job>): Promise<Job>;
  delete(id: string): Promise<boolean>;
  findByCompany(companyName: string): Promise<Job[]>;
  findByLocation(location: string): Promise<Job[]>;
  findBySkills(skills: string[]): Promise<Job[]>;
  searchJobs(criteria: JobSearchCriteria): Promise<Job[]>;
}

export interface JobSearchCriteria extends QueryCriteria {
  title?: string;
  company?: string;
  location?: string;
  skills?: string[];
  salaryMin?: number;
  salaryMax?: number;
  jobType?: string;
  remoteType?: string;
}

@injectable()
export class JobRepository extends BaseRepository<Job, string> implements IJobRepository {
  protected tableName = 'jobs';
  protected primaryKey = 'id';

  async findByExternalId(externalId: string, source: string): Promise<Job | null> {
    const cacheKey = `${this.cachePrefix}external:${source}:${externalId}`;
    
    // Try cache first
    const cached = await this.cache.get<Job>(cacheKey);
    if (cached) {
      return cached;
    }

    const query = 'SELECT * FROM jobs WHERE external_id = $1 AND source = $2';
    const result = await this.db.query<Job>(query, [externalId, source]);
    
    if (result.rows.length === 0) {
      return null;
    }

    const job = result.rows[0];
    
    // Cache the result
    await this.cache.set(cacheKey, job, this.cacheTTL);
    
    return job;
  }

  async findByCompany(companyName: string): Promise<Job[]> {
    const cacheKey = `${this.cachePrefix}company:${companyName}`;
    
    // Try cache first
    const cached = await this.cache.get<Job[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const query = 'SELECT * FROM jobs WHERE LOWER(company) = LOWER($1) ORDER BY created_at DESC';
    const result = await this.db.query<Job>(query, [companyName]);
    
    // Cache the result
    await this.cache.set(cacheKey, result.rows, this.cacheTTL);
    
    return result.rows;
  }

  async findByLocation(location: string): Promise<Job[]> {
    const query = `
      SELECT * FROM jobs 
      WHERE LOWER(location) LIKE LOWER($1) 
      ORDER BY created_at DESC
    `;
    const result = await this.db.query<Job>(query, [`%${location}%`]);
    return result.rows;
  }

  async findBySkills(skills: string[]): Promise<Job[]> {
    if (skills.length === 0) return [];

    const skillConditions = skills.map((_, index) => `LOWER(required_skills::text) LIKE LOWER($${index + 1})`);
    const query = `
      SELECT * FROM jobs 
      WHERE ${skillConditions.join(' OR ')}
      ORDER BY created_at DESC
    `;
    const params = skills.map(skill => `%${skill}%`);
    
    const result = await this.db.query<Job>(query, params);
    return result.rows;
  }

  async searchJobs(criteria: JobSearchCriteria): Promise<Job[]> {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (criteria.title) {
      conditions.push(`LOWER(title) LIKE LOWER($${paramIndex})`);
      params.push(`%${criteria.title}%`);
      paramIndex++;
    }

    if (criteria.company) {
      conditions.push(`LOWER(company) LIKE LOWER($${paramIndex})`);
      params.push(`%${criteria.company}%`);
      paramIndex++;
    }

    if (criteria.location) {
      conditions.push(`LOWER(location) LIKE LOWER($${paramIndex})`);
      params.push(`%${criteria.location}%`);
      paramIndex++;
    }

    if (criteria.jobType) {
      conditions.push(`job_type = $${paramIndex}`);
      params.push(criteria.jobType);
      paramIndex++;
    }

    if (criteria.remoteType) {
      conditions.push(`remote_type = $${paramIndex}`);
      params.push(criteria.remoteType);
      paramIndex++;
    }

    if (criteria.salaryMin) {
      conditions.push(`salary_min >= $${paramIndex}`);
      params.push(criteria.salaryMin);
      paramIndex++;
    }

    if (criteria.salaryMax) {
      conditions.push(`salary_max <= $${paramIndex}`);
      params.push(criteria.salaryMax);
      paramIndex++;
    }

    if (criteria.skills && criteria.skills.length > 0) {
      const skillConditions = criteria.skills.map(() => {
        const condition = `LOWER(required_skills::text) LIKE LOWER($${paramIndex})`;
        params.push(`%${criteria.skills![params.length - paramIndex + 1]}%`);
        paramIndex++;
        return condition;
      });
      conditions.push(`(${skillConditions.join(' OR ')})`);
    }

    let query = 'SELECT * FROM jobs';
    
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ' ORDER BY created_at DESC';

    if (criteria.limit) {
      query += ` LIMIT $${paramIndex}`;
      params.push(criteria.limit);
      paramIndex++;
    }

    if (criteria.offset) {
      query += ` OFFSET $${paramIndex}`;
      params.push(criteria.offset);
    }

    const result = await this.db.query<Job>(query, params);
    return result.rows;
  }

  async create(jobData: Omit<Job, 'id' | 'created_at' | 'updated_at'>): Promise<Job> {
    const job = await super.create(jobData);
    
    // Cache by external ID if available
    if (job.external_id && job.source) {
      const externalCacheKey = `${this.cachePrefix}external:${job.source}:${job.external_id}`;
      await this.cache.set(externalCacheKey, job, this.cacheTTL);
    }
    
    return job;
  }
}