# GiveMeJobs Platform Management Scripts
# Comprehensive script to start, stop, and manage the platform

param(
    [switch]$Start,
    [switch]$Stop,
    [switch]$Essential,
    [switch]$Full,
    [switch]$Deploy,
    [switch]$Status,
    [switch]$Help
)

# Show help if requested or no parameters provided
if ($Help -or (-not ($Start -or $Stop -or $Essential -or $Full -or $Deploy -or $Status))) {
    Write-Host "GiveMeJobs Platform Management Scripts" -ForegroundColor Cyan
    Write-Host "====================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "USAGE:" -ForegroundColor Yellow
    Write-Host "  .\platform-scripts.ps1 [OPTIONS]" -ForegroundColor White
    Write-Host ""
    Write-Host "MAIN COMMANDS:" -ForegroundColor Yellow
    Write-Host "  -Start              Start essential services (databases + backend + frontend)" -ForegroundColor White
    Write-Host "  -Essential          Same as -Start (alias)" -ForegroundColor White
    Write-Host "  -Full               Start all services including monitoring" -ForegroundColor White
    Write-Host "  -Deploy             Production deployment mode" -ForegroundColor White
    Write-Host "  -Stop               Stop all services" -ForegroundColor White
    Write-Host "  -Status             Check service status" -ForegroundColor White
    Write-Host ""
    Write-Host "EXAMPLES:" -ForegroundColor Yellow
    Write-Host "  .\platform-scripts.ps1 -Start         # Quick start (recommended)" -ForegroundColor Gray
    Write-Host "  .\platform-scripts.ps1 -Essential     # Same as -Start" -ForegroundColor Gray
    Write-Host "  .\platform-scripts.ps1 -Full          # Start everything" -ForegroundColor Gray
    Write-Host "  .\platform-scripts.ps1 -Deploy        # Production mode" -ForegroundColor Gray
    Write-Host "  .\platform-scripts.ps1 -Stop          # Stop all services" -ForegroundColor Gray
    Write-Host "  .\platform-scripts.ps1 -Status        # Check what's running" -ForegroundColor Gray
    Write-Host ""
    exit 0
}

# Function to check if Docker is running
function Test-Docker {
    try {
        docker ps 2>&1 | Out-Null
        return ($LASTEXITCODE -eq 0)
    }
    catch {
        return $false
    }
}

# Function to check service status
function Get-ServiceStatus {
    Write-Host "Service Status Check" -ForegroundColor Cyan
    Write-Host "===================" -ForegroundColor Cyan
    Write-Host ""
    
    # Check Docker
    Write-Host "Docker:" -ForegroundColor Yellow
    if (Test-Docker) {
        Write-Host "  Docker is running" -ForegroundColor Green
        
        # Check Docker services
        $dockerServices = docker-compose ps --services 2>$null
        if ($dockerServices) {
            Write-Host "  Docker Compose services:" -ForegroundColor Gray
            foreach ($service in $dockerServices) {
                $status = docker-compose ps $service 2>$null
                if ($status -match "Up") {
                    Write-Host "    $service: Running" -ForegroundColor Green
                } else {
                    Write-Host "    $service: Stopped" -ForegroundColor Red
                }
            }
        }
    } else {
        Write-Host "  Docker is not running" -ForegroundColor Red
    }
    
    Write-Host ""
    
    # Check Backend
    Write-Host "Backend (http://localhost:4000):" -ForegroundColor Yellow
    try {
        $backendHealth = Invoke-RestMethod -Uri "http://localhost:4000/health" -TimeoutSec 5
        Write-Host "  Status: $($backendHealth.status)" -ForegroundColor Green
    } catch {
        Write-Host "  Status: Not running or not accessible" -ForegroundColor Red
    }
    
    # Check Frontend
    Write-Host "Frontend (http://localhost:3000):" -ForegroundColor Yellow
    try {
        $frontendHealth = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 5
        if ($frontendHealth.StatusCode -eq 200) {
            Write-Host "  Status: Running" -ForegroundColor Green
        }
    } catch {
        Write-Host "  Status: Not running or not accessible" -ForegroundColor Red
    }
    
    Write-Host ""
}

# Function to start essential services
function Start-EssentialServices {
    Write-Host "================================" -ForegroundColor Cyan
    Write-Host "GiveMeJobs - Quick Start" -ForegroundColor Cyan
    Write-Host "================================" -ForegroundColor Cyan
    Write-Host ""

    # Check if Docker is running
    Write-Host "Checking Docker..." -ForegroundColor Yellow
    if (-not (Test-Docker)) {
        Write-Host "Docker is not running!" -ForegroundColor Red
        Write-Host "Please start Docker Desktop and try again." -ForegroundColor Yellow
        Write-Host ""
        Read-Host "Press Enter to exit"
        return
    }
    Write-Host "Docker is running" -ForegroundColor Green
    Write-Host ""

    # Start essential Docker services
    Write-Host "Starting database services (PostgreSQL, MongoDB, Redis)..." -ForegroundColor Yellow
    docker-compose up -d postgres mongodb redis

    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to start Docker services" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        return
    }
    Write-Host "Database services started" -ForegroundColor Green
    Write-Host ""

    # Wait for databases
    Write-Host "Waiting for databases to initialize (15 seconds)..." -ForegroundColor Yellow
    for ($i = 15; $i -gt 0; $i--) {
        Write-Host "  $i seconds remaining..." -ForegroundColor Gray
        Start-Sleep -Seconds 1
    }
    Write-Host "Databases ready" -ForegroundColor Green
    Write-Host ""

    # Check dependencies
    Write-Host "Checking dependencies..." -ForegroundColor Yellow
    if (-not (Test-Path "packages\backend\node_modules")) {
        Write-Host "Installing backend dependencies..." -ForegroundColor Yellow
        Set-Location packages\backend
        npm install
        Set-Location ..\..
    }
    if (-not (Test-Path "packages\frontend\node_modules")) {
        Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
        Set-Location packages\frontend
        npm install
        Set-Location ..\..
    }
    Write-Host "Dependencies ready" -ForegroundColor Green
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
    Write-Host "To stop: Run .\platform-scripts.ps1 -Stop" -ForegroundColor Yellow
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
    Write-Host "Tip: Keep this window open to see status messages" -ForegroundColor Yellow
    Write-Host ""
}

# Function to start all services
function Start-AllServices {
    Write-Host "================================" -ForegroundColor Cyan
    Write-Host "GiveMeJobs Platform - Full Startup" -ForegroundColor Cyan
    Write-Host "================================" -ForegroundColor Cyan
    Write-Host ""

    # Check if Docker is running
    Write-Host "Checking Docker..." -ForegroundColor Yellow
    if (-not (Test-Docker)) {
        Write-Host "Docker is not running!" -ForegroundColor Red
        Write-Host "Please start Docker Desktop and try again." -ForegroundColor Yellow
        exit 1
    }
    Write-Host "Docker is running" -ForegroundColor Green
    Write-Host ""

    # Start all Docker services
    Write-Host "Starting all Docker services..." -ForegroundColor Yellow
    docker-compose up -d
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to start Docker services" -ForegroundColor Red
        exit 1
    }
    Write-Host "Docker services started" -ForegroundColor Green
    Write-Host ""

    # Wait for databases to be ready
    Write-Host "Waiting for databases to be ready (10 seconds)..." -ForegroundColor Yellow
    Start-Sleep -Seconds 10
    Write-Host "Databases should be ready" -ForegroundColor Green
    Write-Host ""

    # Start Backend
    Write-Host "Starting Backend Server..." -ForegroundColor Yellow
    Write-Host "   Location: http://localhost:4000" -ForegroundColor Cyan
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd packages\backend; npm run dev" -WindowStyle Normal

    # Wait a bit for backend to start
    Start-Sleep -Seconds 5

    # Start Frontend
    Write-Host "Starting Frontend Server..." -ForegroundColor Yellow
    Write-Host "   Location: http://localhost:3000" -ForegroundColor Cyan
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd packages\frontend; npm run dev" -WindowStyle Normal

    Write-Host ""
    Write-Host "================================" -ForegroundColor Green
    Write-Host "All Services Started!" -ForegroundColor Green
    Write-Host "================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Service URLs:" -ForegroundColor Cyan
    Write-Host "   Frontend:  http://localhost:3000" -ForegroundColor White
    Write-Host "   Backend:   http://localhost:4000" -ForegroundColor White
    Write-Host "   API Docs:  http://localhost:4000/api-docs" -ForegroundColor White
    Write-Host ""
    Write-Host "Database Services:" -ForegroundColor Cyan
    Write-Host "   PostgreSQL: localhost:5432" -ForegroundColor White
    Write-Host "   MongoDB:    localhost:27017" -ForegroundColor White
    Write-Host "   Redis:      localhost:6379" -ForegroundColor White
    Write-Host ""
    Write-Host "Monitoring Services:" -ForegroundColor Cyan
    Write-Host "   Grafana:    http://localhost:3001" -ForegroundColor White
    Write-Host "   Prometheus: http://localhost:9090" -ForegroundColor White
    Write-Host "   Kibana:     http://localhost:5601" -ForegroundColor White
    Write-Host ""
    Write-Host "To stop all services:" -ForegroundColor Yellow
    Write-Host "   Run: .\platform-scripts.ps1 -Stop" -ForegroundColor White
    Write-Host ""
    Write-Host "Opening browser in 5 seconds..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5

    # Open browser
    Start-Process "http://localhost:3000"

    Write-Host ""
    Write-Host "Enjoy your GiveMeJobs platform!" -ForegroundColor Green
    Write-Host ""
}

# Function for deployment mode
function Start-Deployment {
    Write-Host "Starting GiveMeJobs Platform Deployment" -ForegroundColor Green

    # Check if services are running
    Write-Host "`nChecking Services..." -ForegroundColor Blue

    # Check Docker services
    try {
        $dockerStatus = docker-compose ps 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Docker services are running" -ForegroundColor Green
        } else {
            Write-Host "Starting Docker services..." -ForegroundColor Yellow
            docker-compose up -d
        }
    } catch {
        Write-Host "Docker Compose not available" -ForegroundColor Red
    }

    # Install dependencies
    Write-Host "`nInstalling Dependencies..." -ForegroundColor Blue
    npm install

    # Build applications
    Write-Host "`nBuilding Applications..." -ForegroundColor Blue

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
    Write-Host "`nStarting Services..." -ForegroundColor Blue

    # Start backend in new window
    Write-Host "Starting backend on http://localhost:4000" -ForegroundColor Cyan
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD/packages/backend'; npm run dev"

    # Wait for backend to start
    Start-Sleep -Seconds 5

    # Start frontend in new window
    Write-Host "Starting frontend on http://localhost:3000" -ForegroundColor Cyan
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD/packages/frontend'; npm run dev"

    # Wait for services to start
    Write-Host "`nWaiting for services to start..." -ForegroundColor Yellow
    Start-Sleep -Seconds 10

    # Health checks
    Write-Host "`nRunning Health Checks..." -ForegroundColor Blue

    # Check backend
    try {
        $backendHealth = Invoke-RestMethod -Uri "http://localhost:4000/health" -TimeoutSec 10
        Write-Host "Backend: $($backendHealth.status)" -ForegroundColor Green
    } catch {
        Write-Host "Backend health check failed" -ForegroundColor Red
    }

    # Check frontend
    try {
        $frontendHealth = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 10
        if ($frontendHealth.StatusCode -eq 200) {
            Write-Host "Frontend: healthy" -ForegroundColor Green
        }
    } catch {
        Write-Host "Frontend health check failed" -ForegroundColor Red
    }

    # Summary
    Write-Host "`nDeployment Complete!" -ForegroundColor Green
    Write-Host "===================" -ForegroundColor Green

    Write-Host "`nAccess Your Platform:" -ForegroundColor Yellow
    Write-Host "• Application: http://localhost:3000" -ForegroundColor White
    Write-Host "• API: http://localhost:4000/api" -ForegroundColor White
    Write-Host "• API Health: http://localhost:4000/health" -ForegroundColor White
    Write-Host "• Grafana: http://localhost:3001" -ForegroundColor White
    Write-Host "• Kibana: http://localhost:5601" -ForegroundColor White

    Write-Host "`nNext Steps:" -ForegroundColor Yellow
    Write-Host "1. Open http://localhost:3000 in your browser" -ForegroundColor White
    Write-Host "2. Create an account or sign in with Google/LinkedIn" -ForegroundColor White
    Write-Host "3. Set up your profile and start job searching!" -ForegroundColor White
    Write-Host "4. Test the AI-powered resume generation" -ForegroundColor White

    Write-Host "`nGiveMeJobs Platform is ready for use!" -ForegroundColor Green
}

# Function to stop all services
function Stop-AllServices {
    Write-Host "================================" -ForegroundColor Cyan
    Write-Host "Stopping GiveMeJobs Services" -ForegroundColor Cyan
    Write-Host "================================" -ForegroundColor Cyan
    Write-Host ""

    Write-Host "Stopping Docker services..." -ForegroundColor Yellow
    docker-compose down

    if ($LASTEXITCODE -eq 0) {
        Write-Host "All Docker services stopped" -ForegroundColor Green
    } else {
        Write-Host "Some services may still be running" -ForegroundColor Yellow
    }

    Write-Host ""
    Write-Host "Note: Backend and Frontend servers (if running in separate windows)" -ForegroundColor Yellow
    Write-Host "need to be closed manually by closing their PowerShell windows." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Done!" -ForegroundColor Green
    Write-Host ""
}

# Main execution logic
if ($Start -or $Essential) {
    Start-EssentialServices
}
elseif ($Full) {
    Start-AllServices
}
elseif ($Deploy) {
    Start-Deployment
}
elseif ($Stop) {
    Stop-AllServices
}
elseif ($Status) {
    Get-ServiceStatus
}

Write-Host ""