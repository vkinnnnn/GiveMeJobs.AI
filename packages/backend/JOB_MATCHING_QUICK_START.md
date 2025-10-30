# Job Matching Quick Start Guide

## Prerequisites

1. OpenAI API key (for embeddings)
2. Pinecone account and API key (for vector database)
3. PostgreSQL database with jobs data

## Setup Steps

### 1. Configure Environment Variables

Add to your `.env` file:

```bash
OPENAI_API_KEY=sk-...
PINECONE_API_KEY=...
PINECONE_INDEX_NAME=givemejobs-jobs
```

### 2. Initialize Vector Database

```bash
npm run vector:init
```

This will:
- Connect to Pinecone
- Create the index if it doesn't exist
- Verify the setup

### 3. Generate Embeddings for Existing Jobs

```bash
npm run jobs:embed
```

This will:
- Fetch all jobs from PostgreSQL
- Generate embeddings using OpenAI
- Store embeddings in Pinecone

**Note**: This may take a while depending on the number of jobs. OpenAI API has rate limits.

## API Usage

### Get Personalized Recommendations

```bash
curl -X GET "http://localhost:4000/api/jobs/recommendations?limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

With filters:

```bash
curl -X GET "http://localhost:4000/api/jobs/recommendations?limit=10&remoteType=remote&minMatchScore=70" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get Match Analysis for a Job

```bash
curl -X GET "http://localhost:4000/api/jobs/JOB_ID/match-analysis" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Batch Match Analysis

```bash
curl -X POST "http://localhost:4000/api/jobs/batch-match" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jobIds": ["job-id-1", "job-id-2", "job-id-3"]
  }'
```

## How Match Scores Work

The system calculates a 0-100 match score based on:

| Factor | Weight | Description |
|--------|--------|-------------|
| Skills | 35% | Matching skills vs. job requirements |
| Experience | 25% | Years of experience and role relevance |
| Location | 15% | Location and remote work preferences |
| Salary | 10% | Compensation alignment |
| Culture Fit | 15% | Industry and career goal alignment |

### Example Match Score Breakdown

```json
{
  "overallScore": 82,
  "breakdown": {
    "skillMatch": 85,      // 85 * 0.35 = 29.75
    "experienceMatch": 90, // 90 * 0.25 = 22.50
    "locationMatch": 100,  // 100 * 0.15 = 15.00
    "salaryMatch": 75,     // 75 * 0.10 = 7.50
    "cultureFit": 60       // 60 * 0.15 = 9.00
  }
  // Total: 29.75 + 22.50 + 15.00 + 7.50 + 9.00 = 83.75 ≈ 82
}
```

## User Profile Requirements

For accurate matching, users should have:

1. **Skills**: List of skills with proficiency levels
2. **Experience**: Work history with roles and descriptions
3. **Education**: Degrees and fields of study
4. **Preferences**: Location, salary, remote work preferences
5. **Career Goals** (optional): Target roles and industries

## Automatic Embedding Updates

When new jobs are added through the job aggregation service, embeddings should be generated automatically. Add this to your job service:

```typescript
import { vectorDbService } from './vector-db.service';

async storeJob(job: Job): Promise<string> {
  // ... existing code to store in PostgreSQL ...
  
  // Generate and store embedding
  try {
    await vectorDbService.storeJobEmbedding(job);
  } catch (error) {
    console.error('Failed to store job embedding:', error);
    // Don't fail the entire operation if embedding fails
  }
  
  return jobId;
}
```

## Performance Tips

1. **Cache Match Scores**: Store frequently accessed match scores in Redis
2. **Batch Processing**: Use batch endpoints for multiple jobs
3. **Rate Limiting**: Implement rate limiting for recommendation requests
4. **Async Processing**: Generate embeddings asynchronously for new jobs

## Troubleshooting

### No recommendations returned

**Possible causes**:
- No jobs in database
- Vector database not initialized
- Filters too restrictive
- User profile incomplete

**Solution**:
```bash
# Check if jobs exist
psql -d givemejobs_db -c "SELECT COUNT(*) FROM jobs;"

# Re-initialize vector database
npm run vector:init

# Re-generate embeddings
npm run jobs:embed
```

### Low match scores

**Possible causes**:
- User profile incomplete
- Skills not matching job requirements
- Experience level mismatch

**Solution**:
- Ensure user has completed their profile
- Add more skills to user profile
- Review weight configuration if needed

### Embedding generation fails

**Possible causes**:
- Invalid OpenAI API key
- Rate limit exceeded
- Network issues

**Solution**:
```bash
# Test OpenAI connection
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"

# Check rate limits in OpenAI dashboard
# Wait and retry with exponential backoff
```

## Monitoring

Monitor these metrics:

1. **Recommendation Quality**: Track user engagement with recommendations
2. **API Latency**: Monitor response times for match calculations
3. **Embedding Generation**: Track success/failure rates
4. **Cache Hit Rate**: Monitor Redis cache effectiveness

## Next Steps

1. Implement user feedback collection
2. Add A/B testing for different weight configurations
3. Train custom ML model on user application data
4. Add real-time embedding updates
5. Implement collaborative filtering

## Support

For detailed documentation, see [JOB_MATCHING.md](./JOB_MATCHING.md)
