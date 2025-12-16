"""
Vital signs management endpoints
Migrated from main_clean_english.py to improve code organization
"""

from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session, joinedload
from typing import Optional
from datetime import datetime

from database import get_db, Person, VitalSign, ConsultationVitalSign, MedicalRecord
from utils.datetime_utils import utc_now
from dependencies import get_current_user
from logger import get_logger

router = APIRouter(prefix="/api", tags=["vital-signs"])
api_logger = get_logger("medical_records.api")


@router.get("/vital-signs")
async def get_vital_signs(
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Get all available vital signs"""
    api_logger.info("Getting vital signs catalog", doctor_id=current_user.id)
    
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
        
        api_logger.info("Vital signs fetched", doctor_id=current_user.id, count=len(vital_signs_data))
        return vital_signs_data
        
    except Exception as e:
        api_logger.error("Error getting vital signs", doctor_id=current_user.id, error=str(e))
        raise HTTPException(status_code=500, detail="Error retrieving vital signs")


@router.get("/consultations/{consultation_id}/vital-signs")
async def get_consultation_vital_signs(
    consultation_id: int,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Get vital signs for a specific consultation"""
    api_logger.info(
        "Getting consultation vital signs",
        doctor_id=current_user.id,
        consultation_id=consultation_id
    )
    
    try:
        # Verify consultation exists and user has access
        consultation = db.query(MedicalRecord).filter(
            MedicalRecord.id == consultation_id,
            MedicalRecord.doctor_id == current_user.id
        ).first()
        
        if not consultation:
            api_logger.warning(
                "Consultation not found or inaccessible while fetching vital signs",
                doctor_id=current_user.id,
                consultation_id=consultation_id
            )
            return []

        # Get vital signs for this consultation with vital_sign relationship loaded
        consultation_vital_signs = db.query(ConsultationVitalSign).options(
            joinedload(ConsultationVitalSign.vital_sign)
        ).filter(
            ConsultationVitalSign.consultation_id == consultation_id
        ).all()
        
        api_logger.info(
            "Consultation vital signs loaded",
            doctor_id=current_user.id,
            consultation_id=consultation_id,
            count=len(consultation_vital_signs)
        )
        
        # Convert to response format
        vital_signs_data = []
        for cv_sign in consultation_vital_signs:
            # Safely access vital_sign relationship
            vital_sign_name = cv_sign.vital_sign.name if cv_sign.vital_sign else "Unknown"
            vital_sign_data = {
                "id": cv_sign.id,
                "consultation_id": cv_sign.consultation_id,
                "vital_sign_id": cv_sign.vital_sign_id,
                "vital_sign_name": vital_sign_name,
                "value": cv_sign.value,
                "unit": cv_sign.unit,
                "created_at": cv_sign.created_at.isoformat() if cv_sign.created_at else None,
                "updated_at": cv_sign.updated_at.isoformat() if cv_sign.updated_at else None
            }
            vital_signs_data.append(vital_sign_data)
        
        return vital_signs_data
        
    except Exception as e:
        api_logger.error(
            "Error getting consultation vital signs",
            doctor_id=current_user.id,
            consultation_id=consultation_id,
            error=str(e)
        )
        raise HTTPException(status_code=500, detail="Error retrieving consultation vital signs")


@router.post("/consultations/{consultation_id}/vital-signs")
async def create_consultation_vital_sign(
    consultation_id: str,  # Changed to str to handle "temp_consultation"
    vital_sign_data: dict = Body(...),  # Use Body() to properly handle dict
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Create or update a vital sign for a consultation"""
    api_logger.info(
        "Creating/updating consultation vital sign",
        doctor_id=current_user.id,
        consultation_id=consultation_id
    )
    
    try:
        # Handle temp_consultation case (when consultation hasn't been created yet)
        if consultation_id == "temp_consultation":
            # For temp consultations, just return success without saving to DB
            # The vital sign will be saved when the consultation is created
            api_logger.debug("Temp consultation - returning mock response for vital signs")
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
            existing_cv_sign.updated_at = utc_now()
            
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
            
            api_logger.info(
                "Updated consultation vital sign",
                doctor_id=current_user.id,
                consultation_id=consultation_id_int,
                vital_sign_id=existing_cv_sign.id
            )
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
            
            api_logger.info(
                "Created consultation vital sign",
                doctor_id=current_user.id,
                consultation_id=consultation_id_int,
                vital_sign_id=new_cv_sign.id
            )
            return response_data
        
    except HTTPException:
        raise
    except Exception as e:
        api_logger.error(
            "Error creating consultation vital sign",
            doctor_id=current_user.id,
            consultation_id=consultation_id,
            error=str(e)
        )
        raise HTTPException(status_code=500, detail="Error creating consultation vital sign")


@router.delete("/consultations/{consultation_id}/vital-signs/{vital_sign_id}")
async def delete_consultation_vital_sign(
    consultation_id: int,
    vital_sign_id: int,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Delete a vital sign from a consultation"""
    api_logger.info(
        "Deleting consultation vital sign",
        doctor_id=current_user.id,
        consultation_id=consultation_id,
        vital_sign_id=vital_sign_id
    )
    
    try:
        # Verify consultation exists and user has access
        consultation = db.query(MedicalRecord).filter(
            MedicalRecord.id == consultation_id,
            MedicalRecord.doctor_id == current_user.id
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
        
        api_logger.info(
            "Deleted consultation vital sign",
            doctor_id=current_user.id,
            consultation_id=consultation_id,
            vital_sign_id=vital_sign_id
        )
        return {"message": "Vital sign deleted successfully", "id": vital_sign_id}
        
    except HTTPException:
        raise
    except Exception as e:
        api_logger.error(
            "Error deleting consultation vital sign",
            doctor_id=current_user.id,
            consultation_id=consultation_id,
            vital_sign_id=vital_sign_id,
            error=str(e)
        )
        db.rollback()
        raise HTTPException(status_code=500, detail="Error deleting consultation vital sign")


@router.get("/patients/{patient_id}/vital-signs/history")
async def get_patient_vital_signs_history(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Get historical vital signs for a patient, grouped by vital sign type"""
    import traceback
    
    # #region agent log
    api_logger.info("DEBUG: Function entry", extra={"hypothesisId":"A","location":"vital_signs.py:310","patient_id":patient_id,"doctor_id":current_user.id})
    # #endregion
    
    api_logger.info(
        "Getting patient vital signs history",
        doctor_id=current_user.id,
        patient_id=patient_id
    )
    
    try:
        # Verify patient exists and user has access (doctor can only access own patients)
        # #region agent log
        api_logger.debug("DEBUG: Before patient query", extra={"hypothesisId":"A","location":"vital_signs.py:325","patient_id":patient_id})
        # #endregion
        
        patient = db.query(Person).filter(
            Person.id == patient_id,
            Person.person_type == 'patient'
        ).first()
        
        # #region agent log
        api_logger.debug("DEBUG: After patient query", extra={"hypothesisId":"A","location":"vital_signs.py:332","patient_found":patient is not None,"patient_name":patient.name if patient else None})
        # #endregion
        
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")
        
        # Get all consultations for this patient created by the current doctor
        # #region agent log
        api_logger.debug("DEBUG: Before consultations query", extra={"hypothesisId":"B","location":"vital_signs.py:338","patient_id":patient_id,"doctor_id":current_user.id})
        # #endregion
        
        consultations = db.query(MedicalRecord).filter(
            MedicalRecord.patient_id == patient_id,
            MedicalRecord.doctor_id == current_user.id
        ).order_by(MedicalRecord.consultation_date.asc()).all()
        
        # #region agent log
        api_logger.debug("DEBUG: After consultations query", extra={"hypothesisId":"B","location":"vital_signs.py:345","consultations_count":len(consultations),"consultation_ids":[c.id for c in consultations]})
        # #endregion
        
        if not consultations:
            return {
                "patient_id": patient_id,
                "patient_name": patient.name or "Paciente",
                "vital_signs_history": []
            }
        
        # Get all vital signs for these consultations with vital_sign relationship loaded
        consultation_ids = [c.id for c in consultations]
        
        # #region agent log
        api_logger.debug("DEBUG: Before vital signs query", extra={"hypothesisId":"C","location":"vital_signs.py:352","consultation_ids":consultation_ids})
        # #endregion
        
        vital_signs = db.query(ConsultationVitalSign).options(
            joinedload(ConsultationVitalSign.vital_sign)
        ).filter(
            ConsultationVitalSign.consultation_id.in_(consultation_ids)
        ).all()
        
        # #region agent log
        api_logger.debug("DEBUG: After vital signs query", extra={"hypothesisId":"C","location":"vital_signs.py:359","vital_signs_count":len(vital_signs),"sample_vital_signs":[{"id":vs.id,"vital_sign_id":vs.vital_sign_id,"has_vital_sign":vs.vital_sign is not None} for vs in vital_signs[:5]]})
        # #endregion
        
        # Create a map of consultation_id to date for sorting
        consultation_date_map = {c.id: c.consultation_date for c in consultations}
        
        # #region agent log
        api_logger.debug("DEBUG: Created consultation_date_map", extra={"hypothesisId":"D","location":"vital_signs.py:365","map_size":len(consultation_date_map),"sample_dates":{str(k):str(v) if v else None for k,v in list(consultation_date_map.items())[:3]}})
        # #endregion
        
        # Group by vital sign type
        history_by_type = {}
        vs_count = 0
        for vs in vital_signs:
            vs_count += 1
            # #region agent log
            if vs_count <= 3:  # Only log first 3 to avoid spam
                api_logger.debug("DEBUG: Processing vital sign", extra={"hypothesisId":"E","location":"vital_signs.py:373","vs_id":vs.id,"vs_count":vs_count,"vital_sign_id":vs.vital_sign_id,"has_vital_sign":vs.vital_sign is not None,"consultation_id":vs.consultation_id})
            # #endregion
            
            # Safely access vital_sign relationship
            if not vs.vital_sign:
                # #region agent log
                api_logger.warning("DEBUG: Skipping vs with no vital_sign relationship", extra={"hypothesisId":"C","location":"vital_signs.py:376","vs_id":vs.id,"vital_sign_id":vs.vital_sign_id})
                # #endregion
                continue
            vital_sign_name = vs.vital_sign.name
            vital_sign_id = vs.vital_sign_id
            
            if vital_sign_id not in history_by_type:
                history_by_type[vital_sign_id] = {
                    "vital_sign_id": vital_sign_id,
                    "vital_sign_name": vital_sign_name,
                    "data": []
                }
            
            # Get consultation date
            consultation_date = consultation_date_map.get(vs.consultation_id) or vs.created_at
            
            # #region agent log
            if vs_count <= 3:  # Only log first 3
                api_logger.debug("DEBUG: Before date conversion", extra={"hypothesisId":"D","location":"vital_signs.py:392","consultation_id":vs.consultation_id,"consultation_date":str(consultation_date) if consultation_date else None,"vs_created_at":str(vs.created_at) if vs.created_at else None,"date_type":type(consultation_date).__name__ if consultation_date else None})
            # #endregion
            
            # Convert value to float if possible
            try:
                numeric_value = float(vs.value) if vs.value else None
            except (ValueError, TypeError) as ve:
                # #region agent log
                api_logger.warning("DEBUG: Value conversion error", extra={"hypothesisId":"E","location":"vital_signs.py:399","vs_id":vs.id,"value":vs.value,"value_type":type(vs.value).__name__,"error":str(ve)})
                # #endregion
                numeric_value = None
            
            # Convert date to ISO format
            try:
                date_str = consultation_date.isoformat() if consultation_date else None
            except Exception as de:
                # #region agent log
                api_logger.error("DEBUG: Date isoformat error", extra={"hypothesisId":"D","location":"vital_signs.py:407","consultation_id":vs.consultation_id,"consultation_date":str(consultation_date) if consultation_date else None,"date_type":type(consultation_date).__name__ if consultation_date else None,"error":str(de),"traceback":traceback.format_exc()}, exc_info=True)
                # #endregion
                date_str = None
            
            history_by_type[vital_sign_id]["data"].append({
                "value": numeric_value,
                "unit": vs.unit or "",
                "date": date_str,
                "consultation_id": vs.consultation_id
            })
        
        # Convert to list format
        vital_signs_history = list(history_by_type.values())
        
        # #region agent log
        api_logger.info("DEBUG: Function exit success", extra={"hypothesisId":"A","location":"vital_signs.py:425","vital_signs_count":len(vital_signs_history)})
        # #endregion
        
        api_logger.info(
            "Patient vital signs history loaded",
            doctor_id=current_user.id,
            patient_id=patient_id,
            vital_signs_count=len(vital_signs_history)
        )
        
        return {
            "patient_id": patient_id,
            "patient_name": patient.name or "Paciente",
            "vital_signs_history": vital_signs_history
        }
        
    except HTTPException:
        raise
    except Exception as e:
        # #region agent log
        api_logger.error("DEBUG: Exception caught", extra={"hypothesisId":"F","location":"vital_signs.py:440","error":str(e),"error_type":type(e).__name__,"traceback":traceback.format_exc()}, exc_info=True)
        # #endregion
        
        api_logger.error(
            "Error getting patient vital signs history",
            doctor_id=current_user.id,
            patient_id=patient_id,
            error=str(e)
        )
        raise HTTPException(status_code=500, detail="Error retrieving patient vital signs history")

