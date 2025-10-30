import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { jobMatchingService } from '../services/job-matching.service';
import { pgPool } from '../config/database';
import { createTestUser, cleanupTestData } from './setup';
import { Job } from '../types/job.types';

// Mock the vector database service to avoid requiring OpenAI API key
vi.mock('../services/vector-db.service', () => ({
  vectorDbService: {
    initialize: vi.fn(),
    generateProfileEmbedding: vi.fn().mockResolvedValue(new Array(1536).fill(0.1)),
    findSimilarJobs: vi.fn().mockResolvedValue([]),
    storeJobEmbedding: vi.fn(),
    storeJobEmbeddings: vi.fn(),
    deleteJobEmbedding: vi.fn(),
    ensureIndexExists: vi.fn(),
  },
}));

/**
 * Job Matching Algorithm Tests
 * Tests matching accuracy with sample profiles and jobs
 * Verifies score calculation consistency
 * Requirements: 3.2, 3.4
 */

describe('Job Matching Algorithm', () => {
  let testUserId: string;
  let testJobId: string;

  beforeAll(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
    await pgPool.end();
  });

  beforeEach(async () => {
    // Create a fresh test user for each test
    const user = await createTestUser();
    testUserId = user.id;
  });

  /**
   * Helper function to create a test job
   */
  const createTestJob = async (jobData: Partial<Job>): Promise<string> => {
    const client = await pgPool.connect();
    try {
      const result = await client.query(
        `INSERT INTO jobs (
          external_id, source, title, company, location, remote_type,
          job_type, salary_min, salary_max, description, requirements,
          responsibilities, benefits, posted_date, apply_url, industry, experience_level
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        RETURNING id`,
        [
          jobData.externalId || `test-job-${Date.now()}`,
          jobData.source || 'linkedin',
          jobData.title || 'Software Engineer',
          jobData.company || 'Test Company',
          jobData.location || 'San Francisco, CA',
          jobData.remoteType || 'hybrid',
          jobData.jobType || 'full-time',
          jobData.salaryMin || 100000,
          jobData.salaryMax || 150000,
          jobData.description || 'Test job description',
          jobData.requirements || [],
          jobData.responsibilities || [],
          jobData.benefits || [],
          jobData.postedDate || new Date(),
          jobData.applyUrl || 'https://example.com/apply',
          jobData.industry || 'Technology',
          jobData.experienceLevel || 'mid-level',
        ]
      );
      return result.rows[0].id;
    } finally {
      client.release();
    }
  };

  /**
   * Helper function to add skills to a user
   */
  const addUserSkills = async (
    userId: string,
    skills: Array<{ name: string; proficiencyLevel: number; yearsOfExperience: number }>
  ) => {
    const client = await pgPool.connect();
    try {
      for (const skill of skills) {
        await client.query(
          `INSERT INTO skills (user_id, name, proficiency_level, years_of_experience, category)
           VALUES ($1, $2, $3, $4, $5)`,
          [userId, skill.name, skill.proficiencyLevel, skill.yearsOfExperience, 'technical']
        );
      }
    } finally {
      client.release();
    }
  };

  /**
   * Helper function to add experience to a user
   */
  const addUserExperience = async (
    userId: string,
    experiences: Array<{
      title: string;
      company: string;
      startDate: Date;
      endDate?: Date;
      current: boolean;
    }>
  ) => {
    const client = await pgPool.connect();
    try {
      for (const exp of experiences) {
        await client.query(
          `INSERT INTO experience (user_id, title, company, start_date, end_date, current, description, skills)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            userId,
            exp.title,
            exp.company,
            exp.startDate,
            exp.endDate,
            exp.current,
            'Test description',
            [],
          ]
        );
      }
    } finally {
      client.release();
    }
  };

  /**
   * Helper function to set user preferences
   */
  const setUserPreferences = async (userId: string, preferences: any) => {
    const client = await pgPool.connect();
    try {
      await client.query(
        `UPDATE user_profiles SET preferences = $1 WHERE user_id = $2`,
        [JSON.stringify(preferences), userId]
      );
    } finally {
      client.release();
    }
  };

  describe('Skill Matching', () => {
    it('should calculate 100% skill match when user has all required skills', async () => {
      // Setup: User with JavaScript, TypeScript, React
      await addUserSkills(testUserId, [
        { name: 'JavaScript', proficiencyLevel: 5, yearsOfExperience: 5 },
        { name: 'TypeScript', proficiencyLevel: 4, yearsOfExperience: 3 },
        { name: 'React', proficiencyLevel: 5, yearsOfExperience: 4 },
      ]);

      // Job requiring JavaScript, TypeScript, React
      testJobId = await createTestJob({
        title: 'Frontend Developer',
        requirements: [
          'Strong JavaScript skills required',
          'TypeScript experience needed',
          'React framework expertise',
        ],
        description: 'We need someone with JavaScript, TypeScript, and React experience',
      });

      const matchScore = await jobMatchingService.calculateMatchScore({
        userId: testUserId,
        jobId: testJobId,
      });

      expect(matchScore.breakdown.skillMatch).toBeGreaterThanOrEqual(90);
      expect(matchScore.matchingSkills).toContain('javascript');
      expect(matchScore.matchingSkills).toContain('typescript');
      expect(matchScore.matchingSkills).toContain('react');
      expect(matchScore.missingSkills).toHaveLength(0);
    });

    it('should calculate partial skill match when user has some required skills', async () => {
      // Setup: User with JavaScript and React only
      await addUserSkills(testUserId, [
        { name: 'JavaScript', proficiencyLevel: 5, yearsOfExperience: 5 },
        { name: 'React', proficiencyLevel: 4, yearsOfExperience: 3 },
      ]);

      // Job requiring JavaScript, TypeScript, React, Node.js
      testJobId = await createTestJob({
        title: 'Full Stack Developer',
        requirements: [
          'JavaScript and TypeScript required',
          'React experience',
          'Node.js backend development',
        ],
        description: 'Full stack role with JavaScript, TypeScript, React, and Node.js',
      });

      const matchScore = await jobMatchingService.calculateMatchScore({
        userId: testUserId,
        jobId: testJobId,
      });

      expect(matchScore.breakdown.skillMatch).toBeLessThan(80);
      expect(matchScore.breakdown.skillMatch).toBeGreaterThan(30);
      expect(matchScore.matchingSkills.length).toBeGreaterThan(0);
      expect(matchScore.missingSkills.length).toBeGreaterThan(0);
      expect(matchScore.missingSkills).toContain('typescript');
    });

    it('should weight proficiency levels in skill matching', async () => {
      // Setup: User with high proficiency
      await addUserSkills(testUserId, [
        { name: 'Python', proficiencyLevel: 5, yearsOfExperience: 8 },
        { name: 'Django', proficiencyLevel: 5, yearsOfExperience: 6 },
      ]);

      testJobId = await createTestJob({
        title: 'Python Developer',
        requirements: ['Python programming', 'Django framework'],
        description: 'Python and Django development',
      });

      const matchScore = await jobMatchingService.calculateMatchScore({
        userId: testUserId,
        jobId: testJobId,
      });

      // High proficiency should result in high skill match
      expect(matchScore.breakdown.skillMatch).toBeGreaterThanOrEqual(85);
    });
  });

  describe('Experience Matching', () => {
    it('should match perfectly when user has exact required experience', async () => {
      // Setup: User with 3 years experience
      await addUserExperience(testUserId, [
        {
          title: 'Software Engineer',
          company: 'Tech Corp',
          startDate: new Date('2021-01-01'),
          endDate: new Date('2024-01-01'),
          current: false,
        },
      ]);

      // Job requiring 3 years (mid-level)
      testJobId = await createTestJob({
        title: 'Software Engineer',
        experienceLevel: 'mid-level',
        requirements: ['3+ years of experience'],
      });

      const matchScore = await jobMatchingService.calculateMatchScore({
        userId: testUserId,
        jobId: testJobId,
      });

      expect(matchScore.breakdown.experienceMatch).toBeGreaterThanOrEqual(90);
    });

    it('should penalize when user lacks required experience', async () => {
      // Setup: User with 1 year experience
      await addUserExperience(testUserId, [
        {
          title: 'Junior Developer',
          company: 'Startup Inc',
          startDate: new Date('2023-01-01'),
          current: true,
        },
      ]);

      // Job requiring 5+ years (senior level)
      testJobId = await createTestJob({
        title: 'Senior Software Engineer',
        experienceLevel: 'senior',
        requirements: ['5+ years of experience required'],
      });

      const matchScore = await jobMatchingService.calculateMatchScore({
        userId: testUserId,
        jobId: testJobId,
      });

      expect(matchScore.breakdown.experienceMatch).toBeLessThan(60);
    });

    it('should handle entry-level positions appropriately', async () => {
      // Setup: User with minimal experience
      await addUserExperience(testUserId, [
        {
          title: 'Intern',
          company: 'Tech Company',
          startDate: new Date('2023-06-01'),
          current: true,
        },
      ]);

      // Entry-level job
      testJobId = await createTestJob({
        title: 'Junior Developer',
        experienceLevel: 'entry-level',
        requirements: ['0-2 years experience'],
      });

      const matchScore = await jobMatchingService.calculateMatchScore({
        userId: testUserId,
        jobId: testJobId,
      });

      expect(matchScore.breakdown.experienceMatch).toBeGreaterThanOrEqual(70);
    });

    it('should detect overqualification', async () => {
      // Setup: User with 15 years experience
      await addUserExperience(testUserId, [
        {
          title: 'Senior Architect',
          company: 'Enterprise Corp',
          startDate: new Date('2009-01-01'),
          current: true,
        },
      ]);

      // Entry-level job
      testJobId = await createTestJob({
        title: 'Junior Developer',
        experienceLevel: 'entry-level',
        requirements: ['0-2 years experience'],
      });

      const matchScore = await jobMatchingService.calculateMatchScore({
        userId: testUserId,
        jobId: testJobId,
      });

      // Should still score reasonably but not perfect
      expect(matchScore.breakdown.experienceMatch).toBeLessThan(100);
      expect(matchScore.recommendations.some(r => r.includes('overqualified'))).toBe(true);
    });
  });

  describe('Location Matching', () => {
    it('should match perfectly for remote jobs', async () => {
      await setUserPreferences(testUserId, {
        remotePreference: 'onsite',
        locations: ['New York'],
      });

      testJobId = await createTestJob({
        title: 'Remote Developer',
        remoteType: 'remote',
        location: 'Remote',
      });

      const matchScore = await jobMatchingService.calculateMatchScore({
        userId: testUserId,
        jobId: testJobId,
      });

      expect(matchScore.breakdown.locationMatch).toBe(100);
    });

    it('should match when remote preference aligns', async () => {
      await setUserPreferences(testUserId, {
        remotePreference: 'remote',
        locations: [],
      });

      testJobId = await createTestJob({
        title: 'Remote Engineer',
        remoteType: 'remote',
        location: 'Remote',
      });

      const matchScore = await jobMatchingService.calculateMatchScore({
        userId: testUserId,
        jobId: testJobId,
      });

      expect(matchScore.breakdown.locationMatch).toBe(100);
    });

    it('should partially match hybrid vs onsite preferences', async () => {
      await setUserPreferences(testUserId, {
        remotePreference: 'hybrid',
        locations: ['San Francisco'],
      });

      testJobId = await createTestJob({
        title: 'Onsite Developer',
        remoteType: 'onsite',
        location: 'San Francisco, CA',
      });

      const matchScore = await jobMatchingService.calculateMatchScore({
        userId: testUserId,
        jobId: testJobId,
      });

      expect(matchScore.breakdown.locationMatch).toBeGreaterThan(50);
      expect(matchScore.breakdown.locationMatch).toBeLessThan(100);
    });

    it('should match when job location is in user preferred locations', async () => {
      await setUserPreferences(testUserId, {
        remotePreference: 'onsite',
        locations: ['Seattle', 'San Francisco', 'Austin'],
      });

      testJobId = await createTestJob({
        title: 'Software Engineer',
        remoteType: 'onsite',
        location: 'Seattle, WA',
      });

      const matchScore = await jobMatchingService.calculateMatchScore({
        userId: testUserId,
        jobId: testJobId,
      });

      expect(matchScore.breakdown.locationMatch).toBeGreaterThanOrEqual(80);
    });
  });

  describe('Salary Matching', () => {
    it('should match perfectly when salary ranges overlap completely', async () => {
      await setUserPreferences(testUserId, {
        salaryMin: 100000,
        salaryMax: 150000,
      });

      testJobId = await createTestJob({
        title: 'Developer',
        salaryMin: 110000,
        salaryMax: 140000,
      });

      const matchScore = await jobMatchingService.calculateMatchScore({
        userId: testUserId,
        jobId: testJobId,
      });

      expect(matchScore.breakdown.salaryMatch).toBeGreaterThanOrEqual(70);
    });

    it('should score high when job pays more than expected', async () => {
      await setUserPreferences(testUserId, {
        salaryMin: 80000,
        salaryMax: 100000,
      });

      testJobId = await createTestJob({
        title: 'Senior Developer',
        salaryMin: 120000,
        salaryMax: 150000,
      });

      const matchScore = await jobMatchingService.calculateMatchScore({
        userId: testUserId,
        jobId: testJobId,
      });

      expect(matchScore.breakdown.salaryMatch).toBe(100);
    });

    it('should penalize when job pays less than expected', async () => {
      await setUserPreferences(testUserId, {
        salaryMin: 150000,
        salaryMax: 200000,
      });

      testJobId = await createTestJob({
        title: 'Developer',
        salaryMin: 80000,
        salaryMax: 100000,
      });

      const matchScore = await jobMatchingService.calculateMatchScore({
        userId: testUserId,
        jobId: testJobId,
      });

      expect(matchScore.breakdown.salaryMatch).toBeLessThan(50);
    });

    it('should handle missing salary information neutrally', async () => {
      await setUserPreferences(testUserId, {
        salaryMin: 100000,
        salaryMax: 150000,
      });

      testJobId = await createTestJob({
        title: 'Developer',
        salaryMin: 0,
        salaryMax: 0,
      });

      const matchScore = await jobMatchingService.calculateMatchScore({
        userId: testUserId,
        jobId: testJobId,
      });

      expect(matchScore.breakdown.salaryMatch).toBe(50);
    });
  });

  describe('Culture Fit Matching', () => {
    it('should match when industry preferences align', async () => {
      await setUserPreferences(testUserId, {
        industries: ['Technology', 'Software'],
      });

      testJobId = await createTestJob({
        title: 'Software Engineer',
        industry: 'Technology',
      });

      const matchScore = await jobMatchingService.calculateMatchScore({
        userId: testUserId,
        jobId: testJobId,
      });

      expect(matchScore.breakdown.cultureFit).toBeGreaterThanOrEqual(70);
    });

    it('should match when job aligns with career goals', async () => {
      // Add career goal
      const client = await pgPool.connect();
      try {
        await client.query(
          `INSERT INTO career_goals (user_id, target_role, required_skills)
           VALUES ($1, $2, $3)`,
          [testUserId, 'Machine Learning Engineer', ['python', 'tensorflow']]
        );
      } finally {
        client.release();
      }

      testJobId = await createTestJob({
        title: 'Machine Learning Engineer',
        industry: 'AI/ML',
      });

      const matchScore = await jobMatchingService.calculateMatchScore({
        userId: testUserId,
        jobId: testJobId,
      });

      expect(matchScore.breakdown.cultureFit).toBeGreaterThanOrEqual(70);
    });
  });

  describe('Overall Score Calculation', () => {
    it('should calculate weighted overall score correctly', async () => {
      // Setup comprehensive profile
      await addUserSkills(testUserId, [
        { name: 'JavaScript', proficiencyLevel: 5, yearsOfExperience: 5 },
        { name: 'React', proficiencyLevel: 5, yearsOfExperience: 4 },
        { name: 'Node.js', proficiencyLevel: 4, yearsOfExperience: 3 },
      ]);

      await addUserExperience(testUserId, [
        {
          title: 'Software Engineer',
          company: 'Tech Corp',
          startDate: new Date('2020-01-01'),
          current: true,
        },
      ]);

      await setUserPreferences(testUserId, {
        remotePreference: 'remote',
        salaryMin: 100000,
        salaryMax: 150000,
        industries: ['Technology'],
      });

      testJobId = await createTestJob({
        title: 'Full Stack Developer',
        remoteType: 'remote',
        salaryMin: 110000,
        salaryMax: 140000,
        industry: 'Technology',
        experienceLevel: 'mid-level',
        requirements: [
          'JavaScript and React required',
          'Node.js backend experience',
          '3+ years experience',
        ],
        description: 'Full stack role with JavaScript, React, and Node.js',
      });

      const matchScore = await jobMatchingService.calculateMatchScore({
        userId: testUserId,
        jobId: testJobId,
      });

      // Verify overall score is within valid range
      expect(matchScore.overallScore).toBeGreaterThanOrEqual(0);
      expect(matchScore.overallScore).toBeLessThanOrEqual(100);

      // Verify all breakdown scores are present
      expect(matchScore.breakdown.skillMatch).toBeDefined();
      expect(matchScore.breakdown.experienceMatch).toBeDefined();
      expect(matchScore.breakdown.locationMatch).toBeDefined();
      expect(matchScore.breakdown.salaryMatch).toBeDefined();
      expect(matchScore.breakdown.cultureFit).toBeDefined();

      // For this well-matched profile, overall score should be high
      expect(matchScore.overallScore).toBeGreaterThanOrEqual(75);
    });

    it('should maintain score consistency across multiple calculations', async () => {
      // Setup profile
      await addUserSkills(testUserId, [
        { name: 'Python', proficiencyLevel: 4, yearsOfExperience: 3 },
        { name: 'Django', proficiencyLevel: 4, yearsOfExperience: 2 },
      ]);

      await addUserExperience(testUserId, [
        {
          title: 'Backend Developer',
          company: 'Web Company',
          startDate: new Date('2021-01-01'),
          current: true,
        },
      ]);

      testJobId = await createTestJob({
        title: 'Python Developer',
        requirements: ['Python and Django experience'],
        description: 'Backend development with Python and Django',
      });

      // Calculate score multiple times
      const score1 = await jobMatchingService.calculateMatchScore({
        userId: testUserId,
        jobId: testJobId,
      });

      const score2 = await jobMatchingService.calculateMatchScore({
        userId: testUserId,
        jobId: testJobId,
      });

      const score3 = await jobMatchingService.calculateMatchScore({
        userId: testUserId,
        jobId: testJobId,
      });

      // Scores should be identical
      expect(score1.overallScore).toBe(score2.overallScore);
      expect(score2.overallScore).toBe(score3.overallScore);
      expect(score1.breakdown).toEqual(score2.breakdown);
      expect(score2.breakdown).toEqual(score3.breakdown);
    });

    it('should generate appropriate recommendations', async () => {
      // Setup profile with some gaps
      await addUserSkills(testUserId, [
        { name: 'JavaScript', proficiencyLevel: 3, yearsOfExperience: 2 },
      ]);

      await addUserExperience(testUserId, [
        {
          title: 'Junior Developer',
          company: 'Startup',
          startDate: new Date('2022-01-01'),
          current: true,
        },
      ]);

      testJobId = await createTestJob({
        title: 'Senior Full Stack Developer',
        experienceLevel: 'senior',
        requirements: [
          'JavaScript, TypeScript, React, Node.js',
          '5+ years experience',
        ],
        description: 'Senior role requiring JavaScript, TypeScript, React, and Node.js',
      });

      const matchScore = await jobMatchingService.calculateMatchScore({
        userId: testUserId,
        jobId: testJobId,
      });

      // Should have recommendations
      expect(matchScore.recommendations).toBeDefined();
      expect(matchScore.recommendations.length).toBeGreaterThan(0);

      // Should suggest learning missing skills
      const hasSkillRecommendation = matchScore.recommendations.some(r =>
        r.toLowerCase().includes('learning') || r.toLowerCase().includes('consider')
      );
      expect(hasSkillRecommendation).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle user with no skills', async () => {
      testJobId = await createTestJob({
        title: 'Developer',
        requirements: ['JavaScript required'],
      });

      const matchScore = await jobMatchingService.calculateMatchScore({
        userId: testUserId,
        jobId: testJobId,
      });

      expect(matchScore.overallScore).toBeGreaterThanOrEqual(0);
      expect(matchScore.breakdown.skillMatch).toBeLessThan(50);
    });

    it('should handle user with no experience', async () => {
      await addUserSkills(testUserId, [
        { name: 'JavaScript', proficiencyLevel: 3, yearsOfExperience: 0 },
      ]);

      testJobId = await createTestJob({
        title: 'Entry Level Developer',
        experienceLevel: 'entry-level',
      });

      const matchScore = await jobMatchingService.calculateMatchScore({
        userId: testUserId,
        jobId: testJobId,
      });

      expect(matchScore.overallScore).toBeGreaterThanOrEqual(0);
      expect(matchScore.breakdown.experienceMatch).toBeGreaterThan(50);
    });

    it('should handle job with no requirements', async () => {
      await addUserSkills(testUserId, [
        { name: 'JavaScript', proficiencyLevel: 4, yearsOfExperience: 3 },
      ]);

      testJobId = await createTestJob({
        title: 'Developer',
        requirements: [],
        description: 'General developer position',
      });

      const matchScore = await jobMatchingService.calculateMatchScore({
        userId: testUserId,
        jobId: testJobId,
      });

      expect(matchScore.overallScore).toBeGreaterThanOrEqual(0);
      expect(matchScore.overallScore).toBeLessThanOrEqual(100);
    });

    it('should handle missing user preferences', async () => {
      await addUserSkills(testUserId, [
        { name: 'Python', proficiencyLevel: 4, yearsOfExperience: 3 },
      ]);

      // Don't set any preferences

      testJobId = await createTestJob({
        title: 'Python Developer',
        requirements: ['Python experience'],
      });

      const matchScore = await jobMatchingService.calculateMatchScore({
        userId: testUserId,
        jobId: testJobId,
      });

      expect(matchScore.overallScore).toBeGreaterThanOrEqual(0);
      expect(matchScore.overallScore).toBeLessThanOrEqual(100);
    });
  });
});
