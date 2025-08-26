"""
Database configuration and models for Historias Clínicas
"""
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Date, Text, Boolean, ForeignKey, JSON, ARRAY
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
import uuid
from datetime import datetime
import os

# Database URL - can be configured via environment variable
DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql://historias_user:historias_pass@localhost:5432/historias_clinicas"
)

print(f"🐘 Conectando a PostgreSQL: {DATABASE_URL}")

# SQLAlchemy setup
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# ============================================================================
# DATABASE MODELS
# ============================================================================

class Patient(Base):
    __tablename__ = "patients"
    
    id = Column(String, primary_key=True, default=lambda: f"PAT{str(uuid.uuid4())[:8].upper()}")
    
    # NOM-004 Required fields
    title = Column(String(10))  # Sr., Sra., etc.
    first_name = Column(String(100), nullable=False)
    paternal_surname = Column(String(100), nullable=False)
    maternal_surname = Column(String(100))
    
    # Personal Information
    curp = Column(String(18), unique=True)
    birth_date = Column(Date, nullable=False)
    gender = Column(String(20), nullable=False)
    civil_status = Column(String(20))
    nationality = Column(String(50), default="mexicana")
    birth_place = Column(String(100))
    
    # Contact Information
    address = Column(Text)
    city = Column(String(100))
    state = Column(String(50))
    postal_code = Column(String(10))
    country = Column(String(50), default="México")
    phone = Column(String(20))
    email = Column(String(100))
    emergency_contact_name = Column(String(200))
    emergency_contact_phone = Column(String(20))
    emergency_contact_relationship = Column(String(50))
    
    # Insurance and Medical
    insurance_provider = Column(String(100))
    insurance_number = Column(String(50))
    blood_type = Column(String(5))
    allergies = Column(Text)
    chronic_conditions = Column(Text)
    current_medications = Column(Text)
    
    # System fields
    is_active = Column(Boolean, default=True)
    total_visits = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, onupdate=datetime.utcnow)
    created_by = Column(String(100))
    updated_by = Column(String(100))
    
    # Relationships
    consultations = relationship("MedicalHistory", back_populates="patient")
    vital_signs = relationship("VitalSigns", back_populates="patient")
    clinical_studies = relationship("ClinicalStudy", back_populates="patient")

class DoctorProfile(Base):
    __tablename__ = "doctor_profiles"
    
    id = Column(String, primary_key=True, default=lambda: f"DR{str(uuid.uuid4())[:8].upper()}")
    
    # Personal Information (NOM-004 Required)
    title = Column(String(10), nullable=False)  # Dr., Dra., Lic., Lcda.
    first_name = Column(String(100), nullable=False)
    paternal_surname = Column(String(100), nullable=False)
    maternal_surname = Column(String(100))
    email = Column(String(100), nullable=False)
    phone = Column(String(20), nullable=False)
    birth_date = Column(Date, nullable=False)
    
    # Professional Information (NOM-004 Required)
    professional_license = Column(String(20), nullable=False, unique=True)
    specialty = Column(String(100), nullable=False)
    specialty_license = Column(String(20))
    university = Column(String(200), nullable=False)
    graduation_year = Column(String(4), nullable=False)
    subspecialty = Column(String(100))
    
    # Contact Information
    professional_email = Column(String(100))
    office_phone = Column(String(20))
    mobile_phone = Column(String(20))
    
    # Office Information (NOM-004 Required)
    office_address = Column(Text, nullable=False)
    office_city = Column(String(100), nullable=False)
    office_state = Column(String(50), nullable=False)
    office_postal_code = Column(String(10))
    office_country = Column(String(50), default="México")
    
    # Academic Information (NOM-004 Optional but recommended)
    # medical_school, internship_hospital, residency_hospital removed per user request
    
    # Certifications removed per user request
    # board_certifications = Column(ARRAY(String))
    # professional_memberships = Column(ARRAY(String))
    
    # Digital files
    digital_signature = Column(String(500))  # Path to file
    professional_seal = Column(String(500))  # Path to file
    
    # System fields
    is_active = Column(Boolean, default=True)
    full_name = Column(String(300))  # Computed field
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, onupdate=datetime.utcnow)
    created_by = Column(String(100))
    updated_by = Column(String(100))

class MedicalHistory(Base):
    __tablename__ = "medical_history"
    
    id = Column(String, primary_key=True, default=lambda: f"MH{str(uuid.uuid4())[:8].upper()}")
    patient_id = Column(String, ForeignKey("patients.id"), nullable=False)
    date = Column(DateTime, nullable=False)
    
    # NOM-004 mandatory consultation fields
    chief_complaint = Column(Text, nullable=False)  # Motivo de la consulta
    history_present_illness = Column(Text, nullable=False)  # Historia de la enfermedad actual
    
    # Medical History (NOM-004 mandatory in clinical evaluation)
    family_history = Column(Text, nullable=False)  # Antecedentes heredofamiliares
    personal_pathological_history = Column(Text, nullable=False)  # Antecedentes patológicos personales
    personal_non_pathological_history = Column(Text, nullable=False)  # Antecedentes no patológicos personales
    
    physical_examination = Column(Text, nullable=False)  # Exploración física
    
    # Diagnosis
    primary_diagnosis = Column(Text, nullable=False)
    primary_diagnosis_cie10 = Column(String(10))  # Optional CIE-10 code
    secondary_diagnoses = Column(Text)
    secondary_diagnoses_cie10 = Column(String(500))  # Multiple CIE-10 codes
    differential_diagnosis = Column(Text)
    
    # Treatment
    treatment_plan = Column(Text, nullable=False)
    prescribed_medications = Column(Text)
    follow_up_instructions = Column(Text, nullable=False)
    
    # Doctor Information (auto-filled from profile)
    doctor_name = Column(String(300), nullable=False)
    doctor_professional_license = Column(String(20), nullable=False)
    doctor_specialty = Column(String(100))
    
    # System fields
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, onupdate=datetime.utcnow)
    created_by = Column(String(100))
    updated_by = Column(String(100))
    
    # Relationships
    patient = relationship("Patient", back_populates="consultations")
    clinical_studies = relationship("ClinicalStudy", back_populates="consultation")

class VitalSigns(Base):
    __tablename__ = "vital_signs"
    
    id = Column(String, primary_key=True, default=lambda: f"VS{str(uuid.uuid4())[:8].upper()}")
    patient_id = Column(String, ForeignKey("patients.id"), nullable=False)
    date_recorded = Column(DateTime, nullable=False)
    
    # Vital signs
    weight = Column(String(10))  # kg
    height = Column(String(10))  # cm
    bmi = Column(String(10))
    temperature = Column(String(10))  # °C
    blood_pressure_systolic = Column(String(10))  # mmHg
    blood_pressure_diastolic = Column(String(10))  # mmHg
    heart_rate = Column(String(10))  # bpm
    respiratory_rate = Column(String(10))  # rpm
    oxygen_saturation = Column(String(10))  # %
    
    # Additional measurements
    abdominal_circumference = Column(String(10))  # cm
    head_circumference = Column(String(10))  # cm (pediatric)
    
    # Notes
    notes = Column(Text)
    recorded_by = Column(String(100))
    
    # System fields
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    patient = relationship("Patient", back_populates="vital_signs")

class ClinicalStudy(Base):
    __tablename__ = "clinical_studies"
    
    id = Column(String, primary_key=True, default=lambda: f"CS{str(uuid.uuid4())[:8].upper()}")
    consultation_id = Column(String, ForeignKey("medical_history.id"), nullable=False)
    patient_id = Column(String, ForeignKey("patients.id"), nullable=False)
    
    # Study information
    study_type = Column(String(50), nullable=False)  # laboratory, radiology, etc.
    study_name = Column(String(200), nullable=False)
    study_description = Column(Text)
    ordered_date = Column(DateTime, nullable=False)
    performed_date = Column(DateTime)
    results_date = Column(DateTime)
    status = Column(String(20), default="pending")
    
    # Results and files
    results_text = Column(Text)
    interpretation = Column(Text)
    file_path = Column(String(500))
    file_name = Column(String(200))
    file_type = Column(String(50))
    file_size = Column(Integer)
    
    # Medical information
    ordering_doctor = Column(String(200), nullable=False)
    performing_doctor = Column(String(200))
    institution = Column(String(200))
    urgency = Column(String(20))
    clinical_indication = Column(Text)
    relevant_history = Column(Text)
    
    # System fields
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, onupdate=datetime.utcnow)
    created_by = Column(String(100))
    updated_by = Column(String(100))
    
    # Relationships
    consultation = relationship("MedicalHistory", back_populates="clinical_studies")
    patient = relationship("Patient", back_populates="clinical_studies")

class Appointment(Base):
    __tablename__ = "appointments"
    
    id = Column(String, primary_key=True, default=lambda: f"APT{str(uuid.uuid4())[:8].upper()}")
    patient_id = Column(String, ForeignKey("patients.id"), nullable=False)
    
    # Appointment details
    appointment_date = Column(DateTime, nullable=False)
    appointment_type = Column(String(50), nullable=False)
    status = Column(String(20), default="scheduled")
    duration_minutes = Column(Integer, default=30)
    
    # Appointment information
    reason = Column(Text)
    notes = Column(Text)
    doctor_name = Column(String(200))
    
    # System fields
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, onupdate=datetime.utcnow)
    created_by = Column(String(100))

# ============================================================================
# DATABASE FUNCTIONS
# ============================================================================

def get_db():
    """Dependency for getting database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def create_tables():
    """Create all tables"""
    Base.metadata.create_all(bind=engine)

def init_db():
    """Initialize database with tables"""
    create_tables()
    print("✅ Database tables created successfully")
