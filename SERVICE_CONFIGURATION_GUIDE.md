# Service Configuration Guide

This guide will help you configure all the external services needed for the GiveMeJobs platform.

## 🔐 OAuth Configuration

### Google OAuth Setup

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Create a new project or select existing one

2. **Enable Google+ API**
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google+ API" and enable it

3. **Create OAuth 2.0 Credentials**
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Application type: "Web application"
   - Name: "GiveMeJobs"
   - Authorized redirect URIs:
     - Development: `http://localhost:4000/api/auth/oauth/google/callback`
     - Production: `https://your-domain.com/api/auth/oauth/google/callback`

4. **Copy credentials to .env**
   ```env
   GOOGLE_CLIENT_ID=your-client-id-here
   GOOGLE_CLIENT_SECRET=your-client-secret-here
   GOOGLE_CALLBACK_URL=http://localhost:4000/api/auth/oauth/google/callback
   ```

### LinkedIn OAuth Setup

**Important:** Use LinkedIn's OAuth 2.0 directly (NOT Google Cloud Integration Connectors)

1. **Go to LinkedIn Developers**
   - Visit: https://www.linkedin.com/developers/apps
   - Sign in with your LinkedIn account
   - Click "Create app"

2. **Fill in App Details**
   - App name: "GiveMeJobs"
   - LinkedIn Page: (create or select your company page)
   - App logo: Upload your logo
   - Legal agreement: Accept terms
   - Click "Create app"

3. **Configure OAuth Settings**
   - Go to "Auth" tab
   - Add Redirect URLs:
     - Development: `http://localhost:4000/api/auth/oauth/linkedin/callback`
     - Production: `https://your-domain.com/api/auth/oauth/linkedin/callback`
   - Click "Update" after adding each URL

4. **Request Product Access**
   - Go to "Products" tab
   - Find "Sign In with LinkedIn using OpenID Connect"
   - Click "Request access"
   - Wait for approval (usually instant)

5. **Copy credentials to .env**
   - Go to "Auth" tab
   - Copy Client ID
   - Click "Show" and copy Client Secret
   
   ```env
   LINKEDIN_CLIENT_ID=your-client-id-here
   LINKEDIN_CLIENT_SECRET=your-client-secret-here
   LINKEDIN_CALLBACK_URL=http://localhost:4000/api/auth/oauth/linkedin/callback
   ```

**Detailed Guide:** See `LINKEDIN_OAUTH_SETUP.md` for step-by-step instructions with troubleshooting.

## 📧 Email Service Configuration

### SendGrid Setup (Recommended for Production)

1. **Create SendGrid Account**
   - Visit: https://signup.sendgrid.com/
   - Sign up for free tier (100 emails/day)

2. **Create API Key**
   - Go to Settings > API Keys
   - Click "Create API Key"
   - Name: "GiveMeJobs Production"
   - Permissions: "Full Access" or "Mail Send" only
   - Copy the API key (you won't see it again!)

3. **Verify Sender Identity**
   - Go to Settings > Sender Authentication
   - Verify a Single Sender (for testing)
   - Or set up Domain Authentication (for production)

4. **Add to .env**
   ```env
   SENDGRID_API_KEY=your-sendgrid-api-key-here
   EMAIL_FROM=noreply@yourdomain.com
   ```

### Development Email Testing (Ethereal)

For development, the app automatically uses Ethereal Email (fake SMTP):
- No configuration needed
- Check console logs for preview URLs
- Emails won't actually be sent

## 🤖 OpenAI Configuration

1. **Create OpenAI Account**
   - Visit: https://platform.openai.com/signup
   - Add payment method (required for API access)

2. **Create API Key**
   - Go to: https://platform.openai.com/api-keys
   - Click "Create new secret key"
   - Name: "GiveMeJobs"
   - Copy the key

3. **Add to .env**
   ```env
   OPENAI_API_KEY=sk-your-openai-api-key-here
   ```

4. **Set Usage Limits** (Recommended)
   - Go to Settings > Limits
   - Set monthly budget limit to prevent unexpected charges

## 🔍 Vector Database (Pinecone)

1. **Create Pinecone Account**
   - Visit: https://www.pinecone.io/
   - Sign up for free tier

2. **Create Index**
   - Go to "Indexes" in dashboard
   - Click "Create Index"
   - Name: `givemejobs-jobs`
   - Dimensions: `1536` (for OpenAI embeddings)
   - Metric: `cosine`
   - Pod Type: `starter` (free tier)

3. **Get API Key**
   - Go to "API Keys" section
   - Copy your API key

4. **Add to .env**
   ```env
   PINECONE_API_KEY=your-pinecone-api-key-here
   PINECONE_INDEX_NAME=givemejobs-jobs
   ```

## 💼 Job Board APIs (Optional)

### Indeed API

1. **Apply for Indeed Publisher Account**
   - Visit: https://www.indeed.com/publisher
   - Fill out application form
   - Wait for approval (can take several days)

2. **Get API Key**
   - Once approved, you'll receive your publisher ID

3. **Add to .env**
   ```env
   INDEED_API_KEY=your-indeed-publisher-id
   ```

### Glassdoor API

1. **Apply for Glassdoor API Access**
   - Visit: https://www.glassdoor.com/developer/index.htm
   - Submit application
   - Wait for approval

2. **Add to .env**
   ```env
   GLASSDOOR_API_KEY=your-glassdoor-api-key
   ```

**Note:** These APIs have strict approval processes. Consider using web scraping alternatives or other job APIs like:
- Adzuna API (easier to get)
- The Muse API (free tier available)
- GitHub Jobs API (free)

## 🗄️ Database Services

### PostgreSQL (Already Configured)
```env
DATABASE_URL=postgresql://givemejobs:dev_password@localhost:5432/givemejobs_db
```

### MongoDB (Already Configured)
```env
MONGODB_URI=mongodb://givemejobs:dev_password@localhost:27017/givemejobs_docs?authSource=admin
```

### Redis (Already Configured)
```env
REDIS_URL=redis://:dev_password@localhost:6379
```

## 🔗 Blockchain (Optional - Future Feature)

For now, leave these empty:
```env
BLOCKCHAIN_NETWORK=
BLOCKCHAIN_PRIVATE_KEY=
```

## ✅ Verification Steps

### 1. Test Email Service
```bash
cd packages/backend
npm run test:email
```

### 2. Test Redis Connection
```bash
npm run test:redis
```

### 3. Test OAuth (Manual)
- Start the backend: `npm run dev`
- Visit: `http://localhost:4000/api/auth/oauth/google`
- Should redirect to Google login

### 4. Test OpenAI
```bash
npm run test:openai
```

## 🚀 Quick Start Configuration

### Minimum Required for Development:
1. ✅ PostgreSQL (already configured)
2. ✅ MongoDB (already configured)
3. ✅ Redis (already configured)
4. ✅ JWT secrets (already configured)

### Recommended for Full Features:
1. ⚠️ Google OAuth (for social login)
2. ⚠️ SendGrid (for emails)
3. ⚠️ OpenAI (for AI features)

### Optional:
1. ❌ LinkedIn OAuth
2. ❌ Pinecone
3. ❌ Indeed/Glassdoor APIs
4. ❌ Blockchain

## 📝 Environment File Template

Here's your complete `.env` file with placeholders:

```env
# Database Configuration (✅ Already configured)
POSTGRES_USER=givemejobs
POSTGRES_PASSWORD=dev_password
POSTGRES_DB=givemejobs_db
POSTGRES_PORT=5432
DATABASE_URL=postgresql://givemejobs:dev_password@localhost:5432/givemejobs_db

# MongoDB Configuration (✅ Already configured)
MONGO_USER=givemejobs
MONGO_PASSWORD=dev_password
MONGO_DB=givemejobs_docs
MONGO_PORT=27017
MONGODB_URI=mongodb://givemejobs:dev_password@localhost:27017/givemejobs_docs?authSource=admin

# Redis Configuration (✅ Already configured)
REDIS_PASSWORD=dev_password
REDIS_PORT=6379
REDIS_URL=redis://:dev_password@localhost:6379

# Application Configuration (✅ Already configured)
NODE_ENV=development
PORT=3000
API_PORT=4000

# JWT Configuration (✅ Already configured)
JWT_SECRET=dev-secret-key-change-in-production
JWT_REFRESH_SECRET=dev-refresh-secret-key-change-in-production
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Google OAuth (⚠️ NEEDS CONFIGURATION)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:4000/api/auth/oauth/google/callback

# LinkedIn OAuth (⚠️ NEEDS CONFIGURATION)
LINKEDIN_CLIENT_ID=your-linkedin-client-id
LINKEDIN_CLIENT_SECRET=your-linkedin-client-secret
LINKEDIN_CALLBACK_URL=http://localhost:4000/api/auth/oauth/linkedin/callback

# OpenAI (⚠️ NEEDS CONFIGURATION)
OPENAI_API_KEY=sk-your-openai-api-key

# Email Service (⚠️ NEEDS CONFIGURATION)
SENDGRID_API_KEY=your-sendgrid-api-key
EMAIL_FROM=noreply@givemejobs.com

# Vector Database (Optional)
PINECONE_API_KEY=your-pinecone-api-key
PINECONE_INDEX_NAME=givemejobs-jobs

# Job Board APIs (Optional)
INDEED_API_KEY=your-indeed-api-key
GLASSDOOR_API_KEY=your-glassdoor-api-key

# Blockchain (Optional - Future)
BLOCKCHAIN_NETWORK=
BLOCKCHAIN_PRIVATE_KEY=

# Frontend URL (✅ Already configured)
FRONTEND_URL=http://localhost:3000
API_URL=http://localhost:4000
```

## 🆘 Troubleshooting

### OAuth Not Working
- Check callback URLs match exactly
- Ensure OAuth apps are not in "testing" mode
- Verify environment variables are loaded

### Email Not Sending
- Check SendGrid API key is valid
- Verify sender email is authenticated
- Check SendGrid dashboard for errors

### OpenAI Errors
- Verify API key is correct
- Check you have credits/payment method
- Monitor usage limits

## 📚 Additional Resources

- [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2)
- [LinkedIn OAuth Documentation](https://docs.microsoft.com/en-us/linkedin/shared/authentication/authentication)
- [SendGrid Documentation](https://docs.sendgrid.com/)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Pinecone Documentation](https://docs.pinecone.io/)
