import { Logger } from './logger.service';
import { metricsService } from './metrics.service';

const logger = new Logger('PerformanceMonitor');

export interface PerformanceMetrics {
  operation: string;
  duration: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

class PerformanceMonitorService {
  private performanceThresholds = {
    api: {
      warning: 2000, // 2 seconds
      critical: 5000, // 5 seconds
    },
    database: {
      warning: 500, // 500ms
      critical: 2000, // 2 seconds
    },
    externalApi: {
      warning: 3000, // 3 seconds
      critical: 10000, // 10 seconds
    },
  };

  /**
   * Track API endpoint performance
   */
  trackApiPerformance(
    method: string,
    route: string,
    duration: number,
    statusCode: number,
    metadata?: Record<string, any>
  ) {
    // Log performance metrics
    if (duration > this.performanceThresholds.api.critical) {
      logger.warn(`Critical API performance: ${method} ${route} took ${duration}ms`, {
        method,
        route,
        duration,
        statusCode,
        severity: 'critical',
        ...metadata,
      });
    } else if (duration > this.performanceThresholds.api.warning) {
      logger.warn(`Slow API performance: ${method} ${route} took ${duration}ms`, {
        method,
        route,
        duration,
        statusCode,
        severity: 'warning',
        ...metadata,
      });
    }

    // Track in Prometheus
    metricsService.trackHttpRequest(method, route, statusCode, duration / 1000);
  }

  /**
   * Track database query performance
   */
  trackDatabaseQuery(
    operation: string,
    table: string,
    duration: number,
    metadata?: Record<string, any>
  ) {
    // Log performance metrics
    if (duration > this.performanceThresholds.database.critical) {
      logger.warn(`Critical database query: ${operation} on ${table} took ${duration}ms`, {
        operation,
        table,
        duration,
        severity: 'critical',
        ...metadata,
      });
    } else if (duration > this.performanceThresholds.database.warning) {
      logger.warn(`Slow database query: ${operation} on ${table} took ${duration}ms`, {
        operation,
        table,
        duration,
        severity: 'warning',
        ...metadata,
      });
    } else {
      logger.debug(`Database query: ${operation} on ${table} took ${duration}ms`, {
        operation,
        table,
        duration,
        ...metadata,
      });
    }

    // Track in Prometheus
    metricsService.trackDbQuery(operation, table, duration / 1000);
  }

  /**
   * Track external API call performance
   */
  trackExternalApiCall(
    service: string,
    endpoint: string,
    duration: number,
    statusCode?: number,
    metadata?: Record<string, any>
  ) {
    // Log performance metrics
    if (duration > this.performanceThresholds.externalApi.critical) {
      logger.warn(`Critical external API call: ${service} ${endpoint} took ${duration}ms`, {
        service,
        endpoint,
        duration,
        statusCode,
        severity: 'critical',
        ...metadata,
      });
    } else if (duration > this.performanceThresholds.externalApi.warning) {
      logger.warn(`Slow external API call: ${service} ${endpoint} took ${duration}ms`, {
        service,
        endpoint,
        duration,
        statusCode,
        severity: 'warning',
        ...metadata,
      });
    } else {
      logger.debug(`External API call: ${service} ${endpoint} took ${duration}ms`, {
        service,
        endpoint,
        duration,
        statusCode,
        ...metadata,
      });
    }

    // Track in Prometheus
    metricsService.trackExternalApiCall(service, endpoint, duration / 1000);
  }

  /**
   * Create a timer for measuring operation duration
   */
  startTimer(): () => number {
    const startTime = Date.now();
    return () => Date.now() - startTime;
  }

  /**
   * Measure async operation performance
   */
  async measureAsync<T>(
    operation: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    const endTimer = this.startTimer();
    try {
      const result = await fn();
      const duration = endTimer();
      logger.logPerformance(operation, duration, metadata);
      return result;
    } catch (error) {
      const duration = endTimer();
      logger.error(`Operation failed: ${operation} (${duration}ms)`, error as Error, metadata);
      throw error;
    }
  }

  /**
   * Measure sync operation performance
   */
  measure<T>(
    operation: string,
    fn: () => T,
    metadata?: Record<string, any>
  ): T {
    const endTimer = this.startTimer();
    try {
      const result = fn();
      const duration = endTimer();
      logger.logPerformance(operation, duration, metadata);
      return result;
    } catch (error) {
      const duration = endTimer();
      logger.error(`Operation failed: ${operation} (${duration}ms)`, error as Error, metadata);
      throw error;
    }
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats() {
    return {
      thresholds: this.performanceThresholds,
      timestamp: new Date(),
    };
  }

  /**
   * Update performance thresholds
   */
  updateThresholds(type: 'api' | 'database' | 'externalApi', thresholds: { warning: number; critical: number }) {
    this.performanceThresholds[type] = thresholds;
    logger.info(`Updated ${type} performance thresholds`, thresholds);
  }
}

export const performanceMonitor = new PerformanceMonitorService();
