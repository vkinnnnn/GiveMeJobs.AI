"""Unit tests for Database MCP Server."""

import pytest
from unittest.mock import Mock, AsyncMock, patch, MagicMock
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from database_mcp import DatabaseMCPServer, DatabaseConnection


@pytest.mark.unit
class TestDatabaseConnection:
    """Test DatabaseConnection class."""
    
    @pytest.mark.asyncio
    async def test_connect_postgresql_success(self, mock_postgresql_connection):
        """Test successful PostgreSQL connection."""
        with patch('database_mcp.psycopg.AsyncConnection.connect', 
                   AsyncMock(return_value=mock_postgresql_connection)):
            conn_manager = DatabaseConnection()
            conn = await conn_manager.connect_postgresql()
            
            assert conn is not None
            assert not conn.closed
    
    @pytest.mark.asyncio
    async def test_connect_postgresql_failure(self):
        """Test PostgreSQL connection failure."""
        with patch('database_mcp.psycopg.AsyncConnection.connect', 
                   AsyncMock(side_effect=Exception("Connection failed"))):
            conn_manager = DatabaseConnection()
            
            with pytest.raises(ConnectionError, match="PostgreSQL connection failed"):
                await conn_manager.connect_postgresql()
    
    def test_connect_mongodb_success(self, mock_mongodb_client):
        """Test successful MongoDB connection."""
        with patch('database_mcp.MongoClient', return_value=mock_mongodb_client):
            conn_manager = DatabaseConnection()
            client = conn_manager.connect_mongodb()
            
            assert client is not None
            mock_mongodb_client.admin.command.assert_called_once_with('ping')
    
    def test_connect_mongodb_failure(self):
        """Test MongoDB connection failure."""
        mock_client = Mock()
        mock_client.admin.command.side_effect = Exception("Connection failed")
        
        with patch('database_mcp.MongoClient', return_value=mock_client):
            conn_manager = DatabaseConnection()
            
            with pytest.raises(ConnectionError, match="MongoDB connection failed"):
                conn_manager.connect_mongodb()
    
    @pytest.mark.asyncio
    async def test_connect_redis_success(self, mock_redis_client):
        """Test successful Redis connection."""
        with patch('database_mcp.redis.from_url', AsyncMock(return_value=mock_redis_client)):
            conn_manager = DatabaseConnection()
            client = await conn_manager.connect_redis()
            
            assert client is not None
            mock_redis_client.ping.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_close_all_connections(self, mock_postgresql_connection, 
                                        mock_mongodb_client, mock_redis_client):
        """Test closing all connections."""
        conn_manager = DatabaseConnection()
        conn_manager.pg_conn = mock_postgresql_connection
        conn_manager.mongo_client = mock_mongodb_client
        conn_manager.redis_client = mock_redis_client
        
        await conn_manager.close_all()
        
        mock_postgresql_connection.close.assert_called_once()
        mock_mongodb_client.close.assert_called_once()
        mock_redis_client.close.assert_called_once()


@pytest.mark.unit
class TestDatabaseMCPServer:
    """Test DatabaseMCPServer class."""
    
    def test_server_initialization(self):
        """Test server initializes correctly."""
        server = DatabaseMCPServer()
        
        assert server.name == "Database"
        assert len(server.tools) == 4
        assert server.db is not None
    
    def test_tools_registered(self):
        """Test all tools are registered."""
        server = DatabaseMCPServer()
        tool_names = [tool["name"] for tool in server.tools]
        
        assert "db_query" in tool_names
        assert "db_schema" in tool_names
        assert "db_migrate" in tool_names
        assert "db_analyze" in tool_names
    
    @pytest.mark.asyncio
    async def test_execute_postgresql_query(self, mock_postgresql_connection, 
                                           sample_query_result):
        """Test PostgreSQL query execution."""
        mock_postgresql_connection.cursor().fetchall = AsyncMock(
            return_value=sample_query_result
        )
        mock_postgresql_connection.cursor().description = [
            ("id",), ("name",), ("email",)
        ]
        
        server = DatabaseMCPServer()
        server.db.pg_conn = mock_postgresql_connection
        
        result = await server._execute_postgresql(
            "SELECT * FROM users",
            [],
            30
        )
        
        assert result["success"] is True
        assert len(result["rows"]) == 2
        assert result["columns"] == ["id", "name", "email"]
        assert "execution_time_ms" in result
    
    @pytest.mark.asyncio
    async def test_execute_mongodb_query(self, mock_mongodb_client):
        """Test MongoDB query execution."""
        mock_collection = mock_mongodb_client["test"]["users"]
        mock_collection.find.return_value = [
            {"_id": "123", "name": "John"},
            {"_id": "456", "name": "Jane"}
        ]
        
        server = DatabaseMCPServer()
        server.db.mongo_client = mock_mongodb_client
        server.db.mongodb_url = "mongodb://localhost/test"
        
        result = await server._execute_mongodb(
            '{"status": "active"}',
            "users"
        )
        
        assert result["success"] is True
        assert result["row_count"] == 2
        assert "execution_time_ms" in result
    
    @pytest.mark.asyncio
    async def test_execute_redis_command(self, mock_redis_client):
        """Test Redis command execution."""
        mock_redis_client.execute_command = AsyncMock(return_value=b"value123")
        
        server = DatabaseMCPServer()
        server.db.redis_client = mock_redis_client
        
        result = await server._execute_redis("GET key123")
        
        assert result["success"] is True
        assert "value123" in result["result"]
        assert "execution_time_ms" in result
    
    @pytest.mark.asyncio
    async def test_get_postgresql_schema(self, mock_postgresql_connection):
        """Test PostgreSQL schema retrieval."""
        mock_cursor = mock_postgresql_connection.cursor()
        mock_cursor.fetchall = AsyncMock(return_value=[
            {"column_name": "id", "data_type": "integer"},
            {"column_name": "name", "data_type": "varchar"}
        ])
        
        server = DatabaseMCPServer()
        server.db.pg_conn = mock_postgresql_connection
        
        result = await server._get_postgresql_schema("users")
        
        assert result["success"] is True
        assert "columns" in result
        assert "indexes" in result
    
    @pytest.mark.asyncio
    async def test_query_error_handling(self):
        """Test error handling in query execution."""
        server = DatabaseMCPServer()
        
        result = await server.execute_query(
            database="invalid_db",
            query="SELECT 1"
        )
        
        assert result["success"] is False
        assert "error" in result
    
    @pytest.mark.asyncio
    async def test_safe_error_message(self):
        """Test that error messages don't expose credentials."""
        server = DatabaseMCPServer()
        
        # Simulate error with sensitive data
        error = Exception("Connection failed: password=secret123 key=abc")
        safe_msg = server.safe_error_message(error, "Database")
        
        assert "password=" not in safe_msg
        assert "secret123" not in safe_msg
        assert "[REDACTED]" in safe_msg


@pytest.mark.unit
class TestDatabaseMCPTools:
    """Test individual MCP tools."""
    
    @pytest.mark.asyncio
    async def test_db_query_tool(self, mock_postgresql_connection):
        """Test db_query tool execution."""
        server = DatabaseMCPServer()
        server.db.pg_conn = mock_postgresql_connection
        
        result = await server._execute_tool("db_query", {
            "database": "postgresql",
            "query": "SELECT 1",
            "params": []
        })
        
        assert "success" in result
    
    @pytest.mark.asyncio
    async def test_db_schema_tool(self, mock_postgresql_connection):
        """Test db_schema tool execution."""
        server = DatabaseMCPServer()
        server.db.pg_conn = mock_postgresql_connection
        
        result = await server._execute_tool("db_schema", {
            "database": "postgresql"
        })
        
        assert "success" in result
    
    @pytest.mark.asyncio
    async def test_db_migrate_tool(self):
        """Test db_migrate tool execution."""
        server = DatabaseMCPServer()
        
        with patch('subprocess.run') as mock_run:
            mock_run.return_value = Mock(returncode=0, stdout="Success")
            
            result = await server._execute_tool("db_migrate", {
                "migration_name": "test_migration",
                "direction": "up"
            })
            
            assert "success" in result
    
    @pytest.mark.asyncio
    async def test_db_analyze_tool(self, mock_postgresql_connection):
        """Test db_analyze tool execution."""
        server = DatabaseMCPServer()
        server.db.pg_conn = mock_postgresql_connection
        
        result = await server._execute_tool("db_analyze", {
            "database": "postgresql",
            "query": "SELECT * FROM users",
            "params": []
        })
        
        assert "success" in result
