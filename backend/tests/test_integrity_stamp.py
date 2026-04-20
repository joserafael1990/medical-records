"""
Unit tests for the consultation integrity stamp.

Verifies the HMAC-based stamp replacement for the previous mock signer:
- sign produces a content_hash + hmac over a stable canonical payload
- excluded keys (timestamps, signature itself) do not affect the hash
- verify returns valid=True for an untampered payload
- verify detects: content mutation, hmac forgery, wrong algorithm, missing stamp
- changing the server secret invalidates previously-issued stamps
"""

from __future__ import annotations

import os
import sys

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

# Pin a known signing secret before importing the module so tests are
# deterministic and don't depend on the developer's environment.
os.environ["CORTEX_STAMP_SECRET"] = "unit-test-secret-please-do-not-use-in-prod"

import pytest  # noqa: E402

from services.consultations.security import (  # noqa: E402
    STAMP_ALGORITHM,
    sign_medical_document,
    verify_medical_document_signature,
)


CONSULTATION = {
    "id": 100,
    "patient_id": 42,
    "doctor_id": 7,
    "chief_complaint": "Dolor torácico",
    "primary_diagnosis": "Angina estable",
    "treatment_plan": "Nitroglicerina PRN",
    "consultation_type": "Primera vez",
    "notes": None,
}


# ---------------------------------------------------------------------------
# sign_medical_document
# ---------------------------------------------------------------------------

def test_sign_returns_expected_shape():
    stamp = sign_medical_document(CONSULTATION, user_id=7, doc_type="consultation")
    assert "signatures" in stamp and isinstance(stamp["signatures"], list)
    assert stamp["last_signature_timestamp"]
    sig = stamp["signatures"][0]
    assert sig["signer_id"] == 7
    assert sig["type"] == "consultation"
    assert sig["algorithm"] == STAMP_ALGORITHM
    assert len(sig["content_hash"]) == 64  # SHA-256 hex
    assert len(sig["hmac"]) == 64
    assert sig["signature_id"].startswith("stamp-")
    # Legal honesty.
    assert sig["legal_binding"] is False


def test_sign_is_deterministic_on_clinical_content():
    """Same clinical content → same content_hash, even if updated_at changes."""
    a = sign_medical_document(dict(CONSULTATION, updated_at="2026-01-01"), 7, "consultation")
    b = sign_medical_document(dict(CONSULTATION, updated_at="2030-12-31"), 7, "consultation")
    assert a["signatures"][0]["content_hash"] == b["signatures"][0]["content_hash"]
    assert a["signatures"][0]["hmac"] == b["signatures"][0]["hmac"]


def test_sign_changes_when_clinical_content_changes():
    a = sign_medical_document(CONSULTATION, 7, "consultation")
    mutated = dict(CONSULTATION, primary_diagnosis="Infarto agudo de miocardio")
    b = sign_medical_document(mutated, 7, "consultation")
    assert a["signatures"][0]["content_hash"] != b["signatures"][0]["content_hash"]


def test_sign_excludes_signature_key_from_hash():
    """A document that already carries a stamp must hash the same before and
    after the stamp is attached — otherwise we couldn't re-verify post-save."""
    a = sign_medical_document(CONSULTATION, 7, "consultation")
    hash_before = a["signatures"][0]["content_hash"]

    decorated = dict(CONSULTATION, digital_signature=a, signatures=a["signatures"])
    b = sign_medical_document(decorated, 7, "consultation")
    assert b["signatures"][0]["content_hash"] == hash_before


# ---------------------------------------------------------------------------
# verify_medical_document_signature
# ---------------------------------------------------------------------------

def test_verify_untampered_payload_is_valid():
    stamp = sign_medical_document(CONSULTATION, 7, "consultation")
    result = verify_medical_document_signature(CONSULTATION, stamp)
    assert result["valid"] is True
    assert result["reason"] == "ok"
    assert result["content_hash"] == stamp["signatures"][0]["content_hash"]


def test_verify_detects_field_mutation():
    stamp = sign_medical_document(CONSULTATION, 7, "consultation")
    tampered = dict(CONSULTATION, primary_diagnosis="Otra cosa")
    result = verify_medical_document_signature(tampered, stamp)
    assert result["valid"] is False
    assert result["reason"] == "content_hash_mismatch"


def test_verify_detects_hmac_forgery():
    """Someone who could mutate the stored hash but doesn't have the secret."""
    stamp = sign_medical_document(CONSULTATION, 7, "consultation")
    # Attacker changes the content but re-hashes it without the server secret.
    import hashlib, json
    tampered = dict(CONSULTATION, primary_diagnosis="Otra cosa")
    canonical = {k: tampered[k] for k in sorted(tampered.keys())}
    new_hash = hashlib.sha256(
        json.dumps(canonical, sort_keys=True, ensure_ascii=False, default=str).encode("utf-8")
    ).hexdigest()
    stamp["signatures"][0]["content_hash"] = new_hash  # hmac left stale
    result = verify_medical_document_signature(tampered, stamp)
    assert result["valid"] is False
    assert result["reason"] == "hmac_mismatch"


def test_verify_rejects_unsupported_algorithm():
    stamp = sign_medical_document(CONSULTATION, 7, "consultation")
    stamp["signatures"][0]["algorithm"] = "MD5"
    result = verify_medical_document_signature(CONSULTATION, stamp)
    assert result["valid"] is False
    assert result["reason"].startswith("unsupported_algorithm")


def test_verify_handles_missing_stamp():
    result = verify_medical_document_signature(CONSULTATION, {"signatures": []})
    assert result["valid"] is False
    assert result["reason"] == "no_signatures"

    result = verify_medical_document_signature(CONSULTATION, {})
    assert result["valid"] is False
    assert result["reason"] == "no_signatures"


def test_verify_fails_after_secret_rotation():
    """Stamps issued with the old secret should not verify under the new one.

    This is the desired behavior — rotating `CORTEX_STAMP_SECRET` is a
    controlled operation; existing stamps must be re-issued.
    """
    stamp = sign_medical_document(CONSULTATION, 7, "consultation")
    old_secret = os.environ["CORTEX_STAMP_SECRET"]
    try:
        os.environ["CORTEX_STAMP_SECRET"] = "rotated-secret"
        result = verify_medical_document_signature(CONSULTATION, stamp)
    finally:
        os.environ["CORTEX_STAMP_SECRET"] = old_secret
    assert result["valid"] is False
    assert result["reason"] == "hmac_mismatch"
