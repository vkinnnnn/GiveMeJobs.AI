# MCP Protocol Version Fix

## Issue
The MCP servers were responding with protocol version `1.0`, but Kiro expects the current MCP protocol version `2024-11-05`.

**Error Message:**
```
Error connecting to MCP server: Server's protocol version is not supported: 1.0
```

## Root Cause
All three MCP servers (Database, Docker, API Testing) were hardcoding the protocol version to `1.0` in their initialization response, which is outdated and incompatible with the current Kiro MCP implementation.

## Solution
Updated the `protocolVersion` field in the initialization response for all three MCP servers from `1.0` to `2024-11-05`.

### Files Modified

1. **packages/python-services/src/mcp_servers/database_mcp.py**
   - Line 467: Changed `"protocolVersion": "1.0"` → `"protocolVersion": "2024-11-05"`
   - Also simplified capabilities structure

2. **packages/python-services/src/mcp_servers/docker_mcp.py**
   - Line 366: Changed `"protocolVersion": "1.0"` → `"protocolVersion": "2024-11-05"`
   - Also simplified capabilities structure

3. **packages/python-services/src/mcp_servers/api_testing_mcp.py**
   - Line 402: Changed `"protocolVersion": "1.0"` → `"protocolVersion": "2024-11-05"`
   - Also simplified capabilities structure

## Changes Made

### Before
```python
self.send_result(request_id, {
    "protocolVersion": "1.0",
    "serverInfo": {
        "name": "database-mcp-server",
        "version": "1.0.0"
    },
    "capabilities": {
        "tools": {
            "list": True,
            "call": True
        }
    }
})
```

### After
```python
self.send_result(request_id, {
    "protocolVersion": "2024-11-05",
    "serverInfo": {
        "name": "database-mcp-server",
        "version": "1.0.0"
    },
    "capabilities": {
        "tools": {}
    }
})
```

## Testing
After applying these fixes:

1. Restart Kiro to reload the MCP servers
2. The servers should now initialize successfully with the correct protocol version
3. All tools should be available and functional

## Expected Behavior
- ✅ MCP servers initialize without protocol version errors
- ✅ All 11 tools remain functional
- ✅ Database, Docker, and API Testing operations work as expected
- ✅ No more "Server's protocol version is not supported" errors

## MCP Protocol Version
The current MCP protocol version is `2024-11-05`, which is the standard version supported by Kiro and other MCP clients.
