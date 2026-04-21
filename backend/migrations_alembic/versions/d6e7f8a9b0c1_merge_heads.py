"""merge alembic heads b1c2d3e4f5a6 and c4d5e6f7a8b9

Revision ID: d6e7f8a9b0c1
Revises: b1c2d3e4f5a6, c4d5e6f7a8b9
Create Date: 2026-04-21 21:00:00.000000

PR #62 (b1c2d3e4f5a6 — repair folios + privacy summary) and PR #64
(c4d5e6f7a8b9 — normalize person gender) both declared
down_revision = "b8c9d0e1f2a3", creating two parallel heads. This
collapses them into a single linear tip so `alembic upgrade head`
stops failing with "Multiple head revisions are present".

No schema changes: this is a pure DAG-merge revision.
"""
from typing import Sequence, Union


# revision identifiers, used by Alembic.
revision: str = "d6e7f8a9b0c1"
down_revision: Union[str, Sequence[str], None] = ("b1c2d3e4f5a6", "c4d5e6f7a8b9")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
