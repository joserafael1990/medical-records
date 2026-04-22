"""
Unit tests for NOM-004/024 + LFPDPPP register validation.
No database required — exercises validators and Pydantic schemas only.
"""

from __future__ import annotations

from datetime import datetime, timezone
import os
import sys

import pytest
from pydantic import ValidationError

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from utils.document_validators import (  # noqa: E402
    validate_curp_format,
    validate_professional_license_format,
)
from schemas import DoctorCreate, PrivacyConsentPayload  # noqa: E402


# ---------------------------------------------------------------------------
# Cédula profesional (NOM-024-SSA3-2012): 7 u 8 dígitos numéricos.
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("value", ["1234567", "12345678"])
def test_cedula_accepts_7_or_8_digits(value: str) -> None:
    ok, err = validate_professional_license_format(value)
    assert ok is True
    assert err is None


@pytest.mark.parametrize(
    "value",
    [
        "",  # empty
        "123456",  # 6 digits
        "123456789",  # 9 digits
        "12A45678",  # non-numeric
        "1234 5678",  # internal whitespace
        "abcdefgh",  # letters
    ],
)
def test_cedula_rejects_invalid(value: str) -> None:
    ok, err = validate_professional_license_format(value)
    assert ok is False
    assert err and "cédula" in err.lower()


def test_cedula_strips_external_whitespace() -> None:
    ok, err = validate_professional_license_format("  12345678  ")
    assert ok is True
    assert err is None


# ---------------------------------------------------------------------------
# CURP (NOM-004-SSA3-2012).
# ---------------------------------------------------------------------------

def test_curp_accepts_well_formed() -> None:
    ok, err = validate_curp_format("GARC850315HDFXYZ01")
    assert ok is True
    assert err is None


@pytest.mark.parametrize(
    "value",
    [
        "",
        "SHORT",
        "GARC850315HDFXYZ0",  # 17 chars
        "GARC851315HDFXYZ01",  # invalid month
        "GARC850332HDFXYZ01",  # invalid day
    ],
)
def test_curp_rejects_invalid(value: str) -> None:
    ok, err = validate_curp_format(value)
    assert ok is False
    assert err


# ---------------------------------------------------------------------------
# PrivacyConsentPayload — LFPDPPP requires explicit acceptance.
# ---------------------------------------------------------------------------

def test_privacy_consent_must_be_accepted() -> None:
    with pytest.raises(ValidationError):
        PrivacyConsentPayload(accepted=False)


def test_privacy_consent_accepts_minimal_payload() -> None:
    consent = PrivacyConsentPayload(accepted=True)
    assert consent.accepted is True
    assert consent.notice_version is None


def test_privacy_consent_preserves_metadata() -> None:
    now = datetime(2026, 4, 19, 12, 0, tzinfo=timezone.utc)
    consent = PrivacyConsentPayload(
        accepted=True,
        accepted_at=now,
        notice_version="v1",
        user_agent="pytest/1.0",
        timezone="America/Mexico_City",
    )
    assert consent.accepted_at == now
    assert consent.notice_version == "v1"
    assert consent.user_agent == "pytest/1.0"
    assert consent.timezone == "America/Mexico_City"


# ---------------------------------------------------------------------------
# DoctorCreate schema surface for the quick_registration flag.
# ---------------------------------------------------------------------------

BASE_QUICK_PAYLOAD = {
    "person_type": "doctor",
    "name": "María García",
    "email": "dra.garcia@example.com",
    "password": "Passw0rd!",
    "specialty_id": 12,
    "documents": [{"document_id": 13, "document_value": "12345678"}],
    "quick_registration": True,
    "privacy_consent": {"accepted": True, "notice_version": "v1"},
}


def test_doctor_create_quick_mode_parses() -> None:
    doctor = DoctorCreate.model_validate(BASE_QUICK_PAYLOAD)
    assert doctor.quick_registration is True
    assert doctor.privacy_consent is not None
    assert doctor.privacy_consent.accepted is True
    assert doctor.specialty_id == 12
    assert doctor.office_name is None


def test_doctor_create_defaults_quick_to_false() -> None:
    payload = dict(BASE_QUICK_PAYLOAD)
    payload.pop("quick_registration")
    payload.pop("privacy_consent")
    doctor = DoctorCreate.model_validate(payload)
    assert doctor.quick_registration is False
    assert doctor.privacy_consent is None


def test_doctor_create_rejects_unaccepted_consent() -> None:
    payload = dict(BASE_QUICK_PAYLOAD)
    payload["privacy_consent"] = {"accepted": False}
    with pytest.raises(ValidationError):
        DoctorCreate.model_validate(payload)


# ---------------------------------------------------------------------------
# Silent-drop regression (prod bug 2026-04-22): DoctorCreate used to lack
# the `quick_registration` and `privacy_consent` fields entirely. Pydantic
# v2's default extra='ignore' silently dropped them, the route flipped to
# full-mode validation, and the user saw "Se requiere al menos un documento
# personal" on the quick-register view. These tests lock the contract so
# the silent-drop cannot regress without a test failure.
# ---------------------------------------------------------------------------

# The shape below mirrors exactly what the frontend QuickRegisterView.tsx
# posts to /api/auth/register. If that payload is modified, update both
# places together.
FRONTEND_QUICK_REGISTER_PAYLOAD = {
    "email": "dra.jaqueline@yahoo.com.mx",
    "password": "Passw0rd!",
    "name": "Dra. Jaqueline García",
    "specialty_id": 12,
    "documents": [{"document_id": 13, "document_value": "12345678"}],
    "title": "Dr.",
    "gender": "",
    "birth_date": None,
    "primary_phone": "",
    "university": "",
    "graduation_year": None,
    "office_name": "",
    "office_address": "",
    "office_city": "",
    "office_state_id": None,
    "office_phone": "",
    "office_maps_url": "",
    "appointment_duration": None,
    "schedule_data": {},
    "created_by": "Dra. Jaqueline García",
    "quick_registration": True,
    "privacy_consent": {
        "accepted": True,
        "accepted_at": "2026-04-22T20:00:00+00:00",
        "notice_version": "v1",
        "user_agent": "Mozilla/5.0 (test)",
        "timezone": "America/Mexico_City",
    },
}


def test_frontend_quick_register_payload_preserves_quick_flag() -> None:
    """The exact QuickRegisterView payload must surface quick_registration=True.

    Regression guard for PR #16's missed schema update — if anyone drops the
    field back to `extra='ignore'` territory, the route would re-enter
    full-mode and once again reject the registration with a personal-document
    error even though the UI collected only the cédula.
    """
    doctor = DoctorCreate.model_validate(FRONTEND_QUICK_REGISTER_PAYLOAD)
    assert doctor.quick_registration is True
    assert doctor.privacy_consent is not None
    assert doctor.privacy_consent.accepted is True
    assert doctor.privacy_consent.notice_version == "v1"
    assert doctor.privacy_consent.timezone == "America/Mexico_City"
    # Stub fields the frontend sends as '' must normalize to None so the
    # backend treats them as "deferred to profile completion".
    assert doctor.gender is None
    assert doctor.birth_date is None
    assert doctor.graduation_year is None


def test_frontend_full_register_payload_keeps_quick_flag_false() -> None:
    """Without the flag the backend must still fall into full-mode validation.

    Protects against an overcorrection where someone defaults
    `quick_registration=True` and silently skips the personal-document
    requirement for every full registration.
    """
    payload = dict(FRONTEND_QUICK_REGISTER_PAYLOAD)
    payload.pop("quick_registration")
    payload.pop("privacy_consent")
    doctor = DoctorCreate.model_validate(payload)
    assert doctor.quick_registration is False
    assert doctor.privacy_consent is None
