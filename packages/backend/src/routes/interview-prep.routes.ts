import { Router } from 'express';
import { interviewPrepController } from '../controllers/interview-prep.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Generate interview preparation
router.post(
  '/generate',
  interviewPrepController.generateInterviewPrep.bind(interviewPrepController)
);

// Get interview prep by ID
router.get(
  '/:id',
  interviewPrepController.getInterviewPrep.bind(interviewPrepController)
);

// Get interview prep by application ID
router.get(
  '/application/:applicationId',
  interviewPrepController.getInterviewPrepByApplication.bind(interviewPrepController)
);

// Update interview date
router.patch(
  '/:id/interview-date',
  interviewPrepController.updateInterviewDate.bind(interviewPrepController)
);

// Create practice session
router.post(
  '/:id/practice',
  interviewPrepController.createPracticeSession.bind(interviewPrepController)
);

// Get practice sessions
router.get(
  '/:id/practice',
  interviewPrepController.getPracticeSessions.bind(interviewPrepController)
);

// Get practice progress
router.get(
  '/:id/progress',
  interviewPrepController.getPracticeProgress.bind(interviewPrepController)
);

// Analyze practice response
router.post(
  '/:id/practice/:practiceId/analyze',
  interviewPrepController.analyzePracticeResponse.bind(interviewPrepController)
);

// Send interview reminder
router.post(
  '/:id/reminders',
  interviewPrepController.sendInterviewReminder.bind(interviewPrepController)
);

export default router;
