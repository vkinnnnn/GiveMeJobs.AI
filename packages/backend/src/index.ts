import 'reflect-metadata';
import express from 'express';
import { createServer } from 'http';
import { container } from './config/container';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import passport from './config/passport.config';
import { config } from './config';
import { initializeSentry, Sentry } from './config/sentry.config';
import { schedulerService } from './services/scheduler.service';
import { webSocketService } from './services/websocket.service';
import { rateLimitPresets } from './middleware/rate-limit.middleware';

// Initialize Sentry first
const sentryEnabled = initializeSentry();

const app = express();
const httpServer = createServer(app);

// Sentry request handler must be the first middleware (only if Sentry is configured)
// Temporarily disabled due to version compatibility issues
// if (sentryEnabled) {
//   app.use(Sentry.Handlers.requestHandler());
//   app.use(Sentry.Handlers.tracingHandler());
// }

// Logging middleware
import { requestLoggingMiddleware, errorLoggingMiddleware } from './middleware/logging.middleware';
import { morganStream } from './services/logger.service';

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(morgan('combined', { stream: morganStream }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use(requestLoggingMiddleware);

// Service integration middleware for Python services
import { serviceIntegrationMiddleware, crossServiceErrorMiddleware } from './middleware/service-integration.middleware';
app.use(serviceIntegrationMiddleware);

// Distributed tracing middleware
import { distributedTracingMiddleware } from './middleware/distributed-tracing.middleware';
app.use(distributedTracingMiddleware);

// Global rate limiting
app.use(rateLimitPresets.global);

// Static assets optimization (if serving static files)
// Note: In production, static assets should be served by CDN or reverse proxy
import { staticAssetsMiddleware, imageOptimizationMiddleware, staticAssetsCORS } from './middleware/static-assets.middleware';
app.use(staticAssetsCORS);
app.use(imageOptimizationMiddleware);
app.use(staticAssetsMiddleware);

// Initialize Passport
app.use(passport.initialize());

// Metrics middleware
import { metricsMiddleware, metricsEndpoint } from './middleware/metrics.middleware';
app.use(metricsMiddleware);

// Performance monitoring middleware
import { performanceMiddleware, performanceStatsEndpoint } from './middleware/performance.middleware';
app.use(performanceMiddleware);

// Metrics endpoint for Prometheus
app.get('/metrics', metricsEndpoint);

// Performance stats endpoint
app.get('/performance/stats', performanceStatsEndpoint);

// Health check endpoints
import { performHealthCheck, isReady, isAlive } from './utils/health-check';

app.get('/health', async (req, res) => {
  try {
    const health = await performHealthCheck();
    const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Health check failed',
    });
  }
});

// Kubernetes readiness probe
app.get('/ready', async (req, res) => {
  const ready = await isReady();
  res.status(ready ? 200 : 503).json({ ready });
});

// Kubernetes liveness probe
app.get('/alive', async (req, res) => {
  const alive = await isAlive();
  res.status(alive ? 200 : 503).json({ alive });
});

// Note: RBAC middleware (loadUserRole) is applied per-route as needed after authentication

// API routes
import authRoutes from './routes/auth.routes';
import profileRoutes from './routes/profile.routes';
import skillScoringRoutes from './routes/skill-scoring.routes';
import jobRoutes from './routes/job.routes';
import jobAlertRoutes from './routes/job-alert.routes';
import notificationRoutes from './routes/notification.routes';
import documentRoutes from './routes/document.routes';
import documentTemplateRoutes from './routes/document-template.routes';
import applicationRoutes from './routes/application.routes';
import interviewPrepRoutes from './routes/interview-prep.routes';
import { blockchainRoutes } from './routes/blockchain.routes';
import analyticsRoutes from './routes/analytics.routes';
import gdprRoutes from './routes/gdpr.routes';
import legalRoutes from './routes/legal.routes';
import securityIncidentRoutes from './routes/security-incident.routes';
import auditLogRoutes from './routes/audit-log.routes';
import pythonGatewayRoutes from './routes/python-gateway.routes';
import serviceAuthRoutes from './routes/service-auth.routes';
import serviceDiscoveryRoutes from './routes/service-discovery.routes';
import monitoringRoutes from './routes/monitoring.routes';

app.get('/api', (req, res) => {
  res.json({ message: 'GiveMeJobs API' });
});

// Duplicate health endpoint removed - using comprehensive health check above

// Authentication routes
app.use('/api/auth', authRoutes);

// Profile routes
app.use('/api/users', profileRoutes);

// Skill scoring routes
app.use('/api/skill-score', skillScoringRoutes);

// Job routes
app.use('/api/jobs', jobRoutes);

// Job alert routes (mounted under /api/jobs)
app.use('/api/jobs', jobAlertRoutes);

// Notification routes
app.use('/api/notifications', notificationRoutes);

// Document generation routes
app.use('/api/documents', documentRoutes);

// Document template routes
app.use('/api/templates', documentTemplateRoutes);

// Application tracking routes
app.use('/api/applications', applicationRoutes);

// Interview preparation routes (GURU)
app.use('/api/interview-prep', interviewPrepRoutes);

// Blockchain credential routes
app.use('/api/blockchain', blockchainRoutes);

// Analytics routes
app.use('/api/analytics', analyticsRoutes);

// GDPR compliance routes
app.use('/api/gdpr', gdprRoutes);

// Legal routes (privacy policy, terms of service, consent)
app.use('/api/legal', legalRoutes);

// Security incident routes
app.use('/api/security-incidents', securityIncidentRoutes);

// Audit log routes
app.use('/api/audit-logs', auditLogRoutes);

// Python gateway routes
app.use('/api/python', pythonGatewayRoutes);

// Service authentication routes
app.use('/api/service-auth', serviceAuthRoutes);

// Service discovery and load balancing routes
app.use('/api/service-discovery', serviceDiscoveryRoutes);

// Unified monitoring routes
app.use('/api/monitoring', monitoringRoutes);

// Sentry error handler must be before other error handlers (only if Sentry is configured)
// Temporarily disabled due to version compatibility issues
// if (sentryEnabled) {
//   app.use(Sentry.Handlers.errorHandler());
// }

// Error handling middleware
import { errorHandler, notFoundHandler } from './middleware/error-handler.middleware';
app.use(errorLoggingMiddleware);
app.use(crossServiceErrorMiddleware);
app.use(notFoundHandler);
app.use(errorHandler);

const PORT = config.port;

// Initialize WebSocket
webSocketService.initialize(httpServer);

httpServer.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📝 Environment: ${config.nodeEnv}`);
  
  // Initialize database connections
  try {
    const { connectMongo, connectRedis } = await import('./config/database');
    await connectMongo();
    await connectRedis();
  } catch (error) {
    console.error('Database connection failed:', error);
  }
  
  // Start background job scheduler
  schedulerService.start();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  schedulerService.stop();
  webSocketService.shutdown();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  schedulerService.stop();
  webSocketService.shutdown();
  process.exit(0);
});
