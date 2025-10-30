import { Db, ObjectId } from 'mongodb';
import { Pool } from 'pg';
import { mongoClient, pgPool } from '../config/database';
import { GeneratedDocument, DocumentContent, DocumentSection } from '../config/mongodb-schemas';
import { aiService } from './ai.service';
import { documentTemplateService } from './document-template.service';
import { jobService } from './job.service';

/**
 * Document Generation Service
 * Handles AI-powered resume and cover letter generation
 */
export class DocumentGenerationService {
  private pgDb: Pool;

  constructor() {
    this.pgDb = pgPool;
  }

  private get db(): Db {
    return mongoClient.db(process.env.MONGO_DB || 'givemejobs_docs');
  }

  /**
   * Generate a tailored resume for a specific job
   */
  async generateResume(params: {
    userId: string;
    jobId: string;
    templateId?: string;
    customizations?: {
      tone?: 'professional' | 'casual' | 'enthusiastic';
      length?: 'concise' | 'standard' | 'detailed';
      focusAreas?: string[];
    };
  }): Promise<GeneratedDocument> {
    const startTime = Date.now();

    try {
      // 1. Fetch job details
      const job = await jobService.getJobById(params.jobId);
      if (!job) {
        throw new Error('Job not found');
      }

      // 2. Fetch user profile
      const userProfile = await this.getUserProfile(params.userId);
      if (!userProfile) {
        throw new Error('User profile not found');
      }

      // 3. Extract job requirements using AI
      const jobRequirements = await aiService.extractJobRequirements(job.description);

      // 4. Generate resume content using AI
      const aiContent = await aiService.generateResumeContent({
        jobDescription: job.description,
        jobTitle: job.title,
        company: job.company,
        userProfile,
        tone: params.customizations?.tone,
        length: params.customizations?.length,
        focusAreas: params.customizations?.focusAreas,
      });

      // 5. Get template (use default if not specified)
      let template;
      if (params.templateId) {
        template = await documentTemplateService.getResumeTemplate(params.templateId);
      }
      
      if (!template) {
        // Get default ATS-friendly template
        const publicTemplates = await documentTemplateService.getPublicResumeTemplates('ats-friendly');
        template = publicTemplates[0];
      }

      if (!template) {
        throw new Error('No template available');
      }

      // 6. Apply template formatting to AI-generated content
      const content = this.formatResumeContent(aiContent, userProfile, template);

      // 7. Store generated document
      const generationTime = Date.now() - startTime;
      const document = await this.storeGeneratedDocument({
        userId: params.userId,
        jobId: params.jobId,
        documentType: 'resume',
        title: `Resume - ${job.title} at ${job.company}`,
        content,
        templateId: template._id!,
        metadata: {
          wordCount: this.calculateWordCount(content),
          keywordsUsed: aiContent.keywords,
          generationTime,
        },
      });

      return document;
    } catch (error) {
      console.error('Error generating resume:', error);
      throw error;
    }
  }

  /**
   * Generate a tailored cover letter for a specific job
   */
  async generateCoverLetter(params: {
    userId: string;
    jobId: string;
    templateId?: string;
    customizations?: {
      tone?: 'professional' | 'casual' | 'enthusiastic';
    };
  }): Promise<GeneratedDocument> {
    const startTime = Date.now();

    try {
      // 1. Fetch job details
      const job = await jobService.getJobById(params.jobId);
      if (!job) {
        throw new Error('Job not found');
      }

      // 2. Fetch user profile
      const userProfile = await this.getUserProfile(params.userId);
      if (!userProfile) {
        throw new Error('User profile not found');
      }

      // 3. Generate cover letter content using AI
      const aiContent = await aiService.generateCoverLetterContent({
        jobDescription: job.description,
        jobTitle: job.title,
        company: job.company,
        companyInfo: job.industry, // Could be enhanced with more company research
        userProfile,
        tone: params.customizations?.tone,
      });

      // 4. Get template (use default if not specified)
      let template;
      if (params.templateId) {
        template = await documentTemplateService.getCoverLetterTemplate(params.templateId);
      }
      
      if (!template) {
        // Get default professional template
        const publicTemplates = await documentTemplateService.getPublicCoverLetterTemplates('professional');
        template = publicTemplates[0];
      }

      if (!template) {
        throw new Error('No template available');
      }

      // 5. Apply template formatting to AI-generated content
      const content = this.formatCoverLetterContent(aiContent, userProfile, template);

      // 6. Store generated document
      const generationTime = Date.now() - startTime;
      const document = await this.storeGeneratedDocument({
        userId: params.userId,
        jobId: params.jobId,
        documentType: 'cover-letter',
        title: `Cover Letter - ${job.title} at ${job.company}`,
        content,
        templateId: template._id!,
        metadata: {
          wordCount: this.calculateWordCount(content),
          keywordsUsed: aiContent.keywords,
          generationTime,
        },
      });

      return document;
    } catch (error) {
      console.error('Error generating cover letter:', error);
      throw error;
    }
  }

  /**
   * Get user profile with all necessary data
   */
  private async getUserProfile(userId: string): Promise<any> {
    // Fetch user basic info
    const userQuery = `
      SELECT id, first_name, last_name, email, professional_headline
      FROM users
      WHERE id = $1
    `;
    const userResult = await this.pgDb.query(userQuery, [userId]);
    
    if (userResult.rows.length === 0) {
      return null;
    }

    const user = userResult.rows[0];

    // Fetch user profile
    const profileQuery = `
      SELECT phone, location
      FROM user_profiles
      WHERE user_id = $1
    `;
    const profileResult = await this.pgDb.query(profileQuery, [userId]);
    const profile = profileResult.rows[0] || {};

    // Fetch skills
    const skillsQuery = `
      SELECT name, category, proficiency_level, years_of_experience
      FROM skills
      WHERE user_id = $1
      ORDER BY proficiency_level DESC, years_of_experience DESC
    `;
    const skillsResult = await this.pgDb.query(skillsQuery, [userId]);

    // Fetch experience
    const experienceQuery = `
      SELECT company, title, start_date, end_date, current, description, achievements
      FROM experience
      WHERE user_id = $1
      ORDER BY start_date DESC
    `;
    const experienceResult = await this.pgDb.query(experienceQuery, [userId]);

    // Fetch education
    const educationQuery = `
      SELECT institution, degree, field_of_study, start_date, end_date, gpa
      FROM education
      WHERE user_id = $1
      ORDER BY start_date DESC
    `;
    const educationResult = await this.pgDb.query(educationQuery, [userId]);

    return {
      name: `${user.first_name} ${user.last_name}`,
      email: user.email,
      phone: profile.phone,
      location: profile.location,
      professionalHeadline: user.professional_headline,
      skills: skillsResult.rows.map((s) => ({
        name: s.name,
        category: s.category,
        proficiencyLevel: s.proficiency_level,
        yearsOfExperience: s.years_of_experience,
      })),
      experience: experienceResult.rows.map((e) => ({
        company: e.company,
        title: e.title,
        startDate: e.start_date,
        endDate: e.end_date,
        current: e.current,
        description: e.description,
        achievements: e.achievements || [],
      })),
      education: educationResult.rows.map((e) => ({
        institution: e.institution,
        degree: e.degree,
        fieldOfStudy: e.field_of_study,
        startDate: e.start_date,
        endDate: e.end_date,
        gpa: e.gpa,
      })),
    };
  }

  /**
   * Format resume content according to template
   */
  private formatResumeContent(aiContent: any, userProfile: any, template: any): DocumentContent {
    const sections: DocumentSection[] = [];

    // Header section
    sections.push({
      type: 'header',
      title: 'Contact Information',
      content: {
        name: userProfile.name,
        email: userProfile.email,
        phone: userProfile.phone,
        location: userProfile.location,
        headline: userProfile.professionalHeadline,
      },
      order: 1,
    });

    // Summary section
    sections.push({
      type: 'summary',
      title: 'Professional Summary',
      content: aiContent.summary,
      order: 2,
    });

    // Experience section
    sections.push({
      type: 'experience',
      title: 'Work Experience',
      content: {
        items: aiContent.experience,
      },
      order: 3,
    });

    // Education section
    sections.push({
      type: 'education',
      title: 'Education',
      content: {
        items: userProfile.education.map((e: any) => ({
          institution: e.institution,
          degree: e.degree,
          fieldOfStudy: e.fieldOfStudy,
          period: this.formatDateRange(e.startDate, e.endDate, false),
          gpa: e.gpa,
        })),
      },
      order: 4,
    });

    // Skills section
    sections.push({
      type: 'skills',
      title: 'Skills',
      content: {
        skills: aiContent.skills,
      },
      order: 5,
    });

    return {
      sections,
      formatting: {
        fontFamily: template.styling.fontFamily,
        fontSize: template.styling.fontSize,
        lineHeight: 1.5,
        margins: {
          top: template.styling.spacing.margin,
          right: template.styling.spacing.margin,
          bottom: template.styling.spacing.margin,
          left: template.styling.spacing.margin,
        },
      },
    };
  }

  /**
   * Format cover letter content according to template
   */
  private formatCoverLetterContent(aiContent: any, userProfile: any, template: any): DocumentContent {
    const sections: DocumentSection[] = [];

    // Header section
    sections.push({
      type: 'header',
      title: 'Contact Information',
      content: {
        name: userProfile.name,
        email: userProfile.email,
        phone: userProfile.phone,
        location: userProfile.location,
      },
      order: 1,
    });

    // Opening section
    sections.push({
      type: 'custom',
      title: 'Opening',
      content: aiContent.opening,
      order: 2,
    });

    // Body sections
    aiContent.body.forEach((paragraph: string, index: number) => {
      sections.push({
        type: 'custom',
        title: `Body ${index + 1}`,
        content: paragraph,
        order: 3 + index,
      });
    });

    // Closing section
    sections.push({
      type: 'custom',
      title: 'Closing',
      content: aiContent.closing,
      order: 3 + aiContent.body.length,
    });

    // Signature
    sections.push({
      type: 'custom',
      title: 'Signature',
      content: `Sincerely,\n${userProfile.name}`,
      order: 4 + aiContent.body.length,
    });

    return {
      sections,
      formatting: {
        fontFamily: 'Arial',
        fontSize: 11,
        lineHeight: 1.6,
        margins: {
          top: 25,
          right: 25,
          bottom: 25,
          left: 25,
        },
      },
    };
  }

  /**
   * Store generated document in MongoDB
   */
  private async storeGeneratedDocument(data: {
    userId: string;
    jobId: string;
    documentType: 'resume' | 'cover-letter';
    title: string;
    content: DocumentContent;
    templateId: string;
    metadata: {
      wordCount: number;
      keywordsUsed: string[];
      generationTime: number;
    };
  }): Promise<GeneratedDocument> {
    const collection = this.db.collection<GeneratedDocument>('generated_documents');

    const now = new Date();
    const document: GeneratedDocument = {
      ...data,
      version: 1,
      createdAt: now,
      updatedAt: now,
    };

    const result = await collection.insertOne(document as any);

    return {
      ...document,
      _id: result.insertedId.toString(),
    };
  }

  /**
   * Calculate word count in document content
   */
  private calculateWordCount(content: DocumentContent): number {
    let wordCount = 0;

    content.sections.forEach((section) => {
      if (typeof section.content === 'string') {
        wordCount += section.content.split(/\s+/).length;
      } else if (typeof section.content === 'object') {
        wordCount += JSON.stringify(section.content).split(/\s+/).length;
      }
    });

    return wordCount;
  }

  /**
   * Get a generated document by ID
   */
  async getDocument(documentId: string, userId: string): Promise<GeneratedDocument | null> {
    const collection = this.db.collection<GeneratedDocument>('generated_documents');

    try {
      const document = await collection.findOne({
        _id: new ObjectId(documentId),
        userId,
      } as any);

      if (!document) {
        return null;
      }

      return {
        ...document,
        _id: document._id?.toString(),
      };
    } catch (error) {
      console.error('Error fetching document:', error);
      return null;
    }
  }

  /**
   * Get all documents for a user
   */
  async getUserDocuments(
    userId: string,
    filters?: {
      documentType?: 'resume' | 'cover-letter';
      jobId?: string;
    }
  ): Promise<GeneratedDocument[]> {
    const collection = this.db.collection<GeneratedDocument>('generated_documents');

    const query: any = { userId };
    
    if (filters?.documentType) {
      query.documentType = filters.documentType;
    }
    
    if (filters?.jobId) {
      query.jobId = filters.jobId;
    }

    const documents = await collection
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    return documents.map((d) => ({
      ...d,
      _id: d._id?.toString(),
    }));
  }

  /**
   * Update a generated document
   */
  async updateDocument(
    documentId: string,
    userId: string,
    updates: {
      title?: string;
      content?: DocumentContent;
      changes?: string;
    }
  ): Promise<GeneratedDocument | null> {
    const collection = this.db.collection<GeneratedDocument>('generated_documents');
    const versionsCollection = this.db.collection('document_versions');

    try {
      // Get current document
      const currentDoc = await this.getDocument(documentId, userId);
      
      if (!currentDoc) {
        return null;
      }

      // Create version snapshot before updating
      await versionsCollection.insertOne({
        documentId,
        userId,
        version: currentDoc.version,
        content: currentDoc.content,
        changes: updates.changes || 'Manual edit',
        createdAt: new Date(),
      });

      // Update document
      const updateData: any = {
        updatedAt: new Date(),
        version: currentDoc.version + 1,
      };

      if (updates.title) {
        updateData.title = updates.title;
      }

      if (updates.content) {
        updateData.content = updates.content;
        updateData['metadata.wordCount'] = this.calculateWordCount(updates.content);
      }

      const result = await collection.findOneAndUpdate(
        { _id: new ObjectId(documentId), userId } as any,
        { $set: updateData },
        { returnDocument: 'after' }
      );

      if (!result) {
        return null;
      }

      return {
        ...result,
        _id: result._id?.toString(),
      };
    } catch (error) {
      console.error('Error updating document:', error);
      return null;
    }
  }

  /**
   * Get document version history
   */
  async getDocumentVersions(documentId: string, userId: string): Promise<any[]> {
    const versionsCollection = this.db.collection('document_versions');

    const versions = await versionsCollection
      .find({ documentId, userId })
      .sort({ version: -1 })
      .toArray();

    return versions.map((v) => ({
      ...v,
      _id: v._id?.toString(),
    }));
  }

  /**
   * Restore a document to a previous version
   */
  async restoreDocumentVersion(
    documentId: string,
    userId: string,
    version: number
  ): Promise<GeneratedDocument | null> {
    const versionsCollection = this.db.collection('document_versions');

    try {
      // Get the version to restore
      const versionDoc = await versionsCollection.findOne({
        documentId,
        userId,
        version,
      });

      if (!versionDoc) {
        throw new Error('Version not found');
      }

      // Update document with version content
      return await this.updateDocument(documentId, userId, {
        content: versionDoc.content,
        changes: `Restored to version ${version}`,
      });
    } catch (error) {
      console.error('Error restoring document version:', error);
      return null;
    }
  }

  /**
   * Delete a generated document
   */
  async deleteDocument(documentId: string, userId: string): Promise<boolean> {
    const collection = this.db.collection<GeneratedDocument>('generated_documents');
    const versionsCollection = this.db.collection('document_versions');

    try {
      // Delete document
      const result = await collection.deleteOne({
        _id: new ObjectId(documentId),
        userId,
      } as any);

      // Delete all versions
      if (result.deletedCount > 0) {
        await versionsCollection.deleteMany({ documentId, userId });
      }

      return result.deletedCount > 0;
    } catch (error) {
      console.error('Error deleting document:', error);
      return false;
    }
  }

  /**
   * Format date range for display
   */
  private formatDateRange(startDate: Date, endDate: Date | undefined, current: boolean): string {
    const start = new Date(startDate);
    const startStr = `${start.toLocaleString('en-US', { month: 'short' })} ${start.getFullYear()}`;
    
    if (current) {
      return `${startStr} - Present`;
    }
    
    if (endDate) {
      const end = new Date(endDate);
      const endStr = `${end.toLocaleString('en-US', { month: 'short' })} ${end.getFullYear()}`;
      return `${startStr} - ${endStr}`;
    }
    
    return startStr;
  }
}

export const documentGenerationService = new DocumentGenerationService();
