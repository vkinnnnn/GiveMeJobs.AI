import { Router } from 'express';
import { documentTemplateController } from '../controllers/document-template.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Resume template routes
router.post(
  '/resume',
  authenticate,
  documentTemplateController.createResumeTemplate.bind(documentTemplateController)
);

router.get(
  '/resume',
  documentTemplateController.getResumeTemplates.bind(documentTemplateController)
);

router.get(
  '/resume/:templateId',
  documentTemplateController.getResumeTemplate.bind(documentTemplateController)
);

router.put(
  '/resume/:templateId',
  authenticate,
  documentTemplateController.updateResumeTemplate.bind(documentTemplateController)
);

router.delete(
  '/resume/:templateId',
  authenticate,
  documentTemplateController.deleteResumeTemplate.bind(documentTemplateController)
);

// Cover letter template routes
router.post(
  '/cover-letter',
  authenticate,
  documentTemplateController.createCoverLetterTemplate.bind(documentTemplateController)
);

router.get(
  '/cover-letter',
  documentTemplateController.getCoverLetterTemplates.bind(documentTemplateController)
);

router.get(
  '/cover-letter/:templateId',
  documentTemplateController.getCoverLetterTemplate.bind(documentTemplateController)
);

router.put(
  '/cover-letter/:templateId',
  authenticate,
  documentTemplateController.updateCoverLetterTemplate.bind(documentTemplateController)
);

router.delete(
  '/cover-letter/:templateId',
  authenticate,
  documentTemplateController.deleteCoverLetterTemplate.bind(documentTemplateController)
);

export default router;
