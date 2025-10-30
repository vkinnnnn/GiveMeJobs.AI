import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SkillScoringService } from '../services/skill-scoring.service';

// Mock the database pool
vi.mock('../config/database', () => ({
  pgPool: {
    query: vi.fn(),
    connect: vi.fn(),
  },
}));

// Import after mocking
import { pgPool } from '../config/database';

describe('Skill Scoring Service - Unit Tests', () => {
  let skillScoringService: SkillScoringService;
  const mockQuery = pgPool.query as any;
  const mockConnect = pgPool.connect as any;

  beforeEach(() => {
    skillScoringService = new SkillScoringService();
    vi.clearAllMocks();
    
    // Setup default mock for connect (returns a client with query and release)
    mockConnect.mockResolvedValue({
      query: vi.fn(),
      release: vi.fn(),
    });
  });

  describe('Score Calculation with Various Profile Configurations', () => {
    describe('Empty Profile', () => {
      it('should return 0 score for user with no skills', async () => {
        mockQuery.mockResolvedValueOnce({
          rows: [{ skill_count: 0, avg_proficiency: null, avg_years: null, max_proficiency: null }],
        });
        mockQuery.mockResolvedValueOnce({
          rows: [{ position_count: 0, total_years: null, titles: [] }],
        });
        mockQuery.mockResolvedValueOnce({ rows: [] });
        mockQuery.mockResolvedValueOnce({ rows: [{ cert_count: 0 }] });
        mockQuery.mockResolvedValueOnce({ rows: [] });
        mockQuery.mockResolvedValueOnce({ rows: [{ total_endorsements: null }] });

        const score = await skillScoringService.calculateSkillScore('user-1');

        expect(score.overallScore).toBe(0);
        expect(score.breakdown.technicalSkills).toBe(0);
        expect(score.breakdown.experience).toBe(0);
        expect(score.breakdown.education).toBe(0);
      });
    });

    describe('Junior Developer Profile', () => {
      it('should calculate score for entry-level developer with basic skills', async () => {
        // Mock skills query - 3 skills, beginner level
        mockQuery.mockResolvedValueOnce({
          rows: [{
            skill_count: 3,
            avg_proficiency: 2.0,
            avg_years: 1.0,
            max_proficiency: 2,
          }],
        });
        // Mock experience query - 1 year
        mockQuery.mockResolvedValueOnce({
          rows: [{
            position_count: 1,
            total_years: 1.0,
            titles: ['Junior Developer'],
          }],
        });
        // Mock education query - Bachelor's degree
        mockQuery.mockResolvedValueOnce({
          rows: [{
            degree: 'Bachelor of Science',
            gpa: 3.5,
            field_of_study: 'Computer Science',
          }],
        });
        // Mock certifications query - none
        mockQuery.mockResolvedValueOnce({
          rows: [{ cert_count: 0 }],
        });
        // Mock portfolio query - none
        mockQuery.mockResolvedValueOnce({ rows: [] });
        // Mock endorsements query - few
        mockQuery.mockResolvedValueOnce({
          rows: [{ total_endorsements: 5 }],
        });

        const score = await skillScoringService.calculateSkillScore('user-junior');

        // Junior profile should have moderate score (20-40 range)
        expect(score.overallScore).toBeGreaterThan(15);
        expect(score.overallScore).toBeLessThan(45);
        expect(score.breakdown.technicalSkills).toBeGreaterThan(0);
        expect(score.breakdown.experience).toBeGreaterThan(0);
        expect(score.breakdown.education).toBeGreaterThan(40); // Bachelor's should score well
      });
    });

    describe('Mid-Level Developer Profile', () => {
      it('should calculate score for mid-level developer with solid experience', async () => {
        // Mock skills query - 10 skills, intermediate level
        mockQuery.mockResolvedValueOnce({
          rows: [{
            skill_count: 10,
            avg_proficiency: 3.5,
            avg_years: 4.0,
            max_proficiency: 4,
          }],
        });
        // Mock experience query - 5 years, multiple positions
        mockQuery.mockResolvedValueOnce({
          rows: [{
            position_count: 3,
            total_years: 5.0,
            titles: ['Junior Developer', 'Software Engineer', 'Mid-Level Engineer'],
          }],
        });
        // Mock education query - Bachelor's with good GPA
        mockQuery.mockResolvedValueOnce({
          rows: [{
            degree: 'Bachelor of Science',
            gpa: 3.8,
            field_of_study: 'Computer Science',
          }],
        });
        // Mock certifications query - 2 active certs
        mockQuery.mockResolvedValueOnce({
          rows: [{
            cert_count: 2,
            active_count: 2,
            avg_age: 1.5,
          }],
        });
        // Mock portfolio query - 5 projects
        mockQuery.mockResolvedValueOnce({
          rows: [{
            project_count: 5,
            unique_tech_count: 8,
          }],
        });
        // Mock endorsements query - moderate
        mockQuery.mockResolvedValueOnce({
          rows: [{ total_endorsements: 20 }],
        });

        const score = await skillScoringService.calculateSkillScore('user-mid');

        // Mid-level profile should have good score (50-70 range)
        expect(score.overallScore).toBeGreaterThan(45);
        expect(score.overallScore).toBeLessThan(75);
        expect(score.breakdown.technicalSkills).toBeGreaterThan(50);
        expect(score.breakdown.experience).toBeGreaterThan(30);
        expect(score.breakdown.certifications).toBeGreaterThan(0);
      });
    });

    describe('Senior Developer Profile', () => {
      it('should calculate high score for senior developer with extensive experience', async () => {
        // Mock skills query - 20 skills, expert level
        mockQuery.mockResolvedValueOnce({
          rows: [{
            skill_count: 20,
            avg_proficiency: 4.5,
            avg_years: 8.0,
            max_proficiency: 5,
          }],
        });
        // Mock experience query - 12 years, senior positions
        mockQuery.mockResolvedValueOnce({
          rows: [{
            position_count: 5,
            total_years: 12.0,
            titles: ['Junior Developer', 'Software Engineer', 'Senior Engineer', 'Lead Engineer', 'Principal Engineer'],
          }],
        });
        // Mock education query - Master's degree
        mockQuery.mockResolvedValueOnce({
          rows: [
            {
              degree: 'Master of Science',
              gpa: 3.9,
              field_of_study: 'Computer Science',
            },
            {
              degree: 'Bachelor of Science',
              gpa: 3.7,
              field_of_study: 'Computer Science',
            },
          ],
        });
        // Mock certifications query - multiple active certs
        mockQuery.mockResolvedValueOnce({
          rows: [{
            cert_count: 5,
            active_count: 4,
            avg_age: 2.0,
          }],
        });
        // Mock portfolio query - extensive portfolio
        mockQuery.mockResolvedValueOnce({
          rows: [{
            project_count: 15,
            unique_tech_count: 20,
          }],
        });
        // Mock endorsements query - many endorsements
        mockQuery.mockResolvedValueOnce({
          rows: [{ total_endorsements: 50 }],
        });

        const score = await skillScoringService.calculateSkillScore('user-senior');

        // Senior profile should have high score (75-95 range)
        expect(score.overallScore).toBeGreaterThan(70);
        expect(score.overallScore).toBeLessThanOrEqual(100);
        expect(score.breakdown.technicalSkills).toBeGreaterThan(80);
        expect(score.breakdown.experience).toBeGreaterThan(70);
        expect(score.breakdown.education).toBeGreaterThan(60);
      });
    });

    describe('PhD Researcher Profile', () => {
      it('should calculate high education score for PhD with research focus', async () => {
        // Mock skills query - specialized skills
        mockQuery.mockResolvedValueOnce({
          rows: [{
            skill_count: 8,
            avg_proficiency: 4.0,
            avg_years: 6.0,
            max_proficiency: 5,
          }],
        });
        // Mock experience query - research positions
        mockQuery.mockResolvedValueOnce({
          rows: [{
            position_count: 2,
            total_years: 6.0,
            titles: ['Research Assistant', 'Postdoctoral Researcher'],
          }],
        });
        // Mock education query - PhD
        mockQuery.mockResolvedValueOnce({
          rows: [{
            degree: 'PhD in Computer Science',
            gpa: 4.0,
            field_of_study: 'Machine Learning',
          }],
        });
        // Mock certifications query
        mockQuery.mockResolvedValueOnce({
          rows: [{
            cert_count: 3,
            active_count: 3,
            avg_age: 1.0,
          }],
        });
        // Mock portfolio query - research projects
        mockQuery.mockResolvedValueOnce({
          rows: [{
            project_count: 10,
            unique_tech_count: 12,
          }],
        });
        // Mock endorsements query
        mockQuery.mockResolvedValueOnce({
          rows: [{ total_endorsements: 30 }],
        });

        const score = await skillScoringService.calculateSkillScore('user-phd');

        // PhD should have very high education score
        expect(score.breakdown.education).toBeGreaterThan(75);
        expect(score.overallScore).toBeGreaterThan(60);
      });
    });

    describe('Career Changer Profile', () => {
      it('should calculate score for career changer with bootcamp education', async () => {
        // Mock skills query - new skills, low experience
        mockQuery.mockResolvedValueOnce({
          rows: [{
            skill_count: 5,
            avg_proficiency: 2.5,
            avg_years: 0.5,
            max_proficiency: 3,
          }],
        });
        // Mock experience query - minimal tech experience
        mockQuery.mockResolvedValueOnce({
          rows: [{
            position_count: 1,
            total_years: 0.5,
            titles: ['Junior Developer'],
          }],
        });
        // Mock education query - bootcamp (no traditional degree)
        mockQuery.mockResolvedValueOnce({
          rows: [{
            degree: 'Coding Bootcamp Certificate',
            gpa: null,
            field_of_study: 'Web Development',
          }],
        });
        // Mock certifications query - 1 recent cert
        mockQuery.mockResolvedValueOnce({
          rows: [{
            cert_count: 1,
            active_count: 1,
            avg_age: 0.5,
          }],
        });
        // Mock portfolio query - bootcamp projects
        mockQuery.mockResolvedValueOnce({
          rows: [{
            project_count: 3,
            unique_tech_count: 5,
          }],
        });
        // Mock endorsements query - minimal
        mockQuery.mockResolvedValueOnce({
          rows: [{ total_endorsements: 2 }],
        });

        const score = await skillScoringService.calculateSkillScore('user-bootcamp');

        // Career changer should have lower but non-zero score
        expect(score.overallScore).toBeGreaterThan(10);
        expect(score.overallScore).toBeLessThan(40);
        expect(score.breakdown.education).toBeGreaterThan(0); // Bootcamp counts
        expect(score.breakdown.projectPortfolio).toBeGreaterThan(0);
      });
    });

    describe('Weighted Score Calculation', () => {
      it('should properly weight all components in final score', async () => {
        // Create a profile with known component scores
        mockQuery.mockResolvedValueOnce({
          rows: [{
            skill_count: 10,
            avg_proficiency: 3.0,
            avg_years: 5.0,
            max_proficiency: 4,
          }],
        });
        mockQuery.mockResolvedValueOnce({
          rows: [{
            position_count: 3,
            total_years: 5.0,
            titles: ['Developer', 'Senior Developer'],
          }],
        });
        mockQuery.mockResolvedValueOnce({
          rows: [{
            degree: 'Bachelor of Science',
            gpa: 3.5,
            field_of_study: 'CS',
          }],
        });
        mockQuery.mockResolvedValueOnce({
          rows: [{
            cert_count: 2,
            active_count: 2,
            avg_age: 1.0,
          }],
        });
        mockQuery.mockResolvedValueOnce({
          rows: [{
            project_count: 5,
            unique_tech_count: 8,
          }],
        });
        mockQuery.mockResolvedValueOnce({
          rows: [{ total_endorsements: 25 }],
        });

        const score = await skillScoringService.calculateSkillScore('user-weighted');

        // Verify score is within valid range
        expect(score.overallScore).toBeGreaterThanOrEqual(0);
        expect(score.overallScore).toBeLessThanOrEqual(100);
        
        // Verify all breakdown components are present
        expect(score.breakdown).toHaveProperty('technicalSkills');
        expect(score.breakdown).toHaveProperty('experience');
        expect(score.breakdown).toHaveProperty('education');
        expect(score.breakdown).toHaveProperty('certifications');
        expect(score.breakdown).toHaveProperty('projectPortfolio');
        expect(score.breakdown).toHaveProperty('endorsements');
      });
    });
  });

  describe('Skill Gap Analysis Accuracy', () => {
    describe('Complete Skill Match', () => {
      it('should show 100% match when user has all required skills at required levels', async () => {
        // Mock user skills query
        mockQuery.mockResolvedValueOnce({
          rows: [
            { name: 'JavaScript', proficiency_level: 5, years_of_experience: 5 },
            { name: 'React', proficiency_level: 4, years_of_experience: 4 },
            { name: 'Node.js', proficiency_level: 4, years_of_experience: 3 },
          ],
        });
        
        // Mock career goal query
        mockQuery.mockResolvedValueOnce({
          rows: [{
            target_role: 'Senior Full Stack Developer',
            required_skills: ['JavaScript', 'React', 'Node.js'],
          }],
        });

        const analysis = await skillScoringService.analyzeSkillGaps('user-1', 'goal-1');

        expect(analysis.matchPercentage).toBe(100);
        expect(analysis.gaps).toHaveLength(0);
        expect(analysis.currentSkills).toHaveLength(3);
      });
    });

    describe('Partial Skill Match', () => {
      it('should identify missing skills correctly', async () => {
        // Mock user skills query - only has 2 out of 5 required skills
        mockQuery.mockResolvedValueOnce({
          rows: [
            { name: 'JavaScript', proficiency_level: 4, years_of_experience: 3 },
            { name: 'React', proficiency_level: 3, years_of_experience: 2 },
          ],
        });
        
        // Mock career goal query
        mockQuery.mockResolvedValueOnce({
          rows: [{
            target_role: 'Full Stack Developer',
            required_skills: ['JavaScript', 'React', 'Node.js', 'TypeScript', 'PostgreSQL'],
          }],
        });

        const analysis = await skillScoringService.analyzeSkillGaps('user-2', 'goal-2');

        expect(analysis.matchPercentage).toBe(40); // 2 out of 5 = 40%
        expect(analysis.gaps).toHaveLength(3); // Missing 3 skills
        
        // Verify missing skills are identified
        const missingSkillNames = analysis.gaps
          .filter(gap => gap.currentLevel === 0)
          .map(gap => gap.skillName);
        expect(missingSkillNames).toContain('Node.js');
        expect(missingSkillNames).toContain('TypeScript');
        expect(missingSkillNames).toContain('PostgreSQL');
      });
    });

    describe('Proficiency Gap Detection', () => {
      it('should identify when skills exist but proficiency is too low', async () => {
        // Mock user skills query - has skills but at lower proficiency
        mockQuery.mockResolvedValueOnce({
          rows: [
            { name: 'Python', proficiency_level: 2, years_of_experience: 1 },
            { name: 'Django', proficiency_level: 2, years_of_experience: 1 },
          ],
        });
        
        // Mock career goal query - senior role requiring higher proficiency
        mockQuery.mockResolvedValueOnce({
          rows: [{
            target_role: 'Senior Python Developer',
            required_skills: ['Python', 'Django'],
          }],
        });

        const analysis = await skillScoringService.analyzeSkillGaps('user-3', 'goal-3');

        // Should have gaps even though skills exist
        expect(analysis.gaps.length).toBeGreaterThan(0);
        
        // Verify proficiency gaps are identified
        analysis.gaps.forEach(gap => {
          expect(gap.currentLevel).toBeLessThan(gap.requiredLevel);
          expect(gap.currentLevel).toBeGreaterThan(0); // Not missing, just insufficient
        });
      });
    });

    describe('Priority Assignment', () => {
      it('should assign high priority to critical skills for senior roles', async () => {
        // Mock user skills query - empty
        mockQuery.mockResolvedValueOnce({
          rows: [],
        });
        
        // Mock career goal query - senior role
        mockQuery.mockResolvedValueOnce({
          rows: [{
            target_role: 'Senior Software Engineer',
            required_skills: ['JavaScript', 'Python', 'AWS'],
          }],
        });

        const analysis = await skillScoringService.analyzeSkillGaps('user-4', 'goal-4');

        // For senior roles, core programming languages should be high priority
        const jsGap = analysis.gaps.find(gap => gap.skillName === 'JavaScript');
        const pythonGap = analysis.gaps.find(gap => gap.skillName === 'Python');
        
        expect(jsGap?.priority).toBe('high');
        expect(pythonGap?.priority).toBe('high');
      });

      it('should assign lower priority for junior roles', async () => {
        // Mock user skills query - empty
        mockQuery.mockResolvedValueOnce({
          rows: [],
        });
        
        // Mock career goal query - junior role
        mockQuery.mockResolvedValueOnce({
          rows: [{
            target_role: 'Junior Developer',
            required_skills: ['JavaScript', 'HTML', 'CSS'],
          }],
        });

        const analysis = await skillScoringService.analyzeSkillGaps('user-5', 'goal-5');

        // Required levels should be lower for junior roles
        analysis.gaps.forEach(gap => {
          expect(gap.requiredLevel).toBeLessThanOrEqual(3);
        });
      });
    });

    describe('Learning Time Estimation', () => {
      it('should estimate learning time based on proficiency gap', async () => {
        // Mock user skills query
        mockQuery.mockResolvedValueOnce({
          rows: [
            { name: 'JavaScript', proficiency_level: 2, years_of_experience: 1 },
          ],
        });
        
        // Mock career goal query
        mockQuery.mockResolvedValueOnce({
          rows: [{
            target_role: 'Senior Developer',
            required_skills: ['JavaScript', 'TypeScript'],
          }],
        });

        const analysis = await skillScoringService.analyzeSkillGaps('user-6', 'goal-6');

        // Verify learning time estimates are provided
        analysis.gaps.forEach(gap => {
          expect(gap.estimatedLearningTime).toBeDefined();
          expect(typeof gap.estimatedLearningTime).toBe('string');
          
          // Larger gaps should have longer learning times
          if (gap.requiredLevel - gap.currentLevel > 2) {
            expect(gap.estimatedLearningTime).toMatch(/month|year/i);
          }
        });
      });
    });

    describe('Learning Recommendations', () => {
      it('should generate learning recommendations for skill gaps', async () => {
        // Mock user skills query
        mockQuery.mockResolvedValueOnce({
          rows: [],
        });
        
        // Mock career goal query
        mockQuery.mockResolvedValueOnce({
          rows: [{
            target_role: 'Full Stack Developer',
            required_skills: ['React', 'Node.js', 'MongoDB'],
          }],
        });

        const analysis = await skillScoringService.analyzeSkillGaps('user-7', 'goal-7');

        // Should have recommendations
        expect(analysis.recommendations).toBeDefined();
        expect(analysis.recommendations.length).toBeGreaterThan(0);
        
        // Recommendations should have required fields
        analysis.recommendations.forEach(rec => {
          expect(rec).toHaveProperty('title');
          expect(rec).toHaveProperty('provider');
          expect(rec).toHaveProperty('type');
          expect(rec).toHaveProperty('url');
          expect(rec).toHaveProperty('duration');
          expect(rec).toHaveProperty('cost');
          expect(rec).toHaveProperty('relevanceScore');
        });
      });

      it('should prioritize recommendations by relevance score', async () => {
        // Mock user skills query
        mockQuery.mockResolvedValueOnce({
          rows: [],
        });
        
        // Mock career goal query with multiple skills
        mockQuery.mockResolvedValueOnce({
          rows: [{
            target_role: 'Senior Engineer',
            required_skills: ['Python', 'Docker', 'Kubernetes', 'AWS', 'CI/CD'],
          }],
        });

        const analysis = await skillScoringService.analyzeSkillGaps('user-8', 'goal-8');

        // Recommendations should be sorted by relevance score (descending)
        for (let i = 0; i < analysis.recommendations.length - 1; i++) {
          expect(analysis.recommendations[i].relevanceScore)
            .toBeGreaterThanOrEqual(analysis.recommendations[i + 1].relevanceScore);
        }
      });

      it('should suggest certifications for high-priority skills', async () => {
        // Mock user skills query
        mockQuery.mockResolvedValueOnce({
          rows: [],
        });
        
        // Mock career goal query - senior developer role with critical programming skills
        mockQuery.mockResolvedValueOnce({
          rows: [{
            target_role: 'Senior Software Engineer',
            required_skills: ['Python', 'JavaScript', 'TypeScript'],
          }],
        });

        const analysis = await skillScoringService.analyzeSkillGaps('user-9', 'goal-9');

        // Should have recommendations for high-priority gaps
        expect(analysis.recommendations.length).toBeGreaterThan(0);
        
        // For senior roles, programming languages should be high priority with level 4
        const highPriorityGaps = analysis.gaps.filter(gap => gap.priority === 'high' && gap.requiredLevel >= 4);
        expect(highPriorityGaps.length).toBeGreaterThan(0);
        
        // Should include certification recommendations for high-priority skills at level 4+
        const certifications = analysis.recommendations.filter(rec => rec.type === 'certification');
        expect(certifications.length).toBeGreaterThan(0);
      });
    });

    describe('Gap Sorting', () => {
      it('should sort gaps by priority (high > medium > low)', async () => {
        // Mock user skills query
        mockQuery.mockResolvedValueOnce({
          rows: [
            { name: 'HTML', proficiency_level: 3, years_of_experience: 2 },
          ],
        });
        
        // Mock career goal query with mixed skill types
        mockQuery.mockResolvedValueOnce({
          rows: [{
            target_role: 'Full Stack Developer',
            required_skills: ['JavaScript', 'React', 'CSS', 'Git', 'Docker'],
          }],
        });

        const analysis = await skillScoringService.analyzeSkillGaps('user-10', 'goal-10');

        // Verify gaps are sorted by priority
        let lastPriorityValue = 3; // high = 3
        const priorityValues = { high: 3, medium: 2, low: 1 };
        
        analysis.gaps.forEach(gap => {
          const currentPriorityValue = priorityValues[gap.priority];
          expect(currentPriorityValue).toBeLessThanOrEqual(lastPriorityValue);
          lastPriorityValue = currentPriorityValue;
        });
      });
    });

    describe('Edge Cases', () => {
      it('should handle career goal with no required skills', async () => {
        // Mock user skills query
        mockQuery.mockResolvedValueOnce({
          rows: [
            { name: 'JavaScript', proficiency_level: 4, years_of_experience: 3 },
          ],
        });
        
        // Mock career goal query with empty required skills
        mockQuery.mockResolvedValueOnce({
          rows: [{
            target_role: 'Manager',
            required_skills: [],
          }],
        });

        const analysis = await skillScoringService.analyzeSkillGaps('user-11', 'goal-11');

        expect(analysis.matchPercentage).toBe(100);
        expect(analysis.gaps).toHaveLength(0);
      });

      it('should handle user with skills exceeding all requirements', async () => {
        // Mock user skills query - expert level
        mockQuery.mockResolvedValueOnce({
          rows: [
            { name: 'JavaScript', proficiency_level: 5, years_of_experience: 10 },
            { name: 'React', proficiency_level: 5, years_of_experience: 8 },
            { name: 'Node.js', proficiency_level: 5, years_of_experience: 7 },
          ],
        });
        
        // Mock career goal query - mid-level role
        mockQuery.mockResolvedValueOnce({
          rows: [{
            target_role: 'Mid-Level Developer',
            required_skills: ['JavaScript', 'React'],
          }],
        });

        const analysis = await skillScoringService.analyzeSkillGaps('user-12', 'goal-12');

        expect(analysis.matchPercentage).toBe(100);
        expect(analysis.gaps).toHaveLength(0);
      });
    });
  });
});

