"""
Authentication and User Profile endpoints
"""
import os
import time
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlmodel import Session, select
from google.oauth2 import id_token
from google.auth.transport import requests as auth_requests

from database import get_session
from models import (
    Users, AiMates,
    AuthRequest, UserResponse, UserProfileUpdateRequest,
    GoogleLoginRequest
)

# Router setup
router = APIRouter(tags=["auth"])

# Dependency injection placeholder (will be set by main.py)
get_current_user = None

def current_user_dependency(
    authorization: str | None = Header(None),
    session: Session = Depends(get_session)
):
    """Dependency wrapper that calls the injected get_current_user function"""
    if get_current_user is None:
        raise HTTPException(status_code=500, detail="get_current_user not initialized")
    import asyncio
    return asyncio.run(get_current_user(authorization, session))

@router.post("/register", response_model=UserResponse)
def register_user(
    request_data: AuthRequest, 
    session: Session = Depends(get_session)
):
    """Register a new user"""
    # Check if username already exists
    existing_user = session.exec(
        select(Users).where(Users.username == request_data.username)
    ).first()
    
    if existing_user:
        raise HTTPException(status_code=400, detail="そのユーザー名はすでに使用されています")

    # Create new user
    new_user = Users(
        username=request_data.username,
        profile=f"わたしは {request_data.username} です。"
    )
    session.add(new_user)
    session.commit()
    session.refresh(new_user)
    
    return new_user

@router.post("/login", response_model=UserResponse)
def login_user(
    request_data: AuthRequest,
    session: Session = Depends(get_session)
):
    """User login (no password required)"""
    # Check if username is registered
    user = session.exec(
        select(Users).where(Users.username == request_data.username)
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="そのユーザー名は見つかりません")
    
    # Deleted users cannot login
    if user.is_deleted:
        raise HTTPException(status_code=403, detail="このアカウントは削除されています")

    return user

@router.post("/login/google")
def login_google(
    request_data: GoogleLoginRequest,
    session: Session = Depends(get_session)
):
    """Google OAuth login"""
    try:
        # Get Google Client ID from environment variable
        google_client_id = os.getenv("GOOGLE_CLIENT_ID")
        if not google_client_id:
            raise HTTPException(
                status_code=500, 
                detail="Google Client ID が設定されていません"
            )
        
        # Verify Google ID Token
        idinfo = id_token.verify_oauth2_token(
            request_data.id_token, 
            auth_requests.Request(), 
            google_client_id
        )
        
        # Extract required information from token
        google_id = idinfo.get("sub")  # Google's unique identifier
        email = idinfo.get("email")
        name = idinfo.get("name")
        
        if not email or not google_id:
            raise HTTPException(
                status_code=400, 
                detail="Google Token から email 取得できません"
            )
        
        # Use email as user ID
        user_id = email
        
        # Check for existing user (search by email)
        existing_user = session.exec(
            select(Users).where(Users.username == user_id)
        ).first()
        
        if existing_user:
            # If deleted user, reset is_deleted flag
            if existing_user.is_deleted:
                existing_user.is_deleted = False
                session.add(existing_user)
                session.commit()
                session.refresh(existing_user)
                # Treat deleted user recovery as first-time user
                return {
                    "id": existing_user.id,
                    "username": existing_user.username,
                    "display_name": existing_user.display_name,
                    "profile": existing_user.profile,
                    "is_new_user": True
                }
            
            # Return regular existing user
            return {
                "id": existing_user.id,
                "username": existing_user.username,
                "display_name": existing_user.display_name,
                "profile": existing_user.profile,
                "is_new_user": False
            }
        
        # Create new user
        is_new_user = True
        new_user = Users(
            username=user_id,  # Use email as username
            display_name=name or email.split("@")[0],  # Use Google name as display name
            profile=f"Googleアカウントでログインしました"
        )
        session.add(new_user)
        session.commit()
        session.refresh(new_user)
        
        return {
            "id": new_user.id,
            "username": new_user.username,
            "display_name": new_user.display_name,
            "profile": new_user.profile,
            "is_new_user": True
        }
        
    except ValueError as e:
        # Token verification error
        raise HTTPException(
            status_code=401, 
            detail=f"Google Token 検証に失敗しました: {str(e)}"
        )

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
    
    try:
        # Delete all user's AI mates (logical deletion)
        user_mates = session.exec(
            select(AiMates).where(AiMates.user_id == current_user.id)
        ).all()
        
        for mate in user_mates:
            mate.is_deleted = True
            session.add(mate)
        
        # Delete user (logical deletion)
        current_user.is_deleted = True
        
        # For Google users, mark username with "deleted_"
        # （username の unique 制約を避けるため、タイムスタンプを付ける）
        # メールアドレス形式（@を含む）= Google ユーザー
        if "@" in current_user.username:
            current_user.username = f"deleted_{current_user.username}_{int(time.time())}"
        
        session.add(current_user)
        session.commit()
        
        print("ユーザーを退会処理しました！さようなら～")
        return {
            "message": "ユーザーアカウントを削除しました。さようなら！",
            "status": "deleted"
        }
        
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=f"退会処理エラー: {str(e)}")
