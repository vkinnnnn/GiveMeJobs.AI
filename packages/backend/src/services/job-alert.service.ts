import { pgPool } from '../config/database';
import {
  JobAlert,
  CreateJobAlertRequest,
  UpdateJobAlertRequest,
  Notification,
  CreateNotificationRequest,
} from '../types/job-alert.types';
import { webSocketService } from './websocket.service';

export class JobAlertService {
  /**
   * Create a new job alert
   */
  async createJobAlert(userId: string, data: CreateJobAlertRequest): Promise<JobAlert> {
    const query = `
      INSERT INTO job_alerts (user_id, name, criteria, frequency)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const result = await pgPool.query(query, [
      userId,
      data.name,
      JSON.stringify(data.criteria),
      data.frequency,
    ]);

    return this.mapRowToJobAlert(result.rows[0]);
  }

  /**
   * Get all job alerts for a user
   */
  async getUserJobAlerts(userId: string, activeOnly: boolean = false): Promise<JobAlert[]> {
    let query = `
      SELECT * FROM job_alerts
      WHERE user_id = $1
    `;

    const params: any[] = [userId];

    if (activeOnly) {
      query += ' AND active = true';
    }

    query += ' ORDER BY created_at DESC';

    const result = await pgPool.query(query, params);
    return result.rows.map(this.mapRowToJobAlert);
  }

  /**
   * Get a specific job alert by ID
   */
  async getJobAlertById(alertId: string, userId: string): Promise<JobAlert | null> {
    const query = `
      SELECT * FROM job_alerts
      WHERE id = $1 AND user_id = $2
    `;

    const result = await pgPool.query(query, [alertId, userId]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToJobAlert(result.rows[0]);
  }

  /**
   * Update a job alert
   */
  async updateJobAlert(
    alertId: string,
    userId: string,
    data: UpdateJobAlertRequest
  ): Promise<JobAlert | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(data.name);
    }

    if (data.criteria !== undefined) {
      updates.push(`criteria = $${paramCount++}`);
      values.push(JSON.stringify(data.criteria));
    }

    if (data.frequency !== undefined) {
      updates.push(`frequency = $${paramCount++}`);
      values.push(data.frequency);
    }

    if (data.active !== undefined) {
      updates.push(`active = $${paramCount++}`);
      values.push(data.active);
    }

    if (updates.length === 0) {
      return this.getJobAlertById(alertId, userId);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(alertId, userId);

    const query = `
      UPDATE job_alerts
      SET ${updates.join(', ')}
      WHERE id = $${paramCount++} AND user_id = $${paramCount++}
      RETURNING *
    `;

    const result = await pgPool.query(query, values);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToJobAlert(result.rows[0]);
  }

  /**
   * Delete a job alert
   */
  async deleteJobAlert(alertId: string, userId: string): Promise<boolean> {
    const query = `
      DELETE FROM job_alerts
      WHERE id = $1 AND user_id = $2
    `;

    const result = await pgPool.query(query, [alertId, userId]);
    return result.rowCount !== null && result.rowCount > 0;
  }

  /**
   * Get all active alerts (for background processing)
   */
  async getActiveAlerts(): Promise<JobAlert[]> {
    const query = `
      SELECT * FROM job_alerts
      WHERE active = true
      ORDER BY last_triggered ASC NULLS FIRST
    `;

    const result = await pgPool.query(query);
    return result.rows.map(this.mapRowToJobAlert);
  }

  /**
   * Update last triggered timestamp
   */
  async updateLastTriggered(alertId: string): Promise<void> {
    const query = `
      UPDATE job_alerts
      SET last_triggered = CURRENT_TIMESTAMP
      WHERE id = $1
    `;

    await pgPool.query(query, [alertId]);
  }

  /**
   * Create a notification
   */
  async createNotification(data: CreateNotificationRequest): Promise<Notification> {
    const query = `
      INSERT INTO notifications (user_id, type, title, message, data)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const result = await pgPool.query(query, [
      data.userId,
      data.type,
      data.title,
      data.message,
      data.data ? JSON.stringify(data.data) : null,
    ]);

    const notification = this.mapRowToNotification(result.rows[0]);

    // Send real-time notification via WebSocket
    try {
      webSocketService.sendNotificationToUser(data.userId, notification);
    } catch (error) {
      console.error('Error sending WebSocket notification:', error);
      // Continue even if WebSocket fails
    }

    return notification;
  }

  /**
   * Get user notifications
   */
  async getUserNotifications(
    userId: string,
    unreadOnly: boolean = false,
    limit: number = 50
  ): Promise<Notification[]> {
    let query = `
      SELECT * FROM notifications
      WHERE user_id = $1
    `;

    const params: any[] = [userId];

    if (unreadOnly) {
      query += ' AND read = false';
    }

    query += ' ORDER BY created_at DESC LIMIT $2';
    params.push(limit);

    const result = await pgPool.query(query, params);
    return result.rows.map(this.mapRowToNotification);
  }

  /**
   * Mark notification as read
   */
  async markNotificationAsRead(notificationId: string, userId: string): Promise<boolean> {
    const query = `
      UPDATE notifications
      SET read = true
      WHERE id = $1 AND user_id = $2
    `;

    const result = await pgPool.query(query, [notificationId, userId]);
    return result.rowCount !== null && result.rowCount > 0;
  }

  /**
   * Mark all notifications as read
   */
  async markAllNotificationsAsRead(userId: string): Promise<number> {
    const query = `
      UPDATE notifications
      SET read = true
      WHERE user_id = $1 AND read = false
    `;

    const result = await pgPool.query(query, [userId]);
    return result.rowCount || 0;
  }

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId: string, userId: string): Promise<boolean> {
    const query = `
      DELETE FROM notifications
      WHERE id = $1 AND user_id = $2
    `;

    const result = await pgPool.query(query, [notificationId, userId]);
    return result.rowCount !== null && result.rowCount > 0;
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: string): Promise<number> {
    const query = `
      SELECT COUNT(*) as count
      FROM notifications
      WHERE user_id = $1 AND read = false
    `;

    const result = await pgPool.query(query, [userId]);
    return parseInt(result.rows[0].count, 10);
  }

  /**
   * Map database row to JobAlert
   */
  private mapRowToJobAlert(row: any): JobAlert {
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      criteria: row.criteria,
      frequency: row.frequency,
      active: row.active,
      lastTriggered: row.last_triggered,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Map database row to Notification
   */
  private mapRowToNotification(row: any): Notification {
    return {
      id: row.id,
      userId: row.user_id,
      type: row.type,
      title: row.title,
      message: row.message,
      data: row.data,
      read: row.read,
      createdAt: row.created_at,
    };
  }
}

export const jobAlertService = new JobAlertService();
