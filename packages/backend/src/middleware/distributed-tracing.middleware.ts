/**
 * Distributed Tracing Middleware
 * 
 * Implements distributed tracing across Node.js and Python services
 * using OpenTelemetry standards for request correlation and performance monitoring.
 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import logger from '../services/logger.service';
import { unifiedMonitoringService } from '../services/unified-monitoring.service';

export interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  correlationId: string;
  startTime: number;
  service: string;
  operation: string;
  tags: Record<string, string>;
}

export interface TracedRequest extends Request {
  traceContext: TraceContext;
}

/**
 * Middleware to initialize distributed tracing
 */
export const initializeTracing = (
  req: TracedRequest,
  res: Response,
  next: NextFunction
): void => {
  const startTime = Date.now();
  
  // Extract or generate trace context
  const traceId = req.headers['x-trace-id'] as string || uuidv4();
  const parentSpanId = req.headers['x-parent-span-id'] as string;
  const spanId = uuidv4();
  const correlationId = req.headers['x-correlation-id'] as string || uuidv4();

  // Create trace context
  req.traceContext = {
    traceId,
    spanId,
    parentSpanId,
    correlationId,
    startTime,
    service: 'nodejs-gateway',
    operation: `${req.method} ${req.path}`,
    tags: {
      'http.method': req.method,
      'http.url': req.originalUrl,
      'http.user_agent': req.headers['user-agent'] || '',
      'user.id': req.user?.id || 'anonymous',
    },
  };

  // Add trace headers to response
  res.setHeader('x-trace-id', traceId);
  res.setHeader('x-span-id', spanId);
  res.setHeader('x-correlation-id', correlationId);

  // Log trace start
  logger.info('Trace started', {
    traceId,
    spanId,
    parentSpanId,
    correlationId,
    operation: req.traceContext.operation,
    service: 'nodejs-gateway',
  });

  // Record trace metric
  unifiedMonitoringService.recordMetric({
    name: 'trace_started',
    value: 1,
    timestamp: new Date(),
    labels: {
      service: 'nodejs-gateway',
      operation: req.traceContext.operation,
      method: req.method,
    },
    service: 'nodejs-gateway',
    type: 'counter',
  });

  next();
};

/**
 * Middleware to finalize tracing
 */
export const finalizeTracing = (
  req: TracedRequest,
  res: Response,
  next: NextFunction
): void => {
  // Store original end method
  const originalEnd = res.end;

  // Override end method to capture trace completion
  res.end = function(chunk?: any, encoding?: any) {
    const endTime = Date.now();
    const duration = endTime - req.traceContext.startTime;

    // Add response tags
    req.traceContext.tags['http.status_code'] = res.statusCode.toString();
    req.traceContext.tags['response.duration_ms'] = duration.toString();

    // Determine if trace was successful
    const success = res.statusCode < 400;
    req.traceContext.tags['trace.success'] = success.toString();

    // Log trace completion
    logger.info('Trace completed', {
      traceId: req.traceContext.traceId,
      spanId: req.traceContext.spanId,
      correlationId: req.traceContext.correlationId,
      operation: req.traceContext.operation,
      service: 'nodejs-gateway',
      duration,
      statusCode: res.statusCode,
      success,
    });

    // Record trace metrics
    unifiedMonitoringService.recordMetric({
      name: 'trace_completed',
      value: 1,
      timestamp: new Date(),
      labels: {
        service: 'nodejs-gateway',
        operation: req.traceContext.operation,
        method: req.method,
        status_code: res.statusCode.toString(),
        success: success.toString(),
      },
      service: 'nodejs-gateway',
      type: 'counter',
    });

    unifiedMonitoringService.recordMetric({
      name: 'trace_duration_ms',
      value: duration,
      timestamp: new Date(),
      labels: {
        service: 'nodejs-gateway',
        operation: req.traceContext.operation,
        method: req.method,
      },
      service: 'nodejs-gateway',
      type: 'histogram',
    });

    // Record log entry for tracing
    unifiedMonitoringService.recordLog({
      level: success ? 'info' : 'warn',
      message: `Trace ${success ? 'completed successfully' : 'completed with error'}`,
      timestamp: new Date(),
      service: 'nodejs-gateway',
      correlationId: req.traceContext.correlationId,
      metadata: {
        traceId: req.traceContext.traceId,
        spanId: req.traceContext.spanId,
        operation: req.traceContext.operation,
        duration,
        statusCode: res.statusCode,
        tags: req.traceContext.tags,
      },
    });

    // Call original end method
    return originalEnd.call(this, chunk, encoding);
  };

  next();
};

/**
 * Middleware to propagate trace context to Python services
 */
export const propagateTraceContext = (
  req: TracedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (req.traceContext) {
    // Add trace headers for Python service calls
    req.headers['x-trace-id'] = req.traceContext.traceId;
    req.headers['x-parent-span-id'] = req.traceContext.spanId;
    req.headers['x-correlation-id'] = req.traceContext.correlationId;
    req.headers['x-trace-service'] = req.traceContext.service;
    req.headers['x-trace-operation'] = req.traceContext.operation;

    // Add OpenTelemetry compatible headers
    req.headers['traceparent'] = `00-${req.traceContext.traceId}-${req.traceContext.spanId}-01`;
    
    if (req.traceContext.tags) {
      req.headers['tracestate'] = Object.entries(req.traceContext.tags)
        .map(([key, value]) => `${key}=${value}`)
        .join(',');
    }
  }

  next();
};

/**
 * Create a child span for service calls
 */
export const createChildSpan = (
  parentContext: TraceContext,
  service: string,
  operation: string,
  tags: Record<string, string> = {}
): TraceContext => {
  return {
    traceId: parentContext.traceId,
    spanId: uuidv4(),
    parentSpanId: parentContext.spanId,
    correlationId: parentContext.correlationId,
    startTime: Date.now(),
    service,
    operation,
    tags: {
      ...parentContext.tags,
      ...tags,
      'parent.service': parentContext.service,
      'parent.operation': parentContext.operation,
    },
  };
};

/**
 * Finish a span and record metrics
 */
export const finishSpan = (
  context: TraceContext,
  success: boolean = true,
  error?: Error
): void => {
  const endTime = Date.now();
  const duration = endTime - context.startTime;

  // Add completion tags
  context.tags['span.success'] = success.toString();
  context.tags['span.duration_ms'] = duration.toString();
  
  if (error) {
    context.tags['error.message'] = error.message;
    context.tags['error.name'] = error.name;
  }

  // Log span completion
  logger.info('Span completed', {
    traceId: context.traceId,
    spanId: context.spanId,
    parentSpanId: context.parentSpanId,
    correlationId: context.correlationId,
    service: context.service,
    operation: context.operation,
    duration,
    success,
    error: error?.message,
  });

  // Record span metrics
  unifiedMonitoringService.recordMetric({
    name: 'span_completed',
    value: 1,
    timestamp: new Date(),
    labels: {
      service: context.service,
      operation: context.operation,
      success: success.toString(),
      parent_service: context.tags['parent.service'] || '',
    },
    service: context.service,
    type: 'counter',
  });

  unifiedMonitoringService.recordMetric({
    name: 'span_duration_ms',
    value: duration,
    timestamp: new Date(),
    labels: {
      service: context.service,
      operation: context.operation,
    },
    service: context.service,
    type: 'histogram',
  });

  // Record log entry
  unifiedMonitoringService.recordLog({
    level: success ? 'debug' : 'error',
    message: `Span ${success ? 'completed' : 'failed'}: ${context.operation}`,
    timestamp: new Date(),
    service: context.service,
    correlationId: context.correlationId,
    metadata: {
      traceId: context.traceId,
      spanId: context.spanId,
      parentSpanId: context.parentSpanId,
      operation: context.operation,
      duration,
      success,
      error: error?.message,
      tags: context.tags,
    },
  });
};

/**
 * Middleware to trace service-to-service calls
 */
export const traceServiceCall = (targetService: string, operation: string) => {
  return (req: TracedRequest, res: Response, next: NextFunction): void => {
    if (req.traceContext) {
      // Create child span for service call
      const childSpan = createChildSpan(
        req.traceContext,
        targetService,
        operation,
        {
          'call.type': 'service-to-service',
          'target.service': targetService,
        }
      );

      // Store child span in request for later use
      (req as any).serviceSpan = childSpan;

      // Log service call start
      logger.debug('Service call started', {
        traceId: childSpan.traceId,
        spanId: childSpan.spanId,
        parentSpanId: childSpan.parentSpanId,
        correlationId: childSpan.correlationId,
        targetService,
        operation,
      });
    }

    next();
  };
};

/**
 * Get trace context from request
 */
export const getTraceContext = (req: Request): TraceContext | null => {
  return (req as TracedRequest).traceContext || null;
};

/**
 * Extract trace context from headers (for Python services)
 */
export const extractTraceContext = (headers: Record<string, string>): TraceContext | null => {
  const traceId = headers['x-trace-id'];
  const parentSpanId = headers['x-parent-span-id'];
  const correlationId = headers['x-correlation-id'];

  if (!traceId || !correlationId) {
    return null;
  }

  return {
    traceId,
    spanId: uuidv4(),
    parentSpanId,
    correlationId,
    startTime: Date.now(),
    service: headers['x-trace-service'] || 'unknown',
    operation: headers['x-trace-operation'] || 'unknown',
    tags: {},
  };
};

/**
 * Combined tracing middleware
 */
export const distributedTracingMiddleware = [
  initializeTracing,
  propagateTraceContext,
  finalizeTracing,
];

export default distributedTracingMiddleware;