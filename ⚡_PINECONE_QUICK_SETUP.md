# ⚡ Pinecone Quick Setup

## 🎯 Best Configuration (Copy These Exact Values)

```
Index Name:    givemejobs-jobs
Dimensions:    1536
Metric:        cosine
Pod Type:      Starter (s1.x1)
Replicas:      1
Pods:          1
```

---

## 🚀 3-Minute Setup

### Step 1: Create Account
Go to: https://www.pinecone.io/
Sign up (free)

### Step 2: Create Index
Click "Create Index" and enter:

| Field | Value |
|-------|-------|
| Index Name | `givemejobs-jobs` |
| Dimensions | `1536` |
| Metric | `cosine` |
| Pod Type | `Starter` |

Click "Create Index"

### Step 3: Get API Key
1. Go to "API Keys" section
2. Copy your API key

### Step 4: Add to .env
```env
PINECONE_API_KEY=your-api-key-here
PINECONE_INDEX_NAME=givemejobs-ar8xa44
PINECONE_HOST=https://givemejobs-ar8xa44.svc.aped-4627-b74a.pinecone.io
```

**Note:** Index name and host are already in your .env! Just add your API key.

### Step 5: Test
```bash
cd packages/backend
npm run test:pinecone
```

---

## ✅ Why These Settings?

### Dimensions: 1536
- Matches OpenAI embeddings
- Don't change this!

### Metric: cosine
- Best for text similarity
- Industry standard

### Pod Type: Starter
- Free tier
- 1M vectors included
- Perfect for development

---

## 🧪 Test Commands

```bash
# Test connection
npm run test:pinecone

# Initialize vector database
npm run vector:init

# Embed jobs
npm run jobs:embed
```

---

## 📊 What You Get (Free Tier)

- ✅ 1,000,000 vectors
- ✅ Unlimited queries
- ✅ ~6GB storage
- ✅ Perfect for MVP

---

## 🎯 Quick Reference

**Create Index:** https://app.pinecone.io/

**Dimensions:** `1536` (OpenAI embeddings)

**Metric:** `cosine` (semantic similarity)

**Pod Type:** `Starter` (free tier)

**Test:** `npm run test:pinecone`

---

**Detailed Guide:** See `PINECONE_BEST_CONFIG.md`
