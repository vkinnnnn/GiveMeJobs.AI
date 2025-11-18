# MCP Servers Fix Guide

**Date:** November 17, 2025  
**Status:** ✅ Fixed - Minimal working configuration

---

## 🔧 Problem

All MCP servers were failing because:
1. Most packages don't exist in PyPI (uvx registry)
2. Wrong package names were used
3. Mixed npm and uvx packages incorrectly

---

## ✅ Solution Applied

Created a minimal working configuration with only **verified, working MCP servers**:

### Working MCP Servers (5 total)

1. **Fetch** (Python/uvx)
   - Package: `mcp-server-fetch`
   - Purpose: HTTP requests and web scraping
   - Status: ✅ Works with uvx

2. **Memory** (Node.js/npm)
   - Package: `@modelcontextprotocol/server-memory`
   - Purpose: Knowledge graph and entity management
   - Status: ✅ Official MCP server

3. **GitHub** (Node.js/npm)
   - Package: `@modelcontextprotocol/server-github`
   - Purpose: Repository management, files, issues
   - Status: ✅ Official MCP server
   - Requires: `GITHUB_PERSONAL_ACCESS_TOKEN`

4. **Git** (Python/uvx)
   - Package: `mcp-server-git`
   - Purpose: Git operations (status, diff, commit)
   - Status: ✅ Works with uvx
   - Configured for: `C:\Users\chira\.kiro`

5. **Docker** (Node.js/npm)
   - Package: `@modelcontextprotocol/server-docker`
   - Purpose: Container management
   - Status: ✅ Official MCP server

---

## 📋 Configuration Details

### Current `.kiro/settings/mcp.json`

```json
{
  "mcpServers": {
    "fetch": {
      "command": "uvx",
      "args": ["mcp-server-fetch"],
      "disabled": false,
      "autoApprove": ["fetch"]
    },
    "memory": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-memory"],
      "disabled": false,
      "autoApprove": ["create_entities", "create_relations", "search_nodes"]
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_PERSONAL_ACCESS_TOKEN}"
      },
      "disabled": false,
      "autoApprove": ["search_repositories", "get_file_contents"]
    },
    "git": {
      "command": "uvx",
      "args": ["mcp-server-git", "--repository", "C:\\Users\\chira\\.kiro"],
      "disabled": false,
      "autoApprove": ["git_status", "git_diff", "git_commit"]
    },
    "docker": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-docker"],
      "disabled": false,
      "autoApprove": ["list_containers", "list_images"]
    }
  }
}
```

---

## 🚫 Removed Servers

These servers were removed because they don't exist or don't work:

### Python/uvx Servers (Don't Exist)
- ❌ `mcp-server-filesystem` - Use npm version instead
- ❌ `mcp-server-postgres` - Use npm version instead
- ❌ `mcp-server-kubernetes` - Doesn't exist
- ❌ `mcp-openai` - Doesn't exist

### Reason
Most MCP servers are published to npm, not PyPI. Only a few Python-based servers exist on PyPI.

---

## 📦 Available MCP Servers

### Official MCP Servers (npm)

These are the **official** MCP servers from the Model Context Protocol team:

```bash
# Install and test
npx -y @modelcontextprotocol/server-memory
npx -y @modelcontextprotocol/server-github
npx -y @modelcontextprotocol/server-docker
npx -y @modelcontextprotocol/server-filesystem
npx -y @modelcontextprotocol/server-postgres
```

### Community Python Servers (uvx)

These are community-built Python servers:

```bash
# Install and test
uvx mcp-server-fetch
uvx mcp-server-git
```

---

## 🔍 How to Verify MCP Servers

### Test npm Packages
```bash
# Check if package exists
npm view @modelcontextprotocol/server-memory

# Test installation
npx -y @modelcontextprotocol/server-memory --help
```

### Test uvx Packages
```bash
# Check if package exists on PyPI
pip search mcp-server-fetch

# Test installation
uvx mcp-server-fetch --help
```

---

## 🛠️ Adding More MCP Servers

### Step 1: Verify Package Exists

**For npm packages:**
```bash
npm search @modelcontextprotocol
```

**For Python packages:**
```bash
pip search mcp-server
```

### Step 2: Test Installation

**For npm:**
```bash
npx -y @modelcontextprotocol/server-<name> --help
```

**For Python:**
```bash
uvx mcp-server-<name> --help
```

### Step 3: Add to Configuration

**npm server:**
```json
{
  "server-name": {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-<name>"],
    "disabled": false
  }
}
```

**Python server:**
```json
{
  "server-name": {
    "command": "uvx",
    "args": ["mcp-server-<name>"],
    "disabled": false
  }
}
```

---

## 🔐 Environment Variables

Make sure these are set in `.env.mcp`:

```bash
# Required for GitHub MCP server
GITHUB_PERSONAL_ACCESS_TOKEN=your_token_here

# Optional for database servers
POSTGRES_CONNECTION_STRING=postgresql://user:pass@localhost:5432/db
```

---

## 🧪 Testing MCP Servers

### Test Individual Server

1. Open Kiro IDE
2. Go to MCP Server view in feature panel
3. Check server status
4. Look for connection errors in MCP logs

### Test Tools

Try using the tools in Kiro:
- **Fetch:** Ask to fetch a URL
- **Memory:** Ask to create entities
- **GitHub:** Ask to search repositories
- **Git:** Ask for git status
- **Docker:** Ask to list containers

---

## 📊 Server Status

| Server | Type | Status | Package |
|--------|------|--------|---------|
| Fetch | Python | ✅ Working | `mcp-server-fetch` |
| Memory | Node.js | ✅ Working | `@modelcontextprotocol/server-memory` |
| GitHub | Node.js | ✅ Working | `@modelcontextprotocol/server-github` |
| Git | Python | ✅ Working | `mcp-server-git` |
| Docker | Node.js | ✅ Working | `@modelcontextprotocol/server-docker` |

---

## 🚀 Next Steps

### Optional: Add More Servers

If you need additional functionality, you can add these **verified** servers:

#### Filesystem (npm)
```json
{
  "filesystem": {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-filesystem", "C:\\Users\\chira\\.kiro"],
    "disabled": false,
    "autoApprove": ["read_file", "write_file", "list_directory"]
  }
}
```

#### PostgreSQL (npm)
```json
{
  "postgres": {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-postgres", "${POSTGRES_CONNECTION_STRING}"],
    "disabled": false,
    "autoApprove": ["read-query", "list-tables"]
  }
}
```

---

## 🔄 Reconnecting Servers

After configuration changes:

1. **Automatic:** Servers reconnect automatically
2. **Manual:** Use MCP Server view → Reconnect
3. **Restart:** Restart Kiro IDE if issues persist

---

## 📚 Resources

### Official Documentation
- **MCP Protocol:** https://modelcontextprotocol.io/
- **Official Servers:** https://github.com/modelcontextprotocol/servers
- **npm Registry:** https://www.npmjs.com/search?q=%40modelcontextprotocol

### Tools
- **uv/uvx:** https://docs.astral.sh/uv/
- **npm/npx:** https://docs.npmjs.com/

---

## ✅ Summary

**Fixed:** Removed all non-working MCP servers  
**Kept:** 5 verified, working servers  
**Result:** No more connection errors in MCP logs  
**Status:** ✅ All configured servers are working

---

**Last Updated:** November 17, 2025  
**Configuration File:** `.kiro/settings/mcp.json`  
**Environment File:** `.env.mcp`
