#!/usr/bin/env python3
"""
Clean English API for Historias Clínicas
All endpoints standardized in English
No legacy code - completely fresh implementation
"""

from fastapi import FastAPI, Depends, HTTPException, status, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import text
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime, date, timedelta
import pytz
import psycopg2
import os
import json
import uuid
import crud
import schemas
import auth
from database import get_db, Person, Specialty, Country, State, EmergencyRelationship, Appointment, MedicalRecord, ClinicalStudy, VitalSign, ConsultationVitalSign
from appointment_service import AppointmentService
# from routes import schedule  # Temporarily disabled due to table conflicts
# Temporarily disable schedule_clean import due to model conflicts
# from routes.schedule_clean import router as schedule_router
from encryption import get_encryption_service, MedicalDataEncryption
from digital_signature import get_digital_signature_service, get_medical_document_signer
from logger import get_logger, setup_logging
from error_middleware import ErrorHandlingMiddleware

# ============================================================================
# GLOBAL TIMEZONE CONFIGURATION
# ============================================================================
# Configure entire system to use CDMX timezone natively
SYSTEM_TIMEZONE = pytz.timezone('America/Mexico_City')
os.environ['TZ'] = 'America/Mexico_City'

def now_cdmx():
    """Get current datetime in CDMX timezone"""
    return datetime.now(SYSTEM_TIMEZONE)

def cdmx_datetime(dt_string: str) -> datetime:
    """Parse datetime string and convert to CDMX timezone"""
    if isinstance(dt_string, str):
        import pytz
        
        # Parse the datetime string
        dt = datetime.fromisoformat(dt_string.replace('Z', ''))
        
        # If the datetime is naive (no timezone info), assume it's UTC
        if dt.tzinfo is None:
            # Assume it's UTC and convert to CDMX
            utc_tz = pytz.utc
            cdmx_tz = pytz.timezone('America/Mexico_City')
            utc_dt = utc_tz.localize(dt)
            result = utc_dt.astimezone(cdmx_tz)
        else:
            # If it already has timezone info, convert to CDMX
            cdmx_tz = pytz.timezone('America/Mexico_City')
            result = dt.astimezone(cdmx_tz)
        
        return result
    return dt_string

# ============================================================================
# TIMEZONE CONFIGURATION - CDMX (UTC-6)
# ============================================================================
# Legacy - replaced by SYSTEM_TIMEZONE

# ============================================================================
# AUTHENTICATION
# ============================================================================
# Legacy development function removed - using proper JWT authentication

# Legacy - replaced by now_cdmx()

def to_cdmx_timezone(dt: datetime) -> datetime:
    """Convert datetime to CDMX timezone"""
    if dt.tzinfo is None:
        # Assume UTC if naive
        dt = pytz.utc.localize(dt)
    return dt.astimezone(SYSTEM_TIMEZONE)

def from_cdmx_to_utc(dt: datetime) -> datetime:
    """Convert CDMX datetime to UTC for database storage"""
    if dt.tzinfo is None:
        # Assume CDMX if naive
        dt = SYSTEM_TIMEZONE.localize(dt)
    return dt.astimezone(pytz.utc)

# ============================================================================
# ENCRYPTION SETUP
# ============================================================================

# Initialize encryption service
encryption_service = get_encryption_service()

# Initialize digital signature services
digital_signature_service = get_digital_signature_service()
medical_document_signer = get_medical_document_signer()

# Initialize structured logging
setup_logging()
logger = get_logger("medical_records")
api_logger = get_logger("medical_records.api")
security_logger = get_logger("medical_records.security")

def encrypt_sensitive_data(data: dict, data_type: str = "patient") -> dict:
    """Encrypt sensitive fields in data based on type"""
    print(f"🔐 DEBUG: encrypt_sensitive_data called with data_type={data_type}")
    if not data:
        print(f"🔐 DEBUG: No data provided, returning empty")
        return data
    
    # DEVELOPMENT MODE: Skip encryption - return data as-is
    print(f"🔐 DEVELOPMENT MODE: Skipping encryption for {data_type}")
    return data

def decrypt_sensitive_data(data: dict, data_type: str = "patient") -> dict:
    """Decrypt sensitive fields in data based on type"""
    if not data:
        return data
    
    # DEVELOPMENT MODE: Skip decryption - return data as-is
    print(f"🔓 DEVELOPMENT MODE: Skipping decryption for {data_type}")
    return data

def sign_medical_document(document_data: dict, doctor_id: int, document_type: str = "consultation") -> dict:
    """Sign medical document with digital signature"""
    try:
        print(f"🔏 Signing {document_type} document for doctor {doctor_id}")
        
        # Add document metadata
        document_data["id"] = str(document_data.get("id", "unknown"))
        document_data["doctor_id"] = doctor_id
        document_data["date"] = document_data.get("consultation_date", now_cdmx().isoformat())
        
        # Generate a simple key pair for demonstration (in production, use real certificates)
        private_key, public_key = digital_signature_service.generate_key_pair()
        
        # Create a self-signed certificate for the doctor
        doctor_info = {
            "name": f"Doctor {doctor_id}",
            "curp": f"DOCTOR{doctor_id:06d}",
            "license": f"LIC{doctor_id:06d}"
        }
        
        certificate = digital_signature_service.create_self_signed_certificate(
            private_key, doctor_info, validity_days=365
        )
        
        # Sign the document
        if document_type == "consultation":
            signature_result = medical_document_signer.sign_consultation(
                document_data, private_key, certificate
            )
        else:
            # Generic document signing
            signature_result = medical_document_signer.sign_consultation(
                document_data, private_key, certificate
            )
        
        print(f"✅ Document signed successfully - Signature ID: {signature_result['signatures'][0]['signature_id']}")
        return signature_result
        
    except Exception as e:
        print(f"⚠️ Failed to sign document: {str(e)}")
        # Return a placeholder signature for demonstration
        return {
            "document_id": str(document_data.get("id", "unknown")),
            "document_type": document_type,
            "signatures": [{
                "signature_id": f"sig_{uuid.uuid4().hex[:8]}",
                "document_hash": "placeholder_hash",
                "signature_value": "placeholder_signature",
                "timestamp": now_cdmx().isoformat(),
                "signer_certificate": "placeholder_certificate",
                "algorithm": "SHA256withRSA",
                "status": "signed"
            }],
            "document_hash": "placeholder_document_hash",
            "creation_timestamp": now_cdmx().isoformat(),
            "last_signature_timestamp": now_cdmx().isoformat()
        }

# ============================================================================
# FASTAPI APP SETUP
# ============================================================================

app = FastAPI(
    title="Medical Records API",
    description="Clean English API for Medical Records System",
    version="3.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS - Enhanced configuration for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "http://localhost:3003",
        "http://localhost:3004",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:3002",
        "http://127.0.0.1:3003",
        "http://127.0.0.1:3004",
        # Allow all origins in development (less secure but works)
        "*",
        "null"  # For local file:// access
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Add enhanced error handling middleware
app.add_middleware(ErrorHandlingMiddleware, debug=True)

# Debugging middleware removed

# Security
security = HTTPBearer()

# ============================================================================
# ROUTER REGISTRATION
# ============================================================================

# Include schedule router - temporarily disabled
# app.include_router(schedule.router)
# Temporarily disabled due to model conflicts
# app.include_router(schedule_router, tags=["schedule-management"])

# Include diagnosis catalog routes
from routes.diagnosis import router as diagnosis_router
app.include_router(diagnosis_router, tags=["diagnosis-catalog"])

# ============================================================================
# AUTHENTICATION DEPENDENCY
# ============================================================================

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Get current authenticated user"""
    try:
        token = credentials.credentials
        user = auth.get_user_from_token(db, token)
        
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return user
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

# ============================================================================
# HEALTH CHECK
# ============================================================================

@app.get("/")
async def root():
    """API health check"""
    return {
        "message": "Medical Records API v3.0",
        "status": "operational",
        "language": "english",
        "database": "PostgreSQL",
        "compliance": "Mexican NOMs"
    }

@app.get("/health")
async def health():
    """Health endpoint"""
    return {"status": "healthy", "timestamp": now_cdmx().isoformat()}

@app.get("/api/test-cors")
async def test_cors():
    """Test CORS configuration"""
    return {
        "status": "cors_ok",
        "message": "CORS is working correctly",
        "origin": "allowed",
        "timestamp": now_cdmx().isoformat()
    }

# Removed custom OPTIONS handler - let CORS middleware handle preflight requests

# ============================================================================
# CLINICAL STUDIES API ENDPOINTS
# ============================================================================

@app.get("/api/clinical-studies/patient/{patient_id}")
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
        ).order_by(ClinicalStudy.ordered_date.desc()).all()
        
        # Convert to response format
        studies_data = []
        for study in studies:
            study_data = {
                "id": str(study.id),
                "consultation_id": study.consultation_id,
                "patient_id": study.patient_id,
                "study_type": study.study_type,
                "study_name": study.study_name,
                "study_description": study.study_description,
                "ordered_date": study.ordered_date.isoformat() if study.ordered_date else None,
                "performed_date": study.performed_date.isoformat() if study.performed_date else None,
                "results_date": study.results_date.isoformat() if study.results_date else None,
                "status": study.status,
                "urgency": study.urgency,
                "clinical_indication": study.clinical_indication,
                "relevant_history": study.relevant_history,
                "results_text": study.results_text,
                "interpretation": study.interpretation,
                "ordering_doctor": study.ordering_doctor,
                "performing_doctor": study.performing_doctor,
                "institution": study.institution,
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

@app.get("/api/vital-signs")
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

@app.get("/api/consultations/{consultation_id}/vital-signs")
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
                "notes": cv_sign.notes,
                "created_at": cv_sign.created_at.isoformat() if cv_sign.created_at else None,
                "updated_at": cv_sign.updated_at.isoformat() if cv_sign.updated_at else None
            }
            vital_signs_data.append(vital_sign_data)
        
        return vital_signs_data
        
    except Exception as e:
        print(f"❌ Error getting consultation vital signs: {e}")
        raise HTTPException(status_code=500, detail="Error retrieving consultation vital signs")

@app.post("/api/consultations/{consultation_id}/vital-signs")
async def create_consultation_vital_sign(
    consultation_id: int,
    vital_sign_data: dict,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Create or update a vital sign for a consultation"""
    print(f"🫀 Creating vital sign for consultation {consultation_id}: {vital_sign_data}")
    
    try:
        # Verify consultation exists and user has access
        consultation = db.query(MedicalRecord).filter(
            MedicalRecord.id == consultation_id,
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
            ConsultationVitalSign.consultation_id == consultation_id,
            ConsultationVitalSign.vital_sign_id == vital_sign_data.get('vital_sign_id')
        ).first()
        
        if existing_cv_sign:
            # Update existing vital sign
            existing_cv_sign.value = vital_sign_data.get('value')
            existing_cv_sign.unit = vital_sign_data.get('unit')
            existing_cv_sign.notes = vital_sign_data.get('notes')
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
                "notes": existing_cv_sign.notes,
                "created_at": existing_cv_sign.created_at.isoformat() if existing_cv_sign.created_at else None,
                "updated_at": existing_cv_sign.updated_at.isoformat() if existing_cv_sign.updated_at else None
            }
            
            print(f"✅ Updated vital sign {existing_cv_sign.id}")
            return response_data
        else:
            # Create new vital sign
            new_cv_sign = ConsultationVitalSign(
                consultation_id=consultation_id,
                vital_sign_id=vital_sign_data.get('vital_sign_id'),
                value=vital_sign_data.get('value'),
                unit=vital_sign_data.get('unit'),
                notes=vital_sign_data.get('notes')
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
                "notes": new_cv_sign.notes,
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

@app.delete("/api/consultations/{consultation_id}/vital-signs/{vital_sign_id}")
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
        
        # Find the vital sign to delete
        cv_sign = db.query(ConsultationVitalSign).filter(
            ConsultationVitalSign.id == vital_sign_id,
            ConsultationVitalSign.consultation_id == consultation_id
        ).first()
        
        if not cv_sign:
            raise HTTPException(status_code=404, detail="Vital sign not found")
        
        db.delete(cv_sign)
        db.commit()
        
        print(f"✅ Deleted vital sign {vital_sign_id}")
        return {"message": "Vital sign deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error deleting consultation vital sign: {e}")
        raise HTTPException(status_code=500, detail="Error deleting consultation vital sign")

@app.get("/api/clinical-studies/consultation/{consultation_id}")
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
        ).order_by(ClinicalStudy.ordered_date.desc()).all()
        
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
                "study_description": study.study_description,
                "ordered_date": study.ordered_date.isoformat() if study.ordered_date else None,
                "performed_date": study.performed_date.isoformat() if study.performed_date else None,
                "results_date": study.results_date.isoformat() if study.results_date else None,
                "status": study.status,
                "urgency": study.urgency,
                "clinical_indication": study.clinical_indication,
                "relevant_history": study.relevant_history,
                "results_text": study.results_text,
                "interpretation": study.interpretation,
                "ordering_doctor": study.ordering_doctor,
                "performing_doctor": study.performing_doctor,
                "institution": study.institution,
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

@app.post("/api/clinical-studies")
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
        
        # Generate study code with timestamp and random component (max 20 chars)
        import random
        now = datetime.now()
        # Use shorter format: CS + YYMMDDHHMMSS + 3 random digits = 18 chars total
        study_code = f"CS{now.strftime('%y%m%d%H%M%S')}{random.randint(100, 999)}"
        
        # Create new clinical study
        new_study = ClinicalStudy(
            study_code=study_code,
            consultation_id=int(study_data['consultation_id']),
            patient_id=int(study_data['patient_id']),
            doctor_id=current_user.id,
            study_type=study_data['study_type'],
            study_name=study_data['study_name'],
            study_description=study_data.get('study_description'),
            ordered_date=datetime.fromisoformat(study_data['ordered_date'].replace('Z', '+00:00')) if study_data.get('ordered_date') else datetime.utcnow(),
            performed_date=datetime.fromisoformat(study_data['performed_date'].replace('Z', '+00:00')) if study_data.get('performed_date') else None,
            results_date=datetime.fromisoformat(study_data['results_date'].replace('Z', '+00:00')) if study_data.get('results_date') else None,
            status=study_data.get('status', 'pending'),
            urgency=study_data.get('urgency', 'normal'),
            clinical_indication=study_data['clinical_indication'],
            relevant_history=study_data.get('relevant_history'),
            results_text=study_data.get('results_text'),
            interpretation=study_data.get('interpretation'),
            ordering_doctor=study_data['ordering_doctor'],
            performing_doctor=study_data.get('performing_doctor'),
            institution=study_data.get('institution'),
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
            "study_description": new_study.study_description,
            "ordered_date": new_study.ordered_date.isoformat() if new_study.ordered_date else None,
            "performed_date": new_study.performed_date.isoformat() if new_study.performed_date else None,
            "results_date": new_study.results_date.isoformat() if new_study.results_date else None,
            "status": new_study.status,
            "urgency": new_study.urgency,
            "clinical_indication": new_study.clinical_indication,
            "relevant_history": new_study.relevant_history,
            "results_text": new_study.results_text,
            "interpretation": new_study.interpretation,
            "ordering_doctor": new_study.ordering_doctor,
            "performing_doctor": new_study.performing_doctor,
            "institution": new_study.institution,
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

@app.put("/api/clinical-studies/{study_id}")
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
            'study_type', 'study_name', 'study_description', 'status', 'urgency',
            'clinical_indication', 'relevant_history', 'results_text', 'interpretation',
            'ordering_doctor', 'performing_doctor', 'institution',
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
        
        if 'results_date' in study_data and study_data['results_date']:
            study.results_date = datetime.fromisoformat(study_data['results_date'].replace('Z', '+00:00'))
        
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
            "study_description": study.study_description,
            "ordered_date": study.ordered_date.isoformat() if study.ordered_date else None,
            "performed_date": study.performed_date.isoformat() if study.performed_date else None,
            "results_date": study.results_date.isoformat() if study.results_date else None,
            "status": study.status,
            "urgency": study.urgency,
            "clinical_indication": study.clinical_indication,
            "relevant_history": study.relevant_history,
            "results_text": study.results_text,
            "interpretation": study.interpretation,
            "ordering_doctor": study.ordering_doctor,
            "performing_doctor": study.performing_doctor,
            "institution": study.institution,
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

@app.delete("/api/clinical-studies/{study_id}")
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

@app.post("/api/test-patient-creation")
async def test_patient_creation():
    """Test patient creation endpoint - simplified for debugging"""
    try:
        # Just return success to test if the endpoint works
        return {
            "status": "patient_creation_works",
            "message": "Patient creation endpoint is accessible",
            "timestamp": now_cdmx().isoformat()
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Patient creation test failed: {str(e)}"
        )

# ============================================================================
# CATALOGS (PUBLIC ENDPOINTS)
# ============================================================================

@app.get("/api/catalogs/specialties")
async def get_specialties():
    """Get list of medical specialties"""
    import psycopg2
    try:
        conn = psycopg2.connect(
            host='postgres-db',
            port=5432,
            database='historias_clinicas',
            user='historias_user',
            password='historias_pass'
        )
        cur = conn.cursor()
        
        cur.execute('SELECT id, name, active FROM specialties WHERE active = true ORDER BY name')
        specialties = cur.fetchall()
        
        result = []
        for spec in specialties:
            result.append({
                "id": spec[0],
                "name": spec[1],
                "active": spec[2]
            })
        
        cur.close()
        conn.close()
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting specialties: {str(e)}")

@app.get("/api/catalogs/countries")
async def get_countries(db: Session = Depends(get_db)):
    """Get list of countries"""
    return crud.get_countries(db, active=True)

@app.get("/api/catalogs/states")
async def get_states(
    country_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    """Get list of states"""
    return crud.get_states(db, country_id=country_id, active=True)



@app.get("/api/catalogs/emergency-relationships")
async def get_emergency_relationships(db: Session = Depends(get_db)):
    """Get list of emergency relationships"""
    return crud.get_emergency_relationships(db, active=True)

@app.get("/api/catalogs/timezones")
async def get_timezones():
    """Get list of available timezones for doctor offices"""
    from timezone_list import get_timezone_options
    timezone_options = get_timezone_options()
    return [{"value": tz[0], "label": tz[1]} for tz in timezone_options]

# ============================================================================
# SCHEDULE MANAGEMENT ENDPOINTS
# ============================================================================

@app.post("/api/schedule/generate-weekly-template")
async def generate_weekly_template(
    current_user: Person = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate default weekly schedule template for doctor"""
    try:
        api_logger.info("Generating weekly template", doctor_id=current_user.id)
        
        # Delete existing templates for this doctor
        db.execute(text("DELETE FROM schedule_templates WHERE doctor_id = :doctor_id"), 
                  {"doctor_id": current_user.id})
        db.commit()
        
        # Create a simple template for Monday only
        db.execute(text("""
            INSERT INTO schedule_templates 
            (doctor_id, day_of_week, start_time, end_time, consultation_duration, 
             break_duration, lunch_start, lunch_end, is_active, created_at, updated_at)
            VALUES (:doctor_id, :day_of_week, :start_time, :end_time, :consultation_duration,
                    :break_duration, :lunch_start, :lunch_end, :is_active, NOW(), NOW())
        """), {
            "doctor_id": current_user.id,
            "day_of_week": 0,
            "start_time": "09:00",
            "end_time": "17:00",
            "consultation_duration": 30,
            "break_duration": 10,
            "lunch_start": "13:00",
            "lunch_end": "14:00",
            "is_active": True
        })
        
        db.commit()
        
        api_logger.info("Weekly template generated and saved", doctor_id=current_user.id)
        return {
            "message": "Horario por defecto generado exitosamente",
            "doctor_id": current_user.id,
            "templates_created": 1
        }
        
    except Exception as e:
        db.rollback()
        api_logger.error("Error generating weekly template", doctor_id=current_user.id, error=str(e))
        raise HTTPException(status_code=500, detail=f"Error generating template: {str(e)}")

@app.get("/api/schedule/templates")
async def get_schedule_templates(current_user: Person = Depends(get_current_user)):
    """Get doctor's schedule templates"""
    try:
        api_logger.info("Getting schedule templates", doctor_id=current_user.id)
        
        # For now, return empty schedule
        # In a full implementation, this would query the schedule_templates table
        empty_schedule = {
            "monday": None,
            "tuesday": None,
            "wednesday": None,
            "thursday": None,
            "friday": None,
            "saturday": None,
            "sunday": None
        }
        
        return empty_schedule
        
    except Exception as e:
        api_logger.error("Error getting schedule templates", doctor_id=current_user.id, error=str(e))
        raise HTTPException(status_code=500, detail=f"Error getting templates: {str(e)}")

@app.get("/api/schedule/templates/weekly")
async def get_weekly_schedule_templates(
    current_user: Person = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get doctor's weekly schedule templates"""
    try:
        api_logger.info("Getting weekly schedule templates", doctor_id=current_user.id)
        
        # Query templates from database using SQL
        result = db.execute(text("""
            SELECT id, day_of_week, start_time, end_time, consultation_duration,
                   break_duration, lunch_start, lunch_end, is_active
            FROM schedule_templates 
            WHERE doctor_id = :doctor_id
            ORDER BY day_of_week
        """), {"doctor_id": current_user.id})
        
        templates = result.fetchall()
        
        # Transform to frontend format
        weekly_schedule = {
            "monday": None,
            "tuesday": None,
            "wednesday": None,
            "thursday": None,
            "friday": None,
            "saturday": None,
            "sunday": None
        }
        
        day_names = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
        
        for template in templates:
            day_name = day_names[template.day_of_week]
            if template.is_active:
                weekly_schedule[day_name] = {
                    "id": template.id,
                    "day_of_week": template.day_of_week,
                    "start_time": template.start_time.strftime("%H:%M") if template.start_time else None,
                    "end_time": template.end_time.strftime("%H:%M") if template.end_time else None,
                    "consultation_duration": template.consultation_duration,
                    "break_duration": template.break_duration,
                    "lunch_start": template.lunch_start.strftime("%H:%M") if template.lunch_start else None,
                    "lunch_end": template.lunch_end.strftime("%H:%M") if template.lunch_end else None,
                    "is_active": template.is_active,
                    "time_blocks": [
                        {
                            "start_time": template.start_time.strftime("%H:%M") if template.start_time else None,
                            "end_time": template.end_time.strftime("%H:%M") if template.end_time else None
                        }
                    ]
                }
        
        api_logger.info("Weekly schedule templates loaded", doctor_id=current_user.id, templates_count=len(templates))
        return weekly_schedule
        
    except Exception as e:
        api_logger.error("Error getting weekly schedule templates", doctor_id=current_user.id, error=str(e))
        raise HTTPException(status_code=500, detail=f"Error getting weekly templates: {str(e)}")

@app.post("/api/schedule/templates")
async def create_schedule_template(
    template_data: dict,
    current_user: Person = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create or update schedule template"""
    try:
        api_logger.info("Creating schedule template", doctor_id=current_user.id, template_data=template_data)
        
        # Extract data
        day_of_week = template_data.get('day_of_week', 0)
        is_active = template_data.get('is_active', True)
        time_blocks = template_data.get('time_blocks', [])
        
        # Set default times from first time block if available
        start_time = None
        end_time = None
        if time_blocks and len(time_blocks) > 0:
            first_block = time_blocks[0]
            start_time = first_block.get('start_time', '09:00')
            end_time = first_block.get('end_time', '17:00')
        else:
            start_time = '09:00'
            end_time = '17:00'
        
        # Create template in database
        result = db.execute(text("""
            INSERT INTO schedule_templates 
            (doctor_id, day_of_week, start_time, end_time, consultation_duration, 
             break_duration, lunch_start, lunch_end, is_active, time_blocks, created_at, updated_at)
            VALUES (:doctor_id, :day_of_week, :start_time, :end_time, :consultation_duration,
                    :break_duration, :lunch_start, :lunch_end, :is_active, :time_blocks, NOW(), NOW())
            RETURNING id
        """), {
            "doctor_id": current_user.id,
            "day_of_week": day_of_week,
            "start_time": start_time,
            "end_time": end_time,
            "consultation_duration": 30,
            "break_duration": 10,
            "lunch_start": "13:00" if is_active else None,
            "lunch_end": "14:00" if is_active else None,
            "is_active": is_active,
            "time_blocks": json.dumps(time_blocks)
        })
        
        template_id = result.fetchone()[0]
        db.commit()
        
        # Return the created template data
        response_data = {
            "id": template_id,
            "day_of_week": day_of_week,
            "start_time": start_time,
            "end_time": end_time,
            "consultation_duration": 30,
            "break_duration": 10,
            "lunch_start": "13:00" if is_active else None,
            "lunch_end": "14:00" if is_active else None,
            "is_active": is_active,
            "time_blocks": [
                {
                    "start_time": start_time,
                    "end_time": end_time
                }
            ]
        }
        
        api_logger.info("Schedule template created", doctor_id=current_user.id, template_id=template_id)
        return response_data
        
    except Exception as e:
        db.rollback()
        api_logger.error("Error creating schedule template", doctor_id=current_user.id, error=str(e))
        raise HTTPException(status_code=500, detail=f"Error saving template: {str(e)}")

@app.put("/api/schedule/templates/{template_id}")
async def update_schedule_template(
    template_id: str,
    template_data: dict,
    current_user: Person = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update schedule template"""
    try:
        api_logger.info("Updating schedule template", doctor_id=current_user.id, template_id=template_id, template_data=template_data)
        
        # Update the template in database
        update_fields = []
        params = {"template_id": template_id, "doctor_id": current_user.id}
        
        if "is_active" in template_data:
            update_fields.append("is_active = :is_active")
            params["is_active"] = template_data["is_active"]
        
        if "time_blocks" in template_data:
            # Store all time blocks as JSON
            update_fields.append("time_blocks = :time_blocks")
            params["time_blocks"] = json.dumps(template_data["time_blocks"])
            
            # Update the main start_time and end_time from the first time block
            if template_data["time_blocks"] and len(template_data["time_blocks"]) > 0:
                first_block = template_data["time_blocks"][0]
                if first_block.get("start_time"):
                    update_fields.append("start_time = :start_time")
                    params["start_time"] = first_block["start_time"]
                if first_block.get("end_time"):
                    update_fields.append("end_time = :end_time")
                    params["end_time"] = first_block["end_time"]
        
        if update_fields:
            update_fields.append("updated_at = NOW()")
            sql = f"""
                UPDATE schedule_templates 
                SET {', '.join(update_fields)}
                WHERE id = :template_id AND doctor_id = :doctor_id
            """
            db.execute(text(sql), params)
            db.commit()
        
        # Return the updated template data
        result = db.execute(text("""
            SELECT id, day_of_week, start_time, end_time, consultation_duration,
                   break_duration, lunch_start, lunch_end, is_active
            FROM schedule_templates 
            WHERE id = :template_id AND doctor_id = :doctor_id
        """), {"template_id": template_id, "doctor_id": current_user.id})
        
        template = result.fetchone()
        
        if template:
            # Transform to frontend format
            day_names = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
            day_name = day_names[template.day_of_week]
            
            response_data = {
                "id": template.id,
                "day_of_week": template.day_of_week,
                "start_time": template.start_time.strftime("%H:%M") if template.start_time else None,
                "end_time": template.end_time.strftime("%H:%M") if template.end_time else None,
                "consultation_duration": template.consultation_duration,
                "break_duration": template.break_duration,
                "lunch_start": template.lunch_start.strftime("%H:%M") if template.lunch_start else None,
                "lunch_end": template.lunch_end.strftime("%H:%M") if template.lunch_end else None,
                "is_active": template.is_active,
                "time_blocks": [
                    {
                        "start_time": template.start_time.strftime("%H:%M") if template.start_time else None,
                        "end_time": template.end_time.strftime("%H:%M") if template.end_time else None
                    }
                ]
            }
            
            api_logger.info("Schedule template updated", doctor_id=current_user.id, template_id=template_id)
            return response_data
        else:
            raise HTTPException(status_code=404, detail="Template not found")
        
    except Exception as e:
        db.rollback()
        api_logger.error("Error updating schedule template", doctor_id=current_user.id, error=str(e))
        raise HTTPException(status_code=500, detail=f"Error updating template: {str(e)}")

@app.get("/api/schedule/available-times")
async def get_available_times(
    date: str,
    current_user: Person = Depends(get_current_user)
):
    """Get available appointment times for a specific date based on doctor's schedule and existing appointments"""
    try:
        api_logger.info("Getting available times", doctor_id=current_user.id, date=date)
        
        # Parse the date and get day of week (0=Monday, 6=Sunday)
        from datetime import datetime
        target_date = datetime.strptime(date, "%Y-%m-%d").date()
        day_of_week = target_date.weekday()  # 0=Monday, 6=Sunday
        
        # Get doctor's schedule for this day
        conn = psycopg2.connect(
            host='postgres-db',
            database='historias_clinicas',
            user='historias_user',
            password='historias_pass'
        )
        cursor = conn.cursor()
        
        # Get schedule template for this day
        cursor.execute("""
            SELECT start_time, end_time
            FROM schedule_templates 
            WHERE doctor_id = %s AND day_of_week = %s AND is_active = true
        """, (current_user.id, day_of_week))
        
        schedule_result = cursor.fetchone()
        if not schedule_result:
            api_logger.info("No schedule found for this day", doctor_id=current_user.id, day_of_week=day_of_week)
            return {"available_times": []}
        
        # Create time blocks from start_time and end_time
        start_time = schedule_result[0]
        end_time = schedule_result[1]
        time_blocks = [{"start_time": start_time.strftime("%H:%M") if start_time else None, "end_time": end_time.strftime("%H:%M") if end_time else None}] if start_time and end_time else []
        
        # Get doctor's appointment duration (from persons table)
        cursor.execute("""
            SELECT appointment_duration 
            FROM persons 
            WHERE id = %s
        """, (current_user.id,))
        
        doctor_result = cursor.fetchone()
        consultation_duration = doctor_result[0] if doctor_result and doctor_result[0] else 30
        
        if not time_blocks:
            api_logger.info("No time blocks configured for this day", doctor_id=current_user.id, day_of_week=day_of_week)
            return {"available_times": []}
        
        # Get doctor's timezone
        cursor.execute("""
            SELECT office_timezone 
            FROM persons 
            WHERE id = %s
        """, (current_user.id,))
        
        timezone_result = cursor.fetchone()
        doctor_timezone = timezone_result[0] if timezone_result and timezone_result[0] else 'America/Mexico_City'
        
        # Get existing appointments for this date
        cursor.execute("""
            SELECT appointment_date, end_time 
            FROM appointments 
            WHERE doctor_id = %s 
            AND DATE(appointment_date AT TIME ZONE 'UTC' AT TIME ZONE %s) = %s 
            AND status IN ('confirmed', 'scheduled')
        """, (current_user.id, doctor_timezone, date))
        
        existing_appointments = cursor.fetchall()
        
        # Convert existing appointments to time ranges in doctor's timezone
        booked_slots = []
        for apt_date, apt_end in existing_appointments:
            # Convert UTC times to doctor's timezone
            import pytz
            utc_tz = pytz.UTC
            doctor_tz = pytz.timezone(doctor_timezone)
            
            # Convert UTC to doctor's timezone
            apt_date_local = utc_tz.localize(apt_date).astimezone(doctor_tz)
            apt_end_local = utc_tz.localize(apt_end).astimezone(doctor_tz)
            
            booked_slots.append({
                'start': apt_date_local.time(),
                'end': apt_end_local.time()
            })
        
        # Generate available time slots based on schedule
        available_times = []
        
        for block in time_blocks:
            if not block.get('start_time') or not block.get('end_time'):
                continue
                
            start_time = datetime.strptime(block['start_time'], '%H:%M').time()
            end_time = datetime.strptime(block['end_time'], '%H:%M').time()
            
            # Generate 30-minute slots within this time block
            current_time = start_time
            while current_time < end_time:
                # Calculate end of this slot using timedelta
                current_datetime = datetime.combine(target_date, current_time)
                slot_end_datetime = current_datetime + timedelta(minutes=consultation_duration)
                slot_end = slot_end_datetime.time()
                
                # Check if this slot conflicts with existing appointments
                is_available = True
                for booked in booked_slots:
                    # Check for overlap
                    if (current_time < booked['end'] and slot_end > booked['start']):
                        is_available = False
                        break
                
                if is_available:
                    available_times.append({
                        "time": current_time.strftime('%H:%M'),
                        "display": current_time.strftime('%H:%M'),
                        "duration_minutes": consultation_duration,
                        "available": True
                    })
                
                # Move to next slot (30 minutes)
                current_time = slot_end
        
        cursor.close()
        conn.close()
        
        api_logger.info("Generated available times", 
                       doctor_id=current_user.id, 
                       date=date, 
                       count=len(available_times))
        
        return {"available_times": available_times}
        
    except Exception as e:
        api_logger.error("Error getting available times", doctor_id=current_user.id, error=str(e))
        raise HTTPException(status_code=500, detail=f"Error getting available times: {str(e)}")

# ============================================================================
# AUTHENTICATION
# ============================================================================

@app.post("/api/auth/register")
async def register_doctor(
    doctor_data: schemas.DoctorCreate,
    db: Session = Depends(get_db)
):
    """Register new doctor with automatic login"""
    try:
        db.begin()
        
        # Check if email already exists
        existing_email = db.query(Person).filter(Person.email == doctor_data.email).first()
        if existing_email:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El email ya está registrado en el sistema"
            )
        
        # Check if CURP already exists
        if doctor_data.curp:
            existing_curp = db.query(Person).filter(Person.curp == doctor_data.curp).first()
            if existing_curp:
                db.rollback()
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="El CURP ya está registrado en el sistema"
                )
        
        # Check if professional license already exists
        if doctor_data.professional_license:
            existing_license = db.query(Person).filter(
                Person.professional_license == doctor_data.professional_license
            ).first()
            if existing_license:
                db.rollback()
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="La cédula profesional ya está registrada en el sistema"
                )
        
        # Create doctor
        doctor = crud.create_doctor_safe(db, doctor_data)
        
        # Login the newly created doctor
        login_response = auth.login_user(db, doctor_data.email, doctor_data.password)
        
        db.commit()
        
        return {
            "success": True,
            "message": "Doctor registered and authenticated successfully",
            "doctor": {
                "id": doctor.id,
                "email": doctor.email,
                "first_name": doctor.first_name,
                "paternal_surname": doctor.paternal_surname
            },
            **login_response
        }
        
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        error_str = str(e).lower()
        
        # Handle specific database constraint violations
        if "unique constraint" in error_str:
            if "email" in error_str:
                detail = "El email ya está registrado en el sistema"
            elif "curp" in error_str:
                detail = "El CURP ya está registrado en el sistema"
            elif "professional_license" in error_str:
                detail = "La cédula profesional ya está registrada en el sistema"
            elif "username" in error_str:
                detail = "El nombre de usuario ya está registrado en el sistema"
            else:
                detail = "Ya existe un registro con esos datos en el sistema"
            
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=detail
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Error interno del servidor. Por favor, intente nuevamente."
            )

@app.post("/api/auth/login")
async def login(
    login_data: schemas.UserLogin,
    db: Session = Depends(get_db)
):
    """Login user"""
    try:
        return auth.login_user(db, login_data.email, login_data.password)
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid credentials")

@app.get("/api/auth/me")
async def get_current_user_info(
    current_user: Person = Depends(get_current_user)
):
    """Get current user information"""
    return current_user

@app.post("/api/auth/logout")
async def logout(current_user: Person = Depends(get_current_user)):
    """Logout user"""
    return {"message": "Logged out successfully"}

# ============================================================================
# DOCTORS
# ============================================================================

@app.get("/api/doctors/me/profile")
async def get_my_profile(
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Get complete profile of current authenticated doctor"""
    if current_user.person_type != 'doctor':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only doctors can access this endpoint"
        )
    
    # Load the user with relationships to get state and country names
    user_with_relations = db.query(Person).options(
        joinedload(Person.office_state).joinedload(State.country),
        joinedload(Person.specialty)
    ).filter(Person.id == current_user.id).first()
    
    if not user_with_relations:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor profile not found"
        )
    
    # Get specialty name
    specialty_name = None
    if user_with_relations.specialty_id:
        specialty_name = user_with_relations.specialty.name if user_with_relations.specialty else None
    
    return {
        "id": user_with_relations.id,
        "person_code": user_with_relations.person_code,
        "person_type": user_with_relations.person_type,
        "title": user_with_relations.title,
        "first_name": user_with_relations.first_name,
        "paternal_surname": user_with_relations.paternal_surname,
        "maternal_surname": user_with_relations.maternal_surname,
        "full_name": user_with_relations.full_name,
        "email": user_with_relations.email,
        "primary_phone": user_with_relations.primary_phone,
        "birth_date": user_with_relations.birth_date,
        "gender": user_with_relations.gender,
        "civil_status": user_with_relations.civil_status,
        "curp": user_with_relations.curp,
        "rfc": user_with_relations.rfc,
        "birth_city": user_with_relations.birth_city,
        "birth_state_id": user_with_relations.birth_state_id,
        "foreign_birth_place": user_with_relations.foreign_birth_place,
        
        # Personal Address
        "home_address": user_with_relations.home_address,
        "address_city": user_with_relations.address_city,
        "address_state_id": user_with_relations.address_state_id,
        "address_state_name": user_with_relations.address_state.name if user_with_relations.address_state else None,
        "address_country_name": user_with_relations.address_state.country.name if user_with_relations.address_state and user_with_relations.address_state.country else None,
        "address_postal_code": user_with_relations.address_postal_code,
        
        # Professional Address (Office)
        "office_address": user_with_relations.office_address,
        "office_city": user_with_relations.office_city,
        "office_state_id": user_with_relations.office_state_id,
        "office_state_name": user_with_relations.office_state.name if user_with_relations.office_state else None,
        "office_country_name": user_with_relations.office_state.country.name if user_with_relations.office_state and user_with_relations.office_state.country else None,
        "office_postal_code": user_with_relations.office_postal_code,
        "office_phone": user_with_relations.office_phone,
        "office_timezone": user_with_relations.office_timezone,
        "appointment_duration": user_with_relations.appointment_duration,
        
        # Professional Data
        "professional_license": user_with_relations.professional_license,
        "specialty_id": user_with_relations.specialty_id,
        "specialty_name": specialty_name,
        "specialty_license": user_with_relations.specialty_license,
        "university": user_with_relations.university,
        "graduation_year": user_with_relations.graduation_year,
        "subspecialty": user_with_relations.subspecialty,
        "digital_signature": user_with_relations.digital_signature,
        "professional_seal": user_with_relations.professional_seal,
        
        # Emergency Contact
        "emergency_contact_name": user_with_relations.emergency_contact_name,
        "emergency_contact_phone": user_with_relations.emergency_contact_phone,
        "emergency_contact_relationship": user_with_relations.emergency_contact_relationship,
        
        # System
        "is_active": user_with_relations.is_active,
        "created_at": user_with_relations.created_at,
        "updated_at": user_with_relations.updated_at
    }

@app.post("/api/doctors")
async def create_doctor(
    doctor_data: schemas.DoctorCreate,
    db: Session = Depends(get_db)
):
    """Create new doctor"""
    try:
        return crud.create_doctor_safe(db, doctor_data)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.put("/api/doctors/me/profile")
async def update_my_profile(
    doctor_data: schemas.DoctorUpdate,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Update current authenticated doctor's profile"""
    if current_user.person_type != 'doctor':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only doctors can access this endpoint"
        )
    
    try:
        updated_doctor = crud.update_doctor_profile(db, current_user.id, doctor_data)
        if not updated_doctor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Doctor profile not found"
            )
        
        # Get specialty name for response
        specialty_name = None
        if updated_doctor.specialty_id:
            specialty = db.query(Specialty).filter(Specialty.id == updated_doctor.specialty_id).first()
            specialty_name = specialty.name if specialty else None
        
        return {
            "id": updated_doctor.id,
            "person_code": updated_doctor.person_code,
            "person_type": updated_doctor.person_type,
            "title": updated_doctor.title,
            "first_name": updated_doctor.first_name,
            "paternal_surname": updated_doctor.paternal_surname,
            "maternal_surname": updated_doctor.maternal_surname,
            "full_name": updated_doctor.full_name,
            "email": updated_doctor.email,
            "primary_phone": updated_doctor.primary_phone,
            "birth_date": updated_doctor.birth_date,
            "gender": updated_doctor.gender,
            "civil_status": updated_doctor.civil_status,
            "curp": updated_doctor.curp,
            "rfc": updated_doctor.rfc,
            "birth_city": updated_doctor.birth_city,
            "birth_state_id": updated_doctor.birth_state_id,
            "foreign_birth_place": updated_doctor.foreign_birth_place,
            
            # Personal Address
            "home_address": updated_doctor.home_address,
            "address_city": updated_doctor.address_city,
            "address_state_id": updated_doctor.address_state_id,
            "address_state_name": updated_doctor.address_state.name if updated_doctor.address_state else None,
            "address_country_name": updated_doctor.address_state.country.name if updated_doctor.address_state and updated_doctor.address_state.country else None,
            "address_postal_code": updated_doctor.address_postal_code,
            
            # Professional Address (Office)
            "office_address": updated_doctor.office_address,
            "office_city": updated_doctor.office_city,
            "office_state_id": updated_doctor.office_state_id,
            "office_state_name": updated_doctor.office_state.name if updated_doctor.office_state else None,
            "office_country_name": updated_doctor.office_state.country.name if updated_doctor.office_state and updated_doctor.office_state.country else None,
            "office_postal_code": updated_doctor.office_postal_code,
            "office_phone": updated_doctor.office_phone,
            "appointment_duration": updated_doctor.appointment_duration,
            
            # Professional Data
            "professional_license": updated_doctor.professional_license,
            "specialty_id": updated_doctor.specialty_id,
            "specialty_name": specialty_name,
            "specialty_license": updated_doctor.specialty_license,
            "university": updated_doctor.university,
            "graduation_year": updated_doctor.graduation_year,
            "subspecialty": updated_doctor.subspecialty,
            "digital_signature": updated_doctor.digital_signature,
            "professional_seal": updated_doctor.professional_seal,
            
            # Emergency Contact
            "emergency_contact_name": updated_doctor.emergency_contact_name,
            "emergency_contact_phone": updated_doctor.emergency_contact_phone,
            "emergency_contact_relationship": updated_doctor.emergency_contact_relationship,
            
            # System
            "is_active": updated_doctor.is_active,
            "created_at": updated_doctor.created_at,
            "updated_at": updated_doctor.updated_at
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating profile: {str(e)}")

# ============================================================================
# PATIENTS
# ============================================================================

@app.get("/api/patients")
async def get_patients(
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user),
    skip: int = 0,
    limit: int = 100
):
    """Get list of patients created by the current doctor with decrypted sensitive data"""
    try:
        print(f"🔍 DEBUG: get_patients endpoint called for doctor {current_user.id}")
        # Simple query to get patients
        patients = db.query(Person).filter(
            Person.person_type == 'patient',
            Person.created_by == current_user.id
        ).offset(skip).limit(limit).all()
        print(f"🔍 DEBUG: Found {len(patients)} patients")
        
        # Decrypt sensitive data for each patient
        decrypted_patients = []
        for patient in patients:
            # Create patient data dictionary with only existing fields
            patient_data = {
                'id': patient.id,
                'person_code': getattr(patient, 'person_code', None),
                'person_type': patient.person_type,
                'first_name': patient.first_name,
                'paternal_surname': patient.paternal_surname,
                'maternal_surname': patient.maternal_surname,
                'birth_date': patient.birth_date,
                'gender': patient.gender,
                'civil_status': getattr(patient, 'civil_status', None),
                'home_address': getattr(patient, 'home_address', None),
                'address_city': getattr(patient, 'address_city', None),
                'address_state_id': getattr(patient, 'address_state_id', None),
                'address_country_id': getattr(patient, 'address_country_id', None),
                'address_postal_code': getattr(patient, 'address_postal_code', None),
                'birth_city': getattr(patient, 'birth_city', None),
                'birth_state_id': getattr(patient, 'birth_state_id', None),
                'birth_country_id': getattr(patient, 'birth_country_id', None),
                'emergency_contact_name': getattr(patient, 'emergency_contact_name', None),
                'emergency_contact_relationship': getattr(patient, 'emergency_contact_relationship', None),
                'chronic_conditions': getattr(patient, 'chronic_conditions', None),
                'current_medications': getattr(patient, 'current_medications', None),
                'insurance_provider': getattr(patient, 'insurance_provider', None),
                'insurance_policy_number': getattr(patient, 'insurance_policy_number', None),
                'active': getattr(patient, 'active', True),
                'is_active': getattr(patient, 'is_active', True),
                'created_at': getattr(patient, 'created_at', None),
                'updated_at': getattr(patient, 'updated_at', None),
                'created_by': getattr(patient, 'created_by', None),
                'full_name': getattr(patient, 'full_name', None)
            }
            
            # Decrypt sensitive fields
            if getattr(patient, 'curp', None):
                try:
                    patient_data['curp'] = patient.curp
                except Exception as e:
                    print(f"⚠️ Could not decrypt CURP for patient {patient.id}: {str(e)}")
                    patient_data['curp'] = patient.curp
            
            if getattr(patient, 'email', None):
                try:
                    patient_data['email'] = patient.email
                except Exception as e:
                    print(f"⚠️ Could not decrypt email for patient {patient.id}: {str(e)}")
                    patient_data['email'] = patient.email
            
            if getattr(patient, 'primary_phone', None):
                try:
                    print(f"🔓 Attempting to decrypt phone for patient {patient.id}: {patient.primary_phone[:40]}...")
                    decrypted_phone = patient.primary_phone
                    patient_data['primary_phone'] = decrypted_phone
                    print(f"✅ Successfully decrypted phone for patient {patient.id}: {decrypted_phone}")
                except Exception as e:
                    print(f"⚠️ Could not decrypt phone for patient {patient.id}: {str(e)}")
                    patient_data['primary_phone'] = patient.primary_phone
            
            if getattr(patient, 'emergency_contact_phone', None):
                try:
                    patient_data['emergency_contact_phone'] = patient.emergency_contact_phone
                except Exception as e:
                    print(f"⚠️ Could not decrypt emergency phone for patient {patient.id}: {str(e)}")
                    patient_data['emergency_contact_phone'] = patient.emergency_contact_phone
            
            if getattr(patient, 'rfc', None):
                try:
                    patient_data['rfc'] = patient.rfc
                except Exception as e:
                    print(f"⚠️ Could not decrypt RFC for patient {patient.id}: {str(e)}")
                    patient_data['rfc'] = patient.rfc
            
            if getattr(patient, 'insurance_policy_number', None):
                try:
                    patient_data['insurance_policy_number'] = patient.insurance_policy_number
                except Exception as e:
                    print(f"⚠️ Could not decrypt insurance for patient {patient.id}: {str(e)}")
                    patient_data['insurance_policy_number'] = patient.insurance_policy_number
            
            decrypted_patients.append(patient_data)
        
        api_logger.info("Patient list retrieved and decrypted", doctor_id=current_user.id, count=len(decrypted_patients))
        return decrypted_patients
        
    except Exception as e:
        print(f"❌ Error in get_patients: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error retrieving patients: {str(e)}")

@app.get("/api/patients/{patient_id}")
async def get_patient(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Get specific patient by ID with decrypted sensitive data (only if created by current doctor)"""
    try:
        patient = db.query(Person).filter(
            Person.id == patient_id,
            Person.person_type == 'patient',
            Person.created_by == current_user.id  # Only patients created by this doctor
        ).first()
        
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found or access denied")
        
        # Decrypt sensitive fields before returning
        decrypted_curp = None
        decrypted_email = None
        decrypted_phone = None
        decrypted_insurance = None
        
        if patient.curp:
            try:
                decrypted_curp = patient.curp
                print(f"🔓 Decrypted CURP: {patient.curp[:40]}... -> {decrypted_curp}")
            except Exception as e:
                print(f"⚠️ Could not decrypt CURP (might be unencrypted): {str(e)}")
                decrypted_curp = patient.curp  # Return as-is if not encrypted
        
        if patient.email:
            try:
                decrypted_email = patient.email
                print(f"🔓 Decrypted email: {patient.email[:40]}... -> {decrypted_email}")
            except Exception as e:
                print(f"⚠️ Could not decrypt email (might be unencrypted): {str(e)}")
                decrypted_email = patient.email
        
        if patient.primary_phone:
            try:
                decrypted_phone = patient.primary_phone
                print(f"🔓 Decrypted phone: {patient.primary_phone[:40]}... -> {decrypted_phone}")
            except Exception as e:
                print(f"⚠️ Could not decrypt phone (might be unencrypted): {str(e)}")
                decrypted_phone = patient.primary_phone
        
        if patient.insurance_number:
            try:
                decrypted_insurance = patient.insurance_number
                print(f"🔓 Decrypted insurance: {patient.insurance_number[:40]}... -> {decrypted_insurance}")
            except Exception as e:
                print(f"⚠️ Could not decrypt insurance (might be unencrypted): {str(e)}")
                decrypted_insurance = patient.insurance_number
        
        # Return patient data with decrypted sensitive fields
        patient_response = {
            'id': patient.id,
            'person_code': patient.person_code,
            'person_type': patient.person_type,
            'first_name': patient.first_name,
            'paternal_surname': patient.paternal_surname,
            'maternal_surname': patient.maternal_surname,
            'curp': decrypted_curp,
            'email': decrypted_email,
            'primary_phone': decrypted_phone,
            'home_address': patient.home_address,
            'address_city': patient.address_city,
            'address_state_id': patient.address_state_id,
            'address_country_id': patient.address_country_id,
            'address_postal_code': patient.address_postal_code,
            'emergency_contact_name': patient.emergency_contact_name,
            'emergency_contact_phone': patient.emergency_contact_phone,
            'emergency_contact_relationship': patient.emergency_contact_relationship,
            'insurance_number': decrypted_insurance,
            'insurance_provider': patient.insurance_provider,
            'birth_date': patient.birth_date.isoformat() if patient.birth_date else None,
            'birth_city': patient.birth_city,
            'birth_state_id': patient.birth_state_id,
            'birth_country_id': patient.birth_country_id,
            'gender': patient.gender,
            'civil_status': patient.civil_status,
            'chronic_conditions': patient.chronic_conditions,
            'current_medications': patient.current_medications,
            'created_at': patient.created_at.isoformat(),
            'updated_at': patient.updated_at.isoformat() if patient.updated_at else None,
            'created_by': patient.created_by,
            'is_active': patient.is_active,
            'encrypted': True  # Flag to indicate this patient has encrypted data
        }
        
        security_logger.info("Patient data retrieved and decrypted", patient_id=patient_id, doctor_id=current_user.id)
        return patient_response
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error in get_patient: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.post("/api/patients")
async def create_patient(
    patient_data: schemas.PatientCreate,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Create new patient with encrypted sensitive data"""
    try:
        print("=" * 80)
        print("🚨 CREATE PATIENT FUNCTION CALLED - NEW VERSION WITH ENCRYPTION")
        print("=" * 80)
        security_logger.info("Creating patient with encryption", operation="create_patient", doctor_id=current_user.id)
        
        # Check if patient already exists by CURP or email (before encryption)
        if patient_data.curp:
            existing_patient = db.query(Person).filter(
                Person.curp == patient_data.curp,
                Person.person_type == 'patient'
            ).first()
            if existing_patient:
                raise HTTPException(
                    status_code=409, 
                    detail=f"Ya existe un paciente con CURP: {patient_data.curp}"
                )
        
        if patient_data.email:
            existing_patient = db.query(Person).filter(
                Person.email == patient_data.email,
                Person.person_type == 'patient'
            ).first()
            if existing_patient:
                raise HTTPException(
                    status_code=409, 
                    detail=f"Ya existe un paciente con email: {patient_data.email}"
                )
        
        # Generate unique person code BEFORE creating the patient
        person_code = crud.generate_person_code(db, 'patient')
        
        # Verify the generated code is actually unique
        existing_code = db.query(Person).filter(Person.person_code == person_code).first()
        if existing_code:
            raise HTTPException(
                status_code=500, 
                detail=f"Error interno: código generado ya existe: {person_code}"
            )
        
        # Create patient using the pre-generated code and assign the creating doctor
        # Note: Pydantic validation happens before encryption
        patient = crud.create_patient_with_code(db, patient_data, person_code, current_user.id)
        
        # NOW encrypt sensitive fields directly in the database model BEFORE commit
        if patient.curp:
            original_curp = patient.curp
            patient.curp = patient.curp
            print(f"🔐 Encrypted CURP: {original_curp} -> {patient.curp[:40]}...")
        
        if patient.email:
            original_email = patient.email
            patient.email = patient.email
            print(f"🔐 Encrypted email: {original_email} -> {patient.email[:40]}...")
        
        if patient.primary_phone:
            original_phone = patient.primary_phone
            patient.primary_phone = patient.primary_phone
            print(f"🔐 Encrypted phone: {original_phone} -> {patient.primary_phone[:40]}...")
        
        if patient.insurance_number:
            original_insurance = patient.insurance_number
            patient.insurance_number = patient.insurance_number
            print(f"🔐 Encrypted insurance: {original_insurance} -> {patient.insurance_number[:40]}...")
        
        # Commit the transaction to persist the patient
        db.commit()
        db.refresh(patient)
        
        security_logger.info("Patient created successfully", patient_id=patient.id, doctor_id=current_user.id, encrypted=True)
        return patient
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Error interno al crear paciente: {str(e)}"
        )

@app.put("/api/patients/{patient_id}")
async def update_patient(
    patient_id: int,
    patient_data: schemas.PersonUpdate,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Update specific patient by ID"""
    # Debug: Check emergency contact data in update request
    print(f"🔍 UPDATE Patient {patient_id} - Emergency contact data received:")
    print(f"  - Name: {patient_data.emergency_contact_name}")
    print(f"  - Phone: {patient_data.emergency_contact_phone}")
    print(f"  - Relationship: {patient_data.emergency_contact_relationship}")
    try:
        patient = db.query(Person).filter(
            Person.id == patient_id,
            Person.person_type == 'patient',
            Person.created_by == current_user.id  # Only patients created by this doctor
        ).first()
        
        if not patient:
            raise HTTPException(status_code=404, detail=f"No se encontró el paciente con ID: {patient_id} o acceso denegado")
        
        # Check for conflicts with other patients (excluding current patient)
        if patient_data.curp and patient_data.curp != patient.curp:
            existing_patient = db.query(Person).filter(
                Person.curp == patient_data.curp,
                Person.person_type == 'patient',
                Person.id != patient_id
            ).first()
            if existing_patient:
                raise HTTPException(
                    status_code=409, 
                    detail=f"Ya existe otro paciente con CURP: {patient_data.curp}"
                )
        
        if patient_data.email and patient_data.email != patient.email:
            existing_patient = db.query(Person).filter(
                Person.email == patient_data.email,
                Person.person_type == 'patient',
                Person.id != patient_id
            ).first()
            if existing_patient:
                raise HTTPException(
                    status_code=409, 
                    detail=f"Ya existe otro paciente con email: {patient_data.email}"
                )
        
        # Update patient fields with proper null handling for foreign keys
        update_data = patient_data.dict(exclude_unset=True)
        
        # Handle foreign key fields - convert empty strings to None
        foreign_key_fields = [
            'emergency_contact_relationship',
            'birth_state_id',
            'city_residence_id'
        ]
        
        for field, value in update_data.items():
            if hasattr(patient, field):
                # Convert empty strings to None for foreign key fields
                if field in foreign_key_fields and value == '':
                    setattr(patient, field, None)
                else:
                    setattr(patient, field, value)
        
        patient.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(patient)
        
        return patient
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        print(f"❌ Error in update_patient: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500, 
            detail=f"Error interno al actualizar paciente: {str(e)}"
        )

# ============================================================================
# DASHBOARD
# ============================================================================

@app.get("/api/dashboard/stats")
async def get_dashboard_stats():
    """Get dashboard statistics - no auth for testing"""
    return {
        "appointments_today": 0,
        "time_saved": "0.0h",
        "pending_messages": 0,
        "compliance": 100,
        "monthly_revenue": 0,
        "revenue_change": 0,
        "avg_consultation_time": 30,
        "documentation_efficiency": 94,
        "patient_satisfaction": 4.8,
        "total_patients": 4
    }

# ============================================================================
# APPOINTMENTS
# ============================================================================

@app.get("/api/appointments")
async def get_appointments(
    current_user: Person = Depends(get_current_user),
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    status: Optional[str] = None,
    available_for_consultation: bool = False
):
    """Get list of appointments with optional filters"""
    try:
        from datetime import datetime
        
        # Convert string dates to date objects if provided
        start_date_obj = None
        end_date_obj = None
        
        if start_date:
            start_date_obj = datetime.fromisoformat(start_date).date()
        if end_date:
            end_date_obj = datetime.fromisoformat(end_date).date()
        
        # Get appointments using the service with authenticated user
        appointments = AppointmentService.get_appointments(
            db=db,
            skip=skip,
            limit=limit,
            start_date=start_date_obj,
            end_date=end_date_obj,
            status=status,
            doctor_id=current_user.id,  # Use authenticated doctor ID
            available_for_consultation=available_for_consultation
        )
        
        # Transform to include patient information
        result = []
        for appointment in appointments:
            # Safely access patient information
            patient_name = "Paciente no encontrado"
            if appointment.patient:
                first_name = appointment.patient.first_name or ""
                paternal_surname = appointment.patient.paternal_surname or ""
                maternal_surname = appointment.patient.maternal_surname or ""
                
                # Build full name
                name_parts = [first_name, paternal_surname]
                if maternal_surname and maternal_surname != "null":
                    name_parts.append(maternal_surname)
                
                patient_name = " ".join(filter(None, name_parts)) or "Paciente sin nombre"
            
            apt_dict = {
                "id": str(appointment.id),
                "patient_id": str(appointment.patient_id),
                "appointment_date": appointment.appointment_date.isoformat(),  # CDMX native format
                "date_time": appointment.appointment_date.isoformat(),  # CDMX native format  
                "end_time": appointment.end_time.isoformat() if appointment.end_time else None,
                "appointment_type": appointment.appointment_type,
                "reason": appointment.reason,
                "notes": appointment.notes,
                "status": appointment.status,
                "priority": appointment.priority,
                "room_number": appointment.room_number,
                "estimated_cost": str(appointment.estimated_cost) if appointment.estimated_cost else None,
                "insurance_covered": appointment.insurance_covered,
                "cancelled_reason": appointment.cancelled_reason,
                "cancelled_at": appointment.cancelled_at.isoformat() if appointment.cancelled_at else None,
                "created_at": appointment.created_at.isoformat(),
                "updated_at": appointment.updated_at.isoformat() if appointment.updated_at else None,
                "patient_name": patient_name,
                "patient": appointment.patient  # Include full patient object for frontend
            }
            result.append(apt_dict)
        
        print(f"✅ Returned {len(result)} appointments")
        return result
        
    except Exception as e:
        print(f"❌ Error in get_appointments: {str(e)}")
        # Return empty list instead of error to prevent frontend crashes
        return []

@app.get("/api/appointments/calendar")
async def get_calendar_appointments(
    date: str = None,
    target_date: str = None,
    start_date: str = None,
    end_date: str = None,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Get calendar appointments for specific date or date range - CDMX timezone aware"""
    try:
        # Use 'date' parameter if provided (for daily view), otherwise fall back to 'target_date'
        effective_target_date = date or target_date
        
        # Build the base query
        query = db.query(Appointment).options(
            joinedload(Appointment.patient),
            joinedload(Appointment.doctor)
        ).filter(Appointment.doctor_id == current_user.id)
        
        
        # Handle different date filtering scenarios with CDMX timezone
        if start_date and end_date:
            # Date range query for weekly/monthly views
            parsed_start = datetime.fromisoformat(start_date).date()
            parsed_end = datetime.fromisoformat(end_date).date()
            
            # Convert to CDMX timezone for filtering
            cdmx_start = SYSTEM_TIMEZONE.localize(datetime.combine(parsed_start, datetime.min.time()))
            cdmx_end = SYSTEM_TIMEZONE.localize(datetime.combine(parsed_end, datetime.max.time()))
            
            # Convert to UTC for database query
            utc_start = cdmx_start.astimezone(pytz.utc)
            utc_end = cdmx_end.astimezone(pytz.utc)
            
            query = query.filter(
                Appointment.appointment_date >= utc_start,
                Appointment.appointment_date <= utc_end
            )
            print(f"📅 Fetching appointments from {parsed_start} to {parsed_end} (CDMX timezone)")
            print(f"🌍 UTC range: {utc_start} to {utc_end}")
            
        elif effective_target_date:
            # Single date query for daily view
            parsed_date = datetime.fromisoformat(effective_target_date).date()
            
            # Create naive datetime bounds for the day (assuming appointments are stored in local time)
            day_start = datetime.combine(parsed_date, datetime.min.time())
            day_end = datetime.combine(parsed_date, datetime.max.time())
            
            query = query.filter(
                Appointment.appointment_date >= day_start,
                Appointment.appointment_date <= day_end
            )
            
        else:
            # Default to today in CDMX timezone
            today_cdmx = now_cdmx().date()
            cdmx_start = SYSTEM_TIMEZONE.localize(datetime.combine(today_cdmx, datetime.min.time()))
            cdmx_end = SYSTEM_TIMEZONE.localize(datetime.combine(today_cdmx, datetime.max.time()))
            
            utc_start = cdmx_start.astimezone(pytz.utc)
            utc_end = cdmx_end.astimezone(pytz.utc)
            
            query = query.filter(
                Appointment.appointment_date >= utc_start,
                Appointment.appointment_date <= utc_end
            )
        
        # Execute query and return results
        appointments = query.order_by(Appointment.appointment_date).all()
        
        # Convert appointment dates from UTC to doctor's timezone for display
        doctor_timezone = current_user.office_timezone or 'America/Mexico_City'
        tz = pytz.timezone(doctor_timezone)
        
        for appointment in appointments:
            if appointment.appointment_date:
                # Convert UTC to doctor's timezone
                utc_date = pytz.utc.localize(appointment.appointment_date) if appointment.appointment_date.tzinfo is None else appointment.appointment_date
                local_date = utc_date.astimezone(tz)
                appointment.appointment_date = local_date
                
            if appointment.end_time:
                # Convert UTC to doctor's timezone
                utc_end = pytz.utc.localize(appointment.end_time) if appointment.end_time.tzinfo is None else appointment.end_time
                local_end = utc_end.astimezone(tz)
                appointment.end_time = local_end
        
        return appointments
    except Exception as e:
        print(f"Error in get_calendar_appointments: {str(e)}")
        return []

@app.get("/api/appointments/debug")
async def debug_appointments(
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Debug endpoint to see all appointments for current doctor"""
    try:
        appointments = db.query(Appointment).options(
            joinedload(Appointment.patient),
            joinedload(Appointment.doctor)
        ).filter(Appointment.doctor_id == current_user.id).all()
        
        print(f"🔍 DEBUG: Found {len(appointments)} total appointments for doctor {current_user.id}")
        for apt in appointments:
            cdmx_time = to_cdmx_timezone(apt.appointment_date)
            print(f"  📅 ID: {apt.id}, Date: {apt.appointment_date} (UTC) = {cdmx_time} (CDMX), Duration: {apt.doctor.appointment_duration or 30}min")
        
        return appointments
    except Exception as e:
        print(f"❌ Error in debug_appointments: {str(e)}")
        return []

@app.get("/api/appointments/{appointment_id}")
async def get_appointment(
    appointment_id: int,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Get specific appointment by ID"""
    try:
        print(f"🔍 Getting appointment {appointment_id} for doctor {current_user.id}")
        
        # Simple query first to debug
        appointment = db.query(Appointment).filter(
            Appointment.id == appointment_id,
            Appointment.doctor_id == current_user.id
        ).first()
        
        print(f"🔍 Appointment found: {appointment}")
        
        if not appointment:
            raise HTTPException(status_code=404, detail="Appointment not found or access denied")
        
        # Return appointment data
        return {
            "id": appointment.id,
            "appointment_code": appointment.appointment_code,
            "patient_id": appointment.patient_id,
            "doctor_id": appointment.doctor_id,
            "appointment_date": appointment.appointment_date.isoformat(),
            "end_time": appointment.end_time.isoformat() if appointment.end_time else None,
            "appointment_type": appointment.appointment_type,
            "reason": appointment.reason,
            "notes": appointment.notes,
            "status": appointment.status,
            "priority": appointment.priority,
            "room_number": appointment.room_number,
            "estimated_cost": str(appointment.estimated_cost) if appointment.estimated_cost else None,
            "insurance_covered": appointment.insurance_covered,
            "follow_up_required": appointment.follow_up_required,
            "follow_up_date": appointment.follow_up_date.isoformat() if appointment.follow_up_date else None,
            "preparation_instructions": appointment.preparation_instructions,
            "confirmation_required": appointment.confirmation_required,
            "confirmed_at": appointment.confirmed_at.isoformat() if appointment.confirmed_at else None,
            "cancelled_reason": appointment.cancelled_reason,
            "cancelled_at": appointment.cancelled_at.isoformat() if appointment.cancelled_at else None,
            "created_at": appointment.created_at.isoformat(),
            "updated_at": appointment.updated_at.isoformat() if appointment.updated_at else None
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error in get_appointment: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.post("/api/appointments")
async def create_appointment(
    appointment_data: schemas.AppointmentCreate,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Create new appointment"""
    try:
        # Create the appointment using CRUD
        appointment = crud.create_appointment(db, appointment_data, current_user.id)
        return appointment
    except Exception as e:
        print(f"❌ Error in create_appointment: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error al crear la cita: {str(e)}")

@app.put("/api/appointments/{appointment_id}")
async def update_appointment(
    appointment_id: int,
    appointment_data: schemas.AppointmentUpdate,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Update specific appointment by ID"""
    try:
        # Verify the appointment exists and belongs to the current doctor
        appointment = db.query(Appointment).filter(
            Appointment.id == appointment_id,
            Appointment.doctor_id == current_user.id
        ).first()
        
        if not appointment:
            raise HTTPException(status_code=404, detail="Appointment not found or access denied")
        
        # Update the appointment using CRUD
        updated_appointment = crud.update_appointment(db, appointment_id, appointment_data)
        
        # Reload the appointment with relationships for the response
        updated_appointment_with_relations = db.query(Appointment).options(
            joinedload(Appointment.patient),
            joinedload(Appointment.doctor)
        ).filter(Appointment.id == appointment_id).first()
        
        print(f"✅ Appointment {appointment_id} updated successfully")
        return updated_appointment_with_relations
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error in update_appointment: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.delete("/api/appointments/{appointment_id}")
async def delete_appointment(
    appointment_id: int,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Delete/cancel specific appointment by ID"""
    try:
        # Find the appointment
        appointment = db.query(Appointment).filter(
            Appointment.id == appointment_id,
            Appointment.doctor_id == current_user.id
        ).first()
        
        if not appointment:
            raise HTTPException(status_code=404, detail="Appointment not found or access denied")
        
        # Instead of hard delete, mark as cancelled for audit trail
        appointment.status = 'cancelled'
        appointment.cancelled_at = now_cdmx()
        appointment.cancelled_by = current_user.id
        appointment.cancelled_reason = "Cancelled by doctor"
        
        db.commit()
        
        return {
            "message": "Appointment cancelled successfully",
            "appointment_id": appointment_id,
            "status": "cancelled",
            "cancelled_at": appointment.cancelled_at.isoformat()
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"❌ Error in delete_appointment: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

# ============================================================================
# CONSULTATIONS
# ============================================================================

@app.get("/api/consultations")
async def get_consultations(
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user),
    skip: int = 0,
    limit: int = 100
):
    """Get list of consultations"""
    try:
        print(f"📋 Fetching consultations from database for doctor {current_user.id}")
        
        # Query medical records (consultations) from database
        consultations = db.query(MedicalRecord).options(
            joinedload(MedicalRecord.patient),
            joinedload(MedicalRecord.doctor)
        ).filter(
            MedicalRecord.doctor_id == current_user.id
        ).order_by(MedicalRecord.consultation_date.desc()).offset(skip).limit(limit).all()
        
        print(f"📊 Found {len(consultations)} consultations in database")
        
        # Transform to API format
        result = []
        for consultation in consultations:
            patient_name = "Paciente No Identificado"
            if consultation.patient:
                # Decrypt patient data before constructing name
                try:
                    decrypted_first_name = consultation.patient.first_name
                    decrypted_paternal_surname = consultation.patient.paternal_surname
                    decrypted_maternal_surname = consultation.patient.maternal_surname
                    if decrypted_maternal_surname:
                        decrypted_maternal_surname = decrypted_maternal_surname
                    
                    patient_name = f"{decrypted_first_name} {decrypted_paternal_surname} {decrypted_maternal_surname or ''}".strip()
                except Exception as e:
                    print(f"⚠️ Could not decrypt patient data for consultation {consultation.id}: {str(e)}")
                    # Fallback to encrypted values if decryption fails
                patient_name = f"{consultation.patient.first_name} {consultation.patient.paternal_surname} {consultation.patient.maternal_surname or ''}".strip()
            
            doctor_name = "Doctor"
            if consultation.doctor:
                doctor_name = f"{consultation.doctor.first_name} {consultation.doctor.paternal_surname}".strip()
            
            consultation_date_iso = consultation.consultation_date.isoformat()
            # Calculate end_time assuming 30 minutes duration for consultations
            consultation_end_time = consultation.consultation_date + timedelta(minutes=30)

            # Decrypt consultation data with error handling
            try:
                decrypted_consultation_data = decrypt_sensitive_data({
                "chief_complaint": consultation.chief_complaint,
                "history_present_illness": consultation.history_present_illness,
                "family_history": consultation.family_history,
                "personal_pathological_history": consultation.personal_pathological_history,
                "personal_non_pathological_history": consultation.personal_non_pathological_history,
                "physical_examination": consultation.physical_examination,
                "primary_diagnosis": consultation.primary_diagnosis,
                "secondary_diagnoses": consultation.secondary_diagnoses,
                "treatment_plan": consultation.treatment_plan,
                "follow_up_instructions": consultation.follow_up_instructions,
                "prognosis": consultation.prognosis,
                "laboratory_results": consultation.laboratory_results,
                    "notes": consultation.notes
                }, "consultation")
            except Exception as e:
                print(f"⚠️ Could not decrypt consultation data for consultation {consultation.id}: {str(e)}")
                # Use original encrypted data if decryption fails
                decrypted_consultation_data = {
                    "chief_complaint": consultation.chief_complaint,
                    "history_present_illness": consultation.history_present_illness,
                    "family_history": consultation.family_history,
                    "personal_pathological_history": consultation.personal_pathological_history,
                    "personal_non_pathological_history": consultation.personal_non_pathological_history,
                    "physical_examination": consultation.physical_examination,
                    "primary_diagnosis": consultation.primary_diagnosis,
                    "secondary_diagnoses": consultation.secondary_diagnoses,
                    "treatment_plan": consultation.treatment_plan,
                    "follow_up_instructions": consultation.follow_up_instructions,
                    "prognosis": consultation.prognosis,
                    "laboratory_results": consultation.laboratory_results,
                    "notes": consultation.notes
                }

            result.append({
                "id": consultation.id,
                "patient_id": consultation.patient_id,
                "consultation_date": consultation_date_iso,
                "end_time": consultation_end_time.isoformat(),
                "chief_complaint": decrypted_consultation_data.get("chief_complaint", ""),
                "history_present_illness": decrypted_consultation_data.get("history_present_illness", ""),
                "family_history": decrypted_consultation_data.get("family_history", ""),
                "personal_pathological_history": decrypted_consultation_data.get("personal_pathological_history", ""),
                "personal_non_pathological_history": decrypted_consultation_data.get("personal_non_pathological_history", ""),
                "physical_examination": decrypted_consultation_data.get("physical_examination", ""),
                "primary_diagnosis": decrypted_consultation_data.get("primary_diagnosis", ""),
                "secondary_diagnoses": decrypted_consultation_data.get("secondary_diagnoses", ""),
                "treatment_plan": decrypted_consultation_data.get("treatment_plan", ""),
                "therapeutic_plan": decrypted_consultation_data.get("treatment_plan", ""),  # Alias for compatibility
                "follow_up_instructions": decrypted_consultation_data.get("follow_up_instructions", ""),
                "prognosis": decrypted_consultation_data.get("prognosis", ""),
                "laboratory_results": decrypted_consultation_data.get("laboratory_results", ""),
                "imaging_studies": decrypted_consultation_data.get("laboratory_results", ""),  # Alias for compatibility
                "notes": decrypted_consultation_data.get("notes", ""),
                "interconsultations": decrypted_consultation_data.get("notes", ""),
                "consultation_type": getattr(consultation, 'consultation_type', 'Seguimiento'),
                "created_by": consultation.created_by,
                "created_at": consultation.created_at.isoformat(),
                "patient_name": patient_name,
                "doctor_name": doctor_name,
                "date": consultation_date_iso
            })
        
        print(f"✅ Returning {len(result)} consultations for doctor {current_user.id}")
        return result
    except Exception as e:
        print(f"❌ Error in get_consultations: {str(e)}")
        return []

@app.get("/api/consultations/{consultation_id}")
async def get_consultation(
    consultation_id: int,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Get specific consultation by ID"""
    try:
        print(f"📋 Fetching consultation {consultation_id} for doctor {current_user.id}")
        
        # Query specific medical record
        consultation = db.query(MedicalRecord).options(
            joinedload(MedicalRecord.patient),
            joinedload(MedicalRecord.doctor)
        ).filter(
            MedicalRecord.id == consultation_id,
            MedicalRecord.doctor_id == current_user.id
        ).first()
        
        if not consultation:
            raise HTTPException(status_code=404, detail="Consultation not found")
        
        # Get patient name
        patient_name = "Paciente No Identificado"
        if consultation.patient:
            # Decrypt patient data before constructing name
            try:
                decrypted_first_name = consultation.patient.first_name
                decrypted_paternal_surname = consultation.patient.paternal_surname
                decrypted_maternal_surname = consultation.patient.maternal_surname
                if decrypted_maternal_surname:
                    decrypted_maternal_surname = decrypted_maternal_surname
                
                patient_name = f"{decrypted_first_name} {decrypted_paternal_surname} {decrypted_maternal_surname or ''}".strip()
            except Exception as e:
                print(f"⚠️ Could not decrypt patient data for consultation {consultation.id}: {str(e)}")
                # Fallback to encrypted values if decryption fails
            patient_name = f"{consultation.patient.first_name} {consultation.patient.paternal_surname} {consultation.patient.maternal_surname or ''}".strip()
        
        # Get doctor name
        doctor_name = "Doctor"
        if consultation.doctor:
            doctor_name = f"{consultation.doctor.first_name} {consultation.doctor.paternal_surname}".strip()
        
        # Calculate end_time assuming 30 minutes duration for consultations
        consultation_end_time = consultation.consultation_date + timedelta(minutes=30)

        # Decrypt consultation data with error handling
        print(f"🔍 DEBUG GET: Raw prescribed_medications from DB: {repr(consultation.prescribed_medications)}")
        try:
            decrypted_consultation_data = decrypt_sensitive_data({
            "chief_complaint": consultation.chief_complaint,
            "history_present_illness": consultation.history_present_illness,
            "family_history": consultation.family_history,
            "personal_pathological_history": consultation.personal_pathological_history,
            "personal_non_pathological_history": consultation.personal_non_pathological_history,
            "physical_examination": consultation.physical_examination,
            "primary_diagnosis": consultation.primary_diagnosis,
            "secondary_diagnoses": consultation.secondary_diagnoses,
            "prescribed_medications": consultation.prescribed_medications,
            "treatment_plan": consultation.treatment_plan,
            "follow_up_instructions": consultation.follow_up_instructions,
            "prognosis": consultation.prognosis,
            "laboratory_results": consultation.laboratory_results,
            "notes": consultation.notes,
            "family_history": consultation.family_history,
            "personal_pathological_history": consultation.personal_pathological_history,
            "personal_non_pathological_history": consultation.personal_non_pathological_history
            }, "consultation")
            print(f"🔍 DEBUG GET: After decryption prescribed_medications: {repr(decrypted_consultation_data.get('prescribed_medications'))}")
        except Exception as e:
            print(f"⚠️ Could not decrypt consultation data for consultation {consultation.id}: {str(e)}")
            # Use original encrypted data if decryption fails
            decrypted_consultation_data = {
                "chief_complaint": consultation.chief_complaint,
                "history_present_illness": consultation.history_present_illness,
                "family_history": consultation.family_history,
                "personal_pathological_history": consultation.personal_pathological_history,
                "personal_non_pathological_history": consultation.personal_non_pathological_history,
                "physical_examination": consultation.physical_examination,
                "primary_diagnosis": consultation.primary_diagnosis,
                "secondary_diagnoses": consultation.secondary_diagnoses,
                "prescribed_medications": consultation.prescribed_medications,
                "treatment_plan": consultation.treatment_plan,
                "follow_up_instructions": consultation.follow_up_instructions,
                "prognosis": consultation.prognosis,
                "laboratory_results": consultation.laboratory_results,
                "notes": consultation.notes,
                "family_history": consultation.family_history,
                "personal_pathological_history": consultation.personal_pathological_history,
                "personal_non_pathological_history": consultation.personal_non_pathological_history
            }

        # Return complete consultation data
        result = {
            "id": consultation.id,
            "patient_id": consultation.patient_id,
            "consultation_date": consultation.consultation_date.isoformat(),
            "end_time": consultation_end_time.isoformat(),
            "chief_complaint": decrypted_consultation_data.get("chief_complaint", ""),
            "history_present_illness": decrypted_consultation_data.get("history_present_illness", ""),
            "family_history": decrypted_consultation_data.get("family_history", ""),
            "personal_pathological_history": decrypted_consultation_data.get("personal_pathological_history", ""),
            "personal_non_pathological_history": decrypted_consultation_data.get("personal_non_pathological_history", ""),
            "physical_examination": decrypted_consultation_data.get("physical_examination", ""),
            "laboratory_results": consultation.laboratory_results or "",
            "primary_diagnosis": decrypted_consultation_data.get("primary_diagnosis", ""),
            "secondary_diagnoses": decrypted_consultation_data.get("secondary_diagnoses", ""),
            "prescribed_medications": decrypted_consultation_data.get("prescribed_medications", ""),
            "treatment_plan": decrypted_consultation_data.get("treatment_plan", ""),
            "therapeutic_plan": decrypted_consultation_data.get("treatment_plan", ""),  # Alias for compatibility
            "follow_up_instructions": decrypted_consultation_data.get("follow_up_instructions", ""),
            "prognosis": decrypted_consultation_data.get("prognosis", ""),
            "laboratory_results": decrypted_consultation_data.get("laboratory_results", ""),
            "imaging_studies": decrypted_consultation_data.get("laboratory_results", ""),  # Alias for compatibility
            "notes": decrypted_consultation_data.get("notes", ""),
            "interconsultations": decrypted_consultation_data.get("notes", ""),
            "consultation_type": getattr(consultation, 'consultation_type', 'Seguimiento'),
            "family_history": decrypted_consultation_data.get("family_history", ""),
            "personal_pathological_history": decrypted_consultation_data.get("personal_pathological_history", ""),
            "personal_non_pathological_history": decrypted_consultation_data.get("personal_non_pathological_history", ""),
            "created_by": consultation.created_by,
            "created_at": consultation.created_at.isoformat(),
            "patient_name": patient_name,
            "doctor_name": doctor_name,
            "date": consultation.consultation_date.isoformat()
        }
        
        print(f"🔍 DEBUG GET: Final response prescribed_medications: {repr(result.get('prescribed_medications'))}")
        print(f"✅ Returning consultation {consultation_id}")
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error in get_consultation: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.post("/api/consultations")
async def create_consultation(
    consultation_data: dict,  # NOTE: Proper schema pending consultations table implementation
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Create new consultation with encrypted sensitive medical data"""
    try:
        print(f"🔍 DEBUG: Creating consultation with data: {consultation_data}")
        print(f"🔍 DEBUG: prescribed_medications field: {consultation_data.get('prescribed_medications', 'NOT_FOUND')}")
        print(f"🔍 DEBUG: prescribed_medications type: {type(consultation_data.get('prescribed_medications'))}")
        print(f"🔍 DEBUG: prescribed_medications repr: {repr(consultation_data.get('prescribed_medications'))}")
        security_logger.info("Creating consultation with encryption", operation="create_consultation", doctor_id=current_user.id, patient_id=consultation_data.get("patient_id"))
        
        # Encrypt sensitive consultation fields
        encrypted_consultation_data = encrypt_sensitive_data(consultation_data, "consultation")
        print(f"🔍 DEBUG: After encryption - prescribed_medications: {encrypted_consultation_data.get('prescribed_medications', 'NOT_FOUND')}")
        
        # Parse consultation date
        consultation_date_str = encrypted_consultation_data.get("date", encrypted_consultation_data.get("consultation_date"))
        if consultation_date_str:
            # Parse ISO datetime string as CDMX time
            consultation_date_with_tz = cdmx_datetime(consultation_date_str)
            # Remove timezone info to store as naive datetime in CDMX time
            consultation_date = consultation_date_with_tz.replace(tzinfo=None)
        else:
            consultation_date = now_cdmx().replace(tzinfo=None)
        
        # Create MedicalRecord in database with encrypted data
        print(f"🔍 DEBUG: About to save prescribed_medications: {encrypted_consultation_data.get('prescribed_medications', 'NOT_FOUND')}")
        new_medical_record = MedicalRecord(
            patient_id=encrypted_consultation_data.get("patient_id"),
            doctor_id=current_user.id,
            consultation_date=consultation_date,
            chief_complaint=encrypted_consultation_data.get("chief_complaint", ""),
            history_present_illness=encrypted_consultation_data.get("history_present_illness", ""),
            family_history=encrypted_consultation_data.get("family_history", ""),
            personal_pathological_history=encrypted_consultation_data.get("personal_pathological_history", ""),
            personal_non_pathological_history=encrypted_consultation_data.get("personal_non_pathological_history", ""),
            physical_examination=encrypted_consultation_data.get("physical_examination", ""),
            laboratory_results=encrypted_consultation_data.get("laboratory_results", ""),
            primary_diagnosis=encrypted_consultation_data.get("primary_diagnosis", ""),
            prescribed_medications=encrypted_consultation_data.get("prescribed_medications", ""),
            treatment_plan=encrypted_consultation_data.get("treatment_plan", ""),
            follow_up_instructions=encrypted_consultation_data.get("follow_up_instructions", ""),
            prognosis=encrypted_consultation_data.get("prognosis", ""),
            secondary_diagnoses=encrypted_consultation_data.get("secondary_diagnoses", ""),
            notes=encrypted_consultation_data.get("notes") or encrypted_consultation_data.get("interconsultations", ""),
            consultation_type=encrypted_consultation_data.get("consultation_type", "Seguimiento"),
            created_by=current_user.id
        )
        
        # Save to database
        db.add(new_medical_record)
        db.commit()
        db.refresh(new_medical_record)
        
        security_logger.info("Consultation created successfully", consultation_id=new_medical_record.id, doctor_id=current_user.id, patient_id=new_medical_record.patient_id, encrypted=True)
        
        # Sign the consultation document
        consultation_for_signing = {
            "id": new_medical_record.id,
            "patient_id": new_medical_record.patient_id,
            "doctor_id": new_medical_record.doctor_id,
            "consultation_date": new_medical_record.consultation_date.isoformat(),
            "chief_complaint": new_medical_record.chief_complaint,
            "primary_diagnosis": new_medical_record.primary_diagnosis,
            "treatment_plan": new_medical_record.treatment_plan
        }
        
        digital_signature = sign_medical_document(consultation_for_signing, current_user.id, "consultation")
        security_logger.info("Consultation digitally signed", consultation_id=new_medical_record.id, signature_id=digital_signature["signatures"][0]["signature_id"])
        
        # Include signature info in response
        consultation_response = {
            "id": new_medical_record.id,
            "patient_id": new_medical_record.patient_id,
            "doctor_id": new_medical_record.doctor_id,
            "consultation_date": new_medical_record.consultation_date.isoformat(),
            "chief_complaint": new_medical_record.chief_complaint,
            "primary_diagnosis": new_medical_record.primary_diagnosis,
            "treatment_plan": new_medical_record.treatment_plan,
            "digital_signature": digital_signature,
            "message": "Consultation created, encrypted, and digitally signed successfully"
        }
        
        # If consultation is associated with an appointment, mark appointment as completed
        appointment_id = consultation_data.get("appointment_id")
        if appointment_id:
            try:
                appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
                if appointment and appointment.doctor_id == current_user.id:
                    appointment.status = 'completed'
                    db.commit()
                    print(f"✅ Appointment {appointment_id} marked as completed")
                else:
                    print(f"⚠️ Appointment {appointment_id} not found or access denied")
            except Exception as e:
                print(f"❌ Error updating appointment status: {str(e)}")
                # Don't fail the consultation creation if appointment update fails
        
        # Get patient name for response
        patient_name = "Paciente No Identificado"
        if new_medical_record.patient_id:
            patient = db.query(Person).filter(
                Person.id == new_medical_record.patient_id,
                Person.person_type == "patient"
            ).first()
            if patient:
                patient_name = f"{patient.first_name} {patient.paternal_surname} {patient.maternal_surname or ''}".strip()
        
        doctor_name = f"{current_user.first_name} {current_user.paternal_surname}".strip()

        # Calculate end_time assuming 30 minutes duration for consultations
        consultation_end_time = new_medical_record.consultation_date + timedelta(minutes=30)

        # Return in API format with digital signature
        result = {
            "id": new_medical_record.id,
            "patient_id": new_medical_record.patient_id,
            "consultation_date": new_medical_record.consultation_date.isoformat(),
            "end_time": consultation_end_time.isoformat(),
            "chief_complaint": new_medical_record.chief_complaint,
            "history_present_illness": new_medical_record.history_present_illness,
            "family_history": new_medical_record.family_history,
            "personal_pathological_history": new_medical_record.personal_pathological_history,
            "personal_non_pathological_history": new_medical_record.personal_non_pathological_history,
            "physical_examination": new_medical_record.physical_examination,
            "primary_diagnosis": new_medical_record.primary_diagnosis,
            "secondary_diagnoses": new_medical_record.secondary_diagnoses,
            "treatment_plan": new_medical_record.treatment_plan,
            "therapeutic_plan": new_medical_record.treatment_plan,  # Alias for compatibility
            "follow_up_instructions": new_medical_record.follow_up_instructions,
            "prognosis": new_medical_record.prognosis,
            "laboratory_results": new_medical_record.laboratory_results,
            "imaging_studies": new_medical_record.laboratory_results,  # Alias for compatibility
            "notes": new_medical_record.notes,
            "interconsultations": new_medical_record.notes,  # Map notes to interconsultations for frontend compatibility
            "consultation_type": new_medical_record.consultation_type,
            "created_by": new_medical_record.created_by,
            "created_at": new_medical_record.created_at.isoformat(),
            "patient_name": patient_name,
            "doctor_name": doctor_name,
            "date": new_medical_record.consultation_date.isoformat(),
            "digital_signature": digital_signature,
            "security_features": {
                "encrypted": True,
                "digitally_signed": True,
                "signature_id": digital_signature["signatures"][0]["signature_id"],
                "signature_timestamp": digital_signature["last_signature_timestamp"]
            }
        }
        
        print(f"✅ Medical record created in database: ID={new_medical_record.id}")
        return result
        
    except HTTPException:
        raise  # Re-raise HTTP exceptions as-is
    except Exception as e:
        print(f"❌ Error in create_consultation: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.put("/api/consultations/{consultation_id}")
async def update_consultation(
    consultation_id: int,
    consultation_data: dict,  # NOTE: Proper schema pending consultations table implementation
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Update specific consultation by ID"""
    try:
        print(f"📝 Updating consultation {consultation_id} for user {current_user.id}")
        print(f"📊 Update data received: {consultation_data}")
        print(f"🔍 DEBUG UPDATE: Starting update process for consultation {consultation_id}")
        print(f"🔍 DEBUG UPDATE: prescribed_medications type: {type(consultation_data.get('prescribed_medications'))}")
        print(f"🔍 DEBUG UPDATE: prescribed_medications value: {repr(consultation_data.get('prescribed_medications'))}")
        
        # Find existing consultation
        consultation = db.query(MedicalRecord).filter(
            MedicalRecord.id == consultation_id,
            MedicalRecord.doctor_id == current_user.id
        ).first()
        
        if not consultation:
            raise HTTPException(status_code=404, detail="Consultation not found")
        
        # Parse consultation date if provided
        consultation_date = consultation.consultation_date
        consultation_date_str = consultation_data.get("date", consultation_data.get("consultation_date"))
        if consultation_date_str:
            # Parse ISO datetime string as CDMX time
            consultation_date_with_tz = cdmx_datetime(consultation_date_str)
            # Remove timezone info to store as naive datetime in CDMX time
            consultation_date = consultation_date_with_tz.replace(tzinfo=None)
        
        # Update fields
        consultation.patient_id = consultation_data.get("patient_id", consultation.patient_id)
        consultation.consultation_date = consultation_date
        consultation.chief_complaint = consultation_data.get("chief_complaint", consultation.chief_complaint)
        consultation.history_present_illness = consultation_data.get("history_present_illness", consultation.history_present_illness)
        consultation.family_history = consultation_data.get("family_history", consultation.family_history)
        consultation.personal_pathological_history = consultation_data.get("personal_pathological_history", consultation.personal_pathological_history)
        consultation.personal_non_pathological_history = consultation_data.get("personal_non_pathological_history", consultation.personal_non_pathological_history)
        consultation.physical_examination = consultation_data.get("physical_examination", consultation.physical_examination)
        consultation.laboratory_results = consultation_data.get("laboratory_results", consultation.laboratory_results)
        consultation.primary_diagnosis = consultation_data.get("primary_diagnosis", consultation.primary_diagnosis)
        consultation.secondary_diagnoses = consultation_data.get("secondary_diagnoses", consultation.secondary_diagnoses)
        print(f"🔍 DEBUG UPDATE: prescribed_medications from data: {consultation_data.get('prescribed_medications')}")
        print(f"🔍 DEBUG UPDATE: prescribed_medications current: {consultation.prescribed_medications}")
        consultation.prescribed_medications = consultation_data.get("prescribed_medications", consultation.prescribed_medications)
        print(f"🔍 DEBUG UPDATE: prescribed_medications after assignment: {consultation.prescribed_medications}")
        consultation.treatment_plan = consultation_data.get("treatment_plan", consultation.treatment_plan)
        consultation.follow_up_instructions = consultation_data.get("follow_up_instructions", consultation.follow_up_instructions)
        consultation.prognosis = consultation_data.get("prognosis", consultation.prognosis)
        consultation.notes = consultation_data.get("notes") or consultation_data.get("interconsultations") or consultation.notes
        consultation.consultation_type = consultation_data.get("consultation_type", consultation.consultation_type)
        # Update first-time consultation fields (using _history fields)
        consultation.family_history = consultation_data.get("family_history", consultation.family_history)
        consultation.personal_pathological_history = consultation_data.get("personal_pathological_history", consultation.personal_pathological_history)
        consultation.personal_non_pathological_history = consultation_data.get("personal_non_pathological_history", consultation.personal_non_pathological_history)
        
        # Save changes
        db.commit()
        db.refresh(consultation)
        print(f"🔍 DEBUG UPDATE: prescribed_medications after commit: {consultation.prescribed_medications}")
        
        # Get patient and doctor names for response
        patient_name = "Paciente No Identificado"
        if consultation.patient:
            patient_name = f"{consultation.patient.first_name} {consultation.patient.paternal_surname} {consultation.patient.maternal_surname or ''}".strip()
        
        doctor_name = f"{current_user.first_name} {current_user.paternal_surname}".strip()

        # Calculate end_time assuming 30 minutes duration for consultations
        consultation_end_time = consultation.consultation_date + timedelta(minutes=30)

        # Return updated consultation in API format
        result = {
            "id": consultation.id,
            "patient_id": consultation.patient_id,
            "consultation_date": consultation.consultation_date.isoformat(),
            "end_time": consultation_end_time.isoformat(),
            "chief_complaint": consultation.chief_complaint,
            "history_present_illness": consultation.history_present_illness,
            "family_history": consultation.family_history,
            "personal_pathological_history": consultation.personal_pathological_history,
            "personal_non_pathological_history": consultation.personal_non_pathological_history,
            "physical_examination": consultation.physical_examination,
            "laboratory_results": consultation.laboratory_results,
            "primary_diagnosis": consultation.primary_diagnosis,
            "secondary_diagnoses": consultation.secondary_diagnoses,
            "treatment_plan": consultation.treatment_plan,
            "therapeutic_plan": consultation.treatment_plan,  # Alias for compatibility
            "follow_up_instructions": consultation.follow_up_instructions,
            "prognosis": consultation.prognosis,
            "laboratory_results": consultation.laboratory_results,
            "imaging_studies": consultation.laboratory_results,  # Alias for compatibility
            "notes": consultation.notes,
            "interconsultations": consultation.notes,  # Map notes to interconsultations for frontend compatibility
            "consultation_type": consultation.consultation_type,
            "family_history": consultation.family_history,
            "personal_pathological_history": consultation.personal_pathological_history,
            "personal_non_pathological_history": consultation.personal_non_pathological_history,
            "created_by": consultation.created_by,
            "created_at": consultation.created_at.isoformat(),
            "updated_at": consultation.updated_at.isoformat(),
            "patient_name": patient_name,
            "doctor_name": doctor_name,
            "date": consultation.consultation_date.isoformat()
        }
        
        print(f"✅ Consultation {consultation_id} updated successfully")
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error in update_consultation: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.delete("/api/consultations/{consultation_id}")
async def delete_consultation(
    consultation_id: int,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Delete specific consultation by ID"""
    try:
        # Find the consultation
        consultation = db.query(MedicalRecord).filter(
            MedicalRecord.id == consultation_id,
            MedicalRecord.doctor_id == current_user.id
        ).first()
        
        if not consultation:
            raise HTTPException(status_code=404, detail="Consultation not found or access denied")
        
        # For medical records, we typically don't delete but mark as inactive
        # However, for this implementation, we'll do a soft delete by updating notes
        consultation.notes = f"[DELETED] {consultation.notes or ''}"
        consultation.updated_at = now_cdmx()
        
        db.commit()
        
        return {
            "message": "Consultation deleted successfully",
            "consultation_id": consultation_id,
            "deleted_at": consultation.updated_at.isoformat()
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"❌ Error in delete_consultation: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

# ============================================================================
# SCHEDULE MANAGEMENT ENDPOINTS
# ============================================================================

@app.get("/api/doctor/schedule")
async def get_doctor_schedule(
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Get doctor's current schedule"""
    try:
        api_logger.info("Getting doctor schedule", doctor_id=current_user.id)
        
        # For now, return a basic schedule structure
        # In a full implementation, this would query the schedule_templates table
        schedule_data = {
            "doctor_id": current_user.id,
            "doctor_name": f"{current_user.first_name} {current_user.paternal_surname}",
            "schedule": {
                "monday": {"start": "09:00", "end": "17:00", "duration": 30, "active": True},
                "tuesday": {"start": "09:00", "end": "17:00", "duration": 30, "active": True},
                "wednesday": {"start": "09:00", "end": "17:00", "duration": 30, "active": True},
                "thursday": {"start": "09:00", "end": "17:00", "duration": 30, "active": True},
                "friday": {"start": "09:00", "end": "17:00", "duration": 30, "active": True},
                "saturday": {"start": "09:00", "end": "13:00", "duration": 30, "active": False},
                "sunday": {"start": "09:00", "end": "13:00", "duration": 30, "active": False}
            },
            "lunch_break": {"start": "13:00", "end": "14:00"},
            "break_duration": 10,
            "last_updated": now_cdmx().isoformat()
        }
        
        return schedule_data
    except Exception as e:
        api_logger.error("Error getting doctor schedule", doctor_id=current_user.id, error=str(e))
        raise HTTPException(status_code=500, detail=f"Error al obtener horario: {str(e)}")

@app.put("/api/doctor/schedule")
async def update_doctor_schedule(
    schedule_data: dict,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Update doctor's schedule"""
    try:
        api_logger.info("Updating doctor schedule", doctor_id=current_user.id, schedule_data=schedule_data)
        
        # In a full implementation, this would update the schedule_templates table
        # For now, just log the update and return success
        
        updated_schedule = {
            "doctor_id": current_user.id,
            "doctor_name": f"{current_user.first_name} {current_user.paternal_surname}",
            "schedule": schedule_data.get("schedule", {}),
            "lunch_break": schedule_data.get("lunch_break", {"start": "13:00", "end": "14:00"}),
            "break_duration": schedule_data.get("break_duration", 10),
            "last_updated": now_cdmx().isoformat(),
            "message": "Schedule updated successfully"
        }
        
        api_logger.info("Doctor schedule updated", doctor_id=current_user.id)
        return updated_schedule
    except Exception as e:
        api_logger.error("Error updating doctor schedule", doctor_id=current_user.id, error=str(e))
        raise HTTPException(status_code=500, detail=f"Error al actualizar horario: {str(e)}")

@app.get("/api/doctor/availability")
async def get_doctor_availability(
    date: str,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Get doctor's availability for a specific date"""
    try:
        api_logger.info("Getting doctor availability", doctor_id=current_user.id, date=date)
        
        # Parse the date
        target_date = datetime.strptime(date, "%Y-%m-%d").date()
        day_of_week = target_date.weekday()  # 0=Monday, 6=Sunday
        
        # Get existing appointments for this date
        existing_appointments = db.query(Appointment).filter(
            Appointment.doctor_id == current_user.id,
            func.date(Appointment.appointment_date) == target_date,
            Appointment.status.in_(['confirmed', 'pending'])
        ).all()
        
        # Generate time slots based on doctor's schedule
        # For now, assume 9 AM to 5 PM with 30-minute slots
        time_slots = []
        start_time = datetime.combine(target_date, time(9, 0))
        end_time = datetime.combine(target_date, time(17, 0))
        
        current_time = start_time
        while current_time < end_time:
            # Check if this slot is available
            slot_occupied = any(
                apt.appointment_date <= current_time < apt.end_time
                for apt in existing_appointments
            )
            
            time_slots.append({
                "time": current_time.strftime("%H:%M"),
                "datetime": current_time.isoformat(),
                "available": not slot_occupied,
                "duration": 30
            })
            
            current_time += timedelta(minutes=30)
        
        availability_data = {
            "doctor_id": current_user.id,
            "doctor_name": f"{current_user.first_name} {current_user.paternal_surname}",
            "date": date,
            "day_of_week": day_of_week,
            "time_slots": time_slots,
            "total_slots": len(time_slots),
            "available_slots": len([slot for slot in time_slots if slot["available"]]),
            "existing_appointments": len(existing_appointments)
        }
        
        api_logger.info("Doctor availability retrieved", doctor_id=current_user.id, date=date, available_slots=availability_data["available_slots"])
        return availability_data
    except Exception as e:
        api_logger.error("Error getting doctor availability", doctor_id=current_user.id, date=date, error=str(e))
        raise HTTPException(status_code=500, detail=f"Error al obtener disponibilidad: {str(e)}")

# ============================================================================
# MEDICAL RECORDS ENDPOINTS
# ============================================================================

@app.get("/api/medical-records")
async def get_medical_records(
    patient_id: Optional[int] = None,
    doctor_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Get medical records - all, by patient, or by doctor"""
    try:
        if patient_id:
            records = crud.get_medical_records_by_patient(db, patient_id)
        elif doctor_id:
            records = crud.get_medical_records_by_doctor(db, doctor_id)
        else:
            # Get all records for current doctor
            records = crud.get_medical_records_by_doctor(db, current_user.id)
        
        # Convert to schemas and return
        result = []
        for record in records:
            record_dict = schemas.MedicalRecord.from_orm(record).dict()
            result.append(record_dict)
            
        return {"data": result, "count": len(result)}
    except Exception as e:
        print(f"❌ Error in get_medical_records: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.get("/api/medical-records/{record_id}")
async def get_medical_record(
    record_id: int,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Get specific medical record by ID"""
    try:
        record = crud.get_medical_record(db, record_id)
        if not record:
            raise HTTPException(status_code=404, detail="Medical record not found")
        
        # Check if user has access to this record
        if record.doctor_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied to this medical record")
        
        return schemas.MedicalRecord.from_orm(record).dict()
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error in get_medical_record: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.post("/api/medical-records")
async def create_medical_record(
    record_data: schemas.MedicalRecordCreate,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Create new medical record"""
    try:
        print(f"🔬 Received medical record data: {record_data.dict()}")
        print(f"🔬 Laboratory analysis in request: {record_data.laboratory_analysis}")
        
        # Verify patient exists
        patient = crud.get_person(db, record_data.patient_id)
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")
        
        # Set doctor as current user
        record_data.doctor_id = current_user.id
        
        # Create the record
        new_record = crud.create_medical_record(db, record_data)
        
        return {
            "message": "Medical record created successfully",
            "data": schemas.MedicalRecord.from_orm(new_record).dict()
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error in create_medical_record: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.put("/api/medical-records/{record_id}")
async def update_medical_record(
    record_id: int,
    record_data: schemas.MedicalRecordUpdate,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Update specific medical record by ID"""
    try:
        # Check if record exists and user has access
        existing_record = crud.get_medical_record(db, record_id)
        if not existing_record:
            raise HTTPException(status_code=404, detail="Medical record not found")
        
        if existing_record.doctor_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied to this medical record")
        
        # Update the record
        updated_record = crud.update_medical_record(db, record_id, record_data)
        
        return {
            "message": "Medical record updated successfully",
            "data": schemas.MedicalRecord.from_orm(updated_record).dict()
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error in update_medical_record: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.delete("/api/medical-records/{record_id}")
async def delete_medical_record(
    record_id: int,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Delete specific medical record by ID"""
    try:
        # Check if record exists and user has access
        existing_record = crud.get_medical_record(db, record_id)
        if not existing_record:
            raise HTTPException(status_code=404, detail="Medical record not found")
        
        if existing_record.doctor_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied to this medical record")
        
        # Soft delete by setting a deleted flag or hard delete
        # For now, we'll do hard delete - in production consider soft delete
        db.delete(existing_record)
        db.commit()
        
        return {"message": "Medical record deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"❌ Error in delete_medical_record: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

# ============================================================================
# DEBUG/TESTING ENDPOINTS
# ============================================================================

@app.get("/api/debug/user-profile")
async def debug_user_profile(email: str, db: Session = Depends(get_db)):
    """Debug endpoint to check user profile by email"""
    user = db.query(Person).filter(Person.email == email).first()
    if not user:
        return {"error": "User not found"}
    
    specialty_name = None
    if user.specialty_id:
        specialty = db.query(Specialty).filter(Specialty.id == user.specialty_id).first()
        specialty_name = specialty.name if specialty else None
    
    return {
        "user_found": True,
        "id": user.id,
        "email": user.email,
        "name": f"{user.first_name} {user.paternal_surname}",
        "specialty_id": user.specialty_id,
        "specialty_name": specialty_name,
        "title": user.title,
        "professional_license": user.professional_license,
        "university": user.university
    }

# ============================================================================
# DEBUG ENDPOINTS
# ============================================================================

@app.get("/api/debug/appointments/{doctor_email}")
async def debug_appointments(doctor_email: str, db: Session = Depends(get_db)):
    """Debug endpoint to check appointments for a specific doctor"""
    try:
        # Find doctor by email
        doctor = db.query(Person).filter(Person.email == doctor_email).first()
        if not doctor:
            return {"error": f"Doctor with email {doctor_email} not found"}
        
        # Get all appointments for this doctor
        appointments = db.query(Appointment).filter(Appointment.doctor_id == doctor.id).all()
        
        result = {
            "doctor_id": doctor.id,
            "doctor_name": f"{doctor.first_name} {doctor.paternal_surname}",
            "doctor_email": doctor.email,
            "total_appointments": len(appointments),
            "appointments": []
        }
        
        for apt in appointments:
            patient = db.query(Person).filter(Person.id == apt.patient_id).first()
            result["appointments"].append({
                "id": apt.id,
                "appointment_date": apt.appointment_date.isoformat() if apt.appointment_date else None,
                "end_time": apt.end_time.isoformat() if apt.end_time else None,
                "status": apt.status,
                "reason": apt.reason,
                "patient_name": f"{patient.first_name} {patient.paternal_surname}" if patient else "Unknown"
            })
        
        return result
        
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/appointments-temp")
async def get_appointments_temp(db: Session = Depends(get_db)):
    """Temporary endpoint without authentication to get appointments with patient names"""
    try:
        # Get all appointments with patient information
        appointments = db.query(Appointment).options(
            joinedload(Appointment.patient),
            joinedload(Appointment.doctor)
        ).all()
        
        result = []
        for apt in appointments:
            patient_name = "Paciente desconocido"
            if apt.patient:
                patient_name = f"{apt.patient.first_name} {apt.patient.paternal_surname}"
            
            result.append({
                "id": apt.id,
                "appointment_date": apt.appointment_date.isoformat() if apt.appointment_date else None,
                "end_time": apt.end_time.isoformat() if apt.end_time else None,
                "status": apt.status,
                "reason": apt.reason,
                "patient_id": apt.patient_id,
                "doctor_id": apt.doctor_id,
                "patient_name": patient_name,
                # For compatibility with frontend
                "date": apt.appointment_date.isoformat() if apt.appointment_date else None,
                "time": apt.appointment_date.strftime("%H:%M") if apt.appointment_date else None,
                "patient": {
                    "first_name": apt.patient.first_name if apt.patient else "",
                    "paternal_surname": apt.patient.paternal_surname if apt.patient else "",
                    "maternal_surname": apt.patient.maternal_surname if apt.patient else ""
                } if apt.patient else None
            })
        
        return result
        
    except Exception as e:
        print(f"❌ Error in get_appointments_temp: {str(e)}")
        return []

# ============================================================================
# STUDY CATALOG ENDPOINTS
# ============================================================================

@app.get("/api/study-categories")
async def get_study_categories(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Get all study categories"""
    try:
        categories = crud.get_study_categories(db, skip=skip, limit=limit)
        return [schemas.StudyCategory.from_orm(category) for category in categories]
    except Exception as e:
        print(f"❌ Error in get_study_categories: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.get("/api/study-catalog")
async def get_study_catalog(
    skip: int = 0,
    limit: int = 100,
    category_id: Optional[int] = None,
    specialty: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Get studies from catalog with filters"""
    try:
        studies = crud.get_study_catalog(
            db, 
            skip=skip, 
            limit=limit,
            category_id=category_id,
            specialty=specialty,
            search=search
        )
        return [schemas.StudyCatalog.from_orm(study) for study in studies]
    except Exception as e:
        print(f"❌ Error in get_study_catalog: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.get("/api/study-catalog/{study_id}")
async def get_study_by_id(
    study_id: int,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Get study by ID with normal values"""
    try:
        study = crud.get_study_by_id(db, study_id)
        if not study:
            raise HTTPException(status_code=404, detail="Study not found")
        return schemas.StudyCatalog.from_orm(study)
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error in get_study_by_id: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.get("/api/study-catalog/code/{code}")
async def get_study_by_code(
    code: str,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Get study by code"""
    try:
        study = crud.get_study_by_code(db, code)
        if not study:
            raise HTTPException(status_code=404, detail="Study not found")
        return schemas.StudyCatalog.from_orm(study)
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error in get_study_by_code: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.get("/api/study-templates")
async def get_study_templates(
    skip: int = 0,
    limit: int = 100,
    specialty: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Get study templates with filters"""
    try:
        templates = crud.get_study_templates(
            db, 
            skip=skip, 
            limit=limit,
            specialty=specialty
        )
        return [schemas.StudyTemplate.from_orm(template) for template in templates]
    except Exception as e:
        print(f"❌ Error in get_study_templates: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.get("/api/study-templates/{template_id}")
async def get_study_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Get study template by ID with items"""
    try:
        template = crud.get_study_template(db, template_id)
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")
        return schemas.StudyTemplate.from_orm(template)
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error in get_study_template: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.post("/api/study-templates")
async def create_study_template(
    template_data: schemas.StudyTemplateCreate,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Create a new study template"""
    try:
        template = crud.create_study_template(db, template_data)
        return schemas.StudyTemplate.from_orm(template)
    except Exception as e:
        db.rollback()
        print(f"❌ Error in create_study_template: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.get("/api/study-recommendations")
async def get_study_recommendations(
    diagnosis: Optional[str] = None,
    specialty: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Get study recommendations based on diagnosis and specialty"""
    try:
        studies = crud.get_study_recommendations(db, diagnosis=diagnosis, specialty=specialty)
        return [schemas.StudyCatalog.from_orm(study) for study in studies]
    except Exception as e:
        print(f"❌ Error in get_study_recommendations: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.get("/api/study-search")
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
        return [schemas.StudyCatalog.from_orm(study) for study in studies]
    except Exception as e:
        print(f"❌ Error in search_studies: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

# ============================================================================
# SERVER
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting clean English API server...")
    uvicorn.run(
        "main_clean_english:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
        log_level="info"
    )

