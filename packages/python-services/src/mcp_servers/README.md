# MCP Servers for GiveMeJobs Platform

This directory contains three Model Context Protocol (MCP) servers that provide development tools for database management, Docker container management, and API testing.

## Overview

### Database MCP Server (`database_mcp.py`)
Provides direct database access for PostgreSQL, MongoDB, and Redis with query execution, schema inspection, migration management, and performance analysis.

### Docker MCP Server (`docker_mcp.py`)
Manages Docker containers with listing, log streaming, command execution, and resource monitoring capabilities.

### API Testing MCP Server (`api_testing_mcp.py`)
Executes HTTP requests with authentication, validates responses against JSON schemas, and runs batch API tests.

## Installation

### 1. Install Dependencies

From the `python-services` directory:

```bash
pip install -r src/mcp_servers/requirements.txt
```

Or install from the main requirements.txt:

```bash
pip install -r requirements.txt
```

### 2. Configure Environment Variables

Copy `.env.example` and set the required variables:

```bash
# Database MCP Server
DATABASE_URL=postgresql://user:password@localhost:5432/givemejobs
MONGODB_URL=mongodb://localhost:27017/givemejobs
REDIS_URL=redis://localhost:6379/0

# Docker MCP Server
DOCKER_HOST=unix:///var/run/docker.sock  # Linux/Mac
# DOCKER_HOST=npipe:////./pipe/docker_engine  # Windows

# API Testing MCP Server
API_BASE_URL=http://localhost:8000
API_KEY=your-api-key-here
```

### 3. Configure in Kiro

The servers are already configured in `.kiro/settings/mcp.json`. Ensure the paths are correct for your system.

## Usage

### Database MCP Server

#### Query PostgreSQL

```python
# Execute a SELECT query
{
  "database": "postgresql",
  "query": "SELECT * FROM users WHERE id = %s",
  "params": [123]
}
```

#### Query MongoDB

```python
# Find documents in a collection
{
  "database": "mongodb",
  "query": "{\"status\": \"active\"}",
  "collection": "users"
}
```

#### Query Redis

```python
# Get a key value
{
  "database": "redis",
  "query": "GET user:123"
}
```

#### Get Schema

```python
# PostgreSQL table schema
{
  "database": "postgresql",
  "table_or_collection": "users"
}

# MongoDB collection schema
{
  "database": "mongodb",
  "table_or_collection": "users"
}
```

#### Run Migrations

```python
# Run migration up
{
  "migration_name": "add_user_roles",
  "direction": "up"
}

# Rollback migration
{
  "migration_name": "add_user_roles",
  "direction": "down"
}
```

#### Analyze Query Performance

```python
# Analyze PostgreSQL query
{
  "database": "postgresql",
  "query": "SELECT * FROM users WHERE created_at > %s",
  "params": ["2025-01-01"]
}

# Analyze MongoDB query
{
  "database": "mongodb",
  "query": "{\"collection\": \"users\", \"filter\": {\"status\": \"active\"}}"
}
```

### Docker MCP Server

#### List Containers

```python
# List running containers
{
  "all": false
}

# List all containers (including stopped)
{
  "all": true,
  "filters": {"status": "exited"}
}
```

#### Get Container Logs

```python
# Get last 100 lines
{
  "container": "backend",
  "tail": 100,
  "timestamps": true,
  "level": "all"
}

# Get only errors
{
  "container": "backend",
  "tail": 50,
  "level": "error"
}
```

#### Execute Command in Container

```python
# Run a command
{
  "container": "backend",
  "command": "python -m pytest tests/",
  "timeout": 120
}
```

#### Get Container Stats

```python
# Get resource usage
{
  "container": "backend"
}
```

### API Testing MCP Server

#### Execute HTTP Request

```python
# GET request
{
  "method": "GET",
  "url": "/api/v1/users/123"
}

# POST request with body
{
  "method": "POST",
  "url": "/api/v1/users",
  "body": {
    "name": "John Doe",
    "email": "john@example.com"
  }
}

# Request with Bearer token
{
  "method": "GET",
  "url": "/api/v1/protected",
  "auth": {
    "type": "bearer",
    "value": "your-token-here"
  }
}

# Request with API key
{
  "method": "GET",
  "url": "/api/v1/data",
  "auth": {
    "type": "api_key",
    "value": "your-api-key"
  }
}

# Request with Basic auth
{
  "method": "GET",
  "url": "/api/v1/admin",
  "auth": {
    "type": "basic",
    "username": "admin",
    "password": "password"
  }
}
```

#### Validate Response

```python
# Validate against JSON schema
{
  "response": {
    "id": 123,
    "name": "John Doe",
    "email": "john@example.com"
  },
  "schema": {
    "type": "object",
    "properties": {
      "id": {"type": "number"},
      "name": {"type": "string"},
      "email": {"type": "string", "format": "email"}
    },
    "required": ["id", "name", "email"]
  }
}
```

#### Run Batch Tests

```python
# Execute multiple tests
{
  "tests": [
    {
      "name": "Get users",
      "method": "GET",
      "url": "/api/v1/users",
      "expected_status": 200
    },
    {
      "name": "Create user",
      "method": "POST",
      "url": "/api/v1/users",
      "body": {
        "name": "Jane Doe",
        "email": "jane@example.com"
      },
      "expected_status": 201,
      "schema": {
        "type": "object",
        "properties": {
          "id": {"type": "number"}
        },
        "required": ["id"]
      }
    }
  ]
}
```

## Tools Reference

### Database MCP Server Tools

| Tool | Description | Auto-Approve |
|------|-------------|--------------|
| `db_query` | Execute SQL/NoSQL queries | ✅ Yes |
| `db_schema` | Inspect database schema | ✅ Yes |
| `db_migrate` | Run database migrations | ❌ No |
| `db_analyze` | Analyze query performance | ✅ Yes |

### Docker MCP Server Tools

| Tool | Description | Auto-Approve |
|------|-------------|--------------|
| `docker_ps` | List containers | ✅ Yes |
| `docker_logs` | Get container logs | ✅ Yes |
| `docker_exec` | Execute command in container | ❌ No |
| `docker_stats` | Get resource statistics | ✅ Yes |

### API Testing MCP Server Tools

| Tool | Description | Auto-Approve |
|------|-------------|--------------|
| `http_request` | Execute HTTP request | ✅ Yes |
| `validate_response` | Validate response schema | ✅ Yes |
| `test_batch` | Run batch tests | ❌ No |

## Error Handling

All MCP servers implement comprehensive error handling:

- **Connection Errors**: Clear messages with troubleshooting suggestions
- **Query Errors**: Descriptive errors without exposing sensitive data
- **Timeout Errors**: Suggestions to adjust timeout parameters
- **Not Found Errors**: Helpful messages for missing resources

Sensitive information (passwords, tokens, connection strings) is automatically redacted from error messages.

## Troubleshooting

### Database MCP Server

**Connection Failed**
- Verify database is running: `psql -h localhost -U user -d givemejobs`
- Check connection string in `.env`
- Ensure network connectivity

**Query Timeout**
- Increase `timeout` parameter
- Optimize query with indexes
- Check database performance

### Docker MCP Server

**Docker Daemon Connection Failed**
- Check Docker is running: `docker info`
- Verify `DOCKER_HOST` environment variable
- Check Docker socket permissions (Linux/Mac)

**Container Not Found**
- List containers: `docker ps -a`
- Verify container name/ID
- Check if container exists

### API Testing MCP Server

**Request Timeout**
- Increase `timeout` parameter
- Check server is responding
- Verify network connectivity

**SSL/TLS Errors**
- Check certificate validity
- Use `http://` for local development
- Configure SSL verification

## Performance Considerations

### Database MCP Server
- Connection pooling for PostgreSQL
- Reuses connections when possible
- Query timeout defaults to 30 seconds
- EXPLAIN ANALYZE runs twice (once for plan, once for results)

### Docker MCP Server
- Stats collected on-demand (not streaming)
- Container listing caches stats for performance
- Log streaming limited by `tail` parameter

### API Testing MCP Server
- Async HTTP client with connection pooling
- Request timeout defaults to 30 seconds
- Batch tests run sequentially (not parallel)
- Response bodies cached in memory

## Security

### Database MCP Server
- Parameterized queries prevent SQL injection
- Connection strings not exposed in errors
- Safe error messages without credentials

### Docker MCP Server
- Command execution requires explicit approval
- Container access limited to Docker daemon permissions
- Sensitive output redacted

### API Testing MCP Server
- Authentication tokens not logged
- SSL/TLS supported
- Headers can include sensitive data (use with caution)

## Development

### Running Tests

```bash
cd packages/python-services
pytest src/mcp_servers/tests/ -v
```

### Adding New Tools

1. Define tool schema in `_register_tools()`
2. Implement tool method
3. Add to `_execute_tool()` dispatch
4. Update documentation
5. Add tests

### Debugging

Enable debug logging:

```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

## Architecture

Each MCP server follows the same architecture:

1. **Base Server** (`base_server.py`): Common utilities and JSON-RPC handling
2. **Server Implementation**: Specific tool implementations
3. **Tool Registration**: Schema definitions for each tool
4. **Request Handler**: JSON-RPC request/response handling
5. **Tool Executor**: Async tool execution with error handling

## License

MIT License - See project LICENSE file for details.

## Support

For issues or questions:
- Check troubleshooting section above
- Review error messages and suggestions
- Consult the design document in `.kiro/specs/mcp-servers-enhancement/`
