import pool from '../config/database';
import logger from './logger.service';
import { emailService } from './email.service';
import { notificationService } from './notification.service';

export interface SecurityIncident {
  id: string;
  incidentType: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'detected' | 'investigating' | 'contained' | 'resolved' | 'closed';
  description: string;
  affectedSystems: string[];
  affectedDataTypes: string[];
  estimatedAffectedUsers: number;
  detectedAt: Date;
  containedAt?: Date;
  resolvedAt?: Date;
  reportedToAuthoritiesAt?: Date;
  usersNotifiedAt?: Date;
  rootCause?: string;
  remediationSteps: string[];
  createdBy?: string;
  metadata?: any;
}

export interface IncidentNotification {
  id: string;
  incidentId: string;
  userId: string;
  notificationType: 'email' | 'in_app' | 'both';
  sentAt: Date;
  acknowledgedAt?: Date;
  notificationContent?: any;
}

class SecurityIncidentService {
  /**
   * Create a new security incident
   */
  async createIncident(
    incident: Omit<SecurityIncident, 'id' | 'detectedAt'>
  ): Promise<SecurityIncident> {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `INSERT INTO security_incidents 
         (incident_type, severity, status, description, affected_systems, 
          affected_data_types, estimated_affected_users, root_cause, 
          remediation_steps, created_by, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
        [
          incident.incidentType,
          incident.severity,
          incident.status,
          incident.description,
          incident.affectedSystems,
          incident.affectedDataTypes,
          incident.estimatedAffectedUsers,
          incident.rootCause,
          incident.remediationSteps,
          incident.createdBy,
          JSON.stringify(incident.metadata || {}),
        ]
      );

      const createdIncident = this.mapSecurityIncident(result.rows[0]);

      logger.error(`Security incident created: ${createdIncident.id} - ${incident.incidentType}`);

      // If critical or high severity, send immediate alerts
      if (incident.severity === 'critical' || incident.severity === 'high') {
        this.sendAdminAlert(createdIncident).catch((error) => {
          logger.error('Error sending admin alert:', error);
        });
      }

      return createdIncident;
    } finally {
      client.release();
    }
  }

  /**
   * Update incident status
   */
  async updateIncidentStatus(
    incidentId: string,
    status: SecurityIncident['status'],
    updates?: Partial<SecurityIncident>
  ): Promise<SecurityIncident> {
    const client = await pool.connect();
    try {
      const setFields: string[] = ['status = $2'];
      const values: any[] = [incidentId, status];
      let paramIndex = 3;

      if (status === 'contained' && !updates?.containedAt) {
        setFields.push(`contained_at = NOW()`);
      }

      if (status === 'resolved' && !updates?.resolvedAt) {
        setFields.push(`resolved_at = NOW()`);
      }

      if (updates?.rootCause) {
        setFields.push(`root_cause = $${paramIndex++}`);
        values.push(updates.rootCause);
      }

      if (updates?.remediationSteps) {
        setFields.push(`remediation_steps = $${paramIndex++}`);
        values.push(updates.remediationSteps);
      }

      const result = await client.query(
        `UPDATE security_incidents 
         SET ${setFields.join(', ')}
         WHERE id = $1
         RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        throw new Error('Incident not found');
      }

      logger.info(`Security incident ${incidentId} status updated to ${status}`);

      return this.mapSecurityIncident(result.rows[0]);
    } finally {
      client.release();
    }
  }

  /**
   * Get incident by ID
   */
  async getIncident(incidentId: string): Promise<SecurityIncident | null> {
    const result = await pool.query(
      'SELECT * FROM security_incidents WHERE id = $1',
      [incidentId]
    );

    return result.rows[0] ? this.mapSecurityIncident(result.rows[0]) : null;
  }

  /**
   * Get all incidents
   */
  async getAllIncidents(filters?: {
    status?: string;
    severity?: string;
    limit?: number;
  }): Promise<SecurityIncident[]> {
    let query = 'SELECT * FROM security_incidents WHERE 1=1';
    const values: any[] = [];
    let paramIndex = 1;

    if (filters?.status) {
      query += ` AND status = $${paramIndex++}`;
      values.push(filters.status);
    }

    if (filters?.severity) {
      query += ` AND severity = $${paramIndex++}`;
      values.push(filters.severity);
    }

    query += ' ORDER BY detected_at DESC';

    if (filters?.limit) {
      query += ` LIMIT $${paramIndex++}`;
      values.push(filters.limit);
    }

    const result = await pool.query(query, values);

    return result.rows.map(this.mapSecurityIncident);
  }

  /**
   * Notify affected users about a data breach
   */
  async notifyAffectedUsers(
    incidentId: string,
    userIds?: string[]
  ): Promise<void> {
    const client = await pool.connect();
    try {
      const incident = await this.getIncident(incidentId);
      if (!incident) {
        throw new Error('Incident not found');
      }

      // If no specific users provided, notify all users (for platform-wide breaches)
      let affectedUsers: string[];
      if (userIds && userIds.length > 0) {
        affectedUsers = userIds;
      } else {
        const result = await client.query('SELECT id FROM users');
        affectedUsers = result.rows.map((row) => row.id);
      }

      // Generate notification content
      const notificationContent = this.generateBreachNotification(incident);

      // Send notifications to all affected users
      for (const userId of affectedUsers) {
        try {
          // Send email notification
          await this.sendBreachNotificationEmail(userId, incident, notificationContent);

          // Send in-app notification
          await notificationService.createNotification({
            userId,
            type: 'security_alert',
            title: 'Security Incident Notification',
            message: notificationContent.summary,
            priority: incident.severity === 'critical' ? 'high' : 'medium',
            metadata: {
              incidentId: incident.id,
              incidentType: incident.incidentType,
            },
          });

          // Record notification
          await client.query(
            `INSERT INTO incident_notifications 
             (incident_id, user_id, notification_type, notification_content)
             VALUES ($1, $2, 'both', $3)`,
            [incidentId, userId, JSON.stringify(notificationContent)]
          );
        } catch (error) {
          logger.error(`Error notifying user ${userId} about incident ${incidentId}:`, error);
        }
      }

      // Update incident to mark users as notified
      await client.query(
        `UPDATE security_incidents 
         SET users_notified_at = NOW(), estimated_affected_users = $2
         WHERE id = $1`,
        [incidentId, affectedUsers.length]
      );

      logger.info(`Notified ${affectedUsers.length} users about incident ${incidentId}`);
    } finally {
      client.release();
    }
  }

  /**
   * Report incident to authorities (GDPR requirement)
   */
  async reportToAuthorities(incidentId: string): Promise<void> {
    const incident = await this.getIncident(incidentId);
    if (!incident) {
      throw new Error('Incident not found');
    }

    // In production, this would integrate with actual authority reporting systems
    // For now, we'll log and mark as reported
    logger.info(`Reporting incident ${incidentId} to authorities (GDPR compliance)`);

    await pool.query(
      `UPDATE security_incidents 
       SET reported_to_authorities_at = NOW()
       WHERE id = $1`,
      [incidentId]
    );

    // Send notification to compliance team
    // This would be implemented based on organization structure
  }

  /**
   * Generate breach notification content
   */
  private generateBreachNotification(incident: SecurityIncident): any {
    return {
      summary: `We are writing to inform you about a security incident that may have affected your data.`,
      incidentType: incident.incidentType,
      severity: incident.severity,
      detectedAt: incident.detectedAt,
      affectedDataTypes: incident.affectedDataTypes,
      description: incident.description,
      whatHappened: `On ${incident.detectedAt.toLocaleDateString()}, we detected ${incident.description}`,
      whatDataAffected: incident.affectedDataTypes.length > 0
        ? `The following types of data may have been affected: ${incident.affectedDataTypes.join(', ')}`
        : 'We are still investigating what data may have been affected.',
      whatWereDoingAboutIt: incident.remediationSteps.length > 0
        ? incident.remediationSteps.join('. ')
        : 'We are actively investigating and taking steps to secure our systems.',
      whatYouCanDo: [
        'Change your password immediately',
        'Enable multi-factor authentication if not already enabled',
        'Monitor your accounts for suspicious activity',
        'Be cautious of phishing attempts',
      ],
      contactInfo: 'If you have questions, please contact security@givemejobs.com',
      legalNotice: 'This notification is provided in compliance with GDPR and applicable data breach notification laws.',
    };
  }

  /**
   * Send breach notification email
   */
  private async sendBreachNotificationEmail(
    userId: string,
    incident: SecurityIncident,
    content: any
  ): Promise<void> {
    const userResult = await pool.query(
      'SELECT email, first_name FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return;
    }

    const user = userResult.rows[0];

    await emailService.sendEmail({
      to: user.email,
      subject: `Important Security Notice - ${incident.incidentType}`,
      html: `
        <h2>Security Incident Notification</h2>
        <p>Dear ${user.first_name},</p>
        
        <p>${content.summary}</p>
        
        <h3>What Happened</h3>
        <p>${content.whatHappened}</p>
        
        <h3>What Data Was Affected</h3>
        <p>${content.whatDataAffected}</p>
        
        <h3>What We're Doing About It</h3>
        <p>${content.whatWereDoingAboutIt}</p>
        
        <h3>What You Can Do</h3>
        <ul>
          ${content.whatYouCanDo.map((item: string) => `<li>${item}</li>`).join('')}
        </ul>
        
        <p><strong>Contact Information:</strong> ${content.contactInfo}</p>
        
        <p><em>${content.legalNotice}</em></p>
        
        <p>Sincerely,<br>The GiveMeJobs Security Team</p>
      `,
    });
  }

  /**
   * Send admin alert for critical incidents
   */
  private async sendAdminAlert(incident: SecurityIncident): Promise<void> {
    // In production, this would send alerts to admin team via email, Slack, PagerDuty, etc.
    logger.error(`CRITICAL SECURITY INCIDENT: ${incident.id} - ${incident.description}`);
    
    // Send email to security team
    // This would be configured with actual admin emails
    const adminEmails = process.env.SECURITY_TEAM_EMAILS?.split(',') || [];
    
    for (const email of adminEmails) {
      try {
        await emailService.sendEmail({
          to: email,
          subject: `[CRITICAL] Security Incident Detected - ${incident.incidentType}`,
          html: `
            <h2>Critical Security Incident</h2>
            <p><strong>Incident ID:</strong> ${incident.id}</p>
            <p><strong>Type:</strong> ${incident.incidentType}</p>
            <p><strong>Severity:</strong> ${incident.severity}</p>
            <p><strong>Description:</strong> ${incident.description}</p>
            <p><strong>Affected Systems:</strong> ${incident.affectedSystems.join(', ')}</p>
            <p><strong>Estimated Affected Users:</strong> ${incident.estimatedAffectedUsers}</p>
            <p><strong>Detected At:</strong> ${incident.detectedAt}</p>
            
            <p>Please investigate immediately.</p>
          `,
        });
      } catch (error) {
        logger.error(`Error sending admin alert to ${email}:`, error);
      }
    }
  }

  /**
   * Acknowledge incident notification
   */
  async acknowledgeNotification(notificationId: string, userId: string): Promise<void> {
    await pool.query(
      `UPDATE incident_notifications 
       SET acknowledged_at = NOW()
       WHERE id = $1 AND user_id = $2`,
      [notificationId, userId]
    );
  }

  /**
   * Get user's incident notifications
   */
  async getUserNotifications(userId: string): Promise<IncidentNotification[]> {
    const result = await pool.query(
      `SELECT * FROM incident_notifications 
       WHERE user_id = $1
       ORDER BY sent_at DESC`,
      [userId]
    );

    return result.rows.map(this.mapIncidentNotification);
  }

  /**
   * Map database row to SecurityIncident
   */
  private mapSecurityIncident(row: any): SecurityIncident {
    return {
      id: row.id,
      incidentType: row.incident_type,
      severity: row.severity,
      status: row.status,
      description: row.description,
      affectedSystems: row.affected_systems,
      affectedDataTypes: row.affected_data_types,
      estimatedAffectedUsers: row.estimated_affected_users,
      detectedAt: row.detected_at,
      containedAt: row.contained_at,
      resolvedAt: row.resolved_at,
      reportedToAuthoritiesAt: row.reported_to_authorities_at,
      usersNotifiedAt: row.users_notified_at,
      rootCause: row.root_cause,
      remediationSteps: row.remediation_steps,
      createdBy: row.created_by,
      metadata: row.metadata,
    };
  }

  /**
   * Map database row to IncidentNotification
   */
  private mapIncidentNotification(row: any): IncidentNotification {
    return {
      id: row.id,
      incidentId: row.incident_id,
      userId: row.user_id,
      notificationType: row.notification_type,
      sentAt: row.sent_at,
      acknowledgedAt: row.acknowledged_at,
      notificationContent: row.notification_content,
    };
  }
}

export const securityIncidentService = new SecurityIncidentService();
