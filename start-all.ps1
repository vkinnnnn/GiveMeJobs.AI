# GiveMeJobs - Start All Services
# This script starts all required services for the platform

Write-Host "================================" -ForegroundColor Cyan
Write-Host "🚀 GiveMeJobs Platform Startup" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is running
Write-Host "🔍 Checking Docker..." -ForegroundColor Yellow
$dockerRunning = docker ps 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker is not running!" -ForegroundColor Red
    Write-Host "Please start Docker Desktop and try again." -ForegroundColor Yellow
    exit 1
}
Write-Host "✅ Docker is running" -ForegroundColor Green
Write-Host ""

# Start Docker services (PostgreSQL, MongoDB, Redis)
Write-Host "🐳 Starting Docker services..." -ForegroundColor Yellow
docker-compose up -d
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to start Docker services" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Docker services started" -ForegroundColor Green
Write-Host ""

# Wait for databases to be ready
Write-Host "Waiting for databases to be ready (10 seconds)..." -ForegroundColor Yellow
Start-Sleep -Seconds 10
Write-Host "✅ Databases should be ready" -ForegroundColor Green
Write-Host ""

# Start Backend
Write-Host "🔧 Starting Backend Server..." -ForegroundColor Yellow
Write-Host "   Location: http://localhost:4000" -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd packages\backend; npm run dev" -WindowStyle Normal

# Wait a bit for backend to start
Start-Sleep -Seconds 5

# Start Frontend
Write-Host "🎨 Starting Frontend Server..." -ForegroundColor Yellow
Write-Host "   Location: http://localhost:3000" -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd packages\frontend; npm run dev" -WindowStyle Normal

Write-Host ""
Write-Host "================================" -ForegroundColor Green
Write-Host "✅ All Services Started!" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Service URLs:" -ForegroundColor Cyan
Write-Host "   Frontend:  http://localhost:3000" -ForegroundColor White
Write-Host "   Backend:   http://localhost:4000" -ForegroundColor White
Write-Host "   API Docs:  http://localhost:4000/api-docs" -ForegroundColor White
Write-Host ""
Write-Host "🗄️  Database Services:" -ForegroundColor Cyan
Write-Host "   PostgreSQL: localhost:5432" -ForegroundColor White
Write-Host "   MongoDB:    localhost:27017" -ForegroundColor White
Write-Host "   Redis:      localhost:6379" -ForegroundColor White
Write-Host ""
Write-Host "To stop all services:" -ForegroundColor Yellow
Write-Host "   1. Close the PowerShell windows" -ForegroundColor White
Write-Host "   2. Run: docker-compose down" -ForegroundColor White
Write-Host ""
Write-Host "Opening browser in 5 seconds..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Open browser
Start-Process "http://localhost:3000"

Write-Host ""
Write-Host "✨ Enjoy your GiveMeJobs platform!" -ForegroundColor Green
Write-Host ""
