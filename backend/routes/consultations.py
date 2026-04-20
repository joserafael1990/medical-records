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
    sign_medical_document,
)
from services.consultations.security import verify_medical_document_signature
from audit_service import audit_service

api_logger = get_logger("medical_records.api")

router = APIRouter(prefix="/api", tags=["consultations"])


@router.get("/consultations")
async def get_consultations(
    request: Request,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user),
    skip: int = Query(0),
    limit: int = Query(100)
):
    """Get list of consultations"""
    api_logger.info(
        "📋 GET /consultations called",
        extra={
            "doctor_id": current_user.id,
            "skip": skip,
            "limit": limit,
            "user_type": current_user.person_type
        }
    )
    try:
        result = ConsultationService.get_consultations_for_doctor(
            db=db,
            doctor_id=current_user.id,
            skip=skip,
            limit=limit,
            decrypt_sensitive_data_fn=decrypt_sensitive_data
        )
        api_logger.info(
            "✅ GET /consultations returning result",
            extra={
                "doctor_id": current_user.id,
                "result_count": len(result) if result else 0,
                "result_is_list": isinstance(result, list)
            }
        )
        # NOM-004 audit: record bulk PHI read.
        try:
            audit_service.log_consultation_list_access(
                db=db,
                user=current_user,
                request=request,
                result_count=len(result) if result else 0,
                filters={"skip": skip, "limit": limit},
            )
        except Exception as audit_err:
            api_logger.warning("Failed to audit consultation list access: %s", audit_err)
        return result
    except Exception as e:
        api_logger.error(
            "❌ GET /consultations error",
            extra={
                "doctor_id": current_user.id,
                "error": str(e)
            },
            exc_info=True
        )
        raise


@router.get("/consultations/{consultation_id}")
async def get_consultation(
    consultation_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Get specific consultation by ID"""
    result = ConsultationService.get_consultation_by_id(
        db=db,
        consultation_id=consultation_id,
        doctor_id=current_user.id,
        decrypt_sensitive_data_fn=decrypt_sensitive_data
    )
    # NOM-004 audit: record that a specific expediente was read, including
    # patient name if available in the service response.
    try:
        patient_name = None
        if isinstance(result, dict):
            patient_name = result.get("patient_name") or (
                result.get("patient", {}).get("name") if isinstance(result.get("patient"), dict) else None
            )
        audit_service.log_consultation_access(
            db=db,
            user=current_user,
            consultation_id=consultation_id,
            patient_name=patient_name or "",
            request=request,
        )
    except Exception as audit_err:
        api_logger.warning("Failed to audit consultation access: %s", audit_err)
    return result


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


@router.get("/consultations/{consultation_id}/integrity")
async def verify_consultation_integrity(
    consultation_id: int,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user),
):
    """Re-hash a consultation and verify it matches the stored integrity stamp.

    Intended for compliance reports and admin audits. Returns
    `{valid, reason, ...}`; never 500s on a mismatch — the intent is to surface
    tampering, not hide it.

    Note: this validates the integrity stamp produced by
    `sign_medical_document`. It is NOT a validation of a SAT e.firma.
    """
    consultation = ConsultationService.get_consultation_by_id(
        db=db,
        consultation_id=consultation_id,
        doctor_id=current_user.id,
        decrypt_sensitive_data_fn=decrypt_sensitive_data,
    )
    if not consultation:
        raise HTTPException(status_code=404, detail="Consultation not found")

    signature = consultation.get("digital_signature") if isinstance(consultation, dict) else None
    if not signature:
        return {"valid": False, "reason": "no_stamp_stored", "consultation_id": consultation_id}

    # The service response already decrypted PHI, matching what was stamped at
    # close-time. Strip the stamp itself from the payload before rehashing so
    # the canonical form is reproducible.
    payload = {k: v for k, v in consultation.items() if k not in ("digital_signature", "signature")}
    result = verify_medical_document_signature(payload, signature)
    result["consultation_id"] = consultation_id
    return result
