/**
 * Test App Helper
 * Creates properly configured Express app for integration testing
 */

import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { authenticate, optionalAuthenticate } from '../../middleware/auth.middleware';
import { errorHandler } from '../../middleware/error-handler.middleware';
import { loggingMiddleware } from '../../middleware/logging.middleware';

// Import route handlers
import authRoutes from '../../routes/auth.routes';
import profileRoutes from '../../routes/profile.routes';
import jobRoutes from '../../routes/job.routes';
import applicationRoutes from '../../routes/application.routes';

/**
 * Create a test Express app with all middleware properly configured
 */
export function createTestApp(): Express {
  const app = express();

  // Basic middleware
  app.use(helmet({
    contentSecurityPolicy: false, // Disable for testing
  }));
  app.use(cors());
  app.use(compression());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Logging middleware (optional for tests)
  if (process.env.NODE_ENV !== 'test' || process.env.ENABLE_TEST_LOGGING === 'true') {
    app.use(loggingMiddleware);
  }

  // Health check endpoint (no auth required)
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Public routes (no authentication required)
  app.use('/api/auth', authRoutes);

  // Protected routes (authentication required)
  app.use('/api/users', authenticate, profileRoutes);
  app.use('/api/jobs', optionalAuthenticate, jobRoutes); // Jobs can be viewed without auth
  app.use('/api/applications', authenticate, applicationRoutes);

  // Error handling middleware (must be last)
  app.use(errorHandler);

  return app;
}

/**
 * Create a minimal test app for specific route testing
 */
export function createMinimalTestApp(routes: any, requireAuth = true): Express {
  const app = express();

  // Basic middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Apply authentication if required
  if (requireAuth) {
    app.use(authenticate);
  }

  // Add the specific routes
  app.use('/', routes);

  // Error handling
  app.use(errorHandler);

  return app;
}