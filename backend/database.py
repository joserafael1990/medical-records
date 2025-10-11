"""
Database models with standardized English field names
Database: PostgreSQL with numeric IDs
Compliance: 100% Mexican NOMs
"""

from sqlalchemy import Column, Integer, String, DateTime, Date, Time, Text, Boolean, ForeignKey, DECIMAL
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, sessionmaker
from sqlalchemy import create_engine
from datetime import datetime
import os

# Base para modelos
Base = declarative_base()

# ============================================================================
# GEOGRAPHIC CATALOGS
# ============================================================================

class Country(Base):
    __tablename__ = "countries"
    
    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    states = relationship("State", back_populates="country")

class State(Base):
    __tablename__ = "states"
    
    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    country_id = Column(Integer, ForeignKey("countries.id"))
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    country = relationship("Country", back_populates="states")
    persons_birth = relationship("Person", foreign_keys="Person.birth_state_id")
    persons_address = relationship("Person", foreign_keys="Person.address_state_id")
    persons_office = relationship("Person", foreign_keys="Person.office_state_id")


# ============================================================================
# AUXILIARY CATALOGS
# ============================================================================


class Specialty(Base):
    __tablename__ = "specialties"
    
    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False, unique=True)
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    doctors = relationship("Person", back_populates="specialty")

class EmergencyRelationship(Base):
    __tablename__ = "emergency_relationships"
    
    code = Column(String(20), primary_key=True)
    name = Column(String(50), nullable=False)
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    persons = relationship("Person", back_populates="emergency_relationship")

# ============================================================================
# MAIN TABLE: PERSONS (UNIFIED)
# ============================================================================

class Person(Base):
    __tablename__ = "persons"
    
    # IDENTIFICATION
    id = Column(Integer, primary_key=True)
    person_code = Column(String(20), unique=True, nullable=False)
    person_type = Column(String(20), nullable=False)  # 'doctor', 'patient', 'admin'
    
    # PERSONAL DATA (NOM-004)
    title = Column(String(10))
    first_name = Column(String(100), nullable=False)
    paternal_surname = Column(String(100), nullable=False)
    maternal_surname = Column(String(100))
    curp = Column(String(18), unique=True)
    rfc = Column(String(13))
    birth_date = Column(Date, nullable=False)
    gender = Column(String(20), nullable=False)
    civil_status = Column(String(20))
    birth_city = Column(String(100))  # Ciudad de nacimiento (reemplaza birth_place)
    
    # BIRTH LOCATION (NOM-024)
    birth_state_id = Column(Integer, ForeignKey("states.id"))  # For Mexicans
    foreign_birth_place = Column(String(200))  # For foreigners
    
    # CONTACT INFORMATION
    email = Column(String(100))
    primary_phone = Column(String(20))
    
    # PERSONAL ADDRESS
    address_street = Column(Text)
    address_ext_number = Column(String(20))
    address_int_number = Column(String(20))
    address_neighborhood = Column(String(100))
    address_city = Column(String(100))  # Free text field for city
    address_state_id = Column(Integer, ForeignKey("states.id"))  # FK to states table
    address_postal_code = Column(String(5))
    
    # PROFESSIONAL ADDRESS (doctors only)
    office_address = Column(Text)
    office_city = Column(String(100))  # Free text field for office city
    office_state_id = Column(Integer, ForeignKey("states.id"))  # FK to states table
    office_postal_code = Column(String(5))
    office_phone = Column(String(20))  # Professional/office phone number
    office_timezone = Column(String(50), default='America/Mexico_City')  # Doctor office timezone
    appointment_duration = Column(Integer)  # Duration of appointments in minutes (optional)
    
    # PROFESSIONAL DATA (doctors only)
    professional_license = Column(String(20), unique=True)
    specialty_id = Column(Integer, ForeignKey("specialties.id"))
    specialty_license = Column(String(20))
    university = Column(String(200))
    graduation_year = Column(Integer)
    subspecialty = Column(String(100))
    digital_signature = Column(String(500))
    professional_seal = Column(String(500))
    
    # MEDICAL DATA (patients only)
    blood_type = Column(String(5))
    allergies = Column(Text)
    chronic_conditions = Column(Text)
    current_medications = Column(Text)
    insurance_provider = Column(String(100))
    insurance_number = Column(String(50))
    
    # EMERGENCY CONTACT
    emergency_contact_name = Column(String(200))
    emergency_contact_phone = Column(String(20))
    emergency_contact_relationship = Column(String(20), ForeignKey("emergency_relationships.code"))
    
    # AUTHENTICATION
    username = Column(String(50), unique=True)
    hashed_password = Column(String(255))
    
    # SYSTEM
    is_active = Column(Boolean, default=True)
    last_login = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(Integer, ForeignKey("persons.id"))
    
    # RELATIONSHIPS
    specialty = relationship("Specialty", back_populates="doctors")
    birth_state = relationship("State", foreign_keys=[birth_state_id], overlaps="persons_birth")
    address_state = relationship("State", foreign_keys=[address_state_id], overlaps="persons_address")
    office_state = relationship("State", foreign_keys=[office_state_id], overlaps="persons_office")
    emergency_relationship = relationship("EmergencyRelationship", back_populates="persons")
    
    # Medical relationships
    medical_records_as_patient = relationship("MedicalRecord", foreign_keys="MedicalRecord.patient_id", back_populates="patient")
    medical_records_as_doctor = relationship("MedicalRecord", foreign_keys="MedicalRecord.doctor_id", back_populates="doctor")
    appointments_as_patient = relationship("Appointment", foreign_keys="Appointment.patient_id", back_populates="patient")
    appointments_as_doctor = relationship("Appointment", foreign_keys="Appointment.doctor_id", back_populates="doctor")
    vital_signs = relationship("VitalSigns", foreign_keys="VitalSigns.patient_id", back_populates="patient")
    vital_signs_recorded = relationship("VitalSigns", foreign_keys="VitalSigns.recorded_by", back_populates="doctor")
    
    
    # PROPERTIES
    @property
    def full_name(self):
        """Nombre completo de la persona"""
        parts = []
        if self.title:
            parts.append(self.title)
        parts.append(self.first_name)
        parts.append(self.paternal_surname)
        if self.maternal_surname:
            parts.append(self.maternal_surname)
        return ' '.join(parts)
    
    @property
    def age(self):
        """Edad calculada"""
        if self.birth_date:
            today = datetime.now().date()
            return today.year - self.birth_date.year - ((today.month, today.day) < (self.birth_date.month, self.birth_date.day))
        return None
    
    @property
    def is_doctor(self):
        return self.person_type == 'doctor'
    
    @property
    def is_patient(self):
        return self.person_type == 'patient'
    
    @property
    def complete_address(self):
        """Formatted complete address"""
        parts = []
        if self.address_street:
            parts.append(self.address_street)
        if self.address_ext_number:
            parts.append(f"#{self.address_ext_number}")
        if self.address_int_number:
            parts.append(f"Int. {self.address_int_number}")
        if self.address_neighborhood:
            parts.append(f"Col. {self.address_neighborhood}")
        if self.address_postal_code:
            parts.append(f"C.P. {self.address_postal_code}")
        return ', '.join(parts) if parts else None

# ============================================================================
# MEDICAL TABLES
# ============================================================================

class MedicalRecord(Base):
    __tablename__ = "medical_records"
    
    id = Column(Integer, primary_key=True)
    record_code = Column(String(20), unique=True)
    patient_id = Column(Integer, ForeignKey("persons.id"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("persons.id"), nullable=False)
    consultation_date = Column(DateTime, nullable=False)
    
    # NOM-004 REQUIRED FIELDS
    chief_complaint = Column(Text, nullable=False)
    history_present_illness = Column(Text, nullable=False)
    family_history = Column(Text, nullable=False)
    personal_pathological_history = Column(Text, nullable=False)
    personal_non_pathological_history = Column(Text, nullable=False)
    physical_examination = Column(Text, nullable=False)
    primary_diagnosis = Column(Text, nullable=False)
    treatment_plan = Column(Text, nullable=False)
    follow_up_instructions = Column(Text, nullable=False)
    prognosis = Column(Text, nullable=False)
    
    # OPTIONAL FIELDS
    secondary_diagnoses = Column(Text)
    differential_diagnosis = Column(Text)
    prescribed_medications = Column(Text)
    laboratory_results = Column(Text)
    imaging_results = Column(Text)
    notes = Column(Text)
    
    # SYSTEM
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(Integer, ForeignKey("persons.id"))
    
    # RELATIONSHIPS
    patient = relationship("Person", foreign_keys=[patient_id], back_populates="medical_records_as_patient")
    doctor = relationship("Person", foreign_keys=[doctor_id], back_populates="medical_records_as_doctor")

class Appointment(Base):
    __tablename__ = "appointments"
    
    id = Column(Integer, primary_key=True)
    appointment_code = Column(String(20), unique=True)
    patient_id = Column(Integer, ForeignKey("persons.id"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("persons.id"), nullable=False)
    
    # SCHEDULING
    appointment_date = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    
    # DETAILS
    appointment_type = Column(String(50), nullable=False, default='consultation')
    status = Column(String(20), default='confirmed')
    priority = Column(String(20), default='normal')
    
    # CLINICAL INFORMATION
    reason = Column(Text, nullable=False)
    notes = Column(Text)
    preparation_instructions = Column(Text)
    
    # FOLLOW-UP
    follow_up_required = Column(Boolean, default=False)
    follow_up_date = Column(Date)
    
    # ADMINISTRATIVE
    room_number = Column(String(20))
    estimated_cost = Column(DECIMAL(10, 2))
    insurance_covered = Column(Boolean, default=False)
    
    # CONFIRMATION
    confirmation_required = Column(Boolean, default=False)
    confirmed_at = Column(DateTime)
    reminder_sent = Column(Boolean, default=False)
    reminder_sent_at = Column(DateTime)
    
    # CANCELLATION
    cancelled_reason = Column(Text)
    cancelled_at = Column(DateTime)
    cancelled_by = Column(Integer, ForeignKey("persons.id"))
    
    # SYSTEM
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(Integer, ForeignKey("persons.id"))
    
    # RELATIONSHIPS
    patient = relationship("Person", foreign_keys=[patient_id], back_populates="appointments_as_patient")
    doctor = relationship("Person", foreign_keys=[doctor_id], back_populates="appointments_as_doctor")

class VitalSigns(Base):
    __tablename__ = "vital_signs"
    
    id = Column(Integer, primary_key=True)
    patient_id = Column(Integer, ForeignKey("persons.id"), nullable=False)
    date_recorded = Column(DateTime, nullable=False)
    
    # VITAL SIGNS
    weight = Column(String(10))
    height = Column(String(10))
    bmi = Column(String(10))
    temperature = Column(String(10))
    blood_pressure_systolic = Column(String(10))
    blood_pressure_diastolic = Column(String(10))
    heart_rate = Column(String(10))
    respiratory_rate = Column(String(10))
    oxygen_saturation = Column(String(10))
    
    # ADDITIONAL
    abdominal_circumference = Column(String(10))
    head_circumference = Column(String(10))
    glucose_level = Column(String(10))
    
    # INFORMATION
    notes = Column(Text)
    recorded_by = Column(Integer, ForeignKey("persons.id"))
    measurement_context = Column(String(50))
    
    # SYSTEM
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # RELATIONSHIPS
    patient = relationship("Person", foreign_keys=[patient_id], back_populates="vital_signs")
    doctor = relationship("Person", foreign_keys=[recorded_by], back_populates="vital_signs_recorded")

# ============================================================================
# CONFIGURACIÓN DE BASE DE DATOS
# ============================================================================

# Import schedule models to ensure they are registered with Base
try:
    from models.schedule import ScheduleTemplate, ScheduleException, ScheduleSlot
    print("✅ Schedule models imported successfully")
except ImportError as e:
    print(f"⚠️ Warning: Could not import schedule models: {e}")

# Database URL from environment variable or default
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://historias_user:historias_pass@postgres-db:5432/historias_clinicas")

# SQLAlchemy setup
engine = create_engine(DATABASE_URL, echo=False)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    """Dependency para obtener sesión de base de datos"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Inicializar base de datos - solo crear tablas que no existen"""
    Base.metadata.create_all(bind=engine)
    print("✅ Database models initialized")

if __name__ == "__main__":
    print("🔍 Verificando conexión a base de datos...")
    try:
        engine.connect()
        print("✅ Conexión exitosa a PostgreSQL")
        print(f"📊 Tablas disponibles: {list(Base.metadata.tables.keys())}")
    except Exception as e:
        print(f"❌ Error de conexión: {e}")
