"""
In-memory session state for the Doctor Assistant.

Sliver 1 deliberately keeps conversations in-process memory. They are
scoped by `(doctor_id, conversation_id)` and expire after a configurable
idle timeout. A DB-backed store is a later iteration (see Sliver 2).

Trade-off: losing history on pod restart is fine for an internal MVP
being piloted by 1-2 doctors. Before opening to real production users
this MUST be swapped for persistent storage so NOM-004 auditability
and multi-pod deployments work correctly.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from threading import RLock
from typing import Dict, List, Optional, Tuple


DEFAULT_IDLE_TIMEOUT = timedelta(hours=1)
DEFAULT_MAX_HISTORY = 40  # messages, round-tripped (user + model count as 2)


@dataclass
class Conversation:
    doctor_id: int
    conversation_id: str
    history: List[Dict] = field(default_factory=list)
    current_patient_id: Optional[int] = None
    created_at: datetime = field(default_factory=datetime.utcnow)
    last_activity: datetime = field(default_factory=datetime.utcnow)


class AssistantSessionState:
    """Process-wide in-memory conversation store.

    Thread-safe via a single reentrant lock. Fine for a single
    FastAPI worker; will need replacing with Redis/DB if we scale
    horizontally.
    """

    def __init__(
        self,
        idle_timeout: timedelta = DEFAULT_IDLE_TIMEOUT,
        max_history: int = DEFAULT_MAX_HISTORY,
    ) -> None:
        self._store: Dict[Tuple[int, str], Conversation] = {}
        self._lock = RLock()
        self._idle_timeout = idle_timeout
        self._max_history = max_history

    def _key(self, doctor_id: int, conversation_id: str) -> Tuple[int, str]:
        return (doctor_id, conversation_id)

    def get_or_create(
        self,
        doctor_id: int,
        conversation_id: Optional[str] = None,
        current_patient_id: Optional[int] = None,
    ) -> Conversation:
        """Return an existing conversation or create a fresh one."""
        with self._lock:
            if conversation_id:
                conv = self._store.get(self._key(doctor_id, conversation_id))
                if conv and not self._is_expired(conv):
                    # Update the patient context if caller provided one; the
                    # UI sends it on every request so the model always sees
                    # the currently-open patient.
                    if current_patient_id is not None:
                        conv.current_patient_id = current_patient_id
                    conv.last_activity = datetime.utcnow()
                    return conv
            # Fresh conversation.
            new_id = conversation_id or str(uuid.uuid4())
            conv = Conversation(
                doctor_id=doctor_id,
                conversation_id=new_id,
                current_patient_id=current_patient_id,
            )
            self._store[self._key(doctor_id, new_id)] = conv
            return conv

    def append_turn(
        self,
        doctor_id: int,
        conversation_id: str,
        user_message: str,
        model_response: str,
    ) -> None:
        """Append one user/model exchange and trim to the max history window."""
        with self._lock:
            conv = self._store.get(self._key(doctor_id, conversation_id))
            if not conv:
                return
            conv.history.append({"role": "user", "parts": [user_message]})
            conv.history.append({"role": "model", "parts": [model_response]})
            conv.history = conv.history[-self._max_history :]
            conv.last_activity = datetime.utcnow()

    def reset(self, doctor_id: int, conversation_id: str) -> None:
        with self._lock:
            self._store.pop(self._key(doctor_id, conversation_id), None)

    def _is_expired(self, conv: Conversation) -> bool:
        return (datetime.utcnow() - conv.last_activity) > self._idle_timeout

    # Test helpers -------------------------------------------------------

    def _clear_all(self) -> None:
        """Drop every conversation — test-only."""
        with self._lock:
            self._store.clear()


# Module-level singleton — the API layer just imports and uses this.
session_state = AssistantSessionState()
