export interface JobAlert {
  id: string;
  userId: string;
  name: string;
  criteria: JobAlertCriteria;
  frequency: 'realtime' | 'daily' | 'weekly';
  active: boolean;
  lastTriggered?: Date;
  createdAt: Date;
  updatedAt: Date;
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
