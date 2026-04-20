"""LLM observability — in-house alternative to Langfuse.

Tiny service that persists every LLM round-trip to `llm_traces` with
PHI-containing fields encrypted at rest. A `trace_id` groups multiple
rows that belong to the same user-visible turn (useful when a single
doctor-assistant question triggers 2-3 Gemini calls with tool-use in
between).

Designed to be zero-disruption for existing agents: wrap the Gemini
call in `LLMTracer(...)`, assign the response/tokens to the tracer,
and the service writes the row on exit. On errors it still writes a
row with the exception so failed calls are traceable too.
"""

from __future__ import annotations

import time
import uuid
from contextlib import AbstractContextManager
from typing import Any, Dict, List, Optional, Union

from sqlalchemy import delete
from sqlalchemy.orm import Session

from encryption import encryption_service
from logger import get_logger
from models.base import SessionLocal, utc_now
from models.llm_trace import LLMTrace

api_logger = get_logger("medical_records.llm_tracing")

# Gemini 2.5 Flash pricing (per 1M tokens, USD). Kept as module-level
# constants so a single price change is one edit.
_PRICE_PER_MILLION = {
    "gemini-2.5-flash": {"input": 0.30, "audio_input": 1.00, "output": 2.50},
    "gemini-2.5-pro": {"input": 1.25, "audio_input": 3.00, "output": 10.00},
    "gemini-2.0-flash": {"input": 0.075, "audio_input": 0.70, "output": 0.30},
    "gemini-2.0-flash-lite": {"input": 0.075, "audio_input": 0.70, "output": 0.30},
}
_DEFAULT_PRICE = {"input": 0.30, "audio_input": 1.00, "output": 2.50}


def _encrypt(value: Optional[str]) -> Optional[str]:
    """Encrypt a text value before writing to llm_traces. Empty → None."""
    if not value:
        return None
    try:
        return encryption_service.encrypt_sensitive_data(value)
    except Exception as err:
        api_logger.warning("Failed to encrypt llm_trace field: %s", err)
        # Fall back to raw — worse than ideal but we'd rather lose the
        # encryption than drop observability entirely.
        return value


def _decrypt(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    try:
        return encryption_service.decrypt_sensitive_data(value)
    except Exception:
        return value


def _estimate_cost(model: Optional[str], prompt_tokens: int, completion_tokens: int) -> float:
    if not model:
        price = _DEFAULT_PRICE
    else:
        price = _PRICE_PER_MILLION.get(model.lower(), _DEFAULT_PRICE)
    return round(
        (prompt_tokens * price["input"] + completion_tokens * price["output"]) / 1_000_000,
        6,
    )


class LLMTracer(AbstractContextManager):
    """Context manager that records one LLM round-trip.

    Usage:
        with LLMTracer(db, source="doctor_assistant", user_id=doctor.id,
                       system_prompt=DOCTOR_ASSISTANT_PROMPT,
                       user_input=message,
                       model="gemini-2.5-flash") as tracer:
            response = model.generate_content(...)
            tracer.capture_response(response)
            tracer.add_tool_call("lookup_patient", {"id": 42}, result={...})
    """

    def __init__(
        self,
        db: Optional[Session] = None,
        *,
        source: str,
        user_id: Optional[int] = None,
        patient_id: Optional[int] = None,
        session_id: Optional[str] = None,
        trace_id: Optional[uuid.UUID] = None,
        system_prompt: Optional[str] = None,
        user_input: Optional[str] = None,
        conversation_history: Optional[List[Dict[str, Any]]] = None,
        tools_available: Optional[List[Dict[str, Any]]] = None,
        model: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ):
        self._owned_session = db is None
        self.db: Session = db or SessionLocal()
        self.source = source
        self.user_id = user_id
        self.patient_id = patient_id
        self.session_id = session_id
        self.trace_id = trace_id or uuid.uuid4()
        self.system_prompt = system_prompt
        self.user_input = user_input
        self.conversation_history = conversation_history
        self.tools_available = tools_available
        self.model = model
        self.metadata = metadata or {}

        self.response_text: Optional[str] = None
        self.tool_calls: List[Dict[str, Any]] = []
        self.tool_results: List[Dict[str, Any]] = []
        self.finish_reason: Optional[str] = None
        self.prompt_tokens: int = 0
        self.completion_tokens: int = 0
        self.error: Optional[str] = None
        self._start: float = 0.0

    def __enter__(self) -> "LLMTracer":
        self._start = time.monotonic()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb) -> bool:
        latency_ms = int((time.monotonic() - self._start) * 1000)
        if exc_val is not None:
            self.error = f"{exc_type.__name__}: {exc_val}"
        self._persist(latency_ms)
        if self._owned_session:
            try:
                self.db.close()
            except Exception:
                pass
        return False  # never suppress exceptions

    # ---- setters callers use inside the with block ----

    def capture_response(self, response: Any) -> None:
        """Extract usage + text + finish_reason from a Vertex response."""
        try:
            usage = getattr(response, "usage_metadata", None)
            if usage is not None:
                self.prompt_tokens = int(getattr(usage, "prompt_token_count", 0) or 0)
                self.completion_tokens = int(getattr(usage, "candidates_token_count", 0) or 0)
            candidates = getattr(response, "candidates", []) or []
            if candidates:
                self.finish_reason = str(getattr(candidates[0], "finish_reason", "") or "")[:32]
                parts = getattr(candidates[0].content, "parts", []) or []
                chunks = [getattr(p, "text", "") for p in parts if getattr(p, "text", None)]
                text = " ".join(c for c in chunks if c).strip()
                if text:
                    self.response_text = text
        except Exception as err:
            api_logger.warning("capture_response failed: %s", err)

    def set_response_text(self, text: Optional[str]) -> None:
        self.response_text = text

    def set_token_counts(self, prompt_tokens: int, completion_tokens: int) -> None:
        self.prompt_tokens = int(prompt_tokens or 0)
        self.completion_tokens = int(completion_tokens or 0)

    def add_tool_call(self, name: str, args: Dict[str, Any], result: Any = None) -> None:
        self.tool_calls.append({"name": name, "args": args})
        self.tool_results.append({"name": name, "result": result})

    def extend_tool_calls(
        self,
        calls: List[Dict[str, Any]],
        results: Optional[List[Dict[str, Any]]] = None,
    ) -> None:
        self.tool_calls.extend(calls or [])
        self.tool_results.extend(results or [])

    def set_error(self, message: str) -> None:
        self.error = message

    # ---- persistence ----

    def _persist(self, latency_ms: int) -> None:
        try:
            row = LLMTrace(
                created_at=utc_now(),
                trace_id=self.trace_id,
                source=self.source,
                model=self.model,
                system_prompt=self.system_prompt,
                user_input=_encrypt(self.user_input),
                conversation_history=self.conversation_history,
                tools_available=self.tools_available,
                response_text=_encrypt(self.response_text),
                tool_calls=self.tool_calls or None,
                tool_results=self.tool_results or None,
                finish_reason=self.finish_reason,
                prompt_tokens=self.prompt_tokens or None,
                completion_tokens=self.completion_tokens or None,
                latency_ms=latency_ms,
                cost_usd=_estimate_cost(self.model, self.prompt_tokens, self.completion_tokens),
                user_id=self.user_id,
                patient_id=self.patient_id,
                session_id=self.session_id,
                error=self.error,
                trace_metadata=self.metadata or None,
            )
            self.db.add(row)
            self.db.commit()
        except Exception as persist_err:
            api_logger.error("Failed to persist llm_trace: %s", persist_err)
            try:
                self.db.rollback()
            except Exception:
                pass


def decrypt_trace_row(row: Union[LLMTrace, Dict[str, Any]]) -> Dict[str, Any]:
    """Decrypt PHI fields on a trace row for admin display.

    Accepts either the ORM object or a dict; returns a dict suitable
    for JSON serialization.
    """
    if isinstance(row, LLMTrace):
        data = {
            "id": row.id,
            "created_at": row.created_at.isoformat() if row.created_at else None,
            "trace_id": str(row.trace_id) if row.trace_id else None,
            "source": row.source,
            "model": row.model,
            "system_prompt": row.system_prompt,
            "user_input": _decrypt(row.user_input),
            "conversation_history": row.conversation_history,
            "tools_available": row.tools_available,
            "response_text": _decrypt(row.response_text),
            "tool_calls": row.tool_calls,
            "tool_results": row.tool_results,
            "finish_reason": row.finish_reason,
            "prompt_tokens": row.prompt_tokens,
            "completion_tokens": row.completion_tokens,
            "latency_ms": row.latency_ms,
            "cost_usd": float(row.cost_usd) if row.cost_usd is not None else None,
            "user_id": row.user_id,
            "patient_id": row.patient_id,
            "session_id": row.session_id,
            "error": row.error,
            "metadata": row.trace_metadata,
        }
    else:
        data = dict(row)
        data["user_input"] = _decrypt(data.get("user_input"))
        data["response_text"] = _decrypt(data.get("response_text"))
    return data


def purge_old_traces(
    db: Optional[Session] = None,
    retention_days: int = 90,
) -> int:
    """Delete llm_traces rows older than `retention_days`. Returns count.

    Called daily from the scheduler. Runs in its own session when `db`
    is None.
    """
    from datetime import timedelta

    owned = db is None
    session = db or SessionLocal()
    try:
        cutoff = utc_now() - timedelta(days=retention_days)
        result = session.execute(
            delete(LLMTrace).where(LLMTrace.created_at < cutoff)
        )
        session.commit()
        deleted = result.rowcount or 0
        if deleted:
            api_logger.info("Purged %s llm_traces older than %s days", deleted, retention_days)
        return deleted
    except Exception as err:
        api_logger.error("purge_old_traces failed: %s", err)
        session.rollback()
        return 0
    finally:
        if owned:
            session.close()
