"""
Authentication and User Profile endpoints
"""
import os
import time
from typing import Annotated, Optional
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlmodel import Session, select
# Google auth libraries are no longer needed here as auth is handled by Supabase

from database import get_session
from models import (
    Users, AiMates,
    UserResponse, UserProfileUpdateRequest
)
from utils.discord_logger import log_to_discord, log_error_to_discord, log_success_to_discord

# Router setup
router = APIRouter(tags=["auth"])

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

# User profile router
user_router = APIRouter(prefix="/users", tags=["users"])

@user_router.get("/me", response_model=UserResponse)
def get_my_profile(
    current_user: Users = Depends(current_user_dependency)
):
    """Get current user profile"""
    print(f"「{current_user.username}」のプロフィール情報を返（かえ）すよ！")
    return current_user

@user_router.put("/me", response_model=UserResponse)
def update_my_profile(
    request_data: UserProfileUpdateRequest,
    current_user: Users = Depends(current_user_dependency),
    session: Session = Depends(get_session)
):
    """Update profile (display name and profile)"""
    print(f"「{current_user.username}」のプロフィールを更新するよ！")
    
    # Update display_name
    if request_data.display_name is not None:
        current_user.display_name = request_data.display_name
    
    # Update profile
    if request_data.profile is not None:
        current_user.profile = request_data.profile
    
    # Save to database
    session.add(current_user)
    session.commit()
    session.refresh(current_user)
    
    print("プロフィールを更新したよ！ (o´∀`o)b")
    
    return current_user

@user_router.delete("/me")
def delete_user_account(
    current_user: Users = Depends(current_user_dependency),
    session: Session = Depends(get_session)
):
    """User account withdrawal (logical deletion)"""
    print(f"「{current_user.username}」のユーザーを退会処理するよ！")
    log_to_discord(f"🗑️ [API] 退会処理開始", {
        "user_id": current_user.id,
        "username": current_user.username,
        "supabase_uid": current_user.supabase_uid
    })
    
    try:
        # Delete all user's AI mates (logical deletion)
        user_mates = session.exec(
            select(AiMates).where(AiMates.user_id == current_user.id)
        ).all()
        
        log_to_discord(f"📋 [API] ユーザーのメイト数: {len(user_mates)}")
        
        for mate in user_mates:
            mate.is_deleted = True
            session.add(mate)
        
        log_success_to_discord(f"✅ [API] メイト削除完了: {len(user_mates)}件")
        
        # Delete user (logical deletion)
        current_user.is_deleted = True
        
        # Mark username with "deleted_" prefix and timestamp
        # （username の unique 制約を避けるため、タイムスタンプを付ける）
        # 50文字制限に収まるように調整
        old_username = current_user.username
        timestamp = int(time.time())
        # "deleted_" (8文字) + timestamp (10文字) = 18文字を確保
        max_username_length = 50 - 18
        truncated_username = old_username[:max_username_length]
        current_user.username = f"deleted_{timestamp}_{truncated_username}"
        log_to_discord(f"📝 [API] ユーザー名変更: {old_username} → {current_user.username}")
        
        session.add(current_user)
        session.commit()
        
        log_success_to_discord(f"✅ [API] 退会処理完了", {
            "user_id": current_user.id,
            "is_deleted": current_user.is_deleted
        })
        
        print("ユーザーを退会処理しました！さようなら～")
        return {
            "message": "ユーザーアカウントを削除しました。さようなら！",
            "status": "deleted"
        }
        
    except Exception as e:
        session.rollback()
        log_error_to_discord(f"🔴 [API] 退会処理エラー", e)
        raise HTTPException(status_code=500, detail=f"退会処理エラー: {str(e)}")

