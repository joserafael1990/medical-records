"""add digital signature fields to prescriptions, clinical studies, and doctor identity

Revision ID: f9a0b1c2d3e4
Revises: e7f8a9b0c1d2
Create Date: 2026-04-21 23:00:00.000000

Fase 1 de firma electrónica de recetas y órdenes médicas.

Modelo Prescrypto-style: hash canónico + HMAC + UUID de verificación público.
Cumple LGS Art. 240 + RIS Art. 50 (firma electrónica o digital del emisor) y
NOM-004-SSA3-2012. No emite Constancia NOM-151 — eso queda para Fase 2 con
PSC externo (Mifiel/FirmaMex).

Nuevas columnas por documento (consultation_prescriptions, clinical_studies):
  - digital_signature  JSONB  — manifiesto completo (hash, hmac, uuid, algo, cedula)
  - signature_hash     CHAR(64) — SHA-256 del payload canónico
  - verification_uuid  VARCHAR(36) UNIQUE — usado en /api/verify/{uuid} público
  - signed_at          TIMESTAMPTZ
  - signer_person_id   INTEGER FK persons(id)

En persons se agregan los campos de identidad profesional exigidos por NOM-004:
professional_license (cédula SEP), rfc, curp. Legacy: estos vivían en
documents como PersonDocument; los promovemos a columnas propias porque la
firma los consume en cada request y porque NOM-004 §7.1 los pide como parte
del propio expediente.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "f9a0b1c2d3e4"
down_revision: Union[str, None] = "e7f8a9b0c1d2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


_SIGNED_TABLES = ("consultation_prescriptions", "clinical_studies")


def upgrade() -> None:
    op.add_column("persons", sa.Column("professional_license", sa.String(20), nullable=True))
    op.add_column("persons", sa.Column("rfc", sa.String(13), nullable=True))
    op.add_column("persons", sa.Column("curp", sa.String(18), nullable=True))

    for table in _SIGNED_TABLES:
        op.add_column(table, sa.Column("digital_signature", postgresql.JSONB(astext_type=sa.Text()), nullable=True))
        op.add_column(table, sa.Column("signature_hash", sa.String(64), nullable=True))
        op.add_column(table, sa.Column("verification_uuid", sa.String(36), nullable=True))
        op.add_column(table, sa.Column("signed_at", sa.DateTime(timezone=True), nullable=True))
        op.add_column(table, sa.Column("signer_person_id", sa.Integer(), nullable=True))
        op.create_foreign_key(
            f"fk_{table}_signer_person_id_persons",
            table,
            "persons",
            ["signer_person_id"],
            ["id"],
        )
        op.create_index(
            f"ix_{table}_verification_uuid",
            table,
            ["verification_uuid"],
            unique=True,
        )


def downgrade() -> None:
    for table in _SIGNED_TABLES:
        op.drop_index(f"ix_{table}_verification_uuid", table_name=table)
        op.drop_constraint(f"fk_{table}_signer_person_id_persons", table, type_="foreignkey")
        op.drop_column(table, "signer_person_id")
        op.drop_column(table, "signed_at")
        op.drop_column(table, "verification_uuid")
        op.drop_column(table, "signature_hash")
        op.drop_column(table, "digital_signature")

    op.drop_column("persons", "curp")
    op.drop_column("persons", "rfc")
    op.drop_column("persons", "professional_license")
