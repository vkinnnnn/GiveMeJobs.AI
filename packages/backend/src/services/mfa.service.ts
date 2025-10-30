import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { Pool } from 'pg';
import { pgPool } from '../config/database';
import { MFAEnrollmentResponse } from '../types/auth.types';
import crypto from 'crypto';

/**
 * Multi-Factor Authentication Service
 * Handles TOTP-based MFA enrollment and verification
 */
export class MFAService {
  private pool: Pool;
  private appName: string;

  constructor() {
    this.pool = pgPool;
    this.appName = process.env.APP_NAME || 'GiveMeJobs';
  }

  /**
   * Generate MFA secret and QR code for enrollment
   */
  async generateMFASecret(userId: string, email: string): Promise<MFAEnrollmentResponse> {
    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `${this.appName} (${email})`,
      issuer: this.appName,
      length: 32,
    });

    if (!secret.base32) {
      throw new Error('Failed to generate MFA secret');
    }

    // Generate QR code
    const qrCode = await QRCode.toDataURL(secret.otpauth_url || '');

    // Generate backup codes
    const backupCodes = this.generateBackupCodes(8);

    return {
      secret: secret.base32,
      qrCode,
      backupCodes,
    };
  }

  /**
   * Verify TOTP token
   */
  verifyToken(secret: string, token: string): boolean {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 2, // Allow 2 time steps before and after
    });
  }

  /**
   * Enable MFA for user
   */
  async enableMFA(userId: string, secret: string): Promise<void> {
    const query = `
      UPDATE users
      SET mfa_enabled = true, mfa_secret = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `;

    await this.pool.query(query, [secret, userId]);
  }

  /**
   * Disable MFA for user
   */
  async disableMFA(userId: string): Promise<void> {
    const query = `
      UPDATE users
      SET mfa_enabled = false, mfa_secret = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;

    await this.pool.query(query, [userId]);
  }

  /**
   * Get user MFA status
   */
  async getMFAStatus(userId: string): Promise<{ enabled: boolean; secret: string | null }> {
    const query = `
      SELECT mfa_enabled, mfa_secret
      FROM users
      WHERE id = $1
    `;

    const result = await this.pool.query(query, [userId]);
    const user = result.rows[0];

    if (!user) {
      throw new Error('User not found');
    }

    return {
      enabled: user.mfa_enabled,
      secret: user.mfa_secret,
    };
  }

  /**
   * Generate backup codes
   */
  private generateBackupCodes(count: number): string[] {
    const codes: string[] = [];
    
    for (let i = 0; i < count; i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      codes.push(code);
    }

    return codes;
  }
}
