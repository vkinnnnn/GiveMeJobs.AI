import { Request, Response, NextFunction } from 'express';
import { Logger } from '../services/logger.service';

const logger = new Logger('HTTP');

export const requestLoggingMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  // Log incoming request
  logger.http('Incoming request', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    userId: (req.user as any)?.id,
  });
  
  // Capture the original end function
  const originalEnd = res.end;
  
  // Override the end function to log response
  res.end = function(this: Response, ...args: any[]): Response {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;
    
    // Log response
    const logLevel = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'http';
    logger[logLevel]('Request completed', {
      method: req.method,
      url: req.url,
      statusCode,
      duration,
      ip: req.ip,
      userId: (req.user as any)?.id,
    });
    
    // Call the original end function
    return originalEnd.apply(this, args);
  };
  
  next();
};

export const errorLoggingMiddleware = (err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Request error', err, {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userId: (req.user as any)?.id,
    body: req.body,
    query: req.query,
    params: req.params,
  });
  
  next(err);
};
