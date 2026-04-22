"""add CFDI invoicing tables and fiscal fields

Revision ID: a2b3c4d5e6f7
Revises: f9a0b1c2d3e4
Create Date: 2026-04-21 23:30:00.000000

Facturación electrónica CFDI 4.0 vía Facturama (modelo multi-emisor).

Nuevas tablas:
  - cfdi_issuers:  emisor fiscal por médico. Guarda CSDs cifrados (AES-256-GCM
    con MEDICAL_ENCRYPTION_KEY existente) y el customer_id de Facturama.
  - cfdi_invoices: registro de facturas emitidas/canceladas. Mantenemos folio,
    UUID SAT y URLs del PDF/XML que devuelve Facturama.

Columnas fiscales agregadas a persons (tanto emisor-doctor como receptor-paciente):
  - tax_regime        VARCHAR(3)  — régimen fiscal SAT (ej. '612' persona física)
  - cfdi_default_use  VARCHAR(3)  — uso CFDI preferido del receptor (ej. 'D01')

Idempotente vía IF NOT EXISTS. Downgrade preserva datos fiscales del usuario
(no droppea columnas que pudieron ser capturadas).
"""
from typing import Sequence, Union

from alembic import op


revision: str = "a2b3c4d5e6f7"
down_revision: Union[str, None] = "f9a0b1c2d3e4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ------------------------------------------------------------------
    # Columnas fiscales en persons (aplica a emisor y receptor)
    # ------------------------------------------------------------------
    op.execute("ALTER TABLE persons ADD COLUMN IF NOT EXISTS tax_regime VARCHAR(3)")
    op.execute(
        "ALTER TABLE persons ADD COLUMN IF NOT EXISTS cfdi_default_use VARCHAR(3)"
    )

    # ------------------------------------------------------------------
    # cfdi_issuers — un registro por médico que factura
    # ------------------------------------------------------------------
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS cfdi_issuers (
            id SERIAL PRIMARY KEY,
            doctor_id INTEGER NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
            rfc VARCHAR(13) NOT NULL,
            legal_name VARCHAR(300) NOT NULL,
            tax_regime VARCHAR(3) NOT NULL,
            postal_code VARCHAR(5) NOT NULL,

            -- CSDs cifrados con AES-256-GCM (MEDICAL_ENCRYPTION_KEY)
            csd_cer_encrypted TEXT,
            csd_key_encrypted TEXT,
            csd_password_encrypted TEXT,
            csd_expires_at TIMESTAMP WITH TIME ZONE,

            -- Facturama multi-emisor
            facturama_customer_id VARCHAR(100),

            -- Serie/folio configurables
            invoice_series VARCHAR(25) DEFAULT 'CORTEX',
            invoice_folio_counter INTEGER NOT NULL DEFAULT 0,

            is_active BOOLEAN NOT NULL DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

            CONSTRAINT uq_cfdi_issuers_doctor UNIQUE (doctor_id)
        )
        """
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_cfdi_issuers_rfc ON cfdi_issuers (rfc)"
    )

    # ------------------------------------------------------------------
    # cfdi_invoices — registro de facturas emitidas
    # ------------------------------------------------------------------
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS cfdi_invoices (
            id SERIAL PRIMARY KEY,
            issuer_id INTEGER NOT NULL REFERENCES cfdi_issuers(id) ON DELETE RESTRICT,
            doctor_id INTEGER NOT NULL REFERENCES persons(id),
            patient_id INTEGER REFERENCES persons(id),
            consultation_id INTEGER REFERENCES medical_records(id) ON DELETE SET NULL,

            -- Identificación SAT
            facturama_id VARCHAR(100),
            uuid_sat VARCHAR(36),
            serie VARCHAR(25),
            folio VARCHAR(40),

            -- Receptor (snapshot al momento de emitir)
            receptor_rfc VARCHAR(13) NOT NULL,
            receptor_name VARCHAR(300) NOT NULL,
            receptor_postal_code VARCHAR(5) NOT NULL,
            receptor_tax_regime VARCHAR(3) NOT NULL,
            cfdi_use VARCHAR(3) NOT NULL,

            -- Importes
            subtotal NUMERIC(12, 2) NOT NULL,
            total NUMERIC(12, 2) NOT NULL,
            currency VARCHAR(3) NOT NULL DEFAULT 'MXN',
            payment_form VARCHAR(3) NOT NULL,
            payment_method VARCHAR(3) NOT NULL DEFAULT 'PUE',

            -- Concepto
            service_description TEXT NOT NULL,
            sat_product_code VARCHAR(10) NOT NULL,
            sat_unit_code VARCHAR(10) NOT NULL DEFAULT 'E48',

            -- Archivos
            pdf_url TEXT,
            xml_url TEXT,

            -- Estado
            status VARCHAR(20) NOT NULL DEFAULT 'issued',
            cancellation_reason VARCHAR(2),
            cancellation_substitute_uuid VARCHAR(36),
            cancelled_at TIMESTAMP WITH TIME ZONE,
            error_message TEXT,

            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

            CONSTRAINT ck_cfdi_invoices_status CHECK (
                status IN ('issued', 'cancelled', 'error')
            )
        )
        """
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_cfdi_invoices_doctor_id ON cfdi_invoices (doctor_id)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_cfdi_invoices_patient_id ON cfdi_invoices (patient_id)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_cfdi_invoices_consultation_id ON cfdi_invoices (consultation_id)"
    )
    op.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS ix_cfdi_invoices_uuid_sat ON cfdi_invoices (uuid_sat) WHERE uuid_sat IS NOT NULL"
    )


def downgrade() -> None:
    # cfdi_invoices primero (FK a cfdi_issuers)
    op.execute("DROP INDEX IF EXISTS ix_cfdi_invoices_uuid_sat")
    op.execute("DROP INDEX IF EXISTS ix_cfdi_invoices_consultation_id")
    op.execute("DROP INDEX IF EXISTS ix_cfdi_invoices_patient_id")
    op.execute("DROP INDEX IF EXISTS ix_cfdi_invoices_doctor_id")
    op.execute("DROP TABLE IF EXISTS cfdi_invoices")

    op.execute("DROP INDEX IF EXISTS ix_cfdi_issuers_rfc")
    op.execute("DROP TABLE IF EXISTS cfdi_issuers")

    # No droppeamos tax_regime / cfdi_default_use: pudieron capturarse y
    # no son destructivos conservarlas.
