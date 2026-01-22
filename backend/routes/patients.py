"""
Patient management endpoints
Refactored to use PatientService for better code health
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from typing import List, Dict, Any

from database import get_db, Person
from dependencies import get_current_user
from services.patient_service import PatientService
import schemas

router = APIRouter(prefix="/api", tags=["patients"])


@router.get("/patients")
async def get_patients(
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user),
    skip: int = Query(0),
    limit: int = Query(100)
) -> List[Dict[str, Any]]:
    """Get list of patients created by the current doctor with decrypted sensitive data"""
    return PatientService.get_patients(db, current_user.id, skip, limit)


@router.get("/patients/{patient_id}")
async def get_patient(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
) -> Dict[str, Any]:
    """Get specific patient by ID with decrypted sensitive data (only if created by current doctor)"""
    return PatientService.get_patient(db, patient_id, current_user.id)


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

