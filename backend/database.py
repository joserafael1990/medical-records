"""
Database models with standardized English field names
Database: PostgreSQL with numeric IDs
Compliance: 100% Mexican NOMs
"""

from sqlalchemy import Column, Integer, String, DateTime, Date, Time, Text, Boolean, ForeignKey, DECIMAL, JSON, Numeric, CheckConstraint
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
    phone_code = Column(String(5))  # International dialing code (e.g., +52, +58)
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
    birth_country_id = Column(Integer, ForeignKey("countries.id"))  # Country of birth
    
    # CONTACT INFORMATION
    email = Column(String(100))
    primary_phone = Column(String(20))
    
    # PERSONAL ADDRESS
    home_address = Column(Text)
    address_city = Column(String(100))  # Free text field for city
    address_state_id = Column(Integer, ForeignKey("states.id"))  # FK to states table
    address_country_id = Column(Integer, ForeignKey("countries.id"))  # FK to countries table
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
    birth_country = relationship("Country", foreign_keys=[birth_country_id])
    address_state = relationship("State", foreign_keys=[address_state_id], overlaps="persons_address")
    address_country = relationship("Country", foreign_keys=[address_country_id])
    office_state = relationship("State", foreign_keys=[office_state_id], overlaps="persons_office")
    emergency_relationship = relationship("EmergencyRelationship", back_populates="persons")
    
    # Medical relationships
    medical_records_as_patient = relationship("MedicalRecord", foreign_keys="MedicalRecord.patient_id", back_populates="patient")
    medical_records_as_doctor = relationship("MedicalRecord", foreign_keys="MedicalRecord.doctor_id", back_populates="doctor")
    appointments_as_patient = relationship("Appointment", foreign_keys="Appointment.patient_id", back_populates="patient")
    appointments_as_doctor = relationship("Appointment", foreign_keys="Appointment.doctor_id", back_populates="doctor")
    clinical_studies_as_patient = relationship("ClinicalStudy", foreign_keys="ClinicalStudy.patient_id", back_populates="patient")
    clinical_studies_as_doctor = relationship("ClinicalStudy", foreign_keys="ClinicalStudy.doctor_id", back_populates="doctor")
    
    
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
        if self.home_address:
            parts.append(self.home_address)
        if self.address_city:
            parts.append(self.address_city)
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
    laboratory_analysis = Column(Text)
    primary_diagnosis = Column(Text, nullable=False)
    treatment_plan = Column(Text, nullable=False)
    follow_up_instructions = Column(Text, nullable=False)
    prognosis = Column(Text, nullable=False)
    
    # CONSULTATION TYPE
    consultation_type = Column(String(50), default='Seguimiento')
    
    # FIRST-TIME CONSULTATION FIELDS (removed duplicate _story fields)
    # These fields are now handled by the existing _history fields:
    # - family_history
    # - personal_pathological_history  
    # - personal_non_pathological_history
    
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
    appointment_type = Column(String(50), nullable=False, default='consulta')
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

class ClinicalStudy(Base):
    __tablename__ = "clinical_studies"
    
    id = Column(Integer, primary_key=True, index=True)
    study_code = Column(String(20), unique=True)
    consultation_id = Column(Integer, ForeignKey("medical_records.id"), nullable=False)
    patient_id = Column(Integer, ForeignKey("persons.id"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("persons.id"), nullable=False)
    study_catalog_id = Column(Integer, ForeignKey("study_catalog.id"), nullable=True)  # New field
    
    # STUDY INFORMATION
    study_type = Column(String(50), nullable=False)  # hematologia, bioquimica, radiologia, etc.
    study_name = Column(String(200), nullable=False)
    study_description = Column(Text)
    
    # DATES
    ordered_date = Column(DateTime, nullable=False)
    performed_date = Column(DateTime)
    results_date = Column(DateTime)
    
    # STATUS AND URGENCY
    status = Column(String(20), default='pending')  # pending, in_progress, completed, cancelled, failed
    urgency = Column(String(20), default='normal')  # normal, urgent, stat
    
    # MEDICAL INFORMATION
    clinical_indication = Column(Text, nullable=False)
    relevant_history = Column(Text)
    results_text = Column(Text)
    interpretation = Column(Text)
    
    # NEW FIELDS FOR NORMALIZED CATALOG
    results = Column(JSON)  # New field for structured results
    normal_values = Column(JSON)  # New field for normal values
    
    # MEDICAL STAFF
    ordering_doctor = Column(String(200), nullable=False)
    performing_doctor = Column(String(200))
    institution = Column(String(200))
    
    # FILE ATTACHMENTS
    file_name = Column(String(255))
    file_path = Column(String(500))
    file_type = Column(String(50))
    file_size = Column(Integer)  # in bytes
    
    # SYSTEM
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(Integer, ForeignKey("persons.id"))
    
    # RELATIONSHIPS
    consultation = relationship("MedicalRecord", backref="clinical_studies")
    patient = relationship("Person", foreign_keys=[patient_id], back_populates="clinical_studies_as_patient")
    doctor = relationship("Person", foreign_keys=[doctor_id], back_populates="clinical_studies_as_doctor")
    catalog_study = relationship("StudyCatalog", back_populates="clinical_studies")  # New relationship


# ============================================================================
# CONFIGURACIÓN DE BASE DE DATOS
# ============================================================================

# Study Catalog Models
class StudyCategory(Base):
    __tablename__ = "study_categories"
    
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(10), unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    studies = relationship("StudyCatalog", back_populates="category")

class StudyCatalog(Base):
    __tablename__ = "study_catalog"
    
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(20), unique=True, nullable=False, index=True)
    name = Column(String(200), nullable=False)
    category_id = Column(Integer, ForeignKey("study_categories.id"), nullable=False)
    subcategory = Column(String(100))
    description = Column(Text)
    preparation = Column(Text)  # Instructions for patient preparation
    methodology = Column(Text)
    duration_hours = Column(Integer)  # Delivery time in hours
    specialty = Column(String(100), index=True)
    is_active = Column(Boolean, default=True)
    regulatory_compliance = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    category = relationship("StudyCategory", back_populates="studies")
    normal_values = relationship("StudyNormalValue", back_populates="study", cascade="all, delete-orphan")
    template_items = relationship("StudyTemplateItem", back_populates="study")
    clinical_studies = relationship("ClinicalStudy", back_populates="catalog_study")

class StudyNormalValue(Base):
    __tablename__ = "study_normal_values"
    
    id = Column(Integer, primary_key=True, index=True)
    study_id = Column(Integer, ForeignKey("study_catalog.id", ondelete="CASCADE"), nullable=False)
    age_min = Column(Integer)
    age_max = Column(Integer)
    gender = Column(String(1), CheckConstraint("gender IN ('M', 'F', 'B')"))
    min_value = Column(Numeric(10, 3))
    max_value = Column(Numeric(10, 3))
    unit = Column(String(20))
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    study = relationship("StudyCatalog", back_populates="normal_values")

class StudyTemplate(Base):
    __tablename__ = "study_templates"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text)
    specialty = Column(String(100))
    is_default = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    template_items = relationship("StudyTemplateItem", back_populates="template", cascade="all, delete-orphan")

class StudyTemplateItem(Base):
    __tablename__ = "study_template_items"
    
    id = Column(Integer, primary_key=True, index=True)
    template_id = Column(Integer, ForeignKey("study_templates.id", ondelete="CASCADE"), nullable=False)
    study_id = Column(Integer, ForeignKey("study_catalog.id", ondelete="CASCADE"), nullable=False)
    order_index = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    template = relationship("StudyTemplate", back_populates="template_items")
    study = relationship("StudyCatalog", back_populates="template_items")

# ClinicalStudy model updated with catalog reference

# ============================================================================

# Import schedule models to ensure they are registered with Base
try:
    from models.schedule import ScheduleTemplate, ScheduleException
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


# ============================================================================
# VITAL SIGNS MODELS
# ============================================================================

class VitalSign(Base):
    __tablename__ = "vital_signs"
    
    id = Column(Integer, primary_key=True)
    name = Column(String(50), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    consultation_vital_signs = relationship("ConsultationVitalSign", back_populates="vital_sign")

class ConsultationVitalSign(Base):
    __tablename__ = "consultation_vital_signs"
    
    id = Column(Integer, primary_key=True)
    consultation_id = Column(Integer, ForeignKey("medical_records.id"), nullable=False)
    vital_sign_id = Column(Integer, ForeignKey("vital_signs.id"), nullable=False)
    value = Column(String(100), nullable=False)
    unit = Column(String(20))
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    consultation = relationship("MedicalRecord")
    vital_sign = relationship("VitalSign", back_populates="consultation_vital_signs")

# ============================================================================
# MEDICATIONS AND PRESCRIPTIONS
# ============================================================================

class Medication(Base):
    __tablename__ = "medications"
    
    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False, unique=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    consultation_prescriptions = relationship("ConsultationPrescription", back_populates="medication")

class ConsultationPrescription(Base):
    __tablename__ = "consultation_prescriptions"
    
    id = Column(Integer, primary_key=True)
    consultation_id = Column(Integer, ForeignKey("medical_records.id"), nullable=False)
    medication_id = Column(Integer, ForeignKey("medications.id"), nullable=False)
    dosage = Column(String(255), nullable=False)
    frequency = Column(String(255), nullable=False)
    duration = Column(String(255), nullable=False)
    instructions = Column(Text)
    quantity = Column(Integer)
    via_administracion = Column(String(100))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    consultation = relationship("MedicalRecord")
    medication = relationship("Medication", back_populates="consultation_prescriptions")

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
