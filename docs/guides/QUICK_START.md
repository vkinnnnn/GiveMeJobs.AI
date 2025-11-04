# Quick Start Guide

Get the GiveMeJobs platform running in under 5 minutes.

## Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose
- Git

## 1. Clone and Install

```bash
git clone <repository-url>
cd givemejobs-platform
npm install
```

## 2. Start Services

```bash
# Start databases
docker-compose up -d

# Start backend
cd packages/backend
npm run dev

# Start frontend (in new terminal)
cd packages/frontend
npm run dev
```

## 3. Access Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:4000
- **API Health**: http://localhost:4000/health

## 4. Configure OAuth (Optional)

Add your OAuth credentials to `packages/backend/.env`:

```bash
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
LINKEDIN_CLIENT_ID=your_linkedin_client_id
LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret
```

## Next Steps

- [Full Installation Guide](./INSTALLATION.md)
- [Configuration Guide](./CONFIGURATION.md)
- [Development Guide](../development/DEVELOPMENT_GUIDE.md)