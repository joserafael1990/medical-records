"""add llm_traces for in-house LLM observability

Revision ID: c3d4e5f6g7h8
Revises: b7c8d9e0f1a2
Create Date: 2026-04-20 15:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "c3d4e5f6g7h8"
down_revision: Union[str, None] = "b7c8d9e0f1a2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "llm_traces",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.func.now(),
            nullable=False,
        ),
        # UUID that groups multiple LLM calls belonging to the same
        # user-visible "turn" (e.g. one doctor-assistant question may
        # trigger 2-3 Gemini calls with tool-use in between).
        sa.Column(
            "trace_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column("source", sa.String(length=50), nullable=False),
        sa.Column("model", sa.String(length=80), nullable=True),

        # INPUT — system_prompt kept in clear (it's our IP, not PHI).
        # user_input / conversation_history may contain PHI so they're
        # stored encrypted via encrypt_sensitive_data (same key as the
        # expediente). Plain Text column — encryption happens at the
        # service layer, not at the column level.
        sa.Column("system_prompt", sa.Text(), nullable=True),
        sa.Column("user_input", sa.Text(), nullable=True),
        sa.Column(
            "conversation_history",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
        ),
        sa.Column(
            "tools_available",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
        ),

        # OUTPUT
        sa.Column("response_text", sa.Text(), nullable=True),
        sa.Column(
            "tool_calls",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
        ),
        sa.Column(
            "tool_results",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
        ),
        sa.Column("finish_reason", sa.String(length=32), nullable=True),

        # METRICS
        sa.Column("prompt_tokens", sa.Integer(), nullable=True),
        sa.Column("completion_tokens", sa.Integer(), nullable=True),
        sa.Column("latency_ms", sa.Integer(), nullable=True),
        sa.Column("cost_usd", sa.Numeric(precision=10, scale=6), nullable=True),

        # CONTEXT
        sa.Column(
            "user_id",
            sa.Integer(),
            sa.ForeignKey("persons.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("patient_id", sa.Integer(), nullable=True),
        sa.Column("session_id", sa.String(length=100), nullable=True),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column(
            "metadata",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
        ),
    )
    op.create_index("ix_llm_traces_trace_id", "llm_traces", ["trace_id"])
    op.create_index(
        "ix_llm_traces_source_created",
        "llm_traces",
        ["source", "created_at"],
    )
    op.create_index("ix_llm_traces_user_id", "llm_traces", ["user_id"])
    op.create_index("ix_llm_traces_created_at", "llm_traces", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_llm_traces_created_at", table_name="llm_traces")
    op.drop_index("ix_llm_traces_user_id", table_name="llm_traces")
    op.drop_index("ix_llm_traces_source_created", table_name="llm_traces")
    op.drop_index("ix_llm_traces_trace_id", table_name="llm_traces")
    op.drop_table("llm_traces")
