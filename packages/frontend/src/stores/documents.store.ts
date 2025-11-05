import { create } from 'zustand';
import { apiClient } from '@/lib/api-client';

export enum DocumentType {
  RESUME = 'resume',
  COVER_LETTER = 'cover-letter',
}

export interface DocumentTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  isPublic: boolean;
}

export interface GeneratedDocument {
  id: string;
  userId: string;
  jobId: string;
  documentType: DocumentType;
  title: string;
  content: {
    sections: Array<{
      type: string;
      title: string;
      content: string | object;
      order: number;
    }>;
  };
  templateId: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  metadata: {
    wordCount: number;
    keywordsUsed: string[];
    generationTime: number;
  };
}

export interface DocumentGenerationRequest {
  userId: string;
  jobId: string;
  documentType: DocumentType;
  templateId?: string;
  customizations?: {
    tone?: 'professional' | 'casual' | 'enthusiastic';
    length?: 'concise' | 'standard' | 'detailed';
    focusAreas?: string[];
  };
}

interface DocumentsState {
  documents: GeneratedDocument[];
  templates: DocumentTemplate[];
  currentDocument: GeneratedDocument | null;
  isLoading: boolean;
  isGenerating: boolean;
  
  // Document operations
  generateResume: (request: DocumentGenerationRequest) => Promise<GeneratedDocument>;
  generateCoverLetter: (request: DocumentGenerationRequest) => Promise<GeneratedDocument>;
  getDocuments: (userId: string) => Promise<void>;
  getDocumentById: (id: string) => Promise<void>;
  updateDocument: (id: string, content: any) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  exportDocument: (id: string, format: 'pdf' | 'docx' | 'txt') => Promise<Blob>;
  
  // Template operations
  getTemplates: () => Promise<void>;
  getTemplateById: (id: string) => Promise<DocumentTemplate>;
}

export const useDocumentsStore = create<DocumentsState>((set) => ({
  documents: [],
  templates: [],
  currentDocument: null,
  isLoading: false,
  isGenerating: false,

  generateResume: async (request: DocumentGenerationRequest) => {
    set({ isGenerating: true });
    try {
      const response = await apiClient.post('/api/documents/resume/generate', request);
      const document = response.data;
      
      set((state) => ({
        documents: [document, ...state.documents],
        currentDocument: document,
        isGenerating: false,
      }));
      
      return document;
    } catch (error) {
      set({ isGenerating: false });
      throw error;
    }
  },

  generateCoverLetter: async (request: DocumentGenerationRequest) => {
    set({ isGenerating: true });
    try {
      const response = await apiClient.post('/api/documents/cover-letter/generate', request);
      const document = response.data;
      
      set((state) => ({
        documents: [document, ...state.documents],
        currentDocument: document,
        isGenerating: false,
      }));
      
      return document;
    } catch (error) {
      set({ isGenerating: false });
      throw error;
    }
  },

  getDocuments: async (userId: string) => {
    set({ isLoading: true });
    try {
      const response = await apiClient.get(`/api/documents/user/${userId}`);
      set({
        documents: response.data,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  getDocumentById: async (id: string) => {
    set({ isLoading: true });
    try {
      const response = await apiClient.get(`/api/documents/${id}`);
      set({
        currentDocument: response.data,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  updateDocument: async (id: string, content: any) => {
    set({ isLoading: true });
    try {
      const response = await apiClient.put(`/api/documents/${id}`, { content });
      set((state) => ({
        currentDocument: response.data,
        documents: state.documents.map((doc) =>
          doc.id === id ? response.data : doc
        ),
        isLoading: false,
      }));
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  deleteDocument: async (id: string) => {
    set({ isLoading: true });
    try {
      await apiClient.delete(`/api/documents/${id}`);
      set((state) => ({
        documents: state.documents.filter((doc) => doc.id !== id),
        currentDocument: state.currentDocument?.id === id ? null : state.currentDocument,
        isLoading: false,
      }));
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  exportDocument: async (id: string, format: 'pdf' | 'docx' | 'txt') => {
    const response = await apiClient.post(
      `/api/documents/${id}/export`,
      { format },
      { responseType: 'blob' }
    );
    return response.data;
  },

  getTemplates: async () => {
    set({ isLoading: true });
    try {
      const response = await apiClient.get('/api/documents/templates');
      set({
        templates: response.data,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  getTemplateById: async (id: string) => {
    const response = await apiClient.get(`/api/documents/templates/${id}`);
    return response.data;
  },
}));
