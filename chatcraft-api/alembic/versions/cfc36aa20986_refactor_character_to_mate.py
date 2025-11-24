"""refactor_character_to_mate

Revision ID: cfc36aa20986
Revises: e059109195e4
Create Date: 2025-11-17 23:06:16.337051

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'cfc36aa20986'
down_revision: Union[str, Sequence[str], None] = 'e059109195e4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
