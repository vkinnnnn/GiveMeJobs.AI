/**
 * Database service with connection pooling and transaction management
 */

import { injectable, inject } from 'inversify';
import { Pool, PoolClient, PoolConfig } from 'pg';
import { IDatabaseConnection, ITransactionManager } from '../types/repository.types';
import { Logger } from 'winston';
import { TYPES } from '../types/container.types';

interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
  pool: {
    min: number;
    max: number;
    idleTimeoutMillis: number;
    connectionTimeoutMillis: number;
    acquireTimeoutMillis: number;
  };
}

@injectable()
export class DatabaseService implements IDatabaseConnection, ITransactionManager {
  private pool: Pool;
  private isConnected: boolean = false;

  constructor(
    @inject(TYPES.Logger) private logger: Logger,
    @inject(TYPES.DatabaseConfig) private config: DatabaseConfig
  ) {
    this.initializePool();
  }

  private initializePool(): void {
    const poolConfig: PoolConfig = {
      host: this.config.host,
      port: this.config.port,
      database: this.config.database,
      user: this.config.username,
      password: this.config.password,
      ssl: this.config.ssl ? { rejectUnauthorized: false } : false,
      min: this.config.pool.min,
      max: this.config.pool.max,
      idleTimeoutMillis: this.config.pool.idleTimeoutMillis,
      connectionTimeoutMillis: this.config.pool.connectionTimeoutMillis,
      acquireTimeoutMillis: this.config.pool.acquireTimeoutMillis,
      // Enable keep-alive
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
      // Statement timeout
      statement_timeout: 30000, // 30 seconds
      // Query timeout
      query_timeout: 30000, // 30 seconds
    };

    this.pool = new Pool(poolConfig);

    // Pool event handlers
    this.pool.on('connect', (client: PoolClient) => {
      this.logger.debug('New database client connected', {
        totalCount: this.pool.totalCount,
        idleCount: this.pool.idleCount,
        waitingCount: this.pool.waitingCount
      });
    });

    this.pool.on('acquire', (client: PoolClient) => {
      this.logger.debug('Database client acquired from pool', {
        totalCount: this.pool.totalCount,
        idleCount: this.pool.idleCount,
        waitingCount: this.pool.waitingCount
      });
    });

    this.pool.on('remove', (client: PoolClient) => {
      this.logger.debug('Database client removed from pool', {
        totalCount: this.pool.totalCount,
        idleCount: this.pool.idleCount,
        waitingCount: this.pool.waitingCount
      });
    });

    this.pool.on('error', (error: Error, client: PoolClient) => {
      this.logger.error('Database pool error', {
        error: error.message,
        stack: error.stack,
        totalCount: this.pool.totalCount,
        idleCount: this.pool.idleCount,
        waitingCount: this.pool.waitingCount
      });
    });

    this.logger.info('Database pool initialized', {
      host: this.config.host,
      port: this.config.port,
      database: this.config.database,
      poolConfig: {
        min: poolConfig.min,
        max: poolConfig.max,
        idleTimeoutMillis: poolConfig.idleTimeoutMillis,
        connectionTimeoutMillis: poolConfig.connectionTimeoutMillis
      }
    });
  }

  async connect(): Promise<void> {
    try {
      // Test the connection
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      
      this.isConnected = true;
      this.logger.info('Database connection established successfully');
    } catch (error) {
      this.isConnected = false;
      this.logger.error('Failed to establish database connection', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  async query<T = any>(text: string, params?: any[]): Promise<{ rows: T[]; rowCount: number }> {
    const start = Date.now();
    
    try {
      this.logger.debug('Executing query', {
        query: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
        paramCount: params?.length || 0
      });

      const result = await this.pool.query(text, params);
      
      const duration = Date.now() - start;
      this.logger.debug('Query executed successfully', {
        duration,
        rowCount: result.rowCount,
        query: text.substring(0, 100) + (text.length > 100 ? '...' : '')
      });

      // Log slow queries
      if (duration > 1000) {
        this.logger.warn('Slow query detected', {
          duration,
          query: text,
          params: params?.length ? '[REDACTED]' : undefined
        });
      }

      return {
        rows: result.rows,
        rowCount: result.rowCount || 0
      };
    } catch (error) {
      const duration = Date.now() - start;
      this.logger.error('Query execution failed', {
        duration,
        error: error.message,
        query: text,
        paramCount: params?.length || 0,
        stack: error.stack
      });
      throw error;
    }
  }

  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    const start = Date.now();
    
    try {
      await client.query('BEGIN');
      this.logger.debug('Transaction started');
      
      const result = await callback(client);
      
      await client.query('COMMIT');
      const duration = Date.now() - start;
      this.logger.debug('Transaction committed successfully', { duration });
      
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      const duration = Date.now() - start;
      this.logger.error('Transaction rolled back', {
        duration,
        error: error.message,
        stack: error.stack
      });
      throw error;
    } finally {
      client.release();
    }
  }

  // Batch operations for better performance
  async batchInsert<T>(
    tableName: string,
    records: T[],
    conflictResolution?: 'ignore' | 'update'
  ): Promise<void> {
    if (records.length === 0) {
      return;
    }

    const start = Date.now();
    
    try {
      const fields = Object.keys(records[0] as any);
      const values: any[] = [];
      const placeholders: string[] = [];
      
      records.forEach((record, recordIndex) => {
        const recordPlaceholders: string[] = [];
        fields.forEach((field, fieldIndex) => {
          const paramIndex = recordIndex * fields.length + fieldIndex + 1;
          recordPlaceholders.push(`$${paramIndex}`);
          values.push((record as any)[field]);
        });
        placeholders.push(`(${recordPlaceholders.join(', ')})`);
      });

      let query = `
        INSERT INTO ${tableName} (${fields.join(', ')})
        VALUES ${placeholders.join(', ')}
      `;

      if (conflictResolution === 'ignore') {
        query += ' ON CONFLICT DO NOTHING';
      } else if (conflictResolution === 'update') {
        const updateFields = fields
          .filter(field => field !== 'id' && field !== 'created_at')
          .map(field => `${field} = EXCLUDED.${field}`)
          .join(', ');
        query += ` ON CONFLICT (id) DO UPDATE SET ${updateFields}`;
      }

      await this.query(query, values);
      
      const duration = Date.now() - start;
      this.logger.info('Batch insert completed', {
        tableName,
        recordCount: records.length,
        duration,
        conflictResolution
      });
    } catch (error) {
      const duration = Date.now() - start;
      this.logger.error('Batch insert failed', {
        tableName,
        recordCount: records.length,
        duration,
        error: error.message
      });
      throw error;
    }
  }

  // Health check method
  async healthCheck(): Promise<{
    connected: boolean;
    poolStats: {
      totalCount: number;
      idleCount: number;
      waitingCount: number;
    };
    latency?: number;
  }> {
    try {
      const start = Date.now();
      await this.query('SELECT 1');
      const latency = Date.now() - start;

      return {
        connected: true,
        poolStats: {
          totalCount: this.pool.totalCount,
          idleCount: this.pool.idleCount,
          waitingCount: this.pool.waitingCount
        },
        latency
      };
    } catch (error) {
      this.logger.error('Database health check failed', { error: error.message });
      return {
        connected: false,
        poolStats: {
          totalCount: this.pool.totalCount,
          idleCount: this.pool.idleCount,
          waitingCount: this.pool.waitingCount
        }
      };
    }
  }

  // Get pool statistics
  getPoolStats(): {
    totalCount: number;
    idleCount: number;
    waitingCount: number;
  } {
    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount
    };
  }

  // Execute multiple queries in a single transaction
  async executeInTransaction(queries: Array<{ text: string; params?: any[] }>): Promise<any[]> {
    return this.transaction(async (client) => {
      const results: any[] = [];
      
      for (const query of queries) {
        const result = await client.query(query.text, query.params);
        results.push(result.rows);
      }
      
      return results;
    });
  }

  // Prepared statement support
  async prepareStatement(name: string, text: string): Promise<void> {
    try {
      await this.query(`PREPARE ${name} AS ${text}`);
      this.logger.debug('Prepared statement created', { name });
    } catch (error) {
      this.logger.error('Failed to prepare statement', {
        name,
        error: error.message
      });
      throw error;
    }
  }

  async executePrepared(name: string, params?: any[]): Promise<{ rows: any[]; rowCount: number }> {
    const paramList = params ? `(${params.map((_, i) => `$${i + 1}`).join(', ')})` : '';
    return this.query(`EXECUTE ${name}${paramList}`, params);
  }

  async deallocatePrepared(name: string): Promise<void> {
    try {
      await this.query(`DEALLOCATE ${name}`);
      this.logger.debug('Prepared statement deallocated', { name });
    } catch (error) {
      this.logger.error('Failed to deallocate prepared statement', {
        name,
        error: error.message
      });
    }
  }

  // Graceful shutdown
  async disconnect(): Promise<void> {
    try {
      await this.pool.end();
      this.isConnected = false;
      this.logger.info('Database pool closed successfully');
    } catch (error) {
      this.logger.error('Error closing database pool', { error: error.message });
      throw error;
    }
  }

  // Getter for connection status
  get connected(): boolean {
    return this.isConnected;
  }
}