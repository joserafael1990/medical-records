"""
Unit tests for the expediente export aggregator.

DB is mocked — we verify ACL enforcement, admin scope-widening, the
serialised shape, and the grouping of prescriptions/vitals per
consultation.
"""

from __future__ import annotations

from datetime import datetime
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest

from services.expediente_export import ExpedienteAggregator


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _doctor(id: int = 1, person_type: str = "doctor"):
    return SimpleNamespace(id=id, person_type=person_type, name="Dr Test", email="d@t")


def _patient(id: int = 10, created_by: int = 1):
    return SimpleNamespace(
        id=id,
        person_type="patient",
        created_by=created_by,
        name="Juan Pérez",
        email="pt@t.mx",
        primary_phone="555000",
        birth_date=None,
        gender="M",
        civil_status=None,
        home_address=None,
        address_city="",
        emergency_contact_name=None,
        emergency_contact_phone=None,
        insurance_provider=None,
        insurance_number=None,
    )


def _consultation(id: int, patient_id: int, doctor_id: int, date: datetime):
    return SimpleNamespace(
        id=id,
        patient_id=patient_id,
        doctor_id=doctor_id,
        consultation_date=date,
        consultation_type="Seguimiento",
        chief_complaint="Dolor de cabeza",
        history_present_illness="x",
        family_history="x",
        personal_pathological_history="x",
        personal_non_pathological_history="x",
        physical_examination="x",
        primary_diagnosis="Migraña",
        secondary_diagnoses=None,
        treatment_plan="Reposo",
        follow_up_instructions="Control en 2 semanas",
        notes=None,
    )


def _prescription(id: int, consultation_id: int, med_name: str):
    return SimpleNamespace(
        id=id,
        consultation_id=consultation_id,
        medication=SimpleNamespace(name=med_name),
        dosage="1 tab",
        frequency="c/8h",
        duration="5d",
        instructions=None,
        via_administracion="oral",
    )


def _vital(id: int, consultation_id: int, name: str, value: str, unit: str):
    return SimpleNamespace(
        id=id,
        consultation_id=consultation_id,
        vital_sign=SimpleNamespace(name=name),
        value=value,
        unit=unit,
    )


def _study(id: int, patient_id: int, doctor_id: int, name: str, status: str = "ordered"):
    return SimpleNamespace(
        id=id,
        patient_id=patient_id,
        doctor_id=doctor_id,
        study_type="hematologia",
        study_name=name,
        status=status,
        urgency="routine",
        ordered_date=datetime(2026, 4, 1),
        performed_date=None,
    )


def _chain(*, first=None, all_=()):
    q = MagicMock()
    q.filter.return_value = q
    q.join.return_value = q
    q.order_by.return_value = q
    q.first.return_value = first
    q.all.return_value = list(all_)
    return q


def _mock_db(*results):
    db = MagicMock()
    db.query.side_effect = list(results)
    return db


# ---------------------------------------------------------------------------
# ACL
# ---------------------------------------------------------------------------


def test_build_raises_lookup_when_patient_missing():
    db = _mock_db(_chain(first=None))
    agg = ExpedienteAggregator(db=db)
    with pytest.raises(LookupError):
        agg.build(patient_id=999, doctor=_doctor())


def test_build_raises_permission_when_doctor_cannot_read():
    theirs = _patient(id=10, created_by=999)
    db = _mock_db(
        _chain(first=theirs),
        _chain(first=None),  # _doctor_can_read_patient: no prior consultation
    )
    agg = ExpedienteAggregator(db=db)
    with pytest.raises(PermissionError):
        agg.build(patient_id=10, doctor=_doctor(id=1))


# ---------------------------------------------------------------------------
# Happy path (owner doctor)
# ---------------------------------------------------------------------------


def test_build_aggregates_all_sections():
    doctor = _doctor(id=1)
    patient = _patient(id=10, created_by=1)
    c1 = _consultation(100, 10, 1, datetime(2026, 4, 15))
    c2 = _consultation(99, 10, 1, datetime(2026, 3, 1))
    rx = [
        _prescription(501, 100, "Paracetamol 500mg"),
        _prescription(502, 100, "Ibuprofeno 400mg"),
        _prescription(503, 99, "Losartán 50mg"),
    ]
    vitals = [
        _vital(801, 100, "Heart rate", "72", "bpm"),
        _vital(802, 99, "Systolic BP", "120", "mmHg"),
    ]
    studies = [_study(9001, 10, 1, "Biometría hemática")]
    db = _mock_db(
        _chain(first=patient),           # _load_patient
        _chain(all_=[c1, c2]),           # _load_consultations
        _chain(all_=rx),                 # prescriptions
        _chain(all_=vitals),             # vitals
        _chain(all_=studies),            # studies
        _chain(all_=[]),                 # patient documents
    )
    agg = ExpedienteAggregator(db=db)

    out = agg.build(patient_id=10, doctor=doctor)

    assert out["patient"]["name"] == "Juan Pérez"
    assert out["patient"]["id"] == 10
    assert len(out["consultations"]) == 2
    # Consultations ordered newest first by the query.
    assert out["consultations"][0]["id"] == 100
    assert out["consultations"][1]["id"] == 99
    # Prescriptions grouped by consultation.
    assert len(out["consultations"][0]["prescriptions"]) == 2
    assert len(out["consultations"][1]["prescriptions"]) == 1
    # Vitals grouped.
    assert len(out["consultations"][0]["vital_signs"]) == 1
    assert out["consultations"][0]["vital_signs"][0]["name"] == "Heart rate"
    # Studies section.
    assert len(out["clinical_studies"]) == 1
    assert out["clinical_studies"][0]["study_name"] == "Biometría hemática"
    # Summary counters.
    assert out["summary"] == {
        "total_consultations": 2,
        "total_prescriptions": 3,
        "total_vitals": 2,
        "total_studies": 1,
    }


def test_build_empty_expediente_returns_zeros():
    """Patient exists and is visible but has no consultations yet."""
    doctor = _doctor(id=1)
    patient = _patient(id=10, created_by=1)
    db = _mock_db(
        _chain(first=patient),
        _chain(all_=[]),      # no consultations
        _chain(all_=[]),      # studies (no consultations → prescriptions/vitals short-circuit)
        _chain(all_=[]),      # patient documents
    )
    agg = ExpedienteAggregator(db=db)

    out = agg.build(patient_id=10, doctor=doctor)

    assert out["consultations"] == []
    assert out["clinical_studies"] == []
    assert out["summary"]["total_consultations"] == 0
    assert out["summary"]["total_prescriptions"] == 0


def test_build_surfaces_curp_from_person_documents():
    doctor = _doctor(id=1)
    patient = _patient(id=10, created_by=1)
    db = _mock_db(
        _chain(first=patient),
        _chain(all_=[]),
        _chain(all_=[]),
        _chain(all_=[
            (
                SimpleNamespace(document_value="PERJ900101HDFRRN01", is_active=True),
                SimpleNamespace(name="CURP"),
            ),
            (
                SimpleNamespace(document_value="PEPJ900101ABC", is_active=True),
                SimpleNamespace(name="RFC"),
            ),
        ]),
    )
    agg = ExpedienteAggregator(db=db)

    out = agg.build(patient_id=10, doctor=doctor)

    assert out["patient"]["curp"] == "PERJ900101HDFRRN01"
    assert out["patient"]["rfc"] == "PEPJ900101ABC"


# ---------------------------------------------------------------------------
# Admin scope
# ---------------------------------------------------------------------------


def test_admin_sees_consultations_from_all_doctors():
    admin = _doctor(id=999, person_type="admin")
    patient = _patient(id=10, created_by=1)
    mine = _consultation(100, 10, 1, datetime(2026, 4, 15))
    theirs = _consultation(101, 10, 42, datetime(2026, 4, 1))
    db = _mock_db(
        _chain(first=patient),
        _chain(all_=[mine, theirs]),
        _chain(all_=[]),
        _chain(all_=[]),
        _chain(all_=[]),
        _chain(all_=[]),
    )
    agg = ExpedienteAggregator(db=db)

    out = agg.build(patient_id=10, doctor=admin)

    assert len(out["consultations"]) == 2
