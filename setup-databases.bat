@echo off
echo ========================================
echo GiveMeJobs Database Setup
echo ========================================
echo.

REM Check if Docker is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker is not running!
    echo.
    echo Please start Docker Desktop and try again.
    echo.
    pause
    exit /b 1
)

echo [1/5] Docker is running...
echo.

echo [2/5] Starting databases (PostgreSQL, MongoDB, Redis)...
docker-compose up -d postgres mongodb redis
if %errorlevel% neq 0 (
    echo [ERROR] Failed to start databases!
    pause
    exit /b 1
)
echo.

echo [3/5] Waiting for databases to be ready (15 seconds)...
timeout /t 15 /nobreak >nul
echo.

echo [4/5] Checking database status...
docker-compose ps postgres mongodb redis
echo.

echo [5/5] Running database migrations...
cd packages\backend
call npm run migrate:up
if %errorlevel% neq 0 (
    echo [WARNING] Migrations failed. You may need to run them manually.
    echo Run: cd packages\backend && npm run migrate:up
)
echo.

echo Initializing MongoDB...
call npm run mongo:init
if %errorlevel% neq 0 (
    echo [WARNING] MongoDB initialization failed. You may need to run it manually.
    echo Run: cd packages\backend && npm run mongo:init
)
echo.

cd ..\..

echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo Your databases are now running:
echo   - PostgreSQL: localhost:5432
echo   - MongoDB:    localhost:27017
echo   - Redis:      localhost:6379
echo.
echo Next steps:
echo   1. Verify setup: cd packages\backend && npm run check:all
echo   2. Start backend: npm run dev
echo.
echo To stop databases: docker-compose stop postgres mongodb redis
echo.
pause
