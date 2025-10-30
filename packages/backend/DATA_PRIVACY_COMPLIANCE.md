# Data Privacy and Compliance Features

This document describes the data privacy and compliance features implemented in the GiveMeJobs platform.

## Overview

The platform implements comprehensive GDPR compliance features, including:
- Data export functionality
- Account deletion with grace period
- Consent tracking
- Privacy policy and terms of service
- Data breach notification system
- Tamper-proof audit logging

## Features Implemented

### 1. GDPR Compliance (Task 24.1)

#### Data Export
- **Endpoint**: `POST /api/gdpr/data-export`
- Users can request a complete export of their data in JSON or CSV format
- Export includes: user profile, skills, experience, education, applications, documents, job alerts, analytics, and consents
- Exports are processed asynchronously and available for 7 days
- **Endpoints**:
  - `POST /api/gdpr/data-export` - Request data export
  - `GET /api/gdpr/data-export` - Get all export requests
  - `GET /api/gdpr/data-export/:requestId` - Get specific export request

#### Account Deletion
- **Endpoint**: `POST /api/gdpr/account-deletion`
- 30-day grace period before permanent deletion
- Users can cancel deletion during grace period
- Comprehensive data cleanup across PostgreSQL, MongoDB, and Redis
- Blockchain data remains immutable but access is revoked
- **Endpoints**:
  - `POST /api/gdpr/account-deletion` - Request account deletion
  - `DELETE /api/gdpr/account-deletion` - Cancel deletion request
  - `GET /api/gdpr/account-deletion` - Get deletion request status

#### Scheduled Processing
- Automated daily job (2 AM) processes scheduled account deletions
- Configured in `scheduler.service.ts`

### 2. Privacy Policy and Terms of Service (Task 24.2)

#### Legal Documents
- **Privacy Policy**: `GET /api/legal/privacy-policy`
  - Comprehensive privacy policy covering data collection, usage, sharing, retention, and user rights
  - GDPR-compliant with clear explanations of user rights
  - Versioned for tracking changes

- **Terms of Service**: `GET /api/legal/terms-of-service`
  - Complete terms covering account registration, user responsibilities, AI-generated content, intellectual property, and liability
  - Versioned for tracking changes

#### Consent Tracking
- **Database Table**: `consent_tracking`
- Tracks all user consents with:
  - Consent type (terms_of_service, privacy_policy, marketing, data_processing)
  - Consent version
  - Granted/revoked status
  - IP address and user agent for audit trail
  - Timestamps for granted and revoked dates

- **Endpoints**:
  - `POST /api/legal/consent` - Record user consent
  - `GET /api/legal/consent` - Get user's consent history
  - `DELETE /api/legal/consent` - Revoke consent

- **Service**: `consent.service.ts`
  - `recordConsent()` - Record new consent
  - `getUserConsents()` - Get all consents for a user
  - `getActiveConsent()` - Get active consent for specific type
  - `hasConsent()` - Check if user has given consent
  - `revokeConsent()` - Revoke specific consent

### 3. Data Breach Notification System (Task 24.3)

#### Security Incident Management
- **Database Tables**: 
  - `security_incidents` - Track security incidents
  - `incident_notifications` - Track user notifications

#### Incident Tracking
- **Severity Levels**: critical, high, medium, low
- **Status Flow**: detected → investigating → contained → resolved → closed
- **Tracked Information**:
  - Incident type and description
  - Affected systems and data types
  - Estimated affected users
  - Detection, containment, and resolution timestamps
  - Root cause and remediation steps
  - Authority reporting timestamp
  - User notification timestamp

#### Notification System
- **Automatic Notifications**:
  - Email notifications to affected users
  - In-app notifications via WebSocket
  - Admin alerts for critical/high severity incidents
  - Compliance team notifications

- **GDPR Compliance**:
  - 72-hour notification requirement supported
  - Authority reporting tracking
  - User notification tracking
  - Detailed breach information provided

#### Admin Dashboard
- **Endpoints** (Admin only):
  - `POST /api/security-incidents` - Create incident
  - `GET /api/security-incidents` - Get all incidents
  - `GET /api/security-incidents/:id` - Get specific incident
  - `PATCH /api/security-incidents/:id/status` - Update status
  - `POST /api/security-incidents/:id/notify` - Notify affected users
  - `POST /api/security-incidents/:id/report-authorities` - Report to authorities

- **User Endpoints**:
  - `GET /api/security-incidents/notifications` - Get user's notifications
  - `POST /api/security-incidents/notifications/:id/acknowledge` - Acknowledge notification

### 4. Audit Logging (Task 24.4)

#### Tamper-Proof Audit Logs
- **Database Table**: `audit_logs`
- **Tamper-Proof Design**:
  - PostgreSQL triggers prevent UPDATE and DELETE operations
  - Logs are append-only
  - Cannot be modified or deleted once created

#### Logged Events
- **Authentication Events**:
  - Login (success/failure)
  - Logout
  - Registration
  - Password reset
  - MFA enable/disable

- **Data Access Events**:
  - Read operations on sensitive data
  - Data exports

- **Data Modification Events**:
  - Create operations
  - Update operations
  - Delete operations
  - Tracks changes made

- **Credential Access Events**:
  - Credential viewing
  - Access grants
  - Access revocations
  - Verification attempts

- **GDPR Events**:
  - Data export requests
  - Account deletion requests
  - Consent granted
  - Consent revoked

- **Security Events**:
  - Failed authentication attempts
  - Suspicious activities
  - Security incidents

#### Audit Log Information
Each log entry includes:
- User ID
- Action performed
- Resource type and ID
- Success/failure status
- IP address
- User agent
- Request method and path
- Changes made (for modifications)
- Metadata
- Error messages (for failures)
- Timestamp

#### Audit Log Middleware
- **Automatic Logging**: Middleware automatically logs sensitive operations
- **Applied to Routes**:
  - GDPR operations (data export, account deletion, consent)
  - Blockchain credential operations (view, grant, revoke, verify)
  - Authentication operations

#### Query and Analysis
- **User Endpoints**:
  - `GET /api/audit-logs/me` - Get own audit logs

- **Admin Endpoints**:
  - `GET /api/audit-logs` - Query all audit logs with filters
  - `GET /api/audit-logs/resource/:type/:id` - Get logs for specific resource
  - `GET /api/audit-logs/failed-auth` - Get failed authentication attempts
  - `GET /api/audit-logs/security-events` - Get security events
  - `GET /api/audit-logs/statistics` - Get audit statistics

## Database Migrations

The following migrations were created:

1. **1697000000013_create-gdpr-compliance.js**
   - `data_export_requests` table
   - `account_deletion_requests` table
   - `consent_tracking` table

2. **1697000000014_create-security-incidents.js**
   - `security_incidents` table
   - `incident_notifications` table

3. **1697000000015_create-audit-logs.js**
   - `audit_logs` table
   - Tamper-proof triggers and functions

## Services

### GDPR Service (`gdpr.service.ts`)
- Data export request and processing
- Account deletion scheduling and execution
- Data collection from all sources (PostgreSQL, MongoDB, Redis)
- CSV and JSON export generation

### Consent Service (`consent.service.ts`)
- Consent recording and tracking
- Active consent checking
- Consent revocation
- Consent statistics

### Security Incident Service (`security-incident.service.ts`)
- Incident creation and management
- Status updates
- User notification (email + in-app)
- Authority reporting
- Admin alerts

### Audit Log Service (`audit-log.service.ts`)
- Audit log creation
- Specialized logging methods for different event types
- Query and filtering
- Statistics and analysis

## Security Considerations

1. **Data Encryption**: All sensitive data encrypted in transit (TLS) and at rest
2. **Access Control**: RBAC enforced for admin operations
3. **Audit Trail**: Complete audit trail for all sensitive operations
4. **Tamper-Proof Logs**: Audit logs cannot be modified or deleted
5. **IP Tracking**: IP addresses logged for security events
6. **Grace Period**: 30-day grace period for account deletion
7. **Blockchain Immutability**: Credential hashes remain on blockchain but access is revoked

## GDPR Compliance Checklist

- ✅ Right to access (data export)
- ✅ Right to erasure (account deletion)
- ✅ Right to data portability (JSON/CSV export)
- ✅ Right to be informed (privacy policy)
- ✅ Consent tracking and management
- ✅ Data breach notification (72-hour requirement)
- ✅ Audit logging for accountability
- ✅ Data retention policies (30-day deletion)
- ✅ Security measures (encryption, access control)

## Testing

To test the implementation:

1. **Data Export**:
   ```bash
   POST /api/gdpr/data-export
   {
     "format": "json"
   }
   ```

2. **Account Deletion**:
   ```bash
   POST /api/gdpr/account-deletion
   {
     "reason": "No longer need the service"
   }
   ```

3. **Consent Tracking**:
   ```bash
   POST /api/legal/consent
   {
     "consentType": "privacy_policy",
     "consentVersion": "1.0.0",
     "granted": true
   }
   ```

4. **Security Incident** (Admin):
   ```bash
   POST /api/security-incidents
   {
     "incidentType": "unauthorized_access",
     "severity": "high",
     "description": "Suspicious login attempts detected",
     "affectedSystems": ["authentication"],
     "affectedDataTypes": ["user_credentials"]
   }
   ```

5. **Audit Logs**:
   ```bash
   GET /api/audit-logs/me
   ```

## Environment Variables

Add to `.env`:
```
SECURITY_TEAM_EMAILS=security@givemejobs.com,admin@givemejobs.com
```

## Next Steps

1. Run migrations to create new tables
2. Test all endpoints
3. Configure security team email addresses
4. Set up monitoring for security incidents
5. Review and customize legal documents for your jurisdiction
6. Implement frontend UI for GDPR features
7. Add data retention policies for old audit logs
8. Set up automated compliance reports
