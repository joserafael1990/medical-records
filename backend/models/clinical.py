from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from .base import Base, utc_now

class ClinicalStudy(Base):
    __tablename__ = "clinical_studies"
    
    id = Column(Integer, primary_key=True, index=True)
    consultation_id = Column(Integer, ForeignKey("medical_records.id"), nullable=True)
    patient_id = Column(Integer, ForeignKey("persons.id"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("persons.id"), nullable=False)
    
    # STUDY INFORMATION
    study_type = Column(String(50), nullable=False)  # hematologia, bioquimica, radiologia, etc.
    study_name = Column(String(200), nullable=False)
    
    # DATES
    ordered_date = Column(DateTime, nullable=False)
    performed_date = Column(DateTime)
    
    # STATUS AND URGENCY
    status = Column(String(20), default='ordered')  # ordered, previous, completed
    urgency = Column(String(20), default='routine')  # routine, urgent, stat, emergency
    
    # MEDICAL INFORMATION
    clinical_indication = Column(Text)  # Nullable in database
    
    # MEDICAL STAFF
    ordering_doctor = Column(String(200))  # Nullable in database
    
    # FILE ATTACHMENTS
    file_name = Column(String(255))
    file_path = Column(String(500))
    file_type = Column(String(100))
    file_size = Column(Integer)  # in bytes
    
    # SYSTEM
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)
    created_by = Column(Integer, ForeignKey("persons.id"))
    
    # RELATIONSHIPS
    consultation = relationship("MedicalRecord", backref="clinical_studies")
    patient = relationship("Person", foreign_keys=[patient_id], back_populates="clinical_studies_as_patient")
    doctor = relationship("Person", foreign_keys=[doctor_id], back_populates="clinical_studies_as_doctor")

# ============================================================================
# CONFIGURACIÓN DE BASE DE DATOS
# ============================================================================

# Study Catalog Models
class StudyCategory(Base):
    __tablename__ = "study_categories"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utc_now)
    
    # Relationships
    studies = relationship("StudyCatalog", back_populates="category")

class StudyCatalog(Base):
    __tablename__ = "study_catalog"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    category_id = Column(Integer, ForeignKey("study_categories.id"), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)
    
    # Relationships
    category = relationship("StudyCategory", back_populates="studies")
