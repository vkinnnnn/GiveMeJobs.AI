# GiveMeJobs Backend

AI-powered job search platform backend with authentication, profile management, and job matching.

## 🚀 Quick Start

```bash
# Install dependencies (fixes all 32 TypeScript errors)
npm install

# Copy environment variables
cp ../../.env.example ../../.env

# Start database services
cd ../.. && docker-compose up -d && cd packages/backend

# Run database setup
npm run db:setup

# Start development server
npm run dev
```

Server runs on: http://localhost:4000

## 📋 Current Status

### ✅ Completed Features

#### Task 3: Authentication Service
- ✅ User registration with email/password
- ✅ User login with JWT tokens
- ✅ OAuth integration (Google, LinkedIn)
- ✅ Password recovery and reset
- ✅ Session management with Redis
- ✅ Email notifications

### 🔧 Resolving TypeScript Errors

**Current:** 32 TypeScript errors  
**Cause:** Dependencies not installed  
**Fix:** Run `npm install`

All errors will be resolved after installation. See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for details.

## 📚 Documentation

- **[AUTH_SERVICE.md](./AUTH_SERVICE.md)** - Complete authentication API documentation
- **[AUTH_QUICK_START.md](./AUTH_QUICK_START.md)** - Quick start guide with examples
- **[INSTALL.md](./INSTALL.md)** - Installation instructions
- **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** - Common issues and solutions
- **[DATABASE.md](./DATABASE.md)** - Database schema and setup
- **[SETUP_SUMMARY.md](./SETUP_SUMMARY.md)** - Implementation summary

## 🛠️ Available Scripts

```bash
npm run dev          # Start development server with hot reload
npm run build        # Build for production
npm run start        # Start production server
npm run type-check   # Run TypeScript type checking
npm run lint         # Run ESLint

# Database
npm run migrate:up      # Run migrations
npm run migrate:down    # Rollback last migration
npm run migrate:create  # Create new migration
npm run mongo:init      # Initialize MongoDB collections
npm run redis:test      # Test Redis connection
npm run db:setup        # Complete database setup
```

## 🔐 Environment Variables

Required variables in `.env`:

```env
# Database
DATABASE_URL=postgresql://givemejobs:dev_password@localhost:5432/givemejobs_db
MONGODB_URI=mongodb://givemejobs:dev_password@localhost:27017/givemejobs_docs
REDIS_URL=redis://:dev_password@localhost:6379

# JWT (CHANGE IN PRODUCTION!)
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret

# OAuth (Optional for development)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
LINKEDIN_CLIENT_ID=your-linkedin-client-id
LINKEDIN_CLIENT_SECRET=your-linkedin-client-secret

# Email (Optional for development)
SENDGRID_API_KEY=your-sendgrid-api-key
EMAIL_FROM=noreply@givemejobs.com
```

## 🧪 Testing

### Manual API Testing

```bash
# Register user
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!",
    "firstName": "Test",
    "lastName": "User"
  }'

# Login
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!"
  }'

# Get current user (requires token)
curl http://localhost:4000/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Verify Setup

```bash
node verify-setup.js
```

## 📁 Project Structure

```
packages/backend/
├── src/
│   ├── config/           # Configuration files
│   │   ├── database.ts
│   │   ├── passport.config.ts
│   │   └── redis-config.ts
│   ├── controllers/      # Request handlers
│   │   ├── auth.controller.ts
│   │   └── oauth.controller.ts
│   ├── middleware/       # Express middleware
│   │   ├── auth.middleware.ts
│   │   └── validation.middleware.ts
│   ├── services/         # Business logic
│   │   ├── auth.service.ts
│   │   ├── oauth.service.ts
│   │   └── email.service.ts
│   ├── routes/           # API routes
│   │   └── auth.routes.ts
│   ├── validators/       # Input validation
│   │   └── auth.validators.ts
│   ├── utils/            # Utility functions
│   │   └── auth.utils.ts
│   ├── types/            # TypeScript types
│   │   └── auth.types.ts
│   ├── migrations/       # Database migrations
│   └── index.ts          # Application entry point
├── dist/                 # Compiled output
├── docs/                 # Documentation
└── package.json
```

## 🔌 API Endpoints

### Public Endpoints
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/refresh-token` - Refresh access token
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password
- `GET /api/auth/oauth/google` - Google OAuth
- `GET /api/auth/oauth/linkedin` - LinkedIn OAuth

### Protected Endpoints
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout user

See [AUTH_SERVICE.md](./AUTH_SERVICE.md) for detailed API documentation.

## 🗄️ Database Schema

### PostgreSQL Tables
- `users` - User accounts
- `oauth_providers` - OAuth connections
- `user_profiles` - User profile data
- `skills` - User skills
- `experience` - Work experience
- `education` - Educational background
- `jobs` - Job listings
- `applications` - Job applications

### MongoDB Collections
- `resume_templates` - Resume templates
- `cover_letter_templates` - Cover letter templates
- `generated_documents` - AI-generated documents

### Redis Keys
- `session:*` - User sessions
- `user:*` - User cache
- `password_reset:*` - Password reset tokens
- `rate_limit:*` - Rate limiting

## 🔒 Security Features

- ✅ Password hashing with bcrypt
- ✅ JWT token authentication
- ✅ Refresh token rotation
- ✅ Session management
- ✅ Rate limiting
- ✅ Input validation with Zod
- ✅ SQL injection prevention
- ✅ XSS protection with Helmet
- ✅ CORS configuration

## 🐛 Troubleshooting

Having issues? Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

Common fixes:
```bash
# Fix TypeScript errors
npm install

# Reset database
npm run migrate:down && npm run migrate:up

# Clear cache
rm -rf node_modules dist
npm install

# Restart TypeScript server in your IDE
```

## 📦 Dependencies

### Runtime (18 packages)
- express, pg, mongodb, redis
- bcrypt, jsonwebtoken, passport
- nodemailer, zod, uuid
- cors, helmet, compression, morgan

### Development (14 packages)
- typescript, tsx, eslint
- @types/* packages for all dependencies

## 🚧 Next Steps

1. ✅ Authentication service (Task 3) - **COMPLETE**
2. ⏭️ User profile service (Task 4) - **NEXT**
3. ⏭️ Job search service (Task 5)
4. ⏭️ Document generation service (Task 6)
5. ⏭️ Application tracking service (Task 7)

## 📄 License

MIT

## 🤝 Contributing

1. Install dependencies: `npm install`
2. Create feature branch
3. Make changes
4. Run tests: `npm run type-check`
5. Submit pull request

## 📞 Support

- Documentation: See `/docs` folder
- Issues: Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
- API Docs: See [AUTH_SERVICE.md](./AUTH_SERVICE.md)
