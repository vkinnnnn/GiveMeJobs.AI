# 🚀 GitHub Upload Guide

## Quick Start

### Option 1: Full Featured Script (Recommended)

```bash
python upload_to_github.py
```

**Features:**
- ✅ Progress bar with percentage
- ✅ ETA (estimated time remaining)
- ✅ Automatic security filtering
- ✅ Creates .env.example (safe version)
- ✅ Excludes sensitive files
- ✅ File count and statistics

### Option 2: Quick Upload

```bash
python quick_github_upload.py
```

**Features:**
- ✅ Simple and fast
- ✅ Basic security filtering
- ✅ Minimal prompts

---

## Prerequisites

### 1. Install Git
```bash
# Check if Git is installed
git --version

# If not installed:
# Windows: Download from https://git-scm.com/
# Mac: brew install git
# Linux: sudo apt-get install git
```

### 2. Install Python
```bash
# Check if Python is installed
python --version

# Should be Python 3.6 or higher
```

### 3. Create GitHub Repository

1. Go to https://github.com/new
2. Create a new repository
3. **DO NOT** initialize with README, .gitignore, or license
4. Copy the repository URL

---

## Step-by-Step Usage

### Step 1: Prepare Your Project

Make sure you're in your project root directory:
```bash
cd C:\Users\chira\.kiro
```

### Step 2: Run the Upload Script

```bash
python upload_to_github.py
```

### Step 3: Follow the Prompts

**Prompt 1: Repository URL**
```
🔗 Repository URL: https://github.com/yourusername/givemejobs.git
```

**Prompt 2: Commit Message (Optional)**
```
💬 Message: Initial commit - GiveMeJobs platform
```
Or press Enter for default message.

**Prompt 3: Confirm Upload**
```
🤔 Continue with upload? (yes/no): yes
```

### Step 4: Watch the Progress

You'll see:
```
📤 Progress: [████████████████████░░░░░░░░] 65.3% | 
Files: 1,234/1,890 | Skipped: 456 | 
ETA: 2m 15s | Elapsed: 3m 45s
```

### Step 5: Success!

```
✅ SUCCESS! Project uploaded to GitHub
🔗 Repository: https://github.com/yourusername/givemejobs
📊 Files uploaded: 1,890
⏱️  Total time: 6m 30s
```

---

## What Gets Excluded (Security)

### ✅ Automatically Excluded:

**Secrets & Credentials:**
- `.env` (all environment files)
- `*.pem`, `*.key`, `*.cert`
- API keys and passwords

**Dependencies:**
- `node_modules/` (can be huge!)
- `venv/`, `env/`
- `__pycache__/`

**Build Outputs:**
- `dist/`, `build/`
- `.next/`, `out/`
- `*.tsbuildinfo`

**IDE & OS:**
- `.vscode/`, `.idea/`
- `.DS_Store`, `Thumbs.db`

**Logs:**
- `*.log`
- `logs/`

### ✅ What Gets Included:

**Source Code:**
- All `.ts`, `.tsx`, `.js`, `.jsx` files
- All `.py` files
- All `.css`, `.scss` files

**Configuration:**
- `package.json`, `tsconfig.json`
- `.env.example` (sanitized version)
- `.gitignore`

**Documentation:**
- All `.md` files
- README files
- Documentation folders

---

## Troubleshooting

### Issue 1: "git: command not found"

**Solution:** Install Git
```bash
# Windows
# Download from: https://git-scm.com/download/win

# Mac
brew install git

# Linux
sudo apt-get install git
```

### Issue 2: "Permission denied (publickey)"

**Solution:** Set up SSH key or use HTTPS

**Option A: Use HTTPS URL**
```
https://github.com/username/repository.git
```

**Option B: Set up SSH key**
```bash
# Generate SSH key
ssh-keygen -t ed25519 -C "your_email@example.com"

# Add to GitHub
# Copy the public key
cat ~/.ssh/id_ed25519.pub

# Add it to GitHub: Settings > SSH Keys > New SSH Key
```

### Issue 3: "Repository not found"

**Solution:** 
1. Make sure the repository exists on GitHub
2. Check the URL is correct
3. Verify you have access to the repository

### Issue 4: "Remote origin already exists"

**Solution:** The script will ask if you want to update it, or manually:
```bash
git remote set-url origin https://github.com/username/newrepo.git
```

### Issue 5: Upload is too slow

**Solution:** 
1. Check your internet connection
2. Large files might be included - check .gitignore
3. Consider using Git LFS for large files

### Issue 6: "Failed to push"

**Solution:**
```bash
# If repository has existing commits
git pull origin main --rebase

# Then push again
git push -u origin main

# Or force push (careful!)
git push -u origin main --force
```

---

## Advanced Usage

### Custom Commit Message

```bash
python upload_to_github.py
# When prompted:
💬 Message: feat: Add Adzuna API integration with real job data
```

### Upload to Different Branch

After running the script, manually:
```bash
git checkout -b develop
git push -u origin develop
```

### Update Existing Repository

```bash
# Make changes to your code
git add .
git commit -m "Update: Added new features"
git push
```

---

## Security Best Practices

### ✅ DO:
- Use `.env.example` for sharing configuration structure
- Keep `.env` in `.gitignore`
- Review files before committing
- Use environment variables for secrets
- Rotate API keys if accidentally committed

### ❌ DON'T:
- Commit `.env` files
- Commit API keys or passwords
- Commit `node_modules/`
- Commit build outputs
- Commit database files

### 🚨 If You Accidentally Commit Secrets:

1. **Immediately rotate the keys/passwords**
2. **Remove from Git history:**
```bash
# Remove file from history
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env" \
  --prune-empty --tag-name-filter cat -- --all

# Force push
git push origin --force --all
```

3. **Use tools like:**
- `git-secrets` - Prevents committing secrets
- `truffleHog` - Finds secrets in Git history

---

## What the Script Does

### 1. Security Check
- Creates `.gitignore` with comprehensive exclusions
- Creates `.env.example` (sanitized version of `.env`)
- Removes all sensitive data from tracked files

### 2. File Processing
- Counts total files
- Excludes patterns from `.gitignore`
- Shows progress with percentage

### 3. Git Operations
- Initializes Git repository (if needed)
- Adds all files (respecting `.gitignore`)
- Creates initial commit
- Adds remote repository
- Pushes to GitHub

### 4. Progress Tracking
- Real-time progress bar
- File count (processed/total)
- Skipped files count
- Estimated time remaining (ETA)
- Elapsed time

---

## Example Output

```
================================================================================
🚀 GitHub Project Upload Script
================================================================================
📁 Project: C:\Users\chira\.kiro
🔗 Repository: https://github.com/username/givemejobs.git
================================================================================

📝 Creating/updating .gitignore...
✅ .gitignore created/updated

🔒 Creating .env.example (sanitized)...
✅ .env.example created (safe to commit)

📊 Counting files...
✅ Found 1,890 files to process

🔄 Initializing Git repository...
✅ Initializing Git repository - Success

📦 Adding files to Git...
✅ Added 1,890 files to Git

🔄 Committing changes...
✅ Committing changes - Success

🔄 Adding remote repository...
✅ Adding remote repository - Success

================================================================================
📤 Uploading to GitHub...
================================================================================

📤 Progress: [████████████████████████████████████████] 100.0% | 
Files: 1,890/1,890 | Skipped: 456 | 
ETA: 0s | Elapsed: 6m 30s

✅ Pushing to GitHub (main branch) - Success

================================================================================
✅ SUCCESS! Project uploaded to GitHub
================================================================================
🔗 Repository: https://github.com/username/givemejobs.git
📊 Files uploaded: 1,890
⏱️  Total time: 6m 30s
================================================================================

🎉 All done! Your project is now on GitHub!

💡 Next steps:
   1. Visit your repository on GitHub
   2. Add a README.md if you haven't
   3. Set up GitHub Actions for CI/CD
   4. Invite collaborators
```

---

## FAQ

**Q: How long will it take?**
A: Depends on project size and internet speed. Typical: 5-15 minutes for large projects.

**Q: Can I cancel during upload?**
A: Yes, press `Ctrl+C`. You can resume later.

**Q: Will it upload my API keys?**
A: No! The script automatically excludes `.env` and creates a safe `.env.example`.

**Q: What if I have a huge project?**
A: The script shows progress and ETA. Large files are automatically excluded.

**Q: Can I use this multiple times?**
A: Yes! After initial upload, use regular git commands or run the script again.

**Q: Does it work on Windows/Mac/Linux?**
A: Yes! Works on all platforms with Python and Git installed.

---

## Support

If you encounter issues:

1. Check the troubleshooting section above
2. Verify Git and Python are installed
3. Check your GitHub credentials
4. Review the error messages carefully

---

## Summary

**To upload your project:**

```bash
# 1. Navigate to project
cd C:\Users\chira\.kiro

# 2. Run script
python upload_to_github.py

# 3. Enter GitHub URL
# 4. Confirm upload
# 5. Wait for completion
# 6. Done! 🎉
```

**Your secrets are safe!** The script automatically excludes sensitive files and creates sanitized versions.

Happy coding! 🚀
