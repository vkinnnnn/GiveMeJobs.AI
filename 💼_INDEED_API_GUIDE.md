# 💼 Indeed API - Complete Guide

## 📋 Overview

Indeed is one of the largest job search platforms globally. Their API allows you to programmatically search for jobs and integrate job listings into your application.

**Current Status in Your Project:** ⚪ Not configured (optional)

---

## 🚨 Important Reality Check

### The Bad News
Indeed's official **Publisher API has been discontinued** as of 2021. They no longer offer public API access for new applications.

### The Good News
You have several alternatives:

1. **Indeed Job Search Scraper APIs** (Third-party)
2. **RapidAPI Indeed alternatives**
3. **Other job board APIs** (easier to access)
4. **Manual job posting** (users add jobs themselves)

---

## 🔄 Alternative Solutions

### Option 1: RapidAPI - Indeed Job Search (Recommended)

**Provider:** Third-party scraper via RapidAPI  
**Cost:** Free tier available (100 requests/month)  
**Reliability:** Good  
**Setup Time:** 5 minutes

#### Setup Steps:

1. **Sign up for RapidAPI**
   - Visit: https://rapidapi.com/
   - Create free account

2. **Subscribe to Indeed Job Search API**
   - Search for "Indeed Job Search" on RapidAPI
   - Popular options:
     - "JSearch" by OpenWeb Ninja (covers Indeed + others)
     - "Indeed Jobs API" by various providers
   - Subscribe to free tier

3. **Get Your API Key**
   - Go to your RapidAPI dashboard
   - Copy your `X-RapidAPI-Key`

4. **Update Your Code**

```typescript
// packages/backend/src/services/job-adapters/indeed-adapter.ts

import axios from 'axios';

export class IndeedAdapter extends BaseJobAdapter {
  name = 'indeed';
  private rapidApiKey: string;
  private rapidApiHost: string = 'jsearch.p.rapidapi.com'; // or your chosen API

  constructor(apiKey?: string, rateLimitConfig?: RateLimitConfig) {
    super(apiKey, rateLimitConfig);
    this.rapidApiKey = apiKey || process.env.RAPIDAPI_KEY || '';
    this.initializeRateLimiter(rateLimitConfig);
  }

  async search(query: JobSearchQuery): Promise<Job[]> {
    return this.makeRequest(async () => {
      if (!this.rapidApiKey) {
        console.warn('RapidAPI key not configured, using mock data');
        return this.generateMockJobs(query).map(job => this.normalizeJob(job));
      }

      try {
        const response = await axios.get('https://jsearch.p.rapidapi.com/search', {
          params: {
            query: `${query.keywords} in ${query.location || 'United States'}`,
            page: query.page || 1,
            num_pages: 1,
            date_posted: query.datePosted || 'all',
            remote_jobs_only: query.remoteOnly || false,
            employment_types: query.jobType || undefined,
          },
          headers: {
            'X-RapidAPI-Key': this.rapidApiKey,
            'X-RapidAPI-Host': this.rapidApiHost,
          },
        });

        const jobs = response.data.data || [];
        return jobs.map((job: any) => this.normalizeJob(this.convertToRawJobData(job)));
      } catch (error) {
        console.error('Indeed API error:', error);
        // Fallback to mock data
        return this.generateMockJobs(query).map(job => this.normalizeJob(job));
      }
    });
  }

  private convertToRawJobData(apiJob: any): RawJobData {
    return {
      id: apiJob.job_id,
      title: apiJob.job_title,
      company: apiJob.employer_name,
      location: `${apiJob.job_city}, ${apiJob.job_state}`,
      description: apiJob.job_description,
      snippet: apiJob.job_highlights?.Qualifications?.[0] || '',
      salary: this.formatSalary(apiJob),
      date: apiJob.job_posted_at_datetime_utc,
      url: apiJob.job_apply_link,
      jobType: apiJob.job_employment_type,
      requirements: apiJob.job_highlights?.Qualifications || [],
      responsibilities: apiJob.job_highlights?.Responsibilities || [],
      benefits: apiJob.job_highlights?.Benefits || [],
      companyLogo: apiJob.employer_logo,
      industry: apiJob.job_category,
      experienceLevel: this.determineExperienceLevel(apiJob),
    };
  }

  private formatSalary(apiJob: any): string | undefined {
    if (apiJob.job_min_salary && apiJob.job_max_salary) {
      return `$${apiJob.job_min_salary.toLocaleString()} - $${apiJob.job_max_salary.toLocaleString()} ${apiJob.job_salary_period || 'a year'}`;
    }
    return undefined;
  }

  private determineExperienceLevel(apiJob: any): string | undefined {
    const title = apiJob.job_title?.toLowerCase() || '';
    if (title.includes('senior') || title.includes('lead')) return 'senior';
    if (title.includes('junior') || title.includes('entry')) return 'entry';
    return 'mid';
  }
}
```

5. **Update .env**
```env
# RapidAPI for Indeed Job Search
RAPIDAPI_KEY=your-rapidapi-key-here
INDEED_API_KEY=your-rapidapi-key-here  # Reuse the same key
```

---

### Option 2: JSearch API (Multi-Source)

**Provider:** OpenWeb Ninja via RapidAPI  
**Sources:** Indeed, LinkedIn, Glassdoor, ZipRecruiter, Google Jobs  
**Cost:** Free tier: 100 requests/month, Paid: $10/month for 1000 requests  
**Best for:** Getting jobs from multiple sources with one API

#### Why JSearch?
- Aggregates from multiple job boards including Indeed
- Single API for all sources
- Better data quality
- More reliable than single-source scrapers

#### Setup:
1. Go to: https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch
2. Subscribe to free tier
3. Use the code example above (it's already compatible!)

---

### Option 3: Adzuna API (Official & Free)

**Provider:** Adzuna (official API)  
**Cost:** Free tier available  
**Reliability:** Excellent (official API)  
**Coverage:** US, UK, and 20+ countries

#### Why Adzuna?
- Official API (not a scraper)
- Free tier available
- Good documentation
- Reliable and legal

#### Setup:

1. **Sign up**
   - Visit: https://developer.adzuna.com/
   - Create account
   - Get API ID and API Key

2. **Implementation**

```typescript
// Create new file: packages/backend/src/services/job-adapters/adzuna-adapter.ts

import axios from 'axios';
import { Job, JobSearchQuery, RawJobData, RateLimitConfig } from '../../types/job.types';
import { BaseJobAdapter } from './base-adapter';
import { v4 as uuidv4 } from 'uuid';

export class AdzunaAdapter extends BaseJobAdapter {
  name = 'adzuna';
  private appId: string;
  private appKey: string;
  private baseUrl = 'https://api.adzuna.com/v1/api/jobs';

  constructor(appId?: string, appKey?: string, rateLimitConfig?: RateLimitConfig) {
    super(appKey, rateLimitConfig);
    this.appId = appId || process.env.ADZUNA_APP_ID || '';
    this.appKey = appKey || process.env.ADZUNA_APP_KEY || '';
    this.initializeRateLimiter(rateLimitConfig);
  }

  async search(query: JobSearchQuery): Promise<Job[]> {
    return this.makeRequest(async () => {
      if (!this.appId || !this.appKey) {
        console.warn('Adzuna credentials not configured');
        return [];
      }

      try {
        const country = 'us'; // or make this configurable
        const response = await axios.get(
          `${this.baseUrl}/${country}/search/${query.page || 1}`,
          {
            params: {
              app_id: this.appId,
              app_key: this.appKey,
              what: query.keywords,
              where: query.location,
              results_per_page: query.limit || 20,
              sort_by: 'date',
            },
          }
        );

        const jobs = response.data.results || [];
        return jobs.map((job: any) => this.normalizeAdzunaJob(job));
      } catch (error) {
        console.error('Adzuna API error:', error);
        return [];
      }
    });
  }

  private normalizeAdzunaJob(apiJob: any): Job {
    return {
      id: uuidv4(),
      externalId: apiJob.id,
      source: 'adzuna',
      title: apiJob.title,
      company: apiJob.company.display_name,
      location: apiJob.location.display_name,
      remoteType: this.determineRemoteType(apiJob),
      jobType: this.determineJobType(apiJob),
      salaryMin: apiJob.salary_min,
      salaryMax: apiJob.salary_max,
      description: apiJob.description,
      requirements: [],
      responsibilities: [],
      benefits: [],
      postedDate: new Date(apiJob.created),
      applyUrl: apiJob.redirect_url,
      companyLogo: undefined,
      industry: apiJob.category.label,
      experienceLevel: undefined,
    };
  }

  private determineRemoteType(apiJob: any): 'remote' | 'hybrid' | 'onsite' | undefined {
    const title = apiJob.title?.toLowerCase() || '';
    const description = apiJob.description?.toLowerCase() || '';
    
    if (title.includes('remote') || description.includes('remote')) return 'remote';
    if (title.includes('hybrid') || description.includes('hybrid')) return 'hybrid';
    return 'onsite';
  }

  private determineJobType(apiJob: any): 'full-time' | 'part-time' | 'contract' | 'internship' | undefined {
    const contract = apiJob.contract_type?.toLowerCase() || '';
    
    if (contract.includes('permanent') || contract.includes('full')) return 'full-time';
    if (contract.includes('part')) return 'part-time';
    if (contract.includes('contract')) return 'contract';
    return 'full-time';
  }
}
```

3. **Update .env**
```env
# Adzuna API
ADZUNA_APP_ID=your-app-id
ADZUNA_APP_KEY=your-app-key
```

4. **Register the adapter**
```typescript
// packages/backend/src/services/job-adapters/index.ts
export { AdzunaAdapter } from './adzuna-adapter';

// packages/backend/src/services/job-aggregator.service.ts
import { AdzunaAdapter } from './job-adapters';

// In constructor:
this.adapters.set('adzuna', new AdzunaAdapter(
  process.env.ADZUNA_APP_ID,
  process.env.ADZUNA_APP_KEY,
  rateLimitConfig
));
```

---

### Option 4: Keep Mock Data (Simplest)

**Best for:** MVP, testing, demo  
**Cost:** Free  
**Setup:** Already done!

Your current implementation already has mock data that works perfectly for:
- Development and testing
- Demo purposes
- MVP launch (users can manually add jobs)

**When to use:**
- You're building an MVP
- You want to focus on core features first
- You'll add real job data later
- Users will manually post jobs

---

## 🎯 Recommendation

### For Your Project (GiveMeJobs):

**Phase 1 - MVP (Now):**
- ✅ Keep mock data
- ✅ Allow users to manually add jobs
- ✅ Focus on core features (matching, applications, AI)

**Phase 2 - Beta (Later):**
- 🔄 Add Adzuna API (official, free, reliable)
- 🔄 Or add JSearch API (multi-source)

**Phase 3 - Production (Future):**
- 🚀 Add multiple sources
- 🚀 Implement job deduplication
- 🚀 Add premium job board partnerships

---

## 📊 Comparison Table

| Solution | Cost | Reliability | Setup Time | Legal | Coverage |
|----------|------|-------------|------------|-------|----------|
| **Mock Data** | Free | 100% | Done ✅ | ✅ Yes | N/A |
| **Adzuna API** | Free tier | High | 15 min | ✅ Official | 20+ countries |
| **JSearch (RapidAPI)** | $0-10/mo | Medium | 10 min | ⚠️ Scraper | Multi-source |
| **Indeed Scraper** | $0-20/mo | Medium | 15 min | ⚠️ Scraper | Indeed only |
| **Manual Posting** | Free | High | Done ✅ | ✅ Yes | User-generated |

---

## 🔧 Implementation Steps (If You Want Real Data Now)

### Quick Start with Adzuna (Recommended):

1. **Sign up** (2 minutes)
   ```bash
   # Visit https://developer.adzuna.com/
   # Create account, get API ID and Key
   ```

2. **Update .env** (1 minute)
   ```env
   ADZUNA_APP_ID=your-app-id
   ADZUNA_APP_KEY=your-app-key
   ```

3. **Create adapter** (5 minutes)
   - Copy the Adzuna adapter code above
   - Save to `packages/backend/src/services/job-adapters/adzuna-adapter.ts`

4. **Register adapter** (2 minutes)
   - Update `index.ts` to export it
   - Update `job-aggregator.service.ts` to use it

5. **Test** (2 minutes)
   ```bash
   cd packages/backend
   npm run test:services
   ```

---

## 🧪 Testing Your Implementation

### Test Mock Data (Current)
```bash
cd packages/backend
npm run test:services
```

### Test Real API (After Setup)
```typescript
// Create test file: packages/backend/src/__tests__/adzuna.test.ts

import { AdzunaAdapter } from '../services/job-adapters/adzuna-adapter';

describe('Adzuna API Integration', () => {
  it('should fetch real jobs', async () => {
    const adapter = new AdzunaAdapter(
      process.env.ADZUNA_APP_ID,
      process.env.ADZUNA_APP_KEY
    );

    const jobs = await adapter.search({
      keywords: 'software developer',
      location: 'New York',
      limit: 5,
    });

    console.log(`Found ${jobs.length} jobs`);
    console.log('First job:', jobs[0]);

    expect(jobs.length).toBeGreaterThan(0);
    expect(jobs[0]).toHaveProperty('title');
    expect(jobs[0]).toHaveProperty('company');
  });
});
```

Run test:
```bash
npm test -- adzuna.test.ts
```

---

## 📝 Current Implementation Status

### What You Have Now:
✅ Mock Indeed adapter (working)  
✅ Proper data normalization  
✅ Rate limiting support  
✅ Error handling  
✅ Fallback to mock data  

### What's Missing:
⚪ Real API integration  
⚪ API credentials  

### What Works Without Real API:
✅ All core features  
✅ Job matching  
✅ Application tracking  
✅ AI features  
✅ User can manually add jobs  

---

## 💡 Pro Tips

1. **Start with mock data** - Your current setup is perfect for MVP
2. **Add Adzuna first** - It's official, free, and reliable
3. **Use JSearch for multi-source** - Get Indeed + LinkedIn + others with one API
4. **Implement caching** - Cache job results to reduce API calls
5. **Add job deduplication** - Same job might appear from multiple sources
6. **Monitor API usage** - Set up alerts for rate limits
7. **Have fallbacks** - Always fall back to mock/cached data if API fails

---

## 🚀 Next Steps

### Option A: Keep Mock Data (Recommended for Now)
```bash
# Nothing to do! You're ready to develop
cd packages/backend
npm run dev
```

### Option B: Add Real Data (Adzuna)
```bash
# 1. Sign up at https://developer.adzuna.com/
# 2. Get API credentials
# 3. Add to .env
# 4. Create adapter (code provided above)
# 5. Test it
```

### Option C: Add Multi-Source (JSearch)
```bash
# 1. Sign up at https://rapidapi.com/
# 2. Subscribe to JSearch API
# 3. Get RapidAPI key
# 4. Update Indeed adapter (code provided above)
# 5. Test it
```

---

## 📚 Additional Resources

- **Adzuna API Docs:** https://developer.adzuna.com/docs
- **JSearch API:** https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch
- **RapidAPI Hub:** https://rapidapi.com/hub
- **Your Current Implementation:** `packages/backend/src/services/job-adapters/indeed-adapter.ts`

---

## ❓ FAQ

**Q: Do I need Indeed API for my MVP?**  
A: No! Your mock data works perfectly. Add real data later.

**Q: Is web scraping Indeed legal?**  
A: Gray area. Use official APIs (like Adzuna) or third-party services (like JSearch) that handle compliance.

**Q: What's the best free option?**  
A: Adzuna API - official, free tier, reliable.

**Q: Can I use multiple job sources?**  
A: Yes! Your adapter pattern supports multiple sources. Add Adzuna, JSearch, etc.

**Q: How many API calls do I need?**  
A: Depends on traffic. Start with free tiers (100-1000 requests/month), upgrade as needed.

**Q: What if API goes down?**  
A: Your code already has fallbacks to mock data. Always works!

---

## ✅ Summary

**Current Status:** Mock data (perfect for development)  
**Best Next Step:** Add Adzuna API (official, free, 15 min setup)  
**Alternative:** JSearch API (multi-source, $10/month)  
**For MVP:** Keep mock data, add real data later  

**Your platform works great without Indeed API!** Focus on core features first, add job aggregation later when you have users.

Need help implementing any of these options? Just ask! 🚀
