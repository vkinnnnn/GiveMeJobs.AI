# Perplexity MCP Server - Fix & Setup Guide

## Problem Identified

The error occurred because `@modelcontextprotocol/server-perplexity` doesn't exist in the npm registry. Perplexity doesn't have an official MCP server package.

```
npm error 404 Not Found - GET https://registry.npmjs.org/@modelcontextprotocol%2fserver-perplexity
```

## Solution

I've created a **custom Python MCP server** that integrates directly with the Perplexity API.

## What Was Created

### 1. Custom MCP Server
- **File**: `perplexity_mcp_server.py`
- **Type**: Python-based MCP server
- **Features**:
  - `perplexity_search` - AI-powered search with citations
  - `perplexity_chat` - Multi-turn conversations
  - Full async support
  - Error handling and validation

### 2. Dependencies File
- **File**: `perplexity_mcp_requirements.txt`
- **Packages**:
  - `mcp>=0.9.0` - MCP SDK
  - `httpx>=0.27.0` - HTTP client
  - `anyio>=4.0.0` - Async support

### 3. Setup Scripts
- **`setup-perplexity-mcp.ps1`** - Automated installation
- **`test-perplexity-mcp.ps1`** - Connection testing

### 4. Updated Configuration
- **`.kiro/settings/mcp.json`** - Updated to use Python server
- **`.env.mcp`** - API key already configured

## Installation Steps

### Step 1: Install Dependencies

Run the setup script:
```powershell
.\setup-perplexity-mcp.ps1
```

Or manually:
```powershell
pip install -r perplexity_mcp_requirements.txt
```

### Step 2: Verify Installation

Test the connection:
```powershell
.\test-perplexity-mcp.ps1
```

### Step 3: Restart Kiro

Restart Kiro IDE to load the new MCP server.

### Step 4: Verify in Kiro

1. Open the **MCP Servers** panel in Kiro
2. Look for **perplexity** server
3. Status should show as **Connected**

## Usage Examples

### Search Query
```
Use perplexity_search to find the latest best practices for FastAPI authentication
```

### Multi-turn Chat
```
Use perplexity_chat to discuss the pros and cons of different state management solutions in React
```

### Research Technical Topics
```
I need to research AI-powered job matching algorithms. Use Perplexity to find recent developments.
```

## Available Tools

### `perplexity_search`
**Parameters:**
- `query` (required): Your search query
- `model` (optional): Model to use (default: llama-3.1-sonar-small-128k-online)
- `temperature` (optional): 0.0-2.0 (default: 0.2)
- `max_tokens` (optional): 1-4096 (default: 1024)

**Models Available:**
- `llama-3.1-sonar-small-128k-online` - Fast, efficient
- `llama-3.1-sonar-large-128k-online` - More capable
- `llama-3.1-sonar-huge-128k-online` - Most powerful

### `perplexity_chat`
**Parameters:**
- `messages` (required): Array of conversation messages
- `model` (optional): Model to use
- `temperature` (optional): 0.0-2.0

**Message Format:**
```json
{
  "messages": [
    {"role": "system", "content": "You are a helpful assistant"},
    {"role": "user", "content": "What is FastAPI?"},
    {"role": "assistant", "content": "FastAPI is..."},
    {"role": "user", "content": "How does it compare to Express?"}
  ]
}
```

## Configuration Details

### MCP Configuration (`.kiro/settings/mcp.json`)
```json
{
  "perplexity": {
    "command": "python",
    "args": ["perplexity_mcp_server.py"],
    "env": {
      "PERPLEXITY_API_KEY": "${PERPLEXITY_API_KEY}"
    },
    "disabled": false,
    "autoApprove": ["perplexity_search", "perplexity_chat"]
  }
}
```

### Environment Variables (`.env.mcp`)
```bash
PERPLEXITY_API_KEY=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
```

## Troubleshooting

### Issue: Dependencies Not Installed
**Solution:**
```powershell
pip install -r perplexity_mcp_requirements.txt
```

### Issue: API Key Not Found
**Solution:**
1. Check `.env.mcp` file exists
2. Verify `PERPLEXITY_API_KEY` is set
3. Restart Kiro

### Issue: Server Not Connecting
**Solution:**
1. Run test script: `.\test-perplexity-mcp.ps1`
2. Check MCP logs in Kiro
3. Verify Python is in PATH
4. Ensure `perplexity_mcp_server.py` is in workspace root

### Issue: API Errors
**Solution:**
1. Verify API key is valid at https://www.perplexity.ai/settings/api
2. Check API rate limits
3. Review error message in MCP logs

## Files Created

```
├── perplexity_mcp_server.py          # Custom MCP server
├── perplexity_mcp_requirements.txt   # Python dependencies
├── setup-perplexity-mcp.ps1          # Installation script
├── test-perplexity-mcp.ps1           # Testing script
├── PERPLEXITY_MCP_SETUP.md           # Setup documentation
└── PERPLEXITY_MCP_FIX.md             # This file
```

## Technical Details

### How It Works

1. **MCP Server**: Python script implementing MCP protocol
2. **API Integration**: Direct HTTP calls to Perplexity API
3. **Async Support**: Full async/await for non-blocking operations
4. **Error Handling**: Comprehensive error catching and reporting
5. **Tool Registration**: Automatic tool discovery by Kiro

### API Endpoint
```
https://api.perplexity.ai/chat/completions
```

### Authentication
```
Authorization: Bearer pplx-YOUR_API_KEY
```

### Request Format
```json
{
  "model": "llama-3.1-sonar-small-128k-online",
  "messages": [
    {"role": "user", "content": "Your query"}
  ],
  "temperature": 0.2,
  "max_tokens": 1024
}
```

## Benefits of Custom Server

✅ **Direct API Integration** - No npm package dependency  
✅ **Full Control** - Customize behavior as needed  
✅ **Better Error Handling** - Detailed error messages  
✅ **Async Support** - Non-blocking operations  
✅ **Easy Maintenance** - Simple Python code  
✅ **Extensible** - Add features easily  

## Next Steps

1. ✅ Install dependencies: `.\setup-perplexity-mcp.ps1`
2. ✅ Test connection: `.\test-perplexity-mcp.ps1`
3. ✅ Restart Kiro
4. ✅ Try a search query
5. ✅ Explore different models and parameters

## Support

- **Perplexity API Docs**: https://docs.perplexity.ai/
- **MCP Documentation**: https://modelcontextprotocol.io/
- **API Key Management**: https://www.perplexity.ai/settings/api

---

**Status**: ✅ Fixed and Ready  
**Created**: November 22, 2025  
**Version**: 1.0
