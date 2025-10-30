import { Job, JobSearchQuery, RawJobData, RateLimitConfig } from '../../types/job.types';
import { BaseJobAdapter } from './base-adapter';
import { v4 as uuidv4 } from 'uuid';

export class LinkedInAdapter extends BaseJobAdapter {
  name = 'linkedin';

  constructor(apiKey?: string, rateLimitConfig?: RateLimitConfig) {
    super(apiKey, rateLimitConfig);
    this.initializeRateLimiter(rateLimitConfig);
  }

  async search(query: JobSearchQuery): Promise<Job[]> {
    return this.makeRequest(async () => {
      // In production, this would call the LinkedIn Jobs API
      // For now, we'll return mock data
      const mockJobs = this.generateMockJobs(query);
      return mockJobs.map((job) => this.normalizeJob(job));
    });
  }

  async getJobDetails(externalId: string): Promise<Job | null> {
    return this.makeRequest(async () => {
      // In production, this would fetch job details from LinkedIn API
      const mockJob = this.generateMockJobDetails(externalId);
      return mockJob ? this.normalizeJob(mockJob) : null;
    });
  }

  private normalizeJob(rawJob: RawJobData): Job {
    const salary = this.parseSalary(rawJob.salary);

    return {
      id: uuidv4(),
      externalId: rawJob.id,
      source: 'linkedin',
      title: rawJob.title,
      company: rawJob.company,
      location: rawJob.location || 'Remote',
      remoteType: this.determineRemoteType(rawJob.location),
      jobType: this.determineJobType(rawJob.title, rawJob.description),
      salaryMin: salary.min,
      salaryMax: salary.max,
      description: rawJob.description || '',
      requirements: this.extractArray(rawJob, 'requirements'),
      responsibilities: this.extractArray(rawJob, 'responsibilities'),
      benefits: this.extractArray(rawJob, 'benefits'),
      postedDate: this.parseDate(rawJob.postedDate),
      applicationDeadline: rawJob.applicationDeadline
        ? this.parseDate(rawJob.applicationDeadline)
        : undefined,
      applyUrl: rawJob.url || `https://www.linkedin.com/jobs/view/${rawJob.id}`,
      companyLogo: rawJob.companyLogo,
      industry: rawJob.industry,
      experienceLevel: rawJob.experienceLevel || 'Mid-Senior level',
    };
  }

  private determineRemoteType(location?: string): 'remote' | 'hybrid' | 'onsite' | undefined {
    if (!location) return undefined;
    
    const locationLower = location.toLowerCase();
    if (locationLower.includes('remote')) return 'remote';
    if (locationLower.includes('hybrid')) return 'hybrid';
    return 'onsite';
  }

  private determineJobType(
    title: string,
    description?: string
  ): 'full-time' | 'part-time' | 'contract' | 'internship' | undefined {
    const text = `${title} ${description || ''}`.toLowerCase();
    
    if (text.includes('intern')) return 'internship';
    if (text.includes('contract') || text.includes('freelance')) return 'contract';
    if (text.includes('part-time') || text.includes('part time')) return 'part-time';
    return 'full-time';
  }

  // Mock data generators (to be replaced with actual API calls)
  private generateMockJobs(query: JobSearchQuery): RawJobData[] {
    const keywords = query.keywords || 'software engineer';
    const location = query.location || 'United States';
    
    return [
      {
        id: `li-${Date.now()}-1`,
        title: `Senior ${keywords}`,
        company: 'Tech Corp',
        location: location,
        description: `We are looking for a ${keywords} to join our team.`,
        salary: { min: 100000, max: 150000 },
        postedDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        url: 'https://www.linkedin.com/jobs/view/123',
        requirements: ['5+ years experience', 'Bachelor degree', 'Strong communication'],
        responsibilities: ['Lead development', 'Mentor team', 'Code review'],
        benefits: ['Health insurance', '401k', 'Remote work'],
        experienceLevel: 'Senior level',
        industry: 'Technology',
      },
      {
        id: `li-${Date.now()}-2`,
        title: `${keywords} - Remote`,
        company: 'Innovation Labs',
        location: 'Remote',
        description: `Remote ${keywords} position with competitive salary.`,
        salary: { min: 90000, max: 130000 },
        postedDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        url: 'https://www.linkedin.com/jobs/view/124',
        requirements: ['3+ years experience', 'Remote work experience'],
        responsibilities: ['Build features', 'Collaborate with team'],
        benefits: ['Flexible hours', 'Health insurance'],
        experienceLevel: 'Mid-Senior level',
        industry: 'Technology',
      },
    ];
  }

  private generateMockJobDetails(externalId: string): RawJobData | null {
    return {
      id: externalId,
      title: 'Senior Software Engineer',
      company: 'Tech Corp',
      location: 'San Francisco, CA',
      description: 'Detailed job description here...',
      salary: { min: 120000, max: 160000 },
      postedDate: new Date().toISOString(),
      url: `https://www.linkedin.com/jobs/view/${externalId}`,
      requirements: ['5+ years experience', 'Bachelor degree'],
      responsibilities: ['Lead development', 'Mentor team'],
      benefits: ['Health insurance', '401k'],
      experienceLevel: 'Senior level',
      industry: 'Technology',
    };
  }
}
