/**
 * Service health monitoring service
 */

import { injectable, inject } from 'inversify';
import { Logger } from 'winston';
import { TYPES } from '../types/container.types';
import { ICacheService } from '../types/repository.types';

export interface HealthCheckConfig {
  url: string;
  method: 'GET' | 'POST' | 'HEAD';
  timeout: number;
  interval: number;
  retries: number;
  expectedStatus?: number[];
  expectedBody?: string;
  headers?: Record<string, string>;
}

export interface ServiceHealthMetrics {
  serviceName: string;
  isHealthy: boolean;
  lastCheck: Date;
  lastHealthyCheck?: Date;
  consecutiveFailures: number;
  totalChecks: number;
  successRate: number;
  averageResponseTime: number;
  uptime: number;
  downtimeEvents: DowntimeEvent[];
}

export interface DowntimeEvent {
  startTime: Date;
  endTime?: Date;
  duration?: number;
  reason: string;
}

export interface HealthCheckResult {
  serviceName: string;
  isHealthy: boolean;
  responseTime: number;
  statusCode?: number;
  error?: string;
  timestamp: Date;
}

export interface IServiceHealthMonitor {
  addService(serviceName: string, config: HealthCheckConfig): void;
  removeService(serviceName: string): void;
  startMonitoring(): void;
  stopMonitoring(): void;
  getServiceHealth(serviceName: string): ServiceHealthMetrics | null;
  getAllServiceHealth(): ServiceHealthMetrics[];
  performHealthCheck(serviceName: string): Promise<HealthCheckResult>;
  isServiceHealthy(serviceName: string): boolean;
  getOverallSystemHealth(): {
    healthy: number;
    unhealthy: number;
    total: number;
    overallStatus: 'healthy' | 'degraded' | 'unhealthy';
  };
}

@injectable()
export class ServiceHealthMonitor implements IServiceHealthMonitor {
  private services: Map<string, HealthCheckConfig> = new Map();
  private healthMetrics: Map<string, ServiceHealthMetrics> = new Map();
  private monitoringIntervals: Map<string, NodeJS.Timeout> = new Map();
  private isMonitoring: boolean = false;

  constructor(
    @inject(TYPES.Logger) private logger: Logger,
    @inject(TYPES.CacheService) private cache: ICacheService
  ) {
    this.initializeDefaultServices();
  }

  private initializeDefaultServices(): void {
    // Python AI service
    this.addService('python-ai-service', {
      url: (process.env.PYTHON_SERVICE_URL || 'http://localhost:8001') + '/health',
      method: 'GET',
      timeout: 5000,
      interval: 30000, // 30 seconds
      retries: 3,
      expectedStatus: [200],
      headers: {
        'User-Agent': 'GiveMeJobs-HealthMonitor/1.0.0'
      }
    });

    // Analytics service
    this.addService('analytics-service', {
      url: (process.env.ANALYTICS_SERVICE_URL || 'http://localhost:8002') + '/health',
      method: 'GET',
      timeout: 5000,
      interval: 30000,
      retries: 3,
      expectedStatus: [200]
    });

    // Database health check
    this.addService('database', {
      url: 'internal://database-health',
      method: 'GET',
      timeout: 3000,
      interval: 60000, // 1 minute
      retries: 2
    });

    // Redis health check
    this.addService('redis', {
      url: 'internal://redis-health',
      method: 'GET',
      timeout: 3000,
      interval: 60000,
      retries: 2
    });

    this.logger.info('Default health check services initialized', {
      services: Array.from(this.services.keys())
    });
  }

  addService(serviceName: string, config: HealthCheckConfig): void {
    this.services.set(serviceName, config);
    
    // Initialize health metrics
    this.healthMetrics.set(serviceName, {
      serviceName,
      isHealthy: true,
      lastCheck: new Date(),
      consecutiveFailures: 0,
      totalChecks: 0,
      successRate: 100,
      averageResponseTime: 0,
      uptime: 100,
      downtimeEvents: []
    });

    this.logger.info('Health check service added', {
      serviceName,
      url: config.url,
      interval: config.interval
    });

    // Start monitoring if already running
    if (this.isMonitoring) {
      this.startServiceMonitoring(serviceName);
    }
  }

  removeService(serviceName: string): void {
    this.services.delete(serviceName);
    this.healthMetrics.delete(serviceName);
    
    const interval = this.monitoringIntervals.get(serviceName);
    if (interval) {
      clearInterval(interval);
      this.monitoringIntervals.delete(serviceName);
    }

    this.logger.info('Health check service removed', { serviceName });
  }

  startMonitoring(): void {
    if (this.isMonitoring) {
      this.logger.warn('Health monitoring is already running');
      return;
    }

    this.isMonitoring = true;
    
    for (const serviceName of this.services.keys()) {
      this.startServiceMonitoring(serviceName);
    }

    this.logger.info('Health monitoring started', {
      services: Array.from(this.services.keys())
    });
  }

  stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;
    
    for (const [serviceName, interval] of this.monitoringIntervals) {
      clearInterval(interval);
    }
    
    this.monitoringIntervals.clear();
    this.logger.info('Health monitoring stopped');
  }

  private startServiceMonitoring(serviceName: string): void {
    const config = this.services.get(serviceName);
    if (!config) return;

    // Perform initial health check
    this.performHealthCheck(serviceName);

    // Set up recurring health checks
    const interval = setInterval(() => {
      this.performHealthCheck(serviceName);
    }, config.interval);

    this.monitoringIntervals.set(serviceName, interval);
  }

  async performHealthCheck(serviceName: string): Promise<HealthCheckResult> {
    const config = this.services.get(serviceName);
    if (!config) {
      throw new Error(`Service not found: ${serviceName}`);
    }

    const startTime = Date.now();
    let result: HealthCheckResult;

    try {
      if (config.url.startsWith('internal://')) {
        result = await this.performInternalHealthCheck(serviceName, config);
      } else {
        result = await this.performExternalHealthCheck(serviceName, config);
      }
    } catch (error) {
      result = {
        serviceName,
        isHealthy: false,
        responseTime: Date.now() - startTime,
        error: error.message,
        timestamp: new Date()
      };
    }

    // Update metrics
    this.updateHealthMetrics(serviceName, result);

    // Cache the result
    await this.cache.set(
      `health:${serviceName}`,
      JSON.stringify(result),
      300 // 5 minutes TTL
    );

    return result;
  }

  private async performExternalHealthCheck(
    serviceName: string,
    config: HealthCheckConfig
  ): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), config.timeout);

      const response = await fetch(config.url, {
        method: config.method,
        headers: config.headers || {},
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;

      const isHealthy = config.expectedStatus 
        ? config.expectedStatus.includes(response.status)
        : response.ok;

      let bodyCheck = true;
      if (config.expectedBody && isHealthy) {
        const body = await response.text();
        bodyCheck = body.includes(config.expectedBody);
      }

      return {
        serviceName,
        isHealthy: isHealthy && bodyCheck,
        responseTime,
        statusCode: response.status,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        serviceName,
        isHealthy: false,
        responseTime: Date.now() - startTime,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  private async performInternalHealthCheck(
    serviceName: string,
    config: HealthCheckConfig
  ): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      let isHealthy = false;

      switch (config.url) {
        case 'internal://database-health':
          isHealthy = await this.checkDatabaseHealth();
          break;
        case 'internal://redis-health':
          isHealthy = await this.checkRedisHealth();
          break;
        default:
          throw new Error(`Unknown internal health check: ${config.url}`);
      }

      return {
        serviceName,
        isHealthy,
        responseTime: Date.now() - startTime,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        serviceName,
        isHealthy: false,
        responseTime: Date.now() - startTime,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  private async checkDatabaseHealth(): Promise<boolean> {
    try {
      // This would check database connectivity
      // For now, we'll assume it's healthy
      return true;
    } catch (error) {
      this.logger.error('Database health check failed', { error: error.message });
      return false;
    }
  }

  private async checkRedisHealth(): Promise<boolean> {
    try {
      const testResult = await this.cache.healthCheck();
      return testResult.redis || testResult.memory;
    } catch (error) {
      this.logger.error('Redis health check failed', { error: error.message });
      return false;
    }
  }

  private updateHealthMetrics(serviceName: string, result: HealthCheckResult): void {
    const metrics = this.healthMetrics.get(serviceName);
    if (!metrics) return;

    const wasHealthy = metrics.isHealthy;
    metrics.lastCheck = result.timestamp;
    metrics.totalChecks++;

    if (result.isHealthy) {
      metrics.isHealthy = true;
      metrics.lastHealthyCheck = result.timestamp;
      metrics.consecutiveFailures = 0;

      // End any ongoing downtime event
      const lastDowntime = metrics.downtimeEvents[metrics.downtimeEvents.length - 1];
      if (lastDowntime && !lastDowntime.endTime) {
        lastDowntime.endTime = result.timestamp;
        lastDowntime.duration = lastDowntime.endTime.getTime() - lastDowntime.startTime.getTime();
      }
    } else {
      metrics.isHealthy = false;
      metrics.consecutiveFailures++;

      // Start new downtime event if service just became unhealthy
      if (wasHealthy) {
        metrics.downtimeEvents.push({
          startTime: result.timestamp,
          reason: result.error || 'Health check failed'
        });
      }
    }

    // Update success rate
    const recentChecks = Math.min(metrics.totalChecks, 100); // Last 100 checks
    const successfulChecks = recentChecks - Math.min(metrics.consecutiveFailures, recentChecks);
    metrics.successRate = (successfulChecks / recentChecks) * 100;

    // Update average response time (rolling average)
    if (metrics.averageResponseTime === 0) {
      metrics.averageResponseTime = result.responseTime;
    } else {
      metrics.averageResponseTime = (metrics.averageResponseTime * 0.9) + (result.responseTime * 0.1);
    }

    // Calculate uptime
    const totalTime = Date.now() - (metrics.lastHealthyCheck?.getTime() || Date.now());
    const downtimeTotal = metrics.downtimeEvents.reduce((total, event) => {
      const duration = event.duration || (event.endTime ? 
        event.endTime.getTime() - event.startTime.getTime() : 
        Date.now() - event.startTime.getTime());
      return total + duration;
    }, 0);
    
    metrics.uptime = totalTime > 0 ? ((totalTime - downtimeTotal) / totalTime) * 100 : 100;

    this.healthMetrics.set(serviceName, metrics);

    // Log significant health changes
    if (wasHealthy !== result.isHealthy) {
      this.logger.warn('Service health status changed', {
        serviceName,
        previousStatus: wasHealthy ? 'healthy' : 'unhealthy',
        newStatus: result.isHealthy ? 'healthy' : 'unhealthy',
        consecutiveFailures: metrics.consecutiveFailures,
        responseTime: result.responseTime
      });
    }
  }

  getServiceHealth(serviceName: string): ServiceHealthMetrics | null {
    return this.healthMetrics.get(serviceName) || null;
  }

  getAllServiceHealth(): ServiceHealthMetrics[] {
    return Array.from(this.healthMetrics.values());
  }

  isServiceHealthy(serviceName: string): boolean {
    const metrics = this.healthMetrics.get(serviceName);
    return metrics ? metrics.isHealthy : false;
  }

  getOverallSystemHealth(): {
    healthy: number;
    unhealthy: number;
    total: number;
    overallStatus: 'healthy' | 'degraded' | 'unhealthy';
  } {
    const allMetrics = Array.from(this.healthMetrics.values());
    const healthy = allMetrics.filter(m => m.isHealthy).length;
    const total = allMetrics.length;
    const unhealthy = total - healthy;

    let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
    if (healthy === total) {
      overallStatus = 'healthy';
    } else if (healthy > total / 2) {
      overallStatus = 'degraded';
    } else {
      overallStatus = 'unhealthy';
    }

    return {
      healthy,
      unhealthy,
      total,
      overallStatus
    };
  }

  // Utility methods for integration with other services
  async getHealthSummary(): Promise<any> {
    const overall = this.getOverallSystemHealth();
    const services = this.getAllServiceHealth().map(metrics => ({
      name: metrics.serviceName,
      status: metrics.isHealthy ? 'healthy' : 'unhealthy',
      uptime: Math.round(metrics.uptime * 100) / 100,
      responseTime: Math.round(metrics.averageResponseTime),
      lastCheck: metrics.lastCheck
    }));

    return {
      overall,
      services,
      timestamp: new Date().toISOString()
    };
  }

  // Method to get health check history
  async getHealthHistory(serviceName: string, hours: number = 24): Promise<any[]> {
    // This would typically query a time-series database
    // For now, return basic information
    const metrics = this.healthMetrics.get(serviceName);
    if (!metrics) return [];

    return [{
      timestamp: metrics.lastCheck,
      isHealthy: metrics.isHealthy,
      responseTime: metrics.averageResponseTime
    }];
  }
}