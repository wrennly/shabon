# models.py
from sqlmodel import SQLModel, Field, Relationship, Column
from typing import List, Optional
from datetime import datetime
from pgvector.sqlalchemy import Vector

# ---
# m_attribute_options - Attribute choice master data
# ---
class AttributeOptionBase(SQLModel):
    option_value: str = Field(index=True)
    display_name: str
    prompt_snippet: Optional[str] = None
    attribute_id: int = Field(foreign_key="m_attributes.id")

class MAttributeOptions(AttributeOptionBase, table=True):
    __tablename__: str = "m_attribute_options"
    id: Optional[int] = Field(default=None, primary_key=True)
    attribute: "MAttributes" = Relationship(back_populates="options")

# ---
# m_attributes - Attribute master data
# ---
class AttributeBase(SQLModel):
    attribute_key: str = Field(unique=True, index=True)
    display_name: str
    attribute_type: str = Field(default="select")
    display_order: int = Field(default=99)
    category: Optional[str] = Field(default="その他")  # Category classification
    prompt_order: Optional[int] = Field(default=50)  # Prompt generation order

class MAttributes(AttributeBase, table=True):
    __tablename__: str = "m_attributes"
    id: Optional[int] = Field(default=None, primary_key=True)
    options: List[MAttributeOptions] = Relationship(back_populates="attribute")

# ---
# users - User accounts
# ---
class UserBase(SQLModel):
    username: Optional[str] = Field(default=None, unique=True, index=True)  # Unique user identifier (Legacy or Display ID)
    supabase_uid: str = Field(unique=True, index=True)  # Supabase Auth User ID (UUID)
    display_name: Optional[str] = None  # Display name (editable)
    profile: Optional[str] = None

class Users(UserBase, table=True):
    __tablename__: str = "users"
    id: Optional[int] = Field(default=None, primary_key=True)
    is_deleted: bool = Field(default=False, index=True)  # Logical deletion flag
    ai_mates: List["AiMates"] = Relationship(back_populates="user")

# ---
# character_settings (「魂」の核心・設定値)
# ---
class MateSettingBase(SQLModel):
    custom_value: Optional[str] = None
    
    # Parent reference
    mate_id: int = Field(foreign_key="ai_mates.id")
    attribute_id: int = Field(foreign_key="m_attributes.id")
    option_id: Optional[int] = Field(default=None, foreign_key="m_attribute_options.id")

class MateSettings(MateSettingBase, table=True):
    __tablename__: str = "mate_settings"
    id: Optional[int] = Field(default=None, primary_key=True)
    mate: "AiMates" = Relationship(back_populates="settings")
    attribute: MAttributes = Relationship()
    option: Optional[MAttributeOptions] = Relationship()

# ---
# ai_mates - AI mate characters
# ---
class AiMateBase(SQLModel):
    mate_name: str
    mate_id: Optional[str] = Field(default=None, unique=True, index=True)  # Unique search ID
    base_prompt: Optional[str] = None  # User's raw prompt (processed before saving)
    user_id: int = Field(foreign_key="users.id")
    is_public: bool = Field(default=False, index=True)
    is_deleted: bool = Field(default=False, index=True)  # Logical deletion flag
    image_url: Optional[str] = None  # Supabase Storage URL for mate image

class AiMates(AiMateBase, table=True):
    __tablename__: str = "ai_mates"
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    user: Users = Relationship(back_populates="ai_mates")
    
    # Reference to character settings
    settings: List[MateSettings] = Relationship(back_populates="mate")

# ---
# chat_history - Chat message logs
# ---
class ChatHistoryBase(SQLModel):
    role: str
    message_text: str
    mate_id: int = Field(foreign_key="ai_mates.id", index=True)
    user_id: int = Field(foreign_key="users.id", index=True)

class ChatHistory(ChatHistoryBase, table=True):
    __tablename__: str = "chat_history"
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: Optional[datetime] = Field(
        default_factory=datetime.utcnow,
        index=True
    )

# Chat history response for /chat/history/ endpoint
class ChatHistoryResponse(SQLModel):
    id: int
    role: str
    message_text: str
    created_at: datetime

# ---
# conversation_memory - RAG用の会話記憶ベクトル保存
# ---
class ConversationMemoryBase(SQLModel):
    mate_id: int = Field(foreign_key="ai_mates.id", index=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    original_message: str  # 元のメッセージ（検索用）
    message_role: str  # "user" or "model"
    is_summary: bool = Field(default=False, index=True)  # 要約フラグ
    summary: Optional[str] = None  # AI生成要約（要約ベースの記憶の場合）
    
class ConversationMemory(ConversationMemoryBase, table=True):
    __tablename__: str = "conversation_memory"
    id: Optional[int] = Field(default=None, primary_key=True)
    embedding: Optional[List[float]] = Field(default=None, sa_column=Column(Vector(768)))
    embedded_at: Optional[datetime] = Field(default_factory=datetime.utcnow, index=True)
    mate: "AiMates" = Relationship()
    user: Users = Relationship()

# Settings schema response for /settings/schema endpoint
# Option value in response
class AttributeOptionResponse(SQLModel):
    value: str        # Mapped from option_value field
    display_name: str

# Nested attribute response structure
class AttributeSchemaResponse(SQLModel):
    key: str          # Mapped from attribute_key
    display_name: str
    type: str         # Mapped from attribute_type
    display_order: int
    category: Optional[str] = None  # Attribute category
    options: List[AttributeOptionResponse] # Available options

# Root settings schema response
class SettingsSchemaResponse(SQLModel):
    attributes: List[AttributeSchemaResponse]

# Setting item structure from React
class SettingInput(SQLModel):
    key: str   # Attribute key (e.g., "mbti")
    value: str # Attribute value (e.g., "INFP")

# Mate creation request from React
class MateCreateRequest(SQLModel):
    mate_name: str
    mate_id: Optional[str] = None  # Custom mate ID (auto-generated if not provided)
    settings: List[SettingInput]
    is_public: bool = Field(default=False)

class MatePublicRequest(SQLModel):
    """Request to toggle mate's public/private status"""
    is_public: bool

# Chat request structure from React
# Single message in conversation
class ChatMessage(SQLModel):
    role: str  # "user" or "model"
    text: str  # Message content

class ChatRequest(SQLModel):
    mate_id: int             # Mate ID to chat with
    new_message: str              # New message text
    history: List[ChatMessage] = [] # Conversation history

# Chat response sent to React
class ChatResponse(SQLModel):
    reply_text: str # AI reply message

class MateInfoResponse(SQLModel):
    id: int
    mate_name: str
    mate_id: Optional[str] = None  # Search ID
    last_message: Optional[str] = None
    profile_preview: Optional[str] = None  # Brief profile
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class MateEditDetailResponse(SQLModel):
    mate_name: str
    mate_id: Optional[str] = None  # Unique mate ID
    base_prompt: Optional[str] = None  # User's raw prompt
    is_public: bool
    settings: List[SettingInput]
class UserProfileUpdateRequest(SQLModel):
    """Request to update user profile"""
    display_name: Optional[str] = None
    profile: Optional[str] = None

class UserResponse(SQLModel):
    id: int
    username: str  # Unique username
    display_name: Optional[str] = None  # Display name
    profile: Optional[str] = None

# Batch API models
class BatchMateRequest(SQLModel):
    """Request for batch mate details"""
    mate_ids: List[int] = Field(..., description="List of mate IDs to fetch (max 50)")
    
    class Config:
        json_schema_extra = {
            "example": {
                "mate_ids": [1, 2, 3, 4, 5]
            }
        }

class BatchMateDetailsResponse(SQLModel):
    """Batch response with mate details and settings"""
    id: int
    mate_name: str
    mate_id: Optional[str] = None
    is_public: bool
    user_id: int
    base_prompt: Optional[str] = None
    settings: List["SettingInput"] = []

class BatchMateResponseWrapper(SQLModel):
    """Wrapper for batch API response"""
    success_count: int
    failed_count: int
    total_requested: int
    mates: List[BatchMateDetailsResponse]
    failed_ids: List[int] = []

# Chat Search models
class ChatSearchResult(SQLModel):
    """Individual chat search result"""
    id: int
    mate_id: int
    mate_name: str
    role: str
    message_text: str
    created_at: datetime
    excerpt: Optional[str] = None  # 検索語を含む抜粋

class ChatSearchResponse(SQLModel):
    """Wrapper for chat search response"""
    query: str
    total_results: int
    mate_id: Optional[int] = None  # フィルタ対象のmate_id
    results: List[ChatSearchResult]
    search_time_ms: float  # 検索にかかった時間
