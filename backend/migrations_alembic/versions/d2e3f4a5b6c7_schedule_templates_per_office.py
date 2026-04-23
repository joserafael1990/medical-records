"""schedule_templates uniqueness per (doctor, office, day)

Revision ID: d2e3f4a5b6c7
Revises: d1e2f3a4b5c6
Create Date: 2026-04-23 10:00:00.000000

Each office can now have its own weekly schedule, so the natural key for
`schedule_templates` is (doctor_id, office_id, day_of_week). Before this
migration the backend was creating one template per (doctor, day) and
silently attaching it to the doctor's first office, which made duplicates
possible when the code started writing per-office templates.

Steps:
1. Collapse duplicates: for any (doctor, office, day) with more than one
   row, keep the most recently updated one and delete the rest.
2. Backfill NULL office_id (defensive — the column is already NOT NULL in
   the schema but older environments may have nullable history): point
   them at the doctor's oldest office.
3. Add UNIQUE index on (doctor_id, office_id, day_of_week).
"""
from typing import Sequence, Union

from alembic import op


revision: str = "d2e3f4a5b6c7"
down_revision: Union[str, None] = "d1e2f3a4b5c6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Backfill any NULL office_id with the doctor's oldest office.
    op.execute(
        """
        UPDATE schedule_templates st
        SET office_id = sub.office_id
        FROM (
            SELECT DISTINCT ON (doctor_id) doctor_id, id AS office_id
            FROM offices
            WHERE is_active = TRUE
            ORDER BY doctor_id, created_at ASC, id ASC
        ) sub
        WHERE st.office_id IS NULL
          AND st.doctor_id = sub.doctor_id;
        """
    )

    # 2. Collapse duplicates per (doctor, office, day), keeping the most
    #    recently updated row.
    op.execute(
        """
        DELETE FROM schedule_templates
        WHERE id IN (
            SELECT id FROM (
                SELECT id,
                       ROW_NUMBER() OVER (
                           PARTITION BY doctor_id, office_id, day_of_week
                           ORDER BY updated_at DESC NULLS LAST, id DESC
                       ) AS rn
                FROM schedule_templates
                WHERE office_id IS NOT NULL
            ) ranked
            WHERE rn > 1
        );
        """
    )

    # 3. Unique index guards against future double-inserts.
    op.execute(
        """
        CREATE UNIQUE INDEX IF NOT EXISTS ux_schedule_templates_doctor_office_day
        ON schedule_templates (doctor_id, office_id, day_of_week);
        """
    )


def downgrade() -> None:
    op.execute(
        "DROP INDEX IF EXISTS ux_schedule_templates_doctor_office_day;"
    )
