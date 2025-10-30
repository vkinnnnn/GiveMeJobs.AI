import { create } from 'zustand';
import { apiClient } from '@/lib/api-client';

interface Job {
  id: string;
  externalId: string;
  source: string;
  title: string;
  company: string;
  location: string;
  remoteType: string;
  jobType: string;
  salaryMin?: number;
  salaryMax?: number;
  description: string;
  requirements: string[];
  responsibilities: string[];
  benefits: string[];
  postedDate: Date;
  applicationDeadline?: Date;
  applyUrl: string;
  matchScore?: number;
}

interface JobSearchQuery {
  keywords?: string;
  location?: string;
  remoteType?: string[];
  jobType?: string[];
  salaryMin?: number;
  salaryMax?: number;
  page?: number;
  limit?: number;
}

interface JobMatchAnalysis {
  jobId: string;
  userId: string;
  overallScore: number;
  breakdown: {
    skillMatch: number;
    experienceMatch: number;
    locationMatch: number;
    salaryMatch: number;
    cultureFit: number;
  };
  matchingSkills: string[];
  missingSkills: string[];
  recommendations: string[];
}

interface JobsState {
  jobs: Job[];
  savedJobs: Job[];
  currentJob: Job | null;
  matchAnalysis: JobMatchAnalysis | null;
  isLoading: boolean;
  totalPages: number;
  currentPage: number;
  searchJobs: (query: JobSearchQuery) => Promise<void>;
  getJobById: (id: string) => Promise<void>;
  getMatchAnalysis: (jobId: string) => Promise<void>;
  saveJob: (jobId: string) => Promise<void>;
  unsaveJob: (jobId: string) => Promise<void>;
  getSavedJobs: () => Promise<void>;
  getRecommendations: () => Promise<void>;
}

export const useJobsStore = create<JobsState>((set, get) => ({
  jobs: [],
  savedJobs: [],
  currentJob: null,
  matchAnalysis: null,
  isLoading: false,
  totalPages: 0,
  currentPage: 1,

  searchJobs: async (query: JobSearchQuery) => {
    set({ isLoading: true });
    try {
      const response = await apiClient.get('/api/jobs/search', { params: query });
      const { jobs, totalPages, page } = response.data;

      set({
        jobs,
        totalPages,
        currentPage: page,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  getJobById: async (id: string) => {
    set({ isLoading: true });
    try {
      const response = await apiClient.get(`/api/jobs/${id}`);
      set({
        currentJob: response.data,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  getMatchAnalysis: async (jobId: string) => {
    set({ isLoading: true });
    try {
      const response = await apiClient.get(`/api/jobs/${jobId}/match-analysis`);
      set({
        matchAnalysis: response.data,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  saveJob: async (jobId: string) => {
    await apiClient.post(`/api/jobs/${jobId}/save`);
    await get().getSavedJobs();
  },

  unsaveJob: async (jobId: string) => {
    await apiClient.delete(`/api/jobs/${jobId}/unsave`);
    await get().getSavedJobs();
  },

  getSavedJobs: async () => {
    set({ isLoading: true });
    try {
      const response = await apiClient.get('/api/jobs/saved');
      set({
        savedJobs: response.data,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  getRecommendations: async () => {
    set({ isLoading: true });
    try {
      const response = await apiClient.get('/api/jobs/recommendations');
      set({
        jobs: response.data,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },
}));
