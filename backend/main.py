"""
Historias Clínicas API - Backend with PostgreSQL
Sistema de gestión de historias clínicas médicas conforme a NOM-004
"""
from fastapi import FastAPI, HTTPException, UploadFile, File, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime, date, timedelta
from enum import Enum
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
    ClinicalStudyService, get_dashboard_data
)

# ============================================================================
# FASTAPI APP CONFIGURATION
# ============================================================================

app = FastAPI(title="Historias Clínicas API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database on startup
@app.on_event("startup")
async def startup_event():
    """Initialize database tables"""
    print("🚀 Starting Historias Clínicas API...")
    init_db()
    print("✅ Database initialized successfully")

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
    created_by: Optional[str] = None

class PatientResponse(PatientBase):
    id: str
    full_name: str
    is_active: bool
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
    date: datetime
    
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
    primary_diagnosis_cie10: Optional[str] = None
    secondary_diagnoses: Optional[str] = None
    secondary_diagnoses_cie10: Optional[str] = None
    differential_diagnosis: Optional[str] = None
    
    # Treatment
    treatment_plan: str
    prescribed_medications: Optional[str] = None
    follow_up_instructions: str
    
    # Doctor Information (auto-filled from profile)
    doctor_name: str
    doctor_professional_license: str
    doctor_specialty: Optional[str] = None
    
    # System fields
    created_by: str

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
    """API Health check with database connectivity"""
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

@app.get("/api/physicians/dashboard")
async def dashboard(db: Session = Depends(get_db)):
    """Get dashboard data from PostgreSQL"""
    dashboard_data = get_dashboard_data(db)
    return dashboard_data

# ============================================================================
# PATIENT ENDPOINTS - Essential only
# ============================================================================

@app.get("/api/patients", response_model=List[PatientResponse])
async def get_patients(search: Optional[str] = None, limit: int = 100, offset: int = 0, db: Session = Depends(get_db)):
    """Get all patients with optional search and pagination from PostgreSQL"""
    try:
        patients = PatientService.get_patients(db, search or "", offset, limit)
        
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
                "created_at": patient.created_at.isoformat() if patient.created_at else "",
                "updated_at": patient.updated_at.isoformat() if patient.updated_at else None,
                "created_by": patient.created_by or ""
            }
            patient_responses.append(PatientResponse(**patient_dict))
        
        return patient_responses
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching patients: {str(e)}")

@app.post("/api/patients", response_model=PatientResponse)
async def create_patient(patient: PatientCreate, db: Session = Depends(get_db)):
    """Create a new patient"""
    try:
        patient_data = patient.dict()
        patient_data["created_at"] = datetime.utcnow()
        
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
async def get_doctor_profile(db: Session = Depends(get_db)):
    """Get the current doctor's profile"""
    profile = DoctorService.get_profile(db)
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
        profile_data = profile.dict()
        # board_certifications and professional_memberships processing removed per user request
        
        profile_data["created_at"] = datetime.utcnow()
        
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
            "medical_school": new_profile.medical_school or "",
            "internship_hospital": new_profile.internship_hospital or "",
            "residency_hospital": new_profile.residency_hospital or "",
            "board_certifications": new_profile.board_certifications or [],
            "professional_memberships": new_profile.professional_memberships or [],
            "digital_signature": new_profile.digital_signature,
            "professional_seal": new_profile.professional_seal,
            "full_name": new_profile.full_name,
            "is_active": new_profile.is_active,
            "created_at": new_profile.created_at.isoformat() if new_profile.created_at else "",
            "updated_at": new_profile.updated_at.isoformat() if new_profile.updated_at else None,
            "created_by": new_profile.created_by or ""
        }
        
        return DoctorProfileResponse(**profile_dict)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating doctor profile: {str(e)}")

@app.put("/api/doctor/profile", response_model=DoctorProfileResponse)
async def update_doctor_profile(profile: DoctorProfileUpdate, db: Session = Depends(get_db)):
    """Update the current doctor's profile with NOM-004 compliance validation"""
    try:
        # Get the existing profile
        existing_profile = DoctorService.get_profile(db)
        if not existing_profile:
            raise HTTPException(status_code=404, detail="Perfil del médico no encontrado")
        
        # Prepare update data
        profile_data = profile.dict(exclude_unset=True)
        
        # Handle array/string conversion for certifications and memberships
        # board_certifications and professional_memberships processing removed per user request
        
        profile_data["updated_at"] = datetime.utcnow()
        
        # Update the profile
        updated_profile = DoctorService.update_profile(db, existing_profile.id, profile_data)
        
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
            "medical_school": updated_profile.medical_school or "",
            "internship_hospital": updated_profile.internship_hospital or "",
            "residency_hospital": updated_profile.residency_hospital or "",
            "board_certifications": updated_profile.board_certifications or [],
            "professional_memberships": updated_profile.professional_memberships or [],
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
async def get_consultations(patient_search: Optional[str] = None, db: Session = Depends(get_db)):
    """Get all consultations with optional patient search"""
    try:
        consultations = ConsultationService.get_consultations(db, patient_search or "")
        
        consultation_responses = []
        for consultation_dict in consultations:
            if '_sa_instance_state' in consultation_dict:
                del consultation_dict['_sa_instance_state']
                
            consultation_response = {
                "id": consultation_dict.get("id", ""),
                "patient_id": consultation_dict.get("patient_id", ""),
                "date": consultation_dict.get("date").isoformat() if consultation_dict.get("date") else "",
                "chief_complaint": consultation_dict.get("chief_complaint", ""),
                "history_present_illness": consultation_dict.get("history_present_illness", ""),
                "family_history": consultation_dict.get("family_history", ""),
                "personal_pathological_history": consultation_dict.get("personal_pathological_history", ""),
                "personal_non_pathological_history": consultation_dict.get("personal_non_pathological_history", ""),
                "physical_examination": consultation_dict.get("physical_examination", ""),
                "primary_diagnosis": consultation_dict.get("primary_diagnosis", ""),
                "primary_diagnosis_cie10": consultation_dict.get("primary_diagnosis_cie10", ""),
                "secondary_diagnoses": consultation_dict.get("secondary_diagnoses", ""),
                "secondary_diagnoses_cie10": consultation_dict.get("secondary_diagnoses_cie10", ""),
                "differential_diagnosis": consultation_dict.get("differential_diagnosis", ""),
                "treatment_plan": consultation_dict.get("treatment_plan", ""),
                "prescribed_medications": consultation_dict.get("prescribed_medications", ""),
                "follow_up_instructions": consultation_dict.get("follow_up_instructions", ""),
                "doctor_name": consultation_dict.get("doctor_name", ""),
                "doctor_professional_license": consultation_dict.get("doctor_professional_license", ""),
                "doctor_specialty": consultation_dict.get("doctor_specialty", ""),
                "patient_name": consultation_dict.get("patient_name", ""),
                "created_at": consultation_dict.get("created_at").isoformat() if consultation_dict.get("created_at") else "",
                "updated_at": consultation_dict.get("updated_at").isoformat() if consultation_dict.get("updated_at") else None,
                "created_by": consultation_dict.get("created_by", "")
            }
            consultation_responses.append(ConsultationResponse(**consultation_response))
        
        return consultation_responses
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching consultations: {str(e)}")

@app.post("/api/consultations", response_model=ConsultationResponse)
async def create_consultation(consultation: MedicalHistoryCreate, db: Session = Depends(get_db)):
    """Create a new consultation"""
    try:
        consultation_data = consultation.dict()
        consultation_data["created_at"] = datetime.utcnow()
        
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
            "primary_diagnosis_cie10": new_consultation.primary_diagnosis_cie10 or "",
            "secondary_diagnoses": new_consultation.secondary_diagnoses or "",
            "secondary_diagnoses_cie10": new_consultation.secondary_diagnoses_cie10 or "",
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
        
        # Get appointments for the day
        appointments = ConsultationService.get_consultations_by_date(db, target_date_obj)
        
        agenda_items = []
        for consultation in appointments:
            agenda_items.append({
                "id": consultation.id,
                "patient_id": consultation.patient_id,
                "patient_name": consultation.patient_name or "Paciente sin nombre",
                "date_time": consultation.date.isoformat() if consultation.date else "",
                "appointment_type": "consulta",
                "reason": consultation.chief_complaint or "Consulta general",
                "notes": consultation.history_present_illness or "",
                "duration_minutes": 30,  # Default duration
                "status": "programada"
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
async def create_appointment(appointment_data: dict, db: Session = Depends(get_db)):
    """Create a new appointment in the agenda"""
    try:
        from datetime import datetime
        
        # Create consultation from appointment data
        consultation_data = {
            "patient_id": appointment_data.get("patient_id"),
            "date": datetime.fromisoformat(appointment_data.get("date_time")),
            "chief_complaint": appointment_data.get("reason", "Cita programada"),
            "history_present_illness": appointment_data.get("notes", ""),
            # Campos obligatorios con valores por defecto para citas de agenda
            "family_history": "Pendiente de evaluación en consulta",
            "personal_pathological_history": "Pendiente de evaluación en consulta",
            "personal_non_pathological_history": "Pendiente de evaluación en consulta",
            "physical_examination": "Pendiente de evaluación en consulta",
            "primary_diagnosis": "Pendiente de evaluación médica",
            "treatment_plan": "A determinar durante la consulta",
            "follow_up_instructions": "Pendiente de definir en consulta",
            "doctor_name": "Sistema de Agenda - Médico Asignado",
            "doctor_professional_license": "AGENDA-SYSTEM-001",
            "created_by": "Sistema de Agenda",
            "created_at": datetime.utcnow()
        }
        
        new_consultation = ConsultationService.create_consultation(db, consultation_data)
        
        return {
            "id": new_consultation.id,
            "patient_id": new_consultation.patient_id,
            "date_time": new_consultation.date.isoformat() if new_consultation.date else "",
            "reason": new_consultation.chief_complaint,
            "status": "programada",
            "created_at": new_consultation.created_at.isoformat() if new_consultation.created_at else ""
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating appointment: {str(e)}")

@app.put("/api/agenda/appointments/{appointment_id}")
async def update_appointment(appointment_id: str, appointment_data: dict, db: Session = Depends(get_db)):
    """Update an existing appointment"""
    try:
        from datetime import datetime
        
        # Update consultation (appointments are stored as consultations)
        update_data = {
            "date": datetime.fromisoformat(appointment_data.get("date_time")) if appointment_data.get("date_time") else None,
            "chief_complaint": appointment_data.get("reason"),
            "history_present_illness": appointment_data.get("notes"),
            "updated_at": datetime.utcnow()
        }
        
        # Remove None values
        update_data = {k: v for k, v in update_data.items() if v is not None}
        
        updated_consultation = ConsultationService.update_consultation(db, appointment_id, update_data)
        
        if not updated_consultation:
            raise HTTPException(status_code=404, detail="Appointment not found")
        
        return {
            "id": updated_consultation.id,
            "patient_id": updated_consultation.patient_id,
            "date_time": updated_consultation.date.isoformat() if updated_consultation.date else "",
            "reason": updated_consultation.chief_complaint,
            "status": "actualizada"
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
# MAIN APPLICATION
# ============================================================================

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
