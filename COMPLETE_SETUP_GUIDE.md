## Complete Setup Guide for MCP Servers

**Version**: 1.0.0  
**Date**: November 21, 2025  
**Completion**: 100% (All Phases Complete)

---

## 🎯 Quick Start (5 Minutes)

### Prerequisites
- Python 3.11+ installed
- Docker Desktop running (Windows)
- PostgreSQL, MongoDB, Redis running
- Kiro IDE installed
- Git configured

### Step 1: Install Dependencies
```bash
cd C:\Users\chira\.kiro\packages\python-services
pip install -r src/mcp_servers/requirements.txt
```

### Step 2: Configure Environment
Edit `.env` file in the root directory:
```bash
# Database MCP
DATABASE_URL=postgresql://user:password@localhost:5432/givemejobs
MONGODB_URL=mongodb://localhost:27017/givemejobs
REDIS_URL=redis://localhost:6379/0

# Docker MCP (Windows)
DOCKER_HOST=npipe:////./pipe/docker_engine

# API Testing MCP
API_BASE_URL=http://localhost:8000
API_KEY=your-api-key-here
```

### Step 3: Verify Installation
```bash
cd packages/python-services/src/mcp_servers
python -c "import database_mcp; import docker_mcp; import api_testing_mcp; print('[SUCCESS] All MCP servers ready!')"
```

### Step 4: Restart Kiro
Restart Kiro IDE to load the new MCP servers.

### Step 5: Test
Ask Kiro:
```
"List all tables in the PostgreSQL database"
"Show me running Docker containers"
"Make a GET request to /api/health"
```

---

## 📖 Detailed Setup

### Part 1: Environment Setup

#### 1.1 Python Environment
```bash
# Check Python version
python --version  # Should be 3.11+

# Create virtual environment (optional but recommended)
python -m venv .venv
.venv\Scripts\activate  # Windows

# Install all dependencies
cd packages/python-services
pip install -r requirements.txt
pip install -r src/mcp_servers/requirements.txt
```

#### 1.2 Database Setup

**PostgreSQL**:
```bash
# Start PostgreSQL
docker-compose up -d postgres

# Verify connection
psql -h localhost -U givemejobs -d givemejobs_db

# Run migrations
cd packages/python-services
alembic upgrade head
```

**MongoDB**:
```bash
# Start MongoDB
docker-compose up -d mongodb

# Verify connection
mongosh mongodb://localhost:27017/givemejobs
```

**Redis**:
```bash
# Start Redis
docker-compose up -d redis

# Verify connection
redis-cli ping  # Should return "PONG"
```

#### 1.3 Docker Setup
```bash
# Check Docker is running
docker info

# Start required containers
docker-compose up -d

# Verify containers
docker ps
```

### Part 2: MCP Server Configuration

#### 2.1 Database MCP Server
Location: `packages/python-services/src/mcp_servers/database_mcp.py`

**Features**:
- PostgreSQL query execution
- MongoDB document operations
- Redis commands
- Schema inspection
- Migration management
- Query performance analysis

**Configuration** (`.kiro/settings/mcp.json`):
```json
{
  "database": {
    "command": "python",
    "args": ["packages\\python-services\\src\\mcp_servers\\database_mcp.py"],
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

**Testing**:
```bash
# Test PostgreSQL
python packages/python-services/src/mcp_servers/database_mcp.py

# In Kiro, ask:
"Query the users table"
"Show me the schema for users table"
```

#### 2.2 Docker MCP Server
Location: `packages/python-services/src/mcp_servers/docker_mcp.py`

**Features**:
- Container listing with stats
- Log streaming with filtering
- Command execution
- Resource monitoring

**Configuration** (`.kiro/settings/mcp.json`):
```json
{
  "docker": {
    "command": "python",
    "args": ["packages\\python-services\\src\\mcp_servers\\docker_mcp.py"],
    "env": {
      "DOCKER_HOST": "${DOCKER_HOST}"
    },
    "disabled": false,
    "autoApprove": ["docker_ps", "docker_logs", "docker_stats"]
  }
}
```

**Testing**:
```bash
# Test Docker connection
docker info

# In Kiro, ask:
"List all Docker containers"
"Show me backend container logs"
```

#### 2.3 API Testing MCP Server
Location: `packages/python-services/src/mcp_servers/api_testing_mcp.py`

**Features**:
- HTTP request execution (all methods)
- Authentication (Bearer, API Key, Basic)
- Response validation
- Batch testing

**Configuration** (`.kiro/settings/mcp.json`):
```json
{
  "api_testing": {
    "command": "python",
    "args": ["packages\\python-services\\src\\mcp_servers\\api_testing_mcp.py"],
    "env": {
      "API_BASE_URL": "${API_BASE_URL}",
      "API_KEY": "${API_KEY}"
    },
    "disabled": false,
    "autoApprove": ["http_request", "validate_response"]
  }
}
```

**Testing**:
```bash
# Test API is running
curl http://localhost:8000/api/health

# In Kiro, ask:
"Test the health endpoint"
"Make a GET request to /api/users"
```

### Part 3: Memory Population

#### 3.1 Generate Memory Commands
```bash
cd packages/python-services/src/mcp_servers
python memory_population.py
```

This generates `memory_population_commands.txt` with 69 commands.

#### 3.2 Execute Commands in Kiro
Open `memory_population_commands.txt` and execute each command in Kiro, or ask:
```
"Populate Memory with GiveMeJobs platform context"
```

#### 3.3 Verify Memory
```
"What components does GiveMeJobs platform have?"
"Show me the authentication API endpoints"
"What are the security requirements?"
```

### Part 4: Workflow Setup

#### 4.1 Feature Development Workflow
```bash
cd packages/python-services/src/mcp_servers/workflows
python feature_development.py
```

**Usage in Kiro**:
```
"Start feature development workflow for user settings page"
```

#### 4.2 Bug Fix Workflow
```bash
python bug_fix.py
```

**Usage in Kiro**:
```
"Run bug fix workflow for issue #123"
```

#### 4.3 Deployment Workflow
```bash
python deployment.py
```

**Usage in Kiro**:
```
"Execute deployment workflow for staging environment"
```

#### 4.4 Security Audit Workflow
```bash
python security_audit.py
```

**Usage in Kiro**:
```
"Run a comprehensive security audit"
```

### Part 5: Testing

#### 5.1 Run Unit Tests
```bash
cd packages/python-services/src/mcp_servers
pytest tests/ -m unit -v
```

#### 5.2 Run Property Tests
```bash
pytest tests/test_properties.py -v
```

#### 5.3 Run Integration Tests
```bash
pytest tests/test_integration.py -v
```

#### 5.4 Run All Tests with Coverage
```bash
pytest tests/ --cov=. --cov-report=html
```

Open `tests/coverage/index.html` to view coverage report.

**Expected Coverage**: 80%+

### Part 6: Performance Optimization

#### 6.1 Enable Caching
Caching is enabled by default. Monitor cache performance:

```python
from cache import query_cache, schema_cache, container_cache

# Get cache statistics
print(query_cache.stats())
print(schema_cache.stats())
print(container_cache.stats())
```

#### 6.2 Configure Cache Settings
Edit `cache.py` to adjust:
- Cache sizes
- TTL values
- Eviction policies

#### 6.3 Monitor Performance
All MCP operations return timing:
```json
{
  "success": true,
  "execution_time_ms": 45.2,
  ...
}
```

Monitor these metrics to identify bottlenecks.

---

## 🔧 Configuration Reference

### Environment Variables

**Required**:
```bash
DATABASE_URL=postgresql://user:password@localhost:5432/givemejobs
MONGODB_URL=mongodb://localhost:27017/givemejobs
REDIS_URL=redis://localhost:6379/0
DOCKER_HOST=npipe:////./pipe/docker_engine  # Windows
API_BASE_URL=http://localhost:8000
```

**Optional**:
```bash
# Cache configuration
QUERY_CACHE_SIZE=500
QUERY_CACHE_TTL=60
SCHEMA_CACHE_SIZE=100
SCHEMA_CACHE_TTL=600
CONTAINER_CACHE_SIZE=200
CONTAINER_CACHE_TTL=30

# Performance tuning
DB_POOL_SIZE=10
HTTP_MAX_CONNECTIONS=100
HTTP_TIMEOUT=30

# Logging
LOG_LEVEL=INFO
MCP_DEBUG=false
```

### MCP Server Configuration

All MCP servers are configured in `.kiro/settings/mcp.json`:

```json
{
  "mcpServers": {
    "database": { ...configuration... },
    "docker": { ...configuration... },
    "api_testing": { ...configuration... }
  }
}
```

**Auto-Approve Rules**:
- Safe operations auto-approved (queries, schema inspection, logs)
- Dangerous operations require approval (migrations, command execution)

---

## 🧪 Verification Checklist

### Database MCP
- [ ] Can query PostgreSQL
- [ ] Can query MongoDB
- [ ] Can execute Redis commands
- [ ] Can inspect schemas
- [ ] Can run migrations
- [ ] Can analyze query performance

### Docker MCP
- [ ] Can list containers
- [ ] Can view logs
- [ ] Can execute commands
- [ ] Can monitor resources
- [ ] Error messages are helpful

### API Testing MCP
- [ ] Can make GET requests
- [ ] Can make POST requests
- [ ] Can authenticate with Bearer token
- [ ] Can validate responses
- [ ] Can run batch tests

### Memory
- [ ] Platform entities created
- [ ] API endpoints documented
- [ ] Schemas documented
- [ ] Can search Memory

### Workflows
- [ ] Feature workflow generates correctly
- [ ] Bug fix workflow generates correctly
- [ ] Deployment workflow generates correctly
- [ ] Security audit workflow generates correctly

### Testing
- [ ] All unit tests pass
- [ ] Property tests pass
- [ ] Integration tests pass
- [ ] 80%+ code coverage achieved

### Performance
- [ ] Caching is enabled
- [ ] Cache hit rate >70%
- [ ] Queries execute in <100ms (cached)
- [ ] No memory leaks

---

## 🐛 Troubleshooting

### MCP Servers Not Loading
**Problem**: Servers don't appear in Kiro

**Solutions**:
1. Check Python version: `python --version`
2. Verify dependencies: `pip list | findstr "psycopg docker httpx"`
3. Check `.kiro/settings/mcp.json` syntax
4. Restart Kiro
5. Check Kiro logs for errors

### Database Connection Failed
**Problem**: Cannot connect to database

**Solutions**:
1. Verify database is running: `docker ps`
2. Check DATABASE_URL in `.env`
3. Test connection manually:
   ```bash
   psql -h localhost -U givemejobs -d givemejobs_db
   mongosh mongodb://localhost:27017
   redis-cli ping
   ```
4. Check firewall settings
5. Verify credentials

### Docker Daemon Connection Failed
**Problem**: Docker MCP can't connect

**Solutions**:
1. Check Docker is running: `docker info`
2. Verify DOCKER_HOST environment variable
3. On Windows, ensure Docker Desktop is running
4. Check Docker socket permissions
5. Try: `docker ps` to test access

### API Tests Timeout
**Problem**: HTTP requests timeout

**Solutions**:
1. Check API is running: `curl http://localhost:8000/api/health`
2. Verify API_BASE_URL in `.env`
3. Increase timeout in request
4. Check network connectivity
5. Check firewall settings

### ImportError: No module named 'xxx'
**Problem**: Missing Python dependency

**Solutions**:
1. Install dependencies: `pip install -r requirements.txt`
2. Check virtual environment is activated
3. Reinstall specific package: `pip install package-name`
4. Clear pip cache: `pip cache purge`

### Tests Failing
**Problem**: Unit/property tests fail

**Solutions**:
1. Check all dependencies installed
2. Verify mocks are working
3. Run single test: `pytest tests/test_database_mcp.py::test_name -v`
4. Check test logs for details
5. Verify test environment setup

### Low Cache Hit Rate
**Problem**: Cache hit rate <50%

**Solutions**:
1. Increase cache size in `cache.py`
2. Increase TTL values
3. Check queries are parameterized
4. Monitor cache statistics
5. Clear cache and restart

### High Memory Usage
**Problem**: MCP server using >500MB RAM

**Solutions**:
1. Reduce cache sizes
2. Clear caches: `cache.clear()`
3. Restart MCP servers
4. Check for memory leaks
5. Monitor with `docker stats`

---

## 📚 Additional Resources

### Documentation
- **MCP Servers**: `packages/python-services/src/mcp_servers/README.md`
- **Workflows**: `packages/python-services/src/mcp_servers/workflows/README.md`
- **Performance**: `packages/python-services/src/mcp_servers/PERFORMANCE.md`
- **Specification**: `.kiro/specs/mcp-servers-enhancement/`

### Examples
- Feature workflow example: `feature_workflow_example.md`
- Bug fix workflow example: `bugfix_workflow_example.md`
- Deployment workflow example: `deployment_workflow_example.md`
- Security audit example: `security_audit_workflow.md`

### Navigation
- **Master Index**: `MCP_MASTER_INDEX.md`
- **Final Summary**: `MCP_IMPLEMENTATION_FINAL_SUMMARY.md`
- **Executive Summary**: `EXECUTIVE_SUMMARY_MCP_IMPLEMENTATION.md`

---

## 🎓 Best Practices

### Development
1. Always test MCP servers after configuration changes
2. Use workflows for consistent development processes
3. Monitor cache hit rates and optimize
4. Run security audits before releases
5. Keep Memory updated with project changes

### Performance
1. Enable caching for repeated operations
2. Use connection pooling
3. Batch operations when possible
4. Set appropriate cache TTLs
5. Monitor query execution times

### Security
1. Never commit credentials to git
2. Use environment variables for sensitive data
3. Run security audits regularly
4. Keep dependencies updated
5. Review logs for suspicious activity

### Testing
1. Run tests before committing
2. Maintain 80%+ code coverage
3. Use property tests for edge cases
4. Test workflows end-to-end
5. Monitor test execution time

---

## ✅ Final Checklist

- [ ] All dependencies installed
- [ ] All databases running
- [ ] Docker daemon running
- [ ] Environment variables configured
- [ ] All 3 MCP servers configured in Kiro
- [ ] Kiro restarted
- [ ] All MCP servers tested
- [ ] Memory populated
- [ ] All workflows tested
- [ ] All tests passing
- [ ] 80%+ code coverage
- [ ] Performance optimizations enabled
- [ ] Documentation reviewed

---

## 🎉 You're Done!

Everything is set up and ready to use. Start using your new MCP servers and workflows to boost productivity!

**Quick Test**:
```
"List Docker containers"
"Query the users table"
"Test the API health endpoint"
"What components does the platform have?"
```

---

**Setup Guide Version**: 1.0.0  
**Last Updated**: November 21, 2025  
**Status**: ✅ Complete  
**Support**: See documentation in `packages/python-services/src/mcp_servers/`
