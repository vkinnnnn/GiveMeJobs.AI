# ✅ Adzuna API Setup Guide

## 🎯 Quick Setup (5 Minutes)

### Step 1: Sign Up for Adzuna Developer Account

1. **Visit Adzuna Developer Portal**
   - Go to: https://developer.adzuna.com/
   - Click "Sign Up" or "Get Started"

2. **Create Your Account**
   - Fill in your details:
     - Name
     - Email
     - Company (can be personal/project name)
     - Use case: "Job aggregation platform"
   - Agree to terms
   - Click "Create Account"

3. **Verify Your Email**
   - Check your email inbox
   - Click the verification link
   - Log in to your account

### Step 2: Get Your API Credentials

1. **Access Your Dashboard**
   - Log in to: https://developer.adzuna.com/
   - Go to "My Applications" or "API Keys"

2. **Create New Application**
   - Click "Create New Application"
   - Application Name: "GiveMeJobs"
   - Description: "Job search and matching platform"
   - Click "Create"

3. **Copy Your Credentials**
   You'll receive two values:
   - **Application ID** (looks like: `12345678`)
   - **Application Key** (looks like: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`)

   ⚠️ **Save these immediately!** You'll need them in the next step.

### Step 3: Add Credentials to .env File

1. **Open your `.env` file** in the project root

2. **Find the Adzuna section** (near the bottom):
   ```env
   # Adzuna Job Board API (Official API - Free Tier)
   # Sign up at: https://developer.adzuna.com/
   ADZUNA_APP_ID=
   ADZUNA_APP_KEY=
   ```

3. **Paste your credentials**:
   ```env
   # Adzuna Job Board API (Official API - Free Tier)
   # Sign up at: https://developer.adzuna.com/
   ADZUNA_APP_ID=12345678
   ADZUNA_APP_KEY=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
   ```

4. **Save the file**

### Step 4: Test Your Integration

1. **Run the test suite**:
   ```bash
   cd packages/backend
   npm test -- adzuna.test.ts
   ```

2. **Expected output**:
   ```
   ✅ Found 5 jobs from Adzuna
   
   📋 First job:
      Title: Software Developer
      Company: Tech Company Inc
      Location: New York, NY
      Source: adzuna
      Posted: 10/28/2025
      Salary: $80,000 - $120,000
      Apply URL: https://www.adzuna.com/...
   
   ✅ All jobs have proper data structure
   ```

3. **If you see this**, you're all set! 🎉

### Step 5: Test in Your Application

1. **Start your backend**:
   ```bash
   cd packages/backend
   npm run dev
   ```

2. **Test the job search endpoint**:
   ```bash
   # Using curl (Windows CMD)
   curl "http://localhost:4000/api/jobs/search?keywords=developer&location=New York"
   
   # Or using PowerShell
   Invoke-WebRequest -Uri "http://localhost:4000/api/jobs/search?keywords=developer&location=New York"
   ```

3. **You should see jobs from multiple sources** including Adzuna!

---

## 📊 What You Get

### Free Tier Limits
- **Requests:** 1,000 calls per month
- **Rate Limit:** 1 request per second
- **Coverage:** 20+ countries
- **Cost:** $0 (Free forever)

### Paid Tiers (Optional)
- **Basic:** $99/month - 10,000 calls
- **Pro:** $299/month - 50,000 calls
- **Enterprise:** Custom pricing

For most MVPs, the **free tier is more than enough**!

### Countries Supported
- 🇺🇸 United States
- 🇬🇧 United Kingdom
- 🇨🇦 Canada
- 🇦🇺 Australia
- 🇩🇪 Germany
- 🇫🇷 France
- 🇮🇹 Italy
- 🇪🇸 Spain
- 🇳🇱 Netherlands
- 🇧🇷 Brazil
- 🇮🇳 India
- And 10+ more!

---

## 🔧 Configuration Options

### Change Default Country

Edit `packages/backend/src/services/job-adapters/adzuna-adapter.ts`:

```typescript
export class AdzunaAdapter extends BaseJobAdapter {
  name = 'adzuna';
  private appId: string;
  private appKey: string;
  private baseUrl = 'https://api.adzuna.com/v1/api/jobs';
  private country = 'us'; // Change this! Options: us, gb, ca, au, de, fr, etc.
```

### Adjust Results Per Page

When searching, you can control the number of results:

```typescript
const jobs = await adapter.search({
  keywords: 'developer',
  location: 'New York',
  limit: 20, // Change this (max: 50)
});
```

---

## 🧪 Testing Checklist

- [ ] Signed up for Adzuna account
- [ ] Got Application ID and Key
- [ ] Added credentials to .env file
- [ ] Ran test suite successfully
- [ ] Tested job search endpoint
- [ ] Verified jobs appear in results

---

## 🚨 Troubleshooting

### Issue: "Adzuna credentials not configured"

**Solution:**
1. Check your `.env` file has the credentials
2. Restart your backend server
3. Make sure there are no spaces around the `=` sign

### Issue: "401 Unauthorized"

**Solution:**
1. Double-check your Application ID and Key
2. Make sure you copied them correctly (no extra spaces)
3. Verify your account is activated (check email)

### Issue: "No jobs returned"

**Solution:**
1. Try different search terms (e.g., "developer" instead of specific tech)
2. Try broader locations (e.g., "United States" instead of specific city)
3. Check if the country code matches your location

### Issue: "Rate limit exceeded"

**Solution:**
1. You've made more than 1 request per second
2. Wait a few seconds and try again
3. Implement request throttling in your code

### Issue: "Network timeout"

**Solution:**
1. Check your internet connection
2. Adzuna API might be temporarily down (rare)
3. Try again in a few minutes

---

## 📈 Usage Monitoring

### Check Your Usage

1. Log in to: https://developer.adzuna.com/
2. Go to "Dashboard" or "Usage"
3. See your API call statistics

### Set Up Alerts

1. In Adzuna dashboard, go to "Settings"
2. Enable email alerts for:
   - 80% of monthly quota used
   - 100% of monthly quota used

---

## 🎯 What's Next?

### Your Integration is Complete! ✅

You now have:
- ✅ Real job data from Adzuna
- ✅ Mock data from Indeed, LinkedIn, Glassdoor (as fallback)
- ✅ Automatic deduplication
- ✅ Error handling and fallbacks
- ✅ Multi-source job aggregation

### Optional Enhancements:

1. **Add More Sources**
   - JSearch API (multi-source via RapidAPI)
   - The Muse API
   - GitHub Jobs

2. **Implement Caching**
   - Cache job results in Redis
   - Reduce API calls
   - Faster response times

3. **Add Job Alerts**
   - Save user search preferences
   - Run scheduled searches
   - Email new matching jobs

4. **Improve Matching**
   - Use AI to score job matches
   - Personalize results per user
   - Learn from user interactions

---

## 📚 Resources

- **Adzuna API Docs:** https://developer.adzuna.com/docs
- **API Reference:** https://developer.adzuna.com/docs/search
- **Support:** support@adzuna.com
- **Status Page:** https://status.adzuna.com/

---

## 💡 Pro Tips

1. **Cache Results:** Store job results in Redis for 1 hour to reduce API calls
2. **Batch Requests:** Search for multiple keywords in one session
3. **Use Webhooks:** Set up webhooks for new job notifications (premium feature)
4. **Monitor Usage:** Keep an eye on your monthly quota
5. **Fallback Strategy:** Always have mock data as fallback

---

## ✨ Summary

**Setup Time:** 5 minutes  
**Cost:** Free (1,000 calls/month)  
**Status:** ✅ Ready to use  
**Coverage:** 20+ countries  
**Reliability:** High (official API)  

**You're all set!** Your GiveMeJobs platform now has real job data from Adzuna. 🎉

Start your backend and test it:
```bash
cd packages/backend
npm run dev
```

Then visit: http://localhost:4000/api/jobs/search?keywords=developer&location=New%20York

Happy job hunting! 🚀
