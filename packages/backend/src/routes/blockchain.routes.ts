import { Router } from 'express';
import { blockchainController } from '../controllers/blockchain.controller';
import { authenticate } from '../middleware/auth.middleware';
import { rateLimitPresets } from '../middleware/rate-limit.middleware';

const router = Router();

// Apply rate limiting to blockchain routes (using standard preset)

// Public routes (no authentication required)
router.get('/status', rateLimitPresets.read, blockchainController.getNetworkStatus);
router.get('/credentials/:id/access', rateLimitPresets.read, blockchainController.accessCredential);
router.get('/credentials/:id/verify', rateLimitPresets.read, blockchainController.verifyCredential);

// Protected routes (authentication required)
router.use(authenticate);

// Credential management
router.post('/credentials/store', rateLimitPresets.write, blockchainController.storeCredential);
router.get('/credentials', rateLimitPresets.read, blockchainController.getUserCredentials);
router.get('/credentials/:id', rateLimitPresets.read, blockchainController.getCredential);
router.delete('/credentials/:id', rateLimitPresets.write, blockchainController.deleteCredential);

// Access management
router.post('/credentials/:id/grant-access', rateLimitPresets.write, blockchainController.grantAccess);
router.post('/credentials/:id/revoke-access', rateLimitPresets.write, blockchainController.revokeAccess);
router.get('/credentials/:id/grants', rateLimitPresets.read, blockchainController.getCredentialGrants);

// Audit and analytics
router.get('/credentials/:id/access-log', rateLimitPresets.read, blockchainController.getAccessLog);
router.get('/credentials/:id/stats', rateLimitPresets.read, blockchainController.getCredentialStats);

export { router as blockchainRoutes };