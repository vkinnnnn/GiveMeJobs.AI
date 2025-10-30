# 🎯 Pinecone Best Configuration for GiveMeJobs

## Recommended Index Settings

### Index Configuration

| Setting | Value | Why |
|---------|-------|-----|
| **Index Name** | `givemejobs-jobs` | Clear, descriptive name |
| **Dimensions** | `1536` | Matches OpenAI text-embedding-ada-002 |
| **Metric** | `cosine` | Best for semantic similarity |
| **Pod Type** | `s1.x1` (Starter) | Free tier, perfect for development |
| **Replicas** | `1` | Sufficient for development |
| **Pods** | `1` | Free tier limit |

---

## Step-by-Step Setup

### 1. Create Pinecone Account
- Go to: https://www.pinecone.io/
- Sign up (free tier available)
- Verify your email

### 2. Create Index

1. **Click "Create Index"** in dashboard

2. **Fill in these exact values:**

   ```
   Index Name: givemejobs-jobs
   
   Dimensions: 1536
   
   Metric: cosine
   
   Pod Type: Starter (s1.x1)
   
   Replicas: 1
   
   Pods: 1
   
   Metadata Config: (leave default)
   ```

3. **Click "Create Index"**

### 3. Get API Key

1. Go to **"API Keys"** section
2. Copy your API key
3. Copy your environment (e.g., `us-east-1-aws`)

### 4. Add to .env

```env
PINECONE_API_KEY=your-api-key-here
PINECONE_INDEX_NAME=givemejobs-jobs
PINECONE_ENVIRONMENT=us-east-1-aws
```

---

## Why These Settings?

### Dimensions: 1536
- ✅ Matches OpenAI's `text-embedding-ada-002` model
- ✅ Industry standard for semantic search
- ✅ Optimal balance of accuracy and performance
- ❌ Don't change this unless using a different embedding model

### Metric: cosine
- ✅ Best for text similarity (semantic search)
- ✅ Normalized vectors (0 to 1 similarity score)
- ✅ Works great with OpenAI embeddings
- ✅ Industry standard for NLP tasks

**Alternatives:**
- `euclidean` - For spatial data (not recommended for text)
- `dotproduct` - For unnormalized vectors (not recommended)

### Pod Type: s1.x1 (Starter)
- ✅ Free tier
- ✅ 1M vectors included
- ✅ Perfect for development and testing
- ✅ Can upgrade later without recreating index

**Upgrade path:**
- Development: `s1.x1` (Starter) - Free
- Production (small): `s1.x1` - $70/month
- Production (medium): `s1.x2` - $140/month
- Production (large): `p1.x1` - $200/month

---

## What This Enables

### Job Matching
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

### Semantic Search
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

---

## Metadata Schema

### Recommended Metadata Structure

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

---

## Index Capacity

### Free Tier (Starter)
- **Vectors:** Up to 1M vectors
- **Storage:** ~6GB
- **Queries:** Unlimited
- **Cost:** Free

### Estimated Capacity for Your App

**Assuming:**
- Average job description: ~500 tokens
- Embedding size: 1536 dimensions (6KB per vector)
- Metadata: ~1KB per job

**You can store:**
- ~1,000,000 jobs in free tier
- More than enough for development and initial production

---

## Performance Optimization

### 1. Batch Upserts
```javascript
// Good: Batch upsert
await pinecone.upsert({
  vectors: [
    { id: 'job-1', values: [...], metadata: {...} },
    { id: 'job-2', values: [...], metadata: {...} },
    // ... up to 100 vectors
  ]
});

// Bad: Individual upserts
for (const job of jobs) {
  await pinecone.upsert({ id: job.id, values: [...] }); // Slow!
}
```

### 2. Use Metadata Filters
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

### 3. Cache Embeddings
```javascript
// Cache user profile embeddings in Redis
const cachedEmbedding = await redis.get(`user:${userId}:embedding`);
if (!cachedEmbedding) {
  const embedding = await generateEmbedding(userProfile);
  await redis.setex(`user:${userId}:embedding`, 3600, embedding);
}
```

---

## Testing Your Configuration

### 1. Test Connection
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

### 2. Test Upsert
```javascript
// Test script
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

console.log('✅ Test vector upserted successfully');
```

### 3. Test Query
```javascript
const results = await pinecone.query({
  vector: testVector,
  topK: 5,
  includeMetadata: true
});

console.log('✅ Query successful:', results.matches.length, 'matches');
```

---

## Migration Strategy

### Development → Production

**Option 1: Same Index (Recommended for small apps)**
- Use same index for dev and prod
- Filter by environment in metadata: `{ env: 'production' }`

**Option 2: Separate Indexes**
- Dev: `givemejobs-jobs-dev`
- Prod: `givemejobs-jobs-prod`
- Better isolation, costs more

---

## Cost Estimation

### Free Tier
- **Cost:** $0/month
- **Vectors:** 1M
- **Perfect for:** Development, MVP, small production

### When to Upgrade?
- More than 1M jobs
- Need higher performance
- Need more replicas for availability

### Production Costs
- **s1.x1:** $70/month (1M vectors, 1 pod)
- **s1.x2:** $140/month (2M vectors, 1 pod)
- **p1.x1:** $200/month (5M vectors, 1 pod, better performance)

---

## Common Mistakes to Avoid

### ❌ Wrong Dimensions
```javascript
// Wrong: Using 768 dimensions (BERT)
dimensions: 768  // Won't work with OpenAI embeddings!

// Correct: Using 1536 dimensions (OpenAI)
dimensions: 1536  // Matches text-embedding-ada-002
```

### ❌ Wrong Metric
```javascript
// Wrong: Using euclidean for text
metric: 'euclidean'  // Not optimal for semantic similarity

// Correct: Using cosine for text
metric: 'cosine'  // Best for semantic similarity
```

### ❌ Not Using Metadata
```javascript
// Bad: No metadata
await pinecone.upsert({
  id: 'job-1',
  values: embedding
});

// Good: Rich metadata
await pinecone.upsert({
  id: 'job-1',
  values: embedding,
  metadata: {
    title: 'Software Engineer',
    company: 'Tech Corp',
    active: true,
    postedAt: Date.now()
  }
});
```

---

## Quick Setup Checklist

- [ ] Create Pinecone account
- [ ] Create index with name: `givemejobs-jobs`
- [ ] Set dimensions: `1536`
- [ ] Set metric: `cosine`
- [ ] Set pod type: `s1.x1` (Starter)
- [ ] Copy API key
- [ ] Add to .env:
  ```env
  PINECONE_API_KEY=your-key
  PINECONE_INDEX_NAME=givemejobs-jobs
  ```
- [ ] Test: `npm run test:pinecone`
- [ ] Initialize: `npm run vector:init`

---

## Summary

### Best Configuration
```
Index Name: givemejobs-jobs
Dimensions: 1536
Metric: cosine
Pod Type: s1.x1 (Starter)
```

### Why?
- ✅ Matches OpenAI embeddings (1536 dimensions)
- ✅ Optimal for semantic search (cosine metric)
- ✅ Free tier (Starter pod)
- ✅ Scalable (can upgrade without recreating)

### Next Steps
1. Create index with these settings
2. Add API key to .env
3. Test: `npm run test:pinecone`
4. Initialize: `npm run vector:init`

---

**Create your index:** https://app.pinecone.io/

**Test configuration:** `npm run test:pinecone`
