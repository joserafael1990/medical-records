"""create intake_questionnaire_responses if missing

Revision ID: a7b8c9d0e1f2
Revises: f3a4b5c6d7e8
Create Date: 2026-04-21 17:55:00.000000

Corrective migration. In at least one production environment the table
`intake_questionnaire_responses` was never actually created, even though
Alembic's `alembic_version` was advanced past revision `a1b2c3d4e5f6`
(which originally created it). Result: every `/api/intake/*` endpoint
that touches the table returns 500 in that environment.

This migration uses raw `CREATE TABLE IF NOT EXISTS` + `CREATE UNIQUE
INDEX IF NOT EXISTS` so it is a no-op where the table already exists
(dev, staging) and repairs the schema where it doesn't (the affected
prod DB). Downgrade is a no-op because we cannot safely assume the
table was absent before this migration ran.
"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "a7b8c9d0e1f2"
down_revision: Union[str, None] = "f3a4b5c6d7e8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS intake_questionnaire_responses (
            id SERIAL PRIMARY KEY,
            appointment_id INTEGER NOT NULL
                REFERENCES appointments(id) ON DELETE CASCADE,
            patient_id INTEGER NOT NULL REFERENCES persons(id),
            token VARCHAR(64) NOT NULL,
            sent_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now(),
            submitted_at TIMESTAMP WITHOUT TIME ZONE,
            answers JSONB,
            whatsapp_message_id VARCHAR(255),
            created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
            updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
            CONSTRAINT uq_intake_response_per_appointment
                UNIQUE (appointment_id),
            CONSTRAINT uq_intake_response_token UNIQUE (token)
        );
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_intake_responses_token
            ON intake_questionnaire_responses (token);
        """
    )


def downgrade() -> None:
    # No-op: original migration a1b2c3d4e5f6 owns the table. We cannot
    # safely drop here because in affected environments the "previous
    # state" did not include the table at all.
    pass
