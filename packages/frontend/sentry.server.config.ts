import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: 0.1,
  
  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,
  
  environment: process.env.NODE_ENV,
  
  // Filter out specific errors
  ignoreErrors: [
    'ECONNREFUSED',
    'ENOTFOUND',
    'ETIMEDOUT',
  ],
  
  beforeSend(event, hint) {
    // Filter out validation errors
    const error = hint.originalException;
    if (error && typeof error === 'object' && 'name' in error) {
      if (error.name === 'ValidationError' || error.name === 'ZodError') {
        return null;
      }
    }
    return event;
  },
});
