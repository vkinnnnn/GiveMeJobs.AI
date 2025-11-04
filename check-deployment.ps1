#!/usr/bin/env pwsh

# GiveMeJobs Platform - Deployment Health Check

Write-Host "🔍 GiveMeJobs Platform - Health Check" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Green

# Check if services are running
Write-Host "📊 Checking service status..." -ForegroundColor Yellow

try {
    $services = docker-compose -f docker-compose.test.yml ps --format json | ConvertFrom-Json
    
    foreach ($service in $services) {
        $status = if ($service.State -eq "running") { "✅" } else { "❌" }
        Write-Host "   $status $($service.Service): $($service.State)" -ForegroundColor $(if ($service.State -eq "running") { "Green" } else { "Red" })
    }
} catch {
    Write-Host "❌ Could not check service status. Are containers running?" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Check API endpoints
Write-Host "🔧 Checking API endpoints..." -ForegroundColor Yellow

# Backend health check
try {
    $backendResponse = Invoke-WebRequest -Uri "http://localhost:4000/health" -UseBasicParsing -TimeoutSec 10
    if ($backendResponse.StatusCode -eq 200) {
        Write-Host "   ✅ Backend API: http://localhost:4000 (Status: $($backendResponse.StatusCode))" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Backend API: http://localhost:4000 (Status: $($backendResponse.StatusCode))" -ForegroundColor Red
    }
} catch {
    Write-Host "   ❌ Backend API: http://localhost:4000 (Not responding)" -ForegroundColor Red
}

# Frontend health check
try {
    $frontendResponse = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 10
    if ($frontendResponse.StatusCode -eq 200) {
        Write-Host "   ✅ Frontend App: http://localhost:3000 (Status: $($frontendResponse.StatusCode))" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Frontend App: http://localhost:3000 (Status: $($frontendResponse.StatusCode))" -ForegroundColor Red
    }
} catch {
    Write-Host "   ❌ Frontend App: http://localhost:3000 (Not responding)" -ForegroundColor Red
}

Write-Host ""

# Check database connections
Write-Host "🗄️  Checking database connections..." -ForegroundColor Yellow

# PostgreSQL check
try {
    $pgCheck = docker-compose -f docker-compose.test.yml exec -T postgres pg_isready -U givemejobs -d givemejobs_db
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ PostgreSQL: Ready" -ForegroundColor Green
    } else {
        Write-Host "   ❌ PostgreSQL: Not ready" -ForegroundColor Red
    }
} catch {
    Write-Host "   ❌ PostgreSQL: Cannot check" -ForegroundColor Red
}

# MongoDB check
try {
    $mongoCheck = docker-compose -f docker-compose.test.yml exec -T mongodb mongosh --eval "db.adminCommand('ping')" --quiet
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ MongoDB: Ready" -ForegroundColor Green
    } else {
        Write-Host "   ❌ MongoDB: Not ready" -ForegroundColor Red
    }
} catch {
    Write-Host "   ❌ MongoDB: Cannot check" -ForegroundColor Red
}

# Redis check
try {
    $redisCheck = docker-compose -f docker-compose.test.yml exec -T redis redis-cli -a dev_password ping
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ Redis: Ready" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Redis: Not ready" -ForegroundColor Red
    }
} catch {
    Write-Host "   ❌ Redis: Cannot check" -ForegroundColor Red
}

Write-Host ""

# Test key API endpoints
Write-Host "🧪 Testing key API endpoints..." -ForegroundColor Yellow

# Test auth endpoint
try {
    $authResponse = Invoke-WebRequest -Uri "http://localhost:4000/api" -UseBasicParsing -TimeoutSec 5
    if ($authResponse.StatusCode -eq 200) {
        Write-Host "   ✅ API Base: Working" -ForegroundColor Green
    }
} catch {
    Write-Host "   ❌ API Base: Not working" -ForegroundColor Red
}

# Test blockchain endpoint
try {
    $blockchainResponse = Invoke-WebRequest -Uri "http://localhost:4000/api/blockchain/status" -UseBasicParsing -TimeoutSec 5
    if ($blockchainResponse.StatusCode -eq 200) {
        Write-Host "   ✅ Blockchain API: Working" -ForegroundColor Green
    }
} catch {
    Write-Host "   ❌ Blockchain API: Not working" -ForegroundColor Red
}

Write-Host ""
Write-Host "🎯 Health check complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📱 Access your platform:" -ForegroundColor Cyan
Write-Host "   Frontend: http://localhost:3000" -ForegroundColor Gray
Write-Host "   Backend:  http://localhost:4000" -ForegroundColor Gray