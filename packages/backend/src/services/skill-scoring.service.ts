import { Pool } from 'pg';
import { pgPool } from '../config/database';
import {
  SkillScore,
  SkillScoreBreakdown,
  SkillScoreHistory,
  SkillGapAnalysis,
  SkillGap,
  LearningResource,
  ScoringWeights,
} from '../types/skill-scoring.types';

/**
 * Skill Scoring Service
 * Handles skill score calculation, tracking, and gap analysis
 */
export class SkillScoringService {
  private pool: Pool;

  // Weighted scoring formula (must sum to 1.0)
  private readonly weights: ScoringWeights = {
    technicalSkills: 0.30,
    experience: 0.25,
    education: 0.15,
    certifications: 0.15,
    projectPortfolio: 0.10,
    endorsements: 0.05,
  };

  constructor() {
    this.pool = pgPool;
  }

  /**
   * Calculate overall skill score for a user (0-100)
   */
  async calculateSkillScore(userId: string): Promise<SkillScore> {
    const breakdown = await this.calculateScoreBreakdown(userId);
    
    // Calculate weighted overall score
    const overallScore = Math.round(
      breakdown.technicalSkills * this.weights.technicalSkills +
      breakdown.experience * this.weights.experience +
      breakdown.education * this.weights.education +
      breakdown.certifications * this.weights.certifications +
      breakdown.projectPortfolio * this.weights.projectPortfolio +
      breakdown.endorsements * this.weights.endorsements
    );

    return {
      userId,
      overallScore: Math.min(100, Math.max(0, overallScore)),
      breakdown,
      lastCalculated: new Date(),
    };
  }

  /**
   * Calculate breakdown scores for each component
   */
  private async calculateScoreBreakdown(userId: string): Promise<SkillScoreBreakdown> {
    const [
      technicalSkills,
      experience,
      education,
      certifications,
      projectPortfolio,
      endorsements,
    ] = await Promise.all([
      this.calculateTechnicalSkillsScore(userId),
      this.calculateExperienceScore(userId),
      this.calculateEducationScore(userId),
      this.calculateCertificationScore(userId),
      this.calculatePortfolioScore(userId),
      this.calculateEndorsementScore(userId),
    ]);

    return {
      technicalSkills,
      experience,
      education,
      certifications,
      projectPortfolio,
      endorsements,
    };
  }

  /**
   * Calculate technical skills score (0-100)
   * Based on: number of skills, proficiency levels, years of experience per skill
   */
  private async calculateTechnicalSkillsScore(userId: string): Promise<number> {
    const query = `
      SELECT 
        COUNT(*) as skill_count,
        AVG(proficiency_level) as avg_proficiency,
        AVG(years_of_experience) as avg_years,
        MAX(proficiency_level) as max_proficiency
      FROM skills
      WHERE user_id = $1
    `;

    const result = await this.pool.query(query, [userId]);
    const data = result.rows[0];

    if (!data || data.skill_count === 0) {
      return 0;
    }

    const skillCount = parseInt(data.skill_count);
    const avgProficiency = parseFloat(data.avg_proficiency) || 0;
    const avgYears = parseFloat(data.avg_years) || 0;
    const maxProficiency = parseInt(data.max_proficiency) || 0;

    // Scoring formula:
    // - Skill count (up to 20 skills): 30 points
    // - Average proficiency (1-5): 40 points
    // - Average years of experience (up to 10 years): 20 points
    // - Has expert level skills (5): 10 points bonus

    const skillCountScore = Math.min(30, (skillCount / 20) * 30);
    const proficiencyScore = (avgProficiency / 5) * 40;
    const yearsScore = Math.min(20, (avgYears / 10) * 20);
    const expertBonus = maxProficiency === 5 ? 10 : 0;

    return Math.round(skillCountScore + proficiencyScore + yearsScore + expertBonus);
  }

  /**
   * Calculate experience score (0-100)
   * Based on: total years of experience, number of positions, seniority progression
   */
  private async calculateExperienceScore(userId: string): Promise<number> {
    const query = `
      SELECT 
        COUNT(*) as position_count,
        SUM(
          CASE 
            WHEN end_date IS NULL THEN 
              EXTRACT(YEAR FROM AGE(CURRENT_DATE, start_date))
            ELSE 
              EXTRACT(YEAR FROM AGE(end_date, start_date))
          END
        ) as total_years,
        array_agg(title) as titles
      FROM experience
      WHERE user_id = $1
    `;

    const result = await this.pool.query(query, [userId]);
    const data = result.rows[0];

    if (!data || data.position_count === 0) {
      return 0;
    }

    const positionCount = parseInt(data.position_count);
    const totalYears = parseFloat(data.total_years) || 0;

    // Scoring formula:
    // - Total years (up to 15 years): 60 points
    // - Number of positions (up to 5): 20 points
    // - Career progression (title analysis): 20 points

    const yearsScore = Math.min(60, (totalYears / 15) * 60);
    const positionScore = Math.min(20, (positionCount / 5) * 20);
    const progressionScore = this.calculateProgressionScore(data.titles);

    return Math.round(yearsScore + positionScore + progressionScore);
  }

  /**
   * Analyze career progression from job titles
   */
  private calculateProgressionScore(titles: string[]): number {
    if (!titles || titles.length === 0) return 0;

    // Simple heuristic: check for seniority keywords
    const seniorityKeywords = ['senior', 'lead', 'principal', 'staff', 'architect', 'director', 'vp', 'chief', 'head'];
    const midLevelKeywords = ['mid', 'intermediate', 'ii', 'iii'];
    
    let seniorCount = 0;
    let midCount = 0;

    titles.forEach(title => {
      const lowerTitle = title.toLowerCase();
      if (seniorityKeywords.some(keyword => lowerTitle.includes(keyword))) {
        seniorCount++;
      } else if (midLevelKeywords.some(keyword => lowerTitle.includes(keyword))) {
        midCount++;
      }
    });

    // Award points for career progression
    if (seniorCount > 0) return 20;
    if (midCount > 0) return 15;
    if (titles.length >= 2) return 10; // Multiple positions show growth
    return 5;
  }

  /**
   * Calculate education score (0-100)
   * Based on: degree level, GPA, field relevance
   */
  private async calculateEducationScore(userId: string): Promise<number> {
    const query = `
      SELECT 
        degree,
        gpa,
        field_of_study
      FROM education
      WHERE user_id = $1
      ORDER BY 
        CASE 
          WHEN degree ILIKE '%phd%' OR degree ILIKE '%doctorate%' THEN 5
          WHEN degree ILIKE '%master%' OR degree ILIKE '%mba%' THEN 4
          WHEN degree ILIKE '%bachelor%' THEN 3
          WHEN degree ILIKE '%associate%' THEN 2
          ELSE 1
        END DESC
    `;

    const result = await this.pool.query(query, [userId]);

    if (result.rows.length === 0) {
      return 0;
    }

    const highestDegree = result.rows[0];
    const degreeName = highestDegree.degree.toLowerCase();
    const gpa = parseFloat(highestDegree.gpa) || 0;

    // Scoring formula:
    // - Degree level: 70 points
    // - GPA (if available): 20 points
    // - Multiple degrees: 10 points bonus

    let degreeScore = 0;
    if (degreeName.includes('phd') || degreeName.includes('doctorate')) {
      degreeScore = 70;
    } else if (degreeName.includes('master') || degreeName.includes('mba')) {
      degreeScore = 60;
    } else if (degreeName.includes('bachelor')) {
      degreeScore = 50;
    } else if (degreeName.includes('associate')) {
      degreeScore = 35;
    } else {
      degreeScore = 20;
    }

    // GPA score (assuming 4.0 scale)
    const gpaScore = gpa > 0 ? (gpa / 4.0) * 20 : 0;

    // Multiple degrees bonus
    const multiDegreeBonus = result.rows.length > 1 ? 10 : 0;

    return Math.round(degreeScore + gpaScore + multiDegreeBonus);
  }

  /**
   * Calculate certification score (0-100)
   * Based on: number of certifications, recency, relevance
   */
  private async calculateCertificationScore(userId: string): Promise<number> {
    const query = `
      SELECT 
        COUNT(*) as cert_count,
        COUNT(CASE WHEN expiry_date IS NULL OR expiry_date > CURRENT_DATE THEN 1 END) as active_count,
        AVG(EXTRACT(YEAR FROM AGE(CURRENT_DATE, issue_date))) as avg_age
      FROM certifications
      WHERE user_id = $1
    `;

    const result = await this.pool.query(query, [userId]);
    const data = result.rows[0];

    if (!data || data.cert_count === 0) {
      return 0;
    }

    const certCount = parseInt(data.cert_count);
    const activeCount = parseInt(data.active_count);
    const avgAge = parseFloat(data.avg_age) || 0;

    // Scoring formula:
    // - Number of certifications (up to 10): 50 points
    // - Active certifications ratio: 30 points
    // - Recency (newer is better): 20 points

    const countScore = Math.min(50, (certCount / 10) * 50);
    const activeScore = (activeCount / certCount) * 30;
    const recencyScore = Math.max(0, 20 - (avgAge * 2)); // Lose 2 points per year

    return Math.round(countScore + activeScore + recencyScore);
  }

  /**
   * Calculate portfolio score (0-100)
   * Based on: number of projects, technologies used
   */
  private async calculatePortfolioScore(userId: string): Promise<number> {
    const query = `
      SELECT 
        COUNT(*) as project_count,
        array_length(array_agg(DISTINCT tech), 1) as unique_tech_count
      FROM portfolio_items,
      LATERAL unnest(technologies) as tech
      WHERE user_id = $1
      GROUP BY user_id
    `;

    const result = await this.pool.query(query, [userId]);

    if (result.rows.length === 0) {
      return 0;
    }

    const data = result.rows[0];
    const projectCount = parseInt(data.project_count) || 0;
    const uniqueTechCount = parseInt(data.unique_tech_count) || 0;

    // Scoring formula:
    // - Number of projects (up to 10): 60 points
    // - Technology diversity (up to 15 techs): 40 points

    const projectScore = Math.min(60, (projectCount / 10) * 60);
    const techScore = Math.min(40, (uniqueTechCount / 15) * 40);

    return Math.round(projectScore + techScore);
  }

  /**
   * Calculate endorsement score (0-100)
   * Based on: total endorsements across all skills
   */
  private async calculateEndorsementScore(userId: string): Promise<number> {
    const query = `
      SELECT SUM(endorsements) as total_endorsements
      FROM skills
      WHERE user_id = $1
    `;

    const result = await this.pool.query(query, [userId]);
    const totalEndorsements = parseInt(result.rows[0]?.total_endorsements) || 0;

    // Scoring formula:
    // - Total endorsements (up to 50): 100 points

    return Math.min(100, (totalEndorsements / 50) * 100);
  }

  /**
   * Update user profile with new skill score and record history
   */
  async updateUserSkillScore(
    userId: string,
    score: number,
    breakdown: SkillScoreBreakdown,
    trigger: SkillScoreHistory['trigger']
  ): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Update user_profiles table
      await client.query(
        `UPDATE user_profiles 
         SET skill_score = $1, updated_at = CURRENT_TIMESTAMP 
         WHERE user_id = $2`,
        [score, userId]
      );

      // Record in history
      await client.query(
        `INSERT INTO skill_score_history (user_id, score, trigger, breakdown)
         VALUES ($1, $2, $3, $4)`,
        [userId, score, trigger, JSON.stringify(breakdown)]
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get current skill score for a user
   */
  async getCurrentSkillScore(userId: string): Promise<SkillScore | null> {
    const query = `
      SELECT 
        up.user_id,
        up.skill_score as overall_score,
        ssh.breakdown,
        ssh.created_at as last_calculated
      FROM user_profiles up
      LEFT JOIN LATERAL (
        SELECT breakdown, created_at
        FROM skill_score_history
        WHERE user_id = up.user_id
        ORDER BY created_at DESC
        LIMIT 1
      ) ssh ON true
      WHERE up.user_id = $1
    `;

    const result = await this.pool.query(query, [userId]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];

    return {
      userId: row.user_id,
      overallScore: parseFloat(row.overall_score) || 0,
      breakdown: row.breakdown || {
        technicalSkills: 0,
        experience: 0,
        education: 0,
        certifications: 0,
        projectPortfolio: 0,
        endorsements: 0,
      },
      lastCalculated: row.last_calculated || new Date(),
    };
  }

  /**
   * Get skill score history for a user
   */
  async getSkillScoreHistory(
    userId: string,
    limit: number = 50
  ): Promise<SkillScoreHistory[]> {
    const query = `
      SELECT 
        id,
        user_id,
        score,
        trigger,
        breakdown,
        created_at
      FROM skill_score_history
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `;

    const result = await this.pool.query(query, [userId, limit]);

    return result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      score: parseFloat(row.score),
      trigger: row.trigger,
      breakdown: row.breakdown,
      createdAt: row.created_at,
    }));
  }

  /**
   * Calculate and update skill score for a user
   * This is the main method to recalculate and persist the score
   */
  async recalculateAndUpdateScore(
    userId: string,
    trigger: SkillScoreHistory['trigger'] = 'manual_recalculation'
  ): Promise<SkillScore> {
    const skillScore = await this.calculateSkillScore(userId);
    
    await this.updateUserSkillScore(
      userId,
      skillScore.overallScore,
      skillScore.breakdown,
      trigger
    );

    return skillScore;
  }

  /**
   * Perform skill gap analysis against a target role
   */
  async analyzeSkillGaps(userId: string, careerGoalId: string): Promise<SkillGapAnalysis> {
    // Get user's current skills
    const userSkillsQuery = `
      SELECT name, proficiency_level, years_of_experience
      FROM skills
      WHERE user_id = $1
    `;
    const userSkillsResult = await this.pool.query(userSkillsQuery, [userId]);

    // Get career goal with required skills
    const careerGoalQuery = `
      SELECT target_role, required_skills
      FROM career_goals
      WHERE id = $1 AND user_id = $2
    `;
    const careerGoalResult = await this.pool.query(careerGoalQuery, [careerGoalId, userId]);

    if (careerGoalResult.rows.length === 0) {
      throw new Error('Career goal not found');
    }

    const careerGoal = careerGoalResult.rows[0];
    const targetRole = careerGoal.target_role;
    const requiredSkillNames = careerGoal.required_skills || [];

    // Map user skills for easy lookup
    const userSkillsMap = new Map(
      userSkillsResult.rows.map(skill => [
        skill.name.toLowerCase(),
        {
          name: skill.name,
          proficiencyLevel: skill.proficiency_level,
          yearsOfExperience: parseFloat(skill.years_of_experience) || 0,
        }
      ])
    );

    // Define required skills with levels (this could be enhanced with a database of role requirements)
    const requiredSkills = requiredSkillNames.map((skillName: string) => ({
      name: skillName,
      requiredLevel: this.determineRequiredLevel(skillName, targetRole),
      importance: this.determineSkillImportance(skillName, targetRole),
    }));

    // Identify gaps
    const gaps: SkillGap[] = [];
    let matchedSkillsCount = 0;

    for (const required of requiredSkills) {
      const userSkill = userSkillsMap.get(required.name.toLowerCase());

      if (!userSkill) {
        // Skill is completely missing
        gaps.push({
          skillName: required.name,
          currentLevel: 0,
          requiredLevel: required.requiredLevel,
          priority: required.importance === 'critical' ? 'high' : required.importance === 'important' ? 'medium' : 'low',
          estimatedLearningTime: this.estimateLearningTime(0, required.requiredLevel),
        });
      } else if (userSkill.proficiencyLevel < required.requiredLevel) {
        // Skill exists but proficiency is below required level
        gaps.push({
          skillName: required.name,
          currentLevel: userSkill.proficiencyLevel,
          requiredLevel: required.requiredLevel,
          priority: required.importance === 'critical' ? 'high' : required.importance === 'important' ? 'medium' : 'low',
          estimatedLearningTime: this.estimateLearningTime(userSkill.proficiencyLevel, required.requiredLevel),
        });
      } else {
        // Skill meets or exceeds requirements
        matchedSkillsCount++;
      }
    }

    // Calculate match percentage
    const matchPercentage = requiredSkills.length > 0
      ? Math.round((matchedSkillsCount / requiredSkills.length) * 100)
      : 100;

    // Generate learning recommendations
    const recommendations = this.generateLearningRecommendations(gaps);

    return {
      userId,
      targetRole,
      currentSkills: Array.from(userSkillsMap.values()),
      requiredSkills,
      gaps: gaps.sort((a, b) => {
        // Sort by priority: high > medium > low
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }),
      recommendations,
      matchPercentage,
    };
  }

  /**
   * Determine required proficiency level for a skill based on role
   */
  private determineRequiredLevel(skillName: string, targetRole: string): number {
    // This is a simplified heuristic. In production, this would query a database
    // of role requirements or use ML to determine appropriate levels.
    
    const roleLower = targetRole.toLowerCase();
    
    // Senior roles typically require higher proficiency
    if (roleLower.includes('senior') || roleLower.includes('lead') || roleLower.includes('principal')) {
      return 4; // Advanced
    }
    
    // Mid-level roles
    if (roleLower.includes('mid') || roleLower.includes('ii') || roleLower.includes('iii')) {
      return 3; // Intermediate
    }
    
    // Entry-level or junior roles
    return 2; // Basic
  }

  /**
   * Determine importance of a skill for a role
   */
  private determineSkillImportance(
    skillName: string,
    targetRole: string
  ): 'critical' | 'important' | 'nice-to-have' {
    // This is a simplified heuristic. In production, this would use more sophisticated logic.
    
    const skillLower = skillName.toLowerCase();
    const roleLower = targetRole.toLowerCase();
    
    // Core programming languages are typically critical for developer roles
    const programmingLanguages = ['javascript', 'python', 'java', 'c++', 'c#', 'go', 'rust', 'typescript'];
    if (programmingLanguages.some(lang => skillLower.includes(lang)) && 
        (roleLower.includes('developer') || roleLower.includes('engineer'))) {
      return 'critical';
    }
    
    // Frameworks and tools are important
    const frameworks = ['react', 'angular', 'vue', 'node', 'django', 'spring', 'express'];
    if (frameworks.some(fw => skillLower.includes(fw))) {
      return 'important';
    }
    
    // Everything else is nice-to-have by default
    return 'nice-to-have';
  }

  /**
   * Estimate learning time to reach required proficiency level
   */
  private estimateLearningTime(currentLevel: number, requiredLevel: number): string {
    const levelDiff = requiredLevel - currentLevel;
    
    if (levelDiff <= 0) return '0 months';
    
    // Rough estimate: 2-3 months per proficiency level
    const months = levelDiff * 2.5;
    
    if (months < 1) return '< 1 month';
    if (months < 2) return '1-2 months';
    if (months < 4) return '2-4 months';
    if (months < 6) return '4-6 months';
    if (months < 12) return '6-12 months';
    return '12+ months';
  }

  /**
   * Generate learning resource recommendations based on skill gaps
   */
  private generateLearningRecommendations(gaps: SkillGap[]): LearningResource[] {
    const recommendations: LearningResource[] = [];

    // Focus on high priority gaps first
    const priorityGaps = gaps.filter(gap => gap.priority === 'high').slice(0, 5);

    for (const gap of priorityGaps) {
      // Generate generic recommendations (in production, this would query a database or API)
      recommendations.push({
        title: `${gap.skillName} Fundamentals Course`,
        provider: 'Online Learning Platform',
        type: 'course',
        url: `https://example.com/courses/${gap.skillName.toLowerCase().replace(/\s+/g, '-')}`,
        duration: gap.estimatedLearningTime,
        cost: 0,
        relevanceScore: gap.priority === 'high' ? 95 : gap.priority === 'medium' ? 75 : 50,
      });

      // Add certification recommendation for critical skills
      if (gap.priority === 'high' && gap.requiredLevel >= 4) {
        recommendations.push({
          title: `Professional ${gap.skillName} Certification`,
          provider: 'Certification Authority',
          type: 'certification',
          url: `https://example.com/certifications/${gap.skillName.toLowerCase().replace(/\s+/g, '-')}`,
          duration: '3-6 months',
          cost: 299,
          relevanceScore: 90,
        });
      }
    }

    return recommendations.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }
}
