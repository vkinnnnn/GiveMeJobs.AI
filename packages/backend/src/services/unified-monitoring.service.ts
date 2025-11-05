/**
 * Unified Monitoring Service
 * 
 * Provides centralized monitoring, logging aggregation, and alerting
 * across both Node.js and Python services with distributed tracing.
 */

import { EventEmitter } from 'events';
import logger from './logger.service';
import { serviceDiscoveryService } from './service-discovery.service';
import { loadBalancerService } from './load-balancer.service';
import { pythonServiceRegistry } from './python-service-client';
import { config } from '../config';

export interface MetricData {
  name: string;
  value: number;
  timestamp: Date;
  labels: Record<string, string>;
  service: string;
  type: 'counter' | 'gauge' | 'histogram' | 'summary';
}

export interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  message: string;
  timestamp: Date;
  service: string;
  correlationId?: string;
  metadata: Record<string, any>;
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  condition: string; // e.g., "cpu_usage > 80"
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  services: string[]; // Empty array means all services
  cooldownMinutes: number;
  notificationChannels: string[];
}

export interface Alert {
  id: string;
  ruleId: string;
  ruleName: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  service: string;
  triggeredAt: Date;
  resolvedAt?: Date;
  status: 'active' | 'resolved' | 'acknowledged';
  metadata: Record<string, any>;
}

export interface MonitoringDashboard {
  services: Record<string, ServiceMetrics>;
  systemHealth: SystemHealthMetrics;
  alerts: Alert[];
  performance: PerformanceMetrics;
  timestamp: Date;
}

export interface ServiceMetrics {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  instances: number;
  healthyInstances: number;
  requestsPerSecond: number;
  averageResponseTime: number;
  errorRate: number;
  cpuUsage: number;
  memoryUsage: number;
  lastUpdated: Date;
}

export interface SystemHealthMetrics {
  overallStatus: 'healthy' | 'degraded' | 'unhealthy';
  totalServices: number;
  healthyServices: number;
  totalInstances: number;
  healthyInstances: number;
  totalAlerts: number;
  criticalAlerts: number;
}

export interface PerformanceMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  requestsPerSecond: number;
}

export class UnifiedMonitoringService extends EventEmitter {
  private metrics: Map<string, MetricData[]> = new Map();
  private logs: LogEntry[] = [];
  private alerts: Map<string, Alert> = new Map();
  private alertRules: Map<string, AlertRule> = new Map();
  private alertCooldowns: Map<string, Date> = new Map();
  private readonly maxLogEntries = 10000;
  private readonly maxMetricHistory = 1000;
  private monitoringInterval?: NodeJS.Timeout;

  constructor() {
    super();
    this.initializeDefaultAlertRules();
    this.startMonitoring();
  }

  /**
   * Initialize default alert rules
   */
  private initializeDefaultAlertRules(): void {
    const defaultRules: AlertRule[] = [
      {
        id: 'high-cpu-usage',
        name: 'High CPU Usage',
        description: 'CPU usage is above 80%',
        condition: 'cpu_usage > 80',
        severity: 'high',
        enabled: true,
        services: [],
        cooldownMinutes: 15,
        notificationChannels: ['email', 'slack'],
      },
      {
        id: 'high-memory-usage',
        name: 'High Memory Usage',
        description: 'Memory usage is above 85%',
        condition: 'memory_usage > 85',
        severity: 'high',
        enabled: true,
        services: [],
        cooldownMinutes: 15,
        notificationChannels: ['email', 'slack'],
      },
      {
        id: 'high-error-rate',
        name: 'High Error Rate',
        description: 'Error rate is above 5%',
        condition: 'error_rate > 5',
        severity: 'critical',
        enabled: true,
        services: [],
        cooldownMinutes: 5,
        notificationChannels: ['email', 'slack', 'pagerduty'],
      },
      {
        id: 'service-unavailable',
        name: 'Service Unavailable',
        description: 'Service has no healthy instances',
        condition: 'healthy_instances == 0',
        severity: 'critical',
        enabled: true,
        services: [],
        cooldownMinutes: 1,
        notificationChannels: ['email', 'slack', 'pagerduty'],
      },
      {
        id: 'slow-response-time',
        name: 'Slow Response Time',
        description: 'Average response time is above 5 seconds',
        condition: 'average_response_time > 5000',
        severity: 'medium',
        enabled: true,
        services: [],
        cooldownMinutes: 10,
        notificationChannels: ['slack'],
      },
    ];

    for (const rule of defaultRules) {
      this.alertRules.set(rule.id, rule);
    }

    logger.info('Default alert rules initialized', {
      ruleCount: defaultRules.length,
    });
  }

  /**
   * Start monitoring services
   */
  private startMonitoring(): void {
    // Monitor every 30 seconds
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.collectMetrics();
        await this.evaluateAlertRules();
      } catch (error) {
        logger.error('Monitoring cycle failed', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }, 30000);

    logger.info('Unified monitoring started');
  }

  /**
   * Collect metrics from all services
   */
  private async collectMetrics(): Promise<void> {
    try {
      // Collect Node.js service metrics
      await this.collectNodeJSMetrics();

      // Collect Python service metrics
      await this.collectPythonServiceMetrics();

      // Collect load balancer metrics
      await this.collectLoadBalancerMetrics();

      // Collect service discovery metrics
      await this.collectServiceDiscoveryMetrics();

    } catch (error) {
      logger.error('Metrics collection failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Collect Node.js service metrics
   */
  private async collectNodeJSMetrics(): Promise<void> {
    const process = await import('process');
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    // Memory metrics
    this.recordMetric({
      name: 'memory_usage_mb',
      value: memoryUsage.rss / 1024 / 1024,
      timestamp: new Date(),
      labels: { service: 'nodejs-gateway' },
      service: 'nodejs-gateway',
      type: 'gauge',
    });

    // CPU metrics (approximate)
    this.recordMetric({
      name: 'cpu_usage_percent',
      value: (cpuUsage.user + cpuUsage.system) / 1000000, // Convert to seconds
      timestamp: new Date(),
      labels: { service: 'nodejs-gateway' },
      service: 'nodejs-gateway',
      type: 'gauge',
    });

    // Uptime
    this.recordMetric({
      name: 'uptime_seconds',
      value: process.uptime(),
      timestamp: new Date(),
      labels: { service: 'nodejs-gateway' },
      service: 'nodejs-gateway',
      type: 'gauge',
    });
  }

  /**
   * Collect Python service metrics
   */
  private async collectPythonServiceMetrics(): Promise<void> {
    const services = pythonServiceRegistry.getAll();

    for (const [serviceName, client] of services) {
      try {
        const response = await client.get('/health/detailed', {
          timeout: 10000,
        });

        if (response.success && response.data) {
          const healthData = response.data;

          // System metrics
          if (healthData.system) {
            this.recordMetric({
              name: 'cpu_usage_percent',
              value: healthData.system.cpu_percent || 0,
              timestamp: new Date(),
              labels: { service: serviceName },
              service: serviceName,
              type: 'gauge',
            });

            this.recordMetric({
              name: 'memory_usage_percent',
              value: healthData.system.memory_percent || 0,
              timestamp: new Date(),
              labels: { service: serviceName },
              service: serviceName,
              type: 'gauge',
            });

            this.recordMetric({
              name: 'memory_usage_mb',
              value: healthData.system.process_memory_mb || 0,
              timestamp: new Date(),
              labels: { service: serviceName },
              service: serviceName,
              type: 'gauge',
            });
          }

          // Uptime
          this.recordMetric({
            name: 'uptime_seconds',
            value: healthData.uptime_seconds || 0,
            timestamp: new Date(),
            labels: { service: serviceName },
            service: serviceName,
            type: 'gauge',
          });

          // Service status
          const statusValue = healthData.status === 'healthy' ? 1 : 0;
          this.recordMetric({
            name: 'service_healthy',
            value: statusValue,
            timestamp: new Date(),
            labels: { service: serviceName },
            service: serviceName,
            type: 'gauge',
          });
        }
      } catch (error) {
        logger.warn('Failed to collect metrics from Python service', {
          service: serviceName,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        // Record service as unhealthy
        this.recordMetric({
          name: 'service_healthy',
          value: 0,
          timestamp: new Date(),
          labels: { service: serviceName },
          service: serviceName,
          type: 'gauge',
        });
      }
    }
  }

  /**
   * Collect load balancer metrics
   */
  private async collectLoadBalancerMetrics(): Promise<void> {
    const stats = loadBalancerService.getStats();

    if (typeof stats === 'object' && !Array.isArray(stats)) {
      for (const [serviceName, serviceStats] of Object.entries(stats)) {
        // Request metrics
        this.recordMetric({
          name: 'total_requests',
          value: serviceStats.totalRequests,
          timestamp: new Date(),
          labels: { service: serviceName },
          service: serviceName,
          type: 'counter',
        });

        this.recordMetric({
          name: 'successful_requests',
          value: serviceStats.successfulRequests,
          timestamp: new Date(),
          labels: { service: serviceName },
          service: serviceName,
          type: 'counter',
        });

        this.recordMetric({
          name: 'failed_requests',
          value: serviceStats.failedRequests,
          timestamp: new Date(),
          labels: { service: serviceName },
          service: serviceName,
          type: 'counter',
        });

        // Error rate
        const errorRate = serviceStats.totalRequests > 0 
          ? (serviceStats.failedRequests / serviceStats.totalRequests) * 100 
          : 0;

        this.recordMetric({
          name: 'error_rate_percent',
          value: errorRate,
          timestamp: new Date(),
          labels: { service: serviceName },
          service: serviceName,
          type: 'gauge',
        });

        // Response time
        this.recordMetric({
          name: 'average_response_time_ms',
          value: serviceStats.averageResponseTime,
          timestamp: new Date(),
          labels: { service: serviceName },
          service: serviceName,
          type: 'gauge',
        });
      }
    }
  }

  /**
   * Collect service discovery metrics
   */
  private async collectServiceDiscoveryMetrics(): Promise<void> {
    const stats = serviceDiscoveryService.getStats();

    // Overall metrics
    this.recordMetric({
      name: 'total_services',
      value: stats.totalServices,
      timestamp: new Date(),
      labels: { component: 'service-discovery' },
      service: 'service-discovery',
      type: 'gauge',
    });

    this.recordMetric({
      name: 'total_instances',
      value: stats.totalInstances,
      timestamp: new Date(),
      labels: { component: 'service-discovery' },
      service: 'service-discovery',
      type: 'gauge',
    });

    this.recordMetric({
      name: 'healthy_instances',
      value: stats.healthyInstances,
      timestamp: new Date(),
      labels: { component: 'service-discovery' },
      service: 'service-discovery',
      type: 'gauge',
    });

    // Per-service metrics
    for (const [serviceName, serviceStats] of Object.entries(stats.services)) {
      this.recordMetric({
        name: 'service_instances',
        value: serviceStats.totalInstances,
        timestamp: new Date(),
        labels: { service: serviceName },
        service: serviceName,
        type: 'gauge',
      });

      this.recordMetric({
        name: 'healthy_instances',
        value: serviceStats.healthyInstances,
        timestamp: new Date(),
        labels: { service: serviceName },
        service: serviceName,
        type: 'gauge',
      });
    }
  }

  /**
   * Record a metric
   */
  recordMetric(metric: MetricData): void {
    const key = `${metric.service}:${metric.name}`;
    
    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }

    const metrics = this.metrics.get(key)!;
    metrics.push(metric);

    // Keep only recent metrics
    if (metrics.length > this.maxMetricHistory) {
      metrics.shift();
    }

    this.emit('metricRecorded', metric);
  }

  /**
   * Record a log entry
   */
  recordLog(log: LogEntry): void {
    this.logs.push(log);

    // Keep only recent logs
    if (this.logs.length > this.maxLogEntries) {
      this.logs.shift();
    }

    this.emit('logRecorded', log);

    // Check for error logs that might trigger alerts
    if (log.level === 'error' || log.level === 'fatal') {
      this.checkErrorLogAlerts(log);
    }
  }

  /**
   * Evaluate alert rules
   */
  private async evaluateAlertRules(): Promise<void> {
    for (const [ruleId, rule] of this.alertRules) {
      if (!rule.enabled) {
        continue;
      }

      // Check cooldown
      const lastAlert = this.alertCooldowns.get(ruleId);
      if (lastAlert) {
        const cooldownEnd = new Date(lastAlert.getTime() + rule.cooldownMinutes * 60000);
        if (new Date() < cooldownEnd) {
          continue;
        }
      }

      // Evaluate rule condition
      const triggered = await this.evaluateCondition(rule);
      
      if (triggered) {
        await this.triggerAlert(rule, triggered);
      }
    }
  }

  /**
   * Evaluate a rule condition
   */
  private async evaluateCondition(rule: AlertRule): Promise<any> {
    // Get services to check
    const servicesToCheck = rule.services.length > 0 
      ? rule.services 
      : Array.from(new Set([
          ...Array.from(this.metrics.keys()).map(k => k.split(':')[0]),
          'nodejs-gateway'
        ]));

    for (const serviceName of servicesToCheck) {
      const result = this.evaluateServiceCondition(rule.condition, serviceName);
      if (result) {
        return { service: serviceName, ...result };
      }
    }

    return null;
  }

  /**
   * Evaluate condition for a specific service
   */
  private evaluateServiceCondition(condition: string, serviceName: string): any {
    // Simple condition evaluation - in production, use a proper expression evaluator
    const metrics = this.getLatestMetricsForService(serviceName);

    if (condition.includes('cpu_usage > 80')) {
      const cpuUsage = metrics['cpu_usage_percent'];
      if (cpuUsage && cpuUsage > 80) {
        return { metric: 'cpu_usage_percent', value: cpuUsage };
      }
    }

    if (condition.includes('memory_usage > 85')) {
      const memoryUsage = metrics['memory_usage_percent'];
      if (memoryUsage && memoryUsage > 85) {
        return { metric: 'memory_usage_percent', value: memoryUsage };
      }
    }

    if (condition.includes('error_rate > 5')) {
      const errorRate = metrics['error_rate_percent'];
      if (errorRate && errorRate > 5) {
        return { metric: 'error_rate_percent', value: errorRate };
      }
    }

    if (condition.includes('healthy_instances == 0')) {
      const healthyInstances = metrics['healthy_instances'];
      if (healthyInstances !== undefined && healthyInstances === 0) {
        return { metric: 'healthy_instances', value: healthyInstances };
      }
    }

    if (condition.includes('average_response_time > 5000')) {
      const responseTime = metrics['average_response_time_ms'];
      if (responseTime && responseTime > 5000) {
        return { metric: 'average_response_time_ms', value: responseTime };
      }
    }

    return null;
  }

  /**
   * Get latest metrics for a service
   */
  private getLatestMetricsForService(serviceName: string): Record<string, number> {
    const result: Record<string, number> = {};

    for (const [key, metrics] of this.metrics) {
      if (key.startsWith(`${serviceName}:`)) {
        const metricName = key.split(':')[1];
        const latestMetric = metrics[metrics.length - 1];
        if (latestMetric) {
          result[metricName] = latestMetric.value;
        }
      }
    }

    return result;
  }

  /**
   * Trigger an alert
   */
  private async triggerAlert(rule: AlertRule, context: any): Promise<void> {
    const alertId = `${rule.id}-${Date.now()}`;
    
    const alert: Alert = {
      id: alertId,
      ruleId: rule.id,
      ruleName: rule.name,
      severity: rule.severity,
      message: `${rule.description} - Service: ${context.service}, ${context.metric}: ${context.value}`,
      service: context.service,
      triggeredAt: new Date(),
      status: 'active',
      metadata: context,
    };

    this.alerts.set(alertId, alert);
    this.alertCooldowns.set(rule.id, new Date());

    logger.warn('Alert triggered', {
      alertId,
      ruleName: rule.name,
      severity: rule.severity,
      service: context.service,
      metric: context.metric,
      value: context.value,
    });

    this.emit('alertTriggered', alert);

    // Send notifications
    await this.sendAlertNotifications(alert, rule);
  }

  /**
   * Send alert notifications
   */
  private async sendAlertNotifications(alert: Alert, rule: AlertRule): Promise<void> {
    for (const channel of rule.notificationChannels) {
      try {
        await this.sendNotification(channel, alert);
      } catch (error) {
        logger.error('Failed to send alert notification', {
          channel,
          alertId: alert.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  }

  /**
   * Send notification to a specific channel
   */
  private async sendNotification(channel: string, alert: Alert): Promise<void> {
    // Implementation would depend on the notification channel
    // For now, just log the notification
    logger.info('Alert notification sent', {
      channel,
      alertId: alert.id,
      severity: alert.severity,
      message: alert.message,
    });

    // In a real implementation, you would integrate with:
    // - Email service (SendGrid, SES, etc.)
    // - Slack API
    // - PagerDuty API
    // - Discord webhooks
    // - etc.
  }

  /**
   * Check for error log alerts
   */
  private checkErrorLogAlerts(log: LogEntry): void {
    // Count recent error logs for the service
    const recentErrors = this.logs.filter(l => 
      l.service === log.service &&
      l.level === 'error' &&
      (Date.now() - l.timestamp.getTime()) < 5 * 60 * 1000 // Last 5 minutes
    ).length;

    if (recentErrors >= 10) { // 10 errors in 5 minutes
      // This would trigger an alert rule for high error frequency
      logger.warn('High error frequency detected', {
        service: log.service,
        errorCount: recentErrors,
        timeWindow: '5 minutes',
      });
    }
  }

  /**
   * Get monitoring dashboard data
   */
  getDashboard(): MonitoringDashboard {
    const services: Record<string, ServiceMetrics> = {};
    const serviceNames = new Set<string>();

    // Collect service names
    for (const key of this.metrics.keys()) {
      serviceNames.add(key.split(':')[0]);
    }

    // Build service metrics
    for (const serviceName of serviceNames) {
      const metrics = this.getLatestMetricsForService(serviceName);
      
      services[serviceName] = {
        name: serviceName,
        status: this.determineServiceStatus(metrics),
        instances: metrics['service_instances'] || 1,
        healthyInstances: metrics['healthy_instances'] || (metrics['service_healthy'] ? 1 : 0),
        requestsPerSecond: this.calculateRequestsPerSecond(serviceName),
        averageResponseTime: metrics['average_response_time_ms'] || 0,
        errorRate: metrics['error_rate_percent'] || 0,
        cpuUsage: metrics['cpu_usage_percent'] || 0,
        memoryUsage: metrics['memory_usage_percent'] || 0,
        lastUpdated: new Date(),
      };
    }

    // Calculate system health
    const totalServices = serviceNames.size;
    const healthyServices = Object.values(services).filter(s => s.status === 'healthy').length;
    const totalInstances = Object.values(services).reduce((sum, s) => sum + s.instances, 0);
    const healthyInstances = Object.values(services).reduce((sum, s) => sum + s.healthyInstances, 0);
    const activeAlerts = Array.from(this.alerts.values()).filter(a => a.status === 'active');
    const criticalAlerts = activeAlerts.filter(a => a.severity === 'critical');

    const systemHealth: SystemHealthMetrics = {
      overallStatus: this.determineOverallStatus(services, activeAlerts),
      totalServices,
      healthyServices,
      totalInstances,
      healthyInstances,
      totalAlerts: activeAlerts.length,
      criticalAlerts: criticalAlerts.length,
    };

    // Calculate performance metrics
    const performance: PerformanceMetrics = this.calculatePerformanceMetrics();

    return {
      services,
      systemHealth,
      alerts: activeAlerts,
      performance,
      timestamp: new Date(),
    };
  }

  /**
   * Determine service status from metrics
   */
  private determineServiceStatus(metrics: Record<string, number>): 'healthy' | 'degraded' | 'unhealthy' {
    if (metrics['service_healthy'] === 0 || metrics['healthy_instances'] === 0) {
      return 'unhealthy';
    }

    if (metrics['cpu_usage_percent'] > 80 || 
        metrics['memory_usage_percent'] > 85 || 
        metrics['error_rate_percent'] > 5) {
      return 'degraded';
    }

    return 'healthy';
  }

  /**
   * Determine overall system status
   */
  private determineOverallStatus(
    services: Record<string, ServiceMetrics>,
    alerts: Alert[]
  ): 'healthy' | 'degraded' | 'unhealthy' {
    const criticalAlerts = alerts.filter(a => a.severity === 'critical');
    if (criticalAlerts.length > 0) {
      return 'unhealthy';
    }

    const unhealthyServices = Object.values(services).filter(s => s.status === 'unhealthy');
    if (unhealthyServices.length > 0) {
      return 'unhealthy';
    }

    const degradedServices = Object.values(services).filter(s => s.status === 'degraded');
    if (degradedServices.length > 0) {
      return 'degraded';
    }

    return 'healthy';
  }

  /**
   * Calculate requests per second for a service
   */
  private calculateRequestsPerSecond(serviceName: string): number {
    const key = `${serviceName}:total_requests`;
    const metrics = this.metrics.get(key);
    
    if (!metrics || metrics.length < 2) {
      return 0;
    }

    const recent = metrics.slice(-2);
    const timeDiff = (recent[1].timestamp.getTime() - recent[0].timestamp.getTime()) / 1000;
    const requestDiff = recent[1].value - recent[0].value;

    return timeDiff > 0 ? requestDiff / timeDiff : 0;
  }

  /**
   * Calculate overall performance metrics
   */
  private calculatePerformanceMetrics(): PerformanceMetrics {
    let totalRequests = 0;
    let successfulRequests = 0;
    let failedRequests = 0;
    let totalResponseTime = 0;
    let responseTimeCount = 0;

    for (const [key, metrics] of this.metrics) {
      const latest = metrics[metrics.length - 1];
      if (!latest) continue;

      if (key.includes(':total_requests')) {
        totalRequests += latest.value;
      } else if (key.includes(':successful_requests')) {
        successfulRequests += latest.value;
      } else if (key.includes(':failed_requests')) {
        failedRequests += latest.value;
      } else if (key.includes(':average_response_time_ms')) {
        totalResponseTime += latest.value;
        responseTimeCount++;
      }
    }

    const averageResponseTime = responseTimeCount > 0 ? totalResponseTime / responseTimeCount : 0;

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      averageResponseTime,
      p95ResponseTime: averageResponseTime * 1.5, // Approximation
      p99ResponseTime: averageResponseTime * 2, // Approximation
      requestsPerSecond: this.calculateOverallRequestsPerSecond(),
    };
  }

  /**
   * Calculate overall requests per second
   */
  private calculateOverallRequestsPerSecond(): number {
    let totalRps = 0;
    const serviceNames = new Set<string>();

    for (const key of this.metrics.keys()) {
      serviceNames.add(key.split(':')[0]);
    }

    for (const serviceName of serviceNames) {
      totalRps += this.calculateRequestsPerSecond(serviceName);
    }

    return totalRps;
  }

  /**
   * Get metrics for a specific service
   */
  getServiceMetrics(serviceName: string, metricName?: string): MetricData[] {
    if (metricName) {
      const key = `${serviceName}:${metricName}`;
      return this.metrics.get(key) || [];
    }

    const serviceMetrics: MetricData[] = [];
    for (const [key, metrics] of this.metrics) {
      if (key.startsWith(`${serviceName}:`)) {
        serviceMetrics.push(...metrics);
      }
    }

    return serviceMetrics.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Get logs for a specific service
   */
  getServiceLogs(serviceName: string, level?: string): LogEntry[] {
    return this.logs.filter(log => 
      log.service === serviceName && 
      (!level || log.level === level)
    );
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): Alert[] {
    return Array.from(this.alerts.values()).filter(alert => alert.status === 'active');
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.get(alertId);
    if (alert && alert.status === 'active') {
      alert.status = 'acknowledged';
      this.emit('alertAcknowledged', alert);
      return true;
    }
    return false;
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.get(alertId);
    if (alert && alert.status !== 'resolved') {
      alert.status = 'resolved';
      alert.resolvedAt = new Date();
      this.emit('alertResolved', alert);
      return true;
    }
    return false;
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.metrics.clear();
    this.logs.length = 0;
    this.alerts.clear();
    this.alertRules.clear();
    this.alertCooldowns.clear();
    this.removeAllListeners();

    logger.info('Unified monitoring cleanup completed');
  }
}

// Create singleton instance
export const unifiedMonitoringService = new UnifiedMonitoringService();

export default unifiedMonitoringService;