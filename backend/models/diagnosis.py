"""
Diagnosis catalog models based on CIE-10 (ICD-10)
International Classification of Diseases, 10th Revision
"""

from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, ARRAY, DECIMAL, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class DiagnosisCategory(Base):
    __tablename__ = "diagnosis_categories"
    
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(10), unique=True, nullable=False, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text)
    # parent_id and level columns do not exist in database - removed
    active = Column('active', Boolean, default=True)  # Database column is 'active', not 'is_active'
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    # updated_at column does not exist in database - removed
    
    # Alias for backward compatibility
    @property
    def is_active(self):
        return self.active
    
    @is_active.setter
    def is_active(self, value):
        self.active = value
    
    # Relationships
    # parent relationship removed - parent_id column doesn't exist
    diagnoses = relationship("DiagnosisCatalog", back_populates="category")
    
    def __repr__(self):
        return f"<DiagnosisCategory(code='{self.code}', name='{self.name}')>"

class DiagnosisCatalog(Base):
    __tablename__ = "diagnosis_catalog"
    
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(10), unique=True, nullable=False, index=True)
    name = Column(String(500), nullable=False)
    category_id = Column(Integer, ForeignKey("diagnosis_categories.id"), nullable=False)
    description = Column(Text)
    # synonyms field removed - column does not exist in database
    # To add synonyms in the future, add column to DB first: ALTER TABLE diagnosis_catalog ADD COLUMN synonyms TEXT[];
    # synonyms = Column(ARRAY(String), nullable=True)  # Disabled - column doesn't exist
    severity_level = Column(String(20))  # mild, moderate, severe, critical
    is_chronic = Column(Boolean, default=False)
    is_contagious = Column(Boolean, default=False)
    age_group = Column(String(50))  # pediatric, adult, geriatric, all
    gender_specific = Column(String(10))  # male, female, both
    specialty = Column(String(100), index=True)  # Medical specialty
    active = Column('active', Boolean, default=True)  # Database column is 'active', not 'is_active'
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Alias for backward compatibility
    @property
    def is_active(self):
        return self.active
    
    @is_active.setter
    def is_active(self, value):
        self.active = value
    
    # Relationships
    category = relationship("DiagnosisCategory", back_populates="diagnoses")
    recommendations = relationship("DiagnosisRecommendation", back_populates="diagnosis", cascade="all, delete-orphan")
    primary_differentials = relationship("DiagnosisDifferential", foreign_keys="DiagnosisDifferential.primary_diagnosis_id", back_populates="primary_diagnosis", cascade="all, delete-orphan")
    differential_diagnoses = relationship("DiagnosisDifferential", foreign_keys="DiagnosisDifferential.differential_diagnosis_id", back_populates="differential_diagnosis", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<DiagnosisCatalog(code='{self.code}', name='{self.name}')>"

class DiagnosisRecommendation(Base):
    __tablename__ = "diagnosis_recommendations"
    
    id = Column(Integer, primary_key=True, index=True)
    diagnosis_id = Column(Integer, ForeignKey("diagnosis_catalog.id", ondelete="CASCADE"), nullable=False)
    recommended_study_id = Column(Integer, ForeignKey("study_catalog.id", ondelete="CASCADE"), nullable=False)
    recommendation_type = Column(String(50))  # required, recommended, optional
    priority = Column(Integer, default=1)  # 1=high, 2=medium, 3=low
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    diagnosis = relationship("DiagnosisCatalog", back_populates="recommendations")
    recommended_study = relationship("StudyCatalog", backref="diagnosis_recommendations")
    
    def __repr__(self):
        return f"<DiagnosisRecommendation(diagnosis_id={self.diagnosis_id}, study_id={self.recommended_study_id})>"

class DiagnosisDifferential(Base):
    __tablename__ = "diagnosis_differentials"
    
    id = Column(Integer, primary_key=True, index=True)
    primary_diagnosis_id = Column(Integer, ForeignKey("diagnosis_catalog.id", ondelete="CASCADE"), nullable=False)
    differential_diagnosis_id = Column(Integer, ForeignKey("diagnosis_catalog.id", ondelete="CASCADE"), nullable=False)
    similarity_score = Column(DECIMAL(3, 2))  # 0.00 to 1.00
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    primary_diagnosis = relationship("DiagnosisCatalog", foreign_keys=[primary_diagnosis_id], back_populates="primary_differentials")
    differential_diagnosis = relationship("DiagnosisCatalog", foreign_keys=[differential_diagnosis_id], back_populates="differential_diagnoses")
    
    def __repr__(self):
        return f"<DiagnosisDifferential(primary={self.primary_diagnosis_id}, differential={self.differential_diagnosis_id})>"

# Create indexes for better performance
Index('idx_diagnosis_recommendations_diagnosis_id', DiagnosisRecommendation.diagnosis_id)
Index('idx_diagnosis_recommendations_study_id', DiagnosisRecommendation.recommended_study_id)
Index('idx_diagnosis_differentials_primary', DiagnosisDifferential.primary_diagnosis_id)
Index('idx_diagnosis_differentials_differential', DiagnosisDifferential.differential_diagnosis_id)
