"""
Redis Client for Backend API

Provides caching for:
- Business configurations (high-value, rarely changes)
- Customer lookups (moderate value, per-session)

Redis connection uses the same Redis instance that LiveKit uses,
which is already running on the server.
"""

import os
import json
import logging
from typing import Optional, Any
from functools import wraps

import redis

logger = logging.getLogger(__name__)

# ═══════════════════════════════════════════════════════════════════════════════
# REDIS CLIENT SINGLETON
# ═══════════════════════════════════════════════════════════════════════════════

_redis_client: Optional[redis.Redis] = None


def get_redis() -> Optional[redis.Redis]:
    """
    Get or create the Redis client.
    
    Uses environment variables:
    - REDIS_URL: Full Redis URL (default: redis://localhost:6379)
    - REDIS_HOST: Redis host (fallback)
    - REDIS_PORT: Redis port (fallback)
    
    Returns None if Redis is unavailable (graceful degradation).
    """
    global _redis_client
    
    if _redis_client is not None:
        try:
            _redis_client.ping()
            return _redis_client
        except redis.ConnectionError:
            _redis_client = None
    
    # Try to connect
    redis_url = os.getenv("REDIS_URL")
    
    if redis_url:
        try:
            _redis_client = redis.from_url(redis_url, decode_responses=True)
            _redis_client.ping()
            logger.info(f"✅ Redis connected: {redis_url}")
            return _redis_client
        except redis.ConnectionError as e:
            logger.warning(f"⚠️ Redis connection failed ({redis_url}): {e}")
            return None
    
    # Fallback to host/port
    redis_host = os.getenv("REDIS_HOST", "localhost")
    redis_port = int(os.getenv("REDIS_PORT", "6379"))
    
    try:
        _redis_client = redis.Redis(
            host=redis_host,
            port=redis_port,
            decode_responses=True,
            socket_connect_timeout=2,
            socket_timeout=2
        )
        _redis_client.ping()
        logger.info(f"✅ Redis connected: {redis_host}:{redis_port}")
        return _redis_client
    except redis.ConnectionError as e:
        logger.warning(f"⚠️ Redis unavailable ({redis_host}:{redis_port}): {e}")
        return None


# ═══════════════════════════════════════════════════════════════════════════════
# CACHE OPERATIONS
# ═══════════════════════════════════════════════════════════════════════════════

class RedisCache:
    """High-level caching operations with automatic JSON serialization."""
    
    # Cache key prefixes
    PREFIX_BUSINESS = "biz:"
    PREFIX_CUSTOMER = "cust:"
    
    # Default TTLs (in seconds)
    TTL_BUSINESS = 604800  # 7 days - business config rarely changes
    TTL_CUSTOMER = 60      # 1 minute - customer data may update
    
    @staticmethod
    def get(key: str) -> Optional[Any]:
        """Get a cached value, returns None if not found or Redis unavailable."""
        client = get_redis()
        if not client:
            return None
        
        try:
            value = client.get(key)
            if value:
                return json.loads(value)
            return None
        except (redis.RedisError, json.JSONDecodeError) as e:
            logger.warning(f"Redis get error for {key}: {e}")
            return None
    
    @staticmethod
    def set(key: str, value: Any, ttl: int = 300) -> bool:
        """Set a cached value with TTL, returns False if Redis unavailable."""
        client = get_redis()
        if not client:
            return False
        
        try:
            client.setex(key, ttl, json.dumps(value))
            return True
        except (redis.RedisError, TypeError) as e:
            logger.warning(f"Redis set error for {key}: {e}")
            return False
    
    @staticmethod
    def delete(key: str) -> bool:
        """Delete a cached value."""
        client = get_redis()
        if not client:
            return False
        
        try:
            client.delete(key)
            return True
        except redis.RedisError as e:
            logger.warning(f"Redis delete error for {key}: {e}")
            return False
    
    @staticmethod
    def invalidate_business(phone_number: str) -> bool:
        """Invalidate business cache by phone number."""
        key = f"{RedisCache.PREFIX_BUSINESS}phone:{phone_number}"
        return RedisCache.delete(key)
    
    @staticmethod
    def get_business_by_phone(phone_number: str) -> Optional[dict]:
        """Get cached business config by phone number."""
        key = f"{RedisCache.PREFIX_BUSINESS}phone:{phone_number}"
        return RedisCache.get(key)
    
    @staticmethod
    def set_business_by_phone(phone_number: str, config: dict) -> bool:
        """Cache business config by phone number."""
        key = f"{RedisCache.PREFIX_BUSINESS}phone:{phone_number}"
        return RedisCache.set(key, config, RedisCache.TTL_BUSINESS)


# ═══════════════════════════════════════════════════════════════════════════════
# INITIALIZATION
# ═══════════════════════════════════════════════════════════════════════════════

def init_redis():
    """Initialize Redis connection on startup."""
    client = get_redis()
    if client:
        logger.info("✅ Redis cache enabled")
    else:
        logger.warning("⚠️ Redis cache disabled - falling back to in-memory cache")

