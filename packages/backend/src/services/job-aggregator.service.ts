import { Job, JobSearchQuery } from '../types/job.types';
import { LinkedInAdapter, IndeedAdapter, GlassdoorAdapter, AdzunaAdapter } from './job-adapters';

export class JobAggregatorService {
  private adapters: Array<LinkedInAdapter | IndeedAdapter | GlassdoorAdapter | AdzunaAdapter>;

  constructor() {
    // Initialize adapters with API keys from environment variables
    this.adapters = [
      new LinkedInAdapter(process.env.LINKEDIN_API_KEY),
      new IndeedAdapter(process.env.INDEED_API_KEY),
      new GlassdoorAdapter(process.env.GLASSDOOR_API_KEY),
      new AdzunaAdapter(process.env.ADZUNA_APP_ID, process.env.ADZUNA_APP_KEY),
    ];
  }

  async searchJobs(query: JobSearchQuery): Promise<Job[]> {
    // Search across all job boards in parallel
    const searchPromises = this.adapters.map((adapter) =>
      adapter.search(query).catch((error) => {
        console.error(`Error searching ${adapter.name}:`, error.message);
        return []; // Return empty array on error to not break the entire search
      })
    );

    const results = await Promise.all(searchPromises);
    
    // Flatten results from all sources
    const allJobs = results.flat();

    // Deduplicate jobs
    const deduplicatedJobs = this.deduplicateJobs(allJobs);

    // Sort by posted date (newest first)
    return deduplicatedJobs.sort(
      (a, b) => b.postedDate.getTime() - a.postedDate.getTime()
    );
  }

  async getJobDetails(source: string, externalId: string): Promise<Job | null> {
    const adapter = this.adapters.find((a) => a.name === source);
    
    if (!adapter) {
      throw new Error(`Unknown job source: ${source}`);
    }

    return adapter.getJobDetails(externalId);
  }

  private deduplicateJobs(jobs: Job[]): Job[] {
    const seen = new Map<string, Job>();

    for (const job of jobs) {
      const key = this.generateDeduplicationKey(job);
      
      if (!seen.has(key)) {
        seen.set(key, job);
      } else {
        // If duplicate found, keep the one with more complete data
        const existing = seen.get(key)!;
        if (this.isMoreComplete(job, existing)) {
          seen.set(key, job);
        }
      }
    }

    return Array.from(seen.values());
  }

  private generateDeduplicationKey(job: Job): string {
    // Normalize strings for comparison
    const normalizedTitle = this.normalizeString(job.title);
    const normalizedCompany = this.normalizeString(job.company);
    const normalizedLocation = this.normalizeString(job.location);

    // Create a composite key
    return `${normalizedTitle}|${normalizedCompany}|${normalizedLocation}`;
  }

  private normalizeString(str: string): string {
    return str
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, '') // Remove special characters
      .replace(/\s+/g, ' '); // Normalize whitespace
  }

  private isMoreComplete(job1: Job, job2: Job): boolean {
    // Count non-empty fields
    const score1 = this.calculateCompletenessScore(job1);
    const score2 = this.calculateCompletenessScore(job2);
    
    return score1 > score2;
  }

  private calculateCompletenessScore(job: Job): number {
    let score = 0;

    // Add points for each filled field
    if (job.description && job.description.length > 50) score += 3;
    if (job.requirements && job.requirements.length > 0) score += 2;
    if (job.responsibilities && job.responsibilities.length > 0) score += 2;
    if (job.benefits && job.benefits.length > 0) score += 1;
    if (job.salaryMin && job.salaryMax) score += 2;
    if (job.remoteType) score += 1;
    if (job.jobType) score += 1;
    if (job.companyLogo) score += 1;
    if (job.industry) score += 1;
    if (job.experienceLevel) score += 1;

    return score;
  }

  // Normalize job data to ensure consistency
  normalizeJob(job: Job): Job {
    return {
      ...job,
      title: this.capitalizeWords(job.title),
      company: this.capitalizeWords(job.company),
      location: this.normalizeLocation(job.location),
      description: job.description.trim(),
      requirements: job.requirements.map((r) => r.trim()).filter((r) => r.length > 0),
      responsibilities: job.responsibilities.map((r) => r.trim()).filter((r) => r.length > 0),
      benefits: job.benefits.map((b) => b.trim()).filter((b) => b.length > 0),
    };
  }

  private capitalizeWords(str: string): string {
    return str
      .split(' ')
      .map((word) => {
        // Don't capitalize certain words unless they're the first word
        const lowerCaseWords = ['and', 'or', 'the', 'a', 'an', 'in', 'on', 'at', 'to', 'for'];
        if (lowerCaseWords.includes(word.toLowerCase())) {
          return word.toLowerCase();
        }
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(' ');
  }

  private normalizeLocation(location: string): string {
    // Remove extra whitespace
    let normalized = location.trim().replace(/\s+/g, ' ');

    // Standardize common abbreviations
    const abbreviations: Record<string, string> = {
      'NY': 'New York',
      'CA': 'California',
      'TX': 'Texas',
      'FL': 'Florida',
      'IL': 'Illinois',
      'PA': 'Pennsylvania',
      'OH': 'Ohio',
      'GA': 'Georgia',
      'NC': 'North Carolina',
      'MI': 'Michigan',
    };

    // Replace state abbreviations
    Object.entries(abbreviations).forEach(([abbr, full]) => {
      const regex = new RegExp(`\\b${abbr}\\b`, 'gi');
      normalized = normalized.replace(regex, full);
    });

    return normalized;
  }
}

export const jobAggregatorService = new JobAggregatorService();
