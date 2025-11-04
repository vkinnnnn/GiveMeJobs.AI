import { Db } from 'mongodb';

/**
 * MongoDB Schema Definitions and Indexes
 * This file defines the structure and indexes for MongoDB collections
 */

export interface ResumeTemplate {
  _id?: string;
  name: string;
  description: string;
  category: 'modern' | 'classic' | 'creative' | 'ats-friendly';
  sections: TemplateSectionConfig[];
  styling: TemplateStyles;
  isPublic: boolean;
  userId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TemplateSectionConfig {
  type: 'header' | 'summary' | 'experience' | 'education' | 'skills' | 'custom';
  title: string;
  order: number;
  required: boolean;
  config: Record<string, any>;
}

export interface TemplateStyles {
  fontFamily: string;
  fontSize: number;
  colors: {
    primary: string;
    secondary: string;
    text: string;
  };
  spacing: {
    margin: number;
    padding: number;
  };
  layout: 'single-column' | 'two-column' | 'sidebar';
}

export interface CoverLetterTemplate {
  _id?: string;
  name: string;
  description: string;
  structure: {
    opening: string;
    body: string[];
    closing: string;
  };
  tone: 'professional' | 'casual' | 'enthusiastic';
  isPublic: boolean;
  userId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GeneratedDocument {
  _id?: string;
  userId: string;
  jobId: string;
  documentType: 'resume' | 'cover-letter';
  title: string;
  content: DocumentContent;
  templateId: string;
  version: number;
  metadata: {
    wordCount: number;
    keywordsUsed: string[];
    generationTime: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface DocumentContent {
  sections: DocumentSection[];
  formatting: FormattingOptions;
}

export interface DocumentSection {
  type: string;
  title: string;
  content: string | Record<string, any>;
  order: number;
}

export interface FormattingOptions {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

export interface DocumentVersion {
  _id?: string;
  documentId: string;
  userId: string;
  version: number;
  content: DocumentContent;
  changes: string;
  createdAt: Date;
}

/**
 * Initialize MongoDB collections with schemas and indexes
 */
export async function initializeMongoCollections(db: Db): Promise<void> {
  try {
    // Resume Templates Collection
    const resumeTemplates = db.collection('resume_templates');
    await resumeTemplates.createIndexes([
      { key: { name: 1 } },
      { key: { category: 1 } },
      { key: { isPublic: 1 } },
      { key: { userId: 1 } },
      { key: { createdAt: -1 } },
      { key: { userId: 1, name: 1 }, unique: true, sparse: true },
    ]);

    // Validation schema for resume templates
    await db.command({
      collMod: 'resume_templates',
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['name', 'category', 'sections', 'isPublic', 'createdAt', 'updatedAt'],
          properties: {
            name: {
              bsonType: 'string',
              description: 'Template name is required',
            },
            description: {
              bsonType: 'string',
            },
            category: {
              enum: ['modern', 'classic', 'creative', 'ats-friendly'],
              description: 'Category must be one of the predefined values',
            },
            sections: {
              bsonType: 'array',
              description: 'Sections array is required',
            },
            styling: {
              bsonType: 'object',
            },
            isPublic: {
              bsonType: 'bool',
              description: 'isPublic flag is required',
            },
            userId: {
              bsonType: 'string',
            },
            createdAt: {
              bsonType: 'date',
            },
            updatedAt: {
              bsonType: 'date',
            },
          },
        },
      },
      validationLevel: 'moderate',
    }).catch(() => {
      // Collection might not exist yet, will be created on first insert
    });

    // Cover Letter Templates Collection
    const coverLetterTemplates = db.collection('cover_letter_templates');
    await coverLetterTemplates.createIndexes([
      { key: { name: 1 } },
      { key: { tone: 1 } },
      { key: { isPublic: 1 } },
      { key: { userId: 1 } },
      { key: { createdAt: -1 } },
      { key: { userId: 1, name: 1 }, unique: true, sparse: true },
    ]);

    // Validation schema for cover letter templates
    await db.command({
      collMod: 'cover_letter_templates',
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['name', 'structure', 'tone', 'isPublic', 'createdAt', 'updatedAt'],
          properties: {
            name: {
              bsonType: 'string',
            },
            description: {
              bsonType: 'string',
            },
            structure: {
              bsonType: 'object',
              required: ['opening', 'body', 'closing'],
            },
            tone: {
              enum: ['professional', 'casual', 'enthusiastic'],
            },
            isPublic: {
              bsonType: 'bool',
            },
            userId: {
              bsonType: 'string',
            },
            createdAt: {
              bsonType: 'date',
            },
            updatedAt: {
              bsonType: 'date',
            },
          },
        },
      },
      validationLevel: 'moderate',
    }).catch(() => {
      // Collection might not exist yet
    });

    // Generated Documents Collection
    const generatedDocuments = db.collection('generated_documents');
    await generatedDocuments.createIndexes([
      { key: { userId: 1 } },
      { key: { jobId: 1 } },
      { key: { documentType: 1 } },
      { key: { templateId: 1 } },
      { key: { createdAt: -1 } },
      { key: { userId: 1, jobId: 1, documentType: 1 } },
      { key: { userId: 1, createdAt: -1 } },
    ]);

    // Validation schema for generated documents
    await db.command({
      collMod: 'generated_documents',
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['userId', 'jobId', 'documentType', 'title', 'content', 'templateId', 'version', 'createdAt', 'updatedAt'],
          properties: {
            userId: {
              bsonType: 'string',
            },
            jobId: {
              bsonType: 'string',
            },
            documentType: {
              enum: ['resume', 'cover-letter'],
            },
            title: {
              bsonType: 'string',
            },
            content: {
              bsonType: 'object',
            },
            templateId: {
              bsonType: 'string',
            },
            version: {
              bsonType: 'int',
            },
            metadata: {
              bsonType: 'object',
            },
            createdAt: {
              bsonType: 'date',
            },
            updatedAt: {
              bsonType: 'date',
            },
          },
        },
      },
      validationLevel: 'moderate',
    }).catch(() => {
      // Collection might not exist yet
    });

    // Document Versions Collection
    const documentVersions = db.collection('document_versions');
    await documentVersions.createIndexes([
      { key: { documentId: 1 } },
      { key: { userId: 1 } },
      { key: { version: 1 } },
      { key: { createdAt: -1 } },
      { key: { documentId: 1, version: 1 }, unique: true },
    ]);

    console.log('✓ MongoDB collections and indexes initialized');
  } catch (error) {
    console.error('Error initializing MongoDB collections:', error);
    throw error;
  }
}

/**
 * Get MongoDB client (for backward compatibility)
 */
export const getMongoClient = () => {
  // This is a placeholder - in production, you'd return the actual client
  // For now, we'll return null to prevent errors
  return null;
};

/**
 * Seed default resume templates
 */
export async function seedDefaultTemplates(db: Db): Promise<void> {
  const resumeTemplates = db.collection('resume_templates');
  const coverLetterTemplates = db.collection('cover_letter_templates');

  // Check if templates already exist
  const existingResumeCount = await resumeTemplates.countDocuments({ isPublic: true });
  const existingCoverLetterCount = await coverLetterTemplates.countDocuments({ isPublic: true });

  if (existingResumeCount === 0) {
    // Seed default resume templates
    const defaultResumeTemplates: ResumeTemplate[] = [
      {
        name: 'Modern Professional',
        description: 'Clean and modern design suitable for tech and creative industries',
        category: 'modern',
        sections: [
          { type: 'header', title: 'Header', order: 1, required: true, config: {} },
          { type: 'summary', title: 'Professional Summary', order: 2, required: true, config: {} },
          { type: 'experience', title: 'Work Experience', order: 3, required: true, config: {} },
          { type: 'education', title: 'Education', order: 4, required: true, config: {} },
          { type: 'skills', title: 'Skills', order: 5, required: true, config: {} },
        ],
        styling: {
          fontFamily: 'Inter',
          fontSize: 11,
          colors: { primary: '#2563eb', secondary: '#64748b', text: '#1e293b' },
          spacing: { margin: 20, padding: 10 },
          layout: 'single-column',
        },
        isPublic: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'ATS-Friendly Classic',
        description: 'Simple format optimized for Applicant Tracking Systems',
        category: 'ats-friendly',
        sections: [
          { type: 'header', title: 'Contact Information', order: 1, required: true, config: {} },
          { type: 'summary', title: 'Summary', order: 2, required: true, config: {} },
          { type: 'experience', title: 'Professional Experience', order: 3, required: true, config: {} },
          { type: 'education', title: 'Education', order: 4, required: true, config: {} },
          { type: 'skills', title: 'Technical Skills', order: 5, required: true, config: {} },
        ],
        styling: {
          fontFamily: 'Arial',
          fontSize: 11,
          colors: { primary: '#000000', secondary: '#333333', text: '#000000' },
          spacing: { margin: 25, padding: 0 },
          layout: 'single-column',
        },
        isPublic: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    await resumeTemplates.insertMany(defaultResumeTemplates as any);
    console.log('✓ Default resume templates seeded');
  }

  if (existingCoverLetterCount === 0) {
    // Seed default cover letter templates
    const defaultCoverLetterTemplates: CoverLetterTemplate[] = [
      {
        name: 'Professional Standard',
        description: 'Traditional professional cover letter format',
        structure: {
          opening: 'Dear Hiring Manager,',
          body: [
            'I am writing to express my strong interest in the [Position] role at [Company].',
            'With my background in [Field] and [X] years of experience, I am confident in my ability to contribute to your team.',
            'I am particularly drawn to this opportunity because [Reason].',
          ],
          closing: 'Thank you for considering my application. I look forward to discussing how my skills and experience align with your needs.',
        },
        tone: 'professional',
        isPublic: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Enthusiastic Approach',
        description: 'Energetic and passionate tone for creative roles',
        structure: {
          opening: 'Hello [Hiring Manager Name],',
          body: [
            'I was thrilled to discover the [Position] opening at [Company]!',
            'Your company\'s mission to [Mission] resonates deeply with my professional values and aspirations.',
            'I bring [X] years of experience in [Field], and I\'m excited about the possibility of contributing to [Specific Project/Goal].',
          ],
          closing: 'I would love the opportunity to discuss how my passion and skills can benefit your team. Thank you for your time and consideration!',
        },
        tone: 'enthusiastic',
        isPublic: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    await coverLetterTemplates.insertMany(defaultCoverLetterTemplates as any);
    console.log('✓ Default cover letter templates seeded');
  }
}
