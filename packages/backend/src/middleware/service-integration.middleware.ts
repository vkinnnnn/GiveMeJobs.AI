/**
 * Service Integration Middleware
 * 
 * Handles request/response transformation between Node.js and Python services,
 * correlation ID management, and cross-service error handling.
 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import logger from '../services/logger.service';

export interface ServiceRequest extends Request {
  correlationId: string;
  serviceContext: {
    startTime: number;
    service?: string;
    operation?: string;
  };
}

/**
 * Middleware to add correlation IDs to all requests
 */
export const correlationIdMiddleware = (
  req: ServiceRequest,
  res: Response,
  next: NextFunction
): void => {
  // Get correlation ID from header or generate new one
  const correlationId = 
    req.headers['x-correlation-id'] as string ||
    req.headers['correlation-id'] as string ||
    uuidv4();

  // Add correlation ID to request
  req.correlationId = correlationId;
  req.serviceContext = {
    startTime: Date.now(),
  };

  // Add correlation ID to response headers
  res.setHeader('x-correlation-id', correlationId);

  // Log request start
  logger.info('Request started', {
    correlationId,
    method: req.method,
    path: req.path,
    userAgent: req.headers['user-agent'],
    ip: req.ip,
  });

  next();
};

/**
 * Middleware to transform requests for Python services
 */
export const requestTransformMiddleware = (
  req: ServiceRequest,
  res: Response,
  next: NextFunction
): void => {
  // Add service context headers for Python services
  req.headers['x-correlation-id'] = req.correlationId;
  req.headers['x-request-id'] = req.correlationId;
  req.headers['x-source-service'] = 'nodejs-gateway';
  req.headers['x-request-timestamp'] = new Date().toISOString();

  // Add user context if available
  if (req.user) {
    req.headers['x-user-id'] = req.user.id;
    req.headers['x-user-role'] = req.user.role || 'user';
  }

  // Transform request body for Python service compatibility
  if (req.body && typeof req.body === 'object') {
    // Ensure consistent date format
    req.body = transformDatesForPython(req.body);
    
    // Add metadata
    req.body._metadata = {
      correlationId: req.correlationId,
      timestamp: new Date().toISOString(),
      source: 'nodejs-gateway',
    };
  }

  next();
};

/**
 * Middleware to handle responses from Python services
 */
export const responseTransformMiddleware = (
  req: ServiceRequest,
  res: Response,
  next: NextFunction
): void => {
  // Store original json method
  const originalJson = res.json;

  // Override json method to transform responses
  res.json = function(body: any) {
    const transformedBody = transformResponseFromPython(body, req.correlationId);
    
    // Add response timing
    const responseTime = Date.now() - req.serviceContext.startTime;
    res.setHeader('x-response-time', `${responseTime}ms`);

    // Log response
    logger.info('Request completed', {
      correlationId: req.correlationId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      responseTime,
      service: req.serviceContext.service,
    });

    return originalJson.call(this, transformedBody);
  };

  next();
};

/**
 * Middleware for handling cross-service errors
 */
export const crossServiceErrorMiddleware = (
  error: any,
  req: ServiceRequest,
  res: Response,
  next: NextFunction
): void => {
  const correlationId = req.correlationId || uuidv4();

  // Log the error with context
  logger.error('Cross-service error', {
    correlationId,
    error: error.message,
    stack: error.stack,
    service: req.serviceContext.service,
    operation: req.serviceContext.operation,
    method: req.method,
    path: req.path,
  });

  // Transform error for consistent response format
  const errorResponse = {
    success: false,
    error: {
      code: getErrorCode(error),
      message: getUserFriendlyMessage(error),
      correlationId,
      timestamp: new Date().toISOString(),
    },
  };

  // Set appropriate status code
  const statusCode = getStatusCodeFromError(error);
  res.status(statusCode).json(errorResponse);
};

/**
 * Transform dates in request body for Python compatibility
 */
function transformDatesForPython(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (obj instanceof Date) {
    return obj.toISOString();
  }

  if (Array.isArray(obj)) {
    return obj.map(transformDatesForPython);
  }

  if (typeof obj === 'object') {
    const transformed: any = {};
    for (const [key, value] of Object.entries(obj)) {
      transformed[key] = transformDatesForPython(value);
    }
    return transformed;
  }

  return obj;
}

/**
 * Transform response from Python service for Node.js compatibility
 */
function transformResponseFromPython(body: any, correlationId: string): any {
  if (!body || typeof body !== 'object') {
    return body;
  }

  // If it's already a service response format, return as is
  if (body.success !== undefined || body.error !== undefined) {
    return body;
  }

  // Wrap in standard response format
  return {
    success: true,
    data: body,
    correlationId,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Get error code from error object
 */
function getErrorCode(error: any): string {
  if (error.code) {
    return error.code;
  }

  if (error.response?.status) {
    switch (error.response.status) {
      case 400:
        return 'BAD_REQUEST';
      case 401:
        return 'UNAUTHORIZED';
      case 403:
        return 'FORBIDDEN';
      case 404:
        return 'NOT_FOUND';
      case 409:
        return 'CONFLICT';
      case 422:
        return 'VALIDATION_ERROR';
      case 429:
        return 'RATE_LIMIT_EXCEEDED';
      case 500:
        return 'INTERNAL_SERVER_ERROR';
      case 502:
        return 'BAD_GATEWAY';
      case 503:
        return 'SERVICE_UNAVAILABLE';
      case 504:
        return 'GATEWAY_TIMEOUT';
      default:
        return 'UNKNOWN_ERROR';
    }
  }

  if (error.name === 'ValidationError') {
    return 'VALIDATION_ERROR';
  }

  if (error.name === 'TimeoutError') {
    return 'TIMEOUT_ERROR';
  }

  return 'INTERNAL_ERROR';
}

/**
 * Get user-friendly error message
 */
function getUserFriendlyMessage(error: any): string {
  if (error.response?.data?.message) {
    return error.response.data.message;
  }

  if (error.response?.data?.error) {
    return error.response.data.error;
  }

  if (error.message) {
    // Don't expose internal error details in production
    if (process.env.NODE_ENV === 'production') {
      switch (getErrorCode(error)) {
        case 'BAD_REQUEST':
          return 'Invalid request data';
        case 'UNAUTHORIZED':
          return 'Authentication required';
        case 'FORBIDDEN':
          return 'Access denied';
        case 'NOT_FOUND':
          return 'Resource not found';
        case 'VALIDATION_ERROR':
          return 'Invalid input data';
        case 'RATE_LIMIT_EXCEEDED':
          return 'Too many requests, please try again later';
        case 'SERVICE_UNAVAILABLE':
          return 'Service temporarily unavailable';
        case 'TIMEOUT_ERROR':
          return 'Request timeout, please try again';
        default:
          return 'An error occurred while processing your request';
      }
    }
    return error.message;
  }

  return 'An unexpected error occurred';
}

/**
 * Get HTTP status code from error
 */
function getStatusCodeFromError(error: any): number {
  if (error.response?.status) {
    return error.response.status;
  }

  if (error.status) {
    return error.status;
  }

  switch (getErrorCode(error)) {
    case 'BAD_REQUEST':
    case 'VALIDATION_ERROR':
      return 400;
    case 'UNAUTHORIZED':
      return 401;
    case 'FORBIDDEN':
      return 403;
    case 'NOT_FOUND':
      return 404;
    case 'CONFLICT':
      return 409;
    case 'RATE_LIMIT_EXCEEDED':
      return 429;
    case 'BAD_GATEWAY':
      return 502;
    case 'SERVICE_UNAVAILABLE':
      return 503;
    case 'GATEWAY_TIMEOUT':
    case 'TIMEOUT_ERROR':
      return 504;
    default:
      return 500;
  }
}

/**
 * Middleware to set service context for specific routes
 */
export const setServiceContext = (service: string, operation?: string) => {
  return (req: ServiceRequest, res: Response, next: NextFunction): void => {
    req.serviceContext.service = service;
    req.serviceContext.operation = operation;
    next();
  };
};

/**
 * Combined middleware for service integration
 */
export const serviceIntegrationMiddleware = [
  correlationIdMiddleware,
  requestTransformMiddleware,
  responseTransformMiddleware,
];

export default serviceIntegrationMiddleware;