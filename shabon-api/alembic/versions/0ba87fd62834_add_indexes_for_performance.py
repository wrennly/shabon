"""add_indexes_for_performance

Revision ID: 0ba87fd62834
Revises: a1b2c3d4e5f6
Create Date: 2025-12-15 20:53:57.100532

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0ba87fd62834'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # チャット履歴の最新日時取得用インデックス（チャット一覧のソート）
    # mate_id と created_at の複合インデックス
    op.create_index(
        'idx_chat_history_mate_created',
        'chat_history',
        ['mate_id', 'created_at'],
        unique=False
    )
    
    # ユーザーごとのチャット履歴取得用インデックス
    op.create_index(
        'idx_chat_history_user_mate',
        'chat_history',
        ['user_id', 'mate_id', 'created_at'],
        unique=False
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('idx_chat_history_user_mate', table_name='chat_history')
    op.drop_index('idx_chat_history_mate_created', table_name='chat_history')
