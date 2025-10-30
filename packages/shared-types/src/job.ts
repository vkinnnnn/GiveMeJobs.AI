export interface Job {
  id: string;
  externalId: string;
  source: 'linkedin' | 'indeed' | 'glassdoor' | 'ziprecruiter' | 'adzuna';
  title: string;
  company: string;
  location: string;
  remoteType: 'remote' | 'hybrid' | 'onsite';
  jobType: 'full-time' | 'part-time' | 'contract' | 'internship';
  salaryMin?: number;
  salaryMax?: number;
  description: string;
  requirements: string[];
  responsibilities: string[];
  benefits: string[];
  postedDate: Date;
  applicationDeadline?: Date;
  applyUrl: string;
  matchScore?: number;
}

export interface JobSearchQuery {
  keywords?: string;
  location?: string;
  remoteType?: string[];
  jobType?: string[];
  salaryMin?: number;
  salaryMax?: number;
  postedWithin?: number;
  page: number;
  limit: number;
}

export interface JobMatchAnalysis {
  jobId: string;
  userId: string;
  overallScore: number;
  breakdown: {
    skillMatch: number;
    experienceMatch: number;
    locationMatch: number;
    salaryMatch: number;
    cultureFit: number;
  };
  matchingSkills: string[];
  missingSkills: string[];
  recommendations: string[];
}

export interface JobAlert {
  id: string;
  userId: string;
  name: string;
  criteria: {
    keywords: string[];
    locations: string[];
    jobTypes: string[];
    remoteTypes: string[];
    salaryMin?: number;
    minMatchScore?: number;
  };
  frequency: 'realtime' | 'daily' | 'weekly';
  active: boolean;
}
