"""
Unit tests del servicio de firma electrónica simple (Fase 1).

Valida:
- canonicalización determinista
- sign_payload produce manifiesto completo
- verify_payload detecta payload íntegro, tampering, HMAC forgery, manifest ausente
- validadores de cédula, RFC, CURP (formatos)
- payload builders de receta y orden de estudios
- cambio de clave maestra invalida firmas previas
"""
from __future__ import annotations

import os
import sys
from types import SimpleNamespace

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

# Semilla determinista antes de importar el módulo.
os.environ["MEDICAL_ENCRYPTION_KEY"] = "unit-test-signature-key-do-not-use-in-prod"

import pytest  # noqa: E402

from services import digital_signature as dsvc  # noqa: E402


# ---- Canonicalization ---------------------------------------------------------

def test_canonicalize_is_deterministic_regardless_of_key_order():
    a = dsvc.canonicalize({"b": 1, "a": 2, "c": [3, 2, 1]})
    b = dsvc.canonicalize({"c": [3, 2, 1], "a": 2, "b": 1})
    assert a == b


def test_compute_hash_is_stable_for_equivalent_payloads():
    p1 = {"x": "á", "y": 1}
    p2 = {"y": 1, "x": "á"}
    assert dsvc.compute_hash(p1) == dsvc.compute_hash(p2)


# ---- Sign / verify ------------------------------------------------------------

def _sample_payload():
    return {
        "kind": "prescription",
        "id": 42,
        "medication_name": "Paracetamol 500mg",
        "dosage": "1 tab",
        "frequency": "c/8h",
        "duration": "5 días",
    }


def test_sign_produces_manifest_with_expected_keys():
    manifest = dsvc.sign_payload(_sample_payload(), doctor_id=7, cedula="1234567")
    assert manifest["algorithm"] == dsvc.SIGNATURE_ALGORITHM
    assert manifest["signer_doctor_id"] == 7
    assert manifest["signer_cedula"] == "1234567"
    assert len(manifest["signature_hash"]) == 64
    assert len(manifest["signature_hmac"]) == 64
    assert len(manifest["verification_uuid"]) == 36
    assert manifest["signed_at"]


def test_verify_accepts_untampered_payload():
    payload = _sample_payload()
    manifest = dsvc.sign_payload(payload, doctor_id=7, cedula="1234567")
    assert dsvc.verify_payload(payload, manifest) is True


def test_verify_detects_payload_tampering():
    payload = _sample_payload()
    manifest = dsvc.sign_payload(payload, doctor_id=7, cedula="1234567")
    tampered = dict(payload)
    tampered["dosage"] = "2 tab"
    assert dsvc.verify_payload(tampered, manifest) is False


def test_verify_detects_hmac_forgery():
    payload = _sample_payload()
    manifest = dsvc.sign_payload(payload, doctor_id=7, cedula="1234567")
    forged = dict(manifest)
    forged["signature_hmac"] = "0" * 64
    assert dsvc.verify_payload(payload, forged) is False


def test_verify_rejects_missing_or_empty_manifest():
    payload = _sample_payload()
    assert dsvc.verify_payload(payload, None) is False
    assert dsvc.verify_payload(payload, {}) is False
    assert dsvc.verify_payload(payload, {"signature_hash": "abc"}) is False


def test_verify_fails_if_server_secret_changes(monkeypatch):
    payload = _sample_payload()
    manifest = dsvc.sign_payload(payload, doctor_id=7, cedula="1234567")
    monkeypatch.setenv("MEDICAL_ENCRYPTION_KEY", "different-secret-rotation")
    assert dsvc.verify_payload(payload, manifest) is False


def test_missing_secret_raises():
    with pytest.MonkeyPatch.context() as m:
        m.delenv("MEDICAL_ENCRYPTION_KEY", raising=False)
        m.delenv("JWT_SECRET_KEY", raising=False)
        with pytest.raises(dsvc.SignatureConfigError):
            dsvc.sign_payload(_sample_payload(), doctor_id=7, cedula="1234567")


# ---- Validators ---------------------------------------------------------------

@pytest.mark.parametrize("cedula,expected", [
    ("1234567", True),
    ("12345678", True),
    ("123456", True),
    ("12345", False),            # muy corta
    ("12345678901", False),      # muy larga
    ("", False),
    (None, False),
    ("12345a7", False),          # letras
    ("  7654321  ", True),       # strip
])
def test_validate_cedula_format(cedula, expected):
    assert dsvc.validate_cedula_format(cedula) is expected


@pytest.mark.parametrize("rfc,expected", [
    ("GARC850101ABC", True),
    ("garc850101abc", True),     # case-insensitive
    ("GARC850101AB", False),     # corto
    ("GARC85010ABCX", False),    # dígitos incorrectos
    ("", False),
])
def test_validate_rfc_format(rfc, expected):
    assert dsvc.validate_rfc_format(rfc) is expected


@pytest.mark.parametrize("curp,expected", [
    ("GARC850101HDFRRL09", True),
    ("GARC850101MDFRRL09", True),  # mujer
    ("garc850101hdfrrl09", True),  # lowercase
    ("GARC850101XDFRRL09", False),  # género inválido
    ("GARC850101HDFRRL0", False),   # incompleto
    ("", False),
])
def test_validate_curp_format(curp, expected):
    assert dsvc.validate_curp_format(curp) is expected


# ---- Payload builders ---------------------------------------------------------

def test_build_prescription_payload_ignores_transient_fields():
    rx = SimpleNamespace(
        id=1,
        consultation_id=10,
        medication_id=99,
        dosage="1 tab",
        frequency="c/12h",
        duration="7 días",
        quantity="14",
        via_administracion="oral",
        instructions="con alimentos",
    )
    p1 = dsvc.build_prescription_payload(rx, "Amoxicilina", "Juan Pérez")
    # Campos irrelevantes para la firma no deben estar en el payload
    assert "created_at" not in p1
    assert "updated_at" not in p1
    assert p1["kind"] == "prescription"
    assert p1["medication_name"] == "Amoxicilina"
    assert p1["patient_name"] == "Juan Pérez"


def test_build_study_payload_uses_iso_date():
    from datetime import datetime

    study = SimpleNamespace(
        id=5,
        consultation_id=10,
        study_type="hematologia",
        study_name="BH completa",
        clinical_indication="rutina",
        urgency="routine",
        ordered_date=datetime(2026, 4, 21, 10, 0, 0),
        patient_id=3,
    )
    p = dsvc.build_study_payload(study, "María López")
    assert p["kind"] == "clinical_study"
    assert p["ordered_date"].startswith("2026-04-21")
    assert p["patient_name"] == "María López"


def test_payload_change_invalidates_existing_signature():
    """Si el servicio evoluciona el shape del payload, firmas previas deben fallar."""
    payload = _sample_payload()
    manifest = dsvc.sign_payload(payload, doctor_id=7, cedula="1234567")
    # Simulamos un campo nuevo que se incluye en el payload en v2 del algoritmo
    payload_v2 = dict(payload)
    payload_v2["new_field_added_in_v2"] = "value"
    assert dsvc.verify_payload(payload_v2, manifest) is False
