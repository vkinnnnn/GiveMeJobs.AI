# 🚀 Database Setup Guide

## Quick Start (2 Commands)

```bash
# 1. Start the databases
docker-compose up -d postgres mongodb redis

# 2. Check status
npm run check:all
```

That's it! Your databases will be running.

---

## Detailed Instructions

### Prerequisites

You need Docker installed:
- **Windows:** [Docker Desktop for Windows](https://docs.docker.com/desktop/install/windows-install/)
- **Mac:** [Docker Desktop for Mac](https://docs.docker.com/desktop/install/mac-install/)
- **Linux:** [Docker Engine](https://docs.docker.com/engine/install/)

### Step 1: Start Databases

Open your terminal in the project root and run:

```bash
docker-compose up -d postgres mongodb redis
```

This will:
- ✅ Start PostgreSQL on port 5432
- ✅ Start MongoDB on port 27017
- ✅ Start Redis on port 6379
- ✅ Run them in the background (`-d` flag)

### Step 2: Verify Databases Are Running

```bash
docker-compose ps
```

You should see:
```
NAME                    STATUS
givemejobs-postgres     Up (healthy)
givemejobs-mongodb      Up (healthy)
givemejobs-redis        Up (healthy)
```

### Step 3: Run Database Migrations

```bash
cd packages/backend
npm run migrate:up
```

This creates all the necessary tables in PostgreSQL.

### Step 4: Initialize MongoDB

```bash
npm run mongo:init
```

This sets up MongoDB collections and indexes.

### Step 5: Verify Everything Works

```bash
npm run check:all
```

You should now see:
```
✅ PostgreSQL: Configured
✅ MongoDB: Configured
✅ Redis: Configured
✅ JWT: Configured
```

---

## Common Commands

### Start Databases
```bash
docker-compose up -d postgres mongodb redis
```

### Stop Databases
```bash
docker-compose stop postgres mongodb redis
```

### Restart Databases
```bash
docker-compose restart postgres mongodb redis
```

### View Logs
```bash
docker-compose logs -f postgres mongodb redis
```

### Stop and Remove Everything
```bash
docker-compose down
```

### Stop and Remove Everything Including Data
```bash
docker-compose down -v
```

---

## Troubleshooting

### "Docker is not running"
- Start Docker Desktop
- Wait for it to fully start (whale icon in system tray)
- Try the command again

### "Port already in use"
One of your ports (5432, 27017, or 6379) is already in use.

**Option 1: Stop the conflicting service**
```bash
# Windows - Stop PostgreSQL service
net stop postgresql-x64-15

# Or find what's using the port
netstat -ano | findstr :5432
```

**Option 2: Change the port in .env**
```env
POSTGRES_PORT=5433
MONGO_PORT=27018
REDIS_PORT=6380
```

Then update DATABASE_URL, MONGODB_URI, and REDIS_URL accordingly.

### "Cannot connect to database"
1. Check databases are running:
   ```bash
   docker-compose ps
   ```

2. Check logs for errors:
   ```bash
   docker-compose logs postgres
   docker-compose logs mongodb
   docker-compose logs redis
   ```

3. Restart the databases:
   ```bash
   docker-compose restart postgres mongodb redis
   ```

### "Migration failed"
1. Make sure PostgreSQL is running:
   ```bash
   docker-compose ps postgres
   ```

2. Check PostgreSQL logs:
   ```bash
   docker-compose logs postgres
   ```

3. Try running migrations again:
   ```bash
   cd packages/backend
   npm run migrate:up
   ```

---

## Database Credentials

Your databases are configured with these credentials (from `.env`):

### PostgreSQL
- Host: `localhost`
- Port: `5432`
- User: `givemejobs`
- Password: `dev_password`
- Database: `givemejobs_db`

### MongoDB
- Host: `localhost`
- Port: `27017`
- User: `givemejobs`
- Password: `dev_password`
- Database: `givemejobs_docs`

### Redis
- Host: `localhost`
- Port: `6379`
- Password: `dev_password`

---

## Connecting to Databases

### PostgreSQL (using psql)
```bash
docker exec -it givemejobs-postgres psql -U givemejobs -d givemejobs_db
```

### MongoDB (using mongosh)
```bash
docker exec -it givemejobs-mongodb mongosh -u givemejobs -p dev_password
```

### Redis (using redis-cli)
```bash
docker exec -it givemejobs-redis redis-cli -a dev_password
```

---

## What's Next?

After databases are running:

1. **Run migrations:**
   ```bash
   cd packages/backend
   npm run migrate:up
   npm run mongo:init
   ```

2. **Verify setup:**
   ```bash
   npm run check:all
   ```

3. **Start the backend:**
   ```bash
   npm run dev
   ```

4. **Configure optional services:**
   - Google OAuth
   - SendGrid
   - OpenAI

   See `SERVICE_CONFIGURATION_GUIDE.md` for details.

---

## Quick Reference

```bash
# Start databases
docker-compose up -d postgres mongodb redis

# Check status
docker-compose ps

# View logs
docker-compose logs -f postgres mongodb redis

# Stop databases
docker-compose stop postgres mongodb redis

# Restart databases
docker-compose restart postgres mongodb redis

# Run migrations
cd packages/backend
npm run migrate:up
npm run mongo:init

# Check everything
npm run check:all

# Start backend
npm run dev
```

---

## Need Help?

1. Make sure Docker is running
2. Check `docker-compose ps` to see container status
3. Check logs with `docker-compose logs [service-name]`
4. Run `npm run check:all` to see what's configured
