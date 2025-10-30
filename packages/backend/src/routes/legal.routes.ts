import { Router } from 'express';
import { legalController } from '../controllers/legal.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { auditGDPRMiddleware } from '../middleware/audit-log.middleware';

const router = Router();

// Public routes - anyone can view legal documents
router.get('/privacy-policy', legalController.getPrivacyPolicy.bind(legalController));
router.get('/terms-of-service', legalController.getTermsOfService.bind(legalController));

// Protected routes - require authentication
router.post('/consent', authenticateToken, auditGDPRMiddleware('consent_granted'), legalController.recordConsent.bind(legalController));
router.get('/consent', authenticateToken, legalController.getUserConsents.bind(legalController));
router.delete('/consent', authenticateToken, auditGDPRMiddleware('consent_revoked'), legalController.revokeConsent.bind(legalController));

export default router;
