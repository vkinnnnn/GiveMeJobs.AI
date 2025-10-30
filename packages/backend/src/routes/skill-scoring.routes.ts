import { Router } from 'express';
import { SkillScoringController } from '../controllers/skill-scoring.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
const controller = new SkillScoringController();

/**
 * Skill Scoring Routes
 * All routes require authentication
 */

// Get current skill score
router.get('/', authenticate, (req, res) => controller.getCurrentScore(req, res));

// Get skill score history
router.get('/history', authenticate, (req, res) => controller.getScoreHistory(req, res));

// Analyze skill gaps against a career goal
router.get('/gap-analysis/:careerGoalId', authenticate, (req, res) => controller.analyzeSkillGaps(req, res));

// Recalculate skill score
router.post('/recalculate', authenticate, (req, res) => controller.recalculateScore(req, res));

export default router;
