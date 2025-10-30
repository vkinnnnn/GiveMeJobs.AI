import { Registry, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';
import { Request, Response } from 'express';

class MetricsService {
  private registry: Registry;
  
  // HTTP Metrics
  public httpRequestDuration: Histogram;
  public httpRequestTotal: Counter;
  public httpRequestErrors: Counter;
  
  // Database Metrics
  public dbQueryDuration: Histogram;
  public dbConnectionsActive: Gauge;
  public dbQueryErrors: Counter;
  
  // Application Metrics
  public activeUsers: Gauge;
  public jobSearches: Counter;
  public documentsGenerated: Counter;
  public applicationsCreated: Counter;
  
  // Cache Metrics
  public cacheHits: Counter;
  public cacheMisses: Counter;
  
  // External API Metrics
  public externalApiCalls: Counter;
  public externalApiErrors: Counter;
  public externalApiDuration: Histogram;

  constructor() {
    this.registry = new Registry();
    
    // Collect default metrics (CPU, memory, etc.)
    collectDefaultMetrics({ register: this.registry });
    
    // HTTP Request Duration
    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.1, 0.5, 1, 2, 5, 10],
      registers: [this.registry],
    });
    
    // HTTP Request Total
    this.httpRequestTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.registry],
    });
    
    // HTTP Request Errors
    this.httpRequestErrors = new Counter({
      name: 'http_request_errors_total',
      help: 'Total number of HTTP request errors',
      labelNames: ['method', 'route', 'error_type'],
      registers: [this.registry],
    });
    
    // Database Query Duration
    this.dbQueryDuration = new Histogram({
      name: 'db_query_duration_seconds',
      help: 'Duration of database queries in seconds',
      labelNames: ['operation', 'table'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
      registers: [this.registry],
    });
    
    // Database Connections Active
    this.dbConnectionsActive = new Gauge({
      name: 'db_connections_active',
      help: 'Number of active database connections',
      labelNames: ['database'],
      registers: [this.registry],
    });
    
    // Database Query Errors
    this.dbQueryErrors = new Counter({
      name: 'db_query_errors_total',
      help: 'Total number of database query errors',
      labelNames: ['operation', 'table', 'error_type'],
      registers: [this.registry],
    });
    
    // Active Users
    this.activeUsers = new Gauge({
      name: 'active_users_total',
      help: 'Number of currently active users',
      registers: [this.registry],
    });
    
    // Job Searches
    this.jobSearches = new Counter({
      name: 'job_searches_total',
      help: 'Total number of job searches performed',
      labelNames: ['source'],
      registers: [this.registry],
    });
    
    // Documents Generated
    this.documentsGenerated = new Counter({
      name: 'documents_generated_total',
      help: 'Total number of documents generated',
      labelNames: ['type'],
      registers: [this.registry],
    });
    
    // Applications Created
    this.applicationsCreated = new Counter({
      name: 'applications_created_total',
      help: 'Total number of job applications created',
      registers: [this.registry],
    });
    
    // Cache Hits
    this.cacheHits = new Counter({
      name: 'cache_hits_total',
      help: 'Total number of cache hits',
      labelNames: ['cache_type'],
      registers: [this.registry],
    });
    
    // Cache Misses
    this.cacheMisses = new Counter({
      name: 'cache_misses_total',
      help: 'Total number of cache misses',
      labelNames: ['cache_type'],
      registers: [this.registry],
    });
    
    // External API Calls
    this.externalApiCalls = new Counter({
      name: 'external_api_calls_total',
      help: 'Total number of external API calls',
      labelNames: ['service', 'endpoint'],
      registers: [this.registry],
    });
    
    // External API Errors
    this.externalApiErrors = new Counter({
      name: 'external_api_errors_total',
      help: 'Total number of external API errors',
      labelNames: ['service', 'error_type'],
      registers: [this.registry],
    });
    
    // External API Duration
    this.externalApiDuration = new Histogram({
      name: 'external_api_duration_seconds',
      help: 'Duration of external API calls in seconds',
      labelNames: ['service', 'endpoint'],
      buckets: [0.5, 1, 2, 5, 10, 30],
      registers: [this.registry],
    });
  }
  
  getRegistry(): Registry {
    return this.registry;
  }
  
  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }
  
  // Helper method to track HTTP requests
  trackHttpRequest(method: string, route: string, statusCode: number, duration: number) {
    this.httpRequestTotal.inc({ method, route, status_code: statusCode });
    this.httpRequestDuration.observe({ method, route, status_code: statusCode }, duration);
  }
  
  // Helper method to track database queries
  trackDbQuery(operation: string, table: string, duration: number) {
    this.dbQueryDuration.observe({ operation, table }, duration);
  }
  
  // Helper method to track database errors
  trackDbError(operation: string, table: string, errorType: string) {
    this.dbQueryErrors.inc({ operation, table, error_type: errorType });
  }
  
  // Helper method to track external API calls
  trackExternalApiCall(service: string, endpoint: string, duration: number) {
    this.externalApiCalls.inc({ service, endpoint });
    this.externalApiDuration.observe({ service, endpoint }, duration);
  }
  
  // Helper method to track external API errors
  trackExternalApiError(service: string, errorType: string) {
    this.externalApiErrors.inc({ service, error_type: errorType });
  }
}

export const metricsService = new MetricsService();
