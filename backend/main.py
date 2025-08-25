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
    birth_date: datetime
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

class PatientUpdate(PatientBase):
    pass

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
    birth_date: datetime
    
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
    medical_school: Optional[str] = None
    internship_hospital: Optional[str] = None
    residency_hospital: Optional[str] = None
    
    # Certifications (Arrays for multiple values)
    board_certifications: Optional[List[str]] = None
    professional_memberships: Optional[List[str]] = None
    
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
    medical_school: Optional[str] = None
    internship_hospital: Optional[str] = None
    residency_hospital: Optional[str] = None
    board_certifications: Optional[List[str]] = None
    professional_memberships: Optional[List[str]] = None
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
        "medical_school": profile.medical_school or "",
        "internship_hospital": profile.internship_hospital or "",
        "residency_hospital": profile.residency_hospital or "",
        "board_certifications": profile.board_certifications or [],
        "professional_memberships": profile.professional_memberships or [],
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
        if isinstance(profile_data.get("board_certifications"), str):
            profile_data["board_certifications"] = [cert.strip() for cert in profile_data["board_certifications"].split(",") if cert.strip()]
        if isinstance(profile_data.get("professional_memberships"), str):
            profile_data["professional_memberships"] = [member.strip() for member in profile_data["professional_memberships"].split(",") if member.strip()]
        
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
        if isinstance(profile_data.get("board_certifications"), str):
            profile_data["board_certifications"] = [cert.strip() for cert in profile_data["board_certifications"].split(",") if cert.strip()]
        if isinstance(profile_data.get("professional_memberships"), str):
            profile_data["professional_memberships"] = [member.strip() for member in profile_data["professional_memberships"].split(",") if member.strip()]
        
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
# MAIN APPLICATION
# ============================================================================

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
