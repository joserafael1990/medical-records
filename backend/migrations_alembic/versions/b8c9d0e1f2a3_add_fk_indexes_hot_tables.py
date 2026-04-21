"""add btree indexes on FK columns of hot tables

Revision ID: b8c9d0e1f2a3
Revises: a7b8c9d0e1f2
Create Date: 2026-04-21 18:30:00.000000

Postgres does not create indexes automatically on foreign key columns, so
JOINs and ON DELETE CASCADE checks fall back to sequential scans. This
migration adds single-column B-tree indexes on every FK column in the
six tables that dominate query traffic (agenda, expediente, estudios,
signos, recetas, documentos).

All statements use `CREATE INDEX IF NOT EXISTS` so the migration is
idempotent and safe to re-run in any environment.

Scope is deliberately narrow: only FK columns on the hot tables. Lookup
catalogs (persons → countries/states/specialties) are out of scope —
low cardinality + rarely filtered.
"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "b8c9d0e1f2a3"
down_revision: Union[str, None] = "a7b8c9d0e1f2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


INDEXES: list[tuple[str, str]] = [
    ("medical_records", "patient_id"),
    ("medical_records", "doctor_id"),
    ("medical_records", "created_by"),
    ("medical_records", "patient_document_id"),
    ("appointments", "patient_id"),
    ("appointments", "doctor_id"),
    ("appointments", "appointment_type_id"),
    ("appointments", "office_id"),
    ("appointments", "created_by"),
    ("appointments", "cancelled_by"),
    ("clinical_studies", "patient_id"),
    ("clinical_studies", "doctor_id"),
    ("clinical_studies", "consultation_id"),
    ("clinical_studies", "created_by"),
    ("consultation_vital_signs", "consultation_id"),
    ("consultation_vital_signs", "vital_sign_id"),
    ("consultation_prescriptions", "consultation_id"),
    ("consultation_prescriptions", "medication_id"),
    ("person_documents", "person_id"),
    ("person_documents", "document_id"),
]


def _index_name(table: str, column: str) -> str:
    return f"ix_{table}_{column}"


def upgrade() -> None:
    for table, column in INDEXES:
        idx = _index_name(table, column)
        op.execute(
            f'CREATE INDEX IF NOT EXISTS "{idx}" '
            f'ON public."{table}" USING btree ("{column}");'
        )


def downgrade() -> None:
    for table, column in INDEXES:
        idx = _index_name(table, column)
        op.execute(f'DROP INDEX IF EXISTS public."{idx}";')
