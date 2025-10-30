import { Request, Response, NextFunction } from 'express';
import { performanceMonitor } from '../services/performance-monitor.service';

export const performanceMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  // Capture the original end function
  const originalEnd = res.end;
  
  // Override the end function to track performance
  res.end = function(this: Response, ...args: any[]): Response {
    const duration = Date.now() - startTime;
    const route = req.route?.path || req.path;
    const method = req.method;
    const statusCode = res.statusCode;
    
    // Track API performance
    performanceMonitor.trackApiPerformance(method, route, duration, statusCode, {
      userId: (req.user as any)?.id,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
    
    // Add performance headers
    res.setHeader('X-Response-Time', `${duration}ms`);
    
    // Call the original end function
    return originalEnd.apply(this, args);
  };
  
  next();
};

/**
 * Middleware to track slow endpoints
 */
export const slowEndpointTracker = (thresholdMs: number = 2000) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      if (duration > thresholdMs) {
        console.warn(`Slow endpoint detected: ${req.method} ${req.path} took ${duration}ms`);
      }
    });
    
    next();
  };
};

/**
 * Get performance statistics endpoint
 */
export const performanceStatsEndpoint = (req: Request, res: Response) => {
  const stats = performanceMonitor.getPerformanceStats();
  res.json(stats);
};
