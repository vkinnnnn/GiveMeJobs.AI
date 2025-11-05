/**
 * Distributed tracing service using Jaeger
 */

import { injectable, inject } from 'inversify';
import { Logger } from 'winston';
import { Request, Response, NextFunction } from 'express';
import { initTracer, JaegerTracer, TracingConfig, TracingOptions } from 'jaeger-client';
import { Tracer, Span, SpanContext, FORMAT_HTTP_HEADERS, Tags } from 'opentracing';
import { TYPES } from '../types/container.types';

export interface TracingConfiguration {
  serviceName: string;
  jaegerEndpoint?: string;
  samplerType: 'const' | 'probabilistic' | 'ratelimiting';
  samplerParam: number;
  logSpans: boolean;
  tags?: Record<string, string>;
}

export interface SpanInfo {
  operationName: string;
  tags?: Record<string, any>;
  childOf?: Span | SpanContext;
  startTime?: number;
}

export interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  baggage?: Record<string, string>;
}

export interface IDistributedTracingService {
  initialize(): Promise<void>;
  createSpan(spanInfo: SpanInfo): Span;
  finishSpan(span: Span, tags?: Record<string, any>): void;
  injectHeaders(span: Span, headers: Record<string, string>): void;
  extractSpanContext(headers: Record<string, string>): SpanContext | null;
  traceAsyncOperation<T>(
    operationName: string,
    operation: (span: Span) => Promise<T>,
    parentSpan?: Span
  ): Promise<T>;
  getActiveSpan(): Span | null;
  setActiveSpan(span: Span): void;
  getTraceContext(span: Span): TraceContext;
  createMiddleware(): (req: Request, res: Response, next: NextFunction) => void;
}

@injectable()
export class DistributedTracingService implements IDistributedTracingService {
  private tracer: JaegerTracer | null = null;
  private activeSpans: Map<string, Span> = new Map();
  private config: TracingConfiguration;

  constructor(
    @inject(TYPES.Logger) private logger: Logger
  ) {
    this.config = {
      serviceName: process.env.SERVICE_NAME || 'givemejobs-backend',
      jaegerEndpoint: process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces',
      samplerType: (process.env.JAEGER_SAMPLER_TYPE as any) || 'const',
      samplerParam: parseFloat(process.env.JAEGER_SAMPLER_PARAM || '1'),
      logSpans: process.env.JAEGER_LOG_SPANS === 'true',
      tags: {
        version: process.env.SERVICE_VERSION || '1.0.0',
        environment: process.env.NODE_ENV || 'development'
      }
    };
  }

  async initialize(): Promise<void> {
    try {
      const tracingConfig: TracingConfig = {
        serviceName: this.config.serviceName,
        sampler: {
          type: this.config.samplerType,
          param: this.config.samplerParam
        },
        reporter: {
          logSpans: this.config.logSpans,
          agentHost: process.env.JAEGER_AGENT_HOST || 'localhost',
          agentPort: parseInt(process.env.JAEGER_AGENT_PORT || '6832'),
          collectorEndpoint: this.config.jaegerEndpoint
        },
        tags: this.config.tags
      };

      const tracingOptions: TracingOptions = {
        logger: {
          info: (msg: string) => this.logger.debug('Jaeger info', { message: msg }),
          error: (msg: string) => this.logger.error('Jaeger error', { message: msg })
        }
      };

      this.tracer = initTracer(tracingConfig, tracingOptions) as JaegerTracer;

      this.logger.info('Distributed tracing initialized', {
        serviceName: this.config.serviceName,
        samplerType: this.config.samplerType,
        samplerParam: this.config.samplerParam
      });
    } catch (error) {
      this.logger.error('Failed to initialize distributed tracing', {
        error: error.message
      });
      throw error;
    }
  }

  createSpan(spanInfo: SpanInfo): Span {
    if (!this.tracer) {
      throw new Error('Tracer not initialized');
    }

    const spanOptions: any = {
      tags: {
        [Tags.COMPONENT]: 'givemejobs-backend',
        [Tags.SPAN_KIND]: Tags.SPAN_KIND_RPC_SERVER,
        ...spanInfo.tags
      }
    };

    if (spanInfo.childOf) {
      spanOptions.childOf = spanInfo.childOf;
    }

    if (spanInfo.startTime) {
      spanOptions.startTime = spanInfo.startTime;
    }

    const span = this.tracer.startSpan(spanInfo.operationName, spanOptions);

    this.logger.debug('Span created', {
      operationName: spanInfo.operationName,
      traceId: this.getTraceId(span),
      spanId: this.getSpanId(span)
    });

    return span;
  }

  finishSpan(span: Span, tags?: Record<string, any>): void {
    if (tags) {
      Object.entries(tags).forEach(([key, value]) => {
        span.setTag(key, value);
      });
    }

    span.finish();

    this.logger.debug('Span finished', {
      traceId: this.getTraceId(span),
      spanId: this.getSpanId(span)
    });
  }

  injectHeaders(span: Span, headers: Record<string, string>): void {
    if (!this.tracer) return;

    this.tracer.inject(span.context(), FORMAT_HTTP_HEADERS, headers);
  }

  extractSpanContext(headers: Record<string, string>): SpanContext | null {
    if (!this.tracer) return null;

    try {
      return this.tracer.extract(FORMAT_HTTP_HEADERS, headers);
    } catch (error) {
      this.logger.debug('Failed to extract span context', {
        error: error.message
      });
      return null;
    }
  }

  async traceAsyncOperation<T>(
    operationName: string,
    operation: (span: Span) => Promise<T>,
    parentSpan?: Span
  ): Promise<T> {
    const span = this.createSpan({
      operationName,
      childOf: parentSpan
    });

    try {
      const result = await operation(span);
      
      this.finishSpan(span, {
        [Tags.ERROR]: false,
        'operation.success': true
      });
      
      return result;
    } catch (error) {
      this.finishSpan(span, {
        [Tags.ERROR]: true,
        'error.message': error.message,
        'error.name': error.name,
        'operation.success': false
      });
      
      throw error;
    }
  }

  getActiveSpan(): Span | null {
    const correlationId = this.getCurrentCorrelationId();
    return correlationId ? this.activeSpans.get(correlationId) || null : null;
  }

  setActiveSpan(span: Span): void {
    const correlationId = this.getCurrentCorrelationId();
    if (correlationId) {
      this.activeSpans.set(correlationId, span);
    }
  }

  getTraceContext(span: Span): TraceContext {
    const context = span.context() as any;
    
    return {
      traceId: this.getTraceId(span),
      spanId: this.getSpanId(span),
      parentSpanId: context.parentId || undefined,
      baggage: this.getBaggage(span)
    };
  }

  createMiddleware(): (req: Request, res: Response, next: NextFunction) => void {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!this.tracer) {
        return next();
      }

      // Extract parent span context from headers
      const parentSpanContext = this.extractSpanContext(req.headers as Record<string, string>);

      // Create span for this request
      const span = this.createSpan({
        operationName: `${req.method} ${req.route?.path || req.path}`,
        childOf: parentSpanContext || undefined,
        tags: {
          [Tags.HTTP_METHOD]: req.method,
          [Tags.HTTP_URL]: req.url,
          [Tags.HTTP_STATUS_CODE]: res.statusCode,
          'http.path': req.path,
          'http.query': JSON.stringify(req.query),
          'user.id': (req as any).user?.id,
          'correlation.id': req.headers['x-correlation-id']
        }
      });

      // Store span in request for later use
      (req as any).span = span;
      
      // Set as active span
      const correlationId = req.headers['x-correlation-id'] as string;
      if (correlationId) {
        this.activeSpans.set(correlationId, span);
      }

      // Finish span when response ends
      res.on('finish', () => {
        span.setTag(Tags.HTTP_STATUS_CODE, res.statusCode);
        
        if (res.statusCode >= 400) {
          span.setTag(Tags.ERROR, true);
          span.setTag('error.status_code', res.statusCode);
        }

        this.finishSpan(span);

        // Clean up active span
        if (correlationId) {
          this.activeSpans.delete(correlationId);
        }
      });

      next();
    };
  }

  // Service-specific tracing methods
  async traceServiceCall(
    serviceName: string,
    operation: string,
    serviceCall: (span: Span) => Promise<any>,
    parentSpan?: Span
  ): Promise<any> {
    return this.traceAsyncOperation(
      `${serviceName}.${operation}`,
      async (span) => {
        span.setTag('service.name', serviceName);
        span.setTag('service.operation', operation);
        span.setTag(Tags.SPAN_KIND, Tags.SPAN_KIND_RPC_CLIENT);

        const result = await serviceCall(span);
        
        span.setTag('service.response.size', JSON.stringify(result).length);
        return result;
      },
      parentSpan
    );
  }

  async traceDatabaseOperation(
    operation: string,
    query: string,
    dbOperation: (span: Span) => Promise<any>,
    parentSpan?: Span
  ): Promise<any> {
    return this.traceAsyncOperation(
      `db.${operation}`,
      async (span) => {
        span.setTag(Tags.DB_TYPE, 'postgresql');
        span.setTag(Tags.DB_STATEMENT, query);
        span.setTag(Tags.SPAN_KIND, Tags.SPAN_KIND_RPC_CLIENT);

        const result = await dbOperation(span);
        
        if (Array.isArray(result)) {
          span.setTag('db.rows_affected', result.length);
        }
        
        return result;
      },
      parentSpan
    );
  }

  async traceCacheOperation(
    operation: string,
    key: string,
    cacheOperation: (span: Span) => Promise<any>,
    parentSpan?: Span
  ): Promise<any> {
    return this.traceAsyncOperation(
      `cache.${operation}`,
      async (span) => {
        span.setTag('cache.key', key);
        span.setTag('cache.operation', operation);
        span.setTag(Tags.SPAN_KIND, Tags.SPAN_KIND_RPC_CLIENT);

        const result = await cacheOperation(span);
        
        span.setTag('cache.hit', result !== null && result !== undefined);
        return result;
      },
      parentSpan
    );
  }

  // Utility methods
  private getTraceId(span: Span): string {
    const context = span.context() as any;
    return context.traceId || 'unknown';
  }

  private getSpanId(span: Span): string {
    const context = span.context() as any;
    return context.spanId || 'unknown';
  }

  private getBaggage(span: Span): Record<string, string> {
    const context = span.context() as any;
    return context.baggage || {};
  }

  private getCurrentCorrelationId(): string | null {
    // This would typically be stored in async local storage
    // For now, we'll return null and rely on explicit passing
    return null;
  }

  // Performance monitoring integration
  createPerformanceSpan(operationName: string, parentSpan?: Span): Span {
    const span = this.createSpan({
      operationName: `perf.${operationName}`,
      childOf: parentSpan,
      tags: {
        'performance.monitoring': true
      }
    });

    return span;
  }

  recordMetric(span: Span, metricName: string, value: number, unit?: string): void {
    span.setTag(`metric.${metricName}`, value);
    if (unit) {
      span.setTag(`metric.${metricName}.unit`, unit);
    }
  }

  // Error tracking integration
  recordError(span: Span, error: Error, context?: Record<string, any>): void {
    span.setTag(Tags.ERROR, true);
    span.setTag('error.name', error.name);
    span.setTag('error.message', error.message);
    span.setTag('error.stack', error.stack);

    if (context) {
      Object.entries(context).forEach(([key, value]) => {
        span.setTag(`error.context.${key}`, value);
      });
    }

    span.log({
      event: 'error',
      'error.object': error,
      message: error.message,
      stack: error.stack
    });
  }

  // Cleanup method
  async close(): Promise<void> {
    if (this.tracer) {
      await new Promise<void>((resolve) => {
        this.tracer!.close(resolve);
      });
      
      this.logger.info('Distributed tracing service closed');
    }
  }
}