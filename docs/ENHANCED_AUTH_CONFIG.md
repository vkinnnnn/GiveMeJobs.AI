# Enhanced Authentication Service Configuration

## Overview

The Enhanced Authentication Service provides advanced security features including JWT refresh token rotation, Multi-Factor Authentication (MFA), Role-Based Access Control (RBAC), and OAuth2/OpenID Connect integration.

## Required Environment Variables

### JWT Configuration
```bash
# JWT secrets for token signing
JWT_SECRET=your-super-secure-jwt-secret-here
JWT_REFRESH_SECRET=your-super-secure-refresh-secret-here

# Token expiration times (optional, defaults provided)
JWT_ACCESS_TOKEN_EXPIRY=15m
JWT_REFRESH_TOKEN_EXPIRY=7d
```

### Database Configuration
```bash
# PostgreSQL connection (required for direct database access)
DATABASE_URL=postgresql://username:password@localhost:5432/givemejobs
```

### Redis Configuration
```bash
# Redis connection (required for session and token storage)
REDIS_URL=redis://localhost:6379
# or
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
```

### OAuth Configuration
```bash
# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# LinkedIn OAuth
LINKEDIN_CLIENT_ID=your-linkedin-client-id
LINKEDIN_CLIENT_SECRET=your-linkedin-client-secret

# GitHub OAuth (optional)
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# Microsoft OAuth (optional)
MICROSOFT_CLIENT_ID=your-microsoft-client-id
MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret
```

### MFA Configuration
```bash
# MFA settings (optional, defaults provided)
MFA_WINDOW=2
MFA_APP_NAME=GiveMeJobs
```

## Database Schema Requirements

The enhanced auth service requires the following database tables:

1. **users** - Extended with role and is_active columns
2. **oauth_accounts** - For OAuth provider integration
3. **password_reset_tokens** - For secure password reset functionality

Run the migration script to add required tables:
```bash
psql $DATABASE_URL -f scripts/migrate-enhanced-auth.sql
```

## Redis Data Structures

The service uses Redis for:

### Session Storage
- Key: `session:{sessionId}`
- Value: JSON serialized SessionData
- TTL: 7 days

### Refresh Tokens
- Key: `refresh_token:{tokenId}`
- Value: JSON serialized RefreshTokenData
- TTL: 7 days

### User Active Tokens
- Key: `user_refresh_tokens:{userId}`
- Value: Set of active token IDs

### User Active Sessions
- Key: `user_sessions:{userId}`
- Value: Set of active session IDs

### MFA Setup Data
- Key: `mfa_setup:{userId}`
- Value: JSON with secret and backup codes
- TTL: 10 minutes

### MFA Backup Codes
- Key: `mfa_backup_codes:{userId}`
- Value: JSON array of backup codes
- TTL: 1 year

## Security Features

### JWT Refresh Token Rotation
- Access tokens expire in 15 minutes
- Refresh tokens expire in 7 days
- Each refresh generates new tokens and invalidates old ones
- Prevents token replay attacks

### Multi-Factor Authentication
- TOTP-based using speakeasy
- QR code generation for easy setup
- Backup codes for recovery
- Configurable time window for token validation

### Session Management
- Comprehensive session tracking
- IP address and user agent logging
- Session invalidation capabilities
- Activity-based session updates

### Role-Based Access Control
- Hierarchical role system (user, moderator, admin)
- Fine-grained permissions
- Middleware integration for route protection

### OAuth2/OpenID Connect
- Support for multiple providers
- Account linking for existing users
- Automatic user creation for new OAuth users
- Token refresh handling

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh-token` - Token refresh
- `GET /api/auth/me` - Get current user

### MFA Management
- `POST /api/auth/mfa/enroll` - Start MFA enrollment
- `POST /api/auth/mfa/verify-setup` - Complete MFA setup
- `POST /api/auth/mfa/verify` - Verify MFA token
- `POST /api/auth/mfa/disable` - Disable MFA

### Session Management
- `GET /api/auth/sessions` - Get user sessions
- `DELETE /api/auth/sessions/:sessionId` - Invalidate session
- `DELETE /api/auth/sessions` - Invalidate all sessions

### OAuth
- `GET /api/auth/oauth/google` - Google OAuth initiation
- `GET /api/auth/oauth/google/callback` - Google OAuth callback
- `GET /api/auth/oauth/linkedin` - LinkedIn OAuth initiation
- `GET /api/auth/oauth/linkedin/callback` - LinkedIn OAuth callback

## Migration from Basic Auth

1. Update environment variables with new required settings
2. Run database migration script
3. Update dependency injection container configuration
4. Update route handlers to use enhanced auth service
5. Test OAuth integrations
6. Enable MFA for admin users

## Monitoring and Logging

The service provides comprehensive logging for:
- Authentication attempts
- Token generation and refresh
- MFA enrollment and verification
- Session management
- OAuth authentication flows
- Security events and errors

All logs include correlation IDs for request tracing and user context for security auditing.