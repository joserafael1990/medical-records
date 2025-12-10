"""
Clinical studies management endpoints
Migrated from main_clean_english.py to improve code organization
"""

from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Query, Request
from fastapi.responses import FileResponse, RedirectResponse, StreamingResponse
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
import os
import uuid
import pytz
import io

from database import get_db, Person, ClinicalStudy, MedicalRecord
from utils.datetime_utils import utc_now
from dependencies import get_current_user
from logger import get_logger
from audit_service import audit_service
from services.storage_service import get_storage_service, generate_storage_key, LocalStorageService
import crud
import schemas
from utils.audit_utils import serialize_instance

api_logger = get_logger("medical_records.api")
security_logger = get_logger("medical_records.security")

# CDMX timezone configuration
SYSTEM_TIMEZONE = pytz.timezone('America/Mexico_City')

def now_cdmx():
    """Get current datetime in CDMX timezone"""
    return datetime.now(SYSTEM_TIMEZONE)

router = APIRouter(prefix="/api", tags=["clinical-studies"])


@router.get("/clinical-studies/patient/{patient_id}")
async def get_clinical_studies_by_patient(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Get all clinical studies for a specific patient"""
    api_logger.debug("Getting clinical studies for patient", patient_id=patient_id, doctor_id=current_user.id)
    
    try:
        # Verify patient exists and user has access
        patient = db.query(Person).filter(
            Person.id == patient_id,
            Person.person_type == "patient",
            Person.created_by == current_user.id  # Only show patients created by current user
        ).first()
        
        if not patient:
            api_logger.warning("Patient not found or no access", patient_id=patient_id, doctor_id=current_user.id)
            return []

        # Get clinical studies for this patient (with or without consultation_id)
        studies = db.query(ClinicalStudy).filter(
            ClinicalStudy.patient_id == patient_id,
            ClinicalStudy.created_by == current_user.id  # Only show studies created by current user
        ).order_by(ClinicalStudy.ordered_date.desc(), ClinicalStudy.created_at.desc()).all()  # Most recent first
        
        # Convert to response format
        studies_data = []
        for study in studies:
            study_data = {
                "id": str(study.id),
                "consultation_id": study.consultation_id,
                "patient_id": study.patient_id,
                "study_type": study.study_type,
                "study_name": study.study_name,
                "ordered_date": study.ordered_date.isoformat() if study.ordered_date else None,
                "performed_date": study.performed_date.isoformat() if study.performed_date else None,
                # "results_date": removed - column does not exist in clinical_studies table
                "status": study.status,
                "urgency": study.urgency,
                "clinical_indication": study.clinical_indication,
                "ordering_doctor": study.ordering_doctor,
                "file_name": study.file_name,
                "file_path": study.file_path,
                "file_type": study.file_type,
                "file_size": study.file_size,
                "created_by": str(study.created_by) if study.created_by else None,
                "created_at": study.created_at.isoformat() if study.created_at else None,
                "updated_at": study.updated_at.isoformat() if study.updated_at else None
            }
            studies_data.append(study_data)
        
        api_logger.info("Found clinical studies for patient", patient_id=patient_id, count=len(studies_data))
        return studies_data
        
    except Exception as e:
        api_logger.error("Error getting clinical studies for patient", patient_id=patient_id, error=str(e), exc_info=True)
        return []


@router.get("/clinical-studies/consultation/{consultation_id}")
async def get_clinical_studies_by_consultation(
    consultation_id: int,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Get clinical studies for a specific consultation"""
    api_logger.debug("Getting clinical studies for consultation", consultation_id=consultation_id, doctor_id=current_user.id)
    
    try:
        # Verify consultation exists and user has access
        consultation = db.query(MedicalRecord).filter(
            MedicalRecord.id == consultation_id,
            MedicalRecord.created_by == current_user.id  # Only show consultations created by current user
    ).first()
    
        if not consultation:
            api_logger.warning("Consultation not found or no access", consultation_id=consultation_id, doctor_id=current_user.id)
            return []
    
        # Get clinical studies for this consultation
        studies = db.query(ClinicalStudy).filter(
            ClinicalStudy.consultation_id == consultation_id,
            ClinicalStudy.created_by == current_user.id  # Only show studies created by current user
        ).order_by(ClinicalStudy.created_at.asc()).all()
        
        # Convert to response format
        studies_data = []
        for study in studies:
            study_data = {
                "id": str(study.id),
                "consultation_id": study.consultation_id,
                "patient_id": study.patient_id,
                "study_type": study.study_type,
                "study_name": study.study_name,
                "ordered_date": study.ordered_date.isoformat() if study.ordered_date else None,
                "performed_date": study.performed_date.isoformat() if study.performed_date else None,
                # "results_date": removed - column does not exist in clinical_studies table
                "status": study.status,
                "urgency": study.urgency,
                "clinical_indication": study.clinical_indication,
                "ordering_doctor": study.ordering_doctor,
                "file_name": study.file_name,
                "file_path": study.file_path,
                "file_type": study.file_type,
                "file_size": study.file_size,
                "created_by": str(study.created_by) if study.created_by else None,
                "created_at": study.created_at.isoformat() if study.created_at else None,
                "updated_at": study.updated_at.isoformat() if study.updated_at else None
            }
            studies_data.append(study_data)
        
        api_logger.info("Found clinical studies for consultation", consultation_id=consultation_id, count=len(studies_data))
        return studies_data
        
    except Exception as e:
        api_logger.error("Error getting clinical studies for consultation", consultation_id=consultation_id, error=str(e), exc_info=True)
        return []


@router.post("/clinical-studies")
async def create_clinical_study(
    study_data: dict,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Create a new clinical study"""
    api_logger.debug("Creating clinical study", consultation_id=study_data.get('consultation_id'), doctor_id=current_user.id, study_data_keys=list(study_data.keys()))
    
    try:
        # Validate required fields (consultation_id is now optional - NOT in required_fields)
        required_fields = ['patient_id', 'study_type', 'study_name', 'ordering_doctor']
        for field in required_fields:
            if field not in study_data or study_data[field] is None:
                raise HTTPException(status_code=400, detail=f"Field '{field}' is required")
        
        # clinical_indication is optional but must be present (can be empty string)
        if 'clinical_indication' not in study_data:
            raise HTTPException(status_code=400, detail="Field 'clinical_indication' is required")
        
        # Verify patient exists and user has access
        patient = db.query(Person).filter(
            Person.id == int(study_data['patient_id']),
            Person.person_type == "patient",
            Person.created_by == current_user.id
        ).first()
        
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found or no access")
        
        # Verify consultation exists and user has access (only if consultation_id is provided)
        consultation_id = study_data.get('consultation_id')
        consultation = None
        # Handle consultation_id: can be None, null string, empty string, or valid ID
        if consultation_id and consultation_id != 'null' and consultation_id != '' and str(consultation_id).strip():
            try:
                consultation_id_int = int(consultation_id)
                consultation = db.query(MedicalRecord).filter(
                    MedicalRecord.id == consultation_id_int,
                    MedicalRecord.created_by == current_user.id
                ).first()
                
                if not consultation:
                    raise HTTPException(status_code=404, detail="Consultation not found or no access")
            except (ValueError, TypeError):
                # If consultation_id is not a valid integer, treat it as None
                consultation_id = None
        else:
            # consultation_id is None, null, empty string, etc. - treat as None
            consultation_id = None
        
        # study_code column does not exist in clinical_studies table - removed
        
        # Create new clinical study
        # consultation_id can be None if not provided
        final_consultation_id = consultation_id if (consultation_id and consultation_id != 'null' and str(consultation_id).strip()) else None
        new_study = ClinicalStudy(
            consultation_id=final_consultation_id,
            patient_id=int(study_data['patient_id']),
            doctor_id=current_user.id,
            study_type=study_data['study_type'],
            study_name=study_data['study_name'],
            ordered_date=datetime.fromisoformat(study_data['ordered_date'].replace('Z', '+00:00')) if study_data.get('ordered_date') else utc_now(),
            performed_date=datetime.fromisoformat(study_data['performed_date'].replace('Z', '+00:00')) if study_data.get('performed_date') else None,
            # results_date removed - column does not exist in clinical_studies table
            status=study_data.get('status', 'ordered'),
            urgency=study_data.get('urgency', 'routine'),
            clinical_indication=study_data.get('clinical_indication', '') or '',
            ordering_doctor=study_data['ordering_doctor'],
            file_name=study_data.get('file_name'),
            file_path=study_data.get('file_path'),
            file_type=study_data.get('file_type'),
            file_size=study_data.get('file_size'),
            created_by=current_user.id
        )
        
        db.add(new_study)
        db.commit()
        db.refresh(new_study)
        
        # Return created study
        response_data = {
            "id": str(new_study.id),
            "consultation_id": str(new_study.consultation_id) if new_study.consultation_id else None,
            "patient_id": str(new_study.patient_id),
            "study_type": new_study.study_type,
            "study_name": new_study.study_name,
            "ordered_date": new_study.ordered_date.isoformat() if new_study.ordered_date else None,
            "performed_date": new_study.performed_date.isoformat() if new_study.performed_date else None,
            # "results_date": removed - column does not exist in clinical_studies table
            "status": new_study.status,
            "urgency": new_study.urgency,
            "clinical_indication": new_study.clinical_indication,
            "ordering_doctor": new_study.ordering_doctor,
            "file_name": new_study.file_name,
            "file_path": new_study.file_path,
            "file_type": new_study.file_type,
            "file_size": new_study.file_size,
            "created_by": str(new_study.created_by) if new_study.created_by else None,
            "created_at": new_study.created_at.isoformat() if new_study.created_at else None,
            "updated_at": new_study.updated_at.isoformat() if new_study.updated_at else None
        }
        
        api_logger.info("Clinical study created successfully", study_id=new_study.id, consultation_id=study_data.get('consultation_id'))
        return response_data
        
    except HTTPException:
        raise
    except Exception as e:
        api_logger.error("Error creating clinical study", error=str(e), exc_info=True)
        db.rollback()
        raise HTTPException(status_code=500, detail="Error creating clinical study")


@router.put("/clinical-studies/{study_id}")
async def update_clinical_study(
    study_id: int,
    study_data: dict,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Update a clinical study"""
    api_logger.debug("Updating clinical study", study_id=study_id, doctor_id=current_user.id)
    
    try:
        # Find the study and verify access
        study = db.query(ClinicalStudy).filter(
            ClinicalStudy.id == study_id,
            ClinicalStudy.created_by == current_user.id
        ).first()
        
        if not study:
            raise HTTPException(status_code=404, detail="Clinical study not found or no access")
        
        original_data = serialize_instance(
            study,
            exclude={"updated_at"},
        )
        
        # Update fields
        updateable_fields = [
            'study_type', 'study_name', 'status', 'urgency',
            'clinical_indication',
            'ordering_doctor',
            'file_name', 'file_path', 'file_type', 'file_size'
        ]
        
        for field in updateable_fields:
            if field in study_data:
                setattr(study, field, study_data[field])
        
        # Handle date fields
        if 'ordered_date' in study_data and study_data['ordered_date']:
            study.ordered_date = datetime.fromisoformat(study_data['ordered_date'].replace('Z', '+00:00'))
        
        if 'performed_date' in study_data and study_data['performed_date']:
            study.performed_date = datetime.fromisoformat(study_data['performed_date'].replace('Z', '+00:00'))
        
        # results_date removed - column does not exist in clinical_studies table
        # if 'results_date' in study_data and study_data['results_date']:
        #     study.results_date = datetime.fromisoformat(study_data['results_date'].replace('Z', '+00:00'))
        
        study.updated_at = utc_now()
        
        db.commit()
        db.refresh(study)
        # Only refresh consultation relationship if consultation_id exists
        if study.consultation_id:
            db.refresh(study, ['consultation'])
        # Also refresh patient relationship to get patient name
        db.refresh(study, ['patient'])

        updated_data = serialize_instance(study)

        # Get patient name safely
        patient_name = None
        if study.consultation_id and study.consultation and study.consultation.patient:
            patient_name = study.consultation.patient.name
        elif study.patient:
            patient_name = study.patient.name

        audit_service.log_action(
            db=db,
            action="UPDATE",
            user=current_user,
            request=request,
            table_name="clinical_studies",
            record_id=study.id,
            old_values=original_data,
            new_values=updated_data,
            operation_type="clinical_study_update",
            affected_patient_id=study.patient_id,
            affected_patient_name=patient_name,
            metadata={
                "consultation_id": study.consultation_id,
            },
        )
        
        # Return updated study
        response_data = {
            "id": str(study.id),
            "consultation_id": str(study.consultation_id) if study.consultation_id else None,
            "patient_id": str(study.patient_id),
            "study_type": study.study_type,
            "study_name": study.study_name,
            "ordered_date": study.ordered_date.isoformat() if study.ordered_date else None,
            "performed_date": study.performed_date.isoformat() if study.performed_date else None,
            # "results_date": removed - column does not exist in clinical_studies table
            "status": study.status,
            "urgency": study.urgency,
            "clinical_indication": study.clinical_indication,
            "ordering_doctor": study.ordering_doctor,
            "file_name": study.file_name,
            "file_path": study.file_path,
            "file_type": study.file_type,
            "file_size": study.file_size,
            "created_by": str(study.created_by) if study.created_by else None,
            "created_at": study.created_at.isoformat() if study.created_at else None,
            "updated_at": study.updated_at.isoformat() if study.updated_at else None
        }
        
        api_logger.info("Clinical study updated successfully", study_id=study.id)
        return response_data
        
    except HTTPException:
        raise
    except Exception as e:
        api_logger.error("Error updating clinical study", study_id=study_id, error=str(e), exc_info=True)
        db.rollback()
        audit_service.log_action(
            db=db,
            action="UPDATE",
            user=current_user,
            request=request,
            table_name="clinical_studies",
            record_id=study_id,
            old_values=original_data if 'original_data' in locals() else None,
            new_values=None,
            operation_type="clinical_study_update",
            affected_patient_id=getattr(study, "patient_id", None) if 'study' in locals() and study else None,
            success=False,
            error_message=str(e),
            metadata={
                "consultation_id": getattr(study, "consultation_id", None) if 'study' in locals() and study else None,
            },
        )
        raise HTTPException(status_code=500, detail="Error updating clinical study")


@router.delete("/clinical-studies/{study_id}")
async def delete_clinical_study(
    study_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Delete a clinical study"""
    api_logger.debug("Deleting clinical study", study_id=study_id, doctor_id=current_user.id)
    
    try:
        # Find the study and verify access
        study = db.query(ClinicalStudy).filter(
            ClinicalStudy.id == study_id,
            ClinicalStudy.created_by == current_user.id
        ).first()
        
        if not study:
            raise HTTPException(status_code=404, detail="Clinical study not found or no access")
        
        original_data = serialize_instance(study)

        # Get patient name BEFORE deleting (while study is still bound to session)
        # Only refresh consultation relationship if consultation_id exists
        if study.consultation_id:
            db.refresh(study, ['consultation'])
        # Also refresh patient relationship to get patient name
        db.refresh(study, ['patient'])

        # Get all needed info BEFORE deletion (while study is still bound to session)
        patient_name = None
        patient_id = study.patient_id
        consultation_id = study.consultation_id  # Save before deletion
        
        if study.consultation_id and study.consultation and study.consultation.patient:
            patient_name = study.consultation.patient.name
        elif study.patient:
            patient_name = study.patient.name
        else:
            # Fallback: query patient directly if relationship doesn't work
            patient = db.query(Person).filter(Person.id == study.patient_id).first()
            if patient:
                patient_name = patient.name

        # Delete the study (after getting all needed info)
        # Clean up file from storage if it exists
        if study.file_path:
            try:
                storage = get_storage_service()
                storage.delete(study.file_path)
                api_logger.info("Deleted file for clinical study", study_id=study_id, file_path=study.file_path)
            except Exception as e:
                api_logger.error("Error deleting file for clinical study", study_id=study_id, error=str(e))

        db.delete(study)
        db.commit()

        audit_service.log_action(
            db=db,
            action="DELETE",
            user=current_user,
            request=request,
            table_name="clinical_studies",
            record_id=study_id,
            old_values=original_data,
            new_values=None,
            operation_type="clinical_study_delete",
            affected_patient_id=patient_id,
            affected_patient_name=patient_name,
            metadata={
                "consultation_id": consultation_id,  # Use saved value, not study.consultation_id
            },
        )
        
        api_logger.info("Clinical study deleted successfully", study_id=study_id)
        return {"message": "Clinical study deleted successfully", "id": study_id}
        
    except HTTPException:
        raise
    except Exception as e:
        api_logger.error("Error deleting clinical study", study_id=study_id, error=str(e), exc_info=True)
        db.rollback()
        audit_service.log_action(
            db=db,
            action="DELETE",
            user=current_user,
            request=request,
            table_name="clinical_studies",
            record_id=study_id,
            old_values=original_data if 'original_data' in locals() else None,
            new_values=None,
            operation_type="clinical_study_delete",
            success=False,
            error_message=str(e),
        )
        raise HTTPException(status_code=500, detail="Error deleting clinical study")


@router.put("/clinical-studies/{study_id}/upload")
async def upload_clinical_study_file(
    study_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Upload a file for a clinical study"""
    api_logger.info(
        "Uploading file for clinical study",
        study_id=study_id,
        doctor_id=current_user.id
    )
    
    try:
        # Security: Ultra-restrictive file format validation (PDF + Images only)
        ALLOWED_EXTENSIONS = {'.pdf', '.jpg', '.jpeg', '.png'}
        ALLOWED_MIME_TYPES = {
            'application/pdf',
            'image/jpeg', 'image/jpg', 'image/png'
        }
        
        # Security: File size limits (10MB max)
        MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB in bytes
        
        # Security: Dangerous file patterns to block
        DANGEROUS_PATTERNS = [
            '.exe', '.bat', '.cmd', '.com', '.scr', '.pif', '.vbs', '.js', '.jar', '.php', '.asp', '.jsp',
            '.sh', '.ps1', '.py', '.rb', '.pl', '.cgi', '.htaccess', '.htpasswd'
        ]
        
        if not file.filename:
            raise HTTPException(status_code=400, detail="No file provided")
        
        # Security: Check for dangerous file patterns
        filename_lower = file.filename.lower()
        for pattern in DANGEROUS_PATTERNS:
            if pattern in filename_lower:
                security_logger.warning("Blocked dangerous file pattern", pattern=pattern, filename=file.filename, doctor_id=current_user.id)
                raise HTTPException(
                    status_code=400, 
                    detail="Tipo de archivo no permitido por seguridad"
                )
        
        # Security: Check for double extensions (e.g., malware.exe.docx)
        # Only block if the file has multiple extensions AND one of them is dangerous
        if filename_lower.count('.') > 1:
            # Check if any of the extensions (except the last one) is dangerous
            parts = filename_lower.split('.')
            for i in range(len(parts) - 1):  # Check all parts except the last (real extension)
                potential_extension = '.' + parts[i]
                if potential_extension in DANGEROUS_PATTERNS:
                    security_logger.warning("Blocked file with dangerous hidden extension", filename=file.filename, doctor_id=current_user.id)
                    raise HTTPException(
                        status_code=400, 
                        detail="Archivo con extensión oculta peligrosa no permitido"
                    )
        
        file_extension = os.path.splitext(file.filename)[1].lower()
        if file_extension not in ALLOWED_EXTENSIONS:
            valid_formats = ', '.join(sorted(ALLOWED_EXTENSIONS))
            error_message = f"Formato de archivo no permitido. Solo se aceptan: {valid_formats}"
            api_logger.warning("File format error", extension=file_extension, filename=file.filename, doctor_id=current_user.id)
            raise HTTPException(
                status_code=400, 
                detail=error_message
            )
        
        if file.content_type and file.content_type not in ALLOWED_MIME_TYPES:
            error_message = f"Tipo de archivo no permitido. Solo se aceptan: PDF, JPG, PNG"
            api_logger.warning("MIME type error", content_type=file.content_type, filename=file.filename, doctor_id=current_user.id)
            raise HTTPException(
                status_code=400, 
                detail=error_message
            )
        
        # Find the study and verify access
        study = db.query(ClinicalStudy).filter(
            ClinicalStudy.id == study_id,
            ClinicalStudy.created_by == current_user.id
        ).first()
        
        if not study:
            raise HTTPException(status_code=404, detail="Clinical study not found or no access")
        
        # Security: Check file size before processing
        content = await file.read()
        if len(content) > MAX_FILE_SIZE:
            security_logger.warning("File too large", size=len(content), max_size=MAX_FILE_SIZE, filename=file.filename, doctor_id=current_user.id)
            raise HTTPException(
                status_code=400, 
                detail=f"Archivo demasiado grande. Tamaño máximo permitido: {MAX_FILE_SIZE // (1024*1024)}MB"
            )
        
        # Security: Additional content validation
        if len(content) == 0:
            raise HTTPException(status_code=400, detail="Archivo vacío no permitido")
        
        # Get storage service (S3 in production, local in development)
        storage = get_storage_service()
        
        # Delete old file if it exists (prevent orphaned files)
        if study.file_path:
            try:
                storage.delete(study.file_path)
                api_logger.info("Deleted old file for clinical study before upload", study_id=study_id, file_path=study.file_path)
            except Exception as e:
                api_logger.warning("Failed to delete old file for clinical study", study_id=study_id, file_path=study.file_path, error=str(e))

        # Generate storage key and upload file
        storage_key = generate_storage_key("clinical_studies", file.filename)
        storage.upload(content, storage_key, content_type=file.content_type)
        
        # Update study with file information
        # file_path now stores the storage key (works for both local and S3)
        study.file_name = file.filename
        study.file_path = storage_key
        study.file_type = file.content_type
        study.file_size = len(content)
        # Automatically set status to 'completed' when file is uploaded
        study.status = 'completed'
        # Get current time in Mexico City timezone and convert to UTC for storage
        mexico_time = now_cdmx()
        utc_time = mexico_time.astimezone(pytz.UTC).replace(tzinfo=None)
        # Set performed_date when file is uploaded
        study.performed_date = utc_time
        # results_date removed - column does not exist in clinical_studies table
        # study.results_date = utc_time  # Store as UTC but represent Mexico time
        study.updated_at = utc_now()
        
        
        db.commit()
        db.refresh(study)
        
        api_logger.info("File uploaded successfully for study", study_id=study_id, filename=file.filename, size=len(content))
        
        return {
            "message": "File uploaded successfully",
            "study_id": study_id,
            "file_name": file.filename,
            "file_size": len(content)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        api_logger.error("Error uploading file for study", study_id=study_id, error=str(e), exc_info=True)
        db.rollback()
        raise HTTPException(status_code=500, detail="Error uploading file")


@router.get("/clinical-studies/{study_id}/file")
async def get_clinical_study_file(
    study_id: int,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Download/view a clinical study file"""
    api_logger.debug("Getting file for clinical study", study_id=study_id, doctor_id=current_user.id)
    
    try:
        # Find the study and verify access
        study = db.query(ClinicalStudy).filter(
            ClinicalStudy.id == study_id,
            ClinicalStudy.created_by == current_user.id
        ).first()
        
        if not study:
            raise HTTPException(status_code=404, detail="Clinical study not found or no access")
        
        if not study.file_path:
            raise HTTPException(status_code=404, detail="No file associated with this study")
        
        # Get storage service
        storage = get_storage_service()
        
        # Check if file exists
        if not storage.exists(study.file_path):
            raise HTTPException(status_code=404, detail="File not found on server")
        
        api_logger.info(
            "Serving clinical study file",
            study_id=study_id,
            doctor_id=current_user.id,
            file_name=study.file_name
        )
        
        # For S3 storage, redirect to presigned URL
        presigned_url = storage.get_url(study.file_path, expires_in=3600)
        if presigned_url:
            return RedirectResponse(url=presigned_url, status_code=302)
        
        # For local storage, serve file directly
        if isinstance(storage, LocalStorageService):
            full_path = storage.get_full_path(study.file_path)
            return FileResponse(
                path=full_path,
                filename=study.file_name,
                media_type=study.file_type or 'application/octet-stream'
            )
        
        # Fallback: stream file content
        content = storage.download(study.file_path)
        if content is None:
            raise HTTPException(status_code=404, detail="File not found on server")
        
        return StreamingResponse(
            io.BytesIO(content),
            media_type=study.file_type or 'application/octet-stream',
            headers={
                "Content-Disposition": f'attachment; filename="{study.file_name}"'
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        api_logger.error("Error getting file for study", study_id=study_id, error=str(e), exc_info=True)
        raise HTTPException(status_code=500, detail="Error retrieving file")


@router.get("/study-categories")
async def get_study_categories(
    skip: int = Query(0),
    limit: int = Query(100),
    db: Session = Depends(get_db)
):
    """Get all study categories"""
    try:
        categories = crud.get_study_categories(db, skip=skip, limit=limit)
        return [schemas.StudyCategory.model_validate(category) for category in categories]
    except Exception as e:
        api_logger.error("Error in get_study_categories", error=str(e), exc_info=True)
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@router.get("/study-catalog")
async def get_study_catalog(
    skip: int = Query(0),
    limit: int = Query(100),
    category_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Get studies from catalog with filters"""
    try:
        studies = crud.get_study_catalog(
            db, 
            skip=skip, 
            limit=limit,
            category_id=category_id,
            search=search
        )
        return [schemas.StudyCatalog.model_validate(study) for study in studies]
    except Exception as e:
        api_logger.error("Error in get_study_catalog", error=str(e), exc_info=True)
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@router.get("/study-recommendations")
async def get_study_recommendations(
    diagnosis: Optional[str] = None,
    specialty: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Get study recommendations based on diagnosis and specialty"""
    try:
        studies = crud.get_study_recommendations(db, diagnosis=diagnosis, specialty=specialty)
        return [schemas.StudyCatalog.model_validate(study) for study in studies]
    except Exception as e:
        api_logger.error("❌ Error in get_study_recommendations", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@router.get("/study-search")
async def search_studies(
    q: str,
    category_id: Optional[int] = None,
    specialty: Optional[str] = None,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Search studies with advanced filters"""
    try:
        studies = crud.search_studies(
            db,
            search_term=q,
            category_id=category_id,
            specialty=specialty,
            limit=limit
        )
        return [schemas.StudyCatalog.model_validate(study) for study in studies]
    except Exception as e:
        api_logger.error("❌ Error in search_studies", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


