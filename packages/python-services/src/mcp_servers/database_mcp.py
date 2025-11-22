"""Database MCP Server for GiveMeJobs Platform.

Provides tools for querying and managing PostgreSQL, MongoDB, and Redis databases.
"""

import os
import sys
import json
import asyncio
from typing import Any, Dict, Optional, List
from datetime import datetime
from contextlib import asynccontextmanager
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

import psycopg
from psycopg import AsyncConnection
from psycopg.rows import dict_row
import pymongo
from pymongo import MongoClient
import redis.asyncio as redis
from redis.asyncio import Redis

from base_server import MCPServer


class DatabaseConnection:
    """Manages database connections with connection pooling."""

    def __init__(self):
        self.pg_conn: Optional[AsyncConnection] = None
        self.mongo_client: Optional[MongoClient] = None
        self.redis_client: Optional[Redis] = None
        
        self.database_url = os.getenv("DATABASE_URL", "")
        self.mongodb_url = os.getenv("MONGODB_URL", "")
        self.redis_url = os.getenv("REDIS_URL", "")

    async def connect_postgresql(self) -> AsyncConnection:
        """Establish PostgreSQL connection."""
        if not self.pg_conn or self.pg_conn.closed:
            try:
                self.pg_conn = await psycopg.AsyncConnection.connect(
                    self.database_url,
                    row_factory=dict_row
                )
            except Exception as e:
                raise ConnectionError(f"PostgreSQL connection failed: {str(e)}")
        return self.pg_conn

    def connect_mongodb(self) -> MongoClient:
        """Establish MongoDB connection."""
        if not self.mongo_client:
            try:
                self.mongo_client = MongoClient(self.mongodb_url)
                # Test connection
                self.mongo_client.admin.command('ping')
            except Exception as e:
                raise ConnectionError(f"MongoDB connection failed: {str(e)}")
        return self.mongo_client

    async def connect_redis(self) -> Redis:
        """Establish Redis connection."""
        if not self.redis_client:
            try:
                self.redis_client = await redis.from_url(self.redis_url)
                # Test connection
                await self.redis_client.ping()
            except Exception as e:
                raise ConnectionError(f"Redis connection failed: {str(e)}")
        return self.redis_client

    async def close_all(self):
        """Close all database connections."""
        if self.pg_conn and not self.pg_conn.closed:
            await self.pg_conn.close()
        if self.mongo_client:
            self.mongo_client.close()
        if self.redis_client:
            await self.redis_client.close()


class DatabaseMCPServer(MCPServer):
    """MCP Server for database operations."""

    def __init__(self):
        super().__init__("Database")
        self.db = DatabaseConnection()
        self._register_tools()

    def _register_tools(self):
        """Register all available tools."""
        self.add_tool({
            "name": "db_query",
            "description": "Execute SQL/NoSQL queries against PostgreSQL, MongoDB, or Redis",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "database": {
                        "type": "string",
                        "enum": ["postgresql", "mongodb", "redis"],
                        "description": "Target database"
                    },
                    "query": {
                        "type": "string",
                        "description": "Query to execute"
                    },
                    "params": {
                        "type": "array",
                        "description": "Query parameters (for PostgreSQL)",
                        "default": []
                    },
                    "collection": {
                        "type": "string",
                        "description": "MongoDB collection name (for MongoDB queries)"
                    },
                    "timeout": {
                        "type": "number",
                        "description": "Query timeout in seconds",
                        "default": 30
                    }
                },
                "required": ["database", "query"]
            }
        })

        self.add_tool({
            "name": "db_schema",
            "description": "Inspect database schema for tables, collections, or keys",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "database": {
                        "type": "string",
                        "enum": ["postgresql", "mongodb", "redis"],
                        "description": "Target database"
                    },
                    "table_or_collection": {
                        "type": "string",
                        "description": "Table or collection name to inspect"
                    }
                },
                "required": ["database"]
            }
        })

        self.add_tool({
            "name": "db_migrate",
            "description": "Run database migrations",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "migration_name": {
                        "type": "string",
                        "description": "Migration name or version"
                    },
                    "direction": {
                        "type": "string",
                        "enum": ["up", "down"],
                        "description": "Migration direction",
                        "default": "up"
                    }
                },
                "required": ["migration_name"]
            }
        })

        self.add_tool({
            "name": "db_analyze",
            "description": "Analyze query performance and execution plan",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "database": {
                        "type": "string",
                        "enum": ["postgresql", "mongodb"],
                        "description": "Target database"
                    },
                    "query": {
                        "type": "string",
                        "description": "Query to analyze"
                    },
                    "params": {
                        "type": "array",
                        "description": "Query parameters",
                        "default": []
                    }
                },
                "required": ["database", "query"]
            }
        })

    async def execute_query(
        self, 
        database: str, 
        query: str, 
        params: List = None,
        collection: str = None,
        timeout: int = 30
    ) -> Dict[str, Any]:
        """Execute a query against the specified database."""
        start_time = datetime.now()
        
        try:
            if database == "postgresql":
                return await self._execute_postgresql(query, params or [], timeout)
            elif database == "mongodb":
                return await self._execute_mongodb(query, collection)
            elif database == "redis":
                return await self._execute_redis(query)
            else:
                return {
                    "success": False,
                    "error": f"Unsupported database: {database}"
                }
        except Exception as e:
            end_time = datetime.now()
            return {
                "success": False,
                "error": self.safe_error_message(e, "Query execution failed"),
                "execution_time_ms": self.format_execution_time(start_time, end_time)
            }

    async def _execute_postgresql(
        self, 
        query: str, 
        params: List, 
        timeout: int
    ) -> Dict[str, Any]:
        """Execute PostgreSQL query."""
        start_time = datetime.now()
        
        try:
            conn = await self.db.connect_postgresql()
            async with conn.cursor() as cur:
                await cur.execute(query, params)
                
                # Check if query returns results
                if cur.description:
                    rows = await cur.fetchall()
                    columns = [desc[0] for desc in cur.description]
                else:
                    rows = []
                    columns = []
                
                await conn.commit()
                
                end_time = datetime.now()
                return {
                    "success": True,
                    "rows": rows,
                    "columns": columns,
                    "row_count": len(rows),
                    "execution_time_ms": self.format_execution_time(start_time, end_time)
                }
        except Exception as e:
            end_time = datetime.now()
            raise Exception(f"PostgreSQL query failed: {str(e)}")

    async def _execute_mongodb(self, query: str, collection: str) -> Dict[str, Any]:
        """Execute MongoDB query."""
        start_time = datetime.now()
        
        if not collection:
            return {
                "success": False,
                "error": "Collection name required for MongoDB queries"
            }
        
        try:
            client = self.db.connect_mongodb()
            db_name = self.db.mongodb_url.split('/')[-1] or "test"
            db = client[db_name]
            coll = db[collection]
            
            # Parse query as JSON
            query_dict = json.loads(query)
            results = list(coll.find(query_dict))
            
            # Convert ObjectId to string for JSON serialization
            for doc in results:
                if "_id" in doc:
                    doc["_id"] = str(doc["_id"])
            
            end_time = datetime.now()
            return {
                "success": True,
                "rows": results,
                "row_count": len(results),
                "execution_time_ms": self.format_execution_time(start_time, end_time)
            }
        except Exception as e:
            end_time = datetime.now()
            raise Exception(f"MongoDB query failed: {str(e)}")

    async def _execute_redis(self, command: str) -> Dict[str, Any]:
        """Execute Redis command."""
        start_time = datetime.now()
        
        try:
            client = await self.db.connect_redis()
            parts = command.split()
            cmd = parts[0].upper()
            args = parts[1:]
            
            # Execute Redis command
            result = await client.execute_command(cmd, *args)
            
            end_time = datetime.now()
            return {
                "success": True,
                "result": str(result),
                "execution_time_ms": self.format_execution_time(start_time, end_time)
            }
        except Exception as e:
            end_time = datetime.now()
            raise Exception(f"Redis command failed: {str(e)}")

    async def get_schema(
        self, 
        database: str, 
        table_or_collection: str = None
    ) -> Dict[str, Any]:
        """Get schema information for the specified database object."""
        try:
            if database == "postgresql":
                return await self._get_postgresql_schema(table_or_collection)
            elif database == "mongodb":
                return await self._get_mongodb_schema(table_or_collection)
            elif database == "redis":
                return await self._get_redis_info()
            else:
                return {
                    "success": False,
                    "error": f"Unsupported database: {database}"
                }
        except Exception as e:
            return {
                "success": False,
                "error": self.safe_error_message(e, "Schema inspection failed")
            }

    async def _get_postgresql_schema(self, table_name: str = None) -> Dict[str, Any]:
        """Get PostgreSQL schema information."""
        try:
            conn = await self.db.connect_postgresql()
            
            if table_name:
                # Get specific table schema
                query = """
                    SELECT 
                        column_name, 
                        data_type, 
                        is_nullable, 
                        column_default
                    FROM information_schema.columns
                    WHERE table_name = %s
                    ORDER BY ordinal_position
                """
                async with conn.cursor() as cur:
                    await cur.execute(query, [table_name])
                    columns = await cur.fetchall()
                
                # Get indexes
                index_query = """
                    SELECT indexname, indexdef
                    FROM pg_indexes
                    WHERE tablename = %s
                """
                async with conn.cursor() as cur:
                    await cur.execute(index_query, [table_name])
                    indexes = await cur.fetchall()
                
                return {
                    "success": True,
                    "table": table_name,
                    "columns": columns,
                    "indexes": indexes
                }
            else:
                # List all tables
                query = """
                    SELECT table_name
                    FROM information_schema.tables
                    WHERE table_schema = 'public'
                    ORDER BY table_name
                """
                async with conn.cursor() as cur:
                    await cur.execute(query)
                    tables = await cur.fetchall()
                
                return {
                    "success": True,
                    "tables": [t["table_name"] for t in tables]
                }
        except Exception as e:
            raise Exception(f"PostgreSQL schema inspection failed: {str(e)}")

    async def _get_mongodb_schema(self, collection_name: str = None) -> Dict[str, Any]:
        """Get MongoDB schema information."""
        try:
            client = self.db.connect_mongodb()
            db_name = self.db.mongodb_url.split('/')[-1] or "test"
            db = client[db_name]
            
            if collection_name:
                # Get collection info and sample document structure
                coll = db[collection_name]
                sample = coll.find_one()
                indexes = list(coll.list_indexes())
                
                # Convert sample to show schema
                schema = {}
                if sample:
                    for key, value in sample.items():
                        schema[key] = type(value).__name__
                
                return {
                    "success": True,
                    "collection": collection_name,
                    "sample_schema": schema,
                    "indexes": indexes,
                    "document_count": coll.count_documents({})
                }
            else:
                # List all collections
                collections = db.list_collection_names()
                return {
                    "success": True,
                    "collections": collections
                }
        except Exception as e:
            raise Exception(f"MongoDB schema inspection failed: {str(e)}")

    async def _get_redis_info(self) -> Dict[str, Any]:
        """Get Redis information."""
        try:
            client = await self.db.connect_redis()
            info = await client.info()
            
            # Get key count by pattern
            keys = await client.keys("*")
            
            return {
                "success": True,
                "info": {
                    "version": info.get("redis_version"),
                    "used_memory": info.get("used_memory_human"),
                    "connected_clients": info.get("connected_clients"),
                    "total_keys": len(keys)
                }
            }
        except Exception as e:
            raise Exception(f"Redis info retrieval failed: {str(e)}")

    def handle_request(self, request: Dict[str, Any]) -> None:
        """Handle incoming MCP requests."""
        method = request.get("method")
        params = request.get("params", {})
        request_id = request.get("id")

        if method == "initialize":
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

    async def run_migration(
        self,
        migration_name: str,
        direction: str = "up"
    ) -> Dict[str, Any]:
        """Run database migrations using Alembic."""
        try:
            import subprocess
            
            # Run Alembic migration
            cmd = ["alembic"]
            if direction == "up":
                cmd.extend(["upgrade", migration_name])
            else:
                cmd.extend(["downgrade", migration_name])
            
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=60
            )
            
            if result.returncode == 0:
                return {
                    "success": True,
                    "message": f"Migration '{migration_name}' {direction} completed successfully",
                    "output": result.stdout
                }
            else:
                return {
                    "success": False,
                    "error": f"Migration failed: {result.stderr}"
                }
        
        except subprocess.TimeoutExpired:
            return {
                "success": False,
                "error": "Migration timeout after 60 seconds"
            }
        except Exception as e:
            return {
                "success": False,
                "error": self.safe_error_message(e, "Migration execution failed")
            }

    async def analyze_query(
        self,
        database: str,
        query: str,
        params: List = None
    ) -> Dict[str, Any]:
        """Analyze query performance and execution plan."""
        start_time = datetime.now()
        
        try:
            if database == "postgresql":
                return await self._analyze_postgresql(query, params or [])
            elif database == "mongodb":
                return await self._analyze_mongodb(query)
            else:
                return {
                    "success": False,
                    "error": "Query analysis only supported for PostgreSQL and MongoDB"
                }
        except Exception as e:
            end_time = datetime.now()
            return {
                "success": False,
                "error": self.safe_error_message(e, "Query analysis failed"),
                "execution_time_ms": self.format_execution_time(start_time, end_time)
            }

    async def _analyze_postgresql(self, query: str, params: List) -> Dict[str, Any]:
        """Analyze PostgreSQL query with EXPLAIN ANALYZE."""
        start_time = datetime.now()
        
        try:
            conn = await self.db.connect_postgresql()
            
            # Execute EXPLAIN ANALYZE
            explain_query = f"EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) {query}"
            async with conn.cursor() as cur:
                await cur.execute(explain_query, params)
                result = await cur.fetchone()
                plan = result[0] if result else []
            
            # Also get row count estimation
            async with conn.cursor() as cur:
                await cur.execute(query, params)
                rows = await cur.fetchall()
                actual_rows = len(rows)
            
            end_time = datetime.now()
            
            # Extract metrics from execution plan
            execution_plan = plan[0] if plan else {}
            planning_time = execution_plan.get("Planning Time", 0)
            execution_time = execution_plan.get("Execution Time", 0)
            
            plan_info = execution_plan.get("Plan", {})
            rows_scanned = plan_info.get("Actual Rows", 0)
            
            return {
                "success": True,
                "execution_plan": json.dumps(plan, indent=2),
                "metrics": {
                    "planning_time_ms": planning_time,
                    "execution_time_ms": execution_time,
                    "rows_scanned": rows_scanned,
                    "rows_returned": actual_rows,
                    "total_time_ms": self.format_execution_time(start_time, end_time)
                }
            }
        except Exception as e:
            end_time = datetime.now()
            raise Exception(f"PostgreSQL query analysis failed: {str(e)}")

    async def _analyze_mongodb(self, query: str) -> Dict[str, Any]:
        """Analyze MongoDB query with explain."""
        start_time = datetime.now()
        
        try:
            client = self.db.connect_mongodb()
            db_name = self.db.mongodb_url.split('/')[-1] or "test"
            db = client[db_name]
            
            # Parse query to extract collection and filter
            query_dict = json.loads(query)
            collection_name = query_dict.get("collection")
            filter_query = query_dict.get("filter", {})
            
            if not collection_name:
                return {
                    "success": False,
                    "error": "Collection name required in query for analysis"
                }
            
            coll = db[collection_name]
            
            # Get explain plan
            explain_result = coll.find(filter_query).explain()
            
            # Execute query to get actual results
            results = list(coll.find(filter_query))
            
            end_time = datetime.now()
            
            # Extract metrics
            exec_stats = explain_result.get("executionStats", {})
            
            return {
                "success": True,
                "execution_plan": json.dumps(explain_result, indent=2, default=str),
                "metrics": {
                    "execution_time_ms": exec_stats.get("executionTimeMillis", 0),
                    "total_docs_examined": exec_stats.get("totalDocsExamined", 0),
                    "total_keys_examined": exec_stats.get("totalKeysExamined", 0),
                    "rows_returned": len(results),
                    "total_time_ms": self.format_execution_time(start_time, end_time)
                }
            }
        except Exception as e:
            end_time = datetime.now()
            raise Exception(f"MongoDB query analysis failed: {str(e)}")

    async def _execute_tool(self, tool_name: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a tool and return results."""
        try:
            if tool_name == "db_query":
                return await self.execute_query(
                    database=params.get("database"),
                    query=params.get("query"),
                    params=params.get("params", []),
                    collection=params.get("collection"),
                    timeout=params.get("timeout", 30)
                )
            
            elif tool_name == "db_schema":
                return await self.get_schema(
                    database=params.get("database"),
                    table_or_collection=params.get("table_or_collection")
                )
            
            elif tool_name == "db_migrate":
                return await self.run_migration(
                    migration_name=params.get("migration_name"),
                    direction=params.get("direction", "up")
                )
            
            elif tool_name == "db_analyze":
                return await self.analyze_query(
                    database=params.get("database"),
                    query=params.get("query"),
                    params=params.get("params", [])
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
    server = DatabaseMCPServer()
    try:
        server.run()
    finally:
        asyncio.run(server.db.close_all())


if __name__ == "__main__":
    main()
