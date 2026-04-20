"""
Doctor Assistant persistent state.

Phase B: conversations + messages live in the DB so they survive pod
restarts, enable the "past conversations" sidebar in the UI, and
feed NOM-004 audit requirements across sessions.

Each `AssistantConversation` belongs to a doctor (`doctor_id`) and
holds a sequence of `AssistantMessage` rows ordered by creation time.
The `current_patient_id` field captures the UI context the
conversation was anchored to, if any.
"""

from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from .base import Base, utc_now


class AssistantConversation(Base):
    __tablename__ = "assistant_conversations"

    id = Column(Integer, primary_key=True)
    doctor_id = Column(
        Integer,
        ForeignKey("persons.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # Optional free-text title (auto-derived from the first user message
    # in a follow-up PR; stored here so we don't recompute every time).
    title = Column(String(200), nullable=True)
    # Patient the conversation was scoped to when opened. Nullable because
    # a doctor can chat with the assistant without having a patient open.
    current_patient_id = Column(
        Integer,
        ForeignKey("persons.id"),
        nullable=True,
    )

    created_at = Column(DateTime, default=utc_now, nullable=False)
    last_activity = Column(DateTime, default=utc_now, nullable=False, index=True)

    messages = relationship(
        "AssistantMessage",
        back_populates="conversation",
        cascade="all, delete-orphan",
        order_by="AssistantMessage.id",
    )
    doctor = relationship("Person", foreign_keys=[doctor_id])
    patient = relationship("Person", foreign_keys=[current_patient_id])


class AssistantMessage(Base):
    __tablename__ = "assistant_messages"

    id = Column(Integer, primary_key=True)
    conversation_id = Column(
        Integer,
        ForeignKey("assistant_conversations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # 'user' or 'model'. Matches the shape Gemini expects when we replay
    # history on the next turn.
    role = Column(String(16), nullable=False)
    content = Column(Text, nullable=False)
    # Captures the tool calls the model invoked during a 'model' turn.
    # Structure: [{"name": "...", "args": {...}}, ...]. Nullable for
    # user turns.
    tool_calls = Column(JSONB, nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    conversation = relationship("AssistantConversation", back_populates="messages")
