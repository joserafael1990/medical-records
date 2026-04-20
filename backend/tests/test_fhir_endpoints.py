"""
Integration tests for FHIR R4 route-level behaviour.

These complement `test_fhir_adapter.py` (which covers the pure
conversion layer) by exercising the HTTP endpoints: auth, ownership,
Bundle shape, and CapabilityStatement conformance.

DB is mocked via `MagicMock` side-effects — each test lists the
`db.query(Model)` sequence the endpoint will issue and stubs each
chain's `.first()` / `.all()` return value. That keeps the tests
hermetic (no Docker, no Postgres) while still running the real
FastAPI routing + serialization stack.
"""

from __future__ import annotations

from datetime import datetime
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from main_clean_english import app
from database import get_db
from dependencies import get_current_user
from routes import fhir as fhir_module


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

CURP_SYSTEM = "urn:oid:2.16.840.1.113883.4.629"


def _doctor(id: int = 1, person_type: str = "doctor"):
    return SimpleNamespace(
        id=id,
        person_type=person_type,
        name="Dr Test",
        email=f"doctor{id}@test.mx",
    )


def _patient(id: int, created_by: int | None = None, name: str = "Pt Test"):
    """Build a Person-like stub with the attributes `build_patient_view` reads."""
    return SimpleNamespace(
        id=id,
        person_type="patient",
        created_by=created_by,
        name=name,
        email=f"pt{id}@test.mx",
        primary_phone=None,
        home_address=None,
        address_city="",
        address_postal_code="",
        birth_date=None,
        gender="M",
    )


def _consultation(id: int, patient_id: int, doctor_id: int):
    return SimpleNamespace(
        id=id,
        patient_id=patient_id,
        doctor_id=doctor_id,
        consultation_date=datetime(2026, 4, 1, 10, 0, 0),
        chief_complaint="Control",
    )


def _prescription(id: int, consultation_id: int, med_name: str = "Paracetamol"):
    return SimpleNamespace(
        id=id,
        consultation_id=consultation_id,
        medication=SimpleNamespace(name=med_name),
        dosage="500mg",
        frequency="c/8h",
        duration="5d",
        quantity=None,
    )


def _vital_sign(id: int, consultation_id: int, name: str = "Heart rate"):
    return SimpleNamespace(
        id=id,
        consultation_id=consultation_id,
        vital_sign=SimpleNamespace(name=name),
        value="72",
        unit="bpm",
        created_at=datetime(2026, 4, 1, 10, 5, 0),
    )


def _chain(*, first=None, all_=()):
    """A MagicMock that self-returns for filter/join/order_by and yields
    the configured result on .first() / .all()."""
    q = MagicMock()
    q.filter.return_value = q
    q.join.return_value = q
    q.order_by.return_value = q
    q.first.return_value = first
    q.all.return_value = list(all_)
    return q


def _mock_db(query_results):
    """Build a MagicMock DB whose successive .query(...) calls return the
    pre-built chains in order."""
    db = MagicMock()
    db.query.side_effect = list(query_results)
    return db


@pytest.fixture(autouse=True)
def _silence_audit(monkeypatch):
    """Audit writes touch a real table; no-op them for these tests."""
    monkeypatch.setattr(
        fhir_module.audit_service, "log_action", lambda *a, **kw: None
    )


@pytest.fixture
def client():
    return TestClient(app)


def _override_user(user):
    app.dependency_overrides[get_current_user] = lambda: user


def _override_db(db):
    app.dependency_overrides[get_db] = lambda: db


def _reset_overrides():
    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# Encounter search
# ---------------------------------------------------------------------------

def test_search_encounters_happy_path(client):
    doctor = _doctor(id=1)
    pt = _patient(id=10, created_by=1)
    consultations = [
        _consultation(id=100, patient_id=10, doctor_id=1),
        _consultation(id=101, patient_id=10, doctor_id=1),
    ]
    db = _mock_db([
        _chain(first=pt),                  # Person lookup
        _chain(all_=consultations),        # MedicalRecord list
    ])
    _override_user(doctor)
    _override_db(db)
    try:
        r = client.get("/api/fhir/Encounter?patient=10")
    finally:
        _reset_overrides()
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["resourceType"] == "Bundle"
    assert body["type"] == "searchset"
    assert body["total"] == 2
    assert all(e["search"]["mode"] == "match" for e in body["entry"])
    assert {e["resource"]["resourceType"] for e in body["entry"]} == {"Encounter"}


def test_search_encounters_unknown_patient_404(client):
    doctor = _doctor()
    db = _mock_db([_chain(first=None)])
    _override_user(doctor)
    _override_db(db)
    try:
        r = client.get("/api/fhir/Encounter?patient=999")
    finally:
        _reset_overrides()
    assert r.status_code == 404
    assert r.json()["resourceType"] == "OperationOutcome"


def test_search_encounters_forbidden_when_not_owner_or_consultant(client):
    doctor = _doctor(id=7)
    pt = _patient(id=10, created_by=999)  # someone else created them
    db = _mock_db([
        _chain(first=pt),      # Person lookup
        _chain(first=None),    # _doctor_can_read_patient: no prior consultation
    ])
    _override_user(doctor)
    _override_db(db)
    try:
        r = client.get("/api/fhir/Encounter?patient=10")
    finally:
        _reset_overrides()
    assert r.status_code == 403
    assert r.json()["resourceType"] == "OperationOutcome"


# ---------------------------------------------------------------------------
# MedicationRequest — search + read
# ---------------------------------------------------------------------------

def test_search_medication_requests_happy_path(client):
    doctor = _doctor(id=1)
    pt = _patient(id=10, created_by=1)
    consultations = [_consultation(id=100, patient_id=10, doctor_id=1)]
    rx = [
        _prescription(id=501, consultation_id=100, med_name="Amoxicilina"),
        _prescription(id=502, consultation_id=100, med_name="Ibuprofeno"),
    ]
    db = _mock_db([
        _chain(first=pt),
        _chain(all_=consultations),
        _chain(all_=rx),
    ])
    _override_user(doctor)
    _override_db(db)
    try:
        r = client.get("/api/fhir/MedicationRequest?patient=10")
    finally:
        _reset_overrides()
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["type"] == "searchset"
    assert body["total"] == 2
    kinds = {e["resource"]["resourceType"] for e in body["entry"]}
    assert kinds == {"MedicationRequest"}
    meds = {e["resource"]["medicationCodeableConcept"]["text"] for e in body["entry"]}
    assert meds == {"Amoxicilina", "Ibuprofeno"}


def test_search_medication_requests_forbidden(client):
    doctor = _doctor(id=7)
    pt = _patient(id=10, created_by=999)
    db = _mock_db([
        _chain(first=pt),
        _chain(first=None),  # no prior consultation
    ])
    _override_user(doctor)
    _override_db(db)
    try:
        r = client.get("/api/fhir/MedicationRequest?patient=10")
    finally:
        _reset_overrides()
    assert r.status_code == 403


def test_get_medication_request_forbidden_for_other_doctor(client):
    doctor = _doctor(id=7)
    rx = _prescription(id=501, consultation_id=100)
    # consultation belongs to a different doctor
    consultation = _consultation(id=100, patient_id=10, doctor_id=42)
    db = _mock_db([
        _chain(first=rx),
        _chain(first=consultation),
    ])
    _override_user(doctor)
    _override_db(db)
    try:
        r = client.get("/api/fhir/MedicationRequest/501")
    finally:
        _reset_overrides()
    assert r.status_code == 403


# ---------------------------------------------------------------------------
# Observation — search + read
# ---------------------------------------------------------------------------

def test_search_observations_happy_path(client):
    doctor = _doctor(id=1)
    pt = _patient(id=10, created_by=1)
    consultations = [_consultation(id=100, patient_id=10, doctor_id=1)]
    vs = [
        _vital_sign(id=801, consultation_id=100, name="Heart rate"),
        _vital_sign(id=802, consultation_id=100, name="Systolic BP"),
    ]
    db = _mock_db([
        _chain(first=pt),
        _chain(all_=consultations),
        _chain(all_=vs),
    ])
    _override_user(doctor)
    _override_db(db)
    try:
        r = client.get("/api/fhir/Observation?patient=10")
    finally:
        _reset_overrides()
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["type"] == "searchset"
    assert body["total"] == 2
    codes = {e["resource"]["code"]["text"] for e in body["entry"]}
    assert codes == {"Heart rate", "Systolic BP"}


def test_search_observations_forbidden(client):
    doctor = _doctor(id=7)
    pt = _patient(id=10, created_by=999)
    db = _mock_db([
        _chain(first=pt),
        _chain(first=None),
    ])
    _override_user(doctor)
    _override_db(db)
    try:
        r = client.get("/api/fhir/Observation?patient=10")
    finally:
        _reset_overrides()
    assert r.status_code == 403


def test_get_observation_forbidden_for_other_doctor(client):
    doctor = _doctor(id=7)
    vs = _vital_sign(id=801, consultation_id=100)
    consultation = _consultation(id=100, patient_id=10, doctor_id=42)
    db = _mock_db([
        _chain(first=vs),
        _chain(first=consultation),
    ])
    _override_user(doctor)
    _override_db(db)
    try:
        r = client.get("/api/fhir/Observation/801")
    finally:
        _reset_overrides()
    assert r.status_code == 403


# ---------------------------------------------------------------------------
# Patient search by identifier (CURP)
# ---------------------------------------------------------------------------

def test_search_patients_by_curp_returns_only_visible(monkeypatch, client):
    doctor = _doctor(id=1)
    pt = _patient(id=10, created_by=1, name="Juan Perez")

    db = _mock_db([
        _chain(all_=[pt]),  # Person ⋈ PersonDocument ⋈ Document join
    ])
    # Skip the DB-backed view builder; we only care that the endpoint wires
    # through the right patient and produces a valid searchset Bundle.
    stub_view = SimpleNamespace(
        id="10", name="Juan Perez",
        curp="PERJ900101HDFRRN01",
        email="pt10@test.mx",
        phone=None, address=None, city="", state="", postal_code="",
        gender="male", birth_date=None,
    )
    monkeypatch.setattr(fhir_module, "build_patient_view", lambda _db, _p: stub_view)

    _override_user(doctor)
    _override_db(db)
    try:
        r = client.get(
            f"/api/fhir/Patient?identifier={CURP_SYSTEM}|PERJ900101HDFRRN01"
        )
    finally:
        _reset_overrides()
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["resourceType"] == "Bundle"
    assert body["type"] == "searchset"
    assert body["total"] == 1
    assert body["entry"][0]["search"]["mode"] == "match"
    assert body["entry"][0]["resource"]["resourceType"] == "Patient"


# ---------------------------------------------------------------------------
# CapabilityStatement
# ---------------------------------------------------------------------------

def test_capability_statement_declares_search_params(client):
    _override_user(_doctor())          # metadata has no auth, but FastAPI
    _override_db(MagicMock())          # dependencies still resolve
    try:
        r = client.get("/api/fhir/metadata")
    finally:
        _reset_overrides()
    assert r.status_code == 200
    body = r.json()
    assert body["resourceType"] == "CapabilityStatement"
    assert body["fhirVersion"] == "4.0.1"

    by_type = {res["type"]: res for res in body["rest"][0]["resource"]}
    # Each searchable resource should advertise its patient/identifier param.
    assert any(p["name"] == "identifier" for p in by_type["Patient"].get("searchParam", []))
    for rt in ("Encounter", "MedicationRequest", "Observation"):
        params = {p["name"] for p in by_type[rt].get("searchParam", [])}
        assert "patient" in params, f"{rt} missing patient searchParam"
        codes = {i["code"] for i in by_type[rt]["interaction"]}
        assert {"read", "search-type"}.issubset(codes)
