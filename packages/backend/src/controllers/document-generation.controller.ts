import { Request, Response } from 'express';
import { documentGenerationService } from '../services/document-generation.service';
import { documentExportService } from '../services/document-export.service';
import { aiService } from '../services/ai.service';

export class DocumentGenerationController {
  /**
   * Generate a tailored resume for a job
   */
  async generateResume(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.jwtPayload?.userId;
      
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      // Check if AI service is configured
      if (!aiService.isConfigured()) {
        res.status(503).json({
          success: false,
          message: 'AI service is not configured. Please set OPENAI_API_KEY.',
        });
        return;
      }

      const { jobId, templateId, customizations } = req.body;

      if (!jobId) {
        res.status(400).json({
          success: false,
          message: 'Job ID is required',
        });
        return;
      }

      const document = await documentGenerationService.generateResume({
        userId,
        jobId,
        templateId,
        customizations,
      });

      res.status(201).json({
        success: true,
        data: document,
        message: 'Resume generated successfully',
      });
    } catch (error: any) {
      console.error('Error generating resume:', error);
      
      if (error.message === 'Job not found') {
        res.status(404).json({
          success: false,
          message: 'Job not found',
        });
        return;
      }

      if (error.message === 'User profile not found') {
        res.status(404).json({
          success: false,
          message: 'User profile not found. Please complete your profile first.',
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Failed to generate resume',
        error: error.message,
      });
    }
  }

  /**
   * Generate a tailored cover letter for a job
   */
  async generateCoverLetter(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.jwtPayload?.userId;
      
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      // Check if AI service is configured
      if (!aiService.isConfigured()) {
        res.status(503).json({
          success: false,
          message: 'AI service is not configured. Please set OPENAI_API_KEY.',
        });
        return;
      }

      const { jobId, templateId, customizations } = req.body;

      if (!jobId) {
        res.status(400).json({
          success: false,
          message: 'Job ID is required',
        });
        return;
      }

      const document = await documentGenerationService.generateCoverLetter({
        userId,
        jobId,
        templateId,
        customizations,
      });

      res.status(201).json({
        success: true,
        data: document,
        message: 'Cover letter generated successfully',
      });
    } catch (error: any) {
      console.error('Error generating cover letter:', error);
      
      if (error.message === 'Job not found') {
        res.status(404).json({
          success: false,
          message: 'Job not found',
        });
        return;
      }

      if (error.message === 'User profile not found') {
        res.status(404).json({
          success: false,
          message: 'User profile not found. Please complete your profile first.',
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Failed to generate cover letter',
        error: error.message,
      });
    }
  }

  /**
   * Get a specific document
   */
  async getDocument(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.jwtPayload?.userId;
      const { documentId } = req.params;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const document = await documentGenerationService.getDocument(documentId, userId);

      if (!document) {
        res.status(404).json({
          success: false,
          message: 'Document not found',
        });
        return;
      }

      res.json({
        success: true,
        data: document,
      });
    } catch (error: any) {
      console.error('Error fetching document:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch document',
        error: error.message,
      });
    }
  }

  /**
   * Get all documents for the authenticated user
   */
  async getUserDocuments(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.jwtPayload?.userId;
      const { documentType, jobId } = req.query;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const documents = await documentGenerationService.getUserDocuments(userId, {
        documentType: documentType as 'resume' | 'cover-letter' | undefined,
        jobId: jobId as string | undefined,
      });

      res.json({
        success: true,
        data: documents,
      });
    } catch (error: any) {
      console.error('Error fetching user documents:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch documents',
        error: error.message,
      });
    }
  }

  /**
   * Update a document
   */
  async updateDocument(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.jwtPayload?.userId;
      const { documentId } = req.params;
      const { title, content, changes } = req.body;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const document = await documentGenerationService.updateDocument(documentId, userId, {
        title,
        content,
        changes,
      });

      if (!document) {
        res.status(404).json({
          success: false,
          message: 'Document not found',
        });
        return;
      }

      res.json({
        success: true,
        data: document,
        message: 'Document updated successfully',
      });
    } catch (error: any) {
      console.error('Error updating document:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update document',
        error: error.message,
      });
    }
  }

  /**
   * Get document version history
   */
  async getDocumentVersions(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.jwtPayload?.userId;
      const { documentId } = req.params;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const versions = await documentGenerationService.getDocumentVersions(documentId, userId);

      res.json({
        success: true,
        data: versions,
      });
    } catch (error: any) {
      console.error('Error fetching document versions:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch document versions',
        error: error.message,
      });
    }
  }

  /**
   * Restore a document to a previous version
   */
  async restoreDocumentVersion(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.jwtPayload?.userId;
      const { documentId } = req.params;
      const { version } = req.body;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      if (!version || typeof version !== 'number') {
        res.status(400).json({
          success: false,
          message: 'Version number is required',
        });
        return;
      }

      const document = await documentGenerationService.restoreDocumentVersion(
        documentId,
        userId,
        version
      );

      if (!document) {
        res.status(404).json({
          success: false,
          message: 'Document or version not found',
        });
        return;
      }

      res.json({
        success: true,
        data: document,
        message: 'Document restored successfully',
      });
    } catch (error: any) {
      console.error('Error restoring document version:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to restore document version',
        error: error.message,
      });
    }
  }

  /**
   * Delete a document
   */
  async deleteDocument(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.jwtPayload?.userId;
      const { documentId } = req.params;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const deleted = await documentGenerationService.deleteDocument(documentId, userId);

      if (!deleted) {
        res.status(404).json({
          success: false,
          message: 'Document not found',
        });
        return;
      }

      res.json({
        success: true,
        message: 'Document deleted successfully',
      });
    } catch (error: any) {
      console.error('Error deleting document:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete document',
        error: error.message,
      });
    }
  }

  /**
   * Export document to specified format
   */
  async exportDocument(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.jwtPayload?.userId;
      const { documentId } = req.params;
      const { format } = req.query;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      if (!format || !['pdf', 'docx', 'txt'].includes(format as string)) {
        res.status(400).json({
          success: false,
          message: 'Invalid format. Supported formats: pdf, docx, txt',
        });
        return;
      }

      // Get the document
      const document = await documentGenerationService.getDocument(documentId, userId);

      if (!document) {
        res.status(404).json({
          success: false,
          message: 'Document not found',
        });
        return;
      }

      // Generate filename
      const sanitizedTitle = document.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const filename = `${sanitizedTitle}.${format}`;

      // Export based on format
      if (format === 'pdf') {
        const pdfBuffer = await documentExportService.exportToPDF(document);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(pdfBuffer);
      } else if (format === 'docx') {
        const docxBuffer = await documentExportService.exportToDOCX(document);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(docxBuffer);
      } else if (format === 'txt') {
        const text = documentExportService.exportToText(document);
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(text);
      }
    } catch (error: any) {
      console.error('Error exporting document:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to export document',
        error: error.message,
      });
    }
  }
}

export const documentGenerationController = new DocumentGenerationController();
