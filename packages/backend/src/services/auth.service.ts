import { Pool } from 'pg';
import { pgPool } from '../config/database';
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

/**
 * Authentication Service
 * Handles user registration, login, and authentication operations
 */
export class AuthService {
  private pool: Pool;

  constructor() {
    this.pool = pgPool;
  }

  /**
   * Register a new user
   */
  async register(data: RegisterRequest): Promise<{ user: Omit<User, 'password_hash'>; tokens: AuthToken }> {
    // Check if user already exists
    const existingUser = await this.findUserByEmail(data.email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Hash password
    const passwordHash = await hashPassword(data.password);

    // Insert user into database
    const query = `
      INSERT INTO users (
        email,
        password_hash,
        first_name,
        last_name,
        professional_headline
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, email, first_name, last_name, professional_headline, 
                blockchain_address, mfa_enabled, mfa_secret, created_at, updated_at, last_login
    `;

    const values = [
      data.email.toLowerCase(),
      passwordHash,
      data.firstName,
      data.lastName,
      data.professionalHeadline || null,
    ];

    const result = await this.pool.query(query, values);
    const user = result.rows[0];

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

    return {
      user,
      tokens,
    };
  }

  /**
   * Login user
   */
  async login(data: LoginRequest): Promise<{ user: Omit<User, 'password_hash'>; tokens: AuthToken }> {
    // Find user by email
    const user = await this.findUserByEmail(data.email);
    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Verify password
    const isPasswordValid = await comparePassword(data.password, user.password_hash);
    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    // Update last login
    await this.updateLastLogin(user.id);

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

    return {
      user: userWithoutPassword,
      tokens,
    };
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
    const query = `
      SELECT id, email, password_hash, first_name, last_name, professional_headline,
             blockchain_address, mfa_enabled, mfa_secret, created_at, updated_at, last_login
      FROM users
      WHERE email = $1
    `;

    const result = await this.pool.query(query, [email.toLowerCase()]);
    return result.rows[0] || null;
  }

  /**
   * Find user by ID
   */
  async findUserById(userId: string): Promise<Omit<User, 'password_hash'> | null> {
    const query = `
      SELECT id, email, first_name, last_name, professional_headline,
             blockchain_address, mfa_enabled, mfa_secret, created_at, updated_at, last_login
      FROM users
      WHERE id = $1
    `;

    const result = await this.pool.query(query, [userId]);
    return result.rows[0] || null;
  }

  /**
   * Update last login timestamp
   */
  private async updateLastLogin(userId: string): Promise<void> {
    const query = `
      UPDATE users
      SET last_login = CURRENT_TIMESTAMP
      WHERE id = $1
    `;

    await this.pool.query(query, [userId]);
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
    const user = await this.findUserByEmail(email);
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
    const resetData = await this.verifyPasswordResetToken(token);
    if (!resetData) {
      throw new Error('Invalid or expired reset token');
    }

    // Hash new password
    const passwordHash = await hashPassword(newPassword);

    // Update password
    const query = `
      UPDATE users
      SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `;

    await this.pool.query(query, [passwordHash, resetData.userId]);

    // Delete reset token
    await RedisCacheService.del(RedisKeys.passwordReset(token));

    // Invalidate all user sessions
    await SessionManager.deleteAllUserSessions(resetData.userId);
  }

  /**
   * Change password (for authenticated users)
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    // Get user with password hash
    const query = `
      SELECT password_hash
      FROM users
      WHERE id = $1
    `;

    const result = await this.pool.query(query, [userId]);
    const user = result.rows[0];

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
    const updateQuery = `
      UPDATE users
      SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `;

    await this.pool.query(updateQuery, [passwordHash, userId]);

    // Invalidate all user sessions except current one
    await SessionManager.deleteAllUserSessions(userId);
  }
}
