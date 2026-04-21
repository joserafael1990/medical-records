"""
Route-level tests for the intake endpoints.

Service is stubbed; we only verify auth gates, status-code mapping,
and payload shape. Service behaviour is in test_intake_service.py.
"""

from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from main_clean_english import app
from database import get_db
from dependencies import get_current_user
from routes import intake as intake_route


def _doctor(excluded=None):
    return SimpleNamespace(
        id=1,
        person_type="doctor",
        name="Dr T",
        email="d@t",
        title="Dr.",
        intake_excluded_questions=list(excluded) if excluded else [],
    )


def _patient_user():
    return SimpleNamespace(id=2, person_type="patient", name="Pt", email="p@t")


def _override(user):
    app.dependency_overrides[get_current_user] = lambda: user
    app.dependency_overrides[get_db] = lambda: MagicMock()


def _clear():
    app.dependency_overrides.clear()


@pytest.fixture
def client():
    return TestClient(app)


# ---------------------------------------------------------------------------
# POST /api/intake/send/{appointment_id}
# ---------------------------------------------------------------------------


def test_send_requires_doctor(client):
    _override(_patient_user())
    try:
        r = client.post("/api/intake/send/100")
    finally:
        _clear()
    assert r.status_code == 403


def test_send_happy_path(client, monkeypatch):
    _override(_doctor())

    class _FakeService:
        def __init__(self, db):
            self.db = db

        def send_intake(self, appointment_id, doctor):
            assert appointment_id == 100
            return {
                "sent": True,
                "response_id": 5,
                "token": "tok-abc",
                "message_id": "wamid.ABC",
            }

    monkeypatch.setattr(intake_route, "IntakeService", _FakeService)
    try:
        r = client.post("/api/intake/send/100")
    finally:
        _clear()
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["sent"] is True
    assert body["response_id"] == 5
    assert body["message_id"] == "wamid.ABC"
    # token MUST NOT be echoed by the send endpoint — it leaks via WhatsApp only.
    assert "token" not in body


def test_send_maps_unauthorized_to_404(client, monkeypatch):
    _override(_doctor())

    class _FakeService:
        def __init__(self, db):
            pass

        def send_intake(self, appointment_id, doctor):
            return {"sent": False, "error": "appointment_not_found_or_unauthorized"}

    monkeypatch.setattr(intake_route, "IntakeService", _FakeService)
    try:
        r = client.post("/api/intake/send/999")
    finally:
        _clear()
    assert r.status_code == 404


def test_send_missing_phone_returns_200_with_error(client, monkeypatch):
    """Front-end already guards against this; backend reports softly."""
    _override(_doctor())

    class _FakeService:
        def __init__(self, db):
            pass

        def send_intake(self, appointment_id, doctor):
            return {"sent": False, "error": "patient_missing_phone"}

    monkeypatch.setattr(intake_route, "IntakeService", _FakeService)
    try:
        r = client.post("/api/intake/send/100")
    finally:
        _clear()
    assert r.status_code == 200
    assert r.json() == {"sent": False, "response_id": None, "message_id": None, "error": "patient_missing_phone"}


# ---------------------------------------------------------------------------
# GET /api/intake/appointment/{id}
# ---------------------------------------------------------------------------


def test_get_for_appointment_empty(client, monkeypatch):
    _override(_doctor())

    class _FakeService:
        def __init__(self, db):
            pass

        def get_doctor_excluded_ids(self, doctor):
            return []

        def get_for_appointment(self, appointment_id, doctor):
            return None

    monkeypatch.setattr(intake_route, "IntakeService", _FakeService)
    try:
        r = client.get("/api/intake/appointment/100")
    finally:
        _clear()
    assert r.status_code == 200
    body = r.json()
    assert body["has_response"] is False
    assert len(body["questions"]) == 14
    assert "section_labels" in body
    assert "section_order" in body


def test_get_for_appointment_filters_excluded_questions(client, monkeypatch):
    _override(_doctor(excluded=["q14_additional"]))

    class _FakeService:
        def __init__(self, db):
            pass

        def get_doctor_excluded_ids(self, doctor):
            return ["q14_additional"]

        def get_for_appointment(self, appointment_id, doctor):
            return None

    monkeypatch.setattr(intake_route, "IntakeService", _FakeService)
    try:
        r = client.get("/api/intake/appointment/100")
    finally:
        _clear()
    assert r.status_code == 200
    body = r.json()
    ids = {q["id"] for q in body["questions"]}
    assert "q14_additional" not in ids
    assert len(body["questions"]) == 13


def test_get_for_appointment_with_submitted_response(client, monkeypatch):
    _override(_doctor())

    class _FakeService:
        def __init__(self, db):
            pass

        def get_doctor_excluded_ids(self, doctor):
            return []

        def get_for_appointment(self, appointment_id, doctor):
            return SimpleNamespace(
                submitted_at=__import__("datetime").datetime(2026, 4, 19),
                answers={"q1_chief_complaint": "Dolor"},
                token="tok-abc",
            )

    monkeypatch.setattr(intake_route, "IntakeService", _FakeService)
    try:
        r = client.get("/api/intake/appointment/100")
    finally:
        _clear()
    assert r.status_code == 200
    body = r.json()
    assert body["has_response"] is True
    assert body["submitted"] is True
    assert body["answers"] == {"q1_chief_complaint": "Dolor"}
    assert body["token"] == "tok-abc"


# ---------------------------------------------------------------------------
# GET/PUT /api/intake/preferences
# ---------------------------------------------------------------------------


def test_get_preferences_requires_doctor(client):
    _override(_patient_user())
    try:
        r = client.get("/api/intake/preferences")
    finally:
        _clear()
    assert r.status_code == 403


def test_get_preferences_returns_catalog_and_current_exclusions(client, monkeypatch):
    _override(_doctor(excluded=["q11_family_history"]))

    class _FakeService:
        def __init__(self, db):
            pass

        def get_doctor_excluded_ids(self, doctor):
            return list(doctor.intake_excluded_questions)

    monkeypatch.setattr(intake_route, "IntakeService", _FakeService)
    try:
        r = client.get("/api/intake/preferences")
    finally:
        _clear()
    assert r.status_code == 200
    body = r.json()
    assert body["excluded_ids"] == ["q11_family_history"]
    assert len(body["questions"]) == 14  # full catalog, UI filters
    assert "current_condition" in body["section_order"]


def test_put_preferences_saves_and_returns_normalized(client, monkeypatch):
    _override(_doctor())

    calls = {}

    class _FakeService:
        def __init__(self, db):
            pass

        def set_doctor_excluded_ids(self, doctor, excluded_ids):
            calls["received"] = list(excluded_ids)
            return True, None, ["q14_additional"]

    monkeypatch.setattr(intake_route, "IntakeService", _FakeService)
    try:
        r = client.put(
            "/api/intake/preferences",
            json={"excluded_ids": ["q14_additional", "bogus"]},
        )
    finally:
        _clear()
    assert r.status_code == 200
    body = r.json()
    assert body["excluded_ids"] == ["q14_additional"]
    assert calls["received"] == ["q14_additional", "bogus"]


def test_put_preferences_requires_doctor(client):
    _override(_patient_user())
    try:
        r = client.put("/api/intake/preferences", json={"excluded_ids": []})
    finally:
        _clear()
    assert r.status_code == 403


# ---------------------------------------------------------------------------
# GET /api/intake/public/{token}  (NO auth)
# ---------------------------------------------------------------------------


def test_public_load_is_unauthenticated(client, monkeypatch):
    # We do NOT override get_current_user — the public endpoint must not require it.
    app.dependency_overrides[get_db] = lambda: MagicMock()

    class _FakeService:
        def __init__(self, db):
            pass

        def load_for_patient(self, token):
            return (
                {
                    "patient_first_name": "Juan",
                    "appointment_date": "2026-04-20T10:00:00",
                    "excluded_ids": [],
                },
                None,
            )

    monkeypatch.setattr(intake_route, "IntakeService", _FakeService)
    try:
        r = client.get("/api/intake/public/sometoken")
    finally:
        _clear()
    assert r.status_code == 200
    body = r.json()
    assert body["patient_first_name"] == "Juan"
    assert len(body["questions"]) == 14
    assert "section_labels" in body


def test_public_load_applies_doctor_exclusions(client, monkeypatch):
    app.dependency_overrides[get_db] = lambda: MagicMock()

    class _FakeService:
        def __init__(self, db):
            pass

        def load_for_patient(self, token):
            return (
                {
                    "patient_first_name": "Juan",
                    "appointment_date": None,
                    "excluded_ids": ["q12_gyn_pregnancies", "q13_gyn_lmp"],
                },
                None,
            )

    monkeypatch.setattr(intake_route, "IntakeService", _FakeService)
    try:
        r = client.get("/api/intake/public/sometoken")
    finally:
        _clear()
    assert r.status_code == 200
    ids = {q["id"] for q in r.json()["questions"]}
    assert "q12_gyn_pregnancies" not in ids
    assert "q13_gyn_lmp" not in ids


def test_public_load_404(client, monkeypatch):
    app.dependency_overrides[get_db] = lambda: MagicMock()

    class _FakeService:
        def __init__(self, db):
            pass

        def load_for_patient(self, token):
            return (None, "not_found")

    monkeypatch.setattr(intake_route, "IntakeService", _FakeService)
    try:
        r = client.get("/api/intake/public/bogus")
    finally:
        _clear()
    assert r.status_code == 404


def test_public_load_410_when_already_submitted(client, monkeypatch):
    app.dependency_overrides[get_db] = lambda: MagicMock()

    class _FakeService:
        def __init__(self, db):
            pass

        def load_for_patient(self, token):
            return (None, "already_submitted")

    monkeypatch.setattr(intake_route, "IntakeService", _FakeService)
    try:
        r = client.get("/api/intake/public/tok")
    finally:
        _clear()
    assert r.status_code == 410


def test_public_load_410_when_appointment_closed(client, monkeypatch):
    app.dependency_overrides[get_db] = lambda: MagicMock()

    class _FakeService:
        def __init__(self, db):
            pass

        def load_for_patient(self, token):
            return (None, "appointment_closed")

    monkeypatch.setattr(intake_route, "IntakeService", _FakeService)
    try:
        r = client.get("/api/intake/public/tok")
    finally:
        _clear()
    assert r.status_code == 410


# ---------------------------------------------------------------------------
# POST /api/intake/public/{token}  (NO auth)
# ---------------------------------------------------------------------------


def _valid_answers():
    return {
        "q1_chief_complaint": "Dolor de cabeza",
        "q2_symptoms": "Cefalea frontal desde hace 3 días",
        "q3_pain_scale": 4,
        "q4_allergies": False,
        "q5_chronic_conditions": False,
        "q6_current_meds": False,
        "q7_surgeries": False,
        "q8_smoking": "no",
        "q9_alcohol": "no",
        "q10_exercise": "moderate",
    }


def test_public_submit_happy_path(client, monkeypatch):
    app.dependency_overrides[get_db] = lambda: MagicMock()

    class _FakeService:
        def __init__(self, db):
            pass

        def excluded_ids_by_token(self, token):
            return []

        def submit(self, token, answers):
            return (True, None)

    monkeypatch.setattr(intake_route, "IntakeService", _FakeService)
    try:
        r = client.post("/api/intake/public/tok", json={"answers": _valid_answers()})
    finally:
        _clear()
    assert r.status_code == 200, r.text
    assert r.json() == {"submitted": True}


def test_public_submit_validates_payload(client, monkeypatch):
    app.dependency_overrides[get_db] = lambda: MagicMock()

    class _FakeService:
        def __init__(self, db):
            pass

        def excluded_ids_by_token(self, token):
            return []

        def submit(self, token, answers):
            raise AssertionError("submit must not be called when validation fails")

    monkeypatch.setattr(intake_route, "IntakeService", _FakeService)
    try:
        r = client.post("/api/intake/public/tok", json={"answers": {}})
    finally:
        _clear()
    assert r.status_code == 422


def test_public_submit_honors_exclusions_during_validation(client, monkeypatch):
    """If the doctor excluded q6_current_meds, patient can submit without it."""
    app.dependency_overrides[get_db] = lambda: MagicMock()

    captured = {}

    class _FakeService:
        def __init__(self, db):
            pass

        def excluded_ids_by_token(self, token):
            return ["q6_current_meds"]

        def submit(self, token, answers):
            captured["answers"] = answers
            return (True, None)

    answers = _valid_answers()
    del answers["q6_current_meds"]  # drop it — excluded

    monkeypatch.setattr(intake_route, "IntakeService", _FakeService)
    try:
        r = client.post("/api/intake/public/tok", json={"answers": answers})
    finally:
        _clear()
    assert r.status_code == 200, r.text
    assert "q6_current_meds" not in captured["answers"]


def test_public_submit_410_when_expired(client, monkeypatch):
    app.dependency_overrides[get_db] = lambda: MagicMock()

    class _FakeService:
        def __init__(self, db):
            pass

        def excluded_ids_by_token(self, token):
            return []

        def submit(self, token, answers):
            return (False, "appointment_closed")

    monkeypatch.setattr(intake_route, "IntakeService", _FakeService)
    try:
        r = client.post("/api/intake/public/tok", json={"answers": _valid_answers()})
    finally:
        _clear()
    assert r.status_code == 410
