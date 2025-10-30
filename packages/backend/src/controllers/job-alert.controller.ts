import { Request, Response } from 'express';
import { jobAlertService } from '../services/job-alert.service';
import {
  createJobAlertSchema,
  updateJobAlertSchema,
} from '../validators/job-alert.validators';

export class JobAlertController {
  /**
   * Create a new job alert
   * POST /api/jobs/alerts
   */
  async createJobAlert(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const validatedData = createJobAlertSchema.parse(req.body);
      const alert = await jobAlertService.createJobAlert(userId, validatedData);

      res.status(201).json(alert);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        res.status(400).json({ error: 'Validation error', details: error.errors });
        return;
      }
      console.error('Error creating job alert:', error);
      res.status(500).json({ error: 'Failed to create job alert' });
    }
  }

  /**
   * Get all job alerts for the authenticated user
   * GET /api/jobs/alerts
   */
  async getJobAlerts(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const activeOnly = req.query.active === 'true';
      const alerts = await jobAlertService.getUserJobAlerts(userId, activeOnly);

      res.json(alerts);
    } catch (error) {
      console.error('Error fetching job alerts:', error);
      res.status(500).json({ error: 'Failed to fetch job alerts' });
    }
  }

  /**
   * Get a specific job alert by ID
   * GET /api/jobs/alerts/:id
   */
  async getJobAlertById(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const alert = await jobAlertService.getJobAlertById(id, userId);

      if (!alert) {
        res.status(404).json({ error: 'Job alert not found' });
        return;
      }

      res.json(alert);
    } catch (error) {
      console.error('Error fetching job alert:', error);
      res.status(500).json({ error: 'Failed to fetch job alert' });
    }
  }

  /**
   * Update a job alert
   * PUT /api/jobs/alerts/:id
   */
  async updateJobAlert(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const validatedData = updateJobAlertSchema.parse(req.body);
      const alert = await jobAlertService.updateJobAlert(id, userId, validatedData);

      if (!alert) {
        res.status(404).json({ error: 'Job alert not found' });
        return;
      }

      res.json(alert);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        res.status(400).json({ error: 'Validation error', details: error.errors });
        return;
      }
      console.error('Error updating job alert:', error);
      res.status(500).json({ error: 'Failed to update job alert' });
    }
  }

  /**
   * Delete a job alert
   * DELETE /api/jobs/alerts/:id
   */
  async deleteJobAlert(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const deleted = await jobAlertService.deleteJobAlert(id, userId);

      if (!deleted) {
        res.status(404).json({ error: 'Job alert not found' });
        return;
      }

      res.status(204).send();
    } catch (error) {
      console.error('Error deleting job alert:', error);
      res.status(500).json({ error: 'Failed to delete job alert' });
    }
  }

  /**
   * Get notifications for the authenticated user
   * GET /api/notifications
   */
  async getNotifications(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const unreadOnly = req.query.unread === 'true';
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;

      const notifications = await jobAlertService.getUserNotifications(
        userId,
        unreadOnly,
        limit
      );

      res.json(notifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      res.status(500).json({ error: 'Failed to fetch notifications' });
    }
  }

  /**
   * Mark a notification as read
   * PATCH /api/notifications/:id/read
   */
  async markNotificationAsRead(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const updated = await jobAlertService.markNotificationAsRead(id, userId);

      if (!updated) {
        res.status(404).json({ error: 'Notification not found' });
        return;
      }

      res.status(204).send();
    } catch (error) {
      console.error('Error marking notification as read:', error);
      res.status(500).json({ error: 'Failed to mark notification as read' });
    }
  }

  /**
   * Mark all notifications as read
   * PATCH /api/notifications/read-all
   */
  async markAllNotificationsAsRead(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const count = await jobAlertService.markAllNotificationsAsRead(userId);

      res.json({ markedAsRead: count });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      res.status(500).json({ error: 'Failed to mark all notifications as read' });
    }
  }

  /**
   * Delete a notification
   * DELETE /api/notifications/:id
   */
  async deleteNotification(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const deleted = await jobAlertService.deleteNotification(id, userId);

      if (!deleted) {
        res.status(404).json({ error: 'Notification not found' });
        return;
      }

      res.status(204).send();
    } catch (error) {
      console.error('Error deleting notification:', error);
      res.status(500).json({ error: 'Failed to delete notification' });
    }
  }

  /**
   * Get unread notification count
   * GET /api/notifications/unread-count
   */
  async getUnreadCount(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const count = await jobAlertService.getUnreadCount(userId);

      res.json({ count });
    } catch (error) {
      console.error('Error fetching unread count:', error);
      res.status(500).json({ error: 'Failed to fetch unread count' });
    }
  }
}

export const jobAlertController = new JobAlertController();
