"""Vital signs schemas."""
from datetime import datetime
from typing import Optional

from .base import BaseSchema
from .persons import Person


class VitalSignsBase(BaseSchema):
    patient_id: int
    date_recorded: datetime
    weight: Optional[str] = None
    height: Optional[str] = None
    bmi: Optional[str] = None
    temperature: Optional[str] = None
    blood_pressure_systolic: Optional[str] = None
    blood_pressure_diastolic: Optional[str] = None
    heart_rate: Optional[str] = None
    respiratory_rate: Optional[str] = None
    oxygen_saturation: Optional[str] = None
    abdominal_circumference: Optional[str] = None
    head_circumference: Optional[str] = None
    glucose_level: Optional[str] = None
    recorded_by: Optional[int] = None
    measurement_context: Optional[str] = None


class VitalSignsCreate(VitalSignsBase):
    pass


class VitalSignsUpdate(BaseSchema):
    weight: Optional[str] = None
    height: Optional[str] = None
    bmi: Optional[str] = None
    temperature: Optional[str] = None
    blood_pressure_systolic: Optional[str] = None
    blood_pressure_diastolic: Optional[str] = None
    heart_rate: Optional[str] = None
    respiratory_rate: Optional[str] = None
    oxygen_saturation: Optional[str] = None
    abdominal_circumference: Optional[str] = None
    head_circumference: Optional[str] = None
    glucose_level: Optional[str] = None
    notes: Optional[str] = None
    measurement_context: Optional[str] = None


class VitalSigns(VitalSignsBase):
    id: int
    created_at: datetime

    # Relationships
    patient: Optional[Person] = None
    doctor: Optional[Person] = None
