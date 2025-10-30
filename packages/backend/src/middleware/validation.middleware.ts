import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitize string input to prevent XSS attacks
 */
function sanitizeString(value: any): any {
  if (typeof value === 'string') {
    // Remove HTML tags and sanitize
    return DOMPurify.sanitize(value, { ALLOWED_TAGS: [] }).trim();
  }
  return value;
}

/**
 * Recursively sanitize object properties
 */
function sanitizeObject(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        sanitized[key] = sanitizeObject(obj[key]);
      }
    }
    return sanitized;
  }

  return sanitizeString(obj);
}

/**
 * Validation middleware factory
 * Creates middleware that validates request body against a Zod schema
 */
export function validateRequest(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error.errors.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        });
        return;
      }

      res.status(400).json({
        success: false,
        error: 'Invalid request data',
      });
    }
  };
}

/**
 * Validation middleware with sanitization
 * Validates and sanitizes request body
 */
export function validateAndSanitize(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // First sanitize the input
      req.body = sanitizeObject(req.body);
      
      // Then validate
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error.errors.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        });
        return;
      }

      res.status(400).json({
        success: false,
        error: 'Invalid request data',
      });
    }
  };
}

/**
 * Validate query parameters
 */
export function validateQuery(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          error: 'Invalid query parameters',
          details: error.errors.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        });
        return;
      }

      res.status(400).json({
        success: false,
        error: 'Invalid query parameters',
      });
    }
  };
}

/**
 * Validate route parameters
 */
export function validateParams(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      schema.parse(req.params);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          error: 'Invalid route parameters',
          details: error.errors.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        });
        return;
      }

      res.status(400).json({
        success: false,
        error: 'Invalid route parameters',
      });
    }
  };
}

/**
 * Sanitization middleware
 * Sanitizes request body, query, and params
 */
export function sanitizeInput(req: Request, res: Response, next: NextFunction): void {
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }
  
  next();
}

/**
 * Content-Type validation middleware
 * Ensures request has correct Content-Type header
 */
export function requireContentType(...allowedTypes: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentType = req.get('Content-Type');
    
    if (!contentType) {
      res.status(400).json({
        success: false,
        error: 'Content-Type header is required',
        expected: allowedTypes,
      });
      return;
    }

    const isAllowed = allowedTypes.some(type => 
      contentType.toLowerCase().includes(type.toLowerCase())
    );

    if (!isAllowed) {
      res.status(415).json({
        success: false,
        error: 'Unsupported Media Type',
        expected: allowedTypes,
        received: contentType,
      });
      return;
    }

    next();
  };
}

/**
 * Request size validation middleware
 * Ensures request body doesn't exceed size limit
 */
export function validateRequestSize(maxSizeBytes: number) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentLength = req.get('Content-Length');
    
    if (contentLength && parseInt(contentLength) > maxSizeBytes) {
      res.status(413).json({
        success: false,
        error: 'Request entity too large',
        maxSize: `${maxSizeBytes} bytes`,
        received: `${contentLength} bytes`,
      });
      return;
    }

    next();
  };
}
