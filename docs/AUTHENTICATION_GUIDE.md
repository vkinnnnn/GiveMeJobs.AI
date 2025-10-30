# Authentication Guide

## Overview

The GiveMeJobs API uses JWT (JSON Web Tokens) for authentication. This guide explains how to authenticate users and manage tokens securely.

## Authentication Flow

### 1. User Registration

```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "firstName": "John",
  "lastName": "Doe",
  "professionalHeadline": "Software Engineer"
}
```

**Response:**
```json
{
  "user": {
    "id": "user-uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe"
  },
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 900,
    "tokenType": "Bearer"
  }
}
```

### 2. User Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response:**
```json
{
  "user": {
    "id": "user-uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe"
  },
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 900,
    "tokenType": "Bearer"
  }
}
```

### 3. Using Access Tokens

Include the access token in the Authorization header for all authenticated requests:

```http
GET /api/users/me
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 4. Refreshing Tokens

Access tokens expire after 15 minutes. Use the refresh token to obtain a new access token:

```http
POST /api/auth/refresh-token
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 900,
  "tokenType": "Bearer"
}
```

## OAuth Authentication

### LinkedIn OAuth

1. **Initiate OAuth Flow:**
```http
GET /api/auth/oauth/linkedin
```

This redirects to LinkedIn's authorization page.

2. **Callback:**
After user authorization, LinkedIn redirects to:
```
/api/auth/oauth/linkedin/callback?code=AUTHORIZATION_CODE
```

3. **Response:**
```json
{
  "user": {
    "id": "user-uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe"
  },
  "tokens": {
    "accessToken": "...",
    "refreshToken": "...",
    "expiresIn": 900,
    "tokenType": "Bearer"
  }
}
```

### Google OAuth

Similar flow to LinkedIn:

1. **Initiate:**
```http
GET /api/auth/oauth/google
```

2. **Callback:**
```
/api/auth/oauth/google/callback?code=AUTHORIZATION_CODE
```

## Multi-Factor Authentication (MFA)

### Enable MFA

```http
POST /api/auth/mfa/enable
Authorization: Bearer <token>
```

**Response:**
```json
{
  "secret": "JBSWY3DPEHPK3PXP",
  "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "backupCodes": [
    "12345678",
    "87654321",
    "11223344"
  ]
}
```

### Verify MFA Setup

```http
POST /api/auth/mfa/verify
Authorization: Bearer <token>
Content-Type: application/json

{
  "token": "123456"
}
```

### Login with MFA

After initial login, if MFA is enabled:

```http
POST /api/auth/mfa/verify-login
Content-Type: application/json

{
  "userId": "user-uuid",
  "token": "123456"
}
```

## Password Management

### Forgot Password

```http
POST /api/auth/forgot-password
Content-Type: application/json

{
  "email": "user@example.com"
}
```

An email with a reset link will be sent to the user.

### Reset Password

```http
POST /api/auth/reset-password
Content-Type: application/json

{
  "token": "reset-token-from-email",
  "newPassword": "NewSecurePassword123!"
}
```

### Change Password

```http
POST /api/auth/change-password
Authorization: Bearer <token>
Content-Type: application/json

{
  "currentPassword": "OldPassword123!",
  "newPassword": "NewSecurePassword123!"
}
```

## Token Management

### Token Expiration

- **Access Token**: 15 minutes
- **Refresh Token**: 7 days

### Token Rotation

Refresh tokens are rotated on each use. The old refresh token becomes invalid when a new one is issued.

### Logout

```http
POST /api/auth/logout
Authorization: Bearer <token>
```

This invalidates the current refresh token.

### Logout All Devices

```http
POST /api/auth/logout-all
Authorization: Bearer <token>
```

This invalidates all refresh tokens for the user.

## Security Best Practices

### Client-Side

1. **Store tokens securely:**
   - Use httpOnly cookies for refresh tokens
   - Store access tokens in memory (not localStorage)
   - Never expose tokens in URLs

2. **Handle token expiration:**
   ```javascript
   async function makeAuthenticatedRequest(url, options) {
     let token = getAccessToken();
     
     try {
       const response = await fetch(url, {
         ...options,
         headers: {
           ...options.headers,
           'Authorization': `Bearer ${token}`
         }
       });
       
       if (response.status === 401) {
         // Token expired, refresh it
         token = await refreshAccessToken();
         
         // Retry request with new token
         return fetch(url, {
           ...options,
           headers: {
             ...options.headers,
             'Authorization': `Bearer ${token}`
           }
         });
       }
       
       return response;
     } catch (error) {
       console.error('Request failed:', error);
       throw error;
     }
   }
   ```

3. **Implement automatic token refresh:**
   ```javascript
   let refreshTimer;
   
   function scheduleTokenRefresh(expiresIn) {
     // Refresh 1 minute before expiration
     const refreshTime = (expiresIn - 60) * 1000;
     
     refreshTimer = setTimeout(async () => {
       await refreshAccessToken();
     }, refreshTime);
   }
   
   async function refreshAccessToken() {
     const refreshToken = getRefreshToken();
     
     const response = await fetch('/api/auth/refresh-token', {
       method: 'POST',
       headers: {
         'Content-Type': 'application/json'
       },
       body: JSON.stringify({ refreshToken })
     });
     
     const data = await response.json();
     
     setAccessToken(data.accessToken);
     setRefreshToken(data.refreshToken);
     scheduleTokenRefresh(data.expiresIn);
     
     return data.accessToken;
   }
   ```

### Server-Side

1. **Validate tokens on every request**
2. **Use strong JWT secrets** (minimum 32 characters)
3. **Implement rate limiting** on auth endpoints
4. **Log authentication events**
5. **Monitor for suspicious activity**

## Error Handling

### Common Authentication Errors

**Invalid Credentials:**
```json
{
  "error": "Invalid email or password",
  "code": "INVALID_CREDENTIALS"
}
```

**Token Expired:**
```json
{
  "error": "Token has expired",
  "code": "TOKEN_EXPIRED"
}
```

**Invalid Token:**
```json
{
  "error": "Invalid token",
  "code": "INVALID_TOKEN"
}
```

**MFA Required:**
```json
{
  "error": "Multi-factor authentication required",
  "code": "MFA_REQUIRED",
  "details": {
    "userId": "user-uuid"
  }
}
```

## Example Implementations

### JavaScript/TypeScript

```typescript
class AuthService {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  
  async login(email: string, password: string) {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });
    
    if (!response.ok) {
      throw new Error('Login failed');
    }
    
    const data = await response.json();
    this.setTokens(data.tokens);
    
    return data.user;
  }
  
  async refreshAccessToken() {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }
    
    const response = await fetch('/api/auth/refresh-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ refreshToken: this.refreshToken })
    });
    
    if (!response.ok) {
      this.clearTokens();
      throw new Error('Token refresh failed');
    }
    
    const data = await response.json();
    this.setTokens(data);
  }
  
  async logout() {
    if (this.accessToken) {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });
    }
    
    this.clearTokens();
  }
  
  private setTokens(tokens: any) {
    this.accessToken = tokens.accessToken;
    this.refreshToken = tokens.refreshToken;
    
    // Store refresh token in httpOnly cookie (server-side)
    // Store access token in memory only
  }
  
  private clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
  }
  
  getAccessToken() {
    return this.accessToken;
  }
}
```

### React Hook

```typescript
import { useState, useEffect } from 'react';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Check if user is authenticated on mount
    checkAuth();
  }, []);
  
  async function checkAuth() {
    try {
      const response = await fetch('/api/users/me', {
        headers: {
          'Authorization': `Bearer ${getAccessToken()}`
        }
      });
      
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setLoading(false);
    }
  }
  
  async function login(email: string, password: string) {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    setUser(data.user);
    
    return data;
  }
  
  async function logout() {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getAccessToken()}`
      }
    });
    
    setUser(null);
  }
  
  return {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user
  };
}
```

## Testing Authentication

### Using cURL

```bash
# Login
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'

# Use access token
curl -X GET http://localhost:4000/api/users/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Refresh token
curl -X POST http://localhost:4000/api/auth/refresh-token \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."}'
```

### Using Postman

1. Create a new request
2. Set method to POST
3. Enter URL: `http://localhost:4000/api/auth/login`
4. Go to Body tab, select raw and JSON
5. Enter credentials
6. Send request
7. Copy access token from response
8. For subsequent requests, go to Authorization tab
9. Select "Bearer Token" type
10. Paste access token

## Troubleshooting

### Token Not Working

1. Check token expiration
2. Verify token format (should start with "eyJ")
3. Ensure "Bearer " prefix in Authorization header
4. Check for whitespace or encoding issues

### OAuth Redirect Issues

1. Verify callback URL is registered with OAuth provider
2. Check CORS settings
3. Ensure HTTPS in production

### MFA Problems

1. Verify time synchronization (TOTP requires accurate time)
2. Check backup codes if token fails
3. Disable and re-enable MFA if issues persist

## Support

For authentication issues:
- Email: auth-support@givemejobs.com
- Documentation: https://docs.givemejobs.com/auth
- Status Page: https://status.givemejobs.com
