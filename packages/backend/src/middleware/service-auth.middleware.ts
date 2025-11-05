/**
 * Service Authentication Middleware
 * 
 * Middleware for authenticating service-to-service requests between
 * Node.js and Python services using JWT tokens.
 */

import { Request, Response, NextFunction } from 'express';
import { serviceAuthService, ServiceTokenPayload } from '../services/service-auth.service';
import logger from '../services/logger.service';

export interface ServiceRequest extends Request {
  service?: ServiceTokenPayload;
  correlationId?: string;
}

/**
 * Middleware to authenticate service requests
 */
export const authenticateService = (
  req: ServiceRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;
  const correlationId = req.correlationId || req.headers['x-correlation-id'] as string;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.warn('Service authentication failed - missing or invalid authorization header', {
      correlationId,
      path: req.path,
      method: req.method,
    });

    res.status(401).json({
      success: false,
      error: 'Service authentication required',
      code: 'MISSING_SERVICE_TOKEN',
      correlationId,
    });
    return;
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  const payload = serviceAuthService.validateServiceToken(token);

  if (!payload) {
    logger.warn('Service authentication failed - invalid token', {
      correlationId,
      path: req.path,
      method: req.method,
    });

    res.status(401).json({
      success: false,
      error: 'Invalid service token',
      code: 'INVALID_SERVICE_TOKEN',
      correlationId,
    });
    return;
  }

  // Add service information to request
  req.service = payload;

  logger.info('Service authenticated', {
    serviceId: payload.serviceId,
    serviceName: payload.serviceName,
    correlationId,
    path: req.path,
    method: req.method,
  });

  next();
};

/**
 * Middleware to check service permissions
 */
export const requireServicePermission = (permission: string) => {
  return (req: ServiceRequest, res: Response, next: NextFunction): void => {
    const correlationId = req.correlationId || req.headers['x-correlation-id'] as string;

    if (!req.service) {
      logger.warn('Permission check failed - no service context', {
        permission,
        correlationId,
        path: req.path,
      });

      res.status(401).json({
        success: false,
        error: 'Service authentication required',
        code: 'NO_SERVICE_CONTEXT',
        correlationId,
      });
      return;
    }

    const hasPermission = serviceAuthService.hasPermission(req.service.serviceId, permission);

    if (!hasPermission) {
      logger.warn('Permission check failed - insufficient permissions', {
        serviceId: req.service.serviceId,
        permission,
        servicePermissions: req.service.permissions,
        correlationId,
        path: req.path,
      });

      res.status(403).json({
        success: false,
        error: 'Insufficient service permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: permission,
        correlationId,
      });
      return;
    }

    logger.debug('Permission check passed', {
      serviceId: req.service.serviceId,
      permission,
      correlationId,
    });

    next();
  };
};

/**
 * Middleware to optionally authenticate service (doesn't fail if no token)
 */
export const optionalServiceAuth = (
  req: ServiceRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // No service token provided, continue without service context
    next();
    return;
  }

  const token = authHeader.substring(7);
  const payload = serviceAuthService.validateServiceToken(token);

  if (payload) {
    req.service = payload;
    logger.debug('Optional service authentication successful', {
      serviceId: payload.serviceId,
      correlationId: req.correlationId,
    });
  }

  next();
};

/**
 * Middleware to add service token to outgoing requests to Python services
 */
export const addServiceToken = (serviceId: string) => {
  return (req: ServiceRequest, res: Response, next: NextFunction): void => {
    const correlationId = req.correlationId || req.headers['x-correlation-id'] as string;

    try {
      const tokenData = serviceAuthService.generateServiceToken(serviceId);

      if (!tokenData) {
        logger.error('Failed to generate service token', {
          serviceId,
          correlationId,
        });

        res.status(500).json({
          success: false,
          error: 'Service authentication setup failed',
          code: 'TOKEN_GENERATION_FAILED',
          correlationId,
        });
        return;
      }

      // Add token to request headers for Python service calls
      req.headers['authorization'] = `Bearer ${tokenData.token}`;
      req.headers['x-service-id'] = serviceId;
      req.headers['x-service-token-expires'] = tokenData.expiresAt.toISOString();

      logger.debug('Service token added to request', {
        serviceId,
        correlationId,
        expiresAt: tokenData.expiresAt,
      });

      next();
    } catch (error) {
      logger.error('Error adding service token', {
        serviceId,
        correlationId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      res.status(500).json({
        success: false,
        error: 'Service authentication setup failed',
        code: 'TOKEN_SETUP_ERROR',
        correlationId,
      });
    }
  };
};

/**
 * Middleware to validate service-to-service communication
 */
export const validateServiceCommunication = (
  req: ServiceRequest,
  res: Response,
  next: NextFunction
): void => {
  const correlationId = req.correlationId || req.headers['x-correlation-id'] as string;
  const sourceService = req.headers['x-source-service'] as string;
  const targetService = req.headers['x-target-service'] as string;

  // Log service communication
  logger.info('Service-to-service communication', {
    sourceService,
    targetService,
    correlationId,
    path: req.path,
    method: req.method,
    serviceId: req.service?.serviceId,
  });

  // Validate that the service is authorized for this communication
  if (req.service && sourceService && req.service.serviceId !== sourceService) {
    logger.warn('Service communication validation failed - service ID mismatch', {
      tokenServiceId: req.service.serviceId,
      headerServiceId: sourceService,
      correlationId,
    });

    res.status(403).json({
      success: false,
      error: 'Service identity mismatch',
      code: 'SERVICE_IDENTITY_MISMATCH',
      correlationId,
    });
    return;
  }

  next();
};

export default {
  authenticateService,
  requireServicePermission,
  optionalServiceAuth,
  addServiceToken,
  validateServiceCommunication,
};