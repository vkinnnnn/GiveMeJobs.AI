import { Request, Response } from 'express';
import { SkillScoringService } from '../services/skill-scoring.service';

const skillScoringService = new SkillScoringService();

/**
 * Skill Scoring Controller
 * Handles HTTP requests for skill scoring operations
 */
export class SkillScoringController {
  /**
   * Get current skill score for authenticated user
   * GET /api/skill-score
   */
  async getCurrentScore(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.jwtPayload?.userId;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const skillScore = await skillScoringService.getCurrentSkillScore(userId);

      if (!skillScore) {
        res.status(404).json({ error: 'Skill score not found' });
        return;
      }

      res.json(skillScore);
    } catch (error) {
      console.error('Error getting current skill score:', error);
      res.status(500).json({ error: 'Failed to retrieve skill score' });
    }
  }

  /**
   * Get skill score history for authenticated user
   * GET /api/skill-score/history
   */
  async getScoreHistory(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.jwtPayload?.userId;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const limit = parseInt(req.query.limit as string) || 50;
      const history = await skillScoringService.getSkillScoreHistory(userId, limit);

      res.json({
        history,
        count: history.length,
      });
    } catch (error) {
      console.error('Error getting skill score history:', error);
      res.status(500).json({ error: 'Failed to retrieve skill score history' });
    }
  }

  /**
   * Recalculate skill score for authenticated user
   * POST /api/skill-score/recalculate
   */
  async recalculateScore(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.jwtPayload?.userId;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const skillScore = await skillScoringService.recalculateAndUpdateScore(
        userId,
        'manual_recalculation'
      );

      res.json({
        message: 'Skill score recalculated successfully',
        skillScore,
      });
    } catch (error) {
      console.error('Error recalculating skill score:', error);
      res.status(500).json({ error: 'Failed to recalculate skill score' });
    }
  }

  /**
   * Analyze skill gaps against a career goal
   * GET /api/skill-score/gap-analysis/:careerGoalId
   */
  async analyzeSkillGaps(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.jwtPayload?.userId;
      const { careerGoalId } = req.params;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      if (!careerGoalId) {
        res.status(400).json({ error: 'Career goal ID is required' });
        return;
      }

      const analysis = await skillScoringService.analyzeSkillGaps(userId, careerGoalId);

      res.json(analysis);
    } catch (error) {
      console.error('Error analyzing skill gaps:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to analyze skill gaps';
      res.status(500).json({ error: errorMessage });
    }
  }
}
