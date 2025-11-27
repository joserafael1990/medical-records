"""
Diagnosis catalog schemas based on CIE-10 (ICD-10)
"""

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime
from enum import Enum

class RecommendationType(str, Enum):
    REQUIRED = "required"
    RECOMMENDED = "recommended"
    OPTIONAL = "optional"

class PriorityLevel(int, Enum):
    HIGH = 1
    MEDIUM = 2
    LOW = 3

# Base schemas
# DiagnosisCategory schemas removed - diagnosis_categories table eliminated (not required by law)
# Only code and name are required for CIE-10 catalog compliance (NOM-004-SSA3-2012, NOM-024-SSA3-2012)

class DiagnosisCatalogBase(BaseModel):
    """
    CIE-10 Diagnosis Catalog Base Schema
    Compliance: NOM-004-SSA3-2012, NOM-024-SSA3-2012
    Required fields by law: code (CIE-10 code), name (description)
    created_by: 0 = system, doctor_id = doctor who created it
    """
    code: str = Field("", max_length=10, description="CIE-10 diagnosis code (empty for custom diagnoses)")
    name: str = Field(..., max_length=500, description="Diagnosis name/description (required by law)")
    is_active: bool = Field(True, description="Whether diagnosis is active")

class DiagnosisCatalogCreate(DiagnosisCatalogBase):
    """Schema for creating a new diagnosis"""
    # created_by will be set by the API based on the current user
    # Do not include created_by in the create schema - it's set automatically

class DiagnosisCatalogUpdate(BaseModel):
    """Schema for updating an existing diagnosis"""
    code: Optional[str] = Field(None, max_length=10)
    name: Optional[str] = Field(None, max_length=500)
    is_active: Optional[bool] = None
    # created_by cannot be updated

class DiagnosisCatalog(DiagnosisCatalogBase):
    """
    CIE-10 Diagnosis Catalog Schema
    Compliance: NOM-004-SSA3-2012, NOM-024-SSA3-2012
    Required fields by law: code, name
    """
    id: int
    created_by: int  # Creator ID: 0 = system, doctor_id = doctor who created it
    created_at: datetime
    updated_at: datetime
    # Removed recommendations and differentials to avoid circular references
    
    model_config = ConfigDict(from_attributes=True)

# DiagnosisRecommendation and DiagnosisDifferential schemas removed - tables deleted

# Search and filter schemas
class DiagnosisSearchRequest(BaseModel):
    """
    Diagnosis Search Request Schema
    Compliance: NOM-004-SSA3-2012, NOM-024-SSA3-2012 - CIE-10 catalog
    """
    query: str = Field("", min_length=0, max_length=100, description="Search query")
    limit: int = Field(50, ge=1, le=100, description="Maximum number of results")
    offset: int = Field(0, ge=0, description="Number of results to skip")

class DiagnosisSearchResult(BaseModel):
    """
    Diagnosis Search Result Schema
    Compliance: NOM-004-SSA3-2012, NOM-024-SSA3-2012 - CIE-10 catalog
    """
    id: int
    code: str  # CIE-10 code (required by law)
    name: str  # Diagnosis description (required by law)
    created_by: int  # Creator ID: 0 = system, doctor_id = doctor who created it
    rank: Optional[float] = Field(None, description="Search relevance rank")

# DiagnosisRecommendationResult and DiagnosisDifferentialResult removed - tables deleted

# Statistics schemas
class DiagnosisStats(BaseModel):
    total_diagnoses: int

# Simple schemas without relationships for API responses
# SimpleDiagnosisCategory removed - diagnosis_categories table eliminated

class SimpleDiagnosisCatalog(BaseModel):
    """
    Simple Diagnosis Catalog Schema
    Compliance: NOM-004-SSA3-2012, NOM-024-SSA3-2012 - CIE-10 catalog
    """
    id: int
    code: str  # CIE-10 code (required by law)
    name: str  # Diagnosis description (required by law)
    is_active: bool = True
    created_by: int  # Creator ID: 0 = system, doctor_id = doctor who created it
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

# Update forward references
DiagnosisCatalog.model_rebuild()
# DiagnosisCategory removed - diagnosis_categories table eliminated
# DiagnosisRecommendation and DiagnosisDifferential removed - tables deleted
