"""
Tools exposed to the Doctor Assistant via Gemini function-calling.

Phase A ships with six read-only tools:
- `search_patients(query, limit)` — find patients the doctor can read
- `get_patient_summary(patient_id)` — demographics + last 3 consultations
  + active medications for a specific patient
- `list_upcoming_appointments(range)` — today / tomorrow / this_week /
  next_7_days agenda
- `find_inactive_patients(months)` — patients the doctor hasn't seen
  in N+ months; retention driver
- `get_active_medications(patient_id)` — current meds for one patient
- `list_patients_by_diagnosis(dx_query, limit)` — cohort by free-text
  diagnosis match (e.g., "hipertensión")

Every tool:
1. scopes results through `doctor_can_read_patient` (ACL),
2. returns plain JSON-serialisable dicts (the model consumes these
   as function_response parts),
3. logs an audit line via `audit_service.log_action` so every PHI
   access through the bot shows up in the NOM-004 audit trail.
"""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from audit_service import audit_service
from database import (
    Appointment,
    ConsultationPrescription,
    MedicalRecord,
    Person,
)
from logger import get_logger
from services.patient_access import doctor_can_read_patient

api_logger = get_logger("medical_records.doctor_assistant")


MAX_SEARCH_LIMIT = 20
RECENT_CONSULTATIONS_LIMIT = 3
MAX_COHORT_LIMIT = 50

# Ranges accepted by list_upcoming_appointments. Kept small and explicit
# so the model doesn't invent new range strings.
APPOINTMENT_RANGES = ("today", "tomorrow", "this_week", "next_7_days")


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
# Phase A — four new read-only tools
# ---------------------------------------------------------------------------


def list_upcoming_appointments(
    db: Session,
    doctor: Person,
    range_key: str = "today",
) -> Dict[str, Any]:
    """Return the doctor's upcoming appointments for the requested range.

    `range_key` is one of APPOINTMENT_RANGES. Cancelled appointments are
    excluded. Admins see every doctor's agenda; regular doctors see only
    their own.
    """
    if range_key not in APPOINTMENT_RANGES:
        return {
            "error": "invalid_range",
            "allowed": list(APPOINTMENT_RANGES),
        }

    now = datetime.utcnow()
    start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    if range_key == "today":
        end = start + timedelta(days=1) - timedelta(microseconds=1)
    elif range_key == "tomorrow":
        start = start + timedelta(days=1)
        end = start + timedelta(days=1) - timedelta(microseconds=1)
    elif range_key == "this_week":
        # Monday to Sunday of the current week.
        start = start - timedelta(days=start.weekday())
        end = start + timedelta(days=7) - timedelta(microseconds=1)
    else:  # next_7_days
        end = start + timedelta(days=7) - timedelta(microseconds=1)

    q = db.query(Appointment).filter(
        Appointment.appointment_date >= start,
        Appointment.appointment_date <= end,
        Appointment.status != "cancelled",
        Appointment.status != "canceled",
    )
    if doctor.person_type != "admin":
        q = q.filter(Appointment.doctor_id == doctor.id)
    rows = q.order_by(Appointment.appointment_date.asc()).all()
    appointments = [_serialize_appointment(db, a) for a in rows]

    _audit(
        db,
        doctor,
        action="READ",
        table_name="appointments",
        operation_type="assistant_list_upcoming_appointments",
        metadata={"range": range_key, "returned": len(appointments)},
    )
    return {
        "range": range_key,
        "count": len(appointments),
        "appointments": appointments,
    }


def find_inactive_patients(
    db: Session,
    doctor: Person,
    months: int = 6,
    limit: int = 20,
) -> Dict[str, Any]:
    """Return patients the doctor has consulted but not in the last `months`.

    Useful for retention: "¿qué pacientes no he visto en 6 meses?".
    Only counts patients that at least once had a consultation with this
    doctor. Ignores patients who never had any consultation.
    """
    if months < 1:
        months = 1
    if months > 24:
        months = 24
    limit = max(1, min(limit, MAX_COHORT_LIMIT))
    cutoff = datetime.utcnow() - timedelta(days=months * 30)

    # Per-patient latest consultation with this doctor.
    q = db.query(
        MedicalRecord.patient_id,
        func.max(MedicalRecord.consultation_date).label("last_visit"),
    )
    if doctor.person_type != "admin":
        q = q.filter(MedicalRecord.doctor_id == doctor.id)
    rows = q.group_by(MedicalRecord.patient_id).all()

    inactive_ids = [pid for pid, last_visit in rows if last_visit and last_visit < cutoff]
    if not inactive_ids:
        _audit(
            db,
            doctor,
            action="READ",
            table_name="medical_records",
            operation_type="assistant_find_inactive",
            metadata={"months": months, "returned": 0},
        )
        return {"months": months, "count": 0, "patients": []}

    # Get last_visit by patient id from the grouped rows.
    last_visit_by_pid = {pid: lv for pid, lv in rows}

    # Fetch Person rows, bounded.
    patients_rows = (
        db.query(Person)
        .filter(Person.id.in_(inactive_ids), Person.person_type == "patient")
        .all()
    )

    # Sort: most-inactive first (oldest last_visit).
    patients_rows.sort(key=lambda p: last_visit_by_pid.get(p.id) or datetime.min)
    patients_rows = patients_rows[:limit]

    patients = [
        {
            **_serialize_patient_brief(p),
            "last_visit_date": _iso_or_none(last_visit_by_pid.get(p.id)),
            "days_since_last_visit": (
                (datetime.utcnow() - last_visit_by_pid[p.id]).days
                if last_visit_by_pid.get(p.id)
                else None
            ),
        }
        for p in patients_rows
    ]

    _audit(
        db,
        doctor,
        action="READ",
        table_name="medical_records",
        operation_type="assistant_find_inactive",
        metadata={"months": months, "returned": len(patients)},
    )
    return {"months": months, "count": len(patients), "patients": patients}


def get_active_medications(
    db: Session,
    doctor: Person,
    patient_id: int,
) -> Dict[str, Any]:
    """Return current meds for a patient across recent consultations."""
    patient = (
        db.query(Person)
        .filter(Person.id == patient_id, Person.person_type == "patient")
        .first()
    )
    if not patient:
        return {"error": "patient_not_found"}
    if not doctor_can_read_patient(db, doctor, patient):
        return {"error": "not_authorized"}

    # "Active" here = prescriptions from the doctor's consultations with
    # this patient over the last 6 months. Bounded so the model gets a
    # usable payload rather than the full history.
    cutoff = datetime.utcnow() - timedelta(days=180)
    q = db.query(MedicalRecord).filter(
        MedicalRecord.patient_id == patient_id,
        MedicalRecord.consultation_date >= cutoff,
    )
    if doctor.person_type != "admin":
        q = q.filter(MedicalRecord.doctor_id == doctor.id)
    consultations = q.order_by(MedicalRecord.consultation_date.desc()).all()

    medications: List[Dict[str, Any]] = []
    if consultations:
        enc_ids = [c.id for c in consultations]
        rx_rows = (
            db.query(ConsultationPrescription)
            .filter(ConsultationPrescription.consultation_id.in_(enc_ids))
            .all()
        )
        medications = [_serialize_prescription(rx) for rx in rx_rows]

    _audit(
        db,
        doctor,
        action="READ",
        table_name="consultation_prescriptions",
        affected_patient_id=patient_id,
        affected_patient_name=patient.name,
        operation_type="assistant_get_active_medications",
        metadata={"returned": len(medications)},
    )
    return {
        "patient": _serialize_patient_brief(patient),
        "since_date": cutoff.date().isoformat(),
        "count": len(medications),
        "medications": medications,
    }


def list_patients_by_diagnosis(
    db: Session,
    doctor: Person,
    dx_query: str,
    limit: int = 20,
) -> Dict[str, Any]:
    """Return patients whose `primary_diagnosis` matches the query (ILIKE)."""
    q = (dx_query or "").strip()
    if not q:
        return {"error": "empty_query", "message": "El diagnóstico está vacío."}
    limit = max(1, min(limit, MAX_COHORT_LIMIT))
    like = f"%{q}%"

    # Per-patient count of consultations with this diagnosis.
    sub = db.query(
        MedicalRecord.patient_id,
        func.count(MedicalRecord.id).label("visits"),
        func.max(MedicalRecord.consultation_date).label("last_visit"),
    ).filter(MedicalRecord.primary_diagnosis.ilike(like))
    if doctor.person_type != "admin":
        sub = sub.filter(MedicalRecord.doctor_id == doctor.id)
    rows = sub.group_by(MedicalRecord.patient_id).all()

    if not rows:
        _audit(
            db,
            doctor,
            action="READ",
            table_name="medical_records",
            operation_type="assistant_patients_by_diagnosis",
            metadata={"query": q, "returned": 0},
        )
        return {"query": q, "count": 0, "patients": []}

    by_pid = {pid: {"visits": v, "last_visit": lv} for pid, v, lv in rows}
    patient_ids = sorted(by_pid.keys())
    patients_rows = (
        db.query(Person)
        .filter(Person.id.in_(patient_ids), Person.person_type == "patient")
        .all()
    )
    # Order by most visits desc, then most recent last_visit.
    patients_rows.sort(
        key=lambda p: (
            -by_pid[p.id]["visits"],
            -(by_pid[p.id]["last_visit"].timestamp() if by_pid[p.id]["last_visit"] else 0),
        )
    )
    patients_rows = patients_rows[:limit]

    patients = [
        {
            **_serialize_patient_brief(p),
            "visits_with_dx": by_pid[p.id]["visits"],
            "last_visit_date": _iso_or_none(by_pid[p.id]["last_visit"]),
        }
        for p in patients_rows
    ]

    _audit(
        db,
        doctor,
        action="READ",
        table_name="medical_records",
        operation_type="assistant_patients_by_diagnosis",
        metadata={"query": q, "returned": len(patients)},
    )
    return {"query": q, "count": len(patients), "patients": patients}


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


def _serialize_appointment(db: Session, a: Appointment) -> Dict[str, Any]:
    """Shape the appointment payload the model consumes. Patient name is
    resolved lazily so the model can show a human-readable line without
    an extra tool call."""
    patient_name: Optional[str] = None
    if getattr(a, "patient_id", None) is not None:
        p = db.query(Person).filter(Person.id == a.patient_id).first()
        patient_name = p.name if p else None
    return {
        "appointment_id": a.id,
        "patient_id": a.patient_id,
        "patient_name": patient_name,
        "date": _iso_or_none(getattr(a, "appointment_date", None)),
        "end_time": _iso_or_none(getattr(a, "end_time", None)),
        "status": getattr(a, "status", None),
        "consultation_type": getattr(a, "consultation_type", None),
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
        {
            "name": "list_upcoming_appointments",
            "description": (
                "Retorna las citas próximas del doctor en el rango "
                "solicitado (hoy, mañana, esta semana, próximos 7 días). "
                "Excluye las canceladas. Úsala cuando el usuario pregunte "
                "por su agenda, qué tiene hoy, citas de la semana, etc."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "range_key": {
                        "type": "string",
                        "description": (
                            "Rango de fechas. Uno de: today, tomorrow, "
                            "this_week, next_7_days. Por defecto today."
                        ),
                        "enum": list(APPOINTMENT_RANGES),
                    }
                },
                "required": [],
            },
        },
        {
            "name": "find_inactive_patients",
            "description": (
                "Retorna pacientes que el doctor ha consultado antes "
                "pero no ha visto en los últimos N meses. Útil para "
                "acciones de retención ('¿qué pacientes no he visto "
                "en 6 meses?'). El conteo excluye pacientes que "
                "nunca tuvieron consulta con este doctor."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "months": {
                        "type": "integer",
                        "description": (
                            "Umbral en meses sin ver al paciente. "
                            "Por defecto 6, mínimo 1, máximo 24."
                        ),
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Máximo de pacientes a retornar (default 20, máx 50).",
                    },
                },
                "required": [],
            },
        },
        {
            "name": "get_active_medications",
            "description": (
                "Retorna los medicamentos prescritos a un paciente en "
                "los últimos 6 meses (tomados como 'activos'). Úsala "
                "cuando el usuario pregunte específicamente por qué "
                "medicamentos está tomando un paciente. Requiere "
                "patient_id conocido."
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
        {
            "name": "list_patients_by_diagnosis",
            "description": (
                "Retorna los pacientes del doctor cuya diagnóstico "
                "principal coincide con el texto buscado (por ejemplo, "
                "'hipertensión', 'diabetes', 'migraña'). Case-"
                "insensitive, coincidencia parcial. Útil para cohort "
                "queries tipo '¿qué pacientes con HTA tengo?'."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "dx_query": {
                        "type": "string",
                        "description": "Fragmento del diagnóstico a buscar.",
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Máximo de pacientes a retornar (default 20, máx 50).",
                    },
                },
                "required": ["dx_query"],
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
        if name == "list_upcoming_appointments":
            return list_upcoming_appointments(
                db, doctor, range_key=str(args.get("range_key") or "today")
            )
        if name == "find_inactive_patients":
            return find_inactive_patients(
                db,
                doctor,
                months=int(args.get("months") or 6),
                limit=int(args.get("limit") or 20),
            )
        if name == "get_active_medications":
            pid = args.get("patient_id")
            if pid is None:
                return {"error": "missing_argument", "argument": "patient_id"}
            return get_active_medications(db, doctor, patient_id=int(pid))
        if name == "list_patients_by_diagnosis":
            return list_patients_by_diagnosis(
                db,
                doctor,
                dx_query=str(args.get("dx_query") or ""),
                limit=int(args.get("limit") or 20),
            )
        api_logger.warning("Doctor Assistant: unknown tool call '%s'", name)
        return {"error": "unknown_tool", "tool": name}
    except Exception as exc:
        api_logger.error("Doctor Assistant tool '%s' failed: %s", name, exc, exc_info=True)
        return {"error": "tool_execution_failed", "detail": str(exc)}
