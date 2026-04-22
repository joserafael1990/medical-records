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
professional_license (cédula SEP), rfc, curp. NOTA: persons.professional_license
YA EXISTE desde el bootstrap SQL (db_setup/01_create_database_structure.sql:182,
VARCHAR(50)). Por eso la migración original f9a0b1c2d3e4 original falló con
DuplicateColumn en prod. Esta versión usa ADD COLUMN IF NOT EXISTS para ser
idempotente y sobrevivir la divergencia entre el bootstrap SQL legacy y el
historial Alembic.
"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "f9a0b1c2d3e4"
down_revision: Union[str, None] = "e7f8a9b0c1d2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


_SIGNED_TABLES = ("consultation_prescriptions", "clinical_studies")


def upgrade() -> None:
    # persons — columnas de identidad profesional.
    # professional_license existe hace tiempo en el bootstrap SQL (VARCHAR(50)),
    # pero nunca fue formalizada en Alembic. ADD COLUMN IF NOT EXISTS es seguro
    # y no tocamos el tipo existente para no impactar rows actuales.
    op.execute(
        "ALTER TABLE persons ADD COLUMN IF NOT EXISTS professional_license VARCHAR(50)"
    )
    op.execute("ALTER TABLE persons ADD COLUMN IF NOT EXISTS rfc VARCHAR(13)")
    op.execute("ALTER TABLE persons ADD COLUMN IF NOT EXISTS curp VARCHAR(18)")

    # consultation_prescriptions y clinical_studies — columnas nuevas para firma.
    # ADD COLUMN IF NOT EXISTS deja la migración idempotente incluso si
    # se intenta re-ejecutar tras un fallo parcial.
    for table in _SIGNED_TABLES:
        op.execute(
            f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS digital_signature JSONB"
        )
        op.execute(
            f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS signature_hash VARCHAR(64)"
        )
        op.execute(
            f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS verification_uuid VARCHAR(36)"
        )
        op.execute(
            f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS signed_at TIMESTAMP WITH TIME ZONE"
        )
        op.execute(
            f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS signer_person_id INTEGER"
        )

        # FK: PG no tiene ADD CONSTRAINT IF NOT EXISTS directo; usamos DO block.
        op.execute(
            f"""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint
                    WHERE conname = 'fk_{table}_signer_person_id_persons'
                ) THEN
                    ALTER TABLE {table}
                    ADD CONSTRAINT fk_{table}_signer_person_id_persons
                    FOREIGN KEY (signer_person_id) REFERENCES persons(id);
                END IF;
            END
            $$;
            """
        )

        op.execute(
            f"""
            CREATE UNIQUE INDEX IF NOT EXISTS ix_{table}_verification_uuid
            ON {table} (verification_uuid)
            """
        )


def downgrade() -> None:
    for table in _SIGNED_TABLES:
        op.execute(f"DROP INDEX IF EXISTS ix_{table}_verification_uuid")
        op.execute(
            f"ALTER TABLE {table} DROP CONSTRAINT IF EXISTS fk_{table}_signer_person_id_persons"
        )
        for col in (
            "signer_person_id",
            "signed_at",
            "verification_uuid",
            "signature_hash",
            "digital_signature",
        ):
            op.execute(f"ALTER TABLE {table} DROP COLUMN IF EXISTS {col}")

    # No removemos professional_license/rfc/curp en el downgrade: la primera
    # ya vivía en el schema antes de esta migración (bootstrap SQL la creó), y
    # las otras dos podrían tener datos capturados por el usuario.
