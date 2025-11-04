import { Request, Response, NextFunction } from 'express';
import { metricsService } from '../services/metrics.service';

export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  // Capture the original end function
  const originalEnd = res.end;
  
  // Override the end function to capture metrics
  res.end = function(this: Response, ...args: any[]): Response {
    const duration = (Date.now() - startTime) / 1000; // Convert to seconds
    const route = req.route?.path || req.path;
    const method = req.method;
    const statusCode = res.statusCode;
    
    // Track the request
    metricsService.trackHttpRequest(method, route, statusCode, duration);
    
    // Track errors
    if (statusCode >= 400) {
      const errorType = statusCode >= 500 ? 'server_error' : 'client_error';
      metricsService.httpRequestErrors.inc({ method, route, error_type: errorType });
    }
    
    // Call the original end function
    return originalEnd.apply(this, args as any);
  };
  
  next();
};

export const metricsEndpoint = async (req: Request, res: Response) => {
  try {
    res.set('Content-Type', metricsService.getRegistry().contentType);
    const metrics = await metricsService.getMetrics();
    res.end(metrics);
  } catch (error) {
    res.status(500).end(error);
  }
};
