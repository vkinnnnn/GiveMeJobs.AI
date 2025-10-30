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
