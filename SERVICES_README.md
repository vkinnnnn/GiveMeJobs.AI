# 🔧 Service Configuration - Complete Guide

## 📚 Documentation Index

| Document | Purpose | When to Use |
|----------|---------|-------------|
| **START_HERE.md** | Quick start guide | First time setup |
| **QUICK_SERVICE_SETUP.md** | Quick reference | Fast configuration |
| **SERVICE_CONFIGURATION_GUIDE.md** | Detailed instructions | Step-by-step setup |
| **SERVICE_ARCHITECTURE.md** | System overview | Understanding architecture |
| **SERVICE_SETUP_COMPLETE.md** | Tools summary | Reference for tools |

## 🚀 Quick Start (3 Steps)

### Step 1: Check Status
```bash
cd packages/backend
npm run check:all
```

### Step 2: Configure Services
Choose one method:

**A) Interactive (Easiest):**
```bash
npm run setup:services
```

**B) Manual:**
Edit `.env` file following `SERVICE_CONFIGURATION_GUIDE.md`

### Step 3: Test & Run
```bash
npm run test:services
npm run dev
```

## 📋 Available Commands

### Status & Setup
```bash
npm run check:all          # Check all services status
npm run setup:services     # Interactive configuration wizard
```

### Testing
```bash
npm run test:services      # Test OAuth + Email + Redis
npm run test:oauth         # Test OAuth configuration
npm run test:email         # Test email service
npm run test:openai        # Test OpenAI API
npm run test:pinecone      # Test Pinecone vector DB
npm run redis:test         # Test Redis connection
```

### Development
```bash
npm run dev                # Start development server
npm run build              # Build for production
npm run start              # Start production server
```

## 🎯 Service Priority

### ✅ Already Configured
- PostgreSQL (user data, jobs)
- MongoDB (documents, resumes)
- Redis (sessions, cache)
- JWT (authentication)

### ⚠️ Needs Configuration (Recommended)
1. **Google OAuth** - Social login (5 min)
2. **SendGrid** - Production emails (5 min)
3. **OpenAI** - AI features (5 min)

### 📦 Optional (Configure Later)
- LinkedIn OAuth
- Pinecone (vector search)
- Indeed API
- Glassdoor API

## 🔑 Where to Get API Keys

| Service | URL | Time | Cost |
|---------|-----|------|------|
| Google OAuth | https://console.cloud.google.com/ | 5 min | Free |
| LinkedIn OAuth | https://www.linkedin.com/developers/ | 5 min | Free |
| SendGrid | https://signup.sendgrid.com/ | 5 min | Free tier |
| OpenAI | https://platform.openai.com/ | 5 min | Pay-as-you-go |
| Pinecone | https://www.pinecone.io/ | 5 min | Free tier |

## 📖 Documentation Guide

### For First-Time Setup
1. Read **START_HERE.md**
2. Run `npm run check:all`
3. Follow **QUICK_SERVICE_SETUP.md**

### For Detailed Configuration
1. Read **SERVICE_CONFIGURATION_GUIDE.md**
2. Configure each service step-by-step
3. Test with `npm run test:services`

### For Understanding Architecture
1. Read **SERVICE_ARCHITECTURE.md**
2. Understand service dependencies
3. See data flow diagrams

### For Tool Reference
1. Read **SERVICE_SETUP_COMPLETE.md**
2. See all available scripts
3. Troubleshooting tips

## 🧪 Testing Your Configuration

After configuring services, test them:

```bash
# Quick test (OAuth + Email + Redis)
npm run test:services

# Comprehensive check
npm run check:all

# Individual tests
npm run test:oauth
npm run test:email
npm run test:openai
npm run test:pinecone
```

## 🎨 What Each Service Enables

### Google OAuth
- ✅ Social login with Google
- ✅ One-click registration
- ✅ Profile auto-fill

### LinkedIn OAuth
- ✅ Social login with LinkedIn
- ✅ Professional profile import
- ✅ Work experience sync

### SendGrid
- ✅ Welcome emails
- ✅ Password reset emails
- ✅ Job alert notifications
- ✅ Interview reminders

### OpenAI
- ✅ AI resume generation
- ✅ Cover letter writing
- ✅ Interview preparation
- ✅ Job description analysis
- ✅ Skill recommendations

### Pinecone
- ✅ Semantic job search
- ✅ Smart job matching
- ✅ Similar job recommendations

### Job Board APIs
- ✅ Real-time job listings
- ✅ Company information
- ✅ Salary data

## 🔧 Configuration Files

### Main Configuration
- `.env` - Environment variables (root directory)

### Service Scripts
- `packages/backend/src/scripts/test-*.ts` - Test scripts
- `packages/backend/src/scripts/setup-services.ts` - Setup wizard
- `packages/backend/src/scripts/check-all-services.ts` - Status checker

### Service Implementations
- `packages/backend/src/services/oauth.service.ts` - OAuth logic
- `packages/backend/src/services/email.service.ts` - Email logic
- `packages/backend/src/services/ai.service.ts` - OpenAI logic
- `packages/backend/src/config/passport.config.ts` - OAuth strategies

## 🆘 Troubleshooting

### OAuth Issues
```bash
npm run test:oauth
```
- Check callback URLs match exactly
- Verify credentials are correct
- Ensure apps are not in "testing" mode

### Email Issues
```bash
npm run test:email
```
- Development: Check console for preview URLs
- Production: Verify SendGrid API key
- Check sender authentication

### OpenAI Issues
```bash
npm run test:openai
```
- Verify API key
- Check billing/credits
- Monitor usage limits

### General Issues
```bash
npm run check:all
```
Shows exactly what's configured and what's missing.

## 💡 Pro Tips

1. **Start with status check** - Always run `npm run check:all` first
2. **Use interactive setup** - `npm run setup:services` is easiest
3. **Test incrementally** - Test each service after configuring
4. **Development works** - Email works without SendGrid in dev mode
5. **OAuth is optional** - Email/password auth works without it
6. **OpenAI costs money** - Configure when ready to use AI features

## 🎯 Recommended Setup Flow

```
1. Check Status
   ↓
   npm run check:all

2. Configure Priority Services
   ↓
   Google OAuth (5 min)
   SendGrid (5 min)
   OpenAI (5 min)

3. Test Configuration
   ↓
   npm run test:services

4. Start Application
   ↓
   npm run dev

5. Configure Optional Services
   ↓
   LinkedIn, Pinecone, Job APIs
```

## 📞 Support

If you need help:
1. Check the troubleshooting section in each guide
2. Run `npm run check:all` to see status
3. Review error messages from test scripts
4. Check service-specific documentation

## 🎉 You're Ready!

Once you've configured your services:
1. Run `npm run check:all` to verify
2. Run `npm run test:services` to test
3. Run `npm run dev` to start
4. Visit http://localhost:4000 for backend
5. Visit http://localhost:3000 for frontend

---

**Start here:** `npm run check:all`
