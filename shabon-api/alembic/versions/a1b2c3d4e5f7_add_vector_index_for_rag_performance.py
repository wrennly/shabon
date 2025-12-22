"""add_vector_index_for_rag_performance

Revision ID: a1b2c3d4e5f7
Revises: 66e9ae6ccb10
Create Date: 2025-12-22 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f7'
down_revision: Union[str, Sequence[str], None] = '66e9ae6ccb10'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema - Add pgvector index for RAG performance."""
    
    # pgvector の HNSW インデックスを追加（高速な近似最近傍探索）
    # HNSW (Hierarchical Navigable Small World) は大規模ベクトル検索に最適
    # 
    # パラメータ:
    # - m=16: グラフの接続数（デフォルト16、高いほど精度向上だが容量増）
    # - ef_construction=64: 構築時の探索幅（デフォルト64、高いほど精度向上だが構築遅）
    # 
    # 距離関数: vector_cosine_ops (コサイン距離)
    # - RAGでは意味的類似度を測るためコサイン距離が最適
    # - 他の選択肢: vector_l2_ops (ユークリッド距離), vector_ip_ops (内積)
    
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_conversation_memory_embedding_hnsw
        ON conversation_memory
        USING hnsw (embedding vector_cosine_ops)
        WITH (m = 16, ef_construction = 64)
        WHERE embedding IS NOT NULL AND is_summary = true
    """)
    
    # 複合インデックス: mate_id + user_id + is_summary
    # RAG検索時の WHERE 句フィルタリングを高速化
    op.create_index(
        'ix_conversation_memory_mate_user_summary',
        'conversation_memory',
        ['mate_id', 'user_id', 'is_summary'],
        unique=False,
        if_not_exists=True
    )
    
    print("✅ Vector index created for conversation_memory.embedding")
    print("   - HNSW index for fast similarity search")
    print("   - Composite index for mate_id + user_id + is_summary")


def downgrade() -> None:
    """Downgrade schema - Remove vector index."""
    op.execute("DROP INDEX IF EXISTS ix_conversation_memory_embedding_hnsw")
    op.drop_index('ix_conversation_memory_mate_user_summary', table_name='conversation_memory')

