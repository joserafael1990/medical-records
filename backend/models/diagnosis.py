"""
Diagnosis catalog models based on CIE-10 (ICD-10)
International Classification of Diseases, 10th Revision
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, Index
from sqlalchemy.sql import func
from database import Base

# DiagnosisCategory removed - not required by law (NOM-004-SSA3-2012, NOM-024-SSA3-2012)
# Only code and name are required for CIE-10 catalog compliance

class DiagnosisCatalog(Base):
    """
    CIE-10 Diagnosis Catalog
    Compliance: NOM-004-SSA3-2012, NOM-024-SSA3-2012
    Required fields by law: code (CIE-10 code), name (description)
    created_by: 0 = system, doctor_id = doctor who created it
    """
    __tablename__ = "diagnosis_catalog"
    
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(10), unique=True, nullable=False, index=True)  # CIE-10 code (required by law)
    name = Column(String(500), nullable=False)  # Diagnosis description (required by law)
    is_active = Column(Boolean, default=True)
    created_by = Column(Integer, nullable=False, default=0, index=True)  # 0 = system, doctor_id = creator
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    # Note: created_by references persons(id), but created_by = 0 (system) doesn't have a valid FK
    # We handle this at application level, not with a strict FK constraint
    # For created_by > 0, we can query the Person directly using created_by
    
    def __repr__(self):
        return f"<DiagnosisCatalog(code='{self.code}', name='{self.name}', created_by={self.created_by})>"

# DiagnosisCategory removed - not required by law
# DiagnosisRecommendation and DiagnosisDifferential models removed - tables deleted
