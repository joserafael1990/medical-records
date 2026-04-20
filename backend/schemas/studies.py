"""Study catalog schemas."""
from datetime import datetime
from typing import Literal, Optional

from .base import BaseSchema


class StudyCategoryBase(BaseSchema):
    name: str
    is_active: bool = True


class StudyCategory(StudyCategoryBase):
    id: int
    created_at: Optional[datetime] = None


# StudyNormalValue schemas removed - table deleted


class StudyCatalogBase(BaseSchema):
    name: str
    category_id: int
    is_active: bool = True


class StudyCatalog(StudyCatalogBase):
    id: int
    created_at: datetime
    updated_at: datetime
    category: Optional[StudyCategory] = None
    # normal_values field removed - table deleted


# StudyTemplate and StudyTemplateItem schemas removed - tables deleted


class StudySearchFilters(BaseSchema):
    category_id: Optional[int] = None
    subcategory: Optional[str] = None
    name: Optional[str] = None
    code: Optional[str] = None
    specialty: Optional[str] = None
    duration_hours: Optional[int] = None
    has_normal_values: Optional[bool] = None
    is_active: bool = True


class StudyRecommendation(BaseSchema):
    study: StudyCatalog
    reason: str
    priority: Literal['high', 'medium', 'low'] = 'medium'
