# Performance Optimization Guide

## Overview

The MCP servers include several performance optimizations to ensure fast response times and efficient resource usage.

## Caching Strategy

### Query Cache
- **Purpose**: Cache database query results
- **TTL**: 60 seconds (configurable)
- **Max Size**: 500 entries
- **Eviction**: LRU (Least Recently Used)

**What's Cached**:
- SELECT query results (read-only)
- Schema information
- Database statistics

**Not Cached**:
- INSERT/UPDATE/DELETE operations
- Failed queries
- Queries with errors

**Usage**:
```python
from cache import query_cache

# Automatic caching in database_mcp.py
result = query_cache.get_query_result("postgresql", "SELECT * FROM users", ())
if result:
    return result  # Cache hit

# Execute query...
query_cache.set_query_result("postgresql", "SELECT * FROM users", (), result)
```

### Schema Cache
- **Purpose**: Cache database schema information
- **TTL**: 600 seconds (10 minutes)
- **Max Size**: 100 entries
- **Invalidation**: On schema changes (migrations)

**What's Cached**:
- Table/collection structures
- Column definitions
- Index information
- Constraints

**Usage**:
```python
from cache import schema_cache

# Check cache first
schema = schema_cache.get_schema("postgresql", "users")
if schema:
    return schema

# Fetch schema...
schema_cache.set_schema("postgresql", "users", schema)
```

### Container Cache
- **Purpose**: Cache Docker container information
- **TTL**: 30 seconds
- **Max Size**: 200 entries

**What's Cached**:
- Container lists
- Container statistics
- Resource usage metrics

**Usage**:
```python
from cache import container_cache

# Cache container list
containers = container_cache.get_container_list(all_containers=False)
if containers:
    return containers

# Fetch containers...
container_cache.set_container_list(False, result)
```

## Connection Pooling

### PostgreSQL
- **Implementation**: Native psycopg3 connection pooling
- **Pool Size**: 5-10 connections (configurable)
- **Max Overflow**: 10 connections
- **Pool Timeout**: 30 seconds

**Configuration**:
```python
# In database_mcp.py
conn = await psycopg.AsyncConnection.connect(
    DATABASE_URL,
    autocommit=False,
    prepare_threshold=5  # Prepare frequently used queries
)
```

### MongoDB
- **Implementation**: Native driver connection pooling
- **Pool Size**: Auto-managed
- **Max Pool Size**: 100

### Redis
- **Implementation**: Connection pool per instance
- **Pool Size**: 10
- **Max Connections**: 50

## Query Optimization

### Parameterized Queries
All SQL queries use parameterized statements to prevent SQL injection and enable query plan caching.

```python
# Good - parameterized
await cursor.execute("SELECT * FROM users WHERE id = %s", [user_id])

# Bad - string concatenation
await cursor.execute(f"SELECT * FROM users WHERE id = {user_id}")
```

### Query Analysis
Use `db_analyze` tool to identify slow queries:
```python
{
    "database": "postgresql",
    "query": "SELECT * FROM users WHERE email = %s",
    "params": ["john@example.com"]
}
```

Returns execution plan with metrics:
- Rows scanned
- Rows returned
- Index usage
- Execution time

## Docker Optimization

### Batch Operations
When possible, batch Docker operations to reduce API calls:

```python
# Good - single call
containers = docker_ps(all=True)

# Bad - multiple calls
for name in container_names:
    container = get_container(name)
```

### Stats Caching
Container statistics are cached for 30 seconds to avoid excessive Docker API calls.

### Log Streaming
- Logs are fetched in chunks
- Tail parameter limits amount of data
- Level filtering done server-side when possible

## HTTP Request Optimization

### Connection Pooling
HTTP client (httpx) uses connection pooling:
- **Max Connections**: 100
- **Max Keepalive**: 20
- **Timeout**: 30 seconds (configurable)

### Request Batching
Use `test_batch` for multiple API tests instead of individual requests:

```python
# Good - batch
test_batch({
    "tests": [
        {"name": "Test 1", "method": "GET", "url": "/api/users"},
        {"name": "Test 2", "method": "GET", "url": "/api/jobs"}
    ]
})

# Less efficient - individual
http_request({"method": "GET", "url": "/api/users"})
http_request({"method": "GET", "url": "/api/jobs"})
```

## Memory Management

### Cache Size Limits
All caches have size limits to prevent memory exhaustion:
- Query Cache: 500 entries (~5MB typical)
- Schema Cache: 100 entries (~1MB typical)
- Container Cache: 200 entries (~2MB typical)

### LRU Eviction
Least recently used entries are automatically evicted when cache is full.

### Manual Cache Management
```python
from cache import query_cache, schema_cache, container_cache

# Clear specific cache
query_cache.clear()

# Get cache statistics
stats = query_cache.stats()
# Returns: {size, max_size, hits, misses, hit_rate}
```

## Performance Monitoring

### Cache Hit Rates
Monitor cache performance:

```python
from cache import query_cache

stats = query_cache.stats()
print(f"Hit rate: {stats['hit_rate']}%")
print(f"Total requests: {stats['total_requests']}")
```

**Target Hit Rates**:
- Query Cache: >70%
- Schema Cache: >90%
- Container Cache: >60%

### Execution Timing
All MCP operations return execution time:

```python
{
    "success": true,
    "execution_time_ms": 45.2,
    ...
}
```

Monitor these metrics to identify slow operations.

## Best Practices

### 1. Use Schema Cache
Always fetch schema once and cache:
```python
# First call - cached
schema = db_schema({"database": "postgresql", "table": "users"})

# Subsequent calls - instant
schema = db_schema({"database": "postgresql", "table": "users"})
```

### 2. Limit Result Sets
Use LIMIT clauses in queries:
```python
# Good
"SELECT * FROM users LIMIT 100"

# Bad - fetches all rows
"SELECT * FROM users"
```

### 3. Use Container Filters
Filter containers to reduce response size:
```python
# Good - specific filter
docker_ps({"filters": {"status": "running"}})

# Less efficient - fetch all
docker_ps({"all": true})
```

### 4. Batch API Tests
Group related API tests:
```python
test_batch({
    "tests": [
        # Group related tests
        {"name": "Auth tests", ...},
        {"name": "User tests", ...}
    ]
})
```

### 5. Use Appropriate TTLs
Adjust cache TTLs based on data volatility:
- **High volatility** (container stats): 30s
- **Medium volatility** (query results): 60s
- **Low volatility** (schemas): 600s

## Performance Tuning

### Environment Variables

```bash
# Query cache size
QUERY_CACHE_SIZE=500
QUERY_CACHE_TTL=60

# Schema cache size
SCHEMA_CACHE_SIZE=100
SCHEMA_CACHE_TTL=600

# Container cache size
CONTAINER_CACHE_SIZE=200
CONTAINER_CACHE_TTL=30

# Connection pool sizes
DB_POOL_SIZE=10
DB_MAX_OVERFLOW=10

# HTTP client settings
HTTP_MAX_CONNECTIONS=100
HTTP_TIMEOUT=30
```

### Database Optimization

**PostgreSQL**:
```sql
-- Enable query plan caching
ALTER SYSTEM SET plan_cache_mode = 'auto';

-- Increase shared buffers
ALTER SYSTEM SET shared_buffers = '256MB';

-- Enable parallel queries
ALTER SYSTEM SET max_parallel_workers_per_gather = 2;
```

**MongoDB**:
```javascript
// Create indexes for frequently queried fields
db.users.createIndex({email: 1})
db.jobs.createIndex({status: 1, created_at: -1})
```

**Redis**:
```bash
# Increase max memory
maxmemory 256mb

# Set eviction policy
maxmemory-policy allkeys-lru
```

## Benchmarks

### Query Performance
- **Cached query**: <1ms
- **Uncached SELECT**: 10-50ms
- **Complex JOIN**: 50-200ms
- **Schema fetch**: 20-100ms (cached: <1ms)

### Docker Operations
- **Container list**: 50-200ms (cached: <1ms)
- **Container logs**: 100-500ms (depends on size)
- **Command execution**: 100ms-2s (depends on command)
- **Stats fetch**: 50-150ms (cached: <1ms)

### API Testing
- **Single request**: 10-500ms (depends on API)
- **Batch tests**: 100ms-5s (depends on count)
- **Schema validation**: <1ms

## Troubleshooting

### High Cache Miss Rate
**Issue**: Cache hit rate <50%

**Solutions**:
1. Increase cache size
2. Increase TTL
3. Check if queries are parameterized consistently
4. Verify data isn't changing rapidly

### High Memory Usage
**Issue**: MCP server using >500MB RAM

**Solutions**:
1. Reduce cache sizes
2. Clear caches: `cache.clear()`
3. Restart MCP server
4. Check for memory leaks

### Slow Queries
**Issue**: Queries taking >1 second

**Solutions**:
1. Use `db_analyze` to check execution plan
2. Add indexes to frequently queried columns
3. Use LIMIT clauses
4. Consider query optimization

### Docker API Slowness
**Issue**: Docker operations taking >2 seconds

**Solutions**:
1. Check Docker daemon health: `docker info`
2. Restart Docker daemon
3. Increase cache TTL
4. Use container filters

## Monitoring

### Prometheus Metrics (Future)
```python
# Example metrics to expose
mcp_cache_hit_rate{cache="query"} 0.75
mcp_cache_size{cache="query"} 245
mcp_query_duration_ms{database="postgresql"} 45.2
mcp_docker_operation_duration_ms{operation="ps"} 120.5
```

### Logging
Enable debug logging for performance metrics:
```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

Logs include:
- Query execution times
- Cache hit/miss events
- Connection pool stats
- API request durations

## Summary

**Key Optimizations**:
1. ✅ Multi-level caching (query, schema, container)
2. ✅ Connection pooling for all databases
3. ✅ Parameterized queries for plan caching
4. ✅ HTTP connection pooling
5. ✅ LRU eviction for memory management
6. ✅ Batch operations support

**Expected Performance**:
- **Query execution**: 10-50ms (cached: <1ms)
- **Schema fetch**: 20-100ms (cached: <1ms)
- **Docker operations**: 50-200ms (cached: <1ms)
- **API tests**: 10-500ms per request
- **Memory usage**: <200MB per server

**Target SLA**:
- **99%** of operations complete in <100ms (with cache)
- **95%** of operations complete in <500ms (without cache)
- **90%+** cache hit rate for repeated operations
