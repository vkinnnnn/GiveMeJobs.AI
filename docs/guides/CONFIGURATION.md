# Configuration Guide

Complete configuration reference for the GiveMeJobs platform.

## Environment Variables

### Backend Configuration

Located in `packages/backend/.env`:

#### Server
```bash
PORT=4000
NODE_ENV=development
```

#### Databases
```bash
DATABASE_URL=postgresql://givemejobs:dev_password@localhost:5432/givemejobs_db
MONGODB_URI=mongodb://givemejobs:dev_password@localhost:27017/givemejobs_docs
REDIS_URL=redis://:dev_password@localhost:6379
```

#### Authentication
```bash
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d
```

#### OAuth Providers
```bash
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:4000/api/auth/oauth/google/callback

LINKEDIN_CLIENT_ID=your_linkedin_client_id
LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret
LINKEDIN_CALLBACK_URL=http://localhost:4000/api/auth/oauth/linkedin/callback
```

#### External Services
```bash
OPENAI_API_KEY=your_openai_api_key
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_INDEX_NAME=givemejobs
RESEND_API_KEY=your_resend_api_key
ADZUNA_APP_ID=your_adzuna_app_id
ADZUNA_APP_KEY=your_adzuna_app_key
```

#### Monitoring
```bash
SENTRY_DSN=your_sentry_dsn
SENTRY_ENVIRONMENT=development
```

### Frontend Configuration

Located in `packages/frontend/.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:4000
```

## Service Configuration

### OAuth Setup

1. **Google OAuth**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create OAuth 2.0 credentials
   - Add authorized redirect URI: `http://localhost:4000/api/auth/oauth/google/callback`

2. **LinkedIn OAuth**:
   - Go to [LinkedIn Developers](https://www.linkedin.com/developers/)
   - Create an app and get credentials
   - Add redirect URL: `http://localhost:4000/api/auth/oauth/linkedin/callback`

### AI Services

1. **OpenAI**: Get API key from [OpenAI Platform](https://platform.openai.com/)
2. **Pinecone**: Get API key from [Pinecone Console](https://www.pinecone.io/)

### Email Service

**Resend**: Get API key from [Resend Dashboard](https://resend.com/)

### Job Board API

**Adzuna**: Register at [Adzuna Developer Portal](https://developer.adzuna.com/)

## Docker Configuration

See `docker-compose.yml` for service configuration.

## Next Steps

- [Development Guide](../development/DEVELOPMENT_GUIDE.md)
- [Deployment Guide](../deployment/DEPLOYMENT_GUIDE.md)