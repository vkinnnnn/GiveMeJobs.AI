import { create } from 'zustand';
import { apiClient } from '@/lib/api-client';
import type { UserProfile, Skill, Experience, Education, CareerGoal, UserPreferences } from '@givemejobs/shared-types';

interface SkillScore {
  userId: string;
  overallScore: number;
  lastCalculated: Date;
  breakdown: {
    technicalSkills: number;
    experience: number;
    education: number;
    certifications: number;
    projectPortfolio: number;
    endorsements: number;
  };
  history: SkillScoreHistory[];
}

interface SkillScoreHistory {
  score: number;
  timestamp: Date;
  trigger: string;
}

interface ProfileState {
  profile: UserProfile | null;
  skillScore: SkillScore | null;
  isLoading: boolean;
  error: string | null;
  fetchProfile: (userId: string) => Promise<void>;
  fetchSkillScore: (userId: string) => Promise<void>;
  updateProfile: (userId: string, data: Partial<UserProfile>) => Promise<void>;
  addSkill: (userId: string, skill: Omit<Skill, 'id'>) => Promise<void>;
  updateSkill: (userId: string, skillId: string, skill: Partial<Skill>) => Promise<void>;
  deleteSkill: (userId: string, skillId: string) => Promise<void>;
  addExperience: (userId: string, experience: Omit<Experience, 'id'>) => Promise<void>;
  updateExperience: (userId: string, expId: string, experience: Partial<Experience>) => Promise<void>;
  deleteExperience: (userId: string, expId: string) => Promise<void>;
  addEducation: (userId: string, education: Omit<Education, 'id'>) => Promise<void>;
  updateEducation: (userId: string, eduId: string, education: Partial<Education>) => Promise<void>;
  deleteEducation: (userId: string, eduId: string) => Promise<void>;
  addCareerGoal: (userId: string, goal: Omit<CareerGoal, 'id'>) => Promise<void>;
  updateCareerGoal: (userId: string, goalId: string, goal: Partial<CareerGoal>) => Promise<void>;
  deleteCareerGoal: (userId: string, goalId: string) => Promise<void>;
  updatePreferences: (userId: string, preferences: UserPreferences) => Promise<void>;
}

export const useProfileStore = create<ProfileState>((set) => ({
  profile: null,
  skillScore: null,
  isLoading: false,
  error: null,

  fetchProfile: async (userId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.get(`/api/users/${userId}/profile`);
      set({ profile: response.data, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  fetchSkillScore: async (userId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.get(`/api/users/${userId}/skill-score`);
      set({ skillScore: response.data, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  updateProfile: async (userId: string, data: Partial<UserProfile>) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.put(`/api/users/${userId}/profile`, data);
      set({ profile: response.data, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  addSkill: async (userId: string, skill: Omit<Skill, 'id'>) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.post(`/api/users/${userId}/skills`, skill);
      set((state) => ({
        profile: state.profile
          ? { ...state.profile, skills: [...state.profile.skills, response.data] }
          : null,
        isLoading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  updateSkill: async (userId: string, skillId: string, skill: Partial<Skill>) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.put(`/api/users/${userId}/skills/${skillId}`, skill);
      set((state) => ({
        profile: state.profile
          ? {
              ...state.profile,
              skills: state.profile.skills.map((s) => (s.id === skillId ? response.data : s)),
            }
          : null,
        isLoading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  deleteSkill: async (userId: string, skillId: string) => {
    set({ isLoading: true, error: null });
    try {
      await apiClient.delete(`/api/users/${userId}/skills/${skillId}`);
      set((state) => ({
        profile: state.profile
          ? {
              ...state.profile,
              skills: state.profile.skills.filter((s) => s.id !== skillId),
            }
          : null,
        isLoading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  addExperience: async (userId: string, experience: Omit<Experience, 'id'>) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.post(`/api/users/${userId}/experience`, experience);
      set((state) => ({
        profile: state.profile
          ? { ...state.profile, experience: [...state.profile.experience, response.data] }
          : null,
        isLoading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  updateExperience: async (userId: string, expId: string, experience: Partial<Experience>) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.put(`/api/users/${userId}/experience/${expId}`, experience);
      set((state) => ({
        profile: state.profile
          ? {
              ...state.profile,
              experience: state.profile.experience.map((e) => (e.id === expId ? response.data : e)),
            }
          : null,
        isLoading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  deleteExperience: async (userId: string, expId: string) => {
    set({ isLoading: true, error: null });
    try {
      await apiClient.delete(`/api/users/${userId}/experience/${expId}`);
      set((state) => ({
        profile: state.profile
          ? {
              ...state.profile,
              experience: state.profile.experience.filter((e) => e.id !== expId),
            }
          : null,
        isLoading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  addEducation: async (userId: string, education: Omit<Education, 'id'>) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.post(`/api/users/${userId}/education`, education);
      set((state) => ({
        profile: state.profile
          ? { ...state.profile, education: [...state.profile.education, response.data] }
          : null,
        isLoading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  updateEducation: async (userId: string, eduId: string, education: Partial<Education>) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.put(`/api/users/${userId}/education/${eduId}`, education);
      set((state) => ({
        profile: state.profile
          ? {
              ...state.profile,
              education: state.profile.education.map((e) => (e.id === eduId ? response.data : e)),
            }
          : null,
        isLoading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  deleteEducation: async (userId: string, eduId: string) => {
    set({ isLoading: true, error: null });
    try {
      await apiClient.delete(`/api/users/${userId}/education/${eduId}`);
      set((state) => ({
        profile: state.profile
          ? {
              ...state.profile,
              education: state.profile.education.filter((e) => e.id !== eduId),
            }
          : null,
        isLoading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  addCareerGoal: async (userId: string, goal: Omit<CareerGoal, 'id'>) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.post(`/api/users/${userId}/career-goals`, goal);
      set((state) => ({
        profile: state.profile
          ? { ...state.profile, careerGoals: [...(state.profile.careerGoals || []), response.data] }
          : null,
        isLoading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  updateCareerGoal: async (userId: string, goalId: string, goal: Partial<CareerGoal>) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.put(`/api/users/${userId}/career-goals/${goalId}`, goal);
      set((state) => ({
        profile: state.profile
          ? {
              ...state.profile,
              careerGoals: (state.profile.careerGoals || []).map((g) =>
                g.id === goalId ? response.data : g
              ),
            }
          : null,
        isLoading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  deleteCareerGoal: async (userId: string, goalId: string) => {
    set({ isLoading: true, error: null });
    try {
      await apiClient.delete(`/api/users/${userId}/career-goals/${goalId}`);
      set((state) => ({
        profile: state.profile
          ? {
              ...state.profile,
              careerGoals: (state.profile.careerGoals || []).filter((g) => g.id !== goalId),
            }
          : null,
        isLoading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  updatePreferences: async (userId: string, preferences: UserPreferences) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.put(`/api/users/${userId}/preferences`, preferences);
      set((state) => ({
        profile: state.profile
          ? { ...state.profile, preferences: response.data }
          : null,
        isLoading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },
}));
