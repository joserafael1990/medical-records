"""Enable unaccent extension for accent-insensitive patient search

Revision ID: e1f2a3b4c5d6
Revises: c3d4e5f6g7h8
Create Date: 2026-04-20 23:15:00.000000

"""
from typing import Sequence, Union
from alembic import op

revision: str = 'e1f2a3b4c5d6'
down_revision: Union[str, None] = 'c3d4e5f6g7h8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
DO $$ BEGIN
    CREATE EXTENSION unaccent;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
""")


def downgrade() -> None:
    pass
