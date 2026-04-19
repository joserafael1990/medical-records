"""
FHIR R4 adapter layer (NOM-024-SSA3-2012 interoperability).

`interoperability.py` has FHIR conversion functions that pre-date the
documents-normalization work — they read `doctor_profile.curp`,
`patient.phone`, `doctor_profile.office_address`, etc. directly. In the
current schema those fields live in the join tables (`person_documents`,
`offices`). This module builds a flattened view of the ORM entity that the
existing conversion functions accept without modification.
"""

from __future__ import annotations

from types import SimpleNamespace
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from database import Document, Office, PersonDocument, Specialty


# ---------------------------------------------------------------------------
# Documents → name-indexed dict
# ---------------------------------------------------------------------------

def _load_documents_by_name(db: Session, person_id: int) -> Dict[str, str]:
    """Return an {{'CURP': '...', 'RFC': '...', 'Cédula Profesional': '...'}} map
    for the person's active documents. Empty dict if the person has no docs."""
    rows = (
        db.query(PersonDocument, Document)
        .join(Document, PersonDocument.document_id == Document.id)
        .filter(
            PersonDocument.person_id == person_id,
            PersonDocument.is_active.is_(True),
        )
        .all()
    )
    return {doc.name: pd.document_value for pd, doc in rows}


def _primary_office(db: Session, doctor_id: int) -> Optional[Office]:
    return (
        db.query(Office)
        .filter(Office.doctor_id == doctor_id, Office.is_active.is_(True))
        .order_by(Office.id.asc())
        .first()
    )


def _specialty_name(db: Session, specialty_id: Optional[int]) -> Optional[str]:
    if not specialty_id:
        return None
    spec = db.query(Specialty).filter(Specialty.id == specialty_id).first()
    return spec.name if spec else None


# ---------------------------------------------------------------------------
# Flattened views that match interoperability.py's expectations.
# ---------------------------------------------------------------------------

DOCTOR_LICENSE_DOCUMENT_NAMES = (
    "Cédula Profesional", "Número de Colegiación", "Matrícula Nacional",
)


def build_doctor_view(db: Session, person: Any) -> SimpleNamespace:
    """Build the view InteroperabilityService.doctor_to_fhir_practitioner expects."""
    docs = _load_documents_by_name(db, person.id)
    office = _primary_office(db, person.id)
    specialty = _specialty_name(db, getattr(person, "specialty_id", None))

    professional_license = next(
        (docs[name] for name in DOCTOR_LICENSE_DOCUMENT_NAMES if name in docs),
        None,
    )

    return SimpleNamespace(
        # FHIR requires Identifier.value / resource.id to be a string.
        id=str(person.id),
        is_active=getattr(person, "is_active", True),
        # identity docs
        curp=docs.get("CURP"),
        rfc=docs.get("RFC"),
        professional_license=professional_license,
        # name
        name=person.name,
        full_name=getattr(person, "full_name", person.name),
        title=getattr(person, "title", None),
        birth_date=getattr(person, "birth_date", None),
        # contact
        email=person.email,
        phone=getattr(person, "primary_phone", None),
        # office (flattened for FHIR Address)
        office_address=office.address if office else None,
        office_city=office.city if office else None,
        office_state=getattr(office, "state_name", None) if office else None,
        office_postal_code=getattr(office, "postal_code", None) if office else None,
        # specialty
        specialty=specialty,
    )


def build_patient_view(db: Session, person: Any) -> SimpleNamespace:
    """Build the view InteroperabilityService.patient_to_fhir_patient expects."""
    docs = _load_documents_by_name(db, person.id)
    return SimpleNamespace(
        id=str(person.id),
        name=person.name,
        curp=docs.get("CURP"),
        email=person.email,
        phone=getattr(person, "primary_phone", None),
        address=getattr(person, "home_address", None),
        # FHIRAddress requires string city/state/postal_code. Fall back to "".
        city=getattr(person, "address_city", None) or "",
        state="",  # state_id is numeric on Person; no join needed for v1.
        postal_code=getattr(person, "address_postal_code", None) or "",
        gender=_normalize_gender(getattr(person, "gender", None)),
        birth_date=getattr(person, "birth_date", None),
    )


def _normalize_gender(raw: Optional[str]) -> str:
    """Normalize CORTEX gender values (M/F/O or mixed Spanish/English strings)
    to the Spanish strings that interoperability.py's `gender_map` understands.
    interoperability.py then translates to FHIR `male`/`female`/`other`/`unknown`.
    """
    if not raw:
        return "desconocido"  # falls through to `unknown` in the legacy map
    v = raw.strip().lower()
    if v in ("m", "masculino", "male"):
        return "masculino"
    if v in ("f", "femenino", "female"):
        return "femenino"
    if v in ("o", "otro", "other"):
        return "otro"
    return "desconocido"


# ---------------------------------------------------------------------------
# Bundle helpers — minimal R4 Bundle envelope.
# ---------------------------------------------------------------------------

def wrap_as_bundle(resource_type: str, entries: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Wrap FHIR resources in a `searchset` Bundle per R4."""
    return {
        "resourceType": "Bundle",
        "type": "searchset",
        "total": len(entries),
        "entry": [
            {
                "resource": e,
                "search": {"mode": "match"},
            }
            for e in entries
        ],
    }


# ---------------------------------------------------------------------------
# Encounter (consultation → FHIR).
# ---------------------------------------------------------------------------

def build_encounter_view(consultation: Any) -> SimpleNamespace:
    """Build the view `InteroperabilityService.consultation_to_fhir_encounter` expects.

    The legacy conversion reads `.date` but `MedicalRecord` stores the visit
    date as `consultation_date`. It also expects `id` to be stringifiable
    into `FHIREncounter.id` (typed `str`).
    """
    return SimpleNamespace(
        id=str(consultation.id),
        date=getattr(consultation, "consultation_date", None),
        chief_complaint=getattr(consultation, "chief_complaint", None),
    )


def fix_encounter_keys(encounter: Dict[str, Any]) -> Dict[str, Any]:
    """FHIR Encounter uses the `class` key, but Python can't use that as a
    Pydantic field name, so the model stores it as `class_`. Rename back
    before returning to wire. Non-destructive — returns a new dict."""
    out = dict(encounter)
    if "class_" in out:
        out["class"] = out.pop("class_")
    return out


def build_everything_bundle(
    patient_fhir: Dict[str, Any],
    encounter_fhirs: List[Dict[str, Any]],
    practitioner_fhirs: Optional[List[Dict[str, Any]]] = None,
    medication_request_fhirs: Optional[List[Dict[str, Any]]] = None,
    observation_fhirs: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    """Build a FHIR R4 `searchset` Bundle for the `Patient/$everything` op.

    Contains the Patient (mode=match) plus all their Encounters,
    MedicationRequests, Observations and any involved Practitioners (all
    mode=include).
    """
    entries: List[Dict[str, Any]] = [
        {"resource": patient_fhir, "search": {"mode": "match"}}
    ]
    for enc in encounter_fhirs:
        entries.append({"resource": enc, "search": {"mode": "include"}})
    for mr in medication_request_fhirs or []:
        entries.append({"resource": mr, "search": {"mode": "include"}})
    for obs in observation_fhirs or []:
        entries.append({"resource": obs, "search": {"mode": "include"}})
    for prac in practitioner_fhirs or []:
        entries.append({"resource": prac, "search": {"mode": "include"}})
    return {
        "resourceType": "Bundle",
        "type": "searchset",
        "total": len(entries),
        "entry": entries,
    }


# ---------------------------------------------------------------------------
# MedicationRequest (ConsultationPrescription → FHIR).
# ---------------------------------------------------------------------------

def _isoformat(value: Any) -> Optional[str]:
    if value is None:
        return None
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return str(value)


def serialize_medication_request(
    prescription: Any,
    patient_id: int,
    doctor_id: int,
) -> Dict[str, Any]:
    """Convert a `ConsultationPrescription` row to a FHIR R4 MedicationRequest.

    Shape is intentionally minimal — no RxNorm / SNOMED coding. We keep the
    medication as `medicationCodeableConcept.text` and the dosage as a free
    text `dosageInstruction[0].text`, which is FHIR-valid and matches how the
    data is captured in CORTEX today.
    """
    med_name = getattr(getattr(prescription, "medication", None), "name", None)
    parts = []
    for attr in ("dosage", "frequency", "duration"):
        val = getattr(prescription, attr, None)
        if val:
            parts.append(str(val))
    dosage_text = ", ".join(parts) if parts else None

    out: Dict[str, Any] = {
        "resourceType": "MedicationRequest",
        "id": str(getattr(prescription, "id", "")),
        "status": "active",
        "intent": "order",
        "subject": {"reference": f"Patient/{patient_id}"},
        "requester": {"reference": f"Practitioner/{doctor_id}"},
    }

    encounter_id = getattr(prescription, "consultation_id", None)
    if encounter_id is not None:
        out["encounter"] = {"reference": f"Encounter/{encounter_id}"}

    if med_name:
        out["medicationCodeableConcept"] = {"text": med_name}

    authored = _isoformat(getattr(prescription, "created_at", None))
    if authored:
        out["authoredOn"] = authored

    dosage_instruction: Dict[str, Any] = {}
    if dosage_text:
        dosage_instruction["text"] = dosage_text
    route = getattr(prescription, "via_administracion", None)
    if route:
        dosage_instruction["route"] = {"text": route}
    extra_instructions = getattr(prescription, "instructions", None)
    if extra_instructions:
        dosage_instruction["patientInstruction"] = extra_instructions
    if dosage_instruction:
        out["dosageInstruction"] = [dosage_instruction]

    quantity = getattr(prescription, "quantity", None)
    if quantity is not None:
        out["dispenseRequest"] = {"quantity": {"value": quantity}}

    return out


# ---------------------------------------------------------------------------
# Observation (ConsultationVitalSign → FHIR).
# ---------------------------------------------------------------------------

_VITAL_SIGNS_CATEGORY = {
    "coding": [
        {
            "system": "http://terminology.hl7.org/CodeSystem/observation-category",
            "code": "vital-signs",
            "display": "Vital Signs",
        }
    ],
    "text": "Vital Signs",
}


def _coerce_numeric(value: Any) -> Optional[float]:
    """Try to turn a stored vital-sign value into a number for FHIR valueQuantity.

    CORTEX stores vital-sign values as strings (e.g. "120", "36.5", "120/80").
    A blood-pressure-style "120/80" fails here and we fall back to valueString
    so no information is dropped.
    """
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)
    try:
        return float(str(value).replace(",", "."))
    except (ValueError, TypeError):
        return None


def serialize_observation(
    vital_sign: Any,
    patient_id: int,
) -> Dict[str, Any]:
    """Convert a `ConsultationVitalSign` row to a FHIR R4 Observation.

    The code is kept as free text (matching how CORTEX stores vital sign names
    today). A future PR can add LOINC/SNOMED coding by mapping on
    `vital_sign.name`.
    """
    name = getattr(getattr(vital_sign, "vital_sign", None), "name", None) or "Vital sign"
    raw_value = getattr(vital_sign, "value", None)
    unit = getattr(vital_sign, "unit", None)

    out: Dict[str, Any] = {
        "resourceType": "Observation",
        "id": str(getattr(vital_sign, "id", "")),
        "status": "final",
        "category": [_VITAL_SIGNS_CATEGORY],
        "code": {"text": name},
        "subject": {"reference": f"Patient/{patient_id}"},
    }

    encounter_id = getattr(vital_sign, "consultation_id", None)
    if encounter_id is not None:
        out["encounter"] = {"reference": f"Encounter/{encounter_id}"}

    effective = _isoformat(getattr(vital_sign, "created_at", None))
    if effective:
        out["effectiveDateTime"] = effective

    numeric = _coerce_numeric(raw_value)
    if numeric is not None:
        quantity = {"value": numeric}
        if unit:
            quantity["unit"] = unit
        out["valueQuantity"] = quantity
    elif raw_value is not None:
        # Blood pressure ("120/80"), free-text notes, etc.
        out["valueString"] = str(raw_value)

    return out
