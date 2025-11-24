"""add_is_deleted_to_ai_characters

Revision ID: e059109195e4
Revises: ceac1e8c1bb5
Create Date: 2025-11-17 22:05:31.854083

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e059109195e4'
down_revision: Union[str, Sequence[str], None] = 'ceac1e8c1bb5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # ai_charactersテーブルにis_deletedカラムを追加
    op.add_column('ai_characters', sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default='false'))
    # インデックスを追加
    op.create_index(op.f('ix_ai_characters_is_deleted'), 'ai_characters', ['is_deleted'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    # インデックスを削除
    op.drop_index(op.f('ix_ai_characters_is_deleted'), table_name='ai_characters')
    # is_deletedカラムを削除
    op.drop_column('ai_characters', 'is_deleted')
