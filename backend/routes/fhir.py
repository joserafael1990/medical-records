"""
FHIR R4 endpoints (NOM-024-SSA3-2012 interoperability).

Resources exposed:
- Patient, Practitioner (read)
- Encounter (read) — one per clinical consultation
- Patient/$everything operation — Bundle of Patient + Encounters (+
  involved Practitioners).

Auth model: doctor-only. A doctor can read their own Practitioner record,
any Patient they own (`persons.created_by`) or have consulted, and any
Encounter belonging to those patients. Admins bypass ownership checks.

Not in this cut: MedicationRequest/Observation resource types, FHIR search
parameters beyond id, SMART-on-FHIR auth, Bundle `transaction` writes.
"""

from __future__ import annotations

from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from audit_service import audit_service
from database import MedicalRecord, Person, get_db
from dependencies import get_current_user
from interoperability import InteroperabilityService
from logger import get_logger
from services.fhir_service import (
    build_doctor_view,
    build_encounter_view,
    build_everything_bundle,
    build_patient_view,
    fix_encounter_keys,
)

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
# Encounter
# ---------------------------------------------------------------------------

def _fhir_encounter_for(
    consultation: MedicalRecord,
) -> Dict[str, Any]:
    """Convert a MedicalRecord row into a FHIR Encounter dict (with `class` key)."""
    view = build_encounter_view(consultation)
    fhir_model = InteroperabilityService.consultation_to_fhir_encounter(
        view,
        patient_id=str(consultation.patient_id),
        doctor_id=str(consultation.doctor_id),
    )
    return fix_encounter_keys(fhir_model.model_dump(exclude_none=True))


@router.get("/Encounter/{encounter_id}")
async def get_fhir_encounter(
    encounter_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user),
):
    """Return a single Encounter resource. Doctors only see their own."""
    consultation = (
        db.query(MedicalRecord)
        .filter(MedicalRecord.id == encounter_id)
        .first()
    )
    if not consultation:
        return JSONResponse(
            status_code=404,
            content=_operation_outcome(404, "Encounter not found"),
            media_type=FHIR_CONTENT_TYPE,
        )
    if current_user.person_type != "admin" and consultation.doctor_id != current_user.id:
        return JSONResponse(
            status_code=403,
            content=_operation_outcome(403, "Not authorized to read this Encounter"),
            media_type=FHIR_CONTENT_TYPE,
        )
    encounter = _fhir_encounter_for(consultation)
    try:
        audit_service.log_action(
            db=db,
            action="READ",
            user=current_user,
            request=request,
            table_name="medical_records",
            record_id=encounter_id,
            affected_patient_id=consultation.patient_id,
            operation_type="fhir_encounter_access",
            security_level="INFO",
        )
    except Exception as audit_err:
        api_logger.warning("Failed to audit Encounter access: %s", audit_err)
    return _fhir_response(encounter)


# ---------------------------------------------------------------------------
# Patient/$everything — FHIR operation returning a Bundle.
# ---------------------------------------------------------------------------

@router.get("/Patient/{patient_id}/$everything")
async def patient_everything(
    patient_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user),
):
    """Return all data the server has about a Patient as a FHIR Bundle.

    This is the FHIR-native counterpart to the ARCO export in #21, and is
    the analog of the equivalent HL7 `Patient/$everything` operation. Scope
    is Patient + Encounters + involved Practitioners for v1.
    """
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

    # Patient
    patient_view = build_patient_view(db, patient)
    patient_fhir = InteroperabilityService.patient_to_fhir_patient(patient_view).model_dump(
        exclude_none=True
    )

    # Encounters: only those the calling doctor authored (unless admin).
    q = db.query(MedicalRecord).filter(MedicalRecord.patient_id == patient_id)
    if current_user.person_type != "admin":
        q = q.filter(MedicalRecord.doctor_id == current_user.id)
    consultations = q.order_by(MedicalRecord.consultation_date.asc()).all()
    encounters: List[Dict[str, Any]] = [_fhir_encounter_for(c) for c in consultations]

    # Involved Practitioners (unique doctor ids in the encounter list).
    doctor_ids = sorted({c.doctor_id for c in consultations})
    practitioners: List[Dict[str, Any]] = []
    for did in doctor_ids:
        doc = db.query(Person).filter(Person.id == did, Person.person_type == "doctor").first()
        if not doc:
            continue
        view = build_doctor_view(db, doc)
        practitioners.append(
            InteroperabilityService.doctor_to_fhir_practitioner(view).model_dump(exclude_none=True)
        )

    bundle = build_everything_bundle(patient_fhir, encounters, practitioners)

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
            operation_type="fhir_patient_everything",
            metadata={"encounters": len(encounters), "practitioners": len(practitioners)},
            security_level="INFO",
        )
    except Exception as audit_err:
        api_logger.warning("Failed to audit Patient/$everything: %s", audit_err)

    return _fhir_response(bundle)


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
                        "operation": [{"name": "everything", "definition": "Patient/$everything"}],
                    },
                    {
                        "type": "Practitioner",
                        "interaction": [{"code": "read"}],
                    },
                    {
                        "type": "Encounter",
                        "interaction": [{"code": "read"}],
                    },
                ],
            }
        ],
    })
