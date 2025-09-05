"""
Historias Clínicas API - Backend with PostgreSQL
Sistema de gestión de historias clínicas médicas conforme a NOM-004
"""
from fastapi import FastAPI, HTTPException, UploadFile, File, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, EmailStr, ValidationError, field_validator
from typing import List, Optional, Dict, Any, Union
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
    MedicalOrder as DBMedicalOrder,
    ClinicalStudy as DBClinicalStudy,
    Appointment as DBAppointment
)
from models.schedule import (
    ScheduleTemplate as DBScheduleTemplate,
    ScheduleException as DBScheduleException,
    ScheduleSlot as DBScheduleSlot,
    ScheduleTemplateCreate,
    ScheduleTemplateUpdate,
    ScheduleTemplate,
    ScheduleExceptionCreate,
    ScheduleException,
    WeeklySchedule,
    AvailableSlot,
    DaySchedule
)
from db_service import (
    PatientService, DoctorService, ConsultationService, MedicalOrderService, 
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
    """Get current datetime in Mexico City timezone with year correction"""
    current_time = datetime.now(MEXICO_CITY_TZ)
    # Temporary fix: If system reports 2025, correct it to 2024
    if current_time.year == 2025:
        current_time = current_time.replace(year=2024)
    return current_time

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
    postal_code: Optional[Union[str, int]] = None
    country: str = "México"
    phone: Optional[Union[str, int]] = None
    email: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[Union[str, int]] = None
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

    @field_validator('phone', 'postal_code', 'emergency_contact_phone')
    @classmethod
    def validate_numeric_fields(cls, v):
        """Convert integer values to strings for phone and postal code fields"""
        if v is not None:
            return str(v)
        return v

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
    phone: Optional[Union[str, int]] = None
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[Union[str, int]] = None
    country: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[Union[str, int]] = None
    emergency_contact_relationship: Optional[str] = None
    insurance_provider: Optional[str] = None
    insurance_number: Optional[str] = None
    blood_type: Optional[str] = None
    allergies: Optional[str] = None
    chronic_conditions: Optional[str] = None
    current_medications: Optional[str] = None
    status: Optional[str] = None  # 'active' or 'inactive'
    created_by: Optional[str] = None

    @field_validator('phone', 'postal_code', 'emergency_contact_phone')
    @classmethod
    def validate_numeric_fields(cls, v):
        """Convert integer values to strings for phone and postal code fields"""
        if v is not None:
            return str(v)
        return v

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
    
    # Legal Identification (NOM-024 Required)
    curp: str  # CURP - Obligatorio según NOM-024
    rfc: Optional[str] = None  # RFC - Opcional para fines fiscales
    
    # Professional Information (NOM-004 Required)
    professional_license: str
    specialty: str
    specialty_license: Optional[str] = None
    university: str
    graduation_year: Union[str, int]
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

    @field_validator('graduation_year')
    @classmethod
    def validate_graduation_year(cls, v):
        """Convert integer graduation year to string"""
        if v is not None:
            return str(v)
        return v
    
    @field_validator('phone', 'postal_code', 'emergency_contact_phone')
    @classmethod
    def validate_numeric_fields(cls, v):
        """Convert integer values to strings for phone and postal code fields"""
        if v is not None:
            return str(v)
        return v

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
    curp: Optional[str] = None
    rfc: Optional[str] = None
    professional_license: Optional[str] = None
    specialty: Optional[str] = None
    specialty_license: Optional[str] = None
    university: Optional[str] = None
    graduation_year: Optional[Union[str, int]] = None
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
# MEDICAL ORDERS TYPES - Órdenes Médicas
# ============================================================================

class MedicalOrderBase(BaseModel):
    consultation_id: str
    patient_id: str
    
    # Order information
    order_type: str = "diagnostic_study"  # diagnostic_study, consultation, procedure
    study_type: str  # laboratory, radiology, pathology, cardiology, etc.
    study_name: str
    study_description: Optional[str] = None
    
    # Clinical information (NOM-004 required)
    clinical_indication: str  # Indicación clínica
    provisional_diagnosis: Optional[str] = None  # Diagnóstico provisional
    diagnosis_cie10: Optional[str] = None  # Código CIE-10
    relevant_clinical_data: Optional[str] = None  # Datos clínicos relevantes
    
    # Doctor information (auto-filled from session)
    ordering_doctor_name: Optional[str] = None
    ordering_doctor_license: Optional[str] = None
    ordering_doctor_specialty: Optional[str] = None
    
    # Order details
    priority: str = "normal"  # normal, urgent, stat
    requires_preparation: bool = False
    preparation_instructions: Optional[str] = None  # Ayuno, medicamentos, etc.
    
    # Additional information
    estimated_cost: Optional[str] = None  # Costo estimado como string
    special_instructions: Optional[str] = None  # Instrucciones especiales
    valid_until_date: Optional[datetime] = None  # Vigencia de la orden
    
    # System fields (auto-filled by backend)
    created_by: Optional[str] = None

class MedicalOrderCreate(MedicalOrderBase):
    pass

class MedicalOrderUpdate(BaseModel):
    status: Optional[str] = None
    special_instructions: Optional[str] = None
    estimated_cost: Optional[str] = None

class MedicalOrderResponse(MedicalOrderBase):
    id: str
    order_date: str
    status: str  # pending, printed, cancelled
    patient_name: Optional[str] = None
    created_at: str
    updated_at: Optional[str] = None

# ============================================================================
# CLINICAL STUDIES TYPES - Estudios Clínicos
# ============================================================================

class ClinicalStudyBase(BaseModel):
    consultation_id: str
    patient_id: str
    
    # Study information
    study_type: str  # laboratory, radiology, etc.
    study_name: str
    study_description: Optional[str] = None
    ordered_date: datetime
    performed_date: Optional[datetime] = None
    results_date: Optional[datetime] = None
    status: str = "pending"  # pending, in_progress, completed, cancelled
    
    # Results and files
    results_text: Optional[str] = None
    interpretation: Optional[str] = None
    file_path: Optional[str] = None
    file_name: Optional[str] = None
    file_type: Optional[str] = None
    file_size: Optional[int] = None
    
    # Medical information
    ordering_doctor: str
    performing_doctor: Optional[str] = None
    institution: Optional[str] = None
    urgency: Optional[str] = "normal"  # normal, urgent, stat
    clinical_indication: Optional[str] = None
    relevant_history: Optional[str] = None
    
    # System fields
    created_by: Optional[str] = None
    updated_by: Optional[str] = None

class ClinicalStudyCreate(ClinicalStudyBase):
    pass

class ClinicalStudyUpdate(BaseModel):
    study_name: Optional[str] = None
    study_description: Optional[str] = None
    performed_date: Optional[datetime] = None
    results_date: Optional[datetime] = None
    status: Optional[str] = None
    results_text: Optional[str] = None
    interpretation: Optional[str] = None
    file_path: Optional[str] = None
    file_name: Optional[str] = None
    file_type: Optional[str] = None
    file_size: Optional[int] = None
    performing_doctor: Optional[str] = None
    institution: Optional[str] = None
    urgency: Optional[str] = None
    clinical_indication: Optional[str] = None
    relevant_history: Optional[str] = None
    updated_by: Optional[str] = None

class ClinicalStudyResponse(ClinicalStudyBase):
    id: str
    created_at: str
    updated_at: Optional[str] = None
    patient_name: Optional[str] = None

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
        "curp": profile.curp,
        "rfc": profile.rfc or "",
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
            "curp": new_profile.curp,
            "rfc": new_profile.rfc or "",
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
            "curp": updated_profile.curp,
            "rfc": updated_profile.rfc or "",
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
# CLINICAL STUDIES ENDPOINTS - Estudios Clínicos
# ============================================================================

@app.post("/api/clinical-studies", response_model=ClinicalStudyResponse)
async def create_clinical_study(
    study: ClinicalStudyCreate, 
    db: Session = Depends(get_db),
    current_doctor: DBDoctorProfile = Depends(get_current_doctor_optional)
):
    """Create a new clinical study"""
    try:
        study_data = study.dict()
        # Use Mexico City timezone for created_at
        study_data["created_at"] = get_mexico_city_now()
        
        # Set created_by from current doctor
        if current_doctor:
            study_data["created_by"] = current_doctor.id
        
        new_study = ClinicalStudyService.create_study(db, study_data)
        
        # Get patient name for response
        patient = PatientService.get_patient(db, new_study.patient_id)
        patient_name = f"{patient.first_name} {patient.paternal_surname} {patient.maternal_surname or ''}".strip() if patient else ""
        
        study_response = {
            "id": new_study.id,
            "consultation_id": new_study.consultation_id,
            "patient_id": new_study.patient_id,
            "study_type": new_study.study_type,
            "study_name": new_study.study_name,
            "study_description": new_study.study_description or "",
            "ordered_date": new_study.ordered_date,
            "performed_date": new_study.performed_date,
            "results_date": new_study.results_date,
            "status": new_study.status,
            "results_text": new_study.results_text or "",
            "interpretation": new_study.interpretation or "",
            "file_path": new_study.file_path,
            "file_name": new_study.file_name,
            "file_type": new_study.file_type,
            "file_size": new_study.file_size,
            "ordering_doctor": new_study.ordering_doctor,
            "performing_doctor": new_study.performing_doctor,
            "institution": new_study.institution,
            "urgency": new_study.urgency or "normal",
            "clinical_indication": new_study.clinical_indication or "",
            "relevant_history": new_study.relevant_history or "",
            "created_by": new_study.created_by,
            "updated_by": new_study.updated_by,
            "patient_name": patient_name,
            "created_at": new_study.created_at.isoformat() if new_study.created_at else "",
            "updated_at": new_study.updated_at.isoformat() if new_study.updated_at else None
        }
        
        return ClinicalStudyResponse(**study_response)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating clinical study: {str(e)}")

@app.get("/api/clinical-studies/consultation/{consultation_id}", response_model=List[ClinicalStudyResponse])
async def get_studies_by_consultation(
    consultation_id: str,
    db: Session = Depends(get_db),
    current_doctor: DBDoctorProfile = Depends(get_current_doctor_optional)
):
    """Get all clinical studies for a consultation"""
    try:
        studies = ClinicalStudyService.get_studies_by_consultation(db, consultation_id)
        
        result = []
        for study in studies:
            # Get patient name
            patient = PatientService.get_patient(db, study.patient_id)
            patient_name = f"{patient.first_name} {patient.paternal_surname} {patient.maternal_surname or ''}".strip() if patient else ""
            
            study_response = {
                "id": study.id,
                "consultation_id": study.consultation_id,
                "patient_id": study.patient_id,
                "study_type": study.study_type,
                "study_name": study.study_name,
                "study_description": study.study_description or "",
                "ordered_date": study.ordered_date,
                "performed_date": study.performed_date,
                "results_date": study.results_date,
                "status": study.status,
                "results_text": study.results_text or "",
                "interpretation": study.interpretation or "",
                "file_path": study.file_path,
                "file_name": study.file_name,
                "file_type": study.file_type,
                "file_size": study.file_size,
                "ordering_doctor": study.ordering_doctor,
                "performing_doctor": study.performing_doctor,
                "institution": study.institution,
                "urgency": study.urgency or "normal",
                "clinical_indication": study.clinical_indication or "",
                "relevant_history": study.relevant_history or "",
                "created_by": study.created_by,
                "updated_by": study.updated_by,
                "patient_name": patient_name,
                "created_at": study.created_at.isoformat() if study.created_at else "",
                "updated_at": study.updated_at.isoformat() if study.updated_at else None
            }
            result.append(ClinicalStudyResponse(**study_response))
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching clinical studies: {str(e)}")

@app.get("/api/clinical-studies/patient/{patient_id}", response_model=List[ClinicalStudyResponse])
async def get_studies_by_patient(
    patient_id: str,
    db: Session = Depends(get_db),
    current_doctor: DBDoctorProfile = Depends(get_current_doctor_optional)
):
    """Get all clinical studies for a patient"""
    try:
        studies = ClinicalStudyService.get_studies_by_patient(db, patient_id)
        
        result = []
        for study in studies:
            # Get patient name
            patient = PatientService.get_patient(db, study.patient_id)
            patient_name = f"{patient.first_name} {patient.paternal_surname} {patient.maternal_surname or ''}".strip() if patient else ""
            
            study_response = {
                "id": study.id,
                "consultation_id": study.consultation_id,
                "patient_id": study.patient_id,
                "study_type": study.study_type,
                "study_name": study.study_name,
                "study_description": study.study_description or "",
                "ordered_date": study.ordered_date,
                "performed_date": study.performed_date,
                "results_date": study.results_date,
                "status": study.status,
                "results_text": study.results_text or "",
                "interpretation": study.interpretation or "",
                "file_path": study.file_path,
                "file_name": study.file_name,
                "file_type": study.file_type,
                "file_size": study.file_size,
                "ordering_doctor": study.ordering_doctor,
                "performing_doctor": study.performing_doctor,
                "institution": study.institution,
                "urgency": study.urgency or "normal",
                "clinical_indication": study.clinical_indication or "",
                "relevant_history": study.relevant_history or "",
                "created_by": study.created_by,
                "updated_by": study.updated_by,
                "patient_name": patient_name,
                "created_at": study.created_at.isoformat() if study.created_at else "",
                "updated_at": study.updated_at.isoformat() if study.updated_at else None
            }
            result.append(ClinicalStudyResponse(**study_response))
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching patient clinical studies: {str(e)}")

@app.put("/api/clinical-studies/{study_id}", response_model=ClinicalStudyResponse)
async def update_clinical_study(
    study_id: str,
    study_update: ClinicalStudyUpdate,
    db: Session = Depends(get_db),
    current_doctor: DBDoctorProfile = Depends(get_current_doctor_optional)
):
    """Update a clinical study"""
    try:
        # Get existing study
        existing_study = db.query(DBClinicalStudy).filter(DBClinicalStudy.id == study_id).first()
        if not existing_study:
            raise HTTPException(status_code=404, detail="Clinical study not found")
        
        # Update fields
        update_data = study_update.dict(exclude_unset=True)
        if current_doctor:
            update_data["updated_by"] = current_doctor.id
        
        updated_study = ClinicalStudyService.update_study(db, study_id, update_data)
        
        # Get patient name for response
        patient = PatientService.get_patient(db, updated_study.patient_id)
        patient_name = f"{patient.first_name} {patient.paternal_surname} {patient.maternal_surname or ''}".strip() if patient else ""
        
        study_response = {
            "id": updated_study.id,
            "consultation_id": updated_study.consultation_id,
            "patient_id": updated_study.patient_id,
            "study_type": updated_study.study_type,
            "study_name": updated_study.study_name,
            "study_description": updated_study.study_description or "",
            "ordered_date": updated_study.ordered_date,
            "performed_date": updated_study.performed_date,
            "results_date": updated_study.results_date,
            "status": updated_study.status,
            "results_text": updated_study.results_text or "",
            "interpretation": updated_study.interpretation or "",
            "file_path": updated_study.file_path,
            "file_name": updated_study.file_name,
            "file_type": updated_study.file_type,
            "file_size": updated_study.file_size,
            "ordering_doctor": updated_study.ordering_doctor,
            "performing_doctor": updated_study.performing_doctor,
            "institution": updated_study.institution,
            "urgency": updated_study.urgency or "normal",
            "clinical_indication": updated_study.clinical_indication or "",
            "relevant_history": updated_study.relevant_history or "",
            "created_by": updated_study.created_by,
            "updated_by": updated_study.updated_by,
            "patient_name": patient_name,
            "created_at": updated_study.created_at.isoformat() if updated_study.created_at else "",
            "updated_at": updated_study.updated_at.isoformat() if updated_study.updated_at else None
        }
        
        return ClinicalStudyResponse(**study_response)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating clinical study: {str(e)}")

@app.delete("/api/clinical-studies/{study_id}")
async def delete_clinical_study(
    study_id: str,
    db: Session = Depends(get_db),
    current_doctor: DBDoctorProfile = Depends(get_current_doctor_optional)
):
    """Delete a clinical study"""
    try:
        existing_study = db.query(DBClinicalStudy).filter(DBClinicalStudy.id == study_id).first()
        if not existing_study:
            raise HTTPException(status_code=404, detail="Clinical study not found")
        
        db.delete(existing_study)
        db.commit()
        
        return {"message": "Clinical study deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting clinical study: {str(e)}")

# ============================================================================
# AGENDA ENDPOINTS - Medical Scheduling
# ============================================================================

@app.get("/api/agenda/daily")
async def get_daily_agenda(target_date: Optional[str] = None, db: Session = Depends(get_db), current_doctor: DBDoctorProfile = Depends(get_current_doctor_optional)):
    """Get daily agenda - all appointments for a specific date"""
    try:
        from datetime import datetime, date
        
        # Parse target date or use today
        if target_date:
            target_date_obj = datetime.fromisoformat(target_date).date()
        else:
            target_date_obj = date.today()
        
        # Get appointments for the day using AppointmentService, filtered by doctor
        doctor_id = current_doctor.id if current_doctor else None
        appointments = AppointmentService.get_appointments(
            db, 
            start_date=target_date_obj, 
            end_date=target_date_obj,
            doctor_id=doctor_id
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
async def get_weekly_agenda(start_date: Optional[str] = None, db: Session = Depends(get_db), current_doctor: DBDoctorProfile = Depends(get_current_doctor_optional)):
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
        
        # Get appointments for the week, filtered by doctor
        doctor_id = current_doctor.id if current_doctor else None
        weekly_agenda = {}
        current_date = start_date_obj
        
        while current_date <= end_date_obj:
            day_name = current_date.strftime('%A').lower()
            # Use AppointmentService instead of ConsultationService and filter by doctor
            appointments = AppointmentService.get_appointments(
                db, 
                start_date=current_date, 
                end_date=current_date,
                doctor_id=doctor_id
            )
            
            weekly_agenda[day_name] = {
                "date": current_date.isoformat(),
                "appointments": len(appointments),
                "consultations": [
                    {
                        "id": appointment.id,
                        "patient_name": f"{appointment.patient.first_name} {appointment.patient.paternal_surname}" if appointment.patient else "Paciente",
                        "time": format_mexico_city_datetime(appointment.appointment_date).split('T')[1][:5] if appointment.appointment_date else "08:00",
                        "reason": appointment.reason or "Cita médica",
                        "status": appointment.status or "programada"
                    }
                    for appointment in appointments
                ]
            }
            current_date += timedelta(days=1)
        
        return weekly_agenda
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching weekly agenda: {str(e)}")

@app.get("/api/agenda/available-slots")
async def get_available_slots(target_date: Optional[str] = None, db: Session = Depends(get_db), current_doctor: DBDoctorProfile = Depends(get_current_doctor_optional)):
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
# MEDICAL ORDERS ENDPOINTS - Órdenes Médicas
# ============================================================================

@app.post("/api/medical-orders", response_model=MedicalOrderResponse)
async def create_medical_order(
    order: MedicalOrderCreate, 
    db: Session = Depends(get_db),
    current_doctor: DBDoctorProfile = Depends(get_current_doctor_optional)
):
    """Create a new medical order"""
    try:
        order_data = order.dict()
        
        # Auto-assign doctor information from authenticated user
        if current_doctor:
            order_data["ordering_doctor_name"] = f"{current_doctor.first_name} {current_doctor.paternal_surname}"
            order_data["ordering_doctor_license"] = current_doctor.professional_license
            order_data["ordering_doctor_specialty"] = current_doctor.specialty or "General"
            order_data["created_by"] = current_doctor.id
        else:
            # Fallback if no authenticated doctor
            order_data["ordering_doctor_name"] = "Doctor Sistema"
            order_data["ordering_doctor_license"] = "N/A"
            order_data["ordering_doctor_specialty"] = "General"
            order_data["created_by"] = "Sistema"
        
        # Basic validation - ensure required fields are present
        required_fields = ['patient_id', 'consultation_id', 'study_type', 'study_name', 'clinical_indication']
        missing_fields = []
        for field in required_fields:
            if not order_data.get(field):
                missing_fields.append(field)
        
        if missing_fields:
            raise HTTPException(
                status_code=400, 
                detail=f"Campos obligatorios faltantes: {', '.join(missing_fields)}"
            )
        
        new_order = MedicalOrderService.create_order(db, order_data)
        
        # Get patient name for response
        patient = db.query(DBPatient).filter(DBPatient.id == new_order.patient_id).first()
        patient_name = f"{patient.first_name} {patient.paternal_surname}" if patient else "Unknown"
        
        return {
            **order_data,
            "id": new_order.id,
            "order_date": new_order.order_date.isoformat(),
            "status": new_order.status,
            "patient_name": patient_name,
            "created_at": new_order.created_at.isoformat(),
            "updated_at": new_order.updated_at.isoformat() if new_order.updated_at else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating medical order: {str(e)}")

@app.get("/api/medical-orders/consultation/{consultation_id}", response_model=List[MedicalOrderResponse])
async def get_orders_by_consultation(
    consultation_id: str,
    db: Session = Depends(get_db),
    current_doctor: DBDoctorProfile = Depends(get_current_doctor_optional)
):
    """Get all medical orders for a consultation"""
    try:
        orders = MedicalOrderService.get_orders_by_consultation(db, consultation_id)
        
        result = []
        for order in orders:
            # Get patient name
            patient = db.query(DBPatient).filter(DBPatient.id == order.patient_id).first()
            patient_name = f"{patient.first_name} {patient.paternal_surname}" if patient else "Unknown"
            
            result.append({
                "id": order.id,
                "consultation_id": order.consultation_id,
                "patient_id": order.patient_id,
                "order_type": order.order_type,
                "study_type": order.study_type,
                "study_name": order.study_name,
                "study_description": order.study_description,
                "clinical_indication": order.clinical_indication,
                "provisional_diagnosis": order.provisional_diagnosis,
                "diagnosis_cie10": order.diagnosis_cie10,
                "relevant_clinical_data": order.relevant_clinical_data,
                "ordering_doctor_name": order.ordering_doctor_name,
                "ordering_doctor_license": order.ordering_doctor_license,
                "ordering_doctor_specialty": order.ordering_doctor_specialty,
                "priority": order.priority,
                "requires_preparation": order.requires_preparation,
                "preparation_instructions": order.preparation_instructions,
                "estimated_cost": order.estimated_cost,
                "special_instructions": order.special_instructions,
                "valid_until_date": order.valid_until_date.isoformat() if order.valid_until_date else None,
                "order_date": order.order_date.isoformat(),
                "status": order.status,
                "patient_name": patient_name,
                "created_at": order.created_at.isoformat(),
                "updated_at": order.updated_at.isoformat() if order.updated_at else None,
                "created_by": order.created_by
            })
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching medical orders: {str(e)}")

@app.patch("/api/medical-orders/{order_id}/status")
async def update_order_status(
    order_id: str,
    status_update: MedicalOrderUpdate,
    db: Session = Depends(get_db),
    current_doctor: DBDoctorProfile = Depends(get_current_doctor_optional)
):
    """Update medical order status"""
    try:
        if not status_update.status:
            raise HTTPException(status_code=400, detail="Status is required")
        
        # Validate status
        valid_statuses = ['pending', 'printed', 'cancelled']
        if status_update.status not in valid_statuses:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}"
            )
        
        updated_order = MedicalOrderService.update_order_status(db, order_id, status_update.status)
        
        if not updated_order:
            raise HTTPException(status_code=404, detail="Medical order not found")
        
        return {"message": "Order status updated successfully", "order_id": order_id, "new_status": status_update.status}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating order status: {str(e)}")

# ============================================================================
# INTEROPERABILITY ENDPOINTS (HL7 FHIR) - NOM-024 Compliance
# ============================================================================

from interoperability import InteroperabilityService, FHIRExporter
from encryption import get_encryption_service

@app.get("/api/fhir/Patient/{patient_id}")
async def get_fhir_patient(
    patient_id: str,
    db: Session = Depends(get_db),
    current_doctor: DBDoctorProfile = Depends(get_current_doctor_optional)
):
    """Obtener paciente en formato FHIR"""
    try:
        patient = PatientService.get_patient(db, patient_id)
        if not patient:
            raise HTTPException(status_code=404, detail="Paciente no encontrado")
        
        interop_service = InteroperabilityService()
        fhir_patient = interop_service.patient_to_fhir_patient(patient)
        
        return fhir_patient.dict()
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error obteniendo paciente FHIR: {str(e)}")

@app.get("/api/fhir/Practitioner/{doctor_id}")
async def get_fhir_practitioner(
    doctor_id: str,
    db: Session = Depends(get_db),
    current_doctor: DBDoctorProfile = Depends(get_current_doctor_optional)
):
    """Obtener médico en formato FHIR"""
    try:
        doctor = DoctorService.get_profile_by_id(db, doctor_id)
        if not doctor:
            raise HTTPException(status_code=404, detail="Médico no encontrado")
        
        interop_service = InteroperabilityService()
        fhir_practitioner = interop_service.doctor_to_fhir_practitioner(doctor)
        
        return fhir_practitioner.dict()
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error obteniendo médico FHIR: {str(e)}")

@app.get("/api/fhir/Bundle/patient-summary/{patient_id}")
async def get_patient_summary_bundle(
    patient_id: str,
    db: Session = Depends(get_db),
    current_doctor: DBDoctorProfile = Depends(get_current_doctor_optional)
):
    """Obtener resumen completo del paciente en formato FHIR Bundle"""
    try:
        # Obtener datos del paciente
        patient = PatientService.get_patient(db, patient_id)
        if not patient:
            raise HTTPException(status_code=404, detail="Paciente no encontrado")
        
        # Obtener consultas del paciente
        consultations = ConsultationService.get_consultations_by_patient(db, patient_id)
        
        # Obtener médico actual
        doctor_profile = current_doctor
        
        # Exportar como bundle FHIR
        exporter = FHIRExporter()
        bundle = exporter.export_patient_summary(patient, consultations, doctor_profile)
        
        return bundle
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generando bundle FHIR: {str(e)}")

# ============================================================================
# ENCRYPTION ENDPOINTS - NOM-035 Compliance
# ============================================================================

@app.post("/api/admin/encrypt-existing-data")
async def encrypt_existing_data(
    table_name: str,
    db: Session = Depends(get_db),
    current_doctor: DBDoctorProfile = Depends(get_current_doctor_optional)
):
    """Endpoint administrativo para cifrar datos existentes"""
    try:
        # Solo permitir a administradores
        if not current_doctor or current_doctor.id != "ADMIN":
            raise HTTPException(status_code=403, detail="Acceso denegado")
        
        encryption_service = get_encryption_service()
        
        if table_name == "patients":
            from encryption import EncryptionMigration
            EncryptionMigration.migrate_table_to_encrypted(db, Patient, encryption_service)
        elif table_name == "doctors":
            from encryption import EncryptionMigration
            EncryptionMigration.migrate_table_to_encrypted(db, DBDoctorProfile, encryption_service)
        else:
            raise HTTPException(status_code=400, detail="Tabla no válida")
        
        return {"message": f"Datos de {table_name} cifrados exitosamente"}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error cifrando datos: {str(e)}")

@app.get("/api/admin/encryption-status")
async def get_encryption_status(
    db: Session = Depends(get_db),
    current_doctor: DBDoctorProfile = Depends(get_current_doctor_optional)
):
    """Obtener estado del cifrado de datos"""
    try:
        # Verificar si hay clave de cifrado configurada
        import os
        encryption_key_configured = bool(os.getenv('MEDICAL_ENCRYPTION_KEY'))
        
        # Contar registros con datos potencialmente sensibles
        total_patients = db.query(Patient).count()
        total_doctors = db.query(DBDoctorProfile).count()
        
        return {
            "encryption_key_configured": encryption_key_configured,
            "total_patients": total_patients,
            "total_doctors": total_doctors,
            "encryption_algorithm": "AES-256-GCM",
            "key_derivation": "PBKDF2-SHA256",
            "compliance_status": "NOM-035 Partial" if encryption_key_configured else "Non-compliant"
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error obteniendo estado de cifrado: {str(e)}")

# ============================================================================
# CATALOGS ENDPOINTS - NOM-035 Compliance
# ============================================================================

@app.get("/api/catalogs/specialties")
async def get_medical_specialties():
    """Obtener catálogo de especialidades médicas según NOM-035"""
    from interoperability import NOMCatalogs
    return NOMCatalogs.MEDICAL_SPECIALTIES

@app.get("/api/catalogs/genders")
async def get_gender_codes():
    """Obtener catálogo de códigos de género según NOM-035"""
    from interoperability import NOMCatalogs
    return NOMCatalogs.GENDER_CODES

@app.get("/api/catalogs/encounter-types")
async def get_encounter_types():
    """Obtener catálogo de tipos de encuentro según NOM-035"""
    from interoperability import NOMCatalogs
    return NOMCatalogs.ENCOUNTER_TYPES

# ============================================================================
# DIGITAL SIGNATURE ENDPOINTS - NOM-004/NOM-024 Compliance
# ============================================================================

from digital_signature import (
    get_digital_signature_service,
    get_certificate_manager,
    get_medical_document_signer,
    get_signature_verification_service
)

class CertificateRequest(BaseModel):
    """Solicitud para generar certificado digital"""
    password: str
    validity_days: int = 365

class SignDocumentRequest(BaseModel):
    """Solicitud para firmar documento"""
    document_type: str  # consultation, prescription, medical_certificate
    document_data: Dict[str, Any]
    certificate_password: str

class VerifySignatureRequest(BaseModel):
    """Solicitud para verificar firma"""
    document_content: str
    signature_data: Dict[str, Any]

@app.post("/api/digital-signature/generate-certificate")
async def generate_digital_certificate(
    request: CertificateRequest,
    db: Session = Depends(get_db),
    current_doctor: DBDoctorProfile = Depends(get_current_doctor_optional)
):
    """Generar certificado digital para el médico"""
    try:
        if not current_doctor:
            raise HTTPException(status_code=401, detail="Doctor no autenticado")
        
        # Obtener servicios
        signature_service = get_digital_signature_service()
        cert_manager = get_certificate_manager()
        
        # Información del doctor para el certificado
        doctor_info = {
            "full_name": current_doctor.full_name,
            "email": current_doctor.email,
            "professional_license": current_doctor.professional_license,
            "curp": getattr(current_doctor, 'curp', ''),
            "state": getattr(current_doctor, 'office_state', 'CDMX'),
            "city": getattr(current_doctor, 'office_city', 'Ciudad de México')
        }
        
        # Generar par de claves
        private_key, public_key = signature_service.generate_key_pair()
        
        # Crear certificado autofirmado
        certificate = signature_service.create_self_signed_certificate(
            private_key, 
            doctor_info, 
            request.validity_days
        )
        
        # Almacenar certificado de forma segura
        cert_path = cert_manager.store_certificate(
            current_doctor.id,
            certificate,
            private_key,
            request.password
        )
        
        # Obtener información del certificado
        cert_info = cert_manager.get_certificate_info(current_doctor.id, request.password)
        
        return {
            "message": "Certificado digital generado exitosamente",
            "certificate_info": {
                "certificate_id": cert_info.certificate_id,
                "subject_name": cert_info.subject_name,
                "not_before": cert_info.not_before,
                "not_after": cert_info.not_after,
                "key_usage": cert_info.key_usage,
                "is_active": cert_info.is_active
            },
            "certificate_path": cert_path
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generando certificado: {str(e)}")

@app.get("/api/digital-signature/certificate-info")
async def get_certificate_info(
    db: Session = Depends(get_db),
    current_doctor: DBDoctorProfile = Depends(get_current_doctor_optional)
):
    """Obtener información del certificado digital del médico"""
    try:
        if not current_doctor:
            raise HTTPException(status_code=401, detail="Doctor no autenticado")
        
        cert_manager = get_certificate_manager()
        
        # Verificar si existe certificado
        cert_file = f"{current_doctor.id}_certificate.p12"
        cert_path = os.path.join(cert_manager.certificates_dir, cert_file)
        
        if not os.path.exists(cert_path):
            return {
                "has_certificate": False,
                "message": "No hay certificado digital configurado"
            }
        
        return {
            "has_certificate": True,
            "certificate_file": cert_file,
            "message": "Certificado digital encontrado. Use la contraseña para acceder a los detalles."
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error obteniendo información del certificado: {str(e)}")

@app.post("/api/digital-signature/sign-document")
async def sign_medical_document(
    request: SignDocumentRequest,
    db: Session = Depends(get_db),
    current_doctor: DBDoctorProfile = Depends(get_current_doctor_optional)
):
    """Firmar documento médico digitalmente"""
    try:
        if not current_doctor:
            raise HTTPException(status_code=401, detail="Doctor no autenticado")
        
        # Obtener servicios
        cert_manager = get_certificate_manager()
        document_signer = get_medical_document_signer()
        
        # Cargar certificado y clave privada
        try:
            private_key, certificate = cert_manager.load_certificate(
                current_doctor.id, 
                request.certificate_password
            )
        except FileNotFoundError:
            raise HTTPException(status_code=404, detail="Certificado digital no encontrado")
        except Exception:
            raise HTTPException(status_code=401, detail="Contraseña de certificado incorrecta")
        
        # Agregar información del doctor al documento
        document_data = request.document_data.copy()
        document_data["doctor_id"] = current_doctor.id
        document_data["doctor_name"] = current_doctor.full_name
        document_data["professional_license"] = current_doctor.professional_license
        
        # Firmar documento según su tipo
        if request.document_type == "consultation":
            signature_manifest = document_signer.sign_consultation(
                document_data, private_key, certificate
            )
        elif request.document_type == "prescription":
            signature_manifest = document_signer.sign_prescription(
                document_data, private_key, certificate
            )
        elif request.document_type == "medical_certificate":
            signature_manifest = document_signer.sign_medical_certificate(
                document_data, private_key, certificate
            )
        else:
            raise HTTPException(status_code=400, detail="Tipo de documento no válido")
        
        return {
            "message": "Documento firmado exitosamente",
            "signature_manifest": {
                "document_id": signature_manifest.document_id,
                "document_type": signature_manifest.document_type,
                "document_hash": signature_manifest.document_hash,
                "signatures": [
                    {
                        "signature_id": sig.signature_id,
                        "timestamp": sig.timestamp,
                        "algorithm": sig.algorithm,
                        "status": sig.status
                    } for sig in signature_manifest.signatures
                ],
                "creation_timestamp": signature_manifest.creation_timestamp,
                "last_signature_timestamp": signature_manifest.last_signature_timestamp
            }
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error firmando documento: {str(e)}")

@app.post("/api/digital-signature/verify-signature")
async def verify_document_signature(
    request: VerifySignatureRequest,
    db: Session = Depends(get_db),
    current_doctor: DBDoctorProfile = Depends(get_current_doctor_optional)
):
    """Verificar firma digital de un documento"""
    try:
        verification_service = get_signature_verification_service()
        
        # Crear objeto DocumentSignature desde los datos recibidos
        from digital_signature import DocumentSignature, DigitalSignature
        
        signatures = [
            DigitalSignature(
                signature_id=sig["signature_id"],
                document_hash=sig["document_hash"],
                signature_value=sig["signature_value"],
                timestamp=sig["timestamp"],
                signer_certificate=sig["signer_certificate"],
                algorithm=sig.get("algorithm", "SHA256withRSA"),
                status=sig.get("status", "valid")
            ) for sig in request.signature_data["signatures"]
        ]
        
        document_signature = DocumentSignature(
            document_id=request.signature_data["document_id"],
            document_type=request.signature_data["document_type"],
            signatures=signatures,
            document_hash=request.signature_data["document_hash"],
            creation_timestamp=request.signature_data["creation_timestamp"],
            last_signature_timestamp=request.signature_data["last_signature_timestamp"]
        )
        
        # Verificar firmas
        verification_results = verification_service.verify_document_signatures(
            request.document_content,
            document_signature
        )
        
        return {
            "message": "Verificación de firmas completada",
            "verification_results": verification_results
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error verificando firmas: {str(e)}")

@app.get("/api/digital-signature/status")
async def get_digital_signature_status(
    db: Session = Depends(get_db),
    current_doctor: DBDoctorProfile = Depends(get_current_doctor_optional)
):
    """Obtener estado general de firma digital del sistema"""
    try:
        # Contar médicos con certificados
        cert_manager = get_certificate_manager()
        total_doctors = db.query(DBDoctorProfile).count()
        
        cert_count = 0
        cert_dir = cert_manager.certificates_dir
        if os.path.exists(cert_dir):
            cert_files = [f for f in os.listdir(cert_dir) if f.endswith('_certificate.p12')]
            cert_count = len(cert_files)
        
        return {
            "digital_signature_enabled": True,
            "certificate_directory": cert_dir,
            "total_doctors": total_doctors,
            "doctors_with_certificates": cert_count,
            "certificate_coverage": f"{(cert_count/total_doctors*100):.1f}%" if total_doctors > 0 else "0%",
            "signing_algorithm": "SHA256withRSA",
            "key_size": "2048 bits",
            "certificate_standard": "X.509 v3",
            "pkcs12_format": "PKCS#12",
            "compliance_status": "NOM-004/NOM-024 Compliant"
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error obteniendo estado: {str(e)}")

# ============================================================================
# SCHEDULE ENDPOINTS - Gestión de horarios
# ============================================================================

@app.post("/api/schedule/templates", response_model=ScheduleTemplate)
async def create_schedule_template(
    template: ScheduleTemplateCreate,
    current_doctor: DoctorInfo = Depends(get_current_doctor),
    db: Session = Depends(get_db)
):
    """Crear una nueva plantilla de horario"""
    try:
        # Verificar si ya existe un horario para este día
        existing = db.query(DBScheduleTemplate).filter(
            DBScheduleTemplate.doctor_id == current_doctor.id,
            DBScheduleTemplate.day_of_week == template.day_of_week
        ).first()
        
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ya existe un horario configurado para este día de la semana"
            )
        
        db_template = DBScheduleTemplate(
            doctor_id=current_doctor.id,
            **template.dict()
        )
        
        db.add(db_template)
        db.commit()
        db.refresh(db_template)
        
        api_logger.info(f"Plantilla de horario creada para doctor {current_doctor.id}, día {template.day_of_week}")
        return db_template
        
    except Exception as e:
        db.rollback()
        api_logger.error(f"Error creando plantilla de horario: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error interno: {str(e)}")

@app.get("/api/schedule/templates", response_model=List[ScheduleTemplate])
async def get_schedule_templates(
    current_doctor: DoctorInfo = Depends(get_current_doctor),
    db: Session = Depends(get_db)
):
    """Obtener todas las plantillas de horario del médico"""
    try:
        templates = db.query(DBScheduleTemplate).filter(
            DBScheduleTemplate.doctor_id == current_doctor.id
        ).order_by(DBScheduleTemplate.day_of_week).all()
        
        return templates
        
    except Exception as e:
        api_logger.error(f"Error obteniendo plantillas de horario: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error interno: {str(e)}")

@app.get("/api/schedule/templates/weekly", response_model=WeeklySchedule)
async def get_weekly_schedule(
    current_doctor: DoctorInfo = Depends(get_current_doctor),
    db: Session = Depends(get_db)
):
    """Obtener el horario semanal completo"""
    try:
        templates = db.query(DBScheduleTemplate).filter(
            DBScheduleTemplate.doctor_id == current_doctor.id
        ).all()
        
        # Organizar por día de la semana
        weekly = {
            0: None,  # Lunes
            1: None,  # Martes
            2: None,  # Miércoles
            3: None,  # Jueves
            4: None,  # Viernes
            5: None,  # Sábado
            6: None   # Domingo
        }
        
        for template in templates:
            weekly[template.day_of_week] = template
        
        return WeeklySchedule(
            monday=weekly[0],
            tuesday=weekly[1],
            wednesday=weekly[2],
            thursday=weekly[3],
            friday=weekly[4],
            saturday=weekly[5],
            sunday=weekly[6]
        )
        
    except Exception as e:
        api_logger.error(f"Error obteniendo horario semanal: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error interno: {str(e)}")

@app.put("/api/schedule/templates/{template_id}", response_model=ScheduleTemplate)
async def update_schedule_template(
    template_id: int,
    template_update: ScheduleTemplateUpdate,
    current_doctor: DoctorInfo = Depends(get_current_doctor),
    db: Session = Depends(get_db)
):
    """Actualizar una plantilla de horario"""
    try:
        db_template = db.query(DBScheduleTemplate).filter(
            DBScheduleTemplate.id == template_id,
            DBScheduleTemplate.doctor_id == current_doctor.id
        ).first()
        
        if not db_template:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Plantilla de horario no encontrada"
            )
        
        # Actualizar campos
        update_data = template_update.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_template, field, value)
        
        db_template.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(db_template)
        
        api_logger.info(f"Plantilla de horario {template_id} actualizada")
        return db_template
        
    except Exception as e:
        db.rollback()
        api_logger.error(f"Error actualizando plantilla de horario: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error interno: {str(e)}")

@app.delete("/api/schedule/templates/{template_id}")
async def delete_schedule_template(
    template_id: int,
    current_doctor: DoctorInfo = Depends(get_current_doctor),
    db: Session = Depends(get_db)
):
    """Eliminar una plantilla de horario"""
    try:
        db_template = db.query(DBScheduleTemplate).filter(
            DBScheduleTemplate.id == template_id,
            DBScheduleTemplate.doctor_id == current_doctor.id
        ).first()
        
        if not db_template:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Plantilla de horario no encontrada"
            )
        
        db.delete(db_template)
        db.commit()
        
        api_logger.info(f"Plantilla de horario {template_id} eliminada")
        return {"message": "Plantilla de horario eliminada exitosamente"}
        
    except Exception as e:
        db.rollback()
        api_logger.error(f"Error eliminando plantilla de horario: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error interno: {str(e)}")

@app.post("/api/schedule/generate-weekly-template")
async def generate_default_weekly_template(
    current_doctor: DoctorInfo = Depends(get_current_doctor),
    db: Session = Depends(get_db)
):
    """Generar plantilla semanal por defecto (Lunes a Viernes 9:00-18:00)"""
    try:
        # Verificar si ya existen plantillas
        existing_count = db.query(DBScheduleTemplate).filter(
            DBScheduleTemplate.doctor_id == current_doctor.id
        ).count()
        
        if existing_count > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ya existen plantillas de horario configuradas"
            )
        
        # Crear plantillas para Lunes a Viernes
        from datetime import time
        for day in range(5):  # 0-4 (Lunes a Viernes)
            template = DBScheduleTemplate(
                doctor_id=current_doctor.id,
                day_of_week=day,
                start_time=time(9, 0),  # 9:00 AM
                end_time=time(18, 0),   # 6:00 PM
                consultation_duration=30,
                break_duration=0,
                lunch_start=time(13, 0),  # 1:00 PM
                lunch_end=time(14, 0),    # 2:00 PM
                is_active=True
            )
            db.add(template)
        
        db.commit()
        
        api_logger.info(f"Plantilla semanal por defecto creada para doctor {current_doctor.id}")
        return {"message": "Plantilla semanal por defecto creada exitosamente"}
        
    except Exception as e:
        db.rollback()
        api_logger.error(f"Error generando plantilla semanal: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error interno: {str(e)}")

@app.get("/api/schedule/available-slots", response_model=List[AvailableSlot])
async def get_available_slots(
    target_date: date,
    duration_minutes: int = 30,
    current_doctor: DoctorInfo = Depends(get_current_doctor),
    db: Session = Depends(get_db)
):
    """Obtener slots disponibles para una fecha específica"""
    try:
        # Obtener día de la semana (0=Lunes, 6=Domingo)
        day_of_week = target_date.weekday()
        
        # Buscar plantilla para este día
        template = db.query(DBScheduleTemplate).filter(
            DBScheduleTemplate.doctor_id == current_doctor.id,
            DBScheduleTemplate.day_of_week == day_of_week,
            DBScheduleTemplate.is_active == True
        ).first()
        
        if not template:
            return []  # No hay horario configurado para este día
        
        # Verificar excepciones para esta fecha
        exception = db.query(DBScheduleException).filter(
            DBScheduleException.doctor_id == current_doctor.id,
            DBScheduleException.exception_date == target_date
        ).first()
        
        if exception and exception.is_day_off:
            return []  # Es día libre
        
        # Generar slots disponibles
        slots = []
        current_time = datetime.combine(target_date, template.start_time)
        end_time = datetime.combine(target_date, template.end_time)
        
        # Considerar horario de almuerzo
        lunch_start = None
        lunch_end = None
        if template.lunch_start and template.lunch_end:
            lunch_start = datetime.combine(target_date, template.lunch_start)
            lunch_end = datetime.combine(target_date, template.lunch_end)
        
        while current_time + timedelta(minutes=duration_minutes) <= end_time:
            slot_end = current_time + timedelta(minutes=duration_minutes)
            
            # Verificar si el slot no interfiere con el almuerzo
            if lunch_start and lunch_end:
                if not (current_time >= lunch_end or slot_end <= lunch_start):
                    current_time += timedelta(minutes=template.consultation_duration + template.break_duration)
                    continue
            
            # TODO: Verificar que no haya citas existentes en este slot
            
            slots.append(AvailableSlot(
                date=target_date,
                start_time=current_time.time(),
                end_time=slot_end.time(),
                duration_minutes=duration_minutes,
                slot_type="consultation"
            ))
            
            current_time += timedelta(minutes=template.consultation_duration + template.break_duration)
        
        return slots
        
    except Exception as e:
        api_logger.error(f"Error obteniendo slots disponibles: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error interno: {str(e)}")

# ============================================================================
# MAIN APPLICATION
# ============================================================================

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
