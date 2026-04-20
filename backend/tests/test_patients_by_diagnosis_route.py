"""
Route tests for GET /api/analytics/patients-by-diagnosis.
"""

from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from main_clean_english import app
from database import get_db
from dependencies import get_current_user
from routes import patients_by_diagnosis as route_module


def _doctor():
    return SimpleNamespace(id=1, person_type="doctor", name="Dr T")


def _patient():
    return SimpleNamespace(id=2, person_type="patient", name="Pt")


def _override(user):
    app.dependency_overrides[get_current_user] = lambda: user
    app.dependency_overrides[get_db] = lambda: MagicMock()


def _clear():
    app.dependency_overrides.clear()


@pytest.fixture
def client():
    return TestClient(app)


def test_requires_doctor(client):
    _override(_patient())
    try:
        r = client.get("/api/analytics/patients-by-diagnosis?dx=HTA")
    finally:
        _clear()
    assert r.status_code == 403


def test_returns_cohort(client, monkeypatch):
    _override(_doctor())
    expected = {
        "query": "Hipertensión",
        "count": 2,
        "patients": [
            {"patient_id": 10, "name": "Juan Pérez", "visits_with_dx": 3, "last_visit_date": "2026-04-01"},
            {"patient_id": 11, "name": "Ana Soto", "visits_with_dx": 1, "last_visit_date": "2026-02-10"},
        ],
    }

    def fake_tool(db, doctor, dx_query, limit):
        assert dx_query == "Hipertensión"
        assert limit == 10
        return expected

    monkeypatch.setattr(route_module, "list_patients_by_diagnosis", fake_tool)

    try:
        r = client.get("/api/analytics/patients-by-diagnosis?dx=Hipertensi%C3%B3n&limit=10")
    finally:
        _clear()
    assert r.status_code == 200
    assert r.json() == expected


def test_rejects_empty_dx(client):
    _override(_doctor())
    try:
        r = client.get("/api/analytics/patients-by-diagnosis?dx=")
    finally:
        _clear()
    # FastAPI's min_length=1 guard → 422
    assert r.status_code == 422


def test_clamps_limit(client, monkeypatch):
    _override(_doctor())

    def fake_tool(db, doctor, dx_query, limit):
        return {"query": dx_query, "count": 0, "patients": []}

    monkeypatch.setattr(route_module, "list_patients_by_diagnosis", fake_tool)
    try:
        r = client.get("/api/analytics/patients-by-diagnosis?dx=X&limit=9999")
    finally:
        _clear()
    # FastAPI ge/le → 422 when out of range
    assert r.status_code == 422
