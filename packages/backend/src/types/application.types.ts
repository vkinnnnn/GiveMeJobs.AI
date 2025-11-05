/**
 * Application tracking types
 */

export interface Application {
  id: string;
  user_id: string;
  job_id: string;
  status: ApplicationStatus;
  applied_date: Date;
  response_date?: Date;
  interview_date?: Date;
  notes?: string;
  resume_version?: string;
  cover_letter?: string;
  follow_up_date?: Date;
  salary_negotiation?: SalaryNegotiation;
  interview_feedback?: string;
  rejection_reason?: string;
  created_at: Date;
  updated_at: Date;
}

export type ApplicationStatus = 
  | 'pending'
  | 'viewed'
  | 'interview_scheduled'
  | 'interview_completed'
  | 'rejected'
  | 'accepted'
  | 'withdrawn';

export interface SalaryNegotiation {
  initial_offer?: number;
  negotiated_amount?: number;
  final_amount?: number;
  benefits?: string[];
  negotiation_notes?: string;
}

export interface CreateApplicationRequest {
  job_id: string;
  notes?: string;
  resume_version?: string;
  cover_letter?: string;
}

export interface UpdateApplicationRequest {
  status?: ApplicationStatus;
  notes?: string;
  interview_date?: Date;
  follow_up_date?: Date;
  salary_negotiation?: SalaryNegotiation;
  interview_feedback?: string;
  rejection_reason?: string;
}

export interface ApplicationWithJob extends Application {
  job_title?: string;
  job_company?: string;
  job_location?: string;
  job_salary_min?: number;
  job_salary_max?: number;
}

export interface ApplicationAnalytics {
  total_applications: number;
  response_rate: number;
  interview_rate: number;
  success_rate: number;
  average_response_time: number;
  applications_by_status: Record<ApplicationStatus, number>;
  applications_by_month: Array<{
    month: string;
    count: number;
  }>;
  top_companies: Array<{
    company: string;
    count: number;
    success_rate: number;
  }>;
}