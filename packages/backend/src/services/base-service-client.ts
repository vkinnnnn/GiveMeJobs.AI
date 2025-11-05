/**
 * Base service client with circuit breaker, retry logic, and correlation IDs
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import CircuitBreaker from 'opossum';
import { v4 as uuidv4 } from 'uuid';
import { injectable, inject } from 'inversify';
import { Logger } from 'winston';
import { TYPES } from '../types/container.types';
import {
  ServiceClientConfig,
  ServiceRequest,
  ServiceResponse,
  ServiceError,
  ServiceHealthCheck,
  LoadBalancerConfig,
  ServiceEndpoint,
  Result
} from '../types/service-client.types';

@injectable()
export abstract class BaseServiceClient {
  protected client: AxiosInstance;
  protected circuitBreaker: CircuitBreaker;
  protected loadBalancer?: LoadBalancerConfig;
  protected healthChecks: Map<string, ServiceHealthCheck> = new Map();

  constructor(
    protected config: ServiceClientConfig,
    @inject(TYPES.Logger) protected logger: Logger
  ) {
    this.setupHttpClient();
    this.setupCircuitBreaker();
    this.setupLoadBalancer();
    this.startHealthChecks();
  }

  private setupHttpClient(): void {
    this.client = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'X-Service': 'nodejs-backend',
        'User-Agent': 'GiveMeJobs-Backend/1.0.0'
      }
    });

    // Request interceptor for correlation IDs, authentication, and tracing
    this.client.interceptors.request.use(
      (config) => {
        // Add correlation ID if not present
        if (!config.headers['X-Correlation-ID']) {
          config.headers['X-Correlation-ID'] = uuidv4();
        }

        // Add authentication
        if (this.config.authentication) {
          this.addAuthentication(config);
        }

        // Add tracing headers if available
        const traceHeaders = (config as any).traceHeaders;
        if (traceHeaders) {
          Object.assign(config.headers, traceHeaders);
        }

        // Add request timestamp for response time calculation
        (config as any).requestStartTime = Date.now();

        this.logger.debug('Outgoing service request', {
          url: config.url,
          method: config.method,
          correlationId: config.headers['X-Correlation-ID'],
          traceId: config.headers['uber-trace-id'],
          service: this.getServiceName()
        });

        return config;
      },
      (error) => {
        this.logger.error('Request interceptor error', { error: error.message });
        return Promise.reject(error);
      }
    );

    // Response interceptor for logging and error handling
    this.client.interceptors.response.use(
      (response) => {
        const responseTime = Date.now() - (response.config as any).requestStartTime;
        const correlationId = response.config.headers['X-Correlation-ID'];

        this.logger.debug('Service response received', {
          url: response.config.url,
          method: response.config.method,
          status: response.status,
          responseTime,
          correlationId,
          service: this.getServiceName()
        });

        // Add metadata to response
        (response as ServiceResponse).correlationId = correlationId;
        (response as ServiceResponse).responseTime = responseTime;

        return response;
      },
      (error) => {
        const correlationId = error.config?.headers['X-Correlation-ID'];
        const responseTime = error.config ? Date.now() - error.config.requestStartTime : 0;

        this.logger.error('Service request failed', {
          url: error.config?.url,
          method: error.config?.method,
          status: error.response?.status,
          responseTime,
          correlationId,
          error: error.message,
          service: this.getServiceName()
        });

        // Transform to ServiceError
        const serviceError = this.createServiceError(error, correlationId);
        return Promise.reject(serviceError);
      }
    );
  }

  private setupCircuitBreaker(): void {
    const options = {
      timeout: this.config.circuitBreakerOptions.timeout,
      errorThresholdPercentage: this.config.circuitBreakerOptions.errorThresholdPercentage,
      resetTimeout: this.config.circuitBreakerOptions.resetTimeout,
      rollingCountTimeout: this.config.circuitBreakerOptions.rollingCountTimeout || 10000,
      rollingCountBuckets: this.config.circuitBreakerOptions.rollingCountBuckets || 10,
      name: this.config.circuitBreakerOptions.name || this.getServiceName(),
      group: this.config.circuitBreakerOptions.group || 'python-services'
    };

    this.circuitBreaker = new CircuitBreaker(this.makeRequest.bind(this), options);

    // Circuit breaker event handlers
    this.circuitBreaker.on('open', () => {
      this.logger.warn('Circuit breaker opened', {
        service: this.getServiceName(),
        failures: this.circuitBreaker.stats.failures,
        requests: this.circuitBreaker.stats.requests
      });
    });

    this.circuitBreaker.on('halfOpen', () => {
      this.logger.info('Circuit breaker half-open', {
        service: this.getServiceName()
      });
    });

    this.circuitBreaker.on('close', () => {
      this.logger.info('Circuit breaker closed', {
        service: this.getServiceName()
      });
    });

    this.circuitBreaker.on('reject', () => {
      this.logger.warn('Circuit breaker rejected request', {
        service: this.getServiceName()
      });
    });
  }

  private setupLoadBalancer(): void {
    // Load balancer setup would be implemented here
    // For now, we'll use single endpoint
  }

  private startHealthChecks(): void {
    if (this.config.baseURL) {
      setInterval(() => {
        this.performHealthCheck();
      }, 30000); // Health check every 30 seconds
    }
  }

  private async performHealthCheck(): Promise<void> {
    try {
      const startTime = Date.now();
      await this.client.get('/health', { timeout: 5000 });
      const responseTime = Date.now() - startTime;

      this.healthChecks.set(this.getServiceName(), {
        service: this.getServiceName(),
        status: 'healthy',
        responseTime,
        lastCheck: new Date()
      });
    } catch (error) {
      this.healthChecks.set(this.getServiceName(), {
        service: this.getServiceName(),
        status: 'unhealthy',
        lastCheck: new Date(),
        error: error.message
      });
    }
  }

  private addAuthentication(config: AxiosRequestConfig): void {
    if (!this.config.authentication) return;

    switch (this.config.authentication.type) {
      case 'jwt':
        if (this.config.authentication.token) {
          config.headers.Authorization = `Bearer ${this.config.authentication.token}`;
        }
        break;
      case 'api-key':
        if (this.config.authentication.apiKey) {
          config.headers['X-API-Key'] = this.config.authentication.apiKey;
        }
        break;
    }
  }

  private async makeRequest(request: ServiceRequest): Promise<ServiceResponse> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= this.config.retries; attempt++) {
      try {
        if (attempt > 0) {
          const delay = this.calculateRetryDelay(attempt);
          await this.sleep(delay);
          
          this.logger.debug('Retrying request', {
            attempt,
            delay,
            url: request.url,
            correlationId: request.correlationId,
            service: this.getServiceName()
          });
        }

        const response = await this.client.request(request);
        return response as ServiceResponse;
      } catch (error) {
        lastError = error;
        
        // Don't retry on certain errors
        if (this.shouldNotRetry(error)) {
          break;
        }
      }
    }

    throw lastError;
  }

  private calculateRetryDelay(attempt: number): number {
    // Exponential backoff with jitter
    const baseDelay = this.config.retryDelay || 1000;
    const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
    const jitter = Math.random() * 0.1 * exponentialDelay;
    return Math.min(exponentialDelay + jitter, 30000); // Max 30 seconds
  }

  private shouldNotRetry(error: any): boolean {
    // Don't retry on client errors (4xx) except 429 (rate limit)
    if (error.response?.status >= 400 && error.response?.status < 500) {
      return error.response.status !== 429;
    }
    return false;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private createServiceError(error: any, correlationId?: string): ServiceError {
    const serviceError = new Error(error.message) as ServiceError;
    serviceError.name = 'ServiceError';
    serviceError.correlationId = correlationId;
    serviceError.originalError = error;

    if (error.response) {
      serviceError.status = error.response.status;
      serviceError.code = error.response.data?.code || 'HTTP_ERROR';
    } else if (error.code === 'ECONNABORTED') {
      serviceError.isTimeout = true;
      serviceError.code = 'TIMEOUT';
    } else if (error.name === 'OpenCircuitError') {
      serviceError.isCircuitOpen = true;
      serviceError.code = 'CIRCUIT_OPEN';
    } else {
      serviceError.code = 'NETWORK_ERROR';
    }

    return serviceError;
  }

  // Protected methods for subclasses
  protected async request<T>(request: ServiceRequest): Promise<Result<T, ServiceError>> {
    try {
      const response = request.skipCircuitBreaker 
        ? await this.makeRequest(request)
        : await this.circuitBreaker.fire(request);
      
      return Result.success(response.data);
    } catch (error) {
      this.logger.error('Service request failed', {
        error: error.message,
        correlationId: request.correlationId,
        service: this.getServiceName()
      });
      
      return Result.error(error as ServiceError);
    }
  }

  protected async get<T>(url: string, config?: ServiceRequest): Promise<Result<T, ServiceError>> {
    return this.request<T>({
      method: 'GET',
      url,
      ...config
    });
  }

  protected async post<T>(url: string, data?: any, config?: ServiceRequest): Promise<Result<T, ServiceError>> {
    return this.request<T>({
      method: 'POST',
      url,
      data,
      ...config
    });
  }

  protected async put<T>(url: string, data?: any, config?: ServiceRequest): Promise<Result<T, ServiceError>> {
    return this.request<T>({
      method: 'PUT',
      url,
      data,
      ...config
    });
  }

  protected async delete<T>(url: string, config?: ServiceRequest): Promise<Result<T, ServiceError>> {
    return this.request<T>({
      method: 'DELETE',
      url,
      ...config
    });
  }

  // Public methods
  public getHealthCheck(): ServiceHealthCheck | undefined {
    return this.healthChecks.get(this.getServiceName());
  }

  public getCircuitBreakerStats() {
    return {
      name: this.circuitBreaker.name,
      state: this.circuitBreaker.opened ? 'open' : this.circuitBreaker.halfOpen ? 'half-open' : 'closed',
      stats: this.circuitBreaker.stats
    };
  }

  public async refreshAuthentication(): Promise<void> {
    if (this.config.authentication?.type === 'jwt' && this.config.authentication.refreshUrl) {
      try {
        const response = await axios.post(this.config.authentication.refreshUrl, {
          refreshToken: this.config.authentication.refreshToken
        });
        
        this.config.authentication.token = response.data.accessToken;
        this.logger.info('Authentication token refreshed', {
          service: this.getServiceName()
        });
      } catch (error) {
        this.logger.error('Failed to refresh authentication token', {
          error: error.message,
          service: this.getServiceName()
        });
        throw error;
      }
    }
  }

  // Abstract method to be implemented by subclasses
  protected abstract getServiceName(): string;
}