"""Base utilities for MCP servers."""

import sys
import json
import logging
from typing import Any, Dict, Optional
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class MCPServer:
    """Base class for MCP servers with common utilities."""

    def __init__(self, name: str):
        self.name = name
        self.tools = []
        logger.info(f"Initializing {name} MCP Server")

    def add_tool(self, tool_definition: Dict[str, Any]) -> None:
        """Add a tool definition to the server."""
        self.tools.append(tool_definition)

    def send_response(self, response: Dict[str, Any]) -> None:
        """Send a JSON-RPC response to stdout."""
        json_response = json.dumps(response)
        sys.stdout.write(json_response + "\n")
        sys.stdout.flush()

    def send_error(
        self, request_id: Optional[Any], code: int, message: str, data: Optional[Dict] = None
    ) -> None:
        """Send a JSON-RPC error response."""
        error_response = {
            "jsonrpc": "2.0",
            "id": request_id,
            "error": {"code": code, "message": message},
        }
        if data:
            error_response["error"]["data"] = data
        self.send_response(error_response)

    def send_result(self, request_id: Any, result: Any) -> None:
        """Send a JSON-RPC success response."""
        success_response = {"jsonrpc": "2.0", "id": request_id, "result": result}
        self.send_response(success_response)

    def safe_error_message(self, error: Exception, context: str = "") -> str:
        """
        Generate a safe error message without exposing sensitive information.
        
        Args:
            error: The exception that occurred
            context: Additional context about where the error occurred
            
        Returns:
            A sanitized error message
        """
        error_type = type(error).__name__
        error_msg = str(error)
        
        # Remove sensitive patterns
        sensitive_patterns = [
            "password=",
            "PASSWORD=",
            "token=",
            "TOKEN=",
            "key=",
            "KEY=",
            "secret=",
            "SECRET=",
            "://",
        ]
        
        for pattern in sensitive_patterns:
            if pattern in error_msg:
                error_msg = error_msg.split(pattern)[0] + "[REDACTED]"
        
        base_message = f"{error_type}: {error_msg}"
        if context:
            base_message = f"{context}: {base_message}"
        
        return base_message

    def format_execution_time(self, start_time: datetime, end_time: datetime) -> float:
        """Calculate execution time in milliseconds."""
        delta = end_time - start_time
        return delta.total_seconds() * 1000

    def handle_request(self, request: Dict[str, Any]) -> None:
        """Handle incoming JSON-RPC request (to be implemented by subclasses)."""
        raise NotImplementedError("Subclasses must implement handle_request")

    def run(self) -> None:
        """Main server loop that reads from stdin and processes requests."""
        logger.info(f"{self.name} MCP Server started")
        
        try:
            for line in sys.stdin:
                try:
                    request = json.loads(line.strip())
                    self.handle_request(request)
                except json.JSONDecodeError as e:
                    logger.error(f"Invalid JSON: {e}")
                    self.send_error(None, -32700, "Parse error")
                except Exception as e:
                    logger.error(f"Error handling request: {e}")
                    self.send_error(None, -32603, "Internal error")
        except KeyboardInterrupt:
            logger.info(f"{self.name} MCP Server stopped")
        except Exception as e:
            logger.error(f"Fatal error: {e}")
            sys.exit(1)
