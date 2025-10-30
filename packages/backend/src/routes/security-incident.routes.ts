import { Router } from 'express';
import { securityIncidentController } from '../controllers/security-incident.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// User routes - get their own notifications
router.get('/notifications', securityIncidentController.getUserNotifications.bind(securityIncidentController));
router.post('/notifications/:notificationId/acknowledge', securityIncidentController.acknowledgeNotification.bind(securityIncidentController));

// Admin routes - manage incidents
router.post('/', requireRole('admin'), securityIncidentController.createIncident.bind(securityIncidentController));
router.get('/', requireRole('admin'), securityIncidentController.getAllIncidents.bind(securityIncidentController));
router.get('/:incidentId', requireRole('admin'), securityIncidentController.getIncident.bind(securityIncidentController));
router.patch('/:incidentId/status', requireRole('admin'), securityIncidentController.updateIncidentStatus.bind(securityIncidentController));
router.post('/:incidentId/notify', requireRole('admin'), securityIncidentController.notifyAffectedUsers.bind(securityIncidentController));
router.post('/:incidentId/report-authorities', requireRole('admin'), securityIncidentController.reportToAuthorities.bind(securityIncidentController));

export default router;
