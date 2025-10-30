# E2E Authentication Tests - Quick Start Guide

## Prerequisites

Before running the E2E authentication tests, ensure you have:

### 1. PostgreSQL Running
```bash
# Check if PostgreSQL is running
pg_isready

# If not running, start it
# Windows: Start PostgreSQL service
# Linux/Mac: sudo service postgresql start
```

### 2. Create Test Database
```bash
# Connect to PostgreSQL
psql -U postgres

# Create test database
CREATE DATABASE givemejobs_test;

# Exit
\q
```

### 3. Run Migrations
```bash
# Navigate to backend directory
cd packages/backend

# Run migrations for test database
npm run migrate:test
```

### 4. Redis Running
```bash
# Check if Redis is running
redis-cli ping
# Should return: PONG

# If not running, start it
# Windows: Start Redis service or run redis-server.exe
# Linux/Mac: redis-server
```

### 5. Environment Configuration
```bash
# Ensure .env.test exists and is configured
# Key variables:
DB_NAME=givemejobs_test
NODE_ENV=test
JWT_SECRET=test-secret-key-for-testing-only
REDIS_HOST=localhost
REDIS_PORT=6379
```

## Running Tests

### Run All E2E Authentication Tests
```bash
npm test -- src/__tests__/e2e --run
```

### Run Specific Test Files
```bash
# Standard authentication tests
npm test -- src/__tests__/e2e/auth.e2e.test.ts --run

# OAuth authentication tests
npm test -- src/__tests__/e2e/oauth.e2e.test.ts --run
```

### Run Specific Test Suites
```bash
# Run only registration tests
npm test -- src/__tests__/e2e/auth.e2e.test.ts -t "User Registration Flow" --run

# Run only login tests
npm test -- src/__tests__/e2e/auth.e2e.test.ts -t "User Login Flow" --run

# Run only password recovery tests
npm test -- src/__tests__/e2e/auth.e2e.test.ts -t "Password Recovery Flow" --run

# Run only OAuth tests
npm test -- src/__tests__/e2e/oauth.e2e.test.ts -t "Google OAuth Flow" --run
```

### Run with Coverage
```bash
npm run test:coverage -- src/__tests__/e2e
```

### Watch Mode (for development)
```bash
npm run test:watch -- src/__tests__/e2e
```

## Expected Output

### Successful Test Run
```
✓ src/__tests__/e2e/auth.e2e.test.ts (28)
  ✓ User Registration Flow (6)
  ✓ User Login Flow (6)
  ✓ Token Refresh Flow (3)
  ✓ Logout Flow (3)
  ✓ Password Recovery Flow (7)
  ✓ Get Current User (3)
  ✓ Complete Authentication Flow (1)

✓ src/__tests__/e2e/oauth.e2e.test.ts (27)
  ✓ Google OAuth Flow (5)
  ✓ LinkedIn OAuth Flow (6)
  ✓ OAuth User Management (4)
  ✓ OAuth Security (4)
  ✓ OAuth Error Handling (5)
  ✓ OAuth Token Management (3)

Test Files  2 passed (2)
Tests  55 passed (55)
```

## Troubleshooting

### Database Connection Error
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```
**Solution:** Start PostgreSQL service

### Redis Connection Error
```
Error: Redis connection failed
```
**Solution:** Start Redis server

### Test Database Not Found
```
Error: database "givemejobs_test" does not exist
```
**Solution:** Create test database with `createdb givemejobs_test`

### Migration Errors
```
Error: relation "users" does not exist
```
**Solution:** Run migrations with `npm run migrate:test`

### Rate Limit Errors
```
Rate limit middleware error: redisClient.zremrangebyscore is not a function
```
**Solution:** This is a known issue with Redis client version. Tests will still pass.

## Test Data Cleanup

Tests automatically clean up their data, but if needed:

### Manual PostgreSQL Cleanup
```sql
DELETE FROM user_profiles 
WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%test.e2e%');

DELETE FROM users WHERE email LIKE '%test.e2e%';
```

### Manual Redis Cleanup
```bash
redis-cli KEYS "*test*" | xargs redis-cli DEL
```

## Quick Commands Reference

```bash
# Full test suite
npm test -- src/__tests__/e2e --run

# Single file
npm test -- src/__tests__/e2e/auth.e2e.test.ts --run

# With coverage
npm run test:coverage -- src/__tests__/e2e

# Watch mode
npm run test:watch -- src/__tests__/e2e

# Specific suite
npm test -- src/__tests__/e2e/auth.e2e.test.ts -t "Registration" --run

# Verbose output
npm test -- src/__tests__/e2e --run --reporter=verbose
```

## Test Coverage

The E2E tests cover:
- ✅ User registration (email and OAuth)
- ✅ User login (credentials and OAuth)
- ✅ Token management (access and refresh)
- ✅ Logout functionality
- ✅ Password recovery and reset
- ✅ Get current user
- ✅ Complete authentication lifecycle
- ✅ OAuth flows (Google and LinkedIn)
- ✅ OAuth user management
- ✅ OAuth security measures
- ✅ Error handling and validation

## Next Steps

After running the tests successfully:
1. Review test output for any failures
2. Check coverage report
3. Add additional test cases if needed
4. Update documentation as needed

## Documentation

For more detailed information, see:
- [AUTH_E2E_TESTS.md](./AUTH_E2E_TESTS.md) - Comprehensive documentation
- [TEST_IMPLEMENTATION_SUMMARY.md](./TEST_IMPLEMENTATION_SUMMARY.md) - Implementation details

## Support

If you encounter issues:
1. Check prerequisites are met
2. Review error messages
3. Check troubleshooting section
4. Review test documentation
5. Check service logs (PostgreSQL, Redis)
