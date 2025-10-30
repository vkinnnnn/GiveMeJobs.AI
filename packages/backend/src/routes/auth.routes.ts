import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { OAuthController } from '../controllers/oauth.controller';
import { validateRequest } from '../middleware/validation.middleware';
import { authenticate } from '../middleware/auth.middleware';
import { rateLimitPresets } from '../middleware/rate-limit.middleware';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  mfaVerificationSchema,
  mfaSetupSchema,
} from '../validators/auth.validators';

/**
 * Authentication Routes
 */
const router = Router();
const authController = new AuthController();
const oauthController = new OAuthController();

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', rateLimitPresets.auth, validateRequest(registerSchema), authController.register);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', rateLimitPresets.auth, validateRequest(loginSchema), authController.login);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post('/logout', authenticate, authController.logout);

/**
 * @route   POST /api/auth/refresh-token
 * @desc    Refresh access token
 * @access  Public
 */
router.post('/refresh-token', validateRequest(refreshTokenSchema), authController.refreshToken);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Request password reset
 * @access  Public
 */
router.post('/forgot-password', rateLimitPresets.auth, validateRequest(forgotPasswordSchema), authController.forgotPassword);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 */
router.post('/reset-password', rateLimitPresets.auth, validateRequest(resetPasswordSchema), authController.resetPassword);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user
 * @access  Private
 */
router.get('/me', authenticate, authController.getCurrentUser);

/**
 * MFA Routes
 */

/**
 * @route   POST /api/auth/mfa/enroll
 * @desc    Enroll in MFA
 * @access  Private
 */
router.post('/mfa/enroll', authenticate, authController.enrollMFA);

/**
 * @route   POST /api/auth/mfa/verify-setup
 * @desc    Verify and complete MFA setup
 * @access  Private
 */
router.post('/mfa/verify-setup', authenticate, validateRequest(mfaSetupSchema), authController.verifyMFASetup);

/**
 * @route   POST /api/auth/mfa/verify
 * @desc    Verify MFA token during login
 * @access  Private
 */
router.post('/mfa/verify', authenticate, validateRequest(mfaVerificationSchema), authController.verifyMFA);

/**
 * @route   POST /api/auth/mfa/disable
 * @desc    Disable MFA
 * @access  Private
 */
router.post('/mfa/disable', authenticate, authController.disableMFA);

/**
 * OAuth Routes
 */

/**
 * @route   GET /api/auth/oauth/google
 * @desc    Initiate Google OAuth flow
 * @access  Public
 */
router.get('/oauth/google', oauthController.googleAuth);

/**
 * @route   GET /api/auth/oauth/google/callback
 * @desc    Google OAuth callback
 * @access  Public
 */
router.get('/oauth/google/callback', ...oauthController.googleCallback);

/**
 * @route   GET /api/auth/oauth/linkedin
 * @desc    Initiate LinkedIn OAuth flow
 * @access  Public
 */
router.get('/oauth/linkedin', oauthController.linkedinAuth);

/**
 * @route   GET /api/auth/oauth/linkedin/callback
 * @desc    LinkedIn OAuth callback
 * @access  Public
 */
router.get('/oauth/linkedin/callback', ...oauthController.linkedinCallback);

export default router;
