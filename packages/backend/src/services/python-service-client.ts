/**
 * Python Service Client for Node.js API Gateway
 * 
 * This service handles communication between Node.js API Gateway and Python services
 * with circuit breaker pattern, retry logic, and comprehensive error handling.
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import CircuitBreaker from 'opossum';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import logger from './logger.service';
import { serviceAuthService } from './service-auth.service';
import { loadBalancerService } from './load-balancer.service';

export interface ServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  correlationId: string;
  timestamp: string;
  service: string;
}

export interface RequestOptions {
  timeout?: number;
  retries?: number;
  correlationId?: string;
  headers?: Record<string, string>;
}

export interface CircuitBreakerOptions {
  timeout: number;
  errorThresholdPercentage: number;
  resetTimeout: number;
  rollingCountTimeout: number;
  rollingCountBuckets: number;
}

export class PythonServiceClient {
  private client: AxiosInstance;
  private circuitBreaker: CircuitBreaker;
  private readonly serviceName: string;
  private readonly baseURL: string;
  private currentToken?: string;
  private tokenExpiresAt?: Date;

  constructor(serviceName: string, baseURL: string, options?: Partial<CircuitBreakerOptions>) {
    this.serviceName = serviceName;
    this.baseURL = baseURL;

    // Create axios instance with default configuration
    this.client = axios.create({
      baseURL,
      timeout: 30000, // 30 seconds default timeout
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'GiveMeJobs-NodeJS-Gateway/1.0',
      },
    });

    // Setup request interceptor for correlation IDs, authentication, and logging
    this.client.interceptors.request.use(
      async (config) => {
        const correlationId = config.headers?.['x-correlation-id'] || uuidv4();
        
        // Ensure we have a valid service token
        await this.ensureValidToken();
        
        config.headers = {
          ...config.headers,
          'x-correlation-id': correlationId,
          'x-source-service': 'nodejs-gateway',
          'x-target-service': this.serviceName,
        };

        // Add service authentication token
        if (this.currentToken) {
          config.headers['authorization'] = `Bearer ${this.currentToken}`;
        }

        logger.info('Python service request', {
          service: this.serviceName,
          method: config.method?.toUpperCase(),
          url: config.url,
          correlationId,
          hasToken: !!this.currentToken,
        });

        return config;
      },
      (error) => {
        logger.error('Python service request error', {
          service: this.serviceName,
          error: error.message,
        });
        return Promise.reject(error);
      }
    );

    // Setup response interceptor for logging and error handling
    this.client.interceptors.response.use(
      (response) => {
        const correlationId = response.config.headers?.['x-correlation-id'];
        logger.info('Python service response', {
          service: this.serviceName,
          status: response.status,
          correlationId,
          responseTime: response.headers['x-response-time'],
        });
        return response;
      },
      (error) => {
        const correlationId = error.config?.headers?.['x-correlation-id'];
        logger.error('Python service response error', {
          service: this.serviceName,
          status: error.response?.status,
          error: error.message,
          correlationId,
        });
        return Promise.reject(error);
      }
    );

    // Setup circuit breaker
    const circuitBreakerOptions: CircuitBreakerOptions = {
      timeout: 30000, // 30 seconds
      errorThresholdPercentage: 50, // Open circuit if 50% of requests fail
      resetTimeout: 30000, // Try again after 30 seconds
      rollingCountTimeout: 10000, // 10 second window
      rollingCountBuckets: 10, // 10 buckets in the window
      ...options,
    };

    this.circuitBreaker = new CircuitBreaker(this.makeRequest.bind(this), circuitBreakerOptions);

    // Circuit breaker event handlers
    this.circuitBreaker.on('open', () => {
      logger.warn('Circuit breaker opened', { service: this.serviceName });
    });

    this.circuitBreaker.on('halfOpen', () => {
      logger.info('Circuit breaker half-open', { service: this.serviceName });
    });

    this.circuitBreaker.on('close', () => {
      logger.info('Circuit breaker closed', { service: this.serviceName });
    });

    this.circuitBreaker.fallback(() => {
      return this.getFallbackResponse();
    });
  }

  /**
   * Make a GET request to Python service
   */
  async get<T = any>(
    path: string,
    options?: RequestOptions
  ): Promise<ServiceResponse<T>> {
    return this.request<T>('GET', path, undefined, options);
  }

  /**
   * Make a POST request to Python service
   */
  async post<T = any>(
    path: string,
    data?: any,
    options?: RequestOptions
  ): Promise<ServiceResponse<T>> {
    return this.request<T>('POST', path, data, options);
  }

  /**
   * Make a PUT request to Python service
   */
  async put<T = any>(
    path: string,
    data?: any,
    options?: RequestOptions
  ): Promise<ServiceResponse<T>> {
    return this.request<T>('PUT', path, data, options);
  }

  /**
   * Make a DELETE request to Python service
   */
  async delete<T = any>(
    path: string,
    options?: RequestOptions
  ): Promise<ServiceResponse<T>> {
    return this.request<T>('DELETE', path, undefined, options);
  }

  /**
   * Make a PATCH request to Python service
   */
  async patch<T = any>(
    path: string,
    data?: any,
    options?: RequestOptions
  ): Promise<ServiceResponse<T>> {
    return this.request<T>('PATCH', path, data, options);
  }

  /**
   * Generic request method with circuit breaker
   */
  private async request<T = any>(
    method: string,
    path: string,
    data?: any,
    options?: RequestOptions
  ): Promise<ServiceResponse<T>> {
    const correlationId = options?.correlationId || uuidv4();
    
    try {
      const response = await this.circuitBreaker.fire({
        method,
        path,
        data,
        options: {
          ...options,
          correlationId,
        },
      });

      return {
        success: true,
        data: response.data,
        correlationId,
        timestamp: new Date().toISOString(),
        service: this.serviceName,
      };
    } catch (error) {
      logger.error('Python service request failed', {
        service: this.serviceName,
        method,
        path,
        error: error instanceof Error ? error.message : 'Unknown error',
        correlationId,
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Service request failed',
        correlationId,
        timestamp: new Date().toISOString(),
        service: this.serviceName,
      };
    }
  }

  /**
   * Internal method to make the actual HTTP request with load balancing
   */
  private async makeRequest(params: {
    method: string;
    path: string;
    data?: any;
    options?: RequestOptions;
  }): Promise<AxiosResponse> {
    const { method, path, data, options } = params;
    const correlationId = options?.correlationId || uuidv4();
    const startTime = Date.now();

    // Get service instance from load balancer
    const instance = await loadBalancerService.getServiceInstance(this.serviceName, {
      strategy: { name: 'health-based' },
      healthCheckEnabled: true,
      failoverEnabled: true,
      maxRetries: options?.retries || 3,
    });

    if (!instance) {
      throw new Error(`No healthy instances available for service: ${this.serviceName}`);
    }

    const instanceUrl = `${instance.protocol}://${instance.host}:${instance.port}`;
    
    const config: AxiosRequestConfig = {
      method: method as any,
      url: `${instanceUrl}${path}`,
      data,
      timeout: options?.timeout || 30000,
      headers: {
        'x-correlation-id': correlationId,
        'x-instance-id': instance.id,
        ...options?.headers,
      },
    };

    let success = false;
    let response: AxiosResponse;

    try {
      response = await axios.request(config);
      success = true;
      
      logger.info('Python service request successful', {
        service: this.serviceName,
        instanceId: instance.id,
        method: method.toUpperCase(),
        path,
        status: response.status,
        responseTime: Date.now() - startTime,
        correlationId,
      });

      return response;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      logger.error('Python service request failed', {
        service: this.serviceName,
        instanceId: instance.id,
        method: method.toUpperCase(),
        path,
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime,
        correlationId,
      });

      throw error;
    } finally {
      // Release instance and record stats
      const responseTime = Date.now() - startTime;
      loadBalancerService.releaseServiceInstance(
        this.serviceName,
        instance.id,
        success,
        responseTime
      );
    }
  }

  /**
   * Fallback response when circuit breaker is open
   */
  private getFallbackResponse(): ServiceResponse {
    return {
      success: false,
      error: `${this.serviceName} service is currently unavailable`,
      correlationId: uuidv4(),
      timestamp: new Date().toISOString(),
      service: this.serviceName,
    };
  }

  /**
   * Ensure we have a valid service token
   */
  private async ensureValidToken(): Promise<void> {
    const now = new Date();
    
    // Check if we need a new token (no token or expires within 5 minutes)
    if (!this.currentToken || !this.tokenExpiresAt || 
        (this.tokenExpiresAt.getTime() - now.getTime()) < 5 * 60 * 1000) {
      
      try {
        const tokenData = serviceAuthService.generateServiceToken(this.serviceName);
        
        if (tokenData) {
          this.currentToken = tokenData.token;
          this.tokenExpiresAt = tokenData.expiresAt;
          
          logger.debug('Service token refreshed', {
            service: this.serviceName,
            expiresAt: this.tokenExpiresAt,
          });
        } else {
          logger.warn('Failed to generate service token', {
            service: this.serviceName,
          });
        }
      } catch (error) {
        logger.error('Error generating service token', {
          service: this.serviceName,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  }

  /**
   * Health check for the Python service
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/health', { timeout: 5000 });
      return response.status === 200;
    } catch (error) {
      logger.error('Python service health check failed', {
        service: this.serviceName,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  /**
   * Get circuit breaker statistics
   */
  getStats() {
    return {
      service: this.serviceName,
      circuitBreakerState: this.circuitBreaker.opened ? 'open' : 'closed',
      stats: this.circuitBreaker.stats,
    };
  }
}

/**
 * Service Registry for managing multiple Python service clients
 */
export class PythonServiceRegistry {
  private services: Map<string, PythonServiceClient> = new Map();

  /**
   * Register a Python service client
   */
  register(name: string, baseURL: string, options?: Partial<CircuitBreakerOptions>): void {
    const client = new PythonServiceClient(name, baseURL, options);
    this.services.set(name, client);
    logger.info('Python service registered', { service: name, baseURL });
  }

  /**
   * Get a Python service client
   */
  get(name: string): PythonServiceClient | undefined {
    return this.services.get(name);
  }

  /**
   * Get all registered services
   */
  getAll(): Map<string, PythonServiceClient> {
    return this.services;
  }

  /**
   * Health check for all services
   */
  async healthCheckAll(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};
    
    for (const [name, client] of this.services) {
      results[name] = await client.healthCheck();
    }

    return results;
  }

  /**
   * Get statistics for all services
   */
  getAllStats() {
    const stats: Record<string, any> = {};
    
    for (const [name, client] of this.services) {
      stats[name] = client.getStats();
    }

    return stats;
  }
}

// Create and configure the service registry
export const pythonServiceRegistry = new PythonServiceRegistry();

// Register Python services based on configuration
if (config.pythonServices) {
  // Document Processing Service
  if (config.pythonServices.documentService) {
    pythonServiceRegistry.register(
      'document-service',
      config.pythonServices.documentService.url,
      {
        timeout: 60000, // Document processing can take longer
        errorThresholdPercentage: 60,
      }
    );
  }

  // Analytics Service
  if (config.pythonServices.analyticsService) {
    pythonServiceRegistry.register(
      'analytics-service',
      config.pythonServices.analyticsService.url,
      {
        timeout: 45000, // Analytics can take longer
        errorThresholdPercentage: 50,
      }
    );
  }

  // Semantic Search Service
  if (config.pythonServices.semanticSearchService) {
    pythonServiceRegistry.register(
      'semantic-search-service',
      config.pythonServices.semanticSearchService.url,
      {
        timeout: 30000,
        errorThresholdPercentage: 40,
      }
    );
  }

  // Main Python Backend
  if (config.pythonServices.mainBackend) {
    pythonServiceRegistry.register(
      'python-backend',
      config.pythonServices.mainBackend.url,
      {
        timeout: 30000,
        errorThresholdPercentage: 50,
      }
    );
  }
}

export default pythonServiceRegistry;