/**
 * Load Balancer Service
 * 
 * Provides load balancing capabilities for Python services with
 * health checking, circuit breaking, and automatic failover.
 */

import { EventEmitter } from 'events';
import { serviceDiscoveryService, ServiceInstance, LoadBalancingStrategy } from './service-discovery.service';
import logger from './logger.service';

export interface LoadBalancerConfig {
  strategy: LoadBalancingStrategy;
  healthCheckEnabled: boolean;
  failoverEnabled: boolean;
  maxRetries: number;
  retryDelay: number;
}

export interface LoadBalancerStats {
  serviceName: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  instanceStats: Record<string, {
    requests: number;
    successes: number;
    failures: number;
    averageResponseTime: number;
    lastUsed: Date;
  }>;
}

export class LoadBalancerService extends EventEmitter {
  private stats: Map<string, LoadBalancerStats> = new Map();
  private instanceResponseTimes: Map<string, number[]> = new Map();
  private readonly maxResponseTimeHistory = 100;

  constructor() {
    super();
    this.initializeEventListeners();
  }

  /**
   * Initialize event listeners for service discovery
   */
  private initializeEventListeners(): void {
    serviceDiscoveryService.on('serviceHealthy', (instance: ServiceInstance) => {
      logger.info('Service instance became healthy', {
        instanceId: instance.id,
        serviceName: instance.name,
      });
      this.emit('instanceHealthy', instance);
    });

    serviceDiscoveryService.on('serviceUnhealthy', (instance: ServiceInstance) => {
      logger.warn('Service instance became unhealthy', {
        instanceId: instance.id,
        serviceName: instance.name,
      });
      this.emit('instanceUnhealthy', instance);
    });
  }

  /**
   * Get the best available instance for a service
   */
  async getServiceInstance(
    serviceName: string,
    config: Partial<LoadBalancerConfig> = {}
  ): Promise<ServiceInstance | null> {
    const defaultConfig: LoadBalancerConfig = {
      strategy: { name: 'health-based' },
      healthCheckEnabled: true,
      failoverEnabled: true,
      maxRetries: 3,
      retryDelay: 1000,
    };

    const finalConfig = { ...defaultConfig, ...config };

    // Initialize stats if not exists
    if (!this.stats.has(serviceName)) {
      this.initializeServiceStats(serviceName);
    }

    let instance: ServiceInstance | null = null;
    let attempts = 0;

    while (attempts < finalConfig.maxRetries && !instance) {
      instance = serviceDiscoveryService.discoverService(serviceName, finalConfig.strategy);
      
      if (!instance) {
        logger.warn('No instances available for service', {
          serviceName,
          attempt: attempts + 1,
          maxRetries: finalConfig.maxRetries,
        });
        
        if (attempts < finalConfig.maxRetries - 1) {
          await this.delay(finalConfig.retryDelay * Math.pow(2, attempts));
        }
        attempts++;
        continue;
      }

      // Additional health check if enabled
      if (finalConfig.healthCheckEnabled && instance.health !== 'healthy') {
        const isHealthy = await this.performHealthCheck(instance);
        if (!isHealthy && finalConfig.failoverEnabled) {
          logger.warn('Selected instance failed health check, trying next', {
            instanceId: instance.id,
            serviceName,
          });
          instance = null;
          attempts++;
          continue;
        }
      }

      break;
    }

    if (instance) {
      // Track connection
      serviceDiscoveryService.trackConnection(instance.id);
      this.recordInstanceSelection(serviceName, instance.id);
      
      logger.debug('Instance selected for service', {
        serviceName,
        instanceId: instance.id,
        host: instance.host,
        port: instance.port,
        strategy: finalConfig.strategy.name,
      });
    } else {
      logger.error('Failed to get instance for service after all retries', {
        serviceName,
        maxRetries: finalConfig.maxRetries,
      });
    }

    return instance;
  }

  /**
   * Release a service instance after use
   */
  releaseServiceInstance(
    serviceName: string,
    instanceId: string,
    success: boolean,
    responseTime?: number
  ): void {
    // Release connection
    serviceDiscoveryService.releaseConnection(instanceId);

    // Record stats
    this.recordRequestResult(serviceName, instanceId, success, responseTime);

    logger.debug('Instance released', {
      serviceName,
      instanceId,
      success,
      responseTime,
    });
  }

  /**
   * Perform health check on an instance
   */
  private async performHealthCheck(instance: ServiceInstance): Promise<boolean> {
    try {
      const axios = (await import('axios')).default;
      const url = `${instance.protocol}://${instance.host}:${instance.port}/health`;
      
      const response = await axios.get(url, {
        timeout: 5000,
        validateStatus: (status) => status < 500,
      });

      return response.status < 400;
    } catch (error) {
      logger.debug('Health check failed for instance', {
        instanceId: instance.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  /**
   * Initialize stats for a service
   */
  private initializeServiceStats(serviceName: string): void {
    this.stats.set(serviceName, {
      serviceName,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      instanceStats: {},
    });
  }

  /**
   * Record instance selection
   */
  private recordInstanceSelection(serviceName: string, instanceId: string): void {
    const stats = this.stats.get(serviceName)!;
    
    if (!stats.instanceStats[instanceId]) {
      stats.instanceStats[instanceId] = {
        requests: 0,
        successes: 0,
        failures: 0,
        averageResponseTime: 0,
        lastUsed: new Date(),
      };
    }

    stats.instanceStats[instanceId].lastUsed = new Date();
  }

  /**
   * Record request result
   */
  private recordRequestResult(
    serviceName: string,
    instanceId: string,
    success: boolean,
    responseTime?: number
  ): void {
    const stats = this.stats.get(serviceName)!;
    
    // Update service-level stats
    stats.totalRequests++;
    if (success) {
      stats.successfulRequests++;
    } else {
      stats.failedRequests++;
    }

    // Update instance-level stats
    if (!stats.instanceStats[instanceId]) {
      stats.instanceStats[instanceId] = {
        requests: 0,
        successes: 0,
        failures: 0,
        averageResponseTime: 0,
        lastUsed: new Date(),
      };
    }

    const instanceStats = stats.instanceStats[instanceId];
    instanceStats.requests++;
    if (success) {
      instanceStats.successes++;
    } else {
      instanceStats.failures++;
    }

    // Update response times
    if (responseTime !== undefined) {
      this.updateResponseTime(serviceName, instanceId, responseTime);
    }
  }

  /**
   * Update response time statistics
   */
  private updateResponseTime(serviceName: string, instanceId: string, responseTime: number): void {
    const stats = this.stats.get(serviceName)!;
    const instanceStats = stats.instanceStats[instanceId];

    // Update instance response time
    if (!this.instanceResponseTimes.has(instanceId)) {
      this.instanceResponseTimes.set(instanceId, []);
    }

    const responseTimes = this.instanceResponseTimes.get(instanceId)!;
    responseTimes.push(responseTime);

    // Keep only recent response times
    if (responseTimes.length > this.maxResponseTimeHistory) {
      responseTimes.shift();
    }

    // Calculate average
    instanceStats.averageResponseTime = 
      responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;

    // Update service-level average
    const allResponseTimes: number[] = [];
    for (const [id, times] of this.instanceResponseTimes) {
      if (stats.instanceStats[id]) {
        allResponseTimes.push(...times);
      }
    }

    if (allResponseTimes.length > 0) {
      stats.averageResponseTime = 
        allResponseTimes.reduce((sum, time) => sum + time, 0) / allResponseTimes.length;
    }
  }

  /**
   * Get load balancer statistics
   */
  getStats(serviceName?: string): LoadBalancerStats | Record<string, LoadBalancerStats> {
    if (serviceName) {
      return this.stats.get(serviceName) || this.createEmptyStats(serviceName);
    }

    const allStats: Record<string, LoadBalancerStats> = {};
    for (const [name, stats] of this.stats) {
      allStats[name] = stats;
    }

    return allStats;
  }

  /**
   * Create empty stats for a service
   */
  private createEmptyStats(serviceName: string): LoadBalancerStats {
    return {
      serviceName,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      instanceStats: {},
    };
  }

  /**
   * Get health status of all services
   */
  getHealthStatus(): Record<string, any> {
    const services = serviceDiscoveryService.getAllServices();
    const healthStatus: Record<string, any> = {};

    for (const [serviceName, instances] of Object.entries(services)) {
      const healthy = instances.filter(i => i.health === 'healthy').length;
      const total = instances.length;
      
      healthStatus[serviceName] = {
        healthy,
        total,
        healthPercentage: total > 0 ? (healthy / total) * 100 : 0,
        status: healthy > 0 ? 'available' : 'unavailable',
        instances: instances.map(i => ({
          id: i.id,
          host: i.host,
          port: i.port,
          health: i.health,
          lastHealthCheck: i.lastHealthCheck,
        })),
      };
    }

    return healthStatus;
  }

  /**
   * Reset statistics
   */
  resetStats(serviceName?: string): void {
    if (serviceName) {
      this.stats.delete(serviceName);
      // Clear response times for instances of this service
      const instances = serviceDiscoveryService.getServiceInstances(serviceName);
      for (const instance of instances) {
        this.instanceResponseTimes.delete(instance.id);
      }
    } else {
      this.stats.clear();
      this.instanceResponseTimes.clear();
    }

    logger.info('Load balancer stats reset', { serviceName: serviceName || 'all' });
  }

  /**
   * Utility method to delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.stats.clear();
    this.instanceResponseTimes.clear();
    this.removeAllListeners();
    
    logger.info('Load balancer cleanup completed');
  }
}

// Create singleton instance
export const loadBalancerService = new LoadBalancerService();

export default loadBalancerService;