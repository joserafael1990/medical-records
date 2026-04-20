"""
Unit tests for ARCO export (LFPDPPP Art. 15).

No database required — exercises the pure serialization + ZIP-building
helpers in services.arco_export_service and the audit helper in
audit_service. The route handler is not exercised here; the service is
the unit of interest for compliance correctness.
"""

from __future__ import annotations

import io
import json
import os
import sys
import zipfile
from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from services.arco_export_service import (  # noqa: E402
    ARCOExportBundle,
    build_zip,
    serialize_clinical_study,
    serialize_consultation,
    serialize_patient,
    serialize_prescription,
    serialize_privacy_consent,
    serialize_vital_sign,
    _maybe_decrypt,
)
from audit_service import AuditService  # noqa: E402


# ---------------------------------------------------------------------------
# Fakes — plain namespaces stand in for ORM rows.
# ---------------------------------------------------------------------------

def _fake_patient():
    return SimpleNamespace(
        id=42, person_type="patient", person_code="PAT-42",
        title=None, name="Juan Pérez", email="jp@example.com",
        primary_phone="+521234567890", birth_date=datetime(1990, 5, 1).date(),
        gender="M", civil_status="single", birth_city="CDMX",
        birth_state_id=9, birth_country_id=1,
        home_address=None, address_city=None, address_state_id=None,
        address_country_id=None, address_postal_code=None,
        emergency_contact_name=None, emergency_contact_phone=None,
        emergency_contact_relationship=None,
        insurance_provider=None, insurance_number=None,
        created_at=datetime(2026, 1, 1, 12, 0, tzinfo=timezone.utc),
        updated_at=datetime(2026, 1, 2, 12, 0, tzinfo=timezone.utc),
    )


def _fake_document(name="CURP", value="PERJ900501HDFRZN03"):
    return SimpleNamespace(
        document_id=5, document_value=value, is_active=True,
        created_at=datetime(2026, 1, 1),
        document=SimpleNamespace(name=name),
    )


def _fake_consultation():
    return SimpleNamespace(
        id=100, patient_id=42, doctor_id=7,
        consultation_date=datetime(2026, 3, 1, 10, 0, tzinfo=timezone.utc),
        chief_complaint="enc::CIPHER",
        history_present_illness="enc::CIPHER2",
        family_history="fh-plain",
        perinatal_history="",
        gynecological_and_obstetric_history="",
        personal_pathological_history="",
        personal_non_pathological_history="",
        physical_examination="",
        primary_diagnosis="enc::DX",
        treatment_plan="",
        follow_up_instructions="",
        consultation_type="Seguimiento",
        secondary_diagnoses=None,
        prescribed_medications=None,
        laboratory_results=None,
        notes=None,
        created_at=datetime(2026, 3, 1, 12, 0, tzinfo=timezone.utc),
        updated_at=datetime(2026, 3, 1, 12, 0, tzinfo=timezone.utc),
    )


# ---------------------------------------------------------------------------
# Serializers.
# ---------------------------------------------------------------------------

def test_serialize_patient_includes_documents_with_names():
    out = serialize_patient(_fake_patient(), [_fake_document("CURP", "X")])
    assert out["id"] == 42
    assert out["name"] == "Juan Pérez"
    # datetime becomes ISO
    assert out["created_at"].endswith("+00:00")
    assert out["documents"][0]["document_name"] == "CURP"
    assert out["documents"][0]["document_value"] == "X"


def test_serialize_consultation_decrypts_encrypted_fields():
    fake_decrypt = lambda v: v.replace("enc::", "")
    out = serialize_consultation(_fake_consultation(), decrypt_fn=fake_decrypt)
    assert out["chief_complaint"] == "CIPHER"
    assert out["primary_diagnosis"] == "DX"
    assert out["family_history"] == "fh-plain"  # not in encrypted list
    assert out["consultation_type"] == "Seguimiento"


def test_serialize_consultation_marks_decryption_failure():
    def bad_decrypt(v: str) -> str:
        raise RuntimeError("wrong key")
    out = serialize_consultation(_fake_consultation(), decrypt_fn=bad_decrypt)
    assert out["chief_complaint"] == {"_decrypt_failed": True, "ciphertext": "enc::CIPHER"}


def test_serialize_consultation_without_decrypt_keeps_ciphertext():
    out = serialize_consultation(_fake_consultation(), decrypt_fn=None)
    assert out["chief_complaint"] == "enc::CIPHER"


def test_maybe_decrypt_none_is_none():
    assert _maybe_decrypt(None, lambda v: v) is None


def test_serialize_prescription_flattens_medication():
    rx = SimpleNamespace(
        id=1, consultation_id=100, medication_id=9,
        medication=SimpleNamespace(name="Paracetamol 500mg"),
        dosage="500mg", frequency="c/8h", duration="5 días",
        instructions="con alimentos", quantity=15, via_administracion="oral",
        created_at=datetime(2026, 3, 1),
    )
    out = serialize_prescription(rx)
    assert out["medication_name"] == "Paracetamol 500mg"
    assert out["dosage"] == "500mg"
    assert out["quantity"] == 15


def test_serialize_clinical_study_minimum_fields():
    study = SimpleNamespace(
        id=1, consultation_id=100, patient_id=42,
        study_type="laboratorio", study_name="BH completa",
        ordered_date=datetime(2026, 3, 1), performed_date=None,
        status="pending", urgency="Rutina",
        clinical_indication="sintomatología", ordering_doctor="Dra. X",
        file_name=None, file_type=None, file_size=None,
        created_at=datetime(2026, 3, 1),
    )
    out = serialize_clinical_study(study)
    assert out["study_name"] == "BH completa"
    assert out["status"] == "pending"


def test_serialize_vital_sign_resolves_relationship_name():
    vs = SimpleNamespace(
        id=1, consultation_id=100, vital_sign_id=3,
        vital_sign=SimpleNamespace(name="Presión arterial sistólica"),
        value="120", unit="mmHg",
        created_at=datetime(2026, 3, 1),
    )
    out = serialize_vital_sign(vs)
    assert out["vital_sign_name"] == "Presión arterial sistólica"
    assert out["value"] == "120"


def test_serialize_privacy_consent_preserves_ip_and_ua():
    c = SimpleNamespace(
        id=1, notice_id=2, consent_given=True,
        consent_date=datetime(2026, 3, 1), ip_address="10.0.0.1",
        user_agent="Mozilla/5.0", created_at=datetime(2026, 3, 1),
    )
    out = serialize_privacy_consent(c)
    assert out["ip_address"] == "10.0.0.1"
    assert out["consent_given"] is True


# ---------------------------------------------------------------------------
# Bundle + ZIP assembly.
# ---------------------------------------------------------------------------

def _bundle_fixture() -> ARCOExportBundle:
    patient = serialize_patient(_fake_patient(), [_fake_document()])
    consultations = [serialize_consultation(_fake_consultation(), decrypt_fn=lambda v: v.replace("enc::", ""))]
    return ARCOExportBundle(
        patient=patient,
        consultations=consultations,
        prescriptions=[{"id": 1, "dosage": "500mg"}],
        clinical_studies=[{"id": 1, "study_name": "BH"}],
        vital_signs=[{"id": 1, "value": "120"}],
        privacy_consents=[{"id": 1, "consent_given": True}],
        generated_by_doctor_id=7,
    )


def test_bundle_counts():
    bundle = _bundle_fixture()
    counts = bundle.counts()
    assert counts == {
        "consultations": 1,
        "prescriptions": 1,
        "clinical_studies": 1,
        "vital_signs": 1,
        "privacy_consents": 1,
    }


def test_build_zip_contains_expected_files():
    payload = build_zip(_bundle_fixture())
    with zipfile.ZipFile(io.BytesIO(payload)) as zf:
        names = sorted(zf.namelist())
    assert names == sorted([
        "profile.json",
        "consultations.json",
        "prescriptions.json",
        "clinical_studies.json",
        "vital_signs.json",
        "privacy_consents.json",
        "summary.md",
    ])


def test_build_zip_consultations_json_is_valid_and_decrypted():
    payload = build_zip(_bundle_fixture())
    with zipfile.ZipFile(io.BytesIO(payload)) as zf:
        data = json.loads(zf.read("consultations.json"))
    assert data[0]["chief_complaint"] == "CIPHER"


def test_build_zip_summary_references_lfpdppp():
    payload = build_zip(_bundle_fixture())
    with zipfile.ZipFile(io.BytesIO(payload)) as zf:
        summary = zf.read("summary.md").decode("utf-8")
    assert "LFPDPPP" in summary
    assert "derecho ARCO" in summary.lower() or "derechos" in summary.lower()
    # The patient name lands in the header; the doctor id lands in the metadata.
    assert "Juan Pérez" in summary
    assert "7" in summary


# ---------------------------------------------------------------------------
# Audit.
# ---------------------------------------------------------------------------

def _fake_request():
    req = MagicMock()
    req.client = SimpleNamespace(host="10.0.0.1")
    req.headers = {"user-agent": "pytest/1.0"}
    return req


def test_log_arco_export_emits_critical_export_action():
    db = MagicMock()
    user = SimpleNamespace(id=7, email="d@example.com", name="Doc", person_type="doctor")
    with patch.object(AuditService, "log_action") as log:
        AuditService.log_arco_export(
            db=db, user=user, patient_id=42, patient_name="Juan Pérez",
            request=_fake_request(),
            counts={"consultations": 3, "prescriptions": 4},
        )
    kwargs = log.call_args.kwargs
    assert kwargs["action"] == "EXPORT"
    assert kwargs["table_name"] == "persons"
    assert kwargs["record_id"] == 42
    assert kwargs["affected_patient_id"] == 42
    assert kwargs["affected_patient_name"] == "Juan Pérez"
    assert kwargs["operation_type"] == "arco_export"
    assert kwargs["security_level"] == "CRITICAL"
    assert kwargs["metadata"]["counts"]["consultations"] == 3
