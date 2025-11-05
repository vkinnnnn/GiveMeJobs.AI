import { Pool, PoolClient } from 'pg';
import { pgPool } from './database';
import logger from '../services/logger.service';

export interface PreparedStatement {
  name: string;
  text: string;
  values?: any[];
}

export class PreparedStatementManager {
  private pool: Pool;
  private preparedStatements: Map<string, PreparedStatement> = new Map();
  private initialized = false;

  constructor(pool: Pool = pgPool) {
    this.pool = pool;
    this.initializePreparedStatements();
  }

  /**
   * Initialize commonly used prepared statements
   */
  private initializePreparedStatements(): void {
    // User queries
    this.addPreparedStatement('find_user_by_id', {
      name: 'find_user_by_id',
      text: `
        SELECT id, email, first_name, last_name, professional_headline,
               blockchain_address, mfa_enabled, created_at, updated_at, last_login
        FROM users WHERE id = $1
      `,
    });

    this.addPreparedStatement('find_user_by_email', {
      name: 'find_user_by_email',
      text: `
        SELECT id, email, password_hash, first_name, last_name, professional_headline,
               blockchain_address, mfa_enabled, mfa_secret, created_at, updated_at, last_login
        FROM users WHERE email = $1
      `,
    });

    this.addPreparedStatement('update_user_last_login', {
      name: 'update_user_last_login',
      text: 'UPDATE users SET last_login = NOW() WHERE id = $1',
    });

    // Job queries
    this.addPreparedStatement('find_job_by_id', {
      name: 'find_job_by_id',
      text: `
        SELECT id, external_id, source, title, company, location, remote_type,
               job_type, salary_min, salary_max, description, requirements,
               responsibilities, benefits, posted_date, application_deadline,
               apply_url, company_logo, industry, experience_level,
               created_at, updated_at
        FROM jobs WHERE id = $1
      `,
    });

    this.addPreparedStatement('find_job_by_external_id', {
      name: 'find_job_by_external_id',
      text: `
        SELECT id, external_id, source, title, company, location, remote_type,
               job_type, salary_min, salary_max, description, requirements,
               responsibilities, benefits, posted_date, application_deadline,
               apply_url, company_logo, industry, experience_level,
               created_at, updated_at
        FROM jobs WHERE external_id = $1 AND source = $2
      `,
    });

    this.addPreparedStatement('search_jobs_by_title', {
      name: 'search_jobs_by_title',
      text: `
        SELECT id, external_id, source, title, company, location, remote_type,
               job_type, salary_min, salary_max, description, requirements,
               responsibilities, benefits, posted_date, application_deadline,
               apply_url, company_logo, industry, experience_level,
               created_at, updated_at
        FROM jobs 
        WHERE title ILIKE $1
        ORDER BY posted_date DESC
        LIMIT $2 OFFSET $3
      `,
    });

    this.addPreparedStatement('search_jobs_by_location', {
      name: 'search_jobs_by_location',
      text: `
        SELECT id, external_id, source, title, company, location, remote_type,
               job_type, salary_min, salary_max, description, requirements,
               responsibilities, benefits, posted_date, application_deadline,
               apply_url, company_logo, industry, experience_level,
               created_at, updated_at
        FROM jobs 
        WHERE location ILIKE $1
        ORDER BY posted_date DESC
        LIMIT $2 OFFSET $3
      `,
    });

    // Application queries
    this.addPreparedStatement('find_applications_by_user', {
      name: 'find_applications_by_user',
      text: `
        SELECT a.*, j.title as job_title, j.company as job_company
        FROM applications a
        LEFT JOIN jobs j ON a.job_id = j.id
        WHERE a.user_id = $1
        ORDER BY a.created_at DESC
        LIMIT $2 OFFSET $3
      `,
    });

    this.addPreparedStatement('find_application_by_user_job', {
      name: 'find_application_by_user_job',
      text: 'SELECT * FROM applications WHERE user_id = $1 AND job_id = $2',
    });

    this.addPreparedStatement('count_applications_by_user', {
      name: 'count_applications_by_user',
      text: 'SELECT COUNT(*) as count FROM applications WHERE user_id = $1',
    });

    this.addPreparedStatement('get_application_stats', {
      name: 'get_application_stats',
      text: `
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
      `,
    });

    // Profile queries
    this.addPreparedStatement('find_profile_by_user_id', {
      name: 'find_profile_by_user_id',
      text: 'SELECT * FROM user_profiles WHERE user_id = $1',
    });

    this.addPreparedStatement('update_profile_preferences', {
      name: 'update_profile_preferences',
      text: `
        UPDATE user_profiles 
        SET preferences = $1, updated_at = NOW() 
        WHERE user_id = $2
        RETURNING *
      `,
    });

    // Skill queries
    this.addPreparedStatement('find_skills_by_user', {
      name: 'find_skills_by_user',
      text: `
        SELECT * FROM skills
        WHERE user_id = $1
        ORDER BY proficiency_level DESC, years_of_experience DESC
      `,
    });

    logger.info('Prepared statements initialized', { 
      count: this.preparedStatements.size 
    });
  }

  /**
   * Add a prepared statement
   */
  addPreparedStatement(name: string, statement: PreparedStatement): void {
    this.preparedStatements.set(name, statement);
  }

  /**
   * Execute a prepared statement
   */
  async execute<T = any>(
    statementName: string, 
    values: any[] = []
  ): Promise<{ rows: T[]; rowCount: number }> {
    const statement = this.preparedStatements.get(statementName);
    
    if (!statement) {
      throw new Error(`Prepared statement '${statementName}' not found`);
    }

    const client = await this.pool.connect();
    
    try {
      const result = await client.query(statement.text, values);
      return {
        rows: result.rows,
        rowCount: result.rowCount || 0,
      };
    } catch (error) {
      logger.error('Prepared statement execution failed', {
        statementName,
        error: error instanceof Error ? error.message : error,
        values: this.sanitizeValues(values),
      });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Execute a prepared statement within a transaction
   */
  async executeInTransaction<T = any>(
    client: PoolClient,
    statementName: string,
    values: any[] = []
  ): Promise<{ rows: T[]; rowCount: number }> {
    const statement = this.preparedStatements.get(statementName);
    
    if (!statement) {
      throw new Error(`Prepared statement '${statementName}' not found`);
    }

    try {
      const result = await client.query(statement.text, values);
      return {
        rows: result.rows,
        rowCount: result.rowCount || 0,
      };
    } catch (error) {
      logger.error('Prepared statement execution failed in transaction', {
        statementName,
        error: error instanceof Error ? error.message : error,
        values: this.sanitizeValues(values),
      });
      throw error;
    }
  }

  /**
   * Get all prepared statement names
   */
  getStatementNames(): string[] {
    return Array.from(this.preparedStatements.keys());
  }

  /**
   * Get prepared statement by name
   */
  getStatement(name: string): PreparedStatement | undefined {
    return this.preparedStatements.get(name);
  }

  /**
   * Remove sensitive data from values for logging
   */
  private sanitizeValues(values: any[]): any[] {
    return values.map((value, index) => {
      if (typeof value === 'string' && value.length > 100) {
        return `${value.substring(0, 100)}... [truncated]`;
      }
      return value;
    });
  }

  /**
   * Prepare all statements on a client connection
   * This is useful for long-lived connections
   */
  async prepareAllStatements(client: PoolClient): Promise<void> {
    const statements = Array.from(this.preparedStatements.values());
    
    for (const statement of statements) {
      try {
        await client.query(`PREPARE ${statement.name} AS ${statement.text}`);
      } catch (error) {
        logger.warn('Failed to prepare statement', {
          name: statement.name,
          error: error instanceof Error ? error.message : error,
        });
      }
    }
    
    logger.info('All prepared statements prepared on client connection');
  }

  /**
   * Get query execution statistics
   */
  async getQueryStats(): Promise<Array<{
    query: string;
    calls: number;
    total_time: number;
    mean_time: number;
  }>> {
    const client = await this.pool.connect();
    
    try {
      // This requires pg_stat_statements extension
      const result = await client.query(`
        SELECT 
          query,
          calls,
          total_time,
          mean_time
        FROM pg_stat_statements 
        WHERE query LIKE '%givemejobs%'
        ORDER BY total_time DESC
        LIMIT 20
      `);
      
      return result.rows;
    } catch (error) {
      logger.warn('Could not retrieve query statistics', {
        error: error instanceof Error ? error.message : error,
      });
      return [];
    } finally {
      client.release();
    }
  }
}

// Export singleton instance
export const preparedStatementManager = new PreparedStatementManager();