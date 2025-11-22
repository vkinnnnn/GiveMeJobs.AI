"""API Testing MCP Server for GiveMeJobs Platform.

Provides tools for executing HTTP requests, validating responses, and running batch tests.
"""

import os
import sys
import json
import asyncio
import base64
from typing import Any, Dict, Optional, List
from datetime import datetime
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

import httpx
from jsonschema import validate as json_validate, ValidationError as JSONValidationError

from base_server import MCPServer


class APITestingMCPServer(MCPServer):
    """MCP Server for API testing and validation."""

    def __init__(self):
        super().__init__("API Testing")
        self.base_url = os.getenv("API_BASE_URL", "http://localhost:8000")
        self.api_key = os.getenv("API_KEY", "")
        self.client: Optional[httpx.AsyncClient] = None
        self._register_tools()

    def _register_tools(self):
        """Register all available tools."""
        self.add_tool({
            "name": "http_request",
            "description": "Execute HTTP request with authentication support",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "method": {
                        "type": "string",
                        "enum": ["GET", "POST", "PUT", "DELETE", "PATCH"],
                        "description": "HTTP method"
                    },
                    "url": {
                        "type": "string",
                        "description": "Full URL or path (relative to base URL)"
                    },
                    "headers": {
                        "type": "object",
                        "description": "Custom headers",
                        "default": {}
                    },
                    "body": {
                        "description": "Request body (JSON object or string)",
                        "default": None
                    },
                    "auth": {
                        "type": "object",
                        "description": "Authentication configuration",
                        "properties": {
                            "type": {
                                "type": "string",
                                "enum": ["bearer", "api_key", "basic"],
                                "description": "Authentication type"
                            },
                            "value": {
                                "type": "string",
                                "description": "Token/key/credentials"
                            },
                            "username": {
                                "type": "string",
                                "description": "Username for basic auth"
                            },
                            "password": {
                                "type": "string",
                                "description": "Password for basic auth"
                            }
                        }
                    },
                    "timeout": {
                        "type": "number",
                        "description": "Request timeout in seconds",
                        "default": 30
                    }
                },
                "required": ["method", "url"]
            }
        })

        self.add_tool({
            "name": "validate_response",
            "description": "Validate API response against JSON schema",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "response": {
                        "description": "Response body to validate"
                    },
                    "schema": {
                        "type": "object",
                        "description": "JSON schema for validation"
                    }
                },
                "required": ["response", "schema"]
            }
        })

        self.add_tool({
            "name": "test_batch",
            "description": "Execute multiple API tests in batch",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "tests": {
                        "type": "array",
                        "description": "Array of test definitions",
                        "items": {
                            "type": "object",
                            "properties": {
                                "name": {
                                    "type": "string",
                                    "description": "Test name"
                                },
                                "method": {
                                    "type": "string",
                                    "enum": ["GET", "POST", "PUT", "DELETE", "PATCH"]
                                },
                                "url": {
                                    "type": "string"
                                },
                                "body": {},
                                "expected_status": {
                                    "type": "number",
                                    "description": "Expected HTTP status code"
                                },
                                "schema": {
                                    "type": "object",
                                    "description": "Optional response schema"
                                }
                            },
                            "required": ["name", "method", "url"]
                        }
                    }
                },
                "required": ["tests"]
            }
        })

    async def get_client(self) -> httpx.AsyncClient:
        """Get or create async HTTP client."""
        if not self.client:
            self.client = httpx.AsyncClient(
                timeout=httpx.Timeout(30.0),
                follow_redirects=True
            )
        return self.client

    def _build_url(self, url: str) -> str:
        """Build full URL from relative path or use provided URL."""
        if url.startswith("http://") or url.startswith("https://"):
            return url
        # Remove leading slash if present to avoid double slashes
        path = url.lstrip("/")
        base = self.base_url.rstrip("/")
        return f"{base}/{path}"

    def _apply_authentication(
        self, 
        headers: Dict[str, str], 
        auth: Optional[Dict[str, Any]]
    ) -> Dict[str, str]:
        """Apply authentication to headers."""
        if not auth:
            return headers
        
        auth_type = auth.get("type", "").lower()
        
        if auth_type == "bearer":
            token = auth.get("value", "")
            headers["Authorization"] = f"Bearer {token}"
        
        elif auth_type == "api_key":
            api_key = auth.get("value", "")
            headers["X-API-Key"] = api_key
        
        elif auth_type == "basic":
            username = auth.get("username", "")
            password = auth.get("password", "")
            credentials = base64.b64encode(f"{username}:{password}".encode()).decode()
            headers["Authorization"] = f"Basic {credentials}"
        
        return headers

    async def execute_request(
        self,
        method: str,
        url: str,
        headers: Dict[str, str] = None,
        body: Any = None,
        auth: Dict[str, Any] = None,
        timeout: int = 30
    ) -> Dict[str, Any]:
        """Execute HTTP request."""
        start_time = datetime.now()
        
        try:
            client = await self.get_client()
            full_url = self._build_url(url)
            
            # Prepare headers
            req_headers = headers or {}
            req_headers = self._apply_authentication(req_headers, auth)
            
            # Set default content type for POST/PUT/PATCH
            if method.upper() in ["POST", "PUT", "PATCH"] and "Content-Type" not in req_headers:
                req_headers["Content-Type"] = "application/json"
            
            # Execute request
            response = await client.request(
                method=method.upper(),
                url=full_url,
                headers=req_headers,
                json=body if isinstance(body, (dict, list)) else None,
                content=body if isinstance(body, (str, bytes)) else None,
                timeout=timeout
            )
            
            end_time = datetime.now()
            
            # Parse response body
            try:
                response_body = response.json()
            except Exception:
                response_body = response.text
            
            return {
                "success": True,
                "status_code": response.status_code,
                "headers": dict(response.headers),
                "body": response_body,
                "time_ms": self.format_execution_time(start_time, end_time),
                "url": full_url
            }
        
        except httpx.TimeoutException:
            end_time = datetime.now()
            return {
                "success": False,
                "error": f"Request timeout after {timeout} seconds",
                "time_ms": self.format_execution_time(start_time, end_time),
                "troubleshooting": [
                    "Increase timeout parameter",
                    "Check if server is responding",
                    "Verify network connectivity"
                ]
            }
        except httpx.RequestError as e:
            end_time = datetime.now()
            return {
                "success": False,
                "error": self.safe_error_message(e, "HTTP request failed"),
                "time_ms": self.format_execution_time(start_time, end_time)
            }
        except Exception as e:
            end_time = datetime.now()
            return {
                "success": False,
                "error": self.safe_error_message(e, "Request execution failed"),
                "time_ms": self.format_execution_time(start_time, end_time)
            }

    async def validate_response(
        self,
        response: Any,
        schema: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Validate response against JSON schema."""
        try:
            # Validate using jsonschema
            json_validate(instance=response, schema=schema)
            
            return {
                "success": True,
                "valid": True,
                "errors": [],
                "warnings": []
            }
        
        except JSONValidationError as e:
            # Extract validation errors
            error_path = ".".join(str(p) for p in e.path) if e.path else "root"
            error_msg = f"Validation failed at {error_path}: {e.message}"
            
            return {
                "success": True,
                "valid": False,
                "errors": [error_msg],
                "warnings": []
            }
        
        except Exception as e:
            return {
                "success": False,
                "error": self.safe_error_message(e, "Schema validation failed")
            }

    async def execute_batch_tests(
        self,
        tests: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Execute multiple API tests in batch."""
        results = []
        passed = 0
        failed = 0
        
        for test in tests:
            test_name = test.get("name", "Unnamed test")
            method = test.get("method")
            url = test.get("url")
            body = test.get("body")
            expected_status = test.get("expected_status")
            schema = test.get("schema")
            
            # Execute request
            response = await self.execute_request(
                method=method,
                url=url,
                body=body
            )
            
            if not response.get("success"):
                failed += 1
                results.append({
                    "name": test_name,
                    "passed": False,
                    "error": response.get("error"),
                    "time_ms": response.get("time_ms", 0)
                })
                continue
            
            # Check expected status code
            status_code = response.get("status_code")
            status_match = True
            if expected_status is not None and status_code != expected_status:
                status_match = False
            
            # Validate schema if provided
            schema_valid = True
            schema_errors = []
            if schema:
                validation_result = await self.validate_response(
                    response=response.get("body"),
                    schema=schema
                )
                schema_valid = validation_result.get("valid", True)
                schema_errors = validation_result.get("errors", [])
            
            # Determine if test passed
            test_passed = status_match and schema_valid
            if test_passed:
                passed += 1
            else:
                failed += 1
            
            # Build result
            test_result = {
                "name": test_name,
                "passed": test_passed,
                "status_code": status_code,
                "expected_status": expected_status,
                "time_ms": response.get("time_ms", 0)
            }
            
            if not status_match:
                test_result["error"] = f"Expected status {expected_status}, got {status_code}"
            
            if not schema_valid:
                test_result["schema_errors"] = schema_errors
            
            results.append(test_result)
        
        return {
            "success": True,
            "total": len(tests),
            "passed": passed,
            "failed": failed,
            "pass_rate": round((passed / len(tests) * 100), 2) if tests else 0,
            "results": results
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
                    "name": "api-testing-mcp-server",
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
            if tool_name == "http_request":
                return await self.execute_request(
                    method=params.get("method"),
                    url=params.get("url"),
                    headers=params.get("headers", {}),
                    body=params.get("body"),
                    auth=params.get("auth"),
                    timeout=params.get("timeout", 30)
                )
            
            elif tool_name == "validate_response":
                return await self.validate_response(
                    response=params.get("response"),
                    schema=params.get("schema")
                )
            
            elif tool_name == "test_batch":
                return await self.execute_batch_tests(
                    tests=params.get("tests", [])
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

    async def cleanup(self):
        """Clean up resources."""
        if self.client:
            await self.client.aclose()


def main():
    """Main entry point."""
    server = APITestingMCPServer()
    try:
        server.run()
    finally:
        asyncio.run(server.cleanup())


if __name__ == "__main__":
    main()
