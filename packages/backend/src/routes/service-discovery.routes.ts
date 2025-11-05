/**
 * Service Discovery and Load Balancing Routes
 * 
 * Routes for managing service discovery, load balancing,
 * and monitoring service health and performance.
 */

import { Router, Request, Response } from 'express';
import { serviceDiscoveryService } from '../services/service-discovery.service';
import { loadBalancerService } from '../services/load-balancer.service';
import { authenticateToken } from '../middleware/auth.middleware';
import { rateLimitPresets } from '../middleware/rate-limit.middleware';
import logger from '../services/logger.service';

const router = Router();

/**
 * Service Discovery Routes
 */

// Register a new service instance
router.post('/services/register',
  rateLimitPresets.auth,
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const correlationId = (req as any).correlationId;

      // Only allow admin users to register services
      if (req.user?.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Admin access required',
          correlationId,
        });
      }

      const {
        name,
        host,
        port,
        protocol = 'http',
        metadata = {},
        tags = [],
        weight = 100,
        healthCheckPath = '/health',
        healthCheckInterval = 30000,
      } = req.body;

      if (!name || !host || !port) {
        return res.status(400).json({
          success: false,
          error: 'Service name, host, and port are required',
          correlationId,
        });
      }

      const instanceId = serviceDiscoveryService.registerService({
        name,
        host,
        port,
        protocol,
        metadata,
        tags,
        weight,
        healthCheckPath,
        healthCheckInterval,
      });

      logger.info('Service instance registered by admin', {
        adminUserId: req.user.id,
        instanceId,
        serviceName: name,
        correlationId,
      });

      res.json({
        success: true,
        data: { instanceId },
        correlationId,
      });

    } catch (error) {
      logger.error('Service registration failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        correlationId: (req as any).correlationId,
      });

      res.status(500).json({
        success: false,
        error: 'Service registration failed',
        correlationId: (req as any).correlationId,
      });
    }
  }
);

// Deregister a service instance
router.delete('/services/:instanceId',
  rateLimitPresets.auth,
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const { instanceId } = req.params;
      const correlationId = (req as any).correlationId;

      // Only allow admin users to deregister services
      if (req.user?.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Admin access required',
          correlationId,
        });
      }

      const deregistered = serviceDiscoveryService.deregisterService(instanceId);

      if (!deregistered) {
        return res.status(404).json({
          success: false,
          error: 'Service instance not found',
          correlationId,
        });
      }

      logger.info('Service instance deregistered by admin', {
        adminUserId: req.user.id,
        instanceId,
        correlationId,
      });

      res.json({
        success: true,
        data: { deregistered: true },
        correlationId,
      });

    } catch (error) {
      logger.error('Service deregistration failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        correlationId: (req as any).correlationId,
      });

      res.status(500).json({
        success: false,
        error: 'Service deregistration failed',
        correlationId: (req as any).correlationId,
      });
    }
  }
);

// List all services and instances
router.get('/services',
  rateLimitPresets.healthCheck,
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const correlationId = (req as any).correlationId;

      // Only allow admin users to list services
      if (req.user?.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Admin access required',
          correlationId,
        });
      }

      const services = serviceDiscoveryService.getAllServices();

      res.json({
        success: true,
        data: services,
        correlationId,
      });

    } catch (error) {
      logger.error('Service listing failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        correlationId: (req as any).correlationId,
      });

      res.status(500).json({
        success: false,
        error: 'Service listing failed',
        correlationId: (req as any).correlationId,
      });
    }
  }
);

// Get instances for a specific service
router.get('/services/:serviceName/instances',
  rateLimitPresets.healthCheck,
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const { serviceName } = req.params;
      const correlationId = (req as any).correlationId;

      // Only allow admin users to view service instances
      if (req.user?.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Admin access required',
          correlationId,
        });
      }

      const instances = serviceDiscoveryService.getServiceInstances(serviceName);

      res.json({
        success: true,
        data: {
          serviceName,
          instances,
          count: instances.length,
        },
        correlationId,
      });

    } catch (error) {
      logger.error('Service instances request failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        correlationId: (req as any).correlationId,
      });

      res.status(500).json({
        success: false,
        error: 'Service instances request failed',
        correlationId: (req as any).correlationId,
      });
    }
  }
);

// Get service discovery statistics
router.get('/services/stats',
  rateLimitPresets.healthCheck,
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const correlationId = (req as any).correlationId;

      // Only allow admin users to view service stats
      if (req.user?.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Admin access required',
          correlationId,
        });
      }

      const stats = serviceDiscoveryService.getStats();

      res.json({
        success: true,
        data: stats,
        correlationId,
      });

    } catch (error) {
      logger.error('Service stats request failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        correlationId: (req as any).correlationId,
      });

      res.status(500).json({
        success: false,
        error: 'Service stats request failed',
        correlationId: (req as any).correlationId,
      });
    }
  }
);

/**
 * Load Balancer Routes
 */

// Get load balancer statistics
router.get('/load-balancer/stats',
  rateLimitPresets.healthCheck,
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const { serviceName } = req.query;
      const correlationId = (req as any).correlationId;

      // Only allow admin users to view load balancer stats
      if (req.user?.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Admin access required',
          correlationId,
        });
      }

      const stats = loadBalancerService.getStats(serviceName as string);

      res.json({
        success: true,
        data: stats,
        correlationId,
      });

    } catch (error) {
      logger.error('Load balancer stats request failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        correlationId: (req as any).correlationId,
      });

      res.status(500).json({
        success: false,
        error: 'Load balancer stats request failed',
        correlationId: (req as any).correlationId,
      });
    }
  }
);

// Get health status of all services
router.get('/health-status',
  rateLimitPresets.healthCheck,
  async (req: Request, res: Response) => {
    try {
      const correlationId = (req as any).correlationId;

      const healthStatus = loadBalancerService.getHealthStatus();

      res.json({
        success: true,
        data: healthStatus,
        correlationId,
      });

    } catch (error) {
      logger.error('Health status request failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        correlationId: (req as any).correlationId,
      });

      res.status(500).json({
        success: false,
        error: 'Health status request failed',
        correlationId: (req as any).correlationId,
      });
    }
  }
);

// Reset load balancer statistics
router.post('/load-balancer/reset-stats',
  rateLimitPresets.auth,
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const { serviceName } = req.body;
      const correlationId = (req as any).correlationId;

      // Only allow admin users to reset stats
      if (req.user?.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Admin access required',
          correlationId,
        });
      }

      loadBalancerService.resetStats(serviceName);

      logger.info('Load balancer stats reset by admin', {
        adminUserId: req.user.id,
        serviceName: serviceName || 'all',
        correlationId,
      });

      res.json({
        success: true,
        data: { reset: true },
        correlationId,
      });

    } catch (error) {
      logger.error('Load balancer stats reset failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        correlationId: (req as any).correlationId,
      });

      res.status(500).json({
        success: false,
        error: 'Load balancer stats reset failed',
        correlationId: (req as any).correlationId,
      });
    }
  }
);

/**
 * Health Check Routes
 */

// Comprehensive health check for all services
router.get('/health/comprehensive',
  rateLimitPresets.healthCheck,
  async (req: Request, res: Response) => {
    try {
      const correlationId = (req as any).correlationId;

      const [discoveryStats, loadBalancerStats, healthStatus] = await Promise.all([
        serviceDiscoveryService.getStats(),
        loadBalancerService.getStats(),
        loadBalancerService.getHealthStatus(),
      ]);

      const overallHealth = Object.values(healthStatus).every(
        (service: any) => service.status === 'available'
      );

      res.json({
        success: true,
        data: {
          overall: overallHealth ? 'healthy' : 'degraded',
          serviceDiscovery: discoveryStats,
          loadBalancer: loadBalancerStats,
          healthStatus,
          timestamp: new Date().toISOString(),
        },
        correlationId,
      });

    } catch (error) {
      logger.error('Comprehensive health check failed', {
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

// Test service discovery and load balancing
router.post('/test/load-balancing',
  rateLimitPresets.healthCheck,
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const { serviceName, requestCount = 10 } = req.body;
      const correlationId = (req as any).correlationId;

      // Only allow admin users to run tests
      if (req.user?.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Admin access required',
          correlationId,
        });
      }

      if (!serviceName) {
        return res.status(400).json({
          success: false,
          error: 'Service name is required',
          correlationId,
        });
      }

      const results = [];
      
      for (let i = 0; i < requestCount; i++) {
        const instance = await loadBalancerService.getServiceInstance(serviceName);
        if (instance) {
          results.push({
            request: i + 1,
            instanceId: instance.id,
            host: instance.host,
            port: instance.port,
            health: instance.health,
          });
          
          // Simulate request completion
          loadBalancerService.releaseServiceInstance(
            serviceName,
            instance.id,
            true,
            Math.random() * 1000 + 100 // Random response time
          );
        } else {
          results.push({
            request: i + 1,
            error: 'No instance available',
          });
        }
      }

      res.json({
        success: true,
        data: {
          serviceName,
          requestCount,
          results,
          distribution: this.calculateDistribution(results),
        },
        correlationId,
      });

    } catch (error) {
      logger.error('Load balancing test failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        correlationId: (req as any).correlationId,
      });

      res.status(500).json({
        success: false,
        error: 'Load balancing test failed',
        correlationId: (req as any).correlationId,
      });
    }
  }
);

/**
 * Helper function to calculate request distribution
 */
function calculateDistribution(results: any[]): Record<string, number> {
  const distribution: Record<string, number> = {};
  
  for (const result of results) {
    if (result.instanceId) {
      distribution[result.instanceId] = (distribution[result.instanceId] || 0) + 1;
    }
  }
  
  return distribution;
}

export default router;