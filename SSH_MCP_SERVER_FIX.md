# SSH MCP Server Fix

## Issue
The SSH MCP server was timing out during initialization with the error:
```
Error connecting to MCP server: MCP error -32001: Request timed out
```

## Root Cause
The SSH MCP server was missing the critical `initialize` method handler. When Kiro tried to initialize the server, it sent an `initialize` request but the server didn't know how to handle it, causing a timeout after 60 seconds.

The server also wasn't properly formatting responses according to the JSON-RPC 2.0 specification.

## Solution
Updated the SSH MCP server to:

1. **Handle the `initialize` method** - Required by MCP protocol
2. **Use correct protocol version** - `2024-11-05` instead of missing it
3. **Format all responses as JSON-RPC 2.0** - Include `jsonrpc`, `id`, and proper `result`/`error` fields
4. **Improve error handling** - Proper error responses with correct error codes

## Changes Made

### File: `ssh_mcp_server.py`

#### 1. Added `initialize` method handler
```python
if method == "initialize":
    return {
        "jsonrpc": "2.0",
        "id": request_id,
        "result": {
            "protocolVersion": "2024-11-05",
            "serverInfo": {
                "name": "ssh-mcp-server",
                "version": "1.0.0"
            },
            "capabilities": {
                "tools": {}
            }
        }
    }
```

#### 2. Updated all response formats to JSON-RPC 2.0
- Added `"jsonrpc": "2.0"` to all responses
- Added `"id": request_id` to all responses
- Wrapped results in `"result"` field
- Wrapped errors in `"error"` field with proper error codes

#### 3. Improved error handling
- Parse errors: code `-32700`
- Method not found: code `-32601`
- Internal errors: code `-32603`
- Tool execution errors: code `-32603`

#### 4. Fixed the `run` method
- Properly handles JSON decode errors
- Sends proper error responses
- Maintains JSON-RPC 2.0 format throughout

## Testing
After applying these fixes:

1. Restart Kiro to reload the SSH MCP server
2. The server should now initialize successfully
3. All SSH tools should be available:
   - `ssh_exec` - Execute commands
   - `ssh_upload` - Upload files
   - `ssh_download` - Download files
   - `ssh_list_files` - List remote files
   - `ssh_test_connection` - Test SSH connection

## Expected Behavior
- ✅ SSH MCP server initializes without timeout errors
- ✅ All 5 SSH tools are available
- ✅ Proper JSON-RPC 2.0 responses
- ✅ Correct error handling and reporting
- ✅ No more "Request timed out" errors

## MCP Protocol Compliance
The server now fully complies with the MCP protocol specification:
- Handles `initialize` method
- Uses protocol version `2024-11-05`
- Formats all responses as JSON-RPC 2.0
- Provides proper error responses
- Includes server capabilities
