"""
Patient management endpoints
Refactored to use PatientService for better code health
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from typing import List, Dict, Any

from database import get_db, Person
from dependencies import get_current_user
from logger import get_logger
from services.patient_service import PatientService
from audit_service import audit_service
import schemas

api_logger = get_logger("medical_records.api")
router = APIRouter(prefix="/api", tags=["patients"])


@router.get("/patients")
async def get_patients(
    request: Request,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user),
    skip: int = Query(0),
    limit: int = Query(100)
) -> List[Dict[str, Any]]:
    """Get list of patients created by the current doctor with decrypted sensitive data"""
    result = PatientService.get_patients(db, current_user.id, skip, limit)
    # NOM-004 / LFPDPPP: bulk PHI read must be audited.
    try:
        audit_service.log_patient_list_access(
            db=db,
            user=current_user,
            request=request,
            result_count=len(result) if result else 0,
            filters={"skip": skip, "limit": limit},
        )
    except Exception as audit_err:
        api_logger.warning("Failed to audit patient list access: %s", audit_err)
    return result


@router.get("/patients/{patient_id}")
async def get_patient(
    patient_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
) -> Dict[str, Any]:
    """Get specific patient by ID with decrypted sensitive data (only if created by current doctor)"""
    result = PatientService.get_patient(db, patient_id, current_user.id)
    # NOM-004 / LFPDPPP: individual PHI read must be audited.
    try:
        patient_name = None
        if isinstance(result, dict):
            patient_name = result.get("name") or result.get("full_name")
        audit_service.log_patient_access(
            db=db,
            user=current_user,
            patient_id=patient_id,
            patient_name=patient_name,
            request=request,
        )
    except Exception as audit_err:
        api_logger.warning("Failed to audit patient access: %s", audit_err)
    return result


@router.post("/patients", response_model=schemas.Person)
async def create_patient(
    patient_data: schemas.PatientCreate,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Create new patient with encrypted sensitive data"""
    return PatientService.create_patient(db, patient_data, current_user.id)


@router.put("/patients/{patient_id}", response_model=schemas.Person)
async def update_patient(
    patient_id: int,
    patient_data: schemas.PersonUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Update specific patient by ID"""
    return PatientService.update_patient(db, patient_id, patient_data, current_user.id, request)

