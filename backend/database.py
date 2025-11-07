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

# Base para modelos (must be defined before importing models that use it)
Base = declarative_base()

# Note: ScheduleTemplate is defined in models/schedule.py and imports Base from here
# Do not import ScheduleTemplate here to avoid circular import issues
# Import it only where needed (e.g., in routes/schedule.py)

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
    # Removed office_state relationship as office fields were moved to Office table


# ============================================================================
# OFFICE MANAGEMENT
# ============================================================================

class Office(Base):
    __tablename__ = "offices"
    
    id = Column(Integer, primary_key=True)
    doctor_id = Column(Integer, ForeignKey("persons.id"), nullable=False)
    name = Column(String(200), nullable=False)
    
    # Dirección
    address = Column(Text)
    city = Column(String(100))
    state_id = Column(Integer, ForeignKey("states.id"))
    country_id = Column(Integer, ForeignKey("countries.id"))
    postal_code = Column(String(10))
    
    # Contacto
    phone = Column(String(20))
    
    # Configuración
    timezone = Column(String(50), default='America/Mexico_City')
    maps_url = Column(Text)  # URL de Google Maps
    
    # Sistema
    is_active = Column(Boolean, default=True)
    is_virtual = Column(Boolean, default=False)  # Indica si es consultorio virtual
    virtual_url = Column(String(500))  # URL para consultas virtuales (Zoom, Teams, etc.)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relaciones
    doctor = relationship("Person", back_populates="offices")
    state = relationship("State")
    country = relationship("Country")
    appointments = relationship("Appointment", back_populates="office")
    # medical_records relationship removed - office_id column doesn't exist in medical_records table
    # schedule_templates = relationship("ScheduleTemplate", back_populates="office", lazy="select")


# ============================================================================
# AUXILIARY CATALOGS
# ============================================================================


class Specialty(Base):
    __tablename__ = "medical_specialties"
    
    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
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

class AppointmentType(Base):
    __tablename__ = "appointment_types"
    
    id = Column(Integer, primary_key=True)
    name = Column(String(50), nullable=False, unique=True)  # "Presencial", "En línea"
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

# ============================================================================
# DOCUMENT MANAGEMENT
# ============================================================================

class DocumentType(Base):
    __tablename__ = "document_types"
    
    id = Column(Integer, primary_key=True)
    name = Column(String(50), nullable=False, unique=True)  # "Personal", "Profesional"
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    documents = relationship("Document", back_populates="document_type")

class Document(Base):
    __tablename__ = "documents"
    
    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)  # "DNI", "CURP", "Cédula Profesional", etc.
    document_type_id = Column(Integer, ForeignKey("document_types.id", ondelete="CASCADE"))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    document_type = relationship("DocumentType", back_populates="documents")
    person_documents = relationship("PersonDocument", back_populates="document")

class PersonDocument(Base):
    __tablename__ = "person_documents"
    
    id = Column(Integer, primary_key=True)
    person_id = Column(Integer, ForeignKey("persons.id", ondelete="CASCADE"), nullable=False)
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    document_value = Column(String(255), nullable=False)  # Valor del documento
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    person = relationship("Person", back_populates="person_documents")
    document = relationship("Document", back_populates="person_documents")

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
    birth_date = Column(Date, nullable=True)  # Optional field
    gender = Column(String(20), nullable=True)
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
    
    # PROFESSIONAL DATA (doctors only)
    appointment_duration = Column(Integer)  # Duration of appointments in minutes (optional)
    specialty_id = Column(Integer, ForeignKey("medical_specialties.id"))
    university = Column(String(200))
    graduation_year = Column(Integer)
    
    # MEDICAL DATA (patients only)
    insurance_provider = Column(String(100))
    insurance_number = Column(String(50))
    
    # EMERGENCY CONTACT
    emergency_contact_name = Column(String(200))
    emergency_contact_phone = Column(String(20))
    emergency_contact_relationship = Column(String(20), ForeignKey("emergency_relationships.code"))
    
    # AUTHENTICATION
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
    emergency_relationship = relationship("EmergencyRelationship", back_populates="persons")
    
    # Office relationships
    offices = relationship("Office", back_populates="doctor")
    
    # Document relationships
    person_documents = relationship("PersonDocument", back_populates="person")
    
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
    patient_id = Column(Integer, ForeignKey("persons.id"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("persons.id"), nullable=False)
    consultation_date = Column(DateTime, nullable=False)
    
    # NOM-004 REQUIRED FIELDS
    chief_complaint = Column(Text, nullable=False)
    history_present_illness = Column(Text, nullable=False)
    family_history = Column(Text, nullable=False)
    perinatal_history = Column(Text, nullable=False)
    personal_pathological_history = Column(Text, nullable=False)
    personal_non_pathological_history = Column(Text, nullable=False)
    physical_examination = Column(Text, nullable=False)
    primary_diagnosis = Column(Text, nullable=False)
    treatment_plan = Column(Text, nullable=False)
    
    # CONSULTATION TYPE
    consultation_type = Column(String(50), default='Seguimiento')
    # appointment_type_id and office_id columns do not exist in medical_records table - removed
    
    # FIRST-TIME CONSULTATION FIELDS (removed duplicate _story fields)
    # These fields are now handled by the existing _history fields:
    # - family_history
    # - perinatal_history
    # - personal_pathological_history  
    # - personal_non_pathological_history
    
    # OPTIONAL FIELDS
    secondary_diagnoses = Column(Text)
    prescribed_medications = Column(Text)
    laboratory_results = Column(Text)
    notes = Column(Text)
    
    # SYSTEM
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(Integer, ForeignKey("persons.id"))
    
    # RELATIONSHIPS
    patient = relationship("Person", foreign_keys=[patient_id], back_populates="medical_records_as_patient")
    doctor = relationship("Person", foreign_keys=[doctor_id], back_populates="medical_records_as_doctor")
    # office and appointment_type_rel relationships removed - columns don't exist

class Appointment(Base):
    __tablename__ = "appointments"
    
    id = Column(Integer, primary_key=True)
    patient_id = Column(Integer, ForeignKey("persons.id"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("persons.id"), nullable=False)
    
    # SCHEDULING
    appointment_date = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    
    # DETAILS
    appointment_type_id = Column(Integer, ForeignKey("appointment_types.id"), nullable=False)
    office_id = Column(Integer, ForeignKey("offices.id"), nullable=True)
    consultation_type = Column(String(50), default='Seguimiento')  # 'Primera vez' or 'Seguimiento'
    status = Column(String(20), default='confirmed')
    priority = Column(String(20), default='normal')
    
    # CLINICAL INFORMATION
    reason = Column(Text, nullable=False)
    notes = Column(Text)
    
    # ADMINISTRATIVE
    reminder_sent = Column(Boolean, default=False)
    reminder_sent_at = Column(DateTime)

    # AUTO REMINDER (WhatsApp)
    auto_reminder_enabled = Column(Boolean, default=False)
    auto_reminder_offset_minutes = Column(Integer, default=360)  # 6 hours
    
    # CANCELLATION
    cancelled_reason = Column(Text)
    cancelled_at = Column(DateTime)
    cancelled_by = Column(Integer, ForeignKey("persons.id"))
    
    # SYSTEM
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    # created_by removed - not used, doctor_id already identifies the doctor
    
    # RELATIONSHIPS
    patient = relationship("Person", foreign_keys=[patient_id], back_populates="appointments_as_patient")
    doctor = relationship("Person", foreign_keys=[doctor_id], back_populates="appointments_as_doctor")
    office = relationship("Office", back_populates="appointments")
    appointment_type_rel = relationship("AppointmentType")

class ClinicalStudy(Base):
    __tablename__ = "clinical_studies"
    
    id = Column(Integer, primary_key=True, index=True)
    # study_code column does not exist in clinical_studies table - removed
    consultation_id = Column(Integer, ForeignKey("medical_records.id"), nullable=False)
    patient_id = Column(Integer, ForeignKey("persons.id"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("persons.id"), nullable=False)
    # study_catalog_id column does not exist in clinical_studies table - removed
    
    # STUDY INFORMATION
    study_type = Column(String(50), nullable=False)  # hematologia, bioquimica, radiologia, etc.
    study_name = Column(String(200), nullable=False)
    
    # DATES
    ordered_date = Column(DateTime, nullable=False)
    performed_date = Column(DateTime)
    # results_date column does not exist in clinical_studies table - removed
    
    # STATUS AND URGENCY
    status = Column(String(20), default='ordered')  # ordered, in_progress, completed, cancelled, failed
    urgency = Column(String(20), default='routine')  # routine, urgent, stat, emergency
    
    # MEDICAL INFORMATION
    clinical_indication = Column(Text)  # Nullable in database
    
    # NEW FIELDS FOR NORMALIZED CATALOG
    # results and normal_values columns do not exist in clinical_studies table - removed
    
    # MEDICAL STAFF
    ordering_doctor = Column(String(200))  # Nullable in database
    
    # FILE ATTACHMENTS
    file_name = Column(String(255))
    file_path = Column(String(500))
    file_type = Column(String(100))
    file_size = Column(Integer)  # in bytes
    
    # SYSTEM
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(Integer, ForeignKey("persons.id"))
    
    # RELATIONSHIPS
    consultation = relationship("MedicalRecord", backref="clinical_studies")
    patient = relationship("Person", foreign_keys=[patient_id], back_populates="clinical_studies_as_patient")
    doctor = relationship("Person", foreign_keys=[doctor_id], back_populates="clinical_studies_as_doctor")
    # catalog_study relationship removed - study_catalog_id column does not exist in clinical_studies table


# ============================================================================
# CONFIGURACIÓN DE BASE DE DATOS
# ============================================================================

# Study Catalog Models
class StudyCategory(Base):
    __tablename__ = "study_categories"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    active = Column('active', Boolean, default=True)  # Database column is 'active', not 'is_active'
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Alias for backward compatibility
    @property
    def is_active(self):
        return self.active
    
    @is_active.setter
    def is_active(self, value):
        self.active = value
    
    # Relationships
    studies = relationship("StudyCatalog", back_populates="category")

class StudyCatalog(Base):
    __tablename__ = "study_catalog"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    category_id = Column(Integer, ForeignKey("study_categories.id"), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    category = relationship("StudyCategory", back_populates="studies")

# StudyNormalValue, StudyTemplate, StudyTemplateItem models removed - tables deleted

# ClinicalStudy model updated with catalog reference

# ============================================================================

# Import schedule models to ensure they are registered with Base
# This import is moved to the top to avoid circular import issues

# Database URL from environment variable or default
# DATABASE_URL para conexiones desde dentro de Docker (usa postgres-db:5432)
# Para conexiones desde fuera de Docker, usa localhost:5433
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
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(Integer, default=0)  # No foreign key - 0 = sistema inicial
    
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
    
    # Relationships
    consultation = relationship("MedicalRecord")
    medication = relationship("Medication", back_populates="consultation_prescriptions")

# ============================================================================
# AUDIT LOG - Complete Traceability System
# ============================================================================

class AuditLog(Base):
    """
    Audit log for complete system traceability
    Compliance: NOM-241-SSA1-2021, LFPDPPP, ISO 27001
    """
    __tablename__ = "audit_log"
    
    id = Column(Integer, primary_key=True)
    
    # User information
    user_id = Column(Integer, ForeignKey("persons.id", ondelete="SET NULL"))
    user_email = Column(String(100))
    user_name = Column(String(200))
    user_type = Column(String(20))  # 'doctor', 'patient', 'admin', 'system'
    
    # Action performed
    action = Column(String(50), nullable=False)  # 'CREATE', 'READ', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'ACCESS_DENIED'
    table_name = Column(String(50))  # Affected table
    record_id = Column(Integer)  # Affected record ID
    
    # Change data
    old_values = Column(JSON)  # Values before change
    new_values = Column(JSON)  # Values after change
    changes_summary = Column(Text)  # Human-readable summary
    
    # Operation context
    operation_type = Column(String(50))  # 'consultation_create', 'patient_update', etc.
    affected_patient_id = Column(Integer, ForeignKey("persons.id", ondelete="SET NULL"))
    affected_patient_name = Column(String(200))
    
    # Session information
    ip_address = Column(String(45))
    user_agent = Column(Text)
    session_id = Column(String(100))
    request_path = Column(String(500))
    request_method = Column(String(10))  # GET, POST, PUT, DELETE
    
    # Security
    success = Column(Boolean, default=True)
    error_message = Column(Text)
    security_level = Column(String(20), default='INFO')  # 'INFO', 'WARNING', 'CRITICAL'
    
    # Timestamp
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    # Additional metadata
    metadata_json = Column("metadata", JSON)
    
    # Relationships
    user = relationship("Person", foreign_keys=[user_id])
    affected_patient = relationship("Person", foreign_keys=[affected_patient_id])

# ============================================================================
# PRIVACY AND CONSENT SYSTEM - LFPDPPP Compliance
# ============================================================================

class PrivacyNotice(Base):
    """
    Versiones del aviso de privacidad
    Compliance: LFPDPPP
    """
    __tablename__ = "privacy_notices"
    
    id = Column(Integer, primary_key=True)
    version = Column(String(20), unique=True, nullable=False)
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)
    short_summary = Column(Text)
    effective_date = Column(Date, nullable=False)
    # expiry_date removed - not used, expiration is calculated from consent_date + 365 days
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    consents = relationship("PrivacyConsent", back_populates="privacy_notice")

class PrivacyConsent(Base):
    """
    Registro de consentimientos de privacidad de pacientes
    Soporta múltiples métodos: WhatsApp, papel, tablet, portal web
    """
    __tablename__ = "privacy_consents"
    
    id = Column(Integer, primary_key=True)
    patient_id = Column(Integer, ForeignKey("persons.id", ondelete="CASCADE"))
    notice_id = Column(Integer, ForeignKey("privacy_notices.id"))  # Alineado con DB: notice_id
    consent_given = Column(Boolean, nullable=False)
    consent_date = Column(DateTime, nullable=False)
    ip_address = Column(String(45))
    user_agent = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    patient = relationship("Person", foreign_keys=[patient_id], backref="privacy_consents")
    privacy_notice = relationship("PrivacyNotice", foreign_keys=[notice_id], back_populates="consents")

class ARCORequest(Base):
    """
    Solicitudes de derechos ARCO (Acceso, Rectificación, Cancelación, Oposición)
    Compliance: LFPDPPP Art. 28-34
    """
    __tablename__ = "arco_requests"
    
    id = Column(Integer, primary_key=True)
    patient_id = Column(Integer, ForeignKey("persons.id", ondelete="CASCADE"))
    request_type = Column(String(20), nullable=False)  # 'access', 'rectification', 'cancellation', 'opposition'
    request_date = Column(DateTime, default=datetime.utcnow)
    
    # Detalles de la solicitud
    request_description = Column(Text, nullable=False)
    requested_data = Column(Text)
    
    # Estado
    status = Column(String(20), default='pending')  # 'pending', 'in_progress', 'completed', 'rejected'
    assigned_to = Column(Integer, ForeignKey("persons.id"))
    
    # Respuesta
    response_date = Column(DateTime)
    response_description = Column(Text)
    response_attachments = Column(JSON)  # Array de rutas
    
    # Plazos legales
    legal_deadline = Column(Date)
    days_to_respond = Column(Integer)
    
    # Seguimiento
    notes = Column(Text)
    priority = Column(String(20), default='normal')
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    patient = relationship("Person", foreign_keys=[patient_id])
    assigned_officer = relationship("Person", foreign_keys=[assigned_to])

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
