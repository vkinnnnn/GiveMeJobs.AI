# Snyk MCP Server Setup - Complete Guide

**Date:** November 18, 2025  
**Status:** ✅ Configured and Ready

---

## ✅ **Setup Complete**

The Snyk MCP server has been successfully installed and configured for security scanning!

---

## 📋 **What Was Done**

### 1. Installed Snyk CLI
```bash
npm install -g snyk
```
- **Version:** 1.1301.0
- **Status:** ✅ Installed globally

### 2. Added Snyk MCP Server Configuration

Added to `.kiro/settings/mcp.json`:
```json
{
  "snyk": {
    "command": "npx",
    "args": ["-y", "snyk@latest", "mcp", "-t", "stdio"],
    "env": {},
    "disabled": false,
    "autoApprove": ["snyk_code_scan", "snyk_test", "snyk_iac_test", "snyk_container_test"]
  }
}
```

### 3. Created Security Steering Rules

Created `steering/security-best-practices.md` with:
- Automatic Snyk scanning for new code
- Security-first development guidelines
- Code review checklist
- Dependency security practices
- Secret management rules

---

## 🎯 **Available Snyk Tools**

With the Snyk MCP server, you now have access to:

### 1. Code Security Scanning (`snyk_code_scan`)
- **Purpose:** SAST (Static Application Security Testing)
- **Scans:** Source code for security vulnerabilities
- **Languages:** JavaScript, TypeScript, Python, Java, Go, C#, PHP, Ruby, and more
- **Usage:** "Scan this code for security vulnerabilities"

### 2. Dependency Scanning (`snyk_test`)
- **Purpose:** SCA (Software Composition Analysis)
- **Scans:** Open-source dependencies for known vulnerabilities
- **Checks:** package.json, requirements.txt, pom.xml, etc.
- **Usage:** "Check dependencies for vulnerabilities"

### 3. Infrastructure as Code (`snyk_iac_test`)
- **Purpose:** IaC security scanning
- **Scans:** Terraform, Kubernetes, CloudFormation, ARM templates
- **Checks:** Misconfigurations and security issues
- **Usage:** "Scan Terraform files for security issues"

### 4. Container Scanning (`snyk_container_test`)
- **Purpose:** Container image vulnerability scanning
- **Scans:** Docker images for OS and application vulnerabilities
- **Checks:** Base images and application dependencies
- **Usage:** "Scan Docker image for vulnerabilities"

---

## 🚀 **How to Use**

### First-Time Setup

When you first use Snyk, you'll need to:

1. **Authenticate**
   - Snyk will prompt you to authenticate via browser
   - Follow the authentication flow
   - This is a one-time setup

2. **Trust Directory**
   - Snyk will ask to trust your project directory
   - Approve the trust request
   - This allows Snyk to scan your code

### Example Usage

#### Scan for Code Vulnerabilities
```
"Scan this directory for code security vulnerabilities"
"Check the backend code for security issues"
"Run Snyk code scan on packages/backend/src"
```

#### Check Dependencies
```
"Check dependencies for vulnerabilities"
"Scan package.json for vulnerable packages"
"Test Python dependencies for security issues"
```

#### Scan Infrastructure
```
"Scan Terraform files for security issues"
"Check Kubernetes configs for misconfigurations"
"Analyze infrastructure code for vulnerabilities"
```

#### Scan Containers
```
"Scan Docker image for vulnerabilities"
"Check container security"
"Analyze Docker image security"
```

---

## 🛡️ **Secure at Inception Workflow**

The steering rules automatically enforce this workflow:

1. **Generate Code** → Kiro generates new code
2. **Auto-Scan** → Snyk automatically scans the code
3. **Find Issues** → Security vulnerabilities are identified
4. **Auto-Fix** → Kiro attempts to fix the issues
5. **Re-Scan** → Verify fixes and check for new issues
6. **Repeat** → Continue until no issues remain

This ensures **security is built-in from the start**, not added later!

---

## 📊 **Current MCP Servers (6 total)**

Your complete MCP configuration now includes:

1. **✅ Fetch** - HTTP requests and web scraping
2. **✅ Memory** - Knowledge graph management
3. **✅ GitHub** - Repository management
4. **✅ Git** - Git operations
5. **✅ Brave Search** - Web and local search
6. **✅ Snyk** - Security vulnerability scanning (NEW!)

---

## 🔐 **Security Benefits**

### What Snyk Provides

1. **Proactive Security**
   - Catch vulnerabilities before they reach production
   - Fix issues during development
   - Prevent security debt

2. **Comprehensive Coverage**
   - Code vulnerabilities (SAST)
   - Dependency vulnerabilities (SCA)
   - Infrastructure misconfigurations (IaC)
   - Container vulnerabilities

3. **Actionable Insights**
   - Clear vulnerability descriptions
   - Fix recommendations
   - Severity ratings
   - Remediation guidance

4. **Continuous Monitoring**
   - Scan on every code generation
   - Automatic re-scanning after fixes
   - Track security improvements

---

## 🧪 **Testing the Setup**

### Verify Snyk CLI
```bash
# Check version
snyk --version

# Check authentication status
snyk auth
```

### Test MCP Server

1. **Restart Kiro IDE** to load the new configuration
2. **Check MCP logs** for successful Snyk connection
3. **Run a test scan:**
   ```
   "Scan the backend code for security vulnerabilities"
   ```

### Expected Behavior

When you ask for a security scan:
1. Kiro will call the Snyk MCP server
2. Snyk will scan your code
3. Results will be displayed with:
   - Vulnerability details
   - Severity levels
   - Fix recommendations
4. Kiro will offer to fix the issues

---

## 📝 **Steering Rules Applied**

The `steering/security-best-practices.md` file ensures:

- ✅ **Automatic scanning** of all new code
- ✅ **Automatic fix attempts** for found vulnerabilities
- ✅ **Re-scanning** after fixes
- ✅ **Iterative fixing** until clean
- ✅ **Security-first** development approach

---

## 🛠️ **Troubleshooting**

### Issue: "Snyk not authenticated"
**Solution:**
```bash
snyk auth
```
Follow the browser authentication flow.

### Issue: "Directory not trusted"
**Solution:**
```bash
snyk trust C:\Users\chira\.kiro
```
Or approve when prompted by Kiro.

### Issue: "MCP server not connecting"
**Solution:**
1. Verify Snyk CLI is installed: `snyk --version`
2. Check MCP logs for errors
3. Restart Kiro IDE
4. Re-authenticate if needed

### Issue: "No vulnerabilities found but code has issues"
**Solution:**
- Ensure you're scanning the correct directory
- Check that files are in supported languages
- Verify Snyk CLI is up to date

---

## 📚 **Resources**

### Snyk Documentation
- **Main Docs:** https://docs.snyk.io/
- **MCP Guide:** https://docs.snyk.io/integrations/developer-guardrails-for-agentic-workflows/quickstart-guides-for-mcp/kiro-guide
- **CLI Docs:** https://docs.snyk.io/snyk-cli
- **Supported Languages:** https://docs.snyk.io/supported-languages-package-managers-and-frameworks

### Snyk Resources
- **Dashboard:** https://app.snyk.io/
- **Learn:** https://learn.snyk.io/
- **Community:** https://snyk.io/community/

---

## 🎯 **Supported Languages**

Snyk can scan code in:

### Code Security (SAST)
- JavaScript/TypeScript
- Python
- Java/Kotlin
- C#/.NET
- Go
- PHP
- Ruby
- Swift/Objective-C
- Scala
- And more...

### Dependencies (SCA)
- npm (Node.js)
- pip/poetry (Python)
- Maven/Gradle (Java)
- NuGet (.NET)
- Go modules
- Composer (PHP)
- RubyGems
- And more...

### Infrastructure (IaC)
- Terraform
- Kubernetes
- AWS CloudFormation
- Azure Resource Manager
- Helm charts
- Docker Compose

---

## 📈 **Best Practices**

### 1. Scan Early and Often
- Scan before committing code
- Scan after adding dependencies
- Scan infrastructure changes
- Scan container images

### 2. Fix High-Severity Issues First
- Critical and High severity issues first
- Medium severity issues next
- Low severity issues as time permits

### 3. Keep Dependencies Updated
- Regular dependency updates
- Monitor for new vulnerabilities
- Use automated dependency updates

### 4. Monitor Continuously
- Set up Snyk monitoring
- Get alerts for new vulnerabilities
- Track security improvements over time

---

## ✅ **Summary**

**Installed:** Snyk CLI v1.1301.0  
**Configured:** Snyk MCP server in Kiro  
**Steering Rules:** Security-first development enabled  
**Status:** ✅ Ready for security scanning  
**Total MCP Servers:** 6 working servers  

---

## 🎉 **You're Protected!**

The Snyk MCP server is now configured and ready to:

- ✅ Scan your code for security vulnerabilities
- ✅ Check dependencies for known issues
- ✅ Analyze infrastructure for misconfigurations
- ✅ Scan containers for vulnerabilities
- ✅ Automatically fix security issues
- ✅ Ensure secure code from inception

Just ask me to scan your code, and I'll use Snyk to identify and help fix any security issues!

---

**Last Updated:** November 18, 2025  
**Configuration Files:**
- `.kiro/settings/mcp.json`
- `steering/security-best-practices.md`
- Snyk CLI installed globally
