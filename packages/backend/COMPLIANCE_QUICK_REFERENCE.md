# Compliance Quick Reference

Quick reference for developers working with data privacy and compliance features.

## Adding Audit Logging to New Routes

### Import the middleware
```typescript
import { 
  auditLogMiddleware, 
  auditDataModificationMiddleware,
  auditGDPRMiddleware 
} from '../middleware/audit-log.middleware';
```

### Apply to routes

**For general operations:**
```typescript
router.post('/resource', 
  auditLogMiddleware('resource.create', 'resource_type'),
  controller.create
);
```

**For operations with resource ID:**
```typescript
router.get('/resource/:id', 
  auditLogMiddleware('resource.read', 'resource_type', (req) => req.params.id),
  controller.get
);
```

**For data modifications:**
```typescript
router.put('/resource/:id',
  auditDataModificationMiddleware('update', 'resource_type', (req) => req.params.id),
  controller.update
);
```

**For GDPR operations:**
```typescript
router.post('/export',
  auditGDPRMiddleware('data_export'),
  controller.export
);
```

## Manual Audit Logging

### Import the service
```typescript
import { auditLogService } from '../services/audit-log.service';
```

### Log authentication events
```typescript
await auditLogService.logAuth(
  'login',
  userId,
  'success',
  { method: 'oauth' },
  req.ip,
  req.get('user-agent')
);
```

### Log data access
```typescript
await auditLogService.logDataAccess(
  'read',
  userId,
  'user_profile',
  profileId,
  'success',
  { fields: ['email', 'name'] },
  req.ip
);
```

### Log data modifications
```typescript
await auditLogService.logDataModification(
  'update',
  userId,
  'user_profile',
  profileId,
  { oldValue: 'old', newValue: 'new' },
  'success',
  req.ip
);
```

### Log credential access
```typescript
await auditLogService.logCredentialAccess(
  'grant_access',
  userId,
  credentialId,
  'success',
  { grantedTo: 'employer@company.com' },
  req.ip
);
```

### Log GDPR events
```typescript
await auditLogService.logGDPR(
  'data_export',
  userId,
  'success',
  { format: 'json' },
  req.ip
);
```

### Log security events
```typescript
await auditLogService.logSecurity(
  'suspicious_activity',
  userId,
  'failure',
  { reason: 'Multiple failed login attempts' },
  req.ip,
  'Account locked'
);
```

## Checking User Consent

```typescript
import { consentService } from '../services/consent.service';

// Check if user has given consent
const hasConsent = await consentService.hasConsent(userId, 'marketing');

if (!hasConsent) {
  return res.status(403).json({ 
    error: 'Marketing consent required' 
  });
}
```

## Recording User Consent

```typescript
await consentService.recordConsent({
  userId,
  consentType: 'privacy_policy',
  consentVersion: '1.0.0',
  granted: true,
  ipAddress: req.ip,
  userAgent: req.get('user-agent')
});
```

## Creating Security Incidents

```typescript
import { securityIncidentService } from '../services/security-incident.service';

const incident = await securityIncidentService.createIncident({
  incidentType: 'data_breach',
  severity: 'critical',
  status: 'detected',
  description: 'Unauthorized access to user database',
  affectedSystems: ['database', 'api'],
  affectedDataTypes: ['email', 'name', 'phone'],
  estimatedAffectedUsers: 1000,
  remediationSteps: [
    'Revoked compromised credentials',
    'Patched security vulnerability',
    'Enhanced monitoring'
  ],
  createdBy: adminUserId
});

// Notify affected users
await securityIncidentService.notifyAffectedUsers(incident.id);

// Report to authorities (GDPR requirement)
await securityIncidentService.reportToAuthorities(incident.id);
```

## Processing Data Export Requests

```typescript
import { gdprService } from '../services/gdpr.service';

// Request data export (async processing)
const request = await gdprService.requestDataExport(userId, 'json');

// Check status
const status = await gdprService.getDataExportRequest(request.id);

// Get all user's export requests
const requests = await gdprService.getUserDataExportRequests(userId);
```

## Processing Account Deletion

```typescript
// Request deletion (30-day grace period)
const request = await gdprService.requestAccountDeletion(
  userId, 
  'No longer need the service'
);

// Cancel deletion (during grace period)
await gdprService.cancelAccountDeletion(request.id);

// Check deletion status
const status = await gdprService.getAccountDeletionRequest(userId);
```

## Querying Audit Logs

```typescript
// Get user's audit logs
const logs = await auditLogService.getUserAuditLogs(userId, 100, 0);

// Get logs for specific resource
const resourceLogs = await auditLogService.getResourceAuditLogs(
  'user_profile',
  profileId,
  50
);

// Get failed auth attempts
const failedAttempts = await auditLogService.getFailedAuthAttempts(
  userId,
  24 // last 24 hours
);

// Get security events
const securityEvents = await auditLogService.getSecurityEvents(24);

// Get statistics
const stats = await auditLogService.getStatistics(userId, 30);
```

## Best Practices

1. **Always log sensitive operations**: Authentication, data access, modifications, and deletions
2. **Include context**: IP address, user agent, and relevant metadata
3. **Log both success and failure**: Helps identify security issues
4. **Use appropriate severity**: Critical for security incidents, info for normal operations
5. **Don't log sensitive data**: Never log passwords, tokens, or PII in audit logs
6. **Check consent before processing**: Verify user consent for marketing and data processing
7. **Respond to incidents quickly**: Use the 72-hour GDPR notification window
8. **Test deletion thoroughly**: Ensure all user data is removed from all systems
9. **Version legal documents**: Track changes to privacy policy and terms of service
10. **Monitor audit logs**: Regularly review for suspicious activity

## Common Patterns

### Protecting sensitive endpoints
```typescript
router.get('/sensitive-data/:id',
  authenticateToken,
  auditLogMiddleware('data.read', 'sensitive_data', (req) => req.params.id),
  async (req, res) => {
    // Your logic here
  }
);
```

### Requiring consent
```typescript
async function requireConsent(req: Request, res: Response, next: NextFunction) {
  const userId = req.user?.id;
  const hasConsent = await consentService.hasConsent(userId, 'data_processing');
  
  if (!hasConsent) {
    return res.status(403).json({ 
      error: 'Data processing consent required',
      consentUrl: '/api/legal/consent'
    });
  }
  
  next();
}
```

### Handling data breaches
```typescript
async function handleDataBreach(
  description: string,
  affectedSystems: string[],
  affectedDataTypes: string[]
) {
  // 1. Create incident
  const incident = await securityIncidentService.createIncident({
    incidentType: 'data_breach',
    severity: 'critical',
    status: 'detected',
    description,
    affectedSystems,
    affectedDataTypes,
    estimatedAffectedUsers: 0,
    remediationSteps: [],
  });

  // 2. Investigate and contain
  await securityIncidentService.updateIncidentStatus(
    incident.id,
    'investigating'
  );

  // 3. Notify users (within 72 hours)
  await securityIncidentService.notifyAffectedUsers(incident.id);

  // 4. Report to authorities
  await securityIncidentService.reportToAuthorities(incident.id);

  // 5. Resolve
  await securityIncidentService.updateIncidentStatus(
    incident.id,
    'resolved',
    {
      rootCause: 'Identified root cause',
      remediationSteps: ['Steps taken to fix']
    }
  );
}
```

## API Endpoints Summary

### GDPR
- `POST /api/gdpr/data-export` - Request data export
- `GET /api/gdpr/data-export` - Get export requests
- `GET /api/gdpr/data-export/:id` - Get specific export
- `POST /api/gdpr/account-deletion` - Request deletion
- `DELETE /api/gdpr/account-deletion` - Cancel deletion
- `GET /api/gdpr/account-deletion` - Get deletion status

### Legal
- `GET /api/legal/privacy-policy` - Get privacy policy
- `GET /api/legal/terms-of-service` - Get terms of service
- `POST /api/legal/consent` - Record consent
- `GET /api/legal/consent` - Get user consents
- `DELETE /api/legal/consent` - Revoke consent

### Security Incidents (Admin)
- `POST /api/security-incidents` - Create incident
- `GET /api/security-incidents` - Get all incidents
- `GET /api/security-incidents/:id` - Get incident
- `PATCH /api/security-incidents/:id/status` - Update status
- `POST /api/security-incidents/:id/notify` - Notify users
- `POST /api/security-incidents/:id/report-authorities` - Report

### Audit Logs
- `GET /api/audit-logs/me` - Get own logs
- `GET /api/audit-logs` - Query logs (admin)
- `GET /api/audit-logs/resource/:type/:id` - Get resource logs (admin)
- `GET /api/audit-logs/failed-auth` - Get failed auth (admin)
- `GET /api/audit-logs/security-events` - Get security events (admin)
- `GET /api/audit-logs/statistics` - Get statistics (admin)
