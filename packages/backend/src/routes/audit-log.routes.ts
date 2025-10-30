import { Router } from 'express';
import { auditLogController } from '../controllers/audit-log.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// User routes - get their own audit logs
router.get('/me', auditLogController.getUserAuditLogs.bind(auditLogController));

// Admin routes - query all audit logs
router.get('/', requireRole('admin'), auditLogController.queryAuditLogs.bind(auditLogController));
router.get('/resource/:resourceType/:resourceId', requireRole('admin'), auditLogController.getResourceAuditLogs.bind(auditLogController));
router.get('/failed-auth', requireRole('admin'), auditLogController.getFailedAuthAttempts.bind(auditLogController));
router.get('/security-events', requireRole('admin'), auditLogController.getSecurityEvents.bind(auditLogController));
router.get('/statistics', requireRole('admin'), auditLogController.getAuditStatistics.bind(auditLogController));

export default router;
