# utils/rag.py
"""
RAG (Retrieval Augmented Generation) 関連ユーティリティ
- Embedding生成（DeepSeek API）
- 会話要約生成（DeepSeek R1）
- 記憶保存
- コサイン類似度計算
- 関連記憶検索
- チャット履歴検索
"""

from typing import List, Optional
import os
from openai import OpenAI
from sqlmodel import Session, select, desc
from sqlalchemy import text
import numpy as np

from models import ConversationMemory, ChatMessage, ChatHistory
from settings import (
    RAG_HISTORY_LIMIT,
    RAG_SUMMARY_INTERVAL,
    RAG_RETRIEVAL_LIMIT,
    RAG_MEMORY_CONTEXT_LIMIT,
    RAG_SIMILARITY_THRESHOLD,
    SUMMARY_LENGTH,
    SUMMARY_CATEGORIES
)

# DeepSeek client for summaries
deepseek_client = OpenAI(
    api_key=os.getenv("DEEPSEEK_API_KEY"),
    base_url="https://api.deepseek.com"
)

# Jina AI client for embeddings (8192 dimensions!)
jina_client = OpenAI(
    api_key=os.getenv("JINA_API_KEY"),
    base_url="https://api.jina.ai/v1"
)

# Legacy: Gemini model reference (for backward compatibility)
model = None

def set_gemini_model(gemini_model):
    """Legacy function for backward compatibility"""
    global model
    model = gemini_model
    print("⚠️  set_gemini_model called but using Jina AI for embeddings and DeepSeek R1 for summaries")


def get_embedding(text: str) -> Optional[List[float]]:
    """Jina AI Embedding API を使ってテキストをベクトル化（1024次元）"""
    try:
        print(f"🔧 Using Jina AI embedding model (1024 dimensions)")
        response = jina_client.embeddings.create(
            model="jina-embeddings-v3",
            input=[text],  # input should be a list
            dimensions=1024,  # Maximum dimension for jina-embeddings-v3
            encoding_format="float"  # Jina APIは"float"のみサポート（base64不可）
        )
        embedding = response.data[0].embedding
        print(f"🔧 Embedding dimension: {len(embedding)}")
        return embedding
    except Exception as e:
        print(f"❌ Embedding error: {e}")
        import traceback
        traceback.print_exc()
        return None


def generate_conversation_summary(messages: List[ChatMessage]) -> Optional[str]:
    """
    過去の会話をDeepSeek R1に要約させる
    重要な情報を抽出して「長期記憶」として保存
    """
    if not messages or len(messages) < 2:
        return None
    
    # 会話文脈を構築（全メッセージを含める）
    conversation_text = ""
    for msg in messages:
        role = "ユーザー" if msg.role == "user" else "AI"
        conversation_text += f"{role}: {msg.text}\n"
    
    # カテゴリリストを箇条書きに変換
    categories_text = "\n".join([f"- {cat}" for cat in SUMMARY_CATEGORIES])
    
    try:
        # DeepSeek R1 にこの会話から重要な情報を抽出してもらう
        response = deepseek_client.chat.completions.create(
            model="deepseek-reasoner",  # R1 for better reasoning
            messages=[
                {
                    "role": "user",
                    "content": f"""以下の会話から、AIメイトが「覚えておくべき重要な情報」を{SUMMARY_LENGTH}で詳しく抽出してください。
以下の情報を優先的に記録してください：
{categories_text}

会話:
{conversation_text}

記憶に保存すべき情報（具体的かつ詳細に。ない場合のみ「特になし」と回答）:"""
                }
            ],
            temperature=0.3,
            max_tokens=500
        )
        
        summary = response.choices[0].message.content.strip()
        
        # 「特になし」の場合は None を返す
        if "特になし" in summary or summary == "特になし":
            return None
        
        print(f"📝 Generated summary with DeepSeek R1: {summary[:100]}...")
        return summary
    except Exception as e:
        print(f"⚠️  Summary generation error: {e}")
        return None


def save_memory_with_embedding(
    mate_id: int,
    user_id: int,
    message: str,
    role: str,
    session: Session,
    is_summary: bool = False,
    summary: Optional[str] = None
) -> Optional[ConversationMemory]:
    """メッセージを埋め込み付きで記憶に保存"""
    print(f"    🧠 Embedding message: {message[:50]}...")
    # テキストをベクトル化
    embedding = get_embedding(message)
    print(f"    🔢 Embedding result: {'SUCCESS' if embedding else 'FAILED'}, dim={len(embedding) if embedding else 0}")
    
    if not embedding:
        print(f"⚠️  Failed to embed message, saving without embedding")
        # 埋め込み失敗時でも記録を保存する
        memory = ConversationMemory(
            mate_id=mate_id,
            user_id=user_id,
            original_message=message,
            message_role=role,
            is_summary=is_summary,
            summary=summary
        )
    else:
        # PostgreSQL の pgvector 形式でベクトルを保存
        # Python list を直接渡す（pgvector/sqlalchemyが自動変換）
        memory = ConversationMemory(
            mate_id=mate_id,
            user_id=user_id,
            original_message=message,
            message_role=role,
            is_summary=is_summary,
            summary=summary,
            embedding=embedding  # List[float]を直接渡す
        )
    
    try:
        session.add(memory)
        session.commit()
        print(f"💾 Saved memory: mate_id={mate_id}, user_id={user_id}, role={role}")
        return memory
    except Exception as e:
        print(f"❌ Error saving memory: {e}")
        session.rollback()
        return None


def calculate_cosine_similarity(vec1: List[float], vec2: List[float]) -> float:
    """コサイン類似度を計算（0.0〜1.0、1.0が完全一致）"""
    # NumPy配列に変換
    a = np.array(vec1)
    b = np.array(vec2)
    
    # コサイン類似度 = 内積 / (ノルムの積)
    dot_product = np.dot(a, b)
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    
    if norm_a == 0 or norm_b == 0:
        return 0.0
    
    similarity = dot_product / (norm_a * norm_b)
    return float(similarity)


def retrieve_relevant_memories(
    mate_id: int,
    user_id: int,
    query: str,
    top_k: int = RAG_RETRIEVAL_LIMIT,
    session: Session = None
) -> List[str]:
    """クエリに関連する記憶をベクトル類似度で検索（要約のみ検索、足切りあり）"""
    if not session:
        return []
    
    # クエリをベクトル化
    query_embedding = get_embedding(query)
    if not query_embedding:
        print("⚠️  Query embedding failed")
        return []
    
    try:
        # クエリベクトルを文字列形式に変換（スペースなし）
        query_vector_str = '[' + ','.join(map(str, query_embedding)) + ']'
        
        # 生SQLでpgvectorのベクトルリテラルを直接使用
        raw_sql = text(f"""
            SELECT original_message, embedding, embedded_at
            FROM conversation_memory
            WHERE mate_id = :mate_id 
              AND user_id = :user_id
              AND is_summary = true
              AND embedding IS NOT NULL
            ORDER BY embedding <-> '{query_vector_str}'::vector
            LIMIT :limit_count
        """)
        
        result = session.execute(
            raw_sql,
            {
                'mate_id': mate_id,
                'user_id': user_id,
                'limit_count': top_k
            }
        )
        
        summary_results = result.all()
        
        # 類似度計算 + 足切り
        valid_memories = []
        for original_message, embedding, embedded_at in summary_results:
            # コサイン類似度を計算
            similarity = calculate_cosine_similarity(query_embedding, embedding)
            
            # 足切りライン以下は無視
            if similarity >= RAG_SIMILARITY_THRESHOLD:
                valid_memories.append({
                    'text': original_message,
                    'similarity': similarity,
                    'date': embedded_at
                })
                print(f"   ✅ Memory (similarity: {similarity:.3f}): {original_message[:50]}...")
            else:
                print(f"   ❌ Filtered out (similarity: {similarity:.3f}): {original_message[:30]}...")
            
            # 必要な数だけ集まったら終了
            if len(valid_memories) >= RAG_MEMORY_CONTEXT_LIMIT:
                break
        
        # テキストのみ抽出
        relevant_texts = [m['text'] for m in valid_memories]
        
        print(f"🔍 Retrieved {len(relevant_texts)}/{len(summary_results)} memories (after threshold filter)")
        if relevant_texts:
            print(f"   📝 Top memory: {relevant_texts[0][:100]}...")
            return relevant_texts
        else:
            print(f"   ℹ️  No memories above threshold ({RAG_SIMILARITY_THRESHOLD}) from summaries")

        # --- Fallback: 要約がまだない/閾値未満のときは通常の記憶から検索 ---
        print("   ↪️  Falling back to non-summary memories (recent factual notes)")
        fallback_sql = text(f"""
            SELECT original_message, embedding, embedded_at
            FROM conversation_memory
            WHERE mate_id = :mate_id 
              AND user_id = :user_id
              AND is_summary = false
              AND embedding IS NOT NULL
            ORDER BY embedding <-> '{query_vector_str}'::vector
            LIMIT :limit_count
        """)
        fb_result = session.execute(
            fallback_sql,
            {
                'mate_id': mate_id,
                'user_id': user_id,
                'limit_count': top_k
            }
        )
        fb_rows = fb_result.all()

        fb_valid: List[str] = []
        for original_message, embedding, embedded_at in fb_rows:
            sim = calculate_cosine_similarity(query_embedding, embedding)
            if sim >= RAG_SIMILARITY_THRESHOLD:
                fb_valid.append(original_message)
                print(f"   ✅ FB Memory (similarity: {sim:.3f}): {original_message[:50]}...")
            else:
                print(f"   ❌ FB Filtered (similarity: {sim:.3f}): {original_message[:30]}...")
            if len(fb_valid) >= RAG_MEMORY_CONTEXT_LIMIT:
                break

        print(f"   📦 Fallback returned {len(fb_valid)}/{len(fb_rows)} items above threshold")
        return fb_valid
        
    except Exception as e:
        print(f"⚠️  Memory retrieval error: {e}")
        # フォールバック：最新の記憶を返す
        try:
            stmt = select(ConversationMemory.original_message).where(
                (ConversationMemory.mate_id == mate_id) &
                (ConversationMemory.user_id == user_id)
            ).order_by(
                desc(ConversationMemory.embedded_at)
            ).limit(top_k)
            results = session.exec(stmt).all()
            return [r for r in results]
        except:
            return []


def search_chat_history(
    query: str,
    user_id: int,
    mate_id: Optional[int] = None,
    limit: int = 20,
    session: Session = None
) -> tuple[List[ChatHistory], int]:
    """
    チャット履歴を全文検索
    mate_id が指定された場合はそのメイト内のみ検索
    """
    if not session:
        return [], 0
    
    # 基本クエリ: ユーザーのチャット履歴
    stmt = select(ChatHistory).where(
        ChatHistory.user_id == user_id
    )
    
    # メイト指定がある場合は追加フィルタ
    if mate_id:
        stmt = stmt.where(ChatHistory.mate_id == mate_id)
    
    # テキスト検索（大文字小文字を区別しない）
    stmt = stmt.where(
        ChatHistory.message_text.ilike(f"%{query}%")
    )
    
    # 作成日時の降順でソート（最新順）
    stmt = stmt.order_by(desc(ChatHistory.created_at))
    
    # 検索結果を取得
    try:
        results = session.exec(stmt).all()
        total_results = len(results)
        
        # 結果を limit 件に制限
        limited_results = results[:limit]
        
        print(f"🔍 Chat search: query='{query}', mate_id={mate_id}, found={total_results}")
        return limited_results, total_results
    except Exception as e:
        print(f"❌ Chat search error: {e}")
        return [], 0


def format_chat_excerpt(text: str, query: str, length: int = 100) -> str:
    """
    検索結果に表示する抜粋を生成
    query を含む部分を中心に、周辺テキストを抜き出す
    """
    import re
    
    # 大文字小文字を区別しないで query を探す
    pattern = re.compile(re.escape(query), re.IGNORECASE)
    match = pattern.search(text)
    
    if not match:
        # query が見つからない場合は最初の length 文字を返す
        return text[:length] + ("..." if len(text) > length else "")
    
    # match の前後を含めて抜粋を生成
    start = max(0, match.start() - length // 2)
    end = min(len(text), match.end() + length // 2)
    
    excerpt = text[start:end]
    
    # 前後に省略記号を追加
    if start > 0:
        excerpt = "..." + excerpt
    if end < len(text):
        excerpt = excerpt + "..."
    
    return excerpt
