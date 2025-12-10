"""add_image_url_to_ai_mates

Revision ID: a1b2c3d4e5f6
Revises: 8ffd66a8d28f
Create Date: 2025-12-10 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '8ffd66a8d28f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add image_url column to ai_mates table
    op.add_column('ai_mates', sa.Column('image_url', sa.String(), nullable=True))


def downgrade() -> None:
    # Remove image_url column from ai_mates table
    op.drop_column('ai_mates', 'image_url')

