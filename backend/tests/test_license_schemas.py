"""
License schema serialization tests.

Regression for a prod 500 (ResponseValidationError) where POST/PUT
/api/licenses returned the ORM License directly and Pydantic rejected
the nested Person under `doctor: Optional[Dict[str, Any]]`. The fix
replaced the untyped dict with a nested BaseSchema (`LicenseDoctorInfo`)
so `from_attributes=True` converts the ORM Person automatically.
"""
from __future__ import annotations

import os
import sys
from datetime import date, datetime
from types import SimpleNamespace

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from schemas.licenses import LicenseResponse  # noqa: E402


def _fake_doctor() -> SimpleNamespace:
    return SimpleNamespace(
        id=10,
        name="Dra. Prueba",
        email="dra@test.com",
        person_type="doctor",
    )


def _fake_license(doctor=None) -> SimpleNamespace:
    return SimpleNamespace(
        id=1,
        doctor_id=10,
        license_type="trial",
        start_date=date(2026, 4, 21),
        expiration_date=date(2026, 5, 20),
        payment_date=None,
        status="active",
        is_active=True,
        notes=None,
        created_at=datetime(2026, 4, 21, 12, 0, 0),
        updated_at=datetime(2026, 4, 21, 12, 0, 0),
        created_by=1,
        doctor=doctor,
    )


def test_license_response_accepts_orm_with_person_doctor():
    """POST/PUT return the ORM License directly — must validate (prod bug)."""
    resp = LicenseResponse.model_validate(_fake_license(doctor=_fake_doctor()))
    assert resp.id == 1
    assert resp.doctor is not None
    assert resp.doctor.id == 10
    assert resp.doctor.name == "Dra. Prueba"
    assert resp.doctor.email == "dra@test.com"
    assert resp.doctor.person_type == "doctor"


def test_license_response_accepts_dict_doctor():
    """GET /api/licenses builds a dict manually — must keep working."""
    payload = {
        "id": 1,
        "doctor_id": 10,
        "license_type": "trial",
        "start_date": date(2026, 4, 21),
        "expiration_date": date(2026, 5, 20),
        "payment_date": None,
        "status": "active",
        "is_active": True,
        "notes": None,
        "created_at": datetime(2026, 4, 21, 12, 0, 0),
        "updated_at": datetime(2026, 4, 21, 12, 0, 0),
        "created_by": 1,
        "doctor": {
            "id": 10,
            "name": "Dra. Prueba",
            "email": "dra@test.com",
            "person_type": "doctor",
        },
    }
    resp = LicenseResponse(**payload)
    assert resp.doctor is not None
    assert resp.doctor.id == 10


def test_license_response_accepts_null_doctor():
    resp = LicenseResponse.model_validate(_fake_license(doctor=None))
    assert resp.doctor is None
