import axios from 'axios';
import { Job, JobSearchQuery, RateLimitConfig } from '../../types/job.types';
import { BaseJobAdapter } from './base-adapter';
import { v4 as uuidv4 } from 'uuid';

export class AdzunaAdapter extends BaseJobAdapter {
  name = 'adzuna';
  private appId: string;
  private appKey: string;
  private baseUrl = 'https://api.adzuna.com/v1/api/jobs';
  private country = 'us'; // Default to US, can be made configurable

  constructor(appId?: string, appKey?: string, rateLimitConfig?: RateLimitConfig) {
    super(appKey, rateLimitConfig);
    // Only use env vars if no value is provided (not even empty string)
    this.appId = appId !== undefined ? appId : (process.env.ADZUNA_APP_ID || '');
    this.appKey = appKey !== undefined ? appKey : (process.env.ADZUNA_APP_KEY || '');
    this.initializeRateLimiter(rateLimitConfig);
  }

  async search(query: JobSearchQuery): Promise<Job[]> {
    return this.makeRequest(async () => {
      if (!this.appId || !this.appKey) {
        console.warn('Adzuna credentials not configured, skipping Adzuna search');
        return [];
      }

      try {
        const page = query.page || 1;
        const response = await axios.get(
          `${this.baseUrl}/${this.country}/search/${page}`,
          {
            params: {
              app_id: this.appId,
              app_key: this.appKey,
              what: query.keywords,
              where: query.location,
              results_per_page: query.limit || 20,
              sort_by: 'date',
              max_days_old: query.datePosted === 'week' ? 7 : query.datePosted === 'month' ? 30 : undefined,
            },
            timeout: 10000, // 10 second timeout
          }
        );

        const jobs = response.data.results || [];
        console.log(`Adzuna API: Found ${jobs.length} jobs for "${query.keywords}"`);
        
        return jobs.map((job: any) => this.normalizeAdzunaJob(job));
      } catch (error: any) {
        if (error.response) {
          console.error('Adzuna API error:', error.response.status, error.response.data);
        } else {
          console.error('Adzuna API error:', error.message);
        }
        return [];
      }
    });
  }

  async getJobDetails(externalId: string): Promise<Job | null> {
    return this.makeRequest(async () => {
      if (!this.appId || !this.appKey) {
        console.warn('Adzuna credentials not configured');
        return null;
      }

      try {
        // Adzuna doesn't have a direct job details endpoint
        // We would need to search and find the specific job
        // For now, return null and rely on cached data
        return null;
      } catch (error) {
        console.error('Adzuna getJobDetails error:', error);
        return null;
      }
    });
  }

  private normalizeAdzunaJob(apiJob: any): Job {
    const salary = this.extractSalary(apiJob);
    
    return {
      id: uuidv4(),
      externalId: apiJob.id,
      source: 'adzuna',
      title: apiJob.title,
      company: apiJob.company?.display_name || 'Company Not Listed',
      location: apiJob.location?.display_name || 'Location Not Specified',
      remoteType: this.determineRemoteType(apiJob),
      jobType: this.determineJobType(apiJob),
      salaryMin: salary.min,
      salaryMax: salary.max,
      description: this.cleanDescription(apiJob.description),
      requirements: this.extractRequirements(apiJob.description),
      responsibilities: [],
      benefits: [],
      postedDate: new Date(apiJob.created),
      applyUrl: apiJob.redirect_url,
      companyLogo: undefined,
      industry: apiJob.category?.label,
      experienceLevel: this.determineExperienceLevel(apiJob),
    };
  }

  private extractSalary(apiJob: any): { min?: number; max?: number } {
    return {
      min: apiJob.salary_min ? Math.round(apiJob.salary_min) : undefined,
      max: apiJob.salary_max ? Math.round(apiJob.salary_max) : undefined,
    };
  }

  private cleanDescription(description: string): string {
    if (!description) return '';
    
    // Remove HTML tags
    let cleaned = description.replace(/<[^>]*>/g, '');
    
    // Decode HTML entities
    cleaned = cleaned
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
    
    // Remove excessive whitespace
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    
    return cleaned;
  }

  private extractRequirements(description: string): string[] {
    if (!description) return [];
    
    const requirements: string[] = [];
    const lowerDesc = description.toLowerCase();
    
    // Look for common requirement patterns
    const patterns = [
      /(?:requirements?|qualifications?|skills?)[:\s]*([^.]+)/gi,
      /(?:must have|required)[:\s]*([^.]+)/gi,
      /(?:\d+\+?\s*years?)[^.]+/gi,
    ];
    
    patterns.forEach(pattern => {
      const matches = description.match(pattern);
      if (matches) {
        matches.forEach(match => {
          const cleaned = this.cleanDescription(match).substring(0, 200);
          if (cleaned.length > 10 && !requirements.includes(cleaned)) {
            requirements.push(cleaned);
          }
        });
      }
    });
    
    return requirements.slice(0, 5); // Limit to 5 requirements
  }

  private determineRemoteType(apiJob: any): 'remote' | 'hybrid' | 'onsite' | undefined {
    const title = apiJob.title?.toLowerCase() || '';
    const description = apiJob.description?.toLowerCase() || '';
    const location = apiJob.location?.display_name?.toLowerCase() || '';
    
    if (title.includes('remote') || description.includes('remote') || location.includes('remote')) {
      return 'remote';
    }
    if (title.includes('hybrid') || description.includes('hybrid')) {
      return 'hybrid';
    }
    return 'onsite';
  }

  private determineJobType(apiJob: any): 'full-time' | 'part-time' | 'contract' | 'internship' | undefined {
    const contractType = apiJob.contract_type?.toLowerCase() || '';
    const contractTime = apiJob.contract_time?.toLowerCase() || '';
    const title = apiJob.title?.toLowerCase() || '';
    
    if (title.includes('intern')) return 'internship';
    if (contractType.includes('contract') || contractType.includes('temporary')) return 'contract';
    if (contractTime.includes('part')) return 'part-time';
    if (contractType.includes('permanent') || contractTime.includes('full')) return 'full-time';
    
    return 'full-time'; // Default
  }

  private determineExperienceLevel(apiJob: any): string | undefined {
    const title = apiJob.title?.toLowerCase() || '';
    const description = apiJob.description?.toLowerCase() || '';
    
    if (title.includes('senior') || title.includes('lead') || title.includes('principal')) {
      return 'senior';
    }
    if (title.includes('junior') || title.includes('entry') || title.includes('intern')) {
      return 'entry';
    }
    if (description.includes('5+ years') || description.includes('5 years')) {
      return 'senior';
    }
    if (description.includes('0-2 years') || description.includes('entry level')) {
      return 'entry';
    }
    
    return 'mid';
  }
}
