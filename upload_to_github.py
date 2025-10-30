#!/usr/bin/env python3
"""
GitHub Project Upload Script with Progress Tracking
Safely uploads project files while excluding sensitive data and large files
"""

import os
import sys
import time
import subprocess
from pathlib import Path
from datetime import datetime, timedelta

class GitHubUploader:
    def __init__(self, project_root="."):
        self.project_root = Path(project_root).resolve()
        self.total_files = 0
        self.processed_files = 0
        self.skipped_files = 0
        self.start_time = None
        
        # Files and directories to exclude (security and large files)
        self.exclude_patterns = [
            # Environment and secrets
            '.env',
            '.env.local',
            '.env.production',
            '*.pem',
            '*.key',
            '*.cert',
            '*.p12',
            '*.pfx',
            
            # Dependencies
            'node_modules/',
            'venv/',
            'env/',
            '__pycache__/',
            '*.pyc',
            
            # Build outputs
            'dist/',
            'build/',
            '.next/',
            'out/',
            'coverage/',
            '.turbo/',
            '*.tsbuildinfo',
            
            # IDE and OS
            '.vscode/',
            '.idea/',
            '*.swp',
            '*.swo',
            '.DS_Store',
            'Thumbs.db',
            
            # Logs
            '*.log',
            'logs/',
            'npm-debug.log*',
            'yarn-debug.log*',
            'yarn-error.log*',
            
            # Database
            '*.sqlite',
            '*.db',
            
            # Git
            '.git/',
        ]
        
    def create_gitignore(self):
        """Create or update .gitignore file"""
        gitignore_content = """# Dependencies
node_modules/
venv/
env/
__pycache__/
*.pyc

# Environment variables and secrets
.env
.env.local
.env.production
.env.*.local
*.pem
*.key
*.cert
*.p12
*.pfx

# Build outputs
dist/
build/
.next/
out/
coverage/
.turbo/
*.tsbuildinfo

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
*.log
logs/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Database
*.sqlite
*.db

# Testing
.nyc_output/

# Misc
.cache/
temp/
tmp/
"""
        gitignore_path = self.project_root / '.gitignore'
        
        print("📝 Creating/updating .gitignore...")
        with open(gitignore_path, 'w', encoding='utf-8') as f:
            f.write(gitignore_content)
        print("✅ .gitignore created/updated")
        
    def sanitize_env_file(self):
        """Create a sanitized .env.example file"""
        env_path = self.project_root / '.env'
        env_example_path = self.project_root / '.env.example'
        
        if not env_path.exists():
            print("⚠️  No .env file found, skipping sanitization")
            return
            
        print("🔒 Creating .env.example (sanitized)...")
        
        with open(env_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        
        sanitized_lines = []
        for line in lines:
            # Keep comments and empty lines
            if line.strip().startswith('#') or not line.strip():
                sanitized_lines.append(line)
            # Replace values with placeholders
            elif '=' in line:
                key = line.split('=')[0]
                sanitized_lines.append(f"{key}=\n")
        
        with open(env_example_path, 'w', encoding='utf-8') as f:
            f.writelines(sanitized_lines)
        
        print("✅ .env.example created (safe to commit)")
        
    def count_files(self):
        """Count total files to be processed"""
        print("📊 Counting files...")
        
        for root, dirs, files in os.walk(self.project_root):
            # Skip excluded directories
            dirs[:] = [d for d in dirs if not any(
                d == pattern.rstrip('/') or d.startswith(pattern.rstrip('/'))
                for pattern in self.exclude_patterns if pattern.endswith('/')
            )]
            
            for file in files:
                # Skip excluded files
                if not any(
                    file == pattern or file.endswith(pattern.lstrip('*'))
                    for pattern in self.exclude_patterns if not pattern.endswith('/')
                ):
                    self.total_files += 1
        
        print(f"✅ Found {self.total_files:,} files to process")
        
    def run_command(self, command, description):
        """Run a shell command and return success status"""
        try:
            print(f"\n🔄 {description}...")
            result = subprocess.run(
                command,
                shell=True,
                cwd=self.project_root,
                capture_output=True,
                text=True,
                encoding='utf-8',
                errors='replace'
            )
            
            if result.returncode == 0:
                print(f"✅ {description} - Success")
                if result.stdout.strip():
                    print(f"   Output: {result.stdout.strip()[:200]}")
                return True
            else:
                print(f"❌ {description} - Failed")
                if result.stderr.strip():
                    print(f"   Error: {result.stderr.strip()[:200]}")
                return False
                
        except Exception as e:
            print(f"❌ {description} - Error: {str(e)}")
            return False
    
    def format_time(self, seconds):
        """Format seconds into human-readable time"""
        if seconds < 60:
            return f"{int(seconds)}s"
        elif seconds < 3600:
            return f"{int(seconds // 60)}m {int(seconds % 60)}s"
        else:
            hours = int(seconds // 3600)
            minutes = int((seconds % 3600) // 60)
            return f"{hours}h {minutes}m"
    
    def show_progress(self):
        """Show upload progress"""
        if self.total_files == 0:
            return
            
        elapsed = time.time() - self.start_time
        progress = (self.processed_files / self.total_files) * 100
        
        # Calculate ETA
        if self.processed_files > 0:
            avg_time_per_file = elapsed / self.processed_files
            remaining_files = self.total_files - self.processed_files
            eta_seconds = avg_time_per_file * remaining_files
            eta = self.format_time(eta_seconds)
        else:
            eta = "calculating..."
        
        # Progress bar
        bar_length = 40
        filled = int(bar_length * progress / 100)
        bar = '█' * filled + '░' * (bar_length - filled)
        
        print(f"\r📤 Progress: [{bar}] {progress:.1f}% | "
              f"Files: {self.processed_files:,}/{self.total_files:,} | "
              f"Skipped: {self.skipped_files:,} | "
              f"ETA: {eta} | "
              f"Elapsed: {self.format_time(elapsed)}", end='', flush=True)
    
    def initialize_git(self):
        """Initialize git repository"""
        git_dir = self.project_root / '.git'
        
        if git_dir.exists():
            print("✅ Git repository already initialized")
            return True
        
        return self.run_command('git init', 'Initializing Git repository')
    
    def add_files(self):
        """Add files to git with progress tracking"""
        print("\n\n📦 Adding files to Git...")
        self.start_time = time.time()
        
        # Add all files (gitignore will handle exclusions)
        result = self.run_command('git add .', 'Adding files')
        
        if result:
            # Count added files
            status_result = subprocess.run(
                'git status --short',
                shell=True,
                cwd=self.project_root,
                capture_output=True,
                text=True
            )
            
            if status_result.returncode == 0:
                added_files = len([line for line in status_result.stdout.split('\n') if line.strip()])
                self.processed_files = added_files
                print(f"\n✅ Added {added_files:,} files to Git")
        
        return result
    
    def commit_changes(self, message=None):
        """Commit changes"""
        if message is None:
            message = f"Initial commit - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
        
        return self.run_command(
            f'git commit -m "{message}"',
            'Committing changes'
        )
    
    def add_remote(self, repo_url):
        """Add remote repository"""
        # Check if remote already exists
        result = subprocess.run(
            'git remote get-url origin',
            shell=True,
            cwd=self.project_root,
            capture_output=True,
            text=True
        )
        
        if result.returncode == 0:
            print(f"✅ Remote 'origin' already exists: {result.stdout.strip()}")
            
            # Ask if user wants to update it
            response = input("Do you want to update the remote URL? (y/n): ").lower()
            if response == 'y':
                return self.run_command(
                    f'git remote set-url origin {repo_url}',
                    'Updating remote URL'
                )
            return True
        
        return self.run_command(
            f'git remote add origin {repo_url}',
            'Adding remote repository'
        )
    
    def push_to_github(self, branch='main'):
        """Push to GitHub"""
        # Check if branch exists
        result = subprocess.run(
            'git branch --show-current',
            shell=True,
            cwd=self.project_root,
            capture_output=True,
            text=True
        )
        
        current_branch = result.stdout.strip()
        
        if not current_branch:
            # Create and switch to main branch
            self.run_command(f'git branch -M {branch}', f'Creating {branch} branch')
        
        # Try to push
        push_result = self.run_command(
            f'git push -u origin {branch}',
            f'Pushing to GitHub ({branch} branch)'
        )
        
        # If push failed due to branch protection
        if not push_result:
            print("\n⚠️  Push to 'main' failed - likely due to branch protection")
            print("\n💡 Trying alternative: Pushing to 'develop' branch instead...")
            
            # Create and push to develop branch
            self.run_command('git checkout -b develop', 'Creating develop branch')
            develop_result = self.run_command(
                'git push -u origin develop',
                'Pushing to GitHub (develop branch)'
            )
            
            if develop_result:
                print("\n✅ Successfully pushed to 'develop' branch!")
                print("\n📝 Next steps:")
                print("   1. Go to your GitHub repository")
                print("   2. Create a Pull Request: develop → main")
                print("   3. Merge the PR to update main branch")
                return True
            
            return False
        
        return push_result
    
    def upload(self, repo_url, commit_message=None):
        """Main upload process"""
        print("=" * 80)
        print("🚀 GitHub Project Upload Script")
        print("=" * 80)
        print(f"📁 Project: {self.project_root}")
        print(f"🔗 Repository: {repo_url}")
        print("=" * 80)
        
        # Step 1: Create .gitignore
        self.create_gitignore()
        
        # Step 2: Sanitize .env
        self.sanitize_env_file()
        
        # Step 3: Count files
        self.count_files()
        
        # Step 4: Initialize Git
        if not self.initialize_git():
            print("\n❌ Failed to initialize Git repository")
            return False
        
        # Step 5: Add files
        if not self.add_files():
            print("\n❌ Failed to add files")
            return False
        
        # Step 6: Commit
        if not self.commit_changes(commit_message):
            print("\n❌ Failed to commit changes")
            return False
        
        # Step 7: Add remote
        if not self.add_remote(repo_url):
            print("\n❌ Failed to add remote repository")
            return False
        
        # Step 8: Push to GitHub
        print("\n" + "=" * 80)
        print("📤 Uploading to GitHub...")
        print("=" * 80)
        
        if not self.push_to_github():
            print("\n❌ Failed to push to GitHub")
            print("\n💡 Troubleshooting:")
            print("   1. Make sure you have Git installed")
            print("   2. Verify your GitHub credentials")
            print("   3. Check if the repository exists on GitHub")
            print("   4. Try: git push -u origin main --force (if needed)")
            return False
        
        # Success!
        print("\n" + "=" * 80)
        print("✅ SUCCESS! Project uploaded to GitHub")
        print("=" * 80)
        print(f"🔗 Repository: {repo_url}")
        print(f"📊 Files uploaded: {self.processed_files:,}")
        print(f"⏱️  Total time: {self.format_time(time.time() - self.start_time)}")
        print("=" * 80)
        
        return True


def main():
    """Main function"""
    print("\n" + "=" * 80)
    print("🚀 GitHub Project Upload Wizard")
    print("=" * 80)
    
    # Get repository URL
    print("\n📝 Enter your GitHub repository URL:")
    print("   Example: https://github.com/username/repository.git")
    print("   Or: git@github.com:username/repository.git")
    
    repo_url = input("\n🔗 Repository URL: ").strip()
    
    if not repo_url:
        print("❌ Repository URL is required!")
        return
    
    # Get commit message (optional)
    print("\n📝 Enter commit message (press Enter for default):")
    commit_message = input("💬 Message: ").strip()
    
    if not commit_message:
        commit_message = None
    
    # Confirm
    print("\n" + "=" * 80)
    print("⚠️  IMPORTANT: Security Check")
    print("=" * 80)
    print("This script will:")
    print("✅ Create .gitignore to exclude sensitive files")
    print("✅ Create .env.example (sanitized version of .env)")
    print("✅ Exclude node_modules, build files, and logs")
    print("✅ Show upload progress with ETA")
    print("\n❌ Will NOT upload:")
    print("   - .env file (secrets)")
    print("   - API keys and credentials")
    print("   - node_modules")
    print("   - Build outputs")
    print("=" * 80)
    
    response = input("\n🤔 Continue with upload? (yes/no): ").lower()
    
    if response not in ['yes', 'y']:
        print("❌ Upload cancelled")
        return
    
    # Start upload
    uploader = GitHubUploader()
    success = uploader.upload(repo_url, commit_message)
    
    if success:
        print("\n🎉 All done! Your project is now on GitHub!")
        print("\n💡 Next steps:")
        print("   1. Visit your repository on GitHub")
        print("   2. Add a README.md if you haven't")
        print("   3. Set up GitHub Actions for CI/CD")
        print("   4. Invite collaborators")
    else:
        print("\n❌ Upload failed. Please check the errors above.")
        sys.exit(1)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n❌ Upload cancelled by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ Unexpected error: {str(e)}")
        sys.exit(1)
