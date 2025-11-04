# 📊 Sentry Error Tracking Setup

## What is Sentry?

Sentry is an error tracking and performance monitoring service that helps you:
- Track errors in production
- Monitor performance issues
- Get alerts when things break
- Debug issues with stack traces

**Free Tier:** 5,000 errors/month, 10,000 performance units/month

---

## Quick Setup (5 Minutes)

### Step 1: Sign Up for Sentry

1. Go to: https://sentry.io/signup/
2. Sign up with:
   - Email
   - Or GitHub
   - Or Google

### Step 2: Create a Project

1. After signing up, click **"Create Project"**
2. Select platform: **Node.js**
3. Set alert frequency: **Alert me on every new issue** (recommended)
4. Project name: **givemejobs-backend**
5. Click **"Create Project"**

### Step 3: Get Your DSN

After creating the project, you'll see a screen with your DSN.

It looks like:
```
https://abc123def456@o123456.ingest.sentry.io/7890123
```

**Copy this DSN!**

### Step 4: Add to .env File

Open `packages/backend/.env` and add:

```env
# Sentry Error Tracking
SENTRY_DSN=https://your-dsn-here@o123456.ingest.sentry.io/7890123
SENTRY_ENVIRONMENT=development
SENTRY_TRACES_SAMPLE_RATE=0.1
SENTRY_PROFILES_SAMPLE_RATE=0.1
```

Replace `https://your-dsn-here@o123456.ingest.sentry.io/7890123` with your actual DSN.

### Step 5: Restart Backend

```bash
# The backend will automatically pick up the new config
# If using watch mode, it should restart automatically
# Otherwise, stop and start the backend
```

### Step 6: Test It

The warning should be gone and you'll see:
```
✅ Sentry error tracking initialized
```

---

## Configuration Options

### Environment Variables

Add these to `packages/backend/.env`:

```env
# Sentry Configuration
SENTRY_DSN=https://your-dsn@sentry.io/project-id
SENTRY_ENVIRONMENT=development  # or production, staging
SENTRY_TRACES_SAMPLE_RATE=0.1  # 10% of transactions
SENTRY_PROFILES_SAMPLE_RATE=0.1  # 10% of profiles
SENTRY_RELEASE=givemejobs-backend@1.0.0  # Optional
```

### Sample Rates Explained

- **SENTRY_TRACES_SAMPLE_RATE**: Percentage of performance traces to send
  - `0.1` = 10% (recommended for development)
  - `1.0` = 100% (use in production if needed)
  - Lower = less data sent = lower costs

- **SENTRY_PROFILES_SAMPLE_RATE**: Percentage of profiles to capture
  - `0.1` = 10% (recommended)
  - Helps identify performance bottlenecks

---

## What Gets Tracked?

### Errors Tracked:
- ✅ Unhandled exceptions
- ✅ API errors
- ✅ Database errors
- ✅ Authentication failures
- ✅ External API failures

### Errors NOT Tracked:
- ❌ Validation errors (filtered out)
- ❌ Expected errors (like 404s)
- ❌ Network timeouts (filtered out)

### Performance Tracking:
- ✅ API response times
- ✅ Database query performance
- ✅ External API calls
- ✅ Memory usage
- ✅ CPU usage

---

## Sentry Dashboard

After setup, you can:

1. **View Errors**: https://sentry.io/organizations/your-org/issues/
2. **Performance**: https://sentry.io/organizations/your-org/performance/
3. **Releases**: Track deployments
4. **Alerts**: Set up email/Slack notifications

---

## For Different Environments

### Development (.env)
```env
SENTRY_DSN=https://dev-dsn@sentry.io/dev-project
SENTRY_ENVIRONMENT=development
SENTRY_TRACES_SAMPLE_RATE=0.1
```

### Production (.env.production)
```env
SENTRY_DSN=https://prod-dsn@sentry.io/prod-project
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.5  # Higher for production
```

---

## Testing Sentry

### Test Error Tracking

Add a test endpoint (temporary):

```typescript
// In packages/backend/src/index.ts
app.get('/test-sentry', (req, res) => {
  throw new Error('Test Sentry error!');
});
```

Then visit: http://localhost:4000/test-sentry

You should see the error in your Sentry dashboard within seconds!

---

## Pricing

### Free Tier (Perfect for MVP)
- 5,000 errors/month
- 10,000 performance units/month
- 1 project
- 30 days data retention

### Paid Plans (When You Scale)
- **Team**: $26/month - 50K errors
- **Business**: $80/month - 150K errors
- **Enterprise**: Custom pricing

**For your MVP, free tier is more than enough!**

---

## Alternative: Disable Sentry

If you don't want to use Sentry right now, you can:

### Option 1: Just ignore the warning
- It's harmless
- Platform works fine without it

### Option 2: Suppress the warning

In `packages/backend/src/config/sentry.config.ts`:

```typescript
export const initializeSentry = (): boolean => {
  if (!config.sentry?.dsn) {
    // console.warn('⚠️  Sentry DSN not configured. Error tracking disabled.');
    return false;
  }
  // ... rest of code
};
```

---

## Troubleshooting

### Issue: "Invalid DSN"

**Solution:** Make sure you copied the entire DSN including `https://`

### Issue: "No errors showing in Sentry"

**Solution:**
1. Check DSN is correct
2. Verify environment is not 'test'
3. Try the test endpoint above
4. Check Sentry project settings

### Issue: "Too many events"

**Solution:** Lower the sample rates:
```env
SENTRY_TRACES_SAMPLE_RATE=0.01  # 1%
```

---

## Summary

**To set up Sentry:**

1. Sign up: https://sentry.io/signup/
2. Create Node.js project
3. Copy DSN
4. Add to `.env`:
   ```env
   SENTRY_DSN=your-dsn-here
   ```
5. Restart backend
6. Done! ✅

**Time:** 5 minutes  
**Cost:** Free (5K errors/month)  
**Benefit:** Professional error tracking

---

## Current Status

**Without Sentry:**
- ⚠️ Warning message (harmless)
- ✅ Platform works perfectly
- ❌ No error tracking

**With Sentry:**
- ✅ No warning
- ✅ Platform works perfectly
- ✅ Professional error tracking
- ✅ Performance monitoring
- ✅ Production-ready

---

## Recommendation

**For MVP/Development:** Optional - you can add it later  
**For Production:** Highly recommended - catch errors before users report them

**Your platform works great without it!** Add Sentry when you're ready to deploy to production.

---

*Need help setting it up? Just share your Sentry DSN and I'll add it to your .env file!*
