"""Docker MCP Server for GiveMeJobs Platform.

Provides tools for managing Docker containers, viewing logs, and monitoring resources.
"""

import os
import sys
import json
import asyncio
from typing import Any, Dict, Optional, List
from datetime import datetime
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

import docker
from docker import DockerClient
from docker.errors import DockerException, NotFound, APIError

from base_server import MCPServer


class DockerMCPServer(MCPServer):
    """MCP Server for Docker container management."""

    def __init__(self):
        super().__init__("Docker")
        self.client: Optional[DockerClient] = None
        self.docker_host = os.getenv("DOCKER_HOST", "unix:///var/run/docker.sock")
        self._register_tools()

    def _register_tools(self):
        """Register all available tools."""
        self.add_tool({
            "name": "docker_ps",
            "description": "List Docker containers with status and resource usage",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "all": {
                        "type": "boolean",
                        "description": "Include stopped containers",
                        "default": False
                    },
                    "filters": {
                        "type": "object",
                        "description": "Filter containers (e.g., {'status': 'running'})",
                        "default": {}
                    }
                },
                "required": []
            }
        })

        self.add_tool({
            "name": "docker_logs",
            "description": "Retrieve and filter container logs",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "container": {
                        "type": "string",
                        "description": "Container name or ID"
                    },
                    "tail": {
                        "type": "number",
                        "description": "Number of lines to show from end",
                        "default": 100
                    },
                    "timestamps": {
                        "type": "boolean",
                        "description": "Include timestamps",
                        "default": True
                    },
                    "level": {
                        "type": "string",
                        "enum": ["all", "error", "warning", "info"],
                        "description": "Filter by log level",
                        "default": "all"
                    }
                },
                "required": ["container"]
            }
        })

        self.add_tool({
            "name": "docker_exec",
            "description": "Execute command in a running container",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "container": {
                        "type": "string",
                        "description": "Container name or ID"
                    },
                    "command": {
                        "type": "string",
                        "description": "Command to execute"
                    },
                    "timeout": {
                        "type": "number",
                        "description": "Command timeout in seconds",
                        "default": 60
                    }
                },
                "required": ["container", "command"]
            }
        })

        self.add_tool({
            "name": "docker_stats",
            "description": "Get container resource usage statistics",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "container": {
                        "type": "string",
                        "description": "Container name or ID"
                    }
                },
                "required": ["container"]
            }
        })

    def connect_docker(self) -> DockerClient:
        """Connect to Docker daemon."""
        if not self.client:
            try:
                self.client = docker.DockerClient(base_url=self.docker_host)
                # Test connection
                self.client.ping()
            except DockerException as e:
                raise ConnectionError(
                    f"Docker daemon connection failed. "
                    f"Make sure Docker is running and accessible. Error: {str(e)}"
                )
        return self.client

    async def list_containers(
        self, 
        all_containers: bool = False,
        filters: Dict = None
    ) -> Dict[str, Any]:
        """List Docker containers."""
        try:
            client = self.connect_docker()
            containers = client.containers.list(all=all_containers, filters=filters or {})
            
            container_list = []
            for container in containers:
                # Get container stats for resource usage
                try:
                    stats = container.stats(stream=False)
                    cpu_percent = self._calculate_cpu_percent(stats)
                    memory_mb = stats['memory_stats'].get('usage', 0) / (1024 * 1024)
                except Exception:
                    cpu_percent = 0.0
                    memory_mb = 0.0
                
                # Get port mappings
                ports = []
                if container.ports:
                    for container_port, host_bindings in container.ports.items():
                        if host_bindings:
                            for binding in host_bindings:
                                ports.append(f"{binding['HostPort']}:{container_port}")
                        else:
                            ports.append(container_port)
                
                container_list.append({
                    "id": container.short_id,
                    "name": container.name,
                    "image": container.image.tags[0] if container.image.tags else container.image.short_id,
                    "status": container.status,
                    "ports": ports,
                    "cpu_percent": round(cpu_percent, 2),
                    "memory_mb": round(memory_mb, 2)
                })
            
            return {
                "success": True,
                "containers": container_list,
                "total_count": len(container_list)
            }
        
        except Exception as e:
            return {
                "success": False,
                "error": self.safe_error_message(e, "Failed to list containers"),
                "troubleshooting": [
                    "Check if Docker daemon is running: docker info",
                    "Verify Docker socket permissions",
                    "Ensure DOCKER_HOST environment variable is correct"
                ]
            }

    def _calculate_cpu_percent(self, stats: Dict) -> float:
        """Calculate CPU usage percentage from stats."""
        try:
            cpu_delta = stats['cpu_stats']['cpu_usage']['total_usage'] - \
                       stats['precpu_stats']['cpu_usage']['total_usage']
            system_delta = stats['cpu_stats']['system_cpu_usage'] - \
                          stats['precpu_stats']['system_cpu_usage']
            
            if system_delta > 0 and cpu_delta > 0:
                cpu_count = stats['cpu_stats'].get('online_cpus', 1)
                return (cpu_delta / system_delta) * cpu_count * 100.0
            return 0.0
        except (KeyError, ZeroDivisionError):
            return 0.0

    async def get_logs(
        self,
        container_name: str,
        tail: int = 100,
        timestamps: bool = True,
        level: str = "all"
    ) -> Dict[str, Any]:
        """Retrieve container logs with filtering."""
        try:
            client = self.connect_docker()
            container = client.containers.get(container_name)
            
            logs = container.logs(
                tail=tail,
                timestamps=timestamps,
                stream=False
            ).decode('utf-8')
            
            # Filter by log level if specified
            if level != "all":
                filtered_logs = []
                level_keywords = {
                    "error": ["ERROR", "FATAL", "CRITICAL"],
                    "warning": ["WARN", "WARNING"],
                    "info": ["INFO"]
                }
                keywords = level_keywords.get(level, [])
                
                for line in logs.split('\n'):
                    if any(keyword in line.upper() for keyword in keywords):
                        filtered_logs.append(line)
                
                logs = '\n'.join(filtered_logs)
            
            return {
                "success": True,
                "logs": logs,
                "container": container_name,
                "line_count": len(logs.split('\n'))
            }
        
        except NotFound:
            return {
                "success": False,
                "error": f"Container '{container_name}' not found",
                "troubleshooting": [
                    "List containers with: docker ps -a",
                    "Check if container name is correct",
                    "Verify container is running"
                ]
            }
        except Exception as e:
            return {
                "success": False,
                "error": self.safe_error_message(e, "Failed to retrieve logs")
            }

    async def execute_command(
        self,
        container_name: str,
        command: str,
        timeout: int = 60
    ) -> Dict[str, Any]:
        """Execute command in container."""
        try:
            client = self.connect_docker()
            container = client.containers.get(container_name)
            
            # Parse command string into list
            cmd_parts = command.split()
            
            exit_code, output = container.exec_run(
                cmd_parts,
                demux=True
            )
            
            # Decode output
            stdout = output[0].decode('utf-8') if output[0] else ""
            stderr = output[1].decode('utf-8') if output[1] else ""
            
            return {
                "success": exit_code == 0,
                "exit_code": exit_code,
                "stdout": stdout,
                "stderr": stderr,
                "command": command,
                "container": container_name
            }
        
        except NotFound:
            return {
                "success": False,
                "error": f"Container '{container_name}' not found"
            }
        except Exception as e:
            return {
                "success": False,
                "error": self.safe_error_message(e, "Command execution failed")
            }

    async def get_stats(self, container_name: str) -> Dict[str, Any]:
        """Get container resource statistics."""
        try:
            client = self.connect_docker()
            container = client.containers.get(container_name)
            
            # Get stats (non-streaming)
            stats = container.stats(stream=False)
            
            # Calculate metrics
            cpu_percent = self._calculate_cpu_percent(stats)
            
            memory_usage = stats['memory_stats'].get('usage', 0)
            memory_limit = stats['memory_stats'].get('limit', 1)
            memory_mb = memory_usage / (1024 * 1024)
            memory_percent = (memory_usage / memory_limit * 100) if memory_limit > 0 else 0
            
            # Network stats
            networks = stats.get('networks', {})
            network_in_mb = sum(net.get('rx_bytes', 0) for net in networks.values()) / (1024 * 1024)
            network_out_mb = sum(net.get('tx_bytes', 0) for net in networks.values()) / (1024 * 1024)
            
            return {
                "success": True,
                "container": container_name,
                "stats": {
                    "cpu_percent": round(cpu_percent, 2),
                    "memory_mb": round(memory_mb, 2),
                    "memory_percent": round(memory_percent, 2),
                    "network_in_mb": round(network_in_mb, 2),
                    "network_out_mb": round(network_out_mb, 2)
                }
            }
        
        except NotFound:
            return {
                "success": False,
                "error": f"Container '{container_name}' not found"
            }
        except Exception as e:
            return {
                "success": False,
                "error": self.safe_error_message(e, "Failed to get container stats")
            }

    def handle_request(self, request: Dict[str, Any]) -> None:
        """Handle incoming MCP requests."""
        method = request.get("method")
        params = request.get("params", {})
        request_id = request.get("id")

        if method == "initialize":
            self.send_result(request_id, {
                "protocolVersion": "2024-11-05",
                "serverInfo": {
                    "name": "docker-mcp-server",
                    "version": "1.0.0"
                },
                "capabilities": {
                    "tools": {}
                }
            })
        
        elif method == "tools/list":
            self.send_result(request_id, {"tools": self.tools})
        
        elif method == "tools/call":
            tool_name = params.get("name")
            tool_params = params.get("arguments", {})
            
            # Execute tool asynchronously
            result = asyncio.run(self._execute_tool(tool_name, tool_params))
            self.send_result(request_id, result)
        
        else:
            self.send_error(request_id, -32601, f"Method not found: {method}")

    async def _execute_tool(self, tool_name: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a tool and return results."""
        try:
            if tool_name == "docker_ps":
                return await self.list_containers(
                    all_containers=params.get("all", False),
                    filters=params.get("filters", {})
                )
            
            elif tool_name == "docker_logs":
                return await self.get_logs(
                    container_name=params.get("container"),
                    tail=params.get("tail", 100),
                    timestamps=params.get("timestamps", True),
                    level=params.get("level", "all")
                )
            
            elif tool_name == "docker_exec":
                return await self.execute_command(
                    container_name=params.get("container"),
                    command=params.get("command"),
                    timeout=params.get("timeout", 60)
                )
            
            elif tool_name == "docker_stats":
                return await self.get_stats(
                    container_name=params.get("container")
                )
            
            else:
                return {
                    "success": False,
                    "error": f"Unknown tool: {tool_name}"
                }
        
        except Exception as e:
            return {
                "success": False,
                "error": self.safe_error_message(e, f"Tool execution failed: {tool_name}")
            }


def main():
    """Main entry point."""
    server = DockerMCPServer()
    server.run()


if __name__ == "__main__":
    main()
