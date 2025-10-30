import dotenv from 'dotenv';

dotenv.config();

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.API_PORT || '4000', 10),
  
  // Database
  database: {
    postgres: {
      url: process.env.DATABASE_URL || '',
      user: process.env.POSTGRES_USER || 'givemejobs',
      password: process.env.POSTGRES_PASSWORD || 'dev_password',
      database: process.env.POSTGRES_DB || 'givemejobs_db',
      port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    },
    mongodb: {
      uri: process.env.MONGODB_URI || '',
    },
    redis: {
      url: process.env.REDIS_URL || '',
      password: process.env.REDIS_PASSWORD || 'dev_password',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
    },
  },
  
  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  
  // External APIs
  externalApis: {
    openai: process.env.OPENAI_API_KEY || '',
    linkedin: {
      clientId: process.env.LINKEDIN_CLIENT_ID || '',
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET || '',
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    },
    indeed: process.env.INDEED_API_KEY || '',
    glassdoor: process.env.GLASSDOOR_API_KEY || '',
  },
  
  // Email
  email: {
    sendgridApiKey: process.env.SENDGRID_API_KEY || '',
    from: process.env.EMAIL_FROM || 'noreply@givemejobs.com',
  },
  
  // Frontend
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  
  // Monitoring & Logging
  sentry: {
    dsn: process.env.SENTRY_DSN || '',
    tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
    profilesSampleRate: parseFloat(process.env.SENTRY_PROFILES_SAMPLE_RATE || '0.1'),
    release: process.env.SENTRY_RELEASE || '',
  },
  
  prometheus: {
    enabled: process.env.PROMETHEUS_ENABLED === 'true',
    port: parseInt(process.env.PROMETHEUS_PORT || '9090', 10),
  },
  
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    elasticsearch: {
      node: process.env.ELASTICSEARCH_NODE || 'http://localhost:9200',
      username: process.env.ELASTICSEARCH_USERNAME || '',
      password: process.env.ELASTICSEARCH_PASSWORD || '',
    },
  },
};
