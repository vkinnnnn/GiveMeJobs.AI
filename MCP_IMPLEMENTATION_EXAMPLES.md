# MCP Implementation Examples - Code Ready

## 🚀 Ready-to-Use Examples for Your Project

---

## 1. DATABASE MCP SERVER EXAMPLE

### Python Implementation

```python
# database_mcp_server.py
import os
import asyncio
from typing import Any
import psycopg
import pymongo
import redis
from mcp.server import Server
from mcp.types import Tool, TextContent

app = Server("database-server")

# Database connections
POSTGRES_URL = os.getenv("DATABASE_URL", "postgresql://user:pass@localhost/givemejobs_db")
MONGODB_URL = os.getenv("MONGODB_URI", "mongodb://localhost:27017/givemejobs_docs")
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")

@app.list_tools()
async def list_tools() -> list[Tool]:
    return [
        Tool(
            name="postgres_query",
            description="Execute PostgreSQL queries",
            inputSchema={
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "SQL query"},
                    "params": {"type": "array", "description": "Query parameters"}
                },
                "required": ["query"]
            }
        ),
        Tool(
            name="mongodb_query",
            description="Query MongoDB collections",
            inputSchema={
                "type": "object",
                "properties": {
                    "collection": {"type": "string"},
                    "query": {"type": "object"},
                    "limit": {"type": "integer"}
                },
                "required": ["collection", "query"]
            }
        ),
        Tool(
            name="redis_get",
            description="Get value from Redis cache",
            inputSchema={
                "type": "object",
                "properties": {
                    "key": {"type": "string"}
                },
                "required": ["key"]
            }
        ),
        Tool(
            name="db_schema",
            description="Get database schema information",
            inputSchema={
                "type": "object",
                "properties": {
                    "database": {"type": "string", "enum": ["postgres", "mongodb"]},
                    "table": {"type": "string"}
                },
                "required": ["database"]
            }
        )
    ]

@app.call_tool()
async def call_tool(name: str, arguments: Any) -> list[TextContent]:
    if name == "postgres_query":
        query = arguments.get("query")
        params = arguments.get("params", [])
        
        try:
            async with await psycopg.AsyncConnection.connect(POSTGRES_URL) as conn:
                result = await conn.execute(query, params)
                rows = await result.fetchall()
                return [TextContent(type="text", text=str(rows))]
        except Exception as e:
            return [TextContent(type="text", text=f"Error: {str(e)}")]
    
    elif name == "mongodb_query":
        collection_name = arguments.get("collection")
        query = arguments.get("query", {})
        limit = arguments.get("limit", 10)
        
        try:
            client = pymongo.MongoClient(MONGODB_URL)
            db = client["givemejobs_docs"]
            collection = db[collection_name]
            results = list(collection.find(query).limit(limit))
            return [TextContent(type="text", text=str(results))]
        except Exception as e:
            return [TextContent(type="text", text=f"Error: {str(e)}")]
    
    elif name == "redis_get":
        key = arguments.get("key")
        
        try:
            r = redis.from_url(REDIS_URL)
            value = r.get(key)
            return [TextContent(type="text", text=str(value))]
        except Exception as e:
            return [TextContent(type="text", text=f"Error: {str(e)}")]
    
    elif name == "db_schema":
        database = arguments.get("database")
        table = arguments.get("table")
        
        if database == "postgres":
            query = """
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = %s
            """
            try:
                async with await psycopg.AsyncConnection.connect(POSTGRES_URL) as conn:
                    result = await conn.execute(query, [table])
                    rows = await result.fetchall()
                    return [TextContent(type="text", text=str(rows))]
            except Exception as e:
                return [TextContent(type="text", text=f"Error: {str(e)}")]
        
        return [TextContent(type="text", text="Unknown database")]

async def main():
    async with stdio_server() as (read_stream, write_stream):
        await app.run(read_stream, write_stream, app.create_initialization_options())

if __name__ == "__main__":
    asyncio.run(main())
```

---

## 2. API TESTING MCP SERVER EXAMPLE

### Python Implementation

```python
# api_testing_mcp_server.py
import asyncio
import httpx
from typing import Any
from mcp.server import Server
from mcp.types import Tool, TextContent

app = Server("api-testing-server")

BASE_URL = "http://localhost:4000"

@app.list_tools()
async def list_tools() -> list[Tool]:
    return [
        Tool(
            name="http_request",
            description="Make HTTP request to API",
            inputSchema={
                "type": "object",
                "properties": {
                    "method": {"type": "string", "enum": ["GET", "POST", "PUT", "DELETE", "PATCH"]},
                    "endpoint": {"type": "string"},
                    "body": {"type": "object"},
                    "headers": {"type": "object"}
                },
                "required": ["method", "endpoint"]
            }
        ),
        Tool(
            name="test_endpoint",
            description="Test API endpoint with validation",
            inputSchema={
                "type": "object",
                "properties": {
                    "endpoint": {"type": "string"},
                    "method": {"type": "string"},
                    "expected_status": {"type": "integer"},
                    "body": {"type": "object"}
                },
                "required": ["endpoint", "method", "expected_status"]
            }
        ),
        Tool(
            name="validate_response",
            description="Validate API response format",
            inputSchema={
                "type": "object",
                "properties": {
                    "response": {"type": "object"},
                    "schema": {"type": "object"}
                },
                "required": ["response", "schema"]
            }
        )
    ]

@app.call_tool()
async def call_tool(name: str, arguments: Any) -> list[TextContent]:
    if name == "http_request":
        method = arguments.get("method", "GET")
        endpoint = arguments.get("endpoint")
        body = arguments.get("body")
        headers = arguments.get("headers", {})
        
        url = f"{BASE_URL}{endpoint}"
        
        try:
            async with httpx.AsyncClient() as client:
                if method == "GET":
                    response = await client.get(url, headers=headers)
                elif method == "POST":
                    response = await client.post(url, json=body, headers=headers)
                elif method == "PUT":
                    response = await client.put(url, json=body, headers=headers)
                elif method == "DELETE":
                    response = await client.delete(url, headers=headers)
                elif method == "PATCH":
                    response = await client.patch(url, json=body, headers=headers)
                
                result = f"""
Status: {response.status_code}
Headers: {dict(response.headers)}
Body: {response.text}
                """
                return [TextContent(type="text", text=result)]
        except Exception as e:
            return [TextContent(type="text", text=f"Error: {str(e)}")]
    
    elif name == "test_endpoint":
        endpoint = arguments.get("endpoint")
        method = arguments.get("method", "GET")
        expected_status = arguments.get("expected_status")
        body = arguments.get("body")
        
        url = f"{BASE_URL}{endpoint}"
        
        try:
            async with httpx.AsyncClient() as client:
                if method == "GET":
                    response = await client.get(url)
                elif method == "POST":
                    response = await client.post(url, json=body)
                elif method == "PUT":
                    response = await client.put(url, json=body)
                elif method == "DELETE":
                    response = await client.delete(url)
                elif method == "PATCH":
                    response = await client.patch(url, json=body)
                
                passed = response.status_code == expected_status
                result = f"""
Test: {method} {endpoint}
Expected Status: {expected_status}
Actual Status: {response.status_code}
Result: {'✓ PASSED' if passed else '✗ FAILED'}
Response: {response.text[:500]}
                """
                return [TextContent(type="text", text=result)]
        except Exception as e:
            return [TextContent(type="text", text=f"Error: {str(e)}")]
    
    return [TextContent(type="text", text="Unknown tool")]

async def main():
    async with stdio_server() as (read_stream, write_stream):
        await app.run(read_stream, write_stream, app.create_initialization_options())

if __name__ == "__main__":
    asyncio.run(main())
```

---

## 3. WORKFLOW AUTOMATION EXAMPLES

### Feature Development Workflow

```
Command: "Start developing the job matching feature"

Automated Steps:

1. Memory: Create feature entity
   - Name: "Job Matching Feature"
   - Status: "In Progress"
   - Priority: "High"

2. Git: Create feature branch
   - Branch: "feature/job-matching"

3. GitHub: Create draft PR
   - Title: "Feature: Job Matching Algorithm"
   - Description: "Implement AI-powered job matching"

4. Perplexity: Research best practices
   - Query: "Best practices for job matching algorithms"
   - Store findings in Memory

5. Snyk: Security baseline
   - Scan code for vulnerabilities
   - Store results in Memory

6. Database: Get schema
   - Query: "SELECT * FROM information_schema.tables"
   - Understand data structure

7. API Testing: List related endpoints
   - GET /api/jobs
   - GET /api/jobs/recommendations
   - POST /api/jobs/match-analysis
```

### Security Audit Workflow

```
Command: "Run full security audit"

Automated Steps:

1. Snyk: Code scan
   - snyk_code_scan path="packages/python-services"
   - Store findings

2. Snyk: Dependency scan
   - snyk_test path="packages/python-services"
   - Check for vulnerable packages

3. Snyk: Container scan
   - snyk_container_test image="givemejobs/backend:latest"
   - Check container vulnerabilities

4. Snyk: IaC scan
   - snyk_iac_test path="k8s/"
   - Check Kubernetes configs

5. Memory: Store audit results
   - Create "Security Audit" entity
   - Store all findings
   - Track remediation

6. GitHub: Create security issues
   - Create issues for each finding
   - Assign to team
   - Set priority
```

### Deployment Workflow

```
Command: "Deploy to production"

Automated Steps:

1. Git: Verify all changes committed
   - git_status
   - Ensure clean working directory

2. Snyk: Full security scan
   - Run all Snyk checks
   - Verify no critical issues

3. Docker: Build production image
   - docker build -t givemejobs/backend:prod
   - Tag with version

4. Kubernetes: Deploy to production
   - kubectl apply -f k8s/production/
   - Wait for rollout

5. Monitoring: Check health
   - Verify all pods running
   - Check metrics
   - Verify endpoints responding

6. Memory: Log deployment
   - Create deployment record
   - Store version info
   - Track deployment time

7. GitHub: Create release
   - Create release tag
   - Add release notes
   - Link to PR
```

---

## 4. MEMORY SERVER USAGE EXAMPLES

### Store Project Architecture

```
Create Entity: "GiveMeJobs Platform"
Type: "Project"
Observations:
- "Enterprise-grade AI-powered job application platform"
- "Microservices architecture"
- "Python FastAPI backend"
- "Next.js 14 frontend"
- "PostgreSQL, MongoDB, Redis databases"
- "OpenAI and Pinecone integrations"

Create Entity: "FastAPI Backend"
Type: "Component"
Observations:
- "Python 3.13"
- "35+ services"
- "80+ API endpoints"
- "Located at: packages/python-services"

Create Relation: "GiveMeJobs Platform uses FastAPI Backend"
```

### Store API Documentation

```
Create Entity: "Job Search API"
Type: "Endpoint"
Observations:
- "GET /api/jobs/search"
- "Query parameters: keyword, location, job_type"
- "Returns: List of jobs with match scores"
- "Authentication: Required (JWT)"
- "Rate limit: 100 requests/15 minutes"

Create Entity: "Job Matching Algorithm"
Type: "Algorithm"
Observations:
- "Weighted scoring: skills (35%), experience (25%), location (15%), salary (10%), culture (15%)"
- "Uses vector embeddings from Pinecone"
- "Implemented in: services/job_matching.py"
- "Performance: <3 seconds per query"
```

---

## 5. QUICK COMMANDS FOR YOUR PROJECT

### Test All APIs

```
Use api_testing to test:
1. POST /api/auth/register
2. POST /api/auth/login
3. GET /api/users/profile
4. GET /api/jobs/search
5. POST /api/documents/resume/generate
6. GET /api/applications
7. POST /api/applications
8. GET /api/analytics/dashboard
```

### Database Queries

```
Use postgres_query to:
1. "SELECT COUNT(*) FROM users"
2. "SELECT * FROM jobs LIMIT 10"
3. "SELECT * FROM applications WHERE status = 'pending'"
4. "SELECT * FROM skills WHERE user_id = $1"
```

### Security Checks

```
Use snyk to:
1. snyk_code_scan path="packages/python-services"
2. snyk_test path="packages/python-services"
3. snyk_container_test image="givemejobs/backend:latest"
4. snyk_iac_test path="k8s/"
```

---

## 6. INTEGRATION WITH YOUR STACK

### FastAPI Integration

```python
# In your FastAPI app
from mcp_client import MCPClient

mcp = MCPClient()

@app.get("/api/jobs/search")
async def search_jobs(query: str):
    # Use Perplexity to understand query intent
    intent = await mcp.perplexity_search(f"Analyze job search intent: {query}")
    
    # Query database
    results = await mcp.postgres_query(
        "SELECT * FROM jobs WHERE title ILIKE %s",
        [f"%{query}%"]
    )
    
    return results
```

### Next.js Integration

```typescript
// In your Next.js app
import { MCPClient } from '@/lib/mcp-client'

const mcp = new MCPClient()

export async function getServerSideProps() {
  // Use Perplexity for AI insights
  const insights = await mcp.perplexity_search(
    "What are current job market trends?"
  )
  
  // Get data from database
  const jobs = await mcp.postgres_query(
    "SELECT * FROM jobs LIMIT 10"
  )
  
  return {
    props: { insights, jobs }
  }
}
```

---

## 7. MONITORING & ALERTS

### Set Up Monitoring

```
Use memory to store:
- API response times
- Database query performance
- Error rates
- Security scan results
- Deployment status

Create alerts for:
- Response time > 1 second
- Error rate > 1%
- Security vulnerabilities found
- Deployment failures
```

---

## 📝 Implementation Checklist

- [ ] Copy database_mcp_server.py
- [ ] Copy api_testing_mcp_server.py
- [ ] Install dependencies
- [ ] Update MCP configuration
- [ ] Test each server
- [ ] Create workflow templates
- [ ] Populate Memory with context
- [ ] Train team
- [ ] Measure improvements

---

**Ready to implement? Start with the Database MCP Server!** 🚀
