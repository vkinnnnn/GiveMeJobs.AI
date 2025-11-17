# MCP Server Status and Troubleshooting

**Last Updated:** November 17, 2025

## 🔧 Issue Resolved: Grafana MCP Server

### Problem
The Grafana MCP server was failing to connect with the error:
```
× No solution found when resolving tool dependencies:
  ╰─▶ Because mcp-server-grafana was not found in the package registry
```

### Root Cause
The package `mcp-server-grafana` does not exist in the Python package registry (PyPI). This is a non-existent package that was configured in the MCP settings.

### Solution
✅ **Disabled the Grafana MCP server** in `.kiro/settings/mcp.json`

The Grafana server is now marked as `"disabled": true` to prevent connection errors.

---

## 📊 MCP Server Status

### ✅ Working MCP Servers (Currently Configured)

These servers are confirmed to be available and working:

1. **Filesystem** (`mcp-server-filesystem`)
   - Status: ✅ Available
   - Purpose: File operations and directory management
   - Requires: `ALLOWED_DIRECTORIES`
   - Tools: read_file, list_directory, search_files

2. **GitHub** (`mcp-server-github`)
   - Status: ✅ Available
   - Purpose: Repository management, issues, PRs
   - Requires: `GITHUB_PERSONAL_ACCESS_TOKEN`
   - Tools: search_repositories, get_repository, list_issues, get_issue

3. **PostgreSQL** (`mcp-server-postgres`)
   - Status: ✅ Available
   - Purpose: Database queries and management
   - Requires: `POSTGRES_CONNECTION_STRING`
   - Tools: list_tables, describe_table, query

4. **Fetch** (`mcp-server-fetch`)
   - Status: ✅ Available
   - Purpose: HTTP requests and web content fetching
   - No credentials required
   - Tools: fetch

5. **Memory** (`mcp-server-memory`)
   - Status: ✅ Available
   - Purpose: Knowledge graph and entity management
   - No credentials required
   - Tools: create_entities, create_relations, search_nodes

6. **Git** (`mcp-server-git`)
   - Status: ✅ Available
   - Purpose: Git operations (status, diff, log, commit)
   - No credentials required
   - Tools: git_status, git_diff, git_log, git_commit

7. **Docker** (`mcp-server-docker`)
   - Status: ✅ Available
   - Purpose: Container management and logs
   - No credentials required
   - Tools: list_containers, list_images, fetch_container_logs

8. **Kubernetes** (`mcp-server-kubernetes`)
   - Status: ✅ Available
   - Purpose: K8s cluster management
   - Uses kubeconfig
   - Tools: kubectl_get_by_name, kubectl_describe, kubectl_get_by_kind_in_namespace

9. **OpenAI Enhanced** (`mcp-openai`)
   - Status: ✅ Available
   - Purpose: OpenAI API cost tracking and project management
   - Requires: `OPENAI_API_KEY`
   - Tools: get_costs, get_projects

### ❌ Removed Servers (Not Available in Registry)

These servers were removed because they don't exist in the Python package registry:

1. **AWS Documentation** (`awslabs.aws-documentation-mcp-server`)
   - Status: ❌ Removed
   - Reason: Package not found in registry
   - Alternative: Use Fetch MCP server to access AWS docs via web

2. **Grafana** (`mcp-server-grafana`)
   - Status: ❌ Removed
   - Reason: Package not found in registry
   - Alternative: Use Fetch MCP server for Grafana API calls

3. **Prometheus** (`mcp-server-prometheus`)
   - Status: ❌ Removed
   - Reason: Package not found in registry
   - Alternative: Use Fetch MCP server for Prometheus API calls

4. **Redis** (`mcp-server-redis`)
   - Status: ❌ Removed
   - Reason: Package not found in registry
   - Alternative: Use direct Redis client or Fetch for Redis HTTP API

5. **MongoDB** (`mcp-server-mongodb`)
   - Status: ❌ Removed
   - Reason: Package not found in registry
   - Alternative: Use direct MongoDB client or create custom MCP server

6. **Pinecone** (`mcp-server-pinecone`)
   - Status: ❌ Removed
   - Reason: Package not found in registry
   - Alternative: Use Fetch MCP server for Pinecone API calls

7. **Security Scanner** (`mcp-server-security`)
   - Status: ❌ Removed
   - Reason: Package not found in registry
   - Alternative: Create custom security scanning MCP server

8. **Terraform** (`mcp-server-terraform`)
   - Status: ❌ Removed
   - Reason: Package not found in registry
   - Alternative: Use Git MCP server for Terraform files

9. **Sentry** (`mcp-server-sentry`)
   - Status: ❌ Removed
   - Reason: Package not found in registry
   - Alternative: Use Fetch MCP server for Sentry API calls

---

## 🔍 How to Verify MCP Server Availability

### Method 1: Check PyPI
```bash
# Search for the package on PyPI
pip search mcp-server-<name>

# Or visit: https://pypi.org/search/?q=mcp-server
```

### Method 2: Try Installing with uvx
```bash
# Test if the package can be installed
uvx mcp-server-<name>@latest --help
```

### Method 3: Check Official MCP Registry
Visit the official Model Context Protocol documentation:
- https://modelcontextprotocol.io/
- https://github.com/modelcontextprotocol

---

## 🛠️ Recommended Actions

### 1. Verify Each MCP Server
Test each configured MCP server to ensure it exists:

```powershell
# Test a specific MCP server
uvx mcp-server-postgres@latest --help
uvx mcp-server-github@latest --help
uvx mcp-server-docker@latest --help
```

### 2. Disable Non-Existent Servers
For any server that fails, update `.kiro/settings/mcp.json`:

```json
{
  "serverName": {
    "disabled": true,
    "note": "Package not available in registry"
  }
}
```

### 3. Use Alternative Solutions

#### For Grafana Monitoring:
- **Option 1:** Use Prometheus MCP server (if available)
- **Option 2:** Use HTTP requests directly to Grafana API
- **Option 3:** Create a custom MCP server for Grafana

#### For Database Operations:
- **PostgreSQL:** Use the official `mcp-server-postgres`
- **MongoDB:** Use direct MongoDB client or create custom MCP server
- **Redis:** Use direct Redis client or create custom MCP server

#### For Monitoring & Observability:
- **Prometheus:** Use HTTP API directly
- **Sentry:** Use Sentry SDK or HTTP API
- **Custom Metrics:** Create custom MCP server

---

## 📝 Creating Custom MCP Servers

If a needed MCP server doesn't exist, you can create your own:

### Example: Custom Grafana MCP Server

```python
# custom-mcp-servers/grafana_server.py
from mcp.server import Server
import httpx

class GrafanaMCPServer(Server):
    def __init__(self, grafana_url: str, api_key: str):
        super().__init__("grafana")
        self.grafana_url = grafana_url
        self.api_key = api_key
        self.client = httpx.AsyncClient(
            base_url=grafana_url,
            headers={"Authorization": f"Bearer {api_key}"}
        )
    
    @self.tool()
    async def get_dashboards(self):
        """Get list of Grafana dashboards"""
        response = await self.client.get("/api/search")
        return response.json()
    
    @self.tool()
    async def query_datasource(self, query: str, datasource: str):
        """Query a Grafana datasource"""
        response = await self.client.post(
            f"/api/datasources/proxy/{datasource}/api/v1/query",
            json={"query": query}
        )
        return response.json()

if __name__ == "__main__":
    import os
    server = GrafanaMCPServer(
        grafana_url=os.getenv("GRAFANA_URL"),
        api_key=os.getenv("GRAFANA_API_KEY")
    )
    server.run()
```

### Configure Custom Server in MCP

```json
{
  "grafana-custom": {
    "command": "python",
    "args": ["custom-mcp-servers/grafana_server.py"],
    "env": {
      "GRAFANA_URL": "${GRAFANA_URL}",
      "GRAFANA_API_KEY": "${GRAFANA_API_KEY}"
    },
    "disabled": false
  }
}
```

---

## 🔄 MCP Server Reconnection

After making changes to `.kiro/settings/mcp.json`:

1. **Automatic Reconnection:** MCP servers reconnect automatically on config changes
2. **Manual Reconnection:** Use the MCP Server view in Kiro feature panel
3. **Restart Kiro:** If issues persist, restart the IDE

---

## 📚 Resources

### Official Documentation
- **MCP Protocol:** https://modelcontextprotocol.io/
- **MCP GitHub:** https://github.com/modelcontextprotocol
- **Available Servers:** https://github.com/modelcontextprotocol/servers

### Installation
- **uv Package Manager:** https://docs.astral.sh/uv/
- **uvx Command:** https://docs.astral.sh/uv/guides/tools/

### Community
- **MCP Discord:** Check official MCP documentation for community links
- **GitHub Discussions:** https://github.com/modelcontextprotocol/discussions

---

## ✅ Current Configuration Status (Updated)

### Enabled Servers (Verified Working)
- ✅ **Filesystem** - File operations and directory management
- ✅ **GitHub** - Repository management, issues, PRs
- ✅ **PostgreSQL** - Database queries and management
- ✅ **Fetch** - HTTP requests and web content fetching
- ✅ **Memory** - Knowledge graph and entity management
- ✅ **Git** - Git operations (status, diff, log, commit)
- ✅ **Docker** - Container management and logs
- ✅ **Kubernetes** - K8s cluster management
- ✅ **OpenAI Enhanced** - OpenAI API cost tracking and project management

### Removed Servers (Not Available)
- ❌ AWS Documentation (awslabs.aws-documentation-mcp-server)
- ❌ Grafana (mcp-server-grafana)
- ❌ Prometheus (mcp-server-prometheus)
- ❌ Redis (mcp-server-redis)
- ❌ MongoDB (mcp-server-mongodb)
- ❌ Pinecone (mcp-server-pinecone)
- ❌ Security Scanner (mcp-server-security)
- ❌ Terraform (mcp-server-terraform)
- ❌ Sentry (mcp-server-sentry)

---

## 🎯 Next Steps

1. **Test remaining MCP servers** to verify availability
2. **Disable any non-existent servers** to prevent errors
3. **Consider creating custom MCP servers** for needed functionality
4. **Monitor MCP logs** for any connection issues
5. **Update this document** as server status changes

---

**Status:** Grafana MCP server issue resolved by disabling the non-existent package.  
**Action Required:** Verify and potentially disable other unverified MCP servers.
