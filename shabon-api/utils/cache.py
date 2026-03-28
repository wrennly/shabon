# utils/cache.py
"""
キャッシュ管理ユーティリティ
- Redis（優先）+ In-memory（フォールバック）のハイブリッドキャッシュ
- 属性マスタキャッシュ
- クエリ結果キャッシュ（公開メイトリスト等）
"""

from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import json
import os
import redis
from redis import Redis
from sqlmodel import Session, select
from sqlalchemy.orm import selectinload

from models import MAttributes

# Redis configuration
# Redis無効化: Supabaseが十分高速なため、メモリキャッシュのみ使用
REDIS_ENABLED = False
redis_client: Optional[Redis] = None
#print("ℹ️  Redis disabled. Using in-memory cache only.")

# 以下はRedis有効化時のコード（現在は無効）
# REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
# try:
#     redis_client: Optional[Redis] = redis.from_url(REDIS_URL, decode_responses=True)
#     redis_client.ping()
#     REDIS_ENABLED = True
#     print("✅ Redis connected")
# except Exception as e:
#     redis_client = None
#     REDIS_ENABLED = False
#     print(f"⚠️  Redis unavailable: {e}. Using in-memory cache.")

# Cache configuration
CACHE_DURATION = timedelta(hours=1)
CACHE_TTL_SECONDS = int(CACHE_DURATION.total_seconds())
PUBLIC_MATES_CACHE_TTL = 60  # 公開メイトリストのキャッシュTTL（秒）
QUERY_CACHE_PREFIX = "query:"

# In-memory fallback cache
_attribute_cache: Dict[str, Any] = {}
_cache_timestamp: Dict[str, datetime] = {}


def _is_cache_valid(key: str) -> bool:
    """Check if in-memory cache is still valid"""
    if key not in _cache_timestamp:
        return False
    return datetime.now() - _cache_timestamp[key] < CACHE_DURATION


def _serialize_attributes(attributes: List[MAttributes]) -> str:
    """Serialize attributes to JSON"""
    return json.dumps([
        {
            "id": attr.id,
            "attribute_key": attr.attribute_key,
            "display_name": attr.display_name,
            "attribute_type": attr.attribute_type,
            "display_order": attr.display_order,
            "category": attr.category,
            "prompt_order": attr.prompt_order,
            "options": [
                {
                    "id": opt.id,
                    "option_value": opt.option_value,
                    "display_name": opt.display_name,
                    "prompt_snippet": opt.prompt_snippet
                }
                for opt in attr.options
            ]
        }
        for attr in attributes
    ])


def get_attributes_cache(session: Session) -> List[MAttributes]:
    """Get attributes from Redis cache, in-memory cache, or database"""
    cache_key = "attributes"
    
    # Try Redis first
    if REDIS_ENABLED and redis_client:
        try:
            cached_data = redis_client.get(cache_key)
            if cached_data:
                print(f"✅ Cache hit (Redis): {cache_key}")
                # Return fresh objects with eager loaded options
                return session.exec(
                    select(MAttributes).options(selectinload(MAttributes.options))
                ).all()
        except Exception as e:
            print(f"⚠️  Redis get error: {e}")
    
    # Try in-memory cache
    if cache_key in _attribute_cache and _is_cache_valid(cache_key):
        print(f"✅ Cache hit (Memory): {cache_key}")
        return _attribute_cache[cache_key]
    
    # Fetch from database
    print(f"📊 Cache miss: {cache_key} - fetching from DB")
    statement = select(MAttributes).options(selectinload(MAttributes.options))
    attributes = session.exec(statement).all()
    
    # Store in both caches
    _attribute_cache[cache_key] = attributes
    _cache_timestamp[cache_key] = datetime.now()
    
    if REDIS_ENABLED and redis_client:
        try:
            serialized = _serialize_attributes(attributes)
            redis_client.setex(cache_key, CACHE_TTL_SECONDS, serialized)
            print(f"💾 Cached to Redis: {cache_key}")
        except Exception as e:
            print(f"⚠️  Redis set error: {e}")
    
    return attributes


def clear_attributes_cache():
    """Clear all attribute caches"""
    cache_key = "attributes"
    
    # Clear Redis cache
    if REDIS_ENABLED and redis_client:
        try:
            redis_client.delete(cache_key)
            print(f"🗑️  Cleared Redis cache: {cache_key}")
        except Exception as e:
            print(f"⚠️  Redis delete error: {e}")
    
    # Clear in-memory cache
    if cache_key in _attribute_cache:
        del _attribute_cache[cache_key]
        del _cache_timestamp[cache_key]
        print(f"🗑️  Cleared memory cache: {cache_key}")


def _make_query_cache_key(base_key: str, skip: int = 0, limit: int = 20) -> str:
    """Generate cache key for paginated queries"""
    return f"{QUERY_CACHE_PREFIX}{base_key}:{skip}:{limit}"


def get_cached_query_result(cache_key: str, ttl: int = PUBLIC_MATES_CACHE_TTL) -> Optional[Any]:
    """Get query result from Redis cache"""
    if not (REDIS_ENABLED and redis_client):
        return None
    
    try:
        cached_data = redis_client.get(cache_key)
        if cached_data:
            print(f"✅ Query cache hit (Redis): {cache_key}")
            return json.loads(cached_data)
    except Exception as e:
        print(f"⚠️  Redis get error: {e}")
    
    return None


def set_cached_query_result(cache_key: str, data: Any, ttl: int = PUBLIC_MATES_CACHE_TTL) -> bool:
    """Store query result in Redis cache"""
    if not (REDIS_ENABLED and redis_client):
        return False
    
    try:
        json_data = json.dumps(data) if not isinstance(data, str) else data
        redis_client.setex(cache_key, ttl, json_data)
        print(f"💾 Cached query result (Redis): {cache_key}")
        return True
    except Exception as e:
        print(f"⚠️  Redis set error: {e}")
        return False


def clear_query_cache(pattern: str = f"{QUERY_CACHE_PREFIX}*"):
    """Clear query result caches matching pattern"""
    if not (REDIS_ENABLED and redis_client):
        return
    
    try:
        keys = redis_client.keys(pattern)
        if keys:
            redis_client.delete(*keys)
            print(f"🗑️  Cleared {len(keys)} query cache entries")
    except Exception as e:
        print(f"⚠️  Redis delete error: {e}")
