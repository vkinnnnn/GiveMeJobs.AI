import { Request, Response } from 'express';
import { jobService } from '../services/job.service';
import { JobSearchQuery } from '../types/job.types';

export class JobController {
  async searchJobs(req: Request, res: Response): Promise<void> {
    try {
      const query: JobSearchQuery = {
        keywords: req.query.keywords as string,
        location: req.query.location as string,
        remoteType: req.query.remoteType
          ? (req.query.remoteType as string).split(',')
          : undefined,
        jobType: req.query.jobType
          ? (req.query.jobType as string).split(',')
          : undefined,
        salaryMin: req.query.salaryMin
          ? parseInt(req.query.salaryMin as string, 10)
          : undefined,
        salaryMax: req.query.salaryMax
          ? parseInt(req.query.salaryMax as string, 10)
          : undefined,
        postedWithin: req.query.postedWithin
          ? parseInt(req.query.postedWithin as string, 10)
          : undefined,
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
      };

      const result = await jobService.searchJobs(query);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Error searching jobs:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to search jobs',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async getJobById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const job = await jobService.getJobById(id);

      if (!job) {
        res.status(404).json({
          success: false,
          error: 'Job not found',
        });
        return;
      }

      res.json({
        success: true,
        data: job,
      });
    } catch (error) {
      console.error('Error getting job:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get job',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async getJobDetails(req: Request, res: Response): Promise<void> {
    try {
      const { source, externalId } = req.params;

      const job = await jobService.getJobDetails(source, externalId);

      if (!job) {
        res.status(404).json({
          success: false,
          error: 'Job not found',
        });
        return;
      }

      res.json({
        success: true,
        data: job,
      });
    } catch (error) {
      console.error('Error getting job details:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get job details',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async saveJob(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.jwtPayload?.userId;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }
      const { jobId } = req.params;
      const { notes } = req.body;

      // Verify job exists
      const job = await jobService.getJobById(jobId);
      if (!job) {
        res.status(404).json({
          success: false,
          error: 'Job not found',
        });
        return;
      }

      await jobService.saveJob(userId, jobId, notes);

      res.json({
        success: true,
        message: 'Job saved successfully',
      });
    } catch (error) {
      console.error('Error saving job:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to save job',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async unsaveJob(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.jwtPayload?.userId;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }
      const { jobId } = req.params;

      await jobService.unsaveJob(userId, jobId);

      res.json({
        success: true,
        message: 'Job unsaved successfully',
      });
    } catch (error) {
      console.error('Error unsaving job:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to unsave job',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async getSavedJobs(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.jwtPayload?.userId;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      const jobs = await jobService.getSavedJobs(userId);

      res.json({
        success: true,
        data: jobs,
      });
    } catch (error) {
      console.error('Error getting saved jobs:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get saved jobs',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

export const jobController = new JobController();
