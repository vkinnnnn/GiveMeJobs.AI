# Database Setup Guide

This document provides instructions for setting up and managing the GiveMeJobs platform databases.

## Overview

The platform uses three database systems:

- **PostgreSQL**: Relational data (users, profiles, jobs, applications)
- **MongoDB**: Document storage (templates, generated documents)
- **Redis**: Caching and session management

## Prerequisites

Ensure Docker and Docker Compose are installed and running:

```bash
docker --version
docker-compose --version
```

## Quick Start

### 1. Start Database Services

From the project root:

```bash
npm run docker:up
```

This starts PostgreSQL, MongoDB, and Redis containers.

### 2. Set Up Databases

From the backend package:

```bash
cd packages/backend
npm run db:setup
```

This command:
- Runs PostgreSQL migrations
- Initializes MongoDB collections and indexes
- Seeds default document templates

### 3. Verify Setup

Test Redis connection:

```bash
npm run redis:test
```

## PostgreSQL Migrations

### Running Migrations

```bash
# Run all pending migrations
npm run migrate:up

# Rollback last migration
npm run migrate:down

# Create new migration
npm run migrate:create <migration-name>
```

### Migration Files

Migrations are located in `src/migrations/` and include:

1. **1697000000000_create-users-and-profiles.js**
   - Users table
   - OAuth providers
   - User profiles
   - Career goals

2. **1697000000001_create-skills.js**
   - Skills table
   - Skill score history
   - Certifications

3. **1697000000002_create-experience-and-education.js**
   - Experience table
   - Education table
   - Portfolio items

4. **1697000000003_create-jobs.js**
   - Jobs table (cached from external sources)
   - Saved jobs
   - Job alerts
   - Job match scores

5. **1697000000004_create-applications.js**
   - Applications table
   - Application notes
   - Application timeline
   - Interview prep
   - Practice sessions
   - Notifications

### Database Schema

Key tables and relationships:

```
users
├── user_profiles (1:1)
├── oauth_providers (1:N)
├── career_goals (1:N)
├── skills (1:N)
├── certifications (1:N)
├── experience (1:N)
├── education (1:N)
├── portfolio_items (1:N)
├── saved_jobs (1:N)
├── job_alerts (1:N)
├── applications (1:N)
└── notifications (1:N)

jobs
├── saved_jobs (1:N)
├── job_match_scores (1:N)
└── applications (1:N)

applications
├── application_notes (1:N)
├── application_timeline (1:N)
├── interview_prep (1:1)
└── practice_sessions (1:N via interview_prep)
```

## MongoDB Collections

### Initialization

```bash
npm run mongo:init
```

### Collections

1. **resume_templates**
   - Stores resume template definitions
   - Includes default templates (Modern Professional, ATS-Friendly Classic)
   - Indexes: name, category, isPublic, userId

2. **cover_letter_templates**
   - Stores cover letter template definitions
   - Includes default templates (Professional Standard, Enthusiastic Approach)
   - Indexes: name, tone, isPublic, userId

3. **generated_documents**
   - Stores AI-generated resumes and cover letters
   - Indexes: userId, jobId, documentType, createdAt

4. **document_versions**
   - Tracks document revision history
   - Indexes: documentId, version, createdAt

### Schema Validation

MongoDB collections use JSON Schema validation to ensure data integrity. Validation is set to "moderate" level to allow flexibility during development.

## Redis Configuration

### Key Naming Conventions

Redis keys follow the pattern: `{namespace}:{entity}:{id}:{field}`

Examples:
- `session:abc123` - User session
- `user:uuid:profile` - User profile cache
- `job:search:software+engineer` - Job search results
- `rate_limit:user123:/api/jobs` - Rate limiting

### Cache TTL (Time To Live)

- **SHORT**: 5 minutes (300s)
- **MEDIUM**: 1 hour (3600s)
- **LONG**: 24 hours (86400s)
- **SESSION**: 7 days (604800s)
- **JOB_SEARCH**: 15 minutes (900s)
- **RATE_LIMIT**: 1 minute (60s)

### Cache Services

The platform provides several cache services:

1. **RedisCacheService**: Basic cache operations (get, set, del)
2. **CacheInvalidation**: Invalidate related caches
3. **SessionManager**: Session management
4. **RateLimiter**: Rate limiting for API endpoints

### Testing Redis

```bash
npm run redis:test
```

This tests:
- Connection
- Basic operations (SET/GET)
- Key existence and TTL
- Increment operations
- Set operations
- Sorted set operations
- Key naming conventions

## Environment Variables

Create a `.env` file in `packages/backend/`:

```env
# PostgreSQL
DATABASE_URL=postgresql://givemejobs:dev_password@localhost:5432/givemejobs_db
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=givemejobs
POSTGRES_PASSWORD=dev_password
POSTGRES_DB=givemejobs_db

# MongoDB
MONGODB_URI=mongodb://givemejobs:dev_password@localhost:27017/givemejobs_docs?authSource=admin
MONGO_HOST=localhost
MONGO_PORT=27017
MONGO_USER=givemejobs
MONGO_PASSWORD=dev_password
MONGO_DB=givemejobs_docs

# Redis
REDIS_URL=redis://:dev_password@localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=dev_password
```

## Connection Management

### PostgreSQL Pool

```typescript
import { pgPool } from './config/database';

// Query example
const result = await pgPool.query('SELECT * FROM users WHERE id = $1', [userId]);
```

### MongoDB Client

```typescript
import { connectMongo } from './config/database';

// Get database instance
const db = await connectMongo();
const collection = db.collection('resume_templates');
```

### Redis Client

```typescript
import { RedisCacheService, RedisKeys } from './config/redis-config';

// Cache user profile
await RedisCacheService.set(RedisKeys.userProfile(userId), profile, CacheTTL.MEDIUM);

// Get cached profile
const profile = await RedisCacheService.get(RedisKeys.userProfile(userId));
```

## Troubleshooting

### PostgreSQL Connection Issues

```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# View PostgreSQL logs
docker logs givemejobs-postgres

# Connect to PostgreSQL directly
docker exec -it givemejobs-postgres psql -U givemejobs -d givemejobs_db
```

### MongoDB Connection Issues

```bash
# Check if MongoDB is running
docker ps | grep mongo

# View MongoDB logs
docker logs givemejobs-mongodb

# Connect to MongoDB directly
docker exec -it givemejobs-mongodb mongosh -u givemejobs -p dev_password
```

### Redis Connection Issues

```bash
# Check if Redis is running
docker ps | grep redis

# View Redis logs
docker logs givemejobs-redis

# Connect to Redis directly
docker exec -it givemejobs-redis redis-cli -a dev_password
```

### Reset Databases

```bash
# Stop and remove all containers and volumes
npm run docker:down
docker volume rm givemejobs-platform_postgres_data
docker volume rm givemejobs-platform_mongodb_data
docker volume rm givemejobs-platform_redis_data

# Start fresh
npm run docker:up
cd packages/backend && npm run db:setup
```

## Performance Optimization

### PostgreSQL Indexes

All tables include indexes on:
- Primary keys (automatic)
- Foreign keys
- Frequently queried columns (email, status, dates)
- Composite indexes for common query patterns

### MongoDB Indexes

Collections include indexes on:
- userId for user-specific queries
- createdAt for time-based queries
- Composite indexes for common filters

### Redis Caching Strategy

- Cache frequently accessed data (user profiles, job details)
- Use appropriate TTLs based on data volatility
- Implement cache invalidation on data updates
- Use Redis sets for relationships
- Use sorted sets for rankings and leaderboards

## Backup and Recovery

### PostgreSQL Backup

```bash
# Backup database
docker exec givemejobs-postgres pg_dump -U givemejobs givemejobs_db > backup.sql

# Restore database
docker exec -i givemejobs-postgres psql -U givemejobs givemejobs_db < backup.sql
```

### MongoDB Backup

```bash
# Backup database
docker exec givemejobs-mongodb mongodump --username givemejobs --password dev_password --authenticationDatabase admin --db givemejobs_docs --out /backup

# Restore database
docker exec givemejobs-mongodb mongorestore --username givemejobs --password dev_password --authenticationDatabase admin --db givemejobs_docs /backup/givemejobs_docs
```

## Production Considerations

1. **Use strong passwords** - Replace default passwords in production
2. **Enable SSL/TLS** - Encrypt database connections
3. **Set up replication** - PostgreSQL streaming replication, MongoDB replica sets
4. **Configure backups** - Automated daily backups with retention policy
5. **Monitor performance** - Use pg_stat_statements, MongoDB profiler, Redis INFO
6. **Scale appropriately** - Connection pooling, read replicas, Redis clustering
7. **Implement security** - Network isolation, firewall rules, access controls

## Additional Resources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [Redis Documentation](https://redis.io/documentation)
- [node-pg-migrate](https://salsita.github.io/node-pg-migrate/)
