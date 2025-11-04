import * as Sentry from '@sentry/node';
// import { nodeProfilingIntegration } from '@sentry/profiling-node';
import { config } from './index';

export const initializeSentry = (): boolean => {
  if (!config.sentry?.dsn) {
    console.warn('⚠️  Sentry DSN not configured. Error tracking disabled.');
    return false;
  }

  Sentry.init({
    dsn: config.sentry.dsn,
    environment: config.nodeEnv,
    enabled: config.nodeEnv !== 'test',
    
    // Performance Monitoring
    tracesSampleRate: config.sentry.tracesSampleRate || 0.1,
    
    // Profiling (optional - comment out if causing issues)
    // profilesSampleRate: config.sentry.profilesSampleRate || 0.1,
    // integrations: [
    //   new ProfilingIntegration(),
    // ],
    
    // Release tracking
    release: config.sentry.release || `givemejobs-backend@${process.env.npm_package_version}`,
    
    // Error filtering
    beforeSend(event, hint) {
      // Filter out specific errors if needed
      const error = hint.originalException;
      
      // Don't send validation errors to Sentry
      if (error && typeof error === 'object' && 'name' in error) {
        if (error.name === 'ValidationError' || error.name === 'ZodError') {
          return null;
        }
      }
      
      return event;
    },
    
    // Ignore specific errors
    ignoreErrors: [
      'ECONNREFUSED',
      'ENOTFOUND',
      'ETIMEDOUT',
      'NetworkError',
      'AbortError',
    ],
  });

  console.log('✅ Sentry error tracking initialized');
  return true;
};

export { Sentry };
