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
    name = Column(String(200), nullable=False)
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
    # recommendations relationship removed - table deleted
    # primary_differentials relationship removed - table deleted
    # differential_diagnoses relationship removed - table deleted
    
    def __repr__(self):
        return f"<DiagnosisCatalog(code='{self.code}', name='{self.name}')>"

# DiagnosisRecommendation and DiagnosisDifferential models removed - tables deleted
