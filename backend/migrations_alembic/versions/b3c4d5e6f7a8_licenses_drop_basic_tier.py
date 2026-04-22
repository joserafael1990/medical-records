"""restrict licenses.license_type to ('trial','premium')

Revision ID: b3c4d5e6f7a8
Revises: a2b3c4d5e6f7
Create Date: 2026-04-22 17:00:00.000000

Se elimina el tier 'basic'. El producto solo ofrece 'trial' y 'premium'.

Verificado en prod (2026-04-22) que no quedan rows con license_type='basic'
antes de ejecutar, pero el upgrade incluye un UPDATE defensivo (basic->premium)
por si corre en un entorno donde todavía exista algún row.
"""
from typing import Sequence, Union

from alembic import op


revision: str = "b3c4d5e6f7a8"
down_revision: Union[str, None] = "a2b3c4d5e6f7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "UPDATE licenses SET license_type = 'premium' WHERE license_type = 'basic'"
    )
    op.execute(
        "ALTER TABLE licenses DROP CONSTRAINT IF EXISTS licenses_license_type_check"
    )
    op.execute(
        "ALTER TABLE licenses ADD CONSTRAINT licenses_license_type_check "
        "CHECK (license_type IN ('trial', 'premium'))"
    )


def downgrade() -> None:
    op.execute(
        "ALTER TABLE licenses DROP CONSTRAINT IF EXISTS licenses_license_type_check"
    )
    op.execute(
        "ALTER TABLE licenses ADD CONSTRAINT licenses_license_type_check "
        "CHECK (license_type IN ('trial', 'basic', 'premium'))"
    )
