# Running Profile Integration Tests

## Quick Start

To run the profile integration tests, follow these steps:

### 1. Ensure Services are Running

Make sure the following services are running:
- PostgreSQL (port 5432)
- Redis (port 6379)
- MongoDB (port 27017)

You can start them using Docker Compose:
```bash
docker-compose up -d
```

### 2. Set Up Test Database

Create the test database and run migrations:

**On Linux/Mac:**
```bash
# Create test database (if not exists)
psql -U postgres -c "CREATE DATABASE givemejobs_test;"

# Run migrations for test database
NODE_ENV=test npm run migrate:up
```

**On Windows PowerShell:**
```powershell
# Create test database (if not exists)
psql -U postgres -c "CREATE DATABASE givemejobs_test;"

# Run migrations for test database
npm run migrate:test
```

**Or use the PowerShell script (Windows):**
```powershell
cd packages/backend
.\run-tests.ps1
```

### 3. Run Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode (for development)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

## Test Output

The tests will output:
- ✓ for passing tests
- ✗ for failing tests
- Test execution time
- Coverage report (if using --coverage)

## Expected Results

All tests should pass if:
- Database is properly configured
- All migrations have been run
- Services (PostgreSQL, Redis, MongoDB) are accessible
- Environment variables are correctly set

## Troubleshooting

If tests fail:

1. **Check database connection**
   ```bash
   psql -U postgres -d givemejobs_test -c "SELECT 1;"
   ```

2. **Verify migrations**
   ```bash
   NODE_ENV=test npm run migrate:up
   ```

3. **Check environment variables**
   - Ensure `.env.test` exists
   - Verify database credentials

4. **Clean test data**
   ```bash
   psql -U postgres -d givemejobs_test -c "DELETE FROM users WHERE email LIKE '%test%';"
   ```

## CI/CD Integration

To run tests in CI/CD pipeline:

```yaml
# Example GitHub Actions workflow
- name: Run Tests
  run: |
    npm run migrate:up
    npm test
  env:
    NODE_ENV: test
    DB_HOST: localhost
    DB_NAME: givemejobs_test
```
