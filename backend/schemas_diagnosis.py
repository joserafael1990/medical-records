"""
Diagnosis catalog schemas based on CIE-10 (ICD-10)
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum

class SeverityLevel(str, Enum):
    MILD = "mild"
    MODERATE = "moderate"
    SEVERE = "severe"
    CRITICAL = "critical"

class AgeGroup(str, Enum):
    PEDIATRIC = "pediatric"
    ADULT = "adult"
    GERIATRIC = "geriatric"
    ALL = "all"

class GenderSpecific(str, Enum):
    MALE = "male"
    FEMALE = "female"
    BOTH = "both"

class RecommendationType(str, Enum):
    REQUIRED = "required"
    RECOMMENDED = "recommended"
    OPTIONAL = "optional"

class PriorityLevel(int, Enum):
    HIGH = 1
    MEDIUM = 2
    LOW = 3

# Base schemas
class DiagnosisCategoryBase(BaseModel):
    name: str = Field(..., max_length=200, description="Category name")
    parent_id: Optional[int] = Field(None, description="Parent category ID")
    level: int = Field(1, ge=1, le=5, description="Category level (1-5)")
    is_active: bool = Field(True, description="Whether category is active")

class DiagnosisCategoryCreate(DiagnosisCategoryBase):
    pass

class DiagnosisCategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=200)
    parent_id: Optional[int] = None
    level: Optional[int] = Field(None, ge=1, le=5)
    is_active: Optional[bool] = None

class DiagnosisCategory(DiagnosisCategoryBase):
    id: int
    created_at: datetime
    # updated_at removed - column doesn't exist in diagnosis_categories table
    # Removed children and diagnoses to avoid circular references
    # These can be loaded separately if needed
    
    class Config:
        from_attributes = True

class DiagnosisCatalogBase(BaseModel):
    code: str = Field(..., max_length=10, description="CIE-10 diagnosis code")
    name: str = Field(..., max_length=500, description="Diagnosis name")
    category_id: int = Field(..., description="Category ID")
    description: Optional[str] = Field(None, description="Diagnosis description")
    synonyms: Optional[List[str]] = Field(None, description="Alternative names or synonyms")
    severity_level: Optional[SeverityLevel] = Field(None, description="Severity level")
    is_chronic: bool = Field(False, description="Whether condition is chronic")
    is_contagious: bool = Field(False, description="Whether condition is contagious")
    age_group: Optional[AgeGroup] = Field(None, description="Target age group")
    gender_specific: Optional[GenderSpecific] = Field(None, description="Gender specificity")
    specialty: Optional[str] = Field(None, max_length=100, description="Medical specialty")
    is_active: bool = Field(True, description="Whether diagnosis is active")

class DiagnosisCatalogCreate(DiagnosisCatalogBase):
    pass

class DiagnosisCatalogUpdate(BaseModel):
    code: Optional[str] = Field(None, max_length=10)
    name: Optional[str] = Field(None, max_length=500)
    category_id: Optional[int] = None
    description: Optional[str] = None
    synonyms: Optional[List[str]] = None
    severity_level: Optional[SeverityLevel] = None
    is_chronic: Optional[bool] = None
    is_contagious: Optional[bool] = None
    age_group: Optional[AgeGroup] = None
    gender_specific: Optional[GenderSpecific] = None
    specialty: Optional[str] = Field(None, max_length=100)
    is_active: Optional[bool] = None

class DiagnosisCatalog(DiagnosisCatalogBase):
    id: int
    created_at: datetime
    updated_at: datetime
    # Simplified to avoid circular references
    category: Optional[Dict[str, Any]] = None  # Basic category info only
    # Removed recommendations and differentials to avoid circular references
    
    class Config:
        from_attributes = True

# DiagnosisRecommendation and DiagnosisDifferential schemas removed - tables deleted

# Search and filter schemas
class DiagnosisSearchRequest(BaseModel):
    query: str = Field("", min_length=0, max_length=100, description="Search query")
    specialty: Optional[str] = Field(None, max_length=100, description="Filter by specialty")
    category_code: Optional[str] = Field(None, max_length=10, description="Filter by category code")
    severity_level: Optional[SeverityLevel] = Field(None, description="Filter by severity level")
    is_chronic: Optional[bool] = Field(None, description="Filter by chronic conditions")
    age_group: Optional[AgeGroup] = Field(None, description="Filter by age group")
    gender_specific: Optional[GenderSpecific] = Field(None, description="Filter by gender specificity")
    limit: int = Field(50, ge=1, le=100, description="Maximum number of results")
    offset: int = Field(0, ge=0, description="Number of results to skip")

class DiagnosisSearchResult(BaseModel):
    id: int
    code: str
    name: str
    description: Optional[str]
    category_name: str
    category_id: Optional[int] = None  # Use category_id instead of category_code
    specialty: Optional[str]
    severity_level: Optional[SeverityLevel]
    is_chronic: bool
    is_contagious: bool
    age_group: Optional[AgeGroup]
    gender_specific: Optional[GenderSpecific]
    synonyms: Optional[List[str]]
    rank: Optional[float] = Field(None, description="Search relevance rank")

# DiagnosisRecommendationResult and DiagnosisDifferentialResult removed - tables deleted

# Statistics schemas
class DiagnosisStats(BaseModel):
    total_diagnoses: int
    total_categories: int
    diagnoses_by_specialty: Dict[str, int]
    diagnoses_by_severity: Dict[str, int]
    chronic_conditions: int
    contagious_conditions: int

# Simple schemas without relationships for API responses
class SimpleDiagnosisCategory(BaseModel):
    id: int
    code: str
    name: str
    description: Optional[str] = None
    parent_id: Optional[int] = None
    level: Optional[int] = None
    is_active: Optional[bool] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class SimpleDiagnosisCatalog(BaseModel):
    id: int
    code: str
    name: str
    category_id: int
    description: Optional[str] = None
    synonyms: Optional[List[str]] = None
    severity_level: Optional[SeverityLevel] = None
    is_chronic: bool = False
    is_contagious: bool = False
    age_group: Optional[AgeGroup] = None
    gender_specific: Optional[GenderSpecific] = None
    specialty: Optional[str] = None
    is_active: bool = True
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# Update forward references
DiagnosisCategory.model_rebuild()
DiagnosisCatalog.model_rebuild()
# DiagnosisRecommendation and DiagnosisDifferential removed - tables deleted
