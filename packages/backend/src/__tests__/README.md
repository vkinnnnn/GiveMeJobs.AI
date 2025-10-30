# Profile Service Integration Tests

This directory contains integration tests for the Profile Service, covering complete profile creation and update flows, as well as data validation and error handling.

## Test Coverage

The integration tests cover the following areas:

### Profile Management
- Get user profile
- Update user profile with preferences
- Access control (users can only access their own profiles)
- Authentication requirements

### Skills Management
- Create skills with validation
- Get all skills for a user
- Update skill proficiency and experience
- Delete skills
- Validate proficiency levels (1-5)
- Validate years of experience

### Experience Management
- Create work experience entries
- Get all experience for a user
- Update experience details
- Delete experience entries
- Validate date ranges (end date after start date)
- Validate current positions (no end date)

### Education Management
- Create education records
- Get all education for a user
- Update education details
- Delete education entries
- Validate GPA range (0-4.0)
- Validate date ranges

### Career Goals Management
- Create career goals
- Get all career goals for a user
- Update career goals
- Delete career goals
- Validate required fields

### Complete Profile Flow
- Test creating a complete profile with all components
- Verify all data is properly stored and retrieved

### Error Handling
- Database error handling
- Validation error handling
- Authentication errors
- Authorization errors (403 Forbidden)
- Not found errors (404)

## Prerequisites

Before running the tests, ensure you have:

1. PostgreSQL running locally
2. Redis running locally
3. MongoDB running locally
4. Test database created: `givemejobs_test`

### Create Test Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create test database
CREATE DATABASE givemejobs_test;

# Exit psql
\q
```

### Run Migrations for Test Database

```bash
# Set environment to test
export NODE_ENV=test

# Run migrations
npm run migrate:up
```

## Running Tests

### Run all tests once
```bash
npm test
```

### Run tests in watch mode
```bash
npm run test:watch
```

### Run tests with coverage
```bash
npm run test:coverage
```

### Run specific test file
```bash
npx vitest src/__tests__/profile.integration.test.ts --run
```

## Test Structure

Each test suite follows this structure:

1. **Setup**: Create test user and generate authentication token
2. **Test Execution**: Make HTTP requests to API endpoints
3. **Assertions**: Verify response status, data structure, and values
4. **Cleanup**: Remove test data after each test

## Test Data

All test data uses emails containing "test" to ensure easy cleanup. The cleanup function removes:
- Career goals
- Education records
- Experience entries
- Skills
- User profiles
- Users

## Environment Variables

Tests use the `.env.test` file for configuration. Key variables:

- `DB_NAME`: Should be set to `givemejobs_test`
- `JWT_SECRET`: Test secret for token generation
- `NODE_ENV`: Set to `test`

## Troubleshooting

### Tests fail with database connection errors
- Ensure PostgreSQL is running
- Verify database credentials in `.env.test`
- Check that test database exists

### Tests fail with authentication errors
- Verify JWT_SECRET is set in `.env.test`
- Check that tokens are being generated correctly

### Tests timeout
- Increase timeout in `vitest.config.ts`
- Check database connection performance
- Ensure Redis and MongoDB are running

### Cleanup issues
- Manually clean test data: `DELETE FROM users WHERE email LIKE '%test%'`
- Restart test database if needed

## Best Practices

1. **Isolation**: Each test should be independent
2. **Cleanup**: Always clean up test data
3. **Descriptive Names**: Use clear test descriptions
4. **Assertions**: Test both success and failure cases
5. **Coverage**: Aim for high code coverage

## Requirements Covered

These tests address the following requirements from the spec:

- **Requirement 1.6**: User profile management
- **Requirement 2.1**: Skill assessment and tracking
- **Requirement 2.2**: Career goal setting
- **Requirement 2.5**: Experience and education tracking

## Future Enhancements

- Add performance benchmarks
- Add load testing
- Add security testing (SQL injection, XSS)
- Add API rate limiting tests
- Add concurrent request tests
