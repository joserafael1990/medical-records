"""Medication schemas."""
from datetime import datetime
from typing import Optional

from pydantic import field_validator

from .base import BaseSchema


class MedicationBase(BaseSchema):
    name: str

    @field_validator('name')
    @classmethod
    def validate_name(cls, value: str) -> str:
        if not value or not value.strip():
            raise ValueError("El nombre del medicamento es obligatorio")
        return value.strip()


class MedicationCreate(MedicationBase):
    pass


class MedicationResponse(MedicationBase):
    id: int
    created_by: Optional[int] = None
    is_active: bool = True
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
