"""
Historias Clínicas API - Backend with PostgreSQL
Sistema de gestión de historias clínicas médicas conforme a NOM-004
"""
from fastapi import FastAPI, HTTPException, UploadFile, File, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, EmailStr, ValidationError
from typing import List, Optional, Dict, Any
from datetime import datetime, date, timedelta
from enum import Enum
import pytz
from zoneinfo import ZoneInfo
from config import settings
from logger import logger, api_logger, db_logger
from sqlalchemy.orm import Session
from sqlalchemy import text
import uvicorn
import uuid
import os
import shutil
from pathlib import Path

# Database imports
from database import (
    get_db, init_db, 
    Patient as DBPatient, 
    DoctorProfile as DBDoctorProfile,
    MedicalHistory as DBMedicalHistory,
    VitalSigns as DBVitalSigns,
    ClinicalStudy as DBClinicalStudy,
    Appointment as DBAppointment
)
from db_service import (
    PatientService, DoctorService, ConsultationService, 
    ClinicalStudyService, AuthService, get_dashboard_data
)
from appointment_service import AppointmentService

# Authentication imports
from auth import get_current_doctor, get_current_doctor_optional, create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES
from auth_models import UserLogin, UserCreate, LoginResponse, Token, DoctorInfo
from datetime import timedelta

# Error handling imports
from exceptions import (
    MedicalSystemException, PatientNotFoundException, ConsultationNotFoundException,
    AppointmentNotFoundException, ValidationException, NOM004ValidationException,
    CURPValidationException, DatabaseException, BusinessRuleException,
    ErrorCode, to_http_exception
)
from error_middleware import (
    ErrorHandlingMiddleware, RequestLoggingMiddleware, 
    ErrorReporter, health_check_with_error_info
)

# ============================================================================
# TIMEZONE CONFIGURATION
# ============================================================================

# Mexico City timezone configuration
MEXICO_CITY_TZ = ZoneInfo("America/Mexico_City")
PYTZ_MEXICO_CITY = pytz.timezone("America/Mexico_City")

def get_mexico_city_now():
    """Get current datetime in Mexico City timezone"""
    return datetime.now(MEXICO_CITY_TZ)

def convert_to_mexico_city(dt: datetime):
    """Convert datetime to Mexico City timezone"""
    if dt.tzinfo is None:
        # If naive datetime, assume it's already in Mexico City time
        return dt.replace(tzinfo=MEXICO_CITY_TZ)
    return dt.astimezone(MEXICO_CITY_TZ)

def format_mexico_city_datetime(dt: datetime) -> str:
    """Format datetime for Mexico City timezone"""
    if dt is None:
        return ""
    mexico_dt = convert_to_mexico_city(dt)
    return mexico_dt.isoformat()

# ============================================================================
# FASTAPI APP CONFIGURATION
# ============================================================================

app = FastAPI(
    title="Historias Clínicas API",
    description="Sistema de gestión de historias clínicas médicas conforme a NOM-004",
    version="1.0.0"
)

# Add error handling middleware (should be first)
app.add_middleware(ErrorHandlingMiddleware, debug=True)  # Set to False in production
app.add_middleware(RequestLoggingMiddleware)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=settings.CORS_ALLOW_CREDENTIALS,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database on startup
@app.on_event("startup")
async def startup_event():
    """Initialize database tables"""
    logger.info("Starting AVANT Medical System Backend", 
                version=settings.APP_VERSION, 
                environment=settings.APP_ENV)
    
    init_db()
    db_logger.info("Database initialized successfully")
    
    logger.info("✅ AVANT Backend startup completed successfully")

# Configure file uploads for clinical studies
UPLOAD_DIRECTORY = "uploads/clinical_studies"
Path(UPLOAD_DIRECTORY).mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# ============================================================================
# ENUMS AND DATA MODELS
# ============================================================================

class AppointmentStatus(str, Enum):
    SCHEDULED = "scheduled"
    CONFIRMED = "confirmed"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    NO_SHOW = "no_show"

class AppointmentType(str, Enum):
    CONSULTATION = "consultation"
    FOLLOW_UP = "follow_up"
    EMERGENCY = "emergency"
    PROCEDURE = "procedure"
    VACCINATION = "vaccination"
    LAB_RESULTS = "lab_results"

class PrescriptionStatus(str, Enum):
    ACTIVE = "active"
    COMPLETED = "completed"
    DISCONTINUED = "discontinued"
    SUSPENDED = "suspended"

# NOM Compliance Enums
class CivilStatus(str, Enum):
    SINGLE = "soltero"
    MARRIED = "casado"
    DIVORCED = "divorciado"
    WIDOWED = "viudo"
    SEPARATED = "separado"
    COHABITING = "union_libre"

class Gender(str, Enum):
    MALE = "masculino"
    FEMALE = "femenino"
    OTHER = "otro"

# ============================================================================
# PYDANTIC MODELS (API Request/Response)
# ============================================================================

class PatientBase(BaseModel):
    # NOM-004 Required fields
    first_name: str
    paternal_surname: str
    maternal_surname: Optional[str] = None
    
    # Personal Information
    curp: Optional[str] = None
    birth_date: date
    gender: str
    civil_status: Optional[str] = None
    nationality: str = "mexicana"
    birth_place: Optional[str] = None
    
    # Contact Information
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    country: str = "México"
    phone: Optional[str] = None
    email: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    emergency_contact_relationship: Optional[str] = None
    
    # Insurance and Medical
    insurance_provider: Optional[str] = None
    insurance_number: Optional[str] = None
    blood_type: Optional[str] = None
    allergies: Optional[str] = None
    chronic_conditions: Optional[str] = None
    current_medications: Optional[str] = None
    
    # Status field (maps to is_active in database)
    status: Optional[str] = "active"  # 'active' or 'inactive'
    
    # System fields
    created_by: str

class PatientCreate(PatientBase):
    pass

class PatientUpdate(BaseModel):
    """Model for updating patient - all fields are optional"""
    first_name: Optional[str] = None
    paternal_surname: Optional[str] = None
    maternal_surname: Optional[str] = None
    birth_date: Optional[date] = None
    gender: Optional[str] = None
    curp: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    emergency_contact_relationship: Optional[str] = None
    insurance_provider: Optional[str] = None
    insurance_number: Optional[str] = None
    blood_type: Optional[str] = None
    allergies: Optional[str] = None
    chronic_conditions: Optional[str] = None
    current_medications: Optional[str] = None
    status: Optional[str] = None  # 'active' or 'inactive'
    created_by: Optional[str] = None

class PatientResponse(BaseModel):
    # Copy of PatientBase but with birth_date as string for API response
    first_name: str
    paternal_surname: str
    maternal_surname: Optional[str] = None
    birth_date: str  # String format for API response
    gender: str
    curp: Optional[str] = None
    civil_status: Optional[str] = None
    nationality: str = "mexicana"
    birth_place: Optional[str] = None
    address: Optional[str] = None
    municipality: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    country: str = "México"
    phone: Optional[str] = None
    email: Optional[str] = None  # Added missing email field
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    emergency_contact_relationship: Optional[str] = None
    
    # Insurance and Medical fields
    insurance_provider: Optional[str] = None
    insurance_number: Optional[str] = None
    blood_type: Optional[str] = None  # Added missing blood_type field
    
    # Medical history fields
    family_history: Optional[str] = None
    personal_pathological_history: Optional[str] = None
    personal_non_pathological_history: Optional[str] = None
    allergies: Optional[str] = None
    chronic_conditions: Optional[str] = None
    current_medications: Optional[str] = None
    created_by: Optional[str] = None
    
    # Response-specific fields
    id: str
    full_name: str
    is_active: bool
    status: str  # 'active' or 'inactive' - derived from is_active
    total_visits: int
    created_at: str
    updated_at: Optional[str] = None

class DoctorProfileBase(BaseModel):
    # Personal Information (NOM-004 Required)
    title: str  # Dr., Dra., Lic., Lcda.
    first_name: str
    paternal_surname: str
    maternal_surname: Optional[str] = None
    email: str
    phone: str
    birth_date: date
    
    # Professional Information (NOM-004 Required)
    professional_license: str
    specialty: str
    specialty_license: Optional[str] = None
    university: str
    graduation_year: str
    subspecialty: Optional[str] = None
    
    # Contact Information
    professional_email: Optional[str] = None
    office_phone: Optional[str] = None
    mobile_phone: Optional[str] = None
    
    # Office Information (NOM-004 Required)
    office_address: str
    office_city: str
    office_state: str
    office_postal_code: Optional[str] = None
    office_country: str = "México"
    
    # Academic Information (NOM-004 Optional but recommended)
    # medical_school, internship_hospital, residency_hospital removed per user request
    
    # Certifications removed per user request
    # board_certifications: Optional[List[str]] = None
    # professional_memberships: Optional[List[str]] = None
    
    # Digital files
    digital_signature: Optional[str] = None
    professional_seal: Optional[str] = None
    
    # System fields
    created_by: str

class DoctorProfileCreate(DoctorProfileBase):
    pass

# ============================================================================
# APPOINTMENT MODELS
# ============================================================================

class AppointmentBase(BaseModel):
    patient_id: str
    doctor_id: Optional[str] = None
    appointment_date: datetime
    duration_minutes: int = 30
    appointment_type: AppointmentType
    status: AppointmentStatus = AppointmentStatus.SCHEDULED
    priority: Optional[str] = "normal"
    reason: str
    notes: Optional[str] = None
    preparation_instructions: Optional[str] = None
    confirmation_required: bool = False
    estimated_cost: Optional[str] = None
    insurance_covered: bool = False
    room_number: Optional[str] = None
    equipment_needed: Optional[str] = None

class AppointmentCreate(AppointmentBase):
    pass

class AppointmentUpdate(BaseModel):
    appointment_date: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    appointment_type: Optional[AppointmentType] = None
    status: Optional[AppointmentStatus] = None
    priority: Optional[str] = None
    reason: Optional[str] = None
    notes: Optional[str] = None
    preparation_instructions: Optional[str] = None
    confirmation_required: Optional[bool] = None
    estimated_cost: Optional[str] = None
    insurance_covered: Optional[bool] = None
    room_number: Optional[str] = None
    equipment_needed: Optional[str] = None
    cancelled_reason: Optional[str] = None

class AppointmentResponse(BaseModel):
    id: str
    patient_id: str
    patient_name: str
    doctor_id: Optional[str] = None
    doctor_name: Optional[str] = None
    appointment_date: str  # ISO format string
    end_time: str  # ISO format string
    duration_minutes: int
    appointment_type: str
    status: str
    priority: str
    reason: str
    notes: Optional[str] = None
    preparation_instructions: Optional[str] = None
    reminder_sent: bool
    confirmation_required: bool
    confirmed_at: Optional[str] = None
    estimated_cost: Optional[str] = None
    insurance_covered: bool
    room_number: Optional[str] = None
    equipment_needed: Optional[str] = None
    created_at: str
    updated_at: Optional[str] = None
    cancelled_reason: Optional[str] = None
    cancelled_at: Optional[str] = None  # Added missing cancelled_at field

class TimeSlot(BaseModel):
    time: str  # Format: "HH:MM"
    available: bool
    appointment_id: Optional[str] = None
    patient_name: Optional[str] = None
    reason: Optional[str] = None

class DaySchedule(BaseModel):
    date: str  # Format: "YYYY-MM-DD"
    slots: List[TimeSlot]
    total_appointments: int
    available_slots: int

class WeekSchedule(BaseModel):
    week_start: str  # Format: "YYYY-MM-DD"
    days: Dict[str, DaySchedule]  # Key: day name (monday, tuesday, etc.)

class DoctorProfileUpdate(BaseModel):
    """Model for updating doctor profile - all fields are optional"""
    title: Optional[str] = None
    first_name: Optional[str] = None
    paternal_surname: Optional[str] = None
    maternal_surname: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    birth_date: Optional[date] = None
    professional_license: Optional[str] = None
    specialty: Optional[str] = None
    specialty_license: Optional[str] = None
    university: Optional[str] = None
    graduation_year: Optional[str] = None
    subspecialty: Optional[str] = None
    professional_email: Optional[EmailStr] = None
    office_phone: Optional[str] = None
    mobile_phone: Optional[str] = None
    office_address: Optional[str] = None
    office_city: Optional[str] = None
    office_state: Optional[str] = None
    office_postal_code: Optional[str] = None
    office_country: Optional[str] = None
    # medical_school, internship_hospital, residency_hospital removed per user request
    # board_certifications: Optional[List[str]] = None
    # professional_memberships: Optional[List[str]] = None
    digital_signature: Optional[str] = None
    professional_seal: Optional[str] = None
    created_by: Optional[str] = None

class DoctorProfileResponse(DoctorProfileBase):
    id: str
    full_name: str
    is_active: bool
    created_at: str
    updated_at: Optional[str] = None

class MedicalHistoryBase(BaseModel):
    patient_id: str
    date: Optional[datetime] = None  # Auto-assigned by backend if not provided
    
    # NOM-004 mandatory consultation fields
    chief_complaint: str  # Motivo de la consulta
    history_present_illness: str  # Historia de la enfermedad actual
    
    # Medical History (NOM-004 mandatory in clinical evaluation)
    family_history: str  # Antecedentes heredofamiliares
    personal_pathological_history: str  # Antecedentes patológicos personales
    personal_non_pathological_history: str  # Antecedentes no patológicos personales
    
    physical_examination: str  # Exploración física
    
    # Diagnosis
    primary_diagnosis: str
    secondary_diagnoses: Optional[str] = None
    differential_diagnosis: Optional[str] = None
    
    # Treatment
    treatment_plan: str
    prescribed_medications: Optional[str] = None
    follow_up_instructions: str
    
    # Doctor Information (auto-filled from profile)
    doctor_name: Optional[str] = None
    doctor_professional_license: Optional[str] = None
    doctor_specialty: Optional[str] = None
    
    # System fields (auto-filled by backend)
    created_by: Optional[str] = None

class MedicalHistoryCreate(MedicalHistoryBase):
    pass

class MedicalHistoryUpdate(MedicalHistoryBase):
    pass

class ConsultationResponse(MedicalHistoryBase):
    id: str
    patient_name: Optional[str] = None
    created_at: str
    updated_at: Optional[str] = None
# ============================================================================
# HEALTH AND SYSTEM ENDPOINTS
# ============================================================================

@app.get("/health")
async def health(db: Session = Depends(get_db)):
    """Health check with database connectivity"""
    try:
        db.execute(text("SELECT 1"))
        return {
            "status": "healthy", 
            "service": "historias-clinicas",
            "database": "postgresql-connected"
        }
    except Exception as e:
        return {
            "status": "unhealthy", 
            "service": "historias-clinicas",
            "database": f"error: {str(e)}"
        }

@app.get("/api/health")
async def api_health(db: Session = Depends(get_db)):
    """Enhanced API Health check with error monitoring"""
    try:
        # Test database connectivity
        db.execute(text("SELECT 1"))
        
        # Get health info with error stats
        health_info = await health_check_with_error_info()
        health_info.update({
            "service": "historias-clinicas",
            "database": "postgresql-connected"
        })
        
        return health_info
        
    except Exception as e:
        # Report critical health check failure
        ErrorReporter.report_critical_error(e, {"endpoint": "/api/health"})
        
        return {
            "status": "unhealthy", 
            "service": "historias-clinicas",
            "database": f"error: {str(e)}",
            "timestamp": get_mexico_city_now().isoformat(),
            "timezone": "America/Mexico_City"
        }

# ============================================================================
# AUTHENTICATION ENDPOINTS
# ============================================================================

@app.post("/api/auth/login", response_model=LoginResponse)
async def login(user_credentials: UserLogin, db: Session = Depends(get_db)):
    """Authenticate user and return access token"""
    try:
        user = AuthService.authenticate_user(db, user_credentials.email, user_credentials.password)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user.id},  # user.id is now the same as doctor.id
            expires_delta=access_token_expires
        )
        
        # Get doctor information - user.id is now the doctor.id
        doctor = DoctorService.get_profile_by_id(db, user.id)
        if not doctor:
            raise HTTPException(status_code=404, detail="Doctor profile not found")
        
        doctor_info = DoctorInfo(
            id=doctor.id,
            full_name=doctor.full_name,
            title=doctor.title,
            first_name=doctor.first_name,
            paternal_surname=doctor.paternal_surname,
            maternal_surname=doctor.maternal_surname,
            email=doctor.email,
            specialty=doctor.specialty,
            professional_license=doctor.professional_license
        )
        
        return LoginResponse(
            access_token=access_token,
            token_type="bearer",
            doctor=doctor_info,
            expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60  # Convert to seconds
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Login error: {str(e)}")

@app.post("/api/auth/register", response_model=Token)
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """Register a new user account for a doctor"""
    try:
        user = AuthService.create_user(
            db, 
            user_data.email, 
            user_data.password, 
            user_data.doctor_id  # This is the doctor ID that will become the user ID
        )
        
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user.id},  # user.id is now the same as doctor.id
            expires_delta=access_token_expires
        )
        
        return Token(access_token=access_token, token_type="bearer")
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Registration error: {str(e)}")

@app.get("/api/auth/me", response_model=DoctorInfo)
async def get_current_user(current_doctor: DBDoctorProfile = Depends(get_current_doctor)):
    """Get current authenticated doctor information"""
    return DoctorInfo(
        id=current_doctor.id,
        full_name=current_doctor.full_name,
        title=current_doctor.title,
        first_name=current_doctor.first_name,
        paternal_surname=current_doctor.paternal_surname,
        maternal_surname=current_doctor.maternal_surname,
        email=current_doctor.email,
        specialty=current_doctor.specialty,
        professional_license=current_doctor.professional_license
    )

@app.get("/api/physicians/dashboard")
async def dashboard(
    db: Session = Depends(get_db),
    current_doctor: DBDoctorProfile = Depends(get_current_doctor_optional)
):
    """Get dashboard data from PostgreSQL, filtered by doctor"""
    try:
        doctor_id = current_doctor.id if current_doctor else None
        
        # Get dashboard statistics
        total_patients = db.query(DBPatient).filter(
            DBPatient.created_by == doctor_id if doctor_id else True
        ).count()
        
        total_consultations = db.query(DBMedicalHistory).filter(
            DBMedicalHistory.created_by == doctor_id if doctor_id else True
        ).count()
        
        # Get appointments for today
        today = datetime.now(ZoneInfo("America/Mexico_City")).date()
        today_appointments = db.query(DBAppointment).filter(
            DBAppointment.doctor_id == doctor_id if doctor_id else True,
            DBAppointment.appointment_date >= today,
            DBAppointment.appointment_date < today + timedelta(days=1)
        ).count()
        
        # Get recent consultations (last 7 days)
        week_ago = datetime.now(ZoneInfo("America/Mexico_City")) - timedelta(days=7)
        recent_consultations = db.query(DBMedicalHistory).filter(
            DBMedicalHistory.created_by == doctor_id if doctor_id else True,
            DBMedicalHistory.created_at >= week_ago
        ).count()
        
        return {
            "total_patients": total_patients,
            "total_consultations": total_consultations,
            "today_appointments": today_appointments,
            "recent_consultations": recent_consultations,
            "doctor_id": doctor_id,
            "timestamp": datetime.now(ZoneInfo("America/Mexico_City")).isoformat()
        }
        
    except Exception as e:
        logger.error(f"Dashboard error: {str(e)}")
        return {
            "total_patients": 0,
            "total_consultations": 0,
            "today_appointments": 0,
            "recent_consultations": 0,
            "doctor_id": doctor_id if 'doctor_id' in locals() else None,
            "error": "Dashboard data temporarily unavailable"
        }

# ============================================================================
# PATIENT ENDPOINTS - Essential only
# ============================================================================

@app.get("/api/patients", response_model=List[PatientResponse])
async def get_patients(
    search: Optional[str] = None, 
    limit: int = 100, 
    offset: int = 0, 
    db: Session = Depends(get_db),
    current_doctor: DBDoctorProfile = Depends(get_current_doctor_optional)
):
    """Get all patients with optional search and pagination from PostgreSQL"""
    try:
        # If doctor is authenticated, filter by doctor_id
        doctor_id = current_doctor.id if current_doctor else None
        patients = PatientService.get_patients(db, search or "", offset, limit, doctor_id)
        
        patient_responses = []
        for patient in patients:
            patient_dict = {
                "id": patient.id,
                "full_name": f"{patient.first_name} {patient.paternal_surname} {patient.maternal_surname or ''}".strip(),
                "first_name": patient.first_name,
                "paternal_surname": patient.paternal_surname,
                "maternal_surname": patient.maternal_surname or "",
                "curp": patient.curp or "",
                "birth_date": patient.birth_date.isoformat() if patient.birth_date else "",
                "gender": patient.gender,
                "civil_status": patient.civil_status or "",
                "nationality": patient.nationality or "mexicana",
                "birth_place": patient.birth_place or "",
                "phone": patient.phone or "",
                "email": patient.email or "",
                "address": patient.address or "",
                "city": patient.city or "",
                "state": patient.state or "",
                "postal_code": patient.postal_code or "",
                "country": patient.country or "México",
                "emergency_contact_name": patient.emergency_contact_name or "",
                "emergency_contact_phone": patient.emergency_contact_phone or "",
                "emergency_contact_relationship": patient.emergency_contact_relationship or "",
                "insurance_provider": patient.insurance_provider or "",
                "insurance_number": patient.insurance_number or "",
                "blood_type": patient.blood_type or "",
                "allergies": patient.allergies or "",
                "chronic_conditions": patient.chronic_conditions or "",
                "current_medications": patient.current_medications or "",
                "total_visits": patient.total_visits or 0,
                "is_active": patient.is_active,
                "status": "active" if patient.is_active else "inactive",
                "created_at": patient.created_at.isoformat() if patient.created_at else "",
                "updated_at": patient.updated_at.isoformat() if patient.updated_at else None,
                "created_by": patient.created_by or ""
            }
            patient_responses.append(PatientResponse(**patient_dict))
        
        return patient_responses
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching patients: {str(e)}")

@app.post("/api/patients", response_model=PatientResponse)
async def create_patient(
    patient: PatientCreate, 
    db: Session = Depends(get_db),
    current_doctor: DBDoctorProfile = Depends(get_current_doctor_optional)
):
    """Create a new patient"""
    try:
        patient_data = patient.dict()
        patient_data["created_at"] = datetime.utcnow()
        
        # Assign the authenticated doctor
        if current_doctor:
            patient_data["created_by"] = current_doctor.id
        
        # Map status field to is_active
        if "status" in patient_data:
            patient_data["is_active"] = patient_data["status"] == "active"
            del patient_data["status"]  # Remove status from data sent to database
        
        new_patient = PatientService.create_patient(db, patient_data)
        
        patient_dict = {
            "id": new_patient.id,
            "full_name": f"{new_patient.first_name} {new_patient.paternal_surname} {new_patient.maternal_surname or ''}".strip(),
            "first_name": new_patient.first_name,
            "paternal_surname": new_patient.paternal_surname,
            "maternal_surname": new_patient.maternal_surname or "",
            "curp": new_patient.curp or "",
            "birth_date": new_patient.birth_date.isoformat() if new_patient.birth_date else "",
            "gender": new_patient.gender,
            "civil_status": new_patient.civil_status or "",
            "nationality": new_patient.nationality or "mexicana",
            "birth_place": new_patient.birth_place or "",
            "phone": new_patient.phone or "",
            "email": new_patient.email or "",
            "address": new_patient.address or "",
            "city": new_patient.city or "",
            "state": new_patient.state or "",
            "postal_code": new_patient.postal_code or "",
            "country": new_patient.country or "México",
            "emergency_contact_name": new_patient.emergency_contact_name or "",
            "emergency_contact_phone": new_patient.emergency_contact_phone or "",
            "emergency_contact_relationship": new_patient.emergency_contact_relationship or "",
            "insurance_provider": new_patient.insurance_provider or "",
            "insurance_number": new_patient.insurance_number or "",
            "blood_type": new_patient.blood_type or "",
            "allergies": new_patient.allergies or "",
            "chronic_conditions": new_patient.chronic_conditions or "",
            "current_medications": new_patient.current_medications or "",
            "total_visits": new_patient.total_visits or 0,
            "is_active": new_patient.is_active,
            "status": "active" if new_patient.is_active else "inactive",
            "created_at": new_patient.created_at.isoformat() if new_patient.created_at else "",
            "updated_at": new_patient.updated_at.isoformat() if new_patient.updated_at else None,
            "created_by": new_patient.created_by or ""
        }
        
        return PatientResponse(**patient_dict)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating patient: {str(e)}")

@app.get("/api/patients/{patient_id}", response_model=PatientResponse)
async def get_patient(patient_id: str, db: Session = Depends(get_db)):
    """Get a patient by ID"""
    try:
        patient = PatientService.get_patient(db, patient_id)
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")
        
        patient_dict = {
            "id": patient.id,
            "full_name": f"{patient.first_name} {patient.paternal_surname} {patient.maternal_surname or ''}".strip(),
            "first_name": patient.first_name,
            "paternal_surname": patient.paternal_surname,
            "maternal_surname": patient.maternal_surname or "",
            "birth_date": patient.birth_date.isoformat() if patient.birth_date else "",
            "gender": patient.gender or "",
            "curp": patient.curp or "",
            "phone": patient.phone or "",
            "email": patient.email or "",
            "address": patient.address or "",
            "city": patient.city or "",
            "state": patient.state or "",
            "postal_code": patient.postal_code or "",
            "country": patient.country or "México",
            "emergency_contact_name": patient.emergency_contact_name or "",
            "emergency_contact_phone": patient.emergency_contact_phone or "",
            "emergency_contact_relationship": patient.emergency_contact_relationship or "",
            "insurance_provider": patient.insurance_provider or "",
            "insurance_number": patient.insurance_number or "",
            "blood_type": patient.blood_type or "",
            "allergies": patient.allergies or "",
            "chronic_conditions": patient.chronic_conditions or "",
            "current_medications": patient.current_medications or "",
            "total_visits": patient.total_visits or 0,
            "is_active": patient.is_active,
            "status": "active" if patient.is_active else "inactive",
            "created_at": patient.created_at.isoformat() if patient.created_at else "",
            "updated_at": patient.updated_at.isoformat() if patient.updated_at else None,
            "created_by": patient.created_by or ""
        }
        
        return PatientResponse(**patient_dict)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching patient: {str(e)}")

@app.put("/api/patients/{patient_id}", response_model=PatientResponse)
async def update_patient(patient_id: str, patient: PatientUpdate, db: Session = Depends(get_db)):
    """Update an existing patient"""
    try:
        # Verificar que el paciente existe
        existing_patient = PatientService.get_patient(db, patient_id)
        if not existing_patient:
            raise HTTPException(status_code=404, detail="Patient not found")
        
        # Preparar datos para actualización
        update_data = patient.dict(exclude_unset=True)
        update_data["updated_at"] = datetime.utcnow()
        
        # Map status field to is_active
        if "status" in update_data:
            update_data["is_active"] = update_data["status"] == "active"
            del update_data["status"]  # Remove status from data sent to database
        
        # Actualizar paciente
        updated_patient = PatientService.update_patient(db, patient_id, update_data)
        
        patient_dict = {
            "id": updated_patient.id,
            "full_name": f"{updated_patient.first_name} {updated_patient.paternal_surname} {updated_patient.maternal_surname or ''}".strip(),
            "first_name": updated_patient.first_name,
            "paternal_surname": updated_patient.paternal_surname,
            "maternal_surname": updated_patient.maternal_surname or "",
            "birth_date": updated_patient.birth_date.isoformat() if updated_patient.birth_date else "",
            "gender": updated_patient.gender or "",
            "curp": updated_patient.curp or "",
            "phone": updated_patient.phone or "",
            "email": updated_patient.email or "",
            "address": updated_patient.address or "",
            "city": updated_patient.city or "",
            "state": updated_patient.state or "",
            "postal_code": updated_patient.postal_code or "",
            "country": updated_patient.country or "México",
            "emergency_contact_name": updated_patient.emergency_contact_name or "",
            "emergency_contact_phone": updated_patient.emergency_contact_phone or "",
            "emergency_contact_relationship": updated_patient.emergency_contact_relationship or "",
            "insurance_provider": updated_patient.insurance_provider or "",
            "insurance_number": updated_patient.insurance_number or "",
            "blood_type": updated_patient.blood_type or "",
            "allergies": updated_patient.allergies or "",
            "chronic_conditions": updated_patient.chronic_conditions or "",
            "current_medications": updated_patient.current_medications or "",
            "total_visits": updated_patient.total_visits or 0,
            "is_active": updated_patient.is_active,
            "status": "active" if updated_patient.is_active else "inactive",
            "created_at": updated_patient.created_at.isoformat() if updated_patient.created_at else "",
            "updated_at": updated_patient.updated_at.isoformat() if updated_patient.updated_at else None,
            "created_by": updated_patient.created_by or ""
        }
        
        return PatientResponse(**patient_dict)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating patient: {str(e)}")

# ============================================================================
# DOCTOR PROFILE ENDPOINTS - Essential only  
# ============================================================================

@app.get("/api/doctor/profile", response_model=DoctorProfileResponse)
async def get_doctor_profile(
    db: Session = Depends(get_db),
    current_doctor: DBDoctorProfile = Depends(get_current_doctor)
):
    """Get the current doctor's profile"""
    profile = current_doctor
    if not profile:
        raise HTTPException(status_code=404, detail="Perfil del médico no encontrado")
    
    profile_dict = {
        "id": profile.id,
        "title": profile.title,
        "first_name": profile.first_name,
        "paternal_surname": profile.paternal_surname,
        "maternal_surname": profile.maternal_surname or "",
        "email": profile.email,
        "phone": profile.phone,
        "birth_date": profile.birth_date,
        "professional_license": profile.professional_license,
        "specialty": profile.specialty,
        "specialty_license": profile.specialty_license or "",
        "university": profile.university,
        "graduation_year": profile.graduation_year,
        "subspecialty": profile.subspecialty or "",
        "professional_email": profile.professional_email or "",
        "office_phone": profile.office_phone or "",
        "mobile_phone": profile.mobile_phone or "",
        "office_address": profile.office_address,
        "office_city": profile.office_city,
        "office_state": profile.office_state,
        "office_postal_code": profile.office_postal_code or "",
        "office_country": profile.office_country or "México",
        # medical_school, internship_hospital, residency_hospital removed per user request
        # board_certifications and professional_memberships removed per user request
        "digital_signature": profile.digital_signature,
        "professional_seal": profile.professional_seal,
        "full_name": profile.full_name,
        "is_active": profile.is_active,
        "created_at": profile.created_at.isoformat() if profile.created_at else "",
        "updated_at": profile.updated_at.isoformat() if profile.updated_at else None,
        "created_by": profile.created_by or ""
    }
    
    return DoctorProfileResponse(**profile_dict)

@app.post("/api/doctor/profile", response_model=DoctorProfileResponse)
async def create_doctor_profile(profile: DoctorProfileCreate, db: Session = Depends(get_db)):
    """Create a new doctor profile with NOM-004 compliance validation"""
    try:
        api_logger.info("Creating doctor profile", profile_data=profile.dict())
        profile_data = profile.dict()
        # board_certifications and professional_memberships processing removed per user request
        
        profile_data["created_at"] = datetime.utcnow()
        api_logger.debug("Processing profile data", profile_data=profile_data)
        
        new_profile = DoctorService.create_profile(db, profile_data)
        
        profile_dict = {
            "id": new_profile.id,
            "title": new_profile.title,
            "first_name": new_profile.first_name,
            "paternal_surname": new_profile.paternal_surname,
            "maternal_surname": new_profile.maternal_surname or "",
            "email": new_profile.email,
            "phone": new_profile.phone,
            "birth_date": new_profile.birth_date,
            "professional_license": new_profile.professional_license,
            "specialty": new_profile.specialty,
            "specialty_license": new_profile.specialty_license or "",
            "university": new_profile.university,
            "graduation_year": new_profile.graduation_year,
            "subspecialty": new_profile.subspecialty or "",
            "professional_email": new_profile.professional_email or "",
            "office_phone": new_profile.office_phone or "",
            "mobile_phone": new_profile.mobile_phone or "",
            "office_address": new_profile.office_address,
            "office_city": new_profile.office_city,
            "office_state": new_profile.office_state,
            "office_postal_code": new_profile.office_postal_code or "",
            "office_country": new_profile.office_country or "México",
            # medical_school, internship_hospital, residency_hospital removed per user request
            # board_certifications and professional_memberships removed per user request
            "digital_signature": new_profile.digital_signature,
            "professional_seal": new_profile.professional_seal,
            "full_name": new_profile.full_name,
            "is_active": new_profile.is_active,
            "created_at": new_profile.created_at.isoformat() if new_profile.created_at else "",
            "updated_at": new_profile.updated_at.isoformat() if new_profile.updated_at else None,
            "created_by": new_profile.created_by or ""
        }
        
        return DoctorProfileResponse(**profile_dict)
    except ValidationError as ve:
        print(f"❌ Validation error: {ve}")
        raise HTTPException(status_code=422, detail=f"Validation error: {ve}")
    except Exception as e:
        print(f"❌ General error: {e}")
        raise HTTPException(status_code=500, detail=f"Error creating doctor profile: {str(e)}")

@app.put("/api/doctor/profile", response_model=DoctorProfileResponse)
async def update_doctor_profile(
    profile: DoctorProfileUpdate, 
    db: Session = Depends(get_db),
    current_doctor: DBDoctorProfile = Depends(get_current_doctor)
):
    """Update the current doctor's profile with NOM-004 compliance validation"""
    try:
        # Use the authenticated doctor's profile
        existing_profile = current_doctor
        if not existing_profile:
            raise HTTPException(status_code=404, detail="Perfil del médico no encontrado")
        
        # Prepare update data
        profile_data = profile.dict(exclude_unset=True)
        
        # Handle array/string conversion for certifications and memberships
        # board_certifications and professional_memberships processing removed per user request
        
        profile_data["updated_at"] = datetime.utcnow()
        
        # Update the profile
        updated_profile = DoctorService.update_profile(db, existing_profile.id, profile_data)
        
        # Synchronize email: if email was updated in profile, update user's login email too
        if 'email' in profile_data:
            from database import User
            user = db.query(User).filter(User.doctor_id == updated_profile.id).first()
            if user and user.email != updated_profile.email:
                print(f"🔄 Synchronizing email: {user.email} → {updated_profile.email}")
                user.email = updated_profile.email
                user.username = updated_profile.email  # Also update username to match
                db.commit()
                print(f"✅ User login email synchronized successfully")
        
        # Prepare response
        profile_dict = {
            "id": updated_profile.id,
            "title": updated_profile.title,
            "first_name": updated_profile.first_name,
            "paternal_surname": updated_profile.paternal_surname,
            "maternal_surname": updated_profile.maternal_surname or "",
            "email": updated_profile.email,
            "phone": updated_profile.phone,
            "birth_date": updated_profile.birth_date,
            "professional_license": updated_profile.professional_license,
            "specialty": updated_profile.specialty,
            "specialty_license": updated_profile.specialty_license or "",
            "university": updated_profile.university,
            "graduation_year": updated_profile.graduation_year,
            "subspecialty": updated_profile.subspecialty or "",
            "professional_email": updated_profile.professional_email or "",
            "office_phone": updated_profile.office_phone or "",
            "mobile_phone": updated_profile.mobile_phone or "",
            "office_address": updated_profile.office_address,
            "office_city": updated_profile.office_city,
            "office_state": updated_profile.office_state,
            "office_postal_code": updated_profile.office_postal_code or "",
            "office_country": updated_profile.office_country or "México",
            # medical_school, internship_hospital, residency_hospital removed per user request
            # board_certifications and professional_memberships removed per user request
            "digital_signature": updated_profile.digital_signature,
            "professional_seal": updated_profile.professional_seal,
            "full_name": updated_profile.full_name,
            "is_active": updated_profile.is_active,
            "created_at": updated_profile.created_at.isoformat() if updated_profile.created_at else "",
            "updated_at": updated_profile.updated_at.isoformat() if updated_profile.updated_at else None,
            "created_by": updated_profile.created_by or ""
        }
        
        return DoctorProfileResponse(**profile_dict)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating doctor profile: {str(e)}")

# ============================================================================
# CONSULTATION ENDPOINTS - Essential only
# ============================================================================

@app.get("/api/consultations", response_model=List[ConsultationResponse])
async def get_consultations(
    patient_search: Optional[str] = None, 
    db: Session = Depends(get_db),
    current_doctor: DBDoctorProfile = Depends(get_current_doctor_optional)
):
    """Get all consultations with optional patient search, filtered by doctor"""
    try:
        # If doctor is authenticated, filter by doctor_id
        doctor_id = current_doctor.id if current_doctor else None
        consultations = ConsultationService.get_consultations(db, patient_search or "", doctor_id)
        
        consultation_responses = []
        for consultation_dict in consultations:
            if '_sa_instance_state' in consultation_dict:
                del consultation_dict['_sa_instance_state']
                
            consultation_response = {
                "id": consultation_dict.get("id", ""),
                "patient_id": consultation_dict.get("patient_id", ""),
                "date": consultation_dict.get("date", ""),
                "chief_complaint": consultation_dict.get("chief_complaint", ""),
                "history_present_illness": consultation_dict.get("history_present_illness", ""),
                "family_history": consultation_dict.get("family_history", ""),
                "personal_pathological_history": consultation_dict.get("personal_pathological_history", ""),
                "personal_non_pathological_history": consultation_dict.get("personal_non_pathological_history", ""),
                "physical_examination": consultation_dict.get("physical_examination", ""),
                "primary_diagnosis": consultation_dict.get("primary_diagnosis", ""),
                "secondary_diagnoses": consultation_dict.get("secondary_diagnoses", ""),
                "differential_diagnosis": consultation_dict.get("differential_diagnosis", ""),
                "treatment_plan": consultation_dict.get("treatment_plan", ""),
                "prescribed_medications": consultation_dict.get("prescribed_medications", ""),
                "follow_up_instructions": consultation_dict.get("follow_up_instructions", ""),
                "doctor_name": consultation_dict.get("doctor_name", ""),
                "doctor_professional_license": consultation_dict.get("doctor_professional_license", ""),
                "doctor_specialty": consultation_dict.get("doctor_specialty", ""),
                "patient_name": consultation_dict.get("patient_name", ""),
                "created_at": consultation_dict.get("created_at", ""),
                "updated_at": consultation_dict.get("updated_at"),
                "created_by": consultation_dict.get("created_by", "")
            }
            consultation_responses.append(ConsultationResponse(**consultation_response))
        
        return consultation_responses
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching consultations: {str(e)}")

@app.post("/api/consultations", response_model=ConsultationResponse)
async def create_consultation(
    consultation: MedicalHistoryCreate, 
    db: Session = Depends(get_db),
    current_doctor: DBDoctorProfile = Depends(get_current_doctor_optional)
):
    """Create a new consultation"""
    try:
        consultation_data = consultation.dict()
        # Use Mexico City timezone for created_at
        consultation_data["created_at"] = get_mexico_city_now()
        
        # Ensure date field is in Mexico City timezone
        if 'date' in consultation_data and consultation_data['date']:
            # If date comes as ISO string from frontend, convert to Mexico City timezone
            if isinstance(consultation_data['date'], str):
                date_obj = datetime.fromisoformat(consultation_data['date'].replace('Z', '+00:00'))
                consultation_data['date'] = convert_to_mexico_city(date_obj)
            elif isinstance(consultation_data['date'], datetime):
                consultation_data['date'] = convert_to_mexico_city(consultation_data['date'])
        else:
            # If no date provided, use current Mexico City time
            consultation_data['date'] = get_mexico_city_now()
        
        # Assign the authenticated doctor
        if current_doctor:
            consultation_data["created_by"] = current_doctor.id
            # Set doctor information fields
            consultation_data["doctor_name"] = f"{current_doctor.first_name} {current_doctor.paternal_surname}"
            consultation_data["doctor_professional_license"] = current_doctor.professional_license
            consultation_data["doctor_specialty"] = current_doctor.specialty or "General"
        else:
            # Fallback if no authenticated doctor
            consultation_data["created_by"] = "Sistema"
            consultation_data["doctor_name"] = "Doctor Sistema"
            consultation_data["doctor_professional_license"] = "N/A"
            consultation_data["doctor_specialty"] = "General"
        
        new_consultation = ConsultationService.create_consultation(db, consultation_data)
        
        patient = PatientService.get_patient(db, new_consultation.patient_id)
        patient_name = f"{patient.first_name} {patient.paternal_surname} {patient.maternal_surname or ''}".strip() if patient else ""
        
        consultation_response = {
            "id": new_consultation.id,
            "patient_id": new_consultation.patient_id,
            "date": new_consultation.date,
            "chief_complaint": new_consultation.chief_complaint,
            "history_present_illness": new_consultation.history_present_illness,
            "family_history": new_consultation.family_history,
            "personal_pathological_history": new_consultation.personal_pathological_history,
            "personal_non_pathological_history": new_consultation.personal_non_pathological_history,
            "physical_examination": new_consultation.physical_examination,
            "primary_diagnosis": new_consultation.primary_diagnosis,
            "secondary_diagnoses": new_consultation.secondary_diagnoses or "",
            "differential_diagnosis": new_consultation.differential_diagnosis or "",
            "treatment_plan": new_consultation.treatment_plan,
            "prescribed_medications": new_consultation.prescribed_medications or "",
            "follow_up_instructions": new_consultation.follow_up_instructions,
            "doctor_name": new_consultation.doctor_name,
            "doctor_professional_license": new_consultation.doctor_professional_license,
            "doctor_specialty": new_consultation.doctor_specialty or "",
            "patient_name": patient_name,
            "created_at": new_consultation.created_at.isoformat() if new_consultation.created_at else "",
            "updated_at": new_consultation.updated_at.isoformat() if new_consultation.updated_at else None,
            "created_by": new_consultation.created_by
        }
        
        return ConsultationResponse(**consultation_response)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating consultation: {str(e)}")

# ============================================================================
# AGENDA ENDPOINTS - Medical Scheduling
# ============================================================================

@app.get("/api/agenda/daily")
async def get_daily_agenda(target_date: Optional[str] = None, db: Session = Depends(get_db)):
    """Get daily agenda - all appointments for a specific date"""
    try:
        from datetime import datetime, date
        
        # Parse target date or use today
        if target_date:
            target_date_obj = datetime.fromisoformat(target_date).date()
        else:
            target_date_obj = date.today()
        
        # Get appointments for the day using AppointmentService
        appointments = AppointmentService.get_appointments(
            db, 
            start_date=target_date_obj, 
            end_date=target_date_obj
        )
        
        agenda_items = []
        for appointment in appointments:
            # Get patient name
            patient_name = f"{appointment.patient.first_name} {appointment.patient.paternal_surname}" if appointment.patient else "Unknown"
            
            agenda_items.append({
                "id": appointment.id,
                "patient_id": appointment.patient_id,
                "patient_name": patient_name,
                "date_time": format_mexico_city_datetime(appointment.appointment_date),
                "appointment_date": format_mexico_city_datetime(appointment.appointment_date),
                "end_time": format_mexico_city_datetime(appointment.end_time) if appointment.end_time else None,
                "appointment_type": appointment.appointment_type,
                "reason": appointment.reason,
                "notes": appointment.notes or "",
                "duration_minutes": appointment.duration_minutes,
                "status": appointment.status,
                "priority": appointment.priority,
                "created_at": format_mexico_city_datetime(appointment.created_at)
            })
        
        return agenda_items
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching daily agenda: {str(e)}")

@app.get("/api/agenda/weekly")
async def get_weekly_agenda(start_date: Optional[str] = None, db: Session = Depends(get_db)):
    """Get weekly agenda view"""
    try:
        from datetime import datetime, date, timedelta
        
        # Parse start date or use this week
        if start_date:
            start_date_obj = datetime.fromisoformat(start_date).date()
        else:
            today = date.today()
            start_date_obj = today - timedelta(days=today.weekday())  # Monday of current week
        
        end_date_obj = start_date_obj + timedelta(days=6)  # Sunday
        
        # Get appointments for the week
        weekly_agenda = {}
        current_date = start_date_obj
        
        while current_date <= end_date_obj:
            day_name = current_date.strftime('%A').lower()
            appointments = ConsultationService.get_consultations_by_date(db, current_date)
            
            weekly_agenda[day_name] = {
                "date": current_date.isoformat(),
                "appointments": len(appointments),
                "consultations": [
                    {
                        "id": consultation.id,
                        "patient_name": consultation.patient_name or "Paciente",
                        "time": "08:00",  # Default time, can be enhanced
                        "reason": consultation.chief_complaint or "Consulta",
                        "status": "programada"
                    }
                    for consultation in appointments
                ]
            }
            current_date += timedelta(days=1)
        
        return weekly_agenda
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching weekly agenda: {str(e)}")

@app.get("/api/agenda/available-slots")
async def get_available_slots(target_date: Optional[str] = None, db: Session = Depends(get_db)):
    """Get available time slots for appointments"""
    try:
        from datetime import datetime, date, time, timedelta
        
        # Parse target date or use today
        if target_date:
            target_date_obj = datetime.fromisoformat(target_date).date()
        else:
            target_date_obj = date.today()
        
        # Define working hours (8 AM to 6 PM)
        working_hours = []
        for hour in range(8, 18):  # 8 AM to 5 PM (last slot at 5 PM)
            for minute in [0, 30]:  # Every 30 minutes
                slot_time = time(hour, minute)
                slot_datetime = datetime.combine(target_date_obj, slot_time)
                
                working_hours.append({
                    "time": slot_time.strftime("%H:%M"),
                    "datetime": slot_datetime.isoformat(),
                    "available": True,  # For now, all slots are available
                    "duration_minutes": 30
                })
        
        # Get existing appointments to mark unavailable slots
        appointments = ConsultationService.get_consultations_by_date(db, target_date_obj)
        occupied_times = set()
        
        for appointment in appointments:
            if appointment.date:
                time_str = appointment.date.strftime("%H:%M")
                occupied_times.add(time_str)
        
        # Mark occupied slots as unavailable
        for slot in working_hours:
            if slot["time"] in occupied_times:
                slot["available"] = False
        
        return {
            "date": target_date_obj.isoformat(),
            "total_slots": len(working_hours),
            "available_slots": len([s for s in working_hours if s["available"]]),
            "slots": working_hours
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching available slots: {str(e)}")

@app.post("/api/agenda/appointments")
async def create_appointment(appointment_data: dict, current_doctor: DBDoctorProfile = Depends(get_current_doctor_optional), db: Session = Depends(get_db)):
    """Create a new appointment in the agenda"""
    try:
        from datetime import datetime
        
        # Extract appointment date from either field name
        appointment_date_str = appointment_data.get("appointment_date") or appointment_data.get("date_time")
        if not appointment_date_str:
            raise HTTPException(status_code=400, detail="appointment_date or date_time is required")
        
        # Parse datetime and convert to Mexico City timezone
        appointment_date = datetime.fromisoformat(appointment_date_str.replace('Z', '+00:00'))
        appointment_date = convert_to_mexico_city(appointment_date)
        
        # Auto-assign doctor_id if not provided from system doctor profile
        doctor_id = appointment_data.get("doctor_id")
        print(f"🔍 CREATE APPOINTMENT DEBUG:")
        print(f"   📋 Received doctor_id: '{doctor_id}'")
        print(f"   📋 doctor_id type: {type(doctor_id)}")
        print(f"   📋 doctor_id bool: {bool(doctor_id)}")
        
        if not doctor_id or doctor_id.strip() == '':
            # Auto-assign from authenticated doctor or fallback to system profile
            print(f"   🔄 Auto-assigning doctor...")
            if current_doctor:
                doctor_id = current_doctor.id
                print(f"   ✅ Auto-assigned from authenticated doctor: {doctor_id} ({current_doctor.full_name})")
            else:
                # Fallback to system doctor profile if no authentication
                print(f"   🔄 No authenticated doctor, using system profile...")
                try:
                    doctor_profile = DoctorService.get_profile(db)
                    if doctor_profile:
                        doctor_id = doctor_profile.id
                        print(f"   ✅ Auto-assigned from system profile: {doctor_id}")
                    else:
                        print(f"   ❌ No doctor profile found in system")
                except Exception as e:
                    print(f"   ❌ Warning: Could not auto-assign doctor: {e}")
        else:
            print(f"   ✅ Using provided doctor_id: {doctor_id}")
        
        # Create appointment using the proper appointment service
        appointment_create_data = {
            "patient_id": appointment_data.get("patient_id"),
            "doctor_id": doctor_id,  # Use auto-assigned or provided doctor_id
            "appointment_date": appointment_date,
            "appointment_type": appointment_data.get("appointment_type", "consultation"),
            "reason": appointment_data.get("reason", "Cita programada"),
            "notes": appointment_data.get("notes", ""),
            "duration_minutes": appointment_data.get("duration_minutes", 30),
            "status": appointment_data.get("status", "scheduled"),
            "priority": appointment_data.get("priority", "normal"),
            "preparation_instructions": appointment_data.get("preparation_instructions"),
            "confirmation_required": appointment_data.get("confirmation_required", False),
            "estimated_cost": appointment_data.get("estimated_cost"),
            "insurance_covered": appointment_data.get("insurance_covered", False),
            "room_number": appointment_data.get("room_number"),
            "equipment_needed": appointment_data.get("equipment_needed"),
            "created_by": current_doctor.id if current_doctor else "Sistema"
        }
        
        new_appointment = AppointmentService.create_appointment(db, appointment_create_data)
        
        # Get patient name for response
        patient_name = f"{new_appointment.patient.first_name} {new_appointment.patient.paternal_surname}" if new_appointment.patient else "Unknown"
        
        return {
            "id": new_appointment.id,
            "patient_id": new_appointment.patient_id,
            "patient_name": patient_name,
            "date_time": format_mexico_city_datetime(new_appointment.appointment_date),
            "appointment_date": format_mexico_city_datetime(new_appointment.appointment_date),
            "end_time": format_mexico_city_datetime(new_appointment.end_time) if new_appointment.end_time else None,
            "appointment_type": new_appointment.appointment_type,
            "reason": new_appointment.reason,
            "notes": new_appointment.notes,
            "duration_minutes": new_appointment.duration_minutes,
            "status": new_appointment.status,
            "priority": new_appointment.priority,
            "created_at": format_mexico_city_datetime(new_appointment.created_at)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating appointment: {str(e)}")

@app.put("/api/agenda/appointments/{appointment_id}")
async def update_appointment(appointment_id: str, appointment_data: dict, current_doctor: DBDoctorProfile = Depends(get_current_doctor_optional), db: Session = Depends(get_db)):
    """Update an existing appointment"""
    try:
        from datetime import datetime
        
        # Extract appointment date from either field name
        appointment_date_str = appointment_data.get("appointment_date") or appointment_data.get("date_time")
        
        # Prepare update data for appointment service
        update_data = {}
        
        if appointment_date_str:
            appointment_date = datetime.fromisoformat(appointment_date_str.replace('Z', '+00:00'))
            update_data["appointment_date"] = convert_to_mexico_city(appointment_date)
        
        # Auto-assign doctor_id if provided, or get from system doctor profile
        received_doctor_id = appointment_data.get("doctor_id")
        print(f"🔍 UPDATE APPOINTMENT DEBUG:")
        print(f"   📋 Received doctor_id: '{received_doctor_id}'")
        print(f"   📋 doctor_id type: {type(received_doctor_id)}")
        print(f"   📋 doctor_id bool: {bool(received_doctor_id)}")
        
        if "doctor_id" in appointment_data and received_doctor_id and received_doctor_id.strip() != '':
            update_data["doctor_id"] = received_doctor_id
            print(f"   ✅ Using provided doctor_id: {received_doctor_id}")
        else:
            # Auto-assign from authenticated doctor or fallback to system profile
            print(f"   🔄 Auto-assigning doctor...")
            if current_doctor:
                update_data["doctor_id"] = current_doctor.id
                print(f"   ✅ Auto-assigned from authenticated doctor: {current_doctor.id} ({current_doctor.full_name})")
            else:
                # Fallback to system doctor profile if no authentication
                print(f"   🔄 No authenticated doctor, using system profile...")
                try:
                    doctor_profile = DoctorService.get_profile(db)
                    if doctor_profile:
                        update_data["doctor_id"] = doctor_profile.id
                        print(f"   ✅ Auto-assigned from system profile: {doctor_profile.id}")
                    else:
                        print(f"   ❌ No doctor profile found in system")
                except Exception as e:
                    print(f"   ❌ Warning: Could not auto-assign doctor: {e}")
        
        if "reason" in appointment_data:
            update_data["reason"] = appointment_data["reason"]
        if "notes" in appointment_data:
            update_data["notes"] = appointment_data["notes"]
        if "duration_minutes" in appointment_data:
            update_data["duration_minutes"] = appointment_data["duration_minutes"]
        if "status" in appointment_data:
            update_data["status"] = appointment_data["status"]
        if "priority" in appointment_data:
            update_data["priority"] = appointment_data["priority"]
        if "preparation_instructions" in appointment_data:
            update_data["preparation_instructions"] = appointment_data["preparation_instructions"]
        if "confirmation_required" in appointment_data:
            update_data["confirmation_required"] = appointment_data["confirmation_required"]
        if "estimated_cost" in appointment_data:
            update_data["estimated_cost"] = appointment_data["estimated_cost"]
        if "insurance_covered" in appointment_data:
            update_data["insurance_covered"] = appointment_data["insurance_covered"]
        if "room_number" in appointment_data:
            update_data["room_number"] = appointment_data["room_number"]
        if "equipment_needed" in appointment_data:
            update_data["equipment_needed"] = appointment_data["equipment_needed"]
        
        updated_appointment = AppointmentService.update_appointment(db, appointment_id, update_data)
        
        if not updated_appointment:
            raise HTTPException(status_code=404, detail="Appointment not found")
        
        # Get patient name for response
        patient_name = f"{updated_appointment.patient.first_name} {updated_appointment.patient.paternal_surname}" if updated_appointment.patient else "Unknown"
        
        return {
            "id": updated_appointment.id,
            "patient_id": updated_appointment.patient_id,
            "patient_name": patient_name,
            "date_time": format_mexico_city_datetime(updated_appointment.appointment_date),
            "appointment_date": format_mexico_city_datetime(updated_appointment.appointment_date),
            "end_time": format_mexico_city_datetime(updated_appointment.end_time) if updated_appointment.end_time else None,
            "appointment_type": updated_appointment.appointment_type,
            "reason": updated_appointment.reason,
            "notes": updated_appointment.notes,
            "duration_minutes": updated_appointment.duration_minutes,
            "status": updated_appointment.status,
            "priority": updated_appointment.priority,
            "updated_at": format_mexico_city_datetime(updated_appointment.updated_at) if updated_appointment.updated_at else None
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating appointment: {str(e)}")

@app.delete("/api/agenda/appointments/{appointment_id}")
async def delete_appointment(appointment_id: str, db: Session = Depends(get_db)):
    """Delete an appointment"""
    try:
        success = ConsultationService.delete_consultation(db, appointment_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Appointment not found")
        
        return {"message": "Appointment deleted successfully", "id": appointment_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting appointment: {str(e)}")

# ============================================================================
# APPOINTMENT/AGENDA ENDPOINTS
# ============================================================================

@app.get("/api/appointments", response_model=List[AppointmentResponse])
async def get_appointments(
    skip: int = 0,
    limit: int = 100,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    status: Optional[str] = None,
    patient_id: Optional[str] = None,
    doctor_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_doctor: DBDoctorProfile = Depends(get_current_doctor_optional)
):
    """Get appointments with filters"""
    try:
        # Parse dates
        start_date_obj = None
        end_date_obj = None
        if start_date:
            start_date_obj = datetime.fromisoformat(start_date).date()
        if end_date:
            end_date_obj = datetime.fromisoformat(end_date).date()
        
        # Override doctor_id with authenticated doctor if present
        filtered_doctor_id = current_doctor.id if current_doctor else doctor_id
        
        appointments = AppointmentService.get_appointments(
            db, skip=skip, limit=limit,
            start_date=start_date_obj, end_date=end_date_obj,
            status=status, patient_id=patient_id, doctor_id=filtered_doctor_id
        )
        
        # Format response
        response = []
        for apt in appointments:
            patient_name = f"{apt.patient.first_name} {apt.patient.paternal_surname}" if apt.patient else "Unknown"
            doctor_name = apt.doctor.full_name if apt.doctor else apt.doctor_name or "Not assigned"
            
            response.append({
                "id": apt.id,
                "patient_id": apt.patient_id,
                "patient_name": patient_name,
                "doctor_id": apt.doctor_id,
                "doctor_name": doctor_name,
                "appointment_date": apt.appointment_date.isoformat(),
                "end_time": apt.end_time.isoformat() if apt.end_time else None,
                "duration_minutes": apt.duration_minutes,
                "appointment_type": apt.appointment_type,
                "status": apt.status,
                "priority": apt.priority or "normal",
                "reason": apt.reason,
                "notes": apt.notes,
                "preparation_instructions": apt.preparation_instructions,
                "reminder_sent": apt.reminder_sent or False,
                "confirmation_required": apt.confirmation_required or False,
                "confirmed_at": apt.confirmed_at.isoformat() if apt.confirmed_at else None,
                "estimated_cost": apt.estimated_cost,
                "insurance_covered": apt.insurance_covered or False,
                "room_number": apt.room_number,
                "equipment_needed": apt.equipment_needed,
                "created_at": apt.created_at.isoformat(),
                "updated_at": apt.updated_at.isoformat() if apt.updated_at else None,
                "cancelled_reason": apt.cancelled_reason,
                "cancelled_at": apt.cancelled_at.isoformat() if apt.cancelled_at else None
            })
        
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching appointments: {str(e)}")

@app.post("/api/appointments", response_model=AppointmentResponse)
async def create_appointment_new(appointment: AppointmentCreate, current_doctor: DBDoctorProfile = Depends(get_current_doctor_optional), db: Session = Depends(get_db)):
    """Create a new appointment"""
    try:
        appointment_data = appointment.dict()
        appointment_data["created_at"] = datetime.utcnow()
        
        # Assign the authenticated doctor to created_by
        if current_doctor:
            appointment_data["created_by"] = current_doctor.id
        else:
            appointment_data["created_by"] = "Sistema"
        
        new_appointment = AppointmentService.create_appointment(db, appointment_data)
        
        # Get patient name
        patient_name = f"{new_appointment.patient.first_name} {new_appointment.patient.paternal_surname}" if new_appointment.patient else "Unknown"
        doctor_name = new_appointment.doctor.full_name if new_appointment.doctor else new_appointment.doctor_name or "Not assigned"
        
        return {
            "id": new_appointment.id,
            "patient_id": new_appointment.patient_id,
            "patient_name": patient_name,
            "doctor_id": new_appointment.doctor_id,
            "doctor_name": doctor_name,
            "appointment_date": new_appointment.appointment_date.isoformat(),
            "end_time": new_appointment.end_time.isoformat() if new_appointment.end_time else None,
            "duration_minutes": new_appointment.duration_minutes,
            "appointment_type": new_appointment.appointment_type,
            "status": new_appointment.status,
            "priority": new_appointment.priority or "normal",
            "reason": new_appointment.reason,
            "notes": new_appointment.notes,
            "preparation_instructions": new_appointment.preparation_instructions,
            "reminder_sent": new_appointment.reminder_sent or False,
            "confirmation_required": new_appointment.confirmation_required or False,
            "confirmed_at": new_appointment.confirmed_at.isoformat() if new_appointment.confirmed_at else None,
            "estimated_cost": new_appointment.estimated_cost,
            "insurance_covered": new_appointment.insurance_covered or False,
            "room_number": new_appointment.room_number,
            "equipment_needed": new_appointment.equipment_needed,
            "created_at": new_appointment.created_at.isoformat(),
            "updated_at": new_appointment.updated_at.isoformat() if new_appointment.updated_at else None,
            "cancelled_reason": new_appointment.cancelled_reason,
            "cancelled_at": new_appointment.cancelled_at.isoformat() if new_appointment.cancelled_at else None
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating appointment: {str(e)}")

@app.get("/api/appointments/{appointment_id}", response_model=AppointmentResponse)
async def get_appointment(appointment_id: str, db: Session = Depends(get_db)):
    """Get a specific appointment"""
    try:
        appointment = AppointmentService.get_appointment_by_id(db, appointment_id)
        if not appointment:
            raise HTTPException(status_code=404, detail="Appointment not found")
        
        patient_name = f"{appointment.patient.first_name} {appointment.patient.paternal_surname}" if appointment.patient else "Unknown"
        doctor_name = appointment.doctor.full_name if appointment.doctor else appointment.doctor_name or "Not assigned"
        
        return {
            "id": appointment.id,
            "patient_id": appointment.patient_id,
            "patient_name": patient_name,
            "doctor_id": appointment.doctor_id,
            "doctor_name": doctor_name,
            "appointment_date": appointment.appointment_date.isoformat(),
            "end_time": appointment.end_time.isoformat() if appointment.end_time else None,
            "duration_minutes": appointment.duration_minutes,
            "appointment_type": appointment.appointment_type,
            "status": appointment.status,
            "priority": appointment.priority or "normal",
            "reason": appointment.reason,
            "notes": appointment.notes,
            "preparation_instructions": appointment.preparation_instructions,
            "reminder_sent": appointment.reminder_sent or False,
            "confirmation_required": appointment.confirmation_required or False,
            "confirmed_at": appointment.confirmed_at.isoformat() if appointment.confirmed_at else None,
            "estimated_cost": appointment.estimated_cost,
            "insurance_covered": appointment.insurance_covered or False,
            "room_number": appointment.room_number,
            "equipment_needed": appointment.equipment_needed,
            "created_at": appointment.created_at.isoformat(),
            "updated_at": appointment.updated_at.isoformat() if appointment.updated_at else None,
            "cancelled_reason": appointment.cancelled_reason,
            "cancelled_at": appointment.cancelled_at.isoformat() if appointment.cancelled_at else None
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching appointment: {str(e)}")

@app.put("/api/appointments/{appointment_id}", response_model=AppointmentResponse)
async def update_appointment_new(appointment_id: str, appointment: AppointmentUpdate, db: Session = Depends(get_db)):
    """Update an existing appointment"""
    try:
        update_data = appointment.dict(exclude_unset=True)
        update_data["updated_at"] = datetime.utcnow()
        
        updated_appointment = AppointmentService.update_appointment(db, appointment_id, update_data)
        if not updated_appointment:
            raise HTTPException(status_code=404, detail="Appointment not found")
        
        patient_name = f"{updated_appointment.patient.first_name} {updated_appointment.patient.paternal_surname}" if updated_appointment.patient else "Unknown"
        doctor_name = updated_appointment.doctor.full_name if updated_appointment.doctor else updated_appointment.doctor_name or "Not assigned"
        
        return {
            "id": updated_appointment.id,
            "patient_id": updated_appointment.patient_id,
            "patient_name": patient_name,
            "doctor_id": updated_appointment.doctor_id,
            "doctor_name": doctor_name,
            "appointment_date": updated_appointment.appointment_date.isoformat(),
            "end_time": updated_appointment.end_time.isoformat() if updated_appointment.end_time else None,
            "duration_minutes": updated_appointment.duration_minutes,
            "appointment_type": updated_appointment.appointment_type,
            "status": updated_appointment.status,
            "priority": updated_appointment.priority or "normal",
            "reason": updated_appointment.reason,
            "notes": updated_appointment.notes,
            "preparation_instructions": updated_appointment.preparation_instructions,
            "reminder_sent": updated_appointment.reminder_sent or False,
            "confirmation_required": updated_appointment.confirmation_required or False,
            "confirmed_at": updated_appointment.confirmed_at.isoformat() if updated_appointment.confirmed_at else None,
            "estimated_cost": updated_appointment.estimated_cost,
            "insurance_covered": updated_appointment.insurance_covered or False,
            "room_number": updated_appointment.room_number,
            "equipment_needed": updated_appointment.equipment_needed,
            "created_at": updated_appointment.created_at.isoformat(),
            "updated_at": updated_appointment.updated_at.isoformat() if updated_appointment.updated_at else None,
            "cancelled_reason": updated_appointment.cancelled_reason,
            "cancelled_at": updated_appointment.cancelled_at.isoformat() if updated_appointment.cancelled_at else None
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating appointment: {str(e)}")

@app.delete("/api/appointments/{appointment_id}")
async def delete_appointment_new(appointment_id: str, cancelled_reason: Optional[str] = None, db: Session = Depends(get_db)):
    """Cancel an appointment"""
    try:
        # Update with cancellation info
        cancel_data = {
            "status": "cancelled",
            "cancelled_reason": cancelled_reason or "Cancelled by user",
            "cancelled_at": datetime.utcnow()
        }
        
        success = AppointmentService.update_appointment(db, appointment_id, cancel_data)
        if not success:
            raise HTTPException(status_code=404, detail="Appointment not found")
        
        return {"message": "Appointment cancelled successfully", "id": appointment_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error cancelling appointment: {str(e)}")

@app.get("/api/schedule/available-slots")
async def get_available_slots_new(
    target_date: Optional[str] = None,
    doctor_id: Optional[str] = None,
    slot_duration: int = 30,
    db: Session = Depends(get_db)
):
    """Get available time slots for appointments"""
    try:
        # Parse target date or use today
        if target_date:
            target_date_obj = datetime.fromisoformat(target_date).date()
        else:
            target_date_obj = date.today()
        
        slots = AppointmentService.get_available_time_slots(
            db, target_date_obj, doctor_id, slot_duration
        )
        
        return {
            "date": target_date_obj.isoformat(),
            "slots": [
                {
                    "time": slot["time"],
                    "available": slot["available"],
                    "appointment_id": slot["appointment_id"],
                    "patient_name": slot["patient_name"],
                    "reason": slot["reason"]
                }
                for slot in slots
            ],
            "total_slots": len(slots),
            "available_slots": len([s for s in slots if s["available"]])
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching available slots: {str(e)}")

@app.get("/api/schedule/doctor/{doctor_id}")
async def get_doctor_schedule(
    doctor_id: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get doctor's schedule for a date range"""
    try:
        # Default to current week if no dates provided
        if not start_date:
            today = date.today()
            start_date_obj = today - timedelta(days=today.weekday())
        else:
            start_date_obj = datetime.fromisoformat(start_date).date()
        
        if not end_date:
            end_date_obj = start_date_obj + timedelta(days=6)
        else:
            end_date_obj = datetime.fromisoformat(end_date).date()
        
        schedule = AppointmentService.get_doctor_schedule(db, doctor_id, start_date_obj, end_date_obj)
        
        return {
            "doctor_id": doctor_id,
            "start_date": start_date_obj.isoformat(),
            "end_date": end_date_obj.isoformat(),
            "schedule": schedule
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching doctor schedule: {str(e)}")

@app.get("/api/appointments/stats")
async def get_appointment_stats(doctor_id: Optional[str] = None, db: Session = Depends(get_db)):
    """Get appointment statistics"""
    try:
        stats = AppointmentService.get_appointment_stats(db, doctor_id)
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching appointment stats: {str(e)}")

# ============================================================================
# MAIN APPLICATION
# ============================================================================

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
