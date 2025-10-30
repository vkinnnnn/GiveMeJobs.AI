import { Request, Response } from 'express';
import { documentTemplateService } from '../services/document-template.service';

export class DocumentTemplateController {
  // ==================== Resume Templates ====================

  async createResumeTemplate(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.jwtPayload?.userId;
      const { name, description, category, sections, styling, isPublic } = req.body;

      const template = await documentTemplateService.createResumeTemplate({
        name,
        description,
        category,
        sections,
        styling,
        isPublic: isPublic || false,
        userId,
      });

      res.status(201).json({
        success: true,
        data: template,
      });
    } catch (error: any) {
      console.error('Error creating resume template:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create resume template',
        error: error.message,
      });
    }
  }

  async getResumeTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { templateId } = req.params;

      const template = await documentTemplateService.getResumeTemplate(templateId);

      if (!template) {
        res.status(404).json({
          success: false,
          message: 'Resume template not found',
        });
        return;
      }

      res.json({
        success: true,
        data: template,
      });
    } catch (error: any) {
      console.error('Error fetching resume template:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch resume template',
        error: error.message,
      });
    }
  }

  async getResumeTemplates(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.jwtPayload?.userId;
      const { category, scope } = req.query;

      let templates;

      if (scope === 'user' && userId) {
        templates = await documentTemplateService.getUserResumeTemplates(userId);
      } else {
        templates = await documentTemplateService.getPublicResumeTemplates(
          category as string | undefined
        );
      }

      res.json({
        success: true,
        data: templates,
      });
    } catch (error: any) {
      console.error('Error fetching resume templates:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch resume templates',
        error: error.message,
      });
    }
  }

  async updateResumeTemplate(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.jwtPayload?.userId;
      const { templateId } = req.params;
      const updates = req.body;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const template = await documentTemplateService.updateResumeTemplate(
        templateId,
        userId,
        updates
      );

      if (!template) {
        res.status(404).json({
          success: false,
          message: 'Resume template not found or unauthorized',
        });
        return;
      }

      res.json({
        success: true,
        data: template,
      });
    } catch (error: any) {
      console.error('Error updating resume template:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update resume template',
        error: error.message,
      });
    }
  }

  async deleteResumeTemplate(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.jwtPayload?.userId;
      const { templateId } = req.params;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const deleted = await documentTemplateService.deleteResumeTemplate(templateId, userId);

      if (!deleted) {
        res.status(404).json({
          success: false,
          message: 'Resume template not found or unauthorized',
        });
        return;
      }

      res.json({
        success: true,
        message: 'Resume template deleted successfully',
      });
    } catch (error: any) {
      console.error('Error deleting resume template:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete resume template',
        error: error.message,
      });
    }
  }

  // ==================== Cover Letter Templates ====================

  async createCoverLetterTemplate(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.jwtPayload?.userId;
      const { name, description, structure, tone, isPublic } = req.body;

      const template = await documentTemplateService.createCoverLetterTemplate({
        name,
        description,
        structure,
        tone,
        isPublic: isPublic || false,
        userId,
      });

      res.status(201).json({
        success: true,
        data: template,
      });
    } catch (error: any) {
      console.error('Error creating cover letter template:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create cover letter template',
        error: error.message,
      });
    }
  }

  async getCoverLetterTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { templateId } = req.params;

      const template = await documentTemplateService.getCoverLetterTemplate(templateId);

      if (!template) {
        res.status(404).json({
          success: false,
          message: 'Cover letter template not found',
        });
        return;
      }

      res.json({
        success: true,
        data: template,
      });
    } catch (error: any) {
      console.error('Error fetching cover letter template:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch cover letter template',
        error: error.message,
      });
    }
  }

  async getCoverLetterTemplates(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.jwtPayload?.userId;
      const { tone, scope } = req.query;

      let templates;

      if (scope === 'user' && userId) {
        templates = await documentTemplateService.getUserCoverLetterTemplates(userId);
      } else {
        templates = await documentTemplateService.getPublicCoverLetterTemplates(
          tone as string | undefined
        );
      }

      res.json({
        success: true,
        data: templates,
      });
    } catch (error: any) {
      console.error('Error fetching cover letter templates:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch cover letter templates',
        error: error.message,
      });
    }
  }

  async updateCoverLetterTemplate(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.jwtPayload?.userId;
      const { templateId } = req.params;
      const updates = req.body;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const template = await documentTemplateService.updateCoverLetterTemplate(
        templateId,
        userId,
        updates
      );

      if (!template) {
        res.status(404).json({
          success: false,
          message: 'Cover letter template not found or unauthorized',
        });
        return;
      }

      res.json({
        success: true,
        data: template,
      });
    } catch (error: any) {
      console.error('Error updating cover letter template:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update cover letter template',
        error: error.message,
      });
    }
  }

  async deleteCoverLetterTemplate(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.jwtPayload?.userId;
      const { templateId } = req.params;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const deleted = await documentTemplateService.deleteCoverLetterTemplate(templateId, userId);

      if (!deleted) {
        res.status(404).json({
          success: false,
          message: 'Cover letter template not found or unauthorized',
        });
        return;
      }

      res.json({
        success: true,
        message: 'Cover letter template deleted successfully',
      });
    } catch (error: any) {
      console.error('Error deleting cover letter template:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete cover letter template',
        error: error.message,
      });
    }
  }
}

export const documentTemplateController = new DocumentTemplateController();
