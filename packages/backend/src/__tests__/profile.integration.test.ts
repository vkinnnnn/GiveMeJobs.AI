import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { setupTestDatabase, teardownTestDatabase, cleanupTestData, createTestUserWithAuth } from './setup';
import { createMinimalTestApp } from './helpers/test-app.helper';
import profileRoutes from '../routes/profile.routes';

/**
 * Profile Service Integration Tests
 * Tests complete profile creation and update flows
 * Verifies data validation and error handling
 */

// Create Express app for testing with proper auth middleware
const app = createMinimalTestApp(profileRoutes, true);

let testUser: any;
let authToken: string;
let authHeader: string;

beforeAll(async () => {
  await setupTestDatabase();
});

afterAll(async () => {
  await teardownTestDatabase();
});

beforeEach(async () => {
  await cleanupTestData();
  const testUserData = await createTestUserWithAuth();
  testUser = testUserData.user;
  authToken = testUserData.token;
  authHeader = testUserData.authHeader;
});

describe('Profile Service Integration Tests', () => {
  describe('GET /api/users/:id/profile', () => {
    it('should get user profile successfully', async () => {
      const response = await request(app)
        .get(`/${testUser.id}/profile`)
        .set('Authorization', authHeader)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.profile).toBeDefined();
      expect(response.body.data.profile.user_id).toBe(testUser.id);
      expect(response.body.data.profile.email).toBe(testUser.email);
    });

    it('should return 403 when accessing another user profile', async () => {
      const otherUser = await createTestUser();
      
      const response = await request(app)
        .get(`/api/users/${otherUser.id}/profile`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Access denied');
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .get(`/api/users/${testUser.id}/profile`)
        .expect(401);
    });
  });

  describe('PUT /api/users/:id/profile', () => {
    it('should update profile successfully', async () => {
      const updateData = {
        professionalHeadline: 'Senior Software Engineer',
        preferences: {
          jobTypes: ['full-time'],
          remotePreference: 'remote',
          locations: ['San Francisco', 'New York'],
          salaryMin: 100000,
          salaryMax: 150000,
          industries: ['Technology', 'Finance'],
          companySizes: ['startup', 'medium']
        }
      };

      const response = await request(app)
        .put(`/api/users/${testUser.id}/profile`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.profile.professional_headline).toBe('Senior Software Engineer');
      expect(response.body.data.profile.preferences).toBeDefined();
    });

    it('should validate preferences data', async () => {
      const invalidData = {
        preferences: {
          jobTypes: ['invalid-type'], // Invalid job type
          remotePreference: 'remote'
        }
      };

      const response = await request(app)
        .put(`/api/users/${testUser.id}/profile`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 403 when updating another user profile', async () => {
      const otherUser = await createTestUser();
      
      const response = await request(app)
        .put(`/api/users/${otherUser.id}/profile`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ professionalHeadline: 'Test' })
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Skills Management', () => {
    describe('POST /api/users/:id/skills', () => {
      it('should create skill successfully', async () => {
        const skillData = {
          name: 'JavaScript',
          category: 'Programming Language',
          proficiencyLevel: 4,
          yearsOfExperience: 5.5,
          lastUsed: new Date().toISOString()
        };

        const response = await request(app)
          .post(`/api/users/${testUser.id}/skills`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(skillData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.skill.name).toBe('JavaScript');
        expect(response.body.data.skill.proficiency_level).toBe(4);
      });

      it('should validate skill data', async () => {
        const invalidSkill = {
          name: 'TypeScript',
          proficiencyLevel: 6, // Invalid: must be 1-5
          yearsOfExperience: 3
        };

        const response = await request(app)
          .post(`/api/users/${testUser.id}/skills`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(invalidSkill)
          .expect(400);

        expect(response.body.success).toBe(false);
      });

      it('should require authentication', async () => {
        await request(app)
          .post(`/api/users/${testUser.id}/skills`)
          .send({ name: 'Python', proficiencyLevel: 3, yearsOfExperience: 2 })
          .expect(401);
      });
    });

    describe('GET /api/users/:id/skills', () => {
      it('should get all skills for user', async () => {
        // Create multiple skills
        const skills = [
          { name: 'JavaScript', category: 'Programming', proficiencyLevel: 4, yearsOfExperience: 5 },
          { name: 'Python', category: 'Programming', proficiencyLevel: 3, yearsOfExperience: 3 },
          { name: 'React', category: 'Framework', proficiencyLevel: 5, yearsOfExperience: 4 }
        ];

        for (const skill of skills) {
          await request(app)
            .post(`/api/users/${testUser.id}/skills`)
            .set('Authorization', `Bearer ${authToken}`)
            .send(skill);
        }

        const response = await request(app)
          .get(`/api/users/${testUser.id}/skills`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.skills).toHaveLength(3);
      });
    });

    describe('PUT /api/users/:id/skills/:skillId', () => {
      it('should update skill successfully', async () => {
        // Create skill first
        const createResponse = await request(app)
          .post(`/api/users/${testUser.id}/skills`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ name: 'Node.js', proficiencyLevel: 3, yearsOfExperience: 2 });

        const skillId = createResponse.body.data.skill.id;

        const updateData = {
          proficiencyLevel: 4,
          yearsOfExperience: 3.5
        };

        const response = await request(app)
          .put(`/api/users/${testUser.id}/skills/${skillId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(updateData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.skill.proficiency_level).toBe(4);
        expect(parseFloat(response.body.data.skill.years_of_experience)).toBe(3.5);
      });

      it('should return 404 for non-existent skill', async () => {
        const fakeSkillId = '00000000-0000-0000-0000-000000000000';

        const response = await request(app)
          .put(`/api/users/${testUser.id}/skills/${fakeSkillId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ proficiencyLevel: 4 })
          .expect(404);

        expect(response.body.success).toBe(false);
      });
    });

    describe('DELETE /api/users/:id/skills/:skillId', () => {
      it('should delete skill successfully', async () => {
        // Create skill first
        const createResponse = await request(app)
          .post(`/api/users/${testUser.id}/skills`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ name: 'Go', proficiencyLevel: 2, yearsOfExperience: 1 });

        const skillId = createResponse.body.data.skill.id;

        const response = await request(app)
          .delete(`/api/users/${testUser.id}/skills/${skillId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);

        // Verify skill is deleted
        const getResponse = await request(app)
          .get(`/api/users/${testUser.id}/skills`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(getResponse.body.data.skills).toHaveLength(0);
      });
    });
  });

  describe('Experience Management', () => {
    describe('POST /api/users/:id/experience', () => {
      it('should create experience successfully', async () => {
        const experienceData = {
          company: 'Tech Corp',
          title: 'Software Engineer',
          startDate: '2020-01-01T00:00:00.000Z',
          endDate: '2022-12-31T00:00:00.000Z',
          current: false,
          description: 'Developed web applications',
          achievements: ['Built feature X', 'Improved performance by 50%'],
          skills: ['JavaScript', 'React', 'Node.js']
        };

        const response = await request(app)
          .post(`/api/users/${testUser.id}/experience`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(experienceData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.experience.company).toBe('Tech Corp');
        expect(response.body.data.experience.achievements).toHaveLength(2);
      });

      it('should validate date ranges', async () => {
        const invalidExperience = {
          company: 'Test Company',
          title: 'Developer',
          startDate: '2022-01-01T00:00:00.000Z',
          endDate: '2020-01-01T00:00:00.000Z', // End before start
          current: false
        };

        const response = await request(app)
          .post(`/api/users/${testUser.id}/experience`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(invalidExperience)
          .expect(400);

        expect(response.body.success).toBe(false);
      });

      it('should not allow endDate for current positions', async () => {
        const invalidExperience = {
          company: 'Current Company',
          title: 'Senior Engineer',
          startDate: '2023-01-01T00:00:00.000Z',
          endDate: '2024-01-01T00:00:00.000Z',
          current: true // Current but has end date
        };

        const response = await request(app)
          .post(`/api/users/${testUser.id}/experience`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(invalidExperience)
          .expect(400);

        expect(response.body.success).toBe(false);
      });
    });

    describe('GET /api/users/:id/experience', () => {
      it('should get all experience for user', async () => {
        const experiences = [
          {
            company: 'Company A',
            title: 'Junior Developer',
            startDate: '2018-01-01T00:00:00.000Z',
            endDate: '2020-01-01T00:00:00.000Z',
            current: false
          },
          {
            company: 'Company B',
            title: 'Senior Developer',
            startDate: '2020-01-01T00:00:00.000Z',
            current: true
          }
        ];

        for (const exp of experiences) {
          await request(app)
            .post(`/api/users/${testUser.id}/experience`)
            .set('Authorization', `Bearer ${authToken}`)
            .send(exp);
        }

        const response = await request(app)
          .get(`/api/users/${testUser.id}/experience`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.experience).toHaveLength(2);
      });
    });

    describe('PUT /api/users/:id/experience/:expId', () => {
      it('should update experience successfully', async () => {
        const createResponse = await request(app)
          .post(`/api/users/${testUser.id}/experience`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            company: 'Old Company',
            title: 'Developer',
            startDate: '2020-01-01T00:00:00.000Z',
            current: true
          });

        const expId = createResponse.body.data.experience.id;

        const updateData = {
          title: 'Senior Developer',
          description: 'Updated description'
        };

        const response = await request(app)
          .put(`/api/users/${testUser.id}/experience/${expId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(updateData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.experience.title).toBe('Senior Developer');
      });
    });

    describe('DELETE /api/users/:id/experience/:expId', () => {
      it('should delete experience successfully', async () => {
        const createResponse = await request(app)
          .post(`/api/users/${testUser.id}/experience`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            company: 'Delete Me',
            title: 'Temp Role',
            startDate: '2021-01-01T00:00:00.000Z',
            current: false,
            endDate: '2021-06-01T00:00:00.000Z'
          });

        const expId = createResponse.body.data.experience.id;

        await request(app)
          .delete(`/api/users/${testUser.id}/experience/${expId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);
      });
    });
  });

  describe('Education Management', () => {
    describe('POST /api/users/:id/education', () => {
      it('should create education successfully', async () => {
        const educationData = {
          institution: 'University of Technology',
          degree: 'Bachelor of Science',
          fieldOfStudy: 'Computer Science',
          startDate: '2014-09-01T00:00:00.000Z',
          endDate: '2018-06-01T00:00:00.000Z',
          gpa: 3.8
        };

        const response = await request(app)
          .post(`/api/users/${testUser.id}/education`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(educationData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.education.institution).toBe('University of Technology');
        expect(parseFloat(response.body.data.education.gpa)).toBe(3.8);
      });

      it('should validate GPA range', async () => {
        const invalidEducation = {
          institution: 'Test University',
          degree: 'BS',
          startDate: '2014-09-01T00:00:00.000Z',
          gpa: 5.0 // Invalid: must be 0-4.0
        };

        const response = await request(app)
          .post(`/api/users/${testUser.id}/education`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(invalidEducation)
          .expect(400);

        expect(response.body.success).toBe(false);
      });

      it('should validate date ranges', async () => {
        const invalidEducation = {
          institution: 'Test University',
          degree: 'BS',
          startDate: '2020-01-01T00:00:00.000Z',
          endDate: '2018-01-01T00:00:00.000Z' // End before start
        };

        const response = await request(app)
          .post(`/api/users/${testUser.id}/education`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(invalidEducation)
          .expect(400);

        expect(response.body.success).toBe(false);
      });
    });

    describe('GET /api/users/:id/education', () => {
      it('should get all education for user', async () => {
        const educations = [
          {
            institution: 'High School',
            degree: 'Diploma',
            startDate: '2010-09-01T00:00:00.000Z',
            endDate: '2014-06-01T00:00:00.000Z'
          },
          {
            institution: 'University',
            degree: 'Bachelor',
            startDate: '2014-09-01T00:00:00.000Z',
            endDate: '2018-06-01T00:00:00.000Z'
          }
        ];

        for (const edu of educations) {
          await request(app)
            .post(`/api/users/${testUser.id}/education`)
            .set('Authorization', `Bearer ${authToken}`)
            .send(edu);
        }

        const response = await request(app)
          .get(`/api/users/${testUser.id}/education`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.education).toHaveLength(2);
      });
    });

    describe('PUT /api/users/:id/education/:eduId', () => {
      it('should update education successfully', async () => {
        const createResponse = await request(app)
          .post(`/api/users/${testUser.id}/education`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            institution: 'Old University',
            degree: 'BS',
            startDate: '2014-09-01T00:00:00.000Z'
          });

        const eduId = createResponse.body.data.education.id;

        const updateData = {
          degree: 'Bachelor of Science',
          gpa: 3.9
        };

        const response = await request(app)
          .put(`/api/users/${testUser.id}/education/${eduId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(updateData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.education.degree).toBe('Bachelor of Science');
      });
    });

    describe('DELETE /api/users/:id/education/:eduId', () => {
      it('should delete education successfully', async () => {
        const createResponse = await request(app)
          .post(`/api/users/${testUser.id}/education`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            institution: 'Delete Me',
            degree: 'Certificate',
            startDate: '2020-01-01T00:00:00.000Z'
          });

        const eduId = createResponse.body.data.education.id;

        await request(app)
          .delete(`/api/users/${testUser.id}/education/${eduId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);
      });
    });
  });

  describe('Career Goals Management', () => {
    describe('POST /api/users/:id/career-goals', () => {
      it('should create career goal successfully', async () => {
        const goalData = {
          targetRole: 'Senior Software Engineer',
          targetCompanies: ['Google', 'Microsoft', 'Amazon'],
          targetSalary: 150000,
          timeframe: '6 months',
          requiredSkills: ['System Design', 'Leadership', 'Cloud Architecture'],
          skillGaps: ['System Design', 'Leadership']
        };

        const response = await request(app)
          .post(`/api/users/${testUser.id}/career-goals`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(goalData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.careerGoal.target_role).toBe('Senior Software Engineer');
        expect(response.body.data.careerGoal.target_companies).toHaveLength(3);
      });

      it('should require target role', async () => {
        const invalidGoal = {
          targetSalary: 100000
          // Missing targetRole
        };

        const response = await request(app)
          .post(`/api/users/${testUser.id}/career-goals`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(invalidGoal)
          .expect(400);

        expect(response.body.success).toBe(false);
      });
    });

    describe('GET /api/users/:id/career-goals', () => {
      it('should get all career goals for user', async () => {
        const goals = [
          {
            targetRole: 'Tech Lead',
            timeframe: '1 year'
          },
          {
            targetRole: 'Engineering Manager',
            timeframe: '2 years'
          }
        ];

        for (const goal of goals) {
          await request(app)
            .post(`/api/users/${testUser.id}/career-goals`)
            .set('Authorization', `Bearer ${authToken}`)
            .send(goal);
        }

        const response = await request(app)
          .get(`/api/users/${testUser.id}/career-goals`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.careerGoals).toHaveLength(2);
      });
    });

    describe('PUT /api/users/:id/career-goals/:goalId', () => {
      it('should update career goal successfully', async () => {
        const createResponse = await request(app)
          .post(`/api/users/${testUser.id}/career-goals`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            targetRole: 'Staff Engineer',
            timeframe: '1 year'
          });

        const goalId = createResponse.body.data.careerGoal.id;

        const updateData = {
          targetSalary: 180000,
          skillGaps: ['Distributed Systems', 'Mentoring']
        };

        const response = await request(app)
          .put(`/api/users/${testUser.id}/career-goals/${goalId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(updateData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.careerGoal.target_salary).toBe(180000);
      });
    });

    describe('DELETE /api/users/:id/career-goals/:goalId', () => {
      it('should delete career goal successfully', async () => {
        const createResponse = await request(app)
          .post(`/api/users/${testUser.id}/career-goals`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            targetRole: 'Delete This',
            timeframe: '6 months'
          });

        const goalId = createResponse.body.data.careerGoal.id;

        await request(app)
          .delete(`/api/users/${testUser.id}/career-goals/${goalId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);
      });
    });
  });

  describe('Complete Profile Flow', () => {
    it('should create a complete profile with all components', async () => {
      // 1. Update profile
      await request(app)
        .put(`/api/users/${testUser.id}/profile`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          professionalHeadline: 'Full Stack Developer',
          preferences: {
            jobTypes: ['full-time'],
            remotePreference: 'hybrid',
            salaryMin: 80000
          }
        })
        .expect(200);

      // 2. Add skills
      await request(app)
        .post(`/api/users/${testUser.id}/skills`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'JavaScript', proficiencyLevel: 5, yearsOfExperience: 6 });

      await request(app)
        .post(`/api/users/${testUser.id}/skills`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'React', proficiencyLevel: 4, yearsOfExperience: 4 });

      // 3. Add experience
      await request(app)
        .post(`/api/users/${testUser.id}/experience`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          company: 'Tech Startup',
          title: 'Full Stack Developer',
          startDate: '2020-01-01T00:00:00.000Z',
          current: true,
          skills: ['JavaScript', 'React', 'Node.js']
        });

      // 4. Add education
      await request(app)
        .post(`/api/users/${testUser.id}/education`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          institution: 'Tech University',
          degree: 'BS Computer Science',
          startDate: '2014-09-01T00:00:00.000Z',
          endDate: '2018-06-01T00:00:00.000Z',
          gpa: 3.7
        });

      // 5. Add career goal
      await request(app)
        .post(`/api/users/${testUser.id}/career-goals`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          targetRole: 'Senior Full Stack Developer',
          targetSalary: 120000,
          timeframe: '1 year'
        });

      // Verify complete profile
      const profileResponse = await request(app)
        .get(`/api/users/${testUser.id}/profile`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const skillsResponse = await request(app)
        .get(`/api/users/${testUser.id}/skills`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const experienceResponse = await request(app)
        .get(`/api/users/${testUser.id}/experience`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const educationResponse = await request(app)
        .get(`/api/users/${testUser.id}/education`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const goalsResponse = await request(app)
        .get(`/api/users/${testUser.id}/career-goals`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(profileResponse.body.data.profile.professional_headline).toBe('Full Stack Developer');
      expect(skillsResponse.body.data.skills).toHaveLength(2);
      expect(experienceResponse.body.data.experience).toHaveLength(1);
      expect(educationResponse.body.data.education).toHaveLength(1);
      expect(goalsResponse.body.data.careerGoals).toHaveLength(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Try to create skill with invalid user ID
      const invalidToken = jwt.sign(
        { userId: '00000000-0000-0000-0000-000000000000', email: 'fake@test.com' },
        config.jwt.secret,
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .post('/api/users/00000000-0000-0000-0000-000000000000/skills')
        .set('Authorization', `Bearer ${invalidToken}`)
        .send({ name: 'Test', proficiencyLevel: 3, yearsOfExperience: 2 });

      // Should handle error (either 500 or 404 depending on implementation)
      expect([404, 500]).toContain(response.status);
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post(`/api/users/${testUser.id}/skills`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Test' }) // Missing required fields
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});
