import { Request, Response, NextFunction } from 'express';
import { Sentry } from '../config/sentry.config';
import { ZodError } from 'zod';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export class CustomError extends Error implements AppError {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: AppError | ZodError | Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log error details
  console.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
  });

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    return res.status(400).json({
      status: 'error',
      message: 'Validation error',
      errors: err.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
  }

  // Determine status code
  const statusCode = (err as AppError).statusCode || 500;
  const isOperational = (err as AppError).isOperational !== false;

  // Report to Sentry if it's not an operational error
  if (!isOperational || statusCode >= 500) {
    Sentry.captureException(err, {
      tags: {
        endpoint: req.url,
        method: req.method,
      },
      user: req.user ? {
        id: (req.user as any).id,
        email: (req.user as any).email,
      } : undefined,
      extra: {
        body: req.body,
        query: req.query,
        params: req.params,
      },
    });
  }

  // Send error response
  res.status(statusCode).json({
    status: 'error',
    message: statusCode === 500 ? 'Internal server error' : err.message,
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      details: err,
    }),
  });
};

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  const error = new CustomError(`Route not found: ${req.originalUrl}`, 404);
  next(error);
};
