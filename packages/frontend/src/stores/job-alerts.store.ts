import { create } from 'zustand';
import { apiClient } from '@/lib/api-client';

interface JobAlert {
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

interface JobAlertsState {
  alerts: JobAlert[];
  isLoading: boolean;
  getAlerts: () => Promise<void>;
  createAlert: (alert: Omit<JobAlert, 'id' | 'userId'>) => Promise<void>;
  updateAlert: (id: string, alert: Partial<JobAlert>) => Promise<void>;
  deleteAlert: (id: string) => Promise<void>;
}

export const useJobAlertsStore = create<JobAlertsState>((set, get) => ({
  alerts: [],
  isLoading: false,

  getAlerts: async () => {
    set({ isLoading: true });
    try {
      const response = await apiClient.get('/api/jobs/alerts');
      set({
        alerts: response.data,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  createAlert: async (alert) => {
    set({ isLoading: true });
    try {
      await apiClient.post('/api/jobs/alerts', alert);
      await get().getAlerts();
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  updateAlert: async (id, alert) => {
    set({ isLoading: true });
    try {
      await apiClient.put(`/api/jobs/alerts/${id}`, alert);
      await get().getAlerts();
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  deleteAlert: async (id) => {
    set({ isLoading: true });
    try {
      await apiClient.delete(`/api/jobs/alerts/${id}`);
      await get().getAlerts();
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },
}));
