# 🚀 Quick Start - ChatBot & KIRO Integration

## Start Everything in 3 Steps

### Step 1: Start Services (30 seconds)
```powershell
cd C:\Users\chira\.kiro
docker-compose up -d postgres mongodb redis
```

### Step 2: Start Frontend (1 minute)
```powershell
cd packages\frontend
npm run dev
```

### Step 3: Use ChatBot
- Open: http://localhost:3000
- Click the **purple bot icon** at bottom-right
- Start chatting!

---

## What You Can Ask the ChatBot

- "Help me find a job"
- "Create a resume"
- "Prepare for interview"
- "Track my applications"
- "What can you do?"

---

## KIRO IDE Connection

**KIRO automatically detects your setup!**

Just launch KIRO from this directory and it will connect to:
- ✅ PostgreSQL database
- ✅ MongoDB documents
- ✅ Redis cache
- ✅ OpenAI API
- ✅ Pinecone vectors
- ✅ 15 MCP servers

---

## Need Help?

Run verification:
```powershell
.\verify-mcp-setup.ps1
```

See complete docs:
```powershell
notepad CHATBOT_SETUP_COMPLETE.md
```

---

**That's it! You're ready to go! 🎉**
