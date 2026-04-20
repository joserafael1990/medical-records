"""Office/clinic schemas."""
from datetime import datetime
from typing import Optional

from pydantic import field_validator

from .base import BaseSchema


class OfficeBase(BaseSchema):
    name: str
    address: Optional[str] = None
    city: Optional[str] = None
    state_id: Optional[int] = None
    country_id: Optional[int] = None
    postal_code: Optional[str] = None
    phone: Optional[str] = None
    timezone: str = 'America/Mexico_City'
    maps_url: Optional[str] = None
    is_virtual: bool = False
    virtual_url: Optional[str] = None

    @field_validator('name')
    @classmethod
    def validate_name(cls, v):
        if not v or not v.strip():
            raise ValueError('Office name is required and cannot be empty')
        return v.strip()

    @field_validator('virtual_url')
    @classmethod
    def validate_virtual_url(cls, v, info):
        # Si es consultorio virtual, la URL es obligatoria
        if info.data.get('is_virtual', False) and (not v or not v.strip()):
            raise ValueError('Virtual URL is required for virtual offices')
        return v.strip() if v else None


class OfficeCreate(OfficeBase):
    pass


class OfficeUpdate(OfficeBase):
    name: Optional[str] = None
    timezone: Optional[str] = None


class Office(OfficeBase):
    id: int
    doctor_id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    state_name: Optional[str] = None
    country_name: Optional[str] = None
