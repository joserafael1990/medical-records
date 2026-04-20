"""Route-level tests for /api/analytics/practice-summary."""

from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from main_clean_english import app
from database import get_db
from dependencies import get_current_user
from routes import practice_analytics


def _doctor():
    return SimpleNamespace(id=1, person_type="doctor", name="Dr T")


def _patient_user():
    return SimpleNamespace(id=2, person_type="patient", name="Pt")


def _override(user):
    app.dependency_overrides[get_current_user] = lambda: user
    app.dependency_overrides[get_db] = lambda: MagicMock()


def _clear():
    app.dependency_overrides.clear()


@pytest.fixture
def client():
    return TestClient(app)


def test_practice_summary_requires_doctor(client):
    _override(_patient_user())
    try:
        r = client.get("/api/analytics/practice-summary")
    finally:
        _clear()
    assert r.status_code == 403


def test_practice_summary_returns_aggregator_payload(client, monkeypatch):
    _override(_doctor())

    sample = {
        "kpis": {
            "current_month": "2026-04",
            "consultations_this_month": 12,
            "consultations_last_month": 10,
            "consultations_delta_pct": 20.0,
            "new_patients_this_month": 3,
            "avg_consultation_duration_minutes": 30,
        },
        "consultations_by_month": [{"month": "2025-05", "count": 5}],
        "top_diagnoses": [{"diagnosis": "Hipertensión", "count": 4}],
        "busy_heatmap": [{"weekday": "lun", "hour": 10, "count": 3}],
        "demographics": {
            "total_patients": 50,
            "by_gender": [{"gender": "masculino", "count": 30}],
            "by_age_bucket": [{"bucket": "30-44", "count": 20}],
        },
        "studies_by_month": [{"month": "2026-04", "count": 2}],
        "generated_at": "2026-04-15T00:00:00",
        "scope": "doctor",
    }

    class _FakeAgg:
        def __init__(self, db):
            pass

        def build(self, doctor):
            return sample

    monkeypatch.setattr(practice_analytics, "PracticeMetricsAggregator", _FakeAgg)
    try:
        r = client.get("/api/analytics/practice-summary")
    finally:
        _clear()
    assert r.status_code == 200
    body = r.json()
    assert body == sample


def test_practice_summary_admin_scope(client, monkeypatch):
    _override(SimpleNamespace(id=999, person_type="admin", name="Admin"))

    class _FakeAgg:
        def __init__(self, db):
            pass

        def build(self, doctor):
            assert doctor.person_type == "admin"
            return {"kpis": {}, "scope": "admin", "generated_at": "x"}

    monkeypatch.setattr(practice_analytics, "PracticeMetricsAggregator", _FakeAgg)
    try:
        r = client.get("/api/analytics/practice-summary")
    finally:
        _clear()
    assert r.status_code == 200
    assert r.json()["scope"] == "admin"
