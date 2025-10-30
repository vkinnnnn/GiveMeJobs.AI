import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { setupTestDatabase, teardownTestDatabase, cleanupTestData, createTestUser } from './setup';
import applicationRoutes from '../routes/application.routes';
import { config } from '../config';
import { pgPool } from '../config/database';
import { ApplicationStatus } from '@givemejobs/shared-types';

/**
 * Application Tracking Integration Tests
 * Tests complete application lifecycle, status transitions, and validations
 * Requirements: 5.1, 5.2, 5.3
 */

// Create Express app for testing
const app = express();
app.use(express.json());
app.use('/api/applications', applicationRoutes);

let testUser: any;
let authToken: string;
let testJobId: string;

beforeAll(async () => {
  await setupTestDatabase();
});

afterAll(async () => {
  await teardownTestDatabase();
});

beforeEach(async () => {
  await cleanupTestData();
  await cleanupApplicationTestData();
  
  testUser = await createTestUser();
  
  // Generate JWT token
  authToken = jwt.sign(
    { userId: testUser.id, email: testUser.email },
    config.jwt.secret,
    { expiresIn: '1h' }
  );
  
  // Create test job
  testJobId = await createTestJob();
});

// Helper function to cleanup application test data
async function cleanupApplicationTestData() {
  await pgPool.query(`DELETE FROM application_timeline WHERE application_id IN (SELECT id FROM applications WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%test%'))`);
  await pgPool.query(`DELETE FROM application_notes WHERE application_id IN (SELECT id FROM applications WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%test%'))`);
  await pgPool.query(`DELETE FROM applications WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%test%')`);
}

// Helper function to create test job
async function createTestJob(): Promise<string> {
  const result = await pgPool.query(
    `INSERT INTO jobs (
      external_id, source, title, company, location, remote_type, job_type,
      description, requirements, posted_date, apply_url
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING id`,
    [
      'test-job-app-tracking',
      'linkedin',
      'Software Engineer',
      'Test Company',
      'San Francisco, CA',
      'hybrid',
      'full-time',
      'Great opportunity for a software engineer',
      ['JavaScript', 'React'],
      new Date(),
      'https://example.com/apply'
    ]
  );
  
  return result.rows[0].id;
}

describe('Application Tracking Integration Tests', () => {
  describe('Complete Application Lifecycle', () => {
    it('should handle complete application lifecycle from creation to acceptance', async () => {
      // 1. Create application
      const createResponse = await request(app)
        .post('/api/applications')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          jobId: testJobId,
          status: ApplicationStatus.SAVED,
          notes: 'Found this interesting position'
        })
        .expect(201);

      expect(createResponse.body.success).toBe(true);
      const applicationId = createResponse.body.data.id;
      expect(createResponse.body.data.status).toBe(ApplicationStatus.SAVED);

      // 2. Update status to APPLIED
      const appliedResponse = await request(app)
        .patch(`/api/applications/${applicationId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: ApplicationStatus.APPLIED,
          notes: 'Submitted application'
        })
        .expect(200);

      expect(appliedResponse.body.data.status).toBe(ApplicationStatus.APPLIED);
      expect(appliedResponse.body.data.followUpDate).toBeDefined(); // Should set follow-up date

      // 3. Update status to SCREENING
      await request(app)
        .patch(`/api/applications/${applicationId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: ApplicationStatus.SCREENING })
        .expect(200);

      // 4. Update status to INTERVIEW_SCHEDULED
      await request(app)
        .patch(`/api/applications/${applicationId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: ApplicationStatus.INTERVIEW_SCHEDULED })
        .expect(200);

      // 5. Update status to INTERVIEW_COMPLETED
      await request(app)
        .patch(`/api/applications/${applicationId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: ApplicationStatus.INTERVIEW_COMPLETED })
        .expect(200);

      // 6. Update status to OFFER_RECEIVED
      await request(app)
        .patch(`/api/applications/${applicationId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: ApplicationStatus.OFFER_RECEIVED })
        .expect(200);

      // 7. Update status to ACCEPTED
      const acceptedResponse = await request(app)
        .patch(`/api/applications/${applicationId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: ApplicationStatus.ACCEPTED })
        .expect(200);

      expect(acceptedResponse.body.data.status).toBe(ApplicationStatus.ACCEPTED);

      // 8. Verify timeline has all events
      const timelineResponse = await request(app)
        .get(`/api/applications/${applicationId}/timeline`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(timelineResponse.body.data.length).toBeGreaterThan(7); // At least 7 status changes + creation
      
      // 9. Verify progress shows 100%
      const progressResponse = await request(app)
        .get(`/api/applications/${applicationId}/progress`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(progressResponse.body.data.progress).toBe(100);
      expect(progressResponse.body.data.currentStage).toBe('Accepted');
    });
  });

  describe('Status Transition Validation', () => {
    it('should allow valid status transitions', async () => {
      const createResponse = await request(app)
        .post('/api/applications')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ jobId: testJobId, status: ApplicationStatus.SAVED });

      const applicationId = createResponse.body.data.id;

      // SAVED → APPLIED (valid)
      await request(app)
        .patch(`/api/applications/${applicationId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: ApplicationStatus.APPLIED })
        .expect(200);
    });

    it('should reject invalid status transitions', async () => {
      const createResponse = await request(app)
        .post('/api/applications')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ jobId: testJobId, status: ApplicationStatus.SAVED });

      const applicationId = createResponse.body.data.id;

      // SAVED → OFFER_RECEIVED (invalid - skipping steps)
      const response = await request(app)
        .patch(`/api/applications/${applicationId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: ApplicationStatus.OFFER_RECEIVED })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid status transition');
    });

    it('should prevent transitions from terminal states', async () => {
      const createResponse = await request(app)
        .post('/api/applications')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ jobId: testJobId, status: ApplicationStatus.APPLIED });

      const applicationId = createResponse.body.data.id;

      // Move to REJECTED (terminal state)
      await request(app)
        .patch(`/api/applications/${applicationId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: ApplicationStatus.REJECTED })
        .expect(200);

      // Try to move from REJECTED to SCREENING (should fail)
      const response = await request(app)
        .patch(`/api/applications/${applicationId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: ApplicationStatus.SCREENING })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Notes Management', () => {
    let applicationId: string;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/applications')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ jobId: testJobId });
      
      applicationId = response.body.data.id;
    });

    it('should add, retrieve, update, and delete notes', async () => {
      // Add note
      const addResponse = await request(app)
        .post(`/api/applications/${applicationId}/notes`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'Recruiter seemed interested',
          type: 'interview'
        })
        .expect(201);

      expect(addResponse.body.data.content).toBe('Recruiter seemed interested');
      expect(addResponse.body.data.type).toBe('interview');
      const noteId = addResponse.body.data.id;

      // Retrieve notes
      const getResponse = await request(app)
        .get(`/api/applications/${applicationId}/notes`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(getResponse.body.data).toHaveLength(1);

      // Update note
      const updateResponse = await request(app)
        .put(`/api/applications/${applicationId}/notes/${noteId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ content: 'Updated: Very interested!' })
        .expect(200);

      expect(updateResponse.body.data.content).toBe('Updated: Very interested!');

      // Delete note
      await request(app)
        .delete(`/api/applications/${applicationId}/notes/${noteId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify deletion
      const finalGetResponse = await request(app)
        .get(`/api/applications/${applicationId}/notes`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(finalGetResponse.body.data).toHaveLength(0);
    });

    it('should validate note content', async () => {
      // Empty content should fail
      const response = await request(app)
        .post(`/api/applications/${applicationId}/notes`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ content: '' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should validate note type', async () => {
      const response = await request(app)
        .post(`/api/applications/${applicationId}/notes`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'Test note',
          type: 'invalid_type'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Timeline Tracking', () => {
    it('should track all application events in timeline', async () => {
      // Create application
      const createResponse = await request(app)
        .post('/api/applications')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          jobId: testJobId,
          notes: 'Initial note'
        });

      const applicationId = createResponse.body.data.id;

      // Add note
      await request(app)
        .post(`/api/applications/${applicationId}/notes`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ content: 'Follow-up note' });

      // Change status
      await request(app)
        .patch(`/api/applications/${applicationId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: ApplicationStatus.APPLIED });

      // Get timeline
      const timelineResponse = await request(app)
        .get(`/api/applications/${applicationId}/timeline`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const timeline = timelineResponse.body.data;
      
      // Should have: creation, note_added (x2), status_changed
      expect(timeline.length).toBeGreaterThanOrEqual(4);
      
      // Verify event types
      const eventTypes = timeline.map((e: any) => e.eventType);
      expect(eventTypes).toContain('application_created');
      expect(eventTypes).toContain('note_added');
      expect(eventTypes).toContain('status_changed');
      
      // Verify chronological order
      for (let i = 1; i < timeline.length; i++) {
        const prev = new Date(timeline[i - 1].timestamp);
        const curr = new Date(timeline[i].timestamp);
        expect(curr.getTime()).toBeGreaterThanOrEqual(prev.getTime());
      }
    });
  });

  describe('Progress Visualization', () => {
    it('should calculate correct progress for each stage', async () => {
      const createResponse = await request(app)
        .post('/api/applications')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ jobId: testJobId, status: ApplicationStatus.SAVED });

      const applicationId = createResponse.body.data.id;

      // Test SAVED (10%)
      let progressResponse = await request(app)
        .get(`/api/applications/${applicationId}/progress`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(progressResponse.body.data.progress).toBe(10);

      // Test APPLIED (25%)
      await request(app)
        .patch(`/api/applications/${applicationId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: ApplicationStatus.APPLIED });

      progressResponse = await request(app)
        .get(`/api/applications/${applicationId}/progress`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(progressResponse.body.data.progress).toBe(25);

      // Test INTERVIEW_SCHEDULED (55%)
      await request(app)
        .patch(`/api/applications/${applicationId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: ApplicationStatus.SCREENING });

      await request(app)
        .patch(`/api/applications/${applicationId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: ApplicationStatus.INTERVIEW_SCHEDULED });

      progressResponse = await request(app)
        .get(`/api/applications/${applicationId}/progress`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(progressResponse.body.data.progress).toBe(55);
      expect(progressResponse.body.data.currentStage).toBe('Interview Scheduled');
    });

    it('should show correct stage completion status', async () => {
      const createResponse = await request(app)
        .post('/api/applications')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ jobId: testJobId, status: ApplicationStatus.SCREENING });

      const applicationId = createResponse.body.data.id;

      const progressResponse = await request(app)
        .get(`/api/applications/${applicationId}/progress`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const stages = progressResponse.body.data.stages;
      
      // Saved and Applied should be completed
      const savedStage = stages.find((s: any) => s.name === 'Saved');
      const appliedStage = stages.find((s: any) => s.name === 'Applied');
      const screeningStage = stages.find((s: any) => s.name === 'Screening');
      const interviewStage = stages.find((s: any) => s.name === 'Interview Scheduled');

      expect(savedStage.status).toBe('completed');
      expect(appliedStage.status).toBe('completed');
      expect(screeningStage.status).toBe('current');
      expect(interviewStage.status).toBe('pending');
    });
  });

  describe('Follow-up Reminders', () => {
    it('should set follow-up date when status changes to APPLIED', async () => {
      const createResponse = await request(app)
        .post('/api/applications')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ jobId: testJobId, status: ApplicationStatus.SAVED });

      const applicationId = createResponse.body.data.id;

      // Change to APPLIED
      const appliedResponse = await request(app)
        .patch(`/api/applications/${applicationId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: ApplicationStatus.APPLIED })
        .expect(200);

      // Should have follow_up_date set
      expect(appliedResponse.body.data.followUpDate).toBeDefined();
      
      const followUpDate = new Date(appliedResponse.body.data.followUpDate);
      const today = new Date();
      const daysDiff = Math.floor((followUpDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      // Should be approximately 14 days from now
      expect(daysDiff).toBeGreaterThanOrEqual(13);
      expect(daysDiff).toBeLessThanOrEqual(15);
    });

    it('should retrieve follow-up reminders', async () => {
      // Create application with APPLIED status
      await request(app)
        .post('/api/applications')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ jobId: testJobId, status: ApplicationStatus.APPLIED });

      // Get follow-ups
      const response = await request(app)
        .get('/api/applications/follow-ups')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });
  });

  describe('Statistics', () => {
    it('should calculate accurate statistics', async () => {
      // Create multiple applications with different statuses
      await request(app)
        .post('/api/applications')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ jobId: testJobId, status: ApplicationStatus.APPLIED });

      await request(app)
        .post('/api/applications')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ jobId: testJobId, status: ApplicationStatus.SCREENING });

      await request(app)
        .post('/api/applications')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ jobId: testJobId, status: ApplicationStatus.REJECTED });

      // Get statistics
      const response = await request(app)
        .get('/api/applications/statistics')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const stats = response.body.data;
      
      expect(stats.total).toBe(3);
      expect(stats.byStatus).toBeDefined();
      expect(stats.responseRate).toBeDefined();
      expect(stats.averageResponseTime).toBeDefined();
      expect(stats.interviewConversionRate).toBeDefined();
      expect(stats.offerRate).toBeDefined();
      expect(stats.recentActivity).toBeDefined();
    });

    it('should handle empty statistics', async () => {
      const response = await request(app)
        .get('/api/applications/statistics')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const stats = response.body.data;
      
      expect(stats.total).toBe(0);
      expect(stats.responseRate).toBe(0);
      expect(stats.offerRate).toBe(0);
    });
  });

  describe('Authorization and Security', () => {
    it('should require authentication for all endpoints', async () => {
      await request(app)
        .get('/api/applications')
        .expect(401);

      await request(app)
        .post('/api/applications')
        .send({ jobId: testJobId })
        .expect(401);
    });

    it('should prevent access to other users applications', async () => {
      // Create application for first user
      const createResponse = await request(app)
        .post('/api/applications')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ jobId: testJobId });

      const applicationId = createResponse.body.data.id;

      // Create second user
      const user2 = await createTestUser();
      const token2 = jwt.sign(
        { userId: user2.id, email: user2.email },
        config.jwt.secret,
        { expiresIn: '1h' }
      );

      // Try to access first user's application with second user's token
      const response = await request(app)
        .get(`/api/applications/${applicationId}`)
        .set('Authorization', `Bearer ${token2}`)
        .expect(404); // Should not find (not 403, to avoid info leakage)

      expect(response.body.success).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid application ID', async () => {
      const response = await request(app)
        .get('/api/applications/invalid-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should handle missing required fields', async () => {
      const response = await request(app)
        .post('/api/applications')
        .set('Authorization', `Bearer ${authToken}`)
        .send({}) // Missing jobId
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle invalid status values', async () => {
      const createResponse = await request(app)
        .post('/api/applications')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ jobId: testJobId });

      const applicationId = createResponse.body.data.id;

      const response = await request(app)
        .patch(`/api/applications/${applicationId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'invalid_status' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});
