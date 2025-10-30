# 🚀 Start Here - Service Configuration

## One Command to Check Everything

```bash
cd packages/backend
npm run check:all
```

This will show you:
- ✅ What's already configured
- ❌ What needs configuration
- 💡 How to fix it

## Three Ways to Configure

### 1️⃣ Interactive Setup (Easiest)
```bash
npm run setup:services
```
Walks you through each service step-by-step.

### 2️⃣ Manual Setup (Most Control)
1. Open `.env` file
2. Follow `SERVICE_CONFIGURATION_GUIDE.md`
3. Add your API keys

### 3️⃣ Test What Works (See Current State)
```bash
npm run test:services
```
Tests OAuth, Email, and Redis.

## Priority Services

### 🔥 High Priority
1. **Google OAuth** - Social login (5 min)
   ```bash
   npm run test:oauth
   ```

### 🔶 Medium Priority
2. **SendGrid** - Production emails (5 min)
   ```bash
   npm run test:email
   ```

3. **OpenAI** - AI features (5 min)
   ```bash
   npm run test:openai
   ```

### 📦 Optional
- LinkedIn OAuth
- Pinecone
- Job Board APIs

## Quick Commands

```bash
# Check status
npm run check:all

# Configure services
npm run setup:services

# Test services
npm run test:oauth
npm run test:email
npm run test:openai
npm run test:pinecone
npm run test:services

# Start app
npm run dev
```

## Documentation

- 📖 **Quick Start:** `QUICK_SERVICE_SETUP.md`
- 📚 **Detailed Guide:** `SERVICE_CONFIGURATION_GUIDE.md`
- ✅ **Summary:** `SERVICE_SETUP_COMPLETE.md`

## What Works Now (Without Configuration)

✅ User registration/login (email + password)
✅ Profile management
✅ Database operations
✅ Session management
✅ Password reset (dev mode)

## What Needs Configuration

⚠️ Social login (Google/LinkedIn)
⚠️ Production emails
⚠️ AI features (resume, interview prep)
⚠️ Semantic job search

---

**Start with:** `npm run check:all`
