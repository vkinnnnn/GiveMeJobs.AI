import { Request, Response } from 'express';
import { securityIncidentService } from '../services/security-incident.service';
import logger from '../services/logger.service';

export class SecurityIncidentController {
  /**
   * Create a new security incident (admin only)
   */
  async createIncident(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const {
        incidentType,
        severity,
        description,
        affectedSystems,
        affectedDataTypes,
        estimatedAffectedUsers,
      } = req.body;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      if (!incidentType || !severity || !description) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      const incident = await securityIncidentService.createIncident({
        incidentType,
        severity,
        status: 'detected',
        description,
        affectedSystems: affectedSystems || [],
        affectedDataTypes: affectedDataTypes || [],
        estimatedAffectedUsers: estimatedAffectedUsers || 0,
        remediationSteps: [],
        createdBy: userId,
      });

      res.status(201).json({
        message: 'Security incident created',
        incident: {
          id: incident.id,
          incidentType: incident.incidentType,
          severity: incident.severity,
          status: incident.status,
          detectedAt: incident.detectedAt,
        },
      });
    } catch (error) {
      logger.error('Error creating security incident:', error);
      res.status(500).json({ error: 'Failed to create security incident' });
    }
  }

  /**
   * Update incident status (admin only)
   */
  async updateIncidentStatus(req: Request, res: Response): Promise<void> {
    try {
      const { incidentId } = req.params;
      const { status, rootCause, remediationSteps } = req.body;

      if (!status) {
        res.status(400).json({ error: 'Status is required' });
        return;
      }

      const validStatuses = ['detected', 'investigating', 'contained', 'resolved', 'closed'];
      if (!validStatuses.includes(status)) {
        res.status(400).json({ error: 'Invalid status' });
        return;
      }

      const incident = await securityIncidentService.updateIncidentStatus(
        incidentId,
        status,
        { rootCause, remediationSteps }
      );

      res.json({
        message: 'Incident status updated',
        incident,
      });
    } catch (error) {
      logger.error('Error updating incident status:', error);
      res.status(500).json({ error: 'Failed to update incident status' });
    }
  }

  /**
   * Get incident by ID (admin only)
   */
  async getIncident(req: Request, res: Response): Promise<void> {
    try {
      const { incidentId } = req.params;

      const incident = await securityIncidentService.getIncident(incidentId);

      if (!incident) {
        res.status(404).json({ error: 'Incident not found' });
        return;
      }

      res.json({ incident });
    } catch (error) {
      logger.error('Error getting incident:', error);
      res.status(500).json({ error: 'Failed to get incident' });
    }
  }

  /**
   * Get all incidents (admin only)
   */
  async getAllIncidents(req: Request, res: Response): Promise<void> {
    try {
      const { status, severity, limit } = req.query;

      const incidents = await securityIncidentService.getAllIncidents({
        status: status as string,
        severity: severity as string,
        limit: limit ? parseInt(limit as string) : undefined,
      });

      res.json({ incidents });
    } catch (error) {
      logger.error('Error getting incidents:', error);
      res.status(500).json({ error: 'Failed to get incidents' });
    }
  }

  /**
   * Notify affected users (admin only)
   */
  async notifyAffectedUsers(req: Request, res: Response): Promise<void> {
    try {
      const { incidentId } = req.params;
      const { userIds } = req.body;

      await securityIncidentService.notifyAffectedUsers(incidentId, userIds);

      res.json({
        message: 'Affected users notified',
      });
    } catch (error) {
      logger.error('Error notifying affected users:', error);
      res.status(500).json({ error: 'Failed to notify affected users' });
    }
  }

  /**
   * Report incident to authorities (admin only)
   */
  async reportToAuthorities(req: Request, res: Response): Promise<void> {
    try {
      const { incidentId } = req.params;

      await securityIncidentService.reportToAuthorities(incidentId);

      res.json({
        message: 'Incident reported to authorities',
      });
    } catch (error) {
      logger.error('Error reporting to authorities:', error);
      res.status(500).json({ error: 'Failed to report to authorities' });
    }
  }

  /**
   * Get user's incident notifications
   */
  async getUserNotifications(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const notifications = await securityIncidentService.getUserNotifications(userId);

      res.json({ notifications });
    } catch (error) {
      logger.error('Error getting user notifications:', error);
      res.status(500).json({ error: 'Failed to get notifications' });
    }
  }

  /**
   * Acknowledge incident notification
   */
  async acknowledgeNotification(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { notificationId } = req.params;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      await securityIncidentService.acknowledgeNotification(notificationId, userId);

      res.json({
        message: 'Notification acknowledged',
      });
    } catch (error) {
      logger.error('Error acknowledging notification:', error);
      res.status(500).json({ error: 'Failed to acknowledge notification' });
    }
  }
}

export const securityIncidentController = new SecurityIncidentController();
