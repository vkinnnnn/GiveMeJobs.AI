import { Router } from 'express';
import { documentGenerationController } from '../controllers/document-generation.controller';
import { authenticate } from '../middleware/auth.middleware';
import { rateLimitPresets } from '../middleware/rate-limit.middleware';

const router = Router();

// Document generation routes (expensive AI operations)
router.post(
  '/generate/resume',
  authenticate,
  rateLimitPresets.expensive,
  documentGenerationController.generateResume.bind(documentGenerationController)
);

router.post(
  '/generate/cover-letter',
  authenticate,
  rateLimitPresets.expensive,
  documentGenerationController.generateCoverLetter.bind(documentGenerationController)
);

// Document management routes
router.get(
  '/',
  authenticate,
  rateLimitPresets.read,
  documentGenerationController.getUserDocuments.bind(documentGenerationController)
);

router.get(
  '/:documentId',
  authenticate,
  rateLimitPresets.read,
  documentGenerationController.getDocument.bind(documentGenerationController)
);

router.put(
  '/:documentId',
  authenticate,
  rateLimitPresets.write,
  documentGenerationController.updateDocument.bind(documentGenerationController)
);

router.delete(
  '/:documentId',
  authenticate,
  rateLimitPresets.write,
  documentGenerationController.deleteDocument.bind(documentGenerationController)
);

// Document versioning routes
router.get(
  '/:documentId/versions',
  authenticate,
  documentGenerationController.getDocumentVersions.bind(documentGenerationController)
);

router.post(
  '/:documentId/restore',
  authenticate,
  documentGenerationController.restoreDocumentVersion.bind(documentGenerationController)
);

// Document export route
router.get(
  '/:documentId/export',
  authenticate,
  documentGenerationController.exportDocument.bind(documentGenerationController)
);

export default router;
