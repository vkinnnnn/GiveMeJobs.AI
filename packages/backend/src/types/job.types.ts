export interface Job {
  id: string;
  externalId: string;
  source: 'linkedin' | 'indeed' | 'glassdoor' | 'ziprecruiter' | 'adzuna';
  title: string;
  company: string;
  location: string;
  remoteType?: 'remote' | 'hybrid' | 'onsite';
  jobType?: 'full-time' | 'part-time' | 'contract' | 'internship';
  salaryMin?: number;
  salaryMax?: number;
  description: string;
  requirements: string[];
  responsibilities: string[];
  benefits: string[];
  postedDate: Date;
  applicationDeadline?: Date;
  applyUrl: string;
  companyLogo?: string;
  industry?: string;
  experienceLevel?: string;
  matchScore?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface JobSearchQuery {
  keywords?: string;
  location?: string;
  remoteType?: string[];
  jobType?: string[];
  salaryMin?: number;
  salaryMax?: number;
  postedWithin?: number; // days
  page?: number;
  limit?: number;
}

export interface JobSearchResult {
  jobs: Job[];
  total: number;
  page: number;
  totalPages: number;
}

export interface RawJobData {
  id: string;
  title: string;
  company: string;
  location?: string;
  description?: string;
  salary?: string | { min?: number; max?: number };
  postedDate?: string | Date;
  url?: string;
  [key: string]: any;
}

export interface JobBoardAdapter {
  name: string;
  search(query: JobSearchQuery): Promise<Job[]>;
  getJobDetails(externalId: string): Promise<Job | null>;
}

export interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerDay: number;
}

export interface SavedJob {
  id: string;
  userId: string;
  jobId: string;
  notes?: string;
  createdAt: Date;
}
