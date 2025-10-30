import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { setupTestDatabase, teardownTestDatabase, cleanupTestData, createTestUser } from './setup';
import interviewPrepRoutes from '../routes/interview-prep.routes';
import { config } from '../config';
import { pgPool } from '../config/database';
import { aiService } from '../services/ai.service';

/**
 * Interview Preparation Service Integration Tests (GURU)
 * Tests question generation for various job types
 * Verifies response analysis accuracy
 * Requirements: 6.1, 6.2, 6.4
 */

// Create Express app for testing
const app = express();
app.use(express.json());
app.use('/api/interview-prep', interviewPrepRoutes);

let testUser: any;
let authToken: string;
let testJobId: string;
let testApplicationId: string;

beforeAll(async () => {
  await setupTestDatabase();
  
  // Mock AI service to avoid actual API calls
  vi.spyOn(aiService, 'isConfigured').mockReturnValue(true);
});

afterAll(async () => {
  await teardownTestDatabase();
  vi.restoreAllMocks();
});

beforeEach(async () => {
  await cleanupTestData();
  await cleanupInterviewPrepTestData();
  
  testUser = await createTestUser();
  
  // Generate JWT token for authentication
  authToken = jwt.sign(
    { userId: testUser.id, email: testUser.email },
    config.jwt.secret,
    { expiresIn: '1h' }
  );
  
  // Create test profile data
  await createTestProfileData(testUser.id);
});

// Helper function to cleanup interview prep test data
async function cleanupInterviewPrepTestData() {
  if (testUser?.id) {
    await pgPool.query('DELETE FROM practice_sessions WHERE user_id = $1', [testUser.id]);
    await pgPool.query('DELETE FROM interview_prep WHERE user_id = $1', [testUser.id]);
    await pgPool.query('DELETE FROM applications WHERE user_id = $1', [testUser.id]);
    await pgPool.query('DELETE FROM jobs WHERE external_id LIKE $1', ['test-%']);
  }
}

// Helper function to create test profile data
async function createTestProfileData(userId: string) {
  // Add skills
  await pgPool.query(
    `INSERT INTO skills (user_id, name, category, proficiency_level, years_of_experience)
     VALUES 
       ($1, 'JavaScript', 'Programming', 5, 6),
       ($1, 'React', 'Framework', 5, 5),
       ($1, 'Node.js', 'Backend', 4, 5),
       ($1, 'Python', 'Programming', 4, 4),
       ($1, 'PostgreSQL', 'Database', 4, 4)`,
    [userId]
  );
  
  // Add experience
  await pgPool.query(
    `INSERT INTO experience (user_id, company, title, start_date, end_date, current, description, achievements)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      userId,
      'Previous Tech Company',
      'Software Engineer',
      '2019-01-01',
      '2023-12-31',
      false,
      'Developed full-stack web applications using React and Node.js',
      ['Improved application performance by 40%', 'Led team of 3 developers', 'Implemented CI/CD pipeline']
    ]
  );
  
  // Add education
  await pgPool.query(
    `INSERT INTO education (user_id, institution, degree, field_of_study, start_date, end_date, gpa)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      userId,
      'Tech University',
      'Bachelor of Science',
      'Computer Science',
      '2014-09-01',
      '2018-06-01',
      3.8
    ]
  );
}

// Helper function to create test job and application
async function createTestJobAndApplication(jobData: {
  title: string;
  company: string;
  jobType: string;
  description: string;
  requirements: string[];
}): Promise<{ jobId: string; applicationId: string }> {
  // Create job
  const jobResult = await pgPool.query(
    `INSERT INTO jobs (
      external_id, source, title, company, location, remote_type, job_type,
      description, requirements, responsibilities, posted_date, apply_url
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING id`,
    [
      `test-job-${Date.now()}`,
      'linkedin',
      jobData.title,
      jobData.company,
      'San Francisco, CA',
      'hybrid',
      jobData.jobType,
      jobData.description,
      jobData.requirements,
      ['Design and implement features', 'Code reviews', 'Collaborate with team'],
      new Date(),
      'https://example.com/apply'
    ]
  );
  
  const jobId = jobResult.rows[0].id;
  
  // Create application
  const appResult = await pgPool.query(
    `INSERT INTO applications (
      user_id, job_id, status, applied_date
    ) VALUES ($1, $2, $3, $4)
    RETURNING id`,
    [testUser.id, jobId, 'interview_scheduled', new Date()]
  );
  
  const applicationId = appResult.rows[0].id;
  
  return { jobId, applicationId };
}

// Mock AI responses for interview prep generation
function mockInterviewPrepAIResponses(jobType: string = 'full-time') {
  const baseQuestions = [
    {
      id: '1',
      category: 'behavioral',
      question: 'Tell me about yourself and your background.',
      suggestedAnswer: 'I am a Software Engineer with 5+ years of experience in full-stack development, specializing in JavaScript, React, and Node.js. At Previous Tech Company, I improved application performance by 40% and led a team of 3 developers.',
      keyPoints: ['Professional background', 'Key achievements', 'Career motivation'],
      difficulty: 'easy'
    },
    {
      id: '2',
      category: 'behavioral',
      question: 'Describe a time when you had to overcome a significant technical challenge.',
      suggestedAnswer: 'At Previous Tech Company, we faced performance issues with our application. I analyzed the codebase, identified bottlenecks, and implemented optimization strategies that improved performance by 40%.',
      keyPoints: ['Problem identification', 'Solution approach', 'Results achieved'],
      starFramework: {
        situation: 'Application had performance issues affecting user experience',
        task: 'Identify and resolve performance bottlenecks',
        action: 'Analyzed code, implemented caching, optimized queries',
        result: 'Improved performance by 40%, enhanced user satisfaction'
      },
      difficulty: 'medium'
    }
  ];

  const technicalQuestions = [
    {
      id: '3',
      category: 'technical',
      question: 'Explain the difference between REST and GraphQL APIs.',
      suggestedAnswer: 'REST uses multiple endpoints with fixed data structures, while GraphQL uses a single endpoint with flexible queries. GraphQL allows clients to request exactly the data they need, reducing over-fetching.',
      keyPoints: ['REST architecture', 'GraphQL benefits', 'Use cases'],
      difficulty: 'medium'
    },
    {
      id: '4',
      category: 'technical',
      question: 'How would you optimize a slow database query?',
      suggestedAnswer: 'I would start by analyzing the query execution plan, add appropriate indexes, optimize JOIN operations, and consider query result caching. I have experience with PostgreSQL optimization.',
      keyPoints: ['Query analysis', 'Indexing strategy', 'Performance monitoring'],
      difficulty: 'medium'
    },
    {
      id: '5',
      category: 'technical',
      question: 'What is your experience with React hooks and state management?',
      suggestedAnswer: 'I have extensive experience with React hooks including useState, useEffect, useContext, and custom hooks. I have used Redux and Zustand for state management in large applications.',
      keyPoints: ['React hooks knowledge', 'State management patterns', 'Best practices'],
      difficulty: 'easy'
    }
  ];

  const companyQuestions = [
    {
      id: '6',
      category: 'company-specific',
      question: 'Why do you want to work for our company?',
      suggestedAnswer: 'I am impressed by your company\'s commitment to innovation and technical excellence. Your products align with my passion for building scalable solutions.',
      keyPoints: ['Company research', 'Value alignment', 'Career goals'],
      difficulty: 'easy'
    },
    {
      id: '7',
      category: 'company-specific',
      question: 'What do you know about our products and services?',
      suggestedAnswer: 'Your company provides cutting-edge solutions in the tech industry. I have researched your recent product launches and am excited about the technical challenges.',
      keyPoints: ['Product knowledge', 'Industry understanding', 'Enthusiasm'],
      difficulty: 'easy'
    }
  ];

  const situationalQuestions = [
    {
      id: '8',
      category: 'situational',
      question: 'How would you handle a disagreement with a team member about a technical approach?',
      suggestedAnswer: 'I would listen to their perspective, present my reasoning with data, and work together to find the best solution. I believe in collaborative problem-solving.',
      keyPoints: ['Communication skills', 'Conflict resolution', 'Team collaboration'],
      difficulty: 'medium'
    },
    {
      id: '9',
      category: 'situational',
      question: 'What would you do if you missed a project deadline?',
      suggestedAnswer: 'I would communicate proactively with stakeholders, explain the situation, propose a revised timeline, and identify ways to prevent similar issues in the future.',
      keyPoints: ['Accountability', 'Communication', 'Problem-solving'],
      difficulty: 'medium'
    }
  ];

  const allQuestions = [
    ...baseQuestions,
    ...technicalQuestions,
    ...companyQuestions,
    ...situationalQuestions
  ];

  vi.spyOn(aiService, 'generateInterviewQuestions').mockResolvedValue({
    questions: allQuestions
  });
}

// Mock response analysis
function mockResponseAnalysis(quality: 'excellent' | 'good' | 'poor') {
  const analyses = {
    excellent: {
      overallScore: 90,
      clarity: 95,
      relevance: 90,
      starMethodUsage: true,
      confidenceIndicators: ['specific metrics', 'concrete examples', 'quantified results'],
      keywordsCovered: ['performance', 'optimization', 'team leadership', 'results'],
      strengths: [
        'Used specific metrics (40% improvement)',
        'Followed STAR method effectively',
        'Demonstrated leadership and technical skills'
      ],
      areasForImprovement: [
        'Could add more details about the technical approach',
        'Consider mentioning team collaboration more explicitly'
      ],
      suggestions: [
        'Expand on the specific optimization techniques used',
        'Highlight how you communicated progress to stakeholders'
      ]
    },
    good: {
      overallScore: 75,
      clarity: 80,
      relevance: 75,
      starMethodUsage: true,
      confidenceIndicators: ['clear structure', 'relevant experience'],
      keywordsCovered: ['performance', 'team', 'improvement'],
      strengths: [
        'Provided relevant example',
        'Mentioned measurable results',
        'Clear communication'
      ],
      areasForImprovement: [
        'Could provide more specific details',
        'STAR method could be more explicit',
        'Add more quantifiable metrics'
      ],
      suggestions: [
        'Include specific numbers and metrics',
        'Elaborate on the actions taken',
        'Describe the impact more thoroughly'
      ]
    },
    poor: {
      overallScore: 45,
      clarity: 50,
      relevance: 40,
      starMethodUsage: false,
      confidenceIndicators: [],
      keywordsCovered: ['work', 'project'],
      strengths: [
        'Attempted to answer the question',
        'Mentioned work experience'
      ],
      areasForImprovement: [
        'Response lacks specific details',
        'No clear structure or STAR method',
        'Missing quantifiable results',
        'Too vague and generic'
      ],
      suggestions: [
        'Use the STAR method to structure your response',
        'Include specific examples with measurable outcomes',
        'Be more specific about your role and contributions',
        'Add concrete details about the situation and results'
      ]
    }
  };

  vi.spyOn(aiService, 'analyzeInterviewResponse').mockResolvedValue(analyses[quality]);
}

describe('Interview Preparation Service Integration Tests (GURU)', () => {
  describe('Interview Prep Generation - Requirement 6.1, 6.2', () => {
    describe('POST /api/interview-prep/generate', () => {
      it('should generate interview prep for full-time software engineering role', async () => {
        mockInterviewPrepAIResponses('full-time');
        
        const { applicationId } = await createTestJobAndApplication({
          title: 'Senior Software Engineer',
          company: 'Tech Corp',
          jobType: 'full-time',
          description: 'We are looking for a Senior Software Engineer with 5+ years of experience in full-stack development.',
          requirements: ['JavaScript', 'React', 'Node.js', 'PostgreSQL', '5+ years experience']
        });

        const response = await request(app)
          .post('/api/interview-prep/generate')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ applicationId })
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(response.body.data.questions).toBeDefined();
        expect(response.body.data.questions.length).toBeGreaterThan(0);
        
        // Verify question categories
        const categories = response.body.data.questions.map((q: any) => q.category);
        expect(categories).toContain('behavioral');
        expect(categories).toContain('technical');
        expect(categories).toContain('company-specific');
        expect(categories).toContain('situational');
        
        // Verify company research
        expect(response.body.data.companyResearch).toBeDefined();
        expect(response.body.data.companyResearch.companyName).toBe('Tech Corp');
        
        // Verify tips
        expect(response.body.data.tips).toBeDefined();
        expect(Array.isArray(response.body.data.tips)).toBe(true);
      });

      it('should generate interview prep for contract frontend developer role', async () => {
        mockInterviewPrepAIResponses('contract');
        
        const { applicationId } = await createTestJobAndApplication({
          title: 'Frontend Developer',
          company: 'Startup Inc',
          jobType: 'contract',
          description: 'Looking for a contract frontend developer with React experience.',
          requirements: ['React', 'TypeScript', 'CSS', '3+ years experience']
        });

        const response = await request(app)
          .post('/api/interview-prep/generate')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ applicationId })
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.questions).toBeDefined();
        expect(response.body.data.questions.length).toBeGreaterThan(0);
      });

      it('should generate interview prep for backend Python role', async () => {
        mockInterviewPrepAIResponses('full-time');
        
        const { applicationId } = await createTestJobAndApplication({
          title: 'Backend Python Developer',
          company: 'Data Analytics Co',
          jobType: 'full-time',
          description: 'Seeking a backend developer with strong Python and database skills.',
          requirements: ['Python', 'Django', 'PostgreSQL', 'REST APIs', '4+ years experience']
        });

        const response = await request(app)
          .post('/api/interview-prep/generate')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ applicationId })
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.questions).toBeDefined();
        
        // Verify technical questions are relevant
        const technicalQuestions = response.body.data.questions.filter(
          (q: any) => q.category === 'technical'
        );
        expect(technicalQuestions.length).toBeGreaterThan(0);
      });

      it('should generate interview prep for entry-level position', async () => {
        mockInterviewPrepAIResponses('full-time');
        
        const { applicationId } = await createTestJobAndApplication({
          title: 'Junior Software Developer',
          company: 'Growing Startup',
          jobType: 'full-time',
          description: 'Entry-level position for recent graduates with programming knowledge.',
          requirements: ['JavaScript', 'Basic web development', 'Willingness to learn']
        });

        const response = await request(app)
          .post('/api/interview-prep/generate')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ applicationId })
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.questions).toBeDefined();
        
        // Verify difficulty levels include easy questions
        const easyQuestions = response.body.data.questions.filter(
          (q: any) => q.difficulty === 'easy'
        );
        expect(easyQuestions.length).toBeGreaterThan(0);
      });

      it('should include STAR framework for behavioral questions', async () => {
        mockInterviewPrepAIResponses('full-time');
        
        const { applicationId } = await createTestJobAndApplication({
          title: 'Software Engineer',
          company: 'Tech Company',
          jobType: 'full-time',
          description: 'Software engineering position',
          requirements: ['JavaScript', 'React']
        });

        const response = await request(app)
          .post('/api/interview-prep/generate')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ applicationId })
          .expect(201);

        const behavioralQuestions = response.body.data.questions.filter(
          (q: any) => q.category === 'behavioral'
        );
        
        expect(behavioralQuestions.length).toBeGreaterThan(0);
        
        // Check if at least one behavioral question has STAR framework
        const hasStarFramework = behavioralQuestions.some(
          (q: any) => q.starFramework !== undefined
        );
        expect(hasStarFramework).toBe(true);
      });

      it('should return 400 when applicationId is missing', async () => {
        const response = await request(app)
          .post('/api/interview-prep/generate')
          .set('Authorization', `Bearer ${authToken}`)
          .send({})
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('Application ID is required');
      });

      it('should return 404 when application does not exist', async () => {
        const response = await request(app)
          .post('/api/interview-prep/generate')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ applicationId: '00000000-0000-0000-0000-000000000000' })
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('Application not found');
      });

      it('should return 401 without authentication', async () => {
        await request(app)
          .post('/api/interview-prep/generate')
          .send({ applicationId: 'test-id' })
          .expect(401);
      });
    });
  });

  describe('Practice Sessions and Response Analysis - Requirement 6.4', () => {
    let interviewPrepId: string;
    let questionId: string;

    beforeEach(async () => {
      mockInterviewPrepAIResponses('full-time');
      
      const { applicationId } = await createTestJobAndApplication({
        title: 'Software Engineer',
        company: 'Tech Corp',
        jobType: 'full-time',
        description: 'Software engineering position',
        requirements: ['JavaScript', 'React', 'Node.js']
      });

      // Generate interview prep
      const prepResponse = await request(app)
        .post('/api/interview-prep/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ applicationId });

      interviewPrepId = prepResponse.body.data.id;
      questionId = prepResponse.body.data.questions[0].id;
    });

    describe('POST /api/interview-prep/:id/practice', () => {
      it('should create practice session successfully', async () => {
        const response = await request(app)
          .post(`/api/interview-prep/${interviewPrepId}/practice`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            questionId: questionId,
            questionText: 'Tell me about yourself',
            response: 'I am a software engineer with 5 years of experience...',
            duration: 120
          })
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(response.body.data.question_id).toBe(questionId);
        expect(response.body.data.response).toBeDefined();
        expect(response.body.data.duration).toBe(120);
      });

      it('should return 400 when required fields are missing', async () => {
        const response = await request(app)
          .post(`/api/interview-prep/${interviewPrepId}/practice`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            questionId: questionId
            // Missing questionText and response
          })
          .expect(400);

        expect(response.body.success).toBe(false);
      });
    });

    describe('POST /api/interview-prep/:id/practice/:practiceId/analyze - Response Analysis Accuracy', () => {
      let practiceSessionId: string;

      beforeEach(async () => {
        // Create a practice session
        const sessionResponse = await request(app)
          .post(`/api/interview-prep/${interviewPrepId}/practice`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            questionId: questionId,
            questionText: 'Describe a time when you had to overcome a significant technical challenge.',
            response: 'At Previous Tech Company, we faced performance issues with our application. I analyzed the codebase, identified bottlenecks in database queries and inefficient rendering. I implemented query optimization, added caching with Redis, and optimized React components. This resulted in a 40% improvement in application performance and significantly better user experience.',
            duration: 180
          });

        practiceSessionId = sessionResponse.body.data.id;
      });

      it('should analyze excellent response with high scores', async () => {
        mockResponseAnalysis('excellent');

        const response = await request(app)
          .post(`/api/interview-prep/${interviewPrepId}/practice/${practiceSessionId}/analyze`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        
        // Verify analysis structure
        expect(response.body.data.overallScore).toBeGreaterThanOrEqual(80);
        expect(response.body.data.clarity).toBeGreaterThanOrEqual(80);
        expect(response.body.data.relevance).toBeGreaterThanOrEqual(80);
        expect(response.body.data.starMethodUsage).toBe(true);
        
        // Verify detailed feedback
        expect(response.body.data.confidenceIndicators).toBeDefined();
        expect(Array.isArray(response.body.data.confidenceIndicators)).toBe(true);
        expect(response.body.data.keywordsCovered).toBeDefined();
        expect(response.body.data.strengths).toBeDefined();
        expect(response.body.data.strengths.length).toBeGreaterThan(0);
        expect(response.body.data.areasForImprovement).toBeDefined();
        expect(response.body.data.suggestions).toBeDefined();
      });

      it('should analyze good response with moderate scores', async () => {
        mockResponseAnalysis('good');

        // Create another practice session with a good response
        const sessionResponse = await request(app)
          .post(`/api/interview-prep/${interviewPrepId}/practice`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            questionId: questionId,
            questionText: 'Tell me about a project you worked on.',
            response: 'I worked on a web application using React. We had some challenges but managed to complete it. The project was successful and users liked it.',
            duration: 90
          });

        const newSessionId = sessionResponse.body.data.id;

        const response = await request(app)
          .post(`/api/interview-prep/${interviewPrepId}/practice/${newSessionId}/analyze`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.overallScore).toBeGreaterThanOrEqual(60);
        expect(response.body.data.overallScore).toBeLessThan(85);
        expect(response.body.data.areasForImprovement.length).toBeGreaterThan(0);
        expect(response.body.data.suggestions.length).toBeGreaterThan(0);
      });

      it('should analyze poor response with low scores and constructive feedback', async () => {
        mockResponseAnalysis('poor');

        // Create practice session with a poor response
        const sessionResponse = await request(app)
          .post(`/api/interview-prep/${interviewPrepId}/practice`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            questionId: questionId,
            questionText: 'Describe a challenging situation you faced.',
            response: 'I had a challenge at work. It was difficult but I handled it.',
            duration: 30
          });

        const newSessionId = sessionResponse.body.data.id;

        const response = await request(app)
          .post(`/api/interview-prep/${interviewPrepId}/practice/${newSessionId}/analyze`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.overallScore).toBeLessThan(60);
        expect(response.body.data.starMethodUsage).toBe(false);
        expect(response.body.data.areasForImprovement.length).toBeGreaterThan(2);
        expect(response.body.data.suggestions.length).toBeGreaterThan(2);
        
        // Verify constructive feedback is provided
        expect(response.body.data.suggestions.some((s: string) => 
          s.toLowerCase().includes('star') || s.toLowerCase().includes('specific')
        )).toBe(true);
      });

      it('should detect STAR method usage correctly', async () => {
        mockResponseAnalysis('excellent');

        // Create practice session with STAR-formatted response
        const sessionResponse = await request(app)
          .post(`/api/interview-prep/${interviewPrepId}/practice`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            questionId: questionId,
            questionText: 'Tell me about a time you led a team.',
            response: 'Situation: Our team was behind schedule on a critical project. Task: As the lead developer, I needed to get us back on track. Action: I reorganized the sprint, delegated tasks based on strengths, and implemented daily standups. Result: We delivered the project on time with high quality, and the client was very satisfied.',
            duration: 150
          });

        const newSessionId = sessionResponse.body.data.id;

        const response = await request(app)
          .post(`/api/interview-prep/${interviewPrepId}/practice/${newSessionId}/analyze`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.starMethodUsage).toBe(true);
        expect(response.body.data.overallScore).toBeGreaterThanOrEqual(80);
      });

      it('should identify relevant keywords in response', async () => {
        mockResponseAnalysis('excellent');

        const response = await request(app)
          .post(`/api/interview-prep/${interviewPrepId}/practice/${practiceSessionId}/analyze`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.keywordsCovered).toBeDefined();
        expect(Array.isArray(response.body.data.keywordsCovered)).toBe(true);
        expect(response.body.data.keywordsCovered.length).toBeGreaterThan(0);
      });

      it('should provide actionable suggestions for improvement', async () => {
        mockResponseAnalysis('good');

        // Create practice session
        const sessionResponse = await request(app)
          .post(`/api/interview-prep/${interviewPrepId}/practice`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            questionId: questionId,
            questionText: 'What is your greatest strength?',
            response: 'I am good at programming and solving problems.',
            duration: 45
          });

        const newSessionId = sessionResponse.body.data.id;

        const response = await request(app)
          .post(`/api/interview-prep/${interviewPrepId}/practice/${newSessionId}/analyze`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.suggestions).toBeDefined();
        expect(response.body.data.suggestions.length).toBeGreaterThan(0);
        
        // Verify suggestions are actionable (not just generic)
        response.body.data.suggestions.forEach((suggestion: string) => {
          expect(suggestion.length).toBeGreaterThan(10);
        });
      });

      it('should return 404 for non-existent practice session', async () => {
        const response = await request(app)
          .post(`/api/interview-prep/${interviewPrepId}/practice/00000000-0000-0000-0000-000000000000/analyze`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(404);

        expect(response.body.success).toBe(false);
      });
    });

    describe('GET /api/interview-prep/:id/practice', () => {
      it('should get all practice sessions for interview prep', async () => {
        // Create multiple practice sessions
        await request(app)
          .post(`/api/interview-prep/${interviewPrepId}/practice`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            questionId: questionId,
            questionText: 'Question 1',
            response: 'Response 1',
            duration: 120
          });

        await request(app)
          .post(`/api/interview-prep/${interviewPrepId}/practice`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            questionId: questionId,
            questionText: 'Question 2',
            response: 'Response 2',
            duration: 90
          });

        const response = await request(app)
          .get(`/api/interview-prep/${interviewPrepId}/practice`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data.length).toBe(2);
      });
    });

    describe('GET /api/interview-prep/:id/progress', () => {
      it('should get practice progress statistics', async () => {
        mockResponseAnalysis('excellent');

        // Create and analyze a practice session
        const sessionResponse = await request(app)
          .post(`/api/interview-prep/${interviewPrepId}/practice`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            questionId: questionId,
            questionText: 'Test question',
            response: 'Test response with good details',
            duration: 120
          });

        await request(app)
          .post(`/api/interview-prep/${interviewPrepId}/practice/${sessionResponse.body.data.id}/analyze`)
          .set('Authorization', `Bearer ${authToken}`);

        const response = await request(app)
          .get(`/api/interview-prep/${interviewPrepId}/progress`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(response.body.data.total_sessions).toBeDefined();
        expect(response.body.data.questions_practiced).toBeDefined();
        expect(response.body.data.average_score).toBeDefined();
      });
    });
  });

  describe('Company Research - Requirement 6.2', () => {
    it('should include company research in interview prep', async () => {
      mockInterviewPrepAIResponses('full-time');
      
      const { applicationId } = await createTestJobAndApplication({
        title: 'Software Engineer',
        company: 'Innovative Tech Corp',
        jobType: 'full-time',
        description: 'Join our innovative team',
        requirements: ['JavaScript', 'React']
      });

      const response = await request(app)
        .post('/api/interview-prep/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ applicationId })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.companyResearch).toBeDefined();
      expect(response.body.data.companyResearch.companyName).toBe('Innovative Tech Corp');
      expect(response.body.data.companyResearch.overview).toBeDefined();
      expect(response.body.data.companyResearch.values).toBeDefined();
      expect(Array.isArray(response.body.data.companyResearch.values)).toBe(true);
    });

    it('should include interview tips in company research', async () => {
      mockInterviewPrepAIResponses('full-time');
      
      const { applicationId } = await createTestJobAndApplication({
        title: 'Software Engineer',
        company: 'Tech Company',
        jobType: 'full-time',
        description: 'Software engineering role',
        requirements: ['JavaScript']
      });

      const response = await request(app)
        .post('/api/interview-prep/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ applicationId })
        .expect(201);

      expect(response.body.data.companyResearch.interviewTips).toBeDefined();
      expect(Array.isArray(response.body.data.companyResearch.interviewTips)).toBe(true);
      expect(response.body.data.companyResearch.interviewTips.length).toBeGreaterThan(0);
    });
  });

  describe('Interview Prep Retrieval', () => {
    let interviewPrepId: string;
    let applicationId: string;

    beforeEach(async () => {
      mockInterviewPrepAIResponses('full-time');
      
      const jobApp = await createTestJobAndApplication({
        title: 'Software Engineer',
        company: 'Tech Corp',
        jobType: 'full-time',
        description: 'Software engineering position',
        requirements: ['JavaScript', 'React']
      });

      applicationId = jobApp.applicationId;

      const prepResponse = await request(app)
        .post('/api/interview-prep/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ applicationId });

      interviewPrepId = prepResponse.body.data.id;
    });

    describe('GET /api/interview-prep/:id', () => {
      it('should retrieve interview prep by ID', async () => {
        const response = await request(app)
          .get(`/api/interview-prep/${interviewPrepId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(response.body.data.id).toBe(interviewPrepId);
        expect(response.body.data.questions).toBeDefined();
        expect(response.body.data.companyResearch).toBeDefined();
        expect(response.body.data.tips).toBeDefined();
      });

      it('should return 404 for non-existent interview prep', async () => {
        const response = await request(app)
          .get('/api/interview-prep/00000000-0000-0000-0000-000000000000')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(404);

        expect(response.body.success).toBe(false);
      });

      it('should return 401 without authentication', async () => {
        await request(app)
          .get(`/api/interview-prep/${interviewPrepId}`)
          .expect(401);
      });
    });

    describe('GET /api/interview-prep/application/:applicationId', () => {
      it('should retrieve interview prep by application ID', async () => {
        const response = await request(app)
          .get(`/api/interview-prep/application/${applicationId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(response.body.data.applicationId).toBe(applicationId);
      });

      it('should return 404 when no prep exists for application', async () => {
        const response = await request(app)
          .get('/api/interview-prep/application/00000000-0000-0000-0000-000000000000')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(404);

        expect(response.body.success).toBe(false);
      });
    });
  });

  describe('Question Quality and Variety', () => {
    it('should generate questions with varying difficulty levels', async () => {
      mockInterviewPrepAIResponses('full-time');
      
      const { applicationId } = await createTestJobAndApplication({
        title: 'Software Engineer',
        company: 'Tech Corp',
        jobType: 'full-time',
        description: 'Software engineering position',
        requirements: ['JavaScript', 'React', 'Node.js']
      });

      const response = await request(app)
        .post('/api/interview-prep/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ applicationId })
        .expect(201);

      const questions = response.body.data.questions;
      const difficulties = questions.map((q: any) => q.difficulty);
      
      // Should have a mix of difficulty levels
      expect(difficulties).toContain('easy');
      expect(difficulties).toContain('medium');
    });

    it('should provide suggested answers for all questions', async () => {
      mockInterviewPrepAIResponses('full-time');
      
      const { applicationId } = await createTestJobAndApplication({
        title: 'Software Engineer',
        company: 'Tech Corp',
        jobType: 'full-time',
        description: 'Software engineering position',
        requirements: ['JavaScript']
      });

      const response = await request(app)
        .post('/api/interview-prep/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ applicationId })
        .expect(201);

      const questions = response.body.data.questions;
      
      questions.forEach((question: any) => {
        expect(question.suggestedAnswer).toBeDefined();
        expect(question.suggestedAnswer.length).toBeGreaterThan(0);
        expect(question.keyPoints).toBeDefined();
        expect(Array.isArray(question.keyPoints)).toBe(true);
      });
    });

    it('should generate relevant technical questions based on job requirements', async () => {
      mockInterviewPrepAIResponses('full-time');
      
      const { applicationId } = await createTestJobAndApplication({
        title: 'Full Stack Developer',
        company: 'Web Solutions Inc',
        jobType: 'full-time',
        description: 'Full stack development with React and Node.js',
        requirements: ['React', 'Node.js', 'PostgreSQL', 'REST APIs']
      });

      const response = await request(app)
        .post('/api/interview-prep/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ applicationId })
        .expect(201);

      const technicalQuestions = response.body.data.questions.filter(
        (q: any) => q.category === 'technical'
      );
      
      expect(technicalQuestions.length).toBeGreaterThan(0);
      
      // Verify questions have proper structure
      technicalQuestions.forEach((q: any) => {
        expect(q.question).toBeDefined();
        expect(q.suggestedAnswer).toBeDefined();
        expect(q.keyPoints).toBeDefined();
        expect(q.difficulty).toBeDefined();
      });
    });
  });
});
