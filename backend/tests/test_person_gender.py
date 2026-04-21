"""Tests for gender normalization in person schemas.

Canonical storage is the single-letter code M/F/O. The schema accepts
legacy full words (Masculino/Femenino/Otro) and alternates (male/female/…)
so existing forms keep working while everything on the backend gets
normalized to the code form.
"""
import pytest
from pydantic import ValidationError


def _patient_payload(**extra):
    base = {
        "person_type": "patient",
        "name": "Test Patient",
        "password": "ignored_for_patient",
    }
    base.pop("password", None)  # PatientCreate has no password field
    base.update(extra)
    return base


def test_gender_code_passes_through():
    import schemas
    p = schemas.PatientCreate(**_patient_payload(gender="M"))
    assert p.gender == "M"


def test_gender_full_word_normalized_to_code():
    import schemas
    p = schemas.PatientCreate(**_patient_payload(gender="Masculino"))
    assert p.gender == "M"


def test_gender_lowercase_normalized_to_code():
    import schemas
    p = schemas.PatientCreate(**_patient_payload(gender="femenino"))
    assert p.gender == "F"


def test_gender_english_alias_normalized():
    import schemas
    assert schemas.PatientCreate(**_patient_payload(gender="male")).gender == "M"
    assert schemas.PatientCreate(**_patient_payload(gender="female")).gender == "F"
    assert schemas.PatientCreate(**_patient_payload(gender="other")).gender == "O"


def test_gender_empty_string_becomes_none():
    import schemas
    assert schemas.PatientCreate(**_patient_payload(gender="")).gender is None


def test_gender_none_stays_none():
    import schemas
    assert schemas.PatientCreate(**_patient_payload(gender=None)).gender is None


def test_gender_whitespace_trimmed():
    import schemas
    assert schemas.PatientCreate(**_patient_payload(gender="  Masculino  ")).gender == "M"


def test_gender_unknown_value_rejected():
    import schemas
    with pytest.raises(ValidationError) as exc_info:
        schemas.PatientCreate(**_patient_payload(gender="NoBinario"))
    # Error message should mention the accepted values
    assert "gender" in str(exc_info.value).lower()


def test_person_update_normalizes_gender():
    import schemas
    u = schemas.PersonUpdate(gender="Femenino")
    assert u.gender == "F"


def test_doctor_update_normalizes_gender():
    import schemas
    u = schemas.DoctorUpdate(gender="masculino")
    assert u.gender == "M"
