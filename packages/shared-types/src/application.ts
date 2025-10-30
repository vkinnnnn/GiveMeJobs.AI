export enum ApplicationStatus {
  SAVED = 'saved',
  APPLIED = 'applied',
  SCREENING = 'screening',
  INTERVIEW_SCHEDULED = 'interview_scheduled',
  INTERVIEW_COMPLETED = 'interview_completed',
  OFFER_RECEIVED = 'offer_received',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  WITHDRAWN = 'withdrawn',
}

export interface Application {
  id: string;
  userId: string;
  jobId: string;
  status: ApplicationStatus;
  appliedDate: Date;
  lastUpdated: Date;
  resumeId: string;
  coverLetterId?: string;
  applicationMethod: 'platform' | 'email' | 'company-website' | 'referral';
  notes: ApplicationNote[];
  timeline: ApplicationEvent[];
  followUpDate?: Date;
  interviewDate?: Date;
  offerDetails?: OfferDetails;
}

export interface ApplicationNote {
  id: string;
  content: string;
  createdAt: Date;
  type: 'general' | 'interview' | 'feedback' | 'follow-up';
}

export interface ApplicationEvent {
  id: string;
  eventType: string;
  description: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface OfferDetails {
  salary: number;
  equity?: string;
  benefits: string[];
  startDate?: Date;
  deadline?: Date;
}

export interface ApplicationStats {
  total: number;
  byStatus: Record<ApplicationStatus, number>;
  responseRate: number;
  averageResponseTime: number;
  interviewConversionRate: number;
  offerRate: number;
}
