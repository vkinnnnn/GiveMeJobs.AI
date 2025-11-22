# Perplexity MCP Server Setup

## Overview

A custom Perplexity MCP server has been created for your Kiro workspace. This integration provides AI-powered search and reasoning capabilities through Perplexity AI's advanced language models.

## Configuration Status

⚠️ **REQUIRES SETUP** - Follow the installation steps below

### Configuration Details

- **Server**: Custom Python MCP server (`perplexity_mcp_server.py`)
- **Command**: `python perplexity_mcp_server.py`
- **API Key**: Configured in `.env.mcp`
- **Status**: Ready for installation

## Installation

### Quick Setup

Run the automated setup script:

```powershell
.\setup-perplexity-mcp.ps1
```

### Manual Setup

1. **Install Python dependencies:**
   ```powershell
   pip install -r perplexity_mcp_requirements.txt
   ```

2. **Verify API key in `.env.mcp`:**
   ```bash
   PERPLEXITY_API_KEY=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
   ```

3. **Restart Kiro** to load the MCP server

### Required Dependencies

- Python 3.8 or higher
- `mcp>=0.9.0` - MCP SDK
- `httpx>=0.27.0` - HTTP client
- `anyio>=4.0.0` - Async support

## Available Tools

The Perplexity MCP server provides the following tools:

### 1. `perplexity_search`
Advanced AI-powered search with reasoning capabilities.

**Use Cases:**
- Research complex topics with AI-powered analysis
- Get comprehensive answers with citations
- Explore technical documentation and best practices
- Find up-to-date information on current events

**Example:**
```
Use perplexity_search to find the latest best practices for FastAPI authentication
```

### 2. `perplexity_chat`
Interactive chat with Perplexity AI for follow-up questions and deeper exploration.

**Use Cases:**
- Multi-turn conversations about technical topics
- Clarifying complex concepts
- Getting detailed explanations
- Exploring related topics

**Example:**
```
Use perplexity_chat to discuss the pros and cons of different state management solutions in React
```

## Features

### AI-Powered Search
- **Reasoning**: Perplexity provides thoughtful, reasoned responses
- **Citations**: Answers include sources and references
- **Current Information**: Access to recent and up-to-date information
- **Context Awareness**: Understands complex queries and provides relevant answers

### Integration Benefits
- **Auto-Approved**: Tools are pre-approved for seamless use
- **Environment Variables**: API key securely stored in `.env.mcp`
- **Easy Access**: Available through Kiro's MCP interface

## Configuration Files

### 1. `.kiro/settings/mcp.json`
```json
{
  "perplexity": {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-perplexity"],
    "env": {
      "PERPLEXITY_API_KEY": "${PERPLEXITY_API_KEY}"
    },
    "disabled": false,
    "autoApprove": ["perplexity_search", "perplexity_chat"]
  }
}
```

### 2. `.env.mcp`
```bash
# Perplexity AI - Advanced AI search and reasoning
# Get from: https://www.perplexity.ai/settings/api
# Status: ✅ CONFIGURED
PERPLEXITY_API_KEY=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
```

## Usage Examples

### Research Technical Topics
```
I need to research the latest trends in AI-powered job matching algorithms. 
Can you use Perplexity to find recent developments and best practices?
```

### Compare Technologies
```
Use Perplexity to compare FastAPI vs Express.js for building REST APIs, 
focusing on performance, developer experience, and ecosystem.
```

### Get Current Information
```
What are the latest updates to Next.js 14? Use Perplexity to find 
recent announcements and new features.
```

### Explore Best Practices
```
Use Perplexity to research best practices for implementing OAuth 2.0 
authentication in a microservices architecture.
```

## Verification

To verify the Perplexity MCP server is working:

1. **Restart Kiro** to load the new configuration
2. **Check MCP Server Status** in Kiro's MCP panel
3. **Test a Search**:
   ```
   Use perplexity_search to find information about Python FastAPI best practices
   ```

## Troubleshooting

### Server Not Responding
- Ensure `npx` is installed and accessible
- Check that the API key is correctly set in `.env.mcp`
- Restart Kiro to reload the configuration

### API Key Issues
- Verify the API key is valid at https://www.perplexity.ai/settings/api
- Check that the key has not expired
- Ensure the key has proper permissions

### Connection Errors
- Check your internet connection
- Verify Perplexity API service status
- Review Kiro's MCP logs for detailed error messages

## API Key Management

### Getting a New API Key
1. Visit https://www.perplexity.ai/settings/api
2. Sign in to your Perplexity account
3. Navigate to API settings
4. Generate a new API key
5. Update `.env.mcp` with the new key

### Security Best Practices
- ✅ API key stored in `.env.mcp` (not committed to git)
- ✅ Environment variable reference in `mcp.json`
- ⚠️ Rotate API keys regularly
- ⚠️ Monitor API usage and rate limits
- ⚠️ Never share API keys publicly

## Integration with GiveMeJobs Platform

The Perplexity MCP server can enhance your development workflow:

### Research & Development
- Research job market trends and insights
- Explore AI/ML algorithms for job matching
- Find best practices for document generation
- Investigate blockchain credential verification approaches

### Technical Decision Making
- Compare technology stacks and frameworks
- Evaluate third-party services and APIs
- Research security best practices
- Explore scalability patterns

### Documentation & Learning
- Get explanations of complex concepts
- Find code examples and patterns
- Research API documentation
- Learn about new technologies

## Rate Limits & Usage

- Check Perplexity's API documentation for current rate limits
- Monitor your API usage through the Perplexity dashboard
- Consider upgrading your plan if you need higher limits

## Additional Resources

- **Perplexity AI**: https://www.perplexity.ai/
- **API Documentation**: https://docs.perplexity.ai/
- **API Settings**: https://www.perplexity.ai/settings/api
- **MCP Documentation**: https://modelcontextprotocol.io/

## Support

For issues specific to:
- **Perplexity API**: Contact Perplexity support
- **MCP Integration**: Check Kiro documentation
- **Configuration**: Review this guide and `.env.mcp` settings

---

**Status**: ✅ Active and Ready  
**Last Updated**: November 21, 2025  
**Configuration Version**: 1.0
