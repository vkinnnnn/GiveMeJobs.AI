/**
 * User repository implementation
 */

import { injectable } from 'inversify';
import { BaseRepository } from './base.repository';
import { User } from '../types/entities.types';
import { QueryCriteria } from '../types/repository.types';

export interface IUserRepository {
  findByEmail(email: string): Promise<User | null>;
  findByEmailWithProfile(email: string): Promise<User & { profile?: any } | null>;
  updateLastLogin(id: string): Promise<void>;
  findActiveUsers(limit?: number): Promise<User[]>;
  searchUsers(query: string, limit?: number): Promise<User[]>;
  findByResetToken(token: string): Promise<User | null>;
  storeResetToken(userId: string, token: string, expiresAt: Date): Promise<void>;
  clearResetToken(userId: string): Promise<void>;
  findByCriteria(criteria: any): Promise<User[]>;
  // Enhanced auth service support
  findById(id: string): Promise<User | null>;
  create(userData: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<User>;
  update(id: string, updates: Partial<User>): Promise<User>;
}

@injectable()
export class UserRepository extends BaseRepository<User, string> implements IUserRepository {
  protected tableName = 'users';
  protected primaryKey = 'id';

  async findByEmail(email: string): Promise<User | null> {
    const cacheKey = this.getCacheKey('email', email);
    
    try {
      // Try cache first
      const cached = await this.cache.get<User>(cacheKey);
      if (cached) {
        this.logger.debug('Cache hit for findByEmail', { email });
        return cached;
      }

      // Query database
      const query = 'SELECT * FROM users WHERE email = $1';
      const result = await this.db.query<User>(query, [email]);
      
      const user = result.rows[0] || null;
      
      if (user) {
        // Cache the result
        await this.cache.set(cacheKey, user, 3600); // 1 hour TTL
        this.logger.debug('User found by email and cached', { email, userId: user.id });
      }
      
      return user;
    } catch (error) {
      this.logger.error('Error in findByEmail', { email, error: error.message });
      throw error;
    }
  }

  async findByEmailWithProfile(email: string): Promise<User & { profile?: any } | null> {
    try {
      const query = `
        SELECT u.*, up.skill_score, up.preferences
        FROM users u
        LEFT JOIN user_profiles up ON u.id = up.user_id
        WHERE u.email = $1
      `;
      
      const result = await this.db.query(query, [email]);
      const row = result.rows[0];
      
      if (!row) {
        return null;
      }
      
      const user = {
        id: row.id,
        email: row.email,
        password_hash: row.password_hash,
        first_name: row.first_name,
        last_name: row.last_name,
        professional_headline: row.professional_headline,
        mfa_enabled: row.mfa_enabled,
        mfa_secret: row.mfa_secret,
        created_at: row.created_at,
        updated_at: row.updated_at,
        last_login: row.last_login,
        profile: row.skill_score ? {
          skill_score: row.skill_score,
          preferences: row.preferences
        } : undefined
      };
      
      this.logger.debug('User with profile found', { email, userId: user.id });
      return user;
    } catch (error) {
      this.logger.error('Error in findByEmailWithProfile', { email, error: error.message });
      throw error;
    }
  }

  async updateLastLogin(id: string): Promise<void> {
    try {
      const query = 'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1';
      await this.db.query(query, [id]);
      
      // Invalidate user cache
      await this.cache.delete(this.getCacheKey('id', id));
      
      this.logger.debug('Last login updated', { userId: id });
    } catch (error) {
      this.logger.error('Error updating last login', { userId: id, error: error.message });
      throw error;
    }
  }

  async findActiveUsers(limit: number = 100): Promise<User[]> {
    try {
      const query = `
        SELECT * FROM users 
        WHERE last_login > NOW() - INTERVAL '30 days'
        ORDER BY last_login DESC
        LIMIT $1
      `;
      
      const result = await this.db.query<User>(query, [limit]);
      
      this.logger.debug('Active users found', { count: result.rows.length });
      return result.rows;
    } catch (error) {
      this.logger.error('Error finding active users', { error: error.message });
      throw error;
    }
  }

  async searchUsers(query: string, limit: number = 50): Promise<User[]> {
    try {
      const searchQuery = `
        SELECT * FROM users 
        WHERE 
          first_name ILIKE $1 OR 
          last_name ILIKE $1 OR 
          email ILIKE $1 OR 
          professional_headline ILIKE $1
        ORDER BY 
          CASE 
            WHEN email ILIKE $1 THEN 1
            WHEN first_name ILIKE $1 OR last_name ILIKE $1 THEN 2
            ELSE 3
          END,
          created_at DESC
        LIMIT $2
      `;
      
      const searchPattern = `%${query}%`;
      const result = await this.db.query<User>(searchQuery, [searchPattern, limit]);
      
      this.logger.debug('User search completed', { 
        query, 
        count: result.rows.length 
      });
      
      return result.rows;
    } catch (error) {
      this.logger.error('Error searching users', { query, error: error.message });
      throw error;
    }
  }

  // Override create to handle user-specific logic
  async create(userData: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<User> {
    try {
      // Ensure email is lowercase
      const normalizedData = {
        ...userData,
        email: userData.email.toLowerCase().trim()
      };

      const user = await super.create(normalizedData);
      
      this.logger.info('User created successfully', { 
        userId: user.id, 
        email: user.email 
      });
      
      return user;
    } catch (error) {
      this.logger.error('Error creating user', { 
        email: userData.email, 
        error: error.message 
      });
      throw error;
    }
  }

  // Override update to handle email normalization
  async update(id: string, updates: Partial<User>): Promise<User> {
    try {
      const normalizedUpdates = { ...updates };
      
      // Normalize email if provided
      if (updates.email) {
        normalizedUpdates.email = updates.email.toLowerCase().trim();
      }

      const user = await super.update(id, normalizedUpdates);
      
      // If email was updated, invalidate email cache
      if (updates.email) {
        await this.cache.delete(this.getCacheKey('email', updates.email));
      }
      
      return user;
    } catch (error) {
      this.logger.error('Error updating user', { userId: id, error: error.message });
      throw error;
    }
  }

  // Custom method to find users by multiple criteria
  async findByCriteria(criteria: {
    emails?: string[];
    ids?: string[];
    createdAfter?: Date;
    createdBefore?: Date;
    hasProfile?: boolean;
    mfaEnabled?: boolean;
  }): Promise<User[]> {
    try {
      let query = 'SELECT DISTINCT u.* FROM users u';
      const params: any[] = [];
      const conditions: string[] = [];
      let paramIndex = 1;

      if (criteria.hasProfile !== undefined) {
        if (criteria.hasProfile) {
          query += ' INNER JOIN user_profiles up ON u.id = up.user_id';
        } else {
          query += ' LEFT JOIN user_profiles up ON u.id = up.user_id';
          conditions.push('up.user_id IS NULL');
        }
      }

      if (criteria.emails && criteria.emails.length > 0) {
        const placeholders = criteria.emails.map(() => `$${paramIndex++}`).join(', ');
        conditions.push(`u.email = ANY(ARRAY[${placeholders}])`);
        params.push(...criteria.emails.map(email => email.toLowerCase()));
      }

      if (criteria.ids && criteria.ids.length > 0) {
        const placeholders = criteria.ids.map(() => `$${paramIndex++}`).join(', ');
        conditions.push(`u.id = ANY(ARRAY[${placeholders}])`);
        params.push(...criteria.ids);
      }

      if (criteria.createdAfter) {
        conditions.push(`u.created_at >= $${paramIndex++}`);
        params.push(criteria.createdAfter);
      }

      if (criteria.createdBefore) {
        conditions.push(`u.created_at <= $${paramIndex++}`);
        params.push(criteria.createdBefore);
      }

      if (criteria.mfaEnabled !== undefined) {
        conditions.push(`u.mfa_enabled = $${paramIndex++}`);
        params.push(criteria.mfaEnabled);
      }

      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }

      query += ' ORDER BY u.created_at DESC';

      const result = await this.db.query<User>(query, params);
      
      this.logger.debug('Users found by criteria', { 
        criteria, 
        count: result.rows.length 
      });
      
      return result.rows;
    } catch (error) {
      this.logger.error('Error finding users by criteria', { 
        criteria, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Find user by password reset token
   */
  async findByResetToken(token: string): Promise<User | null> {
    try {
      const query = `
        SELECT u.* FROM users u
        INNER JOIN password_reset_tokens prt ON u.id = prt.user_id
        WHERE prt.token = $1 AND prt.expires_at > NOW() AND prt.used = false
      `;
      
      const result = await this.db.query<User>(query, [token]);
      const user = result.rows[0] || null;
      
      if (user) {
        this.logger.debug('User found by reset token', { userId: user.id });
      } else {
        this.logger.debug('No valid user found for reset token');
      }
      
      return user;
    } catch (error) {
      this.logger.error('Error finding user by reset token', { error: error.message });
      throw error;
    }
  }

  /**
   * Store password reset token
   */
  async storeResetToken(userId: string, token: string, expiresAt: Date): Promise<void> {
    try {
      // First, invalidate any existing tokens for this user
      await this.db.query(
        'UPDATE password_reset_tokens SET used = true WHERE user_id = $1 AND used = false',
        [userId]
      );

      // Insert new token
      await this.db.query(
        `INSERT INTO password_reset_tokens (user_id, token, expires_at, created_at, used)
         VALUES ($1, $2, $3, NOW(), false)`,
        [userId, token, expiresAt]
      );
      
      this.logger.debug('Reset token stored', { userId });
    } catch (error) {
      this.logger.error('Error storing reset token', { userId, error: error.message });
      throw error;
    }
  }

  /**
   * Clear/invalidate reset token after use
   */
  async clearResetToken(userId: string): Promise<void> {
    try {
      await this.db.query(
        'UPDATE password_reset_tokens SET used = true WHERE user_id = $1 AND used = false',
        [userId]
      );
      
      this.logger.debug('Reset tokens cleared', { userId });
    } catch (error) {
      this.logger.error('Error clearing reset tokens', { userId, error: error.message });
      throw error;
    }
  }
}