import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { setupTestDatabase, teardownTestDatabase, cleanupTestData, createTestUser } from './setup';
import documentRoutes from '../routes/document.routes';
import { config } from '../config';
import { pgPool, mongoClient } from '../config/database';
import { aiService } from '../services/ai.service';

/**
 * Document Generation Service Integration Tests
 * Tests end-to-end resume and cover letter generation flows
 * Verifies format exports (PDF, DOCX, TXT)
 * Requirements: 4.1, 4.2, 4.3
 */

// Create Express app for testing
const app = express();
app.use(express.json());
app.use('/api/documents', documentRoutes);

let testUser: any;
let authToken: string;
let testJobId: string;
let testTemplateId: string;

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
  await cleanupMongoTestData();
  
  testUser = await createTestUser();
  
  // Generate JWT token for authentication
  authToken = jwt.sign(
    { userId: testUser.id, email: testUser.email },
    config.jwt.secret,
    { expiresIn: '1h' }
  );
  
  // Create test job
  testJobId = await createTestJob();
  
  // Create test profile data
  await createTestProfileData(testUser.id);
  
  // Create test template
  testTemplateId = await createTestTemplate();
});

// Helper function to cleanup MongoDB test data
async function cleanupMongoTestData() {
  const db = mongoClient.db(process.env.MONGO_DB || 'givemejobs_docs');
  await db.collection('generated_documents').deleteMany({ userId: testUser?.id });
  await db.collection('document_versions').deleteMany({ userId: testUser?.id });
  await db.collection('resume_templates').deleteMany({ name: /test/i });
  await db.collection('cover_letter_templates').deleteMany({ name: /test/i });
}

// Helper function to create test job
async function createTestJob(): Promise<string> {
  const result = await pgPool.query(
    `INSERT INTO jobs (
      external_id, source, title, company, location, remote_type, job_type,
      salary_min, salary_max, description, requirements, responsibilities, posted_date, apply_url
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    RETURNING id`,
    [
      'test-job-123',
      'linkedin',
      'Senior Software Engineer',
      'Tech Corp',
      'San Francisco, CA',
      'hybrid',
      'full-time',
      120000,
      180000,
      'We are looking for a Senior Software Engineer with 5+ years of experience in full-stack development. Must have strong skills in JavaScript, React, Node.js, and PostgreSQL.',
      ['JavaScript', 'React', 'Node.js', 'PostgreSQL', '5+ years experience'],
      ['Design and implement features', 'Code reviews', 'Mentor junior developers'],
      new Date(),
      'https://example.com/apply'
    ]
  );
  
  return result.rows[0].id;
}

// Helper function to create test profile data
async function createTestProfileData(userId: string) {
  // Update profile
  await pgPool.query(
    `UPDATE user_profiles SET phone = $1, location = $2 WHERE user_id = $3`,
    ['+1-555-0123', 'San Francisco, CA', userId]
  );
  
  // Add skills
  await pgPool.query(
    `INSERT INTO skills (user_id, name, category, proficiency_level, years_of_experience)
     VALUES 
       ($1, 'JavaScript', 'Programming', 5, 6),
       ($1, 'React', 'Framework', 5, 5),
       ($1, 'Node.js', 'Backend', 4, 5),
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
      ['Improved application performance by 40%', 'Led team of 3 developers']
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

// Helper function to create test template
async function createTestTemplate(): Promise<string> {
  const db = mongoClient.db(process.env.MONGO_DB || 'givemejobs_docs');
  
  const template = {
    name: 'Test ATS-Friendly Template',
    description: 'A test template for integration tests',
    category: 'ats-friendly',
    sections: [
      { type: 'header', required: true, order: 1 },
      { type: 'summary', required: true, order: 2 },
      { type: 'experience', required: true, order: 3 },
      { type: 'education', required: true, order: 4 },
      { type: 'skills', required: true, order: 5 }
    ],
    styling: {
      fontFamily: 'Arial',
      fontSize: 11,
      spacing: {
        margin: 25,
        sectionGap: 15
      }
    },
    isPublic: true
  };
  
  const result = await db.collection('resume_templates').insertOne(template);
  return result.insertedId.toString();
}

// Mock AI service responses
function mockAIResponses() {
  vi.spyOn(aiService, 'extractJobRequirements').mockResolvedValue([
    'JavaScript',
    'React',
    'Node.js',
    'PostgreSQL',
    '5+ years experience'
  ]);
  
  vi.spyOn(aiService, 'generateResumeContent').mockResolvedValue({
    summary: 'Experienced Software Engineer with 5+ years of expertise in full-stack development, specializing in JavaScript, React, and Node.js. Proven track record of delivering high-quality applications and leading development teams.',
    experience: [
      {
        company: 'Previous Tech Company',
        title: 'Software Engineer',
        period: 'Jan 2019 - Dec 2023',
        description: 'Developed full-stack web applications using React and Node.js, focusing on performance optimization and scalability.',
        achievements: [
          'Improved application performance by 40% through code optimization',
          'Led team of 3 developers in delivering critical features'
        ]
      }
    ],
    skills: ['JavaScript', 'React', 'Node.js', 'PostgreSQL', 'TypeScript', 'REST APIs'],
    keywords: ['JavaScript', 'React', 'Node.js', 'PostgreSQL', 'full-stack', 'performance']
  });
  
  vi.spyOn(aiService, 'generateCoverLetterContent').mockResolvedValue({
    opening: 'Dear Hiring Manager,\n\nI am writing to express my strong interest in the Senior Software Engineer position at Tech Corp. With over 5 years of experience in full-stack development and a proven track record of delivering high-quality applications, I am confident in my ability to contribute to your team.',
    body: [
      'Throughout my career at Previous Tech Company, I have specialized in building scalable web applications using React and Node.js. My experience aligns perfectly with your requirements, particularly in JavaScript, React, Node.js, and PostgreSQL.',
      'One of my key achievements was improving application performance by 40% through strategic code optimization and architectural improvements. I also led a team of 3 developers, demonstrating my ability to mentor and guide others while maintaining high code quality standards.',
      'I am particularly excited about the opportunity to work at Tech Corp because of your commitment to innovation and technical excellence. I am confident that my technical skills and leadership experience make me an ideal candidate for this role.'
    ],
    closing: 'Thank you for considering my application. I look forward to the opportunity to discuss how my skills and experience can contribute to Tech Corp\'s continued success.',
    keywords: ['JavaScript', 'React', 'Node.js', 'PostgreSQL', 'leadership', 'performance']
  });
}

describe('Document Generation Service Integration Tests', () => {
  describe('Resume Generation', () => {
    describe('POST /api/documents/generate/resume', () => {
      it('should generate resume successfully with complete profile', async () => {
        mockAIResponses();
        
        const response = await request(app)
          .post('/api/documents/generate/resume')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            jobId: testJobId,
            templateId: testTemplateId
          })
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(response.body.data.documentType).toBe('resume');
        expect(response.body.data.title).toContain('Senior Software Engineer');
        expect(response.body.data.title).toContain('Tech Corp');
        expect(response.body.data.content).toBeDefined();
        expect(response.body.data.content.sections).toBeDefined();
        expect(response.body.data.content.sections.length).toBeGreaterThan(0);
        expect(response.body.data.metadata).toBeDefined();
        expect(response.body.data.metadata.wordCount).toBeGreaterThan(0);
        expect(response.body.data.metadata.keywordsUsed).toBeDefined();
        expect(response.body.data.version).toBe(1);
      });

      it('should generate resume with customizations', async () => {
        mockAIResponses();
        
        const response = await request(app)
          .post('/api/documents/generate/resume')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            jobId: testJobId,
            customizations: {
              tone: 'enthusiastic',
              length: 'concise',
              focusAreas: ['leadership', 'performance']
            }
          })
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.documentType).toBe('resume');
      });

      it('should return 400 when jobId is missing', async () => {
        const response = await request(app)
          .post('/api/documents/generate/resume')
          .set('Authorization', `Bearer ${authToken}`)
          .send({})
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('Job ID is required');
      });

      it('should return 404 when job does not exist', async () => {
        const response = await request(app)
          .post('/api/documents/generate/resume')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            jobId: '00000000-0000-0000-0000-000000000000'
          })
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('Job not found');
      });

      it('should return 401 without authentication', async () => {
        await request(app)
          .post('/api/documents/generate/resume')
          .send({ jobId: testJobId })
          .expect(401);
      });

      it('should include all required sections in generated resume', async () => {
        mockAIResponses();
        
        const response = await request(app)
          .post('/api/documents/generate/resume')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ jobId: testJobId })
          .expect(201);

        const sections = response.body.data.content.sections;
        const sectionTypes = sections.map((s: any) => s.type);
        
        expect(sectionTypes).toContain('header');
        expect(sectionTypes).toContain('summary');
        expect(sectionTypes).toContain('experience');
        expect(sectionTypes).toContain('education');
        expect(sectionTypes).toContain('skills');
      });
    });
  });

  describe('Cover Letter Generation', () => {
    describe('POST /api/documents/generate/cover-letter', () => {
      it('should generate cover letter successfully', async () => {
        mockAIResponses();
        
        const response = await request(app)
          .post('/api/documents/generate/cover-letter')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            jobId: testJobId
          })
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(response.body.data.documentType).toBe('cover-letter');
        expect(response.body.data.title).toContain('Cover Letter');
        expect(response.body.data.title).toContain('Senior Software Engineer');
        expect(response.body.data.content).toBeDefined();
        expect(response.body.data.content.sections).toBeDefined();
        expect(response.body.data.metadata).toBeDefined();
        expect(response.body.data.version).toBe(1);
      });

      it('should generate cover letter with professional tone', async () => {
        mockAIResponses();
        
        const response = await request(app)
          .post('/api/documents/generate/cover-letter')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            jobId: testJobId,
            customizations: {
              tone: 'professional'
            }
          })
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.documentType).toBe('cover-letter');
      });

      it('should generate cover letter for different job types', async () => {
        mockAIResponses();
        
        // Create a different job type (contract)
        const contractJobResult = await pgPool.query(
          `INSERT INTO jobs (
            external_id, source, title, company, location, remote_type, job_type,
            description, requirements, posted_date, apply_url
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          RETURNING id`,
          [
            'test-contract-job',
            'indeed',
            'Frontend Developer',
            'Startup Inc',
            'Remote',
            'remote',
            'contract',
            'Looking for a contract frontend developer with React experience.',
            ['React', 'TypeScript', 'CSS'],
            new Date(),
            'https://example.com/apply-contract'
          ]
        );
        
        const contractJobId = contractJobResult.rows[0].id;
        
        const response = await request(app)
          .post('/api/documents/generate/cover-letter')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            jobId: contractJobId
          })
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.title).toContain('Frontend Developer');
        expect(response.body.data.title).toContain('Startup Inc');
      });

      it('should return 400 when jobId is missing', async () => {
        const response = await request(app)
          .post('/api/documents/generate/cover-letter')
          .set('Authorization', `Bearer ${authToken}`)
          .send({})
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('Job ID is required');
      });

      it('should return 404 when job does not exist', async () => {
        const response = await request(app)
          .post('/api/documents/generate/cover-letter')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            jobId: '00000000-0000-0000-0000-000000000000'
          })
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('Job not found');
      });

      it('should return 401 without authentication', async () => {
        await request(app)
          .post('/api/documents/generate/cover-letter')
          .send({ jobId: testJobId })
          .expect(401);
      });

      it('should include header, body, and closing sections', async () => {
        mockAIResponses();
        
        const response = await request(app)
          .post('/api/documents/generate/cover-letter')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ jobId: testJobId })
          .expect(201);

        const sections = response.body.data.content.sections;
        const sectionTypes = sections.map((s: any) => s.type);
        
        expect(sectionTypes).toContain('header');
        expect(sectionTypes).toContain('custom'); // Body and closing are custom sections
        
        // Verify we have multiple custom sections (opening, body paragraphs, closing, signature)
        const customSections = sections.filter((s: any) => s.type === 'custom');
        expect(customSections.length).toBeGreaterThan(2);
      });
    });
  });

  describe('Document Management', () => {
    let generatedDocumentId: string;

    beforeEach(async () => {
      mockAIResponses();
      
      // Generate a document for testing
      const response = await request(app)
        .post('/api/documents/generate/resume')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ jobId: testJobId });
      
      generatedDocumentId = response.body.data._id;
    });

    describe('GET /api/documents/:documentId', () => {
      it('should retrieve generated document', async () => {
        const response = await request(app)
          .get(`/api/documents/${generatedDocumentId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data._id).toBe(generatedDocumentId);
        expect(response.body.data.documentType).toBe('resume');
      });

      it('should return 404 for non-existent document', async () => {
        const fakeId = '507f1f77bcf86cd799439011';
        
        const response = await request(app)
          .get(`/api/documents/${fakeId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(404);

        expect(response.body.success).toBe(false);
      });

      it('should return 401 without authentication', async () => {
        await request(app)
          .get(`/api/documents/${generatedDocumentId}`)
          .expect(401);
      });
    });

    describe('GET /api/documents', () => {
      it('should get all documents for user', async () => {
        // Generate another document
        await request(app)
          .post('/api/documents/generate/cover-letter')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ jobId: testJobId });

        const response = await request(app)
          .get('/api/documents')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveLength(2);
      });

      it('should filter documents by type', async () => {
        const response = await request(app)
          .get('/api/documents?documentType=resume')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveLength(1);
        expect(response.body.data[0].documentType).toBe('resume');
      });

      it('should filter documents by jobId', async () => {
        const response = await request(app)
          .get(`/api/documents?jobId=${testJobId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.length).toBeGreaterThan(0);
        expect(response.body.data[0].jobId).toBe(testJobId);
      });
    });

    describe('PUT /api/documents/:documentId', () => {
      it('should update document successfully', async () => {
        const updateData = {
          title: 'Updated Resume Title',
          changes: 'Updated title'
        };

        const response = await request(app)
          .put(`/api/documents/${generatedDocumentId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(updateData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.title).toBe('Updated Resume Title');
        expect(response.body.data.version).toBe(2); // Version should increment
      });

      it('should update document content', async () => {
        const originalDoc = await request(app)
          .get(`/api/documents/${generatedDocumentId}`)
          .set('Authorization', `Bearer ${authToken}`);

        const updatedContent = { ...originalDoc.body.data.content };
        updatedContent.sections[0].content = { ...updatedContent.sections[0].content, name: 'Updated Name' };

        const response = await request(app)
          .put(`/api/documents/${generatedDocumentId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            content: updatedContent,
            changes: 'Updated name in header'
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.version).toBe(2);
      });

      it('should return 404 for non-existent document', async () => {
        const fakeId = '507f1f77bcf86cd799439011';
        
        const response = await request(app)
          .put(`/api/documents/${fakeId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ title: 'Test' })
          .expect(404);

        expect(response.body.success).toBe(false);
      });
    });

    describe('DELETE /api/documents/:documentId', () => {
      it('should delete document successfully', async () => {
        const response = await request(app)
          .delete(`/api/documents/${generatedDocumentId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);

        // Verify document is deleted
        await request(app)
          .get(`/api/documents/${generatedDocumentId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(404);
      });

      it('should return 404 for non-existent document', async () => {
        const fakeId = '507f1f77bcf86cd799439011';
        
        const response = await request(app)
          .delete(`/api/documents/${fakeId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(404);

        expect(response.body.success).toBe(false);
      });
    });
  });

  describe('Document Versioning', () => {
    let documentId: string;

    beforeEach(async () => {
      mockAIResponses();
      
      // Generate a document
      const response = await request(app)
        .post('/api/documents/generate/resume')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ jobId: testJobId });
      
      documentId = response.body.data._id;
    });

    describe('GET /api/documents/:documentId/versions', () => {
      it('should get document version history', async () => {
        // Make some updates to create versions
        await request(app)
          .put(`/api/documents/${documentId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ title: 'Version 2', changes: 'First update' });

        await request(app)
          .put(`/api/documents/${documentId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ title: 'Version 3', changes: 'Second update' });

        const response = await request(app)
          .get(`/api/documents/${documentId}/versions`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.length).toBeGreaterThan(0);
      });
    });

    describe('POST /api/documents/:documentId/restore', () => {
      it('should restore document to previous version', async () => {
        // Update document
        await request(app)
          .put(`/api/documents/${documentId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ title: 'Version 2', changes: 'Update' });

        // Restore to version 1
        const response = await request(app)
          .post(`/api/documents/${documentId}/restore`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ version: 1 })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.version).toBeGreaterThan(2); // New version created
      });

      it('should return 400 without version number', async () => {
        const response = await request(app)
          .post(`/api/documents/${documentId}/restore`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({})
          .expect(400);

        expect(response.body.success).toBe(false);
      });

      it('should return 404 for non-existent version', async () => {
        const response = await request(app)
          .post(`/api/documents/${documentId}/restore`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ version: 999 })
          .expect(404);

        expect(response.body.success).toBe(false);
      });
    });
  });

  describe('Document Export', () => {
    let documentId: string;

    beforeEach(async () => {
      mockAIResponses();
      
      // Generate a document
      const response = await request(app)
        .post('/api/documents/generate/resume')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ jobId: testJobId });
      
      documentId = response.body.data._id;
    });

    describe('GET /api/documents/:documentId/export', () => {
      it('should export document to PDF format', async () => {
        const response = await request(app)
          .get(`/api/documents/${documentId}/export?format=pdf`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.headers['content-type']).toBe('application/pdf');
        expect(response.headers['content-disposition']).toContain('attachment');
        expect(response.headers['content-disposition']).toContain('.pdf');
        expect(response.body).toBeInstanceOf(Buffer);
        expect(response.body.length).toBeGreaterThan(0);
      });

      it('should export document to DOCX format', async () => {
        const response = await request(app)
          .get(`/api/documents/${documentId}/export?format=docx`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.headers['content-type']).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        expect(response.headers['content-disposition']).toContain('attachment');
        expect(response.headers['content-disposition']).toContain('.docx');
        expect(response.body).toBeInstanceOf(Buffer);
        expect(response.body.length).toBeGreaterThan(0);
      });

      it('should export document to TXT format', async () => {
        const response = await request(app)
          .get(`/api/documents/${documentId}/export?format=txt`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.headers['content-type']).toBe('text/plain');
        expect(response.headers['content-disposition']).toContain('attachment');
        expect(response.headers['content-disposition']).toContain('.txt');
        expect(response.text).toBeDefined();
        expect(response.text.length).toBeGreaterThan(0);
        
        // Verify text contains expected content
        expect(response.text).toContain('Test User');
        expect(response.text).toContain('PROFESSIONAL SUMMARY');
      });

      it('should return 400 for invalid format', async () => {
        const response = await request(app)
          .get(`/api/documents/${documentId}/export?format=invalid`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('Invalid format');
      });

      it('should return 400 when format is missing', async () => {
        const response = await request(app)
          .get(`/api/documents/${documentId}/export`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);

        expect(response.body.success).toBe(false);
      });

      it('should return 404 for non-existent document', async () => {
        const fakeId = '507f1f77bcf86cd799439011';
        
        const response = await request(app)
          .get(`/api/documents/${fakeId}/export?format=pdf`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(404);

        expect(response.body.success).toBe(false);
      });

      it('should return 401 without authentication', async () => {
        await request(app)
          .get(`/api/documents/${documentId}/export?format=pdf`)
          .expect(401);
      });
    });
  });

  describe('End-to-End Document Generation Flow', () => {
    it('should complete full resume generation and export workflow', async () => {
      mockAIResponses();
      
      // 1. Generate resume
      const generateResponse = await request(app)
        .post('/api/documents/generate/resume')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ jobId: testJobId })
        .expect(201);

      expect(generateResponse.body.success).toBe(true);
      const documentId = generateResponse.body.data._id;

      // 2. Retrieve document
      const getResponse = await request(app)
        .get(`/api/documents/${documentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(getResponse.body.data._id).toBe(documentId);

      // 3. Update document
      const updateResponse = await request(app)
        .put(`/api/documents/${documentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Updated Resume',
          changes: 'Manual edits'
        })
        .expect(200);

      expect(updateResponse.body.data.version).toBe(2);

      // 4. Export to PDF
      const pdfResponse = await request(app)
        .get(`/api/documents/${documentId}/export?format=pdf`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(pdfResponse.headers['content-type']).toBe('application/pdf');

      // 5. Export to DOCX
      const docxResponse = await request(app)
        .get(`/api/documents/${documentId}/export?format=docx`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(docxResponse.headers['content-type']).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');

      // 6. Export to TXT
      const txtResponse = await request(app)
        .get(`/api/documents/${documentId}/export?format=txt`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(txtResponse.headers['content-type']).toBe('text/plain');

      // 7. Get version history
      const versionsResponse = await request(app)
        .get(`/api/documents/${documentId}/versions`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(versionsResponse.body.data.length).toBeGreaterThan(0);

      // 8. List all documents
      const listResponse = await request(app)
        .get('/api/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(listResponse.body.data.length).toBeGreaterThan(0);
    });

    it('should complete full cover letter generation workflow', async () => {
      mockAIResponses();
      
      // 1. Generate cover letter
      const generateResponse = await request(app)
        .post('/api/documents/generate/cover-letter')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          jobId: testJobId,
          customizations: { tone: 'professional' }
        })
        .expect(201);

      expect(generateResponse.body.success).toBe(true);
      const documentId = generateResponse.body.data._id;

      // 2. Update cover letter
      await request(app)
        .put(`/api/documents/${documentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Customized Cover Letter',
          changes: 'Personalized content'
        })
        .expect(200);

      // 3. Export to all formats
      await request(app)
        .get(`/api/documents/${documentId}/export?format=pdf`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      await request(app)
        .get(`/api/documents/${documentId}/export?format=docx`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      await request(app)
        .get(`/api/documents/${documentId}/export?format=txt`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle missing user profile gracefully', async () => {
      // Create user without profile data
      const newUser = await createTestUser();
      const newToken = jwt.sign(
        { userId: newUser.id, email: newUser.email },
        config.jwt.secret,
        { expiresIn: '1h' }
      );

      // Delete profile data
      await pgPool.query('DELETE FROM skills WHERE user_id = $1', [newUser.id]);
      await pgPool.query('DELETE FROM experience WHERE user_id = $1', [newUser.id]);
      await pgPool.query('DELETE FROM education WHERE user_id = $1', [newUser.id]);

      mockAIResponses();

      const response = await request(app)
        .post('/api/documents/generate/resume')
        .set('Authorization', `Bearer ${newToken}`)
        .send({ jobId: testJobId });

      // Should still generate but with limited content
      expect([201, 404]).toContain(response.status);
    });

    it('should handle AI service errors gracefully', async () => {
      // Mock AI service to throw error
      vi.spyOn(aiService, 'generateResumeContent').mockRejectedValue(
        new Error('AI service unavailable')
      );

      const response = await request(app)
        .post('/api/documents/generate/resume')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ jobId: testJobId })
        .expect(500);

      expect(response.body.success).toBe(false);
    });

    it('should validate document ownership on update', async () => {
      mockAIResponses();
      
      // Generate document for first user
      const doc1Response = await request(app)
        .post('/api/documents/generate/resume')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ jobId: testJobId });

      const documentId = doc1Response.body.data._id;

      // Create second user
      const user2 = await createTestUser();
      const token2 = jwt.sign(
        { userId: user2.id, email: user2.email },
        config.jwt.secret,
        { expiresIn: '1h' }
      );

      // Try to update first user's document with second user's token
      const response = await request(app)
        .put(`/api/documents/${documentId}`)
        .set('Authorization', `Bearer ${token2}`)
        .send({ title: 'Hacked' })
        .expect(404); // Should not find document for different user

      expect(response.body.success).toBe(false);
    });

    it('should handle concurrent document generation', async () => {
      mockAIResponses();
      
      // Generate multiple documents concurrently
      const promises = [
        request(app)
          .post('/api/documents/generate/resume')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ jobId: testJobId }),
        request(app)
          .post('/api/documents/generate/cover-letter')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ jobId: testJobId }),
        request(app)
          .post('/api/documents/generate/resume')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ jobId: testJobId })
      ];

      const responses = await Promise.all(promises);

      responses.forEach(response => {
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
      });

      // Verify all documents were created
      const listResponse = await request(app)
        .get('/api/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(listResponse.body.data.length).toBe(3);
    });
  });
});
