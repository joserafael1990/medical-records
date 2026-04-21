"""Unit tests for crud.appointment.create_appointment.

Regression coverage for the end_time-null bug: when callers passed a
Pydantic AppointmentCreate (as FastAPI does), model_dump() emits
end_time=None, and the membership check `'end_time' not in data` was
False — the auto-calculation branch was skipped and the INSERT failed
with a NOT NULL violation on appointments.end_time.
"""
from datetime import datetime
from types import SimpleNamespace
from typing import Optional
from unittest.mock import MagicMock

import pytz


def _mock_db_with_doctor(duration: Optional[int] = 60):
    doctor = SimpleNamespace(id=1, appointment_duration=duration)
    db = MagicMock()
    db.query.return_value.filter.return_value.first.return_value = doctor
    db.add = MagicMock()
    db.commit = MagicMock()
    db.refresh = MagicMock()
    return db


def _patch_parse(monkeypatch):
    """Stub parse_appointment_date so tests don't need the prod impl.

    `crud/appointment.py` imports it lazily inside the function, so we inject
    a fake `services.appointments.validation` module into sys.modules before
    the function runs. This also sidesteps the real module's 3.10+ `str |
    datetime` annotation (our CI uses 3.10+; local dev often has 3.9)."""
    import sys
    import types as _types

    def _fake_parse(start, tz_name, *_a, **_kw):
        if isinstance(start, datetime):
            return start
        dt = datetime.fromisoformat(start.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = pytz.timezone(tz_name or "America/Mexico_City").localize(dt)
        return dt

    fake = _types.ModuleType("services.appointments.validation")
    fake.parse_appointment_date = _fake_parse
    monkeypatch.setitem(sys.modules, "services.appointments.validation", fake)


def test_pydantic_model_dump_always_emits_end_time_none():
    """Invariant: AppointmentCreate.model_dump() always includes end_time.

    The crud guard must therefore check truthiness, not key membership.
    """
    import schemas

    payload = schemas.AppointmentCreate(
        patient_id=10, doctor_id=1,
        appointment_date="2026-05-01T10:00:00-06:00",
        appointment_type_id=1,
    )
    data = payload.model_dump()
    assert "end_time" in data
    assert data["end_time"] is None


def test_create_appointment_from_pydantic_computes_end_time(monkeypatch):
    """If caller passes Pydantic model without end_time, crud must compute it."""
    import schemas
    import crud.appointment as mod

    captured = {}

    class _FakeAppt:
        def __init__(self, **kwargs):
            captured.update(kwargs)
            for k, v in kwargs.items():
                setattr(self, k, v)
            self.id = 999

    monkeypatch.setattr(mod, "Appointment", _FakeAppt)
    _patch_parse(monkeypatch)

    db = _mock_db_with_doctor(duration=60)
    payload = schemas.AppointmentCreate(
        patient_id=10, doctor_id=1,
        appointment_date="2026-05-01T10:00:00-06:00",
        appointment_type_id=1,
    )
    mod.create_appointment(db, payload, doctor_id=1)

    assert captured.get("end_time") is not None, (
        "end_time must be auto-computed when omitted — Pydantic emits None, "
        "so the guard in crud must use `not data.get('end_time')` rather "
        "than `'end_time' not in data`."
    )
    # Sanity check: end_time == start + duration minutes
    start = captured["appointment_date"]
    from datetime import timedelta
    assert captured["end_time"] == start + timedelta(minutes=60)


def test_create_appointment_respects_caller_provided_end_time(monkeypatch):
    """If caller provides end_time explicitly, it must be preserved (not overwritten)."""
    from datetime import datetime, timedelta
    import crud.appointment as mod

    captured = {}

    class _FakeAppt:
        def __init__(self, **kwargs):
            captured.update(kwargs)
            self.id = 1

    monkeypatch.setattr(mod, "Appointment", _FakeAppt)
    _patch_parse(monkeypatch)

    db = _mock_db_with_doctor(duration=30)
    explicit_end = "2026-05-01T10:45:00-06:00"
    data = {
        "patient_id": 10,
        "doctor_id": 1,
        "appointment_date": "2026-05-01T10:00:00-06:00",
        "appointment_type_id": 1,
        "end_time": explicit_end,
    }
    mod.create_appointment(db, data, doctor_id=1)

    assert captured["end_time"] == explicit_end, (
        "caller-provided end_time must not be replaced by the auto-calculation"
    )


def test_create_appointment_from_dict_without_end_time_still_computes(monkeypatch):
    """Legacy dict path: omit end_time entirely, crud should still compute it."""
    import crud.appointment as mod

    captured = {}

    class _FakeAppt:
        def __init__(self, **kwargs):
            captured.update(kwargs)
            self.id = 2

    monkeypatch.setattr(mod, "Appointment", _FakeAppt)
    _patch_parse(monkeypatch)

    db = _mock_db_with_doctor(duration=45)
    data = {
        "patient_id": 10,
        "doctor_id": 1,
        "appointment_date": "2026-05-01T10:00:00-06:00",
        "appointment_type_id": 1,
    }
    mod.create_appointment(db, data, doctor_id=1)

    assert captured.get("end_time") is not None
