# Development Setup Guides

## Overview

This document consolidates all development setup guides including GitHub integration, Python migration planning, Redis cluster configuration, and database setup procedures.

## GitHub Upload Guide

### Quick Start

#### Option 1: Full Featured Script (Recommended)

```bash
python upload_to_github.py
```

**Features:**
- ✅ Progress bar with percentage
- ✅ ETA (estimated time remaining)
- ✅ Automatic security filtering
- ✅ Creates .env.example (safe version)
- ✅ Excludes sensitive files
- ✅ File count and statistics

#### Option 2: Quick Upload

```bash
python quick_github_upload.py
```

**Features:**
- ✅ Simple and fast
- ✅ Basic security filtering
- ✅ Minimal prompts

### Prerequisites

#### 1. Install Git
```bash
# Check if Git is installed
git --version

# If not installed:
# Windows: Download from https://git-scm.com/
# Mac: brew install git
# Linux: sudo apt-get install git
```

#### 2. Install Python
```bash
# Check if Python is installed
python --version

# Should be Python 3.6 or higher
```

#### 3. Create GitHub Repository

1. Go to https://github.com/new
2. Create a new repository
3. **DO NOT** initialize with README, .gitignore, or license
4. Copy the repository URL

### Step-by-Step Usage

#### Step 1: Prepare Your Project

Make sure you're in your project root directory:
```bash
cd C:\Users\chira\.kiro
```

#### Step 2: Run the Upload Script

```bash
python upload_to_github.py
```

#### Step 3: Follow the Prompts

**Prompt 1: Repository URL**
```
🔗 Repository URL: https://github.com/yourusername/givemejobs.git
```

**Prompt 2: Commit Message (Optional)**
```
💬 Message: Initial commit - GiveMeJobs platform
```
Or press Enter for default message.

**Prompt 3: Confirm Upload**
```
🤔 Continue with upload? (yes/no): yes
```

#### Step 4: Watch the Progress

You'll see:
```
📤 Progress: [████████████████████░░░░░░░░] 65.3% | 
Files: 1,234/1,890 | Skipped: 456 | 
ETA: 2m 15s | Elapsed: 3m 45s
```

#### Step 5: Success!

```
✅ SUCCESS! Project uploaded to GitHub
🔗 Repository: https://github.com/yourusername/givemejobs
📊 Files uploaded: 1,890
⏱️  Total time: 6m 30s
```

### What Gets Excluded (Security)

#### Automatically Excluded:

**Secrets & Credentials:**
- `.env` (all environment files)
- `*.pem`, `*.key`, `*.cert`
- API keys and passwords

**Dependencies:**
- `node_modules/` (can be huge!)
- `venv/`, `env/`
- `__pycache__/`

**Build Outputs:**
- `dist/`, `build/`
- `.next/`, `out/`
- `*.tsbuildinfo`

**IDE & OS:**
- `.vscode/`, `.idea/`
- `.DS_Store`, `Thumbs.db`

**Logs:**
- `*.log`
- `logs/`

#### What Gets Included:

**Source Code:**
- All `.ts`, `.tsx`, `.js`, `.jsx` files
- All `.py` files
- All `.css`, `.scss` files

**Configuration:**
- `package.json`, `tsconfig.json`
- `.env.example` (sanitized version)
- `.gitignore`

**Documentation:**
- All `.md` files
- README files
- Documentation folders

### Security Best Practices

#### DO:
- Use `.env.example` for sharing configuration structure
- Keep `.env` in `.gitignore`
- Review files before committing
- Use environment variables for secrets
- Rotate API keys if accidentally committed

#### DON'T:
- Commit `.env` files
- Commit API keys or passwords
- Commit `node_modules/`
- Commit build outputs
- Commit database files

#### If You Accidentally Commit Secrets:

1. **Immediately rotate the keys/passwords**
2. **Remove from Git history:**
```bash
# Remove file from history
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env" \
  --prune-empty --tag-name-filter cat -- --all

# Force push
git push origin --force --all
```

3. **Use tools like:**
- `git-secrets` - Prevents committing secrets
- `truffleHog` - Finds secrets in Git history

## Python Migration Plan

### Executive Summary

This document outlines the comprehensive strategy to migrate the GiveMeJobs platform from a Node.js/TypeScript-centric backend to a modern, professional Python-centric architecture using FastAPI, while maintaining all existing functionality and improving performance, scalability, and maintainability.

### Current State Analysis

#### Existing Architecture
- **Backend**: Node.js/Express with TypeScript
  - 58+ service modules
  - 80+ API endpoints
  - 17 controllers
  - Multiple middleware layers
- **Frontend**: Next.js 14 with React 18 (No changes needed)
- **Python Services**: Partially implemented (3 microservices)
- **Databases**: PostgreSQL, MongoDB, Redis
- **AI/ML**: OpenAI GPT-4, Pinecone Vector DB

#### Target Architecture

**Python-Centric Backend Stack**

| Component | Technology | Version | Purpose |
|-----------|------------|---------|---------|
| **Web Framework** | FastAPI | 0.104+ | High-performance async API |
| **Server** | Uvicorn | 0.24+ | ASGI server with WebSocket support |
| **ORM** | SQLAlchemy | 2.0+ | Async ORM for PostgreSQL |
| **Validation** | Pydantic | 2.5+ | Data validation & serialization |
| **Database Driver** | AsyncPG | 0.29+ | High-performance PostgreSQL driver |
| **MongoDB Driver** | Motor | 3.3+ | Async MongoDB driver |
| **Cache** | Redis-Py | 5.0+ | Redis client with HiRedis |
| **Background Tasks** | Celery | 5.3+ | Distributed task queue |
| **Authentication** | FastAPI-Users | 12+ | Complete auth system |
| **JWT** | Python-JOSE | 3.3+ | JWT tokens |
| **Password Hashing** | Passlib | 1.7+ | bcrypt hashing |
| **HTTP Client** | HTTPX | 0.25+ | Async HTTP client |
| **AI/ML** | OpenAI SDK | 1.3+ | GPT-4 integration |
| **Vector DB** | Pinecone Client | 2.2+ | Vector search |
| **Data Science** | Pandas/NumPy | Latest | Data processing |
| **ML** | Scikit-learn | 1.3+ | Machine learning |
| **Logging** | Structlog | 23+ | Structured logging |
| **Monitoring** | OpenTelemetry | 1.21+ | Distributed tracing |
| **Metrics** | Prometheus Client | 0.19+ | Metrics collection |
| **Error Tracking** | Sentry SDK | 1.38+ | Error monitoring |
| **Testing** | Pytest | 7.4+ | Testing framework |
| **Code Quality** | Black, isort, mypy | Latest | Code formatting & type checking |

### Migration Strategy

#### Phase 1: Foundation Setup (Week 1)

**1.1 Core Infrastructure**
- [ ] Set up Python project structure
- [ ] Configure FastAPI application
- [ ] Implement async database connections (PostgreSQL, MongoDB, Redis)
- [ ] Set up dependency injection system
- [ ] Configure logging and monitoring
- [ ] Set up error handling framework

**1.2 Configuration Management**
- [ ] Create Pydantic settings models
- [ ] Migrate environment variables
- [ ] Set up configuration validation
- [ ] Create environment-specific configs

**1.3 Database Layer**
- [ ] Set up SQLAlchemy 2.0 models
- [ ] Create Alembic migrations
- [ ] Implement base repository pattern
- [ ] Set up connection pooling
- [ ] Configure query optimization

#### Phase 2: Core Services Migration (Week 2-3)

**2.1 Authentication & Authorization**
- [ ] Migrate auth service (JWT, OAuth, MFA)
- [ ] Implement password hashing and validation
- [ ] Set up session management
- [ ] Migrate OAuth providers (Google, LinkedIn)
- [ ] Implement RBAC system
- [ ] Create auth middleware

**2.2 User Management**
- [ ] Migrate user service
- [ ] Migrate profile service
- [ ] Implement user repository
- [ ] Create user schemas
- [ ] Set up user endpoints

**2.3 Job Services**
- [ ] Migrate job service
- [ ] Migrate job matching service
- [ ] Migrate job aggregator service
- [ ] Implement job alert service
- [ ] Migrate skill scoring service
- [ ] Set up job adapters (LinkedIn, Indeed, Glassdoor, Adzuna)

#### Phase 3: Application & Document Services (Week 4)

**3.1 Application Tracking**
- [ ] Migrate application service
- [ ] Implement application repository
- [ ] Set up reminder services
- [ ] Create application workflows

**3.2 Document Generation**
- [ ] Migrate document generation service (OpenAI integration)
- [ ] Implement document export service
- [ ] Migrate template service
- [ ] Set up PDF/DOCX generation

**3.3 AI/ML Services**
- [ ] Migrate OpenAI service
- [ ] Migrate embedding service
- [ ] Migrate vector DB service (Pinecone)
- [ ] Implement ML model service

### Performance Expectations

#### Before (Node.js)
- API Response Time: ~200ms (95th percentile)
- Concurrent Users: 10,000+
- Database Queries: ~50ms average

#### After (Python FastAPI)
- API Response Time: **~150ms** (95th percentile) - 25% improvement
- Concurrent Users: **15,000+** - 50% improvement
- Database Queries: **~30ms** average - 40% improvement
- Memory Usage: **-30%** reduction
- CPU Usage: **-20%** reduction

### Benefits of Python-Centric Approach

1. **Unified Codebase**: Single language for all backend logic
2. **Better AI/ML Integration**: Native Python ML libraries
3. **Async Performance**: FastAPI's async capabilities
4. **Type Safety**: Pydantic v2 validation
5. **Developer Experience**: Cleaner, more maintainable code
6. **Reduced Complexity**: No inter-service communication overhead
7. **Better Testing**: Pytest ecosystem
8. **Easier Deployment**: Single Docker image for main API

### Timeline Summary

| Phase | Duration | Key Deliverables |
|-------|----------|------------------|
| Phase 1: Foundation | Week 1 | Core infrastructure ready |
| Phase 2: Core Services | Weeks 2-3 | Auth, User, Job services migrated |
| Phase 3: Application & Documents | Week 4 | Document generation working |
| Phase 4: Analytics | Week 5 | Analytics pipeline complete |
| Phase 5: API Layer | Week 6 | All endpoints implemented |
| Phase 6: Background Tasks | Week 7 | Celery workers operational |
| Phase 7: Testing | Week 8 | Full test coverage achieved |
| Phase 8: Deployment | Week 9 | Production-ready containers |
| Phase 9: Frontend Integration | Week 10 | Frontend fully integrated |
| Phase 10: Documentation | Week 11 | Complete documentation |
| Phase 11: Production | Week 12 | Live in production |

**Total Duration: 12 weeks (3 months)**

## Redis Cluster Setup

### Overview
The GiveMeJobs platform supports Redis clustering for high availability and improved performance. The cluster configuration is available in `docker-compose.cache-cluster.yml`.

### Configuration

#### Docker Compose Setup
To use Redis cluster instead of single Redis instance:

```bash
# Start with Redis cluster
docker-compose -f docker-compose.yml -f docker-compose.cache-cluster.yml up -d

# Or start only the cache cluster
docker-compose -f docker-compose.cache-cluster.yml up -d
```

#### Cluster Nodes
The cluster consists of 6 Redis nodes:
- **redis-node-1**: Port 7001 (Master)
- **redis-node-2**: Port 7002 (Master) 
- **redis-node-3**: Port 7003 (Master)
- **redis-node-4**: Port 7004 (Replica)
- **redis-node-5**: Port 7005 (Replica)
- **redis-node-6**: Port 7006 (Replica)

#### Environment Variables
Add to your `.env` file for cluster support:

```env
# Redis Cluster Configuration
REDIS_CLUSTER_ENABLED=true
REDIS_CLUSTER_NODES=redis-node-1:7001,redis-node-2:7002,redis-node-3:7003,redis-node-4:7004,redis-node-5:7005,redis-node-6:7006
REDIS_PASSWORD=your_secure_password
```

### Service Integration

#### Node.js Backend
The `CacheService` automatically detects and uses Redis cluster when configured:
- Automatic failover between cluster nodes
- Circuit breaker pattern for fault tolerance
- Multi-layer caching (memory + Redis cluster)

#### Python Services
The `AdvancedCacheService` supports Redis cluster with:
- Async Redis cluster client
- Intelligent cache warming
- Event-driven cache invalidation

### Monitoring
- **Redis Exporter**: Available on port 9121 for Prometheus metrics
- **Sentinel**: High availability monitoring on ports 26379-26381
- **Health Checks**: Automatic health monitoring for all nodes

### Benefits
- **High Availability**: Automatic failover if nodes go down
- **Scalability**: Distributed data across multiple nodes
- **Performance**: Improved throughput with parallel operations
- **Fault Tolerance**: Continues operating with node failures

### Fallback Behavior
If cluster is unavailable, services automatically fall back to:
1. Single Redis instance (if available)
2. Memory-only caching
3. Direct database queries (with performance impact)

## Database Setup Guide

### Quick Start (2 Commands)

```bash
# 1. Start the databases
docker-compose up -d postgres mongodb redis

# 2. Check status
npm run check:all
```

That's it! Your databases will be running.

### Detailed Instructions

#### Prerequisites

You need Docker installed:
- **Windows:** [Docker Desktop for Windows](https://docs.docker.com/desktop/install/windows-install/)
- **Mac:** [Docker Desktop for Mac](https://docs.docker.com/desktop/install/mac-install/)
- **Linux:** [Docker Engine](https://docs.docker.com/engine/install/)

#### Step 1: Start Databases

Open your terminal in the project root and run:

```bash
docker-compose up -d postgres mongodb redis
```

This will:
- ✅ Start PostgreSQL on port 5432
- ✅ Start MongoDB on port 27017
- ✅ Start Redis on port 6379
- ✅ Run them in the background (`-d` flag)

#### Step 2: Verify Databases Are Running

```bash
docker-compose ps
```

You should see:
```
NAME                    STATUS
givemejobs-postgres     Up (healthy)
givemejobs-mongodb      Up (healthy)
givemejobs-redis        Up (healthy)
```

#### Step 3: Run Database Migrations

```bash
cd packages/backend
npm run migrate:up
```

This creates all the necessary tables in PostgreSQL.

#### Step 4: Initialize MongoDB

```bash
npm run mongo:init
```

This sets up MongoDB collections and indexes.

#### Step 5: Verify Everything Works

```bash
npm run check:all
```

You should now see:
```
✅ PostgreSQL: Configured
✅ MongoDB: Configured
✅ Redis: Configured
✅ JWT: Configured
```

### Common Commands

#### Start Databases
```bash
docker-compose up -d postgres mongodb redis
```

#### Stop Databases
```bash
docker-compose stop postgres mongodb redis
```

#### Restart Databases
```bash
docker-compose restart postgres mongodb redis
```

#### View Logs
```bash
docker-compose logs -f postgres mongodb redis
```

#### Stop and Remove Everything
```bash
docker-compose down
```

#### Stop and Remove Everything Including Data
```bash
docker-compose down -v
```

### Troubleshooting

#### "Docker is not running"
- Start Docker Desktop
- Wait for it to fully start (whale icon in system tray)
- Try the command again

#### "Port already in use"
One of your ports (5432, 27017, or 6379) is already in use.

**Option 1: Stop the conflicting service**
```bash
# Windows - Stop PostgreSQL service
net stop postgresql-x64-15

# Or find what's using the port
netstat -ano | findstr :5432
```

**Option 2: Change the port in .env**
```env
POSTGRES_PORT=5433
MONGO_PORT=27018
REDIS_PORT=6380
```

Then update DATABASE_URL, MONGODB_URI, and REDIS_URL accordingly.

#### "Cannot connect to database"
1. Check databases are running:
   ```bash
   docker-compose ps
   ```

2. Check logs for errors:
   ```bash
   docker-compose logs postgres
   docker-compose logs mongodb
   docker-compose logs redis
   ```

3. Restart the databases:
   ```bash
   docker-compose restart postgres mongodb redis
   ```

#### "Migration failed"
1. Make sure PostgreSQL is running:
   ```bash
   docker-compose ps postgres
   ```

2. Check PostgreSQL logs:
   ```bash
   docker-compose logs postgres
   ```

3. Try running migrations again:
   ```bash
   cd packages/backend
   npm run migrate:up
   ```

### Database Credentials

Your databases are configured with these credentials (from `.env`):

#### PostgreSQL
- Host: `localhost`
- Port: `5432`
- User: `givemejobs`
- Password: `dev_password`
- Database: `givemejobs_db`

#### MongoDB
- Host: `localhost`
- Port: `27017`
- User: `givemejobs`
- Password: `dev_password`
- Database: `givemejobs_docs`

#### Redis
- Host: `localhost`
- Port: `6379`
- Password: `dev_password`

### Connecting to Databases

#### PostgreSQL (using psql)
```bash
docker exec -it givemejobs-postgres psql -U givemejobs -d givemejobs_db
```

#### MongoDB (using mongosh)
```bash
docker exec -it givemejobs-mongodb mongosh -u givemejobs -p dev_password
```

#### Redis (using redis-cli)
```bash
docker exec -it givemejobs-redis redis-cli -a dev_password
```

### What's Next?

After databases are running:

1. **Run migrations:**
   ```bash
   cd packages/backend
   npm run migrate:up
   npm run mongo:init
   ```

2. **Verify setup:**
   ```bash
   npm run check:all
   ```

3. **Start the backend:**
   ```bash
   npm run dev
   ```

4. **Configure optional services:**
   - Google OAuth
   - SendGrid
   - OpenAI

   See `SERVICE_INTEGRATION_GUIDES.md` for details.

## Quick Reference Commands

### GitHub Upload
```bash
# Full featured upload
python upload_to_github.py

# Quick upload
python quick_github_upload.py
```

### Database Management
```bash
# Start databases
docker-compose up -d postgres mongodb redis

# Check status
docker-compose ps

# View logs
docker-compose logs -f postgres mongodb redis

# Stop databases
docker-compose stop postgres mongodb redis

# Restart databases
docker-compose restart postgres mongodb redis

# Run migrations
cd packages/backend
npm run migrate:up
npm run mongo:init

# Check everything
npm run check:all

# Start backend
npm run dev
```

### Redis Cluster
```bash
# Start with Redis cluster
docker-compose -f docker-compose.yml -f docker-compose.cache-cluster.yml up -d

# Start only cache cluster
docker-compose -f docker-compose.cache-cluster.yml up -d
```

## Summary

This development setup guide covers four major areas:

1. **GitHub Integration** - Secure project upload with automatic security filtering
2. **Python Migration Planning** - Comprehensive strategy for migrating to Python-centric architecture
3. **Redis Cluster Configuration** - High availability caching setup
4. **Database Setup** - Quick and detailed database configuration

Each section provides both quick start options for experienced developers and detailed instructions for comprehensive setup. The guides include troubleshooting sections and security best practices to ensure smooth development workflow setup.