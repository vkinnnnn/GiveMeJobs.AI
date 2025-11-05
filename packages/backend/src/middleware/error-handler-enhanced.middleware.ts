import { Request, Response, NextFunction } from 'express';
import { injectable, inject } from 'inversify';
import { Logger } from 'winston';
import { TYPES } from '../types/container.types';
import { 
  AppError, 
  isAppError, 
  isOperationalError,
  InternalServerError,
  ValidationError,
  RateLimitError,
  NotFoundError,
  ErrorContext
} from '../types/error.types';
import { ZodError } from 'zod';

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    correlationId: string;
    timestamp: string;
    details?: any;
    validationErrors?: Array<{
      field: string;
      message: string;
      value?: any;
    }>;
    retryAfter?: number;
  };
}

@injectable()
export class EnhancedErrorHandler {
  constructor(
    @inject(TYPES.Logger) private logger: Logger
  ) {}

  handle = (error: Error, req: Request, res: Response, next: NextFunction): void => {
    const correlationId = req.headers['x-correlation-id'] as string || this.generateCorrelationId();
    const context = this.buildErrorContext(req, correlationId);

    // Convert non-AppError to AppError
    const appError = this.normalizeError(error);

    // Log the error
    this.logError(appError, context);

    // Send error response
    const errorResponse = this.buildErrorResponse(appError, correlationId);
    res.status(appError.statusCode).json(errorResponse);
  };

  private normalizeError(error: Error): AppError {
    if (isAppError(error)) {
      return error;
    }

    // Handle Zod validation errors
    if (error instanceof ZodError) {
      const validationErrors = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        value: err.input,
      }));

      return new ValidationError(
        'Request validation failed',
        validationErrors
      );
    }

    // Handle other known error types
    if (error.name === 'CastError') {
      return new ValidationError('Invalid ID format');
    }

    if (error.name === 'MongoError' || error.name === 'MongoServerError') {
      if ((error as any).code === 11000) {
        return new ValidationError('Duplicate key error');
      }
    }

    if (error.name === 'JsonWebTokenError') {
      return new ValidationError('Invalid token');
    }

    if (error.name === 'TokenExpiredError') {
      return new ValidationError('Token expired');
    }

    // Default to internal server error
    return new InternalServerError(
      process.env.NODE_ENV === 'production' 
        ? 'An unexpected error occurred'
        : error.message
    );
  }

  private buildErrorContext(req: Request, correlationId: string): ErrorContext {
    return {
      correlationId,
      userId: req.user?.id,
      requestId: req.id,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress,
      method: req.method,
      url: req.originalUrl,
      timestamp: new Date().toISOString(),
      body: this.sanitizeRequestBody(req.body),
      query: req.query,
      params: req.params,
    };
  }

  private sanitizeRequestBody(body: any): any {
    if (!body || typeof body !== 'object') {
      return body;
    }

    const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization'];
    const sanitized = { ...body };

    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  private logError(error: AppError, context: ErrorContext): void {
    const logData = {
      error: {
        name: error.name,
        message: error.message,
        statusCode: error.statusCode,
        errorCode: error.errorCode,
        stack: error.stack,
        isOperational: error.isOperational,
      },
      context,
    };

    if (error.statusCode >= 500) {
      this.logger.error('Server error occurred', logData);
    } else if (error.statusCode >= 400) {
      this.logger.warn('Client error occurred', logData);
    } else {
      this.logger.info('Error handled', logData);
    }

    // Report to external error tracking service (Sentry, etc.)
    if (!isOperationalError(error)) {
      this.reportToExternalService(error, context);
    }
  }

  private buildErrorResponse(error: AppError, correlationId: string): ErrorResponse {
    const response: ErrorResponse = {
      error: {
        code: error.errorCode,
        message: error.message,
        correlationId,
        timestamp: new Date().toISOString(),
      },
    };

    // Add validation errors if present
    if (error instanceof ValidationError && error.validationErrors) {
      response.error.validationErrors = error.validationErrors;
    }

    // Add retry information for rate limit errors
    if (error instanceof RateLimitError && error.retryAfter) {
      response.error.retryAfter = error.retryAfter;
    }

    // Add additional details in development
    if (process.env.NODE_ENV === 'development') {
      response.error.details = {
        stack: error.stack,
        context: error.context,
      };
    }

    return response;
  }

  private generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private reportToExternalService(error: AppError, context: ErrorContext): void {
    // This would integrate with Sentry or similar service
    // For now, just log that we would report it
    this.logger.info('Would report to external error tracking service', {
      error: error.name,
      correlationId: context.correlationId,
    });
  }
}

// Middleware function
export const createErrorHandler = (errorHandler: EnhancedErrorHandler) => {
  return errorHandler.handle;
};

// Not found handler
export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  const error = new NotFoundError('Route', `${req.method} ${req.originalUrl}`);
  next(error);
};

// Async error wrapper
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};