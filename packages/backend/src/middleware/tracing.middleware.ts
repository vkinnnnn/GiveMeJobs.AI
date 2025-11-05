/**
 * Tracing middleware for distributed tracing integration
 */

import { Request, Response, NextFunction } from 'express';
import { injectable, inject } from 'inversify';
import { Logger } from 'winston';
import { Span } from 'opentracing';
import { TYPES } from '../types/container.types';
import { DistributedTracingService } from '../services/distributed-tracing.service';

// Extend Express Request to include tracing context
declare global {
  namespace Express {
    interface Request {
      span?: Span;
      traceId?: string;
      parentSpan?: Span;
    }
  }
}

export interface TracingOptions {
  operationName?: string;
  tags?: Record<string, any>;
  skipPaths?: string[];
  includeRequestBody?: boolean;
  includeResponseBody?: boolean;
}

export interface ITracingMiddleware {
  trace(options?: TracingOptions): (req: Request, res: Response, next: NextFunction) => void;
  traceServiceCall(serviceName: string): (req: Request, res: Response, next: NextFunction) => void;
  traceDatabaseOperation(): (req: Request, res: Response, next: NextFunction) => void;
  traceAsyncOperation<T>(
    req: Request,
    operationName: string,
    operation: (span: Span) => Promise<T>
  ): Promise<T>;
}

@injectable()
export class TracingMiddleware implements ITracingMiddleware {
  constructor(
    @inject(TYPES.Logger) private logger: Logger,
    @inject(TYPES.DistributedTracingService) private tracingService: DistributedTracingService
  ) {}

  /**
   * Main tracing middleware
   */
  trace(options: TracingOptions = {}) {
    return (req: Request, res: Response, next: NextFunction): void => {
      // Skip tracing for certain paths
      if (options.skipPaths?.some(path => req.path.startsWith(path))) {
        return next();
      }

      try {
        // Extract parent span context from headers
        const parentSpanContext = this.tracingService.extractSpanContext(
          req.headers as Record<string, string>
        );

        // Create operation name
        const operationName = options.operationName || 
          `${req.method} ${req.route?.path || req.path}`;

        // Create span
        const span = this.tracingService.createSpan({
          operationName,
          childOf: parentSpanContext || undefined,
          tags: {
            'http.method': req.method,
            'http.url': req.url,
            'http.path': req.path,
            'http.user_agent': req.headers['user-agent'],
            'correlation.id': req.headers['x-correlation-id'],
            'user.id': (req as any).user?.id,
            'service.name': 'givemejobs-backend',
            ...options.tags
          }
        });

        // Store span in request
        req.span = span;
        req.traceId = this.getTraceId(span);

        // Add trace ID to response headers
        res.setHeader('X-Trace-ID', req.traceId);

        // Log request body if enabled
        if (options.includeRequestBody && req.body) {
          span.setTag('http.request.body', JSON.stringify(req.body));
        }

        // Capture response details
        const originalSend = res.send;
        res.send = function(body: any) {
          span.setTag('http.status_code', res.statusCode);
          
          if (options.includeResponseBody && body) {
            span.setTag('http.response.body', typeof body === 'string' ? body : JSON.stringify(body));
          }

          if (res.statusCode >= 400) {
            span.setTag('error', true);
            span.setTag('error.status_code', res.statusCode);
          }

          return originalSend.call(this, body);
        };

        // Finish span when response ends
        res.on('finish', () => {
          span.setTag('http.status_code', res.statusCode);
          span.setTag('http.response.size', res.get('content-length') || 0);

          if (res.statusCode >= 400) {
            span.setTag('error', true);
            span.setTag('error.status_code', res.statusCode);
          }

          this.tracingService.finishSpan(span, {
            'response.finished': true,
            'response.time': Date.now() - (req as any).startTime
          });
        });

        // Handle errors
        res.on('error', (error) => {
          this.tracingService.recordError(span, error, {
            'request.path': req.path,
            'request.method': req.method
          });
          
          this.tracingService.finishSpan(span, {
            'error': true,
            'error.type': 'response_error'
          });
        });

        next();
      } catch (error) {
        this.logger.error('Tracing middleware error', {
          error: error.message,
          path: req.path,
          method: req.method
        });
        next();
      }
    };
  }

  /**
   * Middleware for tracing service calls
   */
  traceServiceCall(serviceName: string) {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (!req.span) {
        return next();
      }

      // Create child span for service call
      const serviceSpan = this.tracingService.createSpan({
        operationName: `service.${serviceName}`,
        childOf: req.span,
        tags: {
          'service.name': serviceName,
          'service.type': 'external',
          'span.kind': 'client'
        }
      });

      // Store service span for use in service calls
      (req as any).serviceSpan = serviceSpan;

      // Finish service span when request completes
      res.on('finish', () => {
        this.tracingService.finishSpan(serviceSpan);
      });

      next();
    };
  }

  /**
   * Middleware for tracing database operations
   */
  traceDatabaseOperation() {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (!req.span) {
        return next();
      }

      // Create child span for database operations
      const dbSpan = this.tracingService.createSpan({
        operationName: 'db.operation',
        childOf: req.span,
        tags: {
          'db.type': 'postgresql',
          'span.kind': 'client'
        }
      });

      // Store database span
      (req as any).dbSpan = dbSpan;

      // Finish database span when request completes
      res.on('finish', () => {
        this.tracingService.finishSpan(dbSpan);
      });

      next();
    };
  }

  /**
   * Trace an async operation within a request context
   */
  async traceAsyncOperation<T>(
    req: Request,
    operationName: string,
    operation: (span: Span) => Promise<T>
  ): Promise<T> {
    const parentSpan = req.span;
    
    return this.tracingService.traceAsyncOperation(
      operationName,
      operation,
      parentSpan
    );
  }

  /**
   * Create a child span for a specific operation
   */
  createChildSpan(req: Request, operationName: string, tags?: Record<string, any>): Span | null {
    if (!req.span) {
      return null;
    }

    return this.tracingService.createSpan({
      operationName,
      childOf: req.span,
      tags: {
        'parent.operation': req.span.operationName,
        'correlation.id': req.headers['x-correlation-id'],
        ...tags
      }
    });
  }

  /**
   * Add baggage to the current span
   */
  addBaggage(req: Request, key: string, value: string): void {
    if (req.span) {
      req.span.setBaggageItem(key, value);
    }
  }

  /**
   * Get baggage from the current span
   */
  getBaggage(req: Request, key: string): string | undefined {
    if (req.span) {
      return req.span.getBaggageItem(key);
    }
    return undefined;
  }

  /**
   * Add tags to the current span
   */
  addTags(req: Request, tags: Record<string, any>): void {
    if (req.span) {
      Object.entries(tags).forEach(([key, value]) => {
        req.span!.setTag(key, value);
      });
    }
  }

  /**
   * Log an event to the current span
   */
  logEvent(req: Request, event: string, payload?: Record<string, any>): void {
    if (req.span) {
      req.span.log({
        event,
        timestamp: Date.now(),
        ...payload
      });
    }
  }

  /**
   * Record an error in the current span
   */
  recordError(req: Request, error: Error, context?: Record<string, any>): void {
    if (req.span) {
      this.tracingService.recordError(req.span, error, {
        'request.path': req.path,
        'request.method': req.method,
        'correlation.id': req.headers['x-correlation-id'],
        ...context
      });
    }
  }

  /**
   * Get trace ID from request
   */
  getTraceId(req: Request): string | null {
    return req.traceId || null;
  }

  /**
   * Inject trace headers for outgoing requests
   */
  injectTraceHeaders(req: Request, headers: Record<string, string>): void {
    if (req.span) {
      this.tracingService.injectHeaders(req.span, headers);
    }
  }

  private getTraceId(span: Span): string {
    const context = span.context() as any;
    return context.traceId || 'unknown';
  }
}

/**
 * Helper functions for use in controllers and services
 */
export class TracingHelpers {
  static async traceServiceCall<T>(
    req: Request,
    serviceName: string,
    operation: string,
    serviceCall: () => Promise<T>
  ): Promise<T> {
    if (!req.span) {
      return serviceCall();
    }

    const tracingService = req.app.locals.tracingService as DistributedTracingService;
    
    return tracingService.traceServiceCall(
      serviceName,
      operation,
      async (span) => {
        // Inject trace headers for the service call
        const headers: Record<string, string> = {};
        tracingService.injectHeaders(span, headers);
        
        // Add headers to the service call context
        (req as any).serviceHeaders = headers;
        
        return serviceCall();
      },
      req.span
    );
  }

  static async traceDatabaseQuery<T>(
    req: Request,
    operation: string,
    query: string,
    dbCall: () => Promise<T>
  ): Promise<T> {
    if (!req.span) {
      return dbCall();
    }

    const tracingService = req.app.locals.tracingService as DistributedTracingService;
    
    return tracingService.traceDatabaseOperation(
      operation,
      query,
      async (span) => {
        return dbCall();
      },
      req.span
    );
  }

  static async traceCacheOperation<T>(
    req: Request,
    operation: string,
    key: string,
    cacheCall: () => Promise<T>
  ): Promise<T> {
    if (!req.span) {
      return cacheCall();
    }

    const tracingService = req.app.locals.tracingService as DistributedTracingService;
    
    return tracingService.traceCacheOperation(
      operation,
      key,
      async (span) => {
        return cacheCall();
      },
      req.span
    );
  }
}