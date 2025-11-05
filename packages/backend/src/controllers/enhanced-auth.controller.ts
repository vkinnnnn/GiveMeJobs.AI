import { Request, Response } from 'express';
import { injectable, inject } from 'inversify';
import { body, validationResult } from 'express-validator';
import { TYPES } from '../types/container.types';
import { EnhancedAuthService } from '../services/enhanced-auth.service';
import { IUserRepository } from '../repositories/user.repository';
import { Logger } from 'winston';
import {
  RegisterRequest,
  LoginRequest,
  MFAVerifyRequest,
  RefreshTokenRequest,
  ChangePasswordRequest,
  OAuthProfile,
} from '../types/auth.types';

/**
 * Enhanced Authentication Controller
 * Handles authentication, MFA, OAuth, and session management
 */
@injectable()
export class EnhancedAuthController {
  constructor(
    @inject(TYPES.EnhancedAuthService) private authService: EnhancedAuthService,
    @inject(TYPES.UserRepository) private userRepository: IUserRepository,
    @inject(TYPES.Logger) private logger: Logger
  ) {}

  /**
   * User registration
   */
  async register(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array(),
        });
        return;
      }

      const data: RegisterRequest = req.body;

      // Check if user already exists
      const existingUser = await this.userRepository.findByEmail(data.email);
      if (existingUser) {
        res.status(409).json({
          success: false,
          error: 'User with this email already exists',
          code: 'USER_EXISTS',
        });
        return;
      }

      // Create user
      const user = await this.userRepository.create({
        email: data.email.toLowerCase(),
        password_hash: data.password, // Will be hashed in repository
        first_name: data.firstName,
        last_name: data.lastName,
        professional_headline: data.professionalHeadline || null,
        blockchain_address: null,
        mfa_enabled: false,
        mfa_secret: null,
        last_login: null,
      });

      // Generate tokens
      const tokens = await this.authService.generateTokens(user.id, user.email);

      // Create session
      const sessionId = await this.authService.createSession(user.id, {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });

      // Remove password hash from response
      const { password_hash, ...userWithoutPassword } = user;

      this.logger.info('User registered successfully', { 
        userId: user.id, 
        email: user.email,
        ip: req.ip,
      });

      res.status(201).json({
        success: true,
        data: {
          user: userWithoutPassword,
          tokens,
          sessionId,
        },
      });
    } catch (error) {
      this.logger.error('Registration failed', { 
        email: req.body.email, 
        error: error.message,
        ip: req.ip,
      });

      res.status(500).json({
        success: false,
        error: 'Registration failed',
        code: 'REGISTRATION_ERROR',
      });
    }
  }

  /**
   * User login
   */
  async login(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array(),
        });
        return;
      }

      const { email, password, mfaToken }: LoginRequest = req.body;

      // Find user
      const user = await this.userRepository.findByEmail(email);
      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Invalid email or password',
          code: 'INVALID_CREDENTIALS',
        });
        return;
      }

      // Verify password (assuming repository handles password verification)
      const isPasswordValid = await this.userRepository.verifyPassword(user.id, password);
      if (!isPasswordValid) {
        res.status(401).json({
          success: false,
          error: 'Invalid email or password',
          code: 'INVALID_CREDENTIALS',
        });
        return;
      }

      // Check if MFA is enabled
      if (user.mfa_enabled) {
        if (!mfaToken) {
          res.status(403).json({
            success: false,
            error: 'MFA token required',
            code: 'MFA_REQUIRED',
            mfaRequired: true,
          });
          return;
        }

        // Verify MFA token
        const isMFAValid = await this.authService.verifyMFAToken(user.id, mfaToken);
        if (!isMFAValid) {
          res.status(401).json({
            success: false,
            error: 'Invalid MFA token',
            code: 'INVALID_MFA_TOKEN',
          });
          return;
        }
      }

      // Update last login
      await this.userRepository.updateLastLogin(user.id);

      // Generate tokens with MFA verification flag
      const tokens = await this.authService.generateTokens(user.id, user.email);

      // Create session
      const sessionId = await this.authService.createSession(user.id, {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        mfaVerified: user.mfa_enabled,
      });

      // Remove password hash from response
      const { password_hash, ...userWithoutPassword } = user;

      this.logger.info('User logged in successfully', { 
        userId: user.id, 
        email: user.email,
        mfaUsed: !!mfaToken,
        ip: req.ip,
      });

      res.json({
        success: true,
        data: {
          user: userWithoutPassword,
          tokens,
          sessionId,
        },
      });
    } catch (error) {
      this.logger.error('Login failed', { 
        email: req.body.email, 
        error: error.message,
        ip: req.ip,
      });

      res.status(500).json({
        success: false,
        error: 'Login failed',
        code: 'LOGIN_ERROR',
      });
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken }: RefreshTokenRequest = req.body;

      if (!refreshToken) {
        res.status(400).json({
          success: false,
          error: 'Refresh token is required',
          code: 'REFRESH_TOKEN_MISSING',
        });
        return;
      }

      // Refresh tokens
      const newTokens = await this.authService.refreshToken(refreshToken);

      this.logger.info('Tokens refreshed successfully', { ip: req.ip });

      res.json({
        success: true,
        data: newTokens,
      });
    } catch (error) {
      this.logger.error('Token refresh failed', { 
        error: error.message,
        ip: req.ip,
      });

      res.status(401).json({
        success: false,
        error: 'Invalid or expired refresh token',
        code: 'INVALID_REFRESH_TOKEN',
      });
    }
  }

  /**
   * Logout user
   */
  async logout(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.jwtPayload?.userId;
      const sessionId = req.sessionId;

      if (userId && sessionId) {
        // Invalidate session
        await this.authService.invalidateSession(sessionId);

        // Invalidate refresh tokens for this session
        await this.authService.invalidateAllUserRefreshTokens(userId);

        this.logger.info('User logged out successfully', { 
          userId, 
          sessionId,
          ip: req.ip,
        });
      }

      res.json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      this.logger.error('Logout failed', { 
        error: error.message,
        ip: req.ip,
      });

      res.status(500).json({
        success: false,
        error: 'Logout failed',
        code: 'LOGOUT_ERROR',
      });
    }
  }

  /**
   * Logout from all devices
   */
  async logoutAll(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.jwtPayload?.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTH_REQUIRED',
        });
        return;
      }

      // Invalidate all sessions and refresh tokens
      await this.authService.invalidateAllUserSessions(userId);
      await this.authService.invalidateAllUserRefreshTokens(userId);

      this.logger.info('User logged out from all devices', { 
        userId,
        ip: req.ip,
      });

      res.json({
        success: true,
        message: 'Logged out from all devices successfully',
      });
    } catch (error) {
      this.logger.error('Logout all failed', { 
        userId: req.jwtPayload?.userId,
        error: error.message,
        ip: req.ip,
      });

      res.status(500).json({
        success: false,
        error: 'Logout failed',
        code: 'LOGOUT_ALL_ERROR',
      });
    }
  }

  /**
   * Setup MFA
   */
  async setupMFA(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.jwtPayload?.userId;
      const user = req.user;

      if (!userId || !user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTH_REQUIRED',
        });
        return;
      }

      if (user.mfa_enabled) {
        res.status(409).json({
          success: false,
          error: 'MFA is already enabled',
          code: 'MFA_ALREADY_ENABLED',
        });
        return;
      }

      // Setup MFA
      const mfaSetup = await this.authService.setupMFA(userId, user.email);

      this.logger.info('MFA setup initiated', { userId, ip: req.ip });

      res.json({
        success: true,
        data: mfaSetup,
      });
    } catch (error) {
      this.logger.error('MFA setup failed', { 
        userId: req.jwtPayload?.userId,
        error: error.message,
        ip: req.ip,
      });

      res.status(500).json({
        success: false,
        error: 'MFA setup failed',
        code: 'MFA_SETUP_ERROR',
      });
    }
  }

  /**
   * Verify and enable MFA
   */
  async verifyMFA(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.jwtPayload?.userId;
      const { token }: MFAVerifyRequest = req.body;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTH_REQUIRED',
        });
        return;
      }

      if (!token) {
        res.status(400).json({
          success: false,
          error: 'MFA token is required',
          code: 'MFA_TOKEN_MISSING',
        });
        return;
      }

      // Verify and enable MFA
      const success = await this.authService.verifyAndEnableMFA(userId, token);

      if (!success) {
        res.status(400).json({
          success: false,
          error: 'Invalid MFA token',
          code: 'INVALID_MFA_TOKEN',
        });
        return;
      }

      this.logger.info('MFA enabled successfully', { userId, ip: req.ip });

      res.json({
        success: true,
        message: 'MFA enabled successfully',
      });
    } catch (error) {
      this.logger.error('MFA verification failed', { 
        userId: req.jwtPayload?.userId,
        error: error.message,
        ip: req.ip,
      });

      res.status(500).json({
        success: false,
        error: 'MFA verification failed',
        code: 'MFA_VERIFY_ERROR',
      });
    }
  }

  /**
   * Disable MFA
   */
  async disableMFA(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.jwtPayload?.userId;
      const { password, token } = req.body;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTH_REQUIRED',
        });
        return;
      }

      if (!password || !token) {
        res.status(400).json({
          success: false,
          error: 'Password and MFA token are required',
          code: 'MISSING_CREDENTIALS',
        });
        return;
      }

      // Disable MFA
      await this.authService.disableMFA(userId, password, token);

      this.logger.info('MFA disabled successfully', { userId, ip: req.ip });

      res.json({
        success: true,
        message: 'MFA disabled successfully',
      });
    } catch (error) {
      this.logger.error('MFA disable failed', { 
        userId: req.jwtPayload?.userId,
        error: error.message,
        ip: req.ip,
      });

      res.status(400).json({
        success: false,
        error: error.message,
        code: 'MFA_DISABLE_ERROR',
      });
    }
  }

  /**
   * Get user sessions
   */
  async getSessions(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.jwtPayload?.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTH_REQUIRED',
        });
        return;
      }

      const sessions = await this.authService.getUserSessions(userId);

      res.json({
        success: true,
        data: sessions,
      });
    } catch (error) {
      this.logger.error('Get sessions failed', { 
        userId: req.jwtPayload?.userId,
        error: error.message,
        ip: req.ip,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to get sessions',
        code: 'GET_SESSIONS_ERROR',
      });
    }
  }

  /**
   * Revoke specific session
   */
  async revokeSession(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.jwtPayload?.userId;
      const { sessionId } = req.params;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTH_REQUIRED',
        });
        return;
      }

      // Invalidate session
      await this.authService.invalidateSession(sessionId);

      this.logger.info('Session revoked', { userId, sessionId, ip: req.ip });

      res.json({
        success: true,
        message: 'Session revoked successfully',
      });
    } catch (error) {
      this.logger.error('Session revoke failed', { 
        userId: req.jwtPayload?.userId,
        sessionId: req.params.sessionId,
        error: error.message,
        ip: req.ip,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to revoke session',
        code: 'REVOKE_SESSION_ERROR',
      });
    }
  }

  /**
   * Change password
   */
  async changePassword(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.jwtPayload?.userId;
      const { currentPassword, newPassword }: ChangePasswordRequest = req.body;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTH_REQUIRED',
        });
        return;
      }

      if (!currentPassword || !newPassword) {
        res.status(400).json({
          success: false,
          error: 'Current password and new password are required',
          code: 'MISSING_PASSWORDS',
        });
        return;
      }

      // Verify current password
      const isCurrentPasswordValid = await this.userRepository.verifyPassword(userId, currentPassword);
      if (!isCurrentPasswordValid) {
        res.status(400).json({
          success: false,
          error: 'Current password is incorrect',
          code: 'INVALID_CURRENT_PASSWORD',
        });
        return;
      }

      // Update password
      await this.userRepository.updatePassword(userId, newPassword);

      // Invalidate all sessions except current one
      await this.authService.invalidateAllUserRefreshTokens(userId);

      this.logger.info('Password changed successfully', { userId, ip: req.ip });

      res.json({
        success: true,
        message: 'Password changed successfully',
      });
    } catch (error) {
      this.logger.error('Password change failed', { 
        userId: req.jwtPayload?.userId,
        error: error.message,
        ip: req.ip,
      });

      res.status(500).json({
        success: false,
        error: 'Password change failed',
        code: 'PASSWORD_CHANGE_ERROR',
      });
    }
  }

  /**
   * OAuth authentication callback
   */
  async oauthCallback(req: Request, res: Response): Promise<void> {
    try {
      const profile: OAuthProfile = req.body;

      if (!profile || !profile.provider || !profile.providerId || !profile.email) {
        res.status(400).json({
          success: false,
          error: 'Invalid OAuth profile data',
          code: 'INVALID_OAUTH_PROFILE',
        });
        return;
      }

      // Authenticate with OAuth
      const result = await this.authService.authenticateWithOAuth(profile);

      // Create session
      const sessionId = await this.authService.createSession(result.user.id, {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        oauthProvider: profile.provider,
      });

      this.logger.info('OAuth authentication successful', { 
        userId: result.user.id,
        provider: profile.provider,
        isNewUser: result.isNewUser,
        ip: req.ip,
      });

      res.json({
        success: true,
        data: {
          user: result.user,
          tokens: result.tokens,
          sessionId,
          isNewUser: result.isNewUser,
        },
      });
    } catch (error) {
      this.logger.error('OAuth authentication failed', { 
        provider: req.body.provider,
        error: error.message,
        ip: req.ip,
      });

      res.status(500).json({
        success: false,
        error: 'OAuth authentication failed',
        code: 'OAUTH_AUTH_ERROR',
      });
    }
  }
}

// Validation middleware
export const registerValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/),
  body('firstName').isLength({ min: 1, max: 100 }).trim(),
  body('lastName').isLength({ min: 1, max: 100 }).trim(),
  body('professionalHeadline').optional().isLength({ max: 255 }).trim(),
];

export const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
  body('mfaToken').optional().isLength({ min: 6, max: 6 }),
];

export const mfaTokenValidation = [
  body('token').isLength({ min: 6, max: 6 }),
];

export const changePasswordValidation = [
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/),
];