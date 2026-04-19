"""
Unit tests for the FHIR adapter service (NOM-024).

Exercises:
- _load_documents_by_name resolves the person_documents join.
- build_doctor_view and build_patient_view flatten ORM entities into the
  namespace shape interoperability.py's FHIR conversions expect.
- _normalize_gender maps CORTEX codes (M/F/O or Spanish) to FHIR codes.
- wrap_as_bundle produces a valid R4 searchset envelope.
- End-to-end: feed the adapter output into interoperability.py and check the
  resulting Practitioner / Patient carry the identity documents.

No live DB — SQLAlchemy Session is mocked with MagicMock.
"""

from __future__ import annotations

import os
import sys
from datetime import date
from types import SimpleNamespace
from unittest.mock import MagicMock

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

import pytest  # noqa: E402

from services.fhir_service import (  # noqa: E402
    _load_documents_by_name,
    _normalize_gender,
    build_doctor_view,
    build_encounter_view,
    build_everything_bundle,
    build_patient_view,
    fix_encounter_keys,
    wrap_as_bundle,
)
from interoperability import InteroperabilityService  # noqa: E402


# ---------------------------------------------------------------------------
# Helpers: a chainable mock that returns a fixed list of rows for .all().
# ---------------------------------------------------------------------------

def _mock_db(
    documents_rows=None,
    office=None,
    specialty=None,
):
    """Stage a MagicMock DB session that returns the given rows for each query."""
    db = MagicMock()

    # Track which query is being built by peeking at the first positional arg.
    def query(*args, **kwargs):
        q = MagicMock()
        # PersonDocument + Document join
        q.join.return_value = q
        q.filter.return_value = q
        q.order_by.return_value = q
        q.all.return_value = documents_rows or []
        # single-result lookups
        def first():
            model = args[0] if args else None
            name = getattr(model, "__name__", str(model))
            if "Office" in name:
                return office
            if "Specialty" in name:
                return specialty
            return None
        q.first.side_effect = first
        return q

    db.query.side_effect = query
    return db


def _doc_row(name: str, value: str):
    pd = SimpleNamespace(document_value=value)
    doc = SimpleNamespace(name=name)
    return (pd, doc)


# ---------------------------------------------------------------------------
# _load_documents_by_name
# ---------------------------------------------------------------------------

def test_load_documents_returns_name_to_value_map():
    db = _mock_db(documents_rows=[
        _doc_row("CURP", "GARC850315HDFXYZ01"),
        _doc_row("RFC", "GARC850315XYZ"),
        _doc_row("Cédula Profesional", "1234567"),
    ])
    out = _load_documents_by_name(db, person_id=7)
    assert out == {
        "CURP": "GARC850315HDFXYZ01",
        "RFC": "GARC850315XYZ",
        "Cédula Profesional": "1234567",
    }


def test_load_documents_empty_when_no_rows():
    db = _mock_db(documents_rows=[])
    assert _load_documents_by_name(db, 7) == {}


# ---------------------------------------------------------------------------
# _normalize_gender
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("raw,expected", [
    ("M", "masculino"), ("m", "masculino"), ("masculino", "masculino"), ("Male", "masculino"),
    ("F", "femenino"), ("femenino", "femenino"),
    ("O", "otro"), ("otro", "otro"),
    (None, "desconocido"), ("", "desconocido"), ("xyz", "desconocido"),
])
def test_normalize_gender(raw, expected):
    """The adapter outputs Spanish strings that interoperability.py's legacy
    gender_map knows how to translate. The end-to-end test below confirms
    the final FHIR resource carries the English FHIR codes."""
    assert _normalize_gender(raw) == expected


# ---------------------------------------------------------------------------
# build_doctor_view
# ---------------------------------------------------------------------------

def test_build_doctor_view_populates_license_from_documents():
    db = _mock_db(
        documents_rows=[
            _doc_row("CURP", "GARC850315HDFXYZ01"),
            _doc_row("RFC", "GARC850315XYZ"),
            _doc_row("Cédula Profesional", "1234567"),
        ],
        office=SimpleNamespace(
            address="Av. X 123", city="CDMX",
            state_name="Ciudad de México", postal_code="06000",
        ),
        specialty=SimpleNamespace(name="Cardiología"),
    )
    person = SimpleNamespace(
        id=7, name="María García López", title="Dra.",
        email="m@example.com", primary_phone="+521234567890",
        birth_date=date(1985, 3, 15), is_active=True,
        specialty_id=12, full_name="Dra. María García López",
    )
    view = build_doctor_view(db, person)
    assert view.curp == "GARC850315HDFXYZ01"
    assert view.rfc == "GARC850315XYZ"
    assert view.professional_license == "1234567"
    assert view.office_city == "CDMX"
    assert view.specialty == "Cardiología"


def test_build_doctor_view_handles_missing_office_and_specialty():
    db = _mock_db(
        documents_rows=[_doc_row("Cédula Profesional", "1234567")],
        office=None, specialty=None,
    )
    person = SimpleNamespace(
        id=7, name="Doc", title=None, email="d@example.com",
        primary_phone=None, birth_date=None, is_active=True,
        specialty_id=None,
    )
    view = build_doctor_view(db, person)
    assert view.office_city is None
    assert view.specialty is None
    assert view.professional_license == "1234567"


# ---------------------------------------------------------------------------
# build_patient_view
# ---------------------------------------------------------------------------

def test_build_patient_view_normalizes_gender_and_resolves_curp():
    db = _mock_db(documents_rows=[_doc_row("CURP", "PERJ900501HDFRZN03")])
    person = SimpleNamespace(
        id=42, name="Juan Pérez", email="jp@example.com",
        primary_phone="+5212345", home_address="Calle X", address_city="CDMX",
        address_postal_code="06000", gender="M", birth_date=date(1990, 5, 1),
    )
    view = build_patient_view(db, person)
    assert view.curp == "PERJ900501HDFRZN03"
    # Adapter emits Spanish; interoperability.py translates to FHIR below.
    assert view.gender == "masculino"
    assert view.city == "CDMX"


# ---------------------------------------------------------------------------
# End-to-end: adapter → FHIR resource keeps identifiers.
# ---------------------------------------------------------------------------

def test_adapter_output_produces_valid_fhir_practitioner():
    db = _mock_db(
        documents_rows=[
            _doc_row("CURP", "GARC850315HDFXYZ01"),
            _doc_row("Cédula Profesional", "1234567"),
        ],
        office=SimpleNamespace(
            address="Av X", city="CDMX", state_name="CDMX",
            postal_code="06000",
        ),
        specialty=SimpleNamespace(name="Cardiología"),
    )
    person = SimpleNamespace(
        id=7, name="María García", title="Dra.", email="m@x.com",
        primary_phone="+521", birth_date=date(1985, 3, 15),
        is_active=True, specialty_id=12,
    )
    view = build_doctor_view(db, person)
    fhir = InteroperabilityService.doctor_to_fhir_practitioner(view)
    out = fhir.model_dump(exclude_none=True)
    assert out["resourceType"] == "Practitioner"
    # Cédula always present; CURP also present.
    id_texts = [i["type"]["text"] for i in out["identifier"]]
    assert "CURP" in id_texts
    assert "Cédula Profesional" in id_texts


def test_adapter_output_produces_valid_fhir_patient():
    db = _mock_db(documents_rows=[_doc_row("CURP", "PERJ900501HDFRZN03")])
    person = SimpleNamespace(
        id=42, name="Juan Pérez", email="jp@x.com", primary_phone="+521",
        home_address="X", address_city="CDMX", address_postal_code="06000",
        gender="M", birth_date=date(1990, 5, 1),
    )
    view = build_patient_view(db, person)
    fhir = InteroperabilityService.patient_to_fhir_patient(view)
    out = fhir.model_dump(exclude_none=True)
    assert out["resourceType"] == "Patient"
    assert out["gender"] == "male"
    id_texts = [i["type"]["text"] for i in out["identifier"]]
    assert "CURP" in id_texts
    assert "Hospital ID" in id_texts


# ---------------------------------------------------------------------------
# Bundle envelope.
# ---------------------------------------------------------------------------

def test_wrap_as_bundle_produces_searchset():
    b = wrap_as_bundle("Patient", [{"resourceType": "Patient", "id": 1}, {"resourceType": "Patient", "id": 2}])
    assert b["resourceType"] == "Bundle"
    assert b["type"] == "searchset"
    assert b["total"] == 2
    assert b["entry"][0]["search"]["mode"] == "match"
    assert b["entry"][0]["resource"]["id"] == 1


def test_wrap_as_bundle_empty():
    b = wrap_as_bundle("Patient", [])
    assert b["total"] == 0
    assert b["entry"] == []


# ---------------------------------------------------------------------------
# Encounter
# ---------------------------------------------------------------------------

def test_build_encounter_view_aliases_consultation_date_to_date():
    consultation = SimpleNamespace(
        id=100, patient_id=42, doctor_id=7,
        consultation_date=date(2026, 3, 1),
        chief_complaint="Dolor torácico",
    )
    view = build_encounter_view(consultation)
    assert view.id == "100"
    assert view.date == date(2026, 3, 1)
    assert view.chief_complaint == "Dolor torácico"


def test_fix_encounter_keys_renames_class_underscore_to_class():
    raw = {
        "resourceType": "Encounter",
        "id": "100",
        "class_": {"code": "AMB"},
        "subject": {"reference": "Patient/42"},
    }
    fixed = fix_encounter_keys(raw)
    assert "class" in fixed
    assert "class_" not in fixed
    assert fixed["class"] == {"code": "AMB"}
    # Non-destructive.
    assert "class_" in raw


def test_encounter_end_to_end_produces_valid_fhir_shape():
    consultation = SimpleNamespace(
        id=100, patient_id=42, doctor_id=7,
        consultation_date=date(2026, 3, 1),
        chief_complaint="Cefalea",
    )
    view = build_encounter_view(consultation)
    enc = InteroperabilityService.consultation_to_fhir_encounter(
        view, patient_id="42", doctor_id="7",
    )
    out = fix_encounter_keys(enc.model_dump(exclude_none=True))
    assert out["resourceType"] == "Encounter"
    assert out["id"] == "100"
    assert out["subject"] == {"reference": "Patient/42"}
    assert out["class"]["code"] == "AMB"
    # Period should carry the consultation date as ISO on both bounds.
    assert out["period"]["start"].startswith("2026-03-01")
    # Reason code threaded through.
    assert out["reasonCode"][0]["text"] == "Cefalea"


# ---------------------------------------------------------------------------
# build_everything_bundle
# ---------------------------------------------------------------------------

def test_everything_bundle_tags_patient_as_match_and_rest_as_include():
    patient = {"resourceType": "Patient", "id": "42"}
    encs = [{"resourceType": "Encounter", "id": "100"}, {"resourceType": "Encounter", "id": "101"}]
    pracs = [{"resourceType": "Practitioner", "id": "7"}]
    bundle = build_everything_bundle(patient, encs, pracs)
    assert bundle["resourceType"] == "Bundle"
    assert bundle["type"] == "searchset"
    assert bundle["total"] == 4  # 1 patient + 2 encounters + 1 practitioner
    assert bundle["entry"][0]["search"]["mode"] == "match"
    assert bundle["entry"][0]["resource"]["resourceType"] == "Patient"
    for e in bundle["entry"][1:]:
        assert e["search"]["mode"] == "include"


def test_everything_bundle_handles_no_encounters_or_practitioners():
    patient = {"resourceType": "Patient", "id": "42"}
    bundle = build_everything_bundle(patient, [], None)
    assert bundle["total"] == 1
    assert bundle["entry"][0]["resource"]["id"] == "42"
    assert bundle["entry"][0]["search"]["mode"] == "match"
