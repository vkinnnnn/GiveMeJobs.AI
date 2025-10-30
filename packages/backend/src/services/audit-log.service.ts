import pool from '../config/database';
import logger from './logger.service';

export interface AuditLogEntry {
  id?: string;
  userId?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  status: 'success' | 'failure';
  ipAddress?: string;
  userAgent?: string;
  requestMethod?: string;
  requestPath?: string;
  changes?: any;
  metadata?: any;
  errorMessage?: string;
  timestamp?: Date;
}

export interface AuditLogQuery {
  userId?: string;
  action?: string;
  resourceType?: string;
  resourceId?: string;
  status?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

class AuditLogService {
  /**
   * Log an audit entry
   */
  async log(entry: AuditLogEntry): Promise<void> {
    try {
      await pool.query(
        `INSERT INTO audit_logs 
         (user_id, action, resource_type, resource_id, status, ip_address, 
          user_agent, request_method, request_path, changes, metadata, error_message)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          entry.userId || null,
          entry.action,
          entry.resourceType,
          entry.resourceId || null,
          entry.status,
          entry.ipAddress || null,
          entry.userAgent || null,
          entry.requestMethod || null,
          entry.requestPath || null,
          entry.changes ? JSON.stringify(entry.changes) : null,
          entry.metadata ? JSON.stringify(entry.metadata) : null,
          entry.errorMessage || null,
        ]
      );
    } catch (error) {
      // Log to console if database logging fails
      logger.error('Failed to write audit log:', error);
      logger.info('Audit log entry:', entry);
    }
  }

  /**
   * Log authentication events
   */
  async logAuth(
    action: 'login' | 'logout' | 'register' | 'password_reset' | 'mfa_enable' | 'mfa_disable',
    userId: string,
    status: 'success' | 'failure',
    metadata?: any,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.log({
      userId,
      action: `auth.${action}`,
      resourceType: 'user',
      resourceId: userId,
      status,
      ipAddress,
      userAgent,
      metadata,
    });
  }

  /**
   * Log data access events
   */
  async logDataAccess(
    action: 'read' | 'export',
    userId: string,
    resourceType: string,
    resourceId: string,
    status: 'success' | 'failure',
    metadata?: any,
    ipAddress?: string
  ): Promise<void> {
    await this.log({
      userId,
      action: `data.${action}`,
      resourceType,
      resourceId,
      status,
      ipAddress,
      metadata,
    });
  }

  /**
   * Log data modification events
   */
  async logDataModification(
    action: 'create' | 'update' | 'delete',
    userId: string,
    resourceType: string,
    resourceId: string,
    changes: any,
    status: 'success' | 'failure',
    ipAddress?: string
  ): Promise<void> {
    await this.log({
      userId,
      action: `data.${action}`,
      resourceType,
      resourceId,
      status,
      ipAddress,
      changes,
    });
  }

  /**
   * Log credential access events
   */
  async logCredentialAccess(
    action: 'view' | 'grant_access' | 'revoke_access' | 'verify',
    userId: string,
    credentialId: string,
    status: 'success' | 'failure',
    metadata?: any,
    ipAddress?: string
  ): Promise<void> {
    await this.log({
      userId,
      action: `credential.${action}`,
      resourceType: 'blockchain_credential',
      resourceId: credentialId,
      status,
      ipAddress,
      metadata,
    });
  }

  /**
   * Log GDPR-related events
   */
  async logGDPR(
    action: 'data_export' | 'account_deletion' | 'consent_granted' | 'consent_revoked',
    userId: string,
    status: 'success' | 'failure',
    metadata?: any,
    ipAddress?: string
  ): Promise<void> {
    await this.log({
      userId,
      action: `gdpr.${action}`,
      resourceType: 'user',
      resourceId: userId,
      status,
      ipAddress,
      metadata,
    });
  }

  /**
   * Log security events
   */
  async logSecurity(
    action: string,
    userId: string | undefined,
    status: 'success' | 'failure',
    metadata?: any,
    ipAddress?: string,
    errorMessage?: string
  ): Promise<void> {
    await this.log({
      userId,
      action: `security.${action}`,
      resourceType: 'system',
      status,
      ipAddress,
      metadata,
      errorMessage,
    });
  }

  /**
   * Query audit logs
   */
  async query(query: AuditLogQuery): Promise<AuditLogEntry[]> {
    let sql = 'SELECT * FROM audit_logs WHERE 1=1';
    const values: any[] = [];
    let paramIndex = 1;

    if (query.userId) {
      sql += ` AND user_id = $${paramIndex++}`;
      values.push(query.userId);
    }

    if (query.action) {
      sql += ` AND action = $${paramIndex++}`;
      values.push(query.action);
    }

    if (query.resourceType) {
      sql += ` AND resource_type = $${paramIndex++}`;
      values.push(query.resourceType);
    }

    if (query.resourceId) {
      sql += ` AND resource_id = $${paramIndex++}`;
      values.push(query.resourceId);
    }

    if (query.status) {
      sql += ` AND status = $${paramIndex++}`;
      values.push(query.status);
    }

    if (query.startDate) {
      sql += ` AND timestamp >= $${paramIndex++}`;
      values.push(query.startDate);
    }

    if (query.endDate) {
      sql += ` AND timestamp <= $${paramIndex++}`;
      values.push(query.endDate);
    }

    sql += ' ORDER BY timestamp DESC';

    if (query.limit) {
      sql += ` LIMIT $${paramIndex++}`;
      values.push(query.limit);
    }

    if (query.offset) {
      sql += ` OFFSET $${paramIndex++}`;
      values.push(query.offset);
    }

    const result = await pool.query(sql, values);

    return result.rows.map(this.mapAuditLogEntry);
  }

  /**
   * Get audit logs for a specific user
   */
  async getUserAuditLogs(
    userId: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<AuditLogEntry[]> {
    return this.query({ userId, limit, offset });
  }

  /**
   * Get audit logs for a specific resource
   */
  async getResourceAuditLogs(
    resourceType: string,
    resourceId: string,
    limit: number = 100
  ): Promise<AuditLogEntry[]> {
    return this.query({ resourceType, resourceId, limit });
  }

  /**
   * Get failed authentication attempts
   */
  async getFailedAuthAttempts(
    userId?: string,
    hours: number = 24
  ): Promise<AuditLogEntry[]> {
    const startDate = new Date();
    startDate.setHours(startDate.getHours() - hours);

    const query: AuditLogQuery = {
      action: 'auth.login',
      status: 'failure',
      startDate,
      limit: 100,
    };

    if (userId) {
      query.userId = userId;
    }

    return this.query(query);
  }

  /**
   * Get security events
   */
  async getSecurityEvents(hours: number = 24): Promise<AuditLogEntry[]> {
    const startDate = new Date();
    startDate.setHours(startDate.getHours() - hours);

    const result = await pool.query(
      `SELECT * FROM audit_logs 
       WHERE action LIKE 'security.%' 
       AND timestamp >= $1
       ORDER BY timestamp DESC
       LIMIT 1000`,
      [startDate]
    );

    return result.rows.map(this.mapAuditLogEntry);
  }

  /**
   * Get audit statistics
   */
  async getStatistics(userId?: string, days: number = 30): Promise<any> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    let query = `
      SELECT 
        action,
        status,
        COUNT(*) as count
      FROM audit_logs
      WHERE timestamp >= $1
    `;
    const values: any[] = [startDate];

    if (userId) {
      query += ' AND user_id = $2';
      values.push(userId);
    }

    query += ' GROUP BY action, status ORDER BY count DESC';

    const result = await pool.query(query, values);

    return {
      period: `${days} days`,
      startDate,
      statistics: result.rows,
    };
  }

  /**
   * Map database row to AuditLogEntry
   */
  private mapAuditLogEntry(row: any): AuditLogEntry {
    return {
      id: row.id,
      userId: row.user_id,
      action: row.action,
      resourceType: row.resource_type,
      resourceId: row.resource_id,
      status: row.status,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      requestMethod: row.request_method,
      requestPath: row.request_path,
      changes: row.changes,
      metadata: row.metadata,
      errorMessage: row.error_message,
      timestamp: row.timestamp,
    };
  }
}

export const auditLogService = new AuditLogService();
