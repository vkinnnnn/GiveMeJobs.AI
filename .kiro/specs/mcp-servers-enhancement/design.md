# Design Document: MCP Servers Enhancement

## Overview

This design specifies the implementation of three high-impact MCP servers (Database Management, Docker Container Management, and API Testing) along with Memory population and workflow automation. These servers will integrate seamlessly with the existing Kiro MCP infrastructure to provide developers with direct access to critical development tools without context switching.

The implementation follows a modular architecture where each MCP server is independently deployable and configurable, with clear separation of concerns between database operations, container management, and API testing. All servers will be configured in `.kiro/settings/mcp.json` with appropriate auto-approve rules for common operations.

## Architecture

### High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Kiro IDE                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              MCP Server Manager                       │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │   │
│  │  │  Database    │  │   Docker     │  │   API      │ │   │
│  │  │  MCP Server  │  │   MCP Server │  │   Testing  │ │   │
│  │  │              │  │              │  │   MCP      │ │   │
│  │  └──────────────┘  └──────────────┘  └────────────┘ │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │   │
│  │  │   Memory     │  │   GitHub     │  │   Snyk     │ │   │
│  │  │   MCP Server │  │   MCP Server │  │   MCP      │ │   │
│  │  │              │  │              │  │   Server   │ │   │
│  │  └──────────────┘  └──────────────┘  └────────────┘ │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
    ┌─────────────┐   ┌──────────────┐   ┌──────────────┐
    │ PostgreSQL  │   │   Docker     │   │   FastAPI    │
    │ MongoDB     │   │   Daemon     │   │   Backend    │
    │ Redis       │   │              │   │              │
    └─────────────┘   └──────────────┘   └──────────────┘
```

### MCP Server Deployment Model

Each MCP server runs as an independent process communicating with Kiro via stdio:

```
Kiro Process
    │
    ├─► Database MCP Server (Python)
    │   └─► PostgreSQL/MongoDB/Redis
    │
    ├─► Docker MCP Server (Python)
    │   └─► Docker Daemon
    │
    ├─► API Testing MCP Server (Python)
    │   └─► FastAPI Backend (HTTP)
    │
    └─► [Existing Servers: Memory, GitHub, Git, Snyk, etc.]
```

## Components and Interfaces

### 1. Database MCP Server

**Purpose**: Provide direct database query, schema inspection, and migration management

**Technology Stack**:
- Python 3.11+
- psycopg (PostgreSQL)
- pymongo (MongoDB)
- redis (Redis)
- SQLAlchemy (for schema inspection)

**Tools Provided**:

```python
# Tool: db_query
Input: {
  "database": "postgresql|mongodb|redis",
  "query": "SELECT * FROM users WHERE id = ?",
  "params": [123],
  "timeout": 30
}
Output: {
  "success": bool,
  "rows": [...],
  "columns": [...],
  "execution_time_ms": float,
  "error": str (if failed)
}

# Tool: db_schema
Input: {
  "database": "postgresql|mongodb|redis",
  "table_or_collection": "users"
}
Output: {
  "success": bool,
  "schema": {
    "columns": [...],
    "indexes": [...],
    "constraints": [...]
  },
  "error": str (if failed)
}

# Tool: db_migrate
Input: {
  "migration_name": "add_user_roles",
  "direction": "up|down"
}
Output: {
  "success": bool,
  "message": str,
  "error": str (if failed)
}

# Tool: db_analyze
Input: {
  "database": "postgresql|mongodb|redis",
  "query": "SELECT * FROM users WHERE created_at > ?",
  "params": ["2025-01-01"]
}
Output: {
  "success": bool,
  "execution_plan": str,
  "metrics": {
    "rows_scanned": int,
    "rows_returned": int,
    "execution_time_ms": float
  },
  "error": str (if failed)
}
```

**Configuration**:
```json
{
  "database_mcp": {
    "command": "python",
    "args": ["src/mcp_servers/database_mcp.py"],
    "env": {
      "DATABASE_URL": "${DATABASE_URL}",
      "MONGODB_URL": "${MONGODB_URL}",
      "REDIS_URL": "${REDIS_URL}"
    },
    "disabled": false,
    "autoApprove": ["db_query", "db_schema", "db_analyze"]
  }
}
```

### 2. Docker MCP Server

**Purpose**: Provide container lifecycle management, log streaming, and resource monitoring

**Technology Stack**:
- Python 3.11+
- docker (Docker SDK)
- asyncio (for streaming logs)

**Tools Provided**:

```python
# Tool: docker_ps
Input: {
  "all": bool,  # Include stopped containers
  "filters": {"status": "running"}
}
Output: {
  "success": bool,
  "containers": [
    {
      "id": "abc123...",
      "name": "backend",
      "image": "givemejobs/backend:latest",
      "status": "running",
      "ports": ["8000:8000"],
      "cpu_percent": 2.5,
      "memory_mb": 256
    }
  ],
  "error": str (if failed)
}

# Tool: docker_logs
Input: {
  "container": "backend",
  "tail": 100,
  "follow": false,
  "timestamps": true,
  "level": "all|error|warning|info"
}
Output: {
  "success": bool,
  "logs": "...",
  "error": str (if failed)
}

# Tool: docker_exec
Input: {
  "container": "backend",
  "command": "python -m pytest tests/",
  "timeout": 60
}
Output: {
  "success": bool,
  "output": str,
  "exit_code": int,
  "error": str (if failed)
}

# Tool: docker_stats
Input: {
  "container": "backend"
}
Output: {
  "success": bool,
  "stats": {
    "cpu_percent": float,
    "memory_mb": float,
    "memory_percent": float,
    "network_in_mb": float,
    "network_out_mb": float
  },
  "error": str (if failed)
}
```

**Configuration**:
```json
{
  "docker_mcp": {
    "command": "python",
    "args": ["src/mcp_servers/docker_mcp.py"],
    "env": {
      "DOCKER_HOST": "unix:///var/run/docker.sock"
    },
    "disabled": false,
    "autoApprove": ["docker_ps", "docker_logs", "docker_stats"]
  }
}
```

### 3. API Testing MCP Server

**Purpose**: Provide HTTP request execution, response validation, and test automation

**Technology Stack**:
- Python 3.11+
- httpx (HTTP client)
- jsonschema (Schema validation)
- pydantic (Response modeling)

**Tools Provided**:

```python
# Tool: http_request
Input: {
  "method": "GET|POST|PUT|DELETE|PATCH",
  "url": "http://localhost:8000/api/v1/users",
  "headers": {"Authorization": "Bearer token"},
  "body": {...},
  "auth": {
    "type": "bearer|api_key|basic",
    "value": "..."
  },
  "timeout": 30
}
Output: {
  "success": bool,
  "status_code": int,
  "headers": {...},
  "body": {...},
  "time_ms": float,
  "error": str (if failed)
}

# Tool: validate_response
Input: {
  "response": {...},
  "schema": {
    "type": "object",
    "properties": {...},
    "required": [...]
  }
}
Output: {
  "success": bool,
  "valid": bool,
  "errors": [...],
  "warnings": [...]
}

# Tool: test_batch
Input: {
  "tests": [
    {
      "name": "Get users",
      "method": "GET",
      "url": "http://localhost:8000/api/v1/users",
      "expected_status": 200
    },
    {
      "name": "Create user",
      "method": "POST",
      "url": "http://localhost:8000/api/v1/users",
      "body": {...},
      "expected_status": 201
    }
  ]
}
Output: {
  "success": bool,
  "total": int,
  "passed": int,
  "failed": int,
  "results": [
    {
      "name": str,
      "passed": bool,
      "status_code": int,
      "error": str (if failed)
    }
  ]
}
```

**Configuration**:
```json
{
  "api_testing_mcp": {
    "command": "python",
    "args": ["src/mcp_servers/api_testing_mcp.py"],
    "env": {
      "API_BASE_URL": "${API_BASE_URL}",
      "API_KEY": "${API_KEY}"
    },
    "disabled": false,
    "autoApprove": ["http_request", "validate_response"]
  }
}
```

### 4. Memory Population

**Purpose**: Store project context for persistent AI knowledge

**Entities to Create**:

```
GiveMeJobs Platform (project)
├── FastAPI Backend (component)
│   ├── Uses PostgreSQL
│   ├── Uses MongoDB
│   ├── Uses Redis
│   ├── Integrates with OpenAI API
│   └── Integrates with Pinecone
├── Next.js Frontend (component)
│   └── Calls FastAPI Backend
├── PostgreSQL (database)
├── MongoDB (database)
├── Redis (cache)
├── OpenAI API (external-service)
└── Pinecone (external-service)
```

**Information to Store**:
- API endpoint documentation (80+ endpoints)
- Database schema information
- Security requirements and compliance
- Deployment procedures
- Architecture decisions
- Team knowledge and best practices

## Data Models

### Database MCP Response Model

```python
class QueryResult(BaseModel):
    success: bool
    rows: Optional[List[Dict[str, Any]]] = None
    columns: Optional[List[str]] = None
    execution_time_ms: float
    error: Optional[str] = None

class SchemaInfo(BaseModel):
    success: bool
    schema: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

class MigrationResult(BaseModel):
    success: bool
    message: str
    error: Optional[str] = None
```

### Docker MCP Response Model

```python
class Container(BaseModel):
    id: str
    name: str
    image: str
    status: str
    ports: List[str]
    cpu_percent: float
    memory_mb: float

class ContainerList(BaseModel):
    success: bool
    containers: List[Container]
    error: Optional[str] = None

class LogOutput(BaseModel):
    success: bool
    logs: str
    error: Optional[str] = None
```

### API Testing Response Model

```python
class HTTPResponse(BaseModel):
    success: bool
    status_code: int
    headers: Dict[str, str]
    body: Any
    time_ms: float
    error: Optional[str] = None

class ValidationResult(BaseModel):
    success: bool
    valid: bool
    errors: List[str]
    warnings: List[str]

class TestResult(BaseModel):
    name: str
    passed: bool
    status_code: int
    error: Optional[str] = None

class BatchTestResult(BaseModel):
    success: bool
    total: int
    passed: int
    failed: int
    results: List[TestResult]
```

## Correctness Properties

A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

### Property 1: Database Query Execution
*For any* valid SQL query against PostgreSQL, MongoDB, or Redis, executing the query through the database MCP server SHALL return results with all required fields (success, rows, columns, execution_time_ms) populated.
**Validates: Requirements 1.1**

### Property 2: Schema Completeness
*For any* database table or collection, requesting schema information SHALL return complete schema including all columns/fields, indexes, and constraints without omission.
**Validates: Requirements 1.2**

### Property 3: Migration Execution
*For any* database migration, executing it through the database MCP server SHALL either succeed and report success, or fail and report descriptive error without partial state.
**Validates: Requirements 1.3**

### Property 4: Performance Analysis
*For any* query, requesting performance analysis SHALL return execution plan and metrics including rows_scanned, rows_returned, and execution_time_ms.
**Validates: Requirements 1.4**

### Property 5: Error Message Safety
*For any* database operation failure, the error message returned SHALL be descriptive but SHALL NOT contain connection strings, passwords, or other sensitive credentials.
**Validates: Requirements 1.5**

### Property 6: Container Listing Completeness
*For any* container query, listing containers SHALL return all containers with required fields (id, name, image, status, ports, cpu_percent, memory_mb) populated.
**Validates: Requirements 2.1**

### Property 7: Log Retrieval with Filtering
*For any* container log request with level filtering, the returned logs SHALL only include entries matching the specified level and SHALL include timestamps.
**Validates: Requirements 2.2**

### Property 8: Command Execution in Container
*For any* command executed in a container, the execution SHALL return output and exit code, and the exit code SHALL match the actual command exit status.
**Validates: Requirements 2.3**

### Property 9: Resource Statistics Availability
*For any* container, requesting resource statistics SHALL return all metrics (cpu_percent, memory_mb, memory_percent, network_in_mb, network_out_mb).
**Validates: Requirements 2.4**

### Property 10: Container Error Handling
*For any* container operation failure, the error message returned SHALL be descriptive and include troubleshooting suggestions.
**Validates: Requirements 2.5**

### Property 11: HTTP Request Execution
*For any* HTTP request with valid method, URL, headers, and body, executing through the API testing MCP server SHALL return response with status_code, headers, body, and time_ms.
**Validates: Requirements 3.1**

### Property 12: Response Schema Validation
*For any* API response and JSON schema, validating the response against the schema SHALL return validation result indicating whether response conforms to schema.
**Validates: Requirements 3.2**

### Property 13: Batch Test Execution
*For any* batch of API tests, executing the batch SHALL return results for all tests with pass/fail status and SHALL generate a summary with total, passed, and failed counts.
**Validates: Requirements 3.3**

### Property 14: API Error Details
*For any* failed API request, the error response SHALL include request details (method, URL, headers, body) and response details (status, headers, body).
**Validates: Requirements 3.4**

### Property 15: Authentication Support
*For any* HTTP request with Bearer token, API key, or basic authentication, the authentication SHALL be properly applied to the request and the server SHALL accept it.
**Validates: Requirements 3.5**

### Property 16: Memory Entity Creation
*For any* system initialization, all major component entities (Frontend, Backend, Databases, External Services) SHALL be created in Memory.
**Validates: Requirements 4.1**

### Property 17: Memory Information Retrieval
*For any* Memory query, the system SHALL return relevant project information including architecture decisions and API documentation.
**Validates: Requirements 4.2**

### Property 18: Memory Persistence and Search
*For any* information stored in Memory, the information SHALL persist and be retrievable through search queries.
**Validates: Requirements 4.3**

### Property 19: Configuration Loading
*When* Kiro starts, all MCP server configurations from `.kiro/settings/mcp.json` SHALL be loaded and available.
**Validates: Requirements 5.1**

### Property 20: Tool Execution with Environment
*For any* MCP tool execution, the tool SHALL execute with proper environment variables and error handling.
**Validates: Requirements 5.2**

### Property 21: MCP Server Error Handling
*When* an MCP server fails, the error message returned SHALL be clear and include recovery suggestions.
**Validates: Requirements 5.3**

### Property 22: Auto-Approve Functionality
*For any* tool configured in auto-approve rules, the tool SHALL execute without user confirmation.
**Validates: Requirements 5.4**

### Property 23: Feature Workflow Execution
*For any* feature workflow execution, all workflow steps (branch creation, Memory entity creation, security scanning) SHALL execute in order.
**Validates: Requirements 6.1**

### Property 24: Bug Fix Workflow Execution
*For any* bug fix workflow execution, all workflow steps (issue analysis, endpoint testing, security validation) SHALL execute in order.
**Validates: Requirements 6.2**

### Property 25: Deployment Workflow Execution
*For any* deployment workflow execution, all workflow steps (security scanning, container building, deployment verification) SHALL execute in order.
**Validates: Requirements 6.3**

### Property 26: Security Audit Workflow
*For any* security audit workflow execution, all security scans SHALL run and a report SHALL be generated.
**Validates: Requirements 6.4**

## Error Handling

### Database MCP Error Handling

- **Connection Errors**: Return descriptive error without exposing connection details
- **Query Errors**: Return SQL error message with query context
- **Timeout Errors**: Return timeout error with suggestion to increase timeout
- **Authentication Errors**: Return auth error without exposing credentials

### Docker MCP Error Handling

- **Connection Errors**: Return Docker daemon connection error with troubleshooting steps
- **Container Not Found**: Return clear error indicating container doesn't exist
- **Permission Errors**: Return permission error with suggestion to check Docker permissions
- **Command Execution Errors**: Return command output and exit code

### API Testing MCP Error Handling

- **Connection Errors**: Return connection error with URL and timeout info
- **Timeout Errors**: Return timeout error with suggestion to increase timeout
- **SSL Errors**: Return SSL error with certificate info
- **Response Parsing Errors**: Return parsing error with response preview

## Testing Strategy

### Unit Testing

Unit tests verify individual MCP server components in isolation:

- Database connection and query execution
- Docker container listing and command execution
- HTTP request building and response parsing
- Error handling and edge cases

**Test Framework**: pytest with pytest-asyncio for async operations

### Property-Based Testing

Property-based tests verify universal properties that should hold across all inputs:

- **Property 1**: Database query execution returns all required fields
- **Property 2**: Schema information is complete and accurate
- **Property 3**: Container listing includes all required fields
- **Property 4**: HTTP requests execute with proper response format
- **Property 5**: Error messages are descriptive but safe
- **Property 6**: Authentication is properly applied
- **Property 7**: Batch operations complete all items
- **Property 8**: Memory persistence and retrieval works correctly

**Test Framework**: hypothesis for property-based testing with 100+ iterations per property

**Test Configuration**:
```python
# Each property test tagged with:
# **Feature: mcp-servers-enhancement, Property {number}: {property_text}**
# **Validates: Requirements {requirement_number}**

@given(query=st.text(min_size=1))
def test_database_query_returns_required_fields(query):
    """Property 1: Database query execution returns all required fields"""
    # Test implementation
    pass
```

### Integration Testing

Integration tests verify MCP servers work together:

- Database MCP + Memory MCP: Store query results in Memory
- Docker MCP + API Testing MCP: Test API in running container
- All MCP servers: Workflow execution with multiple servers

### Test Coverage

- Minimum 80% code coverage for all MCP servers
- 100% coverage for error handling paths
- All acceptance criteria covered by tests

