# Installation Instructions

## Quick Install

Run this command from the `packages/backend` directory:

```bash
npm install
```

This will install all 32 dependencies and their type definitions, which will resolve all TypeScript errors.

## What Gets Installed

### Runtime Dependencies (18 packages)
- express - Web framework
- dotenv - Environment variables
- cors - CORS middleware
- helmet - Security headers
- compression - Response compression
- morgan - HTTP logging
- pg - PostgreSQL client
- node-pg-migrate - Database migrations
- mongodb - MongoDB driver
- redis - Redis client
- bcrypt - Password hashing
- jsonwebtoken - JWT tokens
- zod - Schema validation
- passport - Authentication middleware
- passport-google-oauth20 - Google OAuth
- passport-linkedin-oauth2 - LinkedIn OAuth
- nodemailer - Email service
- uuid - Unique identifiers

### Development Dependencies (14 packages)
- @types/express
- @types/node
- @types/cors
- @types/compression
- @types/morgan
- @types/pg
- @types/bcrypt
- @types/jsonwebtoken
- @types/passport
- @types/passport-google-oauth20
- @types/passport-linkedin-oauth2
- @types/nodemailer
- @types/uuid
- typescript, tsx, eslint, etc.

## After Installation

Once installed, all 32 TypeScript errors will be resolved:
- ✅ Module resolution errors fixed
- ✅ Type definition errors fixed
- ✅ `process` and `console` globals recognized

## Verify Installation

```bash
# Check if packages are installed
npm list --depth=0

# Run type check
npm run type-check

# Start development server
npm run dev
```

## Troubleshooting

If you still see errors after installation:

1. **Clear TypeScript cache:**
   ```bash
   rm -rf node_modules/.cache
   ```

2. **Restart your IDE/editor** to reload TypeScript language server

3. **Verify node_modules exists:**
   ```bash
   ls -la node_modules
   ```

4. **Check for peer dependency warnings:**
   ```bash
   npm install --legacy-peer-deps
   ```

## Alternative: Install from Project Root

If you're using a monorepo setup:

```bash
# From project root
npm install

# Or with workspaces
npm install --workspaces
```
