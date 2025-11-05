import { injectable } from 'inversify';
import { Pool, PoolClient } from 'pg';
import { pgPool } from './database';
import { IDatabaseConnection } from '../types/repository.types';
import { preparedStatementManager } from './prepared-statements';
import logger from '../services/logger.service';

@injectable()
export class DatabaseConnection implements IDatabaseConnection {
  private pool: Pool;

  constructor() {
    this.pool = pgPool;
  }

  async query<T = any>(text: string, params?: any[]): Promise<{ rows: T[]; rowCount: number }> {
    const client = await this.pool.connect();
    const startTime = Date.now();
    
    try {
      const result = await client.query(text, params);
      
      const executionTime = Date.now() - startTime;
      
      // Log slow queries (> 1 second)
      if (executionTime > 1000) {
        logger.warn('Slow query detected', {
          query: text.substring(0, 200),
          executionTime,
          params: this.sanitizeParams(params),
        });
      }
      
      return {
        rows: result.rows,
        rowCount: result.rowCount || 0,
      };
    } catch (error) {
      logger.error('Database query failed', {
        query: text.substring(0, 200),
        error: error instanceof Error ? error.message : error,
        params: this.sanitizeParams(params),
      });
      throw error;
    } finally {
      client.release();
    }
  }

  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    const startTime = Date.now();
    
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      
      const executionTime = Date.now() - startTime;
      
      // Log long transactions (> 5 seconds)
      if (executionTime > 5000) {
        logger.warn('Long transaction detected', {
          executionTime,
        });
      }
      
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Transaction failed and rolled back', {
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Execute a prepared statement
   */
  async executePrepared<T = any>(
    statementName: string,
    params?: any[]
  ): Promise<{ rows: T[]; rowCount: number }> {
    return preparedStatementManager.execute<T>(statementName, params);
  }

  /**
   * Execute a prepared statement within a transaction
   */
  async executePreparedInTransaction<T = any>(
    client: PoolClient,
    statementName: string,
    params?: any[]
  ): Promise<{ rows: T[]; rowCount: number }> {
    return preparedStatementManager.executeInTransaction<T>(client, statementName, params);
  }

  /**
   * Get connection pool statistics
   */
  getPoolStats(): {
    totalCount: number;
    idleCount: number;
    waitingCount: number;
  } {
    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
    };
  }

  /**
   * Health check for database connection
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    responseTime: number;
    poolStats: ReturnType<typeof this.getPoolStats>;
  }> {
    const startTime = Date.now();
    
    try {
      await this.query('SELECT 1');
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'healthy',
        responseTime,
        poolStats: this.getPoolStats(),
      };
    } catch (error) {
      logger.error('Database health check failed', { error });
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        poolStats: this.getPoolStats(),
      };
    }
  }

  /**
   * Sanitize parameters for logging (remove sensitive data)
   */
  private sanitizeParams(params?: any[]): any[] {
    if (!params) return [];
    
    return params.map((param, index) => {
      // Don't log potential passwords or tokens
      if (typeof param === 'string' && (
        param.length > 50 || 
        param.includes('$2b$') || // bcrypt hash
        param.includes('eyJ') // JWT token
      )) {
        return '[REDACTED]';
      }
      return param;
    });
  }
}