"""
DB-backed session state for the Doctor Assistant (Phase B).

Replaces the in-memory per-process dict with SQLAlchemy-backed
conversations + messages tables so:
- state survives pod restarts
- a doctor can list and resume past conversations
- the full audit trail of assistant interactions lives in Postgres
  alongside `audit_logs`

API surface preserved for callers:
- `get_or_create(db, doctor_id, conversation_id?, current_patient_id?)`
  → transient `Conversation` dataclass (history trimmed to the most
  recent `max_history` messages so Gemini context stays bounded)
- `append_turn(db, doctor_id, conversation_id, user_message,
  model_response, tool_calls?)` → inserts the two new rows and bumps
  `last_activity`
- `list_recent(db, doctor_id, limit=20)` → conversation summaries for
  the UI sidebar
- `get_full(db, doctor_id, conversation_id)` → full message history
  for resuming a past conversation
- `delete(db, doctor_id, conversation_id)` → hard delete

Doctor-scoping is enforced on every read and write: a doctor can
NEVER access another doctor's conversation, even by guessing the id.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from database import AssistantConversation, AssistantMessage

DEFAULT_MAX_HISTORY = 40  # user+model messages loaded on each turn
DEFAULT_LIST_LIMIT = 20


@dataclass
class Conversation:
    """Transient in-request view of a conversation + its trimmed history.

    The `conversation_id` is the DB primary key serialised as a string,
    so the API contract stays string-based for the frontend.
    """

    doctor_id: int
    conversation_id: str
    history: List[Dict[str, Any]] = field(default_factory=list)
    current_patient_id: Optional[int] = None
    created_at: Optional[datetime] = None
    last_activity: Optional[datetime] = None


class AssistantSessionState:
    """DB-backed conversation store.

    No instance state — every method takes `db` explicitly so the
    FastAPI dependency-injected session flows through cleanly.
    """

    def __init__(self, max_history: int = DEFAULT_MAX_HISTORY) -> None:
        self._max_history = max_history

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def get_or_create(
        self,
        db: Session,
        doctor_id: int,
        conversation_id: Optional[str] = None,
        current_patient_id: Optional[int] = None,
    ) -> Conversation:
        """Return a conversation for this doctor, creating it on miss.

        If `conversation_id` refers to another doctor's conversation
        (or does not exist), a NEW conversation is silently created
        instead of raising. Callers get the id back via the returned
        dataclass.
        """
        row = self._find_for_doctor(db, doctor_id, conversation_id)
        if row is None:
            row = AssistantConversation(
                doctor_id=doctor_id,
                current_patient_id=current_patient_id,
            )
            db.add(row)
            db.flush()
        else:
            # Update patient context on resume so the bot sees the
            # currently-open patient even if the UI changed it mid-
            # session.
            if current_patient_id is not None:
                row.current_patient_id = current_patient_id
            row.last_activity = datetime.utcnow()

        db.commit()
        db.refresh(row)
        return self._to_dataclass(db, row)

    def append_turn(
        self,
        db: Session,
        doctor_id: int,
        conversation_id: str,
        user_message: str,
        model_response: str,
        tool_calls: Optional[List[Dict[str, Any]]] = None,
    ) -> None:
        """Persist the user + model exchange. Silently no-op if the
        conversation doesn't belong to this doctor."""
        row = self._find_for_doctor(db, doctor_id, conversation_id)
        if row is None:
            return
        db.add(
            AssistantMessage(
                conversation_id=row.id,
                role="user",
                content=user_message,
                tool_calls=None,
            )
        )
        db.add(
            AssistantMessage(
                conversation_id=row.id,
                role="model",
                content=model_response,
                tool_calls=tool_calls or None,
            )
        )
        row.last_activity = datetime.utcnow()
        db.commit()

    def list_recent(
        self,
        db: Session,
        doctor_id: int,
        limit: int = DEFAULT_LIST_LIMIT,
    ) -> List[Dict[str, Any]]:
        """Return recent conversations for the sidebar."""
        rows = (
            db.query(AssistantConversation)
            .filter(AssistantConversation.doctor_id == doctor_id)
            .order_by(AssistantConversation.last_activity.desc())
            .limit(max(1, min(limit, 100)))
            .all()
        )
        return [
            {
                "conversation_id": str(r.id),
                "title": r.title or self._derive_title(db, r.id),
                "current_patient_id": r.current_patient_id,
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "last_activity": (
                    r.last_activity.isoformat() if r.last_activity else None
                ),
            }
            for r in rows
        ]

    def get_full(
        self,
        db: Session,
        doctor_id: int,
        conversation_id: str,
    ) -> Optional[Dict[str, Any]]:
        """Return full (untrimmed) conversation for resume UI. None if
        the conversation is not owned by this doctor."""
        row = self._find_for_doctor(db, doctor_id, conversation_id)
        if row is None:
            return None
        messages = (
            db.query(AssistantMessage)
            .filter(AssistantMessage.conversation_id == row.id)
            .order_by(AssistantMessage.id.asc())
            .all()
        )
        return {
            "conversation_id": str(row.id),
            "title": row.title,
            "current_patient_id": row.current_patient_id,
            "created_at": row.created_at.isoformat() if row.created_at else None,
            "last_activity": (
                row.last_activity.isoformat() if row.last_activity else None
            ),
            "messages": [
                {
                    "role": m.role,
                    "content": m.content,
                    "tool_calls": m.tool_calls,
                    "created_at": m.created_at.isoformat() if m.created_at else None,
                }
                for m in messages
            ],
        }

    def delete(
        self,
        db: Session,
        doctor_id: int,
        conversation_id: str,
    ) -> bool:
        row = self._find_for_doctor(db, doctor_id, conversation_id)
        if row is None:
            return False
        db.delete(row)
        db.commit()
        return True

    # ------------------------------------------------------------------
    # Internals
    # ------------------------------------------------------------------

    def _find_for_doctor(
        self,
        db: Session,
        doctor_id: int,
        conversation_id: Optional[str],
    ) -> Optional[AssistantConversation]:
        if not conversation_id:
            return None
        try:
            cid = int(conversation_id)
        except (TypeError, ValueError):
            return None
        return (
            db.query(AssistantConversation)
            .filter(
                AssistantConversation.id == cid,
                AssistantConversation.doctor_id == doctor_id,
            )
            .first()
        )

    def _to_dataclass(
        self,
        db: Session,
        row: AssistantConversation,
    ) -> Conversation:
        messages = (
            db.query(AssistantMessage)
            .filter(AssistantMessage.conversation_id == row.id)
            .order_by(AssistantMessage.id.desc())
            .limit(self._max_history)
            .all()
        )
        # Fetched newest-first for the limit; reverse back to chrono order.
        messages.reverse()
        history = [
            {"role": m.role, "parts": [m.content]}
            for m in messages
        ]
        return Conversation(
            doctor_id=row.doctor_id,
            conversation_id=str(row.id),
            history=history,
            current_patient_id=row.current_patient_id,
            created_at=row.created_at,
            last_activity=row.last_activity,
        )

    @staticmethod
    def _derive_title(db: Session, conversation_id: int) -> str:
        """Cheap title: first user message truncated."""
        first = (
            db.query(AssistantMessage)
            .filter(
                AssistantMessage.conversation_id == conversation_id,
                AssistantMessage.role == "user",
            )
            .order_by(AssistantMessage.id.asc())
            .first()
        )
        if first is None:
            return "Conversación sin mensajes"
        text = (first.content or "").strip()
        return (text[:60] + "…") if len(text) > 60 else (text or "Sin título")


# Module-level singleton the agent imports.
session_state = AssistantSessionState()
