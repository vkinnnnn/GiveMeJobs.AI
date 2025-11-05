# GiveMeJobs Python Services

This package contains the Python microservices for the GiveMeJobs platform, providing AI/ML capabilities, document processing, semantic search, and advanced analytics.

## Services

### 1. Document Processing Service (Port 8001)
- AI-powered resume generation with context awareness
- Job requirement extraction using NLP
- Support for multiple document formats (PDF, DOCX, TXT)
- Document template application and formatting

### 2. Semantic Search Service (Port 8002)
- Vector embedding generation for jobs and profiles
- Pinecone integration for similarity search
- Composite scoring algorithm combining semantic and traditional matching
- Fallback to keyword-based search when vector search fails

### 3. Analytics Service (Port 8003)
- Complex analytics using Pandas and NumPy
- ML models for success prediction using scikit-learn
- Insights generation with statistical analysis
- Benchmarking against platform averages

## Architecture

The services are built using:
- **FastAPI** for high-performance async APIs
- **Pydantic** for data validation and serialization
- **Structured logging** with correlation ID support
- **JWT authentication** for service-to-service communication
- **Docker** containerization for easy deployment
- **Celery** for background task processing

## Quick Start

### Prerequisites
- Python 3.11+
- Docker and Docker Compose (for containerized deployment)
- Redis (for caching and task queue)
- PostgreSQL (for data storage)

### Environment Setup

1. Copy the environment template:
```bash
cp .env.example .env
```

2. Update the `.env` file with your configuration:
```bash
# Required API keys
OPENAI_API_KEY=your-openai-api-key-here
PINECONE_API_KEY=your-pinecone-api-key-here
PINECONE_ENVIRONMENT=your-pinecone-environment

# Database connections
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/givemejobs
REDIS_URL=redis://localhost:6379/0
```

### Running Services

#### Option 1: Docker Compose (Recommended)
```bash
# Start all services
docker-compose up --build

# Start specific service
docker-compose up document-processing
```

#### Option 2: Individual Services
```bash
# Make scripts executable (Linux/Mac)
chmod +x scripts/start-services.sh

# Start individual services
./scripts/start-services.sh document    # Document Processing Service
./scripts/start-services.sh search     # Semantic Search Service
./scripts/start-services.sh analytics  # Analytics Service

# Windows PowerShell
.\scripts\start-services.ps1 -Service document
```

#### Option 3: Manual Setup
```bash
# Create virtual environment
python3.11 -m venv venv
source venv/bin/activate  # Linux/Mac
# or
venv\Scripts\activate     # Windows

# Install dependencies
pip install -r requirements.txt

# Start a service
uvicorn app.services.document_processing.main:app --host 0.0.0.0 --port 8001 --reload
```

### Background Workers

For background task processing:
```bash
# Start Celery worker
celery -A app.core.celery worker --loglevel=info

# Start Celery beat scheduler
celery -A app.core.celery beat --loglevel=info
```

## API Documentation

Once services are running, access the interactive API documentation:

- Document Processing: http://localhost:8001/docs
- Semantic Search: http://localhost:8002/docs
- Analytics: http://localhost:8003/docs

## Health Checks

Each service provides health check endpoints:
- http://localhost:8001/health
- http://localhost:8002/health
- http://localhost:8003/health

## Development

### Code Quality

The project uses several tools for code quality:

```bash
# Format code
black app/ tests/

# Sort imports
isort app/ tests/

# Lint code
flake8 app/ tests/

# Type checking
mypy app/
```

### Testing

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app --cov-report=html

# Run specific test file
pytest tests/test_document_processing.py
```

### Project Structure

```
packages/python-services/
├── app/
│   ├── core/                 # Core utilities and configuration
│   │   ├── config.py        # Settings and configuration
│   │   ├── logging.py       # Structured logging setup
│   │   ├── auth.py          # Authentication utilities
│   │   └── exceptions.py    # Custom exceptions
│   └── services/            # Individual microservices
│       ├── document_processing/
│       │   ├── main.py      # FastAPI application
│       │   └── routes.py    # API routes
│       ├── semantic_search/
│       │   ├── main.py      # FastAPI application
│       │   └── routes.py    # API routes
│       └── analytics/
│           ├── main.py      # FastAPI application
│           └── routes.py    # API routes
├── tests/                   # Test files
├── scripts/                 # Utility scripts
├── docker-compose.yml       # Docker Compose configuration
├── Dockerfile              # Docker image definition
├── requirements.txt        # Python dependencies
└── pyproject.toml          # Project configuration
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ENVIRONMENT` | Environment (development/staging/production) | development |
| `DEBUG` | Enable debug mode | false |
| `LOG_LEVEL` | Logging level | INFO |
| `OPENAI_API_KEY` | OpenAI API key | None |
| `PINECONE_API_KEY` | Pinecone API key | None |
| `DATABASE_URL` | PostgreSQL connection string | None |
| `REDIS_URL` | Redis connection string | redis://localhost:6379/0 |
| `SENTRY_DSN` | Sentry error tracking DSN | None |

### Service Authentication

Services use JWT tokens for authentication. The Node.js backend should include the token in the `Authorization` header:

```
Authorization: Bearer <jwt-token>
```

## Monitoring and Logging

- **Structured Logging**: All services use structured JSON logging with correlation IDs
- **Health Checks**: Each service provides health check endpoints
- **Error Tracking**: Integration with Sentry for error monitoring
- **Metrics**: Prometheus metrics collection (when enabled)

## Deployment

### Production Deployment

1. Update environment variables for production
2. Build and push Docker images
3. Deploy using Kubernetes or Docker Swarm
4. Configure load balancers and ingress
5. Set up monitoring and alerting

### Scaling

Services can be scaled independently:
- Document Processing: CPU-intensive, scale based on processing load
- Semantic Search: Memory-intensive, scale based on search volume
- Analytics: Both CPU and memory intensive, scale based on analytics requests

## Troubleshooting

### Common Issues

1. **Service won't start**: Check environment variables and dependencies
2. **Authentication errors**: Verify JWT token configuration
3. **External API errors**: Check API keys and rate limits
4. **Database connection issues**: Verify connection strings and network access

### Logs

Check service logs for detailed error information:
```bash
# Docker Compose logs
docker-compose logs document-processing

# Individual service logs
docker logs <container-name>
```

## Contributing

1. Follow the existing code style and patterns
2. Add tests for new functionality
3. Update documentation as needed
4. Ensure all quality checks pass before submitting

## License

MIT License - see LICENSE file for details