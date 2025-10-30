import { Request, Response } from 'express';
import { auditLogService } from '../services/audit-log.service';
import logger from '../services/logger.service';

export class AuditLogController {
  /**
   * Get user's own audit logs
   */
  async getUserAuditLogs(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { limit = 100, offset = 0 } = req.query;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const logs = await auditLogService.getUserAuditLogs(
        userId,
        parseInt(limit as string),
        parseInt(offset as string)
      );

      res.json({ logs });
    } catch (error) {
      logger.error('Error getting user audit logs:', error);
      res.status(500).json({ error: 'Failed to get audit logs' });
    }
  }

  /**
   * Query audit logs (admin only)
   */
  async queryAuditLogs(req: Request, res: Response): Promise<void> {
    try {
      const {
        userId,
        action,
        resourceType,
        resourceId,
        status,
        startDate,
        endDate,
        limit = 100,
        offset = 0,
      } = req.query;

      const logs = await auditLogService.query({
        userId: userId as string,
        action: action as string,
        resourceType: resourceType as string,
        resourceId: resourceId as string,
        status: status as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      });

      res.json({ logs });
    } catch (error) {
      logger.error('Error querying audit logs:', error);
      res.status(500).json({ error: 'Failed to query audit logs' });
    }
  }

  /**
   * Get audit logs for a specific resource (admin only)
   */
  async getResourceAuditLogs(req: Request, res: Response): Promise<void> {
    try {
      const { resourceType, resourceId } = req.params;
      const { limit = 100 } = req.query;

      const logs = await auditLogService.getResourceAuditLogs(
        resourceType,
        resourceId,
        parseInt(limit as string)
      );

      res.json({ logs });
    } catch (error) {
      logger.error('Error getting resource audit logs:', error);
      res.status(500).json({ error: 'Failed to get resource audit logs' });
    }
  }

  /**
   * Get failed authentication attempts (admin only)
   */
  async getFailedAuthAttempts(req: Request, res: Response): Promise<void> {
    try {
      const { userId, hours = 24 } = req.query;

      const logs = await auditLogService.getFailedAuthAttempts(
        userId as string,
        parseInt(hours as string)
      );

      res.json({ logs });
    } catch (error) {
      logger.error('Error getting failed auth attempts:', error);
      res.status(500).json({ error: 'Failed to get failed auth attempts' });
    }
  }

  /**
   * Get security events (admin only)
   */
  async getSecurityEvents(req: Request, res: Response): Promise<void> {
    try {
      const { hours = 24 } = req.query;

      const logs = await auditLogService.getSecurityEvents(parseInt(hours as string));

      res.json({ logs });
    } catch (error) {
      logger.error('Error getting security events:', error);
      res.status(500).json({ error: 'Failed to get security events' });
    }
  }

  /**
   * Get audit statistics (admin only)
   */
  async getAuditStatistics(req: Request, res: Response): Promise<void> {
    try {
      const { userId, days = 30 } = req.query;

      const statistics = await auditLogService.getStatistics(
        userId as string,
        parseInt(days as string)
      );

      res.json(statistics);
    } catch (error) {
      logger.error('Error getting audit statistics:', error);
      res.status(500).json({ error: 'Failed to get audit statistics' });
    }
  }
}

export const auditLogController = new AuditLogController();
