"""Unit tests for API Testing MCP Server."""

import pytest
from unittest.mock import Mock, AsyncMock, patch
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from api_testing_mcp import APITestingMCPServer


@pytest.mark.unit
class TestAPITestingMCPServer:
    """Test APITestingMCPServer class."""
    
    def test_server_initialization(self):
        """Test server initializes correctly."""
        server = APITestingMCPServer()
        
        assert server.name == "API Testing"
        assert len(server.tools) == 3
        assert server.client is None
    
    def test_tools_registered(self):
        """Test all tools are registered."""
        server = APITestingMCPServer()
        tool_names = [tool["name"] for tool in server.tools]
        
        assert "http_request" in tool_names
        assert "validate_response" in tool_names
        assert "test_batch" in tool_names
    
    def test_build_url_absolute(self):
        """Test URL building with absolute URL."""
        server = APITestingMCPServer()
        url = server._build_url("https://api.example.com/users")
        
        assert url == "https://api.example.com/users"
    
    def test_build_url_relative(self):
        """Test URL building with relative path."""
        server = APITestingMCPServer()
        server.base_url = "http://localhost:8000"
        url = server._build_url("/api/users")
        
        assert url == "http://localhost:8000/api/users"
    
    def test_apply_authentication_bearer(self):
        """Test Bearer token authentication."""
        server = APITestingMCPServer()
        headers = {}
        auth = {"type": "bearer", "value": "token123"}
        
        headers = server._apply_authentication(headers, auth)
        
        assert headers["Authorization"] == "Bearer token123"
    
    def test_apply_authentication_api_key(self):
        """Test API key authentication."""
        server = APITestingMCPServer()
        headers = {}
        auth = {"type": "api_key", "value": "key123"}
        
        headers = server._apply_authentication(headers, auth)
        
        assert headers["X-API-Key"] == "key123"
    
    def test_apply_authentication_basic(self):
        """Test Basic authentication."""
        server = APITestingMCPServer()
        headers = {}
        auth = {"type": "basic", "username": "user", "password": "pass"}
        
        headers = server._apply_authentication(headers, auth)
        
        assert "Authorization" in headers
        assert headers["Authorization"].startswith("Basic ")
    
    @pytest.mark.asyncio
    async def test_execute_request_get(self, mock_httpx_client):
        """Test GET request execution."""
        with patch('api_testing_mcp.httpx.AsyncClient', return_value=mock_httpx_client):
            server = APITestingMCPServer()
            server.client = mock_httpx_client
            
            result = await server.execute_request(
                method="GET",
                url="/api/users"
            )
            
            assert result["success"] is True
            assert result["status_code"] == 200
            assert "headers" in result
            assert "body" in result
            assert "time_ms" in result
    
    @pytest.mark.asyncio
    async def test_execute_request_post_with_body(self, mock_httpx_client):
        """Test POST request with JSON body."""
        with patch('api_testing_mcp.httpx.AsyncClient', return_value=mock_httpx_client):
            server = APITestingMCPServer()
            server.client = mock_httpx_client
            
            result = await server.execute_request(
                method="POST",
                url="/api/users",
                body={"name": "John Doe", "email": "john@example.com"}
            )
            
            assert result["success"] is True
            mock_httpx_client.request.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_execute_request_with_auth(self, mock_httpx_client):
        """Test request with authentication."""
        with patch('api_testing_mcp.httpx.AsyncClient', return_value=mock_httpx_client):
            server = APITestingMCPServer()
            server.client = mock_httpx_client
            
            result = await server.execute_request(
                method="GET",
                url="/api/protected",
                auth={"type": "bearer", "value": "token123"}
            )
            
            assert result["success"] is True
    
    @pytest.mark.asyncio
    async def test_execute_request_timeout(self, mock_httpx_client):
        """Test request timeout handling."""
        import httpx
        mock_httpx_client.request.side_effect = httpx.TimeoutException("Timeout")
        
        with patch('api_testing_mcp.httpx.AsyncClient', return_value=mock_httpx_client):
            server = APITestingMCPServer()
            server.client = mock_httpx_client
            
            result = await server.execute_request("GET", "/api/slow")
            
            assert result["success"] is False
            assert "timeout" in result["error"].lower()
    
    @pytest.mark.asyncio
    async def test_validate_response_success(self, sample_api_response, sample_json_schema):
        """Test successful response validation."""
        server = APITestingMCPServer()
        
        result = await server.validate_response(
            response=sample_api_response["data"],
            schema=sample_json_schema
        )
        
        assert result["success"] is True
        assert result["valid"] is True
        assert len(result["errors"]) == 0
    
    @pytest.mark.asyncio
    async def test_validate_response_failure(self, sample_json_schema):
        """Test response validation failure."""
        server = APITestingMCPServer()
        
        invalid_response = {"id": "not-a-number", "name": 123}  # Wrong types
        
        result = await server.validate_response(
            response=invalid_response,
            schema=sample_json_schema
        )
        
        assert result["success"] is True
        assert result["valid"] is False
        assert len(result["errors"]) > 0
    
    @pytest.mark.asyncio
    async def test_execute_batch_tests_all_pass(self, mock_httpx_client):
        """Test batch testing with all tests passing."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.headers = {}
        mock_response.json.return_value = {"status": "ok"}
        mock_httpx_client.request.return_value = mock_response
        
        with patch('api_testing_mcp.httpx.AsyncClient', return_value=mock_httpx_client):
            server = APITestingMCPServer()
            server.client = mock_httpx_client
            
            tests = [
                {
                    "name": "Get users",
                    "method": "GET",
                    "url": "/api/users",
                    "expected_status": 200
                },
                {
                    "name": "Get health",
                    "method": "GET",
                    "url": "/api/health",
                    "expected_status": 200
                }
            ]
            
            result = await server.execute_batch_tests(tests)
            
            assert result["success"] is True
            assert result["total"] == 2
            assert result["passed"] == 2
            assert result["failed"] == 0
    
    @pytest.mark.asyncio
    async def test_execute_batch_tests_some_fail(self, mock_httpx_client):
        """Test batch testing with some failures."""
        mock_response = Mock()
        mock_response.status_code = 404
        mock_response.headers = {}
        mock_response.json.return_value = {"error": "Not found"}
        mock_httpx_client.request.return_value = mock_response
        
        with patch('api_testing_mcp.httpx.AsyncClient', return_value=mock_httpx_client):
            server = APITestingMCPServer()
            server.client = mock_httpx_client
            
            tests = [
                {
                    "name": "Get nonexistent",
                    "method": "GET",
                    "url": "/api/nonexistent",
                    "expected_status": 200
                }
            ]
            
            result = await server.execute_batch_tests(tests)
            
            assert result["success"] is True
            assert result["total"] == 1
            assert result["failed"] == 1


@pytest.mark.unit
class TestAPITestingMCPTools:
    """Test individual MCP tools."""
    
    @pytest.mark.asyncio
    async def test_http_request_tool(self, mock_httpx_client):
        """Test http_request tool execution."""
        with patch('api_testing_mcp.httpx.AsyncClient', return_value=mock_httpx_client):
            server = APITestingMCPServer()
            server.client = mock_httpx_client
            
            result = await server._execute_tool("http_request", {
                "method": "GET",
                "url": "/api/health"
            })
            
            assert "success" in result
    
    @pytest.mark.asyncio
    async def test_validate_response_tool(self):
        """Test validate_response tool execution."""
        server = APITestingMCPServer()
        
        result = await server._execute_tool("validate_response", {
            "response": {"id": 1, "name": "Test"},
            "schema": {
                "type": "object",
                "properties": {
                    "id": {"type": "number"},
                    "name": {"type": "string"}
                }
            }
        })
        
        assert "success" in result
        assert "valid" in result
    
    @pytest.mark.asyncio
    async def test_test_batch_tool(self, mock_httpx_client):
        """Test test_batch tool execution."""
        with patch('api_testing_mcp.httpx.AsyncClient', return_value=mock_httpx_client):
            server = APITestingMCPServer()
            server.client = mock_httpx_client
            
            result = await server._execute_tool("test_batch", {
                "tests": [
                    {
                        "name": "Test 1",
                        "method": "GET",
                        "url": "/api/test"
                    }
                ]
            })
            
            assert "success" in result
            assert "total" in result
            assert "passed" in result
            assert "failed" in result
