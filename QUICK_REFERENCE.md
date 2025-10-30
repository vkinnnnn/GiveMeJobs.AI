# ⚡ Quick Reference Card

## 🎯 One-Line Commands

```bash
# Check everything
npm run check:all

# Setup everything
npm run setup:services

# Test everything
npm run test:services

# Start app
npm run dev
```

## 📊 Service Status

| Service | Status | Priority | Time |
|---------|--------|----------|------|
| PostgreSQL | ✅ Configured | Required | - |
| MongoDB | ✅ Configured | Required | - |
| Redis | ✅ Configured | Required | - |
| JWT | ✅ Configured | Required | - |
| Google OAuth | ⚠️ Needs Config | High | 5 min |
| SendGrid | ⚠️ Needs Config | Medium | 5 min |
| OpenAI | ⚠️ Needs Config | Medium | 5 min |
| LinkedIn | 📦 Optional | Low | 5 min |
| Pinecone | 📦 Optional | Low | 5 min |

## 🔑 Quick Links

| Service | Get API Keys |
|---------|--------------|
| Google OAuth | https://console.cloud.google.com/ |
| LinkedIn OAuth | https://www.linkedin.com/developers/ |
| SendGrid | https://signup.sendgrid.com/ |
| OpenAI | https://platform.openai.com/ |
| Pinecone | https://www.pinecone.io/ |

## 🧪 Test Commands

```bash
npm run test:oauth      # OAuth (Google/LinkedIn)
npm run test:email      # Email (SendGrid)
npm run test:openai     # OpenAI API
npm run test:pinecone   # Pinecone Vector DB
npm run redis:test      # Redis Cache
npm run test:services   # All at once
```

## 📝 .env Template

```env
# ✅ Already configured
DATABASE_URL=postgresql://...
MONGODB_URI=mongodb://...
REDIS_URL=redis://...
JWT_SECRET=...

# ⚠️ Add these
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
SENDGRID_API_KEY=
EMAIL_FROM=
OPENAI_API_KEY=

# 📦 Optional
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=
PINECONE_API_KEY=
PINECONE_INDEX_NAME=
```

## 🚀 Setup Flow

```
1. npm run check:all
   ↓
2. npm run setup:services
   ↓
3. npm run test:services
   ↓
4. npm run dev
```

## 📚 Documentation

| File | Use Case |
|------|----------|
| START_HERE.md | First time |
| QUICK_SERVICE_SETUP.md | Fast setup |
| SERVICE_CONFIGURATION_GUIDE.md | Detailed |
| SERVICE_ARCHITECTURE.md | Architecture |
| SERVICES_README.md | Complete guide |

## 🎯 Priority Order

1. ✅ Check status: `npm run check:all`
2. 🔐 Google OAuth (5 min)
3. 📧 SendGrid (5 min)
4. 🤖 OpenAI (5 min)
5. 📦 Optional services

## 💡 Quick Tips

- **Development works** without external services
- **OAuth is optional** - email/password works
- **Test as you go** - test after each config
- **Use interactive setup** - easiest way
- **Check status first** - know what you need

## 🆘 Troubleshooting

```bash
# Problem: Don't know what's configured
npm run check:all

# Problem: OAuth not working
npm run test:oauth

# Problem: Email not sending
npm run test:email

# Problem: OpenAI errors
npm run test:openai
```

## ✅ What Works Now

- User registration/login
- Profile management
- Database operations
- Session management
- Password reset (dev mode)

## ⚠️ What Needs Config

- Social login
- Production emails
- AI features
- Semantic search

---

**Start:** `npm run check:all`
