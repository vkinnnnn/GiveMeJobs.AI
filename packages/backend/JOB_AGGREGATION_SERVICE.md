# Job Aggregation and Search Service

This document describes the job aggregation and search service implementation for the GiveMeJobs platform.

## Overview

The job aggregation service integrates with multiple job boards (LinkedIn, Indeed, Glassdoor) to provide a unified job search experience. It includes:

- Multi-source job board integration with rate limiting
- Job data normalization and deduplication
- Search with filtering and pagination
- Redis caching for performance
- PostgreSQL storage for persistence
- Saved jobs functionality

## Architecture

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│ Job Controller  │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐      ┌──────────────┐
│  Job Service    │◄────►│    Redis     │
└──────┬──────────┘      │   (Cache)    │
       │                 └──────────────┘
       ▼
┌─────────────────┐      ┌──────────────┐
│ Job Aggregator  │◄────►│  PostgreSQL  │
└──────┬──────────┘      │  (Storage)   │
       │                 └──────────────┘
       ▼
┌─────────────────────────────────┐
│      Job Board Adapters         │
├─────────┬──────────┬────────────┤
│LinkedIn │ Indeed   │ Glassdoor  │
└─────────┴──────────┴────────────┘
```

## Components

### 1. Job Board Adapters

Located in `src/services/job-adapters/`

#### Base Adapter (`base-adapter.ts`)
- Abstract base class for all job board adapters
- Implements rate limiting and retry logic
- Provides common utility methods for data parsing

#### LinkedIn Adapter (`linkedin-adapter.ts`)
- Integrates with LinkedIn Jobs API
- Currently returns mock data (replace with actual API calls in production)

#### Indeed Adapter (`indeed-adapter.ts`)
- Integrates with Indeed API
- Currently returns mock data (replace with actual API calls in production)

#### Glassdoor Adapter (`glassdoor-adapter.ts`)
- Integrates with Glassdoor API
- Currently returns mock data (replace with actual API calls in production)

### 2. Job Aggregator Service

Located in `src/services/job-aggregator.service.ts`

**Responsibilities:**
- Coordinates searches across multiple job boards
- Normalizes job data from different sources
- Deduplicates jobs based on title, company, and location
- Ranks jobs by completeness when duplicates are found

**Key Methods:**
- `searchJobs(query)` - Search across all job boards
- `getJobDetails(source, externalId)` - Fetch details from specific source
- `deduplicateJobs(jobs)` - Remove duplicate job listings

### 3. Job Service

Located in `src/services/job.service.ts`

**Responsibilities:**
- Manages job data in PostgreSQL
- Implements Redis caching for performance
- Handles search filtering and pagination
- Manages saved jobs functionality

**Key Methods:**
- `searchJobs(query)` - Search with caching and filtering
- `getJobById(jobId)` - Get job by internal ID
- `getJobDetails(source, externalId)` - Get job by external ID
- `saveJob(userId, jobId, notes)` - Save a job
- `unsaveJob(userId, jobId)` - Remove saved job
- `getSavedJobs(userId)` - Get user's saved jobs

### 4. Rate Limiter

Located in `src/utils/rate-limiter.ts`

**Features:**
- Per-minute and per-day rate limiting
- Redis-based counter storage
- Automatic expiration of counters
- Retry logic with exponential backoff

**Configuration:**
```typescript
{
  requestsPerMinute: 10,
  requestsPerDay: 1000
}
```

## API Endpoints

### Search Jobs
```
GET /api/jobs/search
```

**Query Parameters:**
- `keywords` - Search keywords
- `location` - Job location
- `remoteType` - Comma-separated: remote,hybrid,onsite
- `jobType` - Comma-separated: full-time,part-time,contract,internship
- `salaryMin` - Minimum salary
- `salaryMax` - Maximum salary
- `postedWithin` - Days (e.g., 7 for last week)
- `page` - Page number (default: 1)
- `limit` - Results per page (default: 20)

**Example:**
```bash
GET /api/jobs/search?keywords=software+engineer&location=remote&page=1&limit=20
```

**Response:**
```json
{
  "success": true,
  "data": {
    "jobs": [...],
    "total": 150,
    "page": 1,
    "totalPages": 8
  }
}
```

### Get Job by ID
```
GET /api/jobs/:id
```

**Example:**
```bash
GET /api/jobs/123e4567-e89b-12d3-a456-426614174000
```

### Get Job Details by External ID
```
GET /api/jobs/:source/:externalId
```

**Example:**
```bash
GET /api/jobs/linkedin/li-1234567890
```

### Save Job
```
POST /api/jobs/:jobId/save
```

**Body:**
```json
{
  "notes": "Interesting position, apply by Friday"
}
```

### Unsave Job
```
DELETE /api/jobs/:jobId/unsave
```

### Get Saved Jobs
```
GET /api/jobs/saved
```

## Data Flow

### Job Search Flow

1. **Client Request** → Controller receives search query
2. **Cache Check** → Service checks Redis for cached results
3. **Cache Miss** → Aggregator searches all job boards in parallel
4. **Normalization** → Job data is normalized to unified schema
5. **Deduplication** → Duplicate jobs are removed
6. **Storage** → Jobs are stored in PostgreSQL
7. **Filtering** → Results are filtered based on query parameters
8. **Pagination** → Results are paginated
9. **Caching** → Results are cached in Redis (1 hour TTL)
10. **Response** → Formatted results returned to client

### Job Details Flow

1. **Client Request** → Controller receives job ID
2. **Cache Check** → Service checks Redis cache
3. **Database Check** → Service queries PostgreSQL
4. **External Fetch** → If not found, fetch from external source
5. **Storage** → Store in database for future use
6. **Caching** → Cache the result
7. **Response** → Return job details

## Caching Strategy

### Cache Keys

- Search results: `job:search:{keywords}:{location}:{filters}:{page}:{limit}`
- Job details: `job:{jobId}`
- Saved jobs: `saved_jobs:{userId}`

### TTL (Time To Live)

- Search results: 1 hour (3600 seconds)
- Job details: 1 hour (3600 seconds)
- Saved jobs: 1 hour (3600 seconds)

### Cache Invalidation

- Saved jobs cache is invalidated when user saves/unsaves a job
- Search cache expires automatically after TTL
- Job details cache expires automatically after TTL

## Database Schema

### jobs Table

```sql
CREATE TABLE jobs (
  id UUID PRIMARY KEY,
  external_id VARCHAR(255) NOT NULL,
  source VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  company VARCHAR(255) NOT NULL,
  location VARCHAR(255),
  remote_type VARCHAR(20),
  job_type VARCHAR(50),
  salary_min INTEGER,
  salary_max INTEGER,
  description TEXT,
  requirements TEXT[],
  responsibilities TEXT[],
  benefits TEXT[],
  posted_date TIMESTAMP,
  application_deadline TIMESTAMP,
  apply_url TEXT,
  company_logo TEXT,
  industry VARCHAR(100),
  experience_level VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(external_id, source)
);
```

### saved_jobs Table

```sql
CREATE TABLE saved_jobs (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, job_id)
);
```

## Configuration

### Environment Variables

Add these to your `.env` file:

```env
# Job Board API Keys (optional - currently using mock data)
LINKEDIN_API_KEY=your_linkedin_api_key
INDEED_API_KEY=your_indeed_api_key
GLASSDOOR_API_KEY=your_glassdoor_api_key
```

## Rate Limiting

Each job board adapter has rate limiting configured:

- **Requests per minute:** 10
- **Requests per day:** 1000

Rate limits are tracked per adapter and optionally per user.

## Error Handling

The service implements graceful error handling:

1. **Adapter Failures:** If one job board fails, others continue
2. **Rate Limit Exceeded:** Returns error with remaining quota
3. **Network Errors:** Automatic retry with exponential backoff (3 attempts)
4. **Cache Failures:** Falls back to database/external source

## Testing

### Manual Testing

1. Start the server:
```bash
npm run dev
```

2. Test job search:
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3001/api/jobs/search?keywords=developer&location=remote"
```

3. Test save job:
```bash
curl -X POST -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"notes":"Great opportunity"}' \
  "http://localhost:3001/api/jobs/JOB_ID/save"
```

4. Test get saved jobs:
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3001/api/jobs/saved"
```

## Production Considerations

### 1. Replace Mock Data

Replace the mock data generators in each adapter with actual API calls:

```typescript
// Example for LinkedIn adapter
async search(query: JobSearchQuery): Promise<Job[]> {
  return this.makeRequest(async () => {
    const response = await fetch(
      `https://api.linkedin.com/v2/jobs?keywords=${query.keywords}`,
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      }
    );
    const data = await response.json();
    return data.jobs.map((job) => this.normalizeJob(job));
  });
}
```

### 2. API Key Management

- Store API keys securely in environment variables
- Use a secrets manager (AWS Secrets Manager, HashiCorp Vault)
- Rotate keys regularly

### 3. Rate Limit Tuning

Adjust rate limits based on your API plan:

```typescript
new LinkedInAdapter(apiKey, {
  requestsPerMinute: 60,
  requestsPerDay: 10000,
});
```

### 4. Monitoring

- Monitor API usage and rate limits
- Track cache hit rates
- Alert on adapter failures
- Monitor response times

### 5. Scaling

- Use Redis Cluster for distributed caching
- Implement database read replicas
- Consider job queue for background job fetching
- Implement circuit breakers for external APIs

## Future Enhancements

1. **Background Job Sync:** Periodic background job to fetch new listings
2. **Job Alerts:** Notify users when new jobs match their criteria
3. **Advanced Matching:** ML-based job matching algorithm
4. **More Sources:** Add ZipRecruiter, Monster, CareerBuilder
5. **Company Data:** Enrich jobs with company information
6. **Salary Insights:** Aggregate salary data and trends

## Troubleshooting

### Jobs not appearing in search

1. Check if adapters are returning data
2. Verify database connection
3. Check Redis connection
4. Review rate limit status

### Slow search performance

1. Check Redis cache hit rate
2. Verify database indexes
3. Review adapter response times
4. Consider reducing number of sources

### Duplicate jobs appearing

1. Review deduplication logic
2. Check normalization of company names
3. Verify location standardization

## Support

For issues or questions, refer to:
- Main README.md
- Database documentation (DATABASE.md)
- API documentation
