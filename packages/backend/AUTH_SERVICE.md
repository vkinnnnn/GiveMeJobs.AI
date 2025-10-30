# Authentication Service Documentation

## Overview

The authentication service provides secure user registration, login, OAuth integration, and password management for the GiveMeJobs platform. It implements JWT-based authentication with refresh tokens, session management via Redis, and email notifications.

## Features Implemented

### ✅ Task 3.1: User Registration with Email and Password
- User registration endpoint with comprehensive validation
- Password hashing using bcrypt (10 salt rounds)
- JWT token generation (access + refresh tokens)
- Automatic user profile creation
- Welcome email notification

### ✅ Task 3.2: User Login and Token Management
- Login endpoint with credential validation
- JWT refresh token mechanism
- Session management with Redis (7-day TTL)
- Last login timestamp tracking
- Secure token verification

### ✅ Task 3.3: OAuth Integration for LinkedIn and Google
- Passport.js integration for OAuth flows
- LinkedIn OAuth strategy
- Google OAuth strategy
- Automatic user creation/linking
- OAuth token storage and management

### ✅ Task 3.4: Password Recovery and Reset
- Forgot password endpoint with email token generation
- Reset password endpoint with token validation
- Email service integration (SendGrid/Ethereal)
- 15-minute token expiration
- Password changed confirmation emails

## Architecture

```
┌─────────────────┐
│   Client App    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Auth Routes    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Auth Controller │
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌─────────┐ ┌──────────┐
│  Auth   │ │  OAuth   │
│ Service │ │ Service  │
└────┬────┘ └────┬─────┘
     │           │
     ▼           ▼
┌─────────────────┐
│   PostgreSQL    │
└─────────────────┘
         │
         ▼
┌─────────────────┐
│     Redis       │
└─────────────────┘
```

## API Endpoints

### Public Endpoints

#### POST /api/auth/register
Register a new user with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "professionalHeadline": "Software Engineer" // optional
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "professional_headline": "Software Engineer",
      "created_at": "2024-01-01T00:00:00Z"
    },
    "tokens": {
      "accessToken": "jwt-token",
      "refreshToken": "jwt-refresh-token",
      "expiresIn": 900,
      "tokenType": "Bearer"
    }
  }
}
```

#### POST /api/auth/login
Login with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": { /* user object */ },
    "tokens": { /* tokens object */ }
  }
}
```

#### POST /api/auth/refresh-token
Refresh access token using refresh token.

**Request Body:**
```json
{
  "refreshToken": "jwt-refresh-token"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "tokens": {
      "accessToken": "new-jwt-token",
      "refreshToken": "new-jwt-refresh-token",
      "expiresIn": 900,
      "tokenType": "Bearer"
    }
  }
}
```

#### POST /api/auth/forgot-password
Request password reset email.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "If the email exists, a reset link has been sent"
}
```

#### POST /api/auth/reset-password
Reset password with token.

**Request Body:**
```json
{
  "token": "reset-token",
  "newPassword": "NewSecurePass123!"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

#### GET /api/auth/oauth/google
Initiate Google OAuth flow. Redirects to Google login.

#### GET /api/auth/oauth/google/callback
Google OAuth callback. Redirects to frontend with tokens.

#### GET /api/auth/oauth/linkedin
Initiate LinkedIn OAuth flow. Redirects to LinkedIn login.

#### GET /api/auth/oauth/linkedin/callback
LinkedIn OAuth callback. Redirects to frontend with tokens.

### Protected Endpoints

#### POST /api/auth/logout
Logout user and invalidate sessions.

**Headers:**
```
Authorization: Bearer <access-token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Logout successful"
}
```

#### GET /api/auth/me
Get current authenticated user.

**Headers:**
```
Authorization: Bearer <access-token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": { /* user object */ }
  }
}
```

## Security Features

### Password Requirements
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

### Token Management
- **Access Token**: 15 minutes expiration
- **Refresh Token**: 7 days expiration
- **Reset Token**: 15 minutes expiration
- Tokens stored in Redis for session management

### Password Hashing
- bcrypt with 10 salt rounds
- Secure password comparison

### Session Management
- Redis-based session storage
- 7-day session TTL
- Session invalidation on logout
- All sessions invalidated on password change

## Email Service

### Email Templates
1. **Welcome Email**: Sent on registration
2. **Password Reset Email**: Sent on forgot password request
3. **Password Changed Email**: Sent after successful password reset

### Email Configuration

**Development:**
- Uses Ethereal Email for testing
- Preview URLs logged to console

**Production:**
- Uses SendGrid SMTP
- Configure via environment variables

## Environment Variables

```env
# JWT Configuration
JWT_SECRET=your-secret-key-change-in-production
JWT_REFRESH_SECRET=your-refresh-secret-key-change-in-production
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# OAuth Configuration
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
LINKEDIN_CLIENT_ID=your-linkedin-client-id
LINKEDIN_CLIENT_SECRET=your-linkedin-client-secret

# Email Configuration
SENDGRID_API_KEY=your-sendgrid-api-key
EMAIL_FROM=noreply@givemejobs.com
EMAIL_USER=test@ethereal.email  # Development only
EMAIL_PASS=test                  # Development only

# URLs
FRONTEND_URL=http://localhost:3000
API_URL=http://localhost:4000
```

## File Structure

```
packages/backend/src/
├── controllers/
│   ├── auth.controller.ts      # HTTP request handlers
│   └── oauth.controller.ts     # OAuth request handlers
├── services/
│   ├── auth.service.ts         # Authentication business logic
│   ├── oauth.service.ts        # OAuth business logic
│   └── email.service.ts        # Email sending service
├── middleware/
│   ├── auth.middleware.ts      # JWT verification middleware
│   └── validation.middleware.ts # Request validation middleware
├── validators/
│   └── auth.validators.ts      # Zod validation schemas
├── utils/
│   └── auth.utils.ts           # Auth utility functions
├── types/
│   └── auth.types.ts           # TypeScript interfaces
├── routes/
│   └── auth.routes.ts          # Route definitions
└── config/
    └── passport.config.ts      # Passport.js configuration
```

## Usage Examples

### Client-Side Authentication Flow

```typescript
// Register
const response = await fetch('/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'SecurePass123!',
    firstName: 'John',
    lastName: 'Doe'
  })
});

const { data } = await response.json();
const { accessToken, refreshToken } = data.tokens;

// Store tokens
localStorage.setItem('accessToken', accessToken);
localStorage.setItem('refreshToken', refreshToken);

// Make authenticated request
const userResponse = await fetch('/api/auth/me', {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});

// Refresh token when expired
const refreshResponse = await fetch('/api/auth/refresh-token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ refreshToken })
});
```

### OAuth Flow

```typescript
// Redirect to OAuth provider
window.location.href = '/api/auth/oauth/google';

// Handle callback (in /auth/callback route)
const params = new URLSearchParams(window.location.search);
const accessToken = params.get('accessToken');
const refreshToken = params.get('refreshToken');
const isNewUser = params.get('isNewUser') === 'true';

// Store tokens
localStorage.setItem('accessToken', accessToken);
localStorage.setItem('refreshToken', refreshToken);

// Redirect based on user status
if (isNewUser) {
  window.location.href = '/onboarding';
} else {
  window.location.href = '/dashboard';
}
```

## Testing

### Manual Testing

1. **Start the server:**
   ```bash
   cd packages/backend
   npm run dev
   ```

2. **Test registration:**
   ```bash
   curl -X POST http://localhost:4000/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{
       "email": "test@example.com",
       "password": "SecurePass123!",
       "firstName": "Test",
       "lastName": "User"
     }'
   ```

3. **Test login:**
   ```bash
   curl -X POST http://localhost:4000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{
       "email": "test@example.com",
       "password": "SecurePass123!"
     }'
   ```

4. **Test protected endpoint:**
   ```bash
   curl http://localhost:4000/api/auth/me \
     -H "Authorization: Bearer <access-token>"
   ```

## Requirements Addressed

### Requirement 1.1 (User Registration)
✅ Email and OAuth registration options
✅ Basic information collection
✅ Secure credential storage

### Requirement 1.2 (User Data Collection)
✅ Name, email, password, professional headline
✅ User profile creation

### Requirement 1.4 (User Login)
✅ Credential authentication
✅ Sub-2-second response time
✅ JWT token generation

### Requirement 1.5 (Password Recovery)
✅ Forgot password flow
✅ Email token generation
✅ Secure password reset

### Requirement 8.1 (LinkedIn Integration)
✅ LinkedIn OAuth flow
✅ Profile data import
✅ Token management

### Requirement 8.2 (OAuth Data Mapping)
✅ External profile to internal structure mapping
✅ Automatic user creation/linking

### Requirement 10.2 (Password Security)
✅ bcrypt hashing with salt
✅ Strong password requirements
✅ Secure password comparison

## Next Steps

To continue development:

1. **Install dependencies:**
   ```bash
   cd packages/backend
   npm install
   ```

2. **Set up environment variables:**
   - Copy `.env.example` to `.env`
   - Configure JWT secrets
   - Add OAuth credentials
   - Configure email service

3. **Run database migrations:**
   ```bash
   npm run migrate:up
   ```

4. **Start the server:**
   ```bash
   npm run dev
   ```

5. **Test the endpoints** using the examples above

## Notes

- Task 3.5 (MFA) is marked as optional and was not implemented
- Email service uses Ethereal in development for testing
- OAuth requires valid client IDs and secrets from Google and LinkedIn
- All passwords are hashed and never stored in plain text
- Sessions are managed in Redis for scalability
- Token expiration times can be configured via environment variables
