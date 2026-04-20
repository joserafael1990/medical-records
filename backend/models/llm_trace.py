"""LLM observability traces.

Each row is one round-trip to an LLM (Gemini in our case). Rows that
share `trace_id` belong to the same user-visible turn — e.g. when the
doctor assistant runs tool-use, a single user message can produce 2-3
rows with the same `trace_id` but different tool_calls.

PHI handling:
- `system_prompt` and `tools_available` are our own IP, not PHI.
- `user_input`, `conversation_history`, `response_text` may contain
  PHI (patient name, diagnosis, phone). They're stored encrypted via
  `encrypt_sensitive_data` — encryption happens in the service layer;
  this model treats them as opaque Text.
- Retention: 90 days, enforced by a daily scheduler task.
"""

from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID as PgUUID

from .base import Base


class LLMTrace(Base):
    __tablename__ = "llm_traces"

    id = Column(Integer, primary_key=True)
    created_at = Column(DateTime, nullable=False)

    trace_id = Column(PgUUID(as_uuid=True), nullable=False, index=True)
    source = Column(String(50), nullable=False, index=True)
    model = Column(String(80), nullable=True)

    # Input (PHI-containing fields stored encrypted by the service layer)
    system_prompt = Column(Text, nullable=True)
    user_input = Column(Text, nullable=True)
    conversation_history = Column(JSONB, nullable=True)
    tools_available = Column(JSONB, nullable=True)

    # Output
    response_text = Column(Text, nullable=True)
    tool_calls = Column(JSONB, nullable=True)
    tool_results = Column(JSONB, nullable=True)
    finish_reason = Column(String(32), nullable=True)

    # Metrics
    prompt_tokens = Column(Integer, nullable=True)
    completion_tokens = Column(Integer, nullable=True)
    latency_ms = Column(Integer, nullable=True)
    cost_usd = Column(Numeric(10, 6), nullable=True)

    # Context
    user_id = Column(
        Integer,
        ForeignKey("persons.id", ondelete="SET NULL"),
        nullable=True,
    )
    patient_id = Column(Integer, nullable=True)
    session_id = Column(String(100), nullable=True)
    error = Column(Text, nullable=True)
    trace_metadata = Column("metadata", JSONB, nullable=True)
