# Job Matching System Documentation

## Overview

The AI-powered job matching system uses vector embeddings and a weighted scoring algorithm to match users with relevant job opportunities. It combines semantic similarity search with rule-based scoring across multiple dimensions.

## Architecture

### Components

1. **Vector Database (Pinecone)**: Stores job embeddings for semantic similarity search
2. **Embedding Service**: Generates embeddings using OpenAI's text-embedding-ada-002 model
3. **Job Matching Service**: Calculates match scores using weighted algorithm
4. **Job Matching Controller**: Exposes REST API endpoints

### Matching Algorithm

The matching algorithm uses a weighted scoring system:

- **Skill Match (35%)**: Compares user skills with job requirements
- **Experience Match (25%)**: Evaluates years of experience and role relevance
- **Location Match (15%)**: Considers location and remote work preferences
- **Salary Match (10%)**: Aligns compensation expectations
- **Culture Fit (15%)**: Matches industry preferences and career goals

## Setup

### Environment Variables

Add the following to your `.env` file:

```bash
# OpenAI API Key (required for embeddings)
OPENAI_API_KEY=your_openai_api_key

# Pinecone Configuration
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_INDEX_NAME=givemejobs-jobs
```

### Initialize Vector Database

The system will automatically create the Pinecone index if it doesn't exist. You can also manually initialize it:

```typescript
import { vectorDbService } from './services/vector-db.service';

await vectorDbService.ensureIndexExists();
```

### Store Job Embeddings

When new jobs are added to the system, store their embeddings:

```typescript
import { vectorDbService } from './services/vector-db.service';

// Single job
await vectorDbService.storeJobEmbedding(job);

// Multiple jobs (batch)
await vectorDbService.storeJobEmbeddings(jobs);
```

## API Endpoints

### 1. Get Job Recommendations

Get personalized job recommendations based on user profile.

**Endpoint**: `GET /api/jobs/recommendations`

**Query Parameters**:
- `limit` (optional): Number of recommendations (default: 20)
- `location` (optional): Filter by location
- `remoteType` (optional): Filter by remote type (remote, hybrid, onsite)
- `jobType` (optional): Filter by job type (full-time, part-time, contract, internship)
- `salaryMin` (optional): Minimum salary requirement
- `minMatchScore` (optional): Minimum match score threshold (0-100)

**Example Request**:
```bash
GET /api/jobs/recommendations?limit=10&remoteType=remote&minMatchScore=70
```

**Example Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "job-uuid",
      "title": "Senior Software Engineer",
      "company": "Tech Corp",
      "location": "San Francisco, CA",
      "remoteType": "remote",
      "matchScore": 85,
      "description": "...",
      "requirements": ["..."],
      "salaryMin": 120000,
      "salaryMax": 180000
    }
  ],
  "count": 10
}
```

### 2. Get Match Analysis

Get detailed match analysis for a specific job.

**Endpoint**: `GET /api/jobs/:jobId/match-analysis`

**Example Request**:
```bash
GET /api/jobs/123e4567-e89b-12d3-a456-426614174000/match-analysis
```

**Example Response**:
```json
{
  "success": true,
  "data": {
    "jobId": "123e4567-e89b-12d3-a456-426614174000",
    "userId": "user-uuid",
    "overallScore": 82,
    "breakdown": {
      "skillMatch": 85,
      "experienceMatch": 90,
      "locationMatch": 100,
      "salaryMatch": 75,
      "cultureFit": 60
    },
    "matchingSkills": [
      "JavaScript",
      "React",
      "Node.js",
      "PostgreSQL"
    ],
    "missingSkills": [
      "Kubernetes",
      "AWS"
    ],
    "recommendations": [
      "Strong match! Your skills and experience align well with this role.",
      "Consider learning: Kubernetes, AWS"
    ]
  }
}
```

### 3. Batch Match Analysis

Calculate match scores for multiple jobs at once.

**Endpoint**: `POST /api/jobs/batch-match`

**Request Body**:
```json
{
  "jobIds": [
    "job-uuid-1",
    "job-uuid-2",
    "job-uuid-3"
  ]
}
```

**Example Response**:
```json
{
  "success": true,
  "data": [
    {
      "jobId": "job-uuid-1",
      "userId": "user-uuid",
      "overallScore": 82,
      "breakdown": { "..." },
      "matchingSkills": ["..."],
      "missingSkills": ["..."],
      "recommendations": ["..."]
    }
  ]
}
```

## How It Works

### 1. Profile Embedding Generation

When a user requests recommendations, the system:
1. Retrieves the user's profile (skills, experience, education, career goals)
2. Creates a text representation of the profile
3. Generates an embedding vector using OpenAI's API

### 2. Semantic Search

The profile embedding is used to query Pinecone for similar jobs:
1. Finds top N most similar jobs based on cosine similarity
2. Returns job IDs and similarity scores

### 3. Match Score Calculation

For each job, the system calculates:

#### Skill Match (35%)
- Extracts skills from job requirements and description
- Compares with user's skills
- Weights by proficiency level
- Returns matching and missing skills

#### Experience Match (25%)
- Parses required experience level from job
- Compares with user's total years of experience
- Adds bonus for relevant role experience

#### Location Match (15%)
- Compares job location/remote type with user preferences
- Remote jobs score highest
- Considers geographic preferences

#### Salary Match (10%)
- Compares job salary range with user expectations
- Calculates overlap percentage
- Handles missing salary data gracefully

#### Culture Fit (15%)
- Matches industry preferences
- Aligns with career goals
- Considers company size preferences (when available)

### 4. Filtering and Sorting

Results are:
1. Filtered by user-specified criteria
2. Sorted by overall match score (descending)
3. Limited to requested number of results

## Skill Extraction

The system uses pattern matching to extract skills from job descriptions:

- **Programming Languages**: JavaScript, Python, Java, C++, etc.
- **Frameworks**: React, Angular, Vue, Django, Spring, etc.
- **Databases**: PostgreSQL, MongoDB, Redis, etc.
- **Cloud Platforms**: AWS, Azure, GCP
- **DevOps Tools**: Docker, Kubernetes, Terraform
- **Methodologies**: Agile, Scrum, CI/CD

You can extend the skill list in `job-matching.service.ts`.

## Performance Considerations

### Caching
- Job embeddings are stored in Pinecone for fast retrieval
- Match scores can be cached in Redis for frequently accessed jobs

### Batch Processing
- Use batch embedding generation for multiple jobs
- Pinecone supports batch upserts (100 vectors per batch)

### Rate Limiting
- OpenAI API has rate limits for embedding generation
- Implement exponential backoff for retries

## Error Handling

The system handles various error scenarios:

1. **Missing API Keys**: Throws error if OpenAI or Pinecone keys not configured
2. **Job Not Found**: Returns 404 if job doesn't exist
3. **Embedding Failures**: Logs error and throws exception
4. **Vector DB Errors**: Catches and logs Pinecone errors

## Testing

To test the matching system:

```bash
# Run tests
npm test

# Test specific file
npm test job-matching.service.test.ts
```

## Future Enhancements

1. **Machine Learning Model**: Train custom model on user feedback
2. **Collaborative Filtering**: Use application success rates
3. **Real-time Updates**: Update embeddings when jobs change
4. **A/B Testing**: Test different weight configurations
5. **Explainability**: Provide more detailed match explanations

## Troubleshooting

### Issue: Low match scores for all jobs
- Check if user profile is complete (skills, experience, preferences)
- Verify job embeddings are stored in Pinecone
- Review weight configuration

### Issue: Embedding generation fails
- Verify OPENAI_API_KEY is set correctly
- Check API rate limits
- Ensure text length is within limits (8191 tokens)

### Issue: No recommendations returned
- Check if jobs exist in database
- Verify Pinecone index is initialized
- Review filter criteria (may be too restrictive)

## Support

For issues or questions, refer to:
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Pinecone Documentation](https://docs.pinecone.io)
- Project README.md
