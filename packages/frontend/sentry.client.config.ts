import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: 0.1,
  
  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,
  
  replaysOnErrorSampleRate: 1.0,
  
  // This sets the sample rate to be 10%. You may want this to be 100% while
  // in development and sample at a lower rate in production
  replaysSessionSampleRate: 0.1,
  
  // You can remove this option if you're not planning to use the Sentry Session Replay feature:
  integrations: [
    Sentry.replayIntegration({
      // Additional Replay configuration goes in here, for example:
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
  
  environment: process.env.NODE_ENV,
  
  // Filter out specific errors
  ignoreErrors: [
    'ResizeObserver loop limit exceeded',
    'Non-Error promise rejection captured',
    'Network request failed',
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
