import { create } from 'zustand';
import { apiClient } from '@/lib/api-client';

export interface AnalyticsMetrics {
  applicationsSent: number;
  responseRate: number;
  interviewRate: number;
  offerRate: number;
  averageResponseTime: number;
  activeApplications: number;
}

export interface TrendData {
  metric: string;
  data: {
    date: Date;
    value: number;
  }[];
  change: number;
  direction: 'up' | 'down' | 'stable';
}

export interface Insight {
  type: 'success' | 'warning' | 'info';
  title: string;
  description: string;
  actionable: boolean;
  recommendation?: string;
}

export interface BenchmarkComparison {
  userMetrics: Record<string, number>;
  platformAverage: Record<string, number>;
  percentile: number;
  comparison: {
    metric: string;
    userValue: number;
    avgValue: number;
    performance: 'above' | 'below' | 'average';
  }[];
}

export interface AnalyticsDashboard {
  userId: string;
  period: 'week' | 'month' | 'quarter' | 'year';
  metrics: AnalyticsMetrics;
  trends: TrendData[];
  insights: Insight[];
}

interface AnalyticsState {
  dashboard: AnalyticsDashboard | null;
  benchmarks: BenchmarkComparison | null;
  loading: boolean;
  error: string | null;
  
  // Actions
  fetchDashboard: (period?: 'week' | 'month' | 'quarter' | 'year') => Promise<void>;
  fetchBenchmarks: () => Promise<void>;
  exportAnalytics: (format: 'csv' | 'pdf', period: 'week' | 'month' | 'quarter' | 'year') => Promise<void>;
  clearError: () => void;
}

export const useAnalyticsStore = create<AnalyticsState>((set) => ({
  dashboard: null,
  benchmarks: null,
  loading: false,
  error: null,

  fetchDashboard: async (period = 'month') => {
    set({ loading: true, error: null });
    try {
      const response = await apiClient.get(`/api/analytics/dashboard?period=${period}`);
      set({ dashboard: response.data, loading: false });
    } catch (error: any) {
      set({ 
        error: error.response?.data?.error || 'Failed to fetch analytics dashboard',
        loading: false 
      });
    }
  },

  fetchBenchmarks: async () => {
    set({ loading: true, error: null });
    try {
      const response = await apiClient.get('/api/analytics/benchmarks');
      set({ benchmarks: response.data, loading: false });
    } catch (error: any) {
      set({ 
        error: error.response?.data?.error || 'Failed to fetch benchmarks',
        loading: false 
      });
    }
  },

  exportAnalytics: async (format, period) => {
    set({ loading: true, error: null });
    try {
      const response = await apiClient.post(
        '/api/analytics/export',
        { format, period, includeCharts: true },
        { responseType: 'blob' }
      );

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `job-search-analytics-${period}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      set({ loading: false });
    } catch (error: any) {
      set({ 
        error: error.response?.data?.error || 'Failed to export analytics',
        loading: false 
      });
    }
  },

  clearError: () => set({ error: null }),
}));
