"""repair document_folios tables and privacy_notices.short_summary

Revision ID: b1c2d3e4f5a6
Revises: b8c9d0e1f2a3
Create Date: 2026-04-21 21:00:00.000000

Corrective migration. In at least one production environment two schema
pieces were never actually applied, even though the backend models already
reference them:

1. `document_folios` and `document_folio_sequences` — required by the
   prescription / study-order PDF flow. Missing them causes
   `/api/consultations/{id}/document-folio?document_type=prescription` to
   return 500 and blocks the "Imprimir Receta Médica" button.

2. `privacy_notices.short_summary` column — added to the SQLAlchemy model
   (`backend/models/system.py`) but never materialized in prod. Reading
   the column 500s the public privacy notice, ARCO compliance report and
   consent flows.

Raw `CREATE TABLE / ADD COLUMN IF NOT EXISTS` keep this safely idempotent:
a no-op in environments where the schema was already correct, and a
repair in the affected prod DB. Downgrade is a no-op by design — we
cannot know which prior state to restore to without losing data.
"""
from typing import Sequence, Union

from alembic import op


revision: str = "b1c2d3e4f5a6"
down_revision: Union[str, None] = "b8c9d0e1f2a3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. document_folio_sequences — one row per (doctor, document_type),
    #    tracks the last folio number assigned so sequential folios can
    #    be generated without gaps.
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS document_folio_sequences (
            id SERIAL PRIMARY KEY,
            doctor_id INTEGER NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
            document_type VARCHAR(50) NOT NULL,
            last_number INTEGER NOT NULL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT document_folio_sequences_doctor_type_unique
                UNIQUE (doctor_id, document_type)
        );
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_document_folio_sequences_doctor_type
            ON document_folio_sequences(doctor_id, document_type);
        """
    )

    # 2. document_folios — one row per generated folio (prescription /
    #    study order) bound to a specific consultation.
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS document_folios (
            id SERIAL PRIMARY KEY,
            doctor_id INTEGER NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
            consultation_id INTEGER NOT NULL REFERENCES medical_records(id) ON DELETE CASCADE,
            document_type VARCHAR(50) NOT NULL,
            folio_number INTEGER NOT NULL,
            formatted_folio VARCHAR(20) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT document_folios_doctor_consultation_type_unique
                UNIQUE (doctor_id, consultation_id, document_type)
        );
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_document_folios_doctor_type_number
            ON document_folios(doctor_id, document_type, folio_number);
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_document_folios_unique_consultation
            ON document_folios(doctor_id, consultation_id, document_type);
        """
    )

    # 3. privacy_notices.short_summary — the model exposes it (see
    #    backend/models/system.py) and backend/routes/privacy.py reads
    #    it in /api/privacy/public-notice and /api/compliance/report.
    #    ADD COLUMN IF NOT EXISTS is a PostgreSQL 9.6+ idempotent op.
    op.execute(
        """
        ALTER TABLE privacy_notices
            ADD COLUMN IF NOT EXISTS short_summary TEXT;
        """
    )


def downgrade() -> None:
    # No-op by design. See module docstring.
    pass
