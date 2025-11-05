/**
 * Service registry for managing and discovering services
 */

import { injectable, inject } from 'inversify';
import { Logger } from 'winston';
import { TYPES } from '../types/container.types';
import { ICacheService } from '../types/repository.types';

export interface ServiceEndpoint {
  id: string;
  name: string;
  url: string;
  version: string;
  status: 'healthy' | 'unhealthy' | 'unknown';
  lastHealthCheck?: Date;
  responseTime?: number;
  metadata: {
    description: string;
    capabilities: string[];
    dependencies: string[];
    tags: string[];
  };
  healthCheckUrl?: string;
  weight: number;
  registeredAt: Date;
  lastSeen: Date;
}

export interface ServiceDiscoveryConfig {
  healthCheckInterval: number;
  unhealthyThreshold: number;
  timeoutMs: number;
}

export interface IServiceRegistry {
  registerService(service: Omit<ServiceEndpoint, 'id' | 'registeredAt' | 'lastSeen'>): Promise<ServiceEndpoint>;
  unregisterService(serviceId: string): Promise<void>;
  getService(serviceId: string): Promise<ServiceEndpoint | null>;
  getServicesByName(name: string): Promise<ServiceEndpoint[]>;
  getServicesByCapability(capability: string): Promise<ServiceEndpoint[]>;
  getAllServices(): Promise<ServiceEndpoint[]>;
  getHealthyServices(): Promise<ServiceEndpoint[]>;
  updateServiceStatus(serviceId: string, status: 'healthy' | 'unhealthy', responseTime?: number): Promise<void>;
  heartbeat(serviceId: string): Promise<void>;
  startHealthChecks(): void;
  stopHealthChecks(): void;
}

@injectable()
export class ServiceRegistry implements IServiceRegistry {
  private services: Map<string, ServiceEndpoint> = new Map();
  private healthCheckInterval?: NodeJS.Timeout;
  private config: ServiceDiscoveryConfig;

  constructor(
    @inject(TYPES.Logger) private logger: Logger,
    @inject(TYPES.CacheService) private cache: ICacheService
  ) {
    this.config = {
      healthCheckInterval: parseInt(process.env.SERVICE_HEALTH_CHECK_INTERVAL || '30000'),
      unhealthyThreshold: parseInt(process.env.SERVICE_UNHEALTHY_THRESHOLD || '3'),
      timeoutMs: parseInt(process.env.SERVICE_HEALTH_CHECK_TIMEOUT || '5000')
    };

    this.initializeDefaultServices();
  }

  private async initializeDefaultServices(): Promise<void> {
    // Register Python AI service
    await this.registerService({
      name: 'python-ai-service',
      url: process.env.PYTHON_SERVICE_URL || 'http://localhost:8001',
      version: '1.0.0',
      status: 'unknown',
      metadata: {
        description: 'AI/ML processing service for document generation and semantic search',
        capabilities: [
          'document-generation',
          'semantic-search',
          'text-analysis',
          'embeddings-generation'
        ],
        dependencies: ['openai', 'pinecone', 'langchain'],
        tags: ['ai', 'ml', 'python', 'nlp']
      },
      healthCheckUrl: '/health',
      weight: 1
    });

    // Register analytics service
    await this.registerService({
      name: 'analytics-service',
      url: process.env.ANALYTICS_SERVICE_URL || 'http://localhost:8002',
      version: '1.0.0',
      status: 'unknown',
      metadata: {
        description: 'Advanced analytics and reporting service',
        capabilities: [
          'data-analysis',
          'reporting',
          'metrics-calculation',
          'insights-generation'
        ],
        dependencies: ['pandas', 'numpy', 'scikit-learn'],
        tags: ['analytics', 'python', 'data-science']
      },
      healthCheckUrl: '/health',
      weight: 1
    });

    this.logger.info('Default services registered in service registry', {
      services: Array.from(this.services.keys())
    });
  }

  async registerService(
    serviceData: Omit<ServiceEndpoint, 'id' | 'registeredAt' | 'lastSeen'>
  ): Promise<ServiceEndpoint> {
    const serviceId = this.generateServiceId(serviceData.name, serviceData.url);
    const now = new Date();

    const service: ServiceEndpoint = {
      ...serviceData,
      id: serviceId,
      registeredAt: now,
      lastSeen: now
    };

    this.services.set(serviceId, service);

    // Cache the service
    await this.cache.set(
      `service_registry:${serviceId}`,
      JSON.stringify(service),
      3600 // 1 hour TTL
    );

    this.logger.info('Service registered', {
      serviceId,
      serviceName: service.name,
      url: service.url,
      capabilities: service.metadata.capabilities
    });

    return service;
  }

  async unregisterService(serviceId: string): Promise<void> {
    const service = this.services.get(serviceId);
    if (!service) {
      throw new Error(`Service not found: ${serviceId}`);
    }

    this.services.delete(serviceId);
    await this.cache.delete(`service_registry:${serviceId}`);

    this.logger.info('Service unregistered', {
      serviceId,
      serviceName: service.name
    });
  }

  async getService(serviceId: string): Promise<ServiceEndpoint | null> {
    const service = this.services.get(serviceId);
    if (service) {
      return service;
    }

    // Try to get from cache
    const cached = await this.cache.get(`service_registry:${serviceId}`);
    if (cached) {
      const service = JSON.parse(cached as string) as ServiceEndpoint;
      this.services.set(serviceId, service);
      return service;
    }

    return null;
  }

  async getServicesByName(name: string): Promise<ServiceEndpoint[]> {
    const services = Array.from(this.services.values());
    return services.filter(service => service.name === name);
  }

  async getServicesByCapability(capability: string): Promise<ServiceEndpoint[]> {
    const services = Array.from(this.services.values());
    return services.filter(service => 
      service.metadata.capabilities.includes(capability)
    );
  }

  async getAllServices(): Promise<ServiceEndpoint[]> {
    return Array.from(this.services.values());
  }

  async getHealthyServices(): Promise<ServiceEndpoint[]> {
    const services = Array.from(this.services.values());
    return services.filter(service => service.status === 'healthy');
  }

  async updateServiceStatus(
    serviceId: string,
    status: 'healthy' | 'unhealthy',
    responseTime?: number
  ): Promise<void> {
    const service = this.services.get(serviceId);
    if (!service) {
      this.logger.warn('Attempted to update status of unknown service', { serviceId });
      return;
    }

    const previousStatus = service.status;
    service.status = status;
    service.lastHealthCheck = new Date();
    
    if (responseTime !== undefined) {
      service.responseTime = responseTime;
    }

    this.services.set(serviceId, service);

    // Update cache
    await this.cache.set(
      `service_registry:${serviceId}`,
      JSON.stringify(service),
      3600
    );

    if (previousStatus !== status) {
      this.logger.info('Service status changed', {
        serviceId,
        serviceName: service.name,
        previousStatus,
        newStatus: status,
        responseTime
      });
    }
  }

  async heartbeat(serviceId: string): Promise<void> {
    const service = this.services.get(serviceId);
    if (!service) {
      this.logger.warn('Heartbeat from unknown service', { serviceId });
      return;
    }

    service.lastSeen = new Date();
    this.services.set(serviceId, service);

    this.logger.debug('Service heartbeat received', {
      serviceId,
      serviceName: service.name
    });
  }

  startHealthChecks(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(() => {
      this.performHealthChecks();
    }, this.config.healthCheckInterval);

    this.logger.info('Service health checks started', {
      interval: this.config.healthCheckInterval
    });
  }

  stopHealthChecks(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }

    this.logger.info('Service health checks stopped');
  }

  private async performHealthChecks(): Promise<void> {
    const services = Array.from(this.services.values());
    
    for (const service of services) {
      if (service.healthCheckUrl) {
        await this.checkServiceHealth(service);
      }
    }
  }

  private async checkServiceHealth(service: ServiceEndpoint): Promise<void> {
    try {
      const startTime = Date.now();
      const healthCheckUrl = `${service.url}${service.healthCheckUrl}`;
      
      const response = await fetch(healthCheckUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'GiveMeJobs-ServiceRegistry/1.0.0'
        },
        signal: AbortSignal.timeout(this.config.timeoutMs)
      });

      const responseTime = Date.now() - startTime;

      if (response.ok) {
        await this.updateServiceStatus(service.id, 'healthy', responseTime);
      } else {
        await this.updateServiceStatus(service.id, 'unhealthy', responseTime);
      }
    } catch (error) {
      this.logger.debug('Health check failed', {
        serviceId: service.id,
        serviceName: service.name,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      await this.updateServiceStatus(service.id, 'unhealthy');
    }
  }

  private generateServiceId(name: string, url: string): string {
    const urlHash = Buffer.from(url).toString('base64').substring(0, 8);
    return `${name}-${urlHash}`;
  }

  // Load balancing methods
  async getServiceForLoad(serviceName: string): Promise<ServiceEndpoint | null> {
    const services = await this.getServicesByName(serviceName);
    const healthyServices = services.filter(s => s.status === 'healthy');

    if (healthyServices.length === 0) {
      return null;
    }

    // Simple weighted round-robin
    const totalWeight = healthyServices.reduce((sum, service) => sum + service.weight, 0);
    const random = Math.random() * totalWeight;
    
    let currentWeight = 0;
    for (const service of healthyServices) {
      currentWeight += service.weight;
      if (random <= currentWeight) {
        return service;
      }
    }

    return healthyServices[0]; // Fallback
  }

  // Service discovery methods
  async discoverServices(capability: string): Promise<ServiceEndpoint[]> {
    const services = await this.getServicesByCapability(capability);
    return services.filter(s => s.status === 'healthy');
  }

  // Metrics and monitoring
  async getServiceMetrics(): Promise<any> {
    const services = Array.from(this.services.values());
    
    return {
      totalServices: services.length,
      healthyServices: services.filter(s => s.status === 'healthy').length,
      unhealthyServices: services.filter(s => s.status === 'unhealthy').length,
      unknownServices: services.filter(s => s.status === 'unknown').length,
      averageResponseTime: this.calculateAverageResponseTime(services),
      servicesByCapability: this.groupServicesByCapability(services)
    };
  }

  private calculateAverageResponseTime(services: ServiceEndpoint[]): number {
    const servicesWithResponseTime = services.filter(s => s.responseTime !== undefined);
    if (servicesWithResponseTime.length === 0) return 0;
    
    const totalResponseTime = servicesWithResponseTime.reduce(
      (sum, service) => sum + (service.responseTime || 0), 
      0
    );
    
    return totalResponseTime / servicesWithResponseTime.length;
  }

  private groupServicesByCapability(services: ServiceEndpoint[]): Record<string, number> {
    const capabilities: Record<string, number> = {};
    
    services.forEach(service => {
      service.metadata.capabilities.forEach(capability => {
        capabilities[capability] = (capabilities[capability] || 0) + 1;
      });
    });
    
    return capabilities;
  }
}