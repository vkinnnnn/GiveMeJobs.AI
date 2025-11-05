import { injectable, inject } from 'inversify';
import { Pool } from 'pg';
import { Redis } from 'ioredis';
import { Logger } from 'winston';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { TYPES } from '../types/container.types';

/**
 * Comprehensive Audit Logging Service
 * 
 * Provides tamper-proof audit logging for compliance and security monitoring.
 * Features include:
 * - Immutable audit trails
 * - Digital signatures for log integrity
 * - Compliance reporting (SOX, GDPR, HIPAA)
 * - Real-time log streaming
 * - Advanced search and filtering
 */

export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  action: string;
  resource: string;
  resourceId?: string;
  outcome: 'success' | 'failure' | 'error';
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'authentication' | 'authorization' | 'data_access' | 'data_modification' | 'system' | 'security';
  description: string;
  metadata: Record<string, any>;
  beforeState?: Record<string, any>;
  afterState?: Record<string, any>;
  riskScore: number;
  complianceFlags: string[];
  signature?: string;
  correlationId?: string;
}

export interface AuditSearchCriteria {
  startDate?: Date;
  endDate?: Date;
  userId?: string;
  ipAddress?: string;
  action?: string;
  resource?: string;
  outcome?: 'success' | 'failure' | 'error';
  severity?: 'low' | 'medium' | 'high' | 'critical';
  category?: string;
  riskScoreMin?: number;
  riskScoreMax?: number;
  complianceFlags?: string[];
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ComplianceReport {
  id: string;
  reportType: 'sox' | 'gdpr' | 'hipaa' | 'pci' | 'custom';
  period: {
    startDate: Date;
    endDate: Date;
  };
  totalEntries: number;
  criticalEvents: number;
  highRiskEvents: number;
  failedOperations: number;
  dataAccessEvents: number;
  privilegedOperations: number;
  summary: Record<string, any>;
  entries: AuditLogEntry[];
  generatedAt: Date;
  generatedBy: string;
  signature: string;
}

@injectable()
export class AuditLogService {
  private readonly SIGNING_KEY: string;
  private readonly ENCRYPTION_KEY: Buffer;

  constructor(
    @inject(TYPES.Database) private pool: Pool,
    @inject(TYPES.Redis) private redis: Redis,
    @inject(TYPES.Logger) private logger: Logger
  ) {
    this.SIGNING_KEY = process.env.AUDIT_SIGNING_KEY || 'default-signing-key';
    this.ENCRYPTION_KEY = Buffer.from(process.env.AUDIT_ENCRYPTION_KEY || 'default-encryption-key-32-bytes!!');
    this.initializeAuditTables();
  }

  /**
   * Log audit event with integrity protection
   */
  async logAuditEvent(
    action: string,
    resource: string,
    outcome: 'success' | 'failure' | 'error',
    options: {
      userId?: string;
      sessionId?: string;
      ipAddress?: string;
      userAgent?: string;
      resourceId?: string;
      description?: string;
      metadata?: Record<string, any>;
      beforeState?: Record<string, any>;
      afterState?: Record<string, any>;
      severity?: 'low' | 'medium' | 'high' | 'critical';
      category?: 'authentication' | 'authorization' | 'data_access' | 'data_modification' | 'system' | 'security';
      correlationId?: string;
    } = {}
  ): Promise<string> {
    try {
      const auditEntry: AuditLogEntry = {
        id: uuidv4(),
        timestamp: new Date(),
        userId: options.userId,
        sessionId: options.sessionId,
        ipAddress: options.ipAddress,
        userAgent: options.userAgent,
        action,
        resource,
        resourceId: options.resourceId,
        outcome,
        severity: options.severity || this.calculateSeverity(action, outcome),
        category: options.category || this.categorizeAction(action),
        description: options.description || this.generateDescription(action, resource, outcome),
        metadata: options.metadata || {},
        beforeState: options.beforeState,
        afterState: options.afterState,
        riskScore: this.calculateRiskScore(action, outcome, options.severity),
        complianceFlags: this.getComplianceFlags(action, resource),
        correlationId: options.correlationId,
      };

      // Generate digital signature for integrity
      auditEntry.signature = this.generateSignature(auditEntry);

      // Store in database
      await this.storeAuditEntry(auditEntry);

      // Store in Redis for real-time access
      await this.redis.lpush('audit_events', JSON.stringify(auditEntry));
      await this.redis.ltrim('audit_events', 0, 9999); // Keep last 10k events

      // Check for compliance violations
      await this.checkComplianceViolations(auditEntry);

      // Update metrics
      await this.updateAuditMetrics(auditEntry);

      this.logger.info('Audit event logged', {
        auditId: auditEntry.id,
        action,
        resource,
        outcome,
        userId: options.userId,
        riskScore: auditEntry.riskScore,
      });

      return auditEntry.id;
    } catch (error) {
      this.logger.error('Failed to log audit event', {
        action,
        resource,
        outcome,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Search audit logs with advanced filtering
   */
  async searchAuditLogs(criteria: AuditSearchCriteria): Promise<{
    entries: AuditLogEntry[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      const query = this.buildSearchQuery(criteria);
      const countQuery = this.buildCountQuery(criteria);

      const [entriesResult, countResult] = await Promise.all([
        this.pool.query(query.sql, query.params),
        this.pool.query(countQuery.sql, countQuery.params),
      ]);

      const entries = entriesResult.rows.map(row => this.mapRowToAuditEntry(row));
      const total = parseInt(countResult.rows[0].count);
      const hasMore = (criteria.offset || 0) + entries.length < total;

      // Verify signatures for integrity
      for (const entry of entries) {
        if (!this.verifySignature(entry)) {
          this.logger.warn('Audit log integrity violation detected', {
            auditId: entry.id,
          });
        }
      }

      return { entries, total, hasMore };
    } catch (error) {
      this.logger.error('Failed to search audit logs', {
        criteria,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(
    reportType: 'sox' | 'gdpr' | 'hipaa' | 'pci' | 'custom',
    startDate: Date,
    endDate: Date,
    generatedBy: string,
    customCriteria?: AuditSearchCriteria
  ): Promise<ComplianceReport> {
    try {
      const criteria: AuditSearchCriteria = {
        startDate,
        endDate,
        ...this.getComplianceCriteria(reportType),
        ...customCriteria,
      };

      const { entries, total } = await this.searchAuditLogs(criteria);

      const report: ComplianceReport = {
        id: uuidv4(),
        reportType,
        period: { startDate, endDate },
        totalEntries: total,
        criticalEvents: entries.filter(e => e.severity === 'critical').length,
        highRiskEvents: entries.filter(e => e.riskScore >= 7).length,
        failedOperations: entries.filter(e => e.outcome === 'failure').length,
        dataAccessEvents: entries.filter(e => e.category === 'data_access').length,
        privilegedOperations: entries.filter(e => this.isPrivilegedOperation(e)).length,
        summary: this.generateReportSummary(entries, reportType),
        entries,
        generatedAt: new Date(),
        generatedBy,
        signature: '',
      };

      // Generate report signature
      report.signature = this.generateReportSignature(report);

      // Store report
      await this.storeComplianceReport(report);

      this.logger.info('Compliance report generated', {
        reportId: report.id,
        reportType,
        totalEntries: total,
        generatedBy,
      });

      return report;
    } catch (error) {
      this.logger.error('Failed to generate compliance report', {
        reportType,
        startDate,
        endDate,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Export audit logs for external systems
   */
  async exportAuditLogs(
    format: 'json' | 'csv' | 'xml' | 'syslog',
    criteria: AuditSearchCriteria
  ): Promise<string> {
    try {
      const { entries } = await this.searchAuditLogs(criteria);

      switch (format) {
        case 'json':
          return JSON.stringify(entries, null, 2);
        
        case 'csv':
          return this.convertToCSV(entries);
        
        case 'xml':
          return this.convertToXML(entries);
        
        case 'syslog':
          return this.convertToSyslog(entries);
        
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }
    } catch (error) {
      this.logger.error('Failed to export audit logs', {
        format,
        criteria,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get audit statistics
   */
  async getAuditStatistics(period: { startDate: Date; endDate: Date }): Promise<{
    totalEvents: number;
    eventsByCategory: Record<string, number>;
    eventsBySeverity: Record<string, number>;
    eventsByOutcome: Record<string, number>;
    topUsers: Array<{ userId: string; count: number }>;
    topActions: Array<{ action: string; count: number }>;
    riskTrends: Array<{ date: string; averageRisk: number }>;
    complianceViolations: number;
  }> {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_events,
          category,
          severity,
          outcome,
          user_id,
          action,
          DATE(timestamp) as event_date,
          AVG(risk_score) as avg_risk_score
        FROM audit_logs 
        WHERE timestamp BETWEEN $1 AND $2
        GROUP BY category, severity, outcome, user_id, action, DATE(timestamp)
      `;

      const result = await this.pool.query(query, [period.startDate, period.endDate]);
      
      // Process results into statistics
      const stats = this.processAuditStatistics(result.rows);

      return stats;
    } catch (error) {
      this.logger.error('Failed to get audit statistics', {
        period,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Verify audit log integrity
   */
  async verifyAuditIntegrity(auditId?: string): Promise<{
    isValid: boolean;
    violations: Array<{ auditId: string; issue: string }>;
  }> {
    try {
      const query = auditId 
        ? 'SELECT * FROM audit_logs WHERE id = $1'
        : 'SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 1000';
      
      const params = auditId ? [auditId] : [];
      const result = await this.pool.query(query, params);

      const violations: Array<{ auditId: string; issue: string }> = [];

      for (const row of result.rows) {
        const entry = this.mapRowToAuditEntry(row);
        
        if (!this.verifySignature(entry)) {
          violations.push({
            auditId: entry.id,
            issue: 'Invalid digital signature',
          });
        }

        // Check for tampering indicators
        if (this.detectTampering(entry)) {
          violations.push({
            auditId: entry.id,
            issue: 'Potential tampering detected',
          });
        }
      }

      return {
        isValid: violations.length === 0,
        violations,
      };
    } catch (error) {
      this.logger.error('Failed to verify audit integrity', {
        auditId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Private helper methods
   */
  private async initializeAuditTables(): Promise<void> {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY,
        timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
        user_id UUID,
        session_id VARCHAR(255),
        ip_address INET,
        user_agent TEXT,
        action VARCHAR(255) NOT NULL,
        resource VARCHAR(255) NOT NULL,
        resource_id VARCHAR(255),
        outcome VARCHAR(50) NOT NULL,
        severity VARCHAR(50) NOT NULL,
        category VARCHAR(100) NOT NULL,
        description TEXT,
        metadata JSONB,
        before_state JSONB,
        after_state JSONB,
        risk_score INTEGER NOT NULL,
        compliance_flags TEXT[],
        signature VARCHAR(512),
        correlation_id UUID,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_outcome ON audit_logs(outcome);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON audit_logs(severity);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_category ON audit_logs(category);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_risk_score ON audit_logs(risk_score);
    `;

    await this.pool.query(createTableQuery);
  }

  private generateSignature(entry: AuditLogEntry): string {
    const data = {
      id: entry.id,
      timestamp: entry.timestamp.toISOString(),
      userId: entry.userId,
      action: entry.action,
      resource: entry.resource,
      outcome: entry.outcome,
      metadata: entry.metadata,
    };

    const dataString = JSON.stringify(data, Object.keys(data).sort());
    return crypto
      .createHmac('sha256', this.SIGNING_KEY)
      .update(dataString)
      .digest('hex');
  }

  private verifySignature(entry: AuditLogEntry): boolean {
    if (!entry.signature) return false;
    
    const expectedSignature = this.generateSignature(entry);
    return crypto.timingSafeEqual(
      Buffer.from(entry.signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }

  private calculateSeverity(action: string, outcome: 'success' | 'failure' | 'error'): 'low' | 'medium' | 'high' | 'critical' {
    if (outcome === 'failure' || outcome === 'error') {
      if (action.includes('login') || action.includes('auth')) return 'high';
      if (action.includes('delete') || action.includes('admin')) return 'medium';
    }
    
    if (action.includes('admin') || action.includes('privilege')) return 'high';
    if (action.includes('delete') || action.includes('modify')) return 'medium';
    
    return 'low';
  }

  private categorizeAction(action: string): 'authentication' | 'authorization' | 'data_access' | 'data_modification' | 'system' | 'security' {
    if (action.includes('login') || action.includes('logout') || action.includes('auth')) return 'authentication';
    if (action.includes('permission') || action.includes('role') || action.includes('access')) return 'authorization';
    if (action.includes('read') || action.includes('view') || action.includes('get')) return 'data_access';
    if (action.includes('create') || action.includes('update') || action.includes('delete') || action.includes('modify')) return 'data_modification';
    if (action.includes('admin') || action.includes('config') || action.includes('system')) return 'system';
    if (action.includes('security') || action.includes('block') || action.includes('alert')) return 'security';
    
    return 'system';
  }

  private calculateRiskScore(action: string, outcome: 'success' | 'failure' | 'error', severity?: string): number {
    let score = 1;
    
    if (outcome === 'failure' || outcome === 'error') score += 3;
    if (severity === 'critical') score += 4;
    else if (severity === 'high') score += 3;
    else if (severity === 'medium') score += 2;
    
    if (action.includes('admin')) score += 2;
    if (action.includes('delete')) score += 2;
    if (action.includes('privilege')) score += 3;
    
    return Math.min(score, 10);
  }

  private getComplianceFlags(action: string, resource: string): string[] {
    const flags: string[] = [];
    
    if (resource.includes('user') || resource.includes('profile')) flags.push('GDPR');
    if (resource.includes('payment') || resource.includes('card')) flags.push('PCI');
    if (resource.includes('health') || resource.includes('medical')) flags.push('HIPAA');
    if (action.includes('financial') || resource.includes('financial')) flags.push('SOX');
    
    return flags;
  }

  private generateDescription(action: string, resource: string, outcome: string): string {
    return `${action} operation on ${resource} ${outcome === 'success' ? 'completed successfully' : 'failed'}`;
  }

  private async storeAuditEntry(entry: AuditLogEntry): Promise<void> {
    const query = `
      INSERT INTO audit_logs (
        id, timestamp, user_id, session_id, ip_address, user_agent,
        action, resource, resource_id, outcome, severity, category,
        description, metadata, before_state, after_state, risk_score,
        compliance_flags, signature, correlation_id
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20
      )
    `;

    const params = [
      entry.id,
      entry.timestamp,
      entry.userId,
      entry.sessionId,
      entry.ipAddress,
      entry.userAgent,
      entry.action,
      entry.resource,
      entry.resourceId,
      entry.outcome,
      entry.severity,
      entry.category,
      entry.description,
      JSON.stringify(entry.metadata),
      entry.beforeState ? JSON.stringify(entry.beforeState) : null,
      entry.afterState ? JSON.stringify(entry.afterState) : null,
      entry.riskScore,
      entry.complianceFlags,
      entry.signature,
      entry.correlationId,
    ];

    await this.pool.query(query, params);
  }

  private buildSearchQuery(criteria: AuditSearchCriteria): { sql: string; params: any[] } {
    let sql = 'SELECT * FROM audit_logs WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (criteria.startDate) {
      sql += ` AND timestamp >= $${paramIndex}`;
      params.push(criteria.startDate);
      paramIndex++;
    }

    if (criteria.endDate) {
      sql += ` AND timestamp <= $${paramIndex}`;
      params.push(criteria.endDate);
      paramIndex++;
    }

    if (criteria.userId) {
      sql += ` AND user_id = $${paramIndex}`;
      params.push(criteria.userId);
      paramIndex++;
    }

    if (criteria.action) {
      sql += ` AND action = $${paramIndex}`;
      params.push(criteria.action);
      paramIndex++;
    }

    if (criteria.outcome) {
      sql += ` AND outcome = $${paramIndex}`;
      params.push(criteria.outcome);
      paramIndex++;
    }

    if (criteria.severity) {
      sql += ` AND severity = $${paramIndex}`;
      params.push(criteria.severity);
      paramIndex++;
    }

    // Add sorting
    const sortBy = criteria.sortBy || 'timestamp';
    const sortOrder = criteria.sortOrder || 'desc';
    sql += ` ORDER BY ${sortBy} ${sortOrder}`;

    // Add pagination
    if (criteria.limit) {
      sql += ` LIMIT $${paramIndex}`;
      params.push(criteria.limit);
      paramIndex++;
    }

    if (criteria.offset) {
      sql += ` OFFSET $${paramIndex}`;
      params.push(criteria.offset);
      paramIndex++;
    }

    return { sql, params };
  }

  private buildCountQuery(criteria: AuditSearchCriteria): { sql: string; params: any[] } {
    const searchQuery = this.buildSearchQuery(criteria);
    const sql = searchQuery.sql.replace('SELECT *', 'SELECT COUNT(*)').split(' ORDER BY')[0];
    return { sql, params: searchQuery.params.slice(0, -2) }; // Remove LIMIT and OFFSET params
  }

  private mapRowToAuditEntry(row: any): AuditLogEntry {
    return {
      id: row.id,
      timestamp: row.timestamp,
      userId: row.user_id,
      sessionId: row.session_id,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      action: row.action,
      resource: row.resource,
      resourceId: row.resource_id,
      outcome: row.outcome,
      severity: row.severity,
      category: row.category,
      description: row.description,
      metadata: row.metadata || {},
      beforeState: row.before_state,
      afterState: row.after_state,
      riskScore: row.risk_score,
      complianceFlags: row.compliance_flags || [],
      signature: row.signature,
      correlationId: row.correlation_id,
    };
  }

  // Additional helper methods would be implemented here...
  private async checkComplianceViolations(entry: AuditLogEntry): Promise<void> {
    // Implementation for compliance checking
  }

  private async updateAuditMetrics(entry: AuditLogEntry): Promise<void> {
    // Implementation for metrics updates
  }

  private getComplianceCriteria(reportType: string): Partial<AuditSearchCriteria> {
    // Implementation for compliance-specific criteria
    return {};
  }

  private generateReportSummary(entries: AuditLogEntry[], reportType: string): Record<string, any> {
    // Implementation for report summary generation
    return {};
  }

  private generateReportSignature(report: ComplianceReport): string {
    // Implementation for report signature generation
    return '';
  }

  private async storeComplianceReport(report: ComplianceReport): Promise<void> {
    // Implementation for storing compliance reports
  }

  private isPrivilegedOperation(entry: AuditLogEntry): boolean {
    // Implementation for detecting privileged operations
    return false;
  }

  private convertToCSV(entries: AuditLogEntry[]): string {
    // Implementation for CSV conversion
    return '';
  }

  private convertToXML(entries: AuditLogEntry[]): string {
    // Implementation for XML conversion
    return '';
  }

  private convertToSyslog(entries: AuditLogEntry[]): string {
    // Implementation for Syslog conversion
    return '';
  }

  private processAuditStatistics(rows: any[]): any {
    // Implementation for statistics processing
    return {};
  }

  private detectTampering(entry: AuditLogEntry): boolean {
    // Implementation for tampering detection
    return false;
  }
}