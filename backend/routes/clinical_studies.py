"""
Clinical studies management endpoints
Migrated from main_clean_english.py to improve code organization
"""

from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
import os
import uuid
import pytz

from database import get_db, Person, ClinicalStudy, MedicalRecord
from dependencies import get_current_user
from logger import get_logger
import crud
import schemas

api_logger = get_logger("api")

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
    print(f"🔬 Getting clinical studies for patient: {patient_id}")
    
    try:
        # Verify patient exists and user has access
        patient = db.query(Person).filter(
            Person.id == patient_id,
            Person.person_type == "patient",
            Person.created_by == current_user.id  # Only show patients created by current user
        ).first()
        
        if not patient:
            print(f"🔬 Patient {patient_id} not found or no access")
            return []

        # Get clinical studies for this patient
        studies = db.query(ClinicalStudy).filter(
            ClinicalStudy.patient_id == patient_id,
            ClinicalStudy.created_by == current_user.id  # Only show studies created by current user
        ).order_by(ClinicalStudy.created_at.desc()).all()  # Most recent first
        
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
        
        print(f"🔬 Found {len(studies_data)} clinical studies for patient {patient_id}")
        return studies_data
        
    except Exception as e:
        print(f"❌ Error getting clinical studies for patient {patient_id}: {e}")
        return []


@router.get("/clinical-studies/consultation/{consultation_id}")
async def get_clinical_studies_by_consultation(
    consultation_id: int,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Get clinical studies for a specific consultation"""
    print(f"🔬 Getting clinical studies for consultation: {consultation_id}")
    print(f"🔬 Current user ID: {current_user.id}")
    
    try:
        # Verify consultation exists and user has access
        consultation = db.query(MedicalRecord).filter(
            MedicalRecord.id == consultation_id,
            MedicalRecord.created_by == current_user.id  # Only show consultations created by current user
    ).first()
    
        if not consultation:
            print(f"🔬 Consultation {consultation_id} not found or no access for user {current_user.id}")
            return []
    
        print(f"🔬 Consultation found: {consultation.id}")
    
        # Get clinical studies for this consultation
        studies = db.query(ClinicalStudy).filter(
            ClinicalStudy.consultation_id == consultation_id,
            ClinicalStudy.created_by == current_user.id  # Only show studies created by current user
        ).order_by(ClinicalStudy.created_at.asc()).all()
        
        print(f"🔬 Found {len(studies)} studies for consultation {consultation_id}")
        for study in studies:
            print(f"🔬 Study {study.id}: consultation_id={study.consultation_id}, created_by={study.created_by}")
        
        if len(studies) == 0:
            print(f"🔬 No studies found - checking if consultation exists and user has access")
            print(f"🔬 Consultation ID: {consultation_id}, User ID: {current_user.id}")
            # Check if there are any studies for this consultation at all
            all_studies = db.query(ClinicalStudy).filter(
                ClinicalStudy.consultation_id == consultation_id
            ).all()
            print(f"🔬 Total studies for consultation {consultation_id} (any user): {len(all_studies)}")
            for study in all_studies:
                print(f"🔬 Study {study.id}: created_by={study.created_by}")
        
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
        
        print(f"🔬 Found {len(studies_data)} clinical studies for consultation {consultation_id}")
        return studies_data
        
    except Exception as e:
        print(f"❌ Error getting clinical studies for consultation {consultation_id}: {e}")
        return []


@router.post("/clinical-studies")
async def create_clinical_study(
    study_data: dict,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Create a new clinical study"""
    print(f"🔬 Creating clinical study with data: {study_data}")
    
    try:
        # Validate required fields
        required_fields = ['consultation_id', 'patient_id', 'study_type', 'study_name', 'clinical_indication', 'ordering_doctor']
        for field in required_fields:
            if not study_data.get(field):
                raise HTTPException(status_code=400, detail=f"Field '{field}' is required")
        
        # Verify consultation exists and user has access
        consultation = db.query(MedicalRecord).filter(
            MedicalRecord.id == int(study_data['consultation_id']),
            MedicalRecord.created_by == current_user.id
        ).first()
        
        if not consultation:
            raise HTTPException(status_code=404, detail="Consultation not found or no access")
        
        # Verify patient exists and user has access
        patient = db.query(Person).filter(
            Person.id == int(study_data['patient_id']),
            Person.person_type == "patient",
            Person.created_by == current_user.id
        ).first()
        
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found or no access")
        
        # study_code column does not exist in clinical_studies table - removed
        
        # Create new clinical study
        new_study = ClinicalStudy(
            consultation_id=int(study_data['consultation_id']),
            patient_id=int(study_data['patient_id']),
            doctor_id=current_user.id,
            study_type=study_data['study_type'],
            study_name=study_data['study_name'],
            ordered_date=datetime.fromisoformat(study_data['ordered_date'].replace('Z', '+00:00')) if study_data.get('ordered_date') else datetime.utcnow(),
            performed_date=datetime.fromisoformat(study_data['performed_date'].replace('Z', '+00:00')) if study_data.get('performed_date') else None,
            # results_date removed - column does not exist in clinical_studies table
            status=study_data.get('status', 'ordered'),
            urgency=study_data.get('urgency', 'routine'),
            clinical_indication=study_data['clinical_indication'],
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
            "consultation_id": str(new_study.consultation_id),
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
        
        print(f"✅ Clinical study created successfully: {new_study.id}")
        return response_data
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error creating clinical study: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Error creating clinical study")


@router.put("/clinical-studies/{study_id}")
async def update_clinical_study(
    study_id: int,
    study_data: dict,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Update a clinical study"""
    print(f"🔬 Updating clinical study {study_id} with data: {study_data}")
    
    try:
        # Find the study and verify access
        study = db.query(ClinicalStudy).filter(
            ClinicalStudy.id == study_id,
            ClinicalStudy.created_by == current_user.id
        ).first()
        
        if not study:
            raise HTTPException(status_code=404, detail="Clinical study not found or no access")
        
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
        
        study.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(study)
        
        # Return updated study
        response_data = {
            "id": str(study.id),
            "consultation_id": str(study.consultation_id),
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
        
        print(f"✅ Clinical study updated successfully: {study.id}")
        return response_data
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error updating clinical study {study_id}: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Error updating clinical study")


@router.delete("/clinical-studies/{study_id}")
async def delete_clinical_study(
    study_id: int,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Delete a clinical study"""
    print(f"🔬 Deleting clinical study: {study_id}")
    
    try:
        # Find the study and verify access
        study = db.query(ClinicalStudy).filter(
            ClinicalStudy.id == study_id,
            ClinicalStudy.created_by == current_user.id
        ).first()
        
        if not study:
            raise HTTPException(status_code=404, detail="Clinical study not found or no access")
        
        # Delete the study
        db.delete(study)
        db.commit()
        
        print(f"✅ Clinical study deleted successfully: {study_id}")
        return {"message": "Clinical study deleted successfully", "id": study_id}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error deleting clinical study {study_id}: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Error deleting clinical study")


@router.put("/clinical-studies/{study_id}/upload")
async def upload_clinical_study_file(
    study_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Upload a file for a clinical study"""
    print(f"📤 Uploading file for clinical study: {study_id}")
    
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
                print(f"🚨 Security: Blocked dangerous file pattern: {pattern}")
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
                    print(f"🚨 Security: Blocked file with dangerous hidden extension: {file.filename}")
                    raise HTTPException(
                        status_code=400, 
                        detail="Archivo con extensión oculta peligrosa no permitido"
                    )
            
            # If it has multiple dots but no dangerous extensions, just warn but allow
            print(f"⚠️ File has multiple dots but no dangerous extensions: {file.filename}")
        
        file_extension = os.path.splitext(file.filename)[1].lower()
        print(f"📁 File extension: {file_extension}")
        print(f"📁 Allowed extensions: {ALLOWED_EXTENSIONS}")
        if file_extension not in ALLOWED_EXTENSIONS:
            valid_formats = ', '.join(sorted(ALLOWED_EXTENSIONS))
            error_message = f"Formato de archivo no permitido. Solo se aceptan: {valid_formats}"
            print(f"❌ File format error: {error_message}")
            raise HTTPException(
                status_code=400, 
                detail=error_message
            )
        
        print(f"📁 File content type: {file.content_type}")
        print(f"📁 Allowed MIME types: {ALLOWED_MIME_TYPES}")
        if file.content_type and file.content_type not in ALLOWED_MIME_TYPES:
            error_message = f"Tipo de archivo no permitido. Solo se aceptan: PDF, JPG, PNG"
            print(f"❌ MIME type error: {error_message}")
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
        
        # Create uploads directory if it doesn't exist
        upload_dir = os.path.join(os.getcwd(), "uploads", "clinical_studies")
        os.makedirs(upload_dir, exist_ok=True)
        
        # Generate unique filename using study ID (study_code column does not exist)
        file_extension = os.path.splitext(file.filename)[1]
        unique_filename = f"study_{study_id}_{uuid.uuid4()}{file_extension}"
        file_path = os.path.join(upload_dir, unique_filename)
        
        # Security: Check file size before processing
        content = await file.read()
        if len(content) > MAX_FILE_SIZE:
            print(f"🚨 Security: File too large: {len(content)} bytes (max: {MAX_FILE_SIZE})")
            raise HTTPException(
                status_code=400, 
                detail=f"Archivo demasiado grande. Tamaño máximo permitido: {MAX_FILE_SIZE // (1024*1024)}MB"
            )
        
        # Security: Additional content validation
        if len(content) == 0:
            raise HTTPException(status_code=400, detail="Archivo vacío no permitido")
        
        # Save file
        with open(file_path, "wb") as buffer:
            buffer.write(content)
        
        # Update study with file information
        study.file_name = file.filename
        study.file_path = file_path
        study.file_type = file.content_type
        study.file_size = len(content)
        # Get current time in Mexico City timezone and convert to UTC for storage
        mexico_time = now_cdmx()
        utc_time = mexico_time.astimezone(pytz.UTC).replace(tzinfo=None)
        # results_date removed - column does not exist in clinical_studies table
        # study.results_date = utc_time  # Store as UTC but represent Mexico time
        study.updated_at = datetime.utcnow()
        
        
        db.commit()
        db.refresh(study)
        
        print(f"✅ File uploaded successfully for study {study_id}: {file.filename}")
        # print(f"📅 Study results_date after commit: removed - column does not exist")
        
        return {
            "message": "File uploaded successfully",
            "study_id": study_id,
            "file_name": file.filename,
            "file_size": len(content)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error uploading file for study {study_id}: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Error uploading file")


@router.get("/clinical-studies/{study_id}/file")
async def get_clinical_study_file(
    study_id: int,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Download/view a clinical study file"""
    print(f"📥 Getting file for clinical study: {study_id}")
    
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
        
        # Check if file exists
        if not os.path.exists(study.file_path):
            raise HTTPException(status_code=404, detail="File not found on server")
        
        print(f"✅ Serving file for study {study_id}: {study.file_name}")
        
        # Return file with appropriate headers
        return FileResponse(
            path=study.file_path,
            filename=study.file_name,
            media_type=study.file_type or 'application/octet-stream'
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error getting file for study {study_id}: {e}")
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
        print(f"❌ Error in get_study_categories: {str(e)}")
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
        print(f"❌ Error in get_study_catalog: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

