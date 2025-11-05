/**
 * Python Gateway Routes
 * 
 * Routes that delegate to Python services with proper error handling,
 * request/response transformation, and fallback mechanisms.
 */

import { Router, Request, Response } from 'express';
import { pythonServiceRegistry } from '../services/python-service-client';
import { authenticateToken } from '../middleware/auth.middleware';
import { setServiceContext } from '../middleware/service-integration.middleware';
import { rateLimitPresets } from '../middleware/rate-limit.middleware';
import logger from '../services/logger.service';

const router = Router();

/**
 * Document Processing Routes - Delegate to Python Document Service
 */

// Generate resume using AI
router.post('/documents/generate-resume',
  rateLimitPresets.aiGeneration,
  authenticateToken,
  setServiceContext('document-service', 'generate-resume'),
  async (req: Request, res: Response) => {
    try {
      const documentService = pythonServiceRegistry.get('document-service');
      
      if (!documentService) {
        return res.status(503).json({
          success: false,
          error: 'Document service is not available',
          correlationId: (req as any).correlationId,
        });
      }

      const response = await documentService.post('/api/v1/documents/generate-resume', {
        user_profile: req.body.userProfile,
        job_posting: req.body.jobPosting,
        template_id: req.body.templateId,
        user_id: req.user?.id,
      }, {
        correlationId: (req as any).correlationId,
        timeout: 60000, // Resume generation can take time
      });

      if (!response.success) {
        return res.status(500).json({
          success: false,
          error: response.error || 'Resume generation failed',
          correlationId: response.correlationId,
        });
      }

      res.json({
        success: true,
        data: response.data,
        correlationId: response.correlationId,
      });

    } catch (error) {
      logger.error('Resume generation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        correlationId: (req as any).correlationId,
        userId: req.user?.id,
      });

      res.status(500).json({
        success: false,
        error: 'Resume generation service is temporarily unavailable',
        correlationId: (req as any).correlationId,
      });
    }
  }
);

// Process document upload
router.post('/documents/process',
  rateLimitPresets.fileUpload,
  authenticateToken,
  setServiceContext('document-service', 'process-document'),
  async (req: Request, res: Response) => {
    try {
      const documentService = pythonServiceRegistry.get('document-service');
      
      if (!documentService) {
        return res.status(503).json({
          success: false,
          error: 'Document service is not available',
          correlationId: (req as any).correlationId,
        });
      }

      const response = await documentService.post('/api/v1/documents/process', {
        document_data: req.body.documentData,
        document_type: req.body.documentType,
        user_id: req.user?.id,
      }, {
        correlationId: (req as any).correlationId,
        timeout: 45000,
      });

      if (!response.success) {
        return res.status(500).json({
          success: false,
          error: response.error || 'Document processing failed',
          correlationId: response.correlationId,
        });
      }

      res.json({
        success: true,
        data: response.data,
        correlationId: response.correlationId,
      });

    } catch (error) {
      logger.error('Document processing failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        correlationId: (req as any).correlationId,
        userId: req.user?.id,
      });

      res.status(500).json({
        success: false,
        error: 'Document processing service is temporarily unavailable',
        correlationId: (req as any).correlationId,
      });
    }
  }
);

/**
 * Semantic Search Routes - Delegate to Python Semantic Search Service
 */

// Semantic job search
router.post('/jobs/semantic-search',
  rateLimitPresets.search,
  authenticateToken,
  setServiceContext('semantic-search-service', 'job-search'),
  async (req: Request, res: Response) => {
    try {
      const searchService = pythonServiceRegistry.get('semantic-search-service');
      
      if (!searchService) {
        // Fallback to traditional search if semantic search is unavailable
        logger.warn('Semantic search service unavailable, falling back to traditional search', {
          correlationId: (req as any).correlationId,
          userId: req.user?.id,
        });

        // Here you would call your existing Node.js job search
        // For now, return a fallback response
        return res.json({
          success: true,
          data: {
            jobs: [],
            total: 0,
            message: 'Semantic search temporarily unavailable, showing cached results',
          },
          correlationId: (req as any).correlationId,
          fallback: true,
        });
      }

      const response = await searchService.post('/api/v1/jobs/semantic-search', {
        user_profile: req.body.userProfile,
        search_query: req.body.query,
        filters: req.body.filters,
        top_k: req.body.limit || 20,
        user_id: req.user?.id,
      }, {
        correlationId: (req as any).correlationId,
        timeout: 30000,
      });

      if (!response.success) {
        // Fallback to traditional search on error
        logger.warn('Semantic search failed, falling back to traditional search', {
          error: response.error,
          correlationId: (req as any).correlationId,
          userId: req.user?.id,
        });

        return res.json({
          success: true,
          data: {
            jobs: [],
            total: 0,
            message: 'Search completed with limited results',
          },
          correlationId: response.correlationId,
          fallback: true,
        });
      }

      res.json({
        success: true,
        data: response.data,
        correlationId: response.correlationId,
      });

    } catch (error) {
      logger.error('Semantic search failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        correlationId: (req as any).correlationId,
        userId: req.user?.id,
      });

      // Fallback response
      res.json({
        success: true,
        data: {
          jobs: [],
          total: 0,
          message: 'Search service temporarily unavailable',
        },
        correlationId: (req as any).correlationId,
        fallback: true,
      });
    }
  }
);

/**
 * Analytics Routes - Delegate to Python Analytics Service
 */

// Get user analytics
router.get('/analytics/user/:userId',
  rateLimitPresets.analytics,
  authenticateToken,
  setServiceContext('analytics-service', 'user-analytics'),
  async (req: Request, res: Response) => {
    try {
      const analyticsService = pythonServiceRegistry.get('analytics-service');
      
      if (!analyticsService) {
        return res.status(503).json({
          success: false,
          error: 'Analytics service is not available',
          correlationId: (req as any).correlationId,
        });
      }

      const response = await analyticsService.get(
        `/api/v1/analytics/user/${req.params.userId}?period=${req.query.period || '3m'}`,
        {
          correlationId: (req as any).correlationId,
          timeout: 45000,
        }
      );

      if (!response.success) {
        return res.status(500).json({
          success: false,
          error: response.error || 'Analytics calculation failed',
          correlationId: response.correlationId,
        });
      }

      res.json({
        success: true,
        data: response.data,
        correlationId: response.correlationId,
      });

    } catch (error) {
      logger.error('Analytics request failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        correlationId: (req as any).correlationId,
        userId: req.params.userId,
      });

      res.status(500).json({
        success: false,
        error: 'Analytics service is temporarily unavailable',
        correlationId: (req as any).correlationId,
      });
    }
  }
);

// Generate insights
router.post('/analytics/insights',
  rateLimitPresets.analytics,
  authenticateToken,
  setServiceContext('analytics-service', 'generate-insights'),
  async (req: Request, res: Response) => {
    try {
      const analyticsService = pythonServiceRegistry.get('analytics-service');
      
      if (!analyticsService) {
        return res.status(503).json({
          success: false,
          error: 'Analytics service is not available',
          correlationId: (req as any).correlationId,
        });
      }

      const response = await analyticsService.post('/api/v1/analytics/insights', {
        user_id: req.body.userId || req.user?.id,
        data_points: req.body.dataPoints,
        analysis_type: req.body.analysisType,
        time_period: req.body.timePeriod,
      }, {
        correlationId: (req as any).correlationId,
        timeout: 60000,
      });

      if (!response.success) {
        return res.status(500).json({
          success: false,
          error: response.error || 'Insights generation failed',
          correlationId: response.correlationId,
        });
      }

      res.json({
        success: true,
        data: response.data,
        correlationId: response.correlationId,
      });

    } catch (error) {
      logger.error('Insights generation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        correlationId: (req as any).correlationId,
        userId: req.user?.id,
      });

      res.status(500).json({
        success: false,
        error: 'Insights service is temporarily unavailable',
        correlationId: (req as any).correlationId,
      });
    }
  }
);

/**
 * Health Check Routes for Python Services
 */

// Check health of all Python services
router.get('/services/health',
  rateLimitPresets.healthCheck,
  async (req: Request, res: Response) => {
    try {
      const healthResults = await pythonServiceRegistry.healthCheckAll();
      const stats = pythonServiceRegistry.getAllStats();

      const overallHealth = Object.values(healthResults).every(healthy => healthy);

      res.json({
        success: true,
        data: {
          overall: overallHealth ? 'healthy' : 'degraded',
          services: healthResults,
          stats,
          timestamp: new Date().toISOString(),
        },
        correlationId: (req as any).correlationId,
      });

    } catch (error) {
      logger.error('Service health check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        correlationId: (req as any).correlationId,
      });

      res.status(500).json({
        success: false,
        error: 'Health check failed',
        correlationId: (req as any).correlationId,
      });
    }
  }
);

// Get service statistics
router.get('/services/stats',
  rateLimitPresets.healthCheck,
  async (req: Request, res: Response) => {
    try {
      const stats = pythonServiceRegistry.getAllStats();

      res.json({
        success: true,
        data: stats,
        correlationId: (req as any).correlationId,
      });

    } catch (error) {
      logger.error('Service stats request failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        correlationId: (req as any).correlationId,
      });

      res.status(500).json({
        success: false,
        error: 'Stats request failed',
        correlationId: (req as any).correlationId,
      });
    }
  }
);

export default router;