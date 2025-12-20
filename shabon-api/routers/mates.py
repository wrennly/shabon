"""
Mate (AIキャラクター) 関連のエンドポイント
"""
from typing import List, Optional, Dict
from datetime import datetime
import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, Header, status, UploadFile, File
from sqlmodel import Session, select, func, or_
from sqlalchemy.orm import joinedload
from supabase import create_client, Client

from database import get_session
from models import (
    Users, AiMates, MateSettings, MAttributes, MAttributeOptions,
    ChatHistory,
    MateCreateRequest, MateInfoResponse, MateEditDetailResponse,
    SettingInput, MatePublicRequest,
    BatchMateRequest, BatchMateDetailsResponse, BatchMateResponseWrapper,
    ChatHistoryResponse
)
from utils.cache import (
    get_attributes_cache,
    get_cached_query_result, set_cached_query_result,
    PUBLIC_MATES_CACHE_TTL
)

# Router setup
router = APIRouter(prefix="/mates", tags=["mates"])

# Dependency injection placeholder (will be set by main.py)
get_current_user = None

# Supabase client setup
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")  # Service role key for admin operations
supabase: Client = None
if SUPABASE_URL and SUPABASE_SERVICE_KEY:
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async def current_user_dependency(
    authorization: Optional[str] = Header(None),
    session: Session = Depends(get_session)
):
    """Dependency wrapper that calls the injected get_current_user function"""
    if get_current_user is None:
        raise HTTPException(status_code=500, detail="get_current_user not initialized")
    return await get_current_user(authorization, session)

def _make_query_cache_key(*args) -> str:
    """クエリキャッシュキー生成"""
    return ":".join(str(arg) for arg in args)

def generate_mate_id(session: Session) -> str:
    """Generate unique mate_id"""
    import random
    import string
    
    while True:
        mate_id = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
        existing = session.exec(
            select(AiMates).where(AiMates.mate_id == mate_id)
        ).first()
        if not existing:
            return mate_id

@router.post("/")
def create_mate(
    request_data: MateCreateRequest, 
    current_user: Users = Depends(current_user_dependency),
    session: Session = Depends(get_session)
):
    """新しいキャラクターを作成"""
    # Ensure user has a valid ID
    if current_user.id is None:
        raise HTTPException(status_code=400, detail="ユーザーIDが無効です")
    
    try:
        # mate_idを生成または検証
        if request_data.mate_id:
            # カスタムmate_idが指定された場合は重複チェック
            existing = session.exec(
                select(AiMates).where(AiMates.mate_id == request_data.mate_id)
            ).first()
            if existing:
                raise HTTPException(status_code=400, detail="このメイトIDは既に使用されています")
            mate_id = request_data.mate_id
        else:
            # 指定がなければ自動生成
            mate_id = generate_mate_id(session)
        
        # settingsからbase_promptを自動生成
        from utils.prompts import normalize_base_prompt, build_attribute_prompt
        
        # Get all attributes with type and display_name
        attributes = session.exec(select(MAttributes)).all()
        attributes_data = [
            {
                'attribute_key': attr.attribute_key,
                'attribute_type': attr.attribute_type,
                'display_name': attr.display_name,
                'prompt_order': attr.prompt_order
            }
            for attr in attributes
        ]
        
        # Convert settings to the format needed for build_attribute_prompt
        settings_for_prompt = []
        for setting in request_data.settings:
            attr = session.exec(
                select(MAttributes).where(MAttributes.attribute_key == setting.key)
            ).first()
            if not attr:
                continue
                
            setting_dict = {
                'attribute_key': setting.key,
                'custom_value': None,
                'option_value': None,
                'prompt_snippet': None
            }
            
            if attr.attribute_type == 'select':
                # Get option display_name and prompt_snippet
                opt = session.exec(
                    select(MAttributeOptions).where(
                        MAttributeOptions.attribute_id == attr.id,
                        MAttributeOptions.option_value == setting.value
                    )
                ).first()
                if opt:
                    setting_dict['option_value'] = opt.display_name
                    setting_dict['prompt_snippet'] = opt.prompt_snippet
            else:
                setting_dict['custom_value'] = setting.value
            
            settings_for_prompt.append(setting_dict)
        
        # Generate base_prompt from attributes
        generated_prompt = build_attribute_prompt(settings_for_prompt, attributes_data)
        normalized_prompt = normalize_base_prompt(generated_prompt) if generated_prompt else None
        
        new_mate = AiMates(
            mate_name=request_data.mate_name,
            mate_id=mate_id,
            base_prompt=normalized_prompt,
            user_id=current_user.id,
            is_public=request_data.is_public
        )

        session.add(new_mate)
        session.commit()
        session.refresh(new_mate) # new_mate.id を DB から再読み込み
        
        # Ensure mate has a valid ID before proceeding
        if new_mate.id is None:
            raise HTTPException(status_code=500, detail="キャラクターIDの生成に失敗しました")
        
        # --- (3) 「魂の設計図 (settings)」を「縦持ち」で INSERT ---
        for setting in request_data.settings:
            # (a) key ("mbti") から attribute_id を DB から引く
            attr = session.exec(
                select(MAttributes).where(MAttributes.attribute_key == setting.key)
            ).first()
            if not attr:
                raise HTTPException(status_code=400, detail=f"属性キー {setting.key} がマスターにないよ")
            
            option_id = None
            custom_value = None
            
            if attr.attribute_type == 'select':
                # (b) "select" なら、value ("INFP") から option_id を DB から引く
                opt = session.exec(
                    select(MAttributeOptions).where(
                        MAttributeOptions.attribute_id == attr.id,
                        MAttributeOptions.option_value == setting.value
                    )
                ).first()
                if not opt:
                    raise HTTPException(status_code=400, detail=f"選択肢 {setting.value} がマスターにないよ")
                
                option_id = opt.id
            
            elif attr.attribute_type in ('text', 'textarea'):
                # (c) "text" or "textarea" なら、custom_value にそのまま保存
                custom_value = setting.value

            # (d) mate_settings テーブルに INSERT！
            if attr.id is None:
                raise HTTPException(status_code=500, detail=f"属性 {setting.key} のIDが不正です")
            
            new_setting = MateSettings(
                mate_id=new_mate.id,
                attribute_id=attr.id,
                option_id=option_id,
                custom_value=custom_value
            )
            session.add(new_setting)

        # Commit all settings
        session.commit()
        session.refresh(new_mate)
        
        return new_mate 
    
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=f"DB保存エラー: {str(e)}")

@router.get("/", response_model=List[MateInfoResponse])
def get_my_mates(
    current_user: Users = Depends(current_user_dependency), 
    session: Session = Depends(get_session),
    filter_type: Optional[str] = Query(None, alias="filter"),
    skip: int = Query(0, ge=0, description="Skip N mates"),
    limit: int = Query(20, ge=1, le=100, description="Limit results to N mates")
):
    """Get user's mate list with pagination"""
    
    # Refresh session to get latest data
    session.expunge_all()
    
    # Determine which mates to fetch based on filter
    if filter_type == 'created_only':
        statement = (
            select(AiMates)
            .where(
                AiMates.user_id == current_user.id,
                AiMates.is_deleted == False
            )
            .order_by(AiMates.id.desc())
        )
    
    elif filter_type == 'chatted_only':
        # Get mates user has chatted with, ordered by latest chat timestamp
        # Subquery to get the latest chat timestamp for each mate
        latest_chat_subquery = (
            select(
                ChatHistory.mate_id,
                func.max(ChatHistory.created_at).label('latest_chat_time')
            )
            .where(ChatHistory.user_id == current_user.id)
            .group_by(ChatHistory.mate_id)
            .subquery()
        )
        
        # Join with AiMates and order by latest chat time
        # Include both owned mates and public mates
        statement = (
            select(AiMates)
            .join(latest_chat_subquery, AiMates.id == latest_chat_subquery.c.mate_id)
            .where(
                AiMates.is_deleted == False,
                or_(
                    AiMates.user_id == current_user.id,
                    AiMates.is_public == True
                )
            )
            .order_by(latest_chat_subquery.c.latest_chat_time.desc())
        )
        
        print(f"🔍 DEBUG: User {current_user.id} querying chatted mates (ordered by latest chat)...")
    
    else:
        # Get both created and chatted mates
        chatted_mate_ids = session.exec(
            select(ChatHistory.mate_id)
            .where(ChatHistory.user_id == current_user.id)
            .distinct()
        ).all()
        
        statement = (
            select(AiMates)
            .where(
                or_(
                    AiMates.user_id == current_user.id,
                    AiMates.id.in_(chatted_mate_ids)
                ),
                AiMates.is_deleted == False
            )
            .order_by(AiMates.id.desc())
        )
    
    # Apply pagination
    statement = statement.offset(skip).limit(limit)
    mates = session.exec(statement).all()
    
    # Debug: Log fetched mates
    print(f"📋 Fetched {len(mates)} mates for user {current_user.id}")
    
    # Get latest chat for each mate in a single query (not N+1)
    mate_ids = [m.id for m in mates]
    latest_chats = {}
    latest_chat_times = {}
    if mate_ids:
        subquery = (
            select(
                ChatHistory.mate_id,
                func.max(ChatHistory.id).label('max_id')
            )
            .where(ChatHistory.user_id == current_user.id)
            .group_by(ChatHistory.mate_id)
            .subquery()
        )
        
        latest = session.exec(
            select(ChatHistory)
            .join(subquery, ChatHistory.id == subquery.c.max_id)
            .where(ChatHistory.mate_id.in_(mate_ids))
        ).all()
        
        print(f"📝 Found {len(latest)} latest chats for mates")
        
        for chat in latest:
            latest_chats[chat.mate_id] = chat.message_text
            latest_chat_times[chat.mate_id] = chat.created_at
    
    # Build response
    response_list = [
        MateInfoResponse(
            id=mate.id,
            mate_name=mate.mate_name,
            mate_id=mate.mate_id,
            created_at=mate.created_at,
            updated_at=mate.updated_at,
            last_message=latest_chats.get(mate.id),
            last_chat_time=latest_chat_times.get(mate.id),
            image_url=mate.image_url
        )
        for mate in mates
    ]
    
    # Sort by last_chat_time if chatted_only filter is used
    if filter_type == 'chatted_only':
        response_list.sort(key=lambda x: x.last_chat_time or datetime.min, reverse=True)
    
    return response_list

@router.get("/public", response_model=List[MateInfoResponse])
def get_public_mates(
    session: Session = Depends(get_session),
    skip: int = Query(0, ge=0, description="Skip N mates"),
    limit: int = Query(20, ge=1, le=100, description="Limit results to N mates")
):
    """Get all public AI mates with pagination and query caching"""
    
    # Check cache first
    cache_key = _make_query_cache_key("public_mates", skip, limit)
    cached_result = get_cached_query_result(cache_key, PUBLIC_MATES_CACHE_TTL)
    
    if cached_result is not None:
        print(f"📊 Using cached result for public_mates (skip={skip}, limit={limit})")
        return [
            MateInfoResponse(
                id=item["id"],
                mate_name=item["mate_name"],
                mate_id=item["mate_id"],
                created_at=item.get("created_at"),
                updated_at=item.get("updated_at"),
                profile_preview=item.get("profile_preview"),
                image_url=item.get("image_url")
            )
            for item in cached_result
        ]
    
    print(f"📊 Cache miss for public_mates - fetching from DB")
    
    # Fetch public mates with pagination, ordered by conversation count (popularity)
    # サブクエリで各メイトの会話数をカウント
    conversation_count = (
        select(
            ChatHistory.mate_id,
            func.count(ChatHistory.id).label('conversation_count')
        )
        .group_by(ChatHistory.mate_id)
        .subquery()
    )
    
    public_mates = session.exec(
        select(AiMates)
        .outerjoin(conversation_count, AiMates.id == conversation_count.c.mate_id)
        .where(
            AiMates.is_public == True,
            AiMates.is_deleted == False
        )
        .order_by(
            func.coalesce(conversation_count.c.conversation_count, 0).desc(),  # 会話数が多い順
            AiMates.id.desc()  # 同じ会話数なら新しい順
        )
        .offset(skip)
        .limit(limit)
    ).all()
    
    if not public_mates:
        return []

    # Fetch all settings for these mates in a single query
    mate_ids = [m.id for m in public_mates]
    all_settings = session.exec(
        select(MateSettings)
        .where(MateSettings.mate_id.in_(mate_ids))
        .options(
            joinedload(MateSettings.attribute),
            joinedload(MateSettings.option)
        )
    ).all()
    
    # Group settings by mate_id
    settings_by_mate: Dict[int, List[MateSettings]] = {}
    for setting in all_settings:
        if setting.mate_id not in settings_by_mate:
            settings_by_mate[setting.mate_id] = []
        settings_by_mate[setting.mate_id].append(setting)
    
    # Build response list
    response_list = []
    for mate in public_mates:
        profile_parts = []
        
        # Get profile from cached attributes
        attribute_key_map = {attr.id: attr for attr in get_attributes_cache(session)}
        
        for setting in settings_by_mate.get(mate.id, []):
            if setting.attribute and setting.attribute.attribute_key in ['personality', 'tone', 'hobby', 'age']:
                if setting.option and hasattr(setting.option, 'display_name'):
                    profile_parts.append(setting.option.display_name)
                elif setting.custom_value:
                    profile_parts.append(setting.custom_value[:20])
        
        profile_preview = ' / '.join(profile_parts[:3]) if profile_parts else None
        
        response_list.append(
            MateInfoResponse(
                id=mate.id,
                mate_name=mate.mate_name,
                mate_id=mate.mate_id,
                created_at=mate.created_at,
                updated_at=mate.updated_at,
                profile_preview=profile_preview,
                image_url=mate.image_url
            )
        )
    
    # Cache the result
    cache_data = [
        {
            "id": item.id,
            "mate_name": item.mate_name,
            "mate_id": item.mate_id,
            "created_at": item.created_at.isoformat() if item.created_at else None,
            "updated_at": item.updated_at.isoformat() if item.updated_at else None,
            "profile_preview": item.profile_preview,
            "image_url": item.image_url
        }
        for item in response_list
    ]
    set_cached_query_result(cache_key, cache_data, PUBLIC_MATES_CACHE_TTL)
    
    return response_list

@router.get("/{mate_id}/details", response_model=MateEditDetailResponse)
def get_mate_details(
    mate_id: int,
    current_user: Users = Depends(current_user_dependency),
    session: Session = Depends(get_session)
):
    """Get mate settings with eager loading"""
    
    # Fetch mate with related settings
    mate = session.get(AiMates, mate_id)
    if not mate:
        raise HTTPException(status_code=404, detail="Mate not found")
    if mate.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Cannot edit other users' mates")
    if mate.is_deleted:
        raise HTTPException(status_code=404, detail="Mate has been deleted")

    # Fetch all settings at once with eager loading
    db_settings = session.exec(
        select(MateSettings)
        .where(MateSettings.mate_id == mate_id)
        .options(
            joinedload(MateSettings.attribute),
            joinedload(MateSettings.option)
        )
    ).all()

    # Convert to settings payload
    settings_payload: List[SettingInput] = []
    for setting in db_settings:
        if not setting.attribute:
            continue
            
        key = setting.attribute.attribute_key
        value = setting.custom_value if setting.custom_value is not None else (
            setting.option.option_value if setting.option else None
        )
        
        if value is not None:
            settings_payload.append(SettingInput(key=key, value=value))

    return MateEditDetailResponse(
        mate_name=mate.mate_name,
        mate_id=mate.mate_id,
        base_prompt=mate.base_prompt,
        is_public=mate.is_public,
        image_url=mate.image_url,
        settings=settings_payload
    )

@router.get("/public-details/{mate_id}")
def get_public_character_details(
    mate_id: int,
    session: Session = Depends(get_session)
):
    """公開メイトの詳細情報を取得（認証不要）"""
    
    print(f"DEBUG: /public-details called with mate_id={mate_id}")
    
    mate = session.get(AiMates, mate_id)
    print(f"DEBUG: mate found: {mate}")
    
    if not mate:
        print(f"DEBUG: mate not found, raising 404")
        raise HTTPException(status_code=404, detail="そのメイトは見つかりません")
    if mate.is_deleted:
        raise HTTPException(status_code=404, detail="このメイトは削除されています")
    if not mate.is_public:
        print(f"DEBUG: mate is not public, raising 403")
        raise HTTPException(status_code=403, detail="このメイトは公開されていません")
    
    print(f"DEBUG: returning mate details: {mate.mate_name}")
    return {
        "mate_name": mate.mate_name,
        "is_public": mate.is_public,
        "image_url": mate.image_url,
        "id": mate.id
    }

@router.put("/{mate_id}", response_model=MateInfoResponse)
def update_mate(
    mate_id: int,
    request_data: MateCreateRequest, # (「作る」ときと「同じ設計図」を受け取る！)
    current_user: Users = Depends(current_user_dependency),
    session: Session = Depends(get_session)
):

    # 1. AIの「魂の箱」をチェック
    mate = session.get(AiMates, mate_id)
    if not mate:
        raise HTTPException(status_code=404, detail="そのAIキャラは見つからないよ")
    if mate.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="他人のAIキャラは編集できないよ")
    if mate.is_deleted:
        raise HTTPException(status_code=404, detail="このメイトは削除されています")

    # (トランザクション開始！)
    try:
        # 2. 「魂の箱」の基本情報を UPDATE
        mate.mate_name = request_data.mate_name
        mate.is_public = request_data.is_public
        mate.updated_at = datetime.now()  # 更新日時を記録
        
        # mate_idの更新（指定がある場合）
        if request_data.mate_id and request_data.mate_id != mate.mate_id:
            # 重複チェック
            existing = session.exec(
                select(AiMates).where(
                    AiMates.mate_id == request_data.mate_id,
                    AiMates.id != mate_id
                )
            ).first()
            if existing:
                raise HTTPException(status_code=400, detail="このメイトIDは既に使用されています")
            mate.mate_id = request_data.mate_id
        
        # settingsからbase_promptを自動生成
        from utils.prompts import normalize_base_prompt, build_attribute_prompt
        
        # Get all attributes with type and display_name
        attributes = session.exec(select(MAttributes)).all()
        attributes_data = [
            {
                'attribute_key': attr.attribute_key,
                'attribute_type': attr.attribute_type,
                'display_name': attr.display_name,
                'prompt_order': attr.prompt_order
            }
            for attr in attributes
        ]
        
        # Convert settings to the format needed for build_attribute_prompt
        settings_for_prompt = []
        for setting in request_data.settings:
            attr = session.exec(
                select(MAttributes).where(MAttributes.attribute_key == setting.key)
            ).first()
            if not attr:
                continue
                
            setting_dict = {
                'attribute_key': setting.key,
                'custom_value': None,
                'option_value': None,
                'prompt_snippet': None
            }
            
            if attr.attribute_type == 'select':
                # Get option display_name and prompt_snippet
                opt = session.exec(
                    select(MAttributeOptions).where(
                        MAttributeOptions.attribute_id == attr.id,
                        MAttributeOptions.option_value == setting.value
                    )
                ).first()
                if opt:
                    setting_dict['option_value'] = opt.display_name
                    setting_dict['prompt_snippet'] = opt.prompt_snippet
            else:
                setting_dict['custom_value'] = setting.value
            
            settings_for_prompt.append(setting_dict)
        
        # Generate and update base_prompt from attributes
        generated_prompt = build_attribute_prompt(settings_for_prompt, attributes_data)
        mate.base_prompt = normalize_base_prompt(generated_prompt) if generated_prompt else None
        
        # 3. 古い「魂の核心 (character_settings)」をぜんぶ DELETE
        old_settings = session.exec(
            select(MateSettings).where(MateSettings.mate_id == mate_id)
        ).all()
        for setting in old_settings:
            session.delete(setting)
            
        # 4. 新しい「魂の設計図 (settings)」を「縦持ち」で INSERT
        for setting in request_data.settings:
            attr = session.exec(
                select(MAttributes).where(MAttributes.attribute_key == setting.key)
            ).first()
            if not attr:
                raise HTTPException(status_code=400, detail=f"属性キー {setting.key} が見つかりません")
            
            option_id = None
            custom_value = None
            
            if attr.attribute_type == 'select':
                opt = session.exec(
                    select(MAttributeOptions).where(
                        MAttributeOptions.attribute_id == attr.id,
                        MAttributeOptions.option_value == setting.value
                    )
                ).first()
                if not opt:
                    raise HTTPException(status_code=400, detail=f"選択肢 {setting.value} が見つかりません")
                
                option_id = opt.id
            
            elif attr.attribute_type in ('text', 'textarea'):
                custom_value = setting.value
            
            if attr.id is None:
                raise HTTPException(status_code=500, detail=f"属性 {setting.key} のIDが不正です")
            
            if mate.id is None:
                raise HTTPException(status_code=500, detail="キャラクターIDが不正です")
            
            new_setting = MateSettings(
                mate_id=mate.id,
                attribute_id=attr.id,
                option_id=option_id,
                custom_value=custom_value
            )
            session.add(new_setting)

        # Commit all changes
        session.commit()
        session.refresh(mate)
        
        # React に「更新したよ！」って返す (InfoResponse でいいよね)
        return MateInfoResponse(
            id=mate.id if mate.id is not None else 0,
            mate_name=mate.mate_name,
            mate_id=mate.mate_id
        )
    
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=f"DB更新エラー: {str(e)}")

@router.delete("/{mate_id}")
def delete_mate(
    mate_id: int,
    current_user: Users = Depends(current_user_dependency),
    session: Session = Depends(get_session)
):
    """メイト(AIキャラクター)を論理削除"""
    print(f"DELETE /characters/{mate_id} - current_user: {current_user.username} (id: {current_user.id})")
    
    # 1. メイトを取得
    mate = session.get(AiMates, mate_id)
    if not mate:
        raise HTTPException(status_code=404, detail="そのメイトは見つからないよ")
    
    print(f"mate.user_id: {mate.user_id}, current_user.id: {current_user.id}")
    
    # 2. 所有者チェック
    if mate.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="他人のメイトは削除できないよ")
    
    # 3. 既に削除されているかチェック
    if mate.is_deleted:
        raise HTTPException(status_code=400, detail="このメイトは既に削除されています")
    
    try:
        # 4. 論理削除フラグを立てる
        mate.is_deleted = True
        session.add(mate)
        session.commit()
        
        return {"message": "メイトを削除しました", "mate_id": mate_id}
    
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=f"削除エラー: {str(e)}")

@router.get("/search-by-mate-id/{mate_id}")
def search_character_by_mate_id(
    mate_id: str,
    session: Session = Depends(get_session)
):
    """mate_idでキャラクターを検索（公開キャラクターのみ）"""
    mate = session.exec(
        select(AiMates)
        .where(
            AiMates.mate_id == mate_id,
            AiMates.is_public == True,
            AiMates.is_deleted == False  # 削除済みを除外
        )
    ).first()
    
    if not mate:
        raise HTTPException(
            status_code=404, 
            detail="そのmate_idのキャラクターが見つからないか、非公開です"
        )
    
    return {
        "id": mate.id,
        "mate_name": mate.mate_name,
        "mate_id": mate.mate_id,
        "user_id": mate.user_id
    }

@router.get("/check-mate-id/{mate_id}")
def check_mate_id_availability(
    mate_id: str,
    session: Session = Depends(get_session)
):
    """mate_idが利用可能かチェック"""
    # 英数字のみ、3-20文字の制限
    if not mate_id or len(mate_id) < 3 or len(mate_id) > 20:
        return {"available": False, "reason": "3-20文字で入力してください"}
    
    if not mate_id.replace('_', '').replace('-', '').isalnum():
        return {"available": False, "reason": "英数字、ハイフン、アンダースコアのみ使用できます"}
    
    existing = session.exec(
        select(AiMates).where(
            AiMates.mate_id == mate_id,
            AiMates.is_deleted == False  # 削除済みは除外
        )
    ).first()
    
    if existing:
        return {"available": False, "reason": "このIDは既に使用されています"}
    
    return {"available": True}

@router.post("/{mate_id}/toggle-public", response_model=MateInfoResponse)
def toggle_character_public_status(
    mate_id: int,
    request_data: MatePublicRequest,
    current_user: Users = Depends(current_user_dependency),
    session: Session = Depends(get_session)
):
    """Toggle the public/private status of an AI mate"""
    mate = session.get(AiMates, mate_id)
    
    if not mate:
        raise HTTPException(status_code=404, detail="AI mate not found")
    
    if mate.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Cannot modify other users' mates")
    
    if mate.is_deleted:
        raise HTTPException(status_code=404, detail="このメイトは削除されています")

    mate.is_public = request_data.is_public
    session.add(mate)
    session.commit()
    session.refresh(mate)

    return MateInfoResponse(
        id=mate.id, # type: ignore
        mate_name=mate.mate_name,
        mate_id=mate.mate_id
    )

@router.post("/batch/details", response_model=BatchMateResponseWrapper)
def get_batch_mate_details(
    request: BatchMateRequest,
    current_user: Users = Depends(current_user_dependency),
    session: Session = Depends(get_session)
):
    """
    Batch fetch details for multiple mates
    
    Maximum 50 mate IDs per request
    Only returns mates the user owns or has permission to view
    """
    # Validate request size
    if len(request.mate_ids) > 50:
        raise HTTPException(
            status_code=400,
            detail="Maximum 50 mate IDs allowed per request"
        )
    
    if len(request.mate_ids) == 0:
        raise HTTPException(
            status_code=400,
            detail="At least 1 mate ID required"
        )
    
    # Remove duplicates
    unique_mate_ids = list(set(request.mate_ids))
    
    # Fetch all mates in single query
    mates = session.exec(
        select(AiMates)
        .where(AiMates.id.in_(unique_mate_ids))
        .where(AiMates.is_deleted == False)
    ).all()
    
    # Filter to only user's mates (security)
    user_mate_ids = {m.id for m in mates if m.user_id == current_user.id}
    accessible_mates = [m for m in mates if m.id in user_mate_ids]
    
    # Fetch all settings for these mates
    mate_ids_to_fetch = [m.id for m in accessible_mates]
    all_settings = {}
    
    if mate_ids_to_fetch:
        settings_list = session.exec(
            select(MateSettings)
            .where(MateSettings.mate_id.in_(mate_ids_to_fetch))
            .options(
                joinedload(MateSettings.attribute),
                joinedload(MateSettings.option)
            )
        ).all()
        
        for setting in settings_list:
            if setting.mate_id not in all_settings:
                all_settings[setting.mate_id] = []
            all_settings[setting.mate_id].append(setting)
    
    # Build response
    response_mates = []
    for mate in accessible_mates:
        settings_payload: List[SettingInput] = []
        
        for setting in all_settings.get(mate.id, []):
            if not setting.attribute:
                continue
            
            key = setting.attribute.attribute_key
            value = setting.custom_value if setting.custom_value is not None else (
                setting.option.option_value if setting.option else None
            )
            
            if value is not None:
                settings_payload.append(SettingInput(key=key, value=value))
        
        response_mates.append(
            BatchMateDetailsResponse(
                id=mate.id,
                mate_name=mate.mate_name,
                mate_id=mate.mate_id,
                is_public=mate.is_public,
                user_id=mate.user_id,
                base_prompt=mate.base_prompt,
                settings=settings_payload
            )
        )
    
    # Calculate failed IDs
    failed_ids = [mid for mid in unique_mate_ids if mid not in user_mate_ids]
    
    return BatchMateResponseWrapper(
        success_count=len(response_mates),
        failed_count=len(failed_ids),
        total_requested=len(request.mate_ids),
        mates=response_mates,
        failed_ids=failed_ids
    )

@router.post("/batch/info", response_model=List[MateInfoResponse])
def get_batch_mate_info(
    request: BatchMateRequest,
    current_user: Users = Depends(current_user_dependency),
    session: Session = Depends(get_session)
):
    """
    Batch fetch basic info for multiple mates
    
    Lightweight alternative to /batch/details
    Maximum 50 mate IDs per request
    """
    # Validate request size
    if len(request.mate_ids) > 50:
        raise HTTPException(
            status_code=400,
            detail="Maximum 50 mate IDs allowed per request"
        )
    
    if len(request.mate_ids) == 0:
        raise HTTPException(
            status_code=400,
            detail="At least 1 mate ID required"
        )
    
    # Remove duplicates
    unique_mate_ids = list(set(request.mate_ids))
    
    # Fetch mates
    mates = session.exec(
        select(AiMates)
        .where(AiMates.id.in_(unique_mate_ids))
        .where(AiMates.is_deleted == False)
    ).all()
    
    # Filter to user's mates
    accessible_mates = [m for m in mates if m.user_id == current_user.id]
    
    # Get latest chats
    mate_ids_to_fetch = [m.id for m in accessible_mates]
    latest_chats = {}
    
    if mate_ids_to_fetch:
        subquery = (
            select(
                ChatHistory.mate_id,
                func.max(ChatHistory.id).label('max_id')
            )
            .where(ChatHistory.user_id == current_user.id)
            .group_by(ChatHistory.mate_id)
            .subquery()
        )
        
        latest = session.exec(
            select(ChatHistory)
            .join(subquery, ChatHistory.id == subquery.c.max_id)
            .where(ChatHistory.mate_id.in_(mate_ids_to_fetch))
        ).all()
        
        for chat in latest:
            latest_chats[chat.mate_id] = chat.message_text
    
    # Build response
    response_list = [
        MateInfoResponse(
            id=mate.id,
            mate_name=mate.mate_name,
            mate_id=mate.mate_id,
            last_message=latest_chats.get(mate.id)
        )
        for mate in accessible_mates
    ]
    
    return response_list

@router.post("/{mate_id}/upload-image")
async def upload_mate_image(
    mate_id: int,
    file: UploadFile = File(...),
    current_user: Users = Depends(current_user_dependency),
    session: Session = Depends(get_session)
):
    """
    Upload an image for a mate
    
    - Accepts: png, jpg, jpeg, webp
    - Max size: 5MB
    - Stores in Supabase Storage bucket 'mate-images'
    """
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    
    # Verify mate ownership
    mate = session.get(AiMates, mate_id)
    if not mate:
        raise HTTPException(status_code=404, detail="Mate not found")
    if mate.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to modify this mate")
    if mate.is_deleted:
        raise HTTPException(status_code=404, detail="Mate not found")
    
    # Validate file type
    allowed_types = ["image/png", "image/jpeg", "image/jpg", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed: {', '.join(allowed_types)}"
        )
    
    # Validate file size (5MB)
    contents = await file.read()
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size exceeds 5MB limit")
    
    # Generate unique filename
    file_ext = file.filename.split('.')[-1] if '.' in file.filename else 'jpg'
    unique_filename = f"{current_user.id}/{mate_id}/{uuid.uuid4()}.{file_ext}"
    
    try:
        # Delete old image if exists
        if mate.image_url:
            old_path = mate.image_url.split('/')[-3:]  # Extract path from URL
            old_file_path = '/'.join(old_path)
            try:
                supabase.storage.from_("mate-images").remove([old_file_path])
            except Exception as e:
                print(f"Failed to delete old image: {e}")
        
        # Upload to Supabase Storage
        response = supabase.storage.from_("mate-images").upload(
            path=unique_filename,
            file=contents,
            file_options={"content-type": file.content_type}
        )
        
        # Get public URL
        public_url = supabase.storage.from_("mate-images").get_public_url(unique_filename)
        
        # Update mate record
        mate.image_url = public_url
        mate.updated_at = datetime.now()
        session.add(mate)
        session.commit()
        session.refresh(mate)
        
        return {
            "success": True,
            "image_url": public_url,
            "mate_id": mate_id
        }
    
    except Exception as e:
        session.rollback()
        print(f"Image upload error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to upload image: {str(e)}")

@router.delete("/{mate_id}/image")
def delete_mate_image(
    mate_id: int,
    current_user: Users = Depends(current_user_dependency),
    session: Session = Depends(get_session)
):
    """
    Delete the image for a mate
    """
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    
    # Verify mate ownership
    mate = session.get(AiMates, mate_id)
    if not mate:
        raise HTTPException(status_code=404, detail="Mate not found")
    if mate.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to modify this mate")
    if mate.is_deleted:
        raise HTTPException(status_code=404, detail="Mate not found")
    
    if not mate.image_url:
        raise HTTPException(status_code=404, detail="No image to delete")
    
    try:
        # Extract file path from URL
        old_path = mate.image_url.split('/')[-3:]  # user_id/mate_id/filename
        old_file_path = '/'.join(old_path)
        
        # Delete from Supabase Storage
        supabase.storage.from_("mate-images").remove([old_file_path])
        
        # Update mate record
        mate.image_url = None
        mate.updated_at = datetime.now()
        session.add(mate)
        session.commit()
        
        return {"success": True, "message": "Image deleted successfully"}
    
    except Exception as e:
        session.rollback()
        print(f"Image deletion error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete image: {str(e)}")
