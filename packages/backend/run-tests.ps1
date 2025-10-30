# PowerShell script to run tests on Windows
# Usage: .\run-tests.ps1

Write-Host "Setting up test environment..." -ForegroundColor Cyan

# Set environment to test
$env:NODE_ENV = "test"

# Load test environment variables
if (Test-Path ".env.test") {
    Write-Host "Loading .env.test..." -ForegroundColor Green
    Get-Content .env.test | ForEach-Object {
        if ($_ -match '^([^=]+)=(.*)$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($key, $value, "Process")
        }
    }
} else {
    Write-Host "Warning: .env.test not found" -ForegroundColor Yellow
}

# Check if test database exists
Write-Host "`nChecking test database..." -ForegroundColor Cyan
$dbCheck = psql -U postgres -lqt 2>$null | Select-String -Pattern "givemejobs_test"

if (-not $dbCheck) {
    Write-Host "Creating test database..." -ForegroundColor Yellow
    psql -U postgres -c "CREATE DATABASE givemejobs_test;" 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Test database created successfully" -ForegroundColor Green
    } else {
        Write-Host "Note: Could not create database (may already exist or psql not available)" -ForegroundColor Yellow
    }
}

# Run migrations
Write-Host "`nRunning migrations..." -ForegroundColor Cyan
npm run migrate:test

if ($LASTEXITCODE -ne 0) {
    Write-Host "Migration failed. Exiting..." -ForegroundColor Red
    exit 1
}

# Run tests
Write-Host "`nRunning tests..." -ForegroundColor Cyan
if ($args.Count -gt 0) {
    npm test -- $args
} else {
    npm test
}

Write-Host "`nTests complete!" -ForegroundColor Green
