# routers/chat.py
"""
チャット関連エンドポイント
- POST /chat/ - AIとのチャット（RAG統合版）
- GET /debug/user-chats - デバッグ用チャット履歴確認
- DELETE /chat/history/{mate_id} - チャット履歴削除
- GET /chat/search - チャット履歴全文検索
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Header
from sqlmodel import Session, select
from typing import List, Optional
from datetime import datetime
import time

from database import get_session
from models import (
    Users, AiMates, ChatHistory, ChatMessage,
    ChatRequest, ChatResponse, ChatHistoryResponse,
    ChatSearchResult, ChatSearchResponse,
    MAttributes, MateSettings
)
from utils.rag import (
    retrieve_relevant_memories,
    generate_conversation_summary,
    save_memory_with_embedding,
    search_chat_history,
    format_chat_excerpt
)
from utils.prompts import build_system_prompt, normalize_base_prompt
from utils.cache import clear_query_cache
from settings import (
    RAG_HISTORY_LIMIT,
    RAG_SUMMARY_INTERVAL,
    RAG_RETRIEVAL_LIMIT,
    RAG_MEMORY_CONTEXT_LIMIT
)

router = APIRouter(prefix="/chat", tags=["chat"])

# Import model from main (will be set via dependency)
_gemini_model = None

def set_model(model):
    """Set Gemini model for chat router"""
    global _gemini_model
    _gemini_model = model

def get_model():
    """Get Gemini model"""
    return _gemini_model

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


@router.post("/", response_model=ChatResponse)
def chat_with_ai(
    request_data: ChatRequest,
    current_user: Users = Depends(current_user_dependency),
    session: Session = Depends(get_session)
):
    """AIとチャット（RAG統合版）"""
    model = get_model()
    if not model:
        raise HTTPException(status_code=500, detail="Gemini model not initialized")
    
    print(f"💬 POST /chat/ - User: {current_user.id}, Mate: {request_data.mate_id}")
    # データベースからAIキャラクターを取得
    mate = session.get(AiMates, request_data.mate_id)
    if not mate:
        raise HTTPException(status_code=404, detail="そのAIキャラは存在しないよ")
    if mate.is_deleted:
        raise HTTPException(status_code=404, detail="このメイトは削除されています")
        
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
    
    # Get mate settings with option values and prompt_snippet
    mate_settings_db = session.exec(
        select(MateSettings).where(MateSettings.mate_id == mate.id)
    ).all()
    
    settings = []
    for ms in mate_settings_db:
        attr = session.get(MAttributes, ms.attribute_id)
        setting_dict = {
            'attribute_key': attr.attribute_key if attr else None,
            'custom_value': ms.custom_value,
            'option_value': None,
            'prompt_snippet': None
        }
        
        # Get option value and prompt_snippet if option_id exists
        if ms.option_id:
            from models import MAttributeOptions
            option = session.get(MAttributeOptions, ms.option_id)
            if option:
                setting_dict['option_value'] = option.display_name
                setting_dict['prompt_snippet'] = option.prompt_snippet
        
        settings.append(setting_dict)

    # ---
    # 💡 RAG統合: 過去の会話から関連する記憶を検索
    # ---
    relevant_memories = []
    try:
        relevant_memories = retrieve_relevant_memories(
            mate_id=request_data.mate_id,
            user_id=current_user.id,  # type: ignore
            query=request_data.new_message,
            top_k=RAG_RETRIEVAL_LIMIT,
            session=session
        )
    except Exception as memory_error:
        print(f"⚠️  Memory retrieval failed (non-critical): {memory_error}")
        import traceback
        traceback.print_exc()
        # RAGエラーでトランザクションが壊れた場合、ロールバックして続行
        session.rollback()
        # Continue without RAG context
    
    # 関連記憶をコンテキストに含める
    memory_context = ""
    if relevant_memories:
        memory_context = "\n### 過去の会話から関連する記憶\n"
        for i, memory in enumerate(relevant_memories[:RAG_MEMORY_CONTEXT_LIMIT], 1):
            memory_context += f"{i}. {memory}\n"
    
    # ---
    # システムプロンプト生成（attribute-based + auto few-shot）
    # ---
    
    user_display_name = current_user.display_name or current_user.username
    user_profile = current_user.profile
    if not user_profile or not user_profile.strip():
        user_profile = f"わたしは {user_display_name} です。"

    # 現在日時取得
    today = datetime.now()
    
    # ユーザー情報
    user_info = {
        'display_name': user_display_name,
        'profile': user_profile
    }
    
    # システムプロンプト生成
    final_system_prompt = build_system_prompt(
        mate_name=mate.mate_name,
        base_prompt=mate.base_prompt,
        settings=settings,
        attributes_data=attributes_data,
        user_info=user_info,
        rag_context=memory_context,
        current_datetime=today
    )
        
    # --- Gemini に渡す「会話履歴」を組み立てる ---
    
    # システムプロンプトを最初に設定
    gemini_history = [
        {
            "role": "user",
            "parts": [final_system_prompt]
        },
        {
            "role": "model",
            "parts": [f"了解しました。{user_display_name}さん、よろしくお願いします！"]
        }
    ]
    
    # API使用料削減：履歴を最新N件に制限
    limited_history = request_data.history[-RAG_HISTORY_LIMIT:]
    
    for msg in limited_history:
        gemini_history.append({
            "role": msg.role,
            "parts": [msg.text]
        })
    
    # Gemini APIを呼び出し
    try:
        convo = model.start_chat(history=gemini_history) # type: ignore
        response = convo.send_message(request_data.new_message)
        
        # Safety filterやその他の理由でテキストが取得できない場合の処理
        try:
            ai_reply_text = response.text
        except ValueError as e:
            # finish_reason を確認
            if hasattr(response, 'candidates') and response.candidates:
                finish_reason = response.candidates[0].finish_reason
                safety_ratings = response.candidates[0].safety_ratings if hasattr(response.candidates[0], 'safety_ratings') else None
                
                print(f"⚠️  Gemini response blocked. Finish reason: {finish_reason}")
                if safety_ratings:
                    print(f"   Safety ratings: {safety_ratings}")
                
                # ユーザーフレンドリーなエラーメッセージ
                ai_reply_text = "申し訳ございません。その内容についてはお答えできません。別の話題でお話ししましょう。"
            else:
                raise e
        
        # ユーザーのメッセージをDBに保存
        user_log = ChatHistory(
            mate_id=request_data.mate_id,
            user_id=current_user.id, # type: ignore
            role="user",
            message_text=request_data.new_message
        )
        session.add(user_log)
        session.flush()  # IDを取得するためにflush
        
        # AIの返事をDBに保存
        ai_log = ChatHistory(
            mate_id=request_data.mate_id,
            user_id=current_user.id, # type: ignore
            role="model",
            message_text=ai_reply_text
        )
        session.add(ai_log)
        session.flush()  # IDを取得するためにflush
        
        # Debug: Log chat history entry
        print(f"📝 Saved chat - User: {current_user.id}, Mate: {request_data.mate_id}, User msg: {request_data.new_message[:50]}")
        
        # 🔴 CRITICAL: Commit chat history FIRST before trying RAG (to prevent transaction abort)
        session.commit()
        print(f"✅ Chat history committed successfully")
        
        # ---
        # 💡 RAG: 要約のみベクトル化して記憶に保存（コスト削減）
        # NOTE: These can fail without affecting chat history
        # ---
        print(f"🔄 Starting RAG memory save...")
        try:
            # 会話数がRAG_SUMMARY_INTERVALの倍数になったら要約を生成してベクトル化
            current_turn_count = len(request_data.history) + 1  # 新しいメッセージ分を追加
            
            if current_turn_count % RAG_SUMMARY_INTERVAL == 0:
                print(f"  📊 Turn count: {current_turn_count} - Generating summary...")
                
                # 最新のRAG_SUMMARY_INTERVAL往復分(=INTERVAL*2メッセージ)の会話を取得
                # 例: INTERVAL=5 → 10メッセージ(5往復)を要約
                messages_to_summarize = RAG_SUMMARY_INTERVAL * 2
                
                # request_data.historyから最新分を取得
                if len(request_data.history) >= messages_to_summarize:
                    recent_messages = request_data.history[-messages_to_summarize:]
                else:
                    # 履歴が足りない場合は全部使う
                    recent_messages = request_data.history
                
                # 新しいメッセージも含める
                recent_messages_with_new = list(recent_messages) + [
                    ChatMessage(role="user", text=request_data.new_message),
                    ChatMessage(role="model", text=ai_reply_text)
                ]
                
                print(f"  📝 Summarizing {len(recent_messages_with_new)} messages...")
                summary_text = generate_conversation_summary(recent_messages_with_new)
                if summary_text:
                    # 要約を「特別な記憶」として保存（ベクトル化）
                    summary_memory = save_memory_with_embedding(
                        mate_id=request_data.mate_id,
                        user_id=current_user.id,  # type: ignore
                        message=summary_text,  # 要約テキスト
                        role="summary",
                        session=session,
                        is_summary=True,
                        summary=summary_text
                    )
                    print(f"  💾 Saved summary memory (turn {current_turn_count}): {summary_text[:100]}...")
                    print(f"  ✅ Summary memory saved: {summary_memory.id if summary_memory else 'FAILED'}")
                else:
                    print(f"  ℹ️  No important info to summarize")
            else:
                print(f"  ⏭️  Turn count: {current_turn_count} - Skipping (next summary at {(current_turn_count // RAG_SUMMARY_INTERVAL + 1) * RAG_SUMMARY_INTERVAL})")
            
            session.commit()
            print(f"✅ RAG memory committed")
        except Exception as rag_error:
            print(f"⚠️  RAG memory save failed (non-critical): {rag_error}")
            session.rollback()
            print(f"   Rolled back RAG, but chat history is still saved")
        
        # 🔥 CRITICAL: Clear any cached query results so /mates endpoint returns fresh data
        clear_query_cache()
        print(f"🧹 Cleared query cache after chat")

        return ChatResponse(reply_text=ai_reply_text)

    except Exception as e:
        # (もし Gemini API がエラーになったら)
        import traceback
        print(f"❌ Chat endpoint error: {e}")
        print(f"   Error type: {type(e).__name__}")
        print(f"   Traceback:\n{traceback.format_exc()}")
        session.rollback() # (ログ保存も「なかったこと」にしとこう)
        raise HTTPException(status_code=500, detail=f"AIとのおしゃべりに失敗しました: {str(e)}")


@router.delete("/history/{mate_id}")
def delete_chat_history(
    mate_id: int,
    current_user: Users = Depends(current_user_dependency),
    session: Session = Depends(get_session)
):
    """特定のキャラクターとのチャット履歴を削除"""
    # キャラクターの存在確認
    mate = session.get(AiMates, mate_id)
    if not mate:
        raise HTTPException(status_code=404, detail="そのメイトは見つかりません")
    
    try:
        # 自分のチャット履歴のみ削除
        chat_histories = session.exec(
            select(ChatHistory).where(
                ChatHistory.mate_id == mate_id,
                ChatHistory.user_id == current_user.id
            )
        ).all()
        
        for chat in chat_histories:
            session.delete(chat)
        
        session.commit()
        
        return {
            "message": "チャット履歴を削除しました",
            "mate_id": mate_id,
            "deleted_count": len(chat_histories)
        }
    
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=f"削除エラー: {str(e)}")


@router.get("/search", response_model=ChatSearchResponse)
def search_chats(
    q: str = Query(..., description="Search query (required)", min_length=1, max_length=200),
    mate_id: Optional[int] = Query(None, description="Filter by specific mate (optional)"),
    limit: int = Query(20, ge=1, le=100, description="Max results (default 20)"),
    current_user: Users = Depends(current_user_dependency),
    session: Session = Depends(get_session)
):
    """
    チャット履歴を全文検索
    
    - q: 検索キーワード (必須、1-200文字)
    - mate_id: 特定のメイト内のみ検索 (オプション)
    - limit: 返す結果数 (1-100, デフォルト20)
    
    戻り値:
    - query: 検索キーワード
    - total_results: マッチした総数
    - results: チャットの抜粋リスト
    - search_time_ms: 検索に要した時間 (ms)
    """
    start_time = time.time()
    
    # mate_id が指定されている場合、ユーザーがそのメイトにアクセス可能か確認
    if mate_id:
        mate = session.get(AiMates, mate_id)
        if not mate:
            raise HTTPException(status_code=404, detail="メイトが見つかりません")
        # 所有者確認: 自分のメイト or 公開メイト
        if mate.user_id != current_user.id and not mate.is_public:  # type: ignore
            raise HTTPException(status_code=403, detail="このメイトへのアクセスは許可されていません")
    
    # 検索を実行
    results, total_results = search_chat_history(
        query=q,
        user_id=current_user.id,  # type: ignore
        mate_id=mate_id,
        limit=limit,
        session=session
    )
    
    # 検索時間を計算
    search_time_ms = (time.time() - start_time) * 1000
    
    # レスポンスを構築
    search_results = []
    for chat in results:
        # mate 情報を取得
        mate_obj = session.get(AiMates, chat.mate_id)
        mate_name = mate_obj.mate_name if mate_obj else f"メイト #{chat.mate_id}"
        
        # 抜粋を生成
        excerpt = format_chat_excerpt(chat.message_text, q, length=100)
        
        search_results.append(
            ChatSearchResult(
                id=chat.id or 0,
                mate_id=chat.mate_id,
                mate_name=mate_name,
                role=chat.role,
                message_text=chat.message_text,
                created_at=chat.created_at or datetime.now(),
                excerpt=excerpt
            )
        )
    
    return ChatSearchResponse(
        query=q,
        total_results=total_results,
        mate_id=mate_id,
        results=search_results,
        search_time_ms=round(search_time_ms, 2)
    )


# Debug router (separate prefix)
debug_router = APIRouter(prefix="/debug", tags=["debug"])

@debug_router.get("/user-chats")
def debug_user_chats(
    current_user: Users = Depends(current_user_dependency),
    session: Session = Depends(get_session)
):
    """Debug endpoint to check current user's chats"""
    chats = session.exec(
        select(ChatHistory).where(ChatHistory.user_id == current_user.id)
    ).all()
    
    return {
        "user_id": current_user.id,
        "username": current_user.username,
        "total_chats": len(chats),
        "recent_chats": [
            {
                "mate_id": chat.mate_id,
                "role": chat.role,
                "message": chat.message_text[:50],
                "created_at": chat.created_at
            }
            for chat in sorted(chats, key=lambda x: x.created_at, reverse=True)[:5]
        ]
    }
