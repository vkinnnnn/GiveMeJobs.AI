/**
 * Entity type definitions for the platform
 */

export interface User {
  id: string;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  professional_headline?: string;
  mfa_enabled: boolean;
  mfa_secret?: string;
  created_at: Date;
  updated_at: Date;
  last_login?: Date;
}

export interface UserProfile {
  id: string;
  user_id: string;
  skill_score: number;
  preferences: UserPreferences;
  created_at: Date;
  updated_at: Date;
}

export interface UserPreferences {
  job_types: ('full-time' | 'part-time' | 'contract' | 'internship')[];
  remote_preference: 'remote' | 'hybrid' | 'onsite' | 'any';
  locations: string[];
  salary_min?: number;
  salary_max?: number;
  industries: string[];
  company_sizes: string[];
  notification_preferences: {
    email_alerts: boolean;
    push_notifications: boolean;
    job_recommendations: boolean;
    application_updates: boolean;
  };
}

export interface Skill {
  id: string;
  user_id: string;
  name: string;
  category: string;
  proficiency_level: 1 | 2 | 3 | 4 | 5;
  years_of_experience: number;
  last_used?: Date;
  endorsements: number;
  created_at: Date;
}

export interface Experience {
  id: string;
  user_id: string;
  company: string;
  title: string;
  start_date: Date;
  end_date?: Date;
  current: boolean;
  description: string;
  achievements: string[];
  skills: string[];
  created_at: Date;
}

export interface Education {
  id: string;
  user_id: string;
  institution: string;
  degree: string;
  field_of_study: string;
  start_date: Date;
  end_date?: Date;
  gpa?: number;
  credential_hash?: string;
  created_at: Date;
}

export interface Job {
  id: string;
  external_id: string;
  source: 'linkedin' | 'indeed' | 'glassdoor' | 'adzuna' | 'ziprecruiter';
  title: string;
  company: string;
  location: string;
  remote_type: 'remote' | 'hybrid' | 'onsite';
  job_type: 'full-time' | 'part-time' | 'contract' | 'internship';
  salary_min?: number;
  salary_max?: number;
  description: string;
  requirements: string[];
  responsibilities: string[];
  benefits: string[];
  posted_date: Date;
  application_deadline?: Date;
  apply_url: string;
  created_at: Date;
  updated_at: Date;
}

export interface Application {
  id: string;
  user_id: string;
  job_id: string;
  status: ApplicationStatus;
  applied_date: Date;
  last_updated: Date;
  resume_id?: string;
  cover_letter_id?: string;
  application_method: 'platform' | 'email' | 'company-website' | 'referral';
  follow_up_date?: Date;
  interview_date?: Date;
  offer_details?: OfferDetails;
  created_at: Date;
}

export enum ApplicationStatus {
  SAVED = 'saved',
  APPLIED = 'applied',
  SCREENING = 'screening',
  INTERVIEW_SCHEDULED = 'interview_scheduled',
  INTERVIEW_COMPLETED = 'interview_completed',
  OFFER_RECEIVED = 'offer_received',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  WITHDRAWN = 'withdrawn'
}

export interface OfferDetails {
  salary: number;
  equity?: string;
  benefits: string[];
  start_date?: Date;
  deadline?: Date;
  negotiable: boolean;
}

export interface ApplicationNote {
  id: string;
  application_id: string;
  content: string;
  type: 'general' | 'interview' | 'feedback' | 'follow-up';
  created_at: Date;
}

export interface ApplicationEvent {
  id: string;
  application_id: string;
  event_type: string;
  description: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

export interface JobAlert {
  id: string;
  user_id: string;
  name: string;
  criteria: JobAlertCriteria;
  frequency: 'realtime' | 'daily' | 'weekly';
  active: boolean;
  last_sent_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface JobAlertCriteria {
  keywords?: string[];
  locations?: string[];
  job_types?: string[];
  remote_types?: string[];
  salary_min?: number;
  min_match_score?: number;
  companies?: string[];
  industries?: string[];
}

export interface SavedJob {
  id: string;
  user_id: string;
  job_id: string;
  saved_at: Date;
  notes?: string;
}

export interface JobMatchScore {
  id: string;
  user_id: string;
  job_id: string;
  overall_score: number;
  skill_match: number;
  experience_match: number;
  location_match: number;
  salary_match: number;
  culture_fit: number;
  calculated_at: Date;
}

export interface Document {
  id: string;
  user_id: string;
  job_id?: string;
  type: 'resume' | 'cover-letter';
  title: string;
  content: DocumentContent;
  template_id?: string;
  version: number;
  created_at: Date;
  updated_at: Date;
}

export interface DocumentContent {
  sections: DocumentSection[];
  formatting: FormattingOptions;
  metadata: DocumentMetadata;
}

export interface DocumentSection {
  type: 'header' | 'summary' | 'experience' | 'education' | 'skills' | 'custom';
  title: string;
  content: string | object;
  order: number;
}

export interface FormattingOptions {
  font: string;
  fontSize: number;
  lineHeight: number;
  margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  colors: {
    primary: string;
    secondary: string;
    text: string;
  };
}

export interface DocumentMetadata {
  word_count: number;
  keywords_used: string[];
  generation_time: number;
  ai_model?: string;
  template_name?: string;
}

export interface InterviewPrep {
  id: string;
  user_id: string;
  job_id: string;
  application_id?: string;
  questions: InterviewQuestion[];
  company_research: CompanyResearch;
  tips: string[];
  interview_date?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface InterviewQuestion {
  id: string;
  category: 'behavioral' | 'technical' | 'situational' | 'company-specific';
  question: string;
  suggested_answer: string;
  key_points: string[];
  star_framework?: STARFramework;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface STARFramework {
  situation: string;
  task: string;
  action: string;
  result: string;
}

export interface CompanyResearch {
  company_name: string;
  industry: string;
  size: string;
  culture: string[];
  recent_news: NewsItem[];
  values: string[];
  interview_process: string;
  glassdoor_rating?: number;
}

export interface NewsItem {
  title: string;
  summary: string;
  url: string;
  published_date: Date;
  source: string;
}

export interface PracticeSession {
  id: string;
  interview_prep_id: string;
  question_id: string;
  user_id: string;
  response: string;
  duration: number;
  analysis?: ResponseAnalysis;
  created_at: Date;
}

export interface ResponseAnalysis {
  overall_score: number;
  clarity: number;
  relevance: number;
  star_method_usage: boolean;
  confidence_indicators: string[];
  keywords_covered: string[];
  suggestions: string[];
  strengths: string[];
  areas_for_improvement: string[];
}

export interface SkillScore {
  id: string;
  user_id: string;
  overall_score: number;
  breakdown: SkillScoreBreakdown;
  last_calculated: Date;
}

export interface SkillScoreBreakdown {
  technical_skills: number;
  experience: number;
  education: number;
  certifications: number;
  project_portfolio: number;
  endorsements: number;
}

export interface SkillScoreHistory {
  id: string;
  user_id: string;
  score: number;
  breakdown: SkillScoreBreakdown;
  trigger: 'profile_update' | 'new_skill' | 'certification' | 'experience_added';
  timestamp: Date;
}

export interface CareerGoal {
  id: string;
  user_id: string;
  target_role: string;
  target_companies: string[];
  target_salary: number;
  timeframe: string;
  required_skills: string[];
  skill_gaps: string[];
  created_at: Date;
  updated_at: Date;
}

export interface OAuthAccount {
  id: string;
  user_id: string;
  provider: 'google' | 'linkedin';
  provider_account_id: string;
  access_token: string;
  refresh_token?: string;
  expires_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  ip_address: string;
  user_agent: string;
  result: 'success' | 'failure';
  metadata?: Record<string, any>;
  timestamp: Date;
}

export interface Notification {
  id: string;
  user_id: string;
  type: 'job_alert' | 'application_update' | 'interview_reminder' | 'document_ready' | 'system';
  title: string;
  message: string;
  data?: Record<string, any>;
  read: boolean;
  created_at: Date;
}