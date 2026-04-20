"""
Validator tests for PatientCreate / PersonBase name rules.

The legacy validator required ≥2 words ("Ingresa al menos nombre y
apellido"). We relaxed it to single-word names so a doctor can book
an appointment with minimal data. NOM-004 completeness is enforced
downstream by the compliance guard, not in the schema.
"""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from schemas.persons import PatientCreate


def _base_payload(**overrides):
    payload = {
        "person_type": "patient",
        "name": "Juan Pérez",
    }
    payload.update(overrides)
    return payload


def test_patient_create_accepts_two_word_name():
    p = PatientCreate(**_base_payload(name="Juan Pérez"))
    assert p.name == "Juan Pérez"


def test_patient_create_accepts_single_word_name():
    """The relaxed validator allows a first-name-only patient at booking time."""
    p = PatientCreate(**_base_payload(name="Juan"))
    assert p.name == "Juan"


def test_patient_create_trims_whitespace():
    p = PatientCreate(**_base_payload(name="   Ana   "))
    assert p.name == "Ana"


def test_patient_create_rejects_empty_name():
    with pytest.raises(ValidationError) as exc:
        PatientCreate(**_base_payload(name=""))
    assert "requerido" in str(exc.value).lower()


def test_patient_create_rejects_whitespace_only_name():
    with pytest.raises(ValidationError) as exc:
        PatientCreate(**_base_payload(name="   "))
    assert "requerido" in str(exc.value).lower()


def test_patient_create_rejects_single_character_name():
    with pytest.raises(ValidationError) as exc:
        PatientCreate(**_base_payload(name="J"))
    assert "2 caracteres" in str(exc.value)


def test_patient_create_minimum_payload_is_name_and_type():
    """Everything else — phone, CURP, birth_date, gender, etc. — is optional."""
    p = PatientCreate(person_type="patient", name="Juan Pérez")
    assert p.name == "Juan Pérez"
    assert p.primary_phone is None
    assert p.gender is None
    assert p.birth_date is None
