/**
 * Base repository types and interfaces
 */

export interface QueryCriteria {
  where?: Record<string, any>;
  orderBy?: Record<string, 'asc' | 'desc'>;
  limit?: number;
  offset?: number;
  include?: string[];
}

export interface PaginationResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface IRepository<T, ID> {
  findById(id: ID): Promise<T | null>;
  findAll(criteria?: QueryCriteria): Promise<T[]>;
  findWithPagination(criteria?: QueryCriteria): Promise<PaginationResult<T>>;
  create(entity: Omit<T, 'id' | 'created_at' | 'updated_at'>): Promise<T>;
  update(id: ID, updates: Partial<T>): Promise<T>;
  delete(id: ID): Promise<boolean>;
  count(criteria?: QueryCriteria): Promise<number>;
  exists(id: ID): Promise<boolean>;
}

export interface ITransactionManager {
  transaction<T>(callback: (trx: any) => Promise<T>): Promise<T>;
}

export interface CacheOptions {
  ttl?: number;
  skipL1?: boolean;
  skipL2?: boolean;
  compress?: boolean;
}

export interface ICacheService {
  get<T>(key: string, options?: CacheOptions): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number, options?: CacheOptions): Promise<void>;
  delete(key: string): Promise<void>;
  invalidate(pattern: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  getOrSet<T>(key: string, fetcher: () => Promise<T>, ttl?: number, options?: CacheOptions): Promise<T>;
  mget<T>(keys: string[]): Promise<Array<T | null>>;
  mset<T>(entries: Array<{ key: string; value: T; ttl?: number }>): Promise<void>;
}

export interface IDatabaseConnection {
  query<T = any>(text: string, params?: any[]): Promise<{ rows: T[]; rowCount: number }>;
  transaction<T>(callback: (client: any) => Promise<T>): Promise<T>;
  executePrepared<T = any>(statementName: string, params?: any[]): Promise<{ rows: T[]; rowCount: number }>;
  executePreparedInTransaction<T = any>(client: any, statementName: string, params?: any[]): Promise<{ rows: T[]; rowCount: number }>;
  healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; responseTime: number; poolStats: any }>;
  getPoolStats(): { totalCount: number; idleCount: number; waitingCount: number };
}