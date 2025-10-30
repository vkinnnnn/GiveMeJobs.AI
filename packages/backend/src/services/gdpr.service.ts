import { Pool } from 'pg';
import { MongoClient } from 'mongodb';
import pool from '../config/database';
import { getMongoClient } from '../config/mongodb-schemas';
import logger from './logger.service';
import { cacheService } from './cache.service';

export interface DataExportRequest {
  id: string;
  userId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  exportFormat: 'json' | 'csv';
  fileUrl?: string;
  requestedAt: Date;
  completedAt?: Date;
  expiresAt?: Date;
}

export interface AccountDeletionRequest {
  id: string;
  userId: string;
  status: 'pending' | 'scheduled' | 'completed' | 'cancelled';
  reason?: string;
  requestedAt: Date;
  scheduledDeletionAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
}

export interface UserDataExport {
  user: any;
  profile: any;
  skills: any[];
  experience: any[];
  education: any[];
  applications: any[];
  documents: any[];
  jobAlerts: any[];
  analytics: any;
  consents: any[];
}

class GDPRService {
  /**
   * Request data export for a user
   */
  async requestDataExport(
    userId: string,
    format: 'json' | 'csv' = 'json'
  ): Promise<DataExportRequest> {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `INSERT INTO data_export_requests (user_id, export_format, status)
         VALUES ($1, $2, 'pending')
         RETURNING *`,
        [userId, format]
      );

      const request = this.mapDataExportRequest(result.rows[0]);

      // Process export asynchronously
      this.processDataExport(request.id, userId, format).catch((error) => {
        logger.error('Error processing data export:', error);
      });

      return request;
    } finally {
      client.release();
    }
  }

  /**
   * Process data export request
   */
  private async processDataExport(
    requestId: string,
    userId: string,
    format: 'json' | 'csv'
  ): Promise<void> {
    const client = await pool.connect();
    try {
      // Update status to processing
      await client.query(
        `UPDATE data_export_requests SET status = 'processing' WHERE id = $1`,
        [requestId]
      );

      // Collect all user data
      const userData = await this.collectUserData(userId);

      // Generate export file
      const fileContent =
        format === 'json'
          ? JSON.stringify(userData, null, 2)
          : this.convertToCSV(userData);

      // In production, upload to S3 or similar storage
      // For now, we'll store a data URL
      const fileUrl = `data:application/${format};base64,${Buffer.from(fileContent).toString('base64')}`;

      // Set expiration to 7 days from now
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      // Update request with file URL
      await client.query(
        `UPDATE data_export_requests 
         SET status = 'completed', file_url = $1, completed_at = NOW(), expires_at = $2
         WHERE id = $3`,
        [fileUrl, expiresAt, requestId]
      );

      logger.info(`Data export completed for user ${userId}`);
    } catch (error) {
      await client.query(
        `UPDATE data_export_requests SET status = 'failed' WHERE id = $1`,
        [requestId]
      );
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Collect all user data from all sources
   */
  private async collectUserData(userId: string): Promise<UserDataExport> {
    const client = await pool.connect();
    const mongoClient = await getMongoClient();

    try {
      // Collect PostgreSQL data
      const [
        user,
        profile,
        skills,
        experience,
        education,
        applications,
        jobAlerts,
        consents,
      ] = await Promise.all([
        client.query('SELECT * FROM users WHERE id = $1', [userId]),
        client.query('SELECT * FROM user_profiles WHERE user_id = $1', [userId]),
        client.query('SELECT * FROM skills WHERE user_id = $1', [userId]),
        client.query('SELECT * FROM experience WHERE user_id = $1', [userId]),
        client.query('SELECT * FROM education WHERE user_id = $1', [userId]),
        client.query('SELECT * FROM applications WHERE user_id = $1', [userId]),
        client.query('SELECT * FROM job_alerts WHERE user_id = $1', [userId]),
        client.query('SELECT * FROM consent_tracking WHERE user_id = $1', [userId]),
      ]);

      // Collect MongoDB data
      const db = mongoClient.db();
      const documents = await db
        .collection('generated_documents')
        .find({ userId })
        .toArray();

      // Collect analytics data
      const analytics = await this.collectAnalyticsData(userId, client);

      // Remove sensitive fields
      const sanitizedUser = { ...user.rows[0] };
      delete sanitizedUser.password_hash;

      return {
        user: sanitizedUser,
        profile: profile.rows[0] || null,
        skills: skills.rows,
        experience: experience.rows,
        education: education.rows,
        applications: applications.rows,
        documents: documents.map((doc) => ({
          ...doc,
          _id: doc._id.toString(),
        })),
        jobAlerts: jobAlerts.rows,
        analytics,
        consents: consents.rows,
      };
    } finally {
      client.release();
    }
  }

  /**
   * Collect analytics data for user
   */
  private async collectAnalyticsData(userId: string, client: any): Promise<any> {
    const stats = await client.query(
      `SELECT 
        COUNT(*) as total_applications,
        COUNT(CASE WHEN status IN ('interview_scheduled', 'interview_completed', 'offer_received', 'accepted') THEN 1 END) as responses,
        COUNT(CASE WHEN status IN ('interview_scheduled', 'interview_completed') THEN 1 END) as interviews,
        COUNT(CASE WHEN status = 'offer_received' OR status = 'accepted' THEN 1 END) as offers
       FROM applications
       WHERE user_id = $1`,
      [userId]
    );

    return stats.rows[0];
  }

  /**
   * Convert user data to CSV format
   */
  private convertToCSV(data: UserDataExport): string {
    const sections: string[] = [];

    // User section
    sections.push('USER INFORMATION');
    sections.push(this.objectToCSV([data.user]));
    sections.push('');

    // Skills section
    sections.push('SKILLS');
    sections.push(this.objectToCSV(data.skills));
    sections.push('');

    // Experience section
    sections.push('EXPERIENCE');
    sections.push(this.objectToCSV(data.experience));
    sections.push('');

    // Education section
    sections.push('EDUCATION');
    sections.push(this.objectToCSV(data.education));
    sections.push('');

    // Applications section
    sections.push('APPLICATIONS');
    sections.push(this.objectToCSV(data.applications));
    sections.push('');

    return sections.join('\n');
  }

  /**
   * Convert array of objects to CSV
   */
  private objectToCSV(data: any[]): string {
    if (!data || data.length === 0) return 'No data';

    const headers = Object.keys(data[0]);
    const rows = data.map((obj) =>
      headers.map((header) => JSON.stringify(obj[header] || '')).join(',')
    );

    return [headers.join(','), ...rows].join('\n');
  }

  /**
   * Get data export request status
   */
  async getDataExportRequest(requestId: string): Promise<DataExportRequest | null> {
    const result = await pool.query(
      'SELECT * FROM data_export_requests WHERE id = $1',
      [requestId]
    );

    return result.rows[0] ? this.mapDataExportRequest(result.rows[0]) : null;
  }

  /**
   * Get all data export requests for a user
   */
  async getUserDataExportRequests(userId: string): Promise<DataExportRequest[]> {
    const result = await pool.query(
      'SELECT * FROM data_export_requests WHERE user_id = $1 ORDER BY requested_at DESC',
      [userId]
    );

    return result.rows.map(this.mapDataExportRequest);
  }

  /**
   * Request account deletion
   */
  async requestAccountDeletion(
    userId: string,
    reason?: string
  ): Promise<AccountDeletionRequest> {
    const client = await pool.connect();
    try {
      // Schedule deletion for 30 days from now (grace period)
      const scheduledDeletionAt = new Date();
      scheduledDeletionAt.setDate(scheduledDeletionAt.getDate() + 30);

      const result = await client.query(
        `INSERT INTO account_deletion_requests 
         (user_id, status, reason, scheduled_deletion_at)
         VALUES ($1, 'scheduled', $2, $3)
         RETURNING *`,
        [userId, reason, scheduledDeletionAt]
      );

      logger.info(`Account deletion scheduled for user ${userId}`);

      return this.mapAccountDeletionRequest(result.rows[0]);
    } finally {
      client.release();
    }
  }

  /**
   * Cancel account deletion request
   */
  async cancelAccountDeletion(requestId: string): Promise<AccountDeletionRequest> {
    const result = await pool.query(
      `UPDATE account_deletion_requests 
       SET status = 'cancelled', cancelled_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [requestId]
    );

    if (result.rows.length === 0) {
      throw new Error('Deletion request not found');
    }

    logger.info(`Account deletion cancelled for request ${requestId}`);

    return this.mapAccountDeletionRequest(result.rows[0]);
  }

  /**
   * Execute account deletion
   */
  async executeAccountDeletion(userId: string): Promise<void> {
    const client = await pool.connect();
    const mongoClient = await getMongoClient();

    try {
      await client.query('BEGIN');

      // Delete from MongoDB
      const db = mongoClient.db();
      await db.collection('generated_documents').deleteMany({ userId });
      await db.collection('resume_templates').deleteMany({ userId });
      await db.collection('cover_letter_templates').deleteMany({ userId });

      // Clear Redis cache
      await cacheService.clearUserCache(userId);

      // Delete from PostgreSQL (cascading deletes will handle related records)
      await client.query('DELETE FROM users WHERE id = $1', [userId]);

      // Mark deletion request as completed
      await client.query(
        `UPDATE account_deletion_requests 
         SET status = 'completed', completed_at = NOW()
         WHERE user_id = $1 AND status = 'scheduled'`,
        [userId]
      );

      await client.query('COMMIT');

      logger.info(`Account deletion completed for user ${userId}`);
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error(`Error deleting account for user ${userId}:`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get account deletion request
   */
  async getAccountDeletionRequest(
    userId: string
  ): Promise<AccountDeletionRequest | null> {
    const result = await pool.query(
      `SELECT * FROM account_deletion_requests 
       WHERE user_id = $1 AND status IN ('pending', 'scheduled')
       ORDER BY requested_at DESC
       LIMIT 1`,
      [userId]
    );

    return result.rows[0] ? this.mapAccountDeletionRequest(result.rows[0]) : null;
  }

  /**
   * Process scheduled deletions
   */
  async processScheduledDeletions(): Promise<void> {
    const result = await pool.query(
      `SELECT * FROM account_deletion_requests 
       WHERE status = 'scheduled' 
       AND scheduled_deletion_at <= NOW()`
    );

    for (const row of result.rows) {
      try {
        await this.executeAccountDeletion(row.user_id);
      } catch (error) {
        logger.error(`Error processing scheduled deletion for user ${row.user_id}:`, error);
      }
    }
  }

  /**
   * Map database row to DataExportRequest
   */
  private mapDataExportRequest(row: any): DataExportRequest {
    return {
      id: row.id,
      userId: row.user_id,
      status: row.status,
      exportFormat: row.export_format,
      fileUrl: row.file_url,
      requestedAt: row.requested_at,
      completedAt: row.completed_at,
      expiresAt: row.expires_at,
    };
  }

  /**
   * Map database row to AccountDeletionRequest
   */
  private mapAccountDeletionRequest(row: any): AccountDeletionRequest {
    return {
      id: row.id,
      userId: row.user_id,
      status: row.status,
      reason: row.reason,
      requestedAt: row.requested_at,
      scheduledDeletionAt: row.scheduled_deletion_at,
      completedAt: row.completed_at,
      cancelledAt: row.cancelled_at,
    };
  }
}

export const gdprService = new GDPRService();
