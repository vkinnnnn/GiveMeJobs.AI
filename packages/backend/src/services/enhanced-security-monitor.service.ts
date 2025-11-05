import { injectable, inject } from 'inversify';
import { Redis } from 'ioredis';
import { Logger } from 'winston';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import geoip from 'geoip-lite';
import { TYPES } from '../types/container.types';

/**
 * Enhanced Security Monitoring and Threat Detection Service
 * 
 * Provides comprehensive security monitoring including:
 * - Real-time threat detection
 * - Automated incident response
 * - Security event correlation
 * - Compliance reporting
 * - Advanced analytics
 */

export interface SecurityEvent {
  id: string;
  eventType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  location?: {
    country: string;
    region: string;
    city: string;
    coordinates: [number, number];
  };
  description: string;
  metadata: Record<string, any>;
  timestamp: Date;
  resolved: boolean;
  responseActions: string[];
}

export interface ThreatDetectionRule {
  id: string;
  name: string;
  description: string;
  eventTypes: string[];
  conditions: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
  responseActions: string[];
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SecurityAlert {
  id: string;
  ruleId: string;
  ruleName: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedUsers: string[];
  affectedIPs: string[];
  eventCount: number;
  firstSeen: Date;
  lastSeen: Date;
  status: 'open' | 'investigating' | 'resolved' | 'false_positive';
  assignedTo?: string;
  notes: string[];
  responseActions: string[];
}

export interface SecurityMetrics {
  totalEvents: number;
  criticalAlerts: number;
  highAlerts: number;
  mediumAlerts: number;
  lowAlerts: number;
  blockedIPs: number;
  lockedAccounts: number;
  failedLogins: number;
  successfulLogins: number;
  mfaFailures: number;
  suspiciousActivities: number;
  averageResponseTime: number;
  topThreats: Array<{ type: string; count: number }>;
  topAttackerIPs: Array<{ ip: string; count: number; country: string }>;
}

@injectable()
export class EnhancedSecurityMonitorService {
  private detectionRules: Map<string, ThreatDetectionRule> = new Map();
  private activeAlerts: Map<string, SecurityAlert> = new Map();
  private blockedIPs: Set<string> = new Set();
  private lockedAccounts: Set<string> = new Set();

  constructor(
    @inject(TYPES.Redis) private redis: Redis,
    @inject(TYPES.Logger) private logger: Logger,
    @inject(TYPES.Database) private pool: Pool
  ) {
    this.initializeDetectionRules();
    this.startBackgroundTasks();
  }

  /**
   * Initialize threat detection rules
   */
  private initializeDetectionRules(): void {
    const rules: ThreatDetectionRule[] = [
      {
        id: 'brute-force-login',
        name: 'Brute Force Login Attack',
        description: 'Detects multiple failed login attempts from the same IP',
        eventTypes: ['login_failed'],
        conditions: {
          maxAttempts: 5,
          timeWindow: 300, // 5 minutes
          perIP: true,
        },
        severity: 'high',
        responseActions: ['block_ip', 'alert_admin', 'log_incident'],
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'credential-stuffing',
        name: 'Credential Stuffing Attack',
        description: 'Detects login attempts with multiple usernames from same IP',
        eventTypes: ['login_failed'],
        conditions: {
          uniqueUsernames: 10,
          timeWindow: 300, // 5 minutes
          perIP: true,
        },
        severity: 'high',
        responseActions: ['block_ip', 'alert_admin', 'log_incident'],
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'account-enumeration',
        name: 'Account Enumeration',
        description: 'Detects attempts to enumerate valid user accounts',
        eventTypes: ['user_not_found', 'invalid_email'],
        conditions: {
          maxAttempts: 20,
          timeWindow: 300, // 5 minutes
          perIP: true,
        },
        severity: 'medium',
        responseActions: ['rate_limit_ip', 'alert_admin'],
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'suspicious-location',
        name: 'Suspicious Login Location',
        description: 'Detects login from unusual geographic location',
        eventTypes: ['login_success'],
        conditions: {
          checkGeolocation: true,
          maxDistanceKm: 1000,
          timeWindow: 3600, // 1 hour
        },
        severity: 'medium',
        responseActions: ['require_mfa', 'alert_user', 'log_incident'],
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'mfa-bypass-attempt',
        name: 'MFA Bypass Attempt',
        description: 'Detects multiple failed MFA attempts',
        eventTypes: ['mfa_failed'],
        conditions: {
          maxAttempts: 3,
          timeWindow: 600, // 10 minutes
          perUser: true,
        },
        severity: 'high',
        responseActions: ['lock_account', 'alert_user', 'alert_admin'],
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'privilege-escalation',
        name: 'Privilege Escalation Attempt',
        description: 'Detects attempts to access unauthorized resources',
        eventTypes: ['unauthorized_access', 'permission_denied'],
        conditions: {
          maxAttempts: 5,
          timeWindow: 300, // 5 minutes
          perUser: true,
        },
        severity: 'critical',
        responseActions: ['lock_account', 'alert_admin', 'log_incident', 'notify_security_team'],
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'data-exfiltration',
        name: 'Data Exfiltration Attempt',
        description: 'Detects unusual data access patterns',
        eventTypes: ['bulk_data_access', 'large_download'],
        conditions: {
          maxRequests: 100,
          timeWindow: 300, // 5 minutes
          dataThresholdMB: 100,
        },
        severity: 'critical',
        responseActions: ['lock_account', 'alert_admin', 'log_incident', 'notify_security_team'],
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'api-abuse',
        name: 'API Abuse Detection',
        description: 'Detects excessive API usage indicating abuse',
        eventTypes: ['api_request'],
        conditions: {
          maxRequests: 1000,
          timeWindow: 60, // 1 minute
          perIP: true,
        },
        severity: 'medium',
        responseActions: ['rate_limit_ip', 'alert_admin'],
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    rules.forEach(rule => {
      this.detectionRules.set(rule.id, rule);
    });

    this.logger.info('Threat detection rules initialized', { 
      ruleCount: rules.length 
    });
  }

  /**
   * Log security event and analyze for threats
   */
  async logSecurityEvent(
    eventType: string,
    metadata: Record<string, any> = {},
    userId?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      const event: SecurityEvent = {
        id: uuidv4(),
        eventType,
        severity: 'low',
        userId,
        ipAddress,
        userAgent,
        location: ipAddress ? this.getLocationFromIP(ipAddress) : undefined,
        description: this.getEventDescription(eventType, metadata),
        metadata,
        timestamp: new Date(),
        resolved: false,
        responseActions: [],
      };

      // Store event in Redis for real-time analysis
      await this.redis.lpush('security_events', JSON.stringify(event));
      await this.redis.ltrim('security_events', 0, 9999); // Keep last 10k events

      // Store in database for long-term analysis
      await this.storeEventInDatabase(event);

      // Analyze for threats
      await this.analyzeEventForThreats(event);

      this.logger.info('Security event logged', {
        eventId: event.id,
        eventType,
        userId,
        ipAddress,
      });
    } catch (error) {
      this.logger.error('Failed to log security event', {
        eventType,
        userId,
        ipAddress,
        error: error.message,
      });
    }
  }

  /**
   * Analyze event against detection rules
   */
  private async analyzeEventForThreats(event: SecurityEvent): Promise<void> {
    for (const rule of this.detectionRules.values()) {
      if (!rule.enabled || !rule.eventTypes.includes(event.eventType)) {
        continue;
      }

      const threatDetected = await this.checkRuleConditions(event, rule);
      
      if (threatDetected) {
        await this.handleThreatDetection(event, rule);
      }
    }
  }

  /**
   * Check if event matches rule conditions
   */
  private async checkRuleConditions(
    event: SecurityEvent,
    rule: ThreatDetectionRule
  ): Promise<boolean> {
    const conditions = rule.conditions;
    const timeWindow = conditions.timeWindow || 300;
    const now = Date.now();
    const windowStart = now - (timeWindow * 1000);

    try {
      switch (rule.id) {
        case 'brute-force-login':
          if (event.ipAddress) {
            const key = `failed_logins:${event.ipAddress}`;
            const count = await this.redis.incr(key);
            await this.redis.expire(key, timeWindow);
            return count >= conditions.maxAttempts;
          }
          break;

        case 'credential-stuffing':
          if (event.ipAddress && event.metadata.username) {
            const key = `credential_stuffing:${event.ipAddress}`;
            await this.redis.sadd(key, event.metadata.username);
            await this.redis.expire(key, timeWindow);
            const uniqueCount = await this.redis.scard(key);
            return uniqueCount >= conditions.uniqueUsernames;
          }
          break;

        case 'account-enumeration':
          if (event.ipAddress) {
            const key = `enumeration:${event.ipAddress}`;
            const count = await this.redis.incr(key);
            await this.redis.expire(key, timeWindow);
            return count >= conditions.maxAttempts;
          }
          break;

        case 'suspicious-location':
          if (event.userId && event.location) {
            const lastLocationKey = `last_location:${event.userId}`;
            const lastLocationData = await this.redis.get(lastLocationKey);
            
            if (lastLocationData) {
              const lastLocation = JSON.parse(lastLocationData);
              const distance = this.calculateDistance(
                event.location.coordinates,
                lastLocation.coordinates
              );
              
              if (distance > conditions.maxDistanceKm) {
                return true;
              }
            }
            
            // Store current location
            await this.redis.setex(
              lastLocationKey,
              86400, // 24 hours
              JSON.stringify(event.location)
            );
          }
          break;

        case 'mfa-bypass-attempt':
          if (event.userId) {
            const key = `mfa_failures:${event.userId}`;
            const count = await this.redis.incr(key);
            await this.redis.expire(key, timeWindow);
            return count >= conditions.maxAttempts;
          }
          break;

        case 'privilege-escalation':
          if (event.userId) {
            const key = `privilege_attempts:${event.userId}`;
            const count = await this.redis.incr(key);
            await this.redis.expire(key, timeWindow);
            return count >= conditions.maxAttempts;
          }
          break;

        case 'data-exfiltration':
          if (event.userId) {
            const key = `data_access:${event.userId}`;
            const count = await this.redis.incr(key);
            await this.redis.expire(key, timeWindow);
            
            const dataSize = event.metadata.dataSizeMB || 0;
            return count >= conditions.maxRequests || dataSize >= conditions.dataThresholdMB;
          }
          break;

        case 'api-abuse':
          if (event.ipAddress) {
            const key = `api_requests:${event.ipAddress}`;
            const count = await this.redis.incr(key);
            await this.redis.expire(key, timeWindow);
            return count >= conditions.maxRequests;
          }
          break;
      }
    } catch (error) {
      this.logger.error('Error checking rule conditions', {
        ruleId: rule.id,
        eventId: event.id,
        error: error.message,
      });
    }

    return false;
  }

  /**
   * Handle threat detection
   */
  private async handleThreatDetection(
    event: SecurityEvent,
    rule: ThreatDetectionRule
  ): Promise<void> {
    const alertId = uuidv4();
    
    const alert: SecurityAlert = {
      id: alertId,
      ruleId: rule.id,
      ruleName: rule.name,
      severity: rule.severity,
      description: `${rule.description} - ${event.description}`,
      affectedUsers: event.userId ? [event.userId] : [],
      affectedIPs: event.ipAddress ? [event.ipAddress] : [],
      eventCount: 1,
      firstSeen: event.timestamp,
      lastSeen: event.timestamp,
      status: 'open',
      notes: [],
      responseActions: rule.responseActions,
    };

    this.activeAlerts.set(alertId, alert);

    // Execute response actions
    for (const action of rule.responseActions) {
      await this.executeResponseAction(action, event, alert);
    }

    // Store alert
    await this.storeAlert(alert);

    this.logger.warn('Threat detected and alert created', {
      alertId,
      ruleId: rule.id,
      severity: rule.severity,
      userId: event.userId,
      ipAddress: event.ipAddress,
    });
  }

  /**
   * Execute security response action
   */
  private async executeResponseAction(
    action: string,
    event: SecurityEvent,
    alert: SecurityAlert
  ): Promise<void> {
    try {
      switch (action) {
        case 'block_ip':
          if (event.ipAddress) {
            await this.blockIPAddress(event.ipAddress, 3600); // 1 hour
          }
          break;

        case 'rate_limit_ip':
          if (event.ipAddress) {
            await this.applyRateLimit(event.ipAddress, 10, 60); // 10 requests per minute
          }
          break;

        case 'lock_account':
          if (event.userId) {
            await this.lockUserAccount(event.userId, 1800); // 30 minutes
          }
          break;

        case 'require_mfa':
          if (event.userId) {
            await this.requireMFAForUser(event.userId);
          }
          break;

        case 'alert_admin':
          await this.sendAdminAlert(alert);
          break;

        case 'alert_user':
          if (event.userId) {
            await this.sendUserAlert(event.userId, alert);
          }
          break;

        case 'log_incident':
          await this.logSecurityIncident(event, alert);
          break;

        case 'notify_security_team':
          await this.notifySecurityTeam(alert);
          break;
      }
    } catch (error) {
      this.logger.error('Failed to execute response action', {
        action,
        alertId: alert.id,
        error: error.message,
      });
    }
  }

  /**
   * Block IP address
   */
  private async blockIPAddress(ipAddress: string, duration: number): Promise<void> {
    this.blockedIPs.add(ipAddress);
    
    await this.redis.setex(`blocked_ip:${ipAddress}`, duration, 'blocked');
    
    this.logger.info('IP address blocked', { ipAddress, duration });
  }

  /**
   * Apply rate limiting to IP
   */
  private async applyRateLimit(
    ipAddress: string,
    limit: number,
    window: number
  ): Promise<void> {
    await this.redis.setex(`rate_limit:${ipAddress}`, window, limit.toString());
    
    this.logger.info('Rate limit applied', { ipAddress, limit, window });
  }

  /**
   * Lock user account
   */
  private async lockUserAccount(userId: string, duration: number): Promise<void> {
    this.lockedAccounts.add(userId);
    
    const lockUntil = new Date(Date.now() + duration * 1000);
    await this.redis.setex(`locked_account:${userId}`, duration, lockUntil.toISOString());
    
    this.logger.info('User account locked', { userId, duration });
  }

  /**
   * Require MFA for user
   */
  private async requireMFAForUser(userId: string): Promise<void> {
    await this.redis.setex(`require_mfa:${userId}`, 86400, 'required'); // 24 hours
    
    this.logger.info('MFA required for user', { userId });
  }

  /**
   * Send admin alert
   */
  private async sendAdminAlert(alert: SecurityAlert): Promise<void> {
    await this.redis.lpush('admin_alerts', JSON.stringify(alert));
    await this.redis.ltrim('admin_alerts', 0, 99); // Keep last 100 alerts
    
    // In production, this would send email/Slack/SMS notifications
    this.logger.info('Admin alert sent', { alertId: alert.id });
  }

  /**
   * Send user alert
   */
  private async sendUserAlert(userId: string, alert: SecurityAlert): Promise<void> {
    await this.redis.lpush(`user_alerts:${userId}`, JSON.stringify(alert));
    await this.redis.ltrim(`user_alerts:${userId}`, 0, 9); // Keep last 10 alerts
    
    // In production, this would send email notifications
    this.logger.info('User alert sent', { userId, alertId: alert.id });
  }

  /**
   * Log security incident
   */
  private async logSecurityIncident(
    event: SecurityEvent,
    alert: SecurityAlert
  ): Promise<void> {
    const incident = {
      id: uuidv4(),
      alertId: alert.id,
      eventId: event.id,
      severity: alert.severity,
      description: alert.description,
      timestamp: new Date(),
      status: 'open',
    };

    await this.redis.lpush('security_incidents', JSON.stringify(incident));
    
    this.logger.info('Security incident logged', { 
      incidentId: incident.id,
      alertId: alert.id 
    });
  }

  /**
   * Notify security team
   */
  private async notifySecurityTeam(alert: SecurityAlert): Promise<void> {
    // In production, this would integrate with security tools like SIEM, PagerDuty, etc.
    this.logger.warn('Security team notified', { 
      alertId: alert.id,
      severity: alert.severity 
    });
  }

  /**
   * Check if IP is blocked
   */
  async isIPBlocked(ipAddress: string): Promise<boolean> {
    if (this.blockedIPs.has(ipAddress)) {
      return true;
    }
    
    const blocked = await this.redis.get(`blocked_ip:${ipAddress}`);
    return blocked !== null;
  }

  /**
   * Check if account is locked
   */
  async isAccountLocked(userId: string): Promise<boolean> {
    if (this.lockedAccounts.has(userId)) {
      return true;
    }
    
    const locked = await this.redis.get(`locked_account:${userId}`);
    return locked !== null;
  }

  /**
   * Get security metrics
   */
  async getSecurityMetrics(): Promise<SecurityMetrics> {
    const [
      totalEvents,
      blockedIPsCount,
      lockedAccountsCount,
      adminAlertsCount,
    ] = await Promise.all([
      this.redis.llen('security_events'),
      this.redis.keys('blocked_ip:*').then(keys => keys.length),
      this.redis.keys('locked_account:*').then(keys => keys.length),
      this.redis.llen('admin_alerts'),
    ]);

    const alerts = Array.from(this.activeAlerts.values());
    
    return {
      totalEvents,
      criticalAlerts: alerts.filter(a => a.severity === 'critical').length,
      highAlerts: alerts.filter(a => a.severity === 'high').length,
      mediumAlerts: alerts.filter(a => a.severity === 'medium').length,
      lowAlerts: alerts.filter(a => a.severity === 'low').length,
      blockedIPs: blockedIPsCount,
      lockedAccounts: lockedAccountsCount,
      failedLogins: 0, // Would be calculated from events
      successfulLogins: 0, // Would be calculated from events
      mfaFailures: 0, // Would be calculated from events
      suspiciousActivities: alerts.length,
      averageResponseTime: 0, // Would be calculated from response times
      topThreats: [], // Would be calculated from events
      topAttackerIPs: [], // Would be calculated from events
    };
  }

  /**
   * Helper methods
   */
  private getLocationFromIP(ipAddress: string): any {
    const geo = geoip.lookup(ipAddress);
    if (geo) {
      return {
        country: geo.country,
        region: geo.region,
        city: geo.city,
        coordinates: [geo.ll[1], geo.ll[0]], // [longitude, latitude]
      };
    }
    return null;
  }

  private getEventDescription(eventType: string, metadata: Record<string, any>): string {
    const descriptions: Record<string, string> = {
      login_failed: 'Failed login attempt',
      login_success: 'Successful login',
      mfa_failed: 'MFA verification failed',
      mfa_success: 'MFA verification successful',
      user_not_found: 'User not found during login',
      unauthorized_access: 'Unauthorized access attempt',
      permission_denied: 'Permission denied',
      api_request: 'API request',
      bulk_data_access: 'Bulk data access',
      large_download: 'Large file download',
    };

    return descriptions[eventType] || `Security event: ${eventType}`;
  }

  private calculateDistance(coord1: [number, number], coord2: [number, number]): number {
    const [lon1, lat1] = coord1;
    const [lon2, lat2] = coord2;
    
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private async storeEventInDatabase(event: SecurityEvent): Promise<void> {
    // Implementation would store in PostgreSQL
    // For now, just log
    this.logger.debug('Event stored in database', { eventId: event.id });
  }

  private async storeAlert(alert: SecurityAlert): Promise<void> {
    // Implementation would store in PostgreSQL
    // For now, just log
    this.logger.debug('Alert stored in database', { alertId: alert.id });
  }

  private startBackgroundTasks(): void {
    // Start cleanup tasks, metric calculations, etc.
    setInterval(() => {
      this.cleanupExpiredData();
    }, 60000); // Every minute
  }

  private async cleanupExpiredData(): Promise<void> {
    // Cleanup expired blocked IPs and locked accounts
    // This would be more sophisticated in production
  }
}