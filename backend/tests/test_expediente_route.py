"""
Route-level tests for GET /api/patients/{id}/expediente/full.

Aggregator is stubbed; we only verify auth, status mapping, and that
the payload is echoed through unchanged.
"""

from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from main_clean_english import app
from database import get_db
from dependencies import get_current_user
from routes import expediente as expediente_route


def _doctor():
    return SimpleNamespace(id=1, person_type="doctor", name="Dr T", email="d@t")


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


def test_expediente_requires_doctor(client):
    _override(_patient_user())
    try:
        r = client.get("/api/patients/10/expediente/full")
    finally:
        _clear()
    assert r.status_code == 403


def test_expediente_404_when_patient_missing(client, monkeypatch):
    _override(_doctor())

    class _FakeAgg:
        def __init__(self, db):
            pass

        def build(self, patient_id, doctor):
            raise LookupError("patient_not_found")

    monkeypatch.setattr(expediente_route, "ExpedienteAggregator", _FakeAgg)
    try:
        r = client.get("/api/patients/999/expediente/full")
    finally:
        _clear()
    assert r.status_code == 404


def test_expediente_403_when_not_authorized(client, monkeypatch):
    _override(_doctor())

    class _FakeAgg:
        def __init__(self, db):
            pass

        def build(self, patient_id, doctor):
            raise PermissionError("not_authorized")

    monkeypatch.setattr(expediente_route, "ExpedienteAggregator", _FakeAgg)
    try:
        r = client.get("/api/patients/10/expediente/full")
    finally:
        _clear()
    assert r.status_code == 403


def test_expediente_happy_path(client, monkeypatch):
    _override(_doctor())

    payload = {
        "patient": {"id": 10, "name": "Juan Pérez"},
        "consultations": [{"id": 100, "prescriptions": [], "vital_signs": []}],
        "clinical_studies": [],
        "summary": {
            "total_consultations": 1,
            "total_prescriptions": 0,
            "total_vitals": 0,
            "total_studies": 0,
        },
    }

    class _FakeAgg:
        def __init__(self, db):
            pass

        def build(self, patient_id, doctor):
            assert patient_id == 10
            return payload

    monkeypatch.setattr(expediente_route, "ExpedienteAggregator", _FakeAgg)
    try:
        r = client.get("/api/patients/10/expediente/full")
    finally:
        _clear()
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["patient"]["name"] == "Juan Pérez"
    assert body["summary"]["total_consultations"] == 1


def test_admin_can_export_any_patient(client, monkeypatch):
    _override(SimpleNamespace(id=999, person_type="admin", name="Admin", email="a@a"))

    class _FakeAgg:
        def __init__(self, db):
            pass

        def build(self, patient_id, doctor):
            assert doctor.person_type == "admin"
            return {
                "patient": {"id": patient_id, "name": "Other Pt"},
                "consultations": [],
                "clinical_studies": [],
                "summary": {
                    "total_consultations": 0,
                    "total_prescriptions": 0,
                    "total_vitals": 0,
                    "total_studies": 0,
                },
            }

    monkeypatch.setattr(expediente_route, "ExpedienteAggregator", _FakeAgg)
    try:
        r = client.get("/api/patients/42/expediente/full")
    finally:
        _clear()
    assert r.status_code == 200
