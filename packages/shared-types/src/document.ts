export interface DocumentGenerationRequest {
  userId: string;
  jobId: string;
  documentType: 'resume' | 'cover-letter';
  templateId?: string;
  customizations?: {
    tone?: 'professional' | 'casual' | 'enthusiastic';
    length?: 'concise' | 'standard' | 'detailed';
    focusAreas?: string[];
  };
}

export interface GeneratedDocument {
  id: string;
  userId: string;
  jobId: string;
  documentType: 'resume' | 'cover-letter';
  title: string;
  content: DocumentContent;
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

export interface DocumentContent {
  sections: DocumentSection[];
  formatting: FormattingOptions;
}

export interface DocumentSection {
  type: 'header' | 'summary' | 'experience' | 'education' | 'skills' | 'custom';
  title: string;
  content: string | object;
  order: number;
}

export interface FormattingOptions {
  fontSize: number;
  fontFamily: string;
  lineSpacing: number;
  margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

export interface ResumeTemplate {
  id: string;
  name: string;
  description: string;
  category: 'modern' | 'classic' | 'creative' | 'ats-friendly';
  sections: TemplateSectionConfig[];
  styling: TemplateStyles;
  isPublic: boolean;
}

export interface TemplateSectionConfig {
  type: string;
  required: boolean;
  order: number;
}

export interface TemplateStyles {
  colors: {
    primary: string;
    secondary: string;
    text: string;
  };
  fonts: {
    heading: string;
    body: string;
  };
}
