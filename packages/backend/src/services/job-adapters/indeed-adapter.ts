import { Job, JobSearchQuery, RawJobData, RateLimitConfig } from '../../types/job.types';
import { BaseJobAdapter } from './base-adapter';
import { v4 as uuidv4 } from 'uuid';

export class IndeedAdapter extends BaseJobAdapter {
  name = 'indeed';

  constructor(apiKey?: string, rateLimitConfig?: RateLimitConfig) {
    super(apiKey, rateLimitConfig);
    this.initializeRateLimiter(rateLimitConfig);
  }

  async search(query: JobSearchQuery): Promise<Job[]> {
    return this.makeRequest(async () => {
      // In production, this would call the Indeed API
      const mockJobs = this.generateMockJobs(query);
      return mockJobs.map((job) => this.normalizeJob(job));
    });
  }

  async getJobDetails(externalId: string): Promise<Job | null> {
    return this.makeRequest(async () => {
      const mockJob = this.generateMockJobDetails(externalId);
      return mockJob ? this.normalizeJob(mockJob) : null;
    });
  }

  private normalizeJob(rawJob: RawJobData): Job {
    const salary = this.parseSalary(rawJob.salary);

    return {
      id: uuidv4(),
      externalId: rawJob.id,
      source: 'indeed',
      title: rawJob.title,
      company: rawJob.company,
      location: rawJob.location || 'Not specified',
      remoteType: this.determineRemoteType(rawJob),
      jobType: this.determineJobType(rawJob),
      salaryMin: salary.min,
      salaryMax: salary.max,
      description: rawJob.description || rawJob.snippet || '',
      requirements: this.extractArray(rawJob, 'requirements'),
      responsibilities: this.extractArray(rawJob, 'responsibilities'),
      benefits: this.extractArray(rawJob, 'benefits'),
      postedDate: this.parseDate(rawJob.postedDate || rawJob.date),
      applyUrl: rawJob.url || `https://www.indeed.com/viewjob?jk=${rawJob.id}`,
      companyLogo: rawJob.companyLogo,
      industry: rawJob.industry,
      experienceLevel: rawJob.experienceLevel,
    };
  }

  private determineRemoteType(rawJob: RawJobData): 'remote' | 'hybrid' | 'onsite' | undefined {
    const location = rawJob.location?.toLowerCase() || '';
    const description = rawJob.description?.toLowerCase() || '';
    
    if (location.includes('remote') || description.includes('remote')) return 'remote';
    if (location.includes('hybrid') || description.includes('hybrid')) return 'hybrid';
    return 'onsite';
  }

  private determineJobType(
    rawJob: RawJobData
  ): 'full-time' | 'part-time' | 'contract' | 'internship' | undefined {
    const jobType = rawJob.jobType?.toLowerCase() || '';
    const title = rawJob.title?.toLowerCase() || '';
    
    if (jobType.includes('intern') || title.includes('intern')) return 'internship';
    if (jobType.includes('contract') || jobType.includes('temporary')) return 'contract';
    if (jobType.includes('part-time') || jobType.includes('part time')) return 'part-time';
    return 'full-time';
  }

  private generateMockJobs(query: JobSearchQuery): RawJobData[] {
    const keywords = query.keywords || 'developer';
    const location = query.location || 'United States';
    
    return [
      {
        id: `ind-${Date.now()}-1`,
        title: `${keywords} Position`,
        company: 'Global Solutions Inc',
        location: location,
        snippet: `Exciting opportunity for a ${keywords}. Join our growing team!`,
        description: `We are seeking a talented ${keywords} to work on innovative projects.`,
        salary: '$80,000 - $120,000 a year',
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        url: 'https://www.indeed.com/viewjob?jk=abc123',
        jobType: 'Full-time',
        requirements: ['2+ years experience', 'Strong problem-solving skills'],
        responsibilities: ['Develop software', 'Collaborate with team'],
        benefits: ['Health insurance', 'Paid time off'],
      },
      {
        id: `ind-${Date.now()}-2`,
        title: `Junior ${keywords}`,
        company: 'StartUp Ventures',
        location: 'Remote',
        snippet: `Entry-level ${keywords} role with growth potential.`,
        description: `Great opportunity for recent graduates or career changers.`,
        salary: '$60,000 - $80,000 a year',
        date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        url: 'https://www.indeed.com/viewjob?jk=def456',
        jobType: 'Full-time',
        requirements: ['Bachelor degree or equivalent', 'Passion for technology'],
        responsibilities: ['Write code', 'Learn from senior developers'],
        benefits: ['Flexible schedule', 'Learning budget'],
      },
    ];
  }

  private generateMockJobDetails(externalId: string): RawJobData | null {
    return {
      id: externalId,
      title: 'Software Developer',
      company: 'Global Solutions Inc',
      location: 'New York, NY',
      description: 'Full job description with all details...',
      salary: '$90,000 - $110,000 a year',
      date: new Date().toISOString(),
      url: `https://www.indeed.com/viewjob?jk=${externalId}`,
      jobType: 'Full-time',
      requirements: ['3+ years experience', 'Bachelor degree'],
      responsibilities: ['Develop features', 'Code review'],
      benefits: ['Health insurance', '401k'],
    };
  }
}
