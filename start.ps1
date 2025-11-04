# GiveMeJobs - Start Essential Services
# Starts PostgreSQL, MongoDB, Redis, Backend, and Frontend

Write-Host "================================" -ForegroundColor Cyan
Write-Host "GiveMeJobs - Quick Start" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is running
Write-Host "Checking Docker..." -ForegroundColor Yellow
try {
    docker ps 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "Docker not running"
    }
    Write-Host "[OK] Docker is running" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Docker is not running!" -ForegroundColor Red
    Write-Host "Please start Docker Desktop and try again." -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host ""

# Start essential Docker services
Write-Host "Starting database services..." -ForegroundColor Yellow
docker-compose up -d postgres mongodb redis

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to start Docker services" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "[OK] Database services started" -ForegroundColor Green
Write-Host ""

# Wait for databases
Write-Host "Waiting for databases to initialize (15 seconds)..." -ForegroundColor Yellow
for ($i = 15; $i -gt 0; $i--) {
    Write-Host "  $i seconds remaining..." -ForegroundColor Gray
    Start-Sleep -Seconds 1
}
Write-Host "[OK] Databases ready" -ForegroundColor Green
Write-Host ""

# Start Backend
Write-Host "Starting Backend Server..." -ForegroundColor Yellow
Write-Host "  URL: http://localhost:4000" -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\packages\backend'; Write-Host 'Backend Server' -ForegroundColor Cyan; Write-Host ''; npm run dev"

# Wait for backend
Write-Host "Waiting for backend to start (10 seconds)..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Start Frontend
Write-Host "Starting Frontend Server..." -ForegroundColor Yellow
Write-Host "  URL: http://localhost:3000" -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\packages\frontend'; Write-Host 'Frontend Server' -ForegroundColor Cyan; Write-Host ''; npm run dev"

Write-Host ""
Write-Host "================================" -ForegroundColor Green
Write-Host "All Services Started!" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green
Write-Host ""
Write-Host "Your GiveMeJobs Platform:" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Frontend:  http://localhost:3000" -ForegroundColor White
Write-Host "  Backend:   http://localhost:4000" -ForegroundColor White
Write-Host "  API Docs:  http://localhost:4000/api-docs" -ForegroundColor White
Write-Host ""
Write-Host "Databases:" -ForegroundColor Cyan
Write-Host "  PostgreSQL: localhost:5432" -ForegroundColor White
Write-Host "  MongoDB:    localhost:27017" -ForegroundColor White
Write-Host "  Redis:      localhost:6379" -ForegroundColor White
Write-Host ""
Write-Host "To stop: Close the server windows and run 'docker-compose down'" -ForegroundColor Yellow
Write-Host ""
Write-Host "Opening browser in 5 seconds..." -ForegroundColor Yellow

# Countdown
for ($i = 5; $i -gt 0; $i--) {
    Write-Host "  $i..." -ForegroundColor Gray
    Start-Sleep -Seconds 1
}

# Open browser
Write-Host ""
Write-Host "Launching browser..." -ForegroundColor Green
Start-Process "http://localhost:3000"

Write-Host ""
Write-Host "Enjoy your GiveMeJobs platform!" -ForegroundColor Green
Write-Host ""
Write-Host "Tip: Keep this window open" -ForegroundColor Yellow
Write-Host ""

# Keep window open
Read-Host "Press Enter to stop all services"

# Cleanup
Write-Host ""
Write-Host "Stopping services..." -ForegroundColor Yellow
docker-compose down
Write-Host "[OK] All services stopped" -ForegroundColor Green
