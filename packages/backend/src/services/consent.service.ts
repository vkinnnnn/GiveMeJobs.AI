import pool from '../config/database';
import logger from './logger.service';

export interface ConsentRecord {
  id: string;
  userId: string;
  consentType: string;
  consentVersion: string;
  granted: boolean;
  grantedAt: Date;
  revokedAt?: Date;
  ipAddress?: string;
  userAgent?: string;
}

export interface ConsentRequest {
  userId: string;
  consentType: 'terms_of_service' | 'privacy_policy' | 'marketing' | 'data_processing';
  consentVersion: string;
  granted: boolean;
  ipAddress?: string;
  userAgent?: string;
}

class ConsentService {
  /**
   * Record user consent
   */
  async recordConsent(request: ConsentRequest): Promise<ConsentRecord> {
    const client = await pool.connect();
    try {
      // Check if there's an existing consent for this type
      const existing = await client.query(
        `SELECT * FROM consent_tracking 
         WHERE user_id = $1 AND consent_type = $2 AND revoked_at IS NULL
         ORDER BY granted_at DESC LIMIT 1`,
        [request.userId, request.consentType]
      );

      // If revoking consent, update existing record
      if (!request.granted && existing.rows.length > 0) {
        const result = await client.query(
          `UPDATE consent_tracking 
           SET revoked_at = NOW()
           WHERE id = $1
           RETURNING *`,
          [existing.rows[0].id]
        );
        return this.mapConsentRecord(result.rows[0]);
      }

      // Insert new consent record
      const result = await client.query(
        `INSERT INTO consent_tracking 
         (user_id, consent_type, consent_version, granted, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          request.userId,
          request.consentType,
          request.consentVersion,
          request.granted,
          request.ipAddress,
          request.userAgent,
        ]
      );

      logger.info(`Consent recorded for user ${request.userId}: ${request.consentType}`);

      return this.mapConsentRecord(result.rows[0]);
    } finally {
      client.release();
    }
  }

  /**
   * Get user consents
   */
  async getUserConsents(userId: string): Promise<ConsentRecord[]> {
    const result = await pool.query(
      `SELECT * FROM consent_tracking 
       WHERE user_id = $1
       ORDER BY granted_at DESC`,
      [userId]
    );

    return result.rows.map(this.mapConsentRecord);
  }

  /**
   * Get active consent for a specific type
   */
  async getActiveConsent(
    userId: string,
    consentType: string
  ): Promise<ConsentRecord | null> {
    const result = await pool.query(
      `SELECT * FROM consent_tracking 
       WHERE user_id = $1 AND consent_type = $2 AND granted = true AND revoked_at IS NULL
       ORDER BY granted_at DESC LIMIT 1`,
      [userId, consentType]
    );

    return result.rows[0] ? this.mapConsentRecord(result.rows[0]) : null;
  }

  /**
   * Check if user has given consent for a specific type
   */
  async hasConsent(userId: string, consentType: string): Promise<boolean> {
    const consent = await this.getActiveConsent(userId, consentType);
    return consent !== null && consent.granted;
  }

  /**
   * Revoke consent
   */
  async revokeConsent(userId: string, consentType: string): Promise<void> {
    await pool.query(
      `UPDATE consent_tracking 
       SET revoked_at = NOW()
       WHERE user_id = $1 AND consent_type = $2 AND revoked_at IS NULL`,
      [userId, consentType]
    );

    logger.info(`Consent revoked for user ${userId}: ${consentType}`);
  }

  /**
   * Get consent statistics
   */
  async getConsentStatistics(): Promise<any> {
    const result = await pool.query(
      `SELECT 
        consent_type,
        COUNT(*) as total,
        COUNT(CASE WHEN granted = true AND revoked_at IS NULL THEN 1 END) as active,
        COUNT(CASE WHEN revoked_at IS NOT NULL THEN 1 END) as revoked
       FROM consent_tracking
       GROUP BY consent_type`
    );

    return result.rows;
  }

  /**
   * Map database row to ConsentRecord
   */
  private mapConsentRecord(row: any): ConsentRecord {
    return {
      id: row.id,
      userId: row.user_id,
      consentType: row.consent_type,
      consentVersion: row.consent_version,
      granted: row.granted,
      grantedAt: row.granted_at,
      revokedAt: row.revoked_at,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
    };
  }
}

export const consentService = new ConsentService();
