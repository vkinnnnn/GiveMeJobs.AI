import { Router } from 'express';
import { gdprController } from '../controllers/gdpr.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { auditGDPRMiddleware } from '../middleware/audit-log.middleware';

const router = Router();

// All GDPR routes require authentication
router.use(authenticateToken);

// Data export routes
router.post('/data-export', auditGDPRMiddleware('data_export'), gdprController.requestDataExport.bind(gdprController));
router.get('/data-export', gdprController.getUserDataExportRequests.bind(gdprController));
router.get('/data-export/:requestId', gdprController.getDataExportRequest.bind(gdprController));

// Account deletion routes
router.post('/account-deletion', auditGDPRMiddleware('account_deletion'), gdprController.requestAccountDeletion.bind(gdprController));
router.delete('/account-deletion', gdprController.cancelAccountDeletion.bind(gdprController));
router.get('/account-deletion', gdprController.getAccountDeletionRequest.bind(gdprController));

export default router;
