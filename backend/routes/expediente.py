"""
Expediente export HTTP endpoints.

GET /api/patients/{patient_id}/expediente/full — doctor-only JSON
aggregation of the patient's whole expediente. The frontend consumes
this payload and renders the PDF client-side (jsPDF) to avoid adding
a new PDF dependency on the backend.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from audit_service import audit_service
from database import Person, get_db
from dependencies import get_current_user
from logger import get_logger
from services.expediente_export import ExpedienteAggregator

api_logger = get_logger("medical_records.expediente_route")

router = APIRouter(prefix="/api/patients", tags=["expediente"])


@router.get("/{patient_id}/expediente/full")
async def get_expediente_full(
    patient_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user),
):
    """Return the complete expediente as structured JSON for PDF rendering."""
    if current_user.person_type not in ("doctor", "admin"):
        raise HTTPException(
            status_code=403,
            detail="Solo personal médico puede exportar expedientes.",
        )
    aggregator = ExpedienteAggregator(db=db)
    try:
        payload = aggregator.build(patient_id=patient_id, doctor=current_user)
    except LookupError:
        raise HTTPException(status_code=404, detail="Paciente no encontrado.")
    except PermissionError:
        raise HTTPException(
            status_code=403,
            detail="No tienes autorización sobre este paciente.",
        )

    try:
        audit_service.log_action(
            db=db,
            user=current_user,
            request=request,
            action="READ",
            table_name="persons",
            record_id=patient_id,
            affected_patient_id=patient_id,
            affected_patient_name=payload.get("patient", {}).get("name"),
            operation_type="expediente_export",
            metadata={
                "consultations": payload["summary"]["total_consultations"],
                "prescriptions": payload["summary"]["total_prescriptions"],
                "studies": payload["summary"]["total_studies"],
            },
            security_level="INFO",
        )
    except Exception as audit_err:
        api_logger.warning("Expediente export audit failed: %s", audit_err)

    return payload
