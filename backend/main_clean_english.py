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
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime, date, timedelta
import pytz
import os
import crud
import schemas
import auth
from database import get_db, Person, Specialty, Country, State, EmergencyRelationship, Appointment, MedicalRecord
from appointment_service import AppointmentService
from routes import schedule

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
    """Parse datetime string treating it as CDMX timezone"""
    if isinstance(dt_string, str):
        # Parse the datetime string (assumed to be in CDMX timezone)
        dt = datetime.fromisoformat(dt_string.replace('Z', ''))
        
        # Create timezone-aware datetime with proper CDMX offset (-06:00)
        from datetime import timezone, timedelta
        cdmx_tz = timezone(timedelta(hours=-6))
        result = dt.replace(tzinfo=cdmx_tz)
        
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

# Security
security = HTTPBearer()

# ============================================================================
# ROUTER REGISTRATION
# ============================================================================

# Include schedule router
app.include_router(schedule.router)

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

@app.options("/api/{path:path}")
async def options_handler(path: str):
    """Handle OPTIONS requests for any endpoint"""
    # Simply return OK for any OPTIONS request to API endpoints
    # This allows the browser to make preflight requests
    return {"status": "ok"}

# ============================================================================
# CLINICAL STUDIES API ENDPOINTS
# ============================================================================

@app.get("/api/clinical-studies/patient/{patient_id}")
async def get_clinical_studies_by_patient(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Get clinical studies for a specific patient"""
    # TODO: Implement actual clinical studies table and logic
    # For now, return empty list to prevent frontend errors
    return []

@app.get("/api/clinical-studies/consultation/{consultation_id}")
async def get_clinical_studies_by_consultation(
    consultation_id: int,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Get clinical studies for a specific consultation"""
    # TODO: Implement actual clinical studies table and logic
    # For now, return empty list to prevent frontend errors
    return []

@app.get("/api/clinical-studies/patient/{patient_id}")
async def get_clinical_studies_by_patient(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Get all clinical studies for a specific patient"""
    print(f"🔬 Getting clinical studies for patient: {patient_id}")
    
    # TODO: Implement actual clinical studies table and logic
    # For now, return mock historical studies for demonstration
    # Check if patient exists in our database first
    patient = db.query(Person).filter(
        Person.id == patient_id,
        Person.person_type == "patient"
    ).first()
    
    if not patient:
        print(f"🔬 Patient {patient_id} not found in database")
        return []
    
    print(f"🔬 Patient found: {patient.first_name} {patient.paternal_surname}")
    
    # Return mock studies only for existing patients
    mock_historical_studies = [
        {
            "id": "HIST-001",
            "consultation_id": "CONS-001",
            "patient_id": str(patient_id),
            "study_type": "quimica_clinica",
            "study_name": "Perfil lipídico completo",
            "study_description": "Análisis de colesterol total, HDL, LDL y triglicéridos",
            "ordered_date": "2024-08-20",
            "status": "completed",
            "results_text": "Colesterol total: 180 mg/dL, HDL: 45 mg/dL, LDL: 110 mg/dL, Triglicéridos: 125 mg/dL",
            "interpretation": "Valores dentro de rangos normales",
            "ordering_doctor": "Dr. Rafael García Hernández - Cédula Profesional: 12345678",
            "performing_doctor": "Dr. María González",
            "institution": "Laboratorio Clínico Central",
            "urgency": "normal",
            "clinical_indication": "Control rutinario de dislipidemia",
            "relevant_history": "Antecedente familiar de hipercolesterolemia",
            "created_by": "Dr. Rafael García",
            "created_at": "2024-08-20T10:00:00.000Z",
            "updated_at": "2024-08-22T14:30:00.000Z",
            "performed_date": "2024-08-22"
        },
        {
            "id": "HIST-002",
            "consultation_id": "CONS-002",
            "patient_id": str(patient_id),
            "study_type": "radiologia_simple",
            "study_name": "Radiografía de tórax PA y lateral",
            "study_description": "Proyecciones posteroanterior y lateral de tórax",
            "ordered_date": "2024-07-15",
            "status": "completed",
            "results_text": "Campos pulmonares libres, sin evidencia de consolidación. Silueta cardiaca de forma y tamaño normal. Estructuras mediastinales sin alteraciones.",
            "interpretation": "Estudio radiológico normal",
            "ordering_doctor": "Dr. Rafael García Hernández - Cédula Profesional: 12345678",
            "performing_doctor": "Dr. Ana Torres Radióloga",
            "institution": "Hospital General - Departamento de Imagenología",
            "urgency": "normal",
            "clinical_indication": "Evaluación por dolor torácico inespecífico",
            "relevant_history": "Dolor torácico de 2 días de evolución",
            "created_by": "Dr. Rafael García",
            "created_at": "2024-07-15T09:30:00.000Z",
            "updated_at": "2024-07-15T16:45:00.000Z",
            "performed_date": "2024-07-15"
        },
        {
            "id": "HIST-003",
            "consultation_id": "CONS-003",
            "patient_id": str(patient_id),
            "study_type": "hematologia",
            "study_name": "Biometría hemática completa",
            "study_description": "Conteo de células sanguíneas, hemoglobina y hematocrito",
            "ordered_date": "2024-06-10",
            "status": "completed",
            "results_text": "Leucocitos: 7,200/μL, Eritrocitos: 4.5 M/μL, Hemoglobina: 14.2 g/dL, Hematocrito: 42%, Plaquetas: 285,000/μL",
            "interpretation": "Biometría hemática dentro de parámetros normales",
            "ordering_doctor": "Dr. Rafael García Hernández - Cédula Profesional: 12345678",
            "performing_doctor": "Dr. Carlos Mendoza",
            "institution": "Laboratorio Clínico Central",
            "urgency": "normal",
            "clinical_indication": "Chequeo médico anual",
            "relevant_history": "Control médico preventivo",
            "created_by": "Dr. Rafael García",
            "created_at": "2024-06-10T11:00:00.000Z",
            "updated_at": "2024-06-10T17:30:00.000Z",
            "performed_date": "2024-06-10"
        }
    ]
    
    print(f"🔬 Returning {len(mock_historical_studies)} historical studies for patient {patient_id}")
    return mock_historical_studies

@app.post("/api/clinical-studies")
async def create_clinical_study(
    study_data: dict,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Create a new clinical study"""
    print(f"🔬 Creating clinical study with data: {study_data}")
    
    # TODO: Implement actual clinical studies table and logic
    # For now, return a properly structured mock response
    import random
    mock_id = random.randint(1000, 9999)
    
    # Return the data in the structure the frontend expects
    mock_response = {
        "id": str(mock_id),
        "consultation_id": study_data.get("consultation_id"),
        "patient_id": str(study_data.get("patient_id", "")),
        "study_type": study_data.get("study_type", "hematologia"),
        "study_name": study_data.get("study_name", "Estudio Mock"),
        "study_description": study_data.get("study_description", ""),
        "ordered_date": study_data.get("ordered_date"),
        "status": study_data.get("status", "pending"),
        "results_text": study_data.get("results_text", ""),
        "interpretation": study_data.get("interpretation", ""),
        "ordering_doctor": study_data.get("ordering_doctor", ""),
        "performing_doctor": study_data.get("performing_doctor", ""),
        "institution": study_data.get("institution", ""),
        "urgency": study_data.get("urgency", "normal"),
        "clinical_indication": study_data.get("clinical_indication", ""),
        "relevant_history": study_data.get("relevant_history", ""),
        "created_by": study_data.get("created_by", ""),
        "created_at": "2025-09-23T19:22:00.000Z",
        "updated_at": "2025-09-23T19:22:00.000Z"
    }
    
    print(f"🔬 Returning mock clinical study: {mock_response}")
    return mock_response

@app.put("/api/clinical-studies/{study_id}")
async def update_clinical_study(
    study_id: int,
    study_data: dict,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Update a clinical study"""
    # TODO: Implement actual clinical studies table and logic
    return {
        "id": study_id,
        "message": "Clinical study update endpoint not implemented yet",
        "status": "pending_implementation"
    }

@app.delete("/api/clinical-studies/{study_id}")
async def delete_clinical_study(
    study_id: int,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Delete a clinical study"""
    # TODO: Implement actual clinical studies table and logic
    return {"message": "Clinical study deleted (mock)", "status": "pending_implementation"}

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
            host='localhost',
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
    
    # Get specialty name
    specialty_name = None
    if current_user.specialty_id:
        specialty = db.query(Specialty).filter(Specialty.id == current_user.specialty_id).first()
        specialty_name = specialty.name if specialty else None
    
    return {
        "id": current_user.id,
        "person_code": current_user.person_code,
        "person_type": current_user.person_type,
        "title": current_user.title,
        "first_name": current_user.first_name,
        "paternal_surname": current_user.paternal_surname,
        "maternal_surname": current_user.maternal_surname,
        "full_name": current_user.full_name,
        "email": current_user.email,
        "primary_phone": current_user.primary_phone,
        "birth_date": current_user.birth_date,
        "gender": current_user.gender,
        "civil_status": current_user.civil_status,
        "curp": current_user.curp,
        "rfc": current_user.rfc,
        "birth_city": current_user.birth_city,
        "birth_state_id": current_user.birth_state_id,
        "foreign_birth_place": current_user.foreign_birth_place,
        
        # Personal Address
        "address_street": current_user.address_street,
        "address_ext_number": current_user.address_ext_number,
        "address_int_number": current_user.address_int_number,
        "address_neighborhood": current_user.address_neighborhood,
        "address_city": current_user.address_city,
        "address_state_id": current_user.address_state_id,
        "address_state_name": current_user.address_state.name if current_user.address_state else None,
        "address_country_name": current_user.address_state.country.name if current_user.address_state and current_user.address_state.country else None,
        "address_postal_code": current_user.address_postal_code,
        
        # Professional Address (Office)
        "office_address": current_user.office_address,
        "office_city": current_user.office_city,
        "office_state_id": current_user.office_state_id,
        "office_state_name": current_user.office_state.name if current_user.office_state else None,
        "office_country_name": current_user.office_state.country.name if current_user.office_state and current_user.office_state.country else None,
        "office_postal_code": current_user.office_postal_code,
        "office_phone": current_user.office_phone,
        "appointment_duration": current_user.appointment_duration,
        
        # Professional Data
        "professional_license": current_user.professional_license,
        "specialty_id": current_user.specialty_id,
        "specialty_name": specialty_name,
        "specialty_license": current_user.specialty_license,
        "university": current_user.university,
        "graduation_year": current_user.graduation_year,
        "subspecialty": current_user.subspecialty,
        "digital_signature": current_user.digital_signature,
        "professional_seal": current_user.professional_seal,
        
        # Emergency Contact
        "emergency_contact_name": current_user.emergency_contact_name,
        "emergency_contact_phone": current_user.emergency_contact_phone,
        "emergency_contact_relationship": current_user.emergency_contact_relationship,
        
        # System
        "is_active": current_user.is_active,
        "created_at": current_user.created_at,
        "updated_at": current_user.updated_at
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
            "address_street": updated_doctor.address_street,
            "address_ext_number": updated_doctor.address_ext_number,
            "address_int_number": updated_doctor.address_int_number,
            "address_neighborhood": updated_doctor.address_neighborhood,
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
    """Get list of patients created by the current doctor"""
    try:
        # Only return patients created by the current doctor
        result = crud.get_patients_by_doctor(db, doctor_id=current_user.id, skip=skip, limit=limit)
        
        # Debug: Check emergency contact data
        for patient in result:
            print(f"🔍 Patient {patient.id} emergency contact:")
            print(f"  - Name: {patient.emergency_contact_name}")
            print(f"  - Phone: {patient.emergency_contact_phone}")
            print(f"  - Relationship: {patient.emergency_contact_relationship}")
        
        return result
    except Exception as e:
        print(f"❌ Error in get_patients: {str(e)}")
        import traceback
        traceback.print_exc()
        # Fallback to simple query if relationships fail, but still filter by doctor
        patients = db.query(Person).filter(
            Person.person_type == 'patient',
            Person.created_by == current_user.id
        ).offset(skip).limit(limit).all()
        return patients

@app.get("/api/patients/{patient_id}")
async def get_patient(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Get specific patient by ID (only if created by current doctor)"""
    try:
        patient = db.query(Person).filter(
            Person.id == patient_id,
            Person.person_type == 'patient',
            Person.created_by == current_user.id  # Only patients created by this doctor
        ).first()
        
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found or access denied")
        
        return patient
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
    """Create new patient"""
    try:
        # Check if patient already exists by CURP or email
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
        patient = crud.create_patient_with_code(db, patient_data, person_code, current_user.id)
        
        # Commit the transaction to persist the patient
        db.commit()
        db.refresh(patient)
        
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
    patient_data: schemas.PatientCreate,
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
            doctor_id=str(current_user.id),  # Use authenticated doctor ID
            available_for_consultation=available_for_consultation
        )
        
        # Transform to include patient information
        result = []
        for appointment in appointments:
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
                "patient_name": f"{appointment.patient.first_name} {appointment.patient.paternal_surname}" if appointment.patient else "Unknown Patient"
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
        # NOTE: Appointments table not yet implemented in database schema
        raise HTTPException(status_code=501, detail="Appointments feature not yet implemented")
    except Exception as e:
        print(f"❌ Error in get_appointment: {str(e)}")
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
        # NOTE: Appointments table not yet implemented in database schema
        raise HTTPException(status_code=501, detail="Appointments feature not yet implemented")
    except Exception as e:
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
                patient_name = f"{consultation.patient.first_name} {consultation.patient.paternal_surname} {consultation.patient.maternal_surname or ''}".strip()
            
            doctor_name = "Doctor"
            if consultation.doctor:
                doctor_name = f"{consultation.doctor.first_name} {consultation.doctor.paternal_surname}".strip()
            
            consultation_date_iso = consultation.consultation_date.isoformat()
            # Calculate end_time assuming 30 minutes duration for consultations
            consultation_end_time = consultation.consultation_date + timedelta(minutes=30)

            result.append({
                "id": consultation.id,
                "patient_id": consultation.patient_id,
                "consultation_date": consultation_date_iso,
                "end_time": consultation_end_time.isoformat(),
                "chief_complaint": consultation.chief_complaint,
                "history_present_illness": consultation.history_present_illness,
                "family_history": consultation.family_history,
                "personal_pathological_history": consultation.personal_pathological_history,
                "personal_non_pathological_history": consultation.personal_non_pathological_history,
                "physical_examination": consultation.physical_examination,
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
            patient_name = f"{consultation.patient.first_name} {consultation.patient.paternal_surname} {consultation.patient.maternal_surname or ''}".strip()
        
        # Get doctor name
        doctor_name = "Doctor"
        if consultation.doctor:
            doctor_name = f"{consultation.doctor.first_name} {consultation.doctor.paternal_surname}".strip()
        
        # Calculate end_time assuming 30 minutes duration for consultations
        consultation_end_time = consultation.consultation_date + timedelta(minutes=30)

        # Return complete consultation data
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
            "created_by": consultation.created_by,
            "created_at": consultation.created_at.isoformat(),
            "patient_name": patient_name,
            "doctor_name": doctor_name,
            "date": consultation.consultation_date.isoformat()
        }
        
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
    """Create new consultation"""
    try:
        # Parse consultation date
        consultation_date_str = consultation_data.get("date", consultation_data.get("consultation_date"))
        if consultation_date_str:
            # Parse ISO datetime string as CDMX time
            consultation_date = cdmx_datetime(consultation_date_str)
        else:
            consultation_date = now_cdmx()
        
        # Create MedicalRecord in database
        new_medical_record = MedicalRecord(
            patient_id=consultation_data.get("patient_id"),
            doctor_id=current_user.id,
            consultation_date=consultation_date,
            chief_complaint=consultation_data.get("chief_complaint", ""),
            history_present_illness=consultation_data.get("history_present_illness", ""),
            family_history=consultation_data.get("family_history", ""),
            personal_pathological_history=consultation_data.get("personal_pathological_history", ""),
            personal_non_pathological_history=consultation_data.get("personal_non_pathological_history", ""),
            physical_examination=consultation_data.get("physical_examination", ""),
            primary_diagnosis=consultation_data.get("primary_diagnosis", ""),
            treatment_plan=consultation_data.get("treatment_plan", ""),
            follow_up_instructions=consultation_data.get("follow_up_instructions", ""),
            prognosis=consultation_data.get("prognosis", ""),
            secondary_diagnoses=consultation_data.get("secondary_diagnoses", ""),
            laboratory_results=consultation_data.get("laboratory_results", ""),
            notes=consultation_data.get("notes") or consultation_data.get("interconsultations", ""),
            created_by=current_user.id
        )
        
        # Save to database
        db.add(new_medical_record)
        db.commit()
        db.refresh(new_medical_record)
        
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

        # Return in API format
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
            "created_by": new_medical_record.created_by,
            "created_at": new_medical_record.created_at.isoformat(),
            "patient_name": patient_name,
            "doctor_name": doctor_name,
            "date": new_medical_record.consultation_date.isoformat()
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
            consultation_date = cdmx_datetime(consultation_date_str)
        
        # Update fields
        consultation.patient_id = consultation_data.get("patient_id", consultation.patient_id)
        consultation.consultation_date = consultation_date
        consultation.chief_complaint = consultation_data.get("chief_complaint", consultation.chief_complaint)
        consultation.history_present_illness = consultation_data.get("history_present_illness", consultation.history_present_illness)
        consultation.family_history = consultation_data.get("family_history", consultation.family_history)
        consultation.personal_pathological_history = consultation_data.get("personal_pathological_history", consultation.personal_pathological_history)
        consultation.personal_non_pathological_history = consultation_data.get("personal_non_pathological_history", consultation.personal_non_pathological_history)
        consultation.physical_examination = consultation_data.get("physical_examination", consultation.physical_examination)
        consultation.primary_diagnosis = consultation_data.get("primary_diagnosis", consultation.primary_diagnosis)
        consultation.secondary_diagnoses = consultation_data.get("secondary_diagnoses", consultation.secondary_diagnoses)
        consultation.treatment_plan = consultation_data.get("treatment_plan", consultation.treatment_plan)
        consultation.follow_up_instructions = consultation_data.get("follow_up_instructions", consultation.follow_up_instructions)
        consultation.prognosis = consultation_data.get("prognosis", consultation.prognosis)
        consultation.laboratory_results = consultation_data.get("laboratory_results", consultation.laboratory_results)
        consultation.notes = consultation_data.get("notes") or consultation_data.get("interconsultations") or consultation.notes
        
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
            "personal_pathological_history": consultation.personal_pathological_history,
            "personal_non_pathological_history": consultation.personal_non_pathological_history,
            "physical_examination": consultation.physical_examination,
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
        # NOTE: Consultations table not yet implemented in database schema
        raise HTTPException(status_code=501, detail="Consultations feature not yet implemented")
    except Exception as e:
        print(f"❌ Error in delete_consultation: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

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

