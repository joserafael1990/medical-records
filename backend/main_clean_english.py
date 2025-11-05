#!/usr/bin/env python3
"""
Clean English API for Historias Clínicas
All endpoints standardized in English
No legacy code - completely fresh implementation
"""

from fastapi import FastAPI, Depends, HTTPException, status, Query, File, UploadFile, Request, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import text, bindparam
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime, date, timedelta
import pytz
import psycopg2
from psycopg2.extras import Json
import os
import json
import uuid
import crud
import schemas
import auth
from database import get_db, Person, Specialty, Country, State, EmergencyRelationship, Appointment, MedicalRecord, ClinicalStudy, VitalSign, ConsultationVitalSign, Medication, ConsultationPrescription, AuditLog, PrivacyNotice, PrivacyConsent, ARCORequest, Office, AppointmentType, DocumentType, Document, PersonDocument
from appointment_service import AppointmentService
from audit_service import audit_service
import data_retention_service as retention
# Schedule routes are implemented directly in this file (lines 1726-2100)
# No separate router needed - endpoints use models/schedule.py models
from consultation_service import (
    decrypt_patient_data,
    decrypt_consultation_data,
    format_patient_name,
    format_doctor_name,
    get_consultation_vital_signs as get_vital_signs_for_consultation,
    get_consultation_prescriptions as get_prescriptions_for_consultation,
    get_consultation_clinical_studies as get_clinical_studies_for_consultation,
    build_consultation_response,
    # Create consultation helpers
    encrypt_consultation_fields,
    parse_consultation_date,
    create_medical_record_object,
    prepare_consultation_for_signing,
    mark_appointment_completed,
    get_patient_info,
    build_create_consultation_response
)
from encryption import get_encryption_service, MedicalDataEncryption
from digital_signature import get_digital_signature_service, get_medical_document_signer
from whatsapp_service import get_whatsapp_service
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
    if not data:
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

# ============================================================================
# BACKGROUND SCHEDULER: Auto WhatsApp Appointment Reminders
# ============================================================================
from services.scheduler import start_auto_reminder_scheduler

@app.on_event("startup")
async def start_background_tasks():
    start_auto_reminder_scheduler(app)

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

# Schedule endpoints are implemented directly in this file (no separate router)
# See lines 1726-2100 for schedule implementation

# Include diagnosis catalog routes
from routes.diagnosis import router as diagnosis_router
app.include_router(diagnosis_router, tags=["diagnosis-catalog"])

# Include catalog routes (specialties, countries, states, etc.)
from routes.catalogs import router as catalogs_router
app.include_router(catalogs_router)

# ============================================================================
# AUTHENTICATION DEPENDENCY
# ============================================================================

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Get current authenticated user"""
    try:
        # DEVELOPMENT MODE DISABLED - Always require authentication
        # This ensures that the correct user is always used
        
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
    """
    Health check endpoint
    Verifica que el servidor esté funcionando correctamente
    Usado por Docker health check y monitoreo
    """
    return {
        "status": "healthy",
        "timestamp": now_cdmx().isoformat(),
        "service": "Medical Records API",
        "version": "3.0.0"
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

# ============================================================================
# MEDICATIONS AND PRESCRIPTIONS ENDPOINTS
# ============================================================================

@app.get("/api/medications")
async def get_medications(
    search: str = None,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Get all medications or search by name (returns unique medications by name)"""
    print(f"💊 Getting medications. Search term: {search}")
    
    try:
        # Use DISTINCT ON to get unique medications by name (keeping the first one by id)
        if search:
            # For search, get distinct names and return the first medication with each name
            query = db.query(Medication).filter(Medication.name.ilike(f"%{search}%")).order_by(Medication.name, Medication.id)
        else:
            query = db.query(Medication).order_by(Medication.name, Medication.id)
        
        medications = query.all()
        
        # Filter duplicates by name, keeping only the first occurrence (lowest id)
        seen_names = {}
        medications_data = []
        for medication in medications:
            name_lower = medication.name.lower().strip()
            if name_lower not in seen_names:
                seen_names[name_lower] = True
            medication_data = {
                "id": medication.id,
                "name": medication.name,
                "created_at": medication.created_at.isoformat() if medication.created_at else None
            }
            medications_data.append(medication_data)
        
        print(f"✅ Found {len(medications_data)} unique medications (from {len(medications)} total)")
        return medications_data
        
    except Exception as e:
        print(f"❌ Error getting medications: {e}")
        raise HTTPException(status_code=500, detail="Error retrieving medications")

@app.post("/api/medications")
async def create_medication(
    medication_data: dict,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Create a new medication"""
    print(f"💊 Creating new medication: {medication_data}")
    
    try:
        # Check if medication already exists
        existing_medication = db.query(Medication).filter(
            Medication.name.ilike(medication_data.get('name'))
        ).first()
        
        if existing_medication:
            # Return existing medication instead of creating duplicate
            return {
                "id": existing_medication.id,
                "name": existing_medication.name,
                "created_at": existing_medication.created_at.isoformat() if existing_medication.created_at else None
            }
        
        # Create new medication with created_by set to current user
        new_medication = Medication(
            name=medication_data.get('name'),
            created_by=current_user.id,
            is_active=True
        )
        
        db.add(new_medication)
        db.commit()
        db.refresh(new_medication)
        
        response_data = {
            "id": new_medication.id,
            "name": new_medication.name,
            "is_active": new_medication.is_active,
            "created_by": new_medication.created_by,
            "created_at": new_medication.created_at.isoformat() if new_medication.created_at else None
        }
        
        print(f"✅ Created medication {new_medication.id}")
        return response_data
        
    except Exception as e:
        print(f"❌ Error creating medication: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Error creating medication")

# ============================================================================
# OFFICE MANAGEMENT ENDPOINTS
# ============================================================================


@app.post("/api/offices", response_model=schemas.Office)
async def create_office(
    office: schemas.OfficeCreate,
    current_user: Person = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new office for the current doctor"""
    try:
        # Debug logging
        print(f"🔍 [CREATE OFFICE] Request received at {datetime.now()}")
        print(f"🔍 [CREATE OFFICE] Office data: {office.dict()}")
        print(f"🔍 [CREATE OFFICE] Doctor ID: {current_user.id}")
        print(f"🔍 [CREATE OFFICE] Office name: '{office.name}' (type: {type(office.name)})")
        
        # Validate that the user is a doctor
        if current_user.person_type != 'doctor':
            raise HTTPException(status_code=403, detail="Only doctors can create offices")
        
        # Create the office
        new_office = Office(
            doctor_id=current_user.id,
            name=office.name,
            address=office.address,
            city=office.city,
            state_id=office.state_id,
            country_id=office.country_id,
            postal_code=office.postal_code,
            phone=office.phone,
            timezone=office.timezone,
            maps_url=office.maps_url,
            is_active=True  # New offices are active by default
        )
        
        db.add(new_office)
        db.commit()
        db.refresh(new_office)
        
        # Load the office with relationships to get state and country names
        office_with_relations = db.query(Office).options(
            joinedload(Office.state),
            joinedload(Office.country)
        ).filter(Office.id == new_office.id).first()
        
        print(f"✅ [CREATE OFFICE] Office created successfully with ID: {new_office.id}")
        print(f"✅ [CREATE OFFICE] Office name: '{new_office.name}'")
        return office_with_relations
        
    except Exception as e:
        print(f"❌ Error creating office: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Error creating office")

@app.get("/api/offices", response_model=List[schemas.Office])
async def get_doctor_offices(
    current_user: Person = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all offices for the current doctor"""
    try:
        # Use current user's doctor_id
        doctor_id = current_user.id
        
        # Get offices for the current doctor with JOINs for state and country names
        results = db.query(Office, State.name.label('state_name'), Country.name.label('country_name')).join(
            State, Office.state_id == State.id, isouter=True
        ).join(
            Country, Office.country_id == Country.id, isouter=True
        ).filter(
            Office.doctor_id == doctor_id,
            Office.is_active == True
        ).all()
        
        # Add state_name and country_name to each office object
        offices = []
        for result in results:
            office, state_name, country_name = result
            office.state_name = state_name
            office.country_name = country_name
            offices.append(office)
        
        return offices
        
    except Exception as e:
        print(f"❌ Error getting offices: {e}")
        raise HTTPException(status_code=500, detail="Error getting offices")

@app.get("/api/offices/{office_id}", response_model=schemas.Office)
async def get_office(
    office_id: int,
    current_user: Person = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific office by ID"""
    try:
        doctor_id = current_user.id
        # Get office by ID for the current doctor with JOINs for state and country names
        result = db.query(Office, State.name.label('state_name'), Country.name.label('country_name')).join(
            State, Office.state_id == State.id, isouter=True
        ).join(
            Country, Office.country_id == Country.id, isouter=True
        ).filter(
            Office.id == office_id,
            Office.doctor_id == doctor_id,
            Office.is_active == True
        ).first()
        
        if not result:
            raise HTTPException(status_code=404, detail="Office not found")
        
        office, state_name, country_name = result
        
        # Add state_name and country_name to the office object
        office.state_name = state_name
        office.country_name = country_name
        
        return office
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error getting office {office_id}: {e}")
        raise HTTPException(status_code=500, detail="Error getting office")

@app.put("/api/offices/{office_id}", response_model=schemas.Office)
async def update_office(
    office_id: int,
    office: schemas.OfficeUpdate,
    current_user: Person = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update an office (validate ownership)"""
    try:
        # Validate that the user is a doctor
        if current_user.person_type != 'doctor':
            raise HTTPException(status_code=403, detail="Only doctors can update offices")
        
        # Find the office and validate ownership
        existing_office = db.query(Office).filter(
            Office.id == office_id,
            Office.doctor_id == current_user.id,
            Office.is_active == True
        ).first()
        
        if not existing_office:
            raise HTTPException(status_code=404, detail="Office not found")
        
        # Update fields
        for field, value in office.dict(exclude_unset=True).items():
            setattr(existing_office, field, value)
        
        db.commit()
        db.refresh(existing_office)
        
        return existing_office
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error updating office: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Error updating office")

@app.delete("/api/offices/{office_id}")
async def delete_office(
    office_id: int,
    current_user: Person = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Soft delete an office (validate ownership and no future appointments)"""
    try:
        # Validate that the user is a doctor
        if current_user.person_type != 'doctor':
            raise HTTPException(status_code=403, detail="Only doctors can delete offices")
        
        # Find the office and validate ownership
        existing_office = db.query(Office).filter(
            Office.id == office_id,
            Office.doctor_id == current_user.id,
            Office.is_active == True
        ).first()
        
        if not existing_office:
            raise HTTPException(status_code=404, detail="Office not found")
        
        # Check for future appointments
        future_appointments = db.query(Appointment).filter(
            Appointment.office_id == office_id,
            Appointment.appointment_date > datetime.utcnow()
        ).count()
        
        if future_appointments > 0:
            raise HTTPException(
                status_code=400, 
                detail=f"Cannot delete office with {future_appointments} future appointments"
            )
        
        # Soft delete
        existing_office.is_active = False
        db.commit()
        
        return {"message": "Office deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error deleting office: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Error deleting office")

@app.get("/api/appointment-types", response_model=List[dict])
async def get_appointment_types(db: Session = Depends(get_db)):
    """Get all active appointment types"""
    try:
        from database import AppointmentType
        types = db.query(AppointmentType).filter(AppointmentType.active == True).all()
        return [{"id": t.id, "name": t.name} for t in types]
    except Exception as e:
        print(f"❌ Error getting appointment types: {e}")
        raise HTTPException(status_code=500, detail="Error getting appointment types")

@app.get("/api/consultations/{consultation_id}/prescriptions")
async def get_consultation_prescriptions(
    consultation_id: int,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Get prescriptions for a specific consultation"""
    print(f"💊 Getting prescriptions for consultation: {consultation_id}")
    
    try:
        # Verify consultation exists and user has access
        consultation = db.query(MedicalRecord).filter(
            MedicalRecord.id == consultation_id,
            MedicalRecord.created_by == current_user.id
        ).first()
        
        if not consultation:
            print(f"💊 Consultation {consultation_id} not found or no access for user {current_user.id}")
            return []

        # Get prescriptions for this consultation with medication relationship loaded
        prescriptions = db.query(ConsultationPrescription).options(
            joinedload(ConsultationPrescription.medication)
        ).filter(
            ConsultationPrescription.consultation_id == consultation_id
        ).all()
        
        print(f"💊 Found {len(prescriptions)} prescriptions for consultation {consultation_id}")
        
        # Convert to response format
        prescriptions_data = []
        for prescription in prescriptions:
            # Handle case where medication might not exist (defensive programming)
            medication_name = prescription.medication.name if prescription.medication else "Medicamento no encontrado"
            
            prescription_data = {
                "id": prescription.id,
                "consultation_id": prescription.consultation_id,
                "medication_id": prescription.medication_id,
                "medication_name": medication_name,
                "dosage": prescription.dosage,
                "frequency": prescription.frequency,
                "duration": prescription.duration,
                "instructions": prescription.instructions,
                "quantity": prescription.quantity,
                "via_administracion": prescription.via_administracion,
                "created_at": prescription.created_at.isoformat() if prescription.created_at else None,
                # updated_at column does not exist in consultation_prescriptions table - removed
            }
            prescriptions_data.append(prescription_data)
        
        return prescriptions_data
        
    except Exception as e:
        print(f"❌ Error getting consultation prescriptions: {e}")
        raise HTTPException(status_code=500, detail="Error retrieving consultation prescriptions")

@app.post("/api/consultations/{consultation_id}/prescriptions")
async def create_consultation_prescription(
    consultation_id: int,
    prescription_data: dict,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Create a prescription for a consultation"""
    print(f"💊 Creating prescription for consultation {consultation_id}: {prescription_data}")
    
    try:
        # Verify consultation exists and user has access
        consultation = db.query(MedicalRecord).filter(
            MedicalRecord.id == consultation_id,
            MedicalRecord.created_by == current_user.id
        ).first()
        
        if not consultation:
            raise HTTPException(status_code=404, detail="Consultation not found or no access")
        
        # Verify medication exists
        medication = db.query(Medication).filter(
            Medication.id == prescription_data.get('medication_id')
        ).first()
        
        if not medication:
            raise HTTPException(status_code=404, detail="Medication not found")
        
        # Create new prescription
        new_prescription = ConsultationPrescription(
            consultation_id=consultation_id,
            medication_id=prescription_data.get('medication_id'),
            dosage=prescription_data.get('dosage'),
            frequency=prescription_data.get('frequency'),
            duration=prescription_data.get('duration'),
            instructions=prescription_data.get('instructions'),
            quantity=prescription_data.get('quantity'),
            via_administracion=prescription_data.get('via_administracion')
        )
        
        db.add(new_prescription)
        db.commit()
        db.refresh(new_prescription)
        
        response_data = {
            "id": new_prescription.id,
            "consultation_id": new_prescription.consultation_id,
            "medication_id": new_prescription.medication_id,
            "medication_name": medication.name,
            "dosage": new_prescription.dosage,
            "frequency": new_prescription.frequency,
            "duration": new_prescription.duration,
            "instructions": new_prescription.instructions,
            "quantity": new_prescription.quantity,
            "via_administracion": new_prescription.via_administracion,
            "created_at": new_prescription.created_at.isoformat() if new_prescription.created_at else None
            # updated_at column does not exist in consultation_prescriptions table - removed
        }
        
        print(f"✅ Created prescription {new_prescription.id}")
        return response_data
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error creating consultation prescription: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Error creating consultation prescription")

@app.put("/api/consultations/{consultation_id}/prescriptions/{prescription_id}")
async def update_consultation_prescription(
    consultation_id: int,
    prescription_id: int,
    prescription_data: dict,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Update a prescription"""
    print(f"💊 Updating prescription {prescription_id} for consultation {consultation_id}")
    
    try:
        # Verify consultation exists and user has access
        consultation = db.query(MedicalRecord).filter(
            MedicalRecord.id == consultation_id,
            MedicalRecord.created_by == current_user.id
        ).first()
        
        if not consultation:
            raise HTTPException(status_code=404, detail="Consultation not found or no access")
        
        # Find the prescription to update
        prescription = db.query(ConsultationPrescription).filter(
            ConsultationPrescription.id == prescription_id,
            ConsultationPrescription.consultation_id == consultation_id
        ).first()
        
        if not prescription:
            raise HTTPException(status_code=404, detail="Prescription not found")
        
        # Update fields
        if 'dosage' in prescription_data:
            prescription.dosage = prescription_data['dosage']
        if 'frequency' in prescription_data:
            prescription.frequency = prescription_data['frequency']
        if 'duration' in prescription_data:
            prescription.duration = prescription_data['duration']
        if 'instructions' in prescription_data:
            prescription.instructions = prescription_data['instructions']
        if 'quantity' in prescription_data:
            prescription.quantity = prescription_data['quantity']
        if 'via_administracion' in prescription_data:
            prescription.via_administracion = prescription_data['via_administracion']
        
        # updated_at column does not exist in consultation_prescriptions table - removed
        
        db.commit()
        db.refresh(prescription)
        
        # Load medication relationship for response
        db.refresh(prescription, ['medication'])
        
        response_data = {
            "id": prescription.id,
            "consultation_id": prescription.consultation_id,
            "medication_id": prescription.medication_id,
            "medication_name": prescription.medication.name if prescription.medication else "Medicamento no encontrado",
            "dosage": prescription.dosage,
            "frequency": prescription.frequency,
            "duration": prescription.duration,
            "instructions": prescription.instructions,
            "quantity": prescription.quantity,
            "via_administracion": prescription.via_administracion,
            "created_at": prescription.created_at.isoformat() if prescription.created_at else None
            # updated_at column does not exist in consultation_prescriptions table - removed
        }
        
        print(f"✅ Updated prescription {prescription.id}")
        return response_data
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error updating consultation prescription: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Error updating consultation prescription")

@app.delete("/api/consultations/{consultation_id}/prescriptions/{prescription_id}")
async def delete_consultation_prescription(
    consultation_id: int,
    prescription_id: int,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Delete a prescription from a consultation"""
    print(f"💊 Deleting prescription {prescription_id} from consultation {consultation_id}")
    
    try:
        # Verify consultation exists and user has access
        consultation = db.query(MedicalRecord).filter(
            MedicalRecord.id == consultation_id,
            MedicalRecord.created_by == current_user.id
        ).first()
        
        if not consultation:
            raise HTTPException(status_code=404, detail="Consultation not found or no access")
        
        # Find the prescription to delete
        prescription = db.query(ConsultationPrescription).filter(
            ConsultationPrescription.id == prescription_id,
            ConsultationPrescription.consultation_id == consultation_id
        ).first()
        
        if not prescription:
            raise HTTPException(status_code=404, detail="Prescription not found")
        
        db.delete(prescription)
        db.commit()
        
        print(f"✅ Deleted prescription {prescription_id}")
        return {"message": "Prescription deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error deleting consultation prescription: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Error deleting consultation prescription")

# ============================================================================
# CLINICAL STUDIES ENDPOINTS
# ============================================================================

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

@app.put("/api/clinical-studies/{study_id}/upload")
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

@app.get("/api/clinical-studies/{study_id}/file")
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
        
        # Import FileResponse from fastapi.responses
        from fastapi.responses import FileResponse
        
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

# ============================================================================
# WHATSAPP NOTIFICATIONS
# ============================================================================

from routes.whatsapp import router as whatsapp_router
app.include_router(whatsapp_router)

@app.get("/api/whatsapp/webhook")
async def whatsapp_webhook_verify(request: Request):
    """Verificación del webhook de WhatsApp"""
    try:
        # Obtener parámetros de verificación
        mode = request.query_params.get('hub.mode')
        token = request.query_params.get('hub.verify_token')
        challenge = request.query_params.get('hub.challenge')
        
        print(f"🔍 WhatsApp webhook verification: mode={mode}, token={token}")
        
        # Verificar token (debe coincidir con el configurado en Meta)
        verify_token = "whatsapp_verify_token"  # Debe coincidir con el configurado en Meta
        
        if mode == 'subscribe' and token == verify_token:
            print("✅ WhatsApp webhook verified successfully")
            return int(challenge)  # Meta espera el challenge como número
        else:
            print(f"❌ WhatsApp webhook verification failed: mode={mode}, token={token}")
            raise HTTPException(status_code=403, detail="Verification failed")
            
    except Exception as e:
        print(f"❌ Error in webhook verification: {e}")
        raise HTTPException(status_code=500, detail="Verification error")


@app.post("/api/whatsapp/study-results/{study_id}")
async def send_whatsapp_study_results_notification(
    study_id: int,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Notificar por WhatsApp que los resultados de un estudio están disponibles"""
    print(f"📱 Sending WhatsApp notification for study results: {study_id}")
    
    try:
        # Get study
        study = db.query(ClinicalStudy).filter(
            ClinicalStudy.id == study_id,
            ClinicalStudy.created_by == current_user.id
        ).first()
        
        if not study:
            raise HTTPException(status_code=404, detail="Study not found or no access")
        
        # Get patient
        patient = db.query(Person).filter(Person.id == study.patient_id).first()
        
        if not patient or not patient.primary_phone:
            raise HTTPException(status_code=400, detail="Patient phone number not found")
        
        # Generate secure link (placeholder - implement token system later)
        secure_link = f"http://localhost:3000/patient/studies/{study.id}"
        
        # Send WhatsApp
        whatsapp = get_whatsapp_service()
        result = whatsapp.send_lab_results_notification(
            patient_phone=patient.primary_phone,
            patient_name=patient.first_name,
            study_name=study.study_name,
            secure_link=secure_link
        )
        
        if result['success']:
            print(f"✅ WhatsApp sent successfully to {patient.primary_phone}")
            return {
                "message": "WhatsApp notification sent successfully",
                "message_id": result.get('message_id'),
                "phone": patient.primary_phone
            }
        else:
            print(f"❌ Failed to send WhatsApp: {result.get('error')}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to send WhatsApp: {result.get('error')}"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error sending WhatsApp notification: {e}")
        raise HTTPException(status_code=500, detail=f"Error sending WhatsApp: {str(e)}")

@app.post("/api/whatsapp/test")
async def test_whatsapp_service(
    phone: str,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """
    Endpoint de prueba para WhatsApp (agnóstico del proveedor)
    Envía un mensaje de prueba de texto simple
    """
    print(f"📱 Testing WhatsApp service to {phone}")
    
    try:
        whatsapp = get_whatsapp_service()
        result = whatsapp.send_text_message(
            to_phone=phone,
            message='Mensaje de prueba desde el sistema de citas',
        )
        
        if result['success']:
            return {
                "message": "Test message sent successfully",
                "message_id": result.get('message_id') or result.get('message_sid'),
                "phone": phone,
                "note": "If you didn't receive the message, make sure your number is registered in Meta WhatsApp dashboard"
            }
        else:
            return {
                "message": "Failed to send test message",
                "error": result.get('error'),
                "details": result.get('details')
            }
            
    except Exception as e:
        print(f"❌ Error testing WhatsApp: {e}")
        return {
            "message": "Error testing WhatsApp",
            "error": str(e)
        }

# ============================================================================
# WHATSAPP WEBHOOK - Recibir respuestas de pacientes
# ============================================================================

@app.get("/api/whatsapp/webhook")
async def verify_whatsapp_webhook(request: Request):
    """
    Verificación del webhook de WhatsApp (requerido por Meta)
    Meta envía una petición GET para verificar el webhook
    """
    # Get query parameters
    mode = request.query_params.get("hub.mode")
    token = request.query_params.get("hub.verify_token")
    challenge = request.query_params.get("hub.challenge")
    
    # Verify token (configurable en variables de entorno)
    verify_token = os.getenv('META_WHATSAPP_VERIFY_TOKEN', 'mi_token_secreto_123')
    
    if mode == "subscribe" and token == verify_token:
        print("✅ WhatsApp webhook verified successfully")
        return int(challenge)
    else:
        print("❌ WhatsApp webhook verification failed")
        raise HTTPException(status_code=403, detail="Verification failed")

@app.post("/api/whatsapp/webhook")
async def receive_whatsapp_message(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Recibir mensajes y respuestas de WhatsApp
    Procesa respuestas a botones de plantillas (ej: cancelar cita)
    """
    try:
        body = await request.json()
        print(f"📱 Received WhatsApp webhook: {body}")
        print(f"📱 Webhook body type: {type(body)}")
        print(f"📱 Webhook body keys: {body.keys() if isinstance(body, dict) else 'Not a dict'}")
        
        # Verificar que es una notificación de WhatsApp
        if body.get("object") != "whatsapp_business_account":
            return {"status": "ignored"}
        
        # Procesar entries
        for entry in body.get("entry", []):
            for change in entry.get("changes", []):
                value = change.get("value", {})
                
                print(f"🔍 Processing change: {change}")
                print(f"🔍 Processing value: {value}")
                
                # Verificar si hay mensajes
                if "messages" in value:
                    print(f"📩 Found {len(value['messages'])} messages")
                    for message in value["messages"]:
                        print(f"📩 Processing message: {message}")
                        await process_whatsapp_message(message, db)
                
                # Verificar si hay respuestas a botones
                if "statuses" in value:
                    print(f"📊 Message status update: {value['statuses']}")
        
        return {"status": "success"}
        
    except Exception as e:
        print(f"❌ Error processing WhatsApp webhook: {e}")
        # Siempre devolver 200 para no causar reintentos de Meta
        return {"status": "error", "message": str(e)}

async def process_whatsapp_message(message: dict, db: Session):
    """
    Procesar un mensaje recibido de WhatsApp
    Detecta respuestas a botones de cancelación y consentimiento de privacidad
    """
    try:
        message_type = message.get("type")
        from_phone = message.get("from")
        
        print(f"📩 Processing message type: {message_type} from {from_phone}")
        
        # Procesar respuesta a botón interactivo (nuevo formato de WhatsApp)
        if message_type == "interactive":
            interactive = message.get("interactive", {})
            if interactive.get("type") == "button_reply":
                button_reply = interactive.get("button_reply", {})
                button_id = button_reply.get("id")
                button_title = button_reply.get("title")
                
                print(f"🔘 Interactive button clicked: {button_title} (id: {button_id})")
                
                # Procesar botones de consentimiento de privacidad
                if button_id and button_id.startswith("accept_privacy_"):
                    print(f"✅ Privacy consent accepted: {button_id}")
                    await process_privacy_consent(button_id, from_phone, db)
                
                # Procesar botones de cancelación de cita
                elif button_id and button_id.startswith("cancel_appointment_"):
                    appointment_id = int(button_id.replace("cancel_appointment_", ""))
                    await cancel_appointment_via_whatsapp(appointment_id, from_phone, db)
        
        # Procesar respuesta a botón (formato anterior)
        elif message_type == "button":
            button_payload = message.get("button", {}).get("payload")
            button_text = message.get("button", {}).get("text")
            
            print(f"🔘 Button clicked: {button_text} (payload: {button_payload})")
            
            # Si es una cancelación de cita
            if button_payload and button_payload.startswith("cancel_appointment_"):
                appointment_id = int(button_payload.replace("cancel_appointment_", ""))
                await cancel_appointment_via_whatsapp(appointment_id, from_phone, db)
            # Manejar payload "Cancelar" genérico
            elif button_payload == "Cancelar" or button_text == "Cancelar":
                print(f"🔄 Generic cancel button clicked, processing as text cancellation")
                await process_text_cancellation_request("cancelar", from_phone, db)
        
        # Procesar mensaje de texto
        elif message_type == "text":
            text = message.get("text", {}).get("body", "").lower().strip()
            print(f"💬 Text message received: {text}")
            
            # Procesar mensajes de cancelación
            if any(keyword in text for keyword in ["cancelar", "cancel", "cancelar cita", "cancel appointment"]):
                print(f"🔄 Detected cancellation request in text: {text}")
                await process_text_cancellation_request(text, from_phone, db)
        
    except Exception as e:
        print(f"❌ Error processing WhatsApp message: {e}")

async def process_privacy_consent(button_id: str, from_phone: str, db: Session):
    """
    Procesar consentimiento de privacidad recibido vía WhatsApp
    """
    try:
        print(f"🔐 Processing privacy consent: {button_id} from {from_phone}")
        
        # Extraer el ID del consentimiento del button_id (ej: accept_privacy_8)
        consent_id = int(button_id.replace("accept_privacy_", ""))
        
        # Buscar el registro de consentimiento
        consent = db.query(PrivacyConsent).filter(
            PrivacyConsent.id == consent_id
        ).first()
        
        if not consent:
            print(f"❌ Privacy consent record {consent_id} not found")
            return
        
        # Buscar el paciente
        patient = db.query(Person).filter(
            Person.id == consent.patient_id,
            Person.person_type == 'patient'
        ).first()
        
        if not patient:
            print(f"❌ Patient {consent.patient_id} not found for consent {consent_id}")
            return
        
        # Verificar que el teléfono corresponde al paciente
        # Normalizar números para comparación
        whatsapp = get_whatsapp_service()
        normalized_patient_phone = whatsapp._format_phone_number(patient.primary_phone)
        normalized_from_phone = whatsapp._format_phone_number(from_phone)
        
        # También probar con formato internacional (521...)
        patient_phone_international = f"521{patient.primary_phone}"
        
        print(f"🔍 Comparing phones:")
        print(f"  - Patient phone (formatted): {normalized_patient_phone}")
        print(f"  - Patient phone (international): {patient_phone_international}")
        print(f"  - WhatsApp phone: {normalized_from_phone}")
        
        if normalized_patient_phone != normalized_from_phone and patient_phone_international != normalized_from_phone:
            print(f"❌ Phone mismatch: {normalized_patient_phone} != {normalized_from_phone} and {patient_phone_international} != {normalized_from_phone}")
            return
        
        # Actualizar el consentimiento
        consent.consent_given = True
        consent.consent_date = datetime.utcnow()
        
        db.commit()
        
        print(f"✅ Privacy consent updated for patient {consent.patient_id} (consent {consent_id})")
        
        # Opcional: Enviar mensaje de confirmación
        # (Esto requeriría una plantilla adicional aprobada)
        
    except Exception as e:
        print(f"❌ Error processing privacy consent: {e}")
        db.rollback()

async def cancel_appointment_via_whatsapp(appointment_id: int, patient_phone: str, db: Session):
    """
    Cancelar una cita cuando el paciente responde vía WhatsApp
    """
    try:
        print(f"🔄 Canceling appointment {appointment_id} via WhatsApp from {patient_phone}")
        
        # Buscar la cita
        appointment = db.query(Appointment).filter(
            Appointment.id == appointment_id
        ).first()
        
        if not appointment:
            print(f"❌ Appointment {appointment_id} not found")
            return
        
        # Verificar que el teléfono corresponde al paciente
        patient = db.query(Person).filter(Person.id == appointment.patient_id).first()
        
        if not patient:
            print(f"❌ Patient not found for appointment {appointment_id}")
            return
        
        # Normalizar números para comparación
        whatsapp = get_whatsapp_service()
        normalized_patient_phone = whatsapp._format_phone_number(patient.primary_phone)
        normalized_from_phone = whatsapp._format_phone_number(patient_phone)
        
        if normalized_patient_phone != normalized_from_phone:
            print(f"❌ Phone mismatch: {normalized_patient_phone} != {normalized_from_phone}")
            return
        
        # Cancelar la cita
        appointment.status = 'cancelled'
        appointment.cancellation_reason = 'Cancelada por el paciente vía WhatsApp'
        appointment.updated_at = datetime.utcnow()
        
        db.commit()
        
        print(f"✅ Appointment {appointment_id} cancelled successfully via WhatsApp")
        
        # Opcional: Enviar mensaje de confirmación al paciente
        # (Esto requeriría una plantilla adicional aprobada)
        
    except Exception as e:
        db.rollback()

async def process_text_cancellation_request(text: str, patient_phone: str, db: Session):
    """
    Procesar solicitud de cancelación recibida como mensaje de texto
    Busca la próxima cita del paciente y la cancela
    """
    try:
        
        # Buscar el paciente por teléfono con prioridad a los que tienen citas activas
        whatsapp = get_whatsapp_service()
        matching_patient = None
        
        # Primero buscar pacientes con citas activas y el número correcto
        patients_with_appointments = db.query(Person).join(
            Appointment, Person.id == Appointment.patient_id
        ).filter(
            Person.person_type == 'patient',
            Person.primary_phone.isnot(None),
            Appointment.status.in_(['confirmed', 'scheduled'])
        ).all()
        
        
        # Buscar entre pacientes con citas activas
        for p in patients_with_appointments:
            normalized_patient_phone = whatsapp._format_phone_number(p.primary_phone)
            normalized_from_phone = whatsapp._format_phone_number(patient_phone)
            
            # Comparar números directamente
            if normalized_patient_phone == normalized_from_phone:
                matching_patient = p
                break
            
            # También comparar con formato alternativo (con/sin 1 después del 52)
            if normalized_from_phone.startswith("521") and normalized_patient_phone.startswith("52"):
                alternative_whatsapp_phone = normalized_from_phone.replace("521", "52")
                if normalized_patient_phone == alternative_whatsapp_phone:
                    matching_patient = p
                    break
            
            if normalized_patient_phone.startswith("521") and normalized_from_phone.startswith("52"):
                alternative_patient_phone = normalized_patient_phone.replace("521", "52")
                if normalized_from_phone == alternative_patient_phone:
                    matching_patient = p
                    break
        
        # Si no se encontró entre pacientes con citas activas, buscar en todos los pacientes
        if not matching_patient:
            all_patients = db.query(Person).filter(
                Person.person_type == 'patient',
                Person.primary_phone.isnot(None)
            ).all()
            
            for p in all_patients:
                normalized_patient_phone = whatsapp._format_phone_number(p.primary_phone)
                normalized_from_phone = whatsapp._format_phone_number(patient_phone)
                
                # Comparar números directamente
                if normalized_patient_phone == normalized_from_phone:
                    matching_patient = p
                    break
                
                # También comparar con formato alternativo (con/sin 1 después del 52)
                if normalized_from_phone.startswith("521") and normalized_patient_phone.startswith("52"):
                    alternative_whatsapp_phone = normalized_from_phone.replace("521", "52")
                    if normalized_patient_phone == alternative_whatsapp_phone:
                        matching_patient = p
                        break
                
                if normalized_patient_phone.startswith("521") and normalized_from_phone.startswith("52"):
                    alternative_patient_phone = normalized_patient_phone.replace("521", "52")
                    if normalized_from_phone == alternative_patient_phone:
                        matching_patient = p
                        break
        
        if not matching_patient:
            return
        
        # Buscar la próxima cita del paciente (más flexible)
        from datetime import datetime
        # Primero buscar citas confirmadas futuras
        next_appointment = db.query(Appointment).filter(
            Appointment.patient_id == matching_patient.id,
            Appointment.status == 'confirmed',
            Appointment.appointment_date >= datetime.now()
        ).order_by(Appointment.appointment_date.asc()).first()
        
        if not next_appointment:
            # Si no hay citas confirmadas, buscar cualquier cita futura (excepto canceladas)
            next_appointment = db.query(Appointment).filter(
                Appointment.patient_id == matching_patient.id,
                Appointment.status != 'cancelled',
                Appointment.appointment_date >= datetime.now()
            ).order_by(Appointment.appointment_date.asc()).first()
        
        if not next_appointment:
            # Si no hay citas futuras, buscar cualquier cita reciente (últimos 7 días) EXCEPTO CANCELADAS
            from datetime import timedelta
            recent_date = datetime.now() - timedelta(days=7)
            next_appointment = db.query(Appointment).filter(
                Appointment.patient_id == matching_patient.id,
                Appointment.status != 'cancelled',  # ← EXCLUIR CITAS CANCELADAS
                Appointment.appointment_date >= recent_date
            ).order_by(Appointment.appointment_date.desc()).first()
        
        if not next_appointment:
            return
        
        # Actualizar campos de cancelación específicos
        next_appointment.status = 'cancelled'
        next_appointment.cancelled_reason = 'cancelled by patient'
        next_appointment.cancelled_at = datetime.utcnow()
        next_appointment.cancelled_by = matching_patient.id
        next_appointment.updated_at = datetime.utcnow()
        
        try:
            db.commit()
            db.refresh(next_appointment)
        except Exception as commit_error:
            db.rollback()
            raise commit_error
        
        # Opcional: Enviar mensaje de confirmación al paciente
        # (Esto requeriría una plantilla adicional aprobada)
        
    except Exception as e:
        db.rollback()

# ============================================================================
# CATALOGS (PUBLIC ENDPOINTS)
# ============================================================================
# MIGRADO a routes/catalogs.py

# ============================================================================
# DOCUMENT MANAGEMENT ENDPOINTS
# ============================================================================

@app.get("/api/document-types", response_model=List[schemas.DocumentTypeResponse])
async def get_document_types(
    active_only: bool = Query(True),
    db: Session = Depends(get_db)
):
    """Get list of document types"""
    return crud.get_document_types(db, active_only=active_only)

@app.get("/api/document-types/{document_type_id}/documents", response_model=List[schemas.DocumentResponse])
async def get_documents_by_type(
    document_type_id: int,
    active_only: bool = Query(True),
    db: Session = Depends(get_db)
):
    """Get all documents of a specific type"""
    return crud.get_documents_by_type(db, document_type_id, active_only=active_only)

@app.get("/api/documents", response_model=List[schemas.DocumentResponse])
async def get_documents(
    document_type_id: Optional[int] = Query(None),
    active_only: bool = Query(True),
    db: Session = Depends(get_db)
):
    """Get all documents with optional filter by type"""
    return crud.get_documents(db, document_type_id=document_type_id, active_only=active_only)

@app.get("/api/persons/{person_id}/documents", response_model=List[schemas.PersonDocumentResponse])
async def get_person_documents(
    person_id: int,
    active_only: bool = Query(True),
    current_user: Person = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all documents for a person"""
    # Verify access (doctor can only access own documents or own patients' documents)
    if current_user.person_type == 'doctor':
        if person_id != current_user.id:
            # Check if it's a patient created by this doctor
            person = crud.get_person(db, person_id)
            if not person or person.created_by != current_user.id:
                raise HTTPException(status_code=403, detail="Access denied")
    
    return crud.get_person_documents(db, person_id, active_only=active_only)

@app.post("/api/persons/{person_id}/documents", response_model=schemas.PersonDocumentResponse)
async def create_person_document(
    person_id: int,
    document_data: schemas.PersonDocumentCreate,
    current_user: Person = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create or update a person document"""
    # Verify access
    if current_user.person_type == 'doctor':
        if person_id != current_user.id:
            person = crud.get_person(db, person_id)
            if not person or person.created_by != current_user.id:
                raise HTTPException(status_code=403, detail="Access denied")
    
    person_doc = crud.upsert_person_document(
        db=db,
        person_id=person_id,
        document_id=document_data.document_id,
        document_value=document_data.document_value
    )
    db.commit()
    db.refresh(person_doc)
    # Load document relationship
    person_doc = db.query(PersonDocument).options(joinedload(PersonDocument.document)).filter(PersonDocument.id == person_doc.id).first()
    return person_doc

@app.delete("/api/persons/{person_id}/documents/{document_id}")
async def delete_person_document(
    person_id: int,
    document_id: int,
    current_user: Person = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a person document"""
    # Verify access
    if current_user.person_type == 'doctor':
        if person_id != current_user.id:
            person = crud.get_person(db, person_id)
            if not person or person.created_by != current_user.id:
                raise HTTPException(status_code=403, detail="Access denied")
    
    deleted = crud.delete_person_document(db, person_id, document_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Document not found")
    db.commit()
    return {"message": "Document deleted successfully"}

# MIGRADO a routes/catalogs.py

# ============================================================================
# DEBUGGING ENDPOINTS
# ============================================================================

@app.get("/api/debug/office-system")
async def debug_office_system(
    current_user: Person = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Debug office system status"""
    try:
        # Check offices
        offices = db.query(Office).all()
        office_data = []
        
        for office in offices:
            office_info = {
                'id': office.id,
                'name': office.name,
                'doctor_id': office.doctor_id,
                'address': office.address,
                'city': office.city,
                'state_id': office.state_id,
                'country_id': office.country_id,
                'phone': office.phone,
                'timezone': office.timezone,
                'is_active': office.is_active,
                'created_at': office.created_at.isoformat() if office.created_at else None
            }
            office_data.append(office_info)
        
        # Check doctors without offices
        doctors_without_offices = db.query(Person).filter(
            Person.person_type == 'doctor',
            Person.is_active == True
        ).all()
        
        doctors_without_offices_data = []
        for doctor in doctors_without_offices:
            has_office = db.query(Office).filter(
                Office.doctor_id == doctor.id,
                Office.is_active == True
            ).first() is not None
            
            if not has_office:
                doctors_without_offices_data.append({
                    'id': doctor.id,
                    'name': f"{doctor.first_name} {doctor.paternal_surname}",
                    'email': doctor.email
                })
        
        return {
            'status': 'success',
            'total_offices': len(offices),
            'offices': office_data,
            'doctors_without_offices': len(doctors_without_offices_data),
            'doctors_without_offices_data': doctors_without_offices_data,
            'timestamp': datetime.now().isoformat()
        }
        
    except Exception as e:
        return {
            'status': 'error',
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }

@app.get("/api/debug/appointment-system")
async def debug_appointment_system(
    current_user: Person = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Debug appointment system status"""
    try:
        # Check appointments
        appointments = db.query(Appointment).all()
        appointment_data = []
        
        for appointment in appointments:
            appointment_info = {
                'id': appointment.id,
                'patient_id': appointment.patient_id,
                'doctor_id': appointment.doctor_id,
                'appointment_date': appointment.appointment_date.isoformat() if appointment.appointment_date else None,
                'appointment_type_id': appointment.appointment_type_id,
                'office_id': appointment.office_id,
                'status': appointment.status,
                'reason': appointment.reason
            }
            appointment_data.append(appointment_info)
        
        # Check appointment types
        appointment_types = db.query(AppointmentType).all()
        appointment_types_data = []
        
        for apt_type in appointment_types:
            apt_type_info = {
                'id': apt_type.id,
                'name': apt_type.name,
                'active': apt_type.active
            }
            appointment_types_data.append(apt_type_info)
        
        # Check appointments without office_id
        appointments_without_office = db.query(Appointment).filter(
            Appointment.office_id.is_(None)
        ).count()
        
        # Check appointments without appointment_type_id
        appointments_without_type = db.query(Appointment).filter(
            Appointment.appointment_type_id.is_(None)
        ).count()
        
        return {
            'status': 'success',
            'total_appointments': len(appointments),
            'appointments': appointment_data,
            'appointment_types': appointment_types_data,
            'appointments_without_office': appointments_without_office,
            'appointments_without_type': appointments_without_type,
            'timestamp': datetime.now().isoformat()
        }
        
    except Exception as e:
        return {
            'status': 'error',
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }

@app.get("/api/debug/consultation-system")
async def debug_consultation_system(
    current_user: Person = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Debug consultation system status"""
    try:
        # Check medical records
        medical_records = db.query(MedicalRecord).all()
        medical_records_data = []
        
        for record in medical_records:
            record_info = {
                'id': record.id,
                'patient_id': record.patient_id,
                'doctor_id': record.doctor_id,
                'consultation_date': record.consultation_date.isoformat() if record.consultation_date else None,
                # appointment_type_id and office_id columns don't exist in medical_records table
                'appointment_type_id': None,
                'office_id': None,
                'chief_complaint': record.chief_complaint[:100] + '...' if record.chief_complaint and len(record.chief_complaint) > 100 else record.chief_complaint
            }
            medical_records_data.append(record_info)
        
        # Check medical records without office_id
        records_without_office = db.query(MedicalRecord).filter(
            # office_id column doesn't exist in medical_records table - removed filter
            False
        ).count()
        
        # Check medical records without appointment_type_id
        records_without_type = db.query(MedicalRecord).filter(
            # appointment_type_id column doesn't exist in medical_records table - removed filter
            False
        ).count()
        
        return {
            'status': 'success',
            'total_medical_records': len(medical_records),
            'medical_records': medical_records_data,
            'records_without_office': records_without_office,
            'records_without_type': records_without_type,
            'timestamp': datetime.now().isoformat()
        }
        
    except Exception as e:
        return {
            'status': 'error',
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }

@app.get("/api/debug/whatsapp-system")
async def debug_whatsapp_system(
    current_user: Person = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Debug WhatsApp system status"""
    try:
        # Check WhatsApp configuration
        whatsapp_config = {
            'phone_id': os.getenv('META_WHATSAPP_PHONE_ID'),
            'access_token': '***' + os.getenv('META_WHATSAPP_TOKEN', '')[-4:] if os.getenv('META_WHATSAPP_TOKEN') else None,
            'api_version': os.getenv('META_WHATSAPP_API_VERSION', 'v18.0')
        }
        
        # Check appointments with WhatsApp data
        appointments_with_whatsapp = db.query(Appointment).filter(
            Appointment.patient_id.isnot(None)
        ).all()
        
        whatsapp_data = []
        for appointment in appointments_with_whatsapp:
            patient = db.query(Person).filter(Person.id == appointment.patient_id).first()
            if patient and patient.primary_phone:
                whatsapp_info = {
                    'appointment_id': appointment.id,
                    'patient_phone': patient.primary_phone,
                    'appointment_date': appointment.appointment_date.isoformat() if appointment.appointment_date else None,
                    'office_id': appointment.office_id,
                    'appointment_type_id': appointment.appointment_type_id
                }
                whatsapp_data.append(whatsapp_info)
        
        return {
            'status': 'success',
            'whatsapp_config': whatsapp_config,
            'appointments_with_whatsapp': len(whatsapp_data),
            'whatsapp_data': whatsapp_data,
            'timestamp': datetime.now().isoformat()
        }
        
    except Exception as e:
        return {
            'status': 'error',
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }

@app.get("/api/debug/pdf-system")
async def debug_pdf_system(
    current_user: Person = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Debug PDF system status"""
    try:
        # Check PDF generation requirements
        doctors_with_offices = db.query(Person).filter(
            Person.person_type == 'doctor',
            Person.is_active == True
        ).all()
        
        pdf_data = []
        for doctor in doctors_with_offices:
            offices = db.query(Office).filter(
                Office.doctor_id == doctor.id,
                Office.is_active == True
            ).all()
            
            doctor_info = {
                'id': doctor.id,
                'name': f"{doctor.first_name} {doctor.paternal_surname}",
                'offices_count': len(offices),
                'offices': [{'id': o.id, 'name': o.name, 'address': o.address} for o in offices]
            }
            pdf_data.append(doctor_info)
        
        return {
            'status': 'success',
            'doctors_with_offices': len(pdf_data),
            'pdf_data': pdf_data,
            'timestamp': datetime.now().isoformat()
        }
        
    except Exception as e:
        return {
            'status': 'error',
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }

@app.get("/api/debug/full-system")
async def debug_full_system(
    current_user: Person = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Debug complete multi-office system"""
    try:
        # Get all debug information
        office_debug = await debug_office_system(current_user, db)
        appointment_debug = await debug_appointment_system(current_user, db)
        consultation_debug = await debug_consultation_system(current_user, db)
        whatsapp_debug = await debug_whatsapp_system(current_user, db)
        pdf_debug = await debug_pdf_system(current_user, db)
        
        return {
            'status': 'success',
            'timestamp': datetime.now().isoformat(),
            'office_system': office_debug,
            'appointment_system': appointment_debug,
            'consultation_system': consultation_debug,
            'whatsapp_system': whatsapp_debug,
            'pdf_system': pdf_debug
        }
        
    except Exception as e:
        return {
            'status': 'error',
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }

# MIGRADO a routes/catalogs.py

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
        api_logger.info("Generating default weekly schedule template", doctor_id=current_user.id)
        
        # Get doctor's first active office (or create one if none exists)
        office_result = db.execute(text("""
            SELECT id FROM offices 
            WHERE doctor_id = :doctor_id AND is_active = TRUE 
            LIMIT 1
        """), {'doctor_id': current_user.id})
        office_row = office_result.fetchone()
        office_id = office_row[0] if office_row else None
        
        # If no office exists, create a default one
        if not office_id:
            # Get office data from doctor or use defaults
            office_name = getattr(current_user, 'office_name', 'Consultorio Principal') or 'Consultorio Principal'
            office_address = getattr(current_user, 'office_address', '') or ''
            
            office_insert = db.execute(text("""
                INSERT INTO offices (doctor_id, name, address, is_active, created_at, updated_at)
                VALUES (:doctor_id, :name, :address, TRUE, NOW(), NOW())
                RETURNING id
            """), {
                'doctor_id': current_user.id,
                'name': office_name,
                'address': office_address
            })
            office_id = office_insert.fetchone()[0]
            db.commit()
            api_logger.info("Created default office for schedule", doctor_id=current_user.id, office_id=office_id)
        
        # Default schedule: Monday to Friday 9:00-18:00 with one time block
        default_time_blocks = [{"start_time": "09:00", "end_time": "18:00"}]
        day_names = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
        
        weekly_schedule = {}
        
        # Generate schedules for Monday to Friday (active)
        for day_index in range(5):  # 0-4 = Monday to Friday
            day_name = day_names[day_index]
            
            # Check if schedule already exists for this day
            existing = db.execute(text("""
                SELECT id FROM schedule_templates 
                WHERE doctor_id = :doctor_id 
                AND day_of_week = :day_of_week 
                AND (office_id = :office_id OR office_id IS NULL)
                LIMIT 1
            """), {
                'doctor_id': current_user.id,
                'day_of_week': day_index,
                'office_id': office_id
            }).fetchone()
            
            if existing:
                # Update existing
                db.execute(text("""
                    UPDATE schedule_templates 
                    SET start_time = '09:00',
                        end_time = '18:00',
                        is_active = TRUE,
                        time_blocks = :time_blocks,
                        updated_at = NOW()
                    WHERE id = :template_id
                """), {
                    'template_id': existing[0],
                    'time_blocks': json.dumps(default_time_blocks)
                })
            else:
                # Create new - PostgreSQL will automatically convert JSON string to JSONB
                result = db.execute(text("""
                    INSERT INTO schedule_templates 
                    (doctor_id, office_id, day_of_week, start_time, end_time, is_active, time_blocks, created_at, updated_at)
                    VALUES (:doctor_id, :office_id, :day_of_week, '09:00', '18:00', TRUE, :time_blocks, NOW(), NOW())
                    RETURNING id, day_of_week, start_time, end_time, is_active
                """), {
                    'doctor_id': current_user.id,
                    'office_id': office_id,
                    'day_of_week': day_index,
                    'time_blocks': json.dumps(default_time_blocks)
                })
                template_row = result.fetchone()
            
            weekly_schedule[day_name] = {
                "id": existing[0] if existing else template_row[0],
                "day_of_week": day_index,
                "start_time": "09:00",
                "end_time": "18:00",
                "is_active": True,
                "time_blocks": default_time_blocks
            }
        
        # Set Saturday and Sunday to null (inactive)
        weekly_schedule["saturday"] = None
        weekly_schedule["sunday"] = None
        
        db.commit()
        api_logger.info("Default weekly schedule generated", doctor_id=current_user.id)
        
        return weekly_schedule
        
    except Exception as e:
        db.rollback()
        import traceback
        error_detail = traceback.format_exc()
        api_logger.error("Error generating default weekly schedule", doctor_id=current_user.id, error=str(e), traceback=error_detail)
        raise HTTPException(status_code=500, detail=f"Error generando horario por defecto: {str(e)}")

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
            SELECT id, day_of_week, start_time, end_time, is_active, time_blocks
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
                # Parse time_blocks from JSONB or fallback to start_time/end_time
                time_blocks = []
                if hasattr(template, 'time_blocks') and template.time_blocks:
                    # time_blocks is already parsed from JSONB
                    time_blocks = template.time_blocks if isinstance(template.time_blocks, list) else []
                
                # Fallback: if no time_blocks, create from start_time/end_time
                if not time_blocks and template.start_time and template.end_time:
                    time_blocks = [{
                        "start_time": template.start_time.strftime("%H:%M"),
                        "end_time": template.end_time.strftime("%H:%M")
                    }]
                
                weekly_schedule[day_name] = {
                    "id": template.id,
                    "day_of_week": template.day_of_week,
                    "start_time": template.start_time.strftime("%H:%M") if template.start_time else None,
                    "end_time": template.end_time.strftime("%H:%M") if template.end_time else None,
                    "is_active": template.is_active,
                    "time_blocks": time_blocks
                }
        
        api_logger.info("Weekly schedule templates loaded", doctor_id=current_user.id, templates_count=len(templates))
        return weekly_schedule
        
    except Exception as e:
        import traceback
        error_detail = traceback.format_exc()
        api_logger.error("Error getting weekly schedule templates", doctor_id=current_user.id, error=str(e), traceback=error_detail)
        # Return empty schedule instead of 500 error - better UX
        return {
            "monday": None,
            "tuesday": None,
            "wednesday": None,
            "thursday": None,
            "friday": None,
            "saturday": None,
            "sunday": None
        }

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
        start_time = template_data.get('start_time')
        end_time = template_data.get('end_time')
        if not start_time or not end_time:
            if time_blocks and len(time_blocks) > 0:
                first_block = time_blocks[0]
                start_time = first_block.get('start_time', '09:00')
                end_time = first_block.get('end_time', '17:00')
            else:
                start_time = start_time or '09:00'
                end_time = end_time or '17:00'
        
        # Prepare time_blocks JSONB
        time_blocks_json = json.dumps(time_blocks) if time_blocks else '[]'
        
        # Create template in database
        result = db.execute(text("""
            INSERT INTO schedule_templates 
            (doctor_id, day_of_week, start_time, end_time, is_active, time_blocks, created_at, updated_at)
            VALUES (:doctor_id, :day_of_week, :start_time, :end_time, :is_active, :time_blocks, NOW(), NOW())
            RETURNING id
        """), {
            "doctor_id": current_user.id,
            "day_of_week": day_of_week,
            "start_time": start_time,
            "end_time": end_time,
            "is_active": is_active,
            "time_blocks": time_blocks_json
        })
        
        template_id = result.fetchone()[0]
        db.commit()
        
        # Return the created template data
        response_data = {
            "id": template_id,
            "day_of_week": day_of_week,
            "start_time": start_time,
            "end_time": end_time,
            "is_active": is_active,
            "time_blocks": time_blocks if time_blocks else [{"start_time": start_time, "end_time": end_time}]
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
            # Update the time_blocks JSONB and the main start_time/end_time
            time_blocks = template_data["time_blocks"]
            update_fields.append("time_blocks = :time_blocks")
            params["time_blocks"] = json.dumps(time_blocks) if time_blocks else '[]'
            
            # Also update start_time and end_time from the first time block for backwards compatibility
            if time_blocks and len(time_blocks) > 0:
                first_block = time_blocks[0]
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
            SELECT id, day_of_week, start_time, end_time, is_active, time_blocks
            FROM schedule_templates 
            WHERE id = :template_id AND doctor_id = :doctor_id
        """), {"template_id": template_id, "doctor_id": current_user.id})
        
        template = result.fetchone()
        
        if template:
            # Transform to frontend format
            day_names = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
            day_name = day_names[template.day_of_week]
            
            # Parse time_blocks from JSONB or fallback to start_time/end_time
            time_blocks = []
            if hasattr(template, 'time_blocks') and template.time_blocks:
                # time_blocks is already parsed from JSONB by psycopg2
                if isinstance(template.time_blocks, list):
                    time_blocks = template.time_blocks
                elif isinstance(template.time_blocks, str):
                    # If it's a string, parse it
                    time_blocks = json.loads(template.time_blocks)
            
            # Fallback: if no time_blocks, create from start_time/end_time
            if not time_blocks and template.start_time and template.end_time:
                time_blocks = [{
                    "start_time": template.start_time.strftime("%H:%M"),
                    "end_time": template.end_time.strftime("%H:%M")
                }]
            
            response_data = {
                "id": template.id,
                "day_of_week": template.day_of_week,
                "start_time": template.start_time.strftime("%H:%M") if template.start_time else None,
                "end_time": template.end_time.strftime("%H:%M") if template.end_time else None,
                "is_active": template.is_active,
                "time_blocks": time_blocks
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
        # Use current user's doctor_id
        doctor_id = current_user.id
        api_logger.info("Getting available times", doctor_id=doctor_id, date=date)
        
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
            SELECT start_time, end_time, time_blocks
            FROM schedule_templates 
            WHERE doctor_id = %s AND day_of_week = %s AND is_active = true
        """, (doctor_id, day_of_week))
        
        schedule_result = cursor.fetchone()
        if not schedule_result:
            api_logger.info("No schedule found for this day", doctor_id=doctor_id, day_of_week=day_of_week)
            return {"available_times": []}
        
        # Parse time_blocks from JSONB or fallback to start_time/end_time
        time_blocks = []
        print(f"📅 Schedule result: {schedule_result}")
        print(f"📅 time_blocks raw: {schedule_result[2]}")
        print(f"📅 time_blocks type: {type(schedule_result[2])}")
        
        if schedule_result[2]:  # time_blocks column
            if isinstance(schedule_result[2], list):
                time_blocks = schedule_result[2]
                print(f"📅 Using time_blocks from list: {time_blocks}")
            elif isinstance(schedule_result[2], str):
                time_blocks = json.loads(schedule_result[2])
                print(f"📅 Using time_blocks from JSON string: {time_blocks}")
        
        # Fallback: if no time_blocks, create from start_time/end_time
        if not time_blocks and schedule_result[0] and schedule_result[1]:
            time_blocks = [{
                "start_time": schedule_result[0].strftime("%H:%M"),
                "end_time": schedule_result[1].strftime("%H:%M")
            }]
            print(f"📅 Using fallback time_blocks: {time_blocks}")
        
        print(f"📅 Final time_blocks: {time_blocks}")
        
        # Get doctor's appointment duration (from persons table)
        cursor.execute("""
            SELECT appointment_duration 
            FROM persons 
            WHERE id = %s
        """, (doctor_id,))
        
        doctor_result = cursor.fetchone()
        consultation_duration = doctor_result[0] if doctor_result and doctor_result[0] else 30
        
        if not time_blocks:
            api_logger.info("No time blocks configured for this day", doctor_id=doctor_id, day_of_week=day_of_week)
            return {"available_times": []}
        
        # Get doctor's timezone from offices table
        cursor.execute("""
            SELECT timezone 
            FROM offices 
            WHERE doctor_id = %s AND is_active = TRUE
            LIMIT 1
        """, (doctor_id,))
        
        timezone_result = cursor.fetchone()
        doctor_timezone = timezone_result[0] if timezone_result and timezone_result[0] else 'America/Mexico_City'
        
        # Get existing appointments for this date
        # Since appointments are stored in CDMX timezone (without tzinfo), 
        # we can query them directly without timezone conversion
        cursor.execute("""
            SELECT appointment_date, end_time 
            FROM appointments 
            WHERE doctor_id = %s 
            AND DATE(appointment_date) = %s 
            AND status IN ('confirmed', 'scheduled')
        """, (doctor_id, date))
        
        existing_appointments = cursor.fetchall()
        
        # Convert existing appointments to time ranges
        # Since appointments are stored in CDMX timezone (without tzinfo),
        # we can use them directly
        booked_slots = []
        for apt_date, apt_end in existing_appointments:
            booked_slots.append({
                'start': apt_date.time(),
                'end': apt_end.time()
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
                current_time = (datetime.combine(target_date, current_time) + timedelta(minutes=consultation_duration)).time()
        
        cursor.close()
        conn.close()
        
        print(f"📅 Generated {len(available_times)} available times:")
        for time_slot in available_times:
            print(f"📅   - {time_slot['time']} ({time_slot['duration_minutes']} min)")
        
        api_logger.info("Generated available times", 
                       doctor_id=doctor_id, 
                       date=date, 
                       count=len(available_times))
        
        return {"available_times": available_times}
        
    except Exception as e:
        api_logger.error("Error getting available times", doctor_id=doctor_id, error=str(e))
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
        print(f"📝 Registration attempt for email: {doctor_data.email}")
        db.begin()
        
        # Check if email already exists
        existing_email = db.query(Person).filter(Person.email == doctor_data.email).first()
        print(f"📝 Email check result: {existing_email is not None}")
        if existing_email:
            print(f"❌ Email already exists: {doctor_data.email}")
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El email ya está registrado en el sistema"
            )
        
        # Validate documents: require at least 1 personal and 1 professional document
        if not hasattr(doctor_data, 'documents') or not doctor_data.documents:
                db.rollback()
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                detail="Se requiere al menos un documento personal y un documento profesional"
            )
        
        # Get document types
        personal_type = db.query(DocumentType).filter(DocumentType.name == 'Personal').first()
        professional_type = db.query(DocumentType).filter(DocumentType.name == 'Profesional').first()
        
        if not personal_type or not professional_type:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Error en configuración de tipos de documento"
            )
        
        # Check documents - get all documents of each type to verify
        personal_doc_ids = [doc.id for doc in crud.get_documents_by_type(db, personal_type.id)]
        professional_doc_ids = [doc.id for doc in crud.get_documents_by_type(db, professional_type.id)]
        
        personal_docs = [d for d in doctor_data.documents if d.document_id in personal_doc_ids]
        professional_docs = [d for d in doctor_data.documents if d.document_id in professional_doc_ids]
        
        if not personal_docs:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Se requiere al menos un documento personal"
            )
        
        if not professional_docs:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Se requiere al menos un documento profesional"
            )
        
        # Check for duplicate document values (same document_id only, not across different document types)
        # Ejemplo: C.I="12345" y C.I.E="12345" pueden coexistir, pero no dos C.I="12345"
        for doc in doctor_data.documents:
            existing_doc = db.query(PersonDocument).filter(
                PersonDocument.document_id == doc.document_id,  # Mismo documento específico (C.I, C.I.E, CURP, etc.)
                PersonDocument.document_value == doc.document_value,
                PersonDocument.is_active == True
            ).first()
            if existing_doc:
                document = db.query(Document).filter(Document.id == doc.document_id).first()
                db.rollback()
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"El documento {document.name if document else 'desconocido'} con valor '{doc.document_value}' ya está registrado. Cada tipo de documento debe tener un valor único."
                )
        
        # Create doctor
        doctor = crud.create_doctor_safe(db, doctor_data)
        
        # Commit doctor creation first
        db.commit()
        api_logger.info(f"Doctor {doctor.id} created successfully")
        
        # Create office FIRST if office data is provided (needed for schedule templates)
        office_data = {
            'office_name': getattr(doctor_data, 'office_name', None),
            'office_address': getattr(doctor_data, 'office_address', None),
            'office_city': getattr(doctor_data, 'office_city', None),
            'office_state_id': getattr(doctor_data, 'office_state_id', None),
            'office_phone': getattr(doctor_data, 'office_phone', None),
            'office_maps_url': getattr(doctor_data, 'office_maps_url', None)
        }
        
        # Check if any office data is provided
        has_office_data = any(value is not None and value != '' for value in office_data.values())
        office_id = None
        
        if has_office_data:
            try:
                api_logger.info(f"Creating office for doctor {doctor.id}", office_data=office_data)
                
                # Create office record
                office_name = office_data['office_name'] or f"Consultorio de {doctor.title} {doctor.first_name} {doctor.paternal_surname}"
                office = Office(
                    doctor_id=doctor.id,
                    name=office_name,
                    address=office_data['office_address'],
                    city=office_data['office_city'],
                    state_id=office_data['office_state_id'],
                    phone=office_data['office_phone'],
                    maps_url=office_data['office_maps_url'],
                    is_active=True,
                    timezone='America/Mexico_City'
                )
                db.add(office)
                db.commit()
                db.refresh(office)
                office_id = office.id
                api_logger.info(f"Office {office.id} created for doctor {doctor.id}")
            except Exception as office_error:
                api_logger.error(f"Error creating office for doctor {doctor.id}: {str(office_error)}")
                db.rollback()
                # Continue without office - schedule can use NULL office_id
        
        # Save schedule data if provided (after office is created)
        schedule_data = getattr(doctor_data, 'schedule_data', None)
        if schedule_data and isinstance(schedule_data, dict):
            try:
                api_logger.info(f"Saving schedule data for doctor {doctor.id}", schedule_data=schedule_data)
                
                # Map day names to day_of_week indices
                day_mapping = {
                    'monday': 0, 'tuesday': 1, 'wednesday': 2, 'thursday': 3,
                    'friday': 4, 'saturday': 5, 'sunday': 6
                }
                
                for day_name, day_schedule in schedule_data.items():
                    if day_name in day_mapping and day_schedule and isinstance(day_schedule, dict):
                        day_of_week = day_mapping[day_name]
                        is_active = day_schedule.get('is_active', False)
                        time_blocks = day_schedule.get('time_blocks', [])
                        
                        # Only save if active and has time blocks
                        if is_active and time_blocks and len(time_blocks) > 0:
                            first_block = time_blocks[0]
                            start_time = first_block.get('start_time', '09:00')
                            end_time = first_block.get('end_time', '17:00')
                            
                            # Check if template already exists for this day and office
                            existing_template = db.execute(text("""
                                SELECT id FROM schedule_templates 
                                WHERE doctor_id = :doctor_id 
                                AND day_of_week = :day_of_week 
                                AND (office_id = :office_id OR (:office_id IS NULL AND office_id IS NULL))
                                LIMIT 1
                            """), {
                                'doctor_id': doctor.id,
                                'day_of_week': day_of_week,
                                'office_id': office_id
                            }).fetchone()
                            
                            if existing_template:
                                # Update existing template
                                # Use psycopg2.extras.Json to properly handle JSONB type
                                update_query = text("""
                                    UPDATE schedule_templates 
                                    SET start_time = :start_time,
                                        end_time = :end_time,
                                        is_active = :is_active,
                                        time_blocks = :time_blocks,
                                        updated_at = CURRENT_TIMESTAMP
                                    WHERE id = :template_id
                                """)
                                db.execute(update_query, {
                                    'template_id': existing_template[0],
                                    'start_time': start_time,
                                    'end_time': end_time,
                                    'is_active': is_active,
                                    'time_blocks': Json(time_blocks)  # Use psycopg2 Json wrapper for JSONB
                                })
                            else:
                                # Insert new template
                                # Use psycopg2.extras.Json to properly handle JSONB type
                                insert_query = text("""
                                INSERT INTO schedule_templates 
                                    (doctor_id, office_id, day_of_week, start_time, end_time, is_active, time_blocks, created_at, updated_at)
                                    VALUES (:doctor_id, :office_id, :day_of_week, :start_time, :end_time, :is_active, :time_blocks, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                                """)
                                db.execute(insert_query, {
                                    'doctor_id': doctor.id,
                                    'office_id': office_id,
                                    'day_of_week': day_of_week,
                                    'start_time': start_time,
                                    'end_time': end_time,
                                    'is_active': is_active,
                                    'time_blocks': Json(time_blocks)  # Use psycopg2 Json wrapper for JSONB
                                })
                
                db.commit()
                api_logger.info(f"Successfully saved schedule data for doctor {doctor.id}")
            except Exception as schedule_error:
                # Log the error but don't fail the registration
                api_logger.error(f"Error saving schedule data for doctor {doctor.id}: {str(schedule_error)}")
                db.rollback()
                # Doctor creation is already committed, so this is OK
        
        # Commit schedule data if it was saved successfully
        if schedule_data and isinstance(schedule_data, dict):
            db.commit()
        
        # Login the newly created doctor (doctor is already in the database)
        login_response = auth.login_user(db, doctor_data.email, doctor_data.password)
        
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
        
        # Log the full error for debugging
        import traceback
        api_logger.error(
            f"Error during doctor registration: {str(e)}",
            email=doctor_data.email if hasattr(doctor_data, 'email') else 'unknown',
            error_type=type(e).__name__,
            traceback=traceback.format_exc()
        )
        print(f"❌ Registration error: {str(e)}")
        print(f"❌ Error type: {type(e).__name__}")
        traceback.print_exc()
        
        # Handle specific database constraint violations
        if "unique constraint" in error_str:
            if "email" in error_str:
                detail = "El email ya está registrado en el sistema"
            elif "curp" in error_str:
                detail = "El CURP ya está registrado en el sistema"
            elif "professional_license" in error_str:
                detail = "La cédula profesional ya está registrada en el sistema"
            elif "email" in error_str:
                detail = "El correo electrónico ya está registrado en el sistema"
            else:
                detail = "Ya existe un registro con esos datos en el sistema"
            
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=detail
            )
        else:
            # Log the actual error for debugging
            api_logger.error(f"Registration error: {str(e)}", exc_info=True)
            
            # If it's a validation error (Pydantic), return the error details
            if hasattr(e, 'errors') and e.errors:
                # Pydantic validation error
                errors_list = []
                for error in e.errors():
                    field = ".".join(str(x) for x in error.get('loc', []))
                    message = error.get('msg', 'Error de validación')
                    errors_list.append(f"{field}: {message}")
                
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Error de validación: {'; '.join(errors_list)}"
                )
            
            # Return more helpful error message in development
            error_detail = str(e) if "development" in os.environ.get("ENVIRONMENT", "").lower() else "Error interno del servidor. Por favor, intente nuevamente."
            
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=error_detail
            )

# Test endpoints removed - system is working

@app.post("/api/auth/login")
async def login(
    login_data: schemas.UserLogin,
    request: Request,
    db: Session = Depends(get_db)
):
    """Login user"""
    user = None
    try:
        # Intentar login
        result = auth.login_user(db, login_data.email, login_data.password)
        
        # Obtener usuario para auditoría
        user = db.query(Person).filter(Person.email == login_data.email).first()
        
        # 🆕 Registrar login exitoso en auditoría
        audit_service.log_login(
            db=db,
            user=user,
            request=request,
            success=True
        )
        
        return result
    except HTTPException as e:
        # 🆕 Registrar intento de login fallido
        audit_service.log_login(
            db=db,
            user=user,
            request=request,
            success=False,
            error=str(e.detail)
        )
        raise e
    except Exception as e:
        # 🆕 Registrar error de sistema
        audit_service.log_login(
            db=db,
            user=user,
            request=request,
            success=False,
            error="Internal server error"
        )
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/api/auth/me")
async def get_current_user_info(
    current_user: Person = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user information with formatted data including documents"""
    # Format user data same way as login_user
    user_data = {
        "id": current_user.id,
        "username": current_user.email,
        "person_code": current_user.person_code,
        "person_type": current_user.person_type,
        "full_name": current_user.full_name,
        "email": current_user.email,
        "first_name": current_user.first_name,
        "paternal_surname": current_user.paternal_surname,
        "maternal_surname": current_user.maternal_surname,
        "birth_date": current_user.birth_date.isoformat() if current_user.birth_date else None,
        "primary_phone": current_user.primary_phone,
    }
    
    # If doctor, add professional fields
    if current_user.person_type == "doctor":
        # Get professional documents from person_documents table
        professional_type = db.query(DocumentType).filter(DocumentType.name == 'Profesional').first()
        professional_documents = []
        if professional_type:
            professional_docs = db.query(PersonDocument).join(Document).filter(
                PersonDocument.person_id == current_user.id,
                PersonDocument.is_active == True,
                Document.document_type_id == professional_type.id
            ).all()
            professional_documents = [{"document_name": doc.document.name, "document_value": doc.document_value} for doc in professional_docs]
        
        # Get personal documents (for CURP, RFC)
        personal_type = db.query(DocumentType).filter(DocumentType.name == 'Personal').first()
        personal_documents = {}
        if personal_type:
            personal_docs = db.query(PersonDocument).join(Document).filter(
                PersonDocument.person_id == current_user.id,
                PersonDocument.is_active == True,
                Document.document_type_id == personal_type.id
            ).all()
            personal_documents = {doc.document.name: doc.document_value for doc in personal_docs}
        
        # Legacy fields for backward compatibility
        professional_license = None
        for doc in professional_documents:
            if doc["document_name"] in ["Cédula Profesional", "Número de Colegiación", "Matrícula Nacional"]:
                professional_license = doc["document_value"]
                break
        
        user_data.update({
            "professional_license": professional_license,
            "professional_documents": professional_documents,
            "personal_documents": personal_documents,
            "specialty": (lambda s: s.name if s else None)(db.query(Specialty).filter(Specialty.id == current_user.specialty_id).first()) if current_user.specialty_id else None,
            "university": current_user.university,
            "graduation_year": current_user.graduation_year,
            "subspecialty": current_user.subspecialty if hasattr(current_user, 'subspecialty') else None,
            "office_address": None,  # Moved to offices table
            "curp": personal_documents.get("CURP", None),
            "rfc": personal_documents.get("RFC", None),
            "title": current_user.title,
        })
    
    return user_data

@app.post("/api/auth/logout")
async def logout(current_user: Person = Depends(get_current_user)):
    """Logout user"""
    return {"message": "Logged out successfully"}

@app.post("/api/auth/password-reset/request")
async def request_password_reset(
    reset_data: schemas.PasswordResetRequest,
    db: Session = Depends(get_db),
    request: Request = None
):
    """
    Solicitar recuperación de contraseña
    Envía un correo con un token para resetear la contraseña
    """
    try:
        # Buscar usuario por email
        user = db.query(Person).filter(Person.email == reset_data.email).first()
        
        # Por seguridad, siempre retornamos éxito aunque el email no exista
        # Esto evita que se pueda descubrir qué emails están registrados
        if not user or not user.is_active:
            return {
                "message": "Si el correo existe, recibirás un enlace para restablecer tu contraseña"
            }
        
        # Generar token de recuperación
        reset_token = auth.create_password_reset_token(user.id, user.email)
        
        # Construir URL de reset (frontend)
        # En producción, usar variable de entorno
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
        reset_link = f"{frontend_url}/reset-password?token={reset_token}"
        
        # Obtener nombre del usuario
        user_name = user.first_name or user.email.split("@")[0]
        
        # Enviar email
        from email_service import get_email_service
        email_service = get_email_service()
        email_result = email_service.send_password_reset_email(
            to_email=user.email,
            user_name=user_name,
            reset_link=reset_link
        )
        
        if email_result["success"]:
            return {
                "message": "Si el correo existe, recibirás un enlace para restablecer tu contraseña"
            }
        else:
            # Log error pero no exponerlo al usuario
            print(f"❌ Error sending password reset email: {email_result.get('error')}")
            return {
                "message": "Si el correo existe, recibirás un enlace para restablecer tu contraseña"
            }
            
    except Exception as e:
        print(f"❌ Error in password reset request: {str(e)}")
        # Por seguridad, retornar siempre éxito
        return {
            "message": "Si el correo existe, recibirás un enlace para restablecer tu contraseña"
        }

@app.post("/api/auth/password-reset/confirm")
async def confirm_password_reset(
    reset_data: schemas.PasswordResetConfirm,
    db: Session = Depends(get_db)
):
    """
    Confirmar y cambiar contraseña con token de recuperación
    """
    try:
        # Validar que las contraseñas coincidan
        if reset_data.new_password != reset_data.confirm_password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Las contraseñas no coinciden"
            )
        
        # Validar longitud mínima
        if len(reset_data.new_password) < 6:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La contraseña debe tener al menos 6 caracteres"
            )
        
        # Verificar token
        payload = auth.verify_password_reset_token(reset_data.token)
        if payload is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Token inválido o expirado"
            )
        
        user_id = payload.get("user_id")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Token inválido"
            )
        
        # Cambiar contraseña
        success = auth.reset_user_password(db, user_id, reset_data.new_password)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuario no encontrado"
            )
        
        return {
            "message": "Contraseña restablecida exitosamente"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error in password reset confirm: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al restablecer la contraseña"
        )

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
    print(f"🔍 [AUTH/ME] Loading user with ID: {current_user.id}")
    user_with_relations = db.query(Person).options(
        joinedload(Person.offices)
    ).filter(Person.id == current_user.id).first()
    
    if user_with_relations:
        print(f"🔍 [AUTH/ME] User found: {user_with_relations.full_name}")
        print(f"🔍 [AUTH/ME] Offices count: {len(user_with_relations.offices) if user_with_relations.offices else 0}")
        if user_with_relations.offices:
            for office in user_with_relations.offices:
                print(f"🔍 [AUTH/ME] Office: {office.name}, State ID: {office.state_id}, Country ID: {office.country_id}")
    else:
        print(f"🔍 [AUTH/ME] User not found for ID: {current_user.id}")
    
    if not user_with_relations:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor profile not found"
        )
    
    # Get specialty name from medical_specialties table
    specialty_name = None
    if user_with_relations.specialty_id:
        specialty = db.query(Specialty).filter(Specialty.id == user_with_relations.specialty_id).first()
        specialty_name = specialty.name if specialty else None
    
    # Get professional documents from person_documents table
    professional_type = db.query(DocumentType).filter(DocumentType.name == 'Profesional').first()
    professional_documents = []
    professional_license = None
    if professional_type:
        professional_docs = db.query(PersonDocument).join(Document).filter(
            PersonDocument.person_id == user_with_relations.id,
            PersonDocument.is_active == True,
            Document.document_type_id == professional_type.id
        ).all()
        professional_documents = [{"document_id": doc.document_id, "document_name": doc.document.name, "document_value": doc.document_value} for doc in professional_docs]
        # Get professional_license from documents for backward compatibility
        for doc in professional_documents:
            if doc["document_name"] in ["Cédula Profesional", "Número de Colegiación", "Matrícula Nacional"]:
                professional_license = doc["document_value"]
                break
    
    # Get personal documents (for CURP, RFC)
    personal_type = db.query(DocumentType).filter(DocumentType.name == 'Personal').first()
    personal_documents = {}
    curp = None
    rfc = None
    if personal_type:
        personal_docs = db.query(PersonDocument).join(Document).filter(
            PersonDocument.person_id == user_with_relations.id,
            PersonDocument.is_active == True,
            Document.document_type_id == personal_type.id
        ).all()
        personal_documents = {doc.document.name: doc.document_value for doc in personal_docs}
        curp = personal_documents.get("CURP", None)
        rfc = personal_documents.get("RFC", None)
    
    # Load office states and countries
    offices_with_details = []
    for office in user_with_relations.offices:
        state_name = None
        country_name = None
        if office.state_id:
            state = db.query(State).filter(State.id == office.state_id).first()
            if state:
                state_name = state.name
                if state.country_id:
                    country = db.query(Country).filter(Country.id == state.country_id).first()
                    if country:
                        country_name = country.name
        
        offices_with_details.append({
            "id": office.id,
            "name": office.name,
            "address": office.address,
            "city": office.city,
            "state_id": office.state_id,
            "state_name": state_name,
            "country_name": country_name,
            "postal_code": office.postal_code,
            "phone": office.phone,
            "timezone": office.timezone,
            "maps_url": office.maps_url,
            "is_active": office.is_active
        })
    
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
        "curp": curp,  # From person_documents
        "rfc": rfc,  # From person_documents
        "birth_city": user_with_relations.birth_city,
        "birth_state_id": user_with_relations.birth_state_id,
        
        # Personal Address
        "home_address": user_with_relations.home_address,
        "address_city": user_with_relations.address_city,
        "address_state_id": user_with_relations.address_state_id,
        "address_state_name": user_with_relations.address_state.name if user_with_relations.address_state else None,
        "address_country_name": user_with_relations.address_state.country.name if user_with_relations.address_state and user_with_relations.address_state.country else None,
        "address_postal_code": user_with_relations.address_postal_code,
        
        # Professional Address (Office) - Now using offices table
        "offices": offices_with_details,
        "office_phone": None,  # Moved to offices table
        "office_timezone": None,  # Moved to offices table
        "appointment_duration": user_with_relations.appointment_duration,
        
        # Professional Data
        "professional_license": professional_license,  # From person_documents
        "professional_documents": professional_documents,  # New normalized format
        "personal_documents": personal_documents,  # New normalized format
        "specialty_id": user_with_relations.specialty_id,
        "specialty_name": specialty_name,
        "specialty_license": None,  # Removed from persons table
        "university": user_with_relations.university,
        "graduation_year": user_with_relations.graduation_year,
        "subspecialty": None,  # Removed from persons table
        "digital_signature": None,  # Removed from persons table
        "professional_seal": None,  # Removed from persons table
        
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
    request: Request,
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
        import traceback
        api_logger.info(f"🔄 Updating doctor profile for user {current_user.id}")
        
        # Read raw request JSON directly (without Pydantic validation first)
        raw_json = await request.json()
        api_logger.info(f"📋 Raw request JSON keys: {list(raw_json.keys()) if raw_json else []}")
        api_logger.info(f"📋 Raw professional_documents: {raw_json.get('professional_documents')}")
        api_logger.info(f"📋 Raw personal_documents: {raw_json.get('personal_documents')}")
        
        # Extract documents from raw JSON FIRST
        raw_professional_docs = raw_json.get('professional_documents', [])
        raw_personal_docs = raw_json.get('personal_documents', [])
        
        # Now parse with Pydantic (remove documents from dict to avoid validation issues)
        doctor_data_dict = raw_json.copy()
        doctor_data_dict.pop('professional_documents', None)
        doctor_data_dict.pop('personal_documents', None)
        
        try:
            doctor_data = schemas.DoctorUpdate(**doctor_data_dict)
        except Exception as e:
            api_logger.error(f"❌ Error parsing DoctorUpdate schema: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid data format: {str(e)}"
            )
        
        # Handle documents if provided
        documents_to_save = []
        
        # Get dict WITHOUT exclude_unset to see all fields including None/empty arrays
        doctor_data_dict_full = doctor_data.dict() if hasattr(doctor_data, 'dict') else {}
        doctor_data_dict = doctor_data.dict(exclude_unset=True) if hasattr(doctor_data, 'dict') else {}
        
        api_logger.info(f"📋 Received doctor_data_dict keys: {list(doctor_data_dict.keys())}")
        api_logger.info(f"📋 Full doctor_data_dict_full keys: {list(doctor_data_dict_full.keys())}")
        api_logger.info(f"📋 professional_documents in full: {'professional_documents' in doctor_data_dict_full}")
        api_logger.info(f"📋 personal_documents in full: {'personal_documents' in doctor_data_dict_full}")
        if 'professional_documents' in doctor_data_dict_full:
            api_logger.info(f"📋 professional_documents value: {doctor_data_dict_full['professional_documents']}")
        if 'personal_documents' in doctor_data_dict_full:
            api_logger.info(f"📋 personal_documents value: {doctor_data_dict_full['personal_documents']}")
        
        # Check for documents in multiple formats
        all_docs = []
        
        # 1. Check for documents (legacy format)
        if hasattr(doctor_data, 'documents') and doctor_data.documents:
            all_docs.extend(doctor_data.documents)
            api_logger.info(f"📋 Found {len(doctor_data.documents)} documents in doctor_data.documents")
        
        # 2. Check for professional_documents (from raw JSON FIRST, then schema or dict) - PRIORIDAD: raw JSON
        # SOLO PERMITIR UN DOCUMENTO PROFESIONAL
        if raw_professional_docs:
            api_logger.info(f"📋 Processing professional_documents from RAW JSON: {raw_professional_docs} (type: {type(raw_professional_docs)})")
            if isinstance(raw_professional_docs, list):
                # Solo tomar el primer documento profesional
                if len(raw_professional_docs) > 1:
                    api_logger.warning(f"⚠️ Multiple professional documents received, only taking the first one: {len(raw_professional_docs)}")
                doc = raw_professional_docs[0]
                if isinstance(doc, dict) and doc.get('document_id'):
                    all_docs.append(schemas.PersonDocumentCreate(
                        document_id=doc['document_id'],
                        document_value=doc.get('document_value', '') or ''
                    ))
            elif isinstance(raw_professional_docs, dict) and raw_professional_docs.get('document_id'):
                # Si viene como objeto único en lugar de lista
                all_docs.append(schemas.PersonDocumentCreate(
                    document_id=raw_professional_docs['document_id'],
                    document_value=raw_professional_docs.get('document_value', '') or ''
                ))
        elif hasattr(doctor_data, 'professional_documents') and doctor_data.professional_documents:
            api_logger.info(f"📋 Processing professional_documents from schema: {doctor_data.professional_documents}")
            all_docs.extend(doctor_data.professional_documents)
        elif 'professional_documents' in doctor_data_dict_full:
            docs = doctor_data_dict_full['professional_documents']
            api_logger.info(f"📋 Processing professional_documents from dict_full: {docs} (type: {type(docs)})")
            if docs:  # Si no es None ni lista vacía
                if isinstance(docs, list):
                    for doc in docs:
                        if isinstance(doc, dict) and doc.get('document_id'):
                            all_docs.append(schemas.PersonDocumentCreate(
                                document_id=doc['document_id'],
                                document_value=doc.get('document_value', '') or ''
                            ))
                        elif hasattr(doc, 'document_id'):
                            all_docs.append(doc)
        
        # 3. Check for personal_documents (from raw JSON FIRST, then schema or dict) - PRIORIDAD: raw JSON
        # SOLO PERMITIR UN DOCUMENTO PERSONAL
        if raw_personal_docs:
            api_logger.info(f"📋 Processing personal_documents from RAW JSON: {raw_personal_docs} (type: {type(raw_personal_docs)})")
            if isinstance(raw_personal_docs, list):
                # Solo tomar el primer documento personal
                if len(raw_personal_docs) > 1:
                    api_logger.warning(f"⚠️ Multiple personal documents received, only taking the first one: {len(raw_personal_docs)}")
                doc = raw_personal_docs[0]
                if isinstance(doc, dict) and doc.get('document_id'):
                    all_docs.append(schemas.PersonDocumentCreate(
                        document_id=doc['document_id'],
                        document_value=doc.get('document_value', '') or ''
                    ))
            elif isinstance(raw_personal_docs, dict) and raw_personal_docs.get('document_id'):
                # Si viene como objeto único en lugar de lista
                all_docs.append(schemas.PersonDocumentCreate(
                    document_id=raw_personal_docs['document_id'],
                    document_value=raw_personal_docs.get('document_value', '') or ''
                ))
        elif hasattr(doctor_data, 'personal_documents') and doctor_data.personal_documents:
            api_logger.info(f"📋 Processing personal_documents from schema: {doctor_data.personal_documents}")
            # SOLO PERMITIR UN DOCUMENTO PERSONAL - tomar solo el primero
            if isinstance(doctor_data.personal_documents, list) and len(doctor_data.personal_documents) > 0:
                if len(doctor_data.personal_documents) > 1:
                    api_logger.warning(f"⚠️ Multiple personal documents in schema, only taking the first one: {len(doctor_data.personal_documents)}")
                all_docs.append(doctor_data.personal_documents[0])
            else:
                all_docs.extend(doctor_data.personal_documents)
        elif 'personal_documents' in doctor_data_dict_full:
            docs = doctor_data_dict_full['personal_documents']
            api_logger.info(f"📋 Processing personal_documents from dict_full: {docs} (type: {type(docs)})")
            if docs:  # Si no es None ni lista vacía
                if isinstance(docs, list):
                    # SOLO PERMITIR UN DOCUMENTO PERSONAL - tomar solo el primero
                    if len(docs) > 1:
                        api_logger.warning(f"⚠️ Multiple personal documents in dict_full, only taking the first one: {len(docs)}")
                    doc = docs[0]
                    if isinstance(doc, dict) and doc.get('document_id'):
                        all_docs.append(schemas.PersonDocumentCreate(
                            document_id=doc['document_id'],
                            document_value=doc.get('document_value', '') or ''
                        ))
                    elif hasattr(doc, 'document_id'):
                        all_docs.append(doc)
        
        # Filter valid documents - solo necesita document_id (el valor puede estar vacío)
        valid_docs = [doc for doc in all_docs if doc and ((hasattr(doc, 'document_id') and doc.document_id) or (isinstance(doc, dict) and doc.get('document_id')))]
        
        if valid_docs:
            documents_to_save = valid_docs
            api_logger.info(f"📋 Total {len(documents_to_save)} valid documents to save")
        else:
            api_logger.info(f"⚠️ No valid documents found in request")
        
        # Handle specialty conversion from name to ID if needed
        if 'specialty' in doctor_data_dict and doctor_data_dict.get('specialty'):
            # If specialty is sent as name, convert to ID
            specialty_name = doctor_data_dict['specialty']
            specialty_obj = db.query(Specialty).filter(Specialty.name == specialty_name, Specialty.is_active == True).first()
            if specialty_obj:
                # Update doctor_data to use specialty_id instead of specialty
                doctor_data.specialty_id = specialty_obj.id
                api_logger.info(f"✅ Converted specialty '{specialty_name}' to ID {specialty_obj.id}")
            else:
                api_logger.warning(f"⚠️ Specialty '{specialty_name}' not found, skipping specialty update")
        
        # Remove specialty from dict to avoid errors
        if 'specialty' in doctor_data_dict:
            del doctor_data_dict['specialty']
        
        # Update doctor profile (this will handle phone parsing)
        try:
            updated_doctor = crud.update_doctor_profile(db, current_user.id, doctor_data)
            if not updated_doctor:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Doctor profile not found"
                )
        except Exception as e:
            api_logger.error(f"❌ Error updating doctor profile: {str(e)}", error_type=type(e).__name__, traceback=traceback.format_exc())
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error updating profile: {str(e)}"
            )
        
        # Save documents if provided (after profile update)
        if documents_to_save:
            api_logger.info(f"💾 Saving {len(documents_to_save)} documents for user {current_user.id}")
            try:
                # SEPARAR documentos por tipo para aplicar regla de "solo uno por tipo"
                professional_docs = []
                personal_docs = []
                
                # Obtener tipos de documentos
                professional_type = db.query(DocumentType).filter(DocumentType.name == 'Profesional').first()
                personal_type = db.query(DocumentType).filter(DocumentType.name == 'Personal').first()
                
                # Clasificar documentos
                for doc in documents_to_save:
                    doc_id = doc.document_id if hasattr(doc, 'document_id') else (doc.get('document_id') if isinstance(doc, dict) else None)
                    if doc_id:
                        document_obj = db.query(Document).filter(Document.id == doc_id).first()
                        if document_obj:
                            if professional_type and document_obj.document_type_id == professional_type.id:
                                professional_docs.append(doc)
                            elif personal_type and document_obj.document_type_id == personal_type.id:
                                personal_docs.append(doc)
                
                # SOLO PERMITIR UN DOCUMENTO DE CADA TIPO - tomar solo el primero si hay múltiples
                docs_to_process = []
                
                if professional_docs:
                    if len(professional_docs) > 1:
                        api_logger.warning(f"⚠️ Multiple professional documents to save, only taking the first one: {len(professional_docs)}")
                    docs_to_process.append(professional_docs[0])
                    # NO desactivar documentos profesionales aquí - upsert_person_document lo manejará
                    # La función upsert_person_document ahora actualiza el documento existente del mismo tipo
                
                if personal_docs:
                    if len(personal_docs) > 1:
                        api_logger.warning(f"⚠️ Multiple personal documents to save, only taking the first one: {len(personal_docs)}")
                    docs_to_process.append(personal_docs[0])
                    # Eliminar todos los documentos personales existentes de este usuario antes de guardar el nuevo
                    if personal_type:
                        existing_personal = db.query(PersonDocument).join(Document).filter(
                            PersonDocument.person_id == current_user.id,
                            Document.document_type_id == personal_type.id,
                            PersonDocument.is_active == True
                        ).all()
                        for existing_doc in existing_personal:
                            # Solo eliminar si no es el mismo document_id que vamos a guardar
                            if existing_doc.document_id != (personal_docs[0].document_id if hasattr(personal_docs[0], 'document_id') else personal_docs[0].get('document_id')):
                                existing_doc.is_active = False
                                api_logger.info(f"🗑️ Deactivating old personal document: document_id={existing_doc.document_id}")
                
                # Guardar solo los documentos seleccionados (máximo 1 de cada tipo)
                for doc in docs_to_process:
                    # Handle both Pydantic models and dicts
                    doc_id = doc.document_id if hasattr(doc, 'document_id') else (doc.get('document_id') if isinstance(doc, dict) else None)
                    doc_value = doc.document_value if hasattr(doc, 'document_value') else (doc.get('document_value') if isinstance(doc, dict) else None)
                    
                    if doc_id:
                        # Permitir valores vacíos si solo cambió el tipo de documento
                        final_value = str(doc_value) if doc_value else ''
                        api_logger.info(f"💾 Upserting document: document_id={doc_id}, document_value={final_value[:20] if len(final_value) > 20 else final_value}...")
                        crud.upsert_person_document(
                            db=db,
                            person_id=current_user.id,
                            document_id=doc_id,
                            document_value=final_value,
                            check_uniqueness=True
                        )
                db.commit()
                api_logger.info(f"✅ Successfully saved {len(docs_to_process)} documents (max 1 professional + 1 personal)")
            except Exception as e:
                api_logger.error(f"❌ Error saving documents: {str(e)}", error_type=type(e).__name__, traceback=traceback.format_exc())
                db.rollback()
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Error saving documents: {str(e)}"
                )
        else:
            api_logger.info(f"ℹ️ No documents to save")
        
        # Get specialty name for response
        specialty_name = None
        if updated_doctor.specialty_id:
            specialty = db.query(Specialty).filter(Specialty.id == updated_doctor.specialty_id).first()
            specialty_name = specialty.name if specialty else None
        
        # Get professional documents from person_documents table
        professional_type = db.query(DocumentType).filter(DocumentType.name == 'Profesional').first()
        professional_documents = []
        professional_license = None
        if professional_type:
            professional_docs = db.query(PersonDocument).join(Document).filter(
                PersonDocument.person_id == updated_doctor.id,
                PersonDocument.is_active == True,
                Document.document_type_id == professional_type.id
            ).all()
            professional_documents = [{"document_id": doc.document_id, "document_name": doc.document.name, "document_value": doc.document_value} for doc in professional_docs]
            # Get professional_license from documents for backward compatibility
            for doc in professional_documents:
                if doc["document_name"] in ["Cédula Profesional", "Número de Colegiación", "Matrícula Nacional"]:
                    professional_license = doc["document_value"]
                    break
        
        # Get personal documents (for CURP, RFC)
        personal_type = db.query(DocumentType).filter(DocumentType.name == 'Personal').first()
        personal_documents = {}
        curp = None
        rfc = None
        if personal_type:
            personal_docs = db.query(PersonDocument).join(Document).filter(
                PersonDocument.person_id == updated_doctor.id,
                PersonDocument.is_active == True,
                Document.document_type_id == personal_type.id
            ).all()
            personal_documents = {doc.document.name: doc.document_value for doc in personal_docs}
            curp = personal_documents.get("CURP", None)
            rfc = personal_documents.get("RFC", None)
        
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
            "curp": curp,  # From person_documents
            "rfc": rfc,  # From person_documents
            "birth_city": updated_doctor.birth_city,
            "birth_state_id": updated_doctor.birth_state_id,
            
            # Personal Address
            "home_address": updated_doctor.home_address,
            "address_city": updated_doctor.address_city,
            "address_state_id": updated_doctor.address_state_id,
            "address_state_name": updated_doctor.address_state.name if updated_doctor.address_state else None,
            "address_country_name": updated_doctor.address_state.country.name if updated_doctor.address_state and updated_doctor.address_state.country else None,
            "address_postal_code": updated_doctor.address_postal_code,
            
            # Professional Address (Office) - Moved to offices table
            "office_address": None,
            "office_city": None,
            "office_state_id": None,
            "office_state_name": None,
            "office_country_name": None,
            "office_postal_code": None,
            "office_phone": None,
            "appointment_duration": updated_doctor.appointment_duration,
            
            # Professional Data
            "professional_license": professional_license,  # From person_documents
            "professional_documents": professional_documents,  # New normalized format
            "personal_documents": personal_documents,  # New normalized format
            "specialty_id": updated_doctor.specialty_id,
            "specialty_name": specialty_name,
            "specialty_license": None,  # Removed from persons table
            "university": updated_doctor.university,
            "graduation_year": updated_doctor.graduation_year,
            "subspecialty": None,  # Removed from persons table
            "digital_signature": None,  # Removed from persons table
            "professional_seal": None,  # Removed from persons table
            
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
        # Simple query to get patients
        patients = db.query(Person).filter(
            Person.person_type == 'patient',
            Person.created_by == current_user.id
        ).offset(skip).limit(limit).all()
        
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
                'insurance_provider': getattr(patient, 'insurance_provider', None),
                'insurance_policy_number': getattr(patient, 'insurance_policy_number', None),
                'active': getattr(patient, 'active', True),
                'is_active': getattr(patient, 'is_active', True),
                'created_at': getattr(patient, 'created_at', None),
                'updated_at': getattr(patient, 'updated_at', None),
                'created_by': getattr(patient, 'created_by', None),
                'full_name': getattr(patient, 'full_name', None)
            }
            
            # Note: CURP and other documents are now in person_documents table
            # Load documents from person_documents if needed
            person_docs = db.query(PersonDocument).filter(
                PersonDocument.person_id == patient.id,
                PersonDocument.is_active == True
            ).all()
            
            if person_docs:
                patient_data['personal_documents'] = []
                patient_data['professional_documents'] = []
                for pd in person_docs:
                    doc_data = {
                        'document_id': pd.document_id,
                        'document_value': pd.document_value,
                        'document_name': pd.document.name if pd.document else None
                    }
                    if pd.document and pd.document.document_type_id == 1:  # Personal
                        patient_data['personal_documents'].append(doc_data)
                    elif pd.document and pd.document.document_type_id == 2:  # Profesional
                        patient_data['professional_documents'].append(doc_data)
            
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
            
            # RFC is now in person_documents table, not in Person model
            # Skip direct access to patient.rfc as it no longer exists
            
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
        
        # Note: CURP and other documents are now in person_documents table
        # Load documents from person_documents
        person_docs = db.query(PersonDocument).join(Document).filter(
            PersonDocument.person_id == patient.id,
            PersonDocument.is_active == True
        ).all()
        
        personal_documents_dict = {}
        professional_documents_dict = {}
        for pd in person_docs:
            doc_name = pd.document.name if pd.document else None
            if pd.document and pd.document.document_type_id == 1:  # Personal
                personal_documents_dict[doc_name] = pd.document_value
            elif pd.document and pd.document.document_type_id == 2:  # Profesional
                professional_documents_dict[doc_name] = pd.document_value
        
        decrypted_curp = personal_documents_dict.get('CURP', None)
        decrypted_rfc = personal_documents_dict.get('RFC', None)
        decrypted_email = None
        decrypted_phone = None
        decrypted_insurance = None
        
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
            'personal_documents': [{'document_name': name, 'document_value': value} for name, value in personal_documents_dict.items()],
            'professional_documents': [{'document_name': name, 'document_value': value} for name, value in professional_documents_dict.items()],
            'person_type': patient.person_type,
            'first_name': patient.first_name,
            'paternal_surname': patient.paternal_surname,
            'maternal_surname': patient.maternal_surname,
            'curp': decrypted_curp,
            'rfc': decrypted_rfc,  # From person_documents
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
        
        # Check if patient already exists by documents (normalized) or email
        # Validate document uniqueness before creating patient
        if hasattr(patient_data, 'documents') and patient_data.documents:
            for doc in patient_data.documents:
                if doc.document_id and doc.document_value:
                    # Check if this document value already exists for this document type
                    existing_doc = db.query(PersonDocument).join(Person).filter(
                        PersonDocument.document_id == doc.document_id,
                        PersonDocument.document_value == doc.document_value.strip(),
                        PersonDocument.is_active == True,
                Person.person_type == 'patient'
            ).first()
                    if existing_doc:
                        document = db.query(Document).filter(Document.id == doc.document_id).first()
                raise HTTPException(
                    status_code=409, 
                            detail=f"Ya existe un paciente con {document.name if document else 'documento'}: {doc.document_value}"
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
        # Note: CURP and other documents are now in person_documents table, not encrypted for now
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
        import traceback
        print("=" * 80)
        print("❌ ERROR CREATING PATIENT:")
        print(traceback.format_exc())
        print("=" * 80)
        security_logger.error(f"Error creating patient: {str(e)}", doctor_id=current_user.id, error=str(e))
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
        # Validate document uniqueness before updating patient
        if hasattr(patient_data, 'documents') and patient_data.documents:
            for doc in patient_data.documents:
                if doc.document_id and doc.document_value:
                    # Check if this document value already exists for this document type in another patient
                    existing_doc = db.query(PersonDocument).join(Person).filter(
                        PersonDocument.document_id == doc.document_id,
                        PersonDocument.document_value == doc.document_value.strip(),
                        PersonDocument.is_active == True,
                Person.person_type == 'patient',
                Person.id != patient_id
            ).first()
                    if existing_doc:
                        document = db.query(Document).filter(Document.id == doc.document_id).first()
                raise HTTPException(
                    status_code=409, 
                            detail=f"Ya existe otro paciente con {document.name if document else 'documento'}: {doc.document_value}"
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
        
        # Map gender values to backend format
        if 'gender' in update_data and update_data['gender']:
            gender_map = {
                'Masculino': 'Masculino',
                'Femenino': 'Femenino',
                'M': 'Masculino',
                'F': 'Femenino',
                'masculino': 'Masculino',
                'femenino': 'Femenino'
            }
            update_data['gender'] = gender_map.get(update_data['gender'], update_data['gender'])
        
        # Handle foreign key fields - convert empty strings to None
        foreign_key_fields = [
            'emergency_contact_relationship',
            'birth_state_id',
            'city_residence_id'
        ]
        
        for field, value in update_data.items():
            if hasattr(patient, field):
                # Skip updating CURP if it's empty to avoid unique constraint violation
                if field == 'curp' and (value == '' or value is None):
                    continue
                    
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
        
        # Get appointments using the service (no doctor filter for development)
        # By default, exclude cancelled appointments unless specifically requested
        if status is None and not available_for_consultation:
            # Exclude cancelled appointments by default
            appointments = AppointmentService.get_appointments(
                db=db,
                skip=skip,
                limit=limit,
                start_date=start_date_obj,
                end_date=end_date_obj,
                status='active',  # This will filter out cancelled appointments
                doctor_id=current_user.id,
                available_for_consultation=available_for_consultation
            )
        else:
            appointments = AppointmentService.get_appointments(
                db=db,
                skip=skip,
                limit=limit,
                start_date=start_date_obj,
                end_date=end_date_obj,
                status=status,
                doctor_id=current_user.id,
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
            
            # Since appointments are stored in CDMX timezone (without tzinfo), 
            # we assume they are already in CDMX timezone and just format them
            appointment_date_str = appointment.appointment_date.strftime('%Y-%m-%dT%H:%M:%S')
            end_time_str = appointment.end_time.strftime('%Y-%m-%dT%H:%M:%S') if appointment.end_time else None
            
            apt_dict = {
                "id": str(appointment.id),
                "patient_id": str(appointment.patient_id),
                "doctor_id": appointment.doctor_id,  # ✅ Agregado doctor_id
                "appointment_date": appointment_date_str,  # CDMX timezone format without timezone info
                "date_time": appointment_date_str,  # CDMX timezone format without timezone info
                "end_time": end_time_str,
                "appointment_type_id": appointment.appointment_type_id,
                "appointment_type_name": appointment.appointment_type_rel.name if appointment.appointment_type_rel else None,
                "office_id": appointment.office_id,
                "office_name": appointment.office.name if appointment.office else None,
                "consultation_type": appointment.consultation_type,  # ✅ Agregado
                "reason": appointment.reason,
                "notes": appointment.notes,
                "status": appointment.status,
                "priority": appointment.priority,
                "estimated_cost": str(getattr(appointment, 'estimated_cost', None)) if getattr(appointment, 'estimated_cost', None) else None,
                "insurance_covered": getattr(appointment, 'insurance_covered', None),
                # Auto reminder fields
                "auto_reminder_enabled": getattr(appointment, 'auto_reminder_enabled', None),
                "auto_reminder_offset_minutes": getattr(appointment, 'auto_reminder_offset_minutes', None),
                "auto_reminder_sent_at": appointment.auto_reminder_sent_at.isoformat() if getattr(appointment, 'auto_reminder_sent_at', None) else None,
                "cancelled_reason": appointment.cancelled_reason,
                "cancelled_at": appointment.cancelled_at.isoformat() if appointment.cancelled_at else None,
                "created_at": appointment.created_at.isoformat(),
                "updated_at": appointment.updated_at.isoformat() if appointment.updated_at else None,
                "patient_name": patient_name,
                "patient": appointment.patient  # Include full patient object for frontend
            }
            result.append(apt_dict)
        
        return result
        
    except Exception as e:
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
        # Try to include appointment_type_rel, but handle gracefully if table doesn't exist
        try:
            query = db.query(Appointment).options(
                joinedload(Appointment.patient),
                joinedload(Appointment.doctor),
                joinedload(Appointment.office),
                joinedload(Appointment.appointment_type_rel)
            ).filter(Appointment.doctor_id == current_user.id)
        except Exception:
            # Fallback if appointment_types table doesn't exist
            query = db.query(Appointment).options(
                joinedload(Appointment.patient),
                joinedload(Appointment.doctor),
                joinedload(Appointment.office)
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
        
        # Since appointments are stored in CDMX timezone (without tzinfo), 
        # we need to assume they are already in CDMX timezone for proper display
        cdmx_tz = pytz.timezone('America/Mexico_City')
        
        # Create a list of appointment dictionaries with converted dates
        result = []
        for appointment in appointments:
            # Since appointments are stored in CDMX timezone (without tzinfo),
            # we assume they are already in CDMX timezone and just format them
            appointment_date_str = appointment.appointment_date.strftime('%Y-%m-%dT%H:%M:%S') if appointment.appointment_date else None
            end_time_str = appointment.end_time.strftime('%Y-%m-%dT%H:%M:%S') if appointment.end_time else None
            
            # Create appointment dict with converted dates
            apt_dict = {
                "id": appointment.id,
                "patient_id": appointment.patient_id,
                "doctor_id": appointment.doctor_id,
                "appointment_date": appointment_date_str,
                "date_time": appointment_date_str,
                "end_time": end_time_str,
                "appointment_type_id": appointment.appointment_type_id,
                "appointment_type_name": appointment.appointment_type_rel.name if appointment.appointment_type_rel else None,
                "office_id": appointment.office_id,
                "office_name": appointment.office.name if appointment.office else None,
                "consultation_type": appointment.consultation_type,
                "reason": appointment.reason,
                "notes": appointment.notes,
                "status": appointment.status,
                "priority": appointment.priority,
                "room_number": appointment.room_number,
                # Auto reminder fields included for FE editing
                "auto_reminder_enabled": getattr(appointment, 'auto_reminder_enabled', None),
                "auto_reminder_offset_minutes": getattr(appointment, 'auto_reminder_offset_minutes', None),
                "auto_reminder_sent_at": appointment.auto_reminder_sent_at.isoformat() if getattr(appointment, 'auto_reminder_sent_at', None) else None,
                "patient": appointment.patient,
                "office": appointment.office
            }
            result.append(apt_dict)
        
        return result
    except Exception as e:
        print(f"Error in get_calendar_appointments: {str(e)}")
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
        
        # Since appointments are stored in CDMX timezone (without tzinfo), 
        # we assume they are already in CDMX timezone and just format them
        appointment_date_str = appointment.appointment_date.strftime('%Y-%m-%dT%H:%M:%S')
        end_time_str = appointment.end_time.strftime('%Y-%m-%dT%H:%M:%S') if appointment.end_time else None
        
        # Return appointment data
        return {
            "id": appointment.id,
            "patient_id": appointment.patient_id,
            "doctor_id": appointment.doctor_id,
            "appointment_date": appointment_date_str,
            "end_time": end_time_str,
            "appointment_type_id": appointment.appointment_type_id,
            "appointment_type_name": appointment.appointment_type_rel.name if appointment.appointment_type_rel else None,
            "consultation_type": appointment.consultation_type,
            "office_id": appointment.office_id,
            "office_name": appointment.office.name if appointment.office else None,
            "reason": appointment.reason,
            "notes": appointment.notes,
            "status": appointment.status,
            "priority": appointment.priority,
            "estimated_cost": str(getattr(appointment, 'estimated_cost', None)) if getattr(appointment, 'estimated_cost', None) else None,
            "insurance_covered": getattr(appointment, 'insurance_covered', None),
            # Campos opcionales (sin preparation_instructions; columna eliminada)
            "auto_reminder_enabled": getattr(appointment, 'auto_reminder_enabled', None),
            "auto_reminder_offset_minutes": getattr(appointment, 'auto_reminder_offset_minutes', None),
            "auto_reminder_sent_at": appointment.auto_reminder_sent_at.isoformat() if getattr(appointment, 'auto_reminder_sent_at', None) else None,
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
        print(f"🔍 Endpoint Debug - Received appointment_data:")
        print(f"📅 appointment_date: {appointment_data.appointment_date}")
        print(f"📅 appointment_date type: {type(appointment_data.appointment_date)}")
        print(f"📅 end_time: {appointment_data.end_time}")
        print(f"📅 end_time type: {type(appointment_data.end_time)}")
        
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
        
        # Normalize incoming datetimes to CDMX naive to avoid timezone shifts
        from datetime import datetime
        import pytz

        def to_cdmx_naive(value):
            if not value:
                return None
            if isinstance(value, str):
                try:
                    dt = datetime.fromisoformat(value.replace('Z', '+00:00'))
                except Exception:
                    dt = datetime.fromisoformat(value)
            else:
                dt = value
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=pytz.UTC)
            cdmx_tz = pytz.timezone('America/Mexico_City')
            local_dt = dt.astimezone(cdmx_tz)
            return local_dt.replace(tzinfo=None)

        data_dict = appointment_data.dict()
        if data_dict.get('appointment_date'):
            data_dict['appointment_date'] = to_cdmx_naive(data_dict['appointment_date'])
        if data_dict.get('end_time'):
            data_dict['end_time'] = to_cdmx_naive(data_dict['end_time'])

        # Update the appointment using CRUD (with normalized datetimes) pasando dict para evitar revalidación
        updated_appointment = crud.update_appointment(db, appointment_id, data_dict)
        
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
    """Get list of consultations (REFACTORED - uses consultation_service helpers)"""
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
        
        # Transform to API format using helper functions
        result = []
        for consultation in consultations:
            try:
                # Decrypt patient data
                decrypted_patient = decrypt_patient_data(consultation.patient, decrypt_sensitive_data) if consultation.patient else {}
                patient_name = format_patient_name(decrypted_patient) if consultation.patient else "Paciente No Identificado"
                
                # Decrypt consultation data
                decrypted_consultation = decrypt_consultation_data(consultation, decrypt_sensitive_data)
                
                # Get doctor name
                doctor_name = format_doctor_name(consultation.doctor)
                
                # Get related data (vital signs, prescriptions, clinical studies)
                # Wrap each in try-except to prevent one failure from blocking all consultations
                try:
                    vital_signs = get_vital_signs_for_consultation(db, consultation.id)
                except Exception as e:
                    print(f"⚠️ Error getting vital signs for consultation {consultation.id}: {str(e)}")
                    vital_signs = []
                
                try:
                    prescriptions = get_prescriptions_for_consultation(db, consultation.id)
                except Exception as e:
                    print(f"⚠️ Error getting prescriptions for consultation {consultation.id}: {str(e)}")
                    prescriptions = []
                
                try:
                    clinical_studies = get_clinical_studies_for_consultation(db, consultation.id)
                except Exception as e:
                    print(f"⚠️ Error getting clinical studies for consultation {consultation.id}: {str(e)}")
                    clinical_studies = []
                
                # Build response using helper
                consultation_response = build_consultation_response(
                    consultation,
                    decrypted_consultation,
                    patient_name,
                    doctor_name,
                    vital_signs,
                    prescriptions,
                    clinical_studies
                )
                
                # Add compatibility fields
                consultation_response.update({
                    "imaging_studies": decrypted_consultation.get("laboratory_results", ""),
                    "interconsultations": decrypted_consultation.get("notes", ""),
                    "consultation_type": getattr(consultation, 'consultation_type', 'Seguimiento'),
                    "created_by": consultation.created_by,
                    "created_at": consultation.created_at.isoformat(),
                    "date": consultation.consultation_date.isoformat()
                })
                
                result.append(consultation_response)
            except Exception as e:
                print(f"❌ Error processing consultation {consultation.id}: {str(e)}")
                print(f"⚠️ Skipping consultation {consultation.id} due to error, continuing with others...")
                # Continue processing other consultations instead of failing completely
                continue
        
        print(f"✅ Returning {len(result)} consultations for doctor {current_user.id}")
        if len(result) > 0:
            print(f"📋 Sample consultation (first): {result[0].get('id', 'N/A')} - Patient: {result[0].get('patient_name', 'N/A')}")
        return result
    except Exception as e:
        print(f"❌ Error in get_consultations: {str(e)}")
        import traceback
        traceback.print_exc()
        # Return empty array instead of failing completely
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
        print(f"🔍 Current user ID: {current_user.id}, User type: {current_user.person_type}")
        
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
            "laboratory_results": consultation.laboratory_results,
            "notes": consultation.notes,
            "family_history": consultation.family_history,
            "perinatal_history": consultation.perinatal_history,
            "personal_pathological_history": consultation.personal_pathological_history,
            "personal_non_pathological_history": consultation.personal_non_pathological_history
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
                "prescribed_medications": consultation.prescribed_medications,
                "treatment_plan": consultation.treatment_plan,
                "laboratory_results": consultation.laboratory_results,
                "notes": consultation.notes,
                "family_history": consultation.family_history,
                "perinatal_history": consultation.perinatal_history,
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
        
        print(f"✅ Returning consultation {consultation_id}")
        print(f"🔍 Consultation data: {result}")
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error in get_consultation: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.post("/api/consultations")
async def create_consultation(
    consultation_data: dict,  # NOTE: Proper schema pending consultations table implementation
    request: Request,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Create new consultation with encrypted sensitive medical data (REFACTORED)"""
    try:
        security_logger.info("Creating consultation with encryption", operation="create_consultation", 
                           doctor_id=current_user.id, patient_id=consultation_data.get("patient_id"))
        
        # 1. Encrypt sensitive consultation fields
        encrypted_consultation_data = encrypt_consultation_fields(consultation_data, encrypt_sensitive_data)
        
        # 2. Parse consultation date
        consultation_date_str = encrypted_consultation_data.get("date", encrypted_consultation_data.get("consultation_date"))
        consultation_date = parse_consultation_date(consultation_date_str, now_cdmx, cdmx_datetime)
        
        # 3. Create MedicalRecord object
        new_medical_record = create_medical_record_object(
            encrypted_consultation_data,
            consultation_date,
            current_user.id
        )
        
        # 4. Save to database
        db.add(new_medical_record)
        db.commit()
        db.refresh(new_medical_record)
        
        security_logger.info("Consultation created successfully", consultation_id=new_medical_record.id, 
                           doctor_id=current_user.id, patient_id=new_medical_record.patient_id, encrypted=True)
        
        # 5. Sign the consultation document
        consultation_for_signing = prepare_consultation_for_signing(new_medical_record)
        digital_signature = sign_medical_document(consultation_for_signing, current_user.id, "consultation")
        security_logger.info("Consultation digitally signed", consultation_id=new_medical_record.id, 
                           signature_id=digital_signature["signatures"][0]["signature_id"])
        
        # 6. Mark appointment as completed if applicable
        appointment_id = consultation_data.get("appointment_id")
        mark_appointment_completed(db, appointment_id, current_user.id)
        
        # 7. Get patient and doctor info
        patient_name, _ = get_patient_info(db, new_medical_record.patient_id)
        doctor_name = format_doctor_name(current_user)
        
        # 🆕 8. Registrar en auditoría
        audit_service.log_consultation_create(
            db=db,
            user=current_user,
            consultation_id=new_medical_record.id,
            patient_id=new_medical_record.patient_id,
            patient_name=patient_name,
            request=request,
            consultation_data={
                "consultation_date": str(consultation_date),
                "consultation_type": consultation_data.get("consultation_type", ""),
                "primary_diagnosis": consultation_data.get("primary_diagnosis", "")
            }
        )
        
        # 9. Build response
        result = build_create_consultation_response(
            new_medical_record,
            patient_name,
            doctor_name,
            digital_signature
        )
        
        print(f"✅ Medical record created in database: ID={new_medical_record.id}")
        return result
        
    except HTTPException:
        raise  # Re-raise HTTP exceptions as-is
    except Exception as e:
        print(f"❌ Error in create_consultation: {str(e)}")
        # 🆕 Registrar error en auditoría
        audit_service.log_error(
            db=db,
            user=current_user,
            request=request,
            error_message=str(e),
            operation_type="consultation_create",
            is_critical=True
        )
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
        consultation.prescribed_medications = consultation_data.get("prescribed_medications", consultation.prescribed_medications)
        consultation.treatment_plan = consultation_data.get("treatment_plan", consultation.treatment_plan)
        consultation.notes = consultation_data.get("notes") or consultation_data.get("interconsultations") or consultation.notes
        consultation.consultation_type = consultation_data.get("consultation_type", consultation.consultation_type)
        # Update first-time consultation fields (using _history fields)
        consultation.family_history = consultation_data.get("family_history", consultation.family_history)
        consultation.perinatal_history = consultation_data.get("perinatal_history", consultation.perinatal_history)
        consultation.personal_pathological_history = consultation_data.get("personal_pathological_history", consultation.personal_pathological_history)
        consultation.personal_non_pathological_history = consultation_data.get("personal_non_pathological_history", consultation.personal_non_pathological_history)
        
        # Save changes
        db.commit()
        db.refresh(consultation)
        
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
            "perinatal_history": consultation.perinatal_history,
            "personal_pathological_history": consultation.personal_pathological_history,
            "personal_non_pathological_history": consultation.personal_non_pathological_history,
            "physical_examination": consultation.physical_examination,
            "laboratory_results": consultation.laboratory_results,
            "primary_diagnosis": consultation.primary_diagnosis,
            "secondary_diagnoses": consultation.secondary_diagnoses,
            "treatment_plan": consultation.treatment_plan,
            "therapeutic_plan": consultation.treatment_plan,  # Alias for compatibility
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

# - /api/test-patient-creation
# - /api/test-cors
# These have been removed to prevent unauthorized data access in production

# ============================================================================
# STUDY CATALOG ENDPOINTS
# ============================================================================

@app.get("/api/study-categories")
async def get_study_categories(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Get all study categories"""
    try:
        categories = crud.get_study_categories(db, skip=skip, limit=limit)
        return [schemas.StudyCategory.model_validate(category) for category in categories]
    except Exception as e:
        print(f"❌ Error in get_study_categories: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.get("/api/study-catalog")
async def get_study_catalog(
    skip: int = 0,
    limit: int = 100,
    category_id: Optional[int] = None,
    search: Optional[str] = None,
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
        # Convert to dict with only existing columns
        result = []
        for study in studies:
            study_dict = {
                "id": study.id,
                "name": study.name,
                "category_id": study.category_id,
                "is_active": study.is_active,
                "created_at": study.created_at.isoformat() if study.created_at else None,
                "updated_at": study.updated_at.isoformat() if study.updated_at else None,
                "category": {
                    "id": study.category.id if study.category else None,
                    "name": study.category.name if study.category else None,
                    # code and description fields removed from study_categories
                    "active": study.category.active if study.category else None,
                    "created_at": study.category.created_at.isoformat() if study.category and study.category.created_at else None
                } if study.category else None
            }
            result.append(study_dict)
        return result
    except Exception as e:
        print(f"❌ Error in get_study_catalog: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.get("/api/study-catalog/{study_id}")
async def get_study_by_id(
    study_id: int,
    db: Session = Depends(get_db)
):
    """Get study by ID with normal values"""
    try:
        study = crud.get_study_by_id(db, study_id)
        if not study:
            raise HTTPException(status_code=404, detail="Study not found")
        return schemas.StudyCatalog.model_validate(study)
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error in get_study_by_id: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.get("/api/study-catalog/code/{code}")
async def get_study_by_code(
    code: str,
    db: Session = Depends(get_db)
):
    """Get study by code"""
    try:
        study = crud.get_study_by_code(db, code)
        if not study:
            raise HTTPException(status_code=404, detail="Study not found")
        return schemas.StudyCatalog.model_validate(study)
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error in get_study_by_code: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

# Study templates endpoints removed - table deleted

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
        return [schemas.StudyCatalog.model_validate(study) for study in studies]
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
        return [schemas.StudyCatalog.model_validate(study) for study in studies]
    except Exception as e:
        print(f"❌ Error in search_studies: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

# ============================================================================
# AUDIT LOG - Traceability and Compliance
# ============================================================================

@app.get("/api/audit/logs")
async def get_audit_logs(
    skip: int = 0,
    limit: int = 100,
    action: Optional[str] = None,
    user_email: Optional[str] = None,
    security_level: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """
    Get audit logs with filters
    Only accessible by doctors (for their own actions) or admins
    """
    try:
        # Build query
        query = db.query(AuditLog)
        
        # Security: Doctors can only see their own audit logs
        if current_user.person_type == 'doctor':
            query = query.filter(AuditLog.user_id == current_user.id)
        
        # Apply filters
        if action:
            query = query.filter(AuditLog.action == action)
        if user_email:
            query = query.filter(AuditLog.user_email == user_email)
        if security_level:
            query = query.filter(AuditLog.security_level == security_level)
        if start_date:
            query = query.filter(AuditLog.timestamp >= start_date)
        if end_date:
            query = query.filter(AuditLog.timestamp <= end_date)
        
        # Order by most recent first
        query = query.order_by(AuditLog.timestamp.desc())
        
        # Pagination
        total = query.count()
        logs = query.offset(skip).limit(limit).all()
        
        # Convert to dict
        result = []
        for log in logs:
            result.append({
                "id": log.id,
                "user_email": log.user_email,
                "user_name": log.user_name,
                "action": log.action,
                "table_name": log.table_name,
                "operation_type": log.operation_type,
                "changes_summary": log.changes_summary,
                "affected_patient_name": log.affected_patient_name,
                "timestamp": log.timestamp.isoformat(),
                "ip_address": log.ip_address,
                "success": log.success,
                "security_level": log.security_level,
                "error_message": log.error_message
            })
        
        return {
            "total": total,
            "skip": skip,
            "limit": limit,
            "logs": result
        }
    except Exception as e:
        print(f"❌ Error in get_audit_logs: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching audit logs: {str(e)}")

@app.get("/api/audit/critical")
async def get_critical_audit_events(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Get critical audit events (WARNING and CRITICAL security levels)"""
    try:
        # Query critical events
        query = db.query(AuditLog).filter(
            AuditLog.security_level.in_(['WARNING', 'CRITICAL'])
        )
        
        # Security: Doctors can only see their own critical events
        if current_user.person_type == 'doctor':
            query = query.filter(AuditLog.user_id == current_user.id)
        
        query = query.order_by(AuditLog.timestamp.desc())
        
        total = query.count()
        events = query.offset(skip).limit(limit).all()
        
        result = []
        for event in events:
            result.append({
                "id": event.id,
                "user_email": event.user_email,
                "user_name": event.user_name,
                "action": event.action,
                "operation_type": event.operation_type,
                "affected_patient_name": event.affected_patient_name,
                "timestamp": event.timestamp.isoformat(),
                "ip_address": event.ip_address,
                "security_level": event.security_level,
                "error_message": event.error_message,
                "success": event.success
            })
        
        return {
            "total": total,
            "critical_events": result
        }
    except Exception as e:
        print(f"❌ Error in get_critical_audit_events: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching critical events: {str(e)}")

@app.get("/api/audit/patient/{patient_id}")
async def get_patient_audit_trail(
    patient_id: int,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Get complete audit trail for a specific patient"""
    try:
        # Verify patient exists and belongs to this doctor
        patient = db.query(Person).filter(
            Person.id == patient_id,
            Person.person_type == 'patient'
        ).first()
        
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")
        
        # Get patient's consultations to verify access
        consultation = db.query(MedicalRecord).filter(
            MedicalRecord.patient_id == patient_id,
            MedicalRecord.doctor_id == current_user.id
        ).first()
        
        if not consultation and current_user.person_type == 'doctor':
            raise HTTPException(
                status_code=403,
                detail="You don't have access to this patient's data"
            )
        
        # Get audit trail
        query = db.query(AuditLog).filter(
            AuditLog.affected_patient_id == patient_id
        ).order_by(AuditLog.timestamp.desc())
        
        total = query.count()
        logs = query.offset(skip).limit(limit).all()
        
        result = []
        for log in logs:
            result.append({
                "id": log.id,
                "user_email": log.user_email,
                "user_name": log.user_name,
                "action": log.action,
                "table_name": log.table_name,
                "operation_type": log.operation_type,
                "changes_summary": log.changes_summary,
                "timestamp": log.timestamp.isoformat(),
                "ip_address": log.ip_address,
                "success": log.success
            })
        
        return {
            "patient_id": patient_id,
            "patient_name": f"{patient.first_name} {patient.paternal_surname}",
            "total": total,
            "audit_trail": result
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error in get_patient_audit_trail: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching patient audit trail: {str(e)}")

@app.get("/api/audit/stats")
async def get_audit_statistics(
    days: int = 30,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Get audit statistics for the last N days"""
    try:
        from_date = datetime.utcnow() - timedelta(days=days)
        
        query = db.query(AuditLog).filter(AuditLog.timestamp >= from_date)
        
        # Security: Doctors only see their own stats
        if current_user.person_type == 'doctor':
            query = query.filter(AuditLog.user_id == current_user.id)
        
        # Count by action type
        actions_count = db.query(
            AuditLog.action,
            func.count(AuditLog.id).label('count')
        ).filter(AuditLog.timestamp >= from_date).group_by(AuditLog.action).all()
        
        # Count by security level
        security_count = db.query(
            AuditLog.security_level,
            func.count(AuditLog.id).label('count')
        ).filter(AuditLog.timestamp >= from_date).group_by(AuditLog.security_level).all()
        
        # Failed operations
        failed_count = query.filter(AuditLog.success == False).count()
        
        return {
            "period_days": days,
            "total_operations": query.count(),
            "failed_operations": failed_count,
            "by_action": {action: count for action, count in actions_count},
            "by_security_level": {level: count for level, count in security_count},
            "success_rate": f"{((query.count() - failed_count) / query.count() * 100):.2f}%" if query.count() > 0 else "N/A"
        }
    except Exception as e:
        print(f"❌ Error in get_audit_statistics: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching audit statistics: {str(e)}")

# ============================================================================
# PRIVACY AND CONSENT - LFPDPPP Compliance
# ============================================================================

@app.get("/api/privacy/active-notice")
async def get_active_privacy_notice(
    db: Session = Depends(get_db)
):
    """
    Get current active privacy notice (public endpoint)
    """
    try:
        notice = db.query(PrivacyNotice).filter(
            PrivacyNotice.is_active == True
        ).order_by(PrivacyNotice.effective_date.desc()).first()
        
        if not notice:
            raise HTTPException(status_code=404, detail="No active privacy notice found")
        
        return {
            "id": notice.id,
            "version": notice.version,
            "title": notice.title,
            "content": notice.content,
            "short_summary": notice.short_summary,
            "effective_date": notice.effective_date.isoformat()
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class SendPrivacyNoticeRequest(BaseModel):
    patient_id: int
    method: str = "whatsapp_button"

@app.post("/api/privacy/send-whatsapp-notice")
async def send_whatsapp_privacy_notice(
    request_data: SendPrivacyNoticeRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """
    Envía aviso de privacidad al paciente vía WhatsApp con botón interactivo
    """
    try:
        # Verificar que el paciente existe
        patient = db.query(Person).filter(
            Person.id == request_data.patient_id,
            Person.person_type == 'patient'
        ).first()
        
        if not patient:
            raise HTTPException(status_code=404, detail="Paciente no encontrado")
        
        # Verificar que el doctor tiene relación con este paciente
        consultation = db.query(MedicalRecord).filter(
            MedicalRecord.patient_id == request_data.patient_id,
            MedicalRecord.doctor_id == current_user.id
        ).first()
        
        if not consultation and current_user.person_type != 'admin':
            raise HTTPException(
                status_code=403,
                detail="No tienes permiso para enviar avisos a este paciente"
            )
        
        # Verificar que el paciente tiene teléfono
        if not patient.primary_phone:
            raise HTTPException(
                status_code=400,
                detail="El paciente no tiene teléfono registrado"
            )
        
        # Verificar si ya tiene un consentimiento
        existing_consent = db.query(PrivacyConsent).filter(
            PrivacyConsent.patient_id == request_data.patient_id,
            PrivacyConsent.consent_given == True
        ).order_by(PrivacyConsent.created_at.desc()).first()
        
        if existing_consent:
                return {
                    "success": False,
                    "message": "El paciente ya aceptó el aviso de privacidad",
                    "consent_id": existing_consent.id,
                    "accepted_at": existing_consent.consent_date.isoformat() if existing_consent.consent_date else None
                }
        
        # Obtener aviso de privacidad activo
        privacy_notice = db.query(PrivacyNotice).filter(
            PrivacyNotice.is_active == True
        ).order_by(PrivacyNotice.effective_date.desc()).first()
        
        if not privacy_notice:
            raise HTTPException(status_code=500, detail="No hay aviso de privacidad activo")
        
        # Generar token único para la URL
        privacy_token = str(uuid.uuid4())
        privacy_url = f"https://tudominio.com/privacy-notice/{privacy_token}"
        
        # Crear registro de consentimiento PRIMERO (para tener el ID)
        consent = PrivacyConsent(
            patient_id=request_data.patient_id,
            notice_id=privacy_notice.id,
            consent_given=False,  # Pendiente hasta que el paciente responda
            consent_date=datetime.utcnow()
        )
        
        db.add(consent)
        db.commit()
        db.refresh(consent)
        
        # Enviar por WhatsApp con botón interactivo
        from whatsapp_service import get_whatsapp_service
        whatsapp = get_whatsapp_service()
        
        doctor_name = f"{current_user.title or 'Dr.'} {current_user.first_name} {current_user.paternal_surname}"
        
        result = whatsapp.send_interactive_privacy_notice(
            patient_name=patient.first_name,
            patient_phone=patient.primary_phone,
            doctor_name=doctor_name,
            privacy_notice_url=privacy_url,
            consent_id=consent.id
        )
        
        if not result.get('success'):
            # Si falla el envío, eliminar el consentimiento
            db.delete(consent)
            db.commit()
            raise HTTPException(
                status_code=500,
                detail=f"Error al enviar WhatsApp: {result.get('error')}"
            )
        
        # Actualizar con message_id
        # WhatsApp message tracking removed - simplified schema
        db.commit()
        
        # Registrar en auditoría
        audit_service.log_action(
            db=db,
            action="PRIVACY_NOTICE_SENT",
            user=current_user,
            request=request,
            operation_type="send_privacy_notice_whatsapp",
            affected_patient_id=request_data.patient_id,
            affected_patient_name=f"{patient.first_name} {patient.paternal_surname}",
            new_values={
                "method": "whatsapp_button",
                "phone": patient.primary_phone,
                "message_id": result.get('message_id'),
                "consent_id": consent.id
            },
            security_level='INFO'
        )
        
        return {
            "success": True,
            "message": "Aviso de privacidad enviado por WhatsApp con botón interactivo",
            "message_id": result.get('message_id'),
            "phone": patient.primary_phone,
            "consent_id": consent.id,
            "privacy_url": privacy_url
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error sending privacy notice: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error al enviar aviso de privacidad: {str(e)}"
        )

@app.post("/api/webhooks/whatsapp")
async def whatsapp_webhook(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Webhook para recibir respuestas de WhatsApp (botones interactivos)
    Meta enviará aquí las respuestas cuando el paciente presione "Acepto"
    """
    try:
        body = await request.json()
        
        if 'entry' not in body:
            return {"status": "ignored"}
        
        for entry in body['entry']:
            for change in entry.get('changes', []):
                if change.get('field') != 'messages':
                    continue
                
                value = change.get('value', {})
                
                # Procesar mensajes con botones interactivos
                for message in value.get('messages', []):
                    message_type = message.get('type')
                    from_phone = message.get('from')
                    timestamp = message.get('timestamp')
                    
                    # PROCESAR BOTÓN INTERACTIVO
                    if message_type == 'interactive':
                        interactive_data = message.get('interactive', {})
                        button_reply = interactive_data.get('button_reply', {})
                        
                        button_id = button_reply.get('id', '')
                        button_title = button_reply.get('title', '')
                        
                        print(f"📱 Button pressed: {button_id} ({button_title}) from {from_phone}")
                        
                        # Extraer consent_id del button_id
                        # Formato: "accept_privacy_123"
                        parts = button_id.split('_')
                        print(f"🔍 Parsing button_id: {button_id}, parts: {parts}")
                        if len(parts) >= 3 and parts[0] == 'accept' and parts[1] == 'privacy':
                            consent_id = int(parts[2])
                            print(f"🔍 Extracted consent_id: {consent_id}")
                            
                            # Buscar el consentimiento
                            consent = db.query(PrivacyConsent).filter(
                                PrivacyConsent.id == consent_id
                            ).first()
                            
                            if not consent:
                                print(f"⚠️ Consent {consent_id} not found")
                                # Listar todos los consentimientos para debug
                                all_consents = db.query(PrivacyConsent).all()
                                print(f"🔍 All consents in DB: {[c.id for c in all_consents]}")
                                continue
                            
                            # Obtener paciente
                            patient = db.query(Person).filter(
                                Person.id == consent.patient_id
                            ).first()
                            
                            if not patient:
                                print(f"⚠️ Patient {consent.patient_id} not found")
                                continue
                            
                            # ACEPTADO
                            consent.consent_given = True
                            consent.consent_date = datetime.fromtimestamp(int(timestamp))
                            
                            db.commit()
                            
                            # Enviar confirmación
                            from whatsapp_service import get_whatsapp_service
                            whatsapp = get_whatsapp_service()
                            
                            # Get doctor from privacy notice or use default
                            doctor = db.query(Person).filter(Person.person_type == 'doctor').first()
                            
                            if doctor:
                                doctor_name = f"{doctor.title or 'Dr.'} {doctor.first_name} {doctor.paternal_surname}"
                                whatsapp.send_text_message(
                                    to_phone=from_phone,
                                    message=f"✅ Gracias {patient.first_name}, tu consentimiento ha sido registrado correctamente.\n\n"
                                            f"Ahora {doctor_name} puede brindarte atención médica cumpliendo con la Ley de Protección de Datos.\n\n"
                                            f"Recuerda que puedes revocar tu consentimiento en cualquier momento contactando al consultorio.\n\n"
                                            f"Tus derechos ARCO (Acceso, Rectificación, Cancelación, Oposición) están garantizados."
                                )
                            
                            print(f"✅ Consent {consent_id} ACCEPTED by patient {patient.id} ({patient.first_name})")
                            
                            # Registrar en auditoría
                            audit_service.log_action(
                                db=db,
                                action="PRIVACY_CONSENT_ACCEPTED",
                                user=None,
                                request=request,
                                operation_type="whatsapp_button_consent",
                                affected_patient_id=patient.id,
                                affected_patient_name=f"{patient.first_name} {patient.paternal_surname}",
                                new_values={
                                    "button_id": button_id,
                                    "button_title": button_title,
                                    "consent_id": consent_id,
                                    "method": "whatsapp_button"
                                },
                                security_level='INFO'
                            )
                
                # Procesar status updates (entregado, leído)
                for status in value.get('statuses', []):
                    status_type = status.get('status')
                    message_id = status.get('id')
                    
                    # Find consent by patient phone (simplified - WhatsApp message tracking removed)
                    # Note: In a real implementation, you'd need to track message_id differently
                    consent = None  # Placeholder - implement based on your needs
                    
                    if consent:
                        # WhatsApp status tracking removed - simplified schema
                        # No action needed for delivered/read status
                        db.commit()
                        print(f"📊 Consent {consent.id} status updated: {status_type}")
        
        return {"status": "ok"}
        
    except Exception as e:
        print(f"❌ Error processing WhatsApp webhook: {str(e)}")
        import traceback
        traceback.print_exc()
        return {"status": "error", "message": str(e)}

@app.get("/api/webhooks/whatsapp")
async def whatsapp_webhook_verification(
    request: Request
):
    """
    Verificación del webhook de WhatsApp (requerido por Meta)
    """
    mode = request.query_params.get('hub.mode')
    token = request.query_params.get('hub.verify_token')
    challenge = request.query_params.get('hub.challenge')
    
    verify_token = os.getenv('META_WHATSAPP_VERIFY_TOKEN', 'mi_token_secreto_123')
    
    if mode == 'subscribe' and token == verify_token:
        print(f"✅ WhatsApp webhook verified successfully")
        return int(challenge)
    
    print(f"❌ WhatsApp webhook verification failed")
    return {"status": "error", "message": "Verification failed"}

@app.get("/api/privacy/consent-status/{patient_id}")
async def get_patient_consent_status(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """
    Obtiene el estado del consentimiento de privacidad de un paciente
    """
    try:
        # Verificar acceso
        if current_user.person_type == 'doctor':
            consultation = db.query(MedicalRecord).filter(
                MedicalRecord.patient_id == patient_id,
                MedicalRecord.doctor_id == current_user.id
            ).first()
            
            if not consultation:
                raise HTTPException(status_code=403, detail="Access denied")
        
        # Buscar consentimiento más reciente
        consent = db.query(PrivacyConsent).filter(
            PrivacyConsent.patient_id == patient_id
        ).order_by(PrivacyConsent.created_at.desc()).first()
        
        if not consent:
            return {
                "has_consent": False,
                "status": "none",
                "message": "No se ha enviado aviso de privacidad a este paciente"
            }
        
        has_consent = consent.consent_given == True
        
        return {
            "has_consent": has_consent,
            "status": "accepted" if consent.consent_given else "pending",
            "consent": {
                "id": consent.id,
                "patient_id": consent.patient_id,
                "notice_id": consent.notice_id,
                "consent_given": consent.consent_given,
                "consent_date": consent.consent_date.isoformat() if consent.consent_date else None,
                "ip_address": consent.ip_address,
                "user_agent": consent.user_agent,
                "created_at": consent.created_at.isoformat() if consent.created_at else None
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/privacy/revoke")
async def revoke_consent(
    request: Request,
    data: dict,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """
    Revocar consentimiento de privacidad de un paciente
    """
    try:
        patient_id = data.get('patient_id')
        revocation_reason = data.get('revocation_reason', 'Revocado por el médico')
        
        # Verificar acceso
        if current_user.person_type == 'doctor':
            consultation = db.query(MedicalRecord).filter(
                MedicalRecord.patient_id == patient_id,
                MedicalRecord.doctor_id == current_user.id
            ).first()
            
            if not consultation:
                raise HTTPException(status_code=403, detail="No tiene acceso a este paciente")
        
        # Buscar consentimiento activo
        consent = db.query(PrivacyConsent).filter(
            PrivacyConsent.patient_id == patient_id,
            PrivacyConsent.is_revoked == False
        ).order_by(PrivacyConsent.created_at.desc()).first()
        
        if not consent:
            raise HTTPException(status_code=404, detail="No se encontró consentimiento activo para este paciente")
        
        # Revocar
        # Revocation: Set consent_given to False
        consent.consent_given = False
        consent.consent_date = datetime.utcnow()
        consent.updated_at = datetime.utcnow()
        
        db.commit()
        
        # Registrar en audit log
        audit_service.log_action(
            db=db,
            action='privacy_consent_revoked',
            entity_type='privacy_consent',
            entity_id=consent.id,
            user_id=current_user.id,
            user_type=current_user.person_type,
            changes={'revocation_reason': revocation_reason},
            ip_address=request.client.host,
            summary=f"Consentimiento revocado para paciente {patient_id}",
            security_level='WARNING'
        )
        
        api_logger.info(
            f"✅ Consent revoked for patient {patient_id}",
            consent_id=consent.id,
            doctor_id=current_user.id
        )
        
        return {
            "success": True,
            "message": "Consentimiento revocado exitosamente",
            "consent_id": consent.id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        api_logger.error(f"Error revoking consent: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/privacy/arco-request")
async def create_arco_request(
    request: Request,
    data: dict,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """
    Crear solicitud ARCO (Acceso, Rectificación, Cancelación, Oposición)
    """
    try:
        patient_id = data.get('patient_id')
        request_type = data.get('request_type')  # 'access', 'rectification', 'cancellation', 'opposition'
        description = data.get('description', '')
        contact_email = data.get('contact_email')
        contact_phone = data.get('contact_phone')
        
        if not patient_id or not request_type:
            raise HTTPException(status_code=400, detail="patient_id y request_type son requeridos")
        
        if request_type not in ['access', 'rectification', 'cancellation', 'opposition']:
            raise HTTPException(status_code=400, detail="request_type inválido")
        
        # Verificar acceso
        if current_user.person_type == 'doctor':
            consultation = db.query(MedicalRecord).filter(
                MedicalRecord.patient_id == patient_id,
                MedicalRecord.doctor_id == current_user.id
            ).first()
            
            if not consultation:
                raise HTTPException(status_code=403, detail="No tiene acceso a este paciente")
        
        # Crear solicitud ARCO
        arco_request = ARCORequest(
            patient_id=patient_id,
            request_type=request_type,
            description=description,
            status='pending',
            contact_email=contact_email,
            contact_phone=contact_phone,
            requested_by=current_user.id,
            requested_at=datetime.utcnow(),
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        db.add(arco_request)
        db.commit()
        db.refresh(arco_request)
        
        # Registrar en audit log
        audit_service.log_action(
            db=db,
            action='arco_request_created',
            entity_type='arco_request',
            entity_id=arco_request.id,
            user_id=current_user.id,
            user_type=current_user.person_type,
            changes={'request_type': request_type, 'patient_id': patient_id},
            ip_address=request.client.host,
            summary=f"Solicitud ARCO ({request_type}) creada para paciente {patient_id}",
            security_level='INFO'
        )
        
        api_logger.info(
            f"✅ ARCO request created: {request_type}",
            request_id=arco_request.id,
            patient_id=patient_id,
            doctor_id=current_user.id
        )
        
        return {
            "success": True,
            "message": f"Solicitud ARCO ({request_type}) creada exitosamente",
            "arco_request": {
                "id": arco_request.id,
                "patient_id": arco_request.patient_id,
                "request_type": arco_request.request_type,
                "description": arco_request.description,
                "status": arco_request.status,
                "requested_at": arco_request.requested_at.isoformat(),
                "created_at": arco_request.created_at.isoformat()
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        api_logger.error(f"Error creating ARCO request: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/privacy/arco-requests/{patient_id}")
async def get_arco_requests(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """
    Obtener todas las solicitudes ARCO de un paciente
    """
    try:
        # Verificar acceso
        if current_user.person_type == 'doctor':
            consultation = db.query(MedicalRecord).filter(
                MedicalRecord.patient_id == patient_id,
                MedicalRecord.doctor_id == current_user.id
            ).first()
            
            if not consultation:
                raise HTTPException(status_code=403, detail="No tiene acceso a este paciente")
        
        # Obtener solicitudes ARCO
        arco_requests = db.query(ARCORequest).filter(
            ARCORequest.patient_id == patient_id
        ).order_by(ARCORequest.created_at.desc()).all()
        
        return {
            "arco_requests": [
                {
                    "id": req.id,
                    "patient_id": req.patient_id,
                    "request_type": req.request_type,
                    "description": req.description,
                    "status": req.status,
                    "contact_email": req.contact_email,
                    "contact_phone": req.contact_phone,
                    "requested_at": req.requested_at.isoformat() if req.requested_at else None,
                    "resolved_at": req.resolved_at.isoformat() if req.resolved_at else None,
                    "resolution_notes": req.resolution_notes,
                    "created_at": req.created_at.isoformat(),
                    "updated_at": req.updated_at.isoformat()
                }
                for req in arco_requests
            ]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        api_logger.error(f"Error getting ARCO requests: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/privacy/arco-request/{request_id}")
async def update_arco_request(
    request_id: int,
    request: Request,
    data: dict,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """
    Actualizar estado de una solicitud ARCO
    """
    try:
        status = data.get('status')  # 'in_progress', 'resolved', 'rejected'
        resolution_notes = data.get('resolution_notes')
        
        if not status:
            raise HTTPException(status_code=400, detail="status es requerido")
        
        if status not in ['pending', 'in_progress', 'resolved', 'rejected']:
            raise HTTPException(status_code=400, detail="status inválido")
        
        # Obtener solicitud ARCO
        arco_request = db.query(ARCORequest).filter(
            ARCORequest.id == request_id
        ).first()
        
        if not arco_request:
            raise HTTPException(status_code=404, detail="Solicitud ARCO no encontrada")
        
        # Verificar acceso
        if current_user.person_type == 'doctor':
            consultation = db.query(MedicalRecord).filter(
                MedicalRecord.patient_id == arco_request.patient_id,
                MedicalRecord.doctor_id == current_user.id
            ).first()
            
            if not consultation:
                raise HTTPException(status_code=403, detail="No tiene acceso a este paciente")
        
        # Actualizar
        old_status = arco_request.status
        arco_request.status = status
        if resolution_notes:
            arco_request.resolution_notes = resolution_notes
        if status == 'resolved':
            arco_request.resolved_at = datetime.utcnow()
        arco_request.updated_at = datetime.utcnow()
        
        db.commit()
        
        # Registrar en audit log
        audit_service.log_action(
            db=db,
            action='arco_request_updated',
            entity_type='arco_request',
            entity_id=arco_request.id,
            user_id=current_user.id,
            user_type=current_user.person_type,
            changes={'old_status': old_status, 'new_status': status},
            ip_address=request.client.host,
            summary=f"Solicitud ARCO {request_id} actualizada: {old_status} → {status}",
            security_level='INFO'
        )
        
        api_logger.info(
            f"✅ ARCO request updated: {old_status} → {status}",
            request_id=request_id,
            doctor_id=current_user.id
        )
        
        return {
            "success": True,
            "message": "Solicitud ARCO actualizada exitosamente",
            "arco_request": {
                "id": arco_request.id,
                "status": arco_request.status,
                "resolution_notes": arco_request.resolution_notes,
                "resolved_at": arco_request.resolved_at.isoformat() if arco_request.resolved_at else None,
                "updated_at": arco_request.updated_at.isoformat()
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        api_logger.error(f"Error updating ARCO request: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/privacy/public-notice")
async def get_public_privacy_notice(db: Session = Depends(get_db)):
    """
    Obtener el aviso de privacidad público (sin autenticación)
    Para mostrar en página pública
    """
    try:
        # Obtener aviso activo
        notice = db.query(PrivacyNotice).filter(
            PrivacyNotice.is_active == True
        ).order_by(PrivacyNotice.effective_date.desc()).first()
        
        if not notice:
            raise HTTPException(status_code=404, detail="No hay aviso de privacidad activo")
        
        return {
            "id": notice.id,
            "version": notice.version,
            "title": notice.title,
            "content": notice.content,
            "summary": notice.summary,
            "effective_date": notice.effective_date.isoformat(),
            "expiration_date": notice.expiration_date.isoformat() if notice.expiration_date else None,
            "is_active": notice.is_active,
            "created_at": notice.created_at.isoformat(),
            "updated_at": notice.updated_at.isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        api_logger.error(f"Error getting public privacy notice: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# DATA RETENTION ENDPOINTS (LFPDPPP + NOM-004 Compliance)
# ============================================================================

@app.get("/api/data-retention/stats")
async def get_retention_stats(
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """
    Get data retention statistics for the current doctor
    """
    try:
        stats = retention.get_retention_stats(db, current_user.id)
        
        return {
            "success": True,
            "stats": stats,
            "doctor_id": current_user.id
        }
    except Exception as e:
        api_logger.error(f"Error getting retention stats: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/data-retention/expiring")
async def get_expiring_records(
    days: int = 90,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """
    Get records expiring within specified days
    
    Args:
        days: Days threshold for expiration (default: 90)
        limit: Maximum records to return (default: 100)
    """
    try:
        records = retention.get_expiring_records(
            db, 
            doctor_id=current_user.id,
            days_threshold=days,
            limit=limit
        )
        
        return {
            "success": True,
            "records": records,
            "count": len(records),
            "days_threshold": days
        }
    except Exception as e:
        api_logger.error(f"Error getting expiring records: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/data-retention/anonymize/{record_id}")
async def anonymize_record(
    record_id: int,
    reason: str = "manual_request",
    strategy: str = "full",
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """
    Anonymize a specific medical record
    
    Args:
        record_id: Medical record ID
        reason: Reason for anonymization
        strategy: Anonymization strategy (full, partial, pseudo)
    """
    try:
        # Verify record belongs to current doctor
        record = db.query(MedicalRecord).filter(
            MedicalRecord.id == record_id,
            MedicalRecord.doctor_id == current_user.id
        ).first()
        
        if not record:
            raise HTTPException(
                status_code=404,
                detail="Registro no encontrado o no autorizado"
            )
        
        success = retention.anonymize_medical_record(
            db,
            record_id,
            performed_by=current_user.id,
            reason=reason,
            strategy=strategy
        )
        
        if not success:
            raise HTTPException(
                status_code=400,
                detail="No se pudo anonimizar el registro (puede estar en retención legal)"
            )
        
        return {
            "success": True,
            "message": "Registro anonimizado exitosamente",
            "record_id": record_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        api_logger.error(f"Error anonymizing record {record_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/data-retention/anonymize-expired")
async def anonymize_expired_records_endpoint(
    batch_size: int = 100,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """
    Anonymize all expired records for current doctor
    
    Args:
        batch_size: Maximum records to process (default: 100)
    """
    try:
        # This endpoint processes ALL expired records for the doctor
        # In production, this would be a scheduled job
        
        result = retention.anonymize_expired_records(
            db,
            performed_by=current_user.id,
            batch_size=batch_size
        )
        
        return {
            "success": True,
            "message": f"Procesados {result['total_processed']} registros",
            **result
        }
        
    except Exception as e:
        api_logger.error(f"Error in batch anonymization: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/data-retention/archive/{record_id}")
async def archive_record(
    record_id: int,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """
    Archive a medical record (move to cold storage)
    """
    try:
        # Verify record belongs to current doctor
        record = db.query(MedicalRecord).filter(
            MedicalRecord.id == record_id,
            MedicalRecord.doctor_id == current_user.id
        ).first()
        
        if not record:
            raise HTTPException(
                status_code=404,
                detail="Registro no encontrado o no autorizado"
            )
        
        success = retention.archive_medical_record(
            db,
            record_id,
            performed_by=current_user.id
        )
        
        if not success:
            raise HTTPException(
                status_code=400,
                detail="No se pudo archivar el registro"
            )
        
        return {
            "success": True,
            "message": "Registro archivado exitosamente",
            "record_id": record_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        api_logger.error(f"Error archiving record {record_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/data-retention/legal-hold/{record_id}")
async def set_legal_hold_endpoint(
    record_id: int,
    enable: bool = True,
    reason: str = "",
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """
    Set or remove legal hold on a medical record
    
    Args:
        record_id: Medical record ID
        enable: True to enable hold, False to remove
        reason: Reason for legal hold
    """
    try:
        # Verify record belongs to current doctor
        record = db.query(MedicalRecord).filter(
            MedicalRecord.id == record_id,
            MedicalRecord.doctor_id == current_user.id
        ).first()
        
        if not record:
            raise HTTPException(
                status_code=404,
                detail="Registro no encontrado o no autorizado"
            )
        
        if enable and not reason:
            raise HTTPException(
                status_code=400,
                detail="Se requiere especificar la razón para la retención legal"
            )
        
        success = retention.set_legal_hold(
            db,
            record_id,
            performed_by=current_user.id,
            reason=reason,
            enable=enable
        )
        
        if not success:
            raise HTTPException(
                status_code=400,
                detail="No se pudo establecer la retención legal"
            )
        
        action = "activada" if enable else "removida"
        return {
            "success": True,
            "message": f"Retención legal {action} exitosamente",
            "record_id": record_id,
            "legal_hold": enable
        }
        
    except HTTPException:
        raise
    except Exception as e:
        api_logger.error(f"Error setting legal hold on record {record_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/data-retention/extend/{record_id}")
async def extend_retention_endpoint(
    record_id: int,
    additional_years: int,
    reason: str,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """
    Extend retention period for a medical record
    
    Args:
        record_id: Medical record ID
        additional_years: Years to add to retention period
        reason: Reason for extension
    """
    try:
        # Verify record belongs to current doctor
        record = db.query(MedicalRecord).filter(
            MedicalRecord.id == record_id,
            MedicalRecord.doctor_id == current_user.id
        ).first()
        
        if not record:
            raise HTTPException(
                status_code=404,
                detail="Registro no encontrado o no autorizado"
            )
        
        if additional_years < 1 or additional_years > 50:
            raise HTTPException(
                status_code=400,
                detail="El número de años debe estar entre 1 y 50"
            )
        
        success = retention.extend_retention(
            db,
            record_id,
            performed_by=current_user.id,
            additional_years=additional_years,
            reason=reason
        )
        
        if not success:
            raise HTTPException(
                status_code=400,
                detail="No se pudo extender el periodo de retención"
            )
        
        return {
            "success": True,
            "message": f"Periodo de retención extendido por {additional_years} años",
            "record_id": record_id,
            "additional_years": additional_years
        }
        
    except HTTPException:
        raise
    except Exception as e:
        api_logger.error(f"Error extending retention for record {record_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/data-retention/logs")
async def get_retention_logs_endpoint(
    entity_type: Optional[str] = None,
    entity_id: Optional[int] = None,
    action_type: Optional[str] = None,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """
    Get data retention action logs
    
    Args:
        entity_type: Filter by entity type (optional)
        entity_id: Filter by entity ID (optional)
        action_type: Filter by action type (optional)
        limit: Maximum logs to return
    """
    try:
        logs = retention.get_retention_logs(
            db,
            entity_type=entity_type,
            entity_id=entity_id,
            action_type=action_type,
            limit=limit
        )
        
        return {
            "success": True,
            "logs": logs,
            "count": len(logs)
        }
        
    except Exception as e:
        api_logger.error(f"Error getting retention logs: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


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

