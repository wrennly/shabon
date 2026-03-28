"""remove_prompt_template_column

Revision ID: 9d36ac38740b
Revises: f9fb69c8552a
Create Date: 2025-11-24 00:36:57.922174

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9d36ac38740b'
down_revision: Union[str, Sequence[str], None] = 'f9fb69c8552a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Remove prompt_template column from m_attributes
    # No longer needed - using display_name + prompt_snippet/custom_value directly
    op.drop_column('m_attributes', 'prompt_template')


def downgrade() -> None:
    """Downgrade schema."""
    # Restore prompt_template column
    op.add_column('m_attributes', sa.Column('prompt_template', sa.String(), nullable=True))
