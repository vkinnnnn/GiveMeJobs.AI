"""Enhanced OpenAI client with rate limiting and error handling."""

import asyncio
import time
from typing import Dict, Any, Optional, List
from contextlib import asynccontextmanager

import openai
from openai import AsyncOpenAI
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type,
    before_sleep_log
)

from app.core.config import get_settings
from app.core.exceptions import ExternalServiceException, RateLimitException
from app.core.logging import get_logger, get_correlation_id

logger = get_logger(__name__)


class RateLimiter:
    """Simple rate limiter for OpenAI API calls."""
    
    def __init__(self, max_requests: int = 60, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests: List[float] = []
        self._lock = asyncio.Lock()
    
    async def acquire(self) -> None:
        """Acquire rate limit permission."""
        async with self._lock:
            now = time.time()
            
            # Remove old requests outside the window
            self.requests = [req_time for req_time in self.requests 
                           if now - req_time < self.window_seconds]
            
            # Check if we can make a request
            if len(self.requests) >= self.max_requests:
                sleep_time = self.window_seconds - (now - self.requests[0])
                if sleep_time > 0:
                    logger.warning(
                        "Rate limit reached, sleeping",
                        sleep_time=sleep_time,
                        requests_in_window=len(self.requests)
                    )
                    await asyncio.sleep(sleep_time)
                    # Retry after sleeping
                    await self.acquire()
                    return
            
            # Record this request
            self.requests.append(now)


class EnhancedOpenAIClient:
    """Enhanced OpenAI client with rate limiting, retries, and error handling."""
    
    def __init__(self):
        self.settings = get_settings()
        
        if not self.settings.ai.openai_api_key:
            raise ValueError("OpenAI API key not configured")
        
        self.client = AsyncOpenAI(
            api_key=self.settings.ai.openai_api_key,
            timeout=self.settings.ai.openai_timeout,
            max_retries=0  # We handle retries ourselves
        )
        
        # Rate limiter (60 requests per minute by default)
        self.rate_limiter = RateLimiter(
            max_requests=60,
            window_seconds=60
        )
        
        # Track usage statistics
        self.usage_stats = {
            "total_requests": 0,
            "successful_requests": 0,
            "failed_requests": 0,
            "total_tokens": 0,
            "rate_limited_requests": 0
        }
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=4, max=10),
        retry=retry_if_exception_type((
            openai.RateLimitError,
            openai.APITimeoutError,
            openai.InternalServerError
        )),
        before_sleep=before_sleep_log(logger, "WARNING")
    )
    async def chat_completion(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        **kwargs
    ) -> openai.types.chat.ChatCompletion:
        """Create a chat completion with rate limiting and error handling."""
        
        # Apply rate limiting
        await self.rate_limiter.acquire()
        
        # Use defaults from settings if not provided
        model = model or self.settings.ai.openai_model
        temperature = temperature if temperature is not None else self.settings.ai.openai_temperature
        max_tokens = max_tokens or self.settings.ai.openai_max_tokens
        
        correlation_id = get_correlation_id()
        
        try:
            logger.info(
                "Making OpenAI chat completion request",
                model=model,
                temperature=temperature,
                max_tokens=max_tokens,
                message_count=len(messages),
                correlation_id=correlation_id
            )
            
            self.usage_stats["total_requests"] += 1
            
            response = await self.client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                **kwargs
            )
            
            # Track usage
            if response.usage:
                self.usage_stats["total_tokens"] += response.usage.total_tokens
            
            self.usage_stats["successful_requests"] += 1
            
            logger.info(
                "OpenAI chat completion successful",
                model=model,
                tokens_used=response.usage.total_tokens if response.usage else 0,
                finish_reason=response.choices[0].finish_reason if response.choices else None,
                correlation_id=correlation_id
            )
            
            return response
            
        except openai.RateLimitError as e:
            self.usage_stats["rate_limited_requests"] += 1
            self.usage_stats["failed_requests"] += 1
            logger.error(
                "OpenAI rate limit exceeded",
                error=str(e),
                correlation_id=correlation_id
            )
            raise RateLimitException("OpenAI", "Rate limit exceeded")
            
        except openai.APITimeoutError as e:
            self.usage_stats["failed_requests"] += 1
            logger.error(
                "OpenAI API timeout",
                error=str(e),
                correlation_id=correlation_id
            )
            raise ExternalServiceException("OpenAI", f"API timeout: {str(e)}")
            
        except openai.AuthenticationError as e:
            self.usage_stats["failed_requests"] += 1
            logger.error(
                "OpenAI authentication error",
                error=str(e),
                correlation_id=correlation_id
            )
            raise ExternalServiceException("OpenAI", f"Authentication error: {str(e)}")
            
        except openai.BadRequestError as e:
            self.usage_stats["failed_requests"] += 1
            logger.error(
                "OpenAI bad request",
                error=str(e),
                correlation_id=correlation_id
            )
            raise ExternalServiceException("OpenAI", f"Bad request: {str(e)}")
            
        except Exception as e:
            self.usage_stats["failed_requests"] += 1
            logger.error(
                "Unexpected OpenAI error",
                error=str(e),
                correlation_id=correlation_id,
                exc_info=True
            )
            raise ExternalServiceException("OpenAI", f"Unexpected error: {str(e)}")
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=4, max=10),
        retry=retry_if_exception_type((
            openai.RateLimitError,
            openai.APITimeoutError,
            openai.InternalServerError
        )),
        before_sleep=before_sleep_log(logger, "WARNING")
    )
    async def create_embedding(
        self,
        input_text: str,
        model: str = "text-embedding-ada-002"
    ) -> openai.types.CreateEmbeddingResponse:
        """Create embeddings with rate limiting and error handling."""
        
        # Apply rate limiting
        await self.rate_limiter.acquire()
        
        correlation_id = get_correlation_id()
        
        try:
            logger.info(
                "Making OpenAI embedding request",
                model=model,
                text_length=len(input_text),
                correlation_id=correlation_id
            )
            
            self.usage_stats["total_requests"] += 1
            
            response = await self.client.embeddings.create(
                model=model,
                input=input_text
            )
            
            # Track usage
            if response.usage:
                self.usage_stats["total_tokens"] += response.usage.total_tokens
            
            self.usage_stats["successful_requests"] += 1
            
            logger.info(
                "OpenAI embedding successful",
                model=model,
                tokens_used=response.usage.total_tokens if response.usage else 0,
                embedding_dimension=len(response.data[0].embedding) if response.data else 0,
                correlation_id=correlation_id
            )
            
            return response
            
        except Exception as e:
            self.usage_stats["failed_requests"] += 1
            logger.error(
                "OpenAI embedding failed",
                error=str(e),
                correlation_id=correlation_id,
                exc_info=True
            )
            raise ExternalServiceException("OpenAI", f"Embedding failed: {str(e)}")
    
    async def get_usage_stats(self) -> Dict[str, Any]:
        """Get usage statistics."""
        return {
            **self.usage_stats,
            "success_rate": (
                self.usage_stats["successful_requests"] / 
                max(self.usage_stats["total_requests"], 1)
            ) * 100,
            "rate_limit_rate": (
                self.usage_stats["rate_limited_requests"] / 
                max(self.usage_stats["total_requests"], 1)
            ) * 100
        }
    
    async def health_check(self) -> bool:
        """Perform a health check on the OpenAI service."""
        try:
            # Simple test request
            response = await self.chat_completion(
                messages=[{"role": "user", "content": "Hello"}],
                max_tokens=5
            )
            return response is not None
        except Exception as e:
            logger.error("OpenAI health check failed", error=str(e))
            return False


# Global client instance
_openai_client: Optional[EnhancedOpenAIClient] = None


async def get_openai_client() -> EnhancedOpenAIClient:
    """Get the global OpenAI client instance."""
    global _openai_client
    
    if _openai_client is None:
        _openai_client = EnhancedOpenAIClient()
    
    return _openai_client


@asynccontextmanager
async def openai_client_context():
    """Context manager for OpenAI client."""
    client = await get_openai_client()
    try:
        yield client
    finally:
        # Any cleanup if needed
        pass