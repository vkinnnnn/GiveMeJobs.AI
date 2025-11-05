/**
 * Service-to-Service Authentication Service
 * 
 * Handles JWT-based authentication between Node.js and Python services,
 * including token generation, validation, and refresh mechanisms.
 */

import jwt from 'jsonwebtoken';
import { config } from '../config';
import logger from './logger.service';
import { v4 as uuidv4 } from 'uuid';

export interface ServiceToken {
  token: string;
  refreshToken: string;
  expiresAt: Date;
  refreshExpiresAt: Date;
}

export interface ServiceTokenPayload {
  serviceId: string;
  serviceName: string;
  permissions: string[];
  iat: number;
  exp: number;
  jti: string;
}

export interface ServiceRegistration {
  serviceId: string;
  serviceName: string;
  permissions: string[];
  secret?: string;
  isActive: boolean;
  createdAt: Date;
  lastUsed?: Date;
}

export class ServiceAuthService {
  private serviceRegistry: Map<string, ServiceRegistration> = new Map();
  private tokenBlacklist: Set<string> = new Set();
  private readonly serviceSecret: string;
  private readonly refreshSecret: string;

  constructor() {
    this.serviceSecret = config.jwt.secret + '_service';
    this.refreshSecret = config.jwt.refreshSecret + '_service';
    
    // Initialize with default services
    this.initializeDefaultServices();
  }

  /**
   * Initialize default service registrations
   */
  private initializeDefaultServices(): void {
    const defaultServices = [
      {
        serviceId: 'python-backend',
        serviceName: 'Python Backend Service',
        permissions: ['read:users', 'write:users', 'read:jobs', 'write:jobs', 'read:analytics'],
      },
      {
        serviceId: 'document-service',
        serviceName: 'Document Processing Service',
        permissions: ['read:documents', 'write:documents', 'process:documents'],
      },
      {
        serviceId: 'analytics-service',
        serviceName: 'Analytics Service',
        permissions: ['read:analytics', 'write:analytics', 'compute:analytics'],
      },
      {
        serviceId: 'semantic-search-service',
        serviceName: 'Semantic Search Service',
        permissions: ['read:jobs', 'search:semantic', 'read:embeddings'],
      },
    ];

    for (const service of defaultServices) {
      this.registerService(
        service.serviceId,
        service.serviceName,
        service.permissions
      );
    }

    logger.info('Default services registered', {
      count: defaultServices.length,
      services: defaultServices.map(s => s.serviceId),
    });
  }

  /**
   * Register a new service
   */
  registerService(
    serviceId: string,
    serviceName: string,
    permissions: string[],
    secret?: string
  ): ServiceRegistration {
    const registration: ServiceRegistration = {
      serviceId,
      serviceName,
      permissions,
      secret,
      isActive: true,
      createdAt: new Date(),
    };

    this.serviceRegistry.set(serviceId, registration);

    logger.info('Service registered', {
      serviceId,
      serviceName,
      permissions,
    });

    return registration;
  }

  /**
   * Generate service token
   */
  generateServiceToken(serviceId: string): ServiceToken | null {
    const service = this.serviceRegistry.get(serviceId);
    
    if (!service || !service.isActive) {
      logger.warn('Token generation failed - service not found or inactive', {
        serviceId,
      });
      return null;
    }

    const now = Math.floor(Date.now() / 1000);
    const tokenId = uuidv4();
    
    const payload: ServiceTokenPayload = {
      serviceId: service.serviceId,
      serviceName: service.serviceName,
      permissions: service.permissions,
      iat: now,
      exp: now + (15 * 60), // 15 minutes
      jti: tokenId,
    };

    const refreshPayload = {
      serviceId: service.serviceId,
      tokenId,
      iat: now,
      exp: now + (7 * 24 * 60 * 60), // 7 days
    };

    try {
      const token = jwt.sign(payload, this.serviceSecret);
      const refreshToken = jwt.sign(refreshPayload, this.refreshSecret);

      // Update last used timestamp
      service.lastUsed = new Date();
      this.serviceRegistry.set(serviceId, service);

      logger.info('Service token generated', {
        serviceId,
        tokenId,
        expiresIn: '15m',
      });

      return {
        token,
        refreshToken,
        expiresAt: new Date((now + (15 * 60)) * 1000),
        refreshExpiresAt: new Date((now + (7 * 24 * 60 * 60)) * 1000),
      };
    } catch (error) {
      logger.error('Token generation failed', {
        serviceId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  /**
   * Validate service token
   */
  validateServiceToken(token: string): ServiceTokenPayload | null {
    try {
      // Check if token is blacklisted
      if (this.tokenBlacklist.has(token)) {
        logger.warn('Token validation failed - token blacklisted');
        return null;
      }

      const payload = jwt.verify(token, this.serviceSecret) as ServiceTokenPayload;
      
      // Verify service is still registered and active
      const service = this.serviceRegistry.get(payload.serviceId);
      if (!service || !service.isActive) {
        logger.warn('Token validation failed - service not found or inactive', {
          serviceId: payload.serviceId,
        });
        return null;
      }

      // Update last used timestamp
      service.lastUsed = new Date();
      this.serviceRegistry.set(payload.serviceId, service);

      return payload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        logger.warn('Token validation failed - token expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        logger.warn('Token validation failed - invalid token');
      } else {
        logger.error('Token validation failed', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
      return null;
    }
  }

  /**
   * Refresh service token
   */
  refreshServiceToken(refreshToken: string): ServiceToken | null {
    try {
      const payload = jwt.verify(refreshToken, this.refreshSecret) as any;
      
      const service = this.serviceRegistry.get(payload.serviceId);
      if (!service || !service.isActive) {
        logger.warn('Token refresh failed - service not found or inactive', {
          serviceId: payload.serviceId,
        });
        return null;
      }

      // Generate new token
      const newToken = this.generateServiceToken(payload.serviceId);
      
      if (newToken) {
        logger.info('Service token refreshed', {
          serviceId: payload.serviceId,
        });
      }

      return newToken;
    } catch (error) {
      logger.error('Token refresh failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  /**
   * Revoke service token
   */
  revokeServiceToken(token: string): boolean {
    try {
      const payload = jwt.verify(token, this.serviceSecret) as ServiceTokenPayload;
      this.tokenBlacklist.add(token);
      
      logger.info('Service token revoked', {
        serviceId: payload.serviceId,
        tokenId: payload.jti,
      });
      
      return true;
    } catch (error) {
      logger.error('Token revocation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  /**
   * Deactivate service
   */
  deactivateService(serviceId: string): boolean {
    const service = this.serviceRegistry.get(serviceId);
    
    if (!service) {
      logger.warn('Service deactivation failed - service not found', {
        serviceId,
      });
      return false;
    }

    service.isActive = false;
    this.serviceRegistry.set(serviceId, service);

    logger.info('Service deactivated', {
      serviceId,
    });

    return true;
  }

  /**
   * Activate service
   */
  activateService(serviceId: string): boolean {
    const service = this.serviceRegistry.get(serviceId);
    
    if (!service) {
      logger.warn('Service activation failed - service not found', {
        serviceId,
      });
      return false;
    }

    service.isActive = true;
    this.serviceRegistry.set(serviceId, service);

    logger.info('Service activated', {
      serviceId,
    });

    return true;
  }

  /**
   * Check if service has permission
   */
  hasPermission(serviceId: string, permission: string): boolean {
    const service = this.serviceRegistry.get(serviceId);
    
    if (!service || !service.isActive) {
      return false;
    }

    return service.permissions.includes(permission) || 
           service.permissions.includes('*') ||
           service.permissions.some(p => p.endsWith('*') && permission.startsWith(p.slice(0, -1)));
  }

  /**
   * Get service information
   */
  getService(serviceId: string): ServiceRegistration | null {
    return this.serviceRegistry.get(serviceId) || null;
  }

  /**
   * List all services
   */
  listServices(): ServiceRegistration[] {
    return Array.from(this.serviceRegistry.values());
  }

  /**
   * Get service statistics
   */
  getServiceStats(): Record<string, any> {
    const services = Array.from(this.serviceRegistry.values());
    
    return {
      totalServices: services.length,
      activeServices: services.filter(s => s.isActive).length,
      inactiveServices: services.filter(s => !s.isActive).length,
      blacklistedTokens: this.tokenBlacklist.size,
      services: services.map(s => ({
        serviceId: s.serviceId,
        serviceName: s.serviceName,
        isActive: s.isActive,
        lastUsed: s.lastUsed,
        permissionCount: s.permissions.length,
      })),
    };
  }

  /**
   * Clean up expired blacklisted tokens (should be called periodically)
   */
  cleanupBlacklist(): void {
    // Note: In a production environment, you'd want to store blacklisted tokens
    // in a persistent store (like Redis) with TTL to handle this automatically
    const beforeSize = this.tokenBlacklist.size;
    
    // For now, we'll just clear tokens older than 24 hours
    // In a real implementation, you'd check each token's expiration
    if (beforeSize > 1000) {
      this.tokenBlacklist.clear();
      logger.info('Token blacklist cleared', {
        beforeSize,
        afterSize: 0,
      });
    }
  }
}

// Create singleton instance
export const serviceAuthService = new ServiceAuthService();

export default serviceAuthService;