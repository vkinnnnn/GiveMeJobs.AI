# Windows Testing Guide

Quick reference for running tests on Windows PowerShell.

## The Problem

On Windows PowerShell, this doesn't work:
```bash
NODE_ENV=test npm run migrate:up  # ❌ Fails on Windows
```

## The Solutions

### Solution 1: Use PowerShell Script (Recommended)

```powershell
cd packages/backend
.\run-tests.ps1
```

This script automatically:
- Sets up the test environment
- Loads .env.test variables
- Creates test database if needed
- Runs migrations
- Executes tests

### Solution 2: Use npm Script

```powershell
npm run migrate:test
```

This uses the `migrate:test` script which reads from `TEST_DATABASE_URL` in `.env.test`.

### Solution 3: Set Environment Variable Manually

```powershell
# Set the variable
$env:NODE_ENV="test"

# Run the command
npm run migrate:up
```

Or in one line:
```powershell
$env:NODE_ENV="test"; npm run migrate:up
```

## Quick Test Commands

```powershell
# Run all tests
npm test

# Run specific test file
npm test -- job-matching.test.ts

# Run with coverage
npm run test:coverage

# Watch mode (for development)
npm run test:watch
```

## Environment Variables in PowerShell

### View Environment Variable
```powershell
$env:NODE_ENV
```

### Set Environment Variable (Current Session)
```powershell
$env:NODE_ENV = "test"
```

### Load from .env.test
```powershell
Get-Content .env.test | ForEach-Object {
    if ($_ -match '^([^=]+)=(.*)$') {
        $key = $matches[1].Trim()
        $value = $matches[2].Trim()
        [Environment]::SetEnvironmentVariable($key, $value, "Process")
    }
}
```

## Complete Test Setup (Windows)

```powershell
# 1. Navigate to backend
cd packages/backend

# 2. Create test database (if psql is available)
psql -U postgres -c "CREATE DATABASE givemejobs_test;"

# 3. Run migrations
npm run migrate:test

# 4. Run tests
npm test
```

## Troubleshooting

### "psql is not recognized"

PostgreSQL command-line tools aren't in your PATH. Either:
- Add PostgreSQL bin directory to PATH
- Use pgAdmin to create the database manually
- Use Docker (recommended)

### "Cannot connect to database"

Make sure PostgreSQL is running:
```powershell
# Check if running (if using Docker)
docker ps | Select-String postgres

# Start services
docker-compose up -d
```

### "Migration failed"

Check your .env.test file has the correct database URL:
```
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/givemejobs_test
```

## Why This Happens

PowerShell uses different syntax than bash:

| Bash (Linux/Mac) | PowerShell (Windows) |
|------------------|----------------------|
| `export VAR=value` | `$env:VAR="value"` |
| `VAR=value command` | `$env:VAR="value"; command` |
| `&&` | `;` |
| `\` (line continuation) | `` ` `` (backtick) |

## Additional Resources

- [PowerShell Environment Variables](https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_environment_variables)
- [npm scripts on Windows](https://docs.npmjs.com/cli/v9/using-npm/scripts#windows)
- [cross-env package](https://www.npmjs.com/package/cross-env) (alternative solution)
