import { Router } from 'express';
import { legalController } from '../controllers/legal.controller';
import { authenticate } from '../middleware/auth.middleware';
import { auditGDPRMiddleware } from '../middleware/audit-log.middleware';

const router = Router();

// Public routes - anyone can view legal documents
router.get('/privacy-policy', legalController.getPrivacyPolicy.bind(legalController));
router.get('/terms-of-service', legalController.getTermsOfService.bind(legalController));

// Protected routes - require authentication
router.post('/consent', authenticate, auditGDPRMiddleware('consent_granted'), legalController.recordConsent.bind(legalController));
router.get('/consent', authenticate, legalController.getUserConsents.bind(legalController));
router.delete('/consent', authenticate, auditGDPRMiddleware('consent_revoked'), legalController.revokeConsent.bind(legalController));

export default router;
