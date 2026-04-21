"""Enable unaccent extension for accent-insensitive patient search

Revision ID: e1f2a3b4c5d6
Revises: b7c8d9e0f1a2
Create Date: 2026-04-20 23:15:00.000000

"""
from typing import Sequence, Union
from alembic import op

revision: str = 'e1f2a3b4c5d6'
down_revision: Union[str, None] = 'b7c8d9e0f1a2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS unaccent")


def downgrade() -> None:
    op.execute("DROP EXTENSION IF EXISTS unaccent")
