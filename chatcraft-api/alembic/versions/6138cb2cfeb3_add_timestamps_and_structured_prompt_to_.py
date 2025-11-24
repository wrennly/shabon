"""add_timestamps_and_structured_prompt_to_ai_mates

Revision ID: 6138cb2cfeb3
Revises: f3a1b2c4d5e6
Create Date: 2025-11-23 22:53:25.849133

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6138cb2cfeb3'
down_revision: Union[str, Sequence[str], None] = 'f3a1b2c4d5e6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add new columns to ai_mates
    op.add_column('ai_mates', sa.Column('role_description', sa.Text(), nullable=True))
    op.add_column('ai_mates', sa.Column('tone_style', sa.Text(), nullable=True))
    op.add_column('ai_mates', sa.Column('few_shot_examples', sa.Text(), nullable=True))
    op.add_column('ai_mates', sa.Column('created_at', sa.DateTime(), server_default=sa.text('NOW()'), nullable=False))
    op.add_column('ai_mates', sa.Column('updated_at', sa.DateTime(), server_default=sa.text('NOW()'), nullable=False))
    
    # Migrate existing base_prompt to role_description
    op.execute("""
        UPDATE ai_mates 
        SET role_description = base_prompt 
        WHERE base_prompt IS NOT NULL AND base_prompt != ''
    """)


def downgrade() -> None:
    """Downgrade schema."""
    # Restore base_prompt from role_description before dropping
    op.execute("""
        UPDATE ai_mates 
        SET base_prompt = role_description 
        WHERE role_description IS NOT NULL
    """)
    
    op.drop_column('ai_mates', 'updated_at')
    op.drop_column('ai_mates', 'created_at')
    op.drop_column('ai_mates', 'few_shot_examples')
    op.drop_column('ai_mates', 'tone_style')
    op.drop_column('ai_mates', 'role_description')
