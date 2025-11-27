"""
Consultations management endpoints
Refactored to use ConsultationService
"""

from fastapi import APIRouter, Depends, HTTPException, Request, Query
from sqlalchemy.orm import Session
from typing import Optional, List, Dict, Any

from database import get_db, Person
from dependencies import get_current_user
from logger import get_logger
from services.consultation_service import (
    ConsultationService,
    now_cdmx,
    cdmx_datetime,
    encrypt_sensitive_data,
    decrypt_sensitive_data,
    sign_medical_document
)

api_logger = get_logger("medical_records.api")

router = APIRouter(prefix="/api", tags=["consultations"])


@router.get("/consultations")
async def get_consultations(
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user),
    skip: int = Query(0),
    limit: int = Query(100)
):
    """Get list of consultations"""
    return ConsultationService.get_consultations_for_doctor(
        db=db,
        doctor_id=current_user.id,
        skip=skip,
        limit=limit,
        decrypt_sensitive_data_fn=decrypt_sensitive_data
    )


@router.get("/consultations/{consultation_id}")
async def get_consultation(
    consultation_id: int,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Get specific consultation by ID"""
    return ConsultationService.get_consultation_by_id(
        db=db,
        consultation_id=consultation_id,
        doctor_id=current_user.id,
        decrypt_sensitive_data_fn=decrypt_sensitive_data
    )


@router.post("/consultations")
async def create_consultation(
    consultation_data: dict,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Create new consultation"""
    return await ConsultationService.create_consultation(
        db=db,
        consultation_data=consultation_data,
        current_user=current_user,
        request=request,
        now_cdmx_fn=now_cdmx,
        cdmx_datetime_fn=cdmx_datetime,
        encrypt_sensitive_data_fn=encrypt_sensitive_data,
        sign_medical_document_fn=sign_medical_document
    )


@router.put("/consultations/{consultation_id}")
async def update_consultation(
    consultation_id: int,
    consultation_data: dict,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Update specific consultation by ID"""
    return await ConsultationService.update_consultation(
        db=db,
        consultation_id=consultation_id,
        consultation_data=consultation_data,
        current_user=current_user,
        request=request,
        cdmx_datetime_fn=cdmx_datetime
    )


@router.get("/consultations/{consultation_id}/document-folio")
async def get_document_folio(
    consultation_id: int,
    document_type: str = Query(..., description="Type of document: prescription or study_order"),
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Get or create a folio number for a consultation document"""
    from services.document_folio_service import DocumentFolioService
    from database import MedicalRecord
    
    # Verify consultation belongs to current doctor
    consultation = db.query(MedicalRecord).filter(
        MedicalRecord.id == consultation_id,
        MedicalRecord.doctor_id == current_user.id
    ).first()
    
    if not consultation:
        raise HTTPException(status_code=404, detail="Consultation not found")
    
    try:
        folio = DocumentFolioService.get_or_create_folio(
            db=db,
            doctor_id=current_user.id,
            consultation_id=consultation_id,
            document_type=document_type
        )
        return DocumentFolioService.serialize_folio(folio)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        api_logger.error(
            "Error generating document folio",
            extra={
                "consultation_id": consultation_id,
                "document_type": document_type,
                "error": str(e)
            },
            exc_info=True
        )
        raise HTTPException(status_code=500, detail=f"Error generating folio: {str(e)}")
