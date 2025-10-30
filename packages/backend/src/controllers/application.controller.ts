import { Request, Response } from 'express';
import { applicationService } from '../services/application.service';
import { followUpReminderService } from '../services/follow-up-reminder.service';
import { ApplicationStatus } from '@givemejobs/shared-types';

/**
 * Application Controller
 * Handles HTTP requests for job application management
 */
export class ApplicationController {
  /**
   * Create a new job application
   * POST /api/applications
   */
  async createApplication(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.jwtPayload?.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const { jobId, status, resumeId, coverLetterId, applicationMethod, notes } = req.body;

      // Validate required fields
      if (!jobId) {
        res.status(400).json({
          success: false,
          message: 'Job ID is required',
        });
        return;
      }

      // Validate status if provided
      if (status && !Object.values(ApplicationStatus).includes(status)) {
        res.status(400).json({
          success: false,
          message: 'Invalid application status',
        });
        return;
      }

      const application = await applicationService.createApplication({
        userId,
        jobId,
        status,
        resumeId,
        coverLetterId,
        applicationMethod,
        notes,
      });

      res.status(201).json({
        success: true,
        data: application,
        message: 'Application created successfully',
      });
    } catch (error: any) {
      console.error('Error creating application:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create application',
        error: error.message,
      });
    }
  }

  /**
   * Get a specific application
   * GET /api/applications/:id
   */
  async getApplication(req: Request, res: Response): Promise<void> {
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

      const application = await applicationService.getApplicationById(id, userId);

      res.json({
        success: true,
        data: application,
      });
    } catch (error: any) {
      console.error('Error fetching application:', error);

      if (error.message === 'Application not found') {
        res.status(404).json({
          success: false,
          message: 'Application not found',
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Failed to fetch application',
        error: error.message,
      });
    }
  }

  /**
   * Get all applications for the authenticated user
   * GET /api/applications
   */
  async getUserApplications(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.jwtPayload?.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const { status, jobId, fromDate, toDate } = req.query;

      const filters: any = {};

      if (status) {
        if (!Object.values(ApplicationStatus).includes(status as ApplicationStatus)) {
          res.status(400).json({
            success: false,
            message: 'Invalid status filter',
          });
          return;
        }
        filters.status = status as ApplicationStatus;
      }

      if (jobId) {
        filters.jobId = jobId as string;
      }

      if (fromDate) {
        filters.fromDate = new Date(fromDate as string);
      }

      if (toDate) {
        filters.toDate = new Date(toDate as string);
      }

      const applications = await applicationService.getUserApplications(userId, filters);

      res.json({
        success: true,
        data: applications,
        count: applications.length,
      });
    } catch (error: any) {
      console.error('Error fetching applications:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch applications',
        error: error.message,
      });
    }
  }

  /**
   * Update an application
   * PUT /api/applications/:id
   */
  async updateApplication(req: Request, res: Response): Promise<void> {
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

      const { resumeId, coverLetterId, applicationMethod, followUpDate, interviewDate, offerDetails } = req.body;

      const updates: any = {};

      if (resumeId !== undefined) updates.resumeId = resumeId;
      if (coverLetterId !== undefined) updates.coverLetterId = coverLetterId;
      if (applicationMethod !== undefined) updates.applicationMethod = applicationMethod;
      if (followUpDate !== undefined) updates.followUpDate = new Date(followUpDate);
      if (interviewDate !== undefined) updates.interviewDate = new Date(interviewDate);
      if (offerDetails !== undefined) updates.offerDetails = offerDetails;

      const application = await applicationService.updateApplication(id, userId, updates);

      res.json({
        success: true,
        data: application,
        message: 'Application updated successfully',
      });
    } catch (error: any) {
      console.error('Error updating application:', error);

      if (error.message === 'Application not found') {
        res.status(404).json({
          success: false,
          message: 'Application not found',
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Failed to update application',
        error: error.message,
      });
    }
  }

  /**
   * Delete an application
   * DELETE /api/applications/:id
   */
  async deleteApplication(req: Request, res: Response): Promise<void> {
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

      const deleted = await applicationService.deleteApplication(id, userId);

      if (!deleted) {
        res.status(404).json({
          success: false,
          message: 'Application not found',
        });
        return;
      }

      res.json({
        success: true,
        message: 'Application deleted successfully',
      });
    } catch (error: any) {
      console.error('Error deleting application:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete application',
        error: error.message,
      });
    }
  }

  /**
   * Update application status
   * PATCH /api/applications/:id/status
   */
  async updateStatus(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.jwtPayload?.userId;
      const { id } = req.params;
      const { status, notes } = req.body;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      if (!status) {
        res.status(400).json({
          success: false,
          message: 'Status is required',
        });
        return;
      }

      // Validate status value
      if (!Object.values(ApplicationStatus).includes(status)) {
        res.status(400).json({
          success: false,
          message: 'Invalid status value',
        });
        return;
      }

      const application = await applicationService.updateApplicationStatus(
        id,
        userId,
        status as ApplicationStatus,
        notes
      );

      res.json({
        success: true,
        data: application,
        message: 'Application status updated successfully',
      });
    } catch (error: any) {
      console.error('Error updating application status:', error);

      if (error.message === 'Application not found') {
        res.status(404).json({
          success: false,
          message: 'Application not found',
        });
        return;
      }

      if (error.message.includes('Invalid status transition')) {
        res.status(400).json({
          success: false,
          message: error.message,
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Failed to update application status',
        error: error.message,
      });
    }
  }

  /**
   * Get status change history
   * GET /api/applications/:id/status-history
   */
  async getStatusHistory(req: Request, res: Response): Promise<void> {
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

      const history = await applicationService.getStatusHistory(id, userId);

      res.json({
        success: true,
        data: history,
      });
    } catch (error: any) {
      console.error('Error fetching status history:', error);

      if (error.message === 'Application not found') {
        res.status(404).json({
          success: false,
          message: 'Application not found',
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Failed to fetch status history',
        error: error.message,
      });
    }
  }

  /**
   * Add a note to an application
   * POST /api/applications/:id/notes
   */
  async addNote(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.jwtPayload?.userId;
      const { id } = req.params;
      const { content, type } = req.body;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      if (!content || content.trim().length === 0) {
        res.status(400).json({
          success: false,
          message: 'Note content is required',
        });
        return;
      }

      // Validate type if provided
      const validTypes = ['general', 'interview', 'feedback', 'follow-up'];
      if (type && !validTypes.includes(type)) {
        res.status(400).json({
          success: false,
          message: 'Invalid note type. Must be one of: general, interview, feedback, follow-up',
        });
        return;
      }

      const note = await applicationService.addApplicationNote(id, userId, content, type);

      res.status(201).json({
        success: true,
        data: note,
        message: 'Note added successfully',
      });
    } catch (error: any) {
      console.error('Error adding note:', error);

      if (error.message === 'Application not found') {
        res.status(404).json({
          success: false,
          message: 'Application not found',
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Failed to add note',
        error: error.message,
      });
    }
  }

  /**
   * Get all notes for an application
   * GET /api/applications/:id/notes
   */
  async getNotes(req: Request, res: Response): Promise<void> {
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

      const notes = await applicationService.getApplicationNotesPublic(id, userId);

      res.json({
        success: true,
        data: notes,
      });
    } catch (error: any) {
      console.error('Error fetching notes:', error);

      if (error.message === 'Application not found') {
        res.status(404).json({
          success: false,
          message: 'Application not found',
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Failed to fetch notes',
        error: error.message,
      });
    }
  }

  /**
   * Update a note
   * PUT /api/applications/:id/notes/:noteId
   */
  async updateNote(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.jwtPayload?.userId;
      const { id, noteId } = req.params;
      const { content } = req.body;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      if (!content || content.trim().length === 0) {
        res.status(400).json({
          success: false,
          message: 'Note content is required',
        });
        return;
      }

      const note = await applicationService.updateApplicationNote(noteId, id, userId, content);

      res.json({
        success: true,
        data: note,
        message: 'Note updated successfully',
      });
    } catch (error: any) {
      console.error('Error updating note:', error);

      if (error.message === 'Note not found') {
        res.status(404).json({
          success: false,
          message: 'Note not found',
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Failed to update note',
        error: error.message,
      });
    }
  }

  /**
   * Delete a note
   * DELETE /api/applications/:id/notes/:noteId
   */
  async deleteNote(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.jwtPayload?.userId;
      const { id, noteId } = req.params;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const deleted = await applicationService.deleteApplicationNote(noteId, id, userId);

      if (!deleted) {
        res.status(404).json({
          success: false,
          message: 'Note not found',
        });
        return;
      }

      res.json({
        success: true,
        message: 'Note deleted successfully',
      });
    } catch (error: any) {
      console.error('Error deleting note:', error);

      if (error.message === 'Note not found') {
        res.status(404).json({
          success: false,
          message: 'Note not found',
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Failed to delete note',
        error: error.message,
      });
    }
  }

  /**
   * Get complete timeline for an application
   * GET /api/applications/:id/timeline
   */
  async getTimeline(req: Request, res: Response): Promise<void> {
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

      const timeline = await applicationService.getApplicationTimelinePublic(id, userId);

      res.json({
        success: true,
        data: timeline,
      });
    } catch (error: any) {
      console.error('Error fetching timeline:', error);

      if (error.message === 'Application not found') {
        res.status(404).json({
          success: false,
          message: 'Application not found',
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Failed to fetch timeline',
        error: error.message,
      });
    }
  }

  /**
   * Get application progress visualization data (health bar)
   * GET /api/applications/:id/progress
   */
  async getProgress(req: Request, res: Response): Promise<void> {
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

      const progress = await applicationService.getApplicationProgress(id, userId);

      res.json({
        success: true,
        data: progress,
      });
    } catch (error: any) {
      console.error('Error fetching application progress:', error);

      if (error.message === 'Application not found') {
        res.status(404).json({
          success: false,
          message: 'Application not found',
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Failed to fetch application progress',
        error: error.message,
      });
    }
  }

  /**
   * Get follow-up reminders for user
   * GET /api/applications/follow-ups
   */
  async getFollowUpReminders(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.jwtPayload?.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const reminders = await followUpReminderService.getUserFollowUpReminders(userId);

      res.json({
        success: true,
        data: reminders,
        count: reminders.length,
      });
    } catch (error: any) {
      console.error('Error fetching follow-up reminders:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch follow-up reminders',
        error: error.message,
      });
    }
  }

  /**
   * Trigger follow-up reminder for an application
   * POST /api/applications/:id/follow-up
   */
  async triggerFollowUp(req: Request, res: Response): Promise<void> {
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

      await followUpReminderService.triggerFollowUpReminder(id, userId);

      res.json({
        success: true,
        message: 'Follow-up reminder sent successfully',
      });
    } catch (error: any) {
      console.error('Error triggering follow-up reminder:', error);

      if (error.message === 'Application not found') {
        res.status(404).json({
          success: false,
          message: 'Application not found',
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Failed to trigger follow-up reminder',
        error: error.message,
      });
    }
  }

  /**
   * Get application statistics for user
   * GET /api/applications/statistics
   */
  async getStatistics(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.jwtPayload?.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const statistics = await applicationService.getUserStatistics(userId);

      res.json({
        success: true,
        data: statistics,
      });
    } catch (error: any) {
      console.error('Error fetching application statistics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch application statistics',
        error: error.message,
      });
    }
  }
}

export const applicationController = new ApplicationController();
