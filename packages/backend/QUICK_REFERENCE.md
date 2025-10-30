# Database Quick Reference

## Quick Commands

```bash
# Start databases
npm run docker:up

# Setup all databases
npm run db:setup

# Test Redis
npm run redis:test

# Run migrations
npm run migrate:up

# Rollback migration
npm run migrate:down

# Initialize MongoDB
npm run mongo:init
```

## Connection Strings

```typescript
// PostgreSQL
postgresql://givemejobs:dev_password@localhost:5432/givemejobs_db

// MongoDB
mongodb://givemejobs:dev_password@localhost:27017/givemejobs_docs?authSource=admin

// Redis
redis://:dev_password@localhost:6379
```

## Common Queries

### PostgreSQL

```typescript
import { pgPool } from './config/database';

// Get user by email
const user = await pgPool.query(
  'SELECT * FROM users WHERE email = $1',
  ['user@example.com']
);

// Get user profile with skills
const profile = await pgPool.query(`
  SELECT u.*, up.*, array_agg(s.*) as skills
  FROM users u
  JOIN user_profiles up ON u.id = up.user_id
  LEFT JOIN skills s ON u.id = s.user_id
  WHERE u.id = $1
  GROUP BY u.id, up.id
`, [userId]);

// Get user applications with job details
const applications = await pgPool.query(`
  SELECT a.*, j.title, j.company, j.location
  FROM applications a
  JOIN jobs j ON a.job_id = j.id
  WHERE a.user_id = $1
  ORDER BY a.applied_date DESC
`, [userId]);
```

### MongoDB

```typescript
import { connectMongo } from './config/database';

const db = await connectMongo();

// Get resume templates
const templates = await db.collection('resume_templates')
  .find({ isPublic: true })
  .toArray();

// Get user's generated documents
const documents = await db.collection('generated_documents')
  .find({ userId })
  .sort({ createdAt: -1 })
  .toArray();

// Create new document
await db.collection('generated_documents').insertOne({
  userId,
  jobId,
  documentType: 'resume',
  title: 'Software Engineer Resume',
  content: { sections: [...] },
  templateId,
  version: 1,
  metadata: { wordCount: 500, keywordsUsed: [...], generationTime: 8.5 },
  createdAt: new Date(),
  updatedAt: new Date(),
});
```

### Redis

```typescript
import { RedisCacheService, RedisKeys, CacheTTL } from './config/redis-config';

// Cache user profile
await RedisCacheService.set(
  RedisKeys.userProfile(userId),
  profile,
  CacheTTL.MEDIUM
);

// Get cached profile
const profile = await RedisCacheService.get(RedisKeys.userProfile(userId));

// Invalidate user cache
await CacheInvalidation.invalidateUser(userId);

// Rate limiting
const { allowed, remaining } = await RateLimiter.checkLimit(
  userId,
  '/api/jobs/search',
  100, // max requests
  60   // window in seconds
);
```

## Table Relationships

```
users (1) ──→ (1) user_profiles
users (1) ──→ (N) skills
users (1) ──→ (N) experience
users (1) ──→ (N) education
users (1) ──→ (N) applications
users (1) ──→ (N) saved_jobs

jobs (1) ──→ (N) applications
jobs (1) ──→ (N) saved_jobs
jobs (1) ──→ (N) job_match_scores

applications (1) ──→ (N) application_notes
applications (1) ──→ (N) application_timeline
applications (1) ──→ (1) interview_prep
```

## Redis Key Patterns

```
session:{sessionId}
user:{userId}
user:{userId}:profile
user:{userId}:skills
user:{userId}:applications
job:{jobId}
job:search:{query}
job:recommendations:{userId}
job:match:{userId}:{jobId}
rate_limit:{identifier}:{endpoint}
```

## Cache TTLs

| Type | Duration | Use Case |
|------|----------|----------|
| SHORT | 5 min | Volatile data |
| MEDIUM | 1 hour | Standard cache |
| LONG | 24 hours | Stable data |
| SESSION | 7 days | User sessions |
| JOB_SEARCH | 15 min | Search results |
| RATE_LIMIT | 1 min | Rate limiting |

## Migration Workflow

```bash
# Create new migration
npm run migrate:create add-new-field

# Edit migration file in src/migrations/

# Apply migration
npm run migrate:up

# If something goes wrong
npm run migrate:down
```

## Troubleshooting

```bash
# Check database status
docker ps

# View logs
docker logs givemejobs-postgres
docker logs givemejobs-mongodb
docker logs givemejobs-redis

# Connect directly
docker exec -it givemejobs-postgres psql -U givemejobs -d givemejobs_db
docker exec -it givemejobs-mongodb mongosh -u givemejobs -p dev_password
docker exec -it givemejobs-redis redis-cli -a dev_password

# Reset everything
npm run docker:down
docker volume prune
npm run docker:up
npm run db:setup
```

## Environment Variables

```env
# PostgreSQL
DATABASE_URL=postgresql://givemejobs:dev_password@localhost:5432/givemejobs_db

# MongoDB
MONGODB_URI=mongodb://givemejobs:dev_password@localhost:27017/givemejobs_docs?authSource=admin

# Redis
REDIS_URL=redis://:dev_password@localhost:6379
```

## Common Patterns

### Transaction Example (PostgreSQL)

```typescript
const client = await pgPool.connect();
try {
  await client.query('BEGIN');
  
  // Insert user
  const userResult = await client.query(
    'INSERT INTO users (email, password_hash, first_name, last_name) VALUES ($1, $2, $3, $4) RETURNING id',
    [email, hash, firstName, lastName]
  );
  
  // Insert profile
  await client.query(
    'INSERT INTO user_profiles (user_id) VALUES ($1)',
    [userResult.rows[0].id]
  );
  
  await client.query('COMMIT');
} catch (e) {
  await client.query('ROLLBACK');
  throw e;
} finally {
  client.release();
}
```

### Bulk Insert (MongoDB)

```typescript
const documents = [
  { userId, jobId: 'job1', ... },
  { userId, jobId: 'job2', ... },
];

await db.collection('generated_documents').insertMany(documents);
```

### Pipeline Operations (Redis)

```typescript
const pipeline = redisClient.multi();
pipeline.set(key1, value1);
pipeline.set(key2, value2);
pipeline.expire(key1, 3600);
await pipeline.exec();
```

## Performance Tips

1. **Use indexes** - All foreign keys and frequently queried fields are indexed
2. **Cache aggressively** - Use Redis for frequently accessed data
3. **Batch operations** - Use bulk inserts/updates when possible
4. **Connection pooling** - Already configured in pgPool
5. **Invalidate smartly** - Only invalidate affected caches
6. **Monitor queries** - Use EXPLAIN for slow queries

## Security Checklist

- ✅ Passwords hashed (bcrypt)
- ✅ SQL injection prevention (parameterized queries)
- ✅ Foreign key constraints
- ✅ Cascade deletes for data cleanup
- ✅ OAuth token storage
- ✅ Session management
- ✅ Rate limiting
- ⚠️ Change default passwords in production
- ⚠️ Enable SSL/TLS in production
- ⚠️ Set up proper firewall rules
