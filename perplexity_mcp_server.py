#!/usr/bin/env python3
"""
Perplexity MCP Server
A Model Context Protocol server for Perplexity AI API integration
"""

import os
import json
import asyncio
from typing import Any, Optional
import httpx
from mcp.server import Server
from mcp.types import Tool, TextContent, ImageContent, EmbeddedResource
from mcp.server.stdio import stdio_server

# Initialize the MCP server
app = Server("perplexity-server")

# Perplexity API configuration
PERPLEXITY_API_KEY = os.getenv("PERPLEXITY_API_KEY")
PERPLEXITY_API_URL = "https://api.perplexity.ai/chat/completions"

if not PERPLEXITY_API_KEY:
    raise ValueError("PERPLEXITY_API_KEY environment variable is required")


@app.list_tools()
async def list_tools() -> list[Tool]:
    """List available Perplexity tools."""
    return [
        Tool(
            name="perplexity_search",
            description=(
                "Search and get AI-powered answers using Perplexity AI. "
                "Provides comprehensive responses with citations and sources. "
                "Best for research, technical questions, and current information."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "The search query or question to ask Perplexity AI"
                    },
                    "model": {
                        "type": "string",
                        "description": "Model to use (default: llama-3.1-sonar-small-128k-online)",
                        "enum": [
                            "llama-3.1-sonar-small-128k-online",
                            "llama-3.1-sonar-large-128k-online",
                            "llama-3.1-sonar-huge-128k-online"
                        ],
                        "default": "llama-3.1-sonar-small-128k-online"
                    },
                    "temperature": {
                        "type": "number",
                        "description": "Temperature for response generation (0.0-2.0, default: 0.2)",
                        "minimum": 0.0,
                        "maximum": 2.0,
                        "default": 0.2
                    },
                    "max_tokens": {
                        "type": "integer",
                        "description": "Maximum tokens in response (default: 1024)",
                        "minimum": 1,
                        "maximum": 4096,
                        "default": 1024
                    }
                },
                "required": ["query"]
            }
        ),
        Tool(
            name="perplexity_chat",
            description=(
                "Have a multi-turn conversation with Perplexity AI. "
                "Maintains context across messages for deeper exploration of topics. "
                "Useful for follow-up questions and detailed discussions."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "messages": {
                        "type": "array",
                        "description": "Array of conversation messages",
                        "items": {
                            "type": "object",
                            "properties": {
                                "role": {
                                    "type": "string",
                                    "enum": ["system", "user", "assistant"]
                                },
                                "content": {
                                    "type": "string"
                                }
                            },
                            "required": ["role", "content"]
                        }
                    },
                    "model": {
                        "type": "string",
                        "description": "Model to use (default: llama-3.1-sonar-small-128k-online)",
                        "enum": [
                            "llama-3.1-sonar-small-128k-online",
                            "llama-3.1-sonar-large-128k-online",
                            "llama-3.1-sonar-huge-128k-online"
                        ],
                        "default": "llama-3.1-sonar-small-128k-online"
                    },
                    "temperature": {
                        "type": "number",
                        "description": "Temperature for response generation (0.0-2.0, default: 0.2)",
                        "minimum": 0.0,
                        "maximum": 2.0,
                        "default": 0.2
                    }
                },
                "required": ["messages"]
            }
        )
    ]


async def call_perplexity_api(
    messages: list[dict[str, str]],
    model: str = "llama-3.1-sonar-small-128k-online",
    temperature: float = 0.2,
    max_tokens: int = 1024
) -> dict[str, Any]:
    """Call the Perplexity API."""
    headers = {
        "Authorization": f"Bearer {PERPLEXITY_API_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
        "stream": False
    }
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            PERPLEXITY_API_URL,
            headers=headers,
            json=payload
        )
        response.raise_for_status()
        return response.json()


@app.call_tool()
async def call_tool(name: str, arguments: Any) -> list[TextContent]:
    """Handle tool calls."""
    
    if name == "perplexity_search":
        query = arguments.get("query")
        model = arguments.get("model", "llama-3.1-sonar-small-128k-online")
        temperature = arguments.get("temperature", 0.2)
        max_tokens = arguments.get("max_tokens", 1024)
        
        if not query:
            return [TextContent(
                type="text",
                text="Error: 'query' parameter is required"
            )]
        
        try:
            # Create a single-turn search query
            messages = [
                {
                    "role": "system",
                    "content": "You are a helpful AI assistant that provides accurate, well-researched answers with citations."
                },
                {
                    "role": "user",
                    "content": query
                }
            ]
            
            result = await call_perplexity_api(
                messages=messages,
                model=model,
                temperature=temperature,
                max_tokens=max_tokens
            )
            
            # Extract the response
            response_text = result["choices"][0]["message"]["content"]
            
            # Format the response with metadata
            formatted_response = f"""# Perplexity Search Results

**Query:** {query}
**Model:** {model}

## Answer

{response_text}

---
**Usage:** {result.get('usage', {})}
"""
            
            return [TextContent(
                type="text",
                text=formatted_response
            )]
            
        except httpx.HTTPStatusError as e:
            return [TextContent(
                type="text",
                text=f"Error calling Perplexity API: {e.response.status_code} - {e.response.text}"
            )]
        except Exception as e:
            return [TextContent(
                type="text",
                text=f"Error: {str(e)}"
            )]
    
    elif name == "perplexity_chat":
        messages = arguments.get("messages", [])
        model = arguments.get("model", "llama-3.1-sonar-small-128k-online")
        temperature = arguments.get("temperature", 0.2)
        
        if not messages:
            return [TextContent(
                type="text",
                text="Error: 'messages' parameter is required"
            )]
        
        try:
            result = await call_perplexity_api(
                messages=messages,
                model=model,
                temperature=temperature
            )
            
            # Extract the response
            response_text = result["choices"][0]["message"]["content"]
            
            # Format the response
            formatted_response = f"""# Perplexity Chat Response

**Model:** {model}

## Response

{response_text}

---
**Usage:** {result.get('usage', {})}
"""
            
            return [TextContent(
                type="text",
                text=formatted_response
            )]
            
        except httpx.HTTPStatusError as e:
            return [TextContent(
                type="text",
                text=f"Error calling Perplexity API: {e.response.status_code} - {e.response.text}"
            )]
        except Exception as e:
            return [TextContent(
                type="text",
                text=f"Error: {str(e)}"
            )]
    
    else:
        return [TextContent(
            type="text",
            text=f"Unknown tool: {name}"
        )]


async def main():
    """Run the MCP server."""
    async with stdio_server() as (read_stream, write_stream):
        await app.run(
            read_stream,
            write_stream,
            app.create_initialization_options()
        )


if __name__ == "__main__":
    asyncio.run(main())
