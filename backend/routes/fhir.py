"""
FHIR R4 endpoints (NOM-024-SSA3-2012 interoperability).

Resources exposed:
- Patient      read + search (identifier, CURP system only)
- Practitioner read
- Encounter    read + search (patient)
- MedicationRequest  read + search (patient)
- Observation        read + search (patient)
- Patient/$everything operation — full clinical Bundle

Auth model: doctor-only. A doctor can read their own Practitioner record,
any Patient they own (`persons.created_by`) or have consulted, and any
Encounter/MedicationRequest/Observation belonging to those patients.
Admins bypass ownership checks. Patient search returns only patients the
caller is allowed to read.

Not in scope: LOINC/RxNorm codings, SMART-on-FHIR auth,
Bundle transaction writes, resource _history.
"""

from __future__ import annotations

from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from audit_service import audit_service
from database import (
    ConsultationPrescription,
    ConsultationVitalSign,
    Document,
    MedicalRecord,
    Person,
    PersonDocument,
    get_db,
)
from dependencies import get_current_user
from interoperability import InteroperabilityService
from logger import get_logger
from services.fhir_service import (
    build_doctor_view,
    build_encounter_view,
    build_everything_bundle,
    build_patient_view,
    build_searchset_bundle,
    fix_encounter_keys,
    serialize_medication_request,
    serialize_observation,
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


# Patient.identifier system for Mexican CURP (matches the system URI
# that `InteroperabilityService.patient_to_fhir_patient` emits).
CURP_IDENTIFIER_SYSTEM = "urn:oid:2.16.840.1.113883.4.629"


@router.get("/Patient")
async def search_patients(
    identifier: str = Query(..., description="identifier as system|value or bare value (CURP)"),
    request: Request = None,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user),
):
    """Search Patients by identifier. Currently only CURP is supported.

    Accepts FHIR's `system|value` token syntax or a bare `value`. A
    provided `system` that isn't the CURP OID yields an empty Bundle
    (no error) — that matches FHIR search semantics for unknown systems.
    """
    if current_user.person_type not in ("doctor", "admin"):
        return JSONResponse(
            status_code=403,
            content=_operation_outcome(403, "Not authorized"),
            media_type=FHIR_CONTENT_TYPE,
        )
    if "|" in identifier:
        system, value = identifier.split("|", 1)
    else:
        system, value = "", identifier
    value = value.strip()
    if not value:
        return JSONResponse(
            status_code=400,
            content=_operation_outcome(400, "identifier value is required"),
            media_type=FHIR_CONTENT_TYPE,
        )
    if system and system != CURP_IDENTIFIER_SYSTEM:
        return _fhir_response(build_searchset_bundle([]))

    rows = (
        db.query(Person)
        .join(PersonDocument, PersonDocument.person_id == Person.id)
        .join(Document, Document.id == PersonDocument.document_id)
        .filter(
            Person.person_type == "patient",
            Document.name == "CURP",
            PersonDocument.is_active.is_(True),
            PersonDocument.document_value == value,
        )
        .all()
    )
    visible = [p for p in rows if _doctor_can_read_patient(db, current_user, p)]
    resources: List[Dict[str, Any]] = []
    for pat in visible:
        view = build_patient_view(db, pat)
        resources.append(
            InteroperabilityService.patient_to_fhir_patient(view).model_dump(exclude_none=True)
        )
    try:
        audit_service.log_action(
            db=db, action="READ", user=current_user, request=request,
            table_name="persons", record_id=None,
            operation_type="fhir_patient_search",
            metadata={"count": len(resources), "identifier_value": value},
            security_level="INFO",
        )
    except Exception as audit_err:
        api_logger.warning("Failed to audit Patient search: %s", audit_err)
    return _fhir_response(build_searchset_bundle(resources))


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

    FHIR-native counterpart to the ARCO export in #21. Scope: Patient +
    Encounters + MedicationRequests + Observations + involved
    Practitioners. Non-admin callers only see Encounters (and their
    child resources) they authored.
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
    encounter_ids = [c.id for c in consultations]

    # MedicationRequests + Observations anchored to those encounters.
    medication_requests: List[Dict[str, Any]] = []
    observations: List[Dict[str, Any]] = []
    if encounter_ids:
        rx_rows = (
            db.query(ConsultationPrescription)
            .filter(ConsultationPrescription.consultation_id.in_(encounter_ids))
            .all()
        )
        # doctor_id is carried by the encounter, not the prescription row.
        consultation_doctor = {c.id: c.doctor_id for c in consultations}
        medication_requests = [
            serialize_medication_request(rx, patient_id, consultation_doctor.get(rx.consultation_id))
            for rx in rx_rows
        ]
        vs_rows = (
            db.query(ConsultationVitalSign)
            .filter(ConsultationVitalSign.consultation_id.in_(encounter_ids))
            .all()
        )
        observations = [serialize_observation(vs, patient_id) for vs in vs_rows]

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

    bundle = build_everything_bundle(
        patient_fhir,
        encounters,
        practitioners,
        medication_request_fhirs=medication_requests,
        observation_fhirs=observations,
    )

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
            metadata={
                "encounters": len(encounters),
                "medication_requests": len(medication_requests),
                "observations": len(observations),
                "practitioners": len(practitioners),
            },
            security_level="INFO",
        )
    except Exception as audit_err:
        api_logger.warning("Failed to audit Patient/$everything: %s", audit_err)

    return _fhir_response(bundle)


# ---------------------------------------------------------------------------
# Encounter search — GET /Encounter?patient={id}
# ---------------------------------------------------------------------------

@router.get("/Encounter")
async def search_encounters(
    patient: int = Query(..., description="Patient resource id"),
    request: Request = None,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user),
):
    """Return a searchset Bundle of Encounters for the given patient."""
    pat = db.query(Person).filter(Person.id == patient, Person.person_type == "patient").first()
    if not pat:
        return JSONResponse(
            status_code=404,
            content=_operation_outcome(404, "Patient not found"),
            media_type=FHIR_CONTENT_TYPE,
        )
    if not _doctor_can_read_patient(db, current_user, pat):
        return JSONResponse(
            status_code=403,
            content=_operation_outcome(403, "Not authorized to read this patient's Encounters"),
            media_type=FHIR_CONTENT_TYPE,
        )
    q = db.query(MedicalRecord).filter(MedicalRecord.patient_id == patient)
    if current_user.person_type != "admin":
        q = q.filter(MedicalRecord.doctor_id == current_user.id)
    consultations = q.order_by(MedicalRecord.consultation_date.asc()).all()
    encounters = [_fhir_encounter_for(c) for c in consultations]
    try:
        audit_service.log_action(
            db=db, action="READ", user=current_user, request=request,
            table_name="medical_records", record_id=None,
            affected_patient_id=patient,
            operation_type="fhir_encounter_search",
            metadata={"count": len(encounters)},
            security_level="INFO",
        )
    except Exception as audit_err:
        api_logger.warning("Failed to audit Encounter search: %s", audit_err)
    return _fhir_response(build_searchset_bundle(encounters))


# ---------------------------------------------------------------------------
# MedicationRequest — search + read
# ---------------------------------------------------------------------------

def _rx_patient_id(db: Session, rx: ConsultationPrescription) -> int | None:
    """Resolve the patient_id for a prescription via its parent encounter."""
    consultation = db.query(MedicalRecord).filter(
        MedicalRecord.id == rx.consultation_id
    ).first()
    return consultation.patient_id if consultation else None


@router.get("/MedicationRequest")
async def search_medication_requests(
    patient: int = Query(..., description="Patient resource id"),
    request: Request = None,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user),
):
    """Return a searchset Bundle of MedicationRequests for the given patient."""
    pat = db.query(Person).filter(Person.id == patient, Person.person_type == "patient").first()
    if not pat:
        return JSONResponse(
            status_code=404,
            content=_operation_outcome(404, "Patient not found"),
            media_type=FHIR_CONTENT_TYPE,
        )
    if not _doctor_can_read_patient(db, current_user, pat):
        return JSONResponse(
            status_code=403,
            content=_operation_outcome(403, "Not authorized"),
            media_type=FHIR_CONTENT_TYPE,
        )
    q = db.query(MedicalRecord).filter(MedicalRecord.patient_id == patient)
    if current_user.person_type != "admin":
        q = q.filter(MedicalRecord.doctor_id == current_user.id)
    consultations = q.all()
    enc_ids = [c.id for c in consultations]
    consultation_doctor = {c.id: c.doctor_id for c in consultations}
    rx_rows = (
        db.query(ConsultationPrescription)
        .filter(ConsultationPrescription.consultation_id.in_(enc_ids))
        .all()
    ) if enc_ids else []
    resources = [
        serialize_medication_request(rx, patient, consultation_doctor.get(rx.consultation_id))
        for rx in rx_rows
    ]
    try:
        audit_service.log_action(
            db=db, action="READ", user=current_user, request=request,
            table_name="consultation_prescriptions", record_id=None,
            affected_patient_id=patient,
            operation_type="fhir_medication_request_search",
            metadata={"count": len(resources)},
            security_level="INFO",
        )
    except Exception as audit_err:
        api_logger.warning("Failed to audit MedicationRequest search: %s", audit_err)
    return _fhir_response(build_searchset_bundle(resources))


@router.get("/MedicationRequest/{rx_id}")
async def get_medication_request(
    rx_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user),
):
    """Return a single MedicationRequest resource."""
    rx = db.query(ConsultationPrescription).filter(ConsultationPrescription.id == rx_id).first()
    if not rx:
        return JSONResponse(
            status_code=404,
            content=_operation_outcome(404, "MedicationRequest not found"),
            media_type=FHIR_CONTENT_TYPE,
        )
    consultation = db.query(MedicalRecord).filter(MedicalRecord.id == rx.consultation_id).first()
    if not consultation:
        return JSONResponse(
            status_code=404,
            content=_operation_outcome(404, "Parent encounter not found"),
            media_type=FHIR_CONTENT_TYPE,
        )
    if current_user.person_type != "admin" and consultation.doctor_id != current_user.id:
        return JSONResponse(
            status_code=403,
            content=_operation_outcome(403, "Not authorized to read this MedicationRequest"),
            media_type=FHIR_CONTENT_TYPE,
        )
    resource = serialize_medication_request(rx, consultation.patient_id, consultation.doctor_id)
    try:
        audit_service.log_action(
            db=db, action="READ", user=current_user, request=request,
            table_name="consultation_prescriptions", record_id=rx_id,
            affected_patient_id=consultation.patient_id,
            operation_type="fhir_medication_request_access",
            security_level="INFO",
        )
    except Exception as audit_err:
        api_logger.warning("Failed to audit MedicationRequest access: %s", audit_err)
    return _fhir_response(resource)


# ---------------------------------------------------------------------------
# Observation — search + read
# ---------------------------------------------------------------------------

@router.get("/Observation")
async def search_observations(
    patient: int = Query(..., description="Patient resource id"),
    request: Request = None,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user),
):
    """Return a searchset Bundle of Observations for the given patient."""
    pat = db.query(Person).filter(Person.id == patient, Person.person_type == "patient").first()
    if not pat:
        return JSONResponse(
            status_code=404,
            content=_operation_outcome(404, "Patient not found"),
            media_type=FHIR_CONTENT_TYPE,
        )
    if not _doctor_can_read_patient(db, current_user, pat):
        return JSONResponse(
            status_code=403,
            content=_operation_outcome(403, "Not authorized"),
            media_type=FHIR_CONTENT_TYPE,
        )
    q = db.query(MedicalRecord).filter(MedicalRecord.patient_id == patient)
    if current_user.person_type != "admin":
        q = q.filter(MedicalRecord.doctor_id == current_user.id)
    consultations = q.all()
    enc_ids = [c.id for c in consultations]
    vs_rows = (
        db.query(ConsultationVitalSign)
        .filter(ConsultationVitalSign.consultation_id.in_(enc_ids))
        .all()
    ) if enc_ids else []
    resources = [serialize_observation(vs, patient) for vs in vs_rows]
    try:
        audit_service.log_action(
            db=db, action="READ", user=current_user, request=request,
            table_name="consultation_vital_signs", record_id=None,
            affected_patient_id=patient,
            operation_type="fhir_observation_search",
            metadata={"count": len(resources)},
            security_level="INFO",
        )
    except Exception as audit_err:
        api_logger.warning("Failed to audit Observation search: %s", audit_err)
    return _fhir_response(build_searchset_bundle(resources))


@router.get("/Observation/{vs_id}")
async def get_observation(
    vs_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user),
):
    """Return a single Observation resource."""
    vs = db.query(ConsultationVitalSign).filter(ConsultationVitalSign.id == vs_id).first()
    if not vs:
        return JSONResponse(
            status_code=404,
            content=_operation_outcome(404, "Observation not found"),
            media_type=FHIR_CONTENT_TYPE,
        )
    consultation = db.query(MedicalRecord).filter(MedicalRecord.id == vs.consultation_id).first()
    if not consultation:
        return JSONResponse(
            status_code=404,
            content=_operation_outcome(404, "Parent encounter not found"),
            media_type=FHIR_CONTENT_TYPE,
        )
    if current_user.person_type != "admin" and consultation.doctor_id != current_user.id:
        return JSONResponse(
            status_code=403,
            content=_operation_outcome(403, "Not authorized to read this Observation"),
            media_type=FHIR_CONTENT_TYPE,
        )
    resource = serialize_observation(vs, consultation.patient_id)
    try:
        audit_service.log_action(
            db=db, action="READ", user=current_user, request=request,
            table_name="consultation_vital_signs", record_id=vs_id,
            affected_patient_id=consultation.patient_id,
            operation_type="fhir_observation_access",
            security_level="INFO",
        )
    except Exception as audit_err:
        api_logger.warning("Failed to audit Observation access: %s", audit_err)
    return _fhir_response(resource)


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
                        "interaction": [
                            {"code": "read"},
                            {"code": "search-type"},
                        ],
                        "searchParam": [{"name": "identifier", "type": "token"}],
                        "operation": [{"name": "everything", "definition": "Patient/$everything"}],
                    },
                    {
                        "type": "Practitioner",
                        "interaction": [{"code": "read"}],
                    },
                    {
                        "type": "Encounter",
                        "interaction": [
                            {"code": "read"},
                            {"code": "search-type"},
                        ],
                        "searchParam": [{"name": "patient", "type": "reference"}],
                    },
                    {
                        "type": "MedicationRequest",
                        "interaction": [
                            {"code": "read"},
                            {"code": "search-type"},
                        ],
                        "searchParam": [{"name": "patient", "type": "reference"}],
                    },
                    {
                        "type": "Observation",
                        "interaction": [
                            {"code": "read"},
                            {"code": "search-type"},
                        ],
                        "searchParam": [{"name": "patient", "type": "reference"}],
                    },
                ],
            }
        ],
    })
