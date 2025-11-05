import { injectable } from 'inversify';
import { BaseRepository } from './base.repository';
import { Application } from '../types/application.types';
import { QueryCriteria } from '../types/repository.types';

export interface IApplicationRepository {
  findById(id: string): Promise<Application | null>;
  findByUserId(userId: string): Promise<Application[]>;
  findByJobId(jobId: string): Promise<Application[]>;
  findByUserAndJob(userId: string, jobId: string): Promise<Application | null>;
  create(applicationData: Omit<Application, 'id' | 'created_at' | 'updated_at'>): Promise<Application>;
  update(id: string, updates: Partial<Application>): Promise<Application>;
  delete(id: string): Promise<boolean>;
  findByStatus(status: string): Promise<Application[]>;
  findByUserIdWithPagination(userId: string, criteria?: QueryCriteria): Promise<{ applications: Application[]; total: number }>;
  getApplicationStats(userId: string): Promise<ApplicationStats>;
}

export interface ApplicationStats {
  total: number;
  pending: number;
  interviewing: number;
  rejected: number;
  accepted: number;
  responseRate: number;
  averageResponseTime: number;
}

@injectable()
export class ApplicationRepository extends BaseRepository<Application, string> implements IApplicationRepository {
  protected tableName = 'applications';
  protected primaryKey = 'id';

  async findByUserId(userId: string): Promise<Application[]> {
    const cacheKey = `${this.cachePrefix}user:${userId}`;
    
    // Try cache first
    const cached = await this.cache.get<Application[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const query = `
      SELECT a.*, j.title as job_title, j.company as job_company
      FROM applications a
      LEFT JOIN jobs j ON a.job_id = j.id
      WHERE a.user_id = $1
      ORDER BY a.created_at DESC
    `;
    const result = await this.db.query<Application>(query, [userId]);
    
    // Cache the result
    await this.cache.set(cacheKey, result.rows, this.cacheTTL);
    
    return result.rows;
  }

  async findByJobId(jobId: string): Promise<Application[]> {
    const query = `
      SELECT a.*, u.first_name, u.last_name, u.email
      FROM applications a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE a.job_id = $1
      ORDER BY a.created_at DESC
    `;
    const result = await this.db.query<Application>(query, [jobId]);
    return result.rows;
  }

  async findByUserAndJob(userId: string, jobId: string): Promise<Application | null> {
    const cacheKey = `${this.cachePrefix}user:${userId}:job:${jobId}`;
    
    // Try cache first
    const cached = await this.cache.get<Application>(cacheKey);
    if (cached) {
      return cached;
    }

    const query = 'SELECT * FROM applications WHERE user_id = $1 AND job_id = $2';
    const result = await this.db.query<Application>(query, [userId, jobId]);
    
    if (result.rows.length === 0) {
      return null;
    }

    const application = result.rows[0];
    
    // Cache the result
    await this.cache.set(cacheKey, application, this.cacheTTL);
    
    return application;
  }

  async findByStatus(status: string): Promise<Application[]> {
    const query = `
      SELECT a.*, j.title as job_title, j.company as job_company, u.first_name, u.last_name
      FROM applications a
      LEFT JOIN jobs j ON a.job_id = j.id
      LEFT JOIN users u ON a.user_id = u.id
      WHERE a.status = $1
      ORDER BY a.created_at DESC
    `;
    const result = await this.db.query<Application>(query, [status]);
    return result.rows;
  }

  async findByUserIdWithPagination(
    userId: string, 
    criteria?: QueryCriteria
  ): Promise<{ applications: Application[]; total: number }> {
    const limit = criteria?.limit || 20;
    const offset = criteria?.offset || 0;

    // Get total count
    const countQuery = 'SELECT COUNT(*) as count FROM applications WHERE user_id = $1';
    const countResult = await this.db.query<{ count: string }>(countQuery, [userId]);
    const total = parseInt(countResult.rows[0].count, 10);

    // Get paginated applications
    let query = `
      SELECT a.*, j.title as job_title, j.company as job_company
      FROM applications a
      LEFT JOIN jobs j ON a.job_id = j.id
      WHERE a.user_id = $1
    `;

    const params: any[] = [userId];
    let paramIndex = 2;

    // Add additional where conditions
    if (criteria?.where) {
      for (const [key, value] of Object.entries(criteria.where)) {
        query += ` AND a.${key} = $${paramIndex}`;
        params.push(value);
        paramIndex++;
      }
    }

    // Add ordering
    if (criteria?.orderBy) {
      const orderConditions: string[] = [];
      for (const [key, direction] of Object.entries(criteria.orderBy)) {
        orderConditions.push(`a.${key} ${direction.toUpperCase()}`);
      }
      query += ` ORDER BY ${orderConditions.join(', ')}`;
    } else {
      query += ' ORDER BY a.created_at DESC';
    }

    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await this.db.query<Application>(query, params);

    return {
      applications: result.rows,
      total,
    };
  }

  async getApplicationStats(userId: string): Promise<ApplicationStats> {
    const cacheKey = `${this.cachePrefix}stats:${userId}`;
    
    // Try cache first
    const cached = await this.cache.get<ApplicationStats>(cacheKey);
    if (cached) {
      return cached;
    }

    const query = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status IN ('interview_scheduled', 'interview_completed') THEN 1 END) as interviewing,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected,
        COUNT(CASE WHEN status = 'accepted' THEN 1 END) as accepted,
        AVG(CASE 
          WHEN response_date IS NOT NULL AND applied_date IS NOT NULL 
          THEN EXTRACT(EPOCH FROM (response_date - applied_date)) / 86400 
        END) as avg_response_time
      FROM applications 
      WHERE user_id = $1
    `;

    const result = await this.db.query(query, [userId]);
    const row = result.rows[0];

    const total = parseInt(row.total, 10);
    const responded = total - parseInt(row.pending, 10);
    const responseRate = total > 0 ? (responded / total) * 100 : 0;

    const stats: ApplicationStats = {
      total,
      pending: parseInt(row.pending, 10),
      interviewing: parseInt(row.interviewing, 10),
      rejected: parseInt(row.rejected, 10),
      accepted: parseInt(row.accepted, 10),
      responseRate: Math.round(responseRate * 100) / 100,
      averageResponseTime: row.avg_response_time ? Math.round(parseFloat(row.avg_response_time) * 100) / 100 : 0,
    };

    // Cache the result for 30 minutes
    await this.cache.set(cacheKey, stats, 1800);

    return stats;
  }

  async create(applicationData: Omit<Application, 'id' | 'created_at' | 'updated_at'>): Promise<Application> {
    const application = await super.create(applicationData);
    
    // Invalidate user-specific caches
    await this.cache.invalidate(`${this.cachePrefix}user:${application.user_id}*`);
    await this.cache.invalidate(`${this.cachePrefix}stats:${application.user_id}`);
    
    return application;
  }

  async update(id: string, updates: Partial<Application>): Promise<Application> {
    const application = await super.update(id, updates);
    
    // Invalidate user-specific caches
    await this.cache.invalidate(`${this.cachePrefix}user:${application.user_id}*`);
    await this.cache.invalidate(`${this.cachePrefix}stats:${application.user_id}`);
    
    return application;
  }
}