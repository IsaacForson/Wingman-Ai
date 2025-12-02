"""
Wingman AI - Cache Manager
Redis integration and response caching for performance
"""

import asyncio
import json
import hashlib
from typing import Optional, Any, Dict
from datetime import timedelta
from functools import wraps
from loguru import logger

from config import settings


class CacheManager:
    """
    Manages caching with Redis or fallback to in-memory cache
    Supports response caching, rate limiting, and session storage
    """
    
    def __init__(self, redis_url: Optional[str] = None):
        self.redis_url = redis_url or settings.redis_url
        self._redis = None
        self._memory_cache: Dict[str, Any] = {}
        self._memory_expiry: Dict[str, float] = {}
        self._use_redis = False
        self._enabled = settings.enable_caching
    
    async def initialize(self):
        """Initialize cache connection"""
        if not self._enabled:
            logger.info("Caching disabled")
            return
        
        if self.redis_url:
            try:
                import redis.asyncio as aioredis
                self._redis = aioredis.from_url(
                    self.redis_url,
                    encoding="utf-8",
                    decode_responses=True
                )
                # Test connection
                await self._redis.ping()
                self._use_redis = True
                logger.info("Redis cache connected")
            except Exception as e:
                logger.warning(f"Redis connection failed, using memory cache: {e}")
                self._use_redis = False
        else:
            logger.info("Using in-memory cache (Redis not configured)")
    
    def _make_key(self, prefix: str, *args) -> str:
        """Generate a cache key"""
        key_parts = [str(arg) for arg in args]
        key_hash = hashlib.md5(":".join(key_parts).encode()).hexdigest()[:12]
        return f"wingman:{prefix}:{key_hash}"
    
    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        if not self._enabled:
            return None
        
        try:
            if self._use_redis:
                value = await self._redis.get(key)
                if value:
                    return json.loads(value)
            else:
                # Memory cache with expiry check
                import time
                if key in self._memory_cache:
                    if self._memory_expiry.get(key, float('inf')) > time.time():
                        return self._memory_cache[key]
                    else:
                        # Expired
                        del self._memory_cache[key]
                        del self._memory_expiry[key]
            return None
        except Exception as e:
            logger.debug(f"Cache get error: {e}")
            return None
    
    async def set(
        self,
        key: str,
        value: Any,
        ttl: int = None
    ):
        """Set value in cache"""
        if not self._enabled:
            return
        
        ttl = ttl or settings.cache_ttl
        
        try:
            if self._use_redis:
                await self._redis.setex(
                    key,
                    ttl,
                    json.dumps(value)
                )
            else:
                import time
                self._memory_cache[key] = value
                self._memory_expiry[key] = time.time() + ttl
        except Exception as e:
            logger.debug(f"Cache set error: {e}")
    
    async def delete(self, key: str):
        """Delete from cache"""
        try:
            if self._use_redis:
                await self._redis.delete(key)
            else:
                self._memory_cache.pop(key, None)
                self._memory_expiry.pop(key, None)
        except Exception as e:
            logger.debug(f"Cache delete error: {e}")
    
    async def clear_prefix(self, prefix: str):
        """Clear all keys with prefix"""
        pattern = f"wingman:{prefix}:*"
        
        try:
            if self._use_redis:
                cursor = 0
                while True:
                    cursor, keys = await self._redis.scan(cursor, match=pattern)
                    if keys:
                        await self._redis.delete(*keys)
                    if cursor == 0:
                        break
            else:
                keys_to_delete = [
                    k for k in self._memory_cache
                    if k.startswith(f"wingman:{prefix}:")
                ]
                for key in keys_to_delete:
                    self._memory_cache.pop(key, None)
                    self._memory_expiry.pop(key, None)
        except Exception as e:
            logger.debug(f"Cache clear error: {e}")
    
    # Specialized caching methods
    
    async def cache_answer(
        self,
        question: str,
        context_hash: str,
        answer: str,
        ttl: int = 3600
    ):
        """Cache an AI-generated answer"""
        key = self._make_key("answer", question, context_hash)
        await self.set(key, {
            "answer": answer,
            "question": question
        }, ttl)
    
    async def get_cached_answer(
        self,
        question: str,
        context_hash: str
    ) -> Optional[str]:
        """Get cached answer if available"""
        key = self._make_key("answer", question, context_hash)
        result = await self.get(key)
        if result:
            logger.debug("Cache hit for answer")
            return result.get("answer")
        return None
    
    async def cache_knowledge_search(
        self,
        query: str,
        results: str,
        ttl: int = 1800
    ):
        """Cache knowledge base search results"""
        key = self._make_key("kb_search", query)
        await self.set(key, results, ttl)
    
    async def get_cached_knowledge_search(
        self,
        query: str
    ) -> Optional[str]:
        """Get cached KB search results"""
        key = self._make_key("kb_search", query)
        return await self.get(key)
    
    async def cache_ocr_result(
        self,
        image_hash: str,
        ocr_text: str,
        ttl: int = 600
    ):
        """Cache OCR results for an image"""
        key = self._make_key("ocr", image_hash)
        await self.set(key, ocr_text, ttl)
    
    async def get_cached_ocr(
        self,
        image_hash: str
    ) -> Optional[str]:
        """Get cached OCR result"""
        key = self._make_key("ocr", image_hash)
        return await self.get(key)
    
    # Rate limiting
    
    async def check_rate_limit(
        self,
        identifier: str,
        limit: int,
        window_seconds: int
    ) -> bool:
        """
        Check if rate limit exceeded
        Returns True if within limit, False if exceeded
        """
        key = self._make_key("rate", identifier)
        
        try:
            if self._use_redis:
                current = await self._redis.incr(key)
                if current == 1:
                    await self._redis.expire(key, window_seconds)
                return current <= limit
            else:
                import time
                now = time.time()
                
                # Get or create rate limit entry
                if key not in self._memory_cache:
                    self._memory_cache[key] = {"count": 0, "start": now}
                
                entry = self._memory_cache[key]
                
                # Reset if window expired
                if now - entry["start"] > window_seconds:
                    entry = {"count": 0, "start": now}
                    self._memory_cache[key] = entry
                
                entry["count"] += 1
                return entry["count"] <= limit
                
        except Exception as e:
            logger.debug(f"Rate limit check error: {e}")
            return True  # Allow on error
    
    async def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        stats = {
            "enabled": self._enabled,
            "backend": "redis" if self._use_redis else "memory",
            "memory_items": len(self._memory_cache)
        }
        
        if self._use_redis:
            try:
                info = await self._redis.info("memory")
                stats["redis_memory"] = info.get("used_memory_human")
            except Exception:
                pass
        
        return stats
    
    async def shutdown(self):
        """Cleanup"""
        if self._redis:
            await self._redis.close()
        self._memory_cache.clear()
        self._memory_expiry.clear()
        logger.info("Cache manager shutdown")


# Decorator for caching function results
def cached(prefix: str, ttl: int = 3600):
    """
    Decorator to cache function results
    
    Usage:
        @cached("my_function", ttl=600)
        async def my_function(arg1, arg2):
            ...
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, cache_manager: CacheManager = None, **kwargs):
            if not cache_manager:
                return await func(*args, **kwargs)
            
            # Build cache key from function args
            key = cache_manager._make_key(prefix, func.__name__, *args, *kwargs.values())
            
            # Try cache first
            cached_value = await cache_manager.get(key)
            if cached_value is not None:
                return cached_value
            
            # Call function
            result = await func(*args, **kwargs)
            
            # Cache result
            await cache_manager.set(key, result, ttl)
            
            return result
        return wrapper
    return decorator

