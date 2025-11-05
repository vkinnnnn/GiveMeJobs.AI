import { injectable } from 'inversify';
import { BaseRepository } from './base.repository';

export interface UserProfile {
  id: string;
  user_id: string;
  skill_score: number;
  preferences: any;
  created_at: Date;
  updated_at: Date;
}

export interface IProfileRepository {
  findById(id: string): Promise<UserProfile | null>;
  findByUserId(userId: string): Promise<UserProfile | null>;
  create(profileData: Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>): Promise<UserProfile>;
  update(id: string, updates: Partial<UserProfile>): Promise<UserProfile>;
  updateByUserId(userId: string, updates: Partial<UserProfile>): Promise<UserProfile>;
  delete(id: string): Promise<boolean>;
}

@injectable()
export class ProfileRepository extends BaseRepository<UserProfile, string> implements IProfileRepository {
  protected tableName = 'user_profiles';
  protected primaryKey = 'id';

  async findByUserId(userId: string): Promise<UserProfile | null> {
    const cacheKey = `${this.cachePrefix}user:${userId}`;
    
    // Try cache first
    const cached = await this.cache.get<UserProfile>(cacheKey);
    if (cached) {
      return cached;
    }

    const query = 'SELECT * FROM user_profiles WHERE user_id = $1';
    const result = await this.db.query<UserProfile>(query, [userId]);
    
    if (result.rows.length === 0) {
      return null;
    }

    const profile = result.rows[0];
    
    // Cache the result
    await this.cache.set(cacheKey, profile, this.cacheTTL);
    
    return profile;
  }

  async updateByUserId(userId: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    return this.db.transaction(async (client) => {
      const keys = Object.keys(updates);
      const values = Object.values(updates);
      const setClause = keys.map((key, index) => `${key} = $${index + 1}`).join(', ');

      const query = `
        UPDATE ${this.tableName}
        SET ${setClause}, updated_at = NOW()
        WHERE user_id = $${keys.length + 1}
        RETURNING *
      `;

      const result = await client.query<UserProfile>(query, [...values, userId]);
      
      if (result.rows.length === 0) {
        throw new Error(`Profile for user ${userId} not found`);
      }
      
      const updated = result.rows[0];
      
      // Update cache
      const cacheKey = `${this.cachePrefix}user:${userId}`;
      await this.cache.set(cacheKey, updated, this.cacheTTL);
      
      // Invalidate related caches
      await this.cache.invalidate(`${this.cachePrefix}*`);
      
      return updated;
    });
  }

  async create(profileData: Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>): Promise<UserProfile> {
    const profile = await super.create(profileData);
    
    // Cache by user ID as well
    const userCacheKey = `${this.cachePrefix}user:${profile.user_id}`;
    await this.cache.set(userCacheKey, profile, this.cacheTTL);
    
    return profile;
  }
}