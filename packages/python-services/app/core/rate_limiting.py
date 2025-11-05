"""
Enhanced rate limiting system using slowapi with Redis.

This module provides:
- Distributed rate limiting with Redis
- Multiple rate limiting strategies (fixed window, sliding window, token bucket)
- Per-user, per-IP, and per-endpoint rate limiting
- Dynamic rate limit adjustment based on user roles
- Rate limit bypass for trusted sources
"""

import asyncio
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Union
from uuid import UUID

import redis.asyncio as redis
from fastapi import HTTPException, Request, status
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
import structlog

from .config import get_settings

logger = structlog.get_logger(__name__)
settings = get_settings()


class RateLimitStrategy:
    """Base class for rate limiting strategies."""
    
    def __init__(self, redis_client: redis.Redis):
        self.redis_client = redis_client
    
    async def is_allowed(self, key: str, limit: int, window: int) -> Tuple[bool, Dict[str, int]]:
        """Check if request is allowed and return rate limit info."""
        raise NotImplementedError


class FixedWindowStrategy(RateLimitStrategy):
    """Fixed window rate limiting strategy."""
    
    async def is_allowed(self, key: str, limit: int, window: int) -> Tuple[bool, Dict[str, int]]:
        """Check if request is allowed using fixed window."""
        
        # Create window key with current time window
        current_window = int(time.time()) // window
        window_key = f"{key}:{current_window}"
        
        # Get current count
        current_count = await self.redis_client.get(window_key)
        current_count = int(current_count) if current_count else 0
        
        # Check if limit exceeded
        if current_count >= limit:
            # Calculate reset time
            reset_time = (current_window + 1) * window
            remaining = 0
        else:
            # Increment counter
            pipe = self.redis_client.pipeline()
            pipe.incr(window_key)
            pipe.expire(window_key, window)
            await pipe.execute()
            
            current_count += 1
            remaining = limit - current_count
            reset_time = (current_window + 1) * window
        
        rate_limit_info = {
            "limit": limit,
            "remaining": remaining,
            "reset": reset_time,
            "retry_after": reset_time - int(time.time()) if remaining == 0 else 0
        }
        
        return current_count <= limit, rate_limit_info


class SlidingWindowStrategy(RateLimitStrategy):
    """Sliding window rate limiting strategy."""
    
    async def is_allowed(self, key: str, limit: int, window: int) -> Tuple[bool, Dict[str, int]]:
        """Check if request is allowed using sliding window."""
        
        current_time = time.time()
        window_start = current_time - window
        
        # Remove old entries
        await self.redis_client.zremrangebyscore(key, 0, window_start)
        
        # Count current requests in window
        current_count = await self.redis_client.zcard(key)
        
        if current_count >= limit:
            # Get oldest request time to calculate retry_after
            oldest_requests = await self.redis_client.zrange(key, 0, 0, withscores=True)
            if oldest_requests:
                oldest_time = oldest_requests[0][1]
                retry_after = int(oldest_time + window - current_time)
            else:
                retry_after = window
            
            remaining = 0
        else:
            # Add current request
            await self.redis_client.zadd(key, {str(current_time): current_time})
            await self.redis_client.expire(key, window)
            
            remaining = limit - current_count - 1
            retry_after = 0
        
        rate_limit_info = {
            "limit": limit,
            "remaining": remaining,
            "reset": int(current_time + window),
            "retry_after": retry_after
        }
        
        return current_count < limit, rate_limit_info


class TokenBucketStrategy(RateLimitStrategy):
    """Token bucket rate limiting strategy."""
    
    async def is_allowed(self, key: str, limit: int, window: int) -> Tuple[bool, Dict[str, int]]:
        """Check if request is allowed using token bucket."""
        
        current_time = time.time()
        
        # Get bucket state
        bucket_data = await self.redis_client.hmget(
            key, "tokens", "last_refill"
        )
        
        tokens = float(bucket_data[0]) if bucket_data[0] else limit
        last_refill = float(bucket_data[1]) if bucket_data[1] else current_time
        
        # Calculate tokens to add based on time elapsed
        time_elapsed = current_time - last_refill
        tokens_to_add = (time_elapsed / window) * limit
        tokens = min(limit, tokens + tokens_to_add)
        
        if tokens >= 1:
            # Consume one token
            tokens -= 1
            
            # Update bucket state
            await self.redis_client.hmset(key, {
                "tokens": tokens,
                "last_refill": current_time
            })
            await self.redis_client.expire(key, window * 2)  # Keep bucket alive
            
            remaining = int(tokens)
            allowed = True
            retry_after = 0
        else:
            # No tokens available
            remaining = 0
            allowed = False
            retry_after = int((1 - tokens) * window / limit)
        
        rate_limit_info = {
            "limit": limit,
            "remaining": remaining,
            "reset": int(current_time + window),
            "retry_after": retry_after
        }
        
        return allowed, rate_limit_info


class EnhancedRateLimiter:
    """Enhanced rate limiter with multiple strategies and Redis backend."""
    
    def __init__(self, redis_client: redis.Redis):
        self.redis_client = redis_client
        self.strategies = {
            "fixed_window": FixedWindowStrategy(redis_client),
            "sliding_window": SlidingWindowStrategy(redis_client),
            "token_bucket": TokenBucketStrategy(redis_client)
        }
        
        # Rate limit configurations
        self.default_limits = {
            "global": {"limit": 1000, "window": 3600, "strategy": "sliding_window"},
            "per_ip": {"limit": 100, "window": 3600, "strategy": "sliding_window"},
            "per_user": {"limit": 500, "window": 3600, "strategy": "token_bucket"},
            "login": {"limit": 5, "window": 300, "strategy": "fixed_window"},
            "password_reset": {"limit": 3, "window": 3600, "strategy": "fixed_window"},
            "file_upload": {"limit": 10, "window": 3600, "strategy": "token_bucket"},
            "api_heavy": {"limit": 50, "window": 3600, "strategy": "sliding_window"}
        }
        
        # Role-based rate limit multipliers
        self.role_multipliers = {
            "admin": 10.0,
            "premium": 5.0,
            "verified": 2.0,
            "user": 1.0,
            "guest": 0.5
        }
        
        # Trusted IP addresses (bypass rate limiting)
        self.trusted_ips = set()
        
        # Blocked IP addresses
        self.blocked_ips = set()
    
    async def check_rate_limit(
        self,
        request: Request,
        limit_type: str = "global",
        user_id: Optional[UUID] = None,
        user_role: str = "user",
        custom_limit: Optional[Dict] = None
    ) -> Tuple[bool, Dict[str, int]]:
        """Check if request is within rate limits."""
        
        ip_address = get_remote_address(request)
        
        # Check if IP is trusted
        if ip_address in self.trusted_ips:
            return True, {"limit": float('inf'), "remaining": float('inf'), "reset": 0, "retry_after": 0}
        
        # Check if IP is blocked
        if ip_address in self.blocked_ips:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="IP address is blocked"
            )
        
        # Get rate limit configuration
        if custom_limit:
            limit_config = custom_limit
        else:
            limit_config = self.default_limits.get(limit_type, self.default_limits["global"])
        
        # Apply role-based multiplier
        multiplier = self.role_multipliers.get(user_role, 1.0)
        adjusted_limit = int(limit_config["limit"] * multiplier)
        
        # Create rate limit key
        if user_id:
            key = f"rate_limit:{limit_type}:user:{user_id}"
        else:
            key = f"rate_limit:{limit_type}:ip:{ip_address}"
        
        # Check rate limit using specified strategy
        strategy = self.strategies[limit_config["strategy"]]
        allowed, rate_limit_info = await strategy.is_allowed(
            key, adjusted_limit, limit_config["window"]
        )
        
        # Log rate limit check
        logger.info(
            "Rate limit check",
            limit_type=limit_type,
            user_id=str(user_id) if user_id else None,
            ip_address=ip_address,
            allowed=allowed,
            remaining=rate_limit_info["remaining"]
        )
        
        return allowed, rate_limit_info
    
    async def add_trusted_ip(self, ip_address: str):
        """Add IP to trusted list."""
        self.trusted_ips.add(ip_address)
        await self.redis_client.sadd("trusted_ips", ip_address)
    
    async def remove_trusted_ip(self, ip_address: str):
        """Remove IP from trusted list."""
        self.trusted_ips.discard(ip_address)
        await self.redis_client.srem("trusted_ips", ip_address)
    
    async def block_ip(self, ip_address: str, duration: Optional[int] = None):
        """Block IP address."""
        self.blocked_ips.add(ip_address)
        
        if duration:
            await self.redis_client.setex(f"blocked_ip:{ip_address}", duration, "blocked")
        else:
            await self.redis_client.sadd("blocked_ips", ip_address)
    
    async def unblock_ip(self, ip_address: str):
        """Unblock IP address."""
        self.blocked_ips.discard(ip_address)
        await self.redis_client.delete(f"blocked_ip:{ip_address}")
        await self.redis_client.srem("blocked_ips", ip_address)
    
    async def get_rate_limit_status(self, key: str, limit_type: str) -> Dict[str, int]:
        """Get current rate limit status for a key."""
        limit_config = self.default_limits.get(limit_type, self.default_limits["global"])
        strategy = self.strategies[limit_config["strategy"]]
        
        # This is a read-only check
        if limit_config["strategy"] == "sliding_window":
            current_time = time.time()
            window_start = current_time - limit_config["window"]
            current_count = await self.redis_client.zcount(key, window_start, current_time)
            
            return {
                "limit": limit_config["limit"],
                "remaining": max(0, limit_config["limit"] - current_count),
                "reset": int(current_time + limit_config["window"]),
                "retry_after": 0
            }
        
        # For other strategies, we need to simulate the check
        _, rate_limit_info = await strategy.is_allowed(
            f"check_{key}", limit_config["limit"], limit_config["window"]
        )
        return rate_limit_info
    
    async def reset_rate_limit(self, key: str):
        """Reset rate limit for a specific key."""
        await self.redis_client.delete(key)
    
    async def load_trusted_and_blocked_ips(self):
        """Load trusted and blocked IPs from Redis."""
        try:
            # Load trusted IPs
            trusted_ips = await self.redis_client.smembers("trusted_ips")
            self.trusted_ips = {ip.decode() for ip in trusted_ips}
            
            # Load blocked IPs
            blocked_ips = await self.redis_client.smembers("blocked_ips")
            self.blocked_ips = {ip.decode() for ip in blocked_ips}
            
            # Load temporarily blocked IPs
            blocked_keys = await self.redis_client.keys("blocked_ip:*")
            for key in blocked_keys:
                ip = key.decode().split(":", 2)[2]
                self.blocked_ips.add(ip)
            
            logger.info(
                "Loaded IP lists",
                trusted_count=len(self.trusted_ips),
                blocked_count=len(self.blocked_ips)
            )
            
        except Exception as e:
            logger.error("Failed to load IP lists", error=str(e))


# Rate limiting decorators and middleware
def rate_limit(
    limit_type: str = "global",
    custom_limit: Optional[Dict] = None,
    require_auth: bool = False
):
    """Decorator for rate limiting endpoints."""
    
    def decorator(func):
        async def wrapper(*args, **kwargs):
            # Extract request and user info from kwargs
            request = None
            user = None
            user_role = "guest"
            
            for arg in args:
                if isinstance(arg, Request):
                    request = arg
                    break
            
            for key, value in kwargs.items():
                if key == "request" and isinstance(value, Request):
                    request = value
                elif key in ["user", "current_user"] and hasattr(value, "id"):
                    user = value
                    user_role = getattr(value, "role", "user")
            
            if not request:
                raise ValueError("Request object not found in function arguments")
            
            # Get rate limiter
            from app.core.dependencies import get_rate_limiter
            rate_limiter = await get_rate_limiter()
            
            # Check rate limit
            allowed, rate_limit_info = await rate_limiter.check_rate_limit(
                request=request,
                limit_type=limit_type,
                user_id=user.id if user else None,
                user_role=user_role,
                custom_limit=custom_limit
            )
            
            if not allowed:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Rate limit exceeded",
                    headers={
                        "X-RateLimit-Limit": str(rate_limit_info["limit"]),
                        "X-RateLimit-Remaining": str(rate_limit_info["remaining"]),
                        "X-RateLimit-Reset": str(rate_limit_info["reset"]),
                        "Retry-After": str(rate_limit_info["retry_after"])
                    }
                )
            
            # Add rate limit headers to response
            response = await func(*args, **kwargs)
            
            if hasattr(response, "headers"):
                response.headers["X-RateLimit-Limit"] = str(rate_limit_info["limit"])
                response.headers["X-RateLimit-Remaining"] = str(rate_limit_info["remaining"])
                response.headers["X-RateLimit-Reset"] = str(rate_limit_info["reset"])
            
            return response
        
        return wrapper
    return decorator


class RateLimitMiddleware:
    """Rate limiting middleware for FastAPI."""
    
    def __init__(self, rate_limiter: EnhancedRateLimiter):
        self.rate_limiter = rate_limiter
    
    async def __call__(self, request: Request, call_next):
        """Apply rate limiting to requests."""
        
        # Skip rate limiting for certain paths
        skip_paths = ["/health", "/metrics", "/docs", "/redoc", "/openapi.json"]
        if any(request.url.path.startswith(path) for path in skip_paths):
            return await call_next(request)
        
        # Apply global rate limiting
        try:
            allowed, rate_limit_info = await self.rate_limiter.check_rate_limit(
                request=request,
                limit_type="global"
            )
            
            if not allowed:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Rate limit exceeded",
                    headers={
                        "X-RateLimit-Limit": str(rate_limit_info["limit"]),
                        "X-RateLimit-Remaining": str(rate_limit_info["remaining"]),
                        "X-RateLimit-Reset": str(rate_limit_info["reset"]),
                        "Retry-After": str(rate_limit_info["retry_after"])
                    }
                )
            
            # Process request
            response = await call_next(request)
            
            # Add rate limit headers
            response.headers["X-RateLimit-Limit"] = str(rate_limit_info["limit"])
            response.headers["X-RateLimit-Remaining"] = str(rate_limit_info["remaining"])
            response.headers["X-RateLimit-Reset"] = str(rate_limit_info["reset"])
            
            return response
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error("Rate limiting error", error=str(e))
            # Continue without rate limiting on error
            return await call_next(request)


# Dependency functions
async def get_rate_limiter() -> EnhancedRateLimiter:
    """Get rate limiter instance."""
    from app.core.dependencies import get_redis
    redis_client = await get_redis()
    
    rate_limiter = EnhancedRateLimiter(redis_client)
    await rate_limiter.load_trusted_and_blocked_ips()
    
    return rate_limiter