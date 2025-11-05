import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Redis } from 'ioredis';
import { Logger } from 'winston';
import { container } from '../container';
import { TYPES } from '../types/container.types';
import { IUserRepository } from '../repositories/user.repository';
import { UserRole, Permission, JWTPayload, SessionData } from '../types/auth.types';

/**
 * Extended Express Request interface
 */
declare global {
  namespace Express {
    interface Request {
      jwtPayload?: JWTPayload;
      user?: any;
      userRole?: UserRole;
      userPermissions?: Permission[];
      sessionId?: string;
      requiresMFA?: boolean;
    }
  }
}

/**
 * Enhanced authentication middleware with session management and MFA support
 */
export class EnhancedAuthMiddleware {
  private readonly JWT_SECRET: string;
  private readonly redis: Redis;
  private readonly logger: Logger;
  private readonly userRepository: IUserRepository;

  constructor() {
    this.JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';
    this.redis = container.get<Redis>(TYPES.Redis);
    this.logger = container.get<Logger>(TYPES.Logger);
    this.userRepository = container.get<IUserRepository>(TYPES.UserRepository);
  }

  /**
   * Main authentication middleware
   */
  authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const token = this.extractTokenFromHeader(req.headers.authorization);

      if (!token) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTH_TOKEN_MISSING',
        });
        return;
      }

      // Verify JWT token
      const payload = this.verifyAccessToken(token);
      req.jwtPayload = payload;
      req.sessionId = payload.sessionId;

      // Validate session
      const isValidSession = await this.validateSession(payload.sessionId);
      if (!isValidSession) {
        res.status(401).json({
          success: false,
          error: 'Invalid or expired session',
          code: 'SESSION_INVALID',
        });
        return;
      }

      // Load user data
      const user = await this.userRepository.findById(payload.userId);
      if (!user) {
        res.status(401).json({
          success: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND',
        });
        return;
      }

      // Check if user is active
      if (!user.is_active) {
        res.status(401).json({
          success: false,
          error: 'Account is deactivated',
          code: 'ACCOUNT_DEACTIVATED',
        });
        return;
      }

      // Load user role and permissions
      await this.loadUserRoleAndPermissions(req, user);

      // Update session activity
      await this.updateSessionActivity(payload.sessionId);

      // Check if MFA is required
      if (user.mfa_enabled && !payload.mfaVerified) {
        req.requiresMFA = true;
      }

      req.user = user;
      next();
    } catch (error) {
      this.logger.error('Authentication failed', { 
        error: error.message,
        path: req.path,
        method: req.method,
        ip: req.ip,
      });

      res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
        code: 'AUTH_TOKEN_INVALID',
      });
    }
  };

  /**
   * Optional authentication middleware
   */
  optionalAuthenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const token = this.extractTokenFromHeader(req.headers.authorization);

      if (token) {
        const payload = this.verifyAccessToken(token);
        req.jwtPayload = payload;
        req.sessionId = payload.sessionId;

        // Validate session
        const isValidSession = await this.validateSession(payload.sessionId);
        if (isValidSession) {
          // Load user data
          const user = await this.userRepository.findById(payload.userId);
          if (user && user.is_active) {
            await this.loadUserRoleAndPermissions(req, user);
            await this.updateSessionActivity(payload.sessionId);
            req.user = user;
          }
        }
      }

      next();
    } catch (error) {
      // Silently fail for optional authentication
      next();
    }
  };

  /**
   * MFA verification middleware
   */
  requireMFAVerification = (req: Request, res: Response, next: NextFunction): void => {
    if (req.requiresMFA) {
      res.status(403).json({
        success: false,
        error: 'MFA verification required',
        code: 'MFA_REQUIRED',
        mfaRequired: true,
      });
      return;
    }

    next();
  };

  /**
   * Role-based access control middleware
   */
  requireRole = (...roles: UserRole[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (!req.userRole) {
        res.status(403).json({
          success: false,
          error: 'Access denied: Role information not available',
          code: 'ROLE_INFO_MISSING',
        });
        return;
      }

      if (!roles.includes(req.userRole)) {
        res.status(403).json({
          success: false,
          error: 'Access denied: Insufficient role privileges',
          code: 'INSUFFICIENT_ROLE',
          required: roles,
          current: req.userRole,
        });
        return;
      }

      next();
    };
  };

  /**
   * Permission-based access control middleware
   */
  requirePermission = (...permissions: Permission[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (!req.userPermissions) {
        res.status(403).json({
          success: false,
          error: 'Access denied: Permission information not available',
          code: 'PERMISSION_INFO_MISSING',
        });
        return;
      }

      const hasPermission = permissions.every((permission) =>
        req.userPermissions!.includes(permission)
      );

      if (!hasPermission) {
        res.status(403).json({
          success: false,
          error: 'Access denied: Insufficient permissions',
          code: 'INSUFFICIENT_PERMISSIONS',
          required: permissions,
        });
        return;
      }

      next();
    };
  };

  /**
   * Require any of the specified permissions
   */
  requireAnyPermission = (...permissions: Permission[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (!req.userPermissions) {
        res.status(403).json({
          success: false,
          error: 'Access denied: Permission information not available',
          code: 'PERMISSION_INFO_MISSING',
        });
        return;
      }

      const hasAnyPermission = permissions.some((permission) =>
        req.userPermissions!.includes(permission)
      );

      if (!hasAnyPermission) {
        res.status(403).json({
          success: false,
          error: 'Access denied: Insufficient permissions',
          code: 'INSUFFICIENT_PERMISSIONS',
          required: permissions,
        });
        return;
      }

      next();
    };
  };

  /**
   * Resource ownership middleware
   */
  requireOwnership = (resourceUserIdParam: string = 'userId') => {
    return (req: Request, res: Response, next: NextFunction): void => {
      const resourceUserId = req.params[resourceUserIdParam];
      const currentUserId = req.jwtPayload?.userId;

      if (!currentUserId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTH_REQUIRED',
        });
        return;
      }

      // Admins can access any resource
      if (req.userRole === UserRole.ADMIN) {
        next();
        return;
      }

      // Check ownership
      if (resourceUserId !== currentUserId) {
        res.status(403).json({
          success: false,
          error: 'Access denied: You can only access your own resources',
          code: 'RESOURCE_ACCESS_DENIED',
        });
        return;
      }

      next();
    };
  };

  /**
   * Rate limiting by user
   */
  rateLimitByUser = (maxRequests: number, windowMs: number) => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      if (!req.jwtPayload?.userId) {
        next();
        return;
      }

      const key = `rate_limit:user:${req.jwtPayload.userId}`;
      const current = await this.redis.incr(key);
      
      if (current === 1) {
        await this.redis.expire(key, Math.ceil(windowMs / 1000));
      }

      if (current > maxRequests) {
        res.status(429).json({
          success: false,
          error: 'Rate limit exceeded',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: windowMs / 1000,
        });
        return;
      }

      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - current));
      res.setHeader('X-RateLimit-Reset', new Date(Date.now() + windowMs).toISOString());

      next();
    };
  };

  /**
   * Extract token from Authorization header
   */
  private extractTokenFromHeader(authHeader?: string): string | null {
    if (!authHeader) return null;

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }

    return parts[1];
  }

  /**
   * Verify access token
   */
  private verifyAccessToken(token: string): JWTPayload {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET) as any;
      
      if (decoded.type !== 'access') {
        throw new Error('Invalid token type');
      }

      return {
        userId: decoded.userId,
        email: decoded.email,
        sessionId: decoded.sessionId,
        mfaVerified: decoded.mfaVerified || false,
        iat: decoded.iat,
        exp: decoded.exp,
      };
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  /**
   * Validate session
   */
  private async validateSession(sessionId: string): Promise<boolean> {
    try {
      const sessionData = await this.redis.get(`session:${sessionId}`);
      if (!sessionData) return false;

      const session: SessionData = JSON.parse(sessionData);
      
      // Check if session is active and not expired
      return session.isActive && new Date(session.expiresAt) > new Date();
    } catch (error) {
      return false;
    }
  }

  /**
   * Update session activity
   */
  private async updateSessionActivity(sessionId: string): Promise<void> {
    try {
      const sessionData = await this.redis.get(`session:${sessionId}`);
      if (sessionData) {
        const session: SessionData = JSON.parse(sessionData);
        session.lastActivity = new Date();
        
        await this.redis.setex(
          `session:${sessionId}`,
          7 * 24 * 60 * 60, // 7 days
          JSON.stringify(session)
        );
      }
    } catch (error) {
      this.logger.error('Failed to update session activity', { 
        sessionId, 
        error: error.message 
      });
    }
  }

  /**
   * Load user role and permissions
   */
  private async loadUserRoleAndPermissions(req: Request, user: any): Promise<void> {
    try {
      // Get user role
      req.userRole = user.role || UserRole.USER;

      // Get user permissions based on role
      req.userPermissions = await this.getUserPermissions(user.id, req.userRole);
    } catch (error) {
      this.logger.error('Failed to load user role and permissions', { 
        userId: user.id, 
        error: error.message 
      });
      
      // Fallback to basic user permissions
      req.userRole = UserRole.USER;
      req.userPermissions = this.getBasicUserPermissions();
    }
  }

  /**
   * Get user permissions
   */
  private async getUserPermissions(userId: string, role: UserRole): Promise<Permission[]> {
    // This would typically query the database for user-specific permissions
    // For now, return role-based permissions
    return this.getRolePermissions(role);
  }

  /**
   * Get role-based permissions
   */
  private getRolePermissions(role: UserRole): Permission[] {
    const basePermissions = this.getBasicUserPermissions();

    switch (role) {
      case UserRole.ADMIN:
        return Object.values(Permission);
      
      case UserRole.MODERATOR:
        return [
          ...basePermissions,
          Permission.READ_ALL_USERS,
          Permission.MODERATE_CONTENT,
        ];
      
      case UserRole.USER:
      default:
        return basePermissions;
    }
  }

  /**
   * Get basic user permissions
   */
  private getBasicUserPermissions(): Permission[] {
    return [
      Permission.READ_OWN_PROFILE,
      Permission.WRITE_OWN_PROFILE,
      Permission.DELETE_OWN_ACCOUNT,
      Permission.READ_JOBS,
      Permission.SAVE_JOBS,
      Permission.CREATE_APPLICATION,
      Permission.READ_OWN_APPLICATIONS,
      Permission.UPDATE_OWN_APPLICATIONS,
      Permission.DELETE_OWN_APPLICATIONS,
      Permission.GENERATE_DOCUMENTS,
      Permission.READ_OWN_DOCUMENTS,
      Permission.UPDATE_OWN_DOCUMENTS,
      Permission.DELETE_OWN_DOCUMENTS,
      Permission.READ_OWN_ANALYTICS,
    ];
  }
}

// Create singleton instance
export const enhancedAuthMiddleware = new EnhancedAuthMiddleware();

// Export individual middleware functions
export const {
  authenticate,
  optionalAuthenticate,
  requireMFAVerification,
  requireRole,
  requirePermission,
  requireAnyPermission,
  requireOwnership,
  rateLimitByUser,
} = enhancedAuthMiddleware;