import { Router } from 'express';
import { auditLogController } from '../controllers/audit-log.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole, UserRole } from '../middleware/rbac.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// User routes - get their own audit logs
router.get('/me', auditLogController.getUserAuditLogs.bind(auditLogController));

// Admin routes - query all audit logs
router.get('/', requireRole(UserRole.ADMIN), auditLogController.queryAuditLogs.bind(auditLogController));
router.get('/resource/:resourceType/:resourceId', requireRole(UserRole.ADMIN), auditLogController.getResourceAuditLogs.bind(auditLogController));
router.get('/failed-auth', requireRole(UserRole.ADMIN), auditLogController.getFailedAuthAttempts.bind(auditLogController));
router.get('/security-events', requireRole(UserRole.ADMIN), auditLogController.getSecurityEvents.bind(auditLogController));
router.get('/statistics', requireRole(UserRole.ADMIN), auditLogController.getAuditStatistics.bind(auditLogController));

export default router;
