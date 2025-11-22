# 🚀 Start Project & Test Mr.Tailour - Quick Guide

## Prerequisites Check

Before starting, ensure you have:
- ✅ Node.js 20+ installed
- ✅ Docker Desktop running
- ✅ npm or yarn installed

---

## Step 1: Start Database Services

Open a terminal and run:

```bash
# Start all database services (PostgreSQL, MongoDB, Redis)
npm run docker:up

# Or using docker-compose directly
docker-compose up -d
```

**Wait for services to be healthy** (about 30-60 seconds). Check status:
```bash
docker ps
```

You should see:
- `givemejobs-postgres` (PostgreSQL)
- `givemejobs-mongodb` (MongoDB)
- `givemejobs-redis` (Redis)

---

## Step 2: Install Dependencies (if not done)

```bash
# Install root dependencies
npm install

# Install all workspace dependencies
npm install --workspaces
```

---

## Step 3: Configure Environment Variables

### Backend Environment

Create `packages/backend/.env`:

```env
# Database
DATABASE_URL=postgresql://givemejobs:dev_password@localhost:5432/givemejobs_db
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=givemejobs
POSTGRES_PASSWORD=dev_password
POSTGRES_DB=givemejobs_db

# MongoDB
MONGODB_URI=mongodb://givemejobs:dev_password@localhost:27017/givemejobs_docs?authSource=admin
MONGO_DB=givemejobs_docs

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=dev_password

# Server
PORT=4000
NODE_ENV=development
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d

# OpenAI (REQUIRED for Mr.Tailour)
OPENAI_API_KEY=your-openai-api-key-here

# Optional Services
RESEND_API_KEY=your-resend-api-key
PINECONE_API_KEY=your-pinecone-api-key
SENTRY_DSN=your-sentry-dsn
```

### Frontend Environment

Create `packages/frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Step 4: Initialize Databases

```bash
cd packages/backend

# Run database migrations
npm run migrate:up

# Initialize MongoDB collections
npm run mongo:init
```

---

## Step 5: Start Backend Server

Open a new terminal:

```bash
cd packages/backend
npm run dev
```

**Backend should start on:** http://localhost:4000

You should see:
```
Server running on port 4000
Database connected
MongoDB connected
Redis connected
```

---

## Step 6: Start Frontend Application

Open another new terminal:

```bash
cd packages/frontend
npm run dev
```

**Frontend should start on:** http://localhost:3000

---

## Step 7: Access the Application

- **Frontend UI**: http://localhost:3000
- **Backend API**: http://localhost:4000
- **API Docs** (if Swagger enabled): http://localhost:4000/docs

---

## 🧪 Testing Mr.Tailour

### Test 1: Create User Account

1. Go to http://localhost:3000
2. Register a new account or login
3. Complete your profile:
   - Go to Profile/Settings
   - Add your information:
     - Name, Email, Phone, Location
     - Professional Headline (e.g., "Data Analyst")

### Test 2: Add Profile Data

**Add Skills:**
- Go to Profile → Skills
- Add skills relevant to data analytics:
  - Python (proficiency: 4, years: 3)
  - SQL (proficiency: 5, years: 4)
  - Tableau (proficiency: 4, years: 2)
  - Excel (proficiency: 5, years: 5)
  - Statistics (proficiency: 4, years: 3)

**Add Experience:**
- Go to Profile → Experience
- Add your work experience:
  - Company, Title, Dates
  - Description of your data analytics work
  - Key achievements

**Add Education:**
- Go to Profile → Education
- Add your degrees/certifications

### Test 3: Create/Save a Data Analytics Job

1. Go to Jobs section
2. Search for "data analyst" or "data analytics"
3. Save a job to your saved jobs list

### Test 4: Generate Resume with Mr.Tailour

1. Go to **Documents** → **Generate Document**
2. Select:
   - **Document Type**: Resume
   - **Job**: Select the data analytics job you saved
   - **Template**: Default or choose one
   - **Tone**: Professional
   - **Length**: Standard
   - **Focus Areas**: "data analysis", "statistics", "visualization"
3. Click **"Generate Resume"**
4. Wait 5-10 seconds for generation
5. Review the generated resume
6. Edit if needed
7. Export as PDF/DOCX

---

## 🔍 Testing Checklist

### Backend API Tests

```bash
cd packages/backend

# Run unit tests
npm test

# Run integration tests
npm run test:e2e

# Test document generation specifically
npm run test:e2e -- document-generation
```

### Frontend Tests

```bash
cd packages/frontend

# Run tests
npm test

# Run E2E tests
npm run test:e2e
```

### Manual API Testing

Test the document generation endpoint:

```bash
# First, get a JWT token (after login)
TOKEN="your-jwt-token-here"
JOB_ID="your-job-id-here"

# Generate resume
curl -X POST http://localhost:4000/api/documents/generate/resume \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jobId": "'$JOB_ID'",
    "customizations": {
      "tone": "professional",
      "length": "standard",
      "focusAreas": ["data analysis", "statistics"]
    }
  }'
```

---

## 🐛 Troubleshooting

### Database Connection Issues

```bash
# Check if databases are running
docker ps

# Check database logs
docker logs givemejobs-postgres
docker logs givemejobs-mongodb
docker logs givemejobs-redis

# Restart databases
docker-compose restart
```

### Port Already in Use

```bash
# Check what's using the port
# Windows
netstat -ano | findstr :4000
netstat -ano | findstr :3000

# Kill the process or change port in .env
```

### OpenAI API Key Missing

**Error**: "AI service is not configured"

**Solution**: 
1. Get OpenAI API key from https://platform.openai.com/api-keys
2. Add to `packages/backend/.env`:
   ```
   OPENAI_API_KEY=sk-your-key-here
   ```
3. Restart backend server

### MongoDB Connection Error

```bash
# Check MongoDB is running
docker ps | grep mongodb

# Check connection string in .env
# Should be: mongodb://givemejobs:dev_password@localhost:27017/givemejobs_docs?authSource=admin
```

### Frontend Can't Connect to Backend

1. Check `NEXT_PUBLIC_API_URL` in `packages/frontend/.env.local`
2. Should be: `http://localhost:4000`
3. Restart frontend server

---

## 📊 Monitoring

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker logs -f givemejobs-postgres
docker logs -f givemejobs-mongodb
```

### Check Service Health

```bash
# Backend health
curl http://localhost:4000/api/health

# Database connections
cd packages/backend
npm run test:connections
```

---

## 🎯 Quick Test Script

Create a test script to verify everything works:

```bash
# test-mr-tailour.sh
#!/bin/bash

echo "Testing Mr.Tailour Setup..."

# Check databases
echo "Checking databases..."
docker ps | grep -q givemejobs-postgres && echo "✅ PostgreSQL running" || echo "❌ PostgreSQL not running"
docker ps | grep -q givemejobs-mongodb && echo "✅ MongoDB running" || echo "❌ MongoDB not running"
docker ps | grep -q givemejobs-redis && echo "✅ Redis running" || echo "❌ Redis not running"

# Check backend
echo "Checking backend..."
curl -s http://localhost:4000/api/health > /dev/null && echo "✅ Backend running" || echo "❌ Backend not running"

# Check frontend
echo "Checking frontend..."
curl -s http://localhost:3000 > /dev/null && echo "✅ Frontend running" || echo "❌ Frontend not running"

echo "Test complete!"
```

---

## ✅ Success Indicators

You're ready to test when:

1. ✅ All Docker containers are running
2. ✅ Backend server shows "Server running on port 4000"
3. ✅ Frontend loads at http://localhost:3000
4. ✅ You can login/register
5. ✅ You can access Documents section
6. ✅ OpenAI API key is configured

---

## 🚀 Next Steps After Setup

1. **Complete your profile** with skills, experience, education
2. **Find and save a data analytics job**
3. **Generate your first resume** with Mr.Tailour
4. **Test all features**:
   - Document editing
   - Version history
   - Export (PDF, DOCX, TXT)
   - Template selection

---

**Happy Testing! 🎉**



