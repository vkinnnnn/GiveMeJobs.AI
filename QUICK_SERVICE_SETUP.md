# Quick Service Setup Guide

## 🚀 Quick Start (3 Options)

### Option 1: Interactive Setup (Easiest)
```bash
cd packages/backend
npm run setup:services
```
This will walk you through configuring each service interactively.

### Option 2: Manual Configuration
Edit your `.env` file and add the credentials for each service you want to use.

### Option 3: Test What's Already Working
```bash
cd packages/backend
npm run test:services
```

## 📋 Service Priority

### ✅ Already Working (No Setup Needed)
- PostgreSQL database
- MongoDB database  
- Redis cache
- JWT authentication
- Basic email (development mode with Ethereal)

### ⚠️ Needs Configuration (High Priority)
1. **Google OAuth** - For social login
2. **SendGrid** - For production emails
3. **OpenAI** - For AI features (resume generation, interview prep)

### 📦 Optional (Can Configure Later)
- LinkedIn OAuth
- Pinecone (vector database for job matching)
- Indeed API
- Glassdoor API

## 🔧 Quick Configuration

### Google OAuth (5 minutes)
1. Go to https://console.cloud.google.com/
2. Create project → Enable Google+ API → Create OAuth credentials
3. Add to `.env`:
```env
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
```

### SendGrid Email (5 minutes)
1. Sign up at https://signup.sendgrid.com/
2. Create API key (Settings → API Keys)
3. Add to `.env`:
```env
SENDGRID_API_KEY=your-api-key
EMAIL_FROM=noreply@yourdomain.com
```

### OpenAI (5 minutes)
1. Sign up at https://platform.openai.com/
2. Add payment method
3. Create API key
4. Add to `.env`:
```env
OPENAI_API_KEY=sk-your-api-key
```

## 🧪 Testing Services

Test individual services:
```bash
cd packages/backend

# Test OAuth configuration
npm run test:oauth

# Test email service
npm run test:email

# Test OpenAI
npm run test:openai

# Test Pinecone
npm run test:pinecone

# Test Redis
npm run redis:test

# Test all at once
npm run test:services
```

## 🎯 What Works Without Configuration?

Your app will work with these features even without external services:

✅ **Working Now:**
- User registration/login (email + password)
- Profile management
- Database operations
- Session management
- Password reset (emails in dev mode)

❌ **Needs Configuration:**
- Social login (Google/LinkedIn)
- Production emails
- AI-powered features (resume generation, interview prep)
- Semantic job search
- External job board integration

## 📚 Detailed Documentation

For step-by-step instructions with screenshots:
- See `SERVICE_CONFIGURATION_GUIDE.md`

## 🆘 Quick Troubleshooting

### OAuth not working?
```bash
npm run test:oauth
```
Check that callback URLs match exactly in your OAuth app settings.

### Emails not sending?
```bash
npm run test:email
```
In development, check console for Ethereal preview URLs.
In production, verify SendGrid API key and sender authentication.

### OpenAI errors?
```bash
npm run test:openai
```
Verify API key and check you have credits at https://platform.openai.com/account/billing

## 💡 Pro Tips

1. **Start with Google OAuth** - It's the easiest and most commonly used
2. **Use development mode** - Emails work automatically with Ethereal (no config needed)
3. **Configure OpenAI last** - It costs money, so set it up when you're ready to use AI features
4. **Skip LinkedIn for now** - Google OAuth is sufficient for testing
5. **Pinecone is optional** - Job matching works without it (just less sophisticated)

## 🎬 Recommended Setup Order

1. ✅ Verify databases are working (already done)
2. 🔐 Configure Google OAuth (5 min)
3. 📧 Configure SendGrid for production emails (5 min)
4. 🤖 Configure OpenAI when ready to test AI features (5 min)
5. 📦 Configure optional services as needed

## 🚦 Current Status Check

Run this to see what's configured:
```bash
cd packages/backend
npm run test:oauth
```

This will show you:
- ✅ What's configured
- ❌ What's missing
- 💡 How to test each service
