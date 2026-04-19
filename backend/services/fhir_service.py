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
