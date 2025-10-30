export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  professionalHeadline?: string;
  blockchainAddress?: string;
  mfaEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
}

export interface UserProfile {
  userId: string;
  skills: Skill[];
  experience: Experience[];
  education: Education[];
  certifications: Certification[];
  careerGoals: CareerGoal[];
  preferences: UserPreferences;
  skillScore: number;
}

export interface Skill {
  id: string;
  name: string;
  category: string;
  proficiencyLevel: 1 | 2 | 3 | 4 | 5;
  yearsOfExperience: number;
  endorsements: number;
  lastUsed?: Date;
}

export interface Experience {
  id: string;
  company: string;
  title: string;
  startDate: Date;
  endDate?: Date;
  current: boolean;
  description: string;
  achievements: string[];
  skills: string[];
}

export interface Education {
  id: string;
  institution: string;
  degree: string;
  fieldOfStudy: string;
  startDate: Date;
  endDate?: Date;
  gpa?: number;
  credentialHash?: string;
}

export interface Certification {
  id: string;
  name: string;
  issuer: string;
  issueDate: Date;
  expiryDate?: Date;
  credentialUrl?: string;
}

export interface CareerGoal {
  id: string;
  targetRole: string;
  targetCompanies: string[];
  targetSalary: number;
  timeframe: string;
  requiredSkills: string[];
  skillGaps: string[];
}

export interface UserPreferences {
  jobTypes: ('full-time' | 'part-time' | 'contract' | 'internship')[];
  remotePreference: 'remote' | 'hybrid' | 'onsite' | 'any';
  locations: string[];
  salaryMin: number;
  salaryMax: number;
  industries: string[];
  companySizes: string[];
}
