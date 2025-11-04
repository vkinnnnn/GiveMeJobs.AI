import { Router } from 'express';
import { securityIncidentController } from '../controllers/security-incident.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole, UserRole } from '../middleware/rbac.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// User routes - get their own notifications
router.get('/notifications', securityIncidentController.getUserNotifications.bind(securityIncidentController));
router.post('/notifications/:notificationId/acknowledge', securityIncidentController.acknowledgeNotification.bind(securityIncidentController));

// Admin routes - manage incidents
router.post('/', requireRole(UserRole.ADMIN), securityIncidentController.createIncident.bind(securityIncidentController));
router.get('/', requireRole(UserRole.ADMIN), securityIncidentController.getAllIncidents.bind(securityIncidentController));
router.get('/:incidentId', requireRole(UserRole.ADMIN), securityIncidentController.getIncident.bind(securityIncidentController));
router.patch('/:incidentId/status', requireRole(UserRole.ADMIN), securityIncidentController.updateIncidentStatus.bind(securityIncidentController));
router.post('/:incidentId/notify', requireRole(UserRole.ADMIN), securityIncidentController.notifyAffectedUsers.bind(securityIncidentController));
router.post('/:incidentId/report-authorities', requireRole(UserRole.ADMIN), securityIncidentController.reportToAuthorities.bind(securityIncidentController));

export default router;
