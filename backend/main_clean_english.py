#!/usr/bin/env python3
"""
Clean English API for Historias Clínicas
All endpoints standardized in English
No legacy code - completely fresh implementation
"""

from fastapi import FastAPI, Depends, HTTPException, status, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, date, timedelta
import crud
import schemas
import auth
from database import get_db, Person, Specialty, Country, State, Nationality, EmergencyRelationship

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

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer()

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
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

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


@app.get("/api/catalogs/nationalities")
async def get_nationalities(db: Session = Depends(get_db)):
    """Get list of nationalities"""
    return crud.get_nationalities(db, active=True)

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
                detail="Email already registered"
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
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration error: {str(e)}"
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
        "nationality_id": current_user.nationality_id,
        "birth_place": current_user.birth_place,
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
        "address_postal_code": current_user.address_postal_code,
        
        # Professional Address (Office)
        "office_address": current_user.office_address,
        "office_city": current_user.office_city,
        "office_state_id": current_user.office_state_id,
        "office_state_name": current_user.office_state.name if current_user.office_state else None,
        "office_postal_code": current_user.office_postal_code,
        
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
            "nationality_id": updated_doctor.nationality_id,
            "birth_place": updated_doctor.birth_place,
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
            "address_postal_code": updated_doctor.address_postal_code,
            
            # Professional Address (Office)
            "office_address": updated_doctor.office_address,
            "office_city": updated_doctor.office_city,
            "office_state_id": updated_doctor.office_state_id,
            "office_state_name": updated_doctor.office_state.name if updated_doctor.office_state else None,
            "office_postal_code": updated_doctor.office_postal_code,
            
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
    """Get list of patients"""
    return crud.get_patients(db, skip=skip, limit=limit)

@app.post("/api/patients")
async def create_patient(
    patient_data: schemas.PatientCreate,
    db: Session = Depends(get_db),
    current_user: Person = Depends(get_current_user)
):
    """Create new patient"""
    return crud.create_patient(db, patient_data)

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

@app.get("/api/appointments/calendar")
async def get_calendar_appointments(target_date: str = None):
    """Get calendar appointments for specific date"""
    return {
        "appointments": [],
        "date": target_date or date.today().isoformat(),
        "total": 0,
        "message": "No appointments scheduled for the requested date"
    }

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
# SERVER
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting clean English API server...")
    uvicorn.run(
        "main_clean_english:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )

