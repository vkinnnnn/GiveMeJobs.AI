# 🔗 LinkedIn OAuth Setup Guide

## What You Need

You need to create a LinkedIn App to get OAuth credentials for social login.

---

## Step-by-Step Setup (10 minutes)

### Step 1: Create LinkedIn App

1. **Go to LinkedIn Developers**
   - Visit: https://www.linkedin.com/developers/apps
   - Sign in with your LinkedIn account

2. **Click "Create app"**

3. **Fill in App Details:**
   - **App name:** GiveMeJobs
   - **LinkedIn Page:** 
     - If you have a company page, select it
     - If not, click "Create a new LinkedIn Page" and create one
   - **App logo:** Upload your logo (optional but recommended)
   - **Legal agreement:** Check the box to agree to terms
   - Click **"Create app"**

### Step 2: Configure OAuth Settings

1. **Go to "Auth" tab** in your app dashboard

2. **Add Redirect URLs:**
   
   Click "Add redirect URL" and add these:
   
   **For Development:**
   ```
   http://localhost:4000/api/auth/oauth/linkedin/callback
   ```
   
   **For Production (when you deploy):**
   ```
   https://yourdomain.com/api/auth/oauth/linkedin/callback
   ```
   
   Click **"Update"** after adding each URL

3. **Request Product Access:**
   
   You need to request access to LinkedIn's Sign In with LinkedIn product:
   
   - Go to the **"Products"** tab
   - Find **"Sign In with LinkedIn using OpenID Connect"**
   - Click **"Request access"**
   - Fill out the form explaining your use case
   - Wait for approval (usually instant for basic access)

### Step 3: Get Your Credentials

1. **Go to "Auth" tab**

2. **Copy your credentials:**
   - **Client ID** - Copy this
   - **Client Secret** - Click "Show" and copy this

### Step 4: Add to Your .env File

Open your `.env` file in the root directory and add:

```env
# LinkedIn OAuth
LINKEDIN_CLIENT_ID=your-client-id-here
LINKEDIN_CLIENT_SECRET=your-client-secret-here
LINKEDIN_CALLBACK_URL=http://localhost:4000/api/auth/oauth/linkedin/callback
```

Replace `your-client-id-here` and `your-client-secret-here` with the values you copied.

### Step 5: Test Your Configuration

```bash
cd packages/backend
npm run test:oauth
```

You should see:
```
✅ LinkedIn OAuth credentials found
   Client ID: 77abc...
   Callback URL: http://localhost:4000/api/auth/oauth/linkedin/callback
```

### Step 6: Test OAuth Flow

1. **Start your backend:**
   ```bash
   npm run dev
   ```

2. **Visit in browser:**
   ```
   http://localhost:4000/api/auth/oauth/linkedin
   ```

3. **You should be redirected to LinkedIn login**

4. **After login, you'll be redirected back to your app**

---

## What Scopes Are Configured?

Your app requests these permissions from LinkedIn:

- **`openid`** - Basic authentication
- **`profile`** - User's profile information (name, photo)
- **`email`** - User's email address

These are configured in your code at:
`packages/backend/src/config/passport.config.ts`

---

## Troubleshooting

### "Redirect URI mismatch"

**Problem:** The callback URL doesn't match what's configured in LinkedIn

**Fix:** 
1. Check your LinkedIn app's Auth tab
2. Make sure this URL is added: `http://localhost:4000/api/auth/oauth/linkedin/callback`
3. Make sure there are no trailing slashes
4. URLs are case-sensitive

### "Invalid client credentials"

**Problem:** Client ID or Secret is wrong

**Fix:**
1. Go to your LinkedIn app's Auth tab
2. Copy the Client ID and Client Secret again
3. Update your `.env` file
4. Restart your backend: `npm run dev`

### "Product access required"

**Problem:** You haven't requested access to "Sign In with LinkedIn"

**Fix:**
1. Go to Products tab in your LinkedIn app
2. Request access to "Sign In with LinkedIn using OpenID Connect"
3. Wait for approval (usually instant)

### "App is in development mode"

**Problem:** LinkedIn app is in development mode and only works for you

**Fix:**
- For testing, this is fine - you can log in with your account
- For production, you need to verify your app with LinkedIn
- Go to Settings tab and follow verification steps

---

## LinkedIn App Settings

### Recommended Settings

1. **App visibility:** Private (for development)
2. **App logo:** Upload your logo (builds trust)
3. **Privacy policy URL:** Add when you have one
4. **Terms of service URL:** Add when you have one

### Required Information

LinkedIn requires:
- App name
- App description
- Company/Organization
- Privacy policy (for production)

---

## Differences from Google Cloud Connector

The link you shared is for **Google Cloud's Integration Connectors**, which is:
- ❌ For enterprise integrations
- ❌ Requires Google Cloud Platform
- ❌ Different from OAuth login
- ❌ More complex and expensive

What you need is:
- ✅ LinkedIn OAuth 2.0 (direct)
- ✅ Free to use
- ✅ For user authentication
- ✅ Simple setup

---

## What LinkedIn OAuth Enables

After setup, users can:
- ✅ Sign in with LinkedIn
- ✅ Register with one click
- ✅ Auto-fill profile from LinkedIn
- ✅ Import work experience
- ✅ Import skills and endorsements

---

## Production Deployment

When you deploy to production:

1. **Update redirect URL in LinkedIn app:**
   ```
   https://yourdomain.com/api/auth/oauth/linkedin/callback
   ```

2. **Update .env for production:**
   ```env
   LINKEDIN_CALLBACK_URL=https://yourdomain.com/api/auth/oauth/linkedin/callback
   API_URL=https://yourdomain.com
   ```

3. **Verify your app with LinkedIn:**
   - Go to Settings tab
   - Complete verification process
   - Add privacy policy and terms of service

---

## Testing Checklist

- [ ] LinkedIn app created
- [ ] Redirect URL added: `http://localhost:4000/api/auth/oauth/linkedin/callback`
- [ ] Product access requested: "Sign In with LinkedIn"
- [ ] Client ID copied to .env
- [ ] Client Secret copied to .env
- [ ] Test passed: `npm run test:oauth`
- [ ] Backend started: `npm run dev`
- [ ] OAuth flow tested: Visit `http://localhost:4000/api/auth/oauth/linkedin`

---

## Quick Reference

### LinkedIn Developer Portal
https://www.linkedin.com/developers/apps

### Your Callback URL (Development)
```
http://localhost:4000/api/auth/oauth/linkedin/callback
```

### Test OAuth
```bash
cd packages/backend
npm run test:oauth
```

### Start Backend
```bash
npm run dev
```

### Test in Browser
```
http://localhost:4000/api/auth/oauth/linkedin
```

---

## Need Help?

1. Check LinkedIn app's Auth tab for correct redirect URL
2. Verify Client ID and Secret in .env
3. Make sure backend is running: `npm run dev`
4. Check logs for errors: `docker-compose logs -f`
5. Run: `npm run test:oauth` to verify configuration

---

## Next Steps

After LinkedIn OAuth is working:

1. **Configure Google OAuth** (similar process)
   - See `SERVICE_CONFIGURATION_GUIDE.md`

2. **Test both OAuth providers:**
   ```bash
   npm run test:oauth
   ```

3. **Configure other services:**
   ```bash
   npm run setup:services
   ```

---

**Start here:** https://www.linkedin.com/developers/apps

**Not Google Cloud:** The link you shared is for enterprise integrations, not OAuth login
