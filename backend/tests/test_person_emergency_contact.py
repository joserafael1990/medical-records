"""Tests for emergency_contact_relationship normalization in person schemas.

The `emergency_relationships` catalog stores accent-stripped, UPPERCASE
codes (PADRE, MADRE, CUNIADA, TIA, …). Frontends historically sent the
Spanish display label ("Padre", "Cuñada"), which triggered a FK violation
on `persons.emergency_contact_relationship` (seen in prod 2026-04-21).
The schema-level normalizer collapses both forms onto the canonical code.
"""
import pytest


def _patient_payload(**extra):
    base = {"person_type": "patient", "name": "Test Patient"}
    base.update(extra)
    return base


def test_label_normalized_to_code():
    import schemas
    p = schemas.PatientCreate(**_patient_payload(emergency_contact_relationship="Padre"))
    assert p.emergency_contact_relationship == "PADRE"


def test_accented_label_normalized():
    import schemas
    p = schemas.PatientCreate(**_patient_payload(emergency_contact_relationship="Tía"))
    assert p.emergency_contact_relationship == "TIA"


def test_enye_expanded_to_ni():
    import schemas
    p = schemas.PatientCreate(**_patient_payload(emergency_contact_relationship="Cuñada"))
    assert p.emergency_contact_relationship == "CUNIADA"


def test_canonical_code_passes_through():
    import schemas
    p = schemas.PatientCreate(**_patient_payload(emergency_contact_relationship="MADRE"))
    assert p.emergency_contact_relationship == "MADRE"


def test_empty_string_becomes_none():
    import schemas
    p = schemas.PatientCreate(**_patient_payload(emergency_contact_relationship=""))
    assert p.emergency_contact_relationship is None


def test_none_stays_none():
    import schemas
    p = schemas.PatientCreate(**_patient_payload(emergency_contact_relationship=None))
    assert p.emergency_contact_relationship is None


def test_whitespace_and_mixed_case():
    import schemas
    p = schemas.PatientCreate(**_patient_payload(emergency_contact_relationship="  hermana  "))
    assert p.emergency_contact_relationship == "HERMANA"


def test_applies_on_person_update():
    import schemas
    u = schemas.PersonUpdate(emergency_contact_relationship="Hijo")
    assert u.emergency_contact_relationship == "HIJO"


def test_applies_on_doctor_update():
    import schemas
    u = schemas.DoctorUpdate(emergency_contact_relationship="Esposa")
    assert u.emergency_contact_relationship == "ESPOSA"
