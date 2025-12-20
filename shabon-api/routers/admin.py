"""
Admin endpoints for cache and memory management
"""
import os
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Header
from sqlmodel import Session, select, func

from database import get_session
from models import Users, ConversationMemory
from utils.cache import (
    clear_attributes_cache, clear_query_cache,
    REDIS_ENABLED, redis_client, CACHE_TTL_SECONDS, _attribute_cache
)

# Router setup
router = APIRouter(prefix="/admin", tags=["admin"])

# Dependency injection placeholder (will be set by main.py)
get_current_user = None

async def current_user_dependency(
    authorization: Optional[str] = Header(None),
    session: Session = Depends(get_session)
):
    """Dependency wrapper that calls the injected get_current_user function"""
    if get_current_user is None:
        raise HTTPException(status_code=500, detail="get_current_user not initialized")
    return await get_current_user(authorization, session)

@router.post("/cache/clear")
def clear_cache(admin_key: str = Query(...)):
    """Clear all caches (admin only)"""
    # Simple admin key check (in production, use proper auth)
    admin_secret = os.getenv("ADMIN_SECRET", "")
    if not admin_secret or admin_key != admin_secret:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    clear_attributes_cache()
    clear_query_cache()
    
    return {
        "message": "All caches cleared",
        "redis_enabled": REDIS_ENABLED,
        "timestamp": datetime.now().isoformat()
    }

@router.get("/cache/status")
def get_cache_status():
    """Get cache status (admin only)"""
    redis_status = "connected" if (REDIS_ENABLED and redis_client) else "disconnected"
    
    return {
        "redis_enabled": REDIS_ENABLED,
        "redis_status": redis_status,
        "in_memory_cache_keys": list(_attribute_cache.keys()),
        "cache_ttl_seconds": CACHE_TTL_SECONDS,
        "timestamp": datetime.now().isoformat()
    }

# ---
# Memory Management Endpoints (RAG)
# ---

@router.delete("/memory/clear/mate/{mate_id}")
def clear_mate_memory(
    mate_id: int,
    admin_key: str = Query(...),
    current_user: Users = Depends(current_user_dependency),
    session: Session = Depends(get_session)
):
    """Clear all memories for a specific mate (admin only)"""
    ADMIN_SECRET = os.getenv("ADMIN_SECRET", "")
    if admin_key != ADMIN_SECRET or not ADMIN_SECRET:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    # Delete all memories for the mate
    stmt = select(ConversationMemory).where(ConversationMemory.mate_id == mate_id)
    memories = session.exec(stmt).all()
    
    count = len(memories)
    for memory in memories:
        session.delete(memory)
    
    session.commit()
    
    return {
        "message": f"Cleared {count} memories for mate {mate_id}",
        "cleared_count": count,
        "timestamp": datetime.now().isoformat()
    }

@router.delete("/memory/clear/user/{user_id}")
def clear_user_memory(
    user_id: int,
    admin_key: str = Query(...),
    current_user: Users = Depends(current_user_dependency),
    session: Session = Depends(get_session)
):
    """Clear all memories for a specific user (admin only)"""
    ADMIN_SECRET = os.getenv("ADMIN_SECRET", "")
    if admin_key != ADMIN_SECRET or not ADMIN_SECRET:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    # Delete all memories for the user
    stmt = select(ConversationMemory).where(ConversationMemory.user_id == user_id)
    memories = session.exec(stmt).all()
    
    count = len(memories)
    for memory in memories:
        session.delete(memory)
    
    session.commit()
    
    return {
        "message": f"Cleared {count} memories for user {user_id}",
        "cleared_count": count,
        "timestamp": datetime.now().isoformat()
    }

@router.get("/memory/stats")
def get_memory_stats(
    admin_key: str = Query(...),
    current_user: Users = Depends(current_user_dependency),
    session: Session = Depends(get_session)
):
    """Get memory database statistics (admin only)"""
    ADMIN_SECRET = os.getenv("ADMIN_SECRET", "")
    if admin_key != ADMIN_SECRET or not ADMIN_SECRET:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    # Total memory count
    total_memories = session.exec(select(func.count(ConversationMemory.id))).first() or 0
    
    # Memories with embeddings
    with_embeddings = session.exec(
        select(func.count(ConversationMemory.id)).where(
            ConversationMemory.embedding != None
        )
    ).first() or 0
    
    # Memory by role
    stmt_user = select(func.count(ConversationMemory.id)).where(
        ConversationMemory.message_role == "user"
    )
    user_messages = session.exec(stmt_user).first() or 0
    
    stmt_model = select(func.count(ConversationMemory.id)).where(
        ConversationMemory.message_role == "model"
    )
    model_messages = session.exec(stmt_model).first() or 0
    
    return {
        "total_memories": total_memories,
        "with_embeddings": with_embeddings,
        "without_embeddings": total_memories - with_embeddings,
        "user_messages": user_messages,
        "model_messages": model_messages,
        "timestamp": datetime.now().isoformat()
    }
