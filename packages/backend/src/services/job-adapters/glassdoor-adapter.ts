import { Job, JobSearchQuery, RawJobData, RateLimitConfig } from '../../types/job.types';
import { BaseJobAdapter } from './base-adapter';
import { v4 as uuidv4 } from 'uuid';

export class GlassdoorAdapter extends BaseJobAdapter {
  name = 'glassdoor';

  constructor(apiKey?: string, rateLimitConfig?: RateLimitConfig) {
    super(apiKey, rateLimitConfig);
    this.initializeRateLimiter(rateLimitConfig);
  }

  async search(query: JobSearchQuery): Promise<Job[]> {
    return this.makeRequest(async () => {
      // In production, this would call the Glassdoor API
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
    const salary = this.parseSalary(rawJob.salary || rawJob.salaryRange);

    return {
      id: uuidv4(),
      externalId: rawJob.id,
      source: 'glassdoor',
      title: rawJob.title || rawJob.jobTitle,
      company: rawJob.company || rawJob.employer,
      location: rawJob.location || rawJob.city || 'Not specified',
      remoteType: this.determineRemoteType(rawJob),
      jobType: this.determineJobType(rawJob),
      salaryMin: salary.min,
      salaryMax: salary.max,
      description: rawJob.description || rawJob.jobDescription || '',
      requirements: this.extractArray(rawJob, 'requirements'),
      responsibilities: this.extractArray(rawJob, 'responsibilities'),
      benefits: this.extractArray(rawJob, 'benefits'),
      postedDate: this.parseDate(rawJob.postedDate || rawJob.posted),
      applyUrl: rawJob.url || rawJob.applyUrl || `https://www.glassdoor.com/job/${rawJob.id}`,
      companyLogo: rawJob.companyLogo || rawJob.employerLogo,
      industry: rawJob.industry || rawJob.sector,
      experienceLevel: rawJob.experienceLevel || rawJob.seniorityLevel,
    };
  }

  private determineRemoteType(rawJob: RawJobData): 'remote' | 'hybrid' | 'onsite' | undefined {
    const location = rawJob.location?.toLowerCase() || '';
    const workType = rawJob.workType?.toLowerCase() || '';
    
    if (location.includes('remote') || workType.includes('remote')) return 'remote';
    if (location.includes('hybrid') || workType.includes('hybrid')) return 'hybrid';
    return 'onsite';
  }

  private determineJobType(
    rawJob: RawJobData
  ): 'full-time' | 'part-time' | 'contract' | 'internship' | undefined {
    const employmentType = rawJob.employmentType?.toLowerCase() || '';
    const title = rawJob.title?.toLowerCase() || '';
    
    if (employmentType.includes('intern') || title.includes('intern')) return 'internship';
    if (employmentType.includes('contract') || employmentType.includes('contractor')) return 'contract';
    if (employmentType.includes('part-time') || employmentType.includes('part time')) return 'part-time';
    return 'full-time';
  }

  private generateMockJobs(query: JobSearchQuery): RawJobData[] {
    const keywords = query.keywords || 'engineer';
    const location = query.location || 'United States';
    
    return [
      {
        id: `gd-${Date.now()}-1`,
        title: `Lead ${keywords}`,
        company: 'Enterprise Corp',
        location: location,
        description: `Looking for an experienced ${keywords} to lead our team.`,
        salary: { min: 110000, max: 160000 },
        postedDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        url: 'https://www.glassdoor.com/job/xyz789',
        jobTitle: `Lead ${keywords}`,
        employer: 'Enterprise Corp',
        city: location,
        jobDescription: `Looking for an experienced ${keywords} to lead our team.`,
        salaryRange: { min: 110000, max: 160000 },
        posted: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        applyUrl: 'https://www.glassdoor.com/job/xyz789',
        employmentType: 'Full-time',
        workType: 'Hybrid',
        requirements: ['7+ years experience', 'Leadership skills', 'Technical expertise'],
        responsibilities: ['Lead team', 'Architecture decisions', 'Stakeholder management'],
        benefits: ['Competitive salary', 'Stock options', 'Health benefits'],
        seniorityLevel: 'Senior level',
        sector: 'Technology',
      },
      {
        id: `gd-${Date.now()}-2`,
        title: `${keywords} - Contract`,
        company: 'Consulting Group',
        location: 'Remote',
        description: `Contract ${keywords} position for 6-month project.`,
        salary: { min: 70, max: 100 },
        postedDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        url: 'https://www.glassdoor.com/job/uvw456',
        jobTitle: `${keywords} - Contract`,
        employer: 'Consulting Group',
        city: 'Remote',
        jobDescription: `Contract ${keywords} position for 6-month project.`,
        salaryRange: { min: 70, max: 100 },
        posted: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        applyUrl: 'https://www.glassdoor.com/job/uvw456',
        employmentType: 'Contract',
        workType: 'Remote',
        requirements: ['5+ years experience', 'Available immediately'],
        responsibilities: ['Project delivery', 'Client communication'],
        benefits: ['Flexible hours', 'Remote work'],
        seniorityLevel: 'Mid-Senior level',
        sector: 'Consulting',
      },
    ];
  }

  private generateMockJobDetails(externalId: string): RawJobData | null {
    return {
      id: externalId,
      title: 'Senior Engineer',
      company: 'Enterprise Corp',
      location: 'Boston, MA',
      description: 'Comprehensive job description with all requirements...',
      salary: { min: 120000, max: 150000 },
      postedDate: new Date().toISOString(),
      url: `https://www.glassdoor.com/job/${externalId}`,
      jobTitle: 'Senior Engineer',
      employer: 'Enterprise Corp',
      city: 'Boston, MA',
      jobDescription: 'Comprehensive job description with all requirements...',
      salaryRange: { min: 120000, max: 150000 },
      posted: new Date().toISOString(),
      applyUrl: `https://www.glassdoor.com/job/${externalId}`,
      employmentType: 'Full-time',
      workType: 'Hybrid',
      requirements: ['5+ years experience', 'Strong technical skills'],
      responsibilities: ['Lead projects', 'Mentor team'],
      benefits: ['Health insurance', 'Stock options'],
      seniorityLevel: 'Senior level',
      sector: 'Technology',
    };
  }
}
