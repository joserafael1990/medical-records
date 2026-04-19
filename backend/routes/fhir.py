"""
FHIR R4 endpoints (NOM-024-SSA3-2012 interoperability).

Scope of this initial cut:
- Doctor-authenticated only. No patient-facing auth, no public endpoints.
- Two resource types: Patient and Practitioner.
- Authorization: a doctor can read their own Practitioner record (and admins
  can read anyone's) and any Patient they own (`persons.created_by`) or have
  consulted. Same ownership rules as the ARCO export.

Not in this cut: Encounter/MedicationRequest/Observation resources, FHIR
search parameters beyond id, SMART-on-FHIR auth, CapabilityStatement.
"""

from __future__ import annotations

from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from audit_service import audit_service
from database import MedicalRecord, Person, get_db
from dependencies import get_current_user
from interoperability import InteroperabilityService
from logger import get_logger
from services.fhir_service import build_doctor_view, build_patient_view

api_logger = get_logger("medical_records.api")

router = APIRouter(prefix="/api/fhir", tags=["fhir"])

FHIR_CONTENT_TYPE = "application/fhir+json"


def _fhir_response(payload: Dict[str, Any]) -> JSONResponse:
    return JSONResponse(content=payload, media_type=FHIR_CONTENT_TYPE)


def _operation_outcome(status_code: int, diagnostics: str) -> Dict[str, Any]:
    severity = "error" if status_code >= 400 else "information"
    return {
        "resourceType": "OperationOutcome",
        "issue": [
            {
                "severity": severity,
                "code": "processing",
                "diagnostics": diagnostics,
            }
        ],
    }


# ---------------------------------------------------------------------------
# Practitioner
# ---------------------------------------------------------------------------

@router.get("/Practitioner/me")
async def get_my_practitioner(
    request: Request,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user),
):
    """Return the calling doctor's own Practitioner record."""
    if current_user.person_type != "doctor":
        raise HTTPException(status_code=403, detail="Only doctors have a Practitioner record")
    view = build_doctor_view(db, current_user)
    practitioner = InteroperabilityService.doctor_to_fhir_practitioner(view)
    # Best-effort audit — Practitioner/me is not PHI about another person,
    # but logging keeps the NOM-004 traceability consistent.
    try:
        audit_service.log_action(
            db=db,
            action="READ",
            user=current_user,
            request=request,
            table_name="persons",
            record_id=current_user.id,
            operation_type="fhir_practitioner_self",
            security_level="INFO",
        )
    except Exception as audit_err:
        api_logger.warning("Failed to audit Practitioner/me access: %s", audit_err)
    return _fhir_response(practitioner.model_dump(exclude_none=True))


@router.get("/Practitioner/{practitioner_id}")
async def get_practitioner(
    practitioner_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user),
):
    """Return a Practitioner record. Doctors can only see themselves; admins see anyone."""
    if current_user.person_type != "admin" and practitioner_id != current_user.id:
        return JSONResponse(
            status_code=403,
            content=_operation_outcome(403, "You can only read your own Practitioner record"),
            media_type=FHIR_CONTENT_TYPE,
        )
    person = (
        db.query(Person)
        .filter(Person.id == practitioner_id, Person.person_type == "doctor")
        .first()
    )
    if not person:
        return JSONResponse(
            status_code=404,
            content=_operation_outcome(404, "Practitioner not found"),
            media_type=FHIR_CONTENT_TYPE,
        )
    view = build_doctor_view(db, person)
    practitioner = InteroperabilityService.doctor_to_fhir_practitioner(view)
    try:
        audit_service.log_action(
            db=db,
            action="READ",
            user=current_user,
            request=request,
            table_name="persons",
            record_id=practitioner_id,
            operation_type="fhir_practitioner_access",
            security_level="INFO",
        )
    except Exception as audit_err:
        api_logger.warning("Failed to audit Practitioner access: %s", audit_err)
    return _fhir_response(practitioner.model_dump(exclude_none=True))


# ---------------------------------------------------------------------------
# Patient
# ---------------------------------------------------------------------------

def _doctor_can_read_patient(db: Session, doctor: Person, patient: Person) -> bool:
    """Same rule as the ARCO export: creator or has-consultation or admin."""
    if doctor.person_type == "admin":
        return True
    if doctor.person_type != "doctor":
        return False
    if patient.created_by == doctor.id:
        return True
    has_consultation = (
        db.query(MedicalRecord)
        .filter(
            MedicalRecord.patient_id == patient.id,
            MedicalRecord.doctor_id == doctor.id,
        )
        .first()
        is not None
    )
    return has_consultation


@router.get("/Patient/{patient_id}")
async def get_fhir_patient(
    patient_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user),
):
    """Return a Patient resource."""
    patient = (
        db.query(Person)
        .filter(Person.id == patient_id, Person.person_type == "patient")
        .first()
    )
    if not patient:
        return JSONResponse(
            status_code=404,
            content=_operation_outcome(404, "Patient not found"),
            media_type=FHIR_CONTENT_TYPE,
        )
    if not _doctor_can_read_patient(db, current_user, patient):
        return JSONResponse(
            status_code=403,
            content=_operation_outcome(403, "Not authorized to read this patient"),
            media_type=FHIR_CONTENT_TYPE,
        )
    view = build_patient_view(db, patient)
    fhir_patient = InteroperabilityService.patient_to_fhir_patient(view)
    # PHI read — audit at INFO severity.
    try:
        audit_service.log_action(
            db=db,
            action="READ",
            user=current_user,
            request=request,
            table_name="persons",
            record_id=patient_id,
            affected_patient_id=patient_id,
            affected_patient_name=patient.name,
            operation_type="fhir_patient_access",
            security_level="INFO",
        )
    except Exception as audit_err:
        api_logger.warning("Failed to audit Patient access: %s", audit_err)
    return _fhir_response(fhir_patient.model_dump(exclude_none=True))


# ---------------------------------------------------------------------------
# CapabilityStatement — minimum FHIR conformance claim.
# ---------------------------------------------------------------------------

@router.get("/metadata")
async def capability_statement():
    """Minimal FHIR CapabilityStatement describing what this server exposes."""
    return _fhir_response({
        "resourceType": "CapabilityStatement",
        "status": "active",
        "kind": "instance",
        "fhirVersion": "4.0.1",
        "format": ["application/fhir+json"],
        "rest": [
            {
                "mode": "server",
                "security": {"description": "Bearer JWT; doctor-scoped"},
                "resource": [
                    {
                        "type": "Patient",
                        "interaction": [{"code": "read"}],
                    },
                    {
                        "type": "Practitioner",
                        "interaction": [{"code": "read"}],
                    },
                ],
            }
        ],
    })
