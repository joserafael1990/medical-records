"""
ARCO export service (LFPDPPP Art. 15: derecho de Acceso).

Given an authenticated doctor and a patient they own, builds a ZIP archive
containing every piece of PHI the system stores about that patient, plus a
human-readable summary. The archive can be delivered to the patient to
fulfill an ARCO access request.

Design notes:
- Doctor-initiated: in CORTEX's current data model, a patient is created by
  a doctor (`persons.created_by`). The doctor acts as the data controller for
  their patients and owes the ARCO response. Patient-self-service export is a
  future enhancement (would need patient auth).
- Format: ZIP with structured JSON files per entity plus `summary.md`. A FHIR
  Bundle variant is tracked as a follow-up; the JSON here is a superset so
  conversion later is mechanical.
- Encryption: encrypted fields on MedicalRecord are decrypted via the same
  helper the consultation service uses, so the export matches what the doctor
  would see in the UI. If decryption fails we include the ciphertext with a
  `_decrypt_failed: true` marker rather than silently dropping the field.
"""

from __future__ import annotations

import io
import json
import zipfile
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Callable, Dict, List, Optional


# ---------------------------------------------------------------------------
# Serialization helpers — pure functions, trivially unit-testable.
# ---------------------------------------------------------------------------

def _json_safe(value: Any) -> Any:
    """Convert datetimes / ORM edge cases to JSON-serializable primitives."""
    if isinstance(value, datetime):
        return value.isoformat()
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return value


def _maybe_decrypt(
    ciphertext: Optional[str],
    decrypt_fn: Optional[Callable[[str], str]],
) -> Any:
    """Best-effort decrypt. If it fails, mark the field so auditors can see."""
    if ciphertext is None or decrypt_fn is None:
        return ciphertext
    try:
        return decrypt_fn(ciphertext)
    except Exception:
        return {"_decrypt_failed": True, "ciphertext": ciphertext}


# ---------------------------------------------------------------------------
# Entity serializers.
# ---------------------------------------------------------------------------

PERSON_FIELDS = (
    "id", "person_type", "person_code", "title", "name", "email",
    "primary_phone", "birth_date", "gender", "civil_status",
    "birth_city", "birth_state_id", "birth_country_id",
    "home_address", "address_city", "address_state_id",
    "address_country_id", "address_postal_code",
    "emergency_contact_name", "emergency_contact_phone",
    "emergency_contact_relationship",
    "insurance_provider", "insurance_number",
    "created_at", "updated_at",
)

CONSULTATION_FIELDS = (
    "id", "patient_id", "doctor_id", "consultation_date",
    "chief_complaint", "history_present_illness", "family_history",
    "perinatal_history", "gynecological_and_obstetric_history",
    "personal_pathological_history", "personal_non_pathological_history",
    "physical_examination", "primary_diagnosis", "treatment_plan",
    "follow_up_instructions", "consultation_type", "secondary_diagnoses",
    "prescribed_medications", "laboratory_results", "notes",
    "created_at", "updated_at",
)

# Fields on MedicalRecord that are encrypted at rest and need decryption
# before being handed to the patient (same list as consultation_service uses).
CONSULTATION_ENCRYPTED_FIELDS = (
    "chief_complaint", "history_present_illness", "family_history",
    "perinatal_history", "gynecological_and_obstetric_history",
    "personal_pathological_history", "personal_non_pathological_history",
    "physical_examination", "primary_diagnosis", "treatment_plan",
    "follow_up_instructions", "secondary_diagnoses",
    "prescribed_medications", "laboratory_results", "notes",
)


def serialize_patient(
    patient: Any,
    documents: List[Any],
) -> Dict[str, Any]:
    """Build the `profile` payload for the export."""
    out: Dict[str, Any] = {}
    for field_name in PERSON_FIELDS:
        if hasattr(patient, field_name):
            out[field_name] = _json_safe(getattr(patient, field_name))
    out["documents"] = [
        {
            "document_id": getattr(d, "document_id", None),
            "document_name": getattr(getattr(d, "document", None), "name", None),
            "document_value": getattr(d, "document_value", None),
            "is_active": getattr(d, "is_active", None),
            "created_at": _json_safe(getattr(d, "created_at", None)),
        }
        for d in documents or []
    ]
    return out


def serialize_consultation(
    consultation: Any,
    decrypt_fn: Optional[Callable[[str], str]] = None,
) -> Dict[str, Any]:
    """Serialize a MedicalRecord row, decrypting PHI fields when possible."""
    out: Dict[str, Any] = {}
    for field_name in CONSULTATION_FIELDS:
        if not hasattr(consultation, field_name):
            continue
        value = getattr(consultation, field_name)
        if field_name in CONSULTATION_ENCRYPTED_FIELDS and isinstance(value, str):
            out[field_name] = _maybe_decrypt(value, decrypt_fn)
        else:
            out[field_name] = _json_safe(value)
    return out


def serialize_prescription(rx: Any) -> Dict[str, Any]:
    return {
        "id": getattr(rx, "id", None),
        "consultation_id": getattr(rx, "consultation_id", None),
        "medication_id": getattr(rx, "medication_id", None),
        "medication_name": getattr(getattr(rx, "medication", None), "name", None),
        "dosage": getattr(rx, "dosage", None),
        "frequency": getattr(rx, "frequency", None),
        "duration": getattr(rx, "duration", None),
        "instructions": getattr(rx, "instructions", None),
        "quantity": getattr(rx, "quantity", None),
        "via_administracion": getattr(rx, "via_administracion", None),
        "created_at": _json_safe(getattr(rx, "created_at", None)),
    }


def serialize_clinical_study(study: Any) -> Dict[str, Any]:
    return {
        "id": getattr(study, "id", None),
        "consultation_id": getattr(study, "consultation_id", None),
        "patient_id": getattr(study, "patient_id", None),
        "study_type": getattr(study, "study_type", None),
        "study_name": getattr(study, "study_name", None),
        "ordered_date": _json_safe(getattr(study, "ordered_date", None)),
        "performed_date": _json_safe(getattr(study, "performed_date", None)),
        "status": getattr(study, "status", None),
        "urgency": getattr(study, "urgency", None),
        "clinical_indication": getattr(study, "clinical_indication", None),
        "ordering_doctor": getattr(study, "ordering_doctor", None),
        "file_name": getattr(study, "file_name", None),
        "file_type": getattr(study, "file_type", None),
        "file_size": getattr(study, "file_size", None),
        "created_at": _json_safe(getattr(study, "created_at", None)),
    }


def serialize_vital_sign(vs: Any) -> Dict[str, Any]:
    return {
        "id": getattr(vs, "id", None),
        "consultation_id": getattr(vs, "consultation_id", None),
        "vital_sign_id": getattr(vs, "vital_sign_id", None),
        "vital_sign_name": getattr(getattr(vs, "vital_sign", None), "name", None),
        "value": getattr(vs, "value", None),
        "unit": getattr(vs, "unit", None),
        "created_at": _json_safe(getattr(vs, "created_at", None)),
    }


def serialize_privacy_consent(consent: Any) -> Dict[str, Any]:
    return {
        "id": getattr(consent, "id", None),
        "notice_id": getattr(consent, "notice_id", None),
        "consent_given": getattr(consent, "consent_given", None),
        "consent_date": _json_safe(getattr(consent, "consent_date", None)),
        "ip_address": getattr(consent, "ip_address", None),
        "user_agent": getattr(consent, "user_agent", None),
        "created_at": _json_safe(getattr(consent, "created_at", None)),
    }


# ---------------------------------------------------------------------------
# Export bundle assembly.
# ---------------------------------------------------------------------------

@dataclass
class ARCOExportBundle:
    """In-memory representation of what goes into the ZIP."""

    patient: Dict[str, Any]
    consultations: List[Dict[str, Any]] = field(default_factory=list)
    prescriptions: List[Dict[str, Any]] = field(default_factory=list)
    clinical_studies: List[Dict[str, Any]] = field(default_factory=list)
    vital_signs: List[Dict[str, Any]] = field(default_factory=list)
    privacy_consents: List[Dict[str, Any]] = field(default_factory=list)
    generated_at: datetime = field(default_factory=datetime.utcnow)
    generated_by_doctor_id: Optional[int] = None

    def counts(self) -> Dict[str, int]:
        return {
            "consultations": len(self.consultations),
            "prescriptions": len(self.prescriptions),
            "clinical_studies": len(self.clinical_studies),
            "vital_signs": len(self.vital_signs),
            "privacy_consents": len(self.privacy_consents),
        }


def _summary_markdown(bundle: ARCOExportBundle) -> str:
    patient = bundle.patient
    counts = bundle.counts()
    return (
        "# Exportación de datos personales (derecho ARCO)\n\n"
        "Este archivo se generó en respuesta a una solicitud de **acceso** "
        "(LFPDPPP Art. 15). Contiene toda la información personal y clínica "
        "que CORTEX tiene registrada sobre el titular.\n\n"
        f"- **Titular:** {patient.get('name') or 'N/D'}\n"
        f"- **ID interno:** {patient.get('id')}\n"
        f"- **Código de persona:** {patient.get('person_code') or 'N/D'}\n"
        f"- **Generado el:** {bundle.generated_at.isoformat()}Z\n"
        f"- **Solicitud procesada por doctor ID:** {bundle.generated_by_doctor_id}\n\n"
        "## Contenido del paquete\n\n"
        "| Archivo | Registros |\n"
        "|---|---|\n"
        "| `profile.json` | 1 perfil |\n"
        f"| `consultations.json` | {counts['consultations']} |\n"
        f"| `prescriptions.json` | {counts['prescriptions']} |\n"
        f"| `clinical_studies.json` | {counts['clinical_studies']} |\n"
        f"| `vital_signs.json` | {counts['vital_signs']} |\n"
        f"| `privacy_consents.json` | {counts['privacy_consents']} |\n\n"
        "## Tus derechos\n\n"
        "Si la información es inexacta o solicitas su eliminación, puedes "
        "ejercer los derechos de **Rectificación, Cancelación u Oposición** "
        "enviando una solicitud al responsable del tratamiento. La respuesta "
        "debe emitirse en un plazo máximo de 20 días hábiles (LFPDPPP Art. 32).\n"
    )


def build_zip(bundle: ARCOExportBundle) -> bytes:
    """Serialize the bundle to an in-memory ZIP and return its bytes."""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("profile.json", json.dumps(bundle.patient, ensure_ascii=False, indent=2))
        zf.writestr("consultations.json", json.dumps(bundle.consultations, ensure_ascii=False, indent=2))
        zf.writestr("prescriptions.json", json.dumps(bundle.prescriptions, ensure_ascii=False, indent=2))
        zf.writestr("clinical_studies.json", json.dumps(bundle.clinical_studies, ensure_ascii=False, indent=2))
        zf.writestr("vital_signs.json", json.dumps(bundle.vital_signs, ensure_ascii=False, indent=2))
        zf.writestr("privacy_consents.json", json.dumps(bundle.privacy_consents, ensure_ascii=False, indent=2))
        zf.writestr("summary.md", _summary_markdown(bundle))
    return buf.getvalue()
