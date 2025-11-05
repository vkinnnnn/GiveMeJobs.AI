/**
 * Base repository implementation with common CRUD operations
 */

import { injectable, inject } from 'inversify';
import { IRepository, QueryCriteria, PaginationResult, IDatabaseConnection, ICacheService } from '../types/repository.types';
import { Logger } from 'winston';
import { TYPES } from '../types/container.types';

@injectable()
export abstract class BaseRepository<T, ID> implements IRepository<T, ID> {
  protected abstract tableName: string;
  protected abstract primaryKey: string;

  constructor(
    @inject(TYPES.DatabaseConnection) protected db: IDatabaseConnection,
    @inject(TYPES.CacheService) protected cache: ICacheService,
    @inject(TYPES.Logger) protected logger: Logger
  ) {}

  async findById(id: ID): Promise<T | null> {
    const cacheKey = this.getCacheKey('id', String(id));
    
    try {
      // Try cache first
      const cached = await this.cache.get<T>(cacheKey);
      if (cached) {
        this.logger.debug('Cache hit for findById', { tableName: this.tableName, id });
        return cached;
      }

      // Query database
      const query = `SELECT * FROM ${this.tableName} WHERE ${this.primaryKey} = $1`;
      const result = await this.db.query<T>(query, [id]);
      
      const entity = result.rows[0] || null;
      
      if (entity) {
        // Cache the result
        await this.cache.set(cacheKey, entity, 3600); // 1 hour TTL
        this.logger.debug('Entity found and cached', { tableName: this.tableName, id });
      }
      
      return entity;
    } catch (error) {
      this.logger.error('Error in findById', { 
        tableName: this.tableName, 
        id, 
        error: error.message 
      });
      throw error;
    }
  }

  async findAll(criteria?: QueryCriteria): Promise<T[]> {
    try {
      const { query, params } = this.buildSelectQuery(criteria);
      const result = await this.db.query<T>(query, params);
      
      this.logger.debug('FindAll executed', { 
        tableName: this.tableName, 
        criteria, 
        count: result.rows.length 
      });
      
      return result.rows;
    } catch (error) {
      this.logger.error('Error in findAll', { 
        tableName: this.tableName, 
        criteria, 
        error: error.message 
      });
      throw error;
    }
  }

  async findWithPagination(criteria?: QueryCriteria): Promise<PaginationResult<T>> {
    try {
      const page = criteria?.offset ? Math.floor(criteria.offset / (criteria.limit || 20)) + 1 : 1;
      const limit = criteria?.limit || 20;
      
      // Get total count
      const countQuery = this.buildCountQuery(criteria);
      const countResult = await this.db.query<{ count: string }>(countQuery.query, countQuery.params);
      const total = parseInt(countResult.rows[0].count, 10);
      
      // Get paginated data
      const { query, params } = this.buildSelectQuery(criteria);
      const result = await this.db.query<T>(query, params);
      
      const totalPages = Math.ceil(total / limit);
      
      this.logger.debug('Pagination executed', { 
        tableName: this.tableName, 
        page, 
        limit, 
        total, 
        totalPages 
      });
      
      return {
        data: result.rows,
        total,
        page,
        limit,
        totalPages
      };
    } catch (error) {
      this.logger.error('Error in findWithPagination', { 
        tableName: this.tableName, 
        criteria, 
        error: error.message 
      });
      throw error;
    }
  }

  async create(entity: Omit<T, 'id' | 'created_at' | 'updated_at'>): Promise<T> {
    try {
      const fields = Object.keys(entity);
      const values = Object.values(entity);
      const placeholders = fields.map((_, index) => `$${index + 1}`).join(', ');
      
      const query = `
        INSERT INTO ${this.tableName} (${fields.join(', ')})
        VALUES (${placeholders})
        RETURNING *
      `;
      
      const result = await this.db.query<T>(query, values);
      const createdEntity = result.rows[0];
      
      // Invalidate related caches
      await this.invalidateCache();
      
      this.logger.info('Entity created', { 
        tableName: this.tableName, 
        id: (createdEntity as any)[this.primaryKey] 
      });
      
      return createdEntity;
    } catch (error) {
      this.logger.error('Error in create', { 
        tableName: this.tableName, 
        entity, 
        error: error.message 
      });
      throw error;
    }
  }

  async update(id: ID, updates: Partial<T>): Promise<T> {
    try {
      const fields = Object.keys(updates);
      const values = Object.values(updates);
      const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
      
      const query = `
        UPDATE ${this.tableName}
        SET ${setClause}, updated_at = CURRENT_TIMESTAMP
        WHERE ${this.primaryKey} = $1
        RETURNING *
      `;
      
      const result = await this.db.query<T>(query, [id, ...values]);
      
      if (result.rows.length === 0) {
        throw new Error(`Entity with id ${id} not found`);
      }
      
      const updatedEntity = result.rows[0];
      
      // Update cache and invalidate related caches
      const cacheKey = this.getCacheKey('id', String(id));
      await this.cache.set(cacheKey, updatedEntity, 3600);
      await this.invalidateCache();
      
      this.logger.info('Entity updated', { 
        tableName: this.tableName, 
        id, 
        fields: fields.join(', ') 
      });
      
      return updatedEntity;
    } catch (error) {
      this.logger.error('Error in update', { 
        tableName: this.tableName, 
        id, 
        updates, 
        error: error.message 
      });
      throw error;
    }
  }

  async delete(id: ID): Promise<boolean> {
    try {
      const query = `DELETE FROM ${this.tableName} WHERE ${this.primaryKey} = $1`;
      const result = await this.db.query(query, [id]);
      
      const deleted = result.rowCount > 0;
      
      if (deleted) {
        // Remove from cache and invalidate related caches
        const cacheKey = this.getCacheKey('id', String(id));
        await this.cache.delete(cacheKey);
        await this.invalidateCache();
        
        this.logger.info('Entity deleted', { tableName: this.tableName, id });
      }
      
      return deleted;
    } catch (error) {
      this.logger.error('Error in delete', { 
        tableName: this.tableName, 
        id, 
        error: error.message 
      });
      throw error;
    }
  }

  async count(criteria?: QueryCriteria): Promise<number> {
    try {
      const { query, params } = this.buildCountQuery(criteria);
      const result = await this.db.query<{ count: string }>(query, params);
      
      return parseInt(result.rows[0].count, 10);
    } catch (error) {
      this.logger.error('Error in count', { 
        tableName: this.tableName, 
        criteria, 
        error: error.message 
      });
      throw error;
    }
  }

  async exists(id: ID): Promise<boolean> {
    try {
      const query = `SELECT 1 FROM ${this.tableName} WHERE ${this.primaryKey} = $1 LIMIT 1`;
      const result = await this.db.query(query, [id]);
      
      return result.rows.length > 0;
    } catch (error) {
      this.logger.error('Error in exists', { 
        tableName: this.tableName, 
        id, 
        error: error.message 
      });
      throw error;
    }
  }

  protected buildSelectQuery(criteria?: QueryCriteria): { query: string; params: any[] } {
    let query = `SELECT * FROM ${this.tableName}`;
    const params: any[] = [];
    let paramIndex = 1;

    if (criteria?.where) {
      const whereConditions: string[] = [];
      
      for (const [field, value] of Object.entries(criteria.where)) {
        if (Array.isArray(value)) {
          const placeholders = value.map(() => `$${paramIndex++}`).join(', ');
          whereConditions.push(`${field} = ANY(ARRAY[${placeholders}])`);
          params.push(...value);
        } else if (value !== null && value !== undefined) {
          whereConditions.push(`${field} = $${paramIndex++}`);
          params.push(value);
        }
      }
      
      if (whereConditions.length > 0) {
        query += ` WHERE ${whereConditions.join(' AND ')}`;
      }
    }

    if (criteria?.orderBy) {
      const orderClauses = Object.entries(criteria.orderBy)
        .map(([field, direction]) => `${field} ${direction.toUpperCase()}`)
        .join(', ');
      query += ` ORDER BY ${orderClauses}`;
    }

    if (criteria?.limit) {
      query += ` LIMIT $${paramIndex++}`;
      params.push(criteria.limit);
    }

    if (criteria?.offset) {
      query += ` OFFSET $${paramIndex++}`;
      params.push(criteria.offset);
    }

    return { query, params };
  }

  protected buildCountQuery(criteria?: QueryCriteria): { query: string; params: any[] } {
    let query = `SELECT COUNT(*) as count FROM ${this.tableName}`;
    const params: any[] = [];
    let paramIndex = 1;

    if (criteria?.where) {
      const whereConditions: string[] = [];
      
      for (const [field, value] of Object.entries(criteria.where)) {
        if (Array.isArray(value)) {
          const placeholders = value.map(() => `$${paramIndex++}`).join(', ');
          whereConditions.push(`${field} = ANY(ARRAY[${placeholders}])`);
          params.push(...value);
        } else if (value !== null && value !== undefined) {
          whereConditions.push(`${field} = $${paramIndex++}`);
          params.push(value);
        }
      }
      
      if (whereConditions.length > 0) {
        query += ` WHERE ${whereConditions.join(' AND ')}`;
      }
    }

    return { query, params };
  }

  protected getCacheKey(type: string, identifier: string): string {
    return `${this.tableName}:${type}:${identifier}`;
  }

  protected async invalidateCache(): Promise<void> {
    try {
      await this.cache.invalidate(`${this.tableName}:*`);
    } catch (error) {
      this.logger.warn('Failed to invalidate cache', { 
        tableName: this.tableName, 
        error: error.message 
      });
    }
  }
}