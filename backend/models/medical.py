from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy import desc
from .base import Base, utc_now

# ============================================================================
# MEDICAL TABLES
# ============================================================================

class MedicalRecord(Base):
    __tablename__ = "medical_records"
    
    id = Column(Integer, primary_key=True)
    patient_id = Column(Integer, ForeignKey("persons.id"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("persons.id"), nullable=False)
    consultation_date = Column(DateTime, nullable=False)
    patient_document_id = Column(Integer, ForeignKey("documents.id"))
    patient_document_value = Column(String(255))
    
    # NOM-004 REQUIRED FIELDS
    chief_complaint = Column(Text, nullable=False)
    history_present_illness = Column(Text, nullable=False)
    family_history = Column(Text, nullable=False)
    perinatal_history = Column(Text, nullable=False)
    gynecological_and_obstetric_history = Column(Text, nullable=False)
    personal_pathological_history = Column(Text, nullable=False)
    personal_non_pathological_history = Column(Text, nullable=False)
    physical_examination = Column(Text, nullable=False)
    primary_diagnosis = Column(Text, nullable=False)
    treatment_plan = Column(Text, nullable=False)
    follow_up_instructions = Column(Text, nullable=False, default="")
    
    # CONSULTATION TYPE
    consultation_type = Column(String(50), default='Seguimiento')
    
    # OPTIONAL FIELDS
    secondary_diagnoses = Column(Text)
    prescribed_medications = Column(Text)
    laboratory_results = Column(Text)
    notes = Column(Text)
    
    # SYSTEM
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)
    created_by = Column(Integer, ForeignKey("persons.id"))
    
    # RELATIONSHIPS
    patient = relationship("Person", foreign_keys=[patient_id], back_populates="medical_records_as_patient")
    doctor = relationship("Person", foreign_keys=[doctor_id], back_populates="medical_records_as_doctor")
    patient_document = relationship("Document", foreign_keys=[patient_document_id])
    document_folios = relationship("DocumentFolio", back_populates="consultation", cascade="all, delete-orphan")

# ============================================================================
# VITAL SIGNS MODELS
# ============================================================================

class VitalSign(Base):
    __tablename__ = "vital_signs"
    
    id = Column(Integer, primary_key=True)
    name = Column(String(50), nullable=False)
    created_at = Column(DateTime, default=utc_now)
    
    # Relationships
    consultation_vital_signs = relationship("ConsultationVitalSign", back_populates="vital_sign")

class ConsultationVitalSign(Base):
    __tablename__ = "consultation_vital_signs"
    
    id = Column(Integer, primary_key=True)
    consultation_id = Column(Integer, ForeignKey("medical_records.id"), nullable=False)
    vital_sign_id = Column(Integer, ForeignKey("vital_signs.id"), nullable=False)
    value = Column(String(100), nullable=False)
    unit = Column(String(20))
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)
    
    # Relationships
    consultation = relationship("MedicalRecord")
    vital_sign = relationship("VitalSign", back_populates="consultation_vital_signs")

# ============================================================================
# MEDICATIONS AND PRESCRIPTIONS
# ============================================================================

class Medication(Base):
    __tablename__ = "medications"
    __table_args__ = (
        UniqueConstraint("name", "created_by", name="uq_medications_name_created_by"),
    )
    
    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)
    created_by = Column(Integer, ForeignKey("persons.id"), nullable=False)
    
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
    created_at = Column(DateTime, default=utc_now)
    
    # Relationships
    consultation = relationship("MedicalRecord")
    medication = relationship("Medication", back_populates="consultation_prescriptions")
