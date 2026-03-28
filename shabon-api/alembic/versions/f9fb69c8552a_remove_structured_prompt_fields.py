"""remove_structured_prompt_fields

Revision ID: f9fb69c8552a
Revises: 6138cb2cfeb3
Create Date: 2025-11-23 23:30:38.937223

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f9fb69c8552a'
down_revision: Union[str, Sequence[str], None] = '6138cb2cfeb3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Remove role_description, tone_style, few_shot_examples columns."""
    # Drop the structured prompt fields
    op.drop_column('ai_mates', 'role_description')
    op.drop_column('ai_mates', 'tone_style')
    op.drop_column('ai_mates', 'few_shot_examples')


def downgrade() -> None:
    """Restore role_description, tone_style, few_shot_examples columns."""
    # Re-add the columns
    op.add_column('ai_mates', sa.Column('role_description', sa.String(), nullable=True))
    op.add_column('ai_mates', sa.Column('tone_style', sa.String(), nullable=True))
    op.add_column('ai_mates', sa.Column('few_shot_examples', sa.Text(), nullable=True))
