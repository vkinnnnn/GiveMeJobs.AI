import { Router } from 'express';
import { applicationController } from '../controllers/application.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Statistics (must be before /:id routes)
router.get(
  '/statistics',
  applicationController.getStatistics.bind(applicationController)
);

// Follow-up reminders (must be before /:id routes)
router.get(
  '/follow-ups',
  applicationController.getFollowUpReminders.bind(applicationController)
);

// Application management routes
router.post(
  '/',
  applicationController.createApplication.bind(applicationController)
);

router.get(
  '/',
  applicationController.getUserApplications.bind(applicationController)
);

router.get(
  '/:id',
  applicationController.getApplication.bind(applicationController)
);

router.put(
  '/:id',
  applicationController.updateApplication.bind(applicationController)
);

router.delete(
  '/:id',
  applicationController.deleteApplication.bind(applicationController)
);

// Status tracking routes
router.patch(
  '/:id/status',
  applicationController.updateStatus.bind(applicationController)
);

router.get(
  '/:id/status-history',
  applicationController.getStatusHistory.bind(applicationController)
);

// Notes management routes
router.post(
  '/:id/notes',
  applicationController.addNote.bind(applicationController)
);

router.get(
  '/:id/notes',
  applicationController.getNotes.bind(applicationController)
);

router.put(
  '/:id/notes/:noteId',
  applicationController.updateNote.bind(applicationController)
);

router.delete(
  '/:id/notes/:noteId',
  applicationController.deleteNote.bind(applicationController)
);

// Timeline route
router.get(
  '/:id/timeline',
  applicationController.getTimeline.bind(applicationController)
);

// Progress visualization route (health bar)
router.get(
  '/:id/progress',
  applicationController.getProgress.bind(applicationController)
);

// Follow-up reminder trigger
router.post(
  '/:id/follow-up',
  applicationController.triggerFollowUp.bind(applicationController)
);

export default router;
