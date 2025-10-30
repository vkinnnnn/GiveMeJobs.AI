# Troubleshooting Guide

## Current Issues (32 TypeScript Errors)

All current errors are due to **missing node_modules**. They will be resolved by running:

```bash
npm install
```

### Error Categories

#### 1. Module Not Found Errors (8 errors)
```
Cannot find module 'express'
Cannot find module 'pg'
Cannot find module 'uuid'
Cannot find module 'bcrypt'
Cannot find module 'jsonwebtoken'
Cannot find module 'crypto'
Cannot find module 'nodemailer'
```

**Cause:** Dependencies not installed  
**Fix:** Run `npm install`

#### 2. Type Definition Errors (1 error)
```
Cannot find type definition file for 'node'
```

**Cause:** @types/node not installed  
**Fix:** Run `npm install` (it's already in devDependencies)

#### 3. Global Object Errors (23 errors)
```
Cannot find name 'process'
Cannot find name 'console'
```

**Cause:** @types/node not installed, which provides these global types  
**Fix:** Run `npm install`

## Step-by-Step Resolution

### Step 1: Install Dependencies

```bash
cd packages/backend
npm install
```

This installs:
- 18 runtime dependencies
- 14 development dependencies (including all @types packages)

### Step 2: Verify Installation

```bash
node verify-setup.js
```

This script checks:
- ✅ node_modules exists
- ✅ All required packages are installed
- ✅ TypeScript configuration is correct
- ✅ All source files exist

### Step 3: Run Type Check

```bash
npm run type-check
```

Should show: **0 errors** ✅

### Step 4: Start Development Server

```bash
npm run dev
```

## Common Issues After Installation

### Issue: TypeScript Still Shows Errors

**Solution 1: Restart TypeScript Server**
- VS Code: Press `Ctrl+Shift+P` → "TypeScript: Restart TS Server"
- Other IDEs: Restart the IDE

**Solution 2: Clear TypeScript Cache**
```bash
rm -rf node_modules/.cache
rm -rf dist
npm run build
```

**Solution 3: Verify tsconfig.json**
Ensure `tsconfig.json` includes:
```json
{
  "compilerOptions": {
    "types": ["node"],
    "lib": ["ES2022"]
  }
}
```

### Issue: Import Errors Persist

**Check if packages are actually installed:**
```bash
ls node_modules/express
ls node_modules/@types/node
```

**Reinstall if missing:**
```bash
rm -rf node_modules package-lock.json
npm install
```

### Issue: "Cannot find module" at Runtime

**Cause:** Package installed but not in dependencies  
**Fix:** Check package.json and add missing package:
```bash
npm install <package-name>
```

### Issue: Peer Dependency Warnings

**Solution:**
```bash
npm install --legacy-peer-deps
```

Or update conflicting packages:
```bash
npm update
```

## Database Connection Issues

### PostgreSQL Connection Failed

**Check if Docker is running:**
```bash
docker ps
```

**Start database containers:**
```bash
cd ../..  # Go to project root
docker-compose up -d
```

**Verify connection:**
```bash
psql -h localhost -U givemejobs -d givemejobs_db
# Password: dev_password
```

### Redis Connection Failed

**Check Redis container:**
```bash
docker ps | grep redis
```

**Test Redis connection:**
```bash
npm run redis:test
```

**Manual test:**
```bash
redis-cli -h localhost -p 6379 -a dev_password
> PING
PONG
```

### MongoDB Connection Failed

**Check MongoDB container:**
```bash
docker ps | grep mongo
```

**Test connection:**
```bash
mongosh "mongodb://givemejobs:dev_password@localhost:27017/givemejobs_docs?authSource=admin"
```

## Environment Variable Issues

### Missing .env File

**Copy from example:**
```bash
cp ../../.env.example ../../.env
```

**Required variables:**
```env
# Database
DATABASE_URL=postgresql://givemejobs:dev_password@localhost:5432/givemejobs_db
MONGODB_URI=mongodb://givemejobs:dev_password@localhost:27017/givemejobs_docs?authSource=admin
REDIS_URL=redis://:dev_password@localhost:6379

# JWT (CHANGE THESE!)
JWT_SECRET=your-secret-key-change-in-production
JWT_REFRESH_SECRET=your-refresh-secret-key-change-in-production

# OAuth (Get from provider dashboards)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
LINKEDIN_CLIENT_ID=your-linkedin-client-id
LINKEDIN_CLIENT_SECRET=your-linkedin-client-secret
```

### JWT Secret Not Set

**Error:** "Invalid JWT secret"  
**Fix:** Set in .env:
```env
JWT_SECRET=generate-a-random-secret-here
JWT_REFRESH_SECRET=generate-another-random-secret-here
```

**Generate secure secrets:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## OAuth Issues

### Google OAuth Not Working

**Check configuration:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create OAuth 2.0 credentials
3. Add authorized redirect URI:
   ```
   http://localhost:4000/api/auth/oauth/google/callback
   ```
4. Copy Client ID and Secret to .env

### LinkedIn OAuth Not Working

**Check configuration:**
1. Go to [LinkedIn Developers](https://www.linkedin.com/developers/)
2. Create an app
3. Add redirect URL:
   ```
   http://localhost:4000/api/auth/oauth/linkedin/callback
   ```
4. Copy Client ID and Secret to .env

## Email Service Issues

### Emails Not Sending

**Development Mode:**
- Uses Ethereal Email (test service)
- Check console for preview URLs
- No configuration needed

**Production Mode:**
- Requires SendGrid API key
- Set in .env:
  ```env
  SENDGRID_API_KEY=your-api-key
  EMAIL_FROM=noreply@yourdomain.com
  ```

### Email Preview URLs Not Showing

**Check console output:**
```bash
npm run dev
# Look for: "Preview URL: https://ethereal.email/message/..."
```

## Migration Issues

### Migration Failed

**Reset database:**
```bash
npm run migrate:down
npm run migrate:up
```

**Check migration status:**
```bash
npm run migrate:status
```

**Create new migration:**
```bash
npm run migrate:create my-migration-name
```

## Build Issues

### TypeScript Compilation Errors

**Run type check:**
```bash
npm run type-check
```

**Build project:**
```bash
npm run build
```

**Check output:**
```bash
ls -la dist/
```

## Runtime Issues

### Server Won't Start

**Check port availability:**
```bash
lsof -i :4000  # On Unix/Mac
netstat -ano | findstr :4000  # On Windows
```

**Kill process using port:**
```bash
kill -9 <PID>  # On Unix/Mac
taskkill /PID <PID> /F  # On Windows
```

### Authentication Fails

**Check JWT tokens:**
- Verify JWT_SECRET is set
- Check token expiration
- Verify Authorization header format: `Bearer <token>`

**Test with curl:**
```bash
# Login
TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"SecurePass123!"}' \
  | jq -r '.data.tokens.accessToken')

# Use token
curl http://localhost:4000/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

## Getting Help

### Check Logs

**Server logs:**
```bash
npm run dev
# Watch console output
```

**Database logs:**
```bash
docker logs givemejobs-postgres
docker logs givemejobs-mongodb
docker logs givemejobs-redis
```

### Verify Setup

**Run verification script:**
```bash
node verify-setup.js
```

### Documentation

- **API Documentation:** See `AUTH_SERVICE.md`
- **Quick Start:** See `AUTH_QUICK_START.md`
- **Database Setup:** See `DATABASE.md`
- **Installation:** See `INSTALL.md`

## Quick Fix Checklist

- [ ] Run `npm install`
- [ ] Copy `.env.example` to `.env`
- [ ] Start Docker containers: `docker-compose up -d`
- [ ] Run migrations: `npm run migrate:up`
- [ ] Initialize MongoDB: `npm run mongo:init`
- [ ] Test Redis: `npm run redis:test`
- [ ] Restart TypeScript server in IDE
- [ ] Run verification: `node verify-setup.js`
- [ ] Start server: `npm run dev`

If all else fails, try a clean install:
```bash
rm -rf node_modules package-lock.json dist
npm install
npm run build
npm run dev
```
