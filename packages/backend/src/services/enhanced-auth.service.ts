import { injectable, inject } from 'inversify';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import crypto from 'crypto';
import { Pool } from 'pg';
import { Redis } from 'ioredis';
import { Logger } from 'winston';

import { TYPES } from '../types/container.types';
import { IUserRepository } from '../repositories/user.repository';
import {
  User,
  AuthToken,
  RefreshTokenData,
  MFASetupResponse,
  OAuthProfile,
  UserRole,
  Permission,
  SessionData,
} from '../types/auth.types';

/**
 * Enhanced Authentication Service with JWT refresh token rotation,
 * MFA support, RBAC, and OAuth2/OpenID Connect integration
 */
@injectable()
export class EnhancedAuthService {
  private readonly JWT_SECRET: string;
  private readonly JWT_REFRESH_SECRET: string;
  private readonly ACCESS_TOKEN_EXPIRY = '15m';
  private readonly REFRESH_TOKEN_EXPIRY = '7d';
  private readonly MFA_WINDOW = 2;
  private readonly APP_NAME = 'GiveMeJobs';

  constructor(
    @inject(TYPES.UserRepository) private userRepository: IUserRepository,
    @inject(TYPES.Database) private pool: Pool,
    @inject(TYPES.Redis) private redis: Redis,
    @inject(TYPES.Logger) private logger: Logger
  ) {
    this.JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';
    this.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret';
  }

  /**
   * Generate JWT tokens with refresh token rotation
   */
  async generateTokens(userId: string, email: string, sessionId?: string): Promise<AuthToken> {
    const payload = {
      userId,
      email,
      sessionId: sessionId || uuidv4(),
      type: 'access',
    };

    const refreshPayload = {
      userId,
      email,
      sessionId: payload.sessionId,
      type: 'refresh',
      tokenId: uuidv4(),
    };

    const accessToken = jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.ACCESS_TOKEN_EXPIRY,
      issuer: 'givemejobs-api',
      audience: 'givemejobs-client',
    });

    const refreshToken = jwt.sign(refreshPayload, this.JWT_REFRESH_SECRET, {
      expiresIn: this.REFRESH_TOKEN_EXPIRY,
      issuer: 'givemejobs-api',
      audience: 'givemejobs-client',
    });

    // Store refresh token in Redis
    const refreshTokenData: RefreshTokenData = {
      userId,
      email,
      sessionId: payload.sessionId,
      tokenId: refreshPayload.tokenId,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    };

    await this.redis.setex(
      `refresh_token:${refreshPayload.tokenId}`,
      7 * 24 * 60 * 60, // 7 days in seconds
      JSON.stringify(refreshTokenData)
    );

    // Add to user's active refresh tokens
    await this.redis.sadd(`user_refresh_tokens:${userId}`, refreshPayload.tokenId);

    this.logger.info('JWT tokens generated', { userId, sessionId: payload.sessionId });

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: 15 * 60, // 15 minutes in seconds
    };
  }

  /**
   * Refresh access token using refresh token rotation
   */
  async refreshToken(refreshToken: string): Promise<AuthToken> {
    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, this.JWT_REFRESH_SECRET) as any;
      
      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      // Check if refresh token exists in Redis
      const tokenData = await this.redis.get(`refresh_token:${decoded.tokenId}`);
      if (!tokenData) {
        throw new Error('Refresh token not found or expired');
      }

      const refreshTokenData: RefreshTokenData = JSON.parse(tokenData);

      // Verify token belongs to the same user
      if (refreshTokenData.userId !== decoded.userId) {
        throw new Error('Token user mismatch');
      }

      // Invalidate old refresh token
      await this.invalidateRefreshToken(decoded.tokenId);

      // Generate new tokens
      const newTokens = await this.generateTokens(
        decoded.userId,
        decoded.email,
        decoded.sessionId
      );

      this.logger.info('Tokens refreshed successfully', { 
        userId: decoded.userId,
        oldTokenId: decoded.tokenId 
      });

      return newTokens;
    } catch (error) {
      this.logger.error('Token refresh failed', { error: error.message });
      throw new Error('Invalid or expired refresh token');
    }
  }

  /**
   * Invalidate refresh token
   */
  async invalidateRefreshToken(tokenId: string): Promise<void> {
    const tokenData = await this.redis.get(`refresh_token:${tokenId}`);
    if (tokenData) {
      const refreshTokenData: RefreshTokenData = JSON.parse(tokenData);
      
      // Remove from Redis
      await this.redis.del(`refresh_token:${tokenId}`);
      
      // Remove from user's active tokens
      await this.redis.srem(`user_refresh_tokens:${refreshTokenData.userId}`, tokenId);
    }
  }

  /**
   * Invalidate all refresh tokens for a user
   */
  async invalidateAllUserRefreshTokens(userId: string): Promise<void> {
    const tokenIds = await this.redis.smembers(`user_refresh_tokens:${userId}`);
    
    if (tokenIds.length > 0) {
      // Delete all refresh tokens
      const tokenKeys = tokenIds.map(id => `refresh_token:${id}`);
      await this.redis.del(...tokenKeys);
      
      // Clear user's token set
      await this.redis.del(`user_refresh_tokens:${userId}`);
    }

    this.logger.info('All refresh tokens invalidated', { userId });
  }

  /**
   * Setup Multi-Factor Authentication
   */
  async setupMFA(userId: string, email: string): Promise<MFASetupResponse> {
    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `${this.APP_NAME} (${email})`,
      issuer: this.APP_NAME,
      length: 32,
    });

    if (!secret.base32) {
      throw new Error('Failed to generate MFA secret');
    }

    // Generate QR code
    const qrCode = await QRCode.toDataURL(secret.otpauth_url || '');

    // Generate backup codes
    const backupCodes = this.generateBackupCodes(10);

    // Store temporary secret in Redis (10 minutes)
    await this.redis.setex(
      `mfa_setup:${userId}`,
      600,
      JSON.stringify({
        secret: secret.base32,
        backupCodes,
      })
    );

    this.logger.info('MFA setup initiated', { userId });

    return {
      secret: secret.base32,
      qrCode,
      backupCodes,
    };
  }

  /**
   * Verify and enable MFA
   */
  async verifyAndEnableMFA(userId: string, token: string): Promise<boolean> {
    const setupData = await this.redis.get(`mfa_setup:${userId}`);
    if (!setupData) {
      throw new Error('MFA setup not found or expired');
    }

    const { secret, backupCodes } = JSON.parse(setupData);

    // Verify TOTP token
    const isValid = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: this.MFA_WINDOW,
    });

    if (!isValid) {
      throw new Error('Invalid MFA token');
    }

    // Enable MFA in database
    await this.userRepository.update(userId, {
      mfa_enabled: true,
      mfa_secret: secret,
    });

    // Store backup codes
    await this.redis.setex(
      `mfa_backup_codes:${userId}`,
      365 * 24 * 60 * 60, // 1 year
      JSON.stringify(backupCodes)
    );

    // Remove setup data
    await this.redis.del(`mfa_setup:${userId}`);

    this.logger.info('MFA enabled successfully', { userId });
    return true;
  }

  /**
   * Verify MFA token during login
   */
  async verifyMFAToken(userId: string, token: string): Promise<boolean> {
    const user = await this.userRepository.findById(userId);
    if (!user || !user.mfa_enabled || !user.mfa_secret) {
      return false;
    }

    // Try TOTP first
    const isValidTOTP = speakeasy.totp.verify({
      secret: user.mfa_secret,
      encoding: 'base32',
      token,
      window: this.MFA_WINDOW,
    });

    if (isValidTOTP) {
      return true;
    }

    // Try backup codes
    const backupCodesData = await this.redis.get(`mfa_backup_codes:${userId}`);
    if (backupCodesData) {
      const backupCodes: string[] = JSON.parse(backupCodesData);
      const tokenIndex = backupCodes.indexOf(token.toUpperCase());
      
      if (tokenIndex !== -1) {
        // Remove used backup code
        backupCodes.splice(tokenIndex, 1);
        await this.redis.setex(
          `mfa_backup_codes:${userId}`,
          365 * 24 * 60 * 60,
          JSON.stringify(backupCodes)
        );
        
        this.logger.info('Backup code used for MFA', { userId });
        return true;
      }
    }

    return false;
  }

  /**
   * Disable MFA
   */
  async disableMFA(userId: string, password: string, mfaToken: string): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      throw new Error('Invalid password');
    }

    // Verify MFA token
    const isMFAValid = await this.verifyMFAToken(userId, mfaToken);
    if (!isMFAValid) {
      throw new Error('Invalid MFA token');
    }

    // Disable MFA
    await this.userRepository.update(userId, {
      mfa_enabled: false,
      mfa_secret: null,
    });

    // Remove backup codes
    await this.redis.del(`mfa_backup_codes:${userId}`);

    // Invalidate all sessions for security
    await this.invalidateAllUserSessions(userId);

    this.logger.info('MFA disabled', { userId });
  }

  /**
   * Create user session
   */
  async createSession(userId: string, sessionData: Partial<SessionData>): Promise<string> {
    const sessionId = uuidv4();
    
    const session: SessionData = {
      sessionId,
      userId,
      ipAddress: sessionData.ipAddress || 'unknown',
      userAgent: sessionData.userAgent || 'unknown',
      createdAt: new Date(),
      lastActivity: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      isActive: true,
      ...sessionData,
    };

    // Store session
    await this.redis.setex(
      `session:${sessionId}`,
      7 * 24 * 60 * 60, // 7 days
      JSON.stringify(session)
    );

    // Add to user's active sessions
    await this.redis.sadd(`user_sessions:${userId}`, sessionId);

    return sessionId;
  }

  /**
   * Update session activity
   */
  async updateSessionActivity(sessionId: string): Promise<void> {
    const sessionData = await this.redis.get(`session:${sessionId}`);
    if (sessionData) {
      const session: SessionData = JSON.parse(sessionData);
      session.lastActivity = new Date();
      
      await this.redis.setex(
        `session:${sessionId}`,
        7 * 24 * 60 * 60,
        JSON.stringify(session)
      );
    }
  }

  /**
   * Invalidate session
   */
  async invalidateSession(sessionId: string): Promise<void> {
    const sessionData = await this.redis.get(`session:${sessionId}`);
    if (sessionData) {
      const session: SessionData = JSON.parse(sessionData);
      
      // Remove session
      await this.redis.del(`session:${sessionId}`);
      
      // Remove from user's active sessions
      await this.redis.srem(`user_sessions:${session.userId}`, sessionId);
    }
  }

  /**
   * Invalidate all user sessions
   */
  async invalidateAllUserSessions(userId: string): Promise<void> {
    const sessionIds = await this.redis.smembers(`user_sessions:${userId}`);
    
    if (sessionIds.length > 0) {
      // Delete all sessions
      const sessionKeys = sessionIds.map(id => `session:${id}`);
      await this.redis.del(...sessionKeys);
      
      // Clear user sessions set
      await this.redis.del(`user_sessions:${userId}`);
    }

    this.logger.info('All sessions invalidated', { userId });
  }

  /**
   * Get user sessions
   */
  async getUserSessions(userId: string): Promise<SessionData[]> {
    const sessionIds = await this.redis.smembers(`user_sessions:${userId}`);
    const sessions: SessionData[] = [];

    for (const sessionId of sessionIds) {
      const sessionData = await this.redis.get(`session:${sessionId}`);
      if (sessionData) {
        sessions.push(JSON.parse(sessionData));
      }
    }

    return sessions.sort((a, b) => 
      new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
    );
  }

  /**
   * OAuth2/OpenID Connect authentication
   */
  async authenticateWithOAuth(profile: OAuthProfile): Promise<{
    user: Omit<User, 'password_hash'>;
    tokens: AuthToken;
    isNewUser: boolean;
  }> {
    // Check if OAuth account exists
    const existingOAuth = await this.findOAuthAccount(profile.provider, profile.providerId);
    
    if (existingOAuth) {
      // Update OAuth tokens
      await this.updateOAuthTokens(existingOAuth.id, profile.accessToken, profile.refreshToken);
      
      // Get user
      const user = await this.userRepository.findById(existingOAuth.user_id);
      if (!user) {
        throw new Error('User not found');
      }

      // Update last login
      await this.userRepository.updateLastLogin(user.id);

      // Generate tokens
      const tokens = await this.generateTokens(user.id, user.email);

      // Create session
      await this.createSession(user.id, {
        oauthProvider: profile.provider,
      });

      const { password_hash, ...userWithoutPassword } = user;
      return { user: userWithoutPassword, tokens, isNewUser: false };
    }

    // Check if user exists with email
    const existingUser = await this.userRepository.findByEmail(profile.email);
    
    if (existingUser) {
      // Link OAuth to existing user
      await this.createOAuthAccount({
        userId: existingUser.id,
        provider: profile.provider,
        providerId: profile.providerId,
        accessToken: profile.accessToken,
        refreshToken: profile.refreshToken,
      });

      // Update last login
      await this.userRepository.updateLastLogin(existingUser.id);

      // Generate tokens
      const tokens = await this.generateTokens(existingUser.id, existingUser.email);

      // Create session
      await this.createSession(existingUser.id, {
        oauthProvider: profile.provider,
      });

      const { password_hash, ...userWithoutPassword } = existingUser;
      return { user: userWithoutPassword, tokens, isNewUser: false };
    }

    // Create new user
    const newUser = await this.createUserFromOAuth(profile);

    // Create OAuth account
    await this.createOAuthAccount({
      userId: newUser.id,
      provider: profile.provider,
      providerId: profile.providerId,
      accessToken: profile.accessToken,
      refreshToken: profile.refreshToken,
    });

    // Assign default role
    await this.assignDefaultRole(newUser.id);

    // Generate tokens
    const tokens = await this.generateTokens(newUser.id, newUser.email);

    // Create session
    await this.createSession(newUser.id, {
      oauthProvider: profile.provider,
    });

    return { user: newUser, tokens, isNewUser: true };
  }

  /**
   * Generate backup codes
   */
  private generateBackupCodes(count: number): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }
    return codes;
  }

  /**
   * Find OAuth account
   */
  private async findOAuthAccount(provider: string, providerId: string): Promise<any> {
    const query = `
      SELECT id, user_id, provider, provider_account_id, access_token, refresh_token
      FROM oauth_accounts
      WHERE provider = $1 AND provider_account_id = $2
    `;
    
    const result = await this.pool.query(query, [provider, providerId]);
    return result.rows[0] || null;
  }

  /**
   * Create OAuth account
   */
  private async createOAuthAccount(data: {
    userId: string;
    provider: string;
    providerId: string;
    accessToken: string;
    refreshToken?: string;
  }): Promise<void> {
    const query = `
      INSERT INTO oauth_accounts (user_id, provider, provider_account_id, access_token, refresh_token)
      VALUES ($1, $2, $3, $4, $5)
    `;
    
    await this.pool.query(query, [
      data.userId,
      data.provider,
      data.providerId,
      data.accessToken,
      data.refreshToken || null,
    ]);
  }

  /**
   * Update OAuth tokens
   */
  private async updateOAuthTokens(
    oauthId: string,
    accessToken: string,
    refreshToken?: string
  ): Promise<void> {
    const query = `
      UPDATE oauth_accounts
      SET access_token = $1, refresh_token = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
    `;
    
    await this.pool.query(query, [accessToken, refreshToken || null, oauthId]);
  }

  /**
   * Create user from OAuth profile
   */
  private async createUserFromOAuth(profile: OAuthProfile): Promise<Omit<User, 'password_hash'>> {
    const userData = {
      email: profile.email.toLowerCase(),
      password_hash: await bcrypt.hash(crypto.randomUUID(), 10), // Random password for OAuth users
      first_name: profile.firstName,
      last_name: profile.lastName,
      professional_headline: profile.professionalHeadline || null,
      blockchain_address: null,
      mfa_enabled: false,
      mfa_secret: null,
      last_login: null,
    };

    const user = await this.userRepository.create(userData);
    const { password_hash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Assign default role to user
   */
  private async assignDefaultRole(userId: string): Promise<void> {
    const query = `
      UPDATE users SET role = $1 WHERE id = $2
    `;
    
    await this.pool.query(query, [UserRole.USER, userId]);
  }
}