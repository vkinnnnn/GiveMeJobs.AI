# GiveMeJobs Platform

AI-powered job application platform that streamlines your job search with intelligent tools for resume generation, job matching, and application tracking.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start databases
docker-compose up -d

# Start backend
cd packages/backend && npm run dev

# Start frontend (new terminal)
cd packages/frontend && npm run dev
```

**Access**: http://localhost:3000

## 📋 Features

- **AI-Powered Resume Generation** - Create tailored resumes with AI
- **Smart Job Matching** - Find jobs that match your skills
- **Application Tracking** - Track all your applications in one place
- **Interview Preparation** - AI-generated interview questions
- **OAuth Authentication** - Sign in with Google or LinkedIn
- **Analytics Dashboard** - Track your job search progress

## 🏗️ Project Structure

```
givemejobs-platform/
├── packages/
│   ├── backend/          # Node.js/Express API
│   ├── frontend/         # Next.js 14 application
│   └── shared-types/     # Shared TypeScript types
├── docs/                 # Documentation
├── k8s/                  # Kubernetes configurations
├── scripts/              # Utility scripts
└── docker-compose.yml    # Local development services
```

## 🛠️ Tech Stack

### Frontend
- Next.js 14
- React 18
- TypeScript
- Tailwind CSS
- Zustand (State Management)

### Backend
- Node.js
- Express
- TypeScript
- PostgreSQL
- MongoDB
- Redis

### AI & Services
- OpenAI (GPT-4)
- Pinecone (Vector DB)
- Resend (Email)
- Adzuna (Job Board API)

## 📚 Documentation

- [Quick Start Guide](./docs/guides/QUICK_START.md)
- [Configuration Guide](./docs/guides/CONFIGURATION.md)
- [API Documentation](./docs/api/API_REFERENCE.md)
- [Deployment Guide](./docs/deployment/DEPLOYMENT_GUIDE.md)

## 🔧 Development

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- PostgreSQL 15+
- MongoDB 7+
- Redis 7+

### Environment Setup

1. Copy environment files:
```bash
cp packages/backend/.env.example packages/backend/.env
cp packages/frontend/.env.example packages/frontend/.env.local
```

2. Configure your environment variables (see [Configuration Guide](./docs/guides/CONFIGURATION.md))

3. Run database migrations:
```bash
cd packages/backend
npm run migrate:up
npm run mongo:init
```

### Running Tests

```bash
# Backend tests
cd packages/backend
npm test

# Frontend tests
cd packages/frontend
npm test

# E2E tests
npm run test:e2e
```

## 🚢 Deployment

See [Deployment Guide](./docs/deployment/DEPLOYMENT_GUIDE.md) for production deployment instructions.

## 📊 Monitoring

- **Grafana**: http://localhost:3001
- **Prometheus**: http://localhost:9090
- **Kibana**: http://localhost:5601

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- OpenAI for GPT-4 API
- Pinecone for vector database
- Adzuna for job board API
- All open-source contributors

## 📞 Support

For support, email support@givemejobs.com or open an issue in the repository.

---

**Built with ❤️ by the GiveMeJobs Team**