import { pgPool } from '../config/database';
import { 
  UpdateProfileInput, 
  CreateSkillInput, 
  UpdateSkillInput,
  CreateEducationInput,
  UpdateEducationInput,
  CreateCareerGoalInput,
  UpdateCareerGoalInput
} from '../validators/profile.validators';
import { SkillScoringService } from './skill-scoring.service';

/**
 * Profile Service
 * Handles user profile operations
 */
export class ProfileService {
  private skillScoringService: SkillScoringService;

  constructor() {
    this.skillScoringService = new SkillScoringService();
  }
  /**
   * Get user profile by user ID
   */
  async getProfile(userId: string) {
    const query = `
      SELECT 
        up.id,
        up.user_id,
        up.skill_score,
        up.preferences,
        up.created_at,
        up.updated_at,
        u.email,
        u.first_name,
        u.last_name,
        u.professional_headline
      FROM user_profiles up
      JOIN users u ON up.user_id = u.id
      WHERE up.user_id = $1
    `;

    const result = await pgPool.query(query, [userId]);

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  }

  /**
   * Update user profile
   */
  async updateProfile(userId: string, data: UpdateProfileInput) {
    const client = await pgPool.connect();

    try {
      await client.query('BEGIN');

      // Update user table if professional headline is provided
      if (data.professionalHeadline !== undefined) {
        await client.query(
          `UPDATE users 
           SET professional_headline = $1, updated_at = CURRENT_TIMESTAMP 
           WHERE id = $2`,
          [data.professionalHeadline, userId]
        );
      }

      // Update user_profiles table if preferences are provided
      if (data.preferences !== undefined) {
        await client.query(
          `UPDATE user_profiles 
           SET preferences = $1, updated_at = CURRENT_TIMESTAMP 
           WHERE user_id = $2`,
          [JSON.stringify(data.preferences), userId]
        );
      }

      await client.query('COMMIT');

      // Return updated profile
      return await this.getProfile(userId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Create a new skill for user
   */
  async createSkill(userId: string, data: CreateSkillInput) {
    const query = `
      INSERT INTO skills (user_id, name, category, proficiency_level, years_of_experience, last_used)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const result = await pgPool.query(query, [
      userId,
      data.name,
      data.category || null,
      data.proficiencyLevel,
      data.yearsOfExperience,
      data.lastUsed ? new Date(data.lastUsed) : null,
    ]);

    // Recalculate skill score after adding a skill
    await this.skillScoringService.recalculateAndUpdateScore(userId, 'new_skill').catch(err => {
      console.error('Failed to recalculate skill score:', err);
    });

    return result.rows[0];
  }

  /**
   * Get all skills for a user
   */
  async getSkills(userId: string) {
    const query = `
      SELECT * FROM skills
      WHERE user_id = $1
      ORDER BY proficiency_level DESC, years_of_experience DESC
    `;

    const result = await pgPool.query(query, [userId]);
    return result.rows;
  }

  /**
   * Get a specific skill by ID
   */
  async getSkillById(skillId: string, userId: string) {
    const query = `
      SELECT * FROM skills
      WHERE id = $1 AND user_id = $2
    `;

    const result = await pgPool.query(query, [skillId, userId]);
    return result.rows[0] || null;
  }

  /**
   * Update a skill
   */
  async updateSkill(skillId: string, userId: string, data: UpdateSkillInput) {
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
      values.push(new Date(data.lastUsed));
    }

    if (updates.length === 0) {
      // No updates provided, return existing skill
      return await this.getSkillById(skillId, userId);
    }

    values.push(skillId, userId);

    const query = `
      UPDATE skills
      SET ${updates.join(', ')}
      WHERE id = $${paramCount++} AND user_id = $${paramCount++}
      RETURNING *
    `;

    const result = await pgPool.query(query, values);
    return result.rows[0] || null;
  }

  /**
   * Delete a skill
   */
  async deleteSkill(skillId: string, userId: string) {
    const query = `
      DELETE FROM skills
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `;

    const result = await pgPool.query(query, [skillId, userId]);
    return result.rows[0] || null;
  }

  /**
   * Create a new experience for user
   */
  async createExperience(userId: string, data: any) {
    const query = `
      INSERT INTO experience (user_id, company, title, start_date, end_date, current, description, achievements, skills)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const result = await pgPool.query(query, [
      userId,
      data.company,
      data.title,
      new Date(data.startDate),
      data.endDate ? new Date(data.endDate) : null,
      data.current || false,
      data.description || null,
      data.achievements || [],
      data.skills || [],
    ]);

    // Recalculate skill score after adding experience
    await this.skillScoringService.recalculateAndUpdateScore(userId, 'experience_added').catch(err => {
      console.error('Failed to recalculate skill score:', err);
    });

    return result.rows[0];
  }

  /**
   * Get all experience for a user
   */
  async getExperience(userId: string) {
    const query = `
      SELECT * FROM experience
      WHERE user_id = $1
      ORDER BY current DESC, start_date DESC
    `;

    const result = await pgPool.query(query, [userId]);
    return result.rows;
  }

  /**
   * Get a specific experience by ID
   */
  async getExperienceById(expId: string, userId: string) {
    const query = `
      SELECT * FROM experience
      WHERE id = $1 AND user_id = $2
    `;

    const result = await pgPool.query(query, [expId, userId]);
    return result.rows[0] || null;
  }

  /**
   * Update an experience
   */
  async updateExperience(expId: string, userId: string, data: any) {
    // Build dynamic update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.company !== undefined) {
      updates.push(`company = $${paramCount++}`);
      values.push(data.company);
    }
    if (data.title !== undefined) {
      updates.push(`title = $${paramCount++}`);
      values.push(data.title);
    }
    if (data.startDate !== undefined) {
      updates.push(`start_date = $${paramCount++}`);
      values.push(new Date(data.startDate));
    }
    if (data.endDate !== undefined) {
      updates.push(`end_date = $${paramCount++}`);
      values.push(data.endDate ? new Date(data.endDate) : null);
    }
    if (data.current !== undefined) {
      updates.push(`current = $${paramCount++}`);
      values.push(data.current);
      // If setting current to true, clear end_date
      if (data.current) {
        updates.push(`end_date = NULL`);
      }
    }
    if (data.description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(data.description);
    }
    if (data.achievements !== undefined) {
      updates.push(`achievements = $${paramCount++}`);
      values.push(data.achievements);
    }
    if (data.skills !== undefined) {
      updates.push(`skills = $${paramCount++}`);
      values.push(data.skills);
    }

    if (updates.length === 0) {
      // No updates provided, return existing experience
      return await this.getExperienceById(expId, userId);
    }

    values.push(expId, userId);

    const query = `
      UPDATE experience
      SET ${updates.join(', ')}
      WHERE id = $${paramCount++} AND user_id = $${paramCount++}
      RETURNING *
    `;

    const result = await pgPool.query(query, values);
    return result.rows[0] || null;
  }

  /**
   * Delete an experience
   */
  async deleteExperience(expId: string, userId: string) {
    const query = `
      DELETE FROM experience
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `;

    const result = await pgPool.query(query, [expId, userId]);
    return result.rows[0] || null;
  }

  /**
   * Create a new education for user
   */
  async createEducation(userId: string, data: CreateEducationInput) {
    const query = `
      INSERT INTO education (user_id, institution, degree, field_of_study, start_date, end_date, gpa, credential_hash)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const result = await pgPool.query(query, [
      userId,
      data.institution,
      data.degree,
      data.fieldOfStudy || null,
      new Date(data.startDate),
      data.endDate ? new Date(data.endDate) : null,
      data.gpa || null,
      data.credentialHash || null,
    ]);

    // Recalculate skill score after adding education
    await this.skillScoringService.recalculateAndUpdateScore(userId, 'education_added').catch(err => {
      console.error('Failed to recalculate skill score:', err);
    });

    return result.rows[0];
  }

  /**
   * Get all education for a user
   */
  async getEducation(userId: string) {
    const query = `
      SELECT * FROM education
      WHERE user_id = $1
      ORDER BY start_date DESC
    `;

    const result = await pgPool.query(query, [userId]);
    return result.rows;
  }

  /**
   * Get a specific education by ID
   */
  async getEducationById(eduId: string, userId: string) {
    const query = `
      SELECT * FROM education
      WHERE id = $1 AND user_id = $2
    `;

    const result = await pgPool.query(query, [eduId, userId]);
    return result.rows[0] || null;
  }

  /**
   * Update an education
   */
  async updateEducation(eduId: string, userId: string, data: UpdateEducationInput) {
    // Build dynamic update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.institution !== undefined) {
      updates.push(`institution = $${paramCount++}`);
      values.push(data.institution);
    }
    if (data.degree !== undefined) {
      updates.push(`degree = $${paramCount++}`);
      values.push(data.degree);
    }
    if (data.fieldOfStudy !== undefined) {
      updates.push(`field_of_study = $${paramCount++}`);
      values.push(data.fieldOfStudy);
    }
    if (data.startDate !== undefined) {
      updates.push(`start_date = $${paramCount++}`);
      values.push(new Date(data.startDate));
    }
    if (data.endDate !== undefined) {
      updates.push(`end_date = $${paramCount++}`);
      values.push(data.endDate ? new Date(data.endDate) : null);
    }
    if (data.gpa !== undefined) {
      updates.push(`gpa = $${paramCount++}`);
      values.push(data.gpa);
    }
    if (data.credentialHash !== undefined) {
      updates.push(`credential_hash = $${paramCount++}`);
      values.push(data.credentialHash);
    }

    if (updates.length === 0) {
      // No updates provided, return existing education
      return await this.getEducationById(eduId, userId);
    }

    values.push(eduId, userId);

    const query = `
      UPDATE education
      SET ${updates.join(', ')}
      WHERE id = $${paramCount++} AND user_id = $${paramCount++}
      RETURNING *
    `;

    const result = await pgPool.query(query, values);
    return result.rows[0] || null;
  }

  /**
   * Delete an education
   */
  async deleteEducation(eduId: string, userId: string) {
    const query = `
      DELETE FROM education
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `;

    const result = await pgPool.query(query, [eduId, userId]);
    return result.rows[0] || null;
  }

  /**
   * Create a new career goal for user
   */
  async createCareerGoal(userId: string, data: CreateCareerGoalInput) {
    const query = `
      INSERT INTO career_goals (user_id, target_role, target_companies, target_salary, timeframe, required_skills, skill_gaps)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const result = await pgPool.query(query, [
      userId,
      data.targetRole,
      data.targetCompanies || [],
      data.targetSalary || null,
      data.timeframe || null,
      data.requiredSkills || [],
      data.skillGaps || [],
    ]);

    return result.rows[0];
  }

  /**
   * Get all career goals for a user
   */
  async getCareerGoals(userId: string) {
    const query = `
      SELECT * FROM career_goals
      WHERE user_id = $1
      ORDER BY created_at DESC
    `;

    const result = await pgPool.query(query, [userId]);
    return result.rows;
  }

  /**
   * Get a specific career goal by ID
   */
  async getCareerGoalById(goalId: string, userId: string) {
    const query = `
      SELECT * FROM career_goals
      WHERE id = $1 AND user_id = $2
    `;

    const result = await pgPool.query(query, [goalId, userId]);
    return result.rows[0] || null;
  }

  /**
   * Update a career goal
   */
  async updateCareerGoal(goalId: string, userId: string, data: UpdateCareerGoalInput) {
    // Build dynamic update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.targetRole !== undefined) {
      updates.push(`target_role = $${paramCount++}`);
      values.push(data.targetRole);
    }
    if (data.targetCompanies !== undefined) {
      updates.push(`target_companies = $${paramCount++}`);
      values.push(data.targetCompanies);
    }
    if (data.targetSalary !== undefined) {
      updates.push(`target_salary = $${paramCount++}`);
      values.push(data.targetSalary);
    }
    if (data.timeframe !== undefined) {
      updates.push(`timeframe = $${paramCount++}`);
      values.push(data.timeframe);
    }
    if (data.requiredSkills !== undefined) {
      updates.push(`required_skills = $${paramCount++}`);
      values.push(data.requiredSkills);
    }
    if (data.skillGaps !== undefined) {
      updates.push(`skill_gaps = $${paramCount++}`);
      values.push(data.skillGaps);
    }

    if (updates.length === 0) {
      // No updates provided, return existing career goal
      return await this.getCareerGoalById(goalId, userId);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(goalId, userId);

    const query = `
      UPDATE career_goals
      SET ${updates.join(', ')}
      WHERE id = $${paramCount++} AND user_id = $${paramCount++}
      RETURNING *
    `;

    const result = await pgPool.query(query, values);
    return result.rows[0] || null;
  }

  /**
   * Delete a career goal
   */
  async deleteCareerGoal(goalId: string, userId: string) {
    const query = `
      DELETE FROM career_goals
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `;

    const result = await pgPool.query(query, [goalId, userId]);
    return result.rows[0] || null;
  }
}
