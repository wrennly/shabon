"""add_performance_indexes

Revision ID: 8ffd66a8d28f
Revises: 377177659685
Create Date: 2025-11-18 23:03:50.716539

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8ffd66a8d28f'
down_revision: Union[str, Sequence[str], None] = '377177659685'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema - Add performance indexes."""
    
    # ChatHistory indexes for improved query performance
    # Index for mate_id + user_id queries (most common filter combination)
    op.create_index(
        'ix_chat_history_mate_user',
        'chat_history',
        ['mate_id', 'user_id'],
        unique=False,
        if_not_exists=True
    )
    
    # Index for created_at sorting (for pagination/ordering)
    op.create_index(
        'ix_chat_history_created_at',
        'chat_history',
        ['created_at'],
        unique=False,
        if_not_exists=True
    )
    
    # Combined index for the most common query pattern
    op.create_index(
        'ix_chat_history_mate_user_created',
        'chat_history',
        ['mate_id', 'user_id', 'created_at'],
        unique=False,
        if_not_exists=True
    )
    
    # AiMates indexes for improved filtering performance
    # Index for user_id queries (get my mates)
    op.create_index(
        'ix_ai_mates_user_deleted',
        'ai_mates',
        ['user_id', 'is_deleted'],
        unique=False,
        if_not_exists=True
    )
    
    # Index for is_public queries (search/discovery)
    op.create_index(
        'ix_ai_mates_public_deleted',
        'ai_mates',
        ['is_public', 'is_deleted'],
        unique=False,
        if_not_exists=True
    )
    
    # MateSettings indexes for setting lookups
    op.create_index(
        'ix_mate_settings_mate_attribute',
        'mate_settings',
        ['mate_id', 'attribute_id'],
        unique=False,
        if_not_exists=True
    )
    
    # Users index for profile lookups
    op.create_index(
        'ix_users_username',
        'users',
        ['username'],
        unique=True,
        if_not_exists=True
    )


def downgrade() -> None:
    """Downgrade schema - Remove performance indexes."""
    op.drop_index('ix_users_username', table_name='users', if_exists=True)
    op.drop_index('ix_mate_settings_mate_attribute', table_name='mate_settings', if_exists=True)
    op.drop_index('ix_ai_mates_public_deleted', table_name='ai_mates', if_exists=True)
    op.drop_index('ix_ai_mates_user_deleted', table_name='ai_mates', if_exists=True)
    op.drop_index('ix_chat_history_mate_user_created', table_name='chat_history', if_exists=True)
    op.drop_index('ix_chat_history_created_at', table_name='chat_history', if_exists=True)
    op.drop_index('ix_chat_history_mate_user', table_name='chat_history', if_exists=True)
