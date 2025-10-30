# GiveMeJobs Platform

AI-powered job application platform that streamlines the job search process through intelligent automation, personalized recommendations, and secure credential management.

## Project Structure

This is a monorepo managed with npm workspaces and Turbo:

```
givemejobs-platform/
├── packages/
│   ├── frontend/          # Next.js 14 frontend application
│   ├── backend/           # Express.js backend API
│   └── shared-types/      # Shared TypeScript types
├── scripts/               # Database and utility scripts
├── docker-compose.yml     # Local development services
└── package.json           # Root package configuration
```

## Prerequisites

- Node.js 20+ and npm 9+
- Docker and Docker Compose
- Git

## Getting Started

### 1. Clone and Install

```bash
# Install dependencies
npm install
```

### 2. Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your configuration
```

### 3. Start Development Services

```bash
# Start PostgreSQL, MongoDB, and Redis
npm run docker:up

# Verify services are running
docker ps
```

### 4. Start Development Servers

```bash
# Start all services in development mode
npm run dev

# Or start individually:
# Frontend: http://localhost:3000
cd packages/frontend && npm run dev

# Backend: http://localhost:4000
cd packages/backend && npm run dev
```

## Available Scripts

### Root Level

- `npm run dev` - Start all packages in development mode
- `npm run build` - Build all packages
- `npm run lint` - Lint all packages
- `npm run format` - Format code with Prettier
- `npm run docker:up` - Start Docker services
- `npm run docker:down` - Stop Docker services
- `npm run docker:logs` - View Docker logs

### Package Level

Each package has its own scripts. Navigate to the package directory and run:

- `npm run dev` - Development mode
- `npm run build` - Production build
- `npm run lint` - Lint code
- `npm run type-check` - TypeScript type checking

## Technology Stack

### Frontend
- Next.js 14 (React 18)
- TypeScript
- Tailwind CSS
- Axios

### Backend
- Node.js 20
- Express.js
- TypeScript
- PostgreSQL, MongoDB, Redis

### Development Tools
- Turbo (monorepo build system)
- ESLint (code linting)
- Prettier (code formatting)
- Docker Compose (local services)

## Database Services

### PostgreSQL (Port 5432)
- User data, profiles, applications
- Connection: `postgresql://givemejobs:dev_password@localhost:5432/givemejobs_db`

### MongoDB (Port 27017)
- Document templates, generated content
- Connection: `mongodb://givemejobs:dev_password@localhost:27017/givemejobs_docs`

### Redis (Port 6379)
- Caching, sessions, rate limiting
- Connection: `redis://:dev_password@localhost:6379`

## Development Workflow

1. Create feature branch from `main`
2. Make changes in appropriate package
3. Run `npm run lint` and `npm run type-check`
4. Test changes locally
5. Commit with descriptive message
6. Create pull request

## Project Status

### ✅ Backend: Fully Implemented & Configured
- All backend services complete (Tasks 1-13)
- All databases configured (PostgreSQL, MongoDB, Redis)
- All authentication services configured (Google OAuth, LinkedIn OAuth, JWT, MFA)
- All AI services configured (OpenAI, Pinecone)
- Email service configured (Resend - 3,000 emails/month free)
- All APIs ready and tested

### 🚧 Frontend: In Progress
- Next.js 14 project initialized
- Needs UI implementation (Tasks 14-20)

### 📊 Configuration Status
See `🎯_CONFIGURATION_STATUS.md` for detailed service status.

**Quick Check:**
```bash
cd packages/backend
npm run check:all
```

## Next Steps

1. **Start Development:**
   ```bash
   npm run docker:up        # Start databases
   cd packages/backend && npm run dev    # Start backend
   cd packages/frontend && npm run dev   # Start frontend
   ```

2. **Build Frontend UI** (Tasks 14-20)
3. **Production Readiness** (Tasks 21-26)

Refer to `.kiro/specs/givemejobs-platform/tasks.md` for the complete implementation roadmap.

## License

Proprietary - All rights reserved
