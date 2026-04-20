"""add intake_questionnaire_responses

Revision ID: a1b2c3d4e5f6
Revises: d5be39ff35bc
Create Date: 2026-04-19 22:30:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = "d5be39ff35bc"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "intake_questionnaire_responses",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "appointment_id",
            sa.Integer(),
            sa.ForeignKey("appointments.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "patient_id",
            sa.Integer(),
            sa.ForeignKey("persons.id"),
            nullable=False,
        ),
        sa.Column("token", sa.String(length=64), nullable=False),
        sa.Column(
            "sent_at",
            sa.DateTime(),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("submitted_at", sa.DateTime(), nullable=True),
        sa.Column("answers", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("whatsapp_message_id", sa.String(length=255), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.func.now(),
            nullable=True,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            server_default=sa.func.now(),
            nullable=True,
        ),
        sa.UniqueConstraint("appointment_id", name="uq_intake_response_per_appointment"),
        sa.UniqueConstraint("token", name="uq_intake_response_token"),
    )
    op.create_index(
        "ix_intake_responses_token",
        "intake_questionnaire_responses",
        ["token"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_intake_responses_token",
        table_name="intake_questionnaire_responses",
    )
    op.drop_table("intake_questionnaire_responses")
