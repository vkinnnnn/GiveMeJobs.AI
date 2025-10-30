# ⚡ START HERE - Database Setup Required!

## 🚨 Your databases are not running yet!

You need to start PostgreSQL, MongoDB, and Redis before your app will work.

---

## ✨ Quick Fix (2 Commands)

### Windows Users:
```bash
setup-databases.bat
```

### Mac/Linux Users:
```bash
docker-compose up -d postgres mongodb redis
cd packages/backend
npm run migrate:up
npm run mongo:init
```

---

## 📋 What This Does

1. **Starts 3 databases:**
   - PostgreSQL (user data, jobs)
   - MongoDB (documents, resumes)
   - Redis (sessions, cache)

2. **Creates database tables** (migrations)

3. **Sets up MongoDB collections**

4. **Configures JWT** (already in .env)

---

## ✅ Verify It Worked

```bash
cd packages/backend
npm run check:all
```

You should see:
```
✅ PostgreSQL: Configured
✅ MongoDB: Configured
✅ Redis: Configured
✅ JWT: Configured
```

---

## 🚀 Then Start Your App

```bash
cd packages/backend
npm run dev
```

Your backend will be at: http://localhost:4000

---

## ❓ Don't Have Docker?

### Install Docker Desktop:
- **Windows:** https://docs.docker.com/desktop/install/windows-install/
- **Mac:** https://docs.docker.com/desktop/install/mac-install/
- **Linux:** https://docs.docker.com/engine/install/

After installing, restart your computer and run the setup again.

---

## 🆘 Having Issues?

### "Docker is not running"
→ Start Docker Desktop (look for whale icon in system tray)

### "Port already in use"
→ See `SETUP_DATABASES.md` for how to change ports

### "Migration failed"
→ Make sure databases are running:
```bash
docker-compose ps
```

### Still stuck?
→ Read `🚀_QUICK_START.md` for detailed instructions

---

## 📚 Documentation

- **Quick Start:** `🚀_QUICK_START.md`
- **Database Setup:** `SETUP_DATABASES.md`
- **Service Config:** `SERVICE_CONFIGURATION_GUIDE.md`
- **All Docs:** `📖_SERVICE_DOCS_INDEX.md`

---

## 🎯 Summary

**Problem:** Databases not running
**Solution:** Run `setup-databases.bat` (Windows) or manual commands above
**Time:** 2-3 minutes
**Then:** `npm run dev` to start your app

---

**Run this now:** `setup-databases.bat`
