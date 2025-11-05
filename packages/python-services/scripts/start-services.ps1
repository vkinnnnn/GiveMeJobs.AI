# Start Python Services Script for Windows
param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("document", "search", "analytics", "all", "worker", "beat")]
    [string]$Service
)

Write-Host "Starting GiveMeJobs Python Services..." -ForegroundColor Green

# Check if .env file exists
if (-not (Test-Path ".env")) {
    Write-Host "Creating .env file from .env.example..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host "Please update .env file with your configuration before running services." -ForegroundColor Red
    exit 1
}

# Check if virtual environment exists
if (-not (Test-Path "venv")) {
    Write-Host "Creating virtual environment..." -ForegroundColor Yellow
    python -m venv venv
}

# Activate virtual environment
& "venv\Scripts\Activate.ps1"

# Install dependencies
Write-Host "Installing dependencies..." -ForegroundColor Yellow
pip install -r requirements.txt

# Start services based on parameter
switch ($Service) {
    "document" {
        Write-Host "Starting Document Processing Service on port 8001..." -ForegroundColor Green
        uvicorn app.services.document_processing.main:app --host 0.0.0.0 --port 8001 --reload
    }
    "search" {
        Write-Host "Starting Semantic Search Service on port 8002..." -ForegroundColor Green
        uvicorn app.services.semantic_search.main:app --host 0.0.0.0 --port 8002 --reload
    }
    "analytics" {
        Write-Host "Starting Analytics Service on port 8003..." -ForegroundColor Green
        uvicorn app.services.analytics.main:app --host 0.0.0.0 --port 8003 --reload
    }
    "all" {
        Write-Host "Starting all services with Docker Compose..." -ForegroundColor Green
        docker-compose up --build
    }
    "worker" {
        Write-Host "Starting Celery worker..." -ForegroundColor Green
        celery -A app.core.celery worker --loglevel=info
    }
    "beat" {
        Write-Host "Starting Celery beat scheduler..." -ForegroundColor Green
        celery -A app.core.celery beat --loglevel=info
    }
}

Write-Host "Service started successfully!" -ForegroundColor Green