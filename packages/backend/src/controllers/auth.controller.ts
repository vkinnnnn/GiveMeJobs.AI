import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { EmailService } from '../services/email.service';
import { MFAService } from '../services/mfa.service';
import {
  RegisterInput,
  LoginInput,
  RefreshTokenInput,
  ForgotPasswordInput,
  ResetPasswordInput,
} from '../validators/auth.validators';
import { verifyRefreshToken, generateTokens } from '../utils/auth.utils';
import { MFAVerificationRequest, MFASetupRequest } from '../types/auth.types';

/**
 * Authentication Controller
 * Handles HTTP requests for authentication endpoints
 */
export class AuthController {
  private authService: AuthService;
  private emailService: EmailService;
  private mfaService: MFAService;

  constructor() {
    this.authService = new AuthService();
    this.emailService = new EmailService();
    this.mfaService = new MFAService();
  }

  /**
   * Register a new user
   * POST /api/auth/register
   */
  register = async (req: Request, res: Response): Promise<void> => {
    try {
      const data: RegisterInput = req.body;

      const result = await this.authService.register(data);

      // Send welcome email (non-blocking)
      this.emailService.sendWelcomeEmail(result.user.email, result.user.first_name).catch((err) => {
        console.error('Failed to send welcome email:', err);
      });

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: result.user,
          tokens: result.tokens,
        },
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('already exists')) {
          res.status(409).json({
            success: false,
            error: error.message,
          });
          return;
        }
      }

      res.status(500).json({
        success: false,
        error: 'Failed to register user',
      });
    }
  };

  /**
   * Login user
   * POST /api/auth/login
   */
  login = async (req: Request, res: Response): Promise<void> => {
    try {
      const data: LoginInput = req.body;

      const result = await this.authService.login(data);

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          user: result.user,
          tokens: result.tokens,
        },
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('Invalid email or password')) {
          res.status(401).json({
            success: false,
            error: error.message,
          });
          return;
        }
      }

      res.status(500).json({
        success: false,
        error: 'Failed to login',
      });
    }
  };

  /**
   * Logout user
   * POST /api/auth/logout
   */
  logout = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.jwtPayload?.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      await this.authService.logout(userId);

      res.status(200).json({
        success: true,
        message: 'Logout successful',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to logout',
      });
    }
  };

  /**
   * Refresh access token
   * POST /api/auth/refresh-token
   */
  refreshToken = async (req: Request, res: Response): Promise<void> => {
    try {
      const data: RefreshTokenInput = req.body;

      // Verify refresh token
      const payload = verifyRefreshToken(data.refreshToken);

      // Generate new tokens
      const tokens = generateTokens(payload.userId, payload.email);

      res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          tokens,
        },
      });
    } catch (error) {
      res.status(401).json({
        success: false,
        error: 'Invalid or expired refresh token',
      });
    }
  };

  /**
   * Request password reset
   * POST /api/auth/forgot-password
   */
  forgotPassword = async (req: Request, res: Response): Promise<void> => {
    try {
      const data: ForgotPasswordInput = req.body;

      const token = await this.authService.createPasswordResetToken(data.email);

      // Send password reset email
      await this.emailService.sendPasswordResetEmail(data.email, token);

      res.status(200).json({
        success: true,
        message: 'If the email exists, a reset link has been sent',
      });
    } catch (error) {
      // Always return success to prevent email enumeration
      res.status(200).json({
        success: true,
        message: 'If the email exists, a reset link has been sent',
      });
    }
  };

  /**
   * Reset password
   * POST /api/auth/reset-password
   */
  resetPassword = async (req: Request, res: Response): Promise<void> => {
    try {
      const data: ResetPasswordInput = req.body;

      // Get user info before resetting password
      const resetData = await this.authService.verifyPasswordResetToken(data.token);
      
      if (!resetData) {
        res.status(400).json({
          success: false,
          error: 'Invalid or expired reset token',
        });
        return;
      }

      await this.authService.resetPassword(data.token, data.newPassword);

      // Get user to send confirmation email
      const user = await this.authService.findUserById(resetData.userId);
      if (user) {
        // Send password changed email (non-blocking)
        this.emailService.sendPasswordChangedEmail(user.email, user.first_name).catch((err) => {
          console.error('Failed to send password changed email:', err);
        });
      }

      res.status(200).json({
        success: true,
        message: 'Password reset successfully',
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('Invalid or expired')) {
          res.status(400).json({
            success: false,
            error: error.message,
          });
          return;
        }
      }

      res.status(500).json({
        success: false,
        error: 'Failed to reset password',
      });
    }
  };

  /**
   * Get current user
   * GET /api/auth/me
   */
  getCurrentUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.jwtPayload?.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const user = await this.authService.findUserById(userId);

      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          user,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get user data',
      });
    }
  };

  /**
   * Enroll in MFA
   * POST /api/auth/mfa/enroll
   */
  enrollMFA = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.jwtPayload?.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const user = await this.authService.findUserById(userId);

      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found',
        });
        return;
      }

      // Check if MFA is already enabled
      if (user.mfa_enabled) {
        res.status(400).json({
          success: false,
          error: 'MFA is already enabled',
        });
        return;
      }

      // Generate MFA secret and QR code
      const mfaData = await this.mfaService.generateMFASecret(userId, user.email);

      res.status(200).json({
        success: true,
        message: 'MFA enrollment initiated. Scan the QR code with your authenticator app.',
        data: mfaData,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to enroll in MFA',
      });
    }
  };

  /**
   * Verify and complete MFA setup
   * POST /api/auth/mfa/verify-setup
   */
  verifyMFASetup = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.jwtPayload?.userId;
      const data: MFASetupRequest = req.body;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const user = await this.authService.findUserById(userId);

      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found',
        });
        return;
      }

      // Get the temporary secret from request body
      const secret = req.body.secret;

      if (!secret) {
        res.status(400).json({
          success: false,
          error: 'MFA secret is required',
        });
        return;
      }

      // Verify the token
      const isValid = this.mfaService.verifyToken(secret, data.token);

      if (!isValid) {
        res.status(400).json({
          success: false,
          error: 'Invalid MFA token',
        });
        return;
      }

      // Enable MFA for the user
      await this.mfaService.enableMFA(userId, secret);

      res.status(200).json({
        success: true,
        message: 'MFA enabled successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to verify MFA setup',
      });
    }
  };

  /**
   * Verify MFA token during login
   * POST /api/auth/mfa/verify
   */
  verifyMFA = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.jwtPayload?.userId;
      const data: MFAVerificationRequest = req.body;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      // Get user MFA status
      const mfaStatus = await this.mfaService.getMFAStatus(userId);

      if (!mfaStatus.enabled || !mfaStatus.secret) {
        res.status(400).json({
          success: false,
          error: 'MFA is not enabled for this user',
        });
        return;
      }

      // Verify the token
      const isValid = this.mfaService.verifyToken(mfaStatus.secret, data.token);

      if (!isValid) {
        res.status(401).json({
          success: false,
          error: 'Invalid MFA token',
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'MFA verification successful',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to verify MFA token',
      });
    }
  };

  /**
   * Disable MFA
   * POST /api/auth/mfa/disable
   */
  disableMFA = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.jwtPayload?.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      await this.mfaService.disableMFA(userId);

      res.status(200).json({
        success: true,
        message: 'MFA disabled successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to disable MFA',
      });
    }
  };
}
