"""
Tools exposed to the Doctor Assistant via Gemini function-calling.

Sliver 1 intentionally ships with two:
- `search_patients(query, limit)` — find patients the doctor can read
- `get_patient_summary(patient_id)` — demographics + last 3 consultations
  + active medications for a specific patient

Every tool:
1. scopes results through `doctor_can_read_patient` (ACL),
2. returns plain JSON-serialisable dicts (the model consumes these
   as function_response parts),
3. logs an audit line via `audit_service.log_action` so every PHI
   access through the bot shows up in the NOM-004 audit trail.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from audit_service import audit_service
from database import (
    ConsultationPrescription,
    MedicalRecord,
    Person,
)
from logger import get_logger
from services.patient_access import doctor_can_read_patient

api_logger = get_logger("medical_records.doctor_assistant")


MAX_SEARCH_LIMIT = 20
RECENT_CONSULTATIONS_LIMIT = 3


# ---------------------------------------------------------------------------
# Tool implementations
# ---------------------------------------------------------------------------


def search_patients(
    db: Session,
    doctor: Person,
    query: str,
    limit: int = 10,
) -> Dict[str, Any]:
    """Return patients whose name matches `query`, filtered by ACL.

    Returns: {"count": int, "patients": [{patient_id, name, ...}]}
    """
    q = (query or "").strip()
    if not q:
        return {"error": "empty_query", "message": "El query está vacío."}
    limit = max(1, min(limit, MAX_SEARCH_LIMIT))

    like = f"%{q}%"
    rows: List[Person] = (
        db.query(Person)
        .filter(Person.person_type == "patient", Person.name.ilike(like))
        .order_by(Person.name.asc())
        .limit(limit)
        .all()
    )

    visible = [p for p in rows if doctor_can_read_patient(db, doctor, p)]
    patients = [_serialize_patient_brief(p) for p in visible]

    _audit(
        db,
        doctor,
        action="READ",
        table_name="persons",
        operation_type="assistant_search_patients",
        metadata={"query": q, "returned": len(patients)},
    )
    return {"count": len(patients), "patients": patients}


def get_patient_summary(
    db: Session,
    doctor: Person,
    patient_id: int,
) -> Dict[str, Any]:
    """Return demo + last 3 consultations + active meds for one patient."""
    patient = (
        db.query(Person)
        .filter(Person.id == patient_id, Person.person_type == "patient")
        .first()
    )
    if not patient:
        return {"error": "patient_not_found"}
    if not doctor_can_read_patient(db, doctor, patient):
        return {"error": "not_authorized"}

    # Recent consultations — latest first, bounded.
    q = db.query(MedicalRecord).filter(MedicalRecord.patient_id == patient_id)
    if doctor.person_type != "admin":
        q = q.filter(MedicalRecord.doctor_id == doctor.id)
    consultations = (
        q.order_by(MedicalRecord.consultation_date.desc())
        .limit(RECENT_CONSULTATIONS_LIMIT)
        .all()
    )

    active_meds: List[Dict[str, Any]] = []
    if consultations:
        enc_ids = [c.id for c in consultations]
        rx_rows = (
            db.query(ConsultationPrescription)
            .filter(ConsultationPrescription.consultation_id.in_(enc_ids))
            .all()
        )
        active_meds = [_serialize_prescription(rx) for rx in rx_rows]

    summary = {
        "patient": _serialize_patient_detail(patient),
        "recent_consultations": [_serialize_consultation(c) for c in consultations],
        "active_medications": active_meds,
    }
    _audit(
        db,
        doctor,
        action="READ",
        table_name="medical_records",
        affected_patient_id=patient_id,
        affected_patient_name=patient.name,
        operation_type="assistant_patient_summary",
        metadata={"consultations": len(consultations), "meds": len(active_meds)},
    )
    return summary


# ---------------------------------------------------------------------------
# Serialisers (plain dicts; no Pydantic to keep the model payload tight)
# ---------------------------------------------------------------------------


def _serialize_patient_brief(p: Person) -> Dict[str, Any]:
    return {
        "patient_id": p.id,
        "name": p.name,
        "gender": getattr(p, "gender", None),
        "birth_date": _iso_or_none(getattr(p, "birth_date", None)),
    }


def _serialize_patient_detail(p: Person) -> Dict[str, Any]:
    return {
        **_serialize_patient_brief(p),
        "email": getattr(p, "email", None),
        "phone": getattr(p, "primary_phone", None),
    }


def _serialize_consultation(c: MedicalRecord) -> Dict[str, Any]:
    return {
        "consultation_id": c.id,
        "date": _iso_or_none(getattr(c, "consultation_date", None)),
        "chief_complaint": getattr(c, "chief_complaint", None),
        "primary_diagnosis": getattr(c, "primary_diagnosis", None),
        "treatment_plan": getattr(c, "treatment_plan", None),
    }


def _serialize_prescription(rx: ConsultationPrescription) -> Dict[str, Any]:
    med = getattr(rx, "medication", None)
    return {
        "prescription_id": rx.id,
        "consultation_id": getattr(rx, "consultation_id", None),
        "medication": getattr(med, "name", None) if med else None,
        "dosage": getattr(rx, "dosage", None),
        "frequency": getattr(rx, "frequency", None),
        "duration": getattr(rx, "duration", None),
    }


def _iso_or_none(value) -> Optional[str]:
    if value is None:
        return None
    try:
        return value.isoformat()
    except AttributeError:
        return str(value)


# ---------------------------------------------------------------------------
# Audit wrapper — tolerate failures (same pattern as the FHIR routes).
# ---------------------------------------------------------------------------


def _audit(db: Session, doctor: Person, **kwargs) -> None:
    try:
        audit_service.log_action(
            db=db,
            user=doctor,
            security_level=kwargs.pop("security_level", "INFO"),
            **kwargs,
        )
    except Exception as audit_err:
        api_logger.warning("Doctor Assistant audit log failed: %s", audit_err)


# ---------------------------------------------------------------------------
# Tool declarations + dispatch (Gemini function-calling)
# ---------------------------------------------------------------------------


def get_tool_declarations() -> List[Dict[str, Any]]:
    """Return FunctionDeclaration-compatible dicts describing the tools."""
    return [
        {
            "name": "search_patients",
            "description": (
                "Busca pacientes por nombre (parcial, case-insensitive). "
                "Retorna solo pacientes que el médico tiene autorización "
                "de leer (creador o ha tenido consulta previa). Usa esta "
                "herramienta cuando el usuario mencione un paciente por "
                "nombre y no tengas su patient_id."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Nombre o fragmento de nombre del paciente.",
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Máximo de resultados. Por defecto 10, máximo 20.",
                    },
                },
                "required": ["query"],
            },
        },
        {
            "name": "get_patient_summary",
            "description": (
                "Retorna un resumen clínico de un paciente específico: "
                "demografía + últimas 3 consultas + medicamentos activos. "
                "Usa esta herramienta cuando el usuario pida un resumen, "
                "la historia clínica, las últimas visitas o los "
                "medicamentos de un paciente cuyo patient_id ya conoces."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "patient_id": {
                        "type": "integer",
                        "description": "ID interno del paciente.",
                    }
                },
                "required": ["patient_id"],
            },
        },
    ]


def execute_tool(
    db: Session,
    doctor: Person,
    name: str,
    args: Dict[str, Any],
) -> Dict[str, Any]:
    """Dispatch a Gemini function call to the right Python tool."""
    try:
        if name == "search_patients":
            return search_patients(
                db,
                doctor,
                query=args.get("query", ""),
                limit=int(args.get("limit") or 10),
            )
        if name == "get_patient_summary":
            pid = args.get("patient_id")
            if pid is None:
                return {"error": "missing_argument", "argument": "patient_id"}
            return get_patient_summary(db, doctor, patient_id=int(pid))
        api_logger.warning("Doctor Assistant: unknown tool call '%s'", name)
        return {"error": "unknown_tool", "tool": name}
    except Exception as exc:
        api_logger.error("Doctor Assistant tool '%s' failed: %s", name, exc, exc_info=True)
        return {"error": "tool_execution_failed", "detail": str(exc)}
