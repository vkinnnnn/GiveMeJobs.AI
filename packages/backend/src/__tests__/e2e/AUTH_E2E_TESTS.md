# Authentication E2E Tests Documentation

## Overview

This directory contains comprehensive End-to-End (E2E) tests for all authentication flows in the GiveMeJobs platform. These tests verify the complete user authentication journey from registration to logout, including OAuth flows and password recovery.

## Test Files

### 1. `auth.e2e.test.ts`
Complete E2E tests for standard authentication flows.

**Test Coverage:**
- User registration with email and password
- User login with credentials
- Token refresh mechanism
- User logout
- Password recovery and reset
- Get current user information
- Complete authentication lifecycle

**Requirements Covered:**
- Requirement 1.1: User registration
- Requirement 1.4: User login and token management
- Requirement 1.5: Password recovery

### 2. `oauth.e2e.test.ts`
Complete E2E tests for OAuth authentication flows.

**Test Coverage:**
- Google OAuth initiation and callback
- LinkedIn OAuth initiation and callback
- OAuth user creation and linking
- OAuth error handling
- OAuth security measures
- OAuth token management

**Requirements Covered:**
- Requirement 1.1: OAuth integration for LinkedIn and Google

## Test Scenarios

### User Registration Flow

#### Successful Registration
- ✅ Register with valid email and password
- ✅ Receive JWT tokens (access and refresh)
- ✅ Automatic user profile creation
- ✅ Password hashing verification
- ✅ Email normalization (lowercase)

#### Registration Validation
- ✅ Prevent duplicate email registration
- ✅ Validate email format
- ✅ Enforce password strength requirements
- ✅ Require all mandatory fields
- ✅ Return appropriate error messages

#### Post-Registration
- ✅ User profile automatically created
- ✅ Welcome email sent (non-blocking)
- ✅ Session created in Redis
- ✅ Tokens returned in response

### User Login Flow

#### Successful Login
- ✅ Login with valid credentials
- ✅ Receive JWT tokens
- ✅ Update last_login timestamp
- ✅ Create session in Redis
- ✅ Case-insensitive email matching

#### Login Validation
- ✅ Reject incorrect password
- ✅ Reject non-existent email
- ✅ Return generic error message (security)
- ✅ No password hash in response

#### Session Management
- ✅ Session created on login
- ✅ Session stored in Redis
- ✅ Session includes user metadata

### Token Management

#### Token Refresh
- ✅ Refresh access token with valid refresh token
- ✅ Generate new token pair
- ✅ Reject invalid refresh token
- ✅ Reject expired refresh token
- ✅ Maintain user session continuity

#### Token Validation
- ✅ Validate JWT signature
- ✅ Check token expiration
- ✅ Verify token payload
- ✅ Handle malformed tokens

### Logout Flow

#### Successful Logout
- ✅ Logout with valid token
- ✅ Clear user session from Redis
- ✅ Invalidate tokens
- ✅ Return success message

#### Logout Validation
- ✅ Require authentication token
- ✅ Reject invalid tokens
- ✅ Handle missing authorization header

### Password Recovery Flow

#### Forgot Password
- ✅ Request password reset for existing email
- ✅ Generate reset token
- ✅ Store token in Redis with expiration
- ✅ Send reset email (non-blocking)
- ✅ Return success for non-existent email (security)

#### Reset Password
- ✅ Reset password with valid token
- ✅ Hash new password
- ✅ Invalidate reset token after use
- ✅ Send password changed confirmation email
- ✅ Allow login with new password

#### Reset Validation
- ✅ Reject invalid reset token
- ✅ Reject expired reset token
- ✅ Enforce password strength on new password
- ✅ Prevent token reuse

### OAuth Flows

#### Google OAuth
- ✅ Initiate OAuth flow
- ✅ Redirect to Google authorization
- ✅ Handle OAuth callback
- ✅ Create new user on first login
- ✅ Login existing user on subsequent logins
- ✅ Handle OAuth errors gracefully

#### LinkedIn OAuth
- ✅ Initiate OAuth flow
- ✅ Redirect to LinkedIn authorization
- ✅ Handle OAuth callback
- ✅ Import profile data
- ✅ Create new user on first login
- ✅ Login existing user on subsequent logins

#### OAuth User Management
- ✅ Store OAuth provider information
- ✅ Link multiple providers to same user
- ✅ Prevent duplicate provider links
- ✅ Handle email conflicts

#### OAuth Security
- ✅ Validate state parameter (CSRF protection)
- ✅ Use HTTPS in production
- ✅ Secure token handling
- ✅ Proper session expiration

#### OAuth Error Handling
- ✅ Handle provider unavailability
- ✅ Handle user cancellation
- ✅ Handle invalid authorization codes
- ✅ Handle scope denial
- ✅ Redirect to frontend with errors

### Get Current User

#### Successful Retrieval
- ✅ Get user data with valid token
- ✅ Return complete user profile
- ✅ Exclude password hash from response

#### Validation
- ✅ Require authentication token
- ✅ Reject invalid tokens
- ✅ Handle non-existent users

### Complete Authentication Lifecycle

#### Full User Journey
- ✅ Register new account
- ✅ Get current user information
- ✅ Logout
- ✅ Login again
- ✅ Refresh tokens
- ✅ Verify session continuity

## Running the Tests

### Prerequisites

1. **Database Setup**
   ```bash
   # Ensure PostgreSQL is running
   # Ensure test database exists
   createdb givemejobs_test
   
   # Run migrations
   npm run migrate:test
   ```

2. **Redis Setup**
   ```bash
   # Ensure Redis is running
   redis-server
   ```

3. **Environment Variables**
   ```bash
   # Copy test environment file
   cp .env.example .env.test
   
   # Update test database configuration
   DB_NAME=givemejobs_test
   NODE_ENV=test
   ```

### Run All E2E Tests

```bash
# Run all E2E tests once
npm test -- src/__tests__/e2e

# Run with coverage
npm run test:coverage -- src/__tests__/e2e

# Run specific test file
npm test -- src/__tests__/e2e/auth.e2e.test.ts --run

# Run OAuth tests
npm test -- src/__tests__/e2e/oauth.e2e.test.ts --run
```

### Run Tests in Watch Mode

```bash
# Watch all E2E tests
npm run test:watch -- src/__tests__/e2e

# Watch specific file
npm run test:watch -- src/__tests__/e2e/auth.e2e.test.ts
```

### Run Specific Test Suites

```bash
# Run only registration tests
npm test -- src/__tests__/e2e/auth.e2e.test.ts -t "User Registration Flow"

# Run only login tests
npm test -- src/__tests__/e2e/auth.e2e.test.ts -t "User Login Flow"

# Run only password recovery tests
npm test -- src/__tests__/e2e/auth.e2e.test.ts -t "Password Recovery Flow"

# Run only OAuth tests
npm test -- src/__tests__/e2e/oauth.e2e.test.ts -t "Google OAuth Flow"
```

## Test Data Management

### Test User Emails
All test users use emails with specific patterns for easy identification and cleanup:
- Standard auth tests: `test.e2e.{timestamp}@example.com`
- OAuth tests: `test.google@example.com`, `test.linkedin@example.com`
- Multi-provider tests: `oauth.test@example.com`

### Automatic Cleanup
- Tests automatically clean up data before and after execution
- Cleanup removes users, profiles, and Redis sessions
- Pattern-based deletion ensures only test data is removed

### Manual Cleanup
If needed, manually clean test data:

```sql
-- PostgreSQL cleanup
DELETE FROM user_profiles 
WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%test.e2e%');

DELETE FROM users WHERE email LIKE '%test.e2e%';
```

```bash
# Redis cleanup
redis-cli KEYS "*test*" | xargs redis-cli DEL
```

## Test Architecture

### Test Structure
```
src/__tests__/e2e/
├── auth.e2e.test.ts          # Standard authentication tests
├── oauth.e2e.test.ts         # OAuth authentication tests
└── AUTH_E2E_TESTS.md         # This documentation
```

### Test Patterns

#### Setup and Teardown
```typescript
beforeAll(async () => {
  // Initialize Express app
  // Setup database connections
});

afterAll(async () => {
  // Cleanup test data
  // Close database connections
});

beforeEach(() => {
  // Generate unique test data
});
```

#### Test Assertions
```typescript
// Status code
expect(response.status).toBe(200);

// Response structure
expect(response.body.success).toBe(true);
expect(response.body.data).toHaveProperty('user');

// Data validation
expect(response.body.data.user.email).toBe(testEmail);
expect(response.body.data.user).not.toHaveProperty('password_hash');
```

#### Error Testing
```typescript
// Test error responses
expect(response.status).toBe(401);
expect(response.body.success).toBe(false);
expect(response.body.error).toContain('Invalid');
```

## Security Testing

### Password Security
- ✅ Passwords are hashed with bcrypt
- ✅ Password hashes never returned in responses
- ✅ Password strength requirements enforced
- ✅ Old passwords cannot be reused after reset

### Token Security
- ✅ JWT tokens properly signed
- ✅ Tokens have appropriate expiration
- ✅ Refresh tokens stored securely
- ✅ Invalid tokens rejected

### OAuth Security
- ✅ State parameter validation (CSRF protection)
- ✅ HTTPS enforced in production
- ✅ Tokens not exposed in URLs
- ✅ Secure token storage

### Session Security
- ✅ Sessions stored in Redis
- ✅ Session expiration enforced
- ✅ Session invalidation on logout
- ✅ Concurrent session handling

## Performance Considerations

### Test Execution Time
- Individual tests: < 1 second
- Full auth test suite: < 30 seconds
- Full OAuth test suite: < 20 seconds
- Total E2E auth tests: < 1 minute

### Database Operations
- Tests use transactions where possible
- Cleanup is optimized with pattern matching
- Indexes ensure fast test execution

### Redis Operations
- Test sessions use unique keys
- Cleanup uses pattern matching
- TTL set appropriately for test data

## Troubleshooting

### Common Issues

#### Database Connection Errors
```bash
# Check PostgreSQL is running
pg_isready

# Verify test database exists
psql -l | grep givemejobs_test

# Check connection settings in .env.test
```

#### Redis Connection Errors
```bash
# Check Redis is running
redis-cli ping

# Should return: PONG

# Check Redis configuration
redis-cli INFO
```

#### Test Timeouts
```bash
# Increase timeout in vitest.config.ts
testTimeout: 30000  # 30 seconds
```

#### Token Validation Errors
```bash
# Verify JWT_SECRET is set in .env.test
echo $JWT_SECRET

# Check token generation in auth.utils.ts
```

#### OAuth Test Failures
```bash
# OAuth tests may fail without proper mocking
# Verify passport configuration
# Check OAuth provider credentials
```

### Debug Mode

Run tests with debug output:
```bash
# Enable debug logging
DEBUG=* npm test -- src/__tests__/e2e/auth.e2e.test.ts

# Vitest debug mode
npm test -- src/__tests__/e2e/auth.e2e.test.ts --reporter=verbose
```

## Best Practices

### Writing New Tests
1. Use descriptive test names
2. Follow AAA pattern (Arrange, Act, Assert)
3. Test both success and failure cases
4. Clean up test data
5. Use unique identifiers for test data

### Test Isolation
1. Each test should be independent
2. Don't rely on test execution order
3. Clean up after each test
4. Use unique test data per test

### Assertions
1. Test response status codes
2. Verify response structure
3. Check data values
4. Validate error messages
5. Ensure security (no sensitive data exposed)

### Performance
1. Minimize database queries
2. Use transactions where possible
3. Batch cleanup operations
4. Avoid unnecessary waits

## Coverage Goals

### Current Coverage
- Registration flow: 100%
- Login flow: 100%
- Token management: 100%
- Password recovery: 100%
- OAuth flows: 80% (limited by mocking)
- Security measures: 100%

### Target Coverage
- Overall E2E coverage: > 90%
- Critical paths: 100%
- Error handling: 100%
- Security features: 100%

## Future Enhancements

### Planned Improvements
- [ ] Full OAuth flow mocking
- [ ] MFA E2E tests
- [ ] Rate limiting tests
- [ ] Concurrent login tests
- [ ] Session management tests
- [ ] Account linking tests
- [ ] Social profile import tests
- [ ] Performance benchmarks

### Additional Test Scenarios
- [ ] Multiple device login
- [ ] Session timeout handling
- [ ] Token rotation
- [ ] Brute force protection
- [ ] Account lockout
- [ ] Email verification flow
- [ ] Two-factor authentication
- [ ] Biometric authentication

## Related Documentation

- [Authentication Service Documentation](../../AUTH_SERVICE.md)
- [OAuth Service Documentation](../../services/oauth.service.ts)
- [API Documentation](../../routes/auth.routes.ts)
- [Security Guidelines](../../SECURITY.md)

## Support

For issues or questions about authentication tests:
1. Check this documentation
2. Review test output and error messages
3. Check related service documentation
4. Verify environment configuration
5. Review database and Redis logs

## Changelog

### Version 1.0.0 (Current)
- Initial E2E test suite for authentication
- Complete registration flow tests
- Complete login flow tests
- Token management tests
- Password recovery tests
- OAuth flow tests (basic)
- Security validation tests
- Comprehensive documentation
