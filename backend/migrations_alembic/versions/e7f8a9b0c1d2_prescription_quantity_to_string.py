"""widen consultation_prescriptions.quantity from Integer to String(100)

Revision ID: e7f8a9b0c1d2
Revises: d6e7f8a9b0c1
Create Date: 2026-04-21 22:30:00.000000

Prescriptions in Mexican practice express `quantity` as free text: "30
tabletas", "1 caja", "150 ml". The column was typed Integer, so every
POST /api/consultations/{id}/prescriptions carrying a non-numeric
quantity surfaced as psycopg2.errors.InvalidTextRepresentation (seen in
prod 2026-04-21 from Adriana Moreno's demo flow).

Widening to VARCHAR(100) is safe: existing numeric values cast cleanly
via `USING quantity::text`, and the model (models/medical.py) is updated
to match in the same commit.
"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "e7f8a9b0c1d2"
down_revision: Union[str, None] = "d6e7f8a9b0c1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE consultation_prescriptions
        ALTER COLUMN quantity TYPE VARCHAR(100) USING quantity::text;
        """
    )


def downgrade() -> None:
    # Lossy: rows holding non-numeric text ("30 tabletas") will fail the
    # cast. Guard by nulling non-numeric values first so the downgrade
    # doesn't explode on data written under the new schema.
    op.execute(
        """
        UPDATE consultation_prescriptions
           SET quantity = NULL
         WHERE quantity IS NOT NULL
           AND quantity !~ '^[0-9]+$';
        """
    )
    op.execute(
        """
        ALTER TABLE consultation_prescriptions
        ALTER COLUMN quantity TYPE INTEGER USING quantity::integer;
        """
    )
