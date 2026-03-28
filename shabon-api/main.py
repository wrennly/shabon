# main.py

from fastapi import FastAPI, Depends, HTTPException, status, Header, Query
from sqlmodel import Session, select, SQLModel
from typing import List, Annotated, Optional, Dict, Any
import os
import secrets
import json
import logging
from datetime import datetime, timedelta
from dotenv import load_dotenv
import google.generativeai as genai
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
from fastapi.exceptions import HTTPException
from sqlalchemy.orm import joinedload
from sqlalchemy import or_, desc, func
from database import get_session
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os as os_module
from google.auth.transport import requests as auth_requests
from google.oauth2 import id_token
from functools import lru_cache
import redis
from redis import Redis
import jwt

# ロギング設定
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

from models import (
    MAttributes, MAttributeOptions, 
    SettingsSchemaResponse, AttributeSchemaResponse, AttributeOptionResponse,
    Users, AiMates, MateSettings, MAttributes, MAttributeOptions,
    MateCreateRequest, ChatRequest, ChatResponse, ChatMessage,
    SettingInput, MateInfoResponse, MateEditDetailResponse, ChatHistory, ChatHistoryResponse,
    UserResponse, BatchMateRequest, BatchMateDetailsResponse,
    BatchMateResponseWrapper, ConversationMemory, ChatSearchResult, ChatSearchResponse
)
from settings import (
    RAG_HISTORY_LIMIT,
    RAG_SUMMARY_INTERVAL,
    RAG_RETRIEVAL_LIMIT,
    RAG_MEMORY_CONTEXT_LIMIT,
    RAG_SIMILARITY_THRESHOLD,
    SUMMARY_LENGTH,
    SUMMARY_CATEGORIES
)
import numpy as np

# Import utility modules
from utils.cache import (
    get_attributes_cache,
    clear_attributes_cache,
    get_cached_query_result,
    set_cached_query_result,
    clear_query_cache,
    _make_query_cache_key,
    PUBLIC_MATES_CACHE_TTL,
    REDIS_ENABLED,
    redis_client,
    CACHE_TTL_SECONDS,
    _attribute_cache
)
from utils.rag import (
    get_embedding,
    generate_conversation_summary,
    save_memory_with_embedding,
    calculate_cosine_similarity,
    retrieve_relevant_memories,
    search_chat_history,
    format_chat_excerpt,
    set_gemini_model
)
from utils.discord_logger import measure_performance
import time

# DATABASE_URLはログに出力しない（セキュリティリスク）
logger.info("Database connection initialized")

# ---
# ---
# RAG (Retrieval Augmented Generation) 関連設定
# ---
# 設定は settings.py で管理しています
# 関数実装は utils/cache.py と utils/rag.py に移動しました

# Pydantic models for requests/responses

class MatePublicRequest(BaseModel):
    is_public: bool

class UserProfileUpdateRequest(SQLModel):
    display_name: Optional[str] = None  # Display name (editable)
    profile: Optional[str] = None

# Load environment variables from .env file
load_dotenv()

# Supabase JWT secret for verifying access tokens
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")
if not SUPABASE_JWT_SECRET:
    raise ValueError("SUPABASE_JWT_SECRET が設定されていません")

app = FastAPI()

@app.middleware("http")
async def log_request_origin(request, call_next):
    # OriginヘッダーはログレベルDEBUGで記録（本番では出力されない）
    origin = request.headers.get("origin")
    if origin:
        logger.debug(f"Request Origin: {origin}")
    response = await call_next(request)
    return response

# Import routers
from routers.chat import router as chat_router, debug_router, set_model as set_chat_model

# Sentry initialization
sentry_dsn = os.environ.get("SENTRY_DSN", "")
if sentry_dsn:
    sentry_sdk.init(
        dsn=sentry_dsn,
        integrations=[
            FastApiIntegration(),
            SqlalchemyIntegration(),
        ],
        traces_sample_rate=0.1,
        environment=os.environ.get("ENVIRONMENT", "development"),
    )

# CORS configuration
frontend_url = os.environ.get("FRONTEND_URL", "")
environment = os.environ.get("ENVIRONMENT", "development")

if environment == "development":
    # ローカル開発では Origin を問わず許可（フロントのポートやドメイン変更に強くする）
    origins = []
    origin_regex = r".*"
else:
    # 本番などでは従来どおり、特定のオリジンのみ許可
    origins = [
        frontend_url,
        "http://localhost:3000",
        "http://localhost:8081",  # Expo default port
        "http://192.168.10.104:8081", # Local network Expo
        "https://.*\.exp\.direct",
        "https://dashboard.uptimerobot.com"
    ]
    origin_regex = r"https://.*\.exp\.direct"

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    allow_origin_regex=origin_regex,
)

@app.get("/check_env")
def check_environment_variables():
    """環境変数の確認エンドポイント"""
    url = os.environ.get("FRONTEND_URL", "設定されていません")
    return {
        "message": "CORS許可状況の確認",
        "allowed_frontend_url": url 
    }

# Generate unique mate_id
def generate_mate_id(session: Session) -> str:
    """Generate unique mate_id"""
    while True:
        # Generate random 8-character alphanumeric string
        mate_id = secrets.token_urlsafe(6)[:8].lower().replace('-', '').replace('_', '')
        # Check if mate_id already exists
        existing = session.exec(
            select(AiMates).where(AiMates.mate_id == mate_id)
        ).first()
        if not existing:
            return mate_id

# Authentication: Get user from Authorization header (Supabase JWT)
async def get_current_user(
    authorization: Optional[str] = Header(None),
    session: Session = Depends(get_session)
) -> Users:
    """Verify authenticated user from Supabase JWT in Authorization header"""

    # Authorizationヘッダーはログに出力しない（セキュリティリスク）
    
    if authorization is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="認証情報がありません",
        )

    # Parse Authorization: "Bearer <jwt>" format
    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise ValueError()
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization形式が正しくありません (Bearer <token>)",
        )

    # Decode Supabase JWT
    try:
        with measure_performance("Supabase: JWT検証"):
            payload = jwt.decode(
                token,
                SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                audience="authenticated",
            )
        # JWTペイロードはログに出力しない（個人情報含む可能性）
        logger.debug("JWT validation successful")
    except jwt.ExpiredSignatureError as e:
        logger.warning("JWT expired")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="アクセストークンの有効期限が切れています",
        )
    except jwt.InvalidTokenError as e:
        logger.warning("JWT invalid")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="アクセストークンが無効です",
        )

    supabase_uid = payload.get("sub")
    if not supabase_uid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="トークンにユーザーIDが含まれていません",
        )

    email = payload.get("email")
    user_metadata = payload.get("user_metadata") or {}
    display_name = user_metadata.get("full_name") or email

    # Find or create local user linked to Supabase UID
    with measure_performance("Supabase: ユーザー検索/作成"):
        user = session.exec(select(Users).where(Users.supabase_uid == supabase_uid)).first()

        if not user:
            # 新規ユーザー作成（created_atとlast_login_atは自動設定）
            user = Users(
                supabase_uid=supabase_uid,
                username=email or supabase_uid,
                display_name=display_name,
            )
            session.add(user)
            session.commit()
            session.refresh(user)

    # Reactivate deleted users on re-login
    if user.is_deleted:
        logger.info(f"Reactivating deleted user: {user.id}")  # usernameではなくIDのみログ
        user.is_deleted = False
        # Restore username if it was modified during deletion
        if user.username.startswith("deleted_"):
            user.username = email or supabase_uid
        # Clear display_name to trigger onboarding again
        user.display_name = None
        session.add(user)
        session.commit()
        session.refresh(user)
    
    # 最終ログイン日を更新
    user.last_login_at = datetime.utcnow()
    session.add(user)
    session.commit()
    session.refresh(user)

    return user

@app.get(
    "/settings/schema", 
    response_model=SettingsSchemaResponse
)
async def get_settings_schema(session: Session = Depends(get_session)):
    """Get attribute schema with caching"""
    
    # Use cache for attribute master data
    attributes_from_db = get_attributes_cache(session)
    
    # Convert to response format
    response_attributes: List[AttributeSchemaResponse] = []
    for attr in attributes_from_db:
        response_options: List[AttributeOptionResponse] = [
            AttributeOptionResponse(
                value=opt.option_value,
                display_name=opt.display_name
            )
            for opt in attr.options
        ]
        
        response_attributes.append(
            AttributeSchemaResponse(
                key=attr.attribute_key,
                display_name=attr.display_name,
                type=attr.attribute_type,
                display_order=attr.display_order,
                category=attr.category,
                options=response_options
            )
        )
    
    return SettingsSchemaResponse(attributes=response_attributes)

# チャットAPI
# AI Provider設定
from settings import AI_PROVIDER, DEEPSEEK_MODEL, DEEPSEEK_BASE_URL

if AI_PROVIDER == "gemini":
    # Gemini API 設定
    GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY')
    if not GOOGLE_API_KEY:
        raise ValueError("GOOGLE_API_KEY が設定されていません")
    
    # Set the API key for Gemini (google.generativeai)
    os.environ["GOOGLE_API_KEY"] = GOOGLE_API_KEY
    
    # モデル設定
    generation_config = {
        "temperature": 0.7,
        "top_p": 1,
        "top_k": 1,
        "max_output_tokens": 1024,
    }
    model = genai.GenerativeModel( # type: ignore
        model_name="models/gemini-flash-latest",
        generation_config=generation_config # type: ignore
    )
    
    # Set Gemini model for RAG utilities
    set_gemini_model(model)
    
    # Set Gemini model for chat router
    set_chat_model(model)
    
    logger.info("✅ Using Gemini Flash for AI chat")

elif AI_PROVIDER == "deepseek":
    # DeepSeek API 設定
    from utils.deepseek_client import DeepSeekClient
    
    DEEPSEEK_API_KEY = os.getenv('DEEPSEEK_API_KEY')
    if not DEEPSEEK_API_KEY:
        raise ValueError("DEEPSEEK_API_KEY が設定されていません")
    
    deepseek_client = DeepSeekClient(
        api_key=DEEPSEEK_API_KEY,
        base_url=DEEPSEEK_BASE_URL
    )
    
    # Set DeepSeek client for chat router
    set_chat_model(deepseek_client)
    
    logger.info("✅ Using DeepSeek v3 for AI chat")

else:
    raise ValueError(f"Unknown AI_PROVIDER: {AI_PROVIDER}")

# Include routers
# Note: get_current_user must be accessible to routers
from routers import chat as chat_module
from routers import mates as mates_module
from routers import auth as auth_module
from routers import admin as admin_module

chat_module.get_current_user = get_current_user  # Inject dependency
mates_module.get_current_user = get_current_user  # Inject dependency
auth_module.get_current_user = get_current_user  # Inject dependency
admin_module.get_current_user = get_current_user  # Inject dependency

app.include_router(chat_router)
app.include_router(debug_router)
app.include_router(mates_module.router)
app.include_router(auth_module.router)
app.include_router(auth_module.user_router)
app.include_router(admin_module.router)

# ---
# Endpoints below are kept in main.py for now
# (will be moved to respective routers in future phases)
# ---

@app.get(
    "/chat/history/{mate_id}", 
    response_model=List[ChatHistoryResponse]
)
def get_chat_history(
    mate_id: int,
    current_user: Users = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Get chat history - optimized query"""
    
    # Verify mate exists and belongs to user (implicit through history)
    history_logs = session.exec(
        select(ChatHistory)
        .where(
            ChatHistory.mate_id == mate_id,
            ChatHistory.user_id == current_user.id 
        )
        .order_by(ChatHistory.created_at.asc())
    ).all()
    
    # Convert to response format efficiently
    response_list = [
        ChatHistoryResponse(
            id=log.id or 0,
            role=log.role,
            message_text=log.message_text,
            created_at=log.created_at or datetime.now()
        )
        for log in history_logs
    ]
        
    return response_list

@app.api_route("/health-check", methods=["GET", "HEAD"])
def health_check(session: Session = Depends(get_session)):
    """
    Health check endpoint for monitoring service availability.
    Used by GitHub Actions and Uptime Robot to prevent server sleep.
    """
    try:
        # Test database connectivity
        db_result = session.exec(select(1)).first()
        
        if db_result != 1:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Database check failed"
            )

        return {"status": "ok", "db_check": "ok"}

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Database is down: {str(e)}"
        )

@app.get("/")
def read_root():
    return {"message": "API is running"}



