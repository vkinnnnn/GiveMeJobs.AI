import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

/**
 * Middleware to add correlation ID to requests for tracking across services
 */
export const correlationIdMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Check if correlation ID already exists in headers
  let correlationId = req.headers['x-correlation-id'] as string;
  
  // Generate new correlation ID if not present
  if (!correlationId) {
    correlationId = uuidv4();
  }
  
  // Set correlation ID in request headers
  req.headers['x-correlation-id'] = correlationId;
  
  // Set correlation ID in response headers for client tracking
  res.setHeader('X-Correlation-ID', correlationId);
  
  // Add correlation ID to request object for easy access
  (req as any).correlationId = correlationId;
  
  next();
};

/**
 * Get correlation ID from request
 */
export const getCorrelationId = (req: Request): string => {
  return (req as any).correlationId || req.headers['x-correlation-id'] as string || 'unknown';
};