import { Pool } from 'pg';
import { pgPool } from '../config/database';

/**
 * Notification Service
 * Handles in-app notifications for users
 */
export class NotificationService {
  private db: Pool;

  constructor() {
    this.db = pgPool;
  }

  /**
   * Create a notification for a user
   */
  async createNotification(data: {
    userId: string;
    type: string;
    title: string;
    message: string;
    link?: string;
    metadata?: any;
  }): Promise<any> {
    try {
      const query = `
        INSERT INTO notifications (user_id, type, title, message, link, metadata, read)
        VALUES ($1, $2, $3, $4, $5, $6, false)
        RETURNING id, user_id, type, title, message, link, metadata, read, created_at
      `;

      const result = await this.db.query(query, [
        data.userId,
        data.type,
        data.title,
        data.message,
        data.link || null,
        data.metadata ? JSON.stringify(data.metadata) : '{}',
      ]);

      return result.rows[0];
    } catch (error) {
      console.error('Error creating notification:', error);
      // Don't throw - notifications are non-critical
      return null;
    }
  }

  /**
   * Get notifications for a user
   */
  async getUserNotifications(userId: string, unreadOnly: boolean = false): Promise<any[]> {
    let query = `
      SELECT id, user_id, type, title, message, link, metadata, read, created_at
      FROM notifications
      WHERE user_id = $1
    `;

    if (unreadOnly) {
      query += ' AND read = false';
    }

    query += ' ORDER BY created_at DESC LIMIT 50';

    const result = await this.db.query(query, [userId]);
    return result.rows;
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    const query = `
      UPDATE notifications
      SET read = true
      WHERE id = $1 AND user_id = $2
      RETURNING id
    `;

    const result = await this.db.query(query, [notificationId, userId]);
    return result.rows.length > 0;
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<number> {
    const query = `
      UPDATE notifications
      SET read = true
      WHERE user_id = $1 AND read = false
      RETURNING id
    `;

    const result = await this.db.query(query, [userId]);
    return result.rows.length;
  }

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId: string, userId: string): Promise<boolean> {
    const query = `
      DELETE FROM notifications
      WHERE id = $1 AND user_id = $2
      RETURNING id
    `;

    const result = await this.db.query(query, [notificationId, userId]);
    return result.rows.length > 0;
  }
}

export const notificationService = new NotificationService();
