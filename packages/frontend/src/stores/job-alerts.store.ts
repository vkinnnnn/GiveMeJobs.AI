import { create } from 'zustand';
import { apiClient } from '@/lib/api-client';
import { JobAlert } from '@givemejobs/shared-types';

interface JobAlertsState {
  alerts: JobAlert[];
  isLoading: boolean;
  getAlerts: () => Promise<void>;
  createAlert: (data: Omit<JobAlert, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateAlert: (id: string, data: Partial<JobAlert>) => Promise<void>;
  deleteAlert: (id: string) => Promise<void>;
}

export const useJobAlertsStore = create<JobAlertsState>((set, _get) => ({
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

  createAlert: async (data) => {
    set({ isLoading: true });
    try {
      const response = await apiClient.post('/api/jobs/alerts', data);
      set((state) => ({
        alerts: [response.data, ...state.alerts],
        isLoading: false,
      }));
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  updateAlert: async (id: string, data) => {
    set({ isLoading: true });
    try {
      const response = await apiClient.put(`/api/jobs/alerts/${id}`, data);
      set((state) => ({
        alerts: state.alerts.map((alert) =>
          alert.id === id ? response.data : alert
        ),
        isLoading: false,
      }));
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  deleteAlert: async (id: string) => {
    set({ isLoading: true });
    try {
      await apiClient.delete(`/api/jobs/alerts/${id}`);
      set((state) => ({
        alerts: state.alerts.filter((alert) => alert.id !== id),
        isLoading: false,
      }));
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },
}));