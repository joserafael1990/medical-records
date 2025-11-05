"""
Vital signs management endpoints
Migrated from main_clean_english.py to improve code organization
"""

from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime

from database import get_db, Person, VitalSign, ConsultationVitalSign, MedicalRecord
from dependencies import get_current_user

router = APIRouter(prefix="/api", tags=["vital-signs"])


@router.get("/vital-signs")
async def get_vital_signs(
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Get all available vital signs"""
    print(f"🫀 Getting vital signs for user {current_user.id}")
    
    try:
        vital_signs = db.query(VitalSign).order_by(VitalSign.name).all()
        
        vital_signs_data = []
        for vital_sign in vital_signs:
            vital_sign_data = {
                "id": vital_sign.id,
                "name": vital_sign.name,
                "created_at": vital_sign.created_at.isoformat() if vital_sign.created_at else None
            }
            vital_signs_data.append(vital_sign_data)
        
        print(f"✅ Found {len(vital_signs_data)} vital signs")
        return vital_signs_data
        
    except Exception as e:
        print(f"❌ Error getting vital signs: {e}")
        raise HTTPException(status_code=500, detail="Error retrieving vital signs")


@router.get("/consultations/{consultation_id}/vital-signs")
async def get_consultation_vital_signs(
    consultation_id: int,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Get vital signs for a specific consultation"""
    print(f"🫀 Getting vital signs for consultation: {consultation_id}")
    
    try:
        # Verify consultation exists and user has access
        consultation = db.query(MedicalRecord).filter(
            MedicalRecord.id == consultation_id,
            MedicalRecord.created_by == current_user.id
        ).first()
        
        if not consultation:
            print(f"🫀 Consultation {consultation_id} not found or no access for user {current_user.id}")
            return []

        # Get vital signs for this consultation
        consultation_vital_signs = db.query(ConsultationVitalSign).filter(
            ConsultationVitalSign.consultation_id == consultation_id
        ).all()
        
        print(f"🫀 Found {len(consultation_vital_signs)} vital signs for consultation {consultation_id}")
        
        # Convert to response format
        vital_signs_data = []
        for cv_sign in consultation_vital_signs:
            vital_sign_data = {
                "id": cv_sign.id,
                "consultation_id": cv_sign.consultation_id,
                "vital_sign_id": cv_sign.vital_sign_id,
                "vital_sign_name": cv_sign.vital_sign.name,
                "value": cv_sign.value,
                "unit": cv_sign.unit,
                "created_at": cv_sign.created_at.isoformat() if cv_sign.created_at else None,
                "updated_at": cv_sign.updated_at.isoformat() if cv_sign.updated_at else None
            }
            vital_signs_data.append(vital_sign_data)
        
        return vital_signs_data
        
    except Exception as e:
        print(f"❌ Error getting consultation vital signs: {e}")
        raise HTTPException(status_code=500, detail="Error retrieving consultation vital signs")


@router.post("/consultations/{consultation_id}/vital-signs")
async def create_consultation_vital_sign(
    consultation_id: str,  # Changed to str to handle "temp_consultation"
    vital_sign_data: dict = Body(...),  # Use Body() to properly handle dict
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Create or update a vital sign for a consultation"""
    print(f"🫀 Creating vital sign for consultation {consultation_id}: {vital_sign_data}")
    
    try:
        # Handle temp_consultation case (when consultation hasn't been created yet)
        if consultation_id == "temp_consultation":
            # For temp consultations, just return success without saving to DB
            # The vital sign will be saved when the consultation is created
            print(f"🫀 Temp consultation - returning mock response")
            return {
                "id": 0,
                "consultation_id": None,
                "vital_sign_id": vital_sign_data.get('vital_sign_id'),
                "vital_sign_name": vital_sign_data.get('vital_sign_name', ''),
                "value": vital_sign_data.get('value'),
                "unit": vital_sign_data.get('unit'),
                "created_at": None,
                "updated_at": None
            }
        
        # Convert to int for real consultations
        try:
            consultation_id_int = int(consultation_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid consultation ID")
        
        # Verify consultation exists and user has access
        consultation = db.query(MedicalRecord).filter(
            MedicalRecord.id == consultation_id_int,
            MedicalRecord.created_by == current_user.id
        ).first()
    
        if not consultation:
            raise HTTPException(status_code=404, detail="Consultation not found or no access")
        
        # Verify vital sign exists
        vital_sign = db.query(VitalSign).filter(
            VitalSign.id == vital_sign_data.get('vital_sign_id')
        ).first()
        
        if not vital_sign:
            raise HTTPException(status_code=404, detail="Vital sign not found")
        
        # Check if this vital sign already exists for this consultation
        existing_cv_sign = db.query(ConsultationVitalSign).filter(
            ConsultationVitalSign.consultation_id == consultation_id_int,
            ConsultationVitalSign.vital_sign_id == vital_sign_data.get('vital_sign_id')
        ).first()
        
        if existing_cv_sign:
            # Update existing vital sign
            existing_cv_sign.value = vital_sign_data.get('value')
            existing_cv_sign.unit = vital_sign_data.get('unit')
            existing_cv_sign.updated_at = datetime.utcnow()
            
            db.commit()
            db.refresh(existing_cv_sign)
            
            response_data = {
                "id": existing_cv_sign.id,
                "consultation_id": existing_cv_sign.consultation_id,
                "vital_sign_id": existing_cv_sign.vital_sign_id,
                "vital_sign_name": vital_sign.name,
                "value": existing_cv_sign.value,
                "unit": existing_cv_sign.unit,
                "created_at": existing_cv_sign.created_at.isoformat() if existing_cv_sign.created_at else None,
                "updated_at": existing_cv_sign.updated_at.isoformat() if existing_cv_sign.updated_at else None
            }
            
            print(f"✅ Updated vital sign {existing_cv_sign.id}")
            return response_data
        else:
            # Create new vital sign
            new_cv_sign = ConsultationVitalSign(
                consultation_id=consultation_id_int,
                vital_sign_id=vital_sign_data.get('vital_sign_id'),
                value=vital_sign_data.get('value'),
                unit=vital_sign_data.get('unit')
            )
            
            db.add(new_cv_sign)
            db.commit()
            db.refresh(new_cv_sign)
            
            response_data = {
                "id": new_cv_sign.id,
                "consultation_id": new_cv_sign.consultation_id,
                "vital_sign_id": new_cv_sign.vital_sign_id,
                "vital_sign_name": vital_sign.name,
                "value": new_cv_sign.value,
                "unit": new_cv_sign.unit,
                "created_at": new_cv_sign.created_at.isoformat() if new_cv_sign.created_at else None,
                "updated_at": new_cv_sign.updated_at.isoformat() if new_cv_sign.updated_at else None
            }
            
            print(f"✅ Created vital sign {new_cv_sign.id}")
            return response_data
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error creating consultation vital sign: {e}")
        raise HTTPException(status_code=500, detail="Error creating consultation vital sign")


@router.delete("/consultations/{consultation_id}/vital-signs/{vital_sign_id}")
async def delete_consultation_vital_sign(
    consultation_id: int,
    vital_sign_id: int,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Delete a vital sign from a consultation"""
    print(f"🫀 Deleting vital sign {vital_sign_id} from consultation {consultation_id}")
    
    try:
        # Verify consultation exists and user has access
        consultation = db.query(MedicalRecord).filter(
            MedicalRecord.id == consultation_id,
            MedicalRecord.created_by == current_user.id
        ).first()
        
        if not consultation:
            raise HTTPException(status_code=404, detail="Consultation not found or no access")
        
        # Find the vital sign
        cv_sign = db.query(ConsultationVitalSign).filter(
            ConsultationVitalSign.consultation_id == consultation_id,
            ConsultationVitalSign.vital_sign_id == vital_sign_id
        ).first()
        
        if not cv_sign:
            raise HTTPException(status_code=404, detail="Vital sign not found in this consultation")
        
        # Delete the vital sign
        db.delete(cv_sign)
        db.commit()
        
        print(f"✅ Deleted vital sign {vital_sign_id} from consultation {consultation_id}")
        return {"message": "Vital sign deleted successfully", "id": vital_sign_id}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error deleting consultation vital sign: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Error deleting consultation vital sign")

