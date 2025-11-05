# MCP Servers Setup Guide for GiveMeJobs Platform

This guide will help you configure all MCP servers for your platform improvements project. The servers are organized by priority based on your current implementation needs.

## Prerequisites

First, ensure you have `uv` and `uvx` installed:

```bash
# Install uv (Python package manager)
# On Windows (PowerShell):
powershell -c "irm https://astral.sh/uv/install.ps1 | iex"

# Verify installation
uv --version
uvx --version
```

## MCP Servers Configuration

### Priority 1: Infrastructure Management (Critical)

#### 1. AWS Documentation Server ✅ Ready
**Purpose**: AWS infrastructure management and documentation
**Status**: No configuration needed - works out of the box
**Usage**: AWS best practices, infrastructure setup, service documentation

#### 2. PostgreSQL Server 🔧 Needs Configuration
**Purpose**: Direct database operations and optimization
**Configuration Required**:
```bash
# Update your .env file or set environment variable:
POSTGRES_CONNECTION_STRING="postgresql://username:password@localhost:5432/givemejobs"
```

#### 3. Docker Server ✅ Ready
**Purpose**: Container management and monitoring
**Status**: Auto-detects local Docker installation
**Usage**: Monitor containers, check logs, manage images

#### 4. Kubernetes Server 🔧 Needs Configuration
**Purpose**: Orchestration and deployment management
**Configuration Required**:
```bash
# Ensure kubectl is configured and kubeconfig is accessible
kubectl config current-context
```

### Priority 2: Development Workflow (High Value)

#### 5. GitHub Server 🔧 Needs Configuration
**Purpose**: Repository management, CI/CD automation
**Configuration Required**:
1. Create GitHub Personal Access Token:
   - Go to GitHub Settings → Developer settings → Personal access tokens
   - Generate new token with repo, workflow, admin:org permissions
2. Update MCP config:
```json
"env": {
  "GITHUB_PERSONAL_ACCESS_TOKEN": "your_token_here"
}
```

#### 6. Filesystem Server ✅ Ready
**Purpose**: Enhanced file operations within your project
**Status**: Configured for your workspace directory
**Usage**: Advanced file search, content analysis, project navigation

### Priority 3: Monitoring & Observability

#### 7. Prometheus Server 🔧 Needs Configuration
**Purpose**: Metrics collection and performance monitoring
**Configuration Required**:
```bash
# Start Prometheus (if not running):
docker run -p 9090:9090 prom/prometheus

# Or update URL in MCP config if running elsewhere
```

#### 8. Redis Server 🔧 Needs Configuration
**Purpose**: Cache management and session monitoring
**Configuration Required**:
```bash
# Update Redis URL if different:
REDIS_URL="redis://localhost:6379"
```

#### 9. MongoDB Server 🔧 Needs Configuration
**Purpose**: Document database operations
**Configuration Required**:
```bash
# Update MongoDB URI:
MONGODB_URI="mongodb://localhost:27017/givemejobs"
```

#### 10. Grafana Server 🔧 Needs Configuration
**Purpose**: Dashboard management and visualization
**Configuration Required**:
1. Create Grafana API Key:
   - Go to Grafana → Configuration → API Keys
   - Create new key with Admin role
2. Update MCP config:
```json
"env": {
  "GRAFANA_URL": "http://localhost:3000",
  "GRAFANA_API_KEY": "your_api_key_here"
}
```

### Priority 4: AI/ML Operations

#### 11. OpenAI Enhanced Server 🔧 Needs Configuration
**Purpose**: Enhanced AI document processing and embeddings
**Configuration Required**:
```json
"env": {
  "OPENAI_API_KEY": "your_openai_api_key"
}
```

#### 12. Pinecone Server 🔧 Needs Configuration
**Purpose**: Vector database operations and semantic search
**Configuration Required**:
```json
"env": {
  "PINECONE_API_KEY": "your_pinecone_api_key",
  "PINECONE_ENVIRONMENT": "your_environment"
}
```

### Priority 5: Security & Infrastructure as Code

#### 13. Security Scanner Server ✅ Ready
**Purpose**: Automated security scanning and vulnerability assessment
**Status**: No configuration needed
**Usage**: Scan for vulnerabilities, security reports

#### 14. Terraform Server ✅ Ready
**Purpose**: Infrastructure as Code management
**Status**: Auto-detects Terraform installation
**Usage**: Plan, apply, and manage infrastructure

#### 15. Sentry Server 🔧 Needs Configuration
**Purpose**: Error tracking and performance monitoring
**Configuration Required**:
```json
"env": {
  "SENTRY_AUTH_TOKEN": "your_sentry_auth_token",
  "SENTRY_ORG": "your_org_name",
  "SENTRY_PROJECT": "your_project_name"
}
```

## Quick Setup Commands

### 1. Test MCP Server Installation
```bash
# Test if uvx can access MCP servers
uvx --help
```

### 2. Verify Database Connections
```bash
# Test PostgreSQL connection
psql -h localhost -U username -d givemejobs -c "SELECT version();"

# Test MongoDB connection
mongosh "mongodb://localhost:27017/givemejobs" --eval "db.runCommand({ping: 1})"

# Test Redis connection
redis-cli ping
```

### 3. Check Docker/Kubernetes
```bash
# Test Docker
docker ps

# Test Kubernetes
kubectl get pods --all-namespaces
```

### 4. Verify Monitoring Stack
```bash
# Check if Prometheus is running
curl http://localhost:9090/api/v1/status/config

# Check if Grafana is running
curl http://localhost:3000/api/health
```

## Environment Variables Setup

### Option 1: Use the Template (Recommended)
Copy the comprehensive template file:
```bash
copy .env.mcp.template .env.mcp
```

Then edit `.env.mcp` with your actual values.

### Option 2: Create Manually
Create a `.env.mcp` file in your project root with the essential variables:

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

**Note**: The template file (`.env.mcp.template`) contains comprehensive configuration options including security settings, performance tuning, and development configurations.

## Testing MCP Servers

After configuration, test each server:

### Test Database Servers
```bash
# In Kiro, try these MCP calls:
# PostgreSQL: List tables in your database
# MongoDB: List collections
# Redis: Get cache statistics
```

### Test Infrastructure Servers
```bash
# Docker: List running containers
# Kubernetes: Get pod status
# AWS: Search documentation
```

### Test AI/ML Servers
```bash
# OpenAI: Test embeddings generation
# Pinecone: Query vector database
```

## Troubleshooting

### Common Issues

1. **uvx not found**
   ```bash
   # Reinstall uv
   curl -LsSf https://astral.sh/uv/install.sh | sh
   ```

2. **Database connection failed**
   ```bash
   # Check if services are running
   docker ps | grep postgres
   docker ps | grep mongo
   docker ps | grep redis
   ```

3. **API key authentication failed**
   ```bash
   # Verify API keys are correctly set
   echo $OPENAI_API_KEY
   echo $GITHUB_PERSONAL_ACCESS_TOKEN
   ```

4. **MCP server not responding**
   ```bash
   # Check server logs
   uvx mcp-server-postgres@latest --help
   ```

## Next Steps

1. **Configure Priority 1 servers** (AWS, PostgreSQL, Docker, Kubernetes)
2. **Set up API keys** for GitHub, OpenAI, Pinecone
3. **Test each server** individually
4. **Integrate with your development workflow**

## Benefits for Your Project

With these MCP servers configured, you'll be able to:

- **Automate infrastructure management** for your hybrid Node.js/Python architecture
- **Optimize database performance** across PostgreSQL, MongoDB, and Redis
- **Streamline CI/CD processes** with GitHub integration
- **Monitor production systems** with Prometheus and Grafana
- **Enhance AI/ML operations** with OpenAI and Pinecone integration
- **Improve security posture** with automated scanning
- **Accelerate development** with enhanced tooling

## Support

If you encounter issues:
1. Check the MCP server logs
2. Verify environment variables
3. Test individual service connections
4. Consult the specific MCP server documentation

Ready to transform your development workflow! 🚀