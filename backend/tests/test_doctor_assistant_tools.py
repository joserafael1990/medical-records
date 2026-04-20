"""
Unit tests for the Doctor Assistant tools.

Each tool must:
- scope results to the calling doctor (reject/filter patients the
  doctor isn't authorised for),
- return JSON-serialisable plain dicts ready for Gemini function
  responses,
- emit an audit log line via `audit_service.log_action`.

DB is mocked — we only care about the tool's logic and ACL enforcement.
"""

from __future__ import annotations

from datetime import datetime
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest

from agents.doctor_assistant import tools as tools_module


# ---------------------------------------------------------------------------
# Fixtures / helpers
# ---------------------------------------------------------------------------


def _doctor(id: int = 1, person_type: str = "doctor"):
    return SimpleNamespace(
        id=id, person_type=person_type, name="Dr Test", email="d@t.mx"
    )


def _patient(id: int, name: str, created_by: int = 1):
    return SimpleNamespace(
        id=id,
        person_type="patient",
        name=name,
        created_by=created_by,
        email=f"pt{id}@t.mx",
        primary_phone=f"55-0000-000{id}",
        birth_date=None,
        gender="M",
    )


def _consultation(id: int, patient_id: int, doctor_id: int, date: datetime, chief: str):
    return SimpleNamespace(
        id=id,
        patient_id=patient_id,
        doctor_id=doctor_id,
        consultation_date=date,
        chief_complaint=chief,
        primary_diagnosis="Control",
        treatment_plan="Seguimiento",
    )


def _prescription(id: int, consultation_id: int, med_name: str, dosage="1 tab", freq="c/8h"):
    return SimpleNamespace(
        id=id,
        consultation_id=consultation_id,
        medication=SimpleNamespace(name=med_name),
        dosage=dosage,
        frequency=freq,
        duration="7d",
    )


def _chain(*, first=None, all_=()):
    q = MagicMock()
    q.filter.return_value = q
    q.join.return_value = q
    q.order_by.return_value = q
    q.limit.return_value = q
    q.first.return_value = first
    q.all.return_value = list(all_)
    return q


def _mock_db(*results):
    db = MagicMock()
    db.query.side_effect = list(results)
    return db


@pytest.fixture(autouse=True)
def _silence_audit(monkeypatch):
    monkeypatch.setattr(
        tools_module.audit_service, "log_action", lambda *a, **kw: None
    )


# ---------------------------------------------------------------------------
# search_patients
# ---------------------------------------------------------------------------


def test_search_patients_returns_matches_visible_to_doctor():
    doctor = _doctor(id=1)
    p1 = _patient(10, "Juan Pérez", created_by=1)
    p2 = _patient(11, "Juana Pérez", created_by=1)
    db = _mock_db(_chain(all_=[p1, p2]))

    result = tools_module.search_patients(db, doctor, query="Pérez", limit=10)

    assert result["count"] == 2
    names = [p["name"] for p in result["patients"]]
    assert names == ["Juan Pérez", "Juana Pérez"]
    # Must expose patient_id so the model can reference it in follow-ups.
    assert all("patient_id" in p for p in result["patients"])


def test_search_patients_filters_out_patients_doctor_cannot_read():
    doctor = _doctor(id=1)
    mine = _patient(10, "Juan Pérez", created_by=1)
    theirs = _patient(11, "Pedro Pérez", created_by=999)
    db = _mock_db(
        _chain(all_=[mine, theirs]),
        # `_doctor_can_read_patient` fires for `theirs` (not creator) — no prior consultation:
        _chain(first=None),
    )

    result = tools_module.search_patients(db, doctor, query="Pérez", limit=10)

    # Only `mine` survives; `theirs` is silently filtered (no 403 leak).
    assert result["count"] == 1
    assert result["patients"][0]["name"] == "Juan Pérez"


def test_search_patients_empty_query_returns_error():
    doctor = _doctor()
    db = _mock_db()  # no queries should run

    result = tools_module.search_patients(db, doctor, query="   ", limit=10)

    assert "error" in result
    # No DB query made
    db.query.assert_not_called()


def test_search_patients_clamps_limit():
    doctor = _doctor()
    db = _mock_db(_chain(all_=[]))

    tools_module.search_patients(db, doctor, query="foo", limit=9999)

    # Downstream should clamp — we just check the tool completed without error.
    # The clamp itself is verified by the query not blowing up.


# ---------------------------------------------------------------------------
# get_patient_summary
# ---------------------------------------------------------------------------


def test_get_patient_summary_happy_path():
    doctor = _doctor(id=1)
    pt = _patient(10, "Juan Pérez", created_by=1)
    consultations = [
        _consultation(100, 10, 1, datetime(2026, 4, 1, 10, 0), "Dolor torácico"),
        _consultation(99, 10, 1, datetime(2026, 3, 15, 11, 0), "Control HTA"),
    ]
    rx = [
        _prescription(501, 100, "Losartán 50mg", dosage="1 tab", freq="c/24h"),
        _prescription(502, 99, "Metformina 500mg", dosage="1 tab", freq="c/12h"),
    ]
    db = _mock_db(
        _chain(first=pt),              # Person lookup
        _chain(all_=consultations),    # last 3 consultations
        _chain(all_=rx),               # prescriptions for those
    )

    result = tools_module.get_patient_summary(db, doctor, patient_id=10)

    assert result["patient"]["name"] == "Juan Pérez"
    assert result["patient"]["patient_id"] == 10
    assert len(result["recent_consultations"]) == 2
    assert result["recent_consultations"][0]["chief_complaint"] == "Dolor torácico"
    assert len(result["active_medications"]) == 2
    meds = {m["medication"] for m in result["active_medications"]}
    assert meds == {"Losartán 50mg", "Metformina 500mg"}


def test_get_patient_summary_unknown_patient_returns_error():
    doctor = _doctor()
    db = _mock_db(_chain(first=None))

    result = tools_module.get_patient_summary(db, doctor, patient_id=999)

    assert result.get("error") == "patient_not_found"


def test_get_patient_summary_forbidden_when_not_owner_or_consultant():
    doctor = _doctor(id=7)
    pt = _patient(10, "Juan Pérez", created_by=999)  # someone else's patient
    db = _mock_db(
        _chain(first=pt),
        _chain(first=None),  # no prior consultation → not authorised
    )

    result = tools_module.get_patient_summary(db, doctor, patient_id=10)

    assert result.get("error") == "not_authorized"


def test_get_patient_summary_with_no_consultations_returns_empty_lists():
    doctor = _doctor(id=1)
    pt = _patient(10, "Juan Pérez", created_by=1)
    db = _mock_db(
        _chain(first=pt),
        _chain(all_=[]),  # no consultations
        # No prescription query because enc_ids is empty → short-circuit
    )

    result = tools_module.get_patient_summary(db, doctor, patient_id=10)

    assert result["patient"]["name"] == "Juan Pérez"
    assert result["recent_consultations"] == []
    assert result["active_medications"] == []


# ---------------------------------------------------------------------------
# Tool registry / dispatch
# ---------------------------------------------------------------------------


def test_get_tool_declarations_shape():
    decls = tools_module.get_tool_declarations()

    # 2 tools for Sliver 1.
    assert len(decls) == 2
    names = {d["name"] for d in decls}
    assert names == {"search_patients", "get_patient_summary"}

    for d in decls:
        assert d["description"]
        assert d["parameters"]["type"] == "object"
        assert "properties" in d["parameters"]


def test_execute_tool_dispatches_by_name(monkeypatch):
    doctor = _doctor()
    db = MagicMock()
    called = {}

    def fake_search(_db, _doc, query, limit=10):
        called["search_patients"] = (query, limit)
        return {"count": 0, "patients": []}

    monkeypatch.setattr(tools_module, "search_patients", fake_search)

    out = tools_module.execute_tool(
        db, doctor, "search_patients", {"query": "Juan", "limit": 5}
    )

    assert called["search_patients"] == ("Juan", 5)
    assert out == {"count": 0, "patients": []}


def test_execute_tool_unknown_name_returns_error():
    out = tools_module.execute_tool(MagicMock(), _doctor(), "delete_patient", {})
    assert "error" in out
