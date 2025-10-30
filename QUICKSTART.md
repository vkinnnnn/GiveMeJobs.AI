# Quick Start Guide

Get the GiveMeJobs platform running locally in minutes.

## Step 1: Install Dependencies

```bash
npm install
```

This will install all dependencies for the monorepo and all packages.

## Step 2: Start Docker Services

```bash
npm run docker:up
```

This starts:
- PostgreSQL on port 5432
- MongoDB on port 27017
- Redis on port 6379

Verify services are running:
```bash
docker ps
```

You should see three containers running:
- givemejobs-postgres
- givemejobs-mongodb
- givemejobs-redis

## Step 3: Start Development Servers

```bash
npm run dev
```

This starts all services in parallel:
- Frontend: http://localhost:3000
- Backend API: http://localhost:4000

## Verify Installation

### Check Frontend
Open http://localhost:3000 in your browser. You should see the GiveMeJobs welcome page.

### Check Backend
```bash
curl http://localhost:4000/health
```

Expected response:
```json
{"status":"ok","timestamp":"2024-..."}
```

### Check Database Connections

**PostgreSQL:**
```bash
docker exec -it givemejobs-postgres psql -U givemejobs -d givemejobs_db -c "\dt"
```

**MongoDB:**
```bash
docker exec -it givemejobs-mongodb mongosh -u givemejobs -p dev_password --authenticationDatabase admin
```

**Redis:**
```bash
docker exec -it givemejobs-redis redis-cli -a dev_password ping
```

## Common Commands

```bash
# Stop all services
npm run docker:down

# View logs
npm run docker:logs

# Restart services
npm run docker:down && npm run docker:up

# Format code
npm run format

# Lint code
npm run lint

# Type check
npm run type-check

# Build for production
npm run build
```

## Troubleshooting

### Port Already in Use
If ports 3000, 4000, 5432, 27017, or 6379 are already in use:
1. Stop the conflicting service
2. Or modify ports in `.env` file

### Docker Services Not Starting
```bash
# Check Docker is running
docker --version

# Remove old containers and volumes
docker-compose down -v

# Restart
npm run docker:up
```

### Dependencies Not Installing
```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules
rm -rf node_modules packages/*/node_modules

# Reinstall
npm install
```

## Next Steps

1. Review the project structure in `README.md`
2. Check the implementation tasks in `.kiro/specs/givemejobs-platform/tasks.md`
3. Review the design document in `.kiro/specs/givemejobs-platform/design.md`
4. Start implementing features following the task list

## Development Tips

- Use `npm run dev` to start all services with hot reload
- Changes to shared-types will automatically rebuild and update dependent packages
- Use Turbo's caching for faster builds
- Keep Docker services running during development
- Check logs with `npm run docker:logs` if database connections fail

Happy coding! 🚀
