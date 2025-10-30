import { Request, Response, NextFunction } from 'express';
import { pool } from '../config/database';

/**
 * User roles in the system
 */
export enum UserRole {
  USER = 'user',
  MODERATOR = 'moderator',
  ADMIN = 'admin',
}

/**
 * System permissions
 */
export enum Permission {
  // User permissions
  READ_OWN_PROFILE = 'read:own:profile',
  WRITE_OWN_PROFILE = 'write:own:profile',
  DELETE_OWN_ACCOUNT = 'delete:own:account',
  
  // Job permissions
  READ_JOBS = 'read:jobs',
  SAVE_JOBS = 'save:jobs',
  
  // Application permissions
  CREATE_APPLICATION = 'create:application',
  READ_OWN_APPLICATIONS = 'read:own:applications',
  UPDATE_OWN_APPLICATIONS = 'update:own:applications',
  DELETE_OWN_APPLICATIONS = 'delete:own:applications',
  
  // Document permissions
  GENERATE_DOCUMENTS = 'generate:documents',
  READ_OWN_DOCUMENTS = 'read:own:documents',
  UPDATE_OWN_DOCUMENTS = 'update:own:documents',
  DELETE_OWN_DOCUMENTS = 'delete:own:documents',
  
  // Analytics permissions
  READ_OWN_ANALYTICS = 'read:own:analytics',
  
  // Moderator permissions
  READ_ALL_USERS = 'read:all:users',
  MODERATE_CONTENT = 'moderate:content',
  
  // Admin permissions
  MANAGE_USERS = 'manage:users',
  MANAGE_ROLES = 'manage:roles',
  READ_SYSTEM_ANALYTICS = 'read:system:analytics',
  MANAGE_SYSTEM = 'manage:system',
}

/**
 * Role-based permission mapping
 */
const rolePermissions: Record<UserRole, Permission[]> = {
  [UserRole.USER]: [
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
  ],
  [UserRole.MODERATOR]: [
    // Moderators have all user permissions plus:
    ...rolePermissions[UserRole.USER],
    Permission.READ_ALL_USERS,
    Permission.MODERATE_CONTENT,
  ],
  [UserRole.ADMIN]: [
    // Admins have all permissions
    ...Object.values(Permission),
  ],
};

/**
 * Extended Request interface with user role and permissions
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userRole?: UserRole;
      userPermissions?: Permission[];
    }
  }
}

/**
 * Middleware to load user role and permissions
 * Should be used after authentication middleware
 */
export async function loadUserRole(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.jwtPayload?.userId) {
      next();
      return;
    }

    const result = await pool.query(
      'SELECT role, permissions FROM users WHERE id = $1',
      [req.jwtPayload.userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'User not found',
      });
      return;
    }

    const user = result.rows[0];
    const role = user.role as UserRole;
    const customPermissions = user.permissions || [];

    // Combine role-based permissions with custom permissions
    req.userRole = role;
    req.userPermissions = [
      ...rolePermissions[role],
      ...customPermissions,
    ];

    next();
  } catch (error) {
    console.error('Error loading user role:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load user permissions',
    });
  }
}

/**
 * Middleware to check if user has required role
 */
export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.userRole) {
      res.status(403).json({
        success: false,
        error: 'Access denied: Role information not available',
      });
      return;
    }

    if (!roles.includes(req.userRole)) {
      res.status(403).json({
        success: false,
        error: 'Access denied: Insufficient role privileges',
        required: roles,
        current: req.userRole,
      });
      return;
    }

    next();
  };
}

/**
 * Middleware to check if user has required permission
 */
export function requirePermission(...permissions: Permission[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.userPermissions) {
      res.status(403).json({
        success: false,
        error: 'Access denied: Permission information not available',
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
        required: permissions,
      });
      return;
    }

    next();
  };
}

/**
 * Middleware to check if user has any of the required permissions
 */
export function requireAnyPermission(...permissions: Permission[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.userPermissions) {
      res.status(403).json({
        success: false,
        error: 'Access denied: Permission information not available',
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
        required: permissions,
      });
      return;
    }

    next();
  };
}

/**
 * Middleware to check resource ownership
 * Ensures user can only access their own resources
 */
export function requireOwnership(resourceUserIdParam: string = 'userId') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const resourceUserId = req.params[resourceUserIdParam];
    const currentUserId = req.jwtPayload?.userId;

    if (!currentUserId) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }

    // Admins can access any resource
    if (req.userRole === UserRole.ADMIN) {
      next();
      return;
    }

    // Check if user owns the resource
    if (resourceUserId !== currentUserId) {
      res.status(403).json({
        success: false,
        error: 'Access denied: You can only access your own resources',
      });
      return;
    }

    next();
  };
}

/**
 * Helper function to check if user has permission
 */
export function hasPermission(
  userPermissions: Permission[],
  permission: Permission
): boolean {
  return userPermissions.includes(permission);
}

/**
 * Helper function to check if user has role
 */
export function hasRole(userRole: UserRole, ...roles: UserRole[]): boolean {
  return roles.includes(userRole);
}

/**
 * Middleware to grant admin-only access
 */
export const requireAdmin = requireRole(UserRole.ADMIN);

/**
 * Middleware to grant moderator or admin access
 */
export const requireModerator = requireRole(UserRole.MODERATOR, UserRole.ADMIN);
