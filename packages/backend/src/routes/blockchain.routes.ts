import { Router } from 'express';
import { blockchainController } from '../controllers/blockchain.controller';
import { authenticate } from '../middleware/auth.middleware';
import { loadUserRole, requireOwnership } from '../middleware/rbac.middleware';
import { auditLogMiddleware } from '../middleware/audit-log.middleware';

const router = Router();

// Protected routes (require authentication and role loading)
router.use('/credentials', authenticate, loadUserRole);

router.post('/credentials/store', 
  auditLogMiddleware('credential.store', 'blockchain_credential'),
  (req, res) => blockchainController.storeCredential(req, res)
);

router.get('/credentials', (req, res) =>
  blockchainController.getUserCredentials(req, res)
);

router.get('/credentials/:id',
  auditLogMiddleware('credential.view', 'blockchain_credential', (req) => req.params.id),
  (req, res) => blockchainController.getCredential(req, res)
);

router.post('/credentials/:id/grant-access',
  auditLogMiddleware('credential.grant_access', 'blockchain_credential', (req) => req.params.id),
  (req, res) => blockchainController.grantAccess(req, res)
);

router.post('/credentials/:id/revoke-access',
  auditLogMiddleware('credential.revoke_access', 'blockchain_credential', (req) => req.params.id),
  (req, res) => blockchainController.revokeAccess(req, res)
);

router.post('/credentials/:id/revoke-all',
  auditLogMiddleware('credential.revoke_all', 'blockchain_credential', (req) => req.params.id),
  (req, res) => blockchainController.revokeAllAccess(req, res)
);

router.get('/credentials/:id/access-log', (req, res) =>
  blockchainController.getAccessLog(req, res)
);

router.get('/credentials/:id/stats', (req, res) =>
  blockchainController.getAccessStats(req, res)
);

router.get('/credentials/:id/grants', (req, res) =>
  blockchainController.getCredentialGrants(req, res)
);

router.delete('/credentials/:id',
  auditLogMiddleware('credential.delete', 'blockchain_credential', (req) => req.params.id),
  (req, res) => blockchainController.deleteCredential(req, res)
);

// Public routes (for verification and access)
router.get('/credentials/:id/verify',
  auditLogMiddleware('credential.verify', 'blockchain_credential', (req) => req.params.id),
  (req, res) => blockchainController.verifyCredential(req, res)
);

router.get('/access/:credentialId',
  auditLogMiddleware('credential.access', 'blockchain_credential', (req) => req.params.credentialId),
  (req, res) => blockchainController.accessCredential(req, res)
);

export default router;
