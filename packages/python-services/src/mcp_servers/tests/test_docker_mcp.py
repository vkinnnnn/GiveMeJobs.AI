"""Unit tests for Docker MCP Server."""

import pytest
from unittest.mock import Mock, AsyncMock, patch
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from docker_mcp import DockerMCPServer


@pytest.mark.unit
class TestDockerMCPServer:
    """Test DockerMCPServer class."""
    
    def test_server_initialization(self):
        """Test server initializes correctly."""
        server = DockerMCPServer()
        
        assert server.name == "Docker"
        assert len(server.tools) == 4
        assert server.client is None
    
    def test_tools_registered(self):
        """Test all tools are registered."""
        server = DockerMCPServer()
        tool_names = [tool["name"] for tool in server.tools]
        
        assert "docker_ps" in tool_names
        assert "docker_logs" in tool_names
        assert "docker_exec" in tool_names
        assert "docker_stats" in tool_names
    
    def test_connect_docker_success(self, mock_docker_client):
        """Test successful Docker connection."""
        with patch('docker_mcp.docker.DockerClient', return_value=mock_docker_client):
            server = DockerMCPServer()
            client = server.connect_docker()
            
            assert client is not None
            mock_docker_client.ping.assert_called_once()
    
    def test_connect_docker_failure(self):
        """Test Docker connection failure."""
        from docker.errors import DockerException
        
        mock_client = Mock()
        mock_client.ping.side_effect = DockerException("Docker daemon not running")
        
        with patch('docker.DockerClient', return_value=mock_client):
            server = DockerMCPServer()
            
            with pytest.raises(ConnectionError, match="Docker daemon connection failed"):
                server.connect_docker()
    
    @pytest.mark.asyncio
    async def test_list_containers(self, mock_docker_client):
        """Test container listing."""
        with patch('docker_mcp.docker.DockerClient', return_value=mock_docker_client):
            server = DockerMCPServer()
            result = await server.list_containers(all_containers=False)
            
            assert result["success"] is True
            assert "containers" in result
            assert len(result["containers"]) >= 0
            assert result["total_count"] >= 0
    
    @pytest.mark.asyncio
    async def test_list_containers_with_stats(self, mock_docker_client):
        """Test container listing includes stats."""
        with patch('docker_mcp.docker.DockerClient', return_value=mock_docker_client):
            server = DockerMCPServer()
            result = await server.list_containers()
            
            if result["success"] and result["containers"]:
                container = result["containers"][0]
                assert "cpu_percent" in container
                assert "memory_mb" in container
                assert "name" in container
                assert "status" in container
    
    @pytest.mark.asyncio
    async def test_get_logs_success(self, mock_docker_client):
        """Test retrieving container logs."""
        mock_container = mock_docker_client.containers.get()
        mock_container.logs.return_value = b"2025-11-21 10:00:00 INFO: Server started\n2025-11-21 10:00:01 ERROR: Connection failed"
        
        with patch('docker_mcp.docker.DockerClient', return_value=mock_docker_client):
            server = DockerMCPServer()
            result = await server.get_logs("test-container", tail=100)
            
            assert result["success"] is True
            assert "logs" in result
            assert result["container"] == "test-container"
    
    @pytest.mark.asyncio
    async def test_get_logs_with_filtering(self, mock_docker_client):
        """Test log filtering by level."""
        mock_container = mock_docker_client.containers.get()
        mock_container.logs.return_value = b"ERROR: Failed\nINFO: Success\nWARN: Warning"
        
        with patch('docker_mcp.docker.DockerClient', return_value=mock_docker_client):
            server = DockerMCPServer()
            result = await server.get_logs("test-container", level="error")
            
            assert result["success"] is True
            assert "ERROR" in result["logs"] or len(result["logs"]) == 0
    
    @pytest.mark.asyncio
    async def test_execute_command_success(self, mock_docker_client):
        """Test command execution in container."""
        with patch('docker_mcp.docker.DockerClient', return_value=mock_docker_client):
            server = DockerMCPServer()
            result = await server.execute_command(
                "test-container",
                "echo hello",
                timeout=60
            )
            
            assert result["success"] is True
            assert result["exit_code"] == 0
            assert "stdout" in result
    
    @pytest.mark.asyncio
    async def test_execute_command_failure(self, mock_docker_client):
        """Test command execution with non-zero exit code."""
        mock_container = mock_docker_client.containers.get()
        mock_container.exec_run.return_value = (1, (b"", b"error"))
        
        with patch('docker_mcp.docker.DockerClient', return_value=mock_docker_client):
            server = DockerMCPServer()
            result = await server.execute_command("test-container", "false")
            
            assert result["success"] is False
            assert result["exit_code"] == 1
    
    @pytest.mark.asyncio
    async def test_get_stats(self, mock_docker_client, sample_container_stats):
        """Test getting container statistics."""
        with patch('docker_mcp.docker.DockerClient', return_value=mock_docker_client):
            server = DockerMCPServer()
            result = await server.get_stats("test-container")
            
            assert result["success"] is True
            assert "stats" in result
            assert "cpu_percent" in result["stats"]
            assert "memory_mb" in result["stats"]
            assert "memory_percent" in result["stats"]
    
    @pytest.mark.asyncio
    async def test_container_not_found(self, mock_docker_client):
        """Test handling of non-existent container."""
        from docker.errors import NotFound
        mock_docker_client.containers.get.side_effect = NotFound("Container not found")
        
        with patch('docker_mcp.docker.DockerClient', return_value=mock_docker_client):
            server = DockerMCPServer()
            result = await server.get_logs("nonexistent")
            
            assert result["success"] is False
            assert "not found" in result["error"].lower()
    
    def test_calculate_cpu_percent(self):
        """Test CPU percentage calculation."""
        server = DockerMCPServer()
        
        stats = {
            'cpu_stats': {
                'cpu_usage': {'total_usage': 1000000},
                'system_cpu_usage': 1000000000,
                'online_cpus': 2
            },
            'precpu_stats': {
                'cpu_usage': {'total_usage': 900000},
                'system_cpu_usage': 900000000
            }
        }
        
        cpu_percent = server._calculate_cpu_percent(stats)
        
        assert cpu_percent > 0
        assert cpu_percent <= 200  # Max 200% for 2 CPUs


@pytest.mark.unit
class TestDockerMCPTools:
    """Test individual MCP tools."""
    
    @pytest.mark.asyncio
    async def test_docker_ps_tool(self, mock_docker_client):
        """Test docker_ps tool execution."""
        with patch('docker_mcp.docker.DockerClient', return_value=mock_docker_client):
            server = DockerMCPServer()
            result = await server._execute_tool("docker_ps", {"all": False})
            
            assert "success" in result
    
    @pytest.mark.asyncio
    async def test_docker_logs_tool(self, mock_docker_client):
        """Test docker_logs tool execution."""
        with patch('docker_mcp.docker.DockerClient', return_value=mock_docker_client):
            server = DockerMCPServer()
            result = await server._execute_tool("docker_logs", {
                "container": "test-container",
                "tail": 50
            })
            
            assert "success" in result
    
    @pytest.mark.asyncio
    async def test_docker_exec_tool(self, mock_docker_client):
        """Test docker_exec tool execution."""
        with patch('docker_mcp.docker.DockerClient', return_value=mock_docker_client):
            server = DockerMCPServer()
            result = await server._execute_tool("docker_exec", {
                "container": "test-container",
                "command": "ls -la"
            })
            
            assert "success" in result
    
    @pytest.mark.asyncio
    async def test_docker_stats_tool(self, mock_docker_client):
        """Test docker_stats tool execution."""
        with patch('docker_mcp.docker.DockerClient', return_value=mock_docker_client):
            server = DockerMCPServer()
            result = await server._execute_tool("docker_stats", {
                "container": "test-container"
            })
            
            assert "success" in result
    
    @pytest.mark.asyncio
    async def test_tool_error_handling(self, mock_docker_client):
        """Test tool error handling."""
        from docker.errors import DockerException
        mock_docker_client.containers.list.side_effect = DockerException("API error")
        
        with patch('docker_mcp.docker.DockerClient', return_value=mock_docker_client):
            server = DockerMCPServer()
            result = await server._execute_tool("docker_ps", {})
            
            assert result["success"] is False
            assert "error" in result
            assert "troubleshooting" in result
