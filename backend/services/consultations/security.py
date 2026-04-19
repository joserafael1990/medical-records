"""
Security utilities for consultation service — encryption, decryption, and
integrity stamping of medical documents.

⚠️ IMPORTANT — CRYPTOGRAPHIC BOUNDARY ⚠️

`sign_medical_document` in this module produces an **integrity stamp**, not a
legally-binding electronic signature. It proves that a specific serialized
payload was observed by *this CORTEX backend* at a specific time, using a
server-side HMAC secret.

It is NOT:
  * an e.firma / FIEL issued by the SAT,
  * a PKCS#7 / CAdES signature tied to a personal certificate,
  * a non-repudiable signature that a court would treat as equivalent to a
    handwritten signature under the Ley de Firma Electrónica Avanzada.

Use cases this IS appropriate for:
  * Detecting tampering of consultation records in the database.
  * Proving, internally, that an auditor-visible hash was already computed
    at close-time (NOM-004 traceability).
  * As the "hashed payload" that a future e.firma or TSA integration would
    sign on top.

When a legal signature is required (mandatory NOM-004 close, prescriptions
of controlled substances, cross-institution exchange), this function is a
*prerequisite* but not a replacement. Until the SAT-based flow lands, mark
consultations as "stamped" rather than "signed" in user-facing copy.
"""

from __future__ import annotations

from typing import Any, Dict, Iterable, Optional
from datetime import datetime
import hashlib
import hmac
import json
import os
import secrets

from encryption import encryption_service, MedicalDataEncryption
from logger import get_logger

api_logger = get_logger("medical_records.api")

# Fields excluded from the canonical hash: audit metadata that changes every
# save (so the hash would churn without the clinical content actually changing).
_STAMP_EXCLUDED_KEYS = frozenset({
    "updated_at",
    "created_at",
    "signature",
    "signatures",
    "digital_signature",
    "last_signature_timestamp",
})

STAMP_ALGORITHM = "HMAC-SHA256"


def encrypt_sensitive_data(data: Dict[str, Any], type_str: str) -> Dict[str, Any]:
    """Encrypt sensitive fields in a dictionary."""
    encrypted = data.copy()
    fields_to_encrypt = []
    if type_str == "consultation":
        fields_to_encrypt = MedicalDataEncryption.CONSULTATION_ENCRYPTED_FIELDS
    elif type_str == "patient":
        fields_to_encrypt = MedicalDataEncryption.PATIENT_ENCRYPTED_FIELDS
    for field in fields_to_encrypt:
        if field in encrypted and encrypted[field]:
            encrypted[field] = encryption_service.encrypt_sensitive_data(str(encrypted[field]))
    return encrypted


def decrypt_sensitive_data(data: Dict[str, Any], type_str: str) -> Dict[str, Any]:
    """Decrypt sensitive fields in a dictionary (heuristic, length-based)."""
    decrypted = data.copy()
    for key, value in decrypted.items():
        if isinstance(value, str) and len(value) > 50:  # Simple heuristic
            try:
                decrypted_val = encryption_service.decrypt_sensitive_data(value)
                if decrypted_val != value:
                    decrypted[key] = decrypted_val
            except Exception:
                pass
    return decrypted


# ---------------------------------------------------------------------------
# Integrity stamp — real implementation (replaces the pre-existing mock).
# ---------------------------------------------------------------------------

def _get_signing_secret() -> bytes:
    """Return the server-side HMAC signing secret.

    Reads from the CORTEX_STAMP_SECRET env var. As a fallback for dev, reuses
    the existing MEDICAL_ENCRYPTION_KEY so a freshly-bootstrapped instance
    still produces valid stamps. In production CORTEX_STAMP_SECRET must be
    set explicitly so it can be rotated independently of the encryption key.
    """
    raw = os.getenv("CORTEX_STAMP_SECRET") or os.getenv("MEDICAL_ENCRYPTION_KEY")
    if not raw:
        # Last-resort fallback — writes a warning and generates a process-lifetime
        # secret so the app still boots. Stamps produced under this path CANNOT
        # be verified after a restart and should never happen in prod.
        api_logger.warning(
            "CORTEX_STAMP_SECRET is not set — generating ephemeral signing secret. "
            "Any integrity stamps produced in this process will not verify after restart."
        )
        raw = secrets.token_urlsafe(64)
    return raw.encode("utf-8")


def _canonical_payload(data: Dict[str, Any]) -> Dict[str, Any]:
    """Build the subset of the consultation that participates in the hash.

    Sorted keys + filtered audit metadata give a reproducible input so the
    same consultation always hashes to the same value when nothing clinical
    has changed.
    """
    return {k: data[k] for k in sorted(data.keys()) if k not in _STAMP_EXCLUDED_KEYS}


def _content_hash(payload: Dict[str, Any]) -> str:
    canonical = json.dumps(payload, sort_keys=True, ensure_ascii=False, default=str)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def sign_medical_document(data: Dict[str, Any], user_id: int, doc_type: str) -> Dict[str, Any]:
    """Compute an integrity stamp over a medical document.

    Returns a payload compatible with the pre-existing mock's response shape
    (`signatures[]` + `last_signature_timestamp`) so downstream response
    builders don't need to change. New fields (`content_hash`, `hmac`,
    `algorithm`, `canonical_fields`) can be used for verification.
    """
    from services.consultations.timezone_utils import now_cdmx

    canonical = _canonical_payload(data)
    content_hash = _content_hash(canonical)
    mac = hmac.new(_get_signing_secret(), content_hash.encode("utf-8"), hashlib.sha256).hexdigest()
    timestamp = now_cdmx().isoformat()
    signature_id = f"stamp-{content_hash[:16]}"

    return {
        "signatures": [
            {
                "signature_id": signature_id,
                "signer_id": user_id,
                "timestamp": timestamp,
                "type": doc_type,
                "algorithm": STAMP_ALGORITHM,
                "content_hash": content_hash,
                "hmac": mac,
                "canonical_fields": list(canonical.keys()),
                # Be honest about what this signature means.
                "legal_binding": False,
                "stamp_note": "Integrity stamp — not equivalent to SAT e.firma.",
            }
        ],
        "last_signature_timestamp": timestamp,
    }


def verify_medical_document_signature(
    data: Dict[str, Any],
    signature_payload: Dict[str, Any],
) -> Dict[str, Any]:
    """Verify that a signature payload matches a given document.

    Returns a structured result: `{valid: bool, reason: str, content_hash: str}`.
    Never raises on mismatch — callers (admin tools, compliance reports)
    typically want to surface the failure rather than abort.
    """
    signatures = (signature_payload or {}).get("signatures") or []
    if not signatures:
        return {"valid": False, "reason": "no_signatures"}

    stamp = signatures[0]
    if stamp.get("algorithm") != STAMP_ALGORITHM:
        return {"valid": False, "reason": f"unsupported_algorithm:{stamp.get('algorithm')}"}

    expected_hash = _content_hash(_canonical_payload(data))
    if not hmac.compare_digest(expected_hash, stamp.get("content_hash", "")):
        return {
            "valid": False,
            "reason": "content_hash_mismatch",
            "expected": expected_hash,
            "found": stamp.get("content_hash"),
        }

    expected_mac = hmac.new(
        _get_signing_secret(), expected_hash.encode("utf-8"), hashlib.sha256
    ).hexdigest()
    if not hmac.compare_digest(expected_mac, stamp.get("hmac", "")):
        return {"valid": False, "reason": "hmac_mismatch"}

    return {
        "valid": True,
        "reason": "ok",
        "content_hash": expected_hash,
        "signer_id": stamp.get("signer_id"),
        "timestamp": stamp.get("timestamp"),
    }
