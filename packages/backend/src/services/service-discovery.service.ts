/**
 * Service Discovery Service
 * 
 * Handles dynamic service registration, discovery, and load balancing
 * for Python services in production environments.
 */

import { EventEmitter } from 'events';
import logger from './logger.service';
import { config } from '../config';

export interface ServiceInstance {
  id: string;
  name: string;
  host: string;
  port: number;
  protocol: 'http' | 'https';
  health: 'healthy' | 'unhealthy' | 'unknown';
  lastHealthCheck: Date;
  metadata: Record<string, any>;
  registeredAt: Date;
  lastSeen: Date;
  weight: number; // For weighted load balancing
  tags: string[];
}

export interface ServiceRegistration {
  name: string;
  host: string;
  port: number;
  protocol?: 'http' | 'https';
  metadata?: Record<string, any>;
  tags?: string[];
  weight?: number;
  healthCheckPath?: string;
  healthCheckInterval?: number;
}

export interface LoadBalancingStrategy {
  name: 'round-robin' | 'weighted-round-robin' | 'least-connections' | 'random' | 'health-based';
}

export class ServiceDiscoveryService extends EventEmitter {
  private services: Map<string, Map<string, ServiceInstance>> = new Map();
  private healthCheckIntervals: Map<string, NodeJS.Timeout> = new Map();
  private connectionCounts: Map<string, number> = new Map();
  private roundRobinCounters: Map<string, number> = new Map();
  private readonly defaultHealthCheckInterval = 30000; // 30 seconds

  constructor() {
    super();
    this.initializeDefaultServices();
  }

  /**
   * Initialize default service instances from configuration
   */
  private initializeDefaultServices(): void {
    if (config.pythonServices) {
      // Register Python Backend
      if (config.pythonServices.mainBackend) {
        const url = new URL(config.pythonServices.mainBackend.url);
        this.registerService({
          name: 'python-backend',
          host: url.hostname,
          port: parseInt(url.port) || (url.protocol === 'https:' ? 443 : 80),
          protocol: url.protocol.slice(0, -1) as 'http' | 'https',
          metadata: { type: 'main-backend' },
          tags: ['python', 'backend', 'main'],
          weight: 100,
          healthCheckPath: '/health',
        });
      }

      // Register Document Service
      if (config.pythonServices.documentService) {
        const url = new URL(config.pythonServices.documentService.url);
        this.registerService({
          name: 'document-service',
          host: url.hostname,
          port: parseInt(url.port) || (url.protocol === 'https:' ? 443 : 80),
          protocol: url.protocol.slice(0, -1) as 'http' | 'https',
          metadata: { type: 'document-processing' },
          tags: ['python', 'ai', 'documents'],
          weight: 80,
          healthCheckPath: '/health',
        });
      }

      // Register Analytics Service
      if (config.pythonServices.analyticsService) {
        const url = new URL(config.pythonServices.analyticsService.url);
        this.registerService({
          name: 'analytics-service',
          host: url.hostname,
          port: parseInt(url.port) || (url.protocol === 'https:' ? 443 : 80),
          protocol: url.protocol.slice(0, -1) as 'http' | 'https',
          metadata: { type: 'analytics' },
          tags: ['python', 'analytics', 'ml'],
          weight: 90,
          healthCheckPath: '/health',
        });
      }

      // Register Semantic Search Service
      if (config.pythonServices.semanticSearchService) {
        const url = new URL(config.pythonServices.semanticSearchService.url);
        this.registerService({
          name: 'semantic-search-service',
          host: url.hostname,
          port: parseInt(url.port) || (url.protocol === 'https:' ? 443 : 80),
          protocol: url.protocol.slice(0, -1) as 'http' | 'https',
          metadata: { type: 'semantic-search' },
          tags: ['python', 'search', 'ai'],
          weight: 70,
          healthCheckPath: '/health',
        });
      }
    }

    logger.info('Default services registered for discovery', {
      serviceCount: this.services.size,
    });
  }

  /**
   * Register a service instance
   */
  registerService(registration: ServiceRegistration): string {
    const instanceId = `${registration.name}-${registration.host}-${registration.port}`;
    
    const instance: ServiceInstance = {
      id: instanceId,
      name: registration.name,
      host: registration.host,
      port: registration.port,
      protocol: registration.protocol || 'http',
      health: 'unknown',
      lastHealthCheck: new Date(),
      metadata: registration.metadata || {},
      registeredAt: new Date(),
      lastSeen: new Date(),
      weight: registration.weight || 100,
      tags: registration.tags || [],
    };

    // Initialize service map if it doesn't exist
    if (!this.services.has(registration.name)) {
      this.services.set(registration.name, new Map());
      this.roundRobinCounters.set(registration.name, 0);
    }

    // Add instance to service map
    this.services.get(registration.name)!.set(instanceId, instance);

    // Start health checks
    this.startHealthCheck(
      instanceId,
      instance,
      registration.healthCheckPath || '/health',
      registration.healthCheckInterval || this.defaultHealthCheckInterval
    );

    logger.info('Service instance registered', {
      instanceId,
      serviceName: registration.name,
      host: registration.host,
      port: registration.port,
    });

    this.emit('serviceRegistered', instance);
    return instanceId;
  }

  /**
   * Deregister a service instance
   */
  deregisterService(instanceId: string): boolean {
    for (const [serviceName, instances] of this.services) {
      if (instances.has(instanceId)) {
        const instance = instances.get(instanceId)!;
        instances.delete(instanceId);

        // Stop health checks
        const healthCheckInterval = this.healthCheckIntervals.get(instanceId);
        if (healthCheckInterval) {
          clearInterval(healthCheckInterval);
          this.healthCheckIntervals.delete(instanceId);
        }

        // Clean up connection count
        this.connectionCounts.delete(instanceId);

        logger.info('Service instance deregistered', {
          instanceId,
          serviceName,
        });

        this.emit('serviceDeregistered', instance);
        return true;
      }
    }

    return false;
  }

  /**
   * Discover service instances by name
   */
  discoverService(serviceName: string, strategy: LoadBalancingStrategy = { name: 'health-based' }): ServiceInstance | null {
    const instances = this.services.get(serviceName);
    
    if (!instances || instances.size === 0) {
      logger.warn('No instances found for service', { serviceName });
      return null;
    }

    const healthyInstances = Array.from(instances.values()).filter(
      instance => instance.health === 'healthy'
    );

    if (healthyInstances.length === 0) {
      logger.warn('No healthy instances found for service', { serviceName });
      // Return any instance as fallback
      return Array.from(instances.values())[0] || null;
    }

    return this.selectInstance(serviceName, healthyInstances, strategy);
  }

  /**
   * Select instance based on load balancing strategy
   */
  private selectInstance(
    serviceName: string,
    instances: ServiceInstance[],
    strategy: LoadBalancingStrategy
  ): ServiceInstance {
    switch (strategy.name) {
      case 'round-robin':
        return this.roundRobinSelection(serviceName, instances);
      
      case 'weighted-round-robin':
        return this.weightedRoundRobinSelection(instances);
      
      case 'least-connections':
        return this.leastConnectionsSelection(instances);
      
      case 'random':
        return instances[Math.floor(Math.random() * instances.length)];
      
      case 'health-based':
      default:
        return this.healthBasedSelection(instances);
    }
  }

  /**
   * Round-robin selection
   */
  private roundRobinSelection(serviceName: string, instances: ServiceInstance[]): ServiceInstance {
    const counter = this.roundRobinCounters.get(serviceName) || 0;
    const selectedIndex = counter % instances.length;
    this.roundRobinCounters.set(serviceName, counter + 1);
    return instances[selectedIndex];
  }

  /**
   * Weighted round-robin selection
   */
  private weightedRoundRobinSelection(instances: ServiceInstance[]): ServiceInstance {
    const totalWeight = instances.reduce((sum, instance) => sum + instance.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const instance of instances) {
      random -= instance.weight;
      if (random <= 0) {
        return instance;
      }
    }
    
    return instances[0]; // Fallback
  }

  /**
   * Least connections selection
   */
  private leastConnectionsSelection(instances: ServiceInstance[]): ServiceInstance {
    return instances.reduce((least, current) => {
      const leastConnections = this.connectionCounts.get(least.id) || 0;
      const currentConnections = this.connectionCounts.get(current.id) || 0;
      return currentConnections < leastConnections ? current : least;
    });
  }

  /**
   * Health-based selection (prioritizes healthiest instances)
   */
  private healthBasedSelection(instances: ServiceInstance[]): ServiceInstance {
    // Sort by health status and last health check time
    const sorted = instances.sort((a, b) => {
      if (a.health === 'healthy' && b.health !== 'healthy') return -1;
      if (b.health === 'healthy' && a.health !== 'healthy') return 1;
      return b.lastHealthCheck.getTime() - a.lastHealthCheck.getTime();
    });
    
    return sorted[0];
  }

  /**
   * Start health check for an instance
   */
  private startHealthCheck(
    instanceId: string,
    instance: ServiceInstance,
    healthCheckPath: string,
    interval: number
  ): void {
    const healthCheck = async () => {
      try {
        const axios = (await import('axios')).default;
        const url = `${instance.protocol}://${instance.host}:${instance.port}${healthCheckPath}`;
        
        const response = await axios.get(url, {
          timeout: 5000,
          validateStatus: (status) => status < 500, // Accept 4xx as healthy
        });

        const wasHealthy = instance.health === 'healthy';
        instance.health = response.status < 400 ? 'healthy' : 'unhealthy';
        instance.lastHealthCheck = new Date();
        instance.lastSeen = new Date();

        if (!wasHealthy && instance.health === 'healthy') {
          logger.info('Service instance became healthy', {
            instanceId,
            serviceName: instance.name,
          });
          this.emit('serviceHealthy', instance);
        }

      } catch (error) {
        const wasHealthy = instance.health === 'healthy';
        instance.health = 'unhealthy';
        instance.lastHealthCheck = new Date();

        if (wasHealthy) {
          logger.warn('Service instance became unhealthy', {
            instanceId,
            serviceName: instance.name,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          this.emit('serviceUnhealthy', instance);
        }
      }
    };

    // Run initial health check
    healthCheck();

    // Schedule periodic health checks
    const intervalId = setInterval(healthCheck, interval);
    this.healthCheckIntervals.set(instanceId, intervalId);
  }

  /**
   * Track connection to an instance
   */
  trackConnection(instanceId: string): void {
    const current = this.connectionCounts.get(instanceId) || 0;
    this.connectionCounts.set(instanceId, current + 1);
  }

  /**
   * Release connection from an instance
   */
  releaseConnection(instanceId: string): void {
    const current = this.connectionCounts.get(instanceId) || 0;
    this.connectionCounts.set(instanceId, Math.max(0, current - 1));
  }

  /**
   * Get all instances for a service
   */
  getServiceInstances(serviceName: string): ServiceInstance[] {
    const instances = this.services.get(serviceName);
    return instances ? Array.from(instances.values()) : [];
  }

  /**
   * Get all services
   */
  getAllServices(): Record<string, ServiceInstance[]> {
    const result: Record<string, ServiceInstance[]> = {};
    
    for (const [serviceName, instances] of this.services) {
      result[serviceName] = Array.from(instances.values());
    }
    
    return result;
  }

  /**
   * Get service discovery statistics
   */
  getStats(): Record<string, any> {
    const stats: Record<string, any> = {
      totalServices: this.services.size,
      totalInstances: 0,
      healthyInstances: 0,
      unhealthyInstances: 0,
      services: {},
    };

    for (const [serviceName, instances] of this.services) {
      const instanceArray = Array.from(instances.values());
      const healthy = instanceArray.filter(i => i.health === 'healthy').length;
      const unhealthy = instanceArray.filter(i => i.health === 'unhealthy').length;

      stats.totalInstances += instanceArray.length;
      stats.healthyInstances += healthy;
      stats.unhealthyInstances += unhealthy;

      stats.services[serviceName] = {
        totalInstances: instanceArray.length,
        healthyInstances: healthy,
        unhealthyInstances: unhealthy,
        instances: instanceArray.map(i => ({
          id: i.id,
          host: i.host,
          port: i.port,
          health: i.health,
          lastHealthCheck: i.lastHealthCheck,
          connections: this.connectionCounts.get(i.id) || 0,
        })),
      };
    }

    return stats;
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    // Clear all health check intervals
    for (const intervalId of this.healthCheckIntervals.values()) {
      clearInterval(intervalId);
    }
    
    this.healthCheckIntervals.clear();
    this.services.clear();
    this.connectionCounts.clear();
    this.roundRobinCounters.clear();

    logger.info('Service discovery cleanup completed');
  }
}

// Create singleton instance
export const serviceDiscoveryService = new ServiceDiscoveryService();

export default serviceDiscoveryService;