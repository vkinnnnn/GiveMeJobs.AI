import { Request, Response } from 'express';
import { gdprService } from '../services/gdpr.service';
import logger from '../services/logger.service';

export class GDPRController {
  /**
   * Request data export
   */
  async requestDataExport(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { format = 'json' } = req.body;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      if (!['json', 'csv'].includes(format)) {
        res.status(400).json({ error: 'Invalid format. Must be json or csv' });
        return;
      }

      const request = await gdprService.requestDataExport(userId, format);

      res.status(202).json({
        message: 'Data export request submitted',
        request: {
          id: request.id,
          status: request.status,
          format: request.exportFormat,
          requestedAt: request.requestedAt,
        },
      });
    } catch (error) {
      logger.error('Error requesting data export:', error);
      res.status(500).json({ error: 'Failed to request data export' });
    }
  }

  /**
   * Get data export request status
   */
  async getDataExportRequest(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { requestId } = req.params;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const request = await gdprService.getDataExportRequest(requestId);

      if (!request) {
        res.status(404).json({ error: 'Export request not found' });
        return;
      }

      if (request.userId !== userId) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }

      res.json({ request });
    } catch (error) {
      logger.error('Error getting data export request:', error);
      res.status(500).json({ error: 'Failed to get export request' });
    }
  }

  /**
   * Get all data export requests for user
   */
  async getUserDataExportRequests(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const requests = await gdprService.getUserDataExportRequests(userId);

      res.json({ requests });
    } catch (error) {
      logger.error('Error getting user data export requests:', error);
      res.status(500).json({ error: 'Failed to get export requests' });
    }
  }

  /**
   * Request account deletion
   */
  async requestAccountDeletion(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { reason } = req.body;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      // Check if there's already a pending deletion request
      const existingRequest = await gdprService.getAccountDeletionRequest(userId);
      if (existingRequest) {
        res.status(400).json({
          error: 'Account deletion already scheduled',
          request: existingRequest,
        });
        return;
      }

      const request = await gdprService.requestAccountDeletion(userId, reason);

      res.status(202).json({
        message: 'Account deletion scheduled',
        request: {
          id: request.id,
          status: request.status,
          scheduledDeletionAt: request.scheduledDeletionAt,
          requestedAt: request.requestedAt,
        },
        notice:
          'Your account will be deleted in 30 days. You can cancel this request before then.',
      });
    } catch (error) {
      logger.error('Error requesting account deletion:', error);
      res.status(500).json({ error: 'Failed to request account deletion' });
    }
  }

  /**
   * Cancel account deletion
   */
  async cancelAccountDeletion(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const existingRequest = await gdprService.getAccountDeletionRequest(userId);
      if (!existingRequest) {
        res.status(404).json({ error: 'No pending deletion request found' });
        return;
      }

      const request = await gdprService.cancelAccountDeletion(existingRequest.id);

      res.json({
        message: 'Account deletion cancelled',
        request,
      });
    } catch (error) {
      logger.error('Error cancelling account deletion:', error);
      res.status(500).json({ error: 'Failed to cancel account deletion' });
    }
  }

  /**
   * Get account deletion request status
   */
  async getAccountDeletionRequest(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const request = await gdprService.getAccountDeletionRequest(userId);

      if (!request) {
        res.status(404).json({ error: 'No pending deletion request found' });
        return;
      }

      res.json({ request });
    } catch (error) {
      logger.error('Error getting account deletion request:', error);
      res.status(500).json({ error: 'Failed to get deletion request' });
    }
  }
}

export const gdprController = new GDPRController();
