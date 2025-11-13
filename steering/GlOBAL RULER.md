# KIRO Global Steering Document

**Version:** 1.0  
**Last Updated:** November 2025  
**Purpose:** Development guidelines for AI agent operations ensuring consistency, reliability, and maintainability

---

## I. Core Principles

KIRO operates on four foundational pillars:

1. **Precision** - Exact implementation of requirements without assumptions
2. **Efficiency** - Optimal solutions with minimal complexity
3. **Reliability** - Robust error handling and comprehensive testing
4. **Maintainability** - Clean, documented, and scalable code

---

## II. Project Context & Environment

### 2.1 Environment Configuration

**Virtual Environment Management:**
- Execute all Python operations within the designated virtual environment
- Load environment variables using `python-dotenv` at application startup
- Verify project root directory before initiating any task

**Pre-Task Checklist:**
1. Review relevant source files and existing implementations
2. Examine current test coverage and expected behaviors
3. Verify dependencies and environment configuration
4. Clarify ambiguous requirements before proceeding

### 2.2 Technology Stack

**Core Technologies:**
- Python 3.11+ (leverage latest language features)
- FastAPI for API development
- Pydantic v2 for data validation and serialization
- SQLAlchemy 2.0+ for database operations (if applicable)
- Redis for caching (if applicable)

**Development Tools:**
- `ruff` for linting and formatting (replaces black + isort + flake8)
- `mypy` for static type checking
- `pytest` with `pytest-cov` for testing
- `uv` or `poetry` for dependency management

---

## III. Code Architecture & Structure

### 3.1 Project Organization

```
project/
├── src/
│   ├── __init__.py
│   ├── main.py              # Application entry point
│   ├── config.py            # Configuration management
│   ├── core/                # Core business logic
│   │   ├── __init__.py
│   │   ├── agent.py
│   │   └── orchestrator.py
│   ├── services/            # Service layer
│   │   ├── __init__.py
│   │   └── llm_service.py
│   ├── models/              # Data models
│   │   ├── __init__.py
│   │   └── schemas.py
│   ├── api/                 # API routes
│   │   ├── __init__.py
│   │   └── v1/
│   └── utils/               # Utilities
│       ├── __init__.py
│       └── validators.py
├── tests/                   # Mirror src/ structure
├── docs/                    # Documentation
├── .env.example             # Environment template
├── pyproject.toml           # Project configuration
└── README.md
```

### 3.2 Modularity Standards

**File Size Constraints:**
- Maximum 500 lines per module
- Split into feature-based modules when approaching limit
- Extract reusable logic into utility functions

**Module Responsibilities:**
- Single Responsibility Principle - one clear purpose per module
- Clear separation: core logic, services, models, API, utilities
- Minimize inter-module dependencies

### 3.3 Import Standards

```python
# Standard library
import os
from typing import Optional, List, Dict
from datetime import datetime

# Third-party packages
import httpx
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

# Local application
from src.config import settings
from src.models.schemas import QueryRequest
from src.services.llm_service import LLMService
```

**Import Rules:**
- Group imports: standard library, third-party, local
- Use absolute imports for clarity
- No wildcard imports (`from module import *`)
- Validate all imported modules exist before use

---

## IV. Code Quality Standards

### 4.1 Type Safety

**Type Annotations Required:**
```python
from typing import Optional, List, Dict, Any
from pydantic import BaseModel

def process_query(
    query: str,
    context: Optional[Dict[str, Any]] = None,
    max_tokens: int = 1000
) -> Dict[str, Any]:
    """Process user query with optional context."""
    pass
```

**Use Pydantic for Data Validation:**
```python
from pydantic import BaseModel, Field, field_validator

class QueryRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000)
    temperature: float = Field(0.7, ge=0.0, le=2.0)
    model: str = Field("claude-sonnet-4-5-20250929")
    
    @field_validator('text')
    @classmethod
    def validate_text(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Query text cannot be empty")
        return v.strip()
```

### 4.2 Code Style

**Formatting Standards:**
- Use `ruff` for automated formatting and linting
- Line length: 100 characters
- Use double quotes for strings
- Type hints on all function signatures

**Configuration (pyproject.toml):**
```toml
[tool.ruff]
line-length = 100
target-version = "py311"

[tool.ruff.lint]
select = ["E", "F", "I", "N", "W", "B", "C4", "UP"]
ignore = ["E501"]

[tool.mypy]
python_version = "3.11"
strict = true
warn_return_any = true
warn_unused_configs = true
```

### 4.3 Documentation Standards

**Docstring Format (Google Style):**
```python
def calculate_embeddings(
    texts: List[str],
    model: str = "text-embedding-3-small",
    batch_size: int = 100
) -> List[List[float]]:
    """Calculate embeddings for a list of texts.
    
    Args:
        texts: List of text strings to embed
        model: Embedding model identifier
        batch_size: Number of texts to process per batch
        
    Returns:
        List of embedding vectors, one per input text
        
    Raises:
        ValueError: If texts list is empty
        APIError: If embedding service fails
        
    Example:
        >>> texts = ["Hello world", "Machine learning"]
        >>> embeddings = calculate_embeddings(texts)
        >>> len(embeddings) == len(texts)
        True
    """
    pass
```

### 4.4 Naming Conventions

```python
# Constants
MAX_RETRIES = 3
DEFAULT_TIMEOUT = 30

# Classes
class AgentOrchestrator:
    pass

# Functions and methods
def process_user_input(data: str) -> dict:
    pass

# Variables
user_query = "example"
embedding_vector = [0.1, 0.2, 0.3]

# Private methods
def _internal_helper(self) -> None:
    pass

# Type aliases
JSONDict = Dict[str, Any]
EmbeddingVector = List[float]
```

---

## V. Testing Requirements

### 5.1 Test Coverage Standards

**Mandatory Testing:**
- Unit tests for all business logic
- Integration tests for API endpoints
- End-to-end tests for critical workflows
- Minimum 80% code coverage

**Test Structure:**
```python
# tests/test_agent.py
import pytest
from src.core.agent import Agent
from src.models.schemas import QueryRequest

class TestAgent:
    """Test suite for Agent class."""
    
    @pytest.fixture
    def agent(self):
        """Provide configured agent instance."""
        return Agent(model="claude-sonnet-4-5-20250929")
    
    def test_process_query_success(self, agent):
        """Test successful query processing."""
        request = QueryRequest(text="What is machine learning?")
        response = agent.process(request)
        
        assert response.status == "success"
        assert len(response.content) > 0
    
    def test_process_query_empty_input(self, agent):
        """Test handling of invalid empty input."""
        with pytest.raises(ValueError, match="Query text cannot be empty"):
            QueryRequest(text="")
    
    @pytest.mark.parametrize("input_text,expected", [
        ("short", True),
        ("a" * 5000, True),
        ("a" * 5001, False),
    ])
    def test_query_length_validation(self, input_text, expected):
        """Test query length boundary conditions."""
        if expected:
            request = QueryRequest(text=input_text)
            assert request.text == input_text
        else:
            with pytest.raises(ValueError):
                QueryRequest(text=input_text)
```

### 5.2 Test Categories

**Unit Tests:**
- Test individual functions in isolation
- Mock external dependencies
- Fast execution (milliseconds)

**Integration Tests:**
- Test component interactions
- Use test databases/services
- Moderate execution time (seconds)

**End-to-End Tests:**
- Test complete user workflows
- Use staging environment
- Slower execution (seconds to minutes)

### 5.3 Running Tests

```bash
# Run all tests with coverage
pytest --cov=src --cov-report=term-missing

# Run specific test file
pytest tests/test_agent.py

# Run with markers
pytest -m "not slow"

# Run with verbose output
pytest -v --tb=short
```

---

## VI. Error Handling & Validation

### 6.1 Exception Hierarchy

```python
# src/core/exceptions.py
class KIROException(Exception):
    """Base exception for KIRO application."""
    pass

class ValidationError(KIROException):
    """Raised when input validation fails."""
    pass

class ServiceError(KIROException):
    """Raised when external service fails."""
    pass

class ConfigurationError(KIROException):
    """Raised when configuration is invalid."""
    pass
```

### 6.2 Error Handling Patterns

```python
from typing import Optional
import logging
from tenacity import retry, stop_after_attempt, wait_exponential

logger = logging.getLogger(__name__)

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10)
)
async def call_external_api(url: str, payload: dict) -> dict:
    """Call external API with automatic retry logic."""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, timeout=30.0)
            response.raise_for_status()
            return response.json()
    except httpx.TimeoutException as e:
        logger.error(f"API timeout: {url}", exc_info=True)
        raise ServiceError(f"Request timeout: {url}") from e
    except httpx.HTTPStatusError as e:
        logger.error(f"API error: {e.response.status_code}", exc_info=True)
        raise ServiceError(f"HTTP {e.response.status_code}") from e
    except Exception as e:
        logger.exception("Unexpected error in API call")
        raise ServiceError("Unexpected API error") from e
```

### 6.3 Validation Best Practices

- Validate at system boundaries (API inputs, external data)
- Use Pydantic models for automatic validation
- Fail fast with descriptive error messages
- Log validation failures for debugging
- Return structured error responses

---

## VII. Configuration Management

### 7.1 Environment Variables

```python
# src/config.py
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    """Application configuration."""
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False
    )
    
    # API Keys
    anthropic_api_key: str
    openai_api_key: str | None = None
    
    # Application
    app_name: str = "KIRO"
    debug: bool = False
    log_level: str = "INFO"
    
    # Database (if applicable)
    database_url: str | None = None
    
    # Redis (if applicable)
    redis_url: str | None = None
    
    # Model Configuration
    default_model: str = "claude-sonnet-4-5-20250929"
    max_tokens: int = 4096
    temperature: float = 0.7

settings = Settings()
```

### 7.2 Security Standards

- Never commit `.env` files
- Use `.env.example` as template
- Rotate API keys regularly
- Use secrets management in production (AWS Secrets Manager, HashiCorp Vault)
- Validate all environment variables at startup

---

## VIII. Task Management Workflow

### 8.1 Task Execution Process

**Standard Workflow:**
1. Parse and clarify requirements
2. Review existing codebase context
3. Design solution architecture
4. Implement in testable increments
5. Write/update comprehensive tests
6. Update documentation
7. Mark task complete in `TASK.md`

### 8.2 Task Documentation Format

```markdown
# TASK.md

## In Progress
- [ ] Implement vector search functionality
  - Started: 2025-11-05
  - Assignee: AI Agent
  - Blockers: None

## Completed
- [x] Set up FastAPI application structure (2025-11-04)
- [x] Configure logging and error handling (2025-11-04)

## Backlog
- [ ] Add authentication middleware
- [ ] Implement rate limiting
- [ ] Set up monitoring and alerts

## Discovered Issues
- [ ] Need to handle UTF-8 encoding in file uploads
- [ ] API timeout needs adjustment for large payloads
- [ ] Consider implementing request caching
```

### 8.3 Task Completion Criteria

Before marking any task complete:
- [ ] Implementation matches requirements
- [ ] Unit tests written and passing
- [ ] Integration tests passing (if applicable)
- [ ] Code passes linting (`ruff check`)
- [ ] Type checking passes (`mypy`)
- [ ] Documentation updated
- [ ] `TASK.md` updated
- [ ] No hardcoded values or credentials

---

## IX. API Development Standards

### 9.1 FastAPI Best Practices

```python
from fastapi import FastAPI, HTTPException, Depends
from fastapi.responses import JSONResponse
from src.models.schemas import QueryRequest, QueryResponse
from src.core.agent import Agent
from src.config import settings

app = FastAPI(
    title="KIRO API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

async def get_agent() -> Agent:
    """Dependency injection for agent instance."""
    return Agent(model=settings.default_model)

@app.post("/v1/query", response_model=QueryResponse)
async def process_query(
    request: QueryRequest,
    agent: Agent = Depends(get_agent)
) -> QueryResponse:
    """Process user query and return response.
    
    Args:
        request: Query request with text and parameters
        agent: Agent instance (injected)
        
    Returns:
        Query response with generated content
        
    Raises:
        HTTPException: If processing fails
    """
    try:
        result = await agent.process(request)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except ServiceError as e:
        raise HTTPException(status_code=502, detail=str(e))
    except Exception as e:
        logger.exception("Unexpected error in query processing")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "version": "1.0.0"}
```

### 9.2 API Response Standards

```python
from pydantic import BaseModel
from typing import Optional

class APIResponse(BaseModel):
    """Standard API response format."""
    success: bool
    data: Optional[dict] = None
    error: Optional[str] = None
    timestamp: datetime
    request_id: str

class QueryResponse(BaseModel):
    """Query response model."""
    content: str
    model: str
    tokens_used: int
    processing_time_ms: float
    metadata: dict
```

---

## X. Logging & Monitoring

### 10.1 Logging Configuration

```python
# src/utils/logging.py
import logging
import sys
from pathlib import Path

def setup_logging(log_level: str = "INFO") -> None:
    """Configure application logging."""
    
    # Create logs directory
    Path("logs").mkdir(exist_ok=True)
    
    # Configure format
    log_format = (
        "%(asctime)s - %(name)s - %(levelname)s - "
        "%(funcName)s:%(lineno)d - %(message)s"
    )
    
    # Configure handlers
    handlers = [
        logging.StreamHandler(sys.stdout),
        logging.FileHandler("logs/kiro.log")
    ]
    
    # Configure root logger
    logging.basicConfig(
        level=getattr(logging, log_level.upper()),
        format=log_format,
        handlers=handlers
    )
    
    # Silence noisy libraries
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("urllib3").setLevel(logging.WARNING)
```

### 10.2 Structured Logging

```python
import logging
import json
from datetime import datetime

logger = logging.getLogger(__name__)

def log_structured(level: str, event: str, **kwargs) -> None:
    """Log structured data in JSON format."""
    log_data = {
        "timestamp": datetime.utcnow().isoformat(),
        "event": event,
        **kwargs
    }
    getattr(logger, level)(json.dumps(log_data))

# Usage
log_structured("info", "query_processed", 
               query_id="12345", 
               tokens=150, 
               duration_ms=234)
```

---

## XI. Performance Optimization

### 11.1 Async Operations

```python
import asyncio
from typing import List

async def process_batch(items: List[str]) -> List[dict]:
    """Process multiple items concurrently."""
    tasks = [process_single_item(item) for item in items]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    return [r for r in results if not isinstance(r, Exception)]

async def process_single_item(item: str) -> dict:
    """Process single item asynchronously."""
    # Implementation
    pass
```

### 11.2 Caching Strategy

```python
from functools import lru_cache
from typing import Optional
import hashlib

@lru_cache(maxsize=1000)
def get_embedding_cached(text: str, model: str) -> List[float]:
    """Cache embedding results in memory."""
    # Implementation
    pass

def cache_key(text: str, model: str) -> str:
    """Generate cache key for text and model."""
    content = f"{text}:{model}"
    return hashlib.sha256(content.encode()).hexdigest()
```

### 11.3 Database Optimization

- Use connection pooling
- Implement query result caching
- Add database indexes for frequent queries
- Use batch operations for bulk inserts
- Implement pagination for large result sets

---

## XII. Dependency Management

### 12.1 Modern Dependency Tools

**Using `uv` (recommended):**
```bash
# Initialize project
uv init

# Add dependencies
uv add fastapi pydantic httpx

# Add dev dependencies
uv add --dev pytest ruff mypy

# Sync dependencies
uv sync

# Run commands
uv run pytest
```

### 12.2 Dependency Specification

```toml
# pyproject.toml
[project]
name = "kiro"
version = "1.0.0"
requires-python = ">=3.11"
dependencies = [
    "fastapi>=0.109.0",
    "pydantic>=2.5.0",
    "pydantic-settings>=2.1.0",
    "httpx>=0.26.0",
    "python-dotenv>=1.0.0",
    "tenacity>=8.2.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=7.4.0",
    "pytest-cov>=4.1.0",
    "pytest-asyncio>=0.23.0",
    "ruff>=0.1.0",
    "mypy>=1.8.0",
]

[tool.uv]
dev-dependencies = [
    "pytest>=7.4.0",
    "pytest-cov>=4.1.0",
    "ruff>=0.1.0",
]
```

---

## XIII. AI Agent Operational Rules

### 13.1 Core Behavioral Directives

**Mandatory Behaviors:**
- Clarify ambiguous requirements before implementation
- Verify file paths and module existence before referencing
- Use only verified, documented libraries
- Never implement without understanding context
- Ask questions rather than making assumptions

**Prohibited Actions:**
- Hallucinating libraries, functions, or APIs
- Deleting code without explicit instruction
- Skipping tests to expedite delivery
- Hardcoding credentials or sensitive data
- Ignoring error handling requirements

### 13.2 Decision-Making Protocol

**When encountering:**
- **Ambiguity:** Request clarification
- **Multiple solutions:** Present options with tradeoffs
- **Architectural changes:** Seek approval before implementing
- **Security concerns:** Flag immediately
- **Performance issues:** Document and suggest optimizations

### 13.3 Quality Assurance Checklist

Before considering any implementation complete:
- [ ] Requirements fully understood and addressed
- [ ] Code follows style guidelines
- [ ] Type hints on all functions
- [ ] Comprehensive error handling
- [ ] Unit tests written and passing
- [ ] Documentation updated
- [ ] No hardcoded values
- [ ] Logging appropriately configured
- [ ] Task documentation updated

---

## XIV. Documentation Requirements

### 14.1 README.md Structure

```markdown
# KIRO

Brief description of the project.

## Features
- Feature 1
- Feature 2

## Requirements
- Python 3.11+
- Additional system requirements

## Installation
```bash
# Clone repository
git clone <repo-url>

# Install dependencies
uv sync

# Configure environment
cp .env.example .env
# Edit .env with your API keys
```

## Usage
```bash
# Run application
uv run python src/main.py

# Run tests
uv run pytest

# Run linter
uv run ruff check src/
```

## API Documentation
Access interactive API docs at http://localhost:8000/docs

## Configuration
Environment variables:
- `ANTHROPIC_API_KEY`: Required. API key for Claude
- `LOG_LEVEL`: Optional. Default: INFO

## Development
```bash
# Install dev dependencies
uv sync --all-extras

# Run type checking
uv run mypy src/

# Format code
uv run ruff format src/
```

## License
[License Type]
```

### 14.2 Code Comments

**When to comment:**
- Complex algorithms requiring explanation
- Non-obvious design decisions
- Performance-critical sections
- Workarounds or temporary solutions
- Business logic that isn't self-evident

**When not to comment:**
- Self-explanatory code
- Obvious operations
- Redundant information already in docstring

---

## XV. Version Control

### 15.1 Commit Standards

**Commit Message Format:**
```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code restructuring
- `test`: Test additions/modifications
- `docs`: Documentation changes
- `chore`: Maintenance tasks
- `perf`: Performance improvements

**Example:**
```
feat(agent): add multi-turn conversation support

Implement conversation history tracking and context management
for multi-turn dialogues. Includes memory optimization for
long conversations.

Closes #123
```

### 15.2 Branch Strategy

```
main          # Production-ready code
├── develop   # Integration branch
├── feature/* # New features
├── fix/*     # Bug fixes
└── hotfix/*  # Critical production fixes
```

---

## XVI. Quick Reference

### 16.1 Common Commands

```bash
# Development
uv run python src/main.py          # Run application
uv run pytest -v                   # Run tests with verbose output
uv run ruff check src/             # Lint code
uv run mypy src/                   # Type check
uv run ruff format src/            # Format code

# Testing
uv run pytest tests/test_agent.py  # Run specific test
uv run pytest --cov=src            # Run with coverage
uv run pytest -k "test_query"      # Run tests matching pattern

# Maintenance
uv sync                            # Sync dependencies
uv add <package>                   # Add new dependency
uv run pip list                    # List installed packages
```

### 16.2 File Checklist for New Features

- [ ] Implementation file in `src/`
- [ ] Test file in `tests/`
- [ ] Update `TASK.md`
- [ ] Update `README.md` if needed
- [ ] Add to API docs if applicable
- [ ] Update `.env.example` if new config added
- [ ] Commit with conventional commit message

---

## XVII. Appendix

### 17.1 Recommended Resources

- **Python:** [PEP 8](https://pep8.org/), [Type Hints](https://docs.python.org/3/library/typing.html)
- **FastAPI:** [Official Docs](https://fastapi.tiangolo.com/)
- **Pydantic:** [Documentation](https://docs.pydantic.dev/)
- **Testing:** [Pytest Docs](https://docs.pytest.org/)
- **Async:** [Python AsyncIO](https://docs.python.org/3/library/asyncio.html)

### 17.2 Tool Configuration Files

**Essential files for professional projects:**
- `pyproject.toml` - Project configuration and dependencies
- `.env.example` - Environment variable template
- `.gitignore` - Version control exclusions
- `README.md` - Project documentation
- `TASK.md` - Task tracking
- `.ruff.toml` or config in `pyproject.toml` - Linting rules

---

**Document Version:** 1.0  
**Effective Date:** November 2025  
**Review Cycle:** Quarterly or as needed for technology updates