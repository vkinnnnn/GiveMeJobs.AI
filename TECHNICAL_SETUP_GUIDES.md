# Technical Setup Guides

## Overview

This document consolidates all technical setup guides for advanced platform features including MCP (Model Context Protocol) servers, monitoring infrastructure, and vector database configuration.

## MCP (Model Context Protocol) Setup

### Prerequisites

First, ensure you have `uv` and `uvx` installed:

```bash
# Install uv (Python package manager)
# On Windows (PowerShell):
powershell -c "irm https://astral.sh/uv/install.ps1 | iex"

# Verify installation
uv --version
uvx --version
```

### MCP Servers Configuration

#### Priority 1: Infrastructure Management (Critical)

**1. AWS Documentation Server** ✅ Ready
- **Purpose**: AWS infrastructure management and documentation
- **Status**: No configuration needed - works out of the box
- **Usage**: AWS best practices, infrastructure setup, service documentation

**2. PostgreSQL Server** 🔧 Needs Configuration
- **Purpose**: Direct database operations and optimization
- **Configuration Required**:
```bash
POSTGRES_CONNECTION_STRING="postgresql://username:password@localhost:5432/givemejobs"
```

**3. Docker Server** ✅ Ready
- **Purpose**: Container management and monitoring
- **Status**: Auto-detects local Docker installation
- **Usage**: Monitor containers, check logs, manage images

**4. Kubernetes Server** 🔧 Needs Configuration
- **Purpose**: Orchestration and deployment management
- **Configuration Required**:
```bash
kubectl config current-context
```

#### Priority 2: Development Workflow (High Value)

**5. GitHub Server** 🔧 Needs Configuration
- **Purpose**: Repository management, CI/CD automation
- **Configuration Required**:
  1. Create GitHub Personal Access Token
  2. Update MCP config with token

**6. Filesystem Server** ✅ Ready
- **Purpose**: Enhanced file operations within your project
- **Status**: Configured for your workspace directory

#### Priority 3: Monitoring & Observability

**7. Prometheus Server** 🔧 Needs Configuration
- **Purpose**: Metrics collection and performance monitoring
- **Configuration**: Start Prometheus on port 9090

**8. Redis Server** 🔧 Needs Configuration
- **Purpose**: Cache management and session monitoring
- **Configuration**: Update Redis URL if different from default

**9. MongoDB Server** 🔧 Needs Configuration
- **Purpose**: Document database operations
- **Configuration**: Update MongoDB URI

**10. Grafana Server** 🔧 Needs Configuration
- **Purpose**: Dashboard management and visualization
- **Configuration**: Create Grafana API Key

#### Priority 4: AI/ML Operations

**11. OpenAI Enhanced Server** 🔧 Needs Configuration
- **Purpose**: Enhanced AI document processing and embeddings
- **Configuration**: Add OpenAI API key

**12. Pinecone Server** 🔧 Needs Configuration
- **Purpose**: Vector database operations and semantic search
- **Configuration**: Add Pinecone API key and environment

#### Priority 5: Security & Infrastructure as Code

**13. Security Scanner Server** ✅ Ready
- **Purpose**: Automated security scanning and vulnerability assessment
- **Status**: No configuration needed

**14. Terraform Server** ✅ Ready
- **Purpose**: Infrastructure as Code management
- **Status**: Auto-detects Terraform installation

**15. Sentry Server** 🔧 Needs Configuration
- **Purpose**: Error tracking and performance monitoring
- **Configuration**: Add Sentry auth token, org, and project

### Environment Variables Setup

#### Option 1: Use the Template (Recommended)
```bash
copy .env.mcp.template .env.mcp
```

#### Option 2: Create Manually
Create a `.env.mcp` file with essential variables:

```bash
# Database Connections
POSTGRES_CONNECTION_STRING="postgresql://username:password@localhost:5432/givemejobs"
MONGODB_URI="mongodb://localhost:27017/givemejobs"
REDIS_URL="redis://localhost:6379"

# API Keys
GITHUB_PERSONAL_ACCESS_TOKEN=""
OPENAI_API_KEY=""
PINECONE_API_KEY=""
PINECONE_ENVIRONMENT=""
SENTRY_AUTH_TOKEN=""
GRAFANA_API_KEY=""

# Service URLs
PROMETHEUS_URL="http://localhost:9090"
GRAFANA_URL="http://localhost:3000"
SENTRY_ORG="givemejobs"
SENTRY_PROJECT="platform"

# Logging
FASTMCP_LOG_LEVEL="ERROR"

# Filesystem Access
ALLOWED_DIRECTORIES="C:\\Users\\chira\\.kiro"
```

### MCP Configuration Updates Summary

#### Files Updated

**New Files Created:**
- `.env.mcp.template` - Comprehensive environment configuration template
- `validate-mcp-config.ps1` - Validation script for MCP environment configuration

**Configuration Files Updated:**
- `.kiro/settings/mcp.json` - Updated all MCP server configurations to use environment variables
- `setup-mcp-servers.ps1` - Enhanced to use template when available
- `test-mcp-integration.ps1` - Updated workflow to include validation

**Documentation Updated:**
- `MCP_SETUP_GUIDE.md` - Added environment variables setup section
- `.env.example` - Added new monitoring variables
- `docs/DEPLOYMENT_GUIDE.md` - References comprehensive template

#### Benefits of Updates

1. **Centralized Configuration** - All MCP-related environment variables in one template
2. **Enhanced Security** - Environment variables prevent hard-coding sensitive information
3. **Improved Developer Experience** - Comprehensive template with documentation
4. **Better Maintainability** - Single source of truth for MCP configuration
5. **Production Readiness** - Supports multiple environments

## Monitoring and Logging Setup

### Quick Start

#### 1. Configure Environment Variables

Add to your `.env` file:

```bash
# Sentry (Error Tracking)
SENTRY_DSN=your-sentry-dsn-here
SENTRY_TRACES_SAMPLE_RATE=0.1
SENTRY_PROFILES_SAMPLE_RATE=0.1
NEXT_PUBLIC_SENTRY_DSN=your-frontend-sentry-dsn-here

# Prometheus (Metrics)
PROMETHEUS_ENABLED=true
PROMETHEUS_PORT=9090

# Logging
LOG_LEVEL=info
ELASTICSEARCH_NODE=http://localhost:9200
ELASTICSEARCH_USERNAME=
ELASTICSEARCH_PASSWORD=
```

#### 2. Start Monitoring Services

**Option A: Using setup script (Windows)**
```bash
cd packages/backend
npm run monitoring:setup
```

**Option B: Using Docker Compose directly**
```bash
docker-compose up -d prometheus grafana elasticsearch logstash kibana
```

#### 3. Verify Services

Check that all services are running:
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3001 (login: admin/admin)
- **Kibana**: http://localhost:5601
- **Elasticsearch**: http://localhost:9200

### Monitoring Tools

#### 1. Sentry (Error Tracking)

**What it does:**
- Captures and tracks application errors
- Provides stack traces and context
- Monitors performance issues
- Alerts on critical errors

**Setup:**
1. Create a Sentry account at https://sentry.io
2. Create a new project for backend and frontend
3. Copy the DSN and add to `.env`
4. Errors will automatically be captured

#### 2. Prometheus (Metrics Collection)

**What it does:**
- Collects application metrics
- Stores time-series data
- Provides alerting capabilities
- Queries metrics with PromQL

**Available Metrics:**
- HTTP request rates and durations
- Database query performance
- Cache hit/miss rates
- Application-specific metrics
- System metrics (CPU, memory)

**Example Queries:**
```promql
# Request rate
rate(http_requests_total[5m])

# 95th percentile response time
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Error rate
rate(http_request_errors_total[5m])
```

#### 3. Grafana (Visualization)

**What it does:**
- Visualizes Prometheus metrics
- Creates custom dashboards
- Sets up alerts
- Shares dashboards with team

**Pre-configured Dashboard:**
- HTTP request metrics
- Database performance
- Cache performance
- Application metrics
- System resources

#### 4. ELK Stack (Logging)

**Components:**
- **Elasticsearch**: Stores logs
- **Logstash**: Processes and forwards logs
- **Kibana**: Visualizes and searches logs

**What it does:**
- Centralized log storage
- Full-text search across logs
- Log aggregation and analysis
- Custom visualizations

### Application Endpoints

#### Metrics Endpoint
```
GET http://localhost:4000/metrics
```
Returns Prometheus-formatted metrics for scraping.

#### Performance Stats
```
GET http://localhost:4000/performance/stats
```
Returns current performance thresholds and statistics.

#### Health Check
```
GET http://localhost:4000/health
```
Returns application health status including database connections.

### Using Monitoring in Code

#### Error Tracking
```typescript
import { Sentry } from './config/sentry.config';

try {
  // Your code
} catch (error) {
  Sentry.captureException(error, {
    tags: { feature: 'job-search' },
    user: { id: userId },
    extra: { query: searchQuery }
  });
}
```

#### Metrics
```typescript
import { metricsService } from './services/metrics.service';

// Increment counters
metricsService.jobSearches.inc({ source: 'linkedin' });
metricsService.documentsGenerated.inc({ type: 'resume' });

// Track durations
const endTimer = metricsService.httpRequestDuration.startTimer();
// ... do work ...
endTimer({ method: 'GET', route: '/api/jobs', status_code: 200 });
```

#### Logging
```typescript
import { Logger } from './services/logger.service';

const logger = new Logger('MyService');

// Basic logging
logger.info('User action', { userId, action: 'login' });
logger.error('Operation failed', error, { context: 'payment' });

// Specialized logging
logger.logDatabaseQuery('SELECT', 'users', 45);
logger.logExternalApiCall('linkedin', '/jobs', 1200, 200);
logger.logUserAction(userId, 'job-application-submitted');
logger.logSecurityEvent('failed-login', 'medium', { ip: '1.2.3.4' });
```

### Alerts

#### Configured Alerts

The following alerts are pre-configured in Prometheus:
- **HighErrorRate**: Triggers when error rate > 5% for 5 minutes
- **SlowResponseTime**: Triggers when 95th percentile > 5s
- **SlowDatabaseQuery**: Triggers when query time > 2s
- **HighDatabaseConnections**: Triggers when connections > 80
- **LowCacheHitRate**: Triggers when hit rate < 70%
- **ServiceDown**: Triggers when service is unavailable

## Pinecone Vector Database Configuration

### Recommended Index Settings

| Setting | Value | Why |
|---------|-------|-----|
| **Index Name** | `givemejobs-jobs` | Clear, descriptive name |
| **Dimensions** | `1536` | Matches OpenAI text-embedding-ada-002 |
| **Metric** | `cosine` | Best for semantic similarity |
| **Pod Type** | `s1.x1` (Starter) | Free tier, perfect for development |
| **Replicas** | `1` | Sufficient for development |
| **Pods** | `1` | Free tier limit |

### Step-by-Step Setup

#### 1. Create Pinecone Account
- Go to: https://www.pinecone.io/
- Sign up (free tier available)
- Verify your email

#### 2. Create Index

Fill in these exact values:
```
Index Name: givemejobs-jobs
Dimensions: 1536
Metric: cosine
Pod Type: Starter (s1.x1)
Replicas: 1
Pods: 1
```

#### 3. Get API Key

1. Go to **"API Keys"** section
2. Copy your API key
3. Copy your environment (e.g., `us-east-1-aws`)

#### 4. Add to .env

```env
PINECONE_API_KEY=your-api-key-here
PINECONE_INDEX_NAME=givemejobs-jobs
PINECONE_ENVIRONMENT=us-east-1-aws
```

### Why These Settings?

#### Dimensions: 1536
- ✅ Matches OpenAI's `text-embedding-ada-002` model
- ✅ Industry standard for semantic search
- ✅ Optimal balance of accuracy and performance

#### Metric: cosine
- ✅ Best for text similarity (semantic search)
- ✅ Normalized vectors (0 to 1 similarity score)
- ✅ Works great with OpenAI embeddings
- ✅ Industry standard for NLP tasks

#### Pod Type: s1.x1 (Starter)
- ✅ Free tier
- ✅ 1M vectors included
- ✅ Perfect for development and testing
- ✅ Can upgrade later without recreating index

### What This Enables

#### Job Matching
```javascript
// Store job embeddings
await pinecone.upsert({
  id: 'job-123',
  values: [0.1, 0.2, ...], // 1536 dimensions
  metadata: {
    title: 'Senior Software Engineer',
    company: 'Tech Corp',
    location: 'San Francisco',
    salary: 150000
  }
});

// Find similar jobs
const results = await pinecone.query({
  vector: userProfileEmbedding, // 1536 dimensions
  topK: 10,
  includeMetadata: true
});
```

#### Semantic Search
```javascript
// User searches: "remote python developer"
const searchEmbedding = await openai.embeddings.create({
  model: 'text-embedding-ada-002',
  input: 'remote python developer'
});

// Find matching jobs
const matches = await pinecone.query({
  vector: searchEmbedding.data[0].embedding,
  topK: 20,
  filter: { remote: true }
});
```

### Metadata Schema

#### Recommended Metadata Structure

```javascript
{
  // Job identification
  jobId: 'string',
  externalId: 'string',
  source: 'linkedin' | 'indeed' | 'manual',
  
  // Job details
  title: 'string',
  company: 'string',
  location: 'string',
  remote: boolean,
  
  // Compensation
  salaryMin: number,
  salaryMax: number,
  currency: 'USD',
  
  // Requirements
  experienceLevel: 'entry' | 'mid' | 'senior' | 'lead',
  skills: ['skill1', 'skill2'],
  
  // Dates
  postedAt: timestamp,
  expiresAt: timestamp,
  
  // Status
  active: boolean
}
```

### Performance Optimization

#### 1. Batch Upserts
```javascript
// Good: Batch upsert
await pinecone.upsert({
  vectors: [
    { id: 'job-1', values: [...], metadata: {...} },
    { id: 'job-2', values: [...], metadata: {...} },
    // ... up to 100 vectors
  ]
});
```

#### 2. Use Metadata Filters
```javascript
// Efficient: Filter before similarity search
await pinecone.query({
  vector: embedding,
  topK: 10,
  filter: {
    active: true,
    remote: true,
    salaryMin: { $gte: 100000 }
  }
});
```

#### 3. Cache Embeddings
```javascript
// Cache user profile embeddings in Redis
const cachedEmbedding = await redis.get(`user:${userId}:embedding`);
if (!cachedEmbedding) {
  const embedding = await generateEmbedding(userProfile);
  await redis.setex(`user:${userId}:embedding`, 3600, embedding);
}
```

### Testing Configuration

#### 1. Test Connection
```bash
cd packages/backend
npm run test:pinecone
```

Expected output:
```
✅ Pinecone API key found
✅ Pinecone client initialized
✅ Index "givemejobs-jobs" exists
✅ Index stats:
   Total vectors: 0
   Dimensions: 1536
```

#### 2. Test Upsert
```javascript
const testVector = new Array(1536).fill(0).map(() => Math.random());

await pinecone.upsert({
  vectors: [{
    id: 'test-job-1',
    values: testVector,
    metadata: {
      title: 'Test Job',
      company: 'Test Company'
    }
  }]
});
```

#### 3. Test Query
```javascript
const results = await pinecone.query({
  vector: testVector,
  topK: 5,
  includeMetadata: true
});
```

### Cost Estimation

#### Free Tier
- **Cost:** $0/month
- **Vectors:** 1M
- **Perfect for:** Development, MVP, small production

#### Production Costs
- **s1.x1:** $70/month (1M vectors, 1 pod)
- **s1.x2:** $140/month (2M vectors, 1 pod)
- **p1.x1:** $200/month (5M vectors, 1 pod, better performance)

## Troubleshooting

### MCP Issues

#### uvx not found
```bash
# Reinstall uv
curl -LsSf https://astral.sh/uv/install.sh | sh
```

#### Database connection failed
```bash
# Check if services are running
docker ps | grep postgres
docker ps | grep mongo
docker ps | grep redis
```

#### API key authentication failed
```bash
# Verify API keys are correctly set
echo $OPENAI_API_KEY
echo $GITHUB_PERSONAL_ACCESS_TOKEN
```

### Monitoring Issues

#### Services Not Starting
```bash
# Check Docker logs
docker-compose logs prometheus
docker-compose logs grafana
docker-compose logs elasticsearch

# Restart services
docker-compose restart prometheus grafana elasticsearch
```

#### Metrics Not Appearing
1. Check `/metrics` endpoint: http://localhost:4000/metrics
2. Verify Prometheus is scraping: http://localhost:9090/targets
3. Check Prometheus configuration in `prometheus.yml`

#### Logs Not in Elasticsearch
1. Check Elasticsearch: `curl http://localhost:9200/_cat/indices`
2. Verify Logstash: `docker-compose logs logstash`
3. Check Winston configuration in `logger.service.ts`

### Pinecone Issues

#### Wrong Dimensions
```javascript
// Wrong: Using 768 dimensions (BERT)
dimensions: 768  // Won't work with OpenAI embeddings!

// Correct: Using 1536 dimensions (OpenAI)
dimensions: 1536  // Matches text-embedding-ada-002
```

#### Wrong Metric
```javascript
// Wrong: Using euclidean for text
metric: 'euclidean'  // Not optimal for semantic similarity

// Correct: Using cosine for text
metric: 'cosine'  // Best for semantic similarity
```

## Quick Setup Checklists

### MCP Setup Checklist
- [ ] Install uv and uvx
- [ ] Copy .env.mcp.template to .env.mcp
- [ ] Configure database connection strings
- [ ] Add API keys (GitHub, OpenAI, Pinecone, Sentry)
- [ ] Test configuration: `.\validate-mcp-config.ps1`
- [ ] Setup servers: `.\setup-mcp-servers.ps1 -All`

### Monitoring Setup Checklist
- [ ] Configure Sentry DSN
- [ ] Start monitoring services: `docker-compose up -d prometheus grafana elasticsearch logstash kibana`
- [ ] Verify services are running
- [ ] Access Grafana: http://localhost:3001
- [ ] Access Kibana: http://localhost:5601
- [ ] Test metrics endpoint: http://localhost:4000/metrics

### Pinecone Setup Checklist
- [ ] Create Pinecone account
- [ ] Create index: `givemejobs-jobs`, 1536 dimensions, cosine metric
- [ ] Get API key and environment
- [ ] Add to .env: `PINECONE_API_KEY`, `PINECONE_INDEX_NAME`
- [ ] Test: `npm run test:pinecone`
- [ ] Initialize: `npm run vector:init`

## Summary

This technical setup guide covers three major advanced features:

1. **MCP (Model Context Protocol)** - Enhanced development workflow with 15+ specialized servers
2. **Monitoring & Logging** - Comprehensive observability with Sentry, Prometheus, Grafana, and ELK stack
3. **Pinecone Vector Database** - Semantic search and AI-powered job matching

All three systems are optional but provide significant value for production deployments and advanced development workflows. The MCP system enhances development productivity, monitoring provides operational visibility, and Pinecone enables advanced AI features.

Each system can be set up independently based on your current needs and priorities.