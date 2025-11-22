#!/usr/bin/env python3
"""
SSH MCP Server
A Model Context Protocol server for SSH operations
"""

import asyncio
import json
import sys
from typing import Any, Dict, List, Optional
import subprocess
import os


class SSHMCPServer:
    """MCP Server for SSH operations"""
    
    def __init__(self):
        self.tools = [
            {
                "name": "ssh_exec",
                "description": "Execute a command on a remote server via SSH",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "host": {
                            "type": "string",
                            "description": "SSH host (e.g., user@hostname or IP)"
                        },
                        "command": {
                            "type": "string",
                            "description": "Command to execute on remote server"
                        },
                        "port": {
                            "type": "integer",
                            "description": "SSH port (default: 22)",
                            "default": 22
                        },
                        "identity_file": {
                            "type": "string",
                            "description": "Path to SSH private key file (optional)"
                        }
                    },
                    "required": ["host", "command"]
                }
            },
            {
                "name": "ssh_upload",
                "description": "Upload a file to remote server via SCP",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "host": {
                            "type": "string",
                            "description": "SSH host (e.g., user@hostname)"
                        },
                        "local_path": {
                            "type": "string",
                            "description": "Local file path to upload"
                        },
                        "remote_path": {
                            "type": "string",
                            "description": "Remote destination path"
                        },
                        "port": {
                            "type": "integer",
                            "description": "SSH port (default: 22)",
                            "default": 22
                        },
                        "identity_file": {
                            "type": "string",
                            "description": "Path to SSH private key file (optional)"
                        }
                    },
                    "required": ["host", "local_path", "remote_path"]
                }
            },
            {
                "name": "ssh_download",
                "description": "Download a file from remote server via SCP",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "host": {
                            "type": "string",
                            "description": "SSH host (e.g., user@hostname)"
                        },
                        "remote_path": {
                            "type": "string",
                            "description": "Remote file path to download"
                        },
                        "local_path": {
                            "type": "string",
                            "description": "Local destination path"
                        },
                        "port": {
                            "type": "integer",
                            "description": "SSH port (default: 22)",
                            "default": 22
                        },
                        "identity_file": {
                            "type": "string",
                            "description": "Path to SSH private key file (optional)"
                        }
                    },
                    "required": ["host", "remote_path", "local_path"]
                }
            },
            {
                "name": "ssh_list_files",
                "description": "List files in a directory on remote server",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "host": {
                            "type": "string",
                            "description": "SSH host (e.g., user@hostname)"
                        },
                        "path": {
                            "type": "string",
                            "description": "Remote directory path to list",
                            "default": "."
                        },
                        "port": {
                            "type": "integer",
                            "description": "SSH port (default: 22)",
                            "default": 22
                        },
                        "identity_file": {
                            "type": "string",
                            "description": "Path to SSH private key file (optional)"
                        }
                    },
                    "required": ["host"]
                }
            },
            {
                "name": "ssh_test_connection",
                "description": "Test SSH connection to a remote server",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "host": {
                            "type": "string",
                            "description": "SSH host (e.g., user@hostname)"
                        },
                        "port": {
                            "type": "integer",
                            "description": "SSH port (default: 22)",
                            "default": 22
                        },
                        "identity_file": {
                            "type": "string",
                            "description": "Path to SSH private key file (optional)"
                        }
                    },
                    "required": ["host"]
                }
            }
        ]
    
    def build_ssh_args(self, host: str, port: int = 22, identity_file: Optional[str] = None) -> List[str]:
        """Build SSH command arguments"""
        args = ["ssh"]
        
        if port != 22:
            args.extend(["-p", str(port)])
        
        if identity_file:
            args.extend(["-i", identity_file])
        
        # Add common SSH options
        args.extend([
            "-o", "StrictHostKeyChecking=no",
            "-o", "UserKnownHostsFile=/dev/null",
            "-o", "ConnectTimeout=10"
        ])
        
        args.append(host)
        
        return args
    
    async def run_command(self, cmd: List[str], timeout: int = 60) -> Dict[str, Any]:
        """Run a command and return results"""
        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=timeout
            )
            
            return {
                "stdout": result.stdout,
                "stderr": result.stderr,
                "returncode": result.returncode,
                "success": result.returncode == 0
            }
        except subprocess.TimeoutExpired:
            return {
                "stdout": "",
                "stderr": f"Command timed out after {timeout} seconds",
                "returncode": -1,
                "success": False
            }
        except Exception as e:
            return {
                "stdout": "",
                "stderr": f"Error running command: {str(e)}",
                "returncode": -1,
                "success": False
            }
    
    async def handle_ssh_exec(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """Execute command on remote server"""
        ssh_args = self.build_ssh_args(
            args["host"],
            args.get("port", 22),
            args.get("identity_file")
        )
        ssh_args.append(args["command"])
        
        result = await self.run_command(ssh_args)
        
        return {
            "content": [{
                "type": "text",
                "text": f"SSH Command Execution:\n\nHost: {args['host']}\nCommand: {args['command']}\n\nExit Code: {result['returncode']}\n\nOutput:\n{result['stdout']}\n\nErrors:\n{result['stderr']}"
            }]
        }
    
    async def handle_ssh_upload(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """Upload file to remote server"""
        scp_args = ["scp"]
        
        port = args.get("port", 22)
        if port != 22:
            scp_args.extend(["-P", str(port)])
        
        if args.get("identity_file"):
            scp_args.extend(["-i", args["identity_file"]])
        
        scp_args.extend([
            "-o", "StrictHostKeyChecking=no",
            "-o", "UserKnownHostsFile=/dev/null"
        ])
        
        scp_args.append(args["local_path"])
        scp_args.append(f"{args['host']}:{args['remote_path']}")
        
        result = await self.run_command(scp_args)
        
        return {
            "content": [{
                "type": "text",
                "text": f"SCP Upload:\n\nLocal: {args['local_path']}\nRemote: {args['host']}:{args['remote_path']}\n\nExit Code: {result['returncode']}\n\nOutput:\n{result['stdout']}\n\nErrors:\n{result['stderr']}"
            }]
        }
    
    async def handle_ssh_download(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """Download file from remote server"""
        scp_args = ["scp"]
        
        port = args.get("port", 22)
        if port != 22:
            scp_args.extend(["-P", str(port)])
        
        if args.get("identity_file"):
            scp_args.extend(["-i", args["identity_file"]])
        
        scp_args.extend([
            "-o", "StrictHostKeyChecking=no",
            "-o", "UserKnownHostsFile=/dev/null"
        ])
        
        scp_args.append(f"{args['host']}:{args['remote_path']}")
        scp_args.append(args["local_path"])
        
        result = await self.run_command(scp_args)
        
        return {
            "content": [{
                "type": "text",
                "text": f"SCP Download:\n\nRemote: {args['host']}:{args['remote_path']}\nLocal: {args['local_path']}\n\nExit Code: {result['returncode']}\n\nOutput:\n{result['stdout']}\n\nErrors:\n{result['stderr']}"
            }]
        }
    
    async def handle_ssh_list_files(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """List files on remote server"""
        path = args.get("path", ".")
        command = f"ls -lah {path}"
        
        ssh_args = self.build_ssh_args(
            args["host"],
            args.get("port", 22),
            args.get("identity_file")
        )
        ssh_args.append(command)
        
        result = await self.run_command(ssh_args)
        
        return {
            "content": [{
                "type": "text",
                "text": f"Remote Directory Listing:\n\nHost: {args['host']}\nPath: {path}\n\nExit Code: {result['returncode']}\n\nFiles:\n{result['stdout']}\n\nErrors:\n{result['stderr']}"
            }]
        }
    
    async def handle_ssh_test_connection(self, args: Dict[str, Any]) -> Dict[str, Any]:
        """Test SSH connection"""
        ssh_args = self.build_ssh_args(
            args["host"],
            args.get("port", 22),
            args.get("identity_file")
        )
        ssh_args.append("echo 'Connection successful'")
        
        result = await self.run_command(ssh_args, timeout=10)
        
        status = "✅ Connected" if result["success"] else "❌ Connection failed"
        
        return {
            "content": [{
                "type": "text",
                "text": f"SSH Connection Test:\n\nHost: {args['host']}\nPort: {args.get('port', 22)}\n\nStatus: {status}\n\nOutput:\n{result['stdout']}\n\nErrors:\n{result['stderr']}"
            }]
        }
    
    async def handle_request(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Handle incoming MCP requests"""
        method = request.get("method")
        params = request.get("params", {})
        request_id = request.get("id")
        
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
        
        elif method == "tools/list":
            return {
                "jsonrpc": "2.0",
                "id": request_id,
                "result": {"tools": self.tools}
            }
        
        elif method == "tools/call":
            tool_name = params.get("name")
            tool_args = params.get("arguments", {})
            
            try:
                if tool_name == "ssh_exec":
                    result = await self.handle_ssh_exec(tool_args)
                elif tool_name == "ssh_upload":
                    result = await self.handle_ssh_upload(tool_args)
                elif tool_name == "ssh_download":
                    result = await self.handle_ssh_download(tool_args)
                elif tool_name == "ssh_list_files":
                    result = await self.handle_ssh_list_files(tool_args)
                elif tool_name == "ssh_test_connection":
                    result = await self.handle_ssh_test_connection(tool_args)
                else:
                    return {
                        "jsonrpc": "2.0",
                        "id": request_id,
                        "error": {
                            "code": -32601,
                            "message": f"Unknown tool: {tool_name}"
                        }
                    }
                
                return {
                    "jsonrpc": "2.0",
                    "id": request_id,
                    "result": result
                }
            except Exception as e:
                return {
                    "jsonrpc": "2.0",
                    "id": request_id,
                    "error": {
                        "code": -32603,
                        "message": f"Tool execution failed: {str(e)}"
                    }
                }
        
        else:
            return {
                "jsonrpc": "2.0",
                "id": request_id,
                "error": {
                    "code": -32601,
                    "message": f"Unknown method: {method}"
                }
            }
    
    async def run(self):
        """Run the MCP server"""
        print("SSH MCP Server starting...", file=sys.stderr)
        
        while True:
            try:
                line = input()
                if not line:
                    break
                
                request = json.loads(line)
                response = await self.handle_request(request)
                
                print(json.dumps(response))
                sys.stdout.flush()
                
            except EOFError:
                break
            except json.JSONDecodeError as e:
                error_response = {
                    "jsonrpc": "2.0",
                    "error": {
                        "code": -32700,
                        "message": f"Parse error: {str(e)}"
                    }
                }
                print(json.dumps(error_response))
                sys.stdout.flush()
            except Exception as e:
                error_response = {
                    "jsonrpc": "2.0",
                    "error": {
                        "code": -32603,
                        "message": f"Internal error: {str(e)}"
                    }
                }
                print(json.dumps(error_response))
                sys.stdout.flush()


if __name__ == "__main__":
    server = SSHMCPServer()
    asyncio.run(server.run())
