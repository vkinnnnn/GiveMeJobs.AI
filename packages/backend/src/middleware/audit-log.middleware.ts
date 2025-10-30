import { Request, Response, NextFunction } from 'express';
import { auditLogService } from '../services/audit-log.service';

/**
 * Middleware to automatically log sensitive operations
 */
export const auditLogMiddleware = (
  action: string,
  resourceType: string,
  getResourceId?: (req: Request) => string
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    const ipAddress = req.ip;
    const userAgent = req.get('user-agent');
    const requestMethod = req.method;
    const requestPath = req.path;

    // Store original send function
    const originalSend = res.send;

    // Override send to capture response
    res.send = function (data: any): Response {
      const status = res.statusCode >= 200 && res.statusCode < 300 ? 'success' : 'failure';
      const resourceId = getResourceId ? getResourceId(req) : undefined;

      // Log the audit entry
      auditLogService
        .log({
          userId,
          action,
          resourceType,
          resourceId,
          status,
          ipAddress,
          userAgent,
          requestMethod,
          requestPath,
          metadata: {
            statusCode: res.statusCode,
          },
        })
        .catch((error) => {
          console.error('Error logging audit entry:', error);
        });

      // Call original send
      return originalSend.call(this, data);
    };

    next();
  };
};

/**
 * Middleware to log authentication events
 */
export const auditAuthMiddleware = (action: 'login' | 'logout' | 'register') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const originalSend = res.send;

    res.send = function (data: any): Response {
      const status = res.statusCode >= 200 && res.statusCode < 300 ? 'success' : 'failure';
      const userId = req.user?.id || req.body?.email;

      auditLogService
        .logAuth(
          action,
          userId,
          status,
          {
            statusCode: res.statusCode,
          },
          req.ip,
          req.get('user-agent')
        )
        .catch((error) => {
          console.error('Error logging auth event:', error);
        });

      return originalSend.call(this, data);
    };

    next();
  };
};

/**
 * Middleware to log data access
 */
export const auditDataAccessMiddleware = (
  resourceType: string,
  getResourceId: (req: Request) => string
) => {
  return auditLogMiddleware(`data.read`, resourceType, getResourceId);
};

/**
 * Middleware to log data modifications
 */
export const auditDataModificationMiddleware = (
  action: 'create' | 'update' | 'delete',
  resourceType: string,
  getResourceId?: (req: Request) => string
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    const ipAddress = req.ip;
    const originalSend = res.send;

    res.send = function (data: any): Response {
      const status = res.statusCode >= 200 && res.statusCode < 300 ? 'success' : 'failure';
      const resourceId = getResourceId ? getResourceId(req) : undefined;

      // Capture changes from request body
      const changes = req.body;

      auditLogService
        .logDataModification(
          action,
          userId || 'unknown',
          resourceType,
          resourceId || 'unknown',
          changes,
          status,
          ipAddress
        )
        .catch((error) => {
          console.error('Error logging data modification:', error);
        });

      return originalSend.call(this, data);
    };

    next();
  };
};

/**
 * Middleware to log GDPR events
 */
export const auditGDPRMiddleware = (
  action: 'data_export' | 'account_deletion' | 'consent_granted' | 'consent_revoked'
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    const ipAddress = req.ip;
    const originalSend = res.send;

    res.send = function (data: any): Response {
      const status = res.statusCode >= 200 && res.statusCode < 300 ? 'success' : 'failure';

      auditLogService
        .logGDPR(
          action,
          userId || 'unknown',
          status,
          {
            statusCode: res.statusCode,
            requestBody: req.body,
          },
          ipAddress
        )
        .catch((error) => {
          console.error('Error logging GDPR event:', error);
        });

      return originalSend.call(this, data);
    };

    next();
  };
};
