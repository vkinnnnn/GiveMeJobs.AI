# GiveMeJobs - Start Essential Services Only
# Starts only PostgreSQL, MongoDB, Redis, Backend, and Frontend

Write-Host "================================" -ForegroundColor Cyan
Write-Host "🚀 GiveMeJobs - Quick Start" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is running
Write-Host "🔍 Checking Docker..." -ForegroundColor Yellow
try {
    docker ps 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "Docker not running"
    }
    Write-Host "✅ Docker is running" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker is not running!" -ForegroundColor Red
    Write-Host "Please start Docker Desktop and try again." -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host ""

# Start only essential Docker services
Write-Host "🐳 Starting essential services (PostgreSQL, MongoDB, Redis)..." -ForegroundColor Yellow
docker-compose up -d postgres mongodb redis

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to start Docker services" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "✅ Database services started" -ForegroundColor Green
Write-Host ""

# Wait for databases to be ready
Write-Host "⏳ Waiting for databases to initialize (15 seconds)..." -ForegroundColor Yellow
for ($i = 15; $i -gt 0; $i--) {
    Write-Host "   $i seconds remaining..." -ForegroundColor Gray
    Start-Sleep -Seconds 1
}
Write-Host "✅ Databases ready" -ForegroundColor Green
Write-Host ""

# Check if backend dependencies are installed
Write-Host "📦 Checking backend dependencies..." -ForegroundColor Yellow
if (-not (Test-Path "packages\backend\node_modules")) {
    Write-Host "⚠️  Installing backend dependencies..." -ForegroundColor Yellow
    Set-Location packages\backend
    npm install
    Set-Location ..\..
}
Write-Host "✅ Backend dependencies ready" -ForegroundColor Green
Write-Host ""

# Check if frontend dependencies are installed
Write-Host "📦 Checking frontend dependencies..." -ForegroundColor Yellow
if (-not (Test-Path "packages\frontend\node_modules")) {
    Write-Host "⚠️  Installing frontend dependencies..." -ForegroundColor Yellow
    Set-Location packages\frontend
    npm install
    Set-Location ..\..
}
Write-Host "✅ Frontend dependencies ready" -ForegroundColor Green
Write-Host ""

# Start Backend
Write-Host "🔧 Starting Backend Server..." -ForegroundColor Yellow
Write-Host "   URL: http://localhost:4000" -ForegroundColor Cyan
$backendWindow = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\packages\backend'; Write-Host '🔧 Backend Server' -ForegroundColor Cyan; Write-Host ''; npm run dev" -PassThru

# Wait for backend to start
Write-Host "⏳ Waiting for backend to start (10 seconds)..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Start Frontend
Write-Host "🎨 Starting Frontend Server..." -ForegroundColor Yellow
Write-Host "   URL: http://localhost:3000" -ForegroundColor Cyan
$frontendWindow = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\packages\frontend'; Write-Host '🎨 Frontend Server' -ForegroundColor Cyan; Write-Host ''; npm run dev" -PassThru

Write-Host ""
Write-Host "================================" -ForegroundColor Green
Write-Host "✅ All Services Started!" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Your GiveMeJobs Platform:" -ForegroundColor Cyan
Write-Host ""
Write-Host "   🌐 Frontend:  http://localhost:3000" -ForegroundColor White
Write-Host "   🔧 Backend:   http://localhost:4000" -ForegroundColor White
Write-Host "   📚 API Docs:  http://localhost:4000/api-docs" -ForegroundColor White
Write-Host ""
Write-Host "🗄️  Databases:" -ForegroundColor Cyan
Write-Host "   PostgreSQL: localhost:5432" -ForegroundColor White
Write-Host "   MongoDB:    localhost:27017" -ForegroundColor White
Write-Host "   Redis:      localhost:6379" -ForegroundColor White
Write-Host ""
Write-Host "⏹️  To stop all services:" -ForegroundColor Yellow
Write-Host "   1. Close the Backend and Frontend windows" -ForegroundColor White
Write-Host "   2. Run: docker-compose down" -ForegroundColor White
Write-Host ""
Write-Host "🌐 Opening browser in 5 seconds..." -ForegroundColor Yellow

# Countdown
for ($i = 5; $i -gt 0; $i--) {
    Write-Host "   $i..." -ForegroundColor Gray
    Start-Sleep -Seconds 1
}

# Open browser
Write-Host ""
Write-Host "🚀 Launching browser..." -ForegroundColor Green
Start-Process "http://localhost:3000"

Write-Host ""
Write-Host "✨ Enjoy your GiveMeJobs platform!" -ForegroundColor Green
Write-Host ""
Write-Host "💡 Tip: Keep this window open to see status messages" -ForegroundColor Yellow
Write-Host ""

# Keep window open
Read-Host "Press Enter to stop all services and exit"

# Cleanup
Write-Host ""
Write-Host "🛑 Stopping services..." -ForegroundColor Yellow
docker-compose down
Write-Host "✅ All services stopped" -ForegroundColor Green
