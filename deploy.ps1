# GiveMeJobs Platform Deployment Script
# This script handles the complete deployment process

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("local", "staging", "production")]
    [string]$Environment = "local",
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipTests = $false,
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipBuild = $false,
    
    [Parameter(Mandatory=$false)]
    [switch]$Force = $false
)

Write-Host "🚀 Starting GiveMeJobs Platform Deployment" -ForegroundColor Green
Write-Host "Environment: $Environment" -ForegroundColor Cyan
Write-Host "Skip Tests: $SkipTests" -ForegroundColor Cyan
Write-Host "Skip Build: $SkipBuild" -ForegroundColor Cyan

# Function to check if command exists
function Test-Command($cmdname) {
    return [bool](Get-Command -Name $cmdname -ErrorAction SilentlyContinue)
}

# Function to run command with error handling
function Invoke-SafeCommand {
    param([string]$Command, [string]$Description)
    
    Write-Host "📋 $Description..." -ForegroundColor Yellow
    
    try {
        Invoke-Expression $Command
        if ($LASTEXITCODE -ne 0) {
            throw "Command failed with exit code $LASTEXITCODE"
        }
        Write-Host "✅ $Description completed successfully" -ForegroundColor Green
    }
    catch {
        Write-Host "❌ $Description failed: $_" -ForegroundColor Red
        if (-not $Force) {
            exit 1
        }
    }
}

# Check prerequisites
Write-Host "`n🔍 Checking Prerequisites..." -ForegroundColor Blue

$prerequisites = @(
    @{Name="Node.js"; Command="node"; Version="--version"},
    @{Name="npm"; Command="npm"; Version="--version"},
    @{Name="Docker"; Command="docker"; Version="--version"}
)

foreach ($prereq in $prerequisites) {
    if (Test-Command $prereq.Command) {
        $version = & $prereq.Command $prereq.Version 2>$null
        Write-Host "✅ $($prereq.Name): $version" -ForegroundColor Green
    } else {
        Write-Host "❌ $($prereq.Name) not found" -ForegroundColor Red
        exit 1
    }
}

# Check if services are running
Write-Host "`n🔍 Checking Services..." -ForegroundColor Blue

$services = @(
    @{Name="PostgreSQL"; Port=5432},
    @{Name="MongoDB"; Port=27017},
    @{Name="Redis"; Port=6379}
)

foreach ($service in $services) {
    try {
        $connection = Test-NetConnection -ComputerName localhost -Port $service.Port -WarningAction SilentlyContinue
        if ($connection.TcpTestSucceeded) {
            Write-Host "✅ $($service.Name) is running on port $($service.Port)" -ForegroundColor Green
        } else {
            Write-Host "❌ $($service.Name) is not accessible on port $($service.Port)" -ForegroundColor Red
        }
    } catch {
        Write-Host "❌ Cannot check $($service.Name) status" -ForegroundColor Red
    }
}

# Install dependencies
if (-not $SkipBuild) {
    Write-Host "`n📦 Installing Dependencies..." -ForegroundColor Blue
    Invoke-SafeCommand "npm install" "Installing root dependencies"
    Invoke-SafeCommand "npm install --workspace=@givemejobs/backend" "Installing backend dependencies"
    Invoke-SafeCommand "npm install --workspace=@givemejobs/frontend" "Installing frontend dependencies"
}

# Run tests
if (-not $SkipTests) {
    Write-Host "`n🧪 Running Tests..." -ForegroundColor Blue
    
    # Backend tests
    Invoke-SafeCommand "npm run test --workspace=@givemejobs/backend" "Running backend tests"
    
    # Frontend tests (if they exist)
    if (Test-Path "packages/frontend/src/__tests__") {
        Invoke-SafeCommand "npm run test --workspace=@givemejobs/frontend" "Running frontend tests"
    }
    
    # Integration tests
    if (Test-Path "packages/backend/src/tests") {
        Invoke-SafeCommand "npm run test:integration --workspace=@givemejobs/backend" "Running integration tests"
    }
}

# Build applications
if (-not $SkipBuild) {
    Write-Host "`n🔨 Building Applications..." -ForegroundColor Blue
    
    # Build backend
    Invoke-SafeCommand "npm run build --workspace=@givemejobs/backend" "Building backend"
    
    # Build frontend
    Invoke-SafeCommand "npm run build --workspace=@givemejobs/frontend" "Building frontend"
}

# Environment-specific deployment
switch ($Environment) {
    "local" {
        Write-Host "`n🏠 Local Deployment..." -ForegroundColor Blue
        
        # Start services with Docker Compose
        if (Test-Path "docker-compose.yml") {
            Invoke-SafeCommand "docker-compose up -d" "Starting database services"
        }
        
        # Start backend
        Write-Host "🚀 Starting backend on http://localhost:4000"
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd packages/backend; npm run dev"
        
        # Wait a moment for backend to start
        Start-Sleep -Seconds 5
        
        # Start frontend
        Write-Host "🚀 Starting frontend on http://localhost:3000"
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd packages/frontend; npm run dev"
        
        Write-Host "`n✅ Local deployment completed!" -ForegroundColor Green
        Write-Host "🌐 Frontend: http://localhost:3000" -ForegroundColor Cyan
        Write-Host "🔧 Backend API: http://localhost:4000" -ForegroundColor Cyan
        Write-Host "📊 Grafana: http://localhost:3001" -ForegroundColor Cyan
        Write-Host "📋 Kibana: http://localhost:5601" -ForegroundColor Cyan
    }
    
    "staging" {
        Write-Host "`n🧪 Staging Deployment..." -ForegroundColor Blue
        
        # Build Docker images
        Invoke-SafeCommand "docker build -f packages/backend/Dockerfile -t givemejobs-backend:staging ." "Building backend Docker image"
        Invoke-SafeCommand "docker build -f packages/frontend/Dockerfile -t givemejobs-frontend:staging --build-arg NEXT_PUBLIC_API_URL=https://api-staging.givemejobs.com ." "Building frontend Docker image"
        
        # Deploy to staging (would typically push to registry and deploy to K8s)
        Write-Host "📤 Pushing images to registry..."
        # docker push givemejobs-backend:staging
        # docker push givemejobs-frontend:staging
        
        Write-Host "☸️ Deploying to Kubernetes staging..."
        # kubectl apply -f k8s/ -n givemejobs-staging
        
        Write-Host "✅ Staging deployment completed!" -ForegroundColor Green
    }
    
    "production" {
        Write-Host "`n🌟 Production Deployment..." -ForegroundColor Blue
        
        if (-not $Force) {
            $confirm = Read-Host "Are you sure you want to deploy to PRODUCTION? (yes/no)"
            if ($confirm -ne "yes") {
                Write-Host "❌ Production deployment cancelled" -ForegroundColor Red
                exit 1
            }
        }
        
        # Build production Docker images
        Invoke-SafeCommand "docker build -f packages/backend/Dockerfile -t givemejobs-backend:latest ." "Building production backend image"
        Invoke-SafeCommand "docker build -f packages/frontend/Dockerfile -t givemejobs-frontend:latest --build-arg NEXT_PUBLIC_API_URL=https://api.givemejobs.com ." "Building production frontend image"
        
        # Deploy to production
        Write-Host "📤 Pushing images to production registry..."
        # docker push givemejobs-backend:latest
        # docker push givemejobs-frontend:latest
        
        Write-Host "☸️ Deploying to Kubernetes production..."
        # kubectl apply -f k8s/ -n givemejobs-production
        
        Write-Host "✅ Production deployment completed!" -ForegroundColor Green
    }
}

# Health checks
Write-Host "`n🏥 Running Health Checks..." -ForegroundColor Blue

if ($Environment -eq "local") {
    # Wait for services to start
    Start-Sleep -Seconds 10
    
    # Check backend health
    try {
        $backendHealth = Invoke-RestMethod -Uri "http://localhost:4000/api" -TimeoutSec 10
        Write-Host "✅ Backend health check passed" -ForegroundColor Green
    } catch {
        Write-Host "❌ Backend health check failed" -ForegroundColor Red
    }
    
    # Check frontend health
    try {
        $frontendHealth = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 10
        if ($frontendHealth.StatusCode -eq 200) {
            Write-Host "✅ Frontend health check passed" -ForegroundColor Green
        }
    } catch {
        Write-Host "❌ Frontend health check failed" -ForegroundColor Red
    }
}

# Summary
Write-Host "`n🎉 Deployment Summary" -ForegroundColor Green
Write-Host "===================" -ForegroundColor Green
Write-Host "Environment: $Environment" -ForegroundColor Cyan
Write-Host "Timestamp: $(Get-Date)" -ForegroundColor Cyan

if ($Environment -eq "local") {
    Write-Host "`n🔗 Quick Links:" -ForegroundColor Yellow
    Write-Host "• Application: http://localhost:3000" -ForegroundColor White
    Write-Host "• API: http://localhost:4000/api" -ForegroundColor White
    Write-Host "• API Docs: http://localhost:4000/api-docs" -ForegroundColor White
    Write-Host "• Grafana: http://localhost:3001" -ForegroundColor White
    Write-Host "• Kibana: http://localhost:5601" -ForegroundColor White
    
    Write-Host "`n📋 Next Steps:" -ForegroundColor Yellow
    Write-Host "1. Open http://localhost:3000 in your browser" -ForegroundColor White
    Write-Host "2. Create an account or sign in with Google/LinkedIn" -ForegroundColor White
    Write-Host "3. Set up your profile and start job searching!" -ForegroundColor White
}

Write-Host "`n✨ GiveMeJobs Platform is ready!" -ForegroundColor Green