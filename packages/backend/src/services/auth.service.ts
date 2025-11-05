import { injectable, inject } from 'inversify';
import {
  User,
  RegisterRequest,
  LoginRequest,
  AuthToken,
  PasswordResetToken,
} from '../types/auth.types';
import {
  hashPassword,
  comparePassword,
  generateTokens,
  generateResetToken,
} from '../utils/auth.utils';
import { SessionManager, RedisCacheService, RedisKeys, CacheTTL } from '../config/redis-config';
import { v4 as uuidv4 } from 'uuid';
import { TYPES } from '../types/container.types';
import { IUserRepository } from '../repositories/user.repository';
import { Logger } from 'winston';

/**
 * Authentication Service
 * Handles user registration, login, and authentication operations
 */
@injectable()
export class AuthService {
  constructor(
    @inject(TYPES.UserRepository) private userRepository: IUserRepository,
    @inject(TYPES.Logger) private logger: Logger
  ) {}

  /**
   * Create user profile
   */
  private async createUserProfile(userId: string): Promise<void> {
    const query = `
      INSERT INTO user_profiles (user_id, preferences)
      VALUES ($1, $2)
    `;

    const defaultPreferences = {
      jobTypes: [],
      remotePreference: 'any',
      locations: [],
      salaryMin: 0,
      salaryMax: 0,
      industries: [],
      companySizes: [],
    };

    // This will be moved to a ProfileRepository later
    const { pgPool } = await import('../config/database');
    await pgPool.query(query, [userId, JSON.stringify(defaultPreferences)]);
  }

  /**
   * Register a new user
   */
  async register(data: RegisterRequest): Promise<{ user: Omit<User, 'password_hash'>; tokens: AuthToken }> {
    try {
      // Check if user already exists
      const existingUser = await this.userRepository.findByEmail(data.email);
      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      // Hash password
      const passwordHash = await hashPassword(data.password);

      // Create user data
      const userData = {
        email: data.email.toLowerCase(),
        password_hash: passwordHash,
        first_name: data.firstName,
        last_name: data.lastName,
        professional_headline: data.professionalHeadline || null,
        blockchain_address: null,
        mfa_enabled: false,
        mfa_secret: null,
        last_login: null,
      };

      // Insert user into database
      const user = await this.userRepository.create(userData);

      // Create user profile
      await this.createUserProfile(user.id);

      // Generate tokens
      const tokens = generateTokens(user.id, user.email);

      // Create session
      const sessionId = uuidv4();
      await SessionManager.createSession(sessionId, user.id, {
        email: user.email,
        sessionId,
      });

      // Remove password_hash from response
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password_hash, ...userWithoutPassword } = user;

      this.logger.info('User registered successfully', { userId: user.id, email: user.email });

      return {
        user: userWithoutPassword,
        tokens,
      };
    } catch (error) {
      this.logger.error('User registration failed', { email: data.email, error });
      throw error;
    }
  }

  /**
   * Login user
   */
  async login(data: LoginRequest): Promise<{ user: Omit<User, 'password_hash'>; tokens: AuthToken }> {
    try {
      // Find user by email
      const user = await this.userRepository.findByEmail(data.email);
      if (!user) {
        throw new Error('Invalid email or password');
      }

      // Verify password
      const isPasswordValid = await comparePassword(data.password, user.password_hash);
      if (!isPasswordValid) {
        throw new Error('Invalid email or password');
      }

      // Update last login
      await this.userRepository.updateLastLogin(user.id);

      // Generate tokens
      const tokens = generateTokens(user.id, user.email);

      // Create session
      const sessionId = uuidv4();
      await SessionManager.createSession(sessionId, user.id, {
        email: user.email,
        sessionId,
      });

      // Remove password_hash from response
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password_hash, ...userWithoutPassword } = user;

      this.logger.info('User logged in successfully', { userId: user.id, email: user.email });

      return {
        user: userWithoutPassword,
        tokens,
      };
    } catch (error) {
      this.logger.error('User login failed', { email: data.email, error });
      throw error;
    }
  }

  /**
   * Logout user
   */
  async logout(userId: string, sessionId?: string): Promise<void> {
    if (sessionId) {
      await SessionManager.deleteSession(sessionId);
    } else {
      // Delete all user sessions
      await SessionManager.deleteAllUserSessions(userId);
    }
  }

  /**
   * Find user by email
   */
  async findUserByEmail(email: string): Promise<User | null> {
    return this.userRepository.findByEmail(email);
  }

  /**
   * Find user by ID
   */
  async findUserById(userId: string): Promise<Omit<User, 'password_hash'> | null> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      return null;
    }

    // Remove password_hash from response
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password_hash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Create user profile
   */
  private async createUserProfile(userId: string): Promise<void> {
    const query = `
      INSERT INTO user_profiles (user_id, preferences)
      VALUES ($1, $2)
    `;

    const defaultPreferences = {
      jobTypes: [],
      remotePreference: 'any',
      locations: [],
      salaryMin: 0,
      salaryMax: 0,
      industries: [],
      companySizes: [],
    };

    await this.pool.query(query, [userId, JSON.stringify(defaultPreferences)]);
  }

  /**
   * Create password reset token
   */
  async createPasswordResetToken(email: string): Promise<string> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      // Don't reveal if user exists
      throw new Error('If the email exists, a reset link will be sent');
    }

    const token = generateResetToken();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    const resetData: PasswordResetToken = {
      userId: user.id,
      email: user.email,
      token,
      expiresAt,
    };

    // Store in Redis with 15 minute expiration
    await RedisCacheService.set(
      RedisKeys.passwordReset(token),
      resetData,
      CacheTTL.TEMP_TOKEN
    );

    this.logger.info('Password reset token created', { userId: user.id, email: user.email });

    return token;
  }

  /**
   * Verify password reset token (public method)
   */
  async verifyPasswordResetToken(token: string): Promise<PasswordResetToken | null> {
    const resetData = await RedisCacheService.get<PasswordResetToken>(
      RedisKeys.passwordReset(token)
    );

    if (!resetData) {
      return null;
    }

    // Check if token is expired
    if (new Date(resetData.expiresAt) < new Date()) {
      await RedisCacheService.del(RedisKeys.passwordReset(token));
      return null;
    }

    return resetData;
  }

  /**
   * Reset password
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    try {
      const resetData = await this.verifyPasswordResetToken(token);
      if (!resetData) {
        throw new Error('Invalid or expired reset token');
      }

      // Hash new password
      const passwordHash = await hashPassword(newPassword);

      // Update password
      await this.userRepository.update(resetData.userId, {
        password_hash: passwordHash,
      });

      // Delete reset token
      await RedisCacheService.del(RedisKeys.passwordReset(token));

      // Invalidate all user sessions
      await SessionManager.deleteAllUserSessions(resetData.userId);

      this.logger.info('Password reset successfully', { userId: resetData.userId });
    } catch (error) {
      this.logger.error('Password reset failed', { token, error });
      throw error;
    }
  }

  /**
   * Change password (for authenticated users)
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    try {
      // Get user with password hash
      const user = await this.userRepository.findById(userId);

      if (!user) {
        throw new Error('User not found');
      }

      // Verify current password
      const isPasswordValid = await comparePassword(currentPassword, user.password_hash);
      if (!isPasswordValid) {
        throw new Error('Current password is incorrect');
      }

      // Hash new password
      const passwordHash = await hashPassword(newPassword);

      // Update password
      await this.userRepository.update(userId, {
        password_hash: passwordHash,
      });

      // Invalidate all user sessions except current one
      await SessionManager.deleteAllUserSessions(userId);

      this.logger.info('Password changed successfully', { userId });
    } catch (error) {
      this.logger.error('Password change failed', { userId, error });
      throw error;
    }
  }
}
