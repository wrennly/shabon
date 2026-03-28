"""fix_embedding_to_vector

Revision ID: f3a1b2c4d5e6
Revises: 66e9ae6ccb10
Create Date: 2025-11-20 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f3a1b2c4d5e6'
down_revision: Union[str, Sequence[str], None] = '66e9ae6ccb10'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Ensure pgvector extension exists
    op.execute('CREATE EXTENSION IF NOT EXISTS vector')
    # Convert embedding column from text/varchar to vector(768)
    op.execute(
        """
        ALTER TABLE conversation_memory
        ALTER COLUMN embedding TYPE vector(768)
        USING embedding::vector
        """
    )


def downgrade() -> None:
    # Revert to text representation (varchar)
    op.execute(
        """
        ALTER TABLE conversation_memory
        ALTER COLUMN embedding TYPE varchar
        USING embedding::text
        """
    )
