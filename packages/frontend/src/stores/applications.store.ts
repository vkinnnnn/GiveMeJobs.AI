import { create } from 'zustand';
import { apiClient } from '@/lib/api-client';

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
  applicationMethod: string;
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
  type: string;
}

export interface ApplicationEvent {
  id: string;
  eventType: string;
  description: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
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

interface ApplicationsState {
  applications: Application[];
  currentApplication: Application | null;
  stats: ApplicationStats | null;
  isLoading: boolean;
  getApplications: () => Promise<void>;
  getApplicationById: (id: string) => Promise<void>;
  createApplication: (data: {
    jobId: string;
    resumeId: string;
    coverLetterId?: string;
    applicationMethod: string;
  }) => Promise<void>;
  updateApplicationStatus: (id: string, status: ApplicationStatus) => Promise<void>;
  addNote: (id: string, note: { content: string; type: string }) => Promise<void>;
  getStats: () => Promise<void>;
}

export const useApplicationsStore = create<ApplicationsState>((set, get) => ({
  applications: [],
  currentApplication: null,
  stats: null,
  isLoading: false,

  getApplications: async () => {
    set({ isLoading: true });
    try {
      const response = await apiClient.get('/api/applications');
      set({
        applications: response.data,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  getApplicationById: async (id: string) => {
    set({ isLoading: true });
    try {
      const response = await apiClient.get(`/api/applications/${id}`);
      set({
        currentApplication: response.data,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  createApplication: async (data) => {
    set({ isLoading: true });
    try {
      await apiClient.post('/api/applications', data);
      await get().getApplications();
      set({ isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  updateApplicationStatus: async (id: string, status: ApplicationStatus) => {
    set({ isLoading: true });
    try {
      await apiClient.patch(`/api/applications/${id}/status`, { status });
      await get().getApplicationById(id);
      await get().getApplications();
      set({ isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  addNote: async (id: string, note) => {
    await apiClient.post(`/api/applications/${id}/notes`, note);
    await get().getApplicationById(id);
  },

  getStats: async () => {
    set({ isLoading: true });
    try {
      const response = await apiClient.get('/api/applications/stats');
      set({
        stats: response.data,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },
}));
