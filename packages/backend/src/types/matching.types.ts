export interface JobMatchScore {
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

export interface MatchingWeights {
  skillMatch: number;
  experienceMatch: number;
  locationMatch: number;
  salaryMatch: number;
  cultureFit: number;
}

export interface UserMatchProfile {
  userId: string;
  skills: Array<{
    name: string;
    proficiencyLevel: number;
    yearsOfExperience: number;
  }>;
  experience: Array<{
    title: string;
    company: string;
    description: string;
    skills: string[];
    startDate: Date;
    endDate?: Date;
    current: boolean;
  }>;
  education: Array<{
    degree: string;
    fieldOfStudy: string;
    institution: string;
  }>;
  preferences: {
    locations: string[];
    salaryMin?: number;
    salaryMax?: number;
    remotePreference?: 'remote' | 'hybrid' | 'onsite' | 'any';
    industries?: string[];
    companySizes?: string[];
  };
  careerGoals?: Array<{
    targetRole: string;
    requiredSkills: string[];
  }>;
  totalYearsExperience: number;
}

export interface JobMatchRequest {
  userId: string;
  jobId: string;
}

export interface JobRecommendationRequest {
  userId: string;
  limit?: number;
  filters?: {
    location?: string;
    remoteType?: string[];
    jobType?: string[];
    salaryMin?: number;
    minMatchScore?: number;
  };
}
