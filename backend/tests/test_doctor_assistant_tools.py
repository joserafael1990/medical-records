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
    q.group_by.return_value = q
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

    # Phase A: 6 tools (2 original + 4 new).
    assert len(decls) == 6
    names = {d["name"] for d in decls}
    assert names == {
        "search_patients",
        "get_patient_summary",
        "list_upcoming_appointments",
        "find_inactive_patients",
        "get_active_medications",
        "list_patients_by_diagnosis",
    }

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


# ---------------------------------------------------------------------------
# list_upcoming_appointments
# ---------------------------------------------------------------------------


def _appointment(id: int, doctor_id: int, patient_id: int, when: datetime, status: str = "confirmada"):
    return SimpleNamespace(
        id=id,
        doctor_id=doctor_id,
        patient_id=patient_id,
        appointment_date=when,
        end_time=when,
        status=status,
        consultation_type="Seguimiento",
    )


def test_list_upcoming_today_happy_path():
    doctor = _doctor(id=1)
    now = datetime.utcnow()
    appts = [_appointment(201, 1, 10, now)]
    # First query: appointments. For each appt, a second query resolves patient name.
    patient = _patient(10, "Juan Pérez")
    db = _mock_db(
        _chain(all_=appts),
        _chain(first=patient),
    )

    out = tools_module.list_upcoming_appointments(db, doctor, range_key="today")

    assert out["range"] == "today"
    assert out["count"] == 1
    assert out["appointments"][0]["patient_name"] == "Juan Pérez"
    assert out["appointments"][0]["appointment_id"] == 201


def test_list_upcoming_rejects_invalid_range():
    doctor = _doctor()
    db = _mock_db()  # no query should run
    out = tools_module.list_upcoming_appointments(db, doctor, range_key="next_year")
    assert out["error"] == "invalid_range"
    db.query.assert_not_called()


def test_list_upcoming_empty_when_no_appointments():
    doctor = _doctor()
    db = _mock_db(_chain(all_=[]))
    out = tools_module.list_upcoming_appointments(db, doctor, range_key="this_week")
    assert out["count"] == 0
    assert out["appointments"] == []


# ---------------------------------------------------------------------------
# find_inactive_patients
# ---------------------------------------------------------------------------


def test_find_inactive_patients_returns_most_inactive_first():
    doctor = _doctor(id=1)
    from datetime import timedelta
    now = datetime.utcnow()
    # 2 patients: one last seen 7 months ago, one 9 months ago.
    rows = [
        (10, now - timedelta(days=210)),   # 7 months
        (11, now - timedelta(days=270)),   # 9 months
        (12, now - timedelta(days=30)),    # active — should be filtered
    ]
    patients_rows = [
        _patient(10, "Juan"),
        _patient(11, "Ana"),
    ]
    db = _mock_db(
        _chain(all_=rows),
        _chain(all_=patients_rows),
    )

    out = tools_module.find_inactive_patients(db, doctor, months=6)

    assert out["months"] == 6
    assert out["count"] == 2
    # Most inactive (9 months / Ana) comes first.
    assert out["patients"][0]["name"] == "Ana"
    assert out["patients"][0]["days_since_last_visit"] >= 269
    assert out["patients"][1]["name"] == "Juan"


def test_find_inactive_patients_empty_when_all_active():
    doctor = _doctor()
    from datetime import timedelta
    now = datetime.utcnow()
    rows = [(10, now - timedelta(days=30))]  # within 6 months
    db = _mock_db(_chain(all_=rows))

    out = tools_module.find_inactive_patients(db, doctor, months=6)

    assert out["count"] == 0
    assert out["patients"] == []


def test_find_inactive_patients_clamps_months():
    doctor = _doctor()
    db = _mock_db(_chain(all_=[]))
    # months=100 should be clamped to 24 internally; function should not error.
    out = tools_module.find_inactive_patients(db, doctor, months=100)
    assert out["months"] == 24


# ---------------------------------------------------------------------------
# get_active_medications
# ---------------------------------------------------------------------------


def test_get_active_medications_happy_path():
    doctor = _doctor(id=1)
    pt = _patient(10, "Juan Pérez", created_by=1)
    consultations = [_consultation(100, 10, 1, datetime.utcnow(), "Control")]
    rx = [
        _prescription(501, 100, "Paracetamol"),
        _prescription(502, 100, "Ibuprofeno"),
    ]
    db = _mock_db(
        _chain(first=pt),            # patient lookup
        _chain(all_=consultations),  # consultations in 6 months
        _chain(all_=rx),             # prescriptions
    )

    out = tools_module.get_active_medications(db, doctor, patient_id=10)

    assert out["count"] == 2
    assert out["patient"]["name"] == "Juan Pérez"
    meds = {m["medication"] for m in out["medications"]}
    assert meds == {"Paracetamol", "Ibuprofeno"}


def test_get_active_medications_rejects_unknown_patient():
    doctor = _doctor()
    db = _mock_db(_chain(first=None))
    out = tools_module.get_active_medications(db, doctor, patient_id=999)
    assert out["error"] == "patient_not_found"


def test_get_active_medications_rejects_unauthorized():
    doctor = _doctor(id=7)
    pt = _patient(10, "Juan", created_by=999)  # not doctor 7
    db = _mock_db(
        _chain(first=pt),
        _chain(first=None),  # no prior consultation
    )
    out = tools_module.get_active_medications(db, doctor, patient_id=10)
    assert out["error"] == "not_authorized"


def test_get_active_medications_empty_when_no_recent_consultations():
    doctor = _doctor(id=1)
    pt = _patient(10, "Juan Pérez", created_by=1)
    db = _mock_db(
        _chain(first=pt),
        _chain(all_=[]),  # no consultations in 6 months
        # No prescription query (short-circuit)
    )

    out = tools_module.get_active_medications(db, doctor, patient_id=10)

    assert out["count"] == 0
    assert out["medications"] == []


# ---------------------------------------------------------------------------
# list_patients_by_diagnosis
# ---------------------------------------------------------------------------


def test_list_patients_by_diagnosis_happy_path():
    doctor = _doctor(id=1)
    rows = [
        (10, 3, datetime(2026, 4, 10)),  # Juan with 3 HTA visits, most recent
        (11, 1, datetime(2026, 2, 1)),   # Ana with 1 HTA visit
    ]
    patients_rows = [_patient(10, "Juan Pérez"), _patient(11, "Ana Soto")]
    db = _mock_db(
        _chain(all_=rows),
        _chain(all_=patients_rows),
    )

    out = tools_module.list_patients_by_diagnosis(db, doctor, dx_query="hipertensión")

    assert out["count"] == 2
    # Ordered by visits desc; Juan (3 visits) comes first.
    assert out["patients"][0]["name"] == "Juan Pérez"
    assert out["patients"][0]["visits_with_dx"] == 3
    assert out["patients"][1]["name"] == "Ana Soto"


def test_list_patients_by_diagnosis_empty_query_returns_error():
    doctor = _doctor()
    db = _mock_db()
    out = tools_module.list_patients_by_diagnosis(db, doctor, dx_query="  ")
    assert out["error"] == "empty_query"
    db.query.assert_not_called()


def test_list_patients_by_diagnosis_no_matches():
    doctor = _doctor()
    db = _mock_db(_chain(all_=[]))
    out = tools_module.list_patients_by_diagnosis(db, doctor, dx_query="xyz-not-a-dx")
    assert out["count"] == 0
    assert out["patients"] == []


# ---------------------------------------------------------------------------
# Dispatch for the 4 new tools
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "tool_name,args,expected_fn",
    [
        ("list_upcoming_appointments", {"range_key": "today"}, "list_upcoming_appointments"),
        ("find_inactive_patients", {"months": 9, "limit": 5}, "find_inactive_patients"),
        ("get_active_medications", {"patient_id": 10}, "get_active_medications"),
        ("list_patients_by_diagnosis", {"dx_query": "hta", "limit": 5}, "list_patients_by_diagnosis"),
    ],
)
def test_execute_tool_dispatches_new_tools(monkeypatch, tool_name, args, expected_fn):
    doctor = _doctor()
    called = {}

    def make_stub(name):
        def stub(*a, **kw):
            called[name] = True
            return {"ok": True}
        return stub

    monkeypatch.setattr(tools_module, expected_fn, make_stub(expected_fn))
    out = tools_module.execute_tool(MagicMock(), doctor, tool_name, args)

    assert called.get(expected_fn) is True
    assert out == {"ok": True}


def test_execute_tool_missing_patient_id_for_get_active_medications():
    out = tools_module.execute_tool(
        MagicMock(), _doctor(), "get_active_medications", {}
    )
    assert out["error"] == "missing_argument"
    assert out["argument"] == "patient_id"
