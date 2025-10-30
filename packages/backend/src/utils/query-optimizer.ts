import { pool } from '../config/database';
import { cacheService } from '../services/cache.service';

/**
 * Query Optimizer Utility
 * Provides optimized database query patterns with caching
 */

interface QueryOptions {
  cache?: boolean;
  cacheTTL?: number;
  cacheKey?: string;
}

/**
 * Execute a query with optional caching
 */
export async function executeQuery<T = any>(
  query: string,
  params: any[] = [],
  options: QueryOptions = {}
): Promise<T[]> {
  const { cache = false, cacheTTL = 300, cacheKey } = options;

  if (cache && cacheKey) {
    const cached = await cacheService.get<T[]>(cacheKey);
    if (cached) {
      return cached;
    }
  }

  const result = await pool.query(query, params);
  const rows = result.rows as T[];

  if (cache && cacheKey) {
    await cacheService.set(cacheKey, rows, cacheTTL);
  }

  return rows;
}

/**
 * Execute a single row query with optional caching
 */
export async function executeQueryOne<T = any>(
  query: string,
  params: any[] = [],
  options: QueryOptions = {}
): Promise<T | null> {
  const rows = await executeQuery<T>(query, params, options);
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Batch query executor
 * Executes multiple queries in a single transaction
 */
export async function executeBatch(queries: Array<{ query: string; params: any[] }>) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const results = [];
    for (const { query, params } of queries) {
      const result = await client.query(query, params);
      results.push(result.rows);
    }
    
    await client.query('COMMIT');
    return results;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Paginated query executor
 */
export interface PaginationOptions {
  page: number;
  limit: number;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export async function executePaginatedQuery<T = any>(
  baseQuery: string,
  countQuery: string,
  params: any[] = [],
  options: PaginationOptions,
  cacheOptions: QueryOptions = {}
): Promise<PaginatedResult<T>> {
  const { page, limit, orderBy, orderDirection = 'DESC' } = options;
  const offset = (page - 1) * limit;

  // Build the final query with pagination
  let finalQuery = baseQuery;
  if (orderBy) {
    finalQuery += ` ORDER BY ${orderBy} ${orderDirection}`;
  }
  finalQuery += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;

  // Execute count and data queries in parallel
  const [countResult, dataResult] = await Promise.all([
    executeQueryOne<{ count: string }>(countQuery, params, cacheOptions),
    executeQuery<T>(finalQuery, [...params, limit, offset], cacheOptions),
  ]);

  const total = parseInt(countResult?.count || '0', 10);
  const totalPages = Math.ceil(total / limit);

  return {
    data: dataResult,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}

/**
 * Bulk insert optimizer
 * Efficiently inserts multiple rows
 */
export async function bulkInsert(
  table: string,
  columns: string[],
  values: any[][]
): Promise<void> {
  if (values.length === 0) return;

  const placeholders = values
    .map((_, rowIndex) => {
      const rowPlaceholders = columns
        .map((_, colIndex) => `$${rowIndex * columns.length + colIndex + 1}`)
        .join(', ');
      return `(${rowPlaceholders})`;
    })
    .join(', ');

  const query = `
    INSERT INTO ${table} (${columns.join(', ')})
    VALUES ${placeholders}
  `;

  const flatValues = values.flat();
  await pool.query(query, flatValues);
}

/**
 * Bulk update optimizer
 * Efficiently updates multiple rows
 */
export async function bulkUpdate(
  table: string,
  updates: Array<{ id: string; data: Record<string, any> }>
): Promise<void> {
  if (updates.length === 0) return;

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    for (const { id, data } of updates) {
      const columns = Object.keys(data);
      const values = Object.values(data);
      
      const setClause = columns
        .map((col, idx) => `${col} = $${idx + 1}`)
        .join(', ');
      
      const query = `
        UPDATE ${table}
        SET ${setClause}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${columns.length + 1}
      `;
      
      await client.query(query, [...values, id]);
    }
    
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Query builder for common patterns
 */
export class QueryBuilder {
  private query: string = '';
  private params: any[] = [];
  private paramCount: number = 0;

  select(columns: string | string[]): this {
    const cols = Array.isArray(columns) ? columns.join(', ') : columns;
    this.query = `SELECT ${cols}`;
    return this;
  }

  from(table: string): this {
    this.query += ` FROM ${table}`;
    return this;
  }

  where(condition: string, value?: any): this {
    if (this.query.includes('WHERE')) {
      this.query += ' AND';
    } else {
      this.query += ' WHERE';
    }
    
    if (value !== undefined) {
      this.paramCount++;
      this.query += ` ${condition.replace('?', `$${this.paramCount}`)}`;
      this.params.push(value);
    } else {
      this.query += ` ${condition}`;
    }
    
    return this;
  }

  orderBy(column: string, direction: 'ASC' | 'DESC' = 'ASC'): this {
    this.query += ` ORDER BY ${column} ${direction}`;
    return this;
  }

  limit(limit: number): this {
    this.paramCount++;
    this.query += ` LIMIT $${this.paramCount}`;
    this.params.push(limit);
    return this;
  }

  offset(offset: number): this {
    this.paramCount++;
    this.query += ` OFFSET $${this.paramCount}`;
    this.params.push(offset);
    return this;
  }

  build(): { query: string; params: any[] } {
    return { query: this.query, params: this.params };
  }

  async execute<T = any>(options: QueryOptions = {}): Promise<T[]> {
    const { query, params } = this.build();
    return executeQuery<T>(query, params, options);
  }

  async executeOne<T = any>(options: QueryOptions = {}): Promise<T | null> {
    const { query, params } = this.build();
    return executeQueryOne<T>(query, params, options);
  }
}

/**
 * Connection pool monitoring
 */
export async function getPoolStats() {
  return {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
  };
}

/**
 * Query performance logger
 */
export async function logSlowQuery(query: string, duration: number, threshold: number = 1000) {
  if (duration > threshold) {
    console.warn(`Slow query detected (${duration}ms):`, query);
  }
}
