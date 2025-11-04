# Simple GiveMeJobs Platform Deployment Script

Write-Host "🚀 Starting GiveMeJobs Platform Deployment" -ForegroundColor Green

# Check if services are running
Write-Host "`n🔍 Checking Services..." -ForegroundColor Blue

# Check Docker services
try {
    $dockerStatus = docker-compose ps 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Docker services are running" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Starting Docker services..." -ForegroundColor Yellow
        docker-compose up -d
    }
} catch {
    Write-Host "❌ Docker Compose not available" -ForegroundColor Red
}

# Install dependencies
Write-Host "`n📦 Installing Dependencies..." -ForegroundColor Blue
npm install

# Build applications
Write-Host "`n🔨 Building Applications..." -ForegroundColor Blue

# Build backend
Write-Host "Building backend..." -ForegroundColor Yellow
Set-Location packages/backend
npm run build
Set-Location ../..

# Build frontend
Write-Host "Building frontend..." -ForegroundColor Yellow
Set-Location packages/frontend
npm run build
Set-Location ../..

# Start services
Write-Host "`n🚀 Starting Services..." -ForegroundColor Blue

# Start backend in new window
Write-Host "Starting backend on http://localhost:4000" -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD/packages/backend'; npm run dev"

# Wait for backend to start
Start-Sleep -Seconds 5

# Start frontend in new window
Write-Host "Starting frontend on http://localhost:3000" -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD/packages/frontend'; npm run dev"

# Wait for services to start
Write-Host "`n⏳ Waiting for services to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Health checks
Write-Host "`n🏥 Running Health Checks..." -ForegroundColor Blue

# Check backend
try {
    $backendHealth = Invoke-RestMethod -Uri "http://localhost:4000/health" -TimeoutSec 10
    Write-Host "✅ Backend: $($backendHealth.status)" -ForegroundColor Green
} catch {
    Write-Host "❌ Backend health check failed" -ForegroundColor Red
}

# Check frontend
try {
    $frontendHealth = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 10
    if ($frontendHealth.StatusCode -eq 200) {
        Write-Host "✅ Frontend: healthy" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Frontend health check failed" -ForegroundColor Red
}

# Summary
Write-Host "`n🎉 Deployment Complete!" -ForegroundColor Green
Write-Host "===================" -ForegroundColor Green

Write-Host "`n🔗 Access Your Platform:" -ForegroundColor Yellow
Write-Host "• 🌐 Application: http://localhost:3000" -ForegroundColor White
Write-Host "• 🔧 API: http://localhost:4000/api" -ForegroundColor White
Write-Host "• 📋 API Health: http://localhost:4000/health" -ForegroundColor White
Write-Host "• 📊 Grafana: http://localhost:3001" -ForegroundColor White
Write-Host "• 📋 Kibana: http://localhost:5601" -ForegroundColor White

Write-Host "`n📋 Next Steps:" -ForegroundColor Yellow
Write-Host "1. Open http://localhost:3000 in your browser" -ForegroundColor White
Write-Host "2. Create an account or sign in with Google/LinkedIn" -ForegroundColor White
Write-Host "3. Set up your profile and start job searching!" -ForegroundColor White
Write-Host "4. Test the blockchain credential storage" -ForegroundColor White
Write-Host "5. Try the AI-powered resume generation" -ForegroundColor White

Write-Host "`nGiveMeJobs Platform is ready for use!" -ForegroundColor Green