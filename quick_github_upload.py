#!/usr/bin/env python3
"""
Quick GitHub Upload - Simplified version
"""

import subprocess
import sys

def run(cmd):
    """Run command and show output"""
    print(f"\n🔄 Running: {cmd}")
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"❌ Error: {result.stderr}")
        return False
    print(f"✅ Success")
    return True

def main():
    print("🚀 Quick GitHub Upload")
    print("=" * 50)
    
    repo_url = input("Enter GitHub repo URL: ").strip()
    
    if not repo_url:
        print("❌ URL required!")
        return
    
    print("\n📦 Uploading to GitHub...")
    
    # Create .gitignore if it doesn't exist
    with open('.gitignore', 'w') as f:
        f.write("""
.env
.env.local
node_modules/
dist/
build/
*.log
.DS_Store
""")
    
    # Git commands
    commands = [
        "git init",
        "git add .",
        'git commit -m "Initial commit"',
        "git branch -M main",
        f"git remote add origin {repo_url}",
        "git push -u origin main"
    ]
    
    for cmd in commands:
        if not run(cmd):
            print(f"\n❌ Failed at: {cmd}")
            print("💡 If remote exists, try: git remote set-url origin <url>")
            return
    
    print("\n✅ Upload complete!")
    print(f"🔗 {repo_url}")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n❌ Cancelled")
        sys.exit(1)
