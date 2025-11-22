"""Pytest configuration and fixtures for MCP server tests."""

import pytest
import asyncio
from typing import Generator, AsyncGenerator
from unittest.mock import Mock, MagicMock, AsyncMock
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))


@pytest.fixture(scope="session")
def event_loop() -> Generator:
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
def mock_postgresql_connection():
    """Mock PostgreSQL connection."""
    conn = AsyncMock()
    cursor = AsyncMock()
    cursor.__aenter__ = AsyncMock(return_value=cursor)
    cursor.__aexit__ = AsyncMock(return_value=None)
    cursor.execute = AsyncMock()
    cursor.fetchall = AsyncMock(return_value=[])
    cursor.fetchone = AsyncMock(return_value=None)
    cursor.description = []
    conn.cursor = MagicMock(return_value=cursor)
    conn.commit = AsyncMock()
    conn.closed = False
    return conn


@pytest.fixture
def mock_mongodb_client():
    """Mock MongoDB client."""
    client = Mock()
    db = Mock()
    collection = Mock()
    
    collection.find = Mock(return_value=[])
    collection.find_one = Mock(return_value=None)
    collection.count_documents = Mock(return_value=0)
    collection.list_indexes = Mock(return_value=[])
    
    db.__getitem__ = Mock(return_value=collection)
    db.list_collection_names = Mock(return_value=[])
    
    client.__getitem__ = Mock(return_value=db)
    client.admin.command = Mock(return_value={"ok": 1})
    client.close = Mock()
    
    return client


@pytest.fixture
async def mock_redis_client():
    """Mock Redis client."""
    client = AsyncMock()
    client.ping = AsyncMock(return_value=True)
    client.info = AsyncMock(return_value={
        "redis_version": "7.0.0",
        "used_memory_human": "1M",
        "connected_clients": 1
    })
    client.keys = AsyncMock(return_value=[])
    client.execute_command = AsyncMock(return_value="OK")
    client.close = AsyncMock()
    return client


@pytest.fixture
def mock_docker_client():
    """Mock Docker client."""
    client = Mock()
    
    # Mock container
    container = Mock()
    container.short_id = "abc123"
    container.name = "test-container"
    container.status = "running"
    container.image.tags = ["test:latest"]
    container.image.short_id = "sha256:abc"
    container.ports = {}
    container.logs = Mock(return_value=b"test logs")
    container.stats = Mock(return_value={
        'cpu_stats': {
            'cpu_usage': {'total_usage': 1000000},
            'system_cpu_usage': 1000000000,
            'online_cpus': 1
        },
        'precpu_stats': {
            'cpu_usage': {'total_usage': 900000},
            'system_cpu_usage': 900000000
        },
        'memory_stats': {
            'usage': 1024 * 1024 * 100,
            'limit': 1024 * 1024 * 1024
        },
        'networks': {}
    })
    container.exec_run = Mock(return_value=(0, (b"stdout", b"stderr")))
    
    # Mock containers list
    client.containers.list = Mock(return_value=[container])
    client.containers.get = Mock(return_value=container)
    client.ping = Mock(return_value=True)
    
    return client


@pytest.fixture
async def mock_httpx_client():
    """Mock httpx AsyncClient."""
    client = AsyncMock()
    
    # Mock response
    response = Mock()
    response.status_code = 200
    response.headers = {"content-type": "application/json"}
    response.text = '{"status": "ok"}'
    response.json = Mock(return_value={"status": "ok"})
    
    client.request = AsyncMock(return_value=response)
    client.aclose = AsyncMock()
    
    return client


@pytest.fixture
def sample_query_result():
    """Sample database query result."""
    return [
        {"id": 1, "name": "John Doe", "email": "john@example.com"},
        {"id": 2, "name": "Jane Smith", "email": "jane@example.com"}
    ]


@pytest.fixture
def sample_schema():
    """Sample database schema."""
    return {
        "columns": [
            {"name": "id", "type": "integer", "nullable": False},
            {"name": "name", "type": "varchar", "nullable": False},
            {"name": "email", "type": "varchar", "nullable": False}
        ],
        "indexes": [
            {"name": "users_pkey", "definition": "PRIMARY KEY (id)"},
            {"name": "users_email_idx", "definition": "INDEX ON email"}
        ]
    }


@pytest.fixture
def sample_container_stats():
    """Sample Docker container stats."""
    return {
        "cpu_percent": 2.5,
        "memory_mb": 256.0,
        "memory_percent": 25.0,
        "network_in_mb": 1.5,
        "network_out_mb": 0.8
    }


@pytest.fixture
def sample_api_response():
    """Sample API response."""
    return {
        "status": "success",
        "data": {
            "id": 123,
            "name": "Test User",
            "email": "test@example.com"
        }
    }


@pytest.fixture
def sample_json_schema():
    """Sample JSON schema for validation."""
    return {
        "type": "object",
        "properties": {
            "id": {"type": "number"},
            "name": {"type": "string"},
            "email": {"type": "string", "format": "email"}
        },
        "required": ["id", "name", "email"]
    }


# Test markers
def pytest_configure(config):
    """Register custom markers."""
    config.addinivalue_line("markers", "unit: Unit tests")
    config.addinivalue_line("markers", "integration: Integration tests")
    config.addinivalue_line("markers", "property: Property-based tests")
    config.addinivalue_line("markers", "slow: Slow running tests")
