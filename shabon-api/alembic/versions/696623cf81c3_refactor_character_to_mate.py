"""refactor_character_to_mate

Revision ID: 696623cf81c3
Revises: cfc36aa20986
Create Date: 2025-11-18 00:43:51.204998

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '696623cf81c3'
down_revision: Union[str, Sequence[str], None] = 'cfc36aa20986'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema: Rename tables and columns from character to mate."""
    
    # 1. 外部キー制約を削除 (テーブル名変更前に)
    op.drop_constraint('character_settings_character_id_fkey', 'character_settings', type_='foreignkey')
    op.drop_constraint('chat_history_character_id_fkey', 'chat_history', type_='foreignkey')
    
    # 2. テーブル名変更: ai_characters -> ai_mates
    op.rename_table('ai_characters', 'ai_mates')
    
    # 3. テーブル名変更: character_settings -> mate_settings
    op.rename_table('character_settings', 'mate_settings')
    
    # 4. ai_mates テーブルのカラム名変更: character_name -> mate_name
    op.alter_column('ai_mates', 'character_name', new_column_name='mate_name')
    
    # 5. mate_settings テーブルのカラム名変更: character_id -> mate_id
    op.alter_column('mate_settings', 'character_id', new_column_name='mate_id')
    
    # 6. chat_history テーブルのカラム名変更: character_id -> mate_id
    op.alter_column('chat_history', 'character_id', new_column_name='mate_id')
    
    # 7. 外部キー制約を再作成
    op.create_foreign_key('mate_settings_mate_id_fkey', 'mate_settings', 'ai_mates', ['mate_id'], ['id'])
    op.create_foreign_key('chat_history_mate_id_fkey', 'chat_history', 'ai_mates', ['mate_id'], ['id'])


def downgrade() -> None:
    """Downgrade schema: Revert mate back to character."""
    
    # 逆順で戻す
    
    # 6. 外部キー制約を元に戻す
    op.drop_constraint('chat_history_mate_id_fkey', 'chat_history', type_='foreignkey')
    op.create_foreign_key('chat_history_character_id_fkey', 'chat_history', 'ai_characters', ['mate_id'], ['id'])
    
    op.drop_constraint('mate_settings_mate_id_fkey', 'mate_settings', type_='foreignkey')
    op.create_foreign_key('mate_settings_character_id_fkey', 'mate_settings', 'ai_characters', ['mate_id'], ['id'])
    
    # 5. chat_history テーブルのカラム名を戻す: mate_id -> character_id
    op.alter_column('chat_history', 'mate_id', new_column_name='character_id')
    
    # 4. mate_settings テーブルのカラム名を戻す: mate_id -> character_id
    op.alter_column('mate_settings', 'mate_id', new_column_name='character_id')
    
    # 3. ai_mates テーブルのカラム名を戻す: mate_name -> character_name
    op.alter_column('ai_mates', 'mate_name', new_column_name='character_name')
    
    # 2. テーブル名を戻す: mate_settings -> character_settings
    op.rename_table('mate_settings', 'character_settings')
    
    # 1. テーブル名を戻す: ai_mates -> ai_characters
    op.rename_table('ai_mates', 'ai_characters')
