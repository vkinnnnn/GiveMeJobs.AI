import { Request, Response } from 'express';
import { interviewPrepService } from '../services/interview-prep.service';

/**
 * Interview Preparation Controller (GURU)
 * Handles HTTP requests for interview preparation
 */
export class InterviewPrepController {
  /**
   * Generate interview preparation package
   * POST /api/interview-prep/generate
   */
  async generateInterviewPrep(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.jwtPayload?.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const { applicationId } = req.body;

      if (!applicationId) {
        res.status(400).json({
          success: false,
          message: 'Application ID is required',
        });
        return;
      }

      const interviewPrep = await interviewPrepService.generateInterviewPrep({
        applicationId,
        userId,
      });

      res.status(201).json({
        success: true,
        data: interviewPrep,
        message: 'Interview preparation generated successfully',
      });
    } catch (error: any) {
      console.error('Error generating interview prep:', error);

      if (error.message === 'Application not found') {
        res.status(404).json({
          success: false,
          message: 'Application not found',
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Failed to generate interview preparation',
        error: error.message,
      });
    }
  }

  /**
   * Get interview prep by ID
   * GET /api/interview-prep/:id
   */
  async getInterviewPrep(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.jwtPayload?.userId;
      const { id } = req.params;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const interviewPrep = await interviewPrepService.getInterviewPrep(id, userId);

      res.json({
        success: true,
        data: interviewPrep,
      });
    } catch (error: any) {
      console.error('Error fetching interview prep:', error);

      if (error.message === 'Interview prep not found') {
        res.status(404).json({
          success: false,
          message: 'Interview prep not found',
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Failed to fetch interview prep',
        error: error.message,
      });
    }
  }

  /**
   * Get interview prep by application ID
   * GET /api/interview-prep/application/:applicationId
   */
  async getInterviewPrepByApplication(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.jwtPayload?.userId;
      const { applicationId } = req.params;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const interviewPrep = await interviewPrepService.getInterviewPrepByApplication(
        applicationId,
        userId
      );

      if (!interviewPrep) {
        res.status(404).json({
          success: false,
          message: 'No interview prep found for this application',
        });
        return;
      }

      res.json({
        success: true,
        data: interviewPrep,
      });
    } catch (error: any) {
      console.error('Error fetching interview prep:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch interview prep',
        error: error.message,
      });
    }
  }

  /**
   * Update interview date
   * PATCH /api/interview-prep/:id/interview-date
   */
  async updateInterviewDate(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.jwtPayload?.userId;
      const { id } = req.params;
      const { interviewDate } = req.body;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      if (!interviewDate) {
        res.status(400).json({
          success: false,
          message: 'Interview date is required',
        });
        return;
      }

      const updated = await interviewPrepService.updateInterviewDate(
        id,
        userId,
        new Date(interviewDate)
      );

      res.json({
        success: true,
        data: updated,
        message: 'Interview date updated successfully',
      });
    } catch (error: any) {
      console.error('Error updating interview date:', error);

      if (error.message === 'Interview prep not found') {
        res.status(404).json({
          success: false,
          message: 'Interview prep not found',
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Failed to update interview date',
        error: error.message,
      });
    }
  }

  /**
   * Create a practice session
   * POST /api/interview-prep/:id/practice
   */
  async createPracticeSession(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.jwtPayload?.userId;
      const { id } = req.params;
      const { questionId, questionText, response, recordingUrl, transcript, duration } = req.body;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      if (!questionId || !questionText || !response) {
        res.status(400).json({
          success: false,
          message: 'Question ID, question text, and response are required',
        });
        return;
      }

      const session = await interviewPrepService.createPracticeSession({
        interviewPrepId: id,
        userId,
        questionId,
        questionText,
        response,
        recordingUrl,
        transcript,
        duration,
      });

      res.status(201).json({
        success: true,
        data: session,
        message: 'Practice session created successfully',
      });
    } catch (error: any) {
      console.error('Error creating practice session:', error);

      if (error.message === 'Interview prep not found') {
        res.status(404).json({
          success: false,
          message: 'Interview prep not found',
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Failed to create practice session',
        error: error.message,
      });
    }
  }

  /**
   * Get practice sessions for an interview prep
   * GET /api/interview-prep/:id/practice
   */
  async getPracticeSessions(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.jwtPayload?.userId;
      const { id } = req.params;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const sessions = await interviewPrepService.getPracticeSessions(id, userId);

      res.json({
        success: true,
        data: sessions,
      });
    } catch (error: any) {
      console.error('Error fetching practice sessions:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch practice sessions',
        error: error.message,
      });
    }
  }

  /**
   * Get practice progress
   * GET /api/interview-prep/:id/progress
   */
  async getPracticeProgress(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.jwtPayload?.userId;
      const { id } = req.params;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const progress = await interviewPrepService.getPracticeProgress(id, userId);

      res.json({
        success: true,
        data: progress,
      });
    } catch (error: any) {
      console.error('Error fetching practice progress:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch practice progress',
        error: error.message,
      });
    }
  }

  /**
   * Analyze practice response
   * POST /api/interview-prep/:id/practice/:practiceId/analyze
   */
  async analyzePracticeResponse(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.jwtPayload?.userId;
      const { practiceId } = req.params;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const analysis = await interviewPrepService.analyzePracticeResponse(
        practiceId,
        userId
      );

      res.json({
        success: true,
        data: analysis,
        message: 'Response analyzed successfully',
      });
    } catch (error: any) {
      console.error('Error analyzing practice response:', error);

      if (error.message === 'Practice session not found') {
        res.status(404).json({
          success: false,
          message: 'Practice session not found',
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Failed to analyze response',
        error: error.message,
      });
    }
  }

  /**
   * Send interview reminder
   * POST /api/interview-prep/:id/reminders
   */
  async sendInterviewReminder(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.jwtPayload?.userId;
      const { id } = req.params;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const { interviewReminderService } = await import('../services/interview-reminder.service');
      await interviewReminderService.sendImmediateReminder(id, userId);

      res.json({
        success: true,
        message: 'Interview reminder sent successfully',
      });
    } catch (error: any) {
      console.error('Error sending interview reminder:', error);

      if (error.message === 'Interview prep not found') {
        res.status(404).json({
          success: false,
          message: 'Interview prep not found',
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Failed to send interview reminder',
        error: error.message,
      });
    }
  }
}

export const interviewPrepController = new InterviewPrepController();
