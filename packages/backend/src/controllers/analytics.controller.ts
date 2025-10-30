import { Request, Response } from 'express';
import { analyticsService } from '../services/analytics.service';
import { analyticsExportService } from '../services/analytics-export.service';
import { AnalyticsExportOptions } from '../types/analytics.types';

/**
 * Analytics Controller
 * Handles analytics and insights endpoints
 */
export class AnalyticsController {
  /**
   * Get analytics dashboard
   * GET /api/analytics/dashboard
   */
  async getDashboard(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.jwtPayload?.userId;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const period = (req.query.period as 'week' | 'month' | 'quarter' | 'year') || 'month';

      // Validate period
      if (!['week', 'month', 'quarter', 'year'].includes(period)) {
        res.status(400).json({ error: 'Invalid period. Must be week, month, quarter, or year' });
        return;
      }

      const dashboard = await analyticsService.getDashboard(userId, period);

      res.json(dashboard);
    } catch (error) {
      console.error('Error getting analytics dashboard:', error);
      res.status(500).json({ error: 'Failed to get analytics dashboard' });
    }
  }

  /**
   * Get benchmark comparison
   * GET /api/analytics/benchmarks
   */
  async getBenchmarks(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.jwtPayload?.userId;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const benchmarks = await analyticsService.getBenchmarkComparison(userId);

      res.json(benchmarks);
    } catch (error) {
      console.error('Error getting benchmarks:', error);
      res.status(500).json({ error: 'Failed to get benchmarks' });
    }
  }

  /**
   * Get application analytics
   * GET /api/analytics/applications
   */
  async getApplicationAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.jwtPayload?.userId;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const analytics = await analyticsService.getApplicationAnalytics(userId);

      res.json(analytics);
    } catch (error) {
      console.error('Error getting application analytics:', error);
      res.status(500).json({ error: 'Failed to get application analytics' });
    }
  }

  /**
   * Export analytics data
   * POST /api/analytics/export
   */
  async exportAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.jwtPayload?.userId;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { format, period, includeCharts } = req.body as AnalyticsExportOptions;

      // Validate format
      if (!format || !['csv', 'pdf'].includes(format)) {
        res.status(400).json({ error: 'Invalid format. Must be csv or pdf' });
        return;
      }

      // Validate period
      const validPeriods = ['week', 'month', 'quarter', 'year'];
      if (!period || !validPeriods.includes(period)) {
        res.status(400).json({ error: 'Invalid period. Must be week, month, quarter, or year' });
        return;
      }

      if (format === 'csv') {
        const csv = await analyticsExportService.exportToCSV(userId, {
          format,
          period,
          includeCharts,
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="job-search-analytics-${period}.csv"`
        );
        res.send(csv);
      } else if (format === 'pdf') {
        const pdfStream = await analyticsExportService.exportToPDF(userId, {
          format,
          period,
          includeCharts,
        });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="job-search-analytics-${period}.pdf"`
        );
        pdfStream.pipe(res);
      }
    } catch (error) {
      console.error('Error exporting analytics:', error);
      res.status(500).json({ error: 'Failed to export analytics' });
    }
  }
}

export const analyticsController = new AnalyticsController();
