/**
 * Unified Monitoring Routes
 * 
 * Routes for accessing monitoring dashboard, metrics, logs,
 * and alerting across both Node.js and Python services.
 */

import { Router, Request, Response } from 'express';
import { unifiedMonitoringService } from '../services/unified-monitoring.service';
import { authenticateToken } from '../middleware/auth.middleware';
import { rateLimitPresets } from '../middleware/rate-limit.middleware';
import logger from '../services/logger.service';

const router = Router();

/**
 * Dashboard Routes
 */

// Get monitoring dashboard
router.get('/dashboard',
  rateLimitPresets.healthCheck,
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const correlationId = (req as any).correlationId;

      // Only allow admin users to view monitoring dashboard
      if (req.user?.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Admin access required',
          correlationId,
        });
      }

      const dashboard = unifiedMonitoringService.getDashboard();

      res.json({
        success: true,
        data: dashboard,
        correlationId,
      });

    } catch (error) {
      logger.error('Dashboard request failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        correlationId: (req as any).correlationId,
      });

      res.status(500).json({
        success: false,
        error: 'Dashboard request failed',
        correlationId: (req as any).correlationId,
      });
    }
  }
);

/**
 * Metrics Routes
 */

// Get metrics for all services
router.get('/metrics',
  rateLimitPresets.healthCheck,
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const { service, metric, limit = 100 } = req.query;
      const correlationId = (req as any).correlationId;

      // Only allow admin users to view metrics
      if (req.user?.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Admin access required',
          correlationId,
        });
      }

      let metrics;
      if (service) {
        metrics = unifiedMonitoringService.getServiceMetrics(
          service as string,
          metric as string
        );
      } else {
        // Get all metrics (limited)
        const dashboard = unifiedMonitoringService.getDashboard();
        metrics = dashboard.services;
      }

      // Limit results if needed
      if (Array.isArray(metrics) && limit) {
        metrics = metrics.slice(-parseInt(limit as string));
      }

      res.json({
        success: true,
        data: {
          metrics,
          service: service || 'all',
          metric: metric || 'all',
          count: Array.isArray(metrics) ? metrics.length : Object.keys(metrics).length,
        },
        correlationId,
      });

    } catch (error) {
      logger.error('Metrics request failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        correlationId: (req as any).correlationId,
      });

      res.status(500).json({
        success: false,
        error: 'Metrics request failed',
        correlationId: (req as any).correlationId,
      });
    }
  }
);

// Record custom metric
router.post('/metrics',
  rateLimitPresets.auth,
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const { name, value, labels = {}, type = 'gauge' } = req.body;
      const correlationId = (req as any).correlationId;

      if (!name || value === undefined) {
        return res.status(400).json({
          success: false,
          error: 'Metric name and value are required',
          correlationId,
        });
      }

      unifiedMonitoringService.recordMetric({
        name,
        value: parseFloat(value),
        timestamp: new Date(),
        labels: {
          ...labels,
          source: 'api',
          user: req.user?.id || 'unknown',
        },
        service: labels.service || 'custom',
        type: type as any,
      });

      res.json({
        success: true,
        data: { recorded: true },
        correlationId,
      });

    } catch (error) {
      logger.error('Metric recording failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        correlationId: (req as any).correlationId,
      });

      res.status(500).json({
        success: false,
        error: 'Metric recording failed',
        correlationId: (req as any).correlationId,
      });
    }
  }
);

/**
 * Logs Routes
 */

// Get logs for services
router.get('/logs',
  rateLimitPresets.healthCheck,
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const { service, level, limit = 100 } = req.query;
      const correlationId = (req as any).correlationId;

      // Only allow admin users to view logs
      if (req.user?.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Admin access required',
          correlationId,
        });
      }

      let logs;
      if (service) {
        logs = unifiedMonitoringService.getServiceLogs(
          service as string,
          level as string
        );
      } else {
        // Get all recent logs
        const dashboard = unifiedMonitoringService.getDashboard();
        logs = []; // Would need to implement getAllLogs method
      }

      // Limit and sort results
      if (Array.isArray(logs)) {
        logs = logs
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
          .slice(0, parseInt(limit as string));
      }

      res.json({
        success: true,
        data: {
          logs,
          service: service || 'all',
          level: level || 'all',
          count: logs.length,
        },
        correlationId,
      });

    } catch (error) {
      logger.error('Logs request failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        correlationId: (req as any).correlationId,
      });

      res.status(500).json({
        success: false,
        error: 'Logs request failed',
        correlationId: (req as any).correlationId,
      });
    }
  }
);

// Record custom log entry
router.post('/logs',
  rateLimitPresets.auth,
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const { level, message, service, metadata = {} } = req.body;
      const correlationId = (req as any).correlationId;

      if (!level || !message || !service) {
        return res.status(400).json({
          success: false,
          error: 'Level, message, and service are required',
          correlationId,
        });
      }

      unifiedMonitoringService.recordLog({
        level: level as any,
        message,
        timestamp: new Date(),
        service,
        correlationId,
        metadata: {
          ...metadata,
          source: 'api',
          user: req.user?.id || 'unknown',
        },
      });

      res.json({
        success: true,
        data: { recorded: true },
        correlationId,
      });

    } catch (error) {
      logger.error('Log recording failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        correlationId: (req as any).correlationId,
      });

      res.status(500).json({
        success: false,
        error: 'Log recording failed',
        correlationId: (req as any).correlationId,
      });
    }
  }
);

/**
 * Alerts Routes
 */

// Get active alerts
router.get('/alerts',
  rateLimitPresets.healthCheck,
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const { severity, service } = req.query;
      const correlationId = (req as any).correlationId;

      // Only allow admin users to view alerts
      if (req.user?.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Admin access required',
          correlationId,
        });
      }

      let alerts = unifiedMonitoringService.getActiveAlerts();

      // Filter by severity if specified
      if (severity) {
        alerts = alerts.filter(alert => alert.severity === severity);
      }

      // Filter by service if specified
      if (service) {
        alerts = alerts.filter(alert => alert.service === service);
      }

      // Sort by severity and timestamp
      alerts.sort((a, b) => {
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        const severityDiff = (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0);
        if (severityDiff !== 0) return severityDiff;
        return b.triggeredAt.getTime() - a.triggeredAt.getTime();
      });

      res.json({
        success: true,
        data: {
          alerts,
          count: alerts.length,
          filters: { severity, service },
        },
        correlationId,
      });

    } catch (error) {
      logger.error('Alerts request failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        correlationId: (req as any).correlationId,
      });

      res.status(500).json({
        success: false,
        error: 'Alerts request failed',
        correlationId: (req as any).correlationId,
      });
    }
  }
);

// Acknowledge an alert
router.post('/alerts/:alertId/acknowledge',
  rateLimitPresets.auth,
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const { alertId } = req.params;
      const correlationId = (req as any).correlationId;

      // Only allow admin users to acknowledge alerts
      if (req.user?.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Admin access required',
          correlationId,
        });
      }

      const acknowledged = unifiedMonitoringService.acknowledgeAlert(alertId);

      if (!acknowledged) {
        return res.status(404).json({
          success: false,
          error: 'Alert not found or already acknowledged',
          correlationId,
        });
      }

      logger.info('Alert acknowledged by admin', {
        adminUserId: req.user.id,
        alertId,
        correlationId,
      });

      res.json({
        success: true,
        data: { acknowledged: true },
        correlationId,
      });

    } catch (error) {
      logger.error('Alert acknowledgment failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        correlationId: (req as any).correlationId,
      });

      res.status(500).json({
        success: false,
        error: 'Alert acknowledgment failed',
        correlationId: (req as any).correlationId,
      });
    }
  }
);

// Resolve an alert
router.post('/alerts/:alertId/resolve',
  rateLimitPresets.auth,
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const { alertId } = req.params;
      const correlationId = (req as any).correlationId;

      // Only allow admin users to resolve alerts
      if (req.user?.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Admin access required',
          correlationId,
        });
      }

      const resolved = unifiedMonitoringService.resolveAlert(alertId);

      if (!resolved) {
        return res.status(404).json({
          success: false,
          error: 'Alert not found or already resolved',
          correlationId,
        });
      }

      logger.info('Alert resolved by admin', {
        adminUserId: req.user.id,
        alertId,
        correlationId,
      });

      res.json({
        success: true,
        data: { resolved: true },
        correlationId,
      });

    } catch (error) {
      logger.error('Alert resolution failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        correlationId: (req as any).correlationId,
      });

      res.status(500).json({
        success: false,
        error: 'Alert resolution failed',
        correlationId: (req as any).correlationId,
      });
    }
  }
);

/**
 * System Health Routes
 */

// Get comprehensive system health
router.get('/health/system',
  rateLimitPresets.healthCheck,
  async (req: Request, res: Response) => {
    try {
      const correlationId = (req as any).correlationId;

      const dashboard = unifiedMonitoringService.getDashboard();

      res.json({
        success: true,
        data: {
          systemHealth: dashboard.systemHealth,
          serviceCount: Object.keys(dashboard.services).length,
          alertCount: dashboard.alerts.length,
          timestamp: dashboard.timestamp,
        },
        correlationId,
      });

    } catch (error) {
      logger.error('System health request failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        correlationId: (req as any).correlationId,
      });

      res.status(500).json({
        success: false,
        error: 'System health request failed',
        correlationId: (req as any).correlationId,
      });
    }
  }
);

// Get performance metrics
router.get('/performance',
  rateLimitPresets.healthCheck,
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const correlationId = (req as any).correlationId;

      // Only allow admin users to view performance metrics
      if (req.user?.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Admin access required',
          correlationId,
        });
      }

      const dashboard = unifiedMonitoringService.getDashboard();

      res.json({
        success: true,
        data: dashboard.performance,
        correlationId,
      });

    } catch (error) {
      logger.error('Performance metrics request failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        correlationId: (req as any).correlationId,
      });

      res.status(500).json({
        success: false,
        error: 'Performance metrics request failed',
        correlationId: (req as any).correlationId,
      });
    }
  }
);

/**
 * Export Routes
 */

// Export metrics in Prometheus format
router.get('/export/prometheus',
  rateLimitPresets.healthCheck,
  async (req: Request, res: Response) => {
    try {
      const correlationId = (req as any).correlationId;

      const dashboard = unifiedMonitoringService.getDashboard();
      
      // Convert metrics to Prometheus format
      let prometheusMetrics = '';
      
      for (const [serviceName, serviceMetrics] of Object.entries(dashboard.services)) {
        prometheusMetrics += `# HELP service_healthy Service health status (1 = healthy, 0 = unhealthy)\n`;
        prometheusMetrics += `# TYPE service_healthy gauge\n`;
        prometheusMetrics += `service_healthy{service="${serviceName}"} ${serviceMetrics.status === 'healthy' ? 1 : 0}\n\n`;
        
        prometheusMetrics += `# HELP service_cpu_usage_percent CPU usage percentage\n`;
        prometheusMetrics += `# TYPE service_cpu_usage_percent gauge\n`;
        prometheusMetrics += `service_cpu_usage_percent{service="${serviceName}"} ${serviceMetrics.cpuUsage}\n\n`;
        
        prometheusMetrics += `# HELP service_memory_usage_percent Memory usage percentage\n`;
        prometheusMetrics += `# TYPE service_memory_usage_percent gauge\n`;
        prometheusMetrics += `service_memory_usage_percent{service="${serviceName}"} ${serviceMetrics.memoryUsage}\n\n`;
        
        prometheusMetrics += `# HELP service_error_rate_percent Error rate percentage\n`;
        prometheusMetrics += `# TYPE service_error_rate_percent gauge\n`;
        prometheusMetrics += `service_error_rate_percent{service="${serviceName}"} ${serviceMetrics.errorRate}\n\n`;
      }

      res.setHeader('Content-Type', 'text/plain');
      res.send(prometheusMetrics);

    } catch (error) {
      logger.error('Prometheus export failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        correlationId: (req as any).correlationId,
      });

      res.status(500).json({
        success: false,
        error: 'Prometheus export failed',
        correlationId: (req as any).correlationId,
      });
    }
  }
);

export default router;