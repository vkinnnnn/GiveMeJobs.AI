/**
 * Comprehensive error hierarchy with proper status codes
 */

export abstract class AppError extends Error {
  abstract readonly statusCode: number;
  abstract readonly errorCode: string;
  abstract readonly isOperational: boolean;

  constructor(
    message: string,
    public readonly context?: Record<string, any>
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      errorCode: this.errorCode,
      context: this.context,
      stack: this.stack,
    };
  }
}

// 400 Bad Request Errors
export class ValidationError extends AppError {
  readonly statusCode = 400;
  readonly errorCode = 'VALIDATION_ERROR';
  readonly isOperational = true;

  constructor(
    message: string,
    public readonly validationErrors?: Array<{
      field: string;
      message: string;
      value?: any;
    }>,
    context?: Record<string, any>
  ) {
    super(message, context);
  }

  toJSON() {
    return {
      ...super.toJSON(),
      validationErrors: this.validationErrors,
    };
  }
}

export class BadRequestError extends AppError {
  readonly statusCode = 400;
  readonly errorCode = 'BAD_REQUEST';
  readonly isOperational = true;
}

// 401 Unauthorized Errors
export class UnauthorizedError extends AppError {
  readonly statusCode = 401;
  readonly errorCode = 'UNAUTHORIZED';
  readonly isOperational = true;
}

export class AuthenticationError extends AppError {
  readonly statusCode = 401;
  readonly errorCode = 'AUTHENTICATION_FAILED';
  readonly isOperational = true;
}

export class TokenExpiredError extends AppError {
  readonly statusCode = 401;
  readonly errorCode = 'TOKEN_EXPIRED';
  readonly isOperational = true;
}

// 403 Forbidden Errors
export class ForbiddenError extends AppError {
  readonly statusCode = 403;
  readonly errorCode = 'FORBIDDEN';
  readonly isOperational = true;
}

export class InsufficientPermissionsError extends AppError {
  readonly statusCode = 403;
  readonly errorCode = 'INSUFFICIENT_PERMISSIONS';
  readonly isOperational = true;
}

// 404 Not Found Errors
export class NotFoundError extends AppError {
  readonly statusCode = 404;
  readonly errorCode = 'NOT_FOUND';
  readonly isOperational = true;

  constructor(resource: string, identifier?: string, context?: Record<string, any>) {
    const message = identifier 
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;
    super(message, context);
  }
}

// 409 Conflict Errors
export class ConflictError extends AppError {
  readonly statusCode = 409;
  readonly errorCode = 'CONFLICT';
  readonly isOperational = true;
}

export class DuplicateResourceError extends AppError {
  readonly statusCode = 409;
  readonly errorCode = 'DUPLICATE_RESOURCE';
  readonly isOperational = true;

  constructor(resource: string, field: string, value: string, context?: Record<string, any>) {
    super(`${resource} with ${field} '${value}' already exists`, context);
  }
}

// 422 Unprocessable Entity Errors
export class UnprocessableEntityError extends AppError {
  readonly statusCode = 422;
  readonly errorCode = 'UNPROCESSABLE_ENTITY';
  readonly isOperational = true;
}

// 429 Too Many Requests Errors
export class RateLimitError extends AppError {
  readonly statusCode = 429;
  readonly errorCode = 'RATE_LIMIT_EXCEEDED';
  readonly isOperational = true;

  constructor(
    message: string = 'Rate limit exceeded',
    public readonly retryAfter?: number,
    context?: Record<string, any>
  ) {
    super(message, context);
  }

  toJSON() {
    return {
      ...super.toJSON(),
      retryAfter: this.retryAfter,
    };
  }
}

// 500 Internal Server Errors
export class InternalServerError extends AppError {
  readonly statusCode = 500;
  readonly errorCode = 'INTERNAL_SERVER_ERROR';
  readonly isOperational = false;
}

export class DatabaseError extends AppError {
  readonly statusCode = 500;
  readonly errorCode = 'DATABASE_ERROR';
  readonly isOperational = false;
}

export class ExternalServiceError extends AppError {
  readonly statusCode = 500;
  readonly errorCode = 'EXTERNAL_SERVICE_ERROR';
  readonly isOperational = true;

  constructor(
    service: string,
    message: string,
    public readonly originalError?: Error,
    context?: Record<string, any>
  ) {
    super(`${service}: ${message}`, context);
  }

  toJSON() {
    return {
      ...super.toJSON(),
      originalError: this.originalError?.message,
    };
  }
}

// 502 Bad Gateway Errors
export class ServiceUnavailableError extends AppError {
  readonly statusCode = 502;
  readonly errorCode = 'SERVICE_UNAVAILABLE';
  readonly isOperational = true;

  constructor(service: string, context?: Record<string, any>) {
    super(`${service} is currently unavailable`, context);
  }
}

// 503 Service Unavailable Errors
export class MaintenanceError extends AppError {
  readonly statusCode = 503;
  readonly errorCode = 'MAINTENANCE_MODE';
  readonly isOperational = true;

  constructor(
    message: string = 'Service is under maintenance',
    public readonly estimatedDowntime?: string,
    context?: Record<string, any>
  ) {
    super(message, context);
  }

  toJSON() {
    return {
      ...super.toJSON(),
      estimatedDowntime: this.estimatedDowntime,
    };
  }
}

// Error factory functions
export const createValidationError = (
  field: string,
  message: string,
  value?: any
): ValidationError => {
  return new ValidationError('Validation failed', [{ field, message, value }]);
};

export const createNotFoundError = (resource: string, identifier?: string): NotFoundError => {
  return new NotFoundError(resource, identifier);
};

export const createDuplicateError = (
  resource: string,
  field: string,
  value: string
): DuplicateResourceError => {
  return new DuplicateResourceError(resource, field, value);
};

// Type guards
export const isAppError = (error: any): error is AppError => {
  return error instanceof AppError;
};

export const isOperationalError = (error: any): boolean => {
  return isAppError(error) && error.isOperational;
};

// Error context helpers
export interface ErrorContext {
  correlationId?: string;
  userId?: string;
  requestId?: string;
  userAgent?: string;
  ip?: string;
  method?: string;
  url?: string;
  timestamp?: string;
  [key: string]: any;
}