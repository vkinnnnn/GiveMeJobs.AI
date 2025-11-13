# Platform Management Scripts

## Overview

This document consolidates all platform management scripts and commands for the GiveMeJobs platform.

## Quick Commands

### Development Startup
```bash
# Start all databases
docker-compose up -d

# Start backend
cd packages/backend
npm run dev

# Start frontend (in another terminal)
cd packages/frontend
npm run dev
```

### Service Management
```bash
# Check all services
npm run check:all

# Test all services
npm run test:services

# Interactive setup
npm run setup:services
```

## Database Management

### Start Databases
```bash
# Start all database services
docker-compose up -d

# Start specific service
docker-compose up -d postgres
docker-compose up -d mongodb
docker-compose up -d redis
```

### Stop Databases
```bash
# Stop all services
docker-compose down

# Stop specific service
docker-compose stop postgres
docker-compose stop mongodb
docker-compose stop redis
```

### Database Status
```bash
# Check running containers
docker ps

# View logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f postgres
docker-compose logs -f mongodb
docker-compose logs -f redis
```

### Database Maintenance
```bash
# Restart all services
docker-compose restart

# Rebuild containers
docker-compose up -d --build

# Remove containers and volumes (CAUTION: Data loss)
docker-compose down -v
```

## Application Management

### Backend Operations
```bash
# Navigate to backend
cd packages/backend

# Install dependencies
npm install

# Start development server
npm run dev

# Start production server
npm run start

# Build for production
npm run build

# Run tests
npm test

# Run specific tests
npm test -- --testNamePattern="auth"
```

### Frontend Operations
```bash
# Navigate to frontend
cd packages/frontend

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Run tests
npm test

# Type checking
npm run type-check
```

## Service Testing Scripts

### Comprehensive Testing
```bash
# Test all configured services
npm run test:services

# Check service configuration status
npm run check:all

# Interactive service setup
npm run setup:services
```

### Individual Service Tests
```bash
# Test OAuth services (Google, LinkedIn)
npm run test:oauth

# Test email service (Resend)
npm run test:email

# Test OpenAI integration
npm run test:openai

# Test Pinecone vector database
npm run test:pinecone

# Test Redis connection
npm run redis:test
```

## MCP (Model Context Protocol) Management

### MCP Server Operations
```bash
# Setup MCP servers
./mcp-setup-tools.ps1 -Action setup

# Test MCP integration
./mcp-setup-tools.ps1 -Action test

# Validate MCP configuration
./mcp-setup-tools.ps1 -Action validate

# Update MCP servers
./mcp-setup-tools.ps1 -Action update
```

### MCP Configuration
```bash
# Check MCP server status
./mcp-setup-tools.ps1 -Action status

# Restart MCP servers
./mcp-setup-tools.ps1 -Action restart

# Clean MCP cache
./mcp-setup-tools.ps1 -Action clean
```

## Platform Startup Scripts

### Essential Services Only
```bash
# Start core services (databases + backend)
./platform-scripts.ps1 -Mode essential

# Alternative for Unix systems
npm run start:essential
```

### Full Development Environment
```bash
# Start all services including frontend
./platform-scripts.ps1 -Mode full

# Alternative for Unix systems
npm run start:all
```

### Production Mode
```bash
# Start in production configuration
./platform-scripts.ps1 -Mode production

# Alternative for Unix systems
npm run start:production
```

### Clean Start
```bash
# Clean start (rebuild containers)
./platform-scripts.ps1 -Mode clean

# Alternative for Unix systems
npm run start:clean
```

## Deployment Scripts

### Development Deployment
```bash
# Deploy to development environment
./deploy-test.ps1

# Alternative shell script
./deploy-test.sh
```

### Production Deployment
```bash
# Deploy to production
./deploy.ps1

# Check deployment status
./check-deployment.ps1
```

## Monitoring and Maintenance

### Health Checks
```bash
# Check all service health
npm run health:check

# Check database connections
npm run db:check

# Check external service connectivity
npm run services:ping
```

### Log Management
```bash
# View all logs
docker-compose logs -f

# View backend logs
npm run logs:backend

# View frontend logs
npm run logs:frontend

# View database logs
docker-compose logs -f postgres mongodb redis
```

### Performance Monitoring
```bash
# Check system resources
docker stats

# Monitor database performance
npm run db:stats

# Check API response times
npm run api:benchmark
```

## Backup and Recovery

### Database Backups
```bash
# Backup PostgreSQL
docker exec givemejobs-postgres pg_dump -U dev_user givemejobs_dev > backup_postgres.sql

# Backup MongoDB
docker exec givemejobs-mongodb mongodump --db givemejobs_dev --out /backup

# Backup Redis
docker exec givemejobs-redis redis-cli BGSAVE
```

### Restore Operations
```bash
# Restore PostgreSQL
docker exec -i givemejobs-postgres psql -U dev_user givemejobs_dev < backup_postgres.sql

# Restore MongoDB
docker exec givemejobs-mongodb mongorestore --db givemejobs_dev /backup/givemejobs_dev

# Restore Redis
docker exec givemejobs-redis redis-cli FLUSHALL
docker exec givemejobs-redis redis-cli --rdb /data/dump.rdb
```

## Environment Management

### Environment Setup
```bash
# Copy environment template
cp .env.example .env

# Setup development environment
npm run env:setup

# Validate environment configuration
npm run env:validate
```

### Environment Switching
```bash
# Switch to development
export NODE_ENV=development

# Switch to production
export NODE_ENV=production

# Switch to testing
export NODE_ENV=test
```

## Security Operations

### SSL/TLS Management
```bash
# Generate development certificates
npm run ssl:generate

# Install certificates
npm run ssl:install

# Verify SSL configuration
npm run ssl:verify
```

### Security Audits
```bash
# Run security audit
npm audit

# Fix security vulnerabilities
npm audit fix

# Check for outdated packages
npm outdated
```

## Utility Scripts

### Code Quality
```bash
# Run linting
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format

# Type checking
npm run type-check
```

### Database Utilities
```bash
# Run database migrations
npm run db:migrate

# Seed database with test data
npm run db:seed

# Reset database
npm run db:reset

# Generate database schema
npm run db:schema
```

### File Management
```bash
# Clean build artifacts
npm run clean

# Clean node_modules
npm run clean:deps

# Clean Docker images
docker system prune -a

# Clean logs
npm run clean:logs
```

## Troubleshooting Scripts

### Common Issues
```bash
# Fix port conflicts
npm run fix:ports

# Reset services
npm run reset:services

# Clear caches
npm run clear:cache

# Rebuild everything
npm run rebuild:all
```

### Diagnostic Tools
```bash
# System diagnostics
npm run diagnose

# Network connectivity test
npm run test:network

# Service dependency check
npm run check:deps
```

## Platform Scripts Reference

### PowerShell Scripts (Windows)
- `platform-scripts.ps1` - Main platform management
- `mcp-setup-tools.ps1` - MCP server management
- `deploy.ps1` - Production deployment
- `deploy-test.ps1` - Development deployment
- `check-deployment.ps1` - Deployment verification

### Shell Scripts (Unix/Linux/Mac)
- `deploy-test.sh` - Development deployment
- `start-services.sh` - Service startup
- `stop-services.sh` - Service shutdown
- `backup.sh` - Automated backups

### NPM Scripts
Available in `packages/backend/package.json`:
```json
{
  "scripts": {
    "dev": "Start development server",
    "build": "Build for production",
    "start": "Start production server",
    "test": "Run tests",
    "test:services": "Test all services",
    "test:oauth": "Test OAuth services",
    "test:email": "Test email service",
    "test:openai": "Test OpenAI integration",
    "test:pinecone": "Test Pinecone database",
    "check:all": "Check all service status",
    "setup:services": "Interactive service setup",
    "redis:test": "Test Redis connection"
  }
}
```

## Usage Examples

### Daily Development Workflow
```bash
# 1. Start databases
docker-compose up -d

# 2. Check service status
cd packages/backend
npm run check:all

# 3. Start backend
npm run dev

# 4. Start frontend (new terminal)
cd packages/frontend
npm run dev

# 5. Run tests
npm run test:services
```

### Production Deployment
```bash
# 1. Build applications
npm run build

# 2. Run tests
npm test

# 3. Deploy to production
./deploy.ps1

# 4. Verify deployment
./check-deployment.ps1

# 5. Monitor logs
docker-compose logs -f
```

### Maintenance Tasks
```bash
# Weekly maintenance
npm run clean
npm audit fix
docker system prune

# Monthly backups
npm run backup:all

# Quarterly updates
npm update
docker-compose pull
```

## Summary

This consolidated script reference provides all necessary commands for:

- **Development**: Starting, stopping, and managing development environment
- **Testing**: Comprehensive service testing and validation
- **Deployment**: Production and development deployment procedures
- **Maintenance**: Backup, monitoring, and system maintenance
- **Troubleshooting**: Diagnostic and repair utilities

All scripts are designed to work together as part of a comprehensive platform management system, providing developers with the tools needed to efficiently manage the GiveMeJobs platform throughout its lifecycle.