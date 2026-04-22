"""
Firma electrónica simple para recetas y órdenes médicas (Fase 1).

Modelo Prescrypto-style: SHA-256 del payload canonicalizado + HMAC-SHA256 con clave del
servidor + UUID para URL pública de verificación. Equivalente legal a lo que operan
los EMRs mexicanos establecidos (Prescrypto, Doctoralia) y cubre LGS Art. 240 + RIS
Art. 50 ("firma electrónica o digital del emisor") más NOM-004-SSA3-2012.

NO es FEA con e.firma SAT ni emite Constancia NOM-151 — esa fuerza legal plena vive
en Fase 2 (integración Mifiel/FirmaMex).

El hash se computa sobre los campos clínicos relevantes (no sobre IDs de sesión ni
timestamps). Cualquier modificación posterior al documento invalida la firma.
"""
from __future__ import annotations

import hashlib
import hmac
import json
import os
import re
import uuid as uuid_mod
from datetime import datetime
from typing import Any

import pytz

_CDMX = pytz.timezone("America/Mexico_City")

SIGNATURE_ALGORITHM = "HMAC-SHA256-v1"

# Cédula profesional SEP: 6-10 dígitos numéricos
# https://www.cedulaprofesional.sep.gob.mx/
_CEDULA_RE = re.compile(r"^\d{6,10}$")
# RFC persona física México
_RFC_PF_RE = re.compile(r"^[A-ZÑ&]{4}\d{6}[A-Z0-9]{3}$", re.IGNORECASE)
# CURP
_CURP_RE = re.compile(r"^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$", re.IGNORECASE)


class SignatureConfigError(RuntimeError):
    """Falta la clave maestra para firmar."""


def _master_key() -> bytes:
    """Clave HMAC del servidor. Reutiliza variables existentes de la app."""
    key = os.getenv("MEDICAL_ENCRYPTION_KEY") or os.getenv("JWT_SECRET_KEY")
    if not key:
        raise SignatureConfigError(
            "Se requiere MEDICAL_ENCRYPTION_KEY o JWT_SECRET_KEY para firmar documentos"
        )
    return key.encode("utf-8")


def canonicalize(payload: dict[str, Any]) -> bytes:
    """JSON determinista: keys ordenadas, separadores compactos, UTF-8."""
    return json.dumps(
        payload,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=False,
        default=str,
    ).encode("utf-8")


def compute_hash(payload: dict[str, Any]) -> str:
    return hashlib.sha256(canonicalize(payload)).hexdigest()


def sign_payload(payload: dict[str, Any], doctor_id: int, cedula: str) -> dict[str, Any]:
    """Produce el manifiesto de firma electrónica simple."""
    h = compute_hash(payload)
    mac = hmac.new(_master_key(), h.encode("utf-8"), hashlib.sha256).hexdigest()
    return {
        "verification_uuid": str(uuid_mod.uuid4()),
        "signature_hash": h,
        "signature_hmac": mac,
        "signer_doctor_id": doctor_id,
        "signer_cedula": cedula,
        "signed_at": datetime.now(_CDMX).isoformat(timespec="seconds"),
        "algorithm": SIGNATURE_ALGORITHM,
    }


def verify_payload(payload: dict[str, Any], manifest: dict[str, Any] | None) -> bool:
    """Valida que el payload actual coincida con el hash/HMAC del manifiesto."""
    if not manifest:
        return False
    h = compute_hash(payload)
    stored_hash = manifest.get("signature_hash", "")
    stored_mac = manifest.get("signature_hmac", "")
    if not stored_hash or not stored_mac:
        return False
    if not hmac.compare_digest(h, stored_hash):
        return False
    expected_mac = hmac.new(_master_key(), h.encode("utf-8"), hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected_mac, stored_mac)


def now_cdmx() -> datetime:
    return datetime.now(_CDMX)


# ---- Validators ---------------------------------------------------------------

def validate_cedula_format(cedula: str | None) -> bool:
    return bool(cedula and _CEDULA_RE.fullmatch(cedula.strip()))


def validate_rfc_format(rfc: str | None) -> bool:
    return bool(rfc and _RFC_PF_RE.fullmatch(rfc.strip()))


def validate_curp_format(curp: str | None) -> bool:
    return bool(curp and _CURP_RE.fullmatch(curp.strip()))


# ---- Payload builders ---------------------------------------------------------
# Cambiar la forma del payload invalida firmas existentes; por eso el manifiesto
# guarda `algorithm`. Si se modifica el shape, incrementar SIGNATURE_ALGORITHM
# y mantener backwards-compat en verify_payload por versión.

def build_prescription_payload(rx, medication_name: str, patient_name: str) -> dict[str, Any]:
    return {
        "kind": "prescription",
        "id": rx.id,
        "consultation_id": rx.consultation_id,
        "medication_id": rx.medication_id,
        "medication_name": medication_name or "",
        "patient_name": patient_name or "",
        "dosage": rx.dosage or "",
        "frequency": rx.frequency or "",
        "duration": rx.duration or "",
        "quantity": rx.quantity or "",
        "via_administracion": rx.via_administracion or "",
        "instructions": rx.instructions or "",
    }


def build_study_payload(study, patient_name: str) -> dict[str, Any]:
    ordered = study.ordered_date.isoformat() if study.ordered_date else ""
    return {
        "kind": "clinical_study",
        "id": study.id,
        "consultation_id": study.consultation_id,
        "patient_name": patient_name or "",
        "study_type": study.study_type or "",
        "study_name": study.study_name or "",
        "clinical_indication": study.clinical_indication or "",
        "urgency": study.urgency or "",
        "ordered_date": ordered,
    }
