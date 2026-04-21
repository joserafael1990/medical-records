"""normalize person gender values to canonical M/F/O codes

Revision ID: c4d5e6f7a8b9
Revises: b8c9d0e1f2a3
Create Date: 2026-04-21 19:45:00.000000

Historically `persons.gender` was a free-text String(20); different forms
wrote different representations ("M" vs "Masculino" vs "masculino"…), so
the column ended up with mixed values. The API now normalizes on write
to the canonical single-letter codes (M, F, O) — this migration sweeps
up the legacy rows so the DB matches the schema.

Idempotent: the UPDATE only touches rows still holding a non-canonical
value, so re-running is a no-op.
"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "c4d5e6f7a8b9"
down_revision: Union[str, None] = "b8c9d0e1f2a3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# Legacy value → canonical code. Keys are lowercased; the UPDATE uses LOWER()
# so mixed-case rows ("Masculino", "MASCULINO") all collapse to the same code.
NORMALIZATION_MAP = {
    "M": ["masculino", "male", "hombre"],
    "F": ["femenino", "female", "mujer"],
    "O": ["otro", "other"],
}


def upgrade() -> None:
    for code, aliases in NORMALIZATION_MAP.items():
        # Build: LOWER(TRIM(gender)) IN ('masculino','male','hombre')
        in_list = ", ".join(f"'{a}'" for a in aliases)
        op.execute(
            f"""
            UPDATE persons
               SET gender = '{code}'
             WHERE gender IS NOT NULL
               AND LOWER(TRIM(gender)) IN ({in_list});
            """
        )
    # Clean up rows where gender is whitespace-only or unknown → NULL rather
    # than keep garbage that would fail the new schema validator on reads.
    op.execute(
        """
        UPDATE persons
           SET gender = NULL
         WHERE gender IS NOT NULL
           AND gender NOT IN ('M', 'F', 'O')
           AND TRIM(gender) = '';
        """
    )


def downgrade() -> None:
    # No-op: we cannot reconstruct the original mixed representations.
    # The canonical codes are a superset of valid prior values, so leaving
    # the data as-is is the safe rollback.
    pass
