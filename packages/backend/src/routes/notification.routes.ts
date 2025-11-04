import { Router } from 'express';
import { jobAlertController } from '../controllers/job-alert.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Notification routes
router.get('/', (req, res) => jobAlertController.getNotifications(req, res));
router.get('/unread-count', (req, res) => jobAlertController.getUnreadCount(req, res));
router.patch('/read-all', (req, res) => jobAlertController.markAllNotificationsAsRead(req, res));
router.patch('/:id/read', (req, res) => jobAlertController.markNotificationAsRead(req, res));
router.delete('/:id', (req, res) => jobAlertController.deleteNotification(req, res));

export default router;
