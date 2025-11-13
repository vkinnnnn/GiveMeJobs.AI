# Quick Start Guide - GiveMeJobs Platform

## Prerequisites

- Node.js installed (v18 or higher)
- Docker Desktop installed and running

## Option 1: Automated Setup (Windows - Easiest)

### Just run this:
```bash
setup-databases.bat
```

This will:
1. Start PostgreSQL, MongoDB, and Redis
2. Run database migrations
3. Initialize MongoDB
4. Verify everything is working

Then:
```bash
cd packages\backend
npm run check:all
npm run dev
```

## Option 2: Manual Setup (All Platforms)

### Step 1: Start Databases (1 minute)
```bash
docker-compose up -d postgres mongodb redis
```

### Step 2: Run Migrations (1 minute)
```bash
cd packages/backend
npm run migrate:up
npm run mongo:init
```

### Step 3: Verify Setup (30 seconds)
```bash
npm run check:all
```

You should see:
```
✅ PostgreSQL: Configured
✅ MongoDB: Configured
✅ Redis: Configured
✅ JWT: Configured
```

### Step 4: Start Backend (30 seconds)
```bash
npm run dev
```

Your backend is now running at http://localhost:4000

## What Just Happened?

### Databases Started
- **PostgreSQL** (port 5432) - Stores users, jobs, applications
- **MongoDB** (port 27017) - Stores documents, resumes
- **Redis** (port 6379) - Handles sessions, caching

### Tables Created
- Users and profiles
- Skills and experience
- Jobs and applications
- Interview prep data
- And more...

### JWT Configured
- Access tokens (15 min expiry)
- Refresh tokens (7 day expiry)

## Service Configuration

### Check Current Status
```bash
cd packages/backend
npm run check:all
```

This will show you:
- What's already configured
- What needs configuration
- How to fix it

### Three Ways to Configure

#### 1. Interactive Setup (Easiest)
```bash
npm run setup:services
```
Walks you through each service step-by-step.

#### 2. Manual Setup (Most Control)
1. Open `.env` file
2. Follow `SERVICE_CONFIGURATION_GUIDE.md`
3. Add your API keys

#### 3. Test What Works (See Current State)
```bash
npm run test:services
```
Tests OAuth, Email, and Redis.

### Priority Services

#### High Priority
1. **Google OAuth** - Social login (5 min)
   ```bash
   npm run test:oauth
   ```

#### Medium Priority
2. **Resend** - Production emails (Already configured!)
   ```bash
   npm run test:email
   ```

3. **OpenAI** - AI features (5 min)
   ```bash
   npm run test:openai
   ```

#### Optional
- LinkedIn OAuth
- Pinecone
- Job Board APIs

## Verify Everything Works

### Check Service Status
```bash
cd packages/backend
npm run check:all
```

### Test Database Connections
```bash
# Test Redis
npm run redis:test

# Check Docker containers
docker-compose ps
```

### View Database Logs
```bash
docker-compose logs -f postgres mongodb redis
```

## Common Issues & Fixes

### "Docker is not running"
**Fix:** Start Docker Desktop and wait for it to fully start

### "Port already in use"
**Fix:** Stop the conflicting service or change ports in `.env`

```bash
# Check what's using port 5432
netstat -ano | findstr :5432

# Or change port in .env
POSTGRES_PORT=5433
```

### "Cannot connect to database"
**Fix:** Restart the databases

```bash
docker-compose restart postgres mongodb redis
```

### "Migration failed"
**Fix:** Make sure PostgreSQL is running, then try again

```bash
docker-compose ps postgres
cd packages/backend
npm run migrate:up
```

## Next Steps

### 1. Start the Frontend (1 minute)

In a new terminal:
```bash
cd packages/frontend
npm run dev
```

Frontend will be at http://localhost:3000

### 2. Test the API (optional)

Visit http://localhost:4000/api/health

You should see:
```json
{
  "status": "ok",
  "timestamp": "2024-..."
}
```

### 3. Configure Optional Services (15 minutes)

Your app works now, but you can add more features:

```bash
cd packages/backend
npm run setup:services
```

This will help you configure:
- Google OAuth (social login)
- Resend (production emails - already done!)
- OpenAI (AI features)

## What You Can Do Now

### Working Features (No Additional Config)
- User registration (email + password)
- User login
- Profile management
- Job listings (manual/database)
- Application tracking
- Session management
- Password reset (dev mode)

### Needs Configuration (Optional)
- Social login (Google/LinkedIn)
- Production emails (Resend - already configured!)
- AI features (OpenAI)
- Semantic job search (Pinecone)
- External job boards (Indeed/Glassdoor)

## Useful Commands

### Database Management
```bash
# Start databases
docker-compose up -d postgres mongodb redis

# Stop databases
docker-compose stop postgres mongodb redis

# Restart databases
docker-compose restart postgres mongodb redis

# View logs
docker-compose logs -f postgres mongodb redis

# Remove everything (including data)
docker-compose down -v
```

### Backend Development
```bash
cd packages/backend

# Start development server
npm run dev

# Run migrations
npm run migrate:up

# Check service status
npm run check:all

# Test services
npm run test:services
```

### Database Access
```bash
# PostgreSQL
docker exec -it givemejobs-postgres psql -U givemejobs -d givemejobs_db

# MongoDB
docker exec -it givemejobs-mongodb mongosh -u givemejobs -p dev_password

# Redis
docker exec -it givemejobs-redis redis-cli -a dev_password
```

## Quick Reference

```bash
# Setup (first time)
docker-compose up -d postgres mongodb redis
cd packages/backend
npm run migrate:up
npm run mongo:init
npm run check:all

# Daily development
docker-compose up -d postgres mongodb redis
cd packages/backend
npm run dev

# Stop everything
docker-compose stop
```

## Success Checklist

- [ ] Docker Desktop is running
- [ ] Databases started: `docker-compose up -d postgres mongodb redis`
- [ ] Migrations run: `npm run migrate:up`
- [ ] MongoDB initialized: `npm run mongo:init`
- [ ] Status check passes: `npm run check:all`
- [ ] Backend running: `npm run dev`
- [ ] Can access: http://localhost:4000/api/health

**All checked?** You're ready to develop!

## Need Help?

### Check Status
```bash
cd packages/backend
npm run check:all
```

### View Logs
```bash
docker-compose logs -f postgres mongodb redis
```

### Restart Everything
```bash
docker-compose restart postgres mongodb redis
cd packages/backend
npm run dev
```

**Quick Start:** `setup-databases.bat` (Windows) or follow manual steps above

**Need detailed help?** See `SERVICE_CONFIGURATION_GUIDE.md`