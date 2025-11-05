#!/bin/bash

# Start Python Services Script
set -e

echo "Starting GiveMeJobs Python Services..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "Creating .env file from .env.example..."
    cp .env.example .env
    echo "Please update .env file with your configuration before running services."
    exit 1
fi

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3.11 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies
echo "Installing dependencies..."
pip install -r requirements.txt

# Start services based on argument
case "$1" in
    "document")
        echo "Starting Document Processing Service on port 8001..."
        uvicorn app.services.document_processing.main:app --host 0.0.0.0 --port 8001 --reload
        ;;
    "search")
        echo "Starting Semantic Search Service on port 8002..."
        uvicorn app.services.semantic_search.main:app --host 0.0.0.0 --port 8002 --reload
        ;;
    "analytics")
        echo "Starting Analytics Service on port 8003..."
        uvicorn app.services.analytics.main:app --host 0.0.0.0 --port 8003 --reload
        ;;
    "all")
        echo "Starting all services with Docker Compose..."
        docker-compose up --build
        ;;
    "worker")
        echo "Starting Celery worker..."
        celery -A app.core.celery worker --loglevel=info
        ;;
    "beat")
        echo "Starting Celery beat scheduler..."
        celery -A app.core.celery beat --loglevel=info
        ;;
    *)
        echo "Usage: $0 {document|search|analytics|all|worker|beat}"
        echo ""
        echo "Services:"
        echo "  document  - Start Document Processing Service (port 8001)"
        echo "  search    - Start Semantic Search Service (port 8002)"
        echo "  analytics - Start Analytics Service (port 8003)"
        echo "  all       - Start all services with Docker Compose"
        echo "  worker    - Start Celery worker"
        echo "  beat      - Start Celery beat scheduler"
        exit 1
        ;;
esac