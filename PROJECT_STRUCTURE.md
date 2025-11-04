# GiveMeJobs Platform - Project Structure

## 📁 Root Directory Structure

```
givemejobs-platform/
├── .github/                    # GitHub Actions workflows
├── .kiro/                      # Kiro IDE configuration
│   ├── settings/              # IDE settings
│   └── specs/                 # Feature specifications
├── docs/                       # Documentation
│   ├── guides/                # User guides
│   ├── api/                   # API documentation
│   ├── deployment/            # Deployment guides
│   ├── architecture/          # Architecture docs
│   └── operations/            # Operations guides
├── k8s/                        # Kubernetes manifests
├── packages/                   # Monorepo packages
│   ├── backend/               # Backend API service
│   ├── frontend/              # Frontend Next.js app
│   └── shared-types/          # Shared TypeScript types
├── scripts/                    # Utility scripts
├── docker-compose.yml          # Local development services
├── turbo.json                  # Turborepo configuration
└── README.md                   # Project overview
```

## 📦 Backend Package Structure

```
packages/backend/
├── src/
│   ├── config/                # Configuration files
│   │   ├── database.ts        # Database connections
│   │   ├── passport.config.ts # OAuth configuration
│   │   └── sentry.config.ts   # Error tracking
│   ├── controllers/           # Request handlers
│   │   ├── auth.controller.ts
│   │   ├── oauth.controller.ts
│   │   ├── profile.controller.ts
│   │   └── ...
│   ├── middleware/            # Express middleware
│   │   ├── auth.middleware.ts
│   │   ├── validation.middleware.ts
│   │   └── rate-limit.middleware.ts
│   ├── models/                # Data models
│   ├── routes/                # API routes
│   │   ├── auth.routes.ts
│   │   ├── job.routes.ts
│   │   └── ...
│   ├── services/              # Business logic
│   │   ├── auth.service.ts
│   │   ├── oauth.service.ts
│   │   ├── job.service.ts
│   │   └── ...
│   ├── types/                 # TypeScript types
│   ├── utils/                 # Utility functions
│   ├── validators/            # Input validation
│   ├── migrations/            # Database migrations
│   ├── scripts/               # Utility scripts
│   └── index.ts               # Application entry point
├── .env                       # Environment variables
├── .env.example               # Environment template
├── package.json               # Dependencies
└── tsconfig.json              # TypeScript config
```

## 🎨 Frontend Package Structure

```
packages/frontend/
├── src/
│   ├── app/                   # Next.js 14 App Router
│   │   ├── (auth)/           # Auth route group
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   └── forgot-password/
│   │   ├── (dashboard)/      # Dashboard route group
│   │   │   ├── dashboard/
│   │   │   ├── profile/
│   │   │   ├── jobs/
│   │   │   ├── applications/
│   │   │   ├── documents/
│   │   │   ├── interview-prep/
│   │   │   └── analytics/
│   │   ├── auth/             # OAuth callback
│   │   │   └── callback/
│   │   ├── layout.tsx        # Root layout
│   │   ├── page.tsx          # Home page
│   │   └── globals.css       # Global styles
│   ├── components/           # React components
│   │   ├── analytics/        # Analytics components
│   │   ├── applications/     # Application tracking
│   │   ├── interview-prep/   # Interview prep
│   │   ├── jobs/             # Job search
│   │   ├── layout/           # Layout components
│   │   ├── profile/          # Profile components
│   │   ├── ui/               # UI primitives
│   │   ├── ErrorBoundary.tsx
│   │   ├── Toast.tsx
│   │   └── ...
│   ├── hooks/                # Custom React hooks
│   │   ├── useAccessibility.ts
│   │   ├── useApiError.ts
│   │   ├── useNetworkStatus.ts
│   │   └── useResponsive.ts
│   ├── lib/                  # Utility libraries
│   │   ├── api-client.ts     # API client
│   │   └── accessibility.ts  # A11y utilities
│   ├── stores/               # Zustand state stores
│   │   ├── auth.store.ts
│   │   ├── jobs.store.ts
│   │   ├── applications.store.ts
│   │   └── ...
│   └── scripts/              # Utility scripts
├── public/                   # Static assets
├── .env.local                # Environment variables
├── .env.example              # Environment template
├── next.config.js            # Next.js configuration
├── tailwind.config.ts        # Tailwind CSS config
├── package.json              # Dependencies
└── tsconfig.json             # TypeScript config
```

## 🔗 Shared Types Package

```
packages/shared-types/
├── src/
│   ├── auth.ts               # Authentication types
│   ├── user.ts               # User types
│   ├── job.ts                # Job types
│   ├── application.ts        # Application types
│   ├── document.ts           # Document types
│   └── index.ts              # Exports
├── package.json
└── tsconfig.json
```

## 📚 Documentation Structure

```
docs/
├── guides/                   # User guides
│   ├── QUICK_START.md
│   ├── INSTALLATION.md
│   └── CONFIGURATION.md
├── api/                      # API documentation
│   └── API_REFERENCE.md
├── deployment/               # Deployment guides
│   ├── DEPLOYMENT_GUIDE.md
│   ├── DOCKER.md
│   └── KUBERNETES.md
├── architecture/             # Architecture docs
│   ├── SYSTEM_ARCHITECTURE.md
│   ├── SERVICE_ARCHITECTURE.md
│   └── SECURITY.md
├── operations/               # Operations guides
│   ├── MONITORING.md
│   ├── TROUBLESHOOTING.md
│   └── MAINTENANCE.md
├── STATUS.md                 # Current status
└── README.md                 # Documentation index
```

## 🐳 Docker & Kubernetes

```
k8s/
├── backend/                  # Backend K8s manifests
├── frontend/                 # Frontend K8s manifests
├── databases/                # Database manifests
└── monitoring/               # Monitoring stack

docker-compose.yml            # Local development services
```

## 🔧 Configuration Files

```
Root Configuration:
├── .eslintrc.json           # ESLint configuration
├── .prettierrc              # Prettier configuration
├── .gitignore               # Git ignore rules
├── turbo.json               # Turborepo configuration
├── tsconfig.json            # Root TypeScript config
└── package.json             # Root package file

Monitoring:
├── prometheus.yml           # Prometheus configuration
├── alert_rules.yml          # Alert rules
└── logstash.conf            # Logstash configuration
```

## 📝 Key Files

| File | Purpose |
|------|---------|
| `README.md` | Project overview and quick start |
| `PROJECT_STRUCTURE.md` | This file - project organization |
| `CONTRIBUTING.md` | Contribution guidelines |
| `LICENSE` | Project license |
| `docker-compose.yml` | Local development services |
| `turbo.json` | Monorepo build configuration |

## 🎯 Best Practices

### File Naming
- **Components**: PascalCase (e.g., `UserProfile.tsx`)
- **Utilities**: camelCase (e.g., `apiClient.ts`)
- **Types**: PascalCase (e.g., `User.ts`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `API_ENDPOINTS.ts`)

### Directory Organization
- Group by feature, not by type
- Keep related files together
- Use index files for clean exports
- Separate concerns (UI, logic, data)

### Import Order
1. External dependencies
2. Internal absolute imports
3. Internal relative imports
4. Types
5. Styles

## 🔄 Workflow

1. **Development**: Work in `packages/` directories
2. **Documentation**: Update `docs/` as needed
3. **Configuration**: Modify `.env` files
4. **Deployment**: Use `k8s/` manifests
5. **Scripts**: Run from `scripts/` directory

## 📊 Metrics

- **Total Packages**: 3 (backend, frontend, shared-types)
- **Backend Routes**: 15+ API route groups
- **Frontend Pages**: 20+ pages
- **Components**: 50+ reusable components
- **Documentation**: 15+ guide documents