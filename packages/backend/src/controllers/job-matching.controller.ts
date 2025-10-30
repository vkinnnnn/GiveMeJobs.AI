import { Request, Response } from 'express';
import { jobMatchingService } from '../services/job-matching.service';
import { JobMatchRequest, JobRecommendationRequest } from '../types/matching.types';

export class JobMatchingController {
  /**
   * Get job recommendations for authenticated user
   * GET /api/jobs/recommendations
   */
  async getRecommendations(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.jwtPayload?.userId;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const filters: JobRecommendationRequest['filters'] = {};

      if (req.query.location) {
        filters.location = req.query.location as string;
      }

      if (req.query.remoteType) {
        filters.remoteType = Array.isArray(req.query.remoteType)
          ? (req.query.remoteType as string[])
          : [req.query.remoteType as string];
      }

      if (req.query.jobType) {
        filters.jobType = Array.isArray(req.query.jobType)
          ? (req.query.jobType as string[])
          : [req.query.jobType as string];
      }

      if (req.query.salaryMin) {
        filters.salaryMin = parseInt(req.query.salaryMin as string);
      }

      if (req.query.minMatchScore) {
        filters.minMatchScore = parseInt(req.query.minMatchScore as string);
      }

      const request: JobRecommendationRequest = {
        userId,
        limit,
        filters: Object.keys(filters).length > 0 ? filters : undefined,
      };

      const recommendations = await jobMatchingService.getJobRecommendations(request);

      res.json({
        success: true,
        data: recommendations,
        count: recommendations.length,
      });
    } catch (error) {
      console.error('Error getting recommendations:', error);
      res.status(500).json({
        error: 'Failed to get job recommendations',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get match analysis for a specific job
   * GET /api/jobs/:jobId/match-analysis
   */
  async getMatchAnalysis(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.jwtPayload?.userId;
      const { jobId } = req.params;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      if (!jobId) {
        res.status(400).json({ error: 'Job ID is required' });
        return;
      }

      const matchRequest: JobMatchRequest = {
        userId,
        jobId,
      };

      const matchScore = await jobMatchingService.calculateMatchScore(matchRequest);

      res.json({
        success: true,
        data: matchScore,
      });
    } catch (error) {
      console.error('Error getting match analysis:', error);
      res.status(500).json({
        error: 'Failed to get match analysis',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Calculate match scores for multiple jobs
   * POST /api/jobs/batch-match
   */
  async batchMatchAnalysis(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.jwtPayload?.userId;
      const { jobIds } = req.body;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      if (!Array.isArray(jobIds) || jobIds.length === 0) {
        res.status(400).json({ error: 'Job IDs array is required' });
        return;
      }

      const matchScores = await Promise.all(
        jobIds.map((jobId) =>
          jobMatchingService.calculateMatchScore({
            userId,
            jobId,
          })
        )
      );

      res.json({
        success: true,
        data: matchScores,
      });
    } catch (error) {
      console.error('Error in batch match analysis:', error);
      res.status(500).json({
        error: 'Failed to calculate match scores',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

export const jobMatchingController = new JobMatchingController();
