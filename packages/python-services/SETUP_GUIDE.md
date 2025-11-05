# Python Services Setup Guide

## Quick Start

### For Development (Windows/Mac/Linux)

```bash
cd packages/python-services

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run tests
pytest

# Start service
uvicorn app.services.analytics.main:app --reload --port 8001
```

### For Production (Linux/Docker)

```bash
cd packages/python-services

# Install production dependencies (includes scikit-learn)
pip install -r requirements-prod.txt

# Run with production settings
uvicorn app.services.analytics.main:app --host 0.0.0.0 --port 8001 --workers 4
```

## Environment Setup

### 1. Create .env File

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Service Configuration
SERVICE_NAME=givemejobs-python-services
ENVIRONMENT=development
DEBUG=true

# API Configuration
API_HOST=0.0.0.0
API_PORT=8001
API_PREFIX=/api/v1

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/givemejobs
REDIS_URL=redis://localhost:6379/0

# OpenAI
OPENAI_API_KEY=your-openai-api-key

# Pinecone
PINECONE_API_KEY=your-pinecone-api-key
PINECONE_ENVIRONMENT=your-pinecone-environment
PINECONE_INDEX_NAME=jobs-index

# Celery
CELERY_BROKER_URL=redis://localhost:6379/1
CELERY_RESULT_BACKEND=redis://localhost:6379/2

# Security
SECRET_KEY=your-secret-key-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Service URLs
NODEJS_BACKEND_URL=http://localhost:3000

# Monitoring (optional)
SENTRY_DSN=your-sentry-dsn
ENABLE_METRICS=true
```

### 2. Install Dependencies

#### Option A: Base Installation (Works on all platforms)
```bash
pip install -r requirements.txt
```

This installs core dependencies without scikit-learn. The analytics service will use a simplified ML model.

#### Option B: Production Installation (Linux/Docker recommended)
```bash
pip install -r requirements-prod.txt
```

This includes scikit-learn for full ML capabilities. **Note**: May have compilation issues on Windows with Python 3.13.

#### Option C: Development Installation
```bash
pip install -r requirements-dev.txt
```

Includes all dependencies plus development tools (black, flake8, mypy, etc.)

### 3. Run Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app --cov-report=html

# Run specific test file
pytest app/services/analytics/test_service.py

# Run with verbose output
pytest -v

# Run and stop on first failure
pytest -x
```

### 4. Start Services

#### Analytics Service
```bash
# Development mode (auto-reload)
uvicorn app.services.analytics.main:app --reload --port 8001

# Production mode
uvicorn app.services.analytics.main:app --host 0.0.0.0 --port 8001 --workers 4
```

#### Celery Worker (Background Tasks)
```bash
# Start Celery worker
celery -A app.core.celery worker --loglevel=info

# Start Celery beat (scheduled tasks)
celery -A app.core.celery beat --loglevel=info
```

## Docker Setup

### Build Image
```bash
docker build -t givemejobs-python-services .
```

### Run Container
```bash
docker run -p 8001:8001 \
  -e DATABASE_URL=postgresql://user:password@host:5432/givemejobs \
  -e REDIS_URL=redis://redis:6379/0 \
  -e OPENAI_API_KEY=your-key \
  givemejobs-python-services
```

### Docker Compose
```yaml
version: '3.8'

services:
  python-services:
    build: ./packages/python-services
    ports:
      - "8001:8001"
    environment:
      - DATABASE_URL=postgresql://user:password@postgres:5432/givemejobs
      - REDIS_URL=redis://redis:6379/0
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    depends_on:
      - postgres
      - redis
  
  celery-worker:
    build: ./packages/python-services
    command: celery -A app.core.celery worker --loglevel=info
    environment:
      - CELERY_BROKER_URL=redis://redis:6379/1
      - CELERY_RESULT_BACKEND=redis://redis:6379/2
    depends_on:
      - redis
  
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
  
  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=givemejobs
    ports:
      - "5432:5432"
```

## Troubleshooting

### scikit-learn Installation Issues (Windows)

If you encounter compilation errors with scikit-learn on Windows:

1. **Use the simplified ML model** (already implemented):
   - Install base requirements: `pip install -r requirements.txt`
   - The analytics service will work with a simplified ML model

2. **Install pre-built wheels**:
   ```bash
   pip install scikit-learn --only-binary :all:
   ```

3. **Use WSL2** (Windows Subsystem for Linux):
   ```bash
   wsl
   cd /mnt/c/path/to/project
   pip install -r requirements-prod.txt
   ```

4. **Use Docker** (recommended for production):
   ```bash
   docker build -t python-services .
   docker run -p 8001:8001 python-services
   ```

### Pydantic Warnings

If you see Pydantic deprecation warnings, they've been fixed in the latest code. Update your code:

```bash
git pull origin main
```

### Import Errors

If you get import errors:

1. Make sure you're in the virtual environment:
   ```bash
   # Windows
   venv\Scripts\activate
   # Mac/Linux
   source venv/bin/activate
   ```

2. Reinstall dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Check Python version (3.11+ required):
   ```bash
   python --version
   ```

### Redis Connection Errors

Make sure Redis is running:

```bash
# Windows (if installed)
redis-server

# Mac
brew services start redis

# Linux
sudo systemctl start redis

# Docker
docker run -d -p 6379:6379 redis:7-alpine
```

### Database Connection Errors

1. Check PostgreSQL is running
2. Verify DATABASE_URL in .env
3. Test connection:
   ```bash
   psql postgresql://user:password@localhost:5432/givemejobs
   ```

## Development Workflow

### 1. Code Formatting
```bash
# Format code
black app/

# Sort imports
isort app/

# Check style
flake8 app/
```

### 2. Type Checking
```bash
mypy app/
```

### 3. Run Tests
```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app

# Run specific tests
pytest app/services/analytics/
```

### 4. Pre-commit Hooks (Optional)
```bash
# Install pre-commit
pip install pre-commit

# Setup hooks
pre-commit install

# Run manually
pre-commit run --all-files
```

## API Documentation

Once the service is running, access the interactive API documentation:

- **Swagger UI**: http://localhost:8001/docs
- **ReDoc**: http://localhost:8001/redoc

## Health Checks

- **Health**: http://localhost:8001/health
- **Status**: http://localhost:8001/status (requires authentication)

## Next Steps

1. ✅ Setup complete
2. Configure environment variables
3. Run tests to verify installation
4. Start the service
5. Test API endpoints
6. Integrate with Node.js backend

## Support

For issues or questions:
- Check the troubleshooting section above
- Review test files for usage examples
- Check API documentation at /docs
- Review the main README.md

---

**Last Updated**: November 4, 2024  
**Python Version**: 3.11+  
**Status**: Production Ready
