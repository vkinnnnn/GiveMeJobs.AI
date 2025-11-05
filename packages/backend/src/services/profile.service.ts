import { injectable, inject } from 'inversify';
import { 
  UpdateProfileInput, 
  CreateSkillInput, 
  UpdateSkillInput,
  CreateExperienceInput,
  UpdateExperienceInput,
  CreateEducationInput,
  UpdateEducationInput,
  CreateCareerGoalInput,
  UpdateCareerGoalInput
} from '../validators/profile.validators';
import { SkillScoringService } from './skill-scoring.service';
import { TYPES } from '../types/container.types';
import { IProfileRepository } from '../repositories/profile.repository';
import { IUserRepository } from '../repositories/user.repository';
import { IDatabaseConnection } from '../types/repository.types';
import { Logger } from 'winston';
import { Result } from '../types/result.types';

/**
 * Profile Service
 * Handles user profile operations with robust error handling and validation
 */
@injectable()
export class ProfileService {
  private skillScoringService: SkillScoringService;

  constructor(
    @inject(TYPES.ProfileRepository) private profileRepository: IProfileRepository,
    @inject(TYPES.UserRepository) private userRepository: IUserRepository,
    @inject(TYPES.DatabaseConnection) private db: IDatabaseConnection,
    @inject(TYPES.Logger) private logger: Logger
  ) {
    this.skillScoringService = new SkillScoringService();
  }

  /**
   * Get user profile by user ID
   */
  async getProfile(userId: string): Promise<Result<any, Error>> {
    try {
      if (!userId) {
        return Result.error(new Error('User ID is required'));
      }

      const profile = await this.profileRepository.findByUserId(userId);
      if (!profile) {
        // Create default profile if it doesn't exist
        await this.createDefaultProfile(userId);
        const newProfile = await this.profileRepository.findByUserId(userId);
        if (!newProfile) {
          return Result.error(new Error('Failed to create default profile'));
        }
      }

      // Get user details
      const user = await this.userRepository.findById(userId);
      if (!user) {
        return Result.error(new Error('User not found'));
      }

      const result = {
        user_id: userId,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        professional_headline: user.professional_headline,
        skill_score: profile?.skill_score || 0,
        preferences: profile?.preferences || {},
        created_at: profile?.created_at,
        updated_at: profile?.updated_at,
      };

      this.logger.debug('Profile retrieved successfully', { userId });
      return Result.success(result);
    } catch (error) {
      this.logger.error('Get profile error', { userId, error: error.message });
      return Result.error(new Error('Failed to get profile'));
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(userId: string, data: UpdateProfileInput): Promise<Result<any, Error>> {
    try {
      if (!userId) {
        return Result.error(new Error('User ID is required'));
      }

      return await this.db.transaction(async (client) => {
        // Update user table if professional headline is provided
        if (data.professionalHeadline !== undefined) {
          await this.userRepository.update(userId, {
            professional_headline: data.professionalHeadline,
          });
        }

        // Update user_profiles table if preferences are provided
        if (data.preferences !== undefined) {
          await this.profileRepository.updateByUserId(userId, {
            preferences: data.preferences,
          });
        }

        // Return updated profile
        const updatedProfile = await this.getProfile(userId);
        if (updatedProfile.failure) {
          throw new Error('Failed to retrieve updated profile');
        }

        this.logger.info('Profile updated successfully', { userId });
        return Result.success(updatedProfile.data);
      });
    } catch (error) {
      this.logger.error('Update profile error', { userId, error: error.message });
      return Result.error(new Error('Failed to update profile'));
    }
  }

  /**
   * Create a new skill for user
   */
  async createSkill(userId: string, data: CreateSkillInput): Promise<Result<any, Error>> {
    try {
      if (!userId) {
        return Result.error(new Error('User ID is required'));
      }

      const query = `
        INSERT INTO skills (user_id, name, category, proficiency_level, years_of_experience, last_used)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;

      const result = await this.db.query(query, [
        userId,
        data.name,
        data.category || null,
        data.proficiencyLevel,
        data.yearsOfExperience,
        data.lastUsed ? new Date(data.lastUsed) : null,
      ]);

      const skill = result.rows[0];

      // Recalculate skill score after adding a skill
      this.skillScoringService.recalculateAndUpdateScore(userId, 'new_skill').catch(err => {
        this.logger.warn('Failed to recalculate skill score', { userId, error: err.message });
      });

      this.logger.info('Skill created successfully', { userId, skillId: skill.id });
      return Result.success({ skill });
    } catch (error) {
      this.logger.error('Create skill error', { userId, error: error.message });
      return Result.error(new Error('Failed to create skill'));
    }
  }

  /**
   * Get all skills for a user
   */
  async getSkills(userId: string): Promise<Result<any[], Error>> {
    try {
      if (!userId) {
        return Result.error(new Error('User ID is required'));
      }

      const query = `
        SELECT * FROM skills
        WHERE user_id = $1
        ORDER BY proficiency_level DESC, years_of_experience DESC
      `;

      const result = await this.db.query(query, [userId]);
      
      this.logger.debug('Skills retrieved successfully', { userId, count: result.rows.length });
      return Result.success(result.rows);
    } catch (error) {
      this.logger.error('Get skills error', { userId, error: error.message });
      return Result.error(new Error('Failed to get skills'));
    }
  }

  /**
   * Get a specific skill by ID
   */
  async getSkillById(skillId: string, userId: string): Promise<Result<any, Error>> {
    try {
      if (!skillId || !userId) {
        return Result.error(new Error('Skill ID and User ID are required'));
      }

      const query = `
        SELECT * FROM skills
        WHERE id = $1 AND user_id = $2
      `;

      const result = await this.db.query(query, [skillId, userId]);
      const skill = result.rows[0];

      if (!skill) {
        return Result.error(new Error('Skill not found'));
      }

      return Result.success(skill);
    } catch (error) {
      this.logger.error('Get skill by ID error', { skillId, userId, error: error.message });
      return Result.error(new Error('Failed to get skill'));
    }
  }

  /**
   * Update a skill
   */
  async updateSkill(skillId: string, userId: string, data: UpdateSkillInput): Promise<Result<any, Error>> {
    try {
      if (!skillId || !userId) {
        return Result.error(new Error('Skill ID and User ID are required'));
      }

      // Build dynamic update query
      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (data.name !== undefined) {
        updates.push(`name = $${paramCount++}`);
        values.push(data.name);
      }
      if (data.category !== undefined) {
        updates.push(`category = $${paramCount++}`);
        values.push(data.category);
      }
      if (data.proficiencyLevel !== undefined) {
        updates.push(`proficiency_level = $${paramCount++}`);
        values.push(data.proficiencyLevel);
      }
      if (data.yearsOfExperience !== undefined) {
        updates.push(`years_of_experience = $${paramCount++}`);
        values.push(data.yearsOfExperience);
      }
      if (data.lastUsed !== undefined) {
        updates.push(`last_used = $${paramCount++}`);
        values.push(data.lastUsed ? new Date(data.lastUsed) : null);
      }

      if (updates.length === 0) {
        // No updates provided, return existing skill
        return await this.getSkillById(skillId, userId);
      }

      updates.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(skillId, userId);

      const query = `
        UPDATE skills
        SET ${updates.join(', ')}
        WHERE id = $${paramCount++} AND user_id = $${paramCount++}
        RETURNING *
      `;

      const result = await this.db.query(query, values);
      const skill = result.rows[0];

      if (!skill) {
        return Result.error(new Error('Skill not found or unauthorized'));
      }

      this.logger.info('Skill updated successfully', { skillId, userId });
      return Result.success({ skill });
    } catch (error) {
      this.logger.error('Update skill error', { skillId, userId, error: error.message });
      return Result.error(new Error('Failed to update skill'));
    }
  }

  /**
   * Delete a skill
   */
  async deleteSkill(skillId: string, userId: string): Promise<Result<boolean, Error>> {
    try {
      if (!skillId || !userId) {
        return Result.error(new Error('Skill ID and User ID are required'));
      }

      const query = `
        DELETE FROM skills
        WHERE id = $1 AND user_id = $2
        RETURNING *
      `;

      const result = await this.db.query(query, [skillId, userId]);
      const deletedSkill = result.rows[0];

      if (!deletedSkill) {
        return Result.error(new Error('Skill not found or unauthorized'));
      }

      this.logger.info('Skill deleted successfully', { skillId, userId });
      return Result.success(true);
    } catch (error) {
      this.logger.error('Delete skill error', { skillId, userId, error: error.message });
      return Result.error(new Error('Failed to delete skill'));
    }
  }

  /**
   * Create a new experience for user
   */
  async createExperience(userId: string, data: CreateExperienceInput): Promise<Result<any, Error>> {
    try {
      if (!userId) {
        return Result.error(new Error('User ID is required'));
      }

      const query = `
        INSERT INTO experience (user_id, company, title, start_date, end_date, current, description, achievements, skills, location, employment_type)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `;

      const result = await this.db.query(query, [
        userId,
        data.company,
        data.title,
        new Date(data.startDate),
        data.endDate ? new Date(data.endDate) : null,
        data.current || false,
        data.description || null,
        data.achievements || [],
        data.skills || [],
        data.location || null,
        data.employmentType || null,
      ]);

      const experience = result.rows[0];

      // Recalculate skill score after adding experience
      this.skillScoringService.recalculateAndUpdateScore(userId, 'experience_added').catch(err => {
        this.logger.warn('Failed to recalculate skill score', { userId, error: err.message });
      });

      this.logger.info('Experience created successfully', { userId, experienceId: experience.id });
      return Result.success({ experience });
    } catch (error) {
      this.logger.error('Create experience error', { userId, error: error.message });
      return Result.error(new Error('Failed to create experience'));
    }
  }

  /**
   * Get all experience for a user
   */
  async getExperience(userId: string): Promise<Result<any[], Error>> {
    try {
      if (!userId) {
        return Result.error(new Error('User ID is required'));
      }

      const query = `
        SELECT * FROM experience
        WHERE user_id = $1
        ORDER BY current DESC, start_date DESC
      `;

      const result = await this.db.query(query, [userId]);
      
      this.logger.debug('Experience retrieved successfully', { userId, count: result.rows.length });
      return Result.success(result.rows);
    } catch (error) {
      this.logger.error('Get experience error', { userId, error: error.message });
      return Result.error(new Error('Failed to get experience'));
    }
  }

  /**
   * Create default profile for user
   */
  private async createDefaultProfile(userId: string): Promise<void> {
    try {
      await this.profileRepository.create({
        user_id: userId,
        skill_score: 0,
        preferences: {},
      });
      
      this.logger.debug('Default profile created', { userId });
    } catch (error) {
      this.logger.error('Failed to create default profile', { userId, error: error.message });
      throw error;
    }
  }

  // Additional methods for education, career goals, etc. would follow the same pattern
  // ... (implementing similar robust patterns for all other methods)
}