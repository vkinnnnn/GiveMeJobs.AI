import { Pool } from 'pg';
import { pgPool } from '../config/database';
import { User, OAuthProvider, AuthToken } from '../types/auth.types';
import { generateTokens } from '../utils/auth.utils';
import { SessionManager } from '../config/redis-config';
import { v4 as uuidv4 } from 'uuid';

/**
 * OAuth Profile from external providers
 */
export interface OAuthProfile {
  provider: 'linkedin' | 'google';
  providerId: string;
  email: string;
  firstName: string;
  lastName: string;
  professionalHeadline?: string;
  accessToken: string;
  refreshToken?: string;
}

/**
 * OAuth Service
 * Handles OAuth authentication and user linking
 */
export class OAuthService {
  private pool: Pool;

  constructor() {
    this.pool = pgPool;
  }

  /**
   * Authenticate user with OAuth
   * Creates new user if doesn't exist, or links to existing user
   */
  async authenticateWithOAuth(
    profile: OAuthProfile
  ): Promise<{ user: Omit<User, 'password_hash'>; tokens: AuthToken; isNewUser: boolean }> {
    // Check if OAuth provider is already linked
    const existingOAuth = await this.findOAuthProvider(profile.provider, profile.providerId);

    if (existingOAuth) {
      // User exists, update OAuth tokens
      await this.updateOAuthTokens(existingOAuth.id, profile.accessToken, profile.refreshToken);

      // Get user
      const user = await this.findUserById(existingOAuth.user_id);
      if (!user) {
        throw new Error('User not found');
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
        oauthProvider: profile.provider,
      });

      return {
        user,
        tokens,
        isNewUser: false,
      };
    }

    // Check if user exists with this email
    const existingUser = await this.findUserByEmail(profile.email);

    if (existingUser) {
      // Link OAuth to existing user
      await this.createOAuthProvider({
        userId: existingUser.id,
        provider: profile.provider,
        providerId: profile.providerId,
        accessToken: profile.accessToken,
        refreshToken: profile.refreshToken,
      });

      // Update last login
      await this.updateLastLogin(existingUser.id);

      // Generate tokens
      const tokens = generateTokens(existingUser.id, existingUser.email);

      // Create session
      const sessionId = uuidv4();
      await SessionManager.createSession(sessionId, existingUser.id, {
        email: existingUser.email,
        sessionId,
        oauthProvider: profile.provider,
      });

      return {
        user: existingUser,
        tokens,
        isNewUser: false,
      };
    }

    // Create new user
    const newUser = await this.createUserFromOAuth(profile);

    // Create OAuth provider link
    await this.createOAuthProvider({
      userId: newUser.id,
      provider: profile.provider,
      providerId: profile.providerId,
      accessToken: profile.accessToken,
      refreshToken: profile.refreshToken,
    });

    // Create user profile
    await this.createUserProfile(newUser.id);

    // Generate tokens
    const tokens = generateTokens(newUser.id, newUser.email);

    // Create session
    const sessionId = uuidv4();
    await SessionManager.createSession(sessionId, newUser.id, {
      email: newUser.email,
      sessionId,
      oauthProvider: profile.provider,
    });

    return {
      user: newUser,
      tokens,
      isNewUser: true,
    };
  }

  /**
   * Find OAuth provider
   */
  private async findOAuthProvider(
    provider: string,
    providerId: string
  ): Promise<OAuthProvider | null> {
    const query = `
      SELECT id, user_id, provider, provider_account_id as provider_id, access_token, refresh_token, created_at, updated_at
      FROM oauth_accounts
      WHERE provider = $1 AND provider_account_id = $2
    `;

    const result = await this.pool.query(query, [provider, providerId]);
    return result.rows[0] || null;
  }

  /**
   * Create OAuth provider
   */
  private async createOAuthProvider(data: {
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
  private async createUserFromOAuth(
    profile: OAuthProfile
  ): Promise<Omit<User, 'password_hash'>> {
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
                blockchain_address, mfa_enabled, created_at, updated_at, last_login
    `;

    // OAuth users don't have a password, use a random hash
    const randomHash = uuidv4();

    const values = [
      profile.email.toLowerCase(),
      randomHash,
      profile.firstName,
      profile.lastName,
      profile.professionalHeadline || null,
    ];

    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Find user by email
   */
  private async findUserByEmail(email: string): Promise<Omit<User, 'password_hash'> | null> {
    const query = `
      SELECT id, email, first_name, last_name, professional_headline,
             blockchain_address, mfa_enabled, created_at, updated_at, last_login
      FROM users
      WHERE email = $1
    `;

    const result = await this.pool.query(query, [email.toLowerCase()]);
    return result.rows[0] || null;
  }

  /**
   * Find user by ID
   */
  private async findUserById(userId: string): Promise<Omit<User, 'password_hash'> | null> {
    const query = `
      SELECT id, email, first_name, last_name, professional_headline,
             blockchain_address, mfa_enabled, created_at, updated_at, last_login
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
   * Get user's OAuth providers
   */
  async getUserOAuthProviders(userId: string): Promise<OAuthProvider[]> {
    const query = `
      SELECT id, user_id, provider, provider_account_id as provider_id, access_token, refresh_token, created_at, updated_at
      FROM oauth_accounts
      WHERE user_id = $1
    `;

    const result = await this.pool.query(query, [userId]);
    return result.rows;
  }

  /**
   * Unlink OAuth provider
   */
  async unlinkOAuthProvider(userId: string, provider: string): Promise<void> {
    const query = `
      DELETE FROM oauth_accounts
      WHERE user_id = $1 AND provider = $2
    `;

    await this.pool.query(query, [userId, provider]);
  }
}
