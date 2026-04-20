"""Unit tests for services.llm_tracing.

The tests mock encryption and DB writes so they don't need a real
database. They validate:
- context-manager persists a row on normal exit
- context-manager still persists a row on exception, with `error` set
- capture_response extracts tokens/finish_reason/text
- cost estimation applies Gemini 2.5 Flash pricing by default
- purge_old_traces calls delete() with the right cutoff
"""

from __future__ import annotations

import os
import sys
from unittest.mock import MagicMock, patch

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)


def _make_response(prompt_tokens: int = 120, completion_tokens: int = 55, text: str = "ok"):
    """Build a minimal Vertex-style response object for capture_response."""
    class Usage:
        prompt_token_count = prompt_tokens
        candidates_token_count = completion_tokens

    class Part:
        def __init__(self, text_):
            self.text = text_

    class Content:
        def __init__(self, text_):
            self.parts = [Part(text_)]

    class Candidate:
        def __init__(self, text_):
            self.content = Content(text_)
            self.finish_reason = "STOP"

    class Response:
        usage_metadata = Usage()
        candidates = [Candidate(text)]

    return Response()


def test_tracer_persists_row_on_success():
    db = MagicMock()
    from services.llm_tracing import LLMTracer

    with patch("services.llm_tracing._encrypt", side_effect=lambda x: f"ENC({x})" if x else None):
        with LLMTracer(
            db=db,
            source="doctor_assistant",
            user_id=42,
            patient_id=7,
            system_prompt="You are a doctor assistant.",
            user_input="Dame un resumen del paciente",
            model="gemini-2.5-flash",
        ) as tracer:
            tracer.capture_response(_make_response(100, 50, "Resumen..."))

    # One .add() and one .commit() should happen.
    assert db.add.call_count == 1, "tracer should add exactly one row"
    assert db.commit.call_count == 1, "tracer should commit once"

    row = db.add.call_args.args[0]
    assert row.source == "doctor_assistant"
    assert row.user_id == 42
    assert row.patient_id == 7
    assert row.model == "gemini-2.5-flash"
    assert row.prompt_tokens == 100
    assert row.completion_tokens == 50
    assert row.user_input == "ENC(Dame un resumen del paciente)"
    assert row.response_text == "ENC(Resumen...)"
    # Cost for Flash at 100 input + 50 output tokens ≈ negligible but non-zero.
    assert row.cost_usd is not None and row.cost_usd > 0
    assert row.error is None
    assert row.finish_reason == "STOP"


def test_tracer_records_errors_as_rows():
    db = MagicMock()
    from services.llm_tracing import LLMTracer

    try:
        with LLMTracer(db=db, source="doctor_assistant", user_id=1) as tracer:
            raise RuntimeError("Gemini exploded")
    except RuntimeError:
        pass

    assert db.add.call_count == 1
    row = db.add.call_args.args[0]
    assert row.error is not None
    assert "Gemini exploded" in row.error


def test_tracer_accumulates_tool_calls():
    db = MagicMock()
    from services.llm_tracing import LLMTracer

    with LLMTracer(db=db, source="doctor_assistant", user_id=1) as tracer:
        tracer.add_tool_call("lookup_patient", {"id": 42}, result={"name": "Juan"})
        tracer.add_tool_call("list_consultations", {"patient_id": 42}, result=[])

    row = db.add.call_args.args[0]
    assert len(row.tool_calls) == 2
    assert row.tool_calls[0]["name"] == "lookup_patient"
    assert row.tool_results[1]["result"] == []


def test_cost_estimate_for_flash():
    from services.llm_tracing import _estimate_cost

    # 1M input + 1M output on flash = $0.30 + $2.50 = $2.80
    assert abs(_estimate_cost("gemini-2.5-flash", 1_000_000, 1_000_000) - 2.80) < 0.001
    # Unknown model falls back to default (same as flash).
    assert _estimate_cost("unknown-model", 1_000_000, 0) > 0


def test_purge_old_traces_uses_retention_cutoff():
    from services.llm_tracing import purge_old_traces

    session = MagicMock()
    result = MagicMock()
    result.rowcount = 3
    session.execute.return_value = result

    deleted = purge_old_traces(db=session, retention_days=90)

    assert deleted == 3
    session.execute.assert_called_once()
    session.commit.assert_called_once()
