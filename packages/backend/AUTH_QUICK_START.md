# Authentication Service - Quick Start Guide

## Installation

```bash
cd packages/backend
npm install
```

This will install all required dependencies:
- bcrypt (password hashing)
- jsonwebtoken (JWT tokens)
- zod (validation)
- passport (OAuth)
- passport-google-oauth20 (Google OAuth)
- passport-linkedin-oauth2 (LinkedIn OAuth)
- nodemailer (email service)
- uuid (unique identifiers)

## Environment Setup

1. Copy the example environment file:
   ```bash
   cp ../../.env.example ../../.env
   ```

2. Update the following variables in `.env`:
   ```env
   # JWT Secrets (CHANGE THESE!)
   JWT_SECRET=your-secret-key-change-in-production
   JWT_REFRESH_SECRET=your-refresh-secret-key-change-in-production
   
   # OAuth Credentials (Get from provider dashboards)
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   LINKEDIN_CLIENT_ID=your-linkedin-client-id
   LINKEDIN_CLIENT_SECRET=your-linkedin-client-secret
   
   # Email Service (Optional for development)
   SENDGRID_API_KEY=your-sendgrid-api-key
   EMAIL_FROM=noreply@givemejobs.com
   ```

## Database Setup

Ensure PostgreSQL and Redis are running:

```bash
# From project root
docker-compose up -d

# Run migrations
cd packages/backend
npm run migrate:up
```

## Start the Server

```bash
npm run dev
```

The server will start on http://localhost:4000

## Test the Endpoints

### 1. Register a User

```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!",
    "firstName": "Test",
    "lastName": "User",
    "professionalHeadline": "Software Engineer"
  }'
```

### 2. Login

```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!"
  }'
```

Save the `accessToken` from the response.

### 3. Get Current User

```bash
curl http://localhost:4000/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 4. Refresh Token

```bash
curl -X POST http://localhost:4000/api/auth/refresh-token \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "YOUR_REFRESH_TOKEN"
  }'
```

### 5. Forgot Password

```bash
curl -X POST http://localhost:4000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com"
  }'
```

Check the console for the email preview URL (in development).

### 6. Reset Password

```bash
curl -X POST http://localhost:4000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "token": "RESET_TOKEN_FROM_EMAIL",
    "newPassword": "NewSecurePass123!"
  }'
```

### 7. Logout

```bash
curl -X POST http://localhost:4000/api/auth/logout \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## OAuth Testing

### Google OAuth

1. Visit: http://localhost:4000/api/auth/oauth/google
2. Complete Google login
3. You'll be redirected to frontend with tokens in URL params

### LinkedIn OAuth

1. Visit: http://localhost:4000/api/auth/oauth/linkedin
2. Complete LinkedIn login
3. You'll be redirected to frontend with tokens in URL params

## Common Issues

### Issue: "Cannot find module 'bcrypt'"
**Solution:** Run `npm install` in the backend directory

### Issue: "Connection refused" to PostgreSQL
**Solution:** Ensure Docker containers are running: `docker-compose up -d`

### Issue: "Invalid JWT secret"
**Solution:** Set JWT_SECRET and JWT_REFRESH_SECRET in .env file

### Issue: OAuth redirect fails
**Solution:** 
1. Ensure FRONTEND_URL and API_URL are set correctly in .env
2. Configure OAuth callback URLs in provider dashboards:
   - Google: http://localhost:4000/api/auth/oauth/google/callback
   - LinkedIn: http://localhost:4000/api/auth/oauth/linkedin/callback

### Issue: Email not sending
**Solution:** In development, emails use Ethereal (test email service). Check console for preview URLs. For production, configure SendGrid API key.

## File Structure

```
packages/backend/src/
├── controllers/
│   ├── auth.controller.ts      # Registration, login, password reset
│   └── oauth.controller.ts     # OAuth flows
├── services/
│   ├── auth.service.ts         # Auth business logic
│   ├── oauth.service.ts        # OAuth business logic
│   └── email.service.ts        # Email sending
├── middleware/
│   ├── auth.middleware.ts      # JWT verification
│   └── validation.middleware.ts # Request validation
├── validators/
│   └── auth.validators.ts      # Zod schemas
├── utils/
│   └── auth.utils.ts           # Helper functions
├── types/
│   └── auth.types.ts           # TypeScript types
├── routes/
│   └── auth.routes.ts          # Route definitions
└── config/
    └── passport.config.ts      # Passport setup
```

## Next Steps

1. ✅ Authentication service is complete
2. ⏭️ Next task: Build user profile service (Task 4)
3. 📚 See AUTH_SERVICE.md for detailed documentation

## Support

For detailed API documentation, see AUTH_SERVICE.md
For database schema, see DATABASE.md
For general setup, see SETUP_SUMMARY.md
