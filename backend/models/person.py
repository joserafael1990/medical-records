from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Date, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from .base import Base, utc_now

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
    name = Column(String(300), nullable=False)
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
    
    # AVATAR SETTINGS
    avatar_type = Column(String(20), default='initials')  # initials | preloaded | custom
    avatar_template_key = Column(String(100))
    avatar_file_path = Column(String(255))
    
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
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)
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
    document_folio_sequences = relationship("DocumentFolioSequence", back_populates="doctor", cascade="all, delete-orphan")
    document_folios = relationship("DocumentFolio", back_populates="doctor", cascade="all, delete-orphan")
    
    # License relationships
    licenses = relationship("License", foreign_keys="License.doctor_id", back_populates="doctor")
    
    # Google Calendar relationship
    google_calendar_token = relationship("GoogleCalendarToken", back_populates="doctor", uselist=False, cascade="all, delete-orphan")
    
    
    # PROPERTIES
    @property
    def full_name(self):
        """Nombre completo de la persona con título (si aplica)"""
        if self.title:
            return f"{self.title} {self.name}"
        return self.name
    
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
