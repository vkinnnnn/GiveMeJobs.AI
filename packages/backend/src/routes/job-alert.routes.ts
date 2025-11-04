import { Router } from 'express';
import { jobAlertController } from '../controllers/job-alert.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Job alert routes
router.post('/alerts', (req, res) => jobAlertController.createJobAlert(req, res));
router.get('/alerts', (req, res) => jobAlertController.getJobAlerts(req, res));
router.get('/alerts/:id', (req, res) => jobAlertController.getJobAlertById(req, res));
router.put('/alerts/:id', (req, res) => jobAlertController.updateJobAlert(req, res));
router.delete('/alerts/:id', (req, res) => jobAlertController.deleteJobAlert(req, res));

export default router;
