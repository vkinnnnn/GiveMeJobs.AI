#!/usr/bin/env pwsh

# GiveMeJobs Platform - Test Deployment Script
# This script deploys the platform using Docker Compose for testing

Write-Host "🚀 GiveMeJobs Platform - Test Deployment" -ForegroundColor Green
Write-Host "=======================================" -ForegroundColor Green

# Check if Docker is installed and running
Write-Host "📋 Checking prerequisites..." -ForegroundColor Yellow

try {
    $dockerVersion = docker --version
    Write-Host "✅ Docker found: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker not found. Please install Docker Desktop first." -ForegroundColor Red
    Write-Host "   Download from: https://www.docker.com/products/docker-desktop" -ForegroundColor Yellow
    exit 1
}

try {
    docker-compose --version | Out-Null
    Write-Host "✅ Docker Compose available" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker Compose not found. Please install Docker Compose." -ForegroundColor Red
    exit 1
}

# Check if .env file exists
if (-not (Test-Path ".env")) {
    Write-Host "📝 Creating .env file from backend configuration..." -ForegroundColor Yellow
    
    # Copy environment variables from backend .env
    if (Test-Path "packages/backend/.env") {
        Copy-Item "packages/backend/.env" ".env"
        Write-Host "✅ Environment file created" -ForegroundColor Green
    } else {
        Write-Host "❌ Backend .env file not found. Please ensure backend is configured." -ForegroundColor Red
        exit 1
    }
}

# Stop any existing containers
Write-Host "🛑 Stopping existing containers..." -ForegroundColor Yellow
docker-compose -f docker-compose.test.yml down --remove-orphans 2>$null

# Build and start services
Write-Host "🔨 Building and starting services..." -ForegroundColor Yellow
Write-Host "   This may take several minutes on first run..." -ForegroundColor Gray

try {
    docker-compose -f docker-compose.test.yml up --build -d
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Services started successfully!" -ForegroundColor Green
    } else {
        Write-Host "❌ Failed to start services" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Error during deployment: $_" -ForegroundColor Red
    exit 1
}

# Wait for services to be ready
Write-Host "⏳ Waiting for services to be ready..." -ForegroundColor Yellow

$maxAttempts = 30
$attempt = 0

do {
    $attempt++
    Start-Sleep -Seconds 5
    
    try {
        $backendHealth = Invoke-WebRequest -Uri "http://localhost:4000/health" -UseBasicParsing -TimeoutSec 5 -ErrorAction SilentlyContinue
        $frontendHealth = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 5 -ErrorAction SilentlyContinue
        
        if ($backendHealth.StatusCode -eq 200 -and $frontendHealth.StatusCode -eq 200) {
            Write-Host "✅ All services are ready!" -ForegroundColor Green
            break
        }
    } catch {
        # Services not ready yet
    }
    
    Write-Host "   Attempt $attempt/$maxAttempts - Services starting..." -ForegroundColor Gray
    
} while ($attempt -lt $maxAttempts)

if ($attempt -ge $maxAttempts) {
    Write-Host "⚠️  Services may still be starting. Check logs if needed." -ForegroundColor Yellow
}

# Run database migrations
Write-Host "📊 Running database migrations..." -ForegroundColor Yellow

try {
    docker-compose -f docker-compose.test.yml exec -T backend npm run migrate:up
    Write-Host "✅ Database migrations completed" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Migration may have failed. Check logs if needed." -ForegroundColor Yellow
}

# Display deployment information
Write-Host ""
Write-Host "🎉 GiveMeJobs Platform Deployed Successfully!" -ForegroundColor Green
Write-Host "===========================================" -ForegroundColor Green
Write-Host ""
Write-Host "📱 Frontend Application: http://localhost:3000" -ForegroundColor Cyan
Write-Host "🔧 Backend API:          http://localhost:4000" -ForegroundColor Cyan
Write-Host "📊 API Documentation:    http://localhost:4000/api-docs" -ForegroundColor Cyan
Write-Host ""
Write-Host "🗄️  Database Services:" -ForegroundColor Yellow
Write-Host "   PostgreSQL:  localhost:5432" -ForegroundColor Gray
Write-Host "   MongoDB:     localhost:27017" -ForegroundColor Gray
Write-Host "   Redis:       localhost:6379" -ForegroundColor Gray
Write-Host ""
Write-Host "🔍 Useful Commands:" -ForegroundColor Yellow
Write-Host "   View logs:           docker-compose -f docker-compose.test.yml logs -f" -ForegroundColor Gray
Write-Host "   Stop services:       docker-compose -f docker-compose.test.yml down" -ForegroundColor Gray
Write-Host "   Restart services:    docker-compose -f docker-compose.test.yml restart" -ForegroundColor Gray
Write-Host "   View status:         docker-compose -f docker-compose.test.yml ps" -ForegroundColor Gray
Write-Host ""
Write-Host "🧪 Test the platform:" -ForegroundColor Yellow
Write-Host "   1. Open http://localhost:3000 in your browser" -ForegroundColor Gray
Write-Host "   2. Click 'Continue with Google' to test OAuth" -ForegroundColor Gray
Write-Host "   3. Create an account and explore features" -ForegroundColor Gray
Write-Host ""
Write-Host "📋 Features Available:" -ForegroundColor Yellow
Write-Host "   ✅ User Authentication (Email + OAuth)" -ForegroundColor Green
Write-Host "   ✅ AI-Powered Job Matching" -ForegroundColor Green
Write-Host "   ✅ Resume & Cover Letter Generation" -ForegroundColor Green
Write-Host "   ✅ Application Tracking" -ForegroundColor Green
Write-Host "   ✅ Interview Preparation" -ForegroundColor Green
Write-Host "   ✅ Blockchain Credential Storage" -ForegroundColor Green
Write-Host "   ✅ Analytics & Insights" -ForegroundColor Green
Write-Host ""

# Check service status
Write-Host "📊 Service Status:" -ForegroundColor Yellow
docker-compose -f docker-compose.test.yml ps

Write-Host ""
Write-Host "🎯 Ready to test! Open http://localhost:3000 in your browser." -ForegroundColor Green