import { JobAlert as SharedJobAlert } from '@givemejobs/shared-types';

export interface JobAlert extends SharedJobAlert {
  lastTriggered?: Date;
}

export interface JobAlertCriteria {
  keywords?: string[];
  locations?: string[];
  jobTypes?: string[];
  remoteTypes?: string[];
  salaryMin?: number;
  minMatchScore?: number;
}

export interface CreateJobAlertRequest {
  name: string;
  criteria: JobAlertCriteria;
  frequency: 'realtime' | 'daily' | 'weekly';
}

export interface UpdateJobAlertRequest {
  name?: string;
  criteria?: JobAlertCriteria;
  frequency?: 'realtime' | 'daily' | 'weekly';
  active?: boolean;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, any>;
  read: boolean;
  createdAt: Date;
}

export interface CreateNotificationRequest {
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, any>;
}
