import { Pool, QueryResult } from 'pg';
import { performanceMonitor } from '../services/performance-monitor.service';
import { Logger } from '../services/logger.service';

const logger = new Logger('DatabasePerformance');

/**
 * Wrapper for PostgreSQL queries with performance monitoring
 */
export class MonitoredPool {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Execute a query with performance monitoring
   */
  async query<T = any>(
    text: string,
    params?: any[],
    operation?: string,
    table?: string
  ): Promise<QueryResult<T>> {
    const endTimer = performanceMonitor.startTimer();
    const queryOperation = operation || this.extractOperation(text);
    const queryTable = table || this.extractTable(text);

    try {
      const result = await this.pool.query<T>(text, params);
      const duration = endTimer();

      // Track performance
      performanceMonitor.trackDatabaseQuery(queryOperation, queryTable, duration, {
        rowCount: result.rowCount,
        query: this.sanitizeQuery(text),
      });

      return result;
    } catch (error) {
      const duration = endTimer();
      
      // Track error
      logger.error(`Database query failed: ${queryOperation} on ${queryTable}`, error as Error, {
        duration,
        query: this.sanitizeQuery(text),
      });

      throw error;
    }
  }

  /**
   * Get a client from the pool with monitoring
   */
  async getClient() {
    const client = await this.pool.connect();
    const originalQuery = client.query.bind(client);

    // Wrap the query method
    client.query = async (text: any, params?: any) => {
      const endTimer = performanceMonitor.startTimer();
      const operation = typeof text === 'string' ? this.extractOperation(text) : 'unknown';
      const table = typeof text === 'string' ? this.extractTable(text) : 'unknown';

      try {
        const result = await originalQuery(text, params);
        const duration = endTimer();

        performanceMonitor.trackDatabaseQuery(operation, table, duration, {
          rowCount: result.rowCount,
        });

        return result;
      } catch (error) {
        const duration = endTimer();
        logger.error(`Database query failed: ${operation} on ${table}`, error as Error, {
          duration,
        });
        throw error;
      }
    };

    return client;
  }

  /**
   * End the pool
   */
  async end() {
    return this.pool.end();
  }

  /**
   * Get pool statistics
   */
  getStats() {
    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
    };
  }

  /**
   * Extract operation type from SQL query
   */
  private extractOperation(query: string): string {
    const normalized = query.trim().toUpperCase();
    if (normalized.startsWith('SELECT')) return 'SELECT';
    if (normalized.startsWith('INSERT')) return 'INSERT';
    if (normalized.startsWith('UPDATE')) return 'UPDATE';
    if (normalized.startsWith('DELETE')) return 'DELETE';
    if (normalized.startsWith('CREATE')) return 'CREATE';
    if (normalized.startsWith('ALTER')) return 'ALTER';
    if (normalized.startsWith('DROP')) return 'DROP';
    return 'UNKNOWN';
  }

  /**
   * Extract table name from SQL query
   */
  private extractTable(query: string): string {
    const normalized = query.trim().toUpperCase();
    
    // Match common patterns
    const patterns = [
      /FROM\s+([a-zA-Z_][a-zA-Z0-9_]*)/i,
      /INTO\s+([a-zA-Z_][a-zA-Z0-9_]*)/i,
      /UPDATE\s+([a-zA-Z_][a-zA-Z0-9_]*)/i,
      /TABLE\s+([a-zA-Z_][a-zA-Z0-9_]*)/i,
    ];

    for (const pattern of patterns) {
      const match = normalized.match(pattern);
      if (match && match[1]) {
        return match[1].toLowerCase();
      }
    }

    return 'unknown';
  }

  /**
   * Sanitize query for logging (remove sensitive data)
   */
  private sanitizeQuery(query: string): string {
    // Remove parameter values but keep structure
    return query
      .replace(/\$\d+/g, '?')
      .replace(/VALUES\s*\([^)]+\)/gi, 'VALUES (?)')
      .substring(0, 200); // Limit length
  }
}

/**
 * Monitor MongoDB operations
 */
export class MongoPerformanceMonitor {
  /**
   * Wrap MongoDB collection methods with performance monitoring
   */
  static wrapCollection(collection: any, collectionName: string) {
    const methods = ['find', 'findOne', 'insertOne', 'insertMany', 'updateOne', 'updateMany', 'deleteOne', 'deleteMany', 'aggregate'];

    methods.forEach(method => {
      const original = collection[method];
      if (typeof original === 'function') {
        collection[method] = async function(...args: any[]) {
          const endTimer = performanceMonitor.startTimer();
          try {
            const result = await original.apply(this, args);
            const duration = endTimer();
            
            performanceMonitor.trackDatabaseQuery(method, collectionName, duration);
            
            return result;
          } catch (error) {
            const duration = endTimer();
            logger.error(`MongoDB ${method} failed on ${collectionName}`, error as Error, {
              duration,
            });
            throw error;
          }
        };
      }
    });

    return collection;
  }
}

/**
 * Monitor Redis operations
 */
export class RedisPerformanceMonitor {
  /**
   * Wrap Redis client methods with performance monitoring
   */
  static wrapClient(client: any) {
    const methods = ['get', 'set', 'del', 'exists', 'expire', 'ttl', 'keys', 'scan'];

    methods.forEach(method => {
      const original = client[method];
      if (typeof original === 'function') {
        client[method] = async function(...args: any[]) {
          const endTimer = performanceMonitor.startTimer();
          try {
            const result = await original.apply(this, args);
            const duration = endTimer();
            
            performanceMonitor.trackDatabaseQuery(method, 'redis', duration);
            
            return result;
          } catch (error) {
            const duration = endTimer();
            logger.error(`Redis ${method} failed`, error as Error, {
              duration,
            });
            throw error;
          }
        };
      }
    });

    return client;
  }
}
