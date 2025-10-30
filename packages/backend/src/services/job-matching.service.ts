import { Pool } from 'pg';
import { pgPool } from '../config/database';
import { Job } from '../types/job.types';
import {
  JobMatchScore,
  MatchingWeights,
  UserMatchProfile,
  JobMatchRequest,
  JobRecommendationRequest,
} from '../types/matching.types';
import { vectorDbService } from './vector-db.service';
import { jobService } from './job.service';

export class JobMatchingService {
  private db: Pool;
  
  // Weighted scoring formula
  private weights: MatchingWeights = {
    skillMatch: 0.35,       // 35% - Most important
    experienceMatch: 0.25,  // 25% - Years and relevance
    locationMatch: 0.15,    // 15% - Geographic preference
    salaryMatch: 0.10,      // 10% - Compensation alignment
    cultureFit: 0.15,       // 15% - Company values, size, industry
  };

  constructor() {
    this.db = pgPool;
  }

  /**
   * Calculate match score between a user and a job
   */
  async calculateMatchScore(request: JobMatchRequest): Promise<JobMatchScore> {
    // Get user profile
    const userProfile = await this.getUserMatchProfile(request.userId);
    
    // Get job details
    const job = await jobService.getJobById(request.jobId);
    
    if (!job) {
      throw new Error('Job not found');
    }

    // Calculate individual scores
    const skillMatchResult = this.calculateSkillMatch(userProfile, job);
    const experienceMatch = this.calculateExperienceMatch(userProfile, job);
    const locationMatch = this.calculateLocationMatch(userProfile, job);
    const salaryMatch = this.calculateSalaryMatch(userProfile, job);
    const cultureFit = this.calculateCultureFit(userProfile, job);

    // Calculate overall weighted score
    const overallScore = Math.round(
      skillMatchResult.score * this.weights.skillMatch +
      experienceMatch * this.weights.experienceMatch +
      locationMatch * this.weights.locationMatch +
      salaryMatch * this.weights.salaryMatch +
      cultureFit * this.weights.cultureFit
    );

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      skillMatchResult,
      experienceMatch,
      locationMatch,
      salaryMatch,
      cultureFit,
      userProfile,
      job
    );

    return {
      jobId: job.id,
      userId: request.userId,
      overallScore,
      breakdown: {
        skillMatch: Math.round(skillMatchResult.score),
        experienceMatch: Math.round(experienceMatch),
        locationMatch: Math.round(locationMatch),
        salaryMatch: Math.round(salaryMatch),
        cultureFit: Math.round(cultureFit),
      },
      matchingSkills: skillMatchResult.matchingSkills,
      missingSkills: skillMatchResult.missingSkills,
      recommendations,
    };
  }

  /**
   * Calculate skill match score
   */
  private calculateSkillMatch(
    profile: UserMatchProfile,
    job: Job
  ): { score: number; matchingSkills: string[]; missingSkills: string[] } {
    // Extract skills from job requirements
    const jobSkills = this.extractSkillsFromJob(job);

    // Find matching and missing skills
    const matchingSkills: string[] = [];
    const missingSkills: string[] = [];

    jobSkills.forEach((jobSkill) => {
      const skillLower = jobSkill.toLowerCase();
      const userSkill = profile.skills.find((s) => s.name.toLowerCase() === skillLower);
      
      if (userSkill) {
        matchingSkills.push(jobSkill);
      } else {
        missingSkills.push(jobSkill);
      }
    });

    // Calculate score based on match percentage and proficiency
    let score = 0;
    if (jobSkills.length > 0) {
      const matchPercentage = matchingSkills.length / jobSkills.length;
      
      // Weight by proficiency levels
      const proficiencyBonus = matchingSkills.reduce((sum, skill) => {
        const userSkill = profile.skills.find((s) => s.name.toLowerCase() === skill.toLowerCase());
        return sum + (userSkill ? userSkill.proficiencyLevel / 5 : 0);
      }, 0) / matchingSkills.length;

      score = (matchPercentage * 0.7 + (proficiencyBonus || 0) * 0.3) * 100;
    }

    return {
      score: Math.min(100, score),
      matchingSkills,
      missingSkills,
    };
  }

  /**
   * Calculate experience match score
   */
  private calculateExperienceMatch(profile: UserMatchProfile, job: Job): number {
    // Parse experience level from job
    const requiredYears = this.parseExperienceLevel(job.experienceLevel);
    
    // Compare with user's total experience
    const userYears = profile.totalYearsExperience;

    // Calculate score based on experience alignment
    let score = 0;
    if (requiredYears === 0) {
      // Entry level - any experience is good
      score = Math.min(100, 80 + userYears * 5);
    } else if (userYears >= requiredYears) {
      // Has required experience or more
      const excess = userYears - requiredYears;
      if (excess <= 2) {
        score = 100; // Perfect match
      } else if (excess <= 5) {
        score = 90; // Slightly overqualified
      } else {
        score = 75; // Significantly overqualified
      }
    } else {
      // Less experience than required
      const deficit = requiredYears - userYears;
      score = Math.max(0, 100 - deficit * 15);
    }

    // Bonus for relevant role experience
    const hasRelevantRole = profile.experience.some((exp) =>
      this.isRoleRelevant(exp.title, job.title)
    );
    if (hasRelevantRole) {
      score = Math.min(100, score + 10);
    }

    return score;
  }

  /**
   * Calculate location match score
   */
  private calculateLocationMatch(profile: UserMatchProfile, job: Job): number {
    const userPreference = profile.preferences.remotePreference || 'any';
    const jobRemoteType = job.remoteType || 'onsite';

    // Perfect match scenarios
    if (userPreference === 'any') return 100;
    if (userPreference === jobRemoteType) return 100;
    if (jobRemoteType === 'remote') return 100; // Remote jobs match everyone

    // Partial matches
    if (userPreference === 'hybrid' && jobRemoteType === 'onsite') return 60;
    if (userPreference === 'remote' && jobRemoteType === 'hybrid') return 70;

    // Check if job location matches user's preferred locations
    if (profile.preferences.locations && profile.preferences.locations.length > 0) {
      const locationMatch = profile.preferences.locations.some((loc) =>
        job.location.toLowerCase().includes(loc.toLowerCase())
      );
      if (locationMatch) return 80;
    }

    return 40; // Poor match
  }

  /**
   * Calculate salary match score
   */
  private calculateSalaryMatch(profile: UserMatchProfile, job: Job): number {
    const userMin = profile.preferences.salaryMin || 0;
    const userMax = profile.preferences.salaryMax || Infinity;
    const jobMin = job.salaryMin || 0;
    const jobMax = job.salaryMax || 0;

    // If no salary info available
    if (jobMin === 0 && jobMax === 0) return 50; // Neutral score

    // Check if job salary range overlaps with user expectations
    if (jobMax >= userMin && jobMin <= userMax) {
      // Calculate overlap percentage
      const overlapMin = Math.max(jobMin, userMin);
      const overlapMax = Math.min(jobMax, userMax);
      const overlapRange = overlapMax - overlapMin;
      const userRange = userMax - userMin;
      
      if (userRange === Infinity) return 100;
      
      const overlapPercentage = overlapRange / userRange;
      return Math.min(100, 70 + overlapPercentage * 30);
    }

    // Job pays more than expected
    if (jobMin > userMax) return 100;

    // Job pays less than expected
    if (jobMax < userMin) {
      const deficit = (userMin - jobMax) / userMin;
      return Math.max(0, 100 - deficit * 100);
    }

    return 50;
  }

  /**
   * Calculate culture fit score
   */
  private calculateCultureFit(profile: UserMatchProfile, job: Job): number {
    let score = 50; // Base score

    // Industry match
    if (profile.preferences.industries && job.industry) {
      const industryMatch = profile.preferences.industries.some((ind) =>
        job.industry?.toLowerCase().includes(ind.toLowerCase())
      );
      if (industryMatch) score += 25;
    }

    // Company size preference (if available in future)
    // For now, use a neutral score

    // Career goal alignment
    if (profile.careerGoals && profile.careerGoals.length > 0) {
      const goalMatch = profile.careerGoals.some((goal) =>
        job.title.toLowerCase().includes(goal.targetRole.toLowerCase())
      );
      if (goalMatch) score += 25;
    }

    return Math.min(100, score);
  }

  /**
   * Get user profile for matching
   */
  private async getUserMatchProfile(userId: string): Promise<UserMatchProfile> {
    // Get skills
    const skillsQuery = `
      SELECT name, proficiency_level, years_of_experience
      FROM skills
      WHERE user_id = $1
    `;
    const skillsResult = await this.db.query(skillsQuery, [userId]);

    // Get experience
    const experienceQuery = `
      SELECT title, company, description, skills, start_date, end_date, current
      FROM experience
      WHERE user_id = $1
      ORDER BY start_date DESC
    `;
    const experienceResult = await this.db.query(experienceQuery, [userId]);

    // Get education
    const educationQuery = `
      SELECT degree, field_of_study, institution
      FROM education
      WHERE user_id = $1
    `;
    const educationResult = await this.db.query(educationQuery, [userId]);

    // Get preferences
    const preferencesQuery = `
      SELECT preferences
      FROM user_profiles
      WHERE user_id = $1
    `;
    const preferencesResult = await this.db.query(preferencesQuery, [userId]);

    // Get career goals
    const goalsQuery = `
      SELECT target_role, required_skills
      FROM career_goals
      WHERE user_id = $1
    `;
    const goalsResult = await this.db.query(goalsQuery, [userId]);

    // Calculate total years of experience
    const totalYearsExperience = experienceResult.rows.reduce((total, exp) => {
      const start = new Date(exp.start_date);
      const end = exp.current ? new Date() : new Date(exp.end_date);
      const years = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365);
      return total + years;
    }, 0);

    return {
      userId,
      skills: skillsResult.rows.map((row) => ({
        name: row.name,
        proficiencyLevel: row.proficiency_level,
        yearsOfExperience: row.years_of_experience,
      })),
      experience: experienceResult.rows.map((row) => ({
        title: row.title,
        company: row.company,
        description: row.description,
        skills: row.skills || [],
        startDate: new Date(row.start_date),
        endDate: row.end_date ? new Date(row.end_date) : undefined,
        current: row.current,
      })),
      education: educationResult.rows.map((row) => ({
        degree: row.degree,
        fieldOfStudy: row.field_of_study,
        institution: row.institution,
      })),
      preferences: preferencesResult.rows[0]?.preferences || {},
      careerGoals: goalsResult.rows.map((row) => ({
        targetRole: row.target_role,
        requiredSkills: row.required_skills || [],
      })),
      totalYearsExperience,
    };
  }

  /**
   * Extract skills from job description and requirements
   */
  private extractSkillsFromJob(job: Job): string[] {
    const skills = new Set<string>();

    // Add from requirements array
    job.requirements.forEach((req) => {
      const extractedSkills = this.extractSkillsFromText(req);
      extractedSkills.forEach((skill) => skills.add(skill));
    });

    // Add from description
    const descSkills = this.extractSkillsFromText(job.description);
    descSkills.forEach((skill) => skills.add(skill));

    return Array.from(skills);
  }

  /**
   * Extract skills from text using common patterns
   */
  private extractSkillsFromText(text: string): string[] {
    // Common tech skills and keywords
    const commonSkills = [
      'javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'ruby', 'php', 'go', 'rust',
      'react', 'angular', 'vue', 'node.js', 'express', 'django', 'flask', 'spring',
      'sql', 'postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch',
      'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform',
      'git', 'ci/cd', 'agile', 'scrum', 'rest', 'graphql', 'microservices',
      'html', 'css', 'sass', 'webpack', 'babel',
      'machine learning', 'ai', 'data science', 'analytics',
    ];

    const skills: string[] = [];
    const lowerText = text.toLowerCase();

    commonSkills.forEach((skill) => {
      if (lowerText.includes(skill)) {
        skills.push(skill);
      }
    });

    return skills;
  }

  /**
   * Parse experience level from text
   */
  private parseExperienceLevel(experienceLevel?: string): number {
    if (!experienceLevel) return 0;

    const level = experienceLevel.toLowerCase();
    if (level.includes('entry') || level.includes('junior')) return 0;
    if (level.includes('mid') || level.includes('intermediate')) return 3;
    if (level.includes('senior')) return 5;
    if (level.includes('lead') || level.includes('principal')) return 8;
    if (level.includes('staff') || level.includes('architect')) return 10;

    return 0;
  }

  /**
   * Check if role is relevant
   */
  private isRoleRelevant(userRole: string, jobRole: string): boolean {
    const userRoleLower = userRole.toLowerCase();
    const jobRoleLower = jobRole.toLowerCase();

    // Extract key terms
    const userTerms = userRoleLower.split(/\s+/);
    const jobTerms = jobRoleLower.split(/\s+/);

    // Check for common terms
    const commonTerms = userTerms.filter((term) => jobTerms.includes(term));
    return commonTerms.length >= 2;
  }

  /**
   * Get personalized job recommendations for a user
   */
  async getJobRecommendations(request: JobRecommendationRequest): Promise<Job[]> {
    try {
      // Get user profile
      const userProfile = await this.getUserMatchProfile(request.userId);

      // Generate profile embedding
      const profileEmbedding = await vectorDbService.generateProfileEmbedding({
        skills: userProfile.skills,
        experience: userProfile.experience,
        education: userProfile.education,
        careerGoals: userProfile.careerGoals,
      });

      // Find similar jobs using vector search
      const limit = request.limit || 50;
      const similarJobs = await vectorDbService.findSimilarJobs(profileEmbedding, limit * 2);

      // Get full job details
      const jobIds = similarJobs.map((match) => match.jobId);
      const jobs = await this.getJobsByIds(jobIds);

      // Calculate match scores for each job
      const jobsWithScores = await Promise.all(
        jobs.map(async (job) => {
          const matchScore = await this.calculateMatchScore({
            userId: request.userId,
            jobId: job.id,
          });
          return {
            ...job,
            matchScore: matchScore.overallScore,
          };
        })
      );

      // Apply filters
      let filteredJobs = jobsWithScores;

      if (request.filters) {
        const { location, remoteType, jobType, salaryMin, minMatchScore } = request.filters;

        if (location) {
          filteredJobs = filteredJobs.filter((job) =>
            job.location.toLowerCase().includes(location.toLowerCase())
          );
        }

        if (remoteType && remoteType.length > 0) {
          filteredJobs = filteredJobs.filter(
            (job) => job.remoteType && remoteType.includes(job.remoteType)
          );
        }

        if (jobType && jobType.length > 0) {
          filteredJobs = filteredJobs.filter(
            (job) => job.jobType && jobType.includes(job.jobType)
          );
        }

        if (salaryMin) {
          filteredJobs = filteredJobs.filter(
            (job) => job.salaryMax && job.salaryMax >= salaryMin
          );
        }

        if (minMatchScore) {
          filteredJobs = filteredJobs.filter(
            (job) => job.matchScore && job.matchScore >= minMatchScore
          );
        }
      }

      // Sort by match score
      filteredJobs.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));

      // Return top results
      return filteredJobs.slice(0, request.limit || 20);
    } catch (error) {
      console.error('Error getting job recommendations:', error);
      throw error;
    }
  }

  /**
   * Get multiple jobs by IDs
   */
  private async getJobsByIds(jobIds: string[]): Promise<Job[]> {
    if (jobIds.length === 0) return [];

    const query = `
      SELECT 
        id, external_id, source, title, company, location, remote_type,
        job_type, salary_min, salary_max, description, requirements,
        responsibilities, benefits, posted_date, application_deadline,
        apply_url, company_logo, industry, experience_level,
        created_at, updated_at
      FROM jobs
      WHERE id = ANY($1)
    `;

    const result = await this.db.query(query, [jobIds]);
    return result.rows.map((row) => this.mapRowToJob(row));
  }

  /**
   * Map database row to Job object
   */
  private mapRowToJob(row: any): Job {
    return {
      id: row.id,
      externalId: row.external_id,
      source: row.source,
      title: row.title,
      company: row.company,
      location: row.location,
      remoteType: row.remote_type,
      jobType: row.job_type,
      salaryMin: row.salary_min,
      salaryMax: row.salary_max,
      description: row.description,
      requirements: row.requirements || [],
      responsibilities: row.responsibilities || [],
      benefits: row.benefits || [],
      postedDate: new Date(row.posted_date),
      applicationDeadline: row.application_deadline
        ? new Date(row.application_deadline)
        : undefined,
      applyUrl: row.apply_url,
      companyLogo: row.company_logo,
      industry: row.industry,
      experienceLevel: row.experience_level,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  /**
   * Generate recommendations based on match analysis
   */
  private generateRecommendations(
    skillMatchResult: { score: number; matchingSkills: string[]; missingSkills: string[] },
    experienceMatch: number,
    locationMatch: number,
    salaryMatch: number,
    cultureFit: number,
    profile: UserMatchProfile,
    _job: Job
  ): string[] {
    const recommendations: string[] = [];

    // Skill recommendations
    if (skillMatchResult.score < 70 && skillMatchResult.missingSkills.length > 0) {
      recommendations.push(
        `Consider learning: ${skillMatchResult.missingSkills.slice(0, 3).join(', ')}`
      );
    }

    // Experience recommendations
    if (experienceMatch < 60) {
      recommendations.push(
        'This role may require more experience than you currently have. Consider similar roles with lower requirements.'
      );
    } else if (experienceMatch > 90 && profile.totalYearsExperience > 10) {
      recommendations.push(
        'You may be overqualified for this role. Consider more senior positions.'
      );
    }

    // Location recommendations
    if (locationMatch < 60) {
      recommendations.push(
        'Location or remote work preference may not align. Consider if relocation or commute is feasible.'
      );
    }

    // Salary recommendations
    if (salaryMatch < 50) {
      recommendations.push(
        'Salary range may not meet your expectations. Consider negotiating or adjusting your requirements.'
      );
    }

    // Overall strong match
    if (skillMatchResult.score > 80 && experienceMatch > 80) {
      recommendations.push(
        'Strong match! Your skills and experience align well with this role.'
      );
    }

    return recommendations;
  }
}

export const jobMatchingService = new JobMatchingService();
