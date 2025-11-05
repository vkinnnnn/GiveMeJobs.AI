import { create } from 'zustand';
import { apiClient } from '@/lib/api-client';

export interface InterviewQuestion {
  id: string;
  category: 'behavioral' | 'technical' | 'situational' | 'company-specific';
  question: string;
  suggestedAnswer: string;
  keyPoints: string[];
  starFramework?: {
    situation: string;
    task: string;
    action: string;
    result: string;
  };
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface CompanyResearch {
  companyName: string;
  industry: string;
  size: string;
  culture: string[];
  recentNews: NewsItem[];
  values: string[];
  interviewProcess: string;
}

export interface NewsItem {
  title: string;
  summary: string;
  url: string;
  publishedDate: Date;
}

export interface InterviewPrep {
  id: string;
  applicationId: string;
  userId: string;
  jobId: string;
  generatedAt: Date;
  interviewDate?: Date;
  questions: InterviewQuestion[];
  companyResearch: CompanyResearch;
  tips: string[];
}

export interface PracticeSession {
  id: string;
  questionId: string;
  userId: string;
  recordingUrl?: string;
  transcript?: string;
  response: string;
  duration: number;
  createdAt: Date;
  analysis?: ResponseAnalysis;
}

export interface ResponseAnalysis {
  overallScore: number;
  clarity: number;
  relevance: number;
  starMethodUsage: boolean;
  confidenceIndicators: string[];
  keywordsCovered: string[];
  suggestions: string[];
  strengths: string[];
  areasForImprovement: string[];
}

interface InterviewPrepState {
  interviewPreps: InterviewPrep[];
  currentPrep: InterviewPrep | null;
  practiceSessions: PracticeSession[];
  currentSession: PracticeSession | null;
  isLoading: boolean;
  generateInterviewPrep: (applicationId: string) => Promise<void>;
  getInterviewPrep: (applicationId: string) => Promise<void>;
  submitPracticeResponse: (prepId: string, questionId: string, response: string) => Promise<void>;
  getPracticeSessions: (prepId: string) => Promise<void>;
  analyzeResponse: (prepId: string, practiceId: string) => Promise<void>;
}

export const useInterviewPrepStore = create<InterviewPrepState>((set) => ({
  interviewPreps: [],
  currentPrep: null,
  practiceSessions: [],
  currentSession: null,
  isLoading: false,

  generateInterviewPrep: async (applicationId: string) => {
    set({ isLoading: true });
    try {
      const response = await apiClient.post('/api/interview-prep/generate', {
        applicationId,
      });
      set({
        currentPrep: response.data,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  getInterviewPrep: async (applicationId: string) => {
    set({ isLoading: true });
    try {
      const response = await apiClient.get(`/api/interview-prep/${applicationId}`);
      set({
        currentPrep: response.data,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  submitPracticeResponse: async (prepId: string, questionId: string, response: string) => {
    set({ isLoading: true });
    try {
      const result = await apiClient.post(`/api/interview-prep/${prepId}/practice`, {
        questionId,
        response,
      });
      set({
        currentSession: result.data,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  getPracticeSessions: async (prepId: string) => {
    set({ isLoading: true });
    try {
      const response = await apiClient.get(`/api/interview-prep/${prepId}/progress`);
      set({
        practiceSessions: response.data,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  analyzeResponse: async (prepId: string, practiceId: string) => {
    set({ isLoading: true });
    try {
      const response = await apiClient.post(
        `/api/interview-prep/${prepId}/practice/${practiceId}/analyze`
      );
      set({
        currentSession: response.data,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },
}));
