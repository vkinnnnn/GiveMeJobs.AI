import { Db, ObjectId } from 'mongodb';
import { mongoClient } from '../config/database';
import {
  ResumeTemplate,
  CoverLetterTemplate,
} from '../config/mongodb-schemas';

/**
 * Document Template Service
 * Manages resume and cover letter templates in MongoDB
 */
export class DocumentTemplateService {
  private get db(): Db {
    return mongoClient.db(process.env.MONGO_DB || 'givemejobs_docs');
  }

  // ==================== Resume Templates ====================

  /**
   * Create a new resume template
   */
  async createResumeTemplate(
    template: Omit<ResumeTemplate, '_id' | 'createdAt' | 'updatedAt'>
  ): Promise<ResumeTemplate> {
    const collection = this.db.collection<ResumeTemplate>('resume_templates');

    const now = new Date();
    const newTemplate: ResumeTemplate = {
      ...template,
      createdAt: now,
      updatedAt: now,
    };

    const result = await collection.insertOne(newTemplate as any);
    
    return {
      ...newTemplate,
      _id: result.insertedId.toString(),
    };
  }

  /**
   * Get resume template by ID
   */
  async getResumeTemplate(templateId: string): Promise<ResumeTemplate | null> {
    const collection = this.db.collection<ResumeTemplate>('resume_templates');

    try {
      const template = await collection.findOne({ _id: new ObjectId(templateId) } as any);
      
      if (!template) {
        return null;
      }

      return {
        ...template,
        _id: template._id?.toString(),
      };
    } catch (error) {
      console.error('Error fetching resume template:', error);
      return null;
    }
  }

  /**
   * Get all public resume templates
   */
  async getPublicResumeTemplates(category?: string): Promise<ResumeTemplate[]> {
    const collection = this.db.collection<ResumeTemplate>('resume_templates');

    const filter: any = { isPublic: true };
    if (category) {
      filter.category = category;
    }

    const templates = await collection
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray();

    return templates.map((t) => ({
      ...t,
      _id: t._id?.toString(),
    }));
  }

  /**
   * Get user's custom resume templates
   */
  async getUserResumeTemplates(userId: string): Promise<ResumeTemplate[]> {
    const collection = this.db.collection<ResumeTemplate>('resume_templates');

    const templates = await collection
      .find({ userId, isPublic: false })
      .sort({ createdAt: -1 })
      .toArray();

    return templates.map((t) => ({
      ...t,
      _id: t._id?.toString(),
    }));
  }

  /**
   * Update resume template
   */
  async updateResumeTemplate(
    templateId: string,
    userId: string,
    updates: Partial<Omit<ResumeTemplate, '_id' | 'createdAt' | 'updatedAt' | 'userId'>>
  ): Promise<ResumeTemplate | null> {
    const collection = this.db.collection<ResumeTemplate>('resume_templates');

    try {
      const result = await collection.findOneAndUpdate(
        { 
          _id: new ObjectId(templateId),
          $or: [{ userId }, { isPublic: true }],
        } as any,
        {
          $set: {
            ...updates,
            updatedAt: new Date(),
          },
        },
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
      console.error('Error updating resume template:', error);
      return null;
    }
  }

  /**
   * Delete resume template
   */
  async deleteResumeTemplate(templateId: string, userId: string): Promise<boolean> {
    const collection = this.db.collection<ResumeTemplate>('resume_templates');

    try {
      const result = await collection.deleteOne({
        _id: new ObjectId(templateId),
        userId,
        isPublic: false, // Only allow deleting custom templates
      } as any);

      return result.deletedCount > 0;
    } catch (error) {
      console.error('Error deleting resume template:', error);
      return false;
    }
  }

  // ==================== Cover Letter Templates ====================

  /**
   * Create a new cover letter template
   */
  async createCoverLetterTemplate(
    template: Omit<CoverLetterTemplate, '_id' | 'createdAt' | 'updatedAt'>
  ): Promise<CoverLetterTemplate> {
    const collection = this.db.collection<CoverLetterTemplate>('cover_letter_templates');

    const now = new Date();
    const newTemplate: CoverLetterTemplate = {
      ...template,
      createdAt: now,
      updatedAt: now,
    };

    const result = await collection.insertOne(newTemplate as any);
    
    return {
      ...newTemplate,
      _id: result.insertedId.toString(),
    };
  }

  /**
   * Get cover letter template by ID
   */
  async getCoverLetterTemplate(templateId: string): Promise<CoverLetterTemplate | null> {
    const collection = this.db.collection<CoverLetterTemplate>('cover_letter_templates');

    try {
      const template = await collection.findOne({ _id: new ObjectId(templateId) } as any);
      
      if (!template) {
        return null;
      }

      return {
        ...template,
        _id: template._id?.toString(),
      };
    } catch (error) {
      console.error('Error fetching cover letter template:', error);
      return null;
    }
  }

  /**
   * Get all public cover letter templates
   */
  async getPublicCoverLetterTemplates(tone?: string): Promise<CoverLetterTemplate[]> {
    const collection = this.db.collection<CoverLetterTemplate>('cover_letter_templates');

    const filter: any = { isPublic: true };
    if (tone) {
      filter.tone = tone;
    }

    const templates = await collection
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray();

    return templates.map((t) => ({
      ...t,
      _id: t._id?.toString(),
    }));
  }

  /**
   * Get user's custom cover letter templates
   */
  async getUserCoverLetterTemplates(userId: string): Promise<CoverLetterTemplate[]> {
    const collection = this.db.collection<CoverLetterTemplate>('cover_letter_templates');

    const templates = await collection
      .find({ userId, isPublic: false })
      .sort({ createdAt: -1 })
      .toArray();

    return templates.map((t) => ({
      ...t,
      _id: t._id?.toString(),
    }));
  }

  /**
   * Update cover letter template
   */
  async updateCoverLetterTemplate(
    templateId: string,
    userId: string,
    updates: Partial<Omit<CoverLetterTemplate, '_id' | 'createdAt' | 'updatedAt' | 'userId'>>
  ): Promise<CoverLetterTemplate | null> {
    const collection = this.db.collection<CoverLetterTemplate>('cover_letter_templates');

    try {
      const result = await collection.findOneAndUpdate(
        { 
          _id: new ObjectId(templateId),
          $or: [{ userId }, { isPublic: true }],
        } as any,
        {
          $set: {
            ...updates,
            updatedAt: new Date(),
          },
        },
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
      console.error('Error updating cover letter template:', error);
      return null;
    }
  }

  /**
   * Delete cover letter template
   */
  async deleteCoverLetterTemplate(templateId: string, userId: string): Promise<boolean> {
    const collection = this.db.collection<CoverLetterTemplate>('cover_letter_templates');

    try {
      const result = await collection.deleteOne({
        _id: new ObjectId(templateId),
        userId,
        isPublic: false, // Only allow deleting custom templates
      } as any);

      return result.deletedCount > 0;
    } catch (error) {
      console.error('Error deleting cover letter template:', error);
      return false;
    }
  }
}

export const documentTemplateService = new DocumentTemplateService();
